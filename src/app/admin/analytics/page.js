'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { buildBlogShortUrl, encodeBlogShortSlug } from '@/lib/shortLinks';

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function dayLabel(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toHost(value = '') {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function topEntries(mapLike, limit = 10) {
  return Object.entries(mapLike)
    .map(([key, value]) => ({ key, value: asNumber(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin');
        return;
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);

      setLoading(true);
      setError('');
      try {
        const [eventsRes, postsRes] = await Promise.all([
          supabase
            .from('analytics_events')
            .select('event_name, session_id, page_path, page_type, target_url, source, medium, campaign, referrer, short_slug, search_query, metadata, created_at')
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: false })
            .limit(10000),
          supabase
            .from('blog_posts')
            .select('id, slug, title, published')
            .eq('published', true)
            .order('created_at', { ascending: false }),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (postsRes.error) throw postsRes.error;

        setEvents(eventsRes.data || []);
        setBlogPosts(postsRes.data || []);
      } catch (e) {
        const msg = String(e?.message || e || '');
        if (msg.includes('analytics_events')) {
          setError('analytics_events 테이블이 아직 없어 보입니다. 아래 SQL 파일을 먼저 실행해 주세요: scripts/sql/analytics_events.sql');
        } else {
          setError(msg || '유입분석 로딩 실패');
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const analytics = useMemo(() => {
    const now = new Date();
    const todayStart = startOfToday();
    const pageViews = events.filter((e) => e.event_name === 'page_view');
    const coupangClicks = events.filter((e) => e.event_name === 'coupang_click');
    const shortLinkClicks = events.filter((e) => e.event_name === 'short_link_click');
    const internalClicks = events.filter((e) => e.event_name === 'internal_click');
    const productClicks = events.filter((e) => e.event_name === 'product_click');
    const searchResults = events.filter((e) => e.event_name === 'search_result');
    const searchClicks = events.filter((e) => e.event_name === 'search_click');

    const pageViewsToday = pageViews.filter((e) => new Date(e.created_at) >= todayStart);
    const todayVisitorsSet = new Set(pageViewsToday.map((e) => e.session_id).filter(Boolean));
    const todayCoupangClickCount = coupangClicks.filter((e) => new Date(e.created_at) >= todayStart).length;

    const trend = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const dayPageViews = pageViews.filter((e) => {
        const t = new Date(e.created_at);
        return t >= start && t < end;
      });
      const dayCoupangClicks = coupangClicks.filter((e) => {
        const t = new Date(e.created_at);
        return t >= start && t < end;
      });

      trend.push({
        date: dayLabel(start),
        visitors: new Set(dayPageViews.map((e) => e.session_id).filter(Boolean)).size,
        clicks: dayCoupangClicks.length,
      });
    }

    const sourceMediumMap = {};
    const referrerMap = {};
    const campaignMap = {};
    const shortInflowMap = {};
    const blogViewMap = {};
    const hotdealViewMap = {};
    const productViewMap = {};
    const productClickMap = {};
    const blogCtrMap = {};
    const channelMap = {};
    const searchQueryMap = {};
    const searchQueryClickMap = {};
    const noResultCountMap = {};
    const shortConversionMap = {};

    pageViews.forEach((e) => {
      const key = `${e.source || 'direct'} / ${e.medium || 'none'}`;
      sourceMediumMap[key] = (sourceMediumMap[key] || 0) + 1;

      const refHost = toHost(e.referrer || '') || (e.referrer ? e.referrer : 'direct');
      referrerMap[refHost || 'direct'] = (referrerMap[refHost || 'direct'] || 0) + 1;

      if (e.campaign) campaignMap[e.campaign] = (campaignMap[e.campaign] || 0) + 1;
      if (e.short_slug) shortInflowMap[e.short_slug] = (shortInflowMap[e.short_slug] || 0) + 1;

      if (String(e.page_path || '').startsWith('/blog/')) {
        blogViewMap[e.page_path] = (blogViewMap[e.page_path] || 0) + 1;
        if (!blogCtrMap[e.page_path]) blogCtrMap[e.page_path] = { views: 0, clicks: 0 };
        blogCtrMap[e.page_path].views += 1;
      }
      if (String(e.page_path || '').startsWith('/deal/')) {
        hotdealViewMap[e.page_path] = (hotdealViewMap[e.page_path] || 0) + 1;
      }
      if (String(e.page_path || '').startsWith('/coupang/')) {
        productViewMap[e.page_path] = (productViewMap[e.page_path] || 0) + 1;
      }

      const channelKey = `${e.source || 'direct'} / ${e.medium || 'none'}`;
      if (!channelMap[channelKey]) channelMap[channelKey] = { views: 0, clicks: 0 };
      channelMap[channelKey].views += 1;
    });

    coupangClicks.forEach((e) => {
      if (e.target_url) productClickMap[e.target_url] = (productClickMap[e.target_url] || 0) + 1;
      if (String(e.page_path || '').startsWith('/blog/')) {
        if (!blogCtrMap[e.page_path]) blogCtrMap[e.page_path] = { views: 0, clicks: 0 };
        blogCtrMap[e.page_path].clicks += 1;
      }
      const channelKey = `${e.source || 'direct'} / ${e.medium || 'none'}`;
      if (!channelMap[channelKey]) channelMap[channelKey] = { views: 0, clicks: 0 };
      channelMap[channelKey].clicks += 1;
      if (e.short_slug) shortConversionMap[e.short_slug] = (shortConversionMap[e.short_slug] || 0) + 1;
    });

    searchResults.forEach((e) => {
      const q = (e.search_query || '').trim() || '(empty)';
      searchQueryMap[q] = (searchQueryMap[q] || 0) + 1;
      if (e?.metadata?.noResults) noResultCountMap[q] = (noResultCountMap[q] || 0) + 1;
    });

    searchClicks.forEach((e) => {
      const q = (e.search_query || '').trim() || '(empty)';
      searchQueryClickMap[q] = (searchQueryClickMap[q] || 0) + 1;
    });

    const blogCtr = Object.entries(blogCtrMap)
      .map(([path, stat]) => ({ path, views: stat.views, clicks: stat.clicks, ctr: percent(stat.clicks, stat.views) }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 10);

    const channelCtr = Object.entries(channelMap)
      .map(([channel, stat]) => ({ channel, views: stat.views, clicks: stat.clicks, ctr: percent(stat.clicks, stat.views) }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 10);

    const searchCtr = Object.entries(searchQueryMap)
      .map(([query, count]) => ({
        query,
        searches: count,
        clicks: searchQueryClickMap[query] || 0,
        ctr: percent(searchQueryClickMap[query] || 0, count),
      }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10);

    const shortLinkRows = blogPosts
      .map((post) => {
        const slug = encodeBlogShortSlug(post.id);
        if (!slug) return null;
        const clicks = shortLinkClicks.filter((e) => e.short_slug === slug).length;
        const conversions = shortConversionMap[slug] || 0;
        return {
          slug,
          targetUrl: `/blog/${post.slug}`,
          clickCount: clicks,
          conversionRate: percent(conversions, clicks),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 50);

    return {
      todayVisitors: todayVisitorsSet.size,
      todayCoupangClickCount,
      trend,
      totalCtr: percent(coupangClicks.length, pageViews.length),
      sourceMedium: topEntries(sourceMediumMap),
      referrers: topEntries(referrerMap),
      campaigns: topEntries(campaignMap),
      shortInflows: topEntries(shortInflowMap),
      blogViews: topEntries(blogViewMap),
      hotdealViews: topEntries(hotdealViewMap),
      productViews: topEntries(productViewMap),
      internalMoveRate: percent(internalClicks.length, pageViews.length),
      totalCoupangClicks: coupangClicks.length,
      productClicks: topEntries(productClickMap),
      blogCtr,
      channelCtr,
      searchTerms: topEntries(searchQueryMap),
      searchCtr,
      noResultTerms: topEntries(noResultCountMap),
      shortLinkRows,
      rangeLabel: `${dayLabel(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30))} ~ ${dayLabel(now)}`,
    };
  }, [events, blogPosts]);

  const cardClass = 'rounded-3xl border border-gray-100 bg-white p-5 shadow-sm';
  const tableClass = 'w-full text-sm';

  if (loading) {
    return <div className="p-10 text-center text-gray-400">유입분석 불러오는 중...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto bg-gray-50 min-h-screen pb-10">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/dashboard')} className="text-xl text-gray-400 hover:text-gray-700">←</button>
          <h1 className="text-lg font-bold text-gray-800">유입분석</h1>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">{analytics.rangeLabel}</span>
        </div>
      </header>

      <main className="grid gap-4 p-4 md:grid-cols-2">
        {error && (
          <section className={`${cardClass} md:col-span-2 border-red-100 bg-red-50 text-sm text-red-700`}>
            {error}
          </section>
        )}

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">유입분석 아이콘</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-gray-50 p-3"><div className="text-gray-500">오늘 방문자</div><div className="text-xl font-black text-gray-900">{analytics.todayVisitors}</div></div>
            <div className="rounded-2xl bg-gray-50 p-3"><div className="text-gray-500">오늘 쿠팡 클릭</div><div className="text-xl font-black text-orange-500">{analytics.todayCoupangClickCount}</div></div>
            <div className="rounded-2xl bg-gray-50 p-3"><div className="text-gray-500">전체 CTR</div><div className="text-xl font-black text-emerald-600">{analytics.totalCtr}%</div></div>
            <div className="rounded-2xl bg-gray-50 p-3"><div className="text-gray-500">내부 이동률</div><div className="text-xl font-black text-blue-600">{analytics.internalMoveRate}%</div></div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-gray-500">최근 7일 추이</div>
            <div className="space-y-1 text-xs">
              {analytics.trend.map((d) => (
                <div key={d.date} className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1">
                  <span>{d.date}</span>
                  <span>방문 {d.visitors} / 클릭 {d.clicks}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">페이지 분석</h2>
          <div className="space-y-3">
            <div><div className="mb-1 text-xs font-semibold text-gray-500">source / medium</div>{topEntries(Object.fromEntries(analytics.sourceMedium.map((x) => [x.key, x.value])), 6).map((x) => <div key={x.key} className="text-xs text-gray-700">{x.key} · {x.value}</div>)}</div>
            <div><div className="mb-1 text-xs font-semibold text-gray-500">referrer</div>{analytics.referrers.slice(0, 6).map((x) => <div key={x.key} className="text-xs text-gray-700">{x.key} · {x.value}</div>)}</div>
            <div><div className="mb-1 text-xs font-semibold text-gray-500">UTM campaign</div>{analytics.campaigns.slice(0, 6).map((x) => <div key={x.key} className="text-xs text-gray-700">{x.key} · {x.value}</div>)}</div>
            <div><div className="mb-1 text-xs font-semibold text-gray-500">단축링크별 유입</div>{analytics.shortInflows.slice(0, 6).map((x) => <div key={x.key} className="text-xs text-gray-700">/s/{x.key} · {x.value}</div>)}</div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">콘텐츠 분석</h2>
          <div className="space-y-3 text-xs">
            <div><div className="font-semibold text-gray-500">블로그 글별 조회수</div>{analytics.blogViews.slice(0, 6).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">핫딜 페이지별 조회수</div>{analytics.hotdealViews.slice(0, 6).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">상품 페이지별 조회수</div>{analytics.productViews.slice(0, 6).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">내부 이동률</div><div>{analytics.internalMoveRate}%</div></div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">전환 분석</h2>
          <div className="space-y-3 text-xs">
            <div><div className="font-semibold text-gray-500">쿠팡 클릭</div><div>{analytics.totalCoupangClicks}</div></div>
            <div><div className="font-semibold text-gray-500">상품별 클릭</div>{analytics.productClicks.slice(0, 6).map((x) => <div key={x.key} className="truncate">{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">글별 쿠팡 CTR</div>{analytics.blogCtr.slice(0, 6).map((x) => <div key={x.path}>{x.path} · {x.ctr}%</div>)}</div>
            <div><div className="font-semibold text-gray-500">유입 채널별 쿠팡 CTR</div>{analytics.channelCtr.slice(0, 6).map((x) => <div key={x.channel}>{x.channel} · {x.ctr}%</div>)}</div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">검색 분석</h2>
          <div className="space-y-3 text-xs">
            <div><div className="font-semibold text-gray-500">검색어</div>{analytics.searchTerms.slice(0, 8).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">검색 후 클릭률</div>{analytics.searchCtr.slice(0, 8).map((x) => <div key={x.query}>{x.query} · {x.ctr}% ({x.clicks}/{x.searches})</div>)}</div>
            <div><div className="font-semibold text-gray-500">검색 결과 없음</div>{analytics.noResultTerms.slice(0, 8).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
          </div>
        </section>

        <section className={`${cardClass} md:col-span-2`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">단축링크 관리</h2>
            <Link href="/blog" className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200">블로그 보기</Link>
          </div>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="px-2 py-2">slug</th>
                  <th className="px-2 py-2">target_url</th>
                  <th className="px-2 py-2">클릭 수</th>
                  <th className="px-2 py-2">전환율</th>
                </tr>
              </thead>
              <tbody>
                {analytics.shortLinkRows.map((row) => (
                  <tr key={row.slug} className="border-b text-xs text-gray-700">
                    <td className="px-2 py-2 font-mono">{row.slug}</td>
                    <td className="px-2 py-2">
                      <a href={buildBlogShortUrl(row.slug, typeof window !== 'undefined' ? window.location.origin : '')} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {row.targetUrl}
                      </a>
                    </td>
                    <td className="px-2 py-2">{row.clickCount}</td>
                    <td className="px-2 py-2">{row.conversionRate}%</td>
                  </tr>
                ))}
                {analytics.shortLinkRows.length === 0 && (
                  <tr>
                    <td className="px-2 py-6 text-center text-xs text-gray-400" colSpan={4}>아직 단축링크 데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

