import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function normalize(value = '') {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesKeyword(haystack = '', keyword = '') {
  const h = normalize(haystack);
  const k = normalize(keyword);
  if (!h || !k) return false;
  return h.includes(k);
}

function buildMessage(deal, matchedKeyword) {
  const title = String(deal?.title || '').trim();
  const price = String(deal?.price || '가격 확인').trim();
  const shop = String(deal?.shop || '').trim();
  const source = String(deal?.source || '').trim();
  const link = `https://www.ssagesage.com/deal/${deal.id}`;

  return [
    '🔔 키워드 핫딜 알림',
    '',
    `키워드: ${matchedKeyword}`,
    `제목: ${title}`,
    `가격: ${price}`,
    shop ? `쇼핑몰: ${shop}` : null,
    source ? `출처: ${source}` : null,
    '',
    `바로가기: ${link}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function sendTelegram(botToken, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.ok === false) {
    return {
      ok: false,
      error: payload?.description || `HTTP ${res.status}`,
    };
  }

  return { ok: true };
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!supabaseUrl || !serviceRoleKey || !botToken) {
    return NextResponse.json(
      {
        error: 'Server misconfiguration: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN are required',
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const minutesRaw = Number(searchParams.get('minutes') || 15);
  const scanMinutes = Number.isFinite(minutesRaw) ? Math.max(5, Math.min(120, Math.floor(minutesRaw))) : 15;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const since = new Date(Date.now() - scanMinutes * 60 * 1000).toISOString();

  const [{ data: deals, error: dealsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase
      .from('hotdeals')
      .select('id, title, price, shop, source, content, crawled_at')
      .gte('crawled_at', since)
      .order('crawled_at', { ascending: false })
      .limit(250),
    supabase
      .from('profiles')
      .select('id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null),
  ]);

  if (dealsError) return NextResponse.json({ error: dealsError.message }, { status: 500 });
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const profileList = profiles || [];
  const dealList = deals || [];

  if (profileList.length === 0 || dealList.length === 0) {
    return NextResponse.json({
      ok: true,
      scanned_minutes: scanMinutes,
      deals: dealList.length,
      users: profileList.length,
      sent: 0,
      skipped: 0,
      reason: 'no-users-or-deals',
    });
  }

  const userIds = profileList.map((p) => p.id);
  const { data: keywords, error: keywordsError } = await supabase
    .from('user_keywords')
    .select('id, user_id, keyword')
    .in('user_id', userIds);
  if (keywordsError) return NextResponse.json({ error: keywordsError.message }, { status: 500 });

  const keywordsByUser = new Map();
  for (const item of keywords || []) {
    const keyword = String(item?.keyword || '').trim();
    if (!keyword) continue;
    if (!keywordsByUser.has(item.user_id)) keywordsByUser.set(item.user_id, []);
    keywordsByUser.get(item.user_id).push(keyword);
  }

  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const profile of profileList) {
    const chatId = String(profile.telegram_chat_id || '').trim();
    const myKeywords = keywordsByUser.get(profile.id) || [];
    if (!chatId || myKeywords.length === 0) continue;

    let perUserSent = 0;

    for (const deal of dealList) {
      if (perUserSent >= 10) break;

      const haystack = `${deal.title || ''} ${deal.content || ''} ${deal.shop || ''}`;
      const matchedKeyword = myKeywords.find((kw) => includesKeyword(haystack, kw));
      if (!matchedKeyword) continue;

      const { error: logError } = await supabase
        .from('sent_alerts')
        .insert({
          user_id: profile.id,
          hotdeal_id: deal.id,
          keyword: matchedKeyword,
          sent_at: new Date().toISOString(),
        });

      if (logError) {
        // Duplicate key => already sent.
        if (logError.code === '23505') {
          skipped += 1;
          continue;
        }
        errors.push({
          type: 'insert-log',
          user_id: profile.id,
          hotdeal_id: deal.id,
          message: logError.message,
        });
        continue;
      }

      const message = buildMessage(deal, matchedKeyword);
      const result = await sendTelegram(botToken, chatId, message);
      if (!result.ok) {
        // Roll back log if message failed.
        await supabase
          .from('sent_alerts')
          .delete()
          .eq('user_id', profile.id)
          .eq('hotdeal_id', deal.id)
          .eq('keyword', matchedKeyword);

        errors.push({
          type: 'send',
          user_id: profile.id,
          hotdeal_id: deal.id,
          message: result.error,
        });
        continue;
      }

      perUserSent += 1;
      sent += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned_minutes: scanMinutes,
    deals: dealList.length,
    users: profileList.length,
    sent,
    skipped,
    errors_count: errors.length,
    errors: errors.slice(0, 20),
  });
}

