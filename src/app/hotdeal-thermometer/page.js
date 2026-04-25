import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/lib/priceUtils';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';
 
const categoryOrder = ['?앺뭹', '?앺솢?≫솕', '媛???붿???, '?곹뭹沅?];
const foodSubOrder = ['媛怨듭떇??, '?뚮즺/?꾩궛', '?뚮즺', '?뚮즺/?먮꼫吏?뚮즺', '?앹닔', '?붿????꾩씠?ㅽ겕由?, '?좎꽑?앺뭹', '?/?↔끝', '?곸뼇??];
const categoryIcons = {
  ?꾩껜: '?뤇截?,
  ?앺뭹: '?뜋',
  ?앺솢?≫솕: '?㎢',
  '媛???붿???: '?벟',
  ?곹뭹沅? '?렖',
};

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
    categories: ['?꾩껜', ...sortedCategories],
  };
}

function makeListUrl(category, query) {
  const params = new URLSearchParams();
  if (category && category !== '?꾩껜') params.set('category', category);
  if (query) params.set('q', query);
  const qs = params.toString();
  return `/hotdeal-thermometer${qs ? `?${qs}` : ''}`;
}

export default async function HotdealThermometerPage({ searchParams }) {
  const params = await searchParams;
  const activeCategory = typeof params?.category === 'string' ? params.category : '?꾩껜';
  const searchQuery = typeof params?.q === 'string' ? params.q.trim() : '';

  const { groups, categories } = await getThermometerData();

  const gradeBadge = {
    "???湲?: { bg: "bg-[#7C3AED]", text: "text-white" },
    "?諛?:   { bg: "bg-[#FF6B6B]", text: "text-white" },
    "以묐컯":   { bg: "bg-[#FB923C]", text: "text-white" },
    "?됰쾾":   { bg: "bg-[#94A3B8]", text: "text-white" },
    "援щℓ湲덉?": { bg: "bg-[#1E293B]", text: "text-white" },
  };

  const filteredGroups = groups.filter(item => {
    const matchesCategory = activeCategory === "?꾩껜" || item.category === activeCategory;
    const matchesSearch = !searchQuery || item.group_name?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const displayData = activeCategory === "?꾩껜" 
    ? categoryOrder.filter(cat => filteredGroups.some(g => g.category === cat))
    : [activeCategory];

  return (
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">

      {/* ?? ?ㅻ뜑 ?? */}
      <div className="sticky top-0 z-30">
        <header className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <a href="/hotdeal-thermometer" className="flex items-center">
            <img 
              src="/logo-hotdeal-thermometer.png" 
              alt="?ル뵜?⑤룄怨? 
              className="h-12 w-auto object-contain" 
            />
          </a>
          <div className="flex items-center gap-1">
            <a href="/login" className="px-3 py-1.5 rounded-full text-[13px] font-medium text-[#64748B] hover:bg-[#F0EAE0] transition-colors">濡쒓렇??/a>
          </div>
        </header>

        {/* ?? ?ㅻ퉬寃뚯씠?????? */}
        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5 border-b border-[#E2E8F0]">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">?ル뵜紐⑥쓬</Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">荑좏뙜?ル뵜</Link>
          <Link href="/hotdeal-thermometer" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">?ル뵜?⑤룄怨?/Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">?뺣낫紐⑥쓬</Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">?좏떥由ы떚</Link>
        </nav>

        {/* ?? 寃?됰컮 ?? */}
        <div className="bg-[#FFF9E6] px-4 py-3">
          <form action="/hotdeal-thermometer" method="get" className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {activeCategory !== '?꾩껜' && <input type="hidden" name="category" value={activeCategory} />}
            <input
              name="q"
              defaultValue={searchQuery}
              type="text" 
              placeholder="?대뼡 ?곹뭹???쒖꽭媛 沅곴툑?섏꽭??" 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] focus:border-transparent focus:bg-white text-[14px] placeholder:text-[#94A3B8] transition-all"
            />
          </form>
        </div>

        {/* ?? 移댄뀒怨좊━ 移?(?꾩씠肄??ы븿, ?ㅻⅨ ?섏씠吏? ?숈씪 ?ㅽ??? ?? */}
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
                <span className="text-[12px]">{categoryIcons[c] || "?벀"}</span>
                {c}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ?? 蹂몃Ц ?? */}
      <main className="px-4 pt-4 pb-10">
        <div className="lg:hidden mb-4 flex justify-center">
          <CoupangSidebarBanner mode="mobile" />
        </div>
<section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6">
          <h1 className="text-[18px] font-bold text-[#1E293B] mb-2">?ル뵜?⑤룄怨?媛쒖슂</h1>
          <p className="text-[14px] text-[#475569] leading-relaxed mb-3">
            ?ル뵜??"?뺣쭚 ??댄븳 湲덉븸??留욎쓣源?"?????沅곴툑利앹뿉??異쒕컻?덇퀬, 留먮쭔 ?ル뵜???꾨땶
            吏꾩쭨 ?ル뵜媛寃⑹씠 ?쇰쭔吏瑜??뚮젮?쒕━??寃껋쓣 紐⑺몴濡??쒖옉?덉뼱?? ?덈ぉ蹂??쒖꽭 湲곗? ?곗씠?곕? 諛뷀깢?쇰줈
            ?꾩옱 媛寃??먮쫫??鍮좊Ⅴ寃??먮떒?????덈룄濡?留뚮뱺 吏?쒖삁?? 媛??덈ぉ 移대뱶瑜??꾨Ⅴ硫??곸꽭 ?섏씠吏?먯꽌
            媛寃?異붿씠? 湲곗?媛瑜??④퍡 ?뺤씤?????덉뼱??
          </p>
          <h2 className="text-[14px] font-bold text-[#1E293B] mb-2">?깃툒 ?곗젙 湲곗?</h2>
          <p className="text-[13px] text-[#64748B] leading-relaxed mb-2">
            ?깃툒? ?댁젣源뚯???媛寃??곗씠?곕? 湲곗??쇰줈 怨꾩궛?덉뼱?? 湲곕낯? 理쒓렐 1???곗씠?곕? ?ъ슜??
            "?됯퇏 媛寃?怨?"媛????댄뻽??媛寃???留뚮뱾怨? ?꾩옱 媛寃⑹씠 洹?湲곗? ?鍮??쇰쭏??醫뗭?吏 蹂댁뿬以섏슂.
            ?ㅻ쭔 ?곗씠?곌? 1?꾨낫??吏㏐굅?? 理쒓렐 1???쒕낯??20嫄?誘몃쭔???곹뭹? 蹂댁쑀???꾩껜 湲곌컙 湲곗??쇰줈 怨꾩궛?댁슂.
          </p>
          <ul className="list-disc pl-5 text-[13px] text-[#64748B] leading-relaxed space-y-1">
            <li><span className="font-semibold text-[#1E293B]">???湲?/span>: ?꾩옱 媛寃⑹씠 湲곗? 理쒖?媛 ?댄븯</li>
            <li><span className="font-semibold text-[#1E293B]">?諛?/span>: ?꾩옱 媛寃⑹씠 湲곗? ?됯퇏媛??90% ?댄븯</li>
            <li><span className="font-semibold text-[#1E293B]">以묐컯</span>: ?꾩옱 媛寃⑹씠 湲곗? ?됯퇏媛??90% 珥덇낵, 95% ?댄븯</li>
            <li><span className="font-semibold text-[#1E293B]">?됰쾾</span>: ?꾩옱 媛寃⑹씠 湲곗? ?됯퇏媛??95% 珥덇낵, 105% ?댄븯</li>
            <li><span className="font-semibold text-[#1E293B]">援щℓ湲덉?</span>: ?꾩옱 媛寃⑹씠 湲곗? ?됯퇏媛??105% 珥덇낵</li>
          </ul>
        </section>

        {displayData.map(catHeader => {
          const itemsInMainCat = filteredGroups.filter(g => g.category === catHeader);
          if (itemsInMainCat.length === 0) return null;

          const subCategories = [...new Set(itemsInMainCat.map(i => i.sub_category))].sort((a, b) => {
            if (catHeader === '?앺뭹') {
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
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F0EAE0] text-[#94A3B8]">遺꾩꽍以?/span>
                                )}
                                <span className="text-[11px] text-[#94A3B8]">?대┃?댁꽌 異붿씠 蹂닿린</span>
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
            <span className="text-4xl">?뙜截?/span>
            <p className="text-[15px] font-semibold text-[#1E293B]">
              {searchQuery ? `"${searchQuery}" 寃곌낵媛 ?놁뼱?? : "遺꾩꽍 媛?ν븳 ?곹뭹???놁뼱??}
            </p>
            <p className="text-[13px] text-[#94A3B8]">?ㅻⅨ ?ㅼ썙?쒕줈 寃?됲빐 蹂댁꽭??/p>
          </div>
        )}
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

