import Link from 'next/link';

export const metadata = {
  title: '싸게사게 소개 | 가격 검증형 핫딜 플랫폼',
  description:
    '싸게사게는 실시간 핫딜 수집과 핫딜온도계 가격 이력 분석을 함께 제공하는 가격 검증형 핫딜 플랫폼입니다.',
  alternates: {
    canonical: 'https://www.ssagesage.com/about-ssagesage',
  },
  openGraph: {
    title: '싸게사게 소개 | 가격 검증형 핫딜 플랫폼',
    description:
      '핫딜 발견부터 가격 검증까지 한 번에. 싸게사게 서비스 핵심 기능과 운영 원칙을 소개합니다.',
    url: 'https://www.ssagesage.com/about-ssagesage',
    type: 'website',
    locale: 'ko_KR',
    siteName: '싸게사게',
  },
  twitter: {
    card: 'summary_large_image',
    title: '싸게사게 소개 | 가격 검증형 핫딜 플랫폼',
    description: '실시간 핫딜 + 가격 이력 검증, 싸게사게 서비스 소개 페이지입니다.',
  },
};

const strengths = [
  {
    title: '핫딜을 빠르게 모음',
    body: '여러 커뮤니티에 흩어진 핫딜을 한 화면에서 확인할 수 있어요.',
  },
  {
    title: '가격 이력으로 검증',
    body: '핫딜온도계에서 최근 가격, 평균가, 최저가를 함께 비교합니다.',
  },
  {
    title: '실전형 구매 가이드',
    body: '정보모음/유틸리티로 구매 전 비교와 계산을 쉽게 도와드려요.',
  },
];

const compareRows = [
  {
    label: '핵심 목적',
    default: '딜을 빠르게 찾는 것',
    ssage: '딜 발견 + 가격이 진짜 좋은지 검증',
  },
  {
    label: '데이터 관점',
    default: '현재 딜 정보 중심',
    ssage: '현재가 + 과거 가격 흐름까지 함께 확인',
  },
  {
    label: '구매 판단',
    default: '체감/감각 의존',
    ssage: '가격 이력 기반의 근거 있는 판단',
  },
];

export default function AboutSsagesagePage() {
  return (
    <main className="min-h-screen bg-[#FAF6F0]">
      <section className="relative overflow-hidden border-b border-[#E2E8F0] bg-gradient-to-br from-[#FFF9E6] via-[#F6FBFF] to-[#E9FBFA]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#0ABAB5]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#60A5FA]/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-20">
          <p className="inline-flex rounded-full border border-[#BEE5E3] bg-white/70 px-3 py-1 text-[12px] font-semibold text-[#0B8F8B]">
            가격 검증형 핫딜 플랫폼
          </p>
          <h1 className="mt-4 text-[30px] font-extrabold leading-tight text-[#1E293B] md:text-[44px]">
            싸게사게는
            <br />
            핫딜을 찾는 곳에서 끝나지 않습니다.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#475569] md:text-[17px]">
            커뮤니티 실시간 핫딜을 빠르게 모으고, 핫딜온도계로 가격 이력을 검증해
            지금 구매가 괜찮은지 한 번 더 확인할 수 있게 만듭니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              href="/hotdeals"
              className="rounded-xl bg-[#0ABAB5] px-5 py-3 text-[14px] font-bold text-white shadow-sm hover:bg-[#09A7A2]"
            >
              핫딜모음 보기
            </Link>
            <Link
              href="/hotdeal-thermometer"
              className="rounded-xl border border-[#0ABAB5] bg-white px-5 py-3 text-[14px] font-bold text-[#0ABAB5] hover:bg-[#F0FFFE]"
            >
              핫딜온도계 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {strengths.map((item) => (
            <article key={item.title} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-[16px] font-bold text-[#1E293B]">{item.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#64748B]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="grid grid-cols-3 bg-[#F8FAFC] text-[13px] font-bold text-[#334155]">
            <div className="px-4 py-3">비교 항목</div>
            <div className="px-4 py-3">일반 핫딜 사이트</div>
            <div className="px-4 py-3">싸게사게</div>
          </div>
          {compareRows.map((row) => (
            <div key={row.label} className="grid grid-cols-3 border-t border-[#F1F5F9] text-[13px] text-[#475569]">
              <div className="px-4 py-3 font-semibold text-[#1E293B]">{row.label}</div>
              <div className="px-4 py-3">{row.default}</div>
              <div className="px-4 py-3 font-semibold text-[#0F766E]">{row.ssage}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <h2 className="text-[18px] font-bold text-[#1E293B]">어떻게 검증하나요?</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[12px] font-bold text-[#0ABAB5]">STEP 1</p>
            <h3 className="mt-1 text-[15px] font-bold text-[#1E293B]">핫딜 탐색</h3>
            <p className="mt-1.5 text-[13px] text-[#64748B]">커뮤니티 딜을 빠르게 모아 현재 시세를 확인합니다.</p>
          </article>
          <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[12px] font-bold text-[#0ABAB5]">STEP 2</p>
            <h3 className="mt-1 text-[15px] font-bold text-[#1E293B]">가격 이력 비교</h3>
            <p className="mt-1.5 text-[13px] text-[#64748B]">최근 가격, 평균가, 최저가를 함께 보며 과열 여부를 확인합니다.</p>
          </article>
          <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[12px] font-bold text-[#0ABAB5]">STEP 3</p>
            <h3 className="mt-1 text-[15px] font-bold text-[#1E293B]">합리적 구매</h3>
            <p className="mt-1.5 text-[13px] text-[#64748B]">정보모음/유틸리티 가이드로 실제 구매 결정을 돕습니다.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14 md:pb-20">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="text-[17px] font-bold text-[#1E293B]">운영 원칙</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] text-[#475569]">
            <li>가격 정보는 수집 시점 기준이며, 실제 결제 시점 가격과 다를 수 있습니다.</li>
            <li>제휴 링크가 포함된 경우 관련 고지 문구를 명확히 표시합니다.</li>
            <li>개인정보 및 서비스 운영 정책은 개인정보처리방침에서 확인할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

