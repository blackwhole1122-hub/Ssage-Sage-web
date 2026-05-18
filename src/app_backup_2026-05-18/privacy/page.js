export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen p-6 pb-16">

      {/* 헤더 */}
      <header className="border-b pb-4 mb-8">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">← 싸게사게로 돌아가기</a>
        <h1 className="text-2xl font-bold text-gray-800">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mt-2">최종 수정일: 2026년 3월 21일</p>
      </header>

      <div className="flex flex-col gap-8 text-sm text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">1. 개인정보의 처리 목적</h2>
          <p>
            싸게사게(이하 "서비스")는 다음의 목적을 위하여 개인정보를 처리합니다.
            처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
            이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>서비스 이용 통계 분석 및 서비스 개선</li>
            <li>이상 접근 탐지 및 보안 유지</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">2. 개인정보의 처리 및 보유 기간</h2>
          <p>
            서비스는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를
            수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
          </p>
          <p className="mt-2">
            서비스 이용 통계 데이터는 수집일로부터 최대 36개월간 보관됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">3. 수집하는 개인정보 항목</h2>
          <p>서비스는 다음과 같은 정보를 자동으로 수집할 수 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>IP 주소</li>
            <li>브라우저 종류 및 버전</li>
            <li>운영체제 정보</li>
            <li>방문 페이지 및 체류 시간</li>
            <li>쿠키 및 유사 기술</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">4. 쿠키(Cookie) 사용</h2>
          <p>
            서비스는 이용자에게 개인화된 서비스를 제공하기 위해 쿠키를 사용합니다.
            쿠키는 웹사이트를 운영하는 데 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며
            이용자의 컴퓨터 하드디스크에 저장됩니다.
          </p>
          <p className="mt-2">
            이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 브라우저의 옵션 설정을 통해
            쿠키 허용, 쿠키 차단 등의 설정을 할 수 있습니다. 단, 쿠키를 차단하는 경우
            일부 서비스 이용에 어려움이 있을 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">5. 제3자 서비스</h2>
          <p>서비스는 다음과 같은 제3자 서비스를 사용합니다.</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>
              <strong>Google Analytics / Google Tag Manager</strong>: 방문자 통계 수집.
              Google의 개인정보처리방침은 <a href="https://policies.google.com/privacy" target="_blank" className="text-blue-500 underline">여기</a>에서 확인할 수 있습니다.
            </li>
            <li>
              <strong>Vercel</strong>: 웹사이트 호스팅 서비스.
            </li>
            <li>
              <strong>Supabase</strong>: 데이터베이스 서비스.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">6. 개인정보의 파기</h2>
          <p>
            서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
            지체없이 해당 개인정보를 파기합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">7. 정보주체의 권리·의무 및 행사방법</h2>
          <p>
            이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>개인정보 처리 현황 조회 요청</li>
            <li>개인정보 수집·이용·제공에 대한 동의 철회</li>
            <li>개인정보의 정정·삭제 요청</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">8. 개인정보보호 책임자</h2>
          <p>
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 불만처리 및
            피해구제 등을 위하여 아래와 같이 개인정보보호 책임자를 지정하고 있습니다.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mt-2">
            <p><strong>서비스명</strong>: 싸게사게</p>
            <p><strong>이메일</strong>: blackwhole1122@gmail.com</p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">9. 개인정보처리방침 변경</h2>
          <p>
            이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가,
            삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </section>

      </div>

      <footer className="text-center p-6 text-gray-400 text-xs">
        © 2026 싸게사게
        <br />
        <a href="/privacy" className="underline hover:text-gray-600 mt-1 inline-block">
          개인정보처리방침
        </a>
      </footer>
    </div>
  );
}
