'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CoupangInlineHorizontalBanner from '@/components/CoupangInlineHorizontalBanner';

const NAV_LINKS = [
  ['핫딜모음', '/hotdeals'], ['쿠팡핫딜', '/coupang'],
  ['핫딜온도계', '/hotdeal-thermometer'], ['정보모음', '/blog'], ['유틸리티', '/utility'],
];

// ── 통화 정의 (fallback 환율 포함) ───────────────────────────────
const CURRENCIES = [
  { code: 'USD', label: '미국 달러', symbol: '$',  fallbackRate: 1380 },
  { code: 'EUR', label: '유로',      symbol: '€',  fallbackRate: 1520 },
  { code: 'JPY', label: '일본 엔',   symbol: '¥',  fallbackRate: 920, per100: true, note: '100엔 기준' },
  { code: 'GBP', label: '파운드',    symbol: '£',  fallbackRate: 1750 },
  { code: 'CNY', label: '중국 위안', symbol: '¥',  fallbackRate: 190  },
  { code: 'AUD', label: '호주 달러', symbol: 'A$', fallbackRate: 870  },
];

// ── 품목별 관세율 ────────────────────────────────────────────────
// 근거: 관세법 시행령 별표2 간이세율 (2025년 기준)
// 출처: 관세청 고시 / FTA 포털 / 수입통관 사무처리 고시
// ※ 간이세율은 목록통관(150$/200$ 초과 시) 적용 기준이며
//    HS코드·원산지·FTA 협정에 따라 실제 세율이 달라질 수 있습니다.
const RATE_BASIS = '관세법 시행령 별표2 간이세율 (2025년 기준)';

const CATEGORIES = [
  {
    group: '전자기기',
    items: [
      { id: 'electronics_phone',  label: '스마트폰·태블릿',  duty: 0,    note: 'IT협정·FTA · 부가세 10% 별도' },
      { id: 'electronics_pc',     label: 'PC·노트북·부품',   duty: 0,    note: 'IT협정 · 부가세 10% 별도' },
      { id: 'electronics_audio',  label: '이어폰·스피커',    duty: 8,    note: '일반 전자제품' },
      { id: 'electronics_camera', label: '카메라·렌즈',       duty: 0,    note: '대부분 0% · 부가세 10% 별도' },
      { id: 'electronics_game',   label: '게임기·주변기기',  duty: 0,    note: '관세 0% · 부가세 10% 별도' },
    ],
  },
  {
    group: '의류·신발·가방',
    items: [
      { id: 'clothing', label: '의류 (일반)',    duty: 13, note: '기본 13%' },
      { id: 'shoes',    label: '신발',           duty: 13, note: '기본 13%' },
      { id: 'bag',      label: '가방·지갑',      duty: 8,  note: '가죽제품' },
      { id: 'luxury',   label: '명품 의류·잡화', duty: 13, note: '브랜드 무관' },
    ],
  },
  {
    // 식품은 품목별 편차가 크므로 세분화 (간이세율 기준)
    group: '식품',
    items: [
      { id: 'food_snack',    label: '과자·스낵·초콜릿', duty: 8,  note: '쿠키·캔디·비스킷' },
      { id: 'food_instant',  label: '즉석식품·라면류',  duty: 8,  note: '즉석밥·컵라면·냉동식품' },
      { id: 'food_beverage', label: '음료·주스류',      duty: 30, note: '탄산음료·과일주스 (세율 높음)' },
      { id: 'food_sauce',    label: '소스·조미료·시럽', duty: 16, note: '케첩·드레싱·잼류' },
      { id: 'food_coffee',   label: '커피·차류',        duty: 8,  note: '원두·티백·분말커피' },
    ],
  },
  {
    group: '건강·뷰티',
    items: [
      { id: 'supplement',   label: '건강기능식품·영양제', duty: 8,   note: '비타민·단백질·오메가3' },
      { id: 'food_health',  label: '유기농·자연식품',    duty: 8,   note: '분류에 따라 상이' },
      { id: 'cosmetics',    label: '화장품·스킨케어',    duty: 6.5, note: '기초화장품 기준' },
    ],
  },
  {
    group: '도서·취미·기타',
    items: [
      { id: 'book',        label: '도서·인쇄물',     duty: 0, note: '관세 0% · 부가세 10% 별도' },
      { id: 'toy',         label: '장난감·완구',      duty: 0, note: '관세 0% · 부가세 10% 별도' },
      { id: 'sport',       label: '스포츠·운동기구',  duty: 8, note: '일반 기준' },
      { id: 'watch',       label: '시계',             duty: 8, note: '명품도 동일' },
      { id: 'etc_general', label: '기타 일반 상품',   duty: 8, note: '평균 관세율' },
    ],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap(c => c.items);

// ── 실시간 환율 Fetch ─────────────────────────────────────────────
// open.er-api.com: 무료, API 키 불필요, KRW 포함 160개 통화 지원, CORS 허용
// (Frankfurter는 ECB 기반으로 KRW 미지원 → CORS 오류 발생)
// 업데이트 주기: 약 1일 1회
async function fetchLiveRates() {
  const res = await fetch(
    'https://open.er-api.com/v6/latest/USD',
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.result !== 'success') throw new Error('API error: ' + data.result);

  // data.rates 예: { KRW: 1380, EUR: 0.91, JPY: 144, GBP: 0.79, CNY: 7.25, AUD: 1.55, ... }
  const usdToKrw = data.rates.KRW;
  if (!usdToKrw) throw new Error('KRW rate missing');

  const rates = { USD: usdToKrw };

  for (const cur of CURRENCIES.filter(c => c.code !== 'USD')) {
    const perUsd = data.rates[cur.code];
    if (perUsd) {
      // 1 CUR = (usdToKrw / perUsd) KRW
      // JPY per100=true: 100엔당 원화 = (usdToKrw / perUsd) * 100
      rates[cur.code] = cur.per100
        ? (usdToKrw / perUsd) * 100
        : usdToKrw / perUsd;
    }
  }

  // 날짜: time_last_update_utc에서 날짜 부분만 추출
  const dateStr = data.time_last_update_utc
    ? new Date(data.time_last_update_utc).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return { rates, date: dateStr };
}

// ── 세금 계산 엔진 ─────────────────────────────────────────────────
function calcTax({ productPrice, shippingFee, currency, categoryId, fromUS, includeShippingInTax, rates }) {
  const cur = CURRENCIES.find(c => c.code === currency);
  if (!cur) return null;
  const p = parseFloat(productPrice);
  const s = parseFloat(shippingFee) || 0;
  if (!p || p <= 0) return null;

  // 환율: per100이면 100단위 기준이므로 실제 환율은 /100
  const rawRate = rates[currency] ?? cur.fallbackRate;
  const effectiveRate = cur.per100 ? rawRate / 100 : rawRate;

  const productKRW  = p * effectiveRate;
  const shippingKRW = s * effectiveRate;

  // USD 환산 (면세 기준 판단)
  const usdRate     = rates['USD'] ?? 1380;
  const productUSD  = productKRW / usdRate;
  const shippingUSD = shippingKRW / usdRate;
  const totalUSD    = productUSD + shippingUSD;

  const threshold   = fromUS ? 200 : 150;
  const isTaxFree   = totalUSD <= threshold;

  const taxableKRW  = includeShippingInTax ? productKRW + shippingKRW : productKRW;

  const category    = ALL_ITEMS.find(i => i.id === categoryId);
  const dutyRate    = category?.duty ?? 8;
  const dutyKRW     = taxableKRW * (dutyRate / 100);
  const vatKRW      = (taxableKRW + dutyKRW) * 0.1;
  const totalTaxKRW = dutyKRW + vatKRW;
  const isMinorTaxExempt = totalTaxKRW < 50000;
  const actualTaxKRW     = (isTaxFree || isMinorTaxExempt) ? 0 : Math.round(totalTaxKRW);

  return {
    productUSD:  Math.round(productUSD  * 100) / 100,
    shippingUSD: Math.round(shippingUSD * 100) / 100,
    totalUSD:    Math.round(totalUSD    * 100) / 100,
    threshold,   isTaxFree,
    productKRW:  Math.round(productKRW),
    shippingKRW: Math.round(shippingKRW),
    dutyRate, dutyKRW: Math.round(dutyKRW),
    vatKRW:      Math.round(vatKRW),
    totalTaxKRW: Math.round(totalTaxKRW),
    isMinorTaxExempt, actualTaxKRW,
    finalKRW:    Math.round(productKRW + shippingKRW + actualTaxKRW),
    effectiveRate,
    category,
  };
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function DirectPurchaseTaxPage() {
  const [productPrice,         setProductPrice]         = useState('');
  const [shippingFee,          setShippingFee]          = useState('');
  const [currency,             setCurrency]             = useState('USD');
  const [categoryId,           setCategoryId]           = useState('electronics_phone');
  const [fromUS,               setFromUS]               = useState(true);
  const [includeShippingInTax, setIncludeShippingInTax] = useState(true);

  // 환율 상태
  const [rates,      setRates]      = useState(() =>
    Object.fromEntries(CURRENCIES.map(c => [c.code, c.fallbackRate]))
  );
  const [rateDate,   setRateDate]   = useState(null);
  const [rateStatus, setRateStatus] = useState('idle');   // idle|loading|live|fallback
  const [rateError,  setRateError]  = useState('');

  const loadRates = useCallback(async () => {
    setRateStatus('loading');
    setRateError('');
    try {
      const { rates: newRates, date } = await fetchLiveRates();
      setRates(prev => ({ ...prev, ...newRates }));
      setRateDate(date);
      setRateStatus('live');
    } catch {
      setRateError('환율 조회 실패 — 기준 환율로 계산됩니다');
      setRateStatus('fallback');
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  const cur = CURRENCIES.find(c => c.code === currency);

  const result = useMemo(() =>
    calcTax({ productPrice, shippingFee, currency, categoryId, fromUS, includeShippingInTax, rates }),
    [productPrice, shippingFee, currency, categoryId, fromUS, includeShippingInTax, rates]
  );

  // 원화 미리보기
  const rawRate = rates[currency] ?? cur?.fallbackRate ?? 1;
  const previewRate = cur?.per100 ? rawRate / 100 : rawRate;

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">
      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/"><img src="/logo-ssagesage.png" alt="싸게사게" className="h-12 w-auto object-contain" /></Link>
          <Link href="/utility" className="text-[13px] font-medium text-[#64748B] hover:text-[#0ABAB5] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors">← 유틸리티</Link>
        </div>
        <nav className="px-4 pb-1 flex items-center gap-5">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href}
              className={`py-3 text-[14px] font-medium transition-colors ${href === '/utility'
                ? 'relative font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full'
                : 'text-[#64748B] hover:text-[#1E293B]'}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[32px]">🌏</span>
            <div>
              <h1 className="text-[24px] font-extrabold text-[#1E293B] leading-tight">해외직구 세금 계산기</h1>
              <p className="text-[13px] text-[#64748B]">관세·부가세 포함 실제 비용을 확인하세요</p>
            </div>
          </div>
          <p className="text-[14px] text-[#64748B] leading-relaxed mt-3">
            알리·아마존·이베이 구매 전 <strong className="text-[#1E293B]">관세와 부가세</strong>를 미리 계산해서
            <strong className="text-[#0ABAB5]"> 실제 총 비용</strong>을 확인하세요.
          </p>
        </div>

        {/* 환율 상태 배너 */}
        <RateBanner status={rateStatus} rateDate={rateDate} error={rateError} onRefresh={loadRates} />

        {/* 입력 카드 */}
        <div className="bg-white rounded-2xl border-2 border-[#0ABAB5] overflow-hidden mb-5">
          <div className="px-5 py-3 bg-[#E6FAF9]">
            <p className="text-[13px] font-bold text-[#0ABAB5]">구매 정보 입력</p>
          </div>
          <div className="p-5 flex flex-col gap-6">

            {/* ① 통화 */}
            <div>
              <SectionLabel num="①" label="결제 통화" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {CURRENCIES.map(c => {
                  const liveRate = rates[c.code] ?? c.fallbackRate;
                  const displayRate = c.per100
                    ? `100${c.code} ≈ ${Math.round(liveRate).toLocaleString()}원`
                    : `1${c.code} ≈ ${Math.round(liveRate).toLocaleString()}원`;
                  return (
                    <button key={c.code}
                      onClick={() => { setCurrency(c.code); setFromUS(c.code === 'USD'); }}
                      className={`px-3 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all border ${currency === c.code ? 'bg-[#0ABAB5] text-white border-[#0ABAB5]' : 'bg-[#FAF6F0] text-[#64748B] border-[#E2E8F0] hover:border-[#0ABAB5]'}`}>
                      <span className="block">{c.symbol} {c.code} <span className="font-normal text-[11px]">{c.label}</span></span>
                      <span className={`text-[11px] font-normal mt-0.5 block ${currency === c.code ? 'text-white/80' : rateStatus === 'live' ? 'text-[#0ABAB5]' : 'text-[#94A3B8]'}`}>
                        {rateStatus === 'loading' ? '조회 중…' : displayRate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ② 금액 */}
            <div>
              <SectionLabel num="②" label="금액" />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <PriceInput label="상품가" symbol={cur?.symbol} placeholder="상품 가격" value={productPrice} onChange={setProductPrice} />
                <PriceInput label="배송비" symbol={cur?.symbol} placeholder="없으면 0" value={shippingFee} onChange={setShippingFee} />
              </div>
              {(productPrice || shippingFee) && rateStatus !== 'loading' && (
                <div className="mt-2 px-3 py-2 bg-[#FAF6F0] rounded-xl text-[12px] text-[#64748B] flex flex-wrap gap-2">
                  {productPrice && (
                    <span>상품가 ≈ <strong className="text-[#1E293B]">{Math.round(parseFloat(productPrice) * previewRate).toLocaleString()}원</strong></span>
                  )}
                  {productPrice && shippingFee && <span className="text-[#CBD5E1]">+</span>}
                  {shippingFee && (
                    <span>배송비 ≈ <strong className="text-[#1E293B]">{Math.round(parseFloat(shippingFee) * previewRate).toLocaleString()}원</strong></span>
                  )}
                </div>
              )}
            </div>

            {/* ③ 품목 */}
            <div>
              <SectionLabel num="③" label="품목 (관세율 결정)" />
              <p className="text-[10px] text-[#94A3B8] mt-1 px-1">{RATE_BASIS}</p>
              <div className="flex flex-col gap-3 mt-2">
                {CATEGORIES.map(cat => (
                  <div key={cat.group}>
                    <p className="text-[11px] font-semibold text-[#94A3B8] mb-1.5 px-1">{cat.group}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {cat.items.map(item => (
                        <button key={item.id} onClick={() => setCategoryId(item.id)}
                          className={`px-3 py-2 rounded-xl text-left text-[12px] font-medium transition-all border ${categoryId === item.id ? 'bg-[#0ABAB5] text-white border-[#0ABAB5]' : 'bg-[#FAF6F0] text-[#64748B] border-[#E2E8F0] hover:border-[#0ABAB5]'}`}>
                          <span className="block font-bold">{item.label}</span>
                          <span className={`text-[10px] font-normal ${categoryId === item.id ? 'text-white/80' : 'text-[#94A3B8]'}`}>관세 {item.duty}% · {item.note}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ④ 옵션 */}
            <div>
              <SectionLabel num="④" label="옵션" />
              <div className="flex flex-col gap-2 mt-2">
                <Toggle on={fromUS} onToggle={() => setFromUS(v => !v)}
                  title={`미국 출발 (한미 FTA) — 면세한도 ${fromUS ? '$200' : '$150'}`}
                  desc="아마존·이베이 미국 셀러 등" />
                <Toggle on={includeShippingInTax} onToggle={() => setIncludeShippingInTax(v => !v)}
                  title="과세가격에 배송비 포함 (CIF 기준)"
                  desc="일반적으로 배송비 포함이 원칙" />
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        {result ? (
          <TaxResult result={result} cur={cur} fromUS={fromUS} rateStatus={rateStatus} rateDate={rateDate} />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
            <span className="text-[36px] block mb-3">✈️</span>
            <p className="text-[14px] text-[#94A3B8]">상품 가격을 입력하면 세금을 계산해드려요</p>
          </div>
        )}

        <CoupangInlineHorizontalBanner fillWidth />

        <div className="mt-6 bg-[#FFFBEB] rounded-xl p-4 border border-[#FDE68A]">
          <p className="text-[12px] text-[#92400E] leading-relaxed font-semibold mb-2">⚠️ 꼭 확인하세요</p>
          <ul className="text-[12px] text-[#92400E] leading-relaxed space-y-1.5 list-none">
            <li>• <strong>이 계산기는 참고용입니다.</strong> 실제 세액은 품목 HS코드·원산지·FTA 적용 여부·관세청 판단에 따라 달라질 수 있어요.</li>
            <li>• <strong>주류·담배·향수</strong>는 관세 외 주세·개별소비세·교육세 등이 별도 부과되며, 수량 제한도 있어요. 이 계산기에서는 지원하지 않습니다.</li>
            <li>• <strong>미국 출발이라도 EMS(국제우편) 이용 시</strong>는 $150 면세 기준이 적용됩니다. $200 면세는 DHL·FedEx·UPS 등 특송업체 한정이에요.</li>
            <li>• <strong>같은 날, 같은 수취인, 유사 품목</strong>으로 여러 건 구매 시 합산과세 대상이 될 수 있어요.</li>
            <li>• 관세율 기준: <strong>{RATE_BASIS}</strong></li>
            <li>• 환율 출처: open.er-api.com (무료 공개 API, 일 1회 업데이트)</li>
            <li>• 정확한 세액은 <strong>관세청 유니패스</strong> 또는 배송 대행사를 통해 확인하세요.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

// ── 환율 배너 ─────────────────────────────────────────────────────
function RateBanner({ status, rateDate, error, onRefresh }) {
  if (status === 'loading') return (
    <div className="mb-4 px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-[#0ABAB5] border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <span className="text-[13px] text-[#64748B]">실시간 환율 불러오는 중…</span>
    </div>
  );
  if (status === 'live') return (
    <div className="mb-4 px-4 py-3 bg-[#E6FAF9] border border-[#0ABAB5]/30 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[15px]">✅</span>
        <div>
          <span className="text-[13px] font-bold text-[#0ABAB5]">실시간 환율 적용 중</span>
          {rateDate && <span className="text-[11px] text-[#64748B] ml-2">기준일 {rateDate} · open.er-api.com</span>}
        </div>
      </div>
      <button onClick={onRefresh} className="text-[12px] font-bold text-[#0ABAB5] hover:underline">↺ 새로고침</button>
    </div>
  );
  if (status === 'fallback') return (
    <div className="mb-4 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[15px]">⚠️</span>
        <span className="text-[12px] text-[#92400E]">{error}</span>
      </div>
      <button onClick={onRefresh} className="text-[12px] font-bold text-[#D97706] hover:underline">재시도</button>
    </div>
  );
  return null;
}

// ── 소형 공통 컴포넌트 ────────────────────────────────────────────
function SectionLabel({ num, label }) {
  return <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-wide"><span className="text-[#0ABAB5] mr-1">{num}</span>{label}</p>;
}
function PriceInput({ label, symbol, placeholder, value, onChange }) {
  return (
    <div>
      <p className="text-[11px] text-[#94A3B8] mb-1">{label}</p>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#94A3B8]">{symbol}</span>
        <input type="number" inputMode="decimal" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[15px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 focus:border-[#0ABAB5] transition-all" />
      </div>
    </div>
  );
}
function Toggle({ on, onToggle, title, desc }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0]" onClick={onToggle}>
      <div className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-[#0ABAB5]' : 'bg-[#CBD5E1]'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      <div>
        <p className="text-[13px] font-bold text-[#1E293B]">{title}</p>
        <p className="text-[11px] text-[#94A3B8]">{desc}</p>
      </div>
    </div>
  );
}

// ── 결과 섹션 ─────────────────────────────────────────────────────
function TaxResult({ result, cur, fromUS, rateStatus, rateDate }) {
  const { totalUSD, threshold, isTaxFree, productKRW, shippingKRW, productUSD, shippingUSD,
    dutyRate, dutyKRW, vatKRW, totalTaxKRW, isMinorTaxExempt, finalKRW, actualTaxKRW, effectiveRate } = result;

  const taxStatus = isTaxFree
    ? { label: '✅ 면세 대상',  color: '#0ABAB5', bg: '#E6FAF9', desc: `합계 $${totalUSD} ≤ $${threshold} (면세 한도)` }
    : isMinorTaxExempt
    ? { label: '✅ 소액 면제',  color: '#10B981', bg: '#ECFDF5', desc: `세액 ${totalTaxKRW.toLocaleString()}원 < 50,000원 (목록통관)` }
    : { label: '⚠️ 과세 대상', color: '#FF6B6B', bg: '#FFF0F0', desc: `합계 $${totalUSD} > $${threshold} (면세 한도 초과)` };

  const displayRate = cur?.per100
    ? `100${cur.code} = ${Math.round(effectiveRate * 100).toLocaleString()}원`
    : `1${cur?.code} = ${Math.round(effectiveRate).toLocaleString()}원`;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 p-4 flex items-center gap-3" style={{ borderColor: taxStatus.color, backgroundColor: taxStatus.bg }}>
        <span className="text-[28px]">{isTaxFree || isMinorTaxExempt ? '✅' : '⚠️'}</span>
        <div>
          <p className="text-[15px] font-extrabold" style={{ color: taxStatus.color }}>{taxStatus.label}</p>
          <p className="text-[12px] text-[#64748B] mt-0.5">{taxStatus.desc}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-[14px] font-extrabold text-[#1E293B]">💰 예상 총 비용</h2>
        </div>
        <div className="px-5 py-5 text-center border-b border-[#F1F5F9]">
          <p className="text-[36px] font-extrabold text-[#FF6B6B] leading-none">
            {finalKRW.toLocaleString()}<span className="text-[20px] ml-1">원</span>
          </p>
          <p className="text-[12px] mt-1.5 flex items-center justify-center gap-1.5">
            <span className={`font-medium px-2 py-0.5 rounded-full text-[11px] ${rateStatus === 'live' ? 'bg-[#E6FAF9] text-[#0ABAB5]' : 'bg-[#F8FAFC] text-[#94A3B8]'}`}>
              {rateStatus === 'live' ? '실시간 환율' : '기준 환율'}
            </span>
            <span className="text-[#94A3B8]">{displayRate}</span>
            {rateStatus === 'live' && rateDate && <span className="text-[#94A3B8]">· {rateDate}</span>}
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-0">
          {/* 상품가 */}
          <div className="flex items-center justify-between py-2.5 border-b border-[#F8FAFC]">
            <span className="text-[13px] text-[#64748B]">상품가 ({cur?.symbol}{productUSD.toFixed(2)})</span>
            <span className="text-[14px] font-bold text-[#1E293B]">{productKRW.toLocaleString()}원</span>
          </div>
          {/* 배송비 */}
          {shippingKRW > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b border-[#F8FAFC]">
              <span className="text-[13px] text-[#64748B]">배송비 ({cur?.symbol}{shippingUSD.toFixed(2)})</span>
              <span className="text-[14px] font-bold text-[#64748B]">{shippingKRW.toLocaleString()}원</span>
            </div>
          )}
          {/* 세금 영역: 면세/소액면제 여부와 무관하게 구조는 항상 동일하게 표시 */}
          {!isTaxFree && !isMinorTaxExempt && (
            <>
              {/* 관세: 0%여도 항상 표시 — "무관세이지만 부가세는 있다"는 구조를 명확히 */}
              <div className="flex items-center justify-between py-2.5 border-b border-[#F8FAFC]">
                <div>
                  <span className="text-[13px] text-[#64748B]">
                    관세 ({dutyRate}%)
                  </span>
                  {dutyKRW === 0 && (
                    <span className="ml-2 text-[10px] font-semibold text-[#10B981] bg-[#ECFDF5] px-1.5 py-0.5 rounded-full">무관세</span>
                  )}
                </div>
                <span className={`text-[14px] font-bold ${dutyKRW === 0 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                  {dutyKRW.toLocaleString()}원
                </span>
              </div>
              {/* 부가세: 관세 0%여도 항상 부과 */}
              <div className="flex items-center justify-between py-2.5 border-b border-[#F8FAFC]">
                <div>
                  <span className="text-[13px] text-[#64748B]">부가세 (10%)</span>
                  {dutyKRW === 0 && (
                    <span className="ml-2 text-[10px] text-[#94A3B8]">관세 0%여도 부과</span>
                  )}
                </div>
                <span className="text-[14px] font-bold text-[#FF6B6B]">{vatKRW.toLocaleString()}원</span>
              </div>
            </>
          )}
          {!isTaxFree && !isMinorTaxExempt ? (
            <div className="mt-3 p-3 rounded-xl bg-[#FFF0F0] flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#FF6B6B]">총 세금</span>
              <span className="text-[16px] font-extrabold text-[#FF6B6B]">{actualTaxKRW.toLocaleString()}원</span>
            </div>
          ) : (
            <div className="mt-3 p-3 rounded-xl bg-[#E6FAF9] flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#0ABAB5]">세금</span>
              <span className="text-[16px] font-extrabold text-[#0ABAB5]">면제 🎉</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <h3 className="text-[13px] font-extrabold text-[#1E293B] mb-3">📋 면세 기준</h3>
        <div className="flex flex-col gap-2">
          {[
            { flag: '🇺🇸', label: '미국 출발 (한미 FTA)', limit: '$200', active: fromUS },
            { flag: '🌐',   label: '그 외 국가',           limit: '$150', active: !fromUS },
          ].map((row, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${row.active ? 'bg-[#E6FAF9] border border-[#0ABAB5]' : 'bg-[#FAF6F0]'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{row.flag}</span>
                <span className={`text-[13px] font-medium ${row.active ? 'text-[#0ABAB5]' : 'text-[#64748B]'}`}>{row.label}</span>
              </div>
              <span className={`text-[14px] font-extrabold ${row.active ? 'text-[#0ABAB5]' : 'text-[#94A3B8]'}`}>{row.limit} 이하</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#94A3B8] mt-3 leading-relaxed">
          * 상품가 + 배송비 합산 기준입니다.<br />
          * 주류·담배·향수는 소액이라도 별도 과세될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
