'use client'
import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useKeywordGroups } from '@/lib/keywords';
import { getUnitPrice, calculateGrade } from '@/lib/priceUtils';
import { extractPreferredUnitFromKeywords, matchesGroupByTitle } from '@/lib/keywordMatcher';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';

function HotdealsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ??URL ?뚮씪誘명꽣?먯꽌 珥덇린媛??쎄린
  const [category, setCategory] = useState("?꾩껜");
  const [sourceFilter, setSourceFilter] = useState("?꾩껜");
  const [showSourceFilter, setShowSourceFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
  setCategory(searchParams.get('category') || "?꾩껜");
  setSourceFilter(searchParams.get('source') || "?꾩껜");
  setSearchQuery(searchParams.get('q') || "");
}, [searchParams]);

  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [priceStats, setPriceStats] = useState({});
  const observerRef = useRef(null);
  const requestIdRef = useRef(0);
  const [user, setUser] = useState(null);
  const { allGroups, loading: kwLoading } = useKeywordGroups();
  const crawledAtFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    []
  );

  // ???꾪꽣 ?곹깭瑜?URL??諛섏쁺?섎뒗 ?⑥닔
  const updateURL = useCallback((newCategory, newSource, newQuery) => {
    const params = new URLSearchParams();
    if (newCategory && newCategory !== "?꾩껜") params.set('category', newCategory);
    if (newSource && newSource !== "?꾩껜") params.set('source', newSource);
    if (newQuery) params.set('q', newQuery);
    
    const query = params.toString();
    const fullUrl = `/hotdeals${query ? `?${query}` : ''}`;
    router.push(fullUrl, { scroll: false });
    
    // ???꾩옱 URL???몄뀡 ?ㅽ넗由ъ??????(?곸꽭 ?섏씠吏?먯꽌 ?ㅻ줈媛湲????ъ슜)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dealListUrl', fullUrl);
    }
  }, [router]);

  // sessionStorage??updateURL()?먯꽌留????(race condition 諛⑹?)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

const fetchDeals = useCallback(async (pageNum = 0, reset = false) => {
  const requestId = ++requestIdRef.current;

  if (pageNum === 0) setLoading(true);
  else setLoadingMore(true);

  const from = pageNum * 20;
  const to = from + 19;

  let query = supabase
    .from('hotdeals')
    .select('*')
    .neq('source', 'zod')  // ZOD 寃뚯떆臾??쒖쇅
    .order('crawled_at', { ascending: false })
    .range(from, to);

  if (sourceFilter !== "?꾩껜") query = query.eq('source', sourceFilter);
  if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

  const { data, error } = await query;

  if (requestId !== requestIdRef.current) return;

  if (error) {
    console.error('?곗씠??遺덈윭?ㅺ린 ?ㅽ뙣:', error);
  } else {
    setAllDeals((prev) => {
      const newData = data || [];
      if (reset) return newData;
      const combined = [...prev, ...newData];
      return Array.from(new Map(combined.map((item) => [item.id, item])).values());
    });
    setHasMore((data || []).length === 20);
  }

  if (pageNum === 0) setLoading(false);
  else setLoadingMore(false);
}, [sourceFilter, searchQuery]);

  useEffect(() => {
    async function fetchBenchmarks() {
      try { const { data, error } = await supabase.from('price_benchmarks').select('slug, ref_low, ref_avg'); if (error) throw error; const m = {}; data.forEach(i => { m[i.slug] = i; }); setPriceStats(m); } catch (e) { console.error('湲곗?媛 遺덈윭?ㅺ린 ?ㅽ뙣:', e); }
    }
    fetchDeals(0, true); fetchBenchmarks();
  }, [fetchDeals]);

  useEffect(() => { setPage(0); fetchDeals(0, true); }, [sourceFilter, searchQuery, fetchDeals]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) { setPage((prev) => { const next = prev + 1; fetchDeals(next); return next; }); }
    }, { threshold: 0.5 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchDeals]);

  const categoryKeywords = {
    "?앺뭹": ["?앺뭹", "癒밴굅由?, "?뚯떇", "嫄닿컯", "?앺솢/?앺뭹"], "?앺솢?≫솕": ["?앺솢", "?≫솕", "?앺솢?⑺뭹", "?먮룞李?],
    "寃뚯엫": ["寃뚯엫", "寃뚯엫 S/W", "寃뚯엫 H/W"], "PC": ["PC", "而댄벂??, "?명듃遺?, "?섎뱶?⑥뼱", "?붿???],
    "媛??: ["媛??, "?꾩옄", "TV", "A/V", "?꾩옄/IT"], "?섎쪟": ["?섎쪟", "?⑥뀡", "?≫솕"],
    "?붿옣??: ["?붿옣??, "酉고떚"], "湲고?": ["湲고?", "?곹뭹沅?, "痍⑤?", "?ы뻾"],
  };
  const categories = ["?꾩껜", "?앺뭹", "?앺솢?≫솕", "寃뚯엫", "PC", "媛??, "?섎쪟", "?붿옣??, "湲고?"];
  const sources = ["?꾩껜", "dogdrip", "fmkorea", "arca", "clien", "ppomppu", "quasarzone", "ruliweb"];
  const sourceLabel = { dogdrip: "媛쒕뱶由?, fmkorea: "?먰렓肄붾━??, arca: "?꾩뭅?쇱씠釉?, clien: "?대━??, ppomppu: "戮먮퓣", quasarzone: "?섏씠?ъ〈", ruliweb: "猷⑤━?? };
  const filteredDeals = allDeals.filter((deal) => category === "?꾩껜" || categoryKeywords[category]?.some(k => deal.category?.includes(k)));

  const gradeBadge = {
    "???湲?: { bg: "bg-[#7C3AED]", text: "text-white", icon: "?뵦" },
    "?諛?:   { bg: "bg-[#FF6B6B]", text: "text-white", icon: "?럦" },
    "以묐컯":   { bg: "bg-[#FB923C]", text: "text-white", icon: "?몟" },
    "?됰쾾":   { bg: "bg-[#9CA3AF]", text: "text-white", icon: "" },
    "援щℓ湲덉?": { bg: "bg-[#374151]", text: "text-white", icon: "?슟" },
  };
  const categoryIcons = { "?꾩껜": "?뤇截?, "?앺뭹": "?뜋", "?앺솢?≫솕": "?㎢", "寃뚯엫": "?렜", "PC": "?뮲", "媛??: "?벟", "?섎쪟": "?몧", "?붿옣??: "?뭵", "湲고?": "?벀" };

  const getDealGrade = (deal) => {
    const managedSlugs = allGroups.map(g => g.slug); let matchedGroup = null;
    if (deal.group_slug && managedSlugs.includes(deal.group_slug)) {
      const directGroup = allGroups.find(g => g.slug === deal.group_slug);
      if (directGroup && matchesGroupByTitle(deal.title, directGroup.keywords)) {
        matchedGroup = directGroup;
      }
    }
    if (!matchedGroup) {
      matchedGroup = allGroups.find(g => matchesGroupByTitle(deal.title, g.keywords));
    }
    if (!matchedGroup) return null;
    const preferredUnit = extractPreferredUnitFromKeywords(matchedGroup.keywords);
    const benchmark = priceStats[matchedGroup.slug]; if (!benchmark) return null;
    const raw = parseInt(deal.price?.replace(/[^\d]/g, '') || "0");
    const { price: up, label: ul } = getUnitPrice({ price_num: raw }, deal.title, preferredUnit);
    if (up <= 0) return null;
    const grade = calculateGrade(up, benchmark.ref_low, benchmark.ref_avg);
    return { grade, unitPrice: up, unitLabel: ul, refAvg: benchmark.ref_avg };
  };

  return (
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:justify-center lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">

      {/* ?? ?ㅻ뜑 ?? */}
      <div className="sticky top-0 z-30">
        <header className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo-ssagesage.png" alt="?멸쾶?ш쾶" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1">
            {user ? (
              <Link href="/mypage" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E6FAF9] text-[#0ABAB5] text-[13px] font-semibold hover:bg-[#CCF5F3] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {user.user_metadata?.display_name || "?뚯썝"}??
              </Link>
            ) : (
              <Link href="/login" className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-[#64748B] hover:bg-[#F0EAE0] transition-colors">濡쒓렇??/Link>
            )}
          </div>
        </header>

        {/* ?? ?ㅻ퉬寃뚯씠?????? */}
        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5 border-b border-[#E2E8F0]">
          <Link href="/hotdeals" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">?ル뵜紐⑥쓬</Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">荑좏뙜?ル뵜</Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">?ル뵜?⑤룄怨?/Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">?뺣낫紐⑥쓬</Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">?좏떥由ы떚</Link>
        </nav>

        {/* ?? 寃?됰컮 ?? */}
        <div className="bg-[#FFF9E6] px-4 py-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="?대뼡 ?ル뵜??李얠쑝?쒕굹??"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] focus:border-transparent focus:bg-white text-[14px] placeholder:text-[#94A3B8] transition-all"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                updateURL(category, sourceFilter, value);
              }}
            />
          </div>
        </div>

        {/* ?? 移댄뀒怨좊━ + 異쒖쿂 ?꾪꽣 ?? */}
        <div className="bg-[#FFF9E6] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-1 px-3 py-2">
            <div className="relative flex-shrink-0">
              <button onClick={() => setShowSourceFilter(!showSourceFilter)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${sourceFilter !== "?꾩껜" ? 'bg-[#0ABAB5] text-white' : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F0EAE0]'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {sourceFilter !== "?꾩껜" ? sourceLabel[sourceFilter] : "異쒖쿂"}
              </button>
              {showSourceFilter && (
                <div className="absolute top-11 left-0 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-30 p-1.5 w-40 animate-slide-down">
                  {sources.map((s) => (
                    <button key={s} onClick={() => { 
                      setSourceFilter(s); 
                      setShowSourceFilter(false); 
                      updateURL(category, s, searchQuery);
                    }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${sourceFilter === s ? 'bg-[#0ABAB5] text-white' : 'text-[#1E293B] hover:bg-[#FAF6F0]'}`}>
                      {s === "?꾩껜" ? "?꾩껜 而ㅻ??덊떚" : sourceLabel[s] || s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 pl-1">
              {categories.map((c) => (
                <button key={c} onClick={() => {
                  setCategory(c);
                  updateURL(c, sourceFilter, searchQuery);
                }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${category === c ? 'bg-[#0ABAB5] text-white' : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F0EAE0] hover:text-[#1E293B]'}`}>
                  <span className="text-[12px]">{categoryIcons[c]}</span>{c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ?? ??由ъ뒪???? */}
      <main className="px-4 pt-3 pb-10">
        <div className="lg:hidden mb-4 flex justify-center">
          <CoupangSidebarBanner mode="mobile" />
        </div>
{loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="loading-spinner"></div>
            <span className="text-[14px] text-[#64748B]">?ル뵜??遺덈윭?ㅺ퀬 ?덉뼱??/span>
          </div>
        )}
        {!loading && filteredDeals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <span className="text-4xl">??</span>
            <p className="text-[15px] font-semibold text-[#1E293B]">{searchQuery ? `"${searchQuery}" 寃곌낵媛 ?놁뼱?? : "?ル뵜???꾩쭅 ?놁뼱??}</p>
            <p className="text-[13px] text-[#64748B]">?좎떆 ???ㅼ떆 ?뺤씤??二쇱꽭??/p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {!loading && filteredDeals.map((deal, idx) => {
            const gradeInfo = getDealGrade(deal);
            const badge = gradeInfo?.grade ? gradeBadge[gradeInfo.grade] : null;
            return (
              <Link key={deal.id} href={`/deal/${deal.id}`} className="deal-card relative flex gap-3.5 p-3.5 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="w-[100px] h-[100px] flex-shrink-0 rounded-xl overflow-hidden bg-[#FAF6F0]">
                  <img src={deal.image || '/default-image.png'} alt={deal.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[12px] font-bold text-[#0ABAB5]">{sourceLabel[deal.source] || deal.source}</span>
                      {badge && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.text}`}>{badge.icon} {gradeInfo.grade}</span>
                      )}
                      <span className="text-[11px] text-[#94A3B8] ml-auto flex-shrink-0">
                        {crawledAtFormatter.format(new Date(deal.crawled_at))}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-[#1E293B] line-clamp-2 leading-[1.4] mb-1.5">{deal.title}</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      {gradeInfo && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] text-[#0ABAB5] font-semibold">{gradeInfo.unitLabel} {Math.floor(gradeInfo.unitPrice).toLocaleString()}??/span>
                          <span className="text-[11px] text-[#94A3B8]">?됯퇏 {Math.floor(gradeInfo.refAvg).toLocaleString()}??/span>
                        </div>
                      )}
                      <p className="text-[16px] font-extrabold text-[#FF6B6B]">{deal.price || "媛寃⑸???}</p>
                    </div>
                    <svg className="text-[#CBD5E1] flex-shrink-0 mb-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div ref={observerRef} className="py-8 text-center">
          {loadingMore && (<div className="flex items-center justify-center gap-2"><div className="loading-spinner"></div><span className="text-[13px] text-[#64748B]">??遺덈윭?ㅻ뒗 以?/span></div>)}
          {!hasMore && !loading && (<p className="text-[13px] text-[#94A3B8]">紐⑤뱺 ?ル뵜???뺤씤?덉뼱??/p>)}
        </div>
      </main>

      {/* ?? ?명꽣 ?? */}
      <footer className="bg-white border-t border-[#E2E8F0] px-4 py-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[20px]">??</span>
          <span className="text-[14px] font-bold text-[#1E293B]">?멸쾶?ш쾶</span>
        </div>
        <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">而ㅻ??덊떚 ?ル뵜???ㅼ떆媛꾩쑝濡?紐⑥븘蹂닿퀬,<br/>?ル뵜?⑤룄怨꾨줈 吏꾩쭨 理쒖?媛瑜?李얠븘?쒕┰?덈떎.</p>
        <div className="flex items-center gap-3 text-[12px]">
          <a href="/privacy" className="text-[#64748B] hover:text-[#1E293B] transition-colors">媛쒖씤?뺣낫泥섎━諛⑹묠</a>
          <span className="text-[#CBD5E1]">쨌</span>
          <span className="text-[#94A3B8]">짤 2026 ?멸쾶?ш쾶</span>
        </div>
      </footer>
          </div>

          <aside className="hidden lg:block w-[250px] shrink-0 pt-24 sticky top-24 self-start">
            <div>
              <CoupangSidebarBanner mode="desktop" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function HotdealsListPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">?ル뵜??遺덈윭?ㅻ뒗 以?..</div>}>
      <HotdealsListInner />
    </Suspense>
  );
}

