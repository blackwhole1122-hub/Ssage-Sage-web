'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';

function CoupangHotdealsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✨ URL 파라미터에서 초기값 읽기
  const [category, setCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [discountFilter, setDiscountFilter] = useState("전체");
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [showDiscountMenu, setShowDiscountMenu] = useState(false);

  const categories = ["전체", "식품", "가전", "생활용품", "뷰티", "패션", "기타"];
  const categoryIcons = { "전체": "🏷️", "식품": "🍎", "가전": "📺", "생활용품": "🧴", "뷰티": "💄", "패션": "👕", "기타": "📦" };

  useEffect(() => {
  setCategory(searchParams.get('category') || "전체");
  setSearchQuery(searchParams.get('q') || "");
  setDiscountFilter(searchParams.get('discount') || "전체");
}, [searchParams]);

  // ✨ 필터 상태를 URL에 반영하는 함수
  const updateURL = useCallback((newCategory, newQuery, newDiscount) => {
    const params = new URLSearchParams();
    if (newCategory && newCategory !== "전체") params.set('category', newCategory);
    if (newQuery) params.set('q', newQuery);
    if (newDiscount && newDiscount !== "전체") params.set('discount', newDiscount);
    
    const query = params.toString();
    const fullUrl = `/coupang${query ? `?${query}` : ''}`;
    router.push(fullUrl, { scroll: false });
    
    // ✨ 현재 URL을 세션 스토리지에 저장
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('coupangListUrl', fullUrl);
    }
  }, [router]);

  // ✨ 페이지 로드 시에도 현재 URL 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('coupangListUrl', currentUrl);
    }
  }, [category, searchQuery, discountFilter]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch('/api/coupang/reclassify', { method: 'POST' }).catch(() => {});
  }, []);

  const requestIdRef = useRef(0);

  const fetchDeals = useCallback(async (pageNum = 0, reset = false) => {
    const requestId = ++requestIdRef.current;

    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * 20;
    const to = from + 19;

    let query = supabase
      .from('coupang_hotdeals')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (category !== "전체") query = query.eq('category', category);
    if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
    if (discountFilter === "50~60%") query = query.gte('discount_rate', 50).lt('discount_rate', 60);
    else if (discountFilter === "60~70%") query = query.gte('discount_rate', 60).lt('discount_rate', 70);
    else if (discountFilter === "70% 이상") query = query.gte('discount_rate', 70);

    const { data, error } = await query;

    if (requestId !== requestIdRef.current) return;

    if (error) {
      console.error('데이터 실패:', error);
    } else {
      setAllDeals((prev) => {
        const next = data || [];
        if (reset) return next;
        return Array.from(new Map([...prev, ...next].map((item) => [item.product_id, item])).values());
      });
      setHasMore((data || []).length === 20);
    }

    if (pageNum === 0) setLoading(false);
    else setLoadingMore(false);
  }, [category, searchQuery, discountFilter]);

  useEffect(() => { setPage(0); fetchDeals(0, true); }, [category, searchQuery, discountFilter, fetchDeals]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) { setPage(p => { const n = p + 1; fetchDeals(n); return n; }); } }, { threshold: 0.5 });
    if (observerRef.current) observer.observe(observerRef.current); return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchDeals]);

  return (
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">
      <div className="sticky top-0 z-30">
        <header className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <Link href="/coupang" className="flex items-center"><img src="/logo-coupang-hotdeal.png" alt="쿠팡핫딜" className="h-12 w-auto object-contain" /></Link>
          <div className="flex items-center gap-1">
            {user ? (<Link href="/mypage" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E6FAF9] text-[#0ABAB5] text-[13px] font-semibold">{user.user_metadata?.display_name || "회원"}님</Link>
            ) : (<Link href="/login" className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-[#64748B]">로그인</Link>)}
          </div>
        </header>
        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5 border-b border-[#E2E8F0]">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">핫딜모음</Link>
          <Link href="/coupang" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">쿠팡핫딜</Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">핫딜온도계</Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">정보모음</Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">유틸리티</Link>
        </nav>
        <div className="bg-[#FFF9E6] px-4 py-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="쿠팡 핫딜을 검색해 보세요"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] focus:border-transparent focus:bg-white text-[14px] placeholder:text-[#94A3B8] transition-all"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                updateURL(category, value, discountFilter);
              }}
            />
          </div>
        </div>
        <div className="bg-[#FFF9E6] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-1 px-3 py-2">
            <div className="relative flex-shrink-0">
              <button onClick={() => setShowDiscountMenu(!showDiscountMenu)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${discountFilter !== "전체" ? 'bg-[#FF6B6B] text-white' : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0]'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {discountFilter !== "전체" ? discountFilter : "할인율"}
              </button>
              {showDiscountMenu && (
                <div className="absolute top-11 left-0 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-30 p-1.5 w-40 animate-slide-down">
                  {["전체", "50~60%", "60~70%", "70% 이상"].map((df) => (
                    <button key={df} onClick={() => { 
                      setDiscountFilter(df); 
                      setShowDiscountMenu(false);
                      updateURL(category, searchQuery, df);
                    }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${discountFilter === df ? 'bg-[#FF6B6B] text-white' : 'text-[#1E293B] hover:bg-[#FAF6F0]'}`}>
                      {df === "전체" ? "할인율 전체" : df}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 pl-1">
              {categories.map((c) => (
                <button key={c} onClick={() => {
                  setCategory(c);
                  updateURL(c, searchQuery, discountFilter);
                }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${category === c ? 'bg-[#0ABAB5] text-white' : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0]'}`}>
                  <span className="text-[12px]">{categoryIcons[c]}</span>{c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 pt-3 pb-10">
        {loading && (<div className="flex flex-col items-center justify-center py-24 gap-3"><div className="loading-spinner"></div><span className="text-[14px] text-[#64748B]">쿠팡 핫딜을 불러오고 있어요</span></div>)}
        {!loading && allDeals.length === 0 && (<div className="flex flex-col items-center justify-center py-24 gap-2"><span className="text-4xl">🛒</span><p className="text-[15px] font-semibold text-[#1E293B]">상품이 없어요</p></div>)}
        <div className="flex flex-col gap-2">
          {!loading && allDeals.map((deal) => (
            <Link key={deal.product_id} href={`/coupang/${deal.product_id}`} className="deal-card relative flex gap-3.5 p-3.5 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              {deal.discount_rate >= 50 && (<div className="absolute top-2.5 left-2.5 bg-[#FF6B6B] text-white font-extrabold text-[11px] px-2 py-1 rounded-lg z-10">{deal.discount_rate}%</div>)}
              <div className="w-[100px] h-[100px] flex-shrink-0 rounded-xl overflow-hidden bg-white border border-[#E2E8F0] p-1.5">
                <img src={deal.image_url || '/coupang-default.png'} alt={deal.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <span className="inline-block text-[11px] font-semibold text-[#64748B] bg-[#FAF6F0] px-2 py-0.5 rounded-md mb-1.5">{deal.category}</span>
                  <p className="text-[14px] font-medium text-[#1E293B] line-clamp-2 leading-[1.4] mb-1.5">{deal.name}</p>
                </div>
                <div>
                  {deal.original_price > 0 && (<div className="flex items-center gap-1.5 mb-0.5"><span className="text-[12px] text-[#94A3B8] line-through">{deal.original_price.toLocaleString()}원</span><span className="text-[11px] font-bold text-[#FF6B6B]">-{deal.discount_rate}%</span></div>)}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[17px] font-extrabold text-[#FF6B6B]">{deal.discount_price.toLocaleString()}원</span>
                    <span className="text-[11px] font-bold text-[#5CE1E6]">특가</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div ref={observerRef} className="py-8 text-center">
          {loadingMore && (<div className="flex items-center justify-center gap-2"><div className="loading-spinner"></div><span className="text-[13px] text-[#64748B]">더 불러오는 중</span></div>)}
          {!hasMore && !loading && (<p className="text-[13px] text-[#94A3B8]">마지막 핫딜입니다</p>)}
        </div>
      </main>
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
export default function CoupangHotdealsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">쿠팡 핫딜을 불러오는 중...</div>}>
      <CoupangHotdealsInner />
    </Suspense>
  );
}
