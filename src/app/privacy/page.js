import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | 싸게사게',
  description: '싸게사게 개인정보처리방침 안내 페이지입니다.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F0]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 md:p-8">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0ABAB5]">
                Privacy Policy
              </p>
              <h1 className="mt-2 text-[28px] font-black text-[#1E293B]">개인정보처리방침</h1>
              <p className="mt-2 text-[13px] text-[#64748B]">최종 업데이트: 2026년 5월 19일</p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-[#E2E8F0] px-4 py-2 text-[13px] font-medium text-[#475569] hover:bg-[#FAF6F0]"
            >
              블로그로
            </Link>
          </div>

          <div className="space-y-8 text-[14px] leading-7 text-[#334155]">
            <section>
              <h2 className="mb-2 text-[17px] font-bold text-[#1E293B]">1. 수집하는 정보</h2>
              <p>서비스 이용 통계와 보안 운영을 위해 다음 정보를 수집할 수 있습니다.</p>
              <ul className="mt-2 list-disc pl-5">
                <li>IP 주소, 브라우저 종류, 운영체제 정보</li>
                <li>방문한 페이지, 접속 시간, 유입 경로</li>
                <li>쿠키 및 유사 기술을 통한 이용 기록</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-[17px] font-bold text-[#1E293B]">2. 정보 이용 목적</h2>
              <ul className="list-disc pl-5">
                <li>블로그 운영 상태 확인 및 서비스 개선</li>
                <li>접속 통계 분석과 콘텐츠 품질 향상</li>
                <li>이상 접속 탐지 및 보안 대응</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-[17px] font-bold text-[#1E293B]">3. 보관 기간</h2>
              <p>수집된 로그 및 통계 정보는 운영 목적 달성에 필요한 범위 내에서만 보관하며, 관련 법령 또는 내부 정책에 따라 주기적으로 삭제합니다.</p>
            </section>

            <section>
              <h2 className="mb-2 text-[17px] font-bold text-[#1E293B]">4. 외부 서비스 사용</h2>
              <p>서비스는 운영 및 통계 분석을 위해 외부 서비스를 사용할 수 있습니다.</p>
              <ul className="mt-2 list-disc pl-5">
                <li>Google Analytics</li>
                <li>Vercel</li>
                <li>Supabase</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-[17px] font-bold text-[#1E293B]">5. 문의</h2>
              <p>개인정보처리방침 관련 문의는 아래 이메일로 연락할 수 있습니다.</p>
              <p className="mt-2 font-medium text-[#1E293B]">blackwhole1122@gmail.com</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
