'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useKeywordGroups } from '@/lib/keywords';
import { getUnitPrice, calculateGrade } from '@/lib/priceUtils';
import { matchesGroupByTitle } from '@/lib/keywordMatcher';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function HotdealsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✨ URL 파라미터에서 초기값 읽기
  const [category, setCategory] = useState("전체");
  const [sourceFilter, setSourceFilter] = useState("전체");
  const [showSourceFilter, setShowSourceFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
  setCategory(searchParams.get('category') || "전체");
  setSourceFilter(searchParams.get('source') || "전체");
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

  // ✨ 필터 상태를 URL에 반영하는 함수
  const updateURL = useCallback((newCategory, newSource, newQuery) => {
    const params = new URLSearchParams();
    if (newCategory && newCategory !== "전체") params.set('category', newCategory);
    if (newSource && newSource !== "전체") params.set('source', newSource);
    if (newQuery) params.set('q', newQuery);
    
    const query = params.toString();
    const fullUrl = `/hotdeals${query ? `?${query}` : ''}`;
    router.push(fullUrl, { scroll: false });
    
    // ✨ 현재 URL을 세션 스토리지에 저장 (상세 페이지에서 뒤로가기 시 사용)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dealListUrl', fullUrl);
    }
  }, [router]);

  // sessionStorage는 updateURL()에서만 저장 (race condition 방지)

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
    .neq('source', 'zod')  // ZOD 게시물 제외
    .order('crawled_at', { ascending: false })
    .range(from, to);

  if (sourceFilter !== "전체") query = query.eq('source', sourceFilter);
  if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

  const { data, error } = await query;

  if (requestId !== requestIdRef.current) return;

  if (error) {
    console.error('데이터 불러오기 실패:', error);
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
      try { const { data, error } = await supabase.from('price_benchmarks').select('slug, ref_low, ref_avg'); if (error) throw error; const m = {}; data.forEach(i => { m[i.slug] = i; }); setPriceStats(m); } catch (e) { console.error('기준가 불러오기 실패:', e); }
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
    "식품": ["식품", "먹거리", "음식", "건강", "생활/식품"], "생활잡화": ["생활", "잡화", "생활용품", "자동차"],
    "게임": ["게임", "게임 S/W", "게임 H/W"], "PC": ["PC", "컴퓨터", "노트북", "하드웨어", "디지털"],
    "가전": ["가전", "전자", "TV", "A/V", "전자/IT"], "의류": ["의류", "패션", "잡화"],
    "화장품": ["화장품", "뷰티"], "기타": ["기타", "상품권", "취미", "여행"],
  };
  const categories = ["전체", "식품", "생활잡화", "게임", "PC", "가전", "의류", "화장품", "기타"];
  const sources = ["전체", "dogdrip", "fmkorea", "arca", "clien", "ppomppu", "quasarzone", "ruliweb"];
  const sourceLabel = { dogdrip: "개드립", fmkorea: "에펨코리아", arca: "아카라이브", clien: "클리앙", ppomppu: "뽐뿌", quasarzone: "퀘이사존", ruliweb: "루리웹" };
  const filteredDeals = allDeals.filter((deal) => category === "전체" || categoryKeywords[category]?.some(k => deal.category?.includes(k)));

  const gradeBadge = {
    "역대급": { bg: "bg-[#7C3AED]", text: "text-white", icon: "🔥" },
    "대박":   { bg: "bg-[#FF6B6B]", text: "text-white", icon: "🎉" },
    "중박":   { bg: "bg-[#FB923C]", text: "text-white", icon: "👍" },
    "평범":   { bg: "bg-[#9CA3AF]", text: "text-white", icon: "" },
    "구매금지": { bg: "bg-[#374151]", text: "text-white", icon: "🚫" },
  };
  const categoryIcons = { "전체": "🏷️", "식품": "🍎", "생활잡화": "🧴", "게임": "🎮", "PC": "💻", "가전": "📺", "의류": "👕", "화장품": "💄", "기타": "📦" };

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
    const benchmark = priceStats[matchedGroup.slug]; if (!benchmark) return null;
    const raw = parseInt(deal.price?.replace(/[^\d]/g, '') || "0");
    const { price: up, label: ul } = getUnitPrice({ price_num: raw }, deal.title);
    if (up <= 0) return null;
    const grade = calculateGrade(up, benchmark.ref_low, benchmark.ref_avg);
    return { grade, unitPrice: up, unitLabel: ul, refAvg: benchmark.ref_avg };
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-30">
        <header className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo-ssagesage.png" alt="싸게사게" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1">
            {user ? (
              <Link href="/mypage" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E6FAF9] text-[#0ABAB5] text-[13px] font-semibold hover:bg-[#CCF5F3] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {user.user_metadata?.display_name || "회원"}님
              </Link>
            ) : (
              <Link href="/login" className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-[#64748B] hover:bg-[#F0EAE0] transition-colors">로그인</Link>
            )}
          </div>
        </header>

        {/* ── 네비게이션 탭 ── */}
        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5 border-b border-[#E2E8F0]">
          <Link href="/hotdeals" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">핫딜모음</Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">쿠팡핫딜</Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">핫딜온도계</Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">정보모음</Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">유틸리티</Link>
        </nav>

        {/* ── 검색바 ── */}
        <div className="bg-[#FFF9E6] px-4 py-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="어떤 핫딜을 찾으시나요?"
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

        {/* ── 카테고리 + 출처 필터 ── */}
        <div className="bg-[#FFF9E6] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-1 px-3 py-2">
            <div className="relative flex-shrink-0">
              <button onClick={() => setShowSourceFilter(!showSourceFilter)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${sourceFilter !== "전체" ? 'bg-[#0ABAB5] text-white' : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F0EAE0]'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {sourceFilter !== "전체" ? sourceLabel[sourceFilter] : "출처"}
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
                      {s === "전체" ? "전체 커뮤니티" : sourceLabel[s] || s}
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

      {/* ── 딜 리스트 ── */}
      <main className="px-4 pt-3 pb-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="loading-spinner"></div>
            <span className="text-[14px] text-[#64748B]">핫딜을 불러오고 있어요</span>
          </div>
        )}
        {!loading && filteredDeals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <span className="text-4xl">🦀</span>
            <p className="text-[15px] font-semibold text-[#1E293B]">{searchQuery ? `"${searchQuery}" 결과가 없어요` : "핫딜이 아직 없어요"}</p>
            <p className="text-[13px] text-[#64748B]">잠시 후 다시 확인해 주세요</p>
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
                        {new Date(deal.crawled_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-[#1E293B] line-clamp-2 leading-[1.4] mb-1.5">{deal.title}</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      {gradeInfo && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] text-[#0ABAB5] font-semibold">{gradeInfo.unitLabel} {Math.floor(gradeInfo.unitPrice).toLocaleString()}원</span>
                          <span className="text-[11px] text-[#94A3B8]">평균 {Math.floor(gradeInfo.refAvg).toLocaleString()}원</span>
                        </div>
                      )}
                      <p className="text-[16px] font-extrabold text-[#FF6B6B]">{deal.price || "가격미정"}</p>
                    </div>
                    <svg className="text-[#CBD5E1] flex-shrink-0 mb-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div ref={observerRef} className="py-8 text-center">
          {loadingMore && (<div className="flex items-center justify-center gap-2"><div className="loading-spinner"></div><span className="text-[13px] text-[#64748B]">더 불러오는 중</span></div>)}
          {!hasMore && !loading && (<p className="text-[13px] text-[#94A3B8]">모든 핫딜을 확인했어요</p>)}
        </div>
      </main>

      {/* ── 푸터 ── */}
      <footer className="bg-white border-t border-[#E2E8F0] px-4 py-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[20px]">🦀</span>
          <span className="text-[14px] font-bold text-[#1E293B]">싸게사게</span>
        </div>
        <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">커뮤니티 핫딜을 실시간으로 모아보고,<br/>핫딜온도계로 진짜 최저가를 찾아드립니다.</p>
        <div className="flex items-center gap-3 text-[12px]">
          <a href="/privacy" className="text-[#64748B] hover:text-[#1E293B] transition-colors">개인정보처리방침</a>
          <span className="text-[#CBD5E1]">·</span>
          <span className="text-[#94A3B8]">© 2026 싸게사게</span>
        </div>
      </footer>
    </div>
  );
}

export default function HotdealsListPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">핫딜을 불러오는 중...</div>}>
      <HotdealsListInner />
    </Suspense>
  );
}
