import Link from 'next/link';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';
import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '유틸리티 모음',
  description: '단위가격, 할인율, 중복할인, 직구세금 등 구매 전에 필요한 계산을 빠르게 확인하세요.',
  path: '/utility',
});

export default function UtilityPage() {
  const utilities = [
    {
      title: "단가척척",
      description: "가격·무게·수량을 입력하면 10g·100g·1kg당 단가를 바로 계산해드려요. 상품을 여러 개 비교해서 진짜 저렴한 걸 찾아보세요.",
      icon: "⚖️",
      href: "/utility/unit-price-calculator",
      color: "bg-[#FFFBEB]"
    },
    {
      title: "할인율 계산기",
      description: "정가와 할인가를 입력하면 할인율과 절약 금액을 바로 계산해요. 반대로 정가와 할인율로 실제 가격을 구할 수도 있어요.",
      icon: "💸",
      href: "/utility/discount-calculator",
      color: "bg-[#FFF0F0]"
    },
    {
      title: "중복할인 계산기",
      description: "쿠폰·카드·포인트 할인이 여러 개 겹칠 때 순서대로 차감해서 최종 결제 금액과 실질 할인율을 계산해드려요.",
      icon: "🧾",
      href: "/utility/coupon-stack-calculator",
      color: "bg-[#EBF2FF]"
    },
    {
      title: "해외직구 세금 계산기",
      description: "알리·아마존 구매 전 관세와 부가세를 미리 계산해요. 면세 여부와 실제 총 비용을 한눈에 확인하세요.",
      icon: "🌏",
      href: "/utility/direct-purchase-tax",
      color: "bg-[#EFF6FF]"
    },
    {
      title: "영양성분 단가 계산기",
      description: "닭가슴살·프로틴·그릭요거트 등 단백질 1g당 가격을 비교해서 가장 가성비 좋은 식품을 찾아보세요.",
      icon: "🥩",
      href: "/utility/nutrition-price-calculator",
      color: "bg-[#ECFDF5]"
    },
    {
      title: "이미지 배경 제거하기",
      description: "이미지에서 배경을 자동으로 제거해요",
      icon: "🖼️",
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
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <img src="/logo-ssagesage.png" alt="싸게사게" className="h-12 w-auto object-contain" />
            </Link>
          </div>
          <Link 
            href="/" 
            className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors"
          >
            홈으로
          </Link>
        </div>

        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            핫딜모음
          </Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            쿠팡핫딜
          </Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            핫딜온도계
          </Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            정보모음
          </Link>
          <Link href="/utility" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">
            유틸리티
          </Link>
        </nav>
      </header>

      {/* 본문 */}
      <main className="px-4 py-8 md:py-12">
        <header className="mb-10">
          <h1 className="text-[28px] font-bold text-[#1E293B] mb-3">🛠️ 유틸리티</h1>
          <p className="text-[15px] text-[#64748B] leading-relaxed">
            편리한 도구들을 사용해보세요
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
