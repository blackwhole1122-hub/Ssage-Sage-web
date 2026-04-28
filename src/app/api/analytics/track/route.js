import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')?.[0]?.trim() || '';
}

function safeText(value, max = 300) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return raw.slice(0, max);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const eventName = safeText(body?.eventName, 80);
    if (!eventName) {
      return NextResponse.json({ ok: false, message: 'eventName is required' }, { status: 400 });
    }

    const metadata = typeof body?.metadata === 'object' && body.metadata !== null ? body.metadata : {};
    const payload = {
      event_name: eventName,
      session_id: safeText(body?.sessionId, 100),
      page_path: safeText(body?.pagePath, 500),
      page_type: safeText(body?.pageType, 80),
      target_url: safeText(body?.targetUrl, 1000),
      source: safeText(body?.source, 120),
      medium: safeText(body?.medium, 120),
      campaign: safeText(body?.campaign, 200),
      referrer: safeText(body?.referrer, 1000),
      short_slug: safeText(body?.shortSlug, 80),
      search_query: safeText(body?.searchQuery, 200),
      metadata: {
        ...metadata,
        userAgent: request.headers.get('user-agent') || '',
        ip: getClientIp(request),
      },
    };

    const supabase = createSupabaseServerClient();

    // Exclude admin/self views from blog view counts:
    // when a logged-in user opens blog detail, do not store page_view.
    // (Admin pages require login in this project, so this effectively
    // prevents admin browsing from inflating blog post view metrics.)
    if (eventName === 'page_view' && String(payload.page_path || '').startsWith('/blog/')) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        return NextResponse.json({ ok: true, skipped: 'authenticated_blog_view' });
      }
    }

    const { error } = await supabase.from('analytics_events').insert(payload);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || 'unknown error' }, { status: 200 });
  }
}
