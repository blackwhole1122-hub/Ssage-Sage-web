import Link from 'next/link';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';

export default function UtilityPage() {
  const utilities = [
    {
      title: "?④?泥숈쿃",
      description: "媛寃㈑룸Т寃뙿룹닔?됱쓣 ?낅젰?섎㈃ 10g쨌100g쨌1kg???④?瑜?諛붾줈 怨꾩궛?대뱶?ㅼ슂. ?곹뭹???щ윭 媛?鍮꾧탳?댁꽌 吏꾩쭨 ??댄븳 嫄?李얠븘蹂댁꽭??",
      icon: "?뽳툘",
      href: "/utility/unit-price-calculator",
      color: "bg-[#FFFBEB]"
    },
    {
      title: "?좎씤??怨꾩궛湲?,
      description: "?뺢?? ?좎씤媛瑜??낅젰?섎㈃ ?좎씤?④낵 ?덉빟 湲덉븸??諛붾줈 怨꾩궛?댁슂. 諛섎?濡??뺢?? ?좎씤?⑤줈 ?ㅼ젣 媛寃⑹쓣 援ы븷 ?섎룄 ?덉뼱??",
      icon: "?뮯",
      href: "/utility/discount-calculator",
      color: "bg-[#FFF0F0]"
    },
    {
      title: "以묐났?좎씤 怨꾩궛湲?,
      description: "荑좏룿쨌移대뱶쨌?ъ씤???좎씤???щ윭 媛?寃뱀튌 ???쒖꽌?濡?李④컧?댁꽌 理쒖쥌 寃곗젣 湲덉븸怨??ㅼ쭏 ?좎씤?⑥쓣 怨꾩궛?대뱶?ㅼ슂.",
      icon: "?㎨",
      href: "/utility/coupon-stack-calculator",
      color: "bg-[#EBF2FF]"
    },
    {
      title: "?댁쇅吏곴뎄 ?멸툑 怨꾩궛湲?,
      description: "?뚮━쨌?꾨쭏議?援щℓ ??愿?몄? 遺媛?몃? 誘몃━ 怨꾩궛?댁슂. 硫댁꽭 ?щ?? ?ㅼ젣 珥?鍮꾩슜???쒕늿???뺤씤?섏꽭??",
      icon: "?뙊",
      href: "/utility/direct-purchase-tax",
      color: "bg-[#EFF6FF]"
    },
    {
      title: "?곸뼇?깅텇 ?④? 怨꾩궛湲?,
      description: "????댁궡쨌?꾨줈?는룰렇由?슂嫄고듃 ???⑤갚吏?1g??媛寃⑹쓣 鍮꾧탳?댁꽌 媛??媛?깅퉬 醫뗭? ?앺뭹??李얠븘蹂댁꽭??",
      icon: "?ⅸ",
      href: "/utility/nutrition-price-calculator",
      color: "bg-[#ECFDF5]"
    },
    {
      title: "?대?吏 諛곌꼍 ?쒓굅?섍린",
      description: "?대?吏?먯꽌 諛곌꼍???먮룞?쇰줈 ?쒓굅?댁슂",
      icon: "?뼹截?,
      href: "/utility/image-background-remover",
      color: "bg-[#E6FAF9]"
    },
  ];

  return (
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">
      {/* ?ㅻ뜑 */}
      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <img src="/logo-ssagesage.png" alt="?멸쾶?ш쾶" className="h-12 w-auto object-contain" />
            </Link>
          </div>
          <Link 
            href="/" 
            className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors"
          >
            ?덉쑝濡?
          </Link>
        </div>

        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            ?ル뵜紐⑥쓬
          </Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            荑좏뙜?ル뵜
          </Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            ?ル뵜?⑤룄怨?
          </Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            ?뺣낫紐⑥쓬
          </Link>
          <Link href="/utility" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">
            ?좏떥由ы떚
          </Link>
        </nav>
      </header>

      {/* 蹂몃Ц */}
      <main className="px-4 py-8 md:py-12">
        <div className="lg:hidden mb-4 flex justify-center">
          <CoupangSidebarBanner mode="mobile" />
        </div>
<header className="mb-10">
          <h1 className="text-[28px] font-bold text-[#1E293B] mb-3">?썱截??좏떥由ы떚</h1>
          <p className="text-[15px] text-[#64748B] leading-relaxed">
            ?몃━???꾧뎄?ㅼ쓣 ?ъ슜?대낫?몄슂
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {utilities.map((util) => (
            <Link 
              key={util.href}
              href={util.href}
              className="group bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#0ABAB5] transition-all duration-200"
            >
              <div className={`w-12 h-12 ${util.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-[#D4F4F3] transition-colors`}>
                {util.icon}
              </div>
              <h2 className="text-[16px] font-bold text-[#1E293B] mb-2 group-hover:text-[#0ABAB5] transition-colors">
                {util.title}
              </h2>
              <p className="text-[13px] text-[#64748B]">{util.description}</p>
            </Link>
          ))}
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

