import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/lib/priceUtils';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';
import { buildThermometerMeta } from '@/lib/seoTemplates';
 
const categoryOrder = ['식품', '생활잡화', '가전/디지털', '상품권'];
const foodSubOrder = ['가공식품', '음료/탄산', '음료', '음료/에너지음료', '생수', '디저트/아이스크림', '신선식품', '쌀/잡곡', '영양제'];
const categoryIcons = {
  전체: '🏷️',
  식품: '🍎',
  생활잡화: '🧴',
  '가전/디지털': '📺',
  상품권: '🎫',
};

export const metadata = buildThermometerMeta({
  title: '핫딜온도계',
  description: '상품별 가격 이력과 기준가를 비교해 지금 구매해도 괜찮은지 빠르게 판단하세요.',
  path: '/hotdeal-thermometer',
});

export const revalidate = 300;

async function getThermometerData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [{ data: groups }, { data: benchmarks }] = await Promise.all([
    supabase.from('keyword_groups').select('slug, group_name, category, sub_category'),
    supabase.from('price_benchmarks').select('slug, ref_low, ref_avg'),
  ]);

  const benchmarkMap = new Map((benchmarks || []).map((bm) => [bm.slug, bm]));
  const enrichedGroups = (groups || []).map((group) => {
    const benchmark = benchmarkMap.get(group.slug);
    const currentUnitPrice = benchmark?.ref_avg || 0;
    const grade = benchmark && currentUnitPrice > 0
      ? calculateGrade(currentUnitPrice, benchmark.ref_low, benchmark.ref_avg)
      : null;
    return { ...group, grade };
  });

  const rawCategories = [...new Set(enrichedGroups.map((item) => item.category).filter(Boolean))];
  const sortedCategories = rawCategories.sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    const aOrder = ai === -1 ? 999 : ai;
    const bOrder = bi === -1 ? 999 : bi;
    return aOrder - bOrder;
  });

  return {
    groups: enrichedGroups,
    categories: ['전체', ...sortedCategories],
  };
}

function makeListUrl(category, query) {
  const params = new URLSearchParams();
  if (category && category !== '전체') params.set('category', category);
  if (query) params.set('q', query);
  const qs = params.toString();
  return `/hotdeal-thermometer${qs ? `?${qs}` : ''}`;
}

export default async function HotdealThermometerPage({ searchParams }) {
  const params = await searchParams;
  const activeCategory = typeof params?.category === 'string' ? params.category : '전체';
  const searchQuery = typeof params?.q === 'string' ? params.q.trim() : '';

  const { groups, categories } = await getThermometerData();

  const gradeBadge = {
    "역대급": { bg: "bg-[#7C3AED]", text: "text-white" },
    "대박":   { bg: "bg-[#FF6B6B]", text: "text-white" },
    "중박":   { bg: "bg-[#FB923C]", text: "text-white" },
    "평범":   { bg: "bg-[#94A3B8]", text: "text-white" },
    "구매금지": { bg: "bg-[#1E293B]", text: "text-white" },
  };

  const filteredGroups = groups.filter(item => {
    const matchesCategory = activeCategory === "전체" || item.category === activeCategory;
    const matchesSearch = !searchQuery || item.group_name?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const displayData = activeCategory === "전체" 
    ? categoryOrder.filter(cat => filteredGroups.some(g => g.category === cat))
    : [activeCategory];

  return (
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-30">
        <header className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <a href="/hotdeal-thermometer" className="flex items-center">
            <img 
              src="/logo-hotdeal-thermometer.png" 
              alt="핫딜온도계" 
              className="h-12 w-auto object-contain" 
            />
          </a>
          <div className="flex items-center gap-1">
            <a href="/login" className="px-3 py-1.5 rounded-full text-[13px] font-medium text-[#64748B] hover:bg-[#F0EAE0] transition-colors">로그인</a>
          </div>
        </header>

        {/* ── 네비게이션 탭 ── */}
        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5 border-b border-[#E2E8F0]">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">핫딜모음</Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">쿠팡핫딜</Link>
          <Link href="/hotdeal-thermometer" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">핫딜온도계</Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">정보모음</Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">유틸리티</Link>
        </nav>

        {/* ── 검색바 ── */}
        <div className="bg-[#FFF9E6] px-4 py-3">
          <form action="/hotdeal-thermometer" method="get" className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {activeCategory !== '전체' && <input type="hidden" name="category" value={activeCategory} />}
            <input
              name="q"
              defaultValue={searchQuery}
              type="text" 
              placeholder="어떤 상품의 시세가 궁금하세요?" 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] focus:border-transparent focus:bg-white text-[14px] placeholder:text-[#94A3B8] transition-all"
            />
          </form>
        </div>

        {/* ── 카테고리 칩 (아이콘 포함, 다른 페이지와 동일 스타일) ── */}
        <div className="bg-[#FFF9E6] border-b border-[#E2E8F0]">
          <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <a
                key={c} 
                href={makeListUrl(c, searchQuery)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                  activeCategory === c 
                    ? 'bg-[#0ABAB5] text-white' 
                    : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F0EAE0] hover:text-[#1E293B]'
                }`}
              >
                <span className="text-[12px]">{categoryIcons[c] || "📦"}</span>
                {c}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── 본문 ── */}
      <main className="px-4 pt-4 pb-10">
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6">
          <h1 className="text-[18px] font-bold text-[#1E293B] mb-2">핫딜온도계 개요</h1>
          <p className="text-[14px] text-[#475569] leading-relaxed mb-3">
            핫딜이 "정말 저렴한 금액이 맞을까?"에 대한 궁금증에서 출발했고, 말만 핫딜이 아닌
            진짜 핫딜가격이 얼만지를 알려드리는 것을 목표로 시작했어요. 품목별 시세 기준 데이터를 바탕으로
            현재 가격 흐름을 빠르게 판단할 수 있도록 만든 지표예요. 각 품목 카드를 누르면 상세 페이지에서
            가격 추이와 기준가를 함께 확인할 수 있어요.
          </p>
          <h2 className="text-[14px] font-bold text-[#1E293B] mb-2">등급 산정 기준</h2>
          <p className="text-[13px] text-[#64748B] leading-relaxed mb-2">
            등급은 어제까지의 가격 데이터를 기준으로 계산했어요. 기본은 최근 1년 데이터를 사용해
            "평균 가격"과 "가장 저렴했던 가격"을 만들고, 현재 가격이 그 기준 대비 얼마나 좋은지 보여줘요.
            다만 데이터가 1년보다 짧거나, 최근 1년 표본이 20건 미만인 상품은 보유한 전체 기간 기준으로 계산해요.
          </p>
          <ul className="list-disc pl-5 text-[13px] text-[#64748B] leading-relaxed space-y-1">
            <li><span className="font-semibold text-[#1E293B]">역대급</span>: 현재 가격이 기준 최저가 이하</li>
            <li><span className="font-semibold text-[#1E293B]">대박</span>: 현재 가격이 기준 평균가의 90% 이하</li>
            <li><span className="font-semibold text-[#1E293B]">중박</span>: 현재 가격이 기준 평균가의 90% 초과, 95% 이하</li>
            <li><span className="font-semibold text-[#1E293B]">평범</span>: 현재 가격이 기준 평균가의 95% 초과, 105% 이하</li>
            <li><span className="font-semibold text-[#1E293B]">구매금지</span>: 현재 가격이 기준 평균가의 105% 초과</li>
          </ul>
        </section>

        {displayData.map(catHeader => {
          const itemsInMainCat = filteredGroups.filter(g => g.category === catHeader);
          if (itemsInMainCat.length === 0) return null;

          const subCategories = [...new Set(itemsInMainCat.map(i => i.sub_category))].sort((a, b) => {
            if (catHeader === '식품') {
              const ai = foodSubOrder.indexOf(a);
              const bi = foodSubOrder.indexOf(b);
              const aOrder = ai === -1 ? 999 : ai;
              const bOrder = bi === -1 ? 999 : bi;
              return aOrder - bOrder;
            }
            return a.localeCompare(b);
          });

          return (
            <section key={catHeader} className="mb-8">
              <h2 className="text-[14px] font-bold text-[#1E293B] px-1 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#0ABAB5] rounded-full"></span>
                {catHeader}
              </h2>

              {subCategories.map(subCat => {
                const itemsInSubCat = itemsInMainCat.filter(i => i.sub_category === subCat);
                return (
                  <div key={subCat} className="mb-5 pl-1">
                    <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">{subCat}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {itemsInSubCat.map((item) => {
                        const badge = gradeBadge[item.grade];
                        return (
                          <Link
                            key={item.slug} 
                            href={`/hotdeal-thermometer/${item.slug}`}
                            className="deal-card bg-white rounded-2xl p-4 border border-[#E2E8F0] flex items-center gap-3.5 group"
                          >
                            <div className="w-12 h-12 bg-[#FAF6F0] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img 
                                src={`https://bpoerueomemrufjoxrej.supabase.co/storage/v1/object/public/thermometer/${item.slug}.png`}
                                className="w-9 h-9 object-contain group-hover:scale-110 transition-transform"
                                alt={item.group_name}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[14px] font-bold text-[#1E293B] truncate">{item.group_name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {badge ? (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.bg} ${badge.text}`}>
                                    {item.grade}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F0EAE0] text-[#94A3B8]">분석중</span>
                                )}
                                <span className="text-[11px] text-[#94A3B8]">클릭해서 추이 보기</span>
                              </div>
                            </div>
                            <svg className="text-[#CBD5E1] flex-shrink-0 group-hover:text-[#0ABAB5] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <span className="text-4xl">🌡️</span>
            <p className="text-[15px] font-semibold text-[#1E293B]">
              {searchQuery ? `"${searchQuery}" 결과가 없어요` : "분석 가능한 상품이 없어요"}
            </p>
            <p className="text-[13px] text-[#94A3B8]">다른 키워드로 검색해 보세요</p>
          </div>
        )}
      </main>

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
