import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getUnitPrice } from '@/lib/priceUtils';
import { matchesGroupByTitle } from '@/lib/keywordMatcher';

export async function GET(request) {
  // ✨ [수정] fail-closed: CRON_SECRET 미설정 시에도 외부 접근 차단
  // 이전: if (cronSecret) → 미설정이면 누구나 접근 가능 (fail-open)
  // 수정: 항상 인증 검사, CRON_SECRET 미설정이면 서버 설정 오류로 처리
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. 기준 시점: 어제 23:59:59
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  // 기본 집계 구간: 어제 기준 최근 1년
  const oneYearStart = new Date(yesterday);
  oneYearStart.setFullYear(oneYearStart.getFullYear() - 1);
  oneYearStart.setHours(0, 0, 0, 0);

  // 2. 어제까지의 전체 가격 히스토리 가져오기
  const { data: history } = await supabase
    .from('price_history')
    .select('*')
    .lte('crawled_at', yesterday.toISOString());

  const { data: groups } = await supabase
    .from('keyword_groups')
    .select('slug, keywords');
  const groupKeywordsMap = new Map((groups || []).map((g) => [g.slug, g.keywords || []]));

  // 3. 품목별(slug) 그룹화
  const grouped = {};
  (history || []).forEach((item) => {
    if (!item?.group_slug) return;
    const keywords = groupKeywordsMap.get(item.group_slug) || [];
    const sourceTitle = item.title || item.group_name || '';
    if (!matchesGroupByTitle(sourceTitle, keywords)) return;
    if (!grouped[item.group_slug]) {
      grouped[item.group_slug] = [];
    }
    grouped[item.group_slug].push(item);
  });

  // 4. 품목별 기준가 계산
  // 기본: 최근 1년
  // 예외: 보유기간 1년 미만 또는 표본 < 20 => 보유기간 전체
  const benchmarkData = Object.keys(grouped).map((slug) => {
    const rows = grouped[slug]
      .map((row) => ({
        row,
        date: new Date(row.crawled_at),
      }))
      .filter(({ date }) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.date - b.date);

    if (rows.length === 0) return null;

    const firstDate = rows[0].date;
    const hasFullYearData = firstDate <= oneYearStart;

    const oneYearRows = rows.filter(({ date }) => date >= oneYearStart && date <= yesterday);
    const oneYearSampleCount = oneYearRows.length;
    const useHoldingPeriod = !hasFullYearData || oneYearSampleCount < 20;
    const targetRows = useHoldingPeriod ? rows : oneYearRows;

    const prices = targetRows
      .map(({ row }) => getUnitPrice(row).price)
      .filter((price) => Number.isFinite(price) && price > 0);

    if (prices.length === 0) return null;

    const min = Math.min(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return {
      slug,
      ref_low: Math.round(min),
      ref_avg: Math.round(avg),
      updated_at: new Date(),
    };
  }).filter(Boolean);

  if (benchmarkData.length === 0) {
    return NextResponse.json({ message: '정산 완료! (업데이트 대상 없음)', data: [] });
  }

  // 5. Supabase의 price_benchmarks 테이블에 덮어쓰기
  const { error } = await supabase
    .from('price_benchmarks')
    .upsert(benchmarkData);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "정산 완료!", data: benchmarkData });
}
