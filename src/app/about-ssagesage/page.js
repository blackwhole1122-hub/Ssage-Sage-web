export const metadata = {
  title: '싸게사게 소개 | 실시간 핫딜 + 가격검증형 핫딜온도계',
  description:
    '싸게사게는 커뮤니티 핫딜을 빠르게 모으고, 핫딜온도계로 가격 이력을 함께 확인할 수 있는 가격검증형 핫딜 플랫폼입니다.',
  alternates: {
    canonical: 'https://www.ssagesage.com/about-ssagesage',
  },
  openGraph: {
    title: '싸게사게 소개 | 실시간 핫딜 + 가격검증형 핫딜온도계',
    description:
      '커뮤니티 핫딜 모음과 상품별 가격 이력 분석을 함께 제공하는 싸게사게 서비스를 소개합니다.',
    url: 'https://www.ssagesage.com/about-ssagesage',
    type: 'website',
    locale: 'ko_KR',
    siteName: '싸게사게',
  },
  twitter: {
    card: 'summary_large_image',
    title: '싸게사게 소개 | 실시간 핫딜 + 가격검증형 핫딜온도계',
    description:
      '핫딜 발견부터 가격 검증까지 한 번에. 싸게사게 서비스 소개 페이지입니다.',
  },
};

export default function AboutSsagesagePage() {
  return (
    <main className="min-h-screen bg-[#FAF6F0]">
      <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <header className="mb-8">
          <p className="text-[13px] font-semibold text-[#0ABAB5] mb-2">싸게사게 소개</p>
          <h1 className="text-[28px] md:text-[36px] font-extrabold text-[#1E293B] leading-tight">
            실시간 핫딜 + 가격검증형 핫딜온도계
          </h1>
          <p className="mt-4 text-[15px] md:text-[16px] text-[#475569] leading-relaxed">
            싸게사게는 단순히 핫딜 링크를 모아주는 데서 끝나지 않습니다.
            커뮤니티에서 올라오는 핫딜을 빠르게 확인하고, 상품별 가격 이력까지 같이 보면서
            지금 가격이 정말 좋은지 판단할 수 있도록 돕습니다.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-[16px] font-bold text-[#1E293B] mb-2">핫딜모음</h2>
            <p className="text-[14px] text-[#64748B] leading-relaxed">
              여러 커뮤니티의 핫딜을 한 화면에서 모아보고, 카테고리/검색으로 빠르게 찾을 수 있어요.
            </p>
          </article>
          <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-[16px] font-bold text-[#1E293B] mb-2">핫딜온도계</h2>
            <p className="text-[14px] text-[#64748B] leading-relaxed">
              최근 가격 흐름, 평균가, 최저가를 비교해 체감이 아닌 데이터로 구매 타이밍을 확인할 수 있어요.
            </p>
          </article>
          <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-[16px] font-bold text-[#1E293B] mb-2">정보모음/유틸리티</h2>
            <p className="text-[14px] text-[#64748B] leading-relaxed">
              제품 비교 가이드와 계산 도구를 함께 제공해, 더 합리적인 소비 의사결정을 돕습니다.
            </p>
          </article>
        </div>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 md:p-7">
          <h2 className="text-[18px] font-bold text-[#1E293B] mb-3">싸게사게가 지향하는 것</h2>
          <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#475569] leading-relaxed">
            <li>빠른 정보: 흩어진 핫딜을 한곳에서 확인</li>
            <li>검증 가능한 가격: 가격 이력 데이터 기반 판단</li>
            <li>실용적 정보: 구매 전 비교에 도움이 되는 콘텐츠 제공</li>
          </ul>
        </section>
      </section>
    </main>
  );
}

