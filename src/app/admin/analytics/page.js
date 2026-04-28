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

function startOfRange(type, now = new Date()) {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  if (type === 'today') return base;
  if (type === 'week') {
    base.setDate(base.getDate() - 6);
    return base;
  }
  // month: current month start
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function rangeLabel(type) {
  if (type === 'today') return '오늘';
  if (type === 'week') return '주간';
  return '월별';
}

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(value) {
  const [y, m] = String(value || '').split('-').map(Number);
  if (!y || !m) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0),
    };
  }
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0, 0),
    end: new Date(y, m, 1, 0, 0, 0, 0),
  };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [pageRange, setPageRange] = useState('today');
  const [contentRange, setContentRange] = useState('today');
  const [pageMonth, setPageMonth] = useState(monthValue());
  const [contentMonth, setContentMonth] = useState(monthValue());

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [eventsRes, postsRes] = await Promise.all([
          supabase
            .from('analytics_events')
            .select('event_name, session_id, page_path, page_type, target_url, source, medium, campaign, referrer, short_slug, search_query, metadata, created_at')
            .order('created_at', { ascending: false })
            .limit(50000),
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
          setError('analytics_events 테이블이 아직 없어 보입니다. scripts/sql/analytics_events.sql 을 먼저 실행해주세요.');
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

    const weeklyVisitors = trend.reduce((sum, item) => sum + item.visitors, 0);
    const weeklyClicks = trend.reduce((sum, item) => sum + item.clicks, 0);

    const sourceMediumMap = {};
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
    const slugTitleMap = new Map(blogPosts.map((post) => [post.slug, post.title || post.slug]));
    const toBlogLabel = (path) => {
      const slug = String(path || '').replace(/^\/blog\//, '');
      return slugTitleMap.get(slug) || decodeURIComponent(slug || path || '');
    };

    pageViews.forEach((e) => {
      const key = `${e.source || 'direct'} / ${e.medium || 'none'}`;
      sourceMediumMap[key] = (sourceMediumMap[key] || 0) + 1;

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
      .map(([path, stat]) => ({ path, label: toBlogLabel(path), views: stat.views, clicks: stat.clicks, ctr: percent(stat.clicks, stat.views) }))
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
      weeklyVisitors,
      weeklyClicks,
      totalCtr: percent(coupangClicks.length, pageViews.length),
      sourceMedium: topEntries(sourceMediumMap),
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

  const pageAnalytics = useMemo(() => {
    const start = pageRange === 'month' ? monthRange(pageMonth).start : startOfRange(pageRange);
    const end = pageRange === 'month' ? monthRange(pageMonth).end : null;
    const filteredPageViews = events.filter((e) => {
      if (e.event_name !== 'page_view') return false;
      const t = new Date(e.created_at);
      if (t < start) return false;
      if (end && t >= end) return false;
      return true;
    });
    const sourceMediumMap = {};
    const campaignMap = {};
    const shortInflowMap = {};
    filteredPageViews.forEach((e) => {
      const key = `${e.source || 'direct'} / ${e.medium || 'none'}`;
      sourceMediumMap[key] = (sourceMediumMap[key] || 0) + 1;
      if (e.campaign) campaignMap[e.campaign] = (campaignMap[e.campaign] || 0) + 1;
      if (e.short_slug) shortInflowMap[e.short_slug] = (shortInflowMap[e.short_slug] || 0) + 1;
    });
    return {
      sourceMedium: topEntries(sourceMediumMap, 10),
      campaigns: topEntries(campaignMap, 10),
      shortInflows: topEntries(shortInflowMap, 10),
      views: filteredPageViews.length,
    };
  }, [events, pageMonth, pageRange]);

  const contentAnalytics = useMemo(() => {
    const start = contentRange === 'month' ? monthRange(contentMonth).start : startOfRange(contentRange);
    const end = contentRange === 'month' ? monthRange(contentMonth).end : null;
    const filteredPageViews = events.filter((e) => {
      if (e.event_name !== 'page_view') return false;
      const t = new Date(e.created_at);
      if (t < start) return false;
      if (end && t >= end) return false;
      return true;
    });
    const filteredInternalClicks = events.filter((e) => {
      if (e.event_name !== 'internal_click') return false;
      const t = new Date(e.created_at);
      if (t < start) return false;
      if (end && t >= end) return false;
      return true;
    });
    const blogViewMap = {};
    const hotdealViewMap = {};
    const productViewMap = {};
    const slugTitleMap = new Map(blogPosts.map((post) => [post.slug, post.title || post.slug]));

    const toBlogLabel = (path) => {
      const slug = String(path || '').replace(/^\/blog\//, '');
      return slugTitleMap.get(slug) || decodeURIComponent(slug || path || '');
    };

    filteredPageViews.forEach((e) => {
      const path = String(e.page_path || '');
      if (path.startsWith('/blog/')) {
        const label = toBlogLabel(path);
        blogViewMap[label] = (blogViewMap[label] || 0) + 1;
      }
      if (path.startsWith('/deal/')) hotdealViewMap[path] = (hotdealViewMap[path] || 0) + 1;
      if (path.startsWith('/coupang/')) productViewMap[path] = (productViewMap[path] || 0) + 1;
    });

    return {
      blogViews: topEntries(blogViewMap, 10),
      hotdealViews: topEntries(hotdealViewMap, 10),
      productViews: topEntries(productViewMap, 10),
      internalMoveRate: percent(filteredInternalClicks.length, filteredPageViews.length),
      views: filteredPageViews.length,
    };
  }, [blogPosts, contentMonth, contentRange, events]);

  const monthOptions = useMemo(() => {
    const keys = new Set([monthValue()]);
    for (const e of events) {
      if (!e?.created_at) continue;
      keys.add(monthValue(new Date(e.created_at)));
    }
    return Array.from(keys).sort((a, b) => (a > b ? -1 : 1)).slice(0, 24);
  }, [events]);

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

        <section className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">오늘통계</h2>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-gray-500">오늘 방문자</div>
              <div className="text-xl font-black text-gray-900">{analytics.todayVisitors}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-gray-500">오늘 쿠팡 클릭</div>
              <div className="text-xl font-black text-orange-500">{analytics.todayCoupangClickCount}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-gray-500">전체 CTR</div>
              <div className="text-xl font-black text-emerald-600">{analytics.totalCtr}%</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-gray-500">내부 이동률</div>
              <div className="text-xl font-black text-blue-600">{analytics.internalMoveRate}%</div>
            </div>
          </div>
        </section>

        <section className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">주간통계</h2>
          <div className="-mx-2 overflow-x-auto px-2 md:mx-0 md:px-0">
            <table className="w-full min-w-[620px] text-xs md:min-w-[760px] md:text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left">항목</th>
                  <th className="sticky left-[56px] z-10 bg-white px-2 py-2 text-center">전체</th>
                  {analytics.trend.map((d) => (
                    <th key={d.date} className="px-2 py-2 text-center whitespace-nowrap">{d.date}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b text-gray-700">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 font-semibold whitespace-nowrap">방문자</td>
                  <td className="sticky left-[56px] z-10 bg-white px-2 py-2 text-center font-semibold">{analytics.weeklyVisitors}</td>
                  {analytics.trend.map((d) => (
                    <td key={`vis-${d.date}`} className="px-2 py-2 text-center">{d.visitors}</td>
                  ))}
                </tr>
                <tr className="text-gray-700">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 font-semibold whitespace-nowrap">클릭</td>
                  <td className="sticky left-[56px] z-10 bg-white px-2 py-2 text-center font-semibold">{analytics.weeklyClicks}</td>
                  {analytics.trend.map((d) => (
                    <td key={`clk-${d.date}`} className="px-2 py-2 text-center">{d.clicks}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">페이지 분석</h2>
          <div className="mb-3 flex items-center gap-2">
            {['today', 'week', 'month'].map((key) => (
              <button
                key={key}
                onClick={() => setPageRange(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${pageRange === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {rangeLabel(key)}
              </button>
            ))}
            {pageRange === 'month' && (
              <select
                value={pageMonth}
                onChange={(e) => setPageMonth(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <span className="text-[11px] text-gray-400">{pageAnalytics.views} views</span>
          </div>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div><div className="mb-1 font-semibold text-gray-500">source / medium</div>{pageAnalytics.sourceMedium.slice(0, 10).map((x) => <div key={x.key} className="text-gray-700">{x.key} · {x.value}</div>)}</div>
            <div><div className="mb-1 font-semibold text-gray-500">UTM campaign</div>{pageAnalytics.campaigns.slice(0, 10).map((x) => <div key={x.key} className="text-gray-700">{x.key} · {x.value}</div>)}</div>
            <div className="md:col-span-2"><div className="mb-1 font-semibold text-gray-500">단축링크별 유입</div>{pageAnalytics.shortInflows.slice(0, 10).map((x) => <div key={x.key} className="text-gray-700">/s/{x.key} · {x.value}</div>)}</div>
          </div>
        </section>

        <section className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">콘텐츠 분석</h2>
          <div className="mb-3 flex items-center gap-2">
            {['today', 'week', 'month'].map((key) => (
              <button
                key={key}
                onClick={() => setContentRange(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${contentRange === key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {rangeLabel(key)}
              </button>
            ))}
            {contentRange === 'month' && (
              <select
                value={contentMonth}
                onChange={(e) => setContentMonth(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <span className="text-[11px] text-gray-400">{contentAnalytics.views} views</span>
          </div>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div><div className="font-semibold text-gray-500">블로그 글별 조회수</div>{contentAnalytics.blogViews.slice(0, 10).map((x) => <div key={x.key} className="truncate">{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">핫딜 페이지별 조회수</div>{contentAnalytics.hotdealViews.slice(0, 10).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">상품 페이지별 조회수</div>{contentAnalytics.productViews.slice(0, 10).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">내부 이동률</div><div>{contentAnalytics.internalMoveRate}%</div></div>
          </div>
        </section>

        <section className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">전환 분석</h2>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div><div className="font-semibold text-gray-500">쿠팡 클릭</div><div>{analytics.totalCoupangClicks}</div></div>
            <div><div className="font-semibold text-gray-500">상품별 클릭</div>{analytics.productClicks.slice(0, 6).map((x) => <div key={x.key} className="truncate">{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">글별 쿠팡 CTR</div>{analytics.blogCtr.slice(0, 6).map((x) => <div key={x.path} className="truncate">{x.label} · {x.ctr}%</div>)}</div>
            <div><div className="font-semibold text-gray-500">유입 채널별 쿠팡 CTR</div>{analytics.channelCtr.slice(0, 6).map((x) => <div key={x.channel}>{x.channel} · {x.ctr}%</div>)}</div>
          </div>
        </section>

        <section className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-3 text-sm font-bold text-gray-700">검색 분석</h2>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div><div className="font-semibold text-gray-500">검색어</div>{analytics.searchTerms.slice(0, 8).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
            <div><div className="font-semibold text-gray-500">검색 후 클릭률</div>{analytics.searchCtr.slice(0, 8).map((x) => <div key={x.query}>{x.query} · {x.ctr}% ({x.clicks}/{x.searches})</div>)}</div>
            <div className="md:col-span-2"><div className="font-semibold text-gray-500">검색 결과 없음</div>{analytics.noResultTerms.slice(0, 8).map((x) => <div key={x.key}>{x.key} · {x.value}</div>)}</div>
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
