'use client'

import { useState } from 'react';
import Link from 'next/link';
import CoupangInlineHorizontalBanner from '@/components/CoupangInlineHorizontalBanner';

// ── 네비게이션 공통 ────────────────────────────────────────────
const NAV_LINKS = [
  ['핫딜모음', '/hotdeals'],
  ['쿠팡핫딜', '/coupang'],
  ['핫딜온도계', '/hotdeal-thermometer'],
  ['정보모음', '/blog'],
  ['유틸리티', '/utility'],
];

// ── 계산 로직 ──────────────────────────────────────────────────
function calcFromPrices(original, discounted) {
  const o = parseFloat(original);
  const d = parseFloat(discounted);
  if (!o || !d || o <= 0 || d < 0) return null;
  if (d >= o) return null;
  const rate = ((o - d) / o) * 100;
  const saved = o - d;
  return { rate: Math.round(rate * 10) / 10, saved: Math.round(saved), discounted: Math.round(d) };
}

function calcFromRate(original, rate) {
  const o = parseFloat(original);
  const r = parseFloat(rate);
  if (!o || !r || o <= 0 || r <= 0 || r >= 100) return null;
  const discounted = o * (1 - r / 100);
  const saved = o - discounted;
  return { rate: r, saved: Math.round(saved), discounted: Math.round(discounted) };
}

function calcFromDiscountedAndRate(discounted, rate) {
  const d = parseFloat(discounted);
  const r = parseFloat(rate);
  if (!d || !r || d <= 0 || r <= 0 || r >= 100) return null;
  const original = d / (1 - r / 100);
  const saved = original - d;
  return { rate: r, saved: Math.round(saved), discounted: Math.round(d), original: Math.round(original) };
}

// ── 탭 정의 ────────────────────────────────────────────────────
const TABS = [
  { id: 'rate',       label: '할인율 구하기',  desc: '정가 → 할인가 → 몇 % 세일?' },
  { id: 'price',      label: '할인가 구하기',  desc: '정가 + 할인율 → 실제 가격은?' },
  { id: 'original',   label: '정가 복원하기',  desc: '할인가 + 할인율 → 원래 정가는?' },
];

export default function DiscountCalculatorPage() {
  const [tab, setTab] = useState('rate');

  // 탭별 입력 상태
  const [rate_orig,   setRateOrig]   = useState('');
  const [rate_disc,   setRateDisc]   = useState('');
  const [price_orig,  setPriceOrig]  = useState('');
  const [price_rate,  setPriceRate]  = useState('');
  const [orig_disc,   setOrigDisc]   = useState('');
  const [orig_rate,   setOrigRate]   = useState('');

  const resultRate     = calcFromPrices(rate_orig, rate_disc);
  const resultPrice    = calcFromRate(price_orig, price_rate);
  const resultOriginal = calcFromDiscountedAndRate(orig_disc, orig_rate);

  const currentResult = tab === 'rate' ? resultRate : tab === 'price' ? resultPrice : resultOriginal;

  const rateColor = (r) => {
    if (!r) return '#94A3B8';
    if (r >= 50) return '#7C3AED';
    if (r >= 30) return '#FF6B6B';
    if (r >= 10) return '#F59E0B';
    return '#0ABAB5';
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">

      {/* ── 헤더 ── */}
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

        {/* ── 타이틀 ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[32px]">💸</span>
            <div>
              <h1 className="text-[24px] font-extrabold text-[#1E293B] leading-tight">할인율 계산기</h1>
              <p className="text-[13px] text-[#64748B]">이게 진짜 싼걸까? 바로 확인해요</p>
            </div>
          </div>
          <p className="text-[14px] text-[#64748B] leading-relaxed mt-3">
            정가와 할인가, 또는 할인율을 입력해서<br />
            <strong className="text-[#1E293B]">실제 절약 금액과 할인율</strong>을 바로 확인하세요.
          </p>
        </div>

        {/* ── 탭 ── */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                tab === t.id
                  ? 'bg-[#0ABAB5] text-white shadow-sm'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#0ABAB5] hover:text-[#0ABAB5]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 입력 카드 ── */}
        <div className="bg-white rounded-2xl border-2 border-[#0ABAB5] overflow-hidden mb-6">
          <div className="px-5 py-3 bg-[#E6FAF9]">
            <p className="text-[13px] font-bold text-[#0ABAB5]">{TABS.find(t => t.id === tab)?.desc}</p>
          </div>

          <div className="p-5 flex flex-col gap-4">

            {/* ── 탭: 할인율 구하기 ── */}
            {tab === 'rate' && (
              <>
                <InputField label="정가" value={rate_orig} onChange={setRateOrig} suffix="원" placeholder="예: 15,000" />
                <InputField label="할인가" value={rate_disc} onChange={setRateDisc} suffix="원" placeholder="예: 9,900" hint="실제 결제 금액" />
              </>
            )}

            {/* ── 탭: 할인가 구하기 ── */}
            {tab === 'price' && (
              <>
                <InputField label="정가" value={price_orig} onChange={setPriceOrig} suffix="원" placeholder="예: 15,000" />
                <InputField label="할인율" value={price_rate} onChange={setPriceRate} suffix="%" placeholder="예: 34" hint="0~99 사이 숫자" />
              </>
            )}

            {/* ── 탭: 정가 복원 ── */}
            {tab === 'original' && (
              <>
                <InputField label="할인가" value={orig_disc} onChange={setOrigDisc} suffix="원" placeholder="예: 9,900" />
                <InputField label="할인율" value={orig_rate} onChange={setOrigRate} suffix="%" placeholder="예: 34" hint="0~99 사이 숫자" />
              </>
            )}
          </div>
        </div>

        {/* ── 결과 카드 ── */}
        {currentResult ? (
          <ResultCard result={currentResult} tab={tab} rateColor={rateColor} />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
            <span className="text-[36px] block mb-3">🏷️</span>
            <p className="text-[14px] text-[#94A3B8]">값을 입력하면 바로 계산돼요</p>
          </div>
        )}
        <CoupangInlineHorizontalBanner fillWidth />
        {/* ── 안내 ── */}
        <div className="mt-6 bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
          <p className="text-[12px] text-[#94A3B8] leading-relaxed">
            💡 <strong className="text-[#64748B]">정가 복원하기</strong>는 쿠팡·마켓컬리 등에서 할인가만 표시되고 정가가 안 보일 때 유용해요.
          </p>
        </div>

      </main>
    </div>
  );
}

// ── 입력 필드 컴포넌트 ──────────────────────────────────────────
function InputField({ label, value, onChange, suffix, placeholder, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[11px] text-[#94A3B8]">{hint}</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[16px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 focus:border-[#0ABAB5] transition-all"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#94A3B8] font-semibold">{suffix}</span>
      </div>
    </div>
  );
}

// ── 결과 카드 컴포넌트 ──────────────────────────────────────────
function ResultCard({ result, tab, rateColor }) {
  const rc = rateColor(result.rate);
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F1F5F9]">
        <h2 className="text-[14px] font-extrabold text-[#1E293B]">📊 계산 결과</h2>
      </div>

      {/* 메인 수치 */}
      <div className="px-5 py-6 flex items-center justify-around gap-4 border-b border-[#F1F5F9]">
        {tab === 'rate' && (
          <>
            <Stat label="할인율" value={`${result.rate}%`} color={rc} large />
            <div className="w-px h-12 bg-[#E2E8F0]" />
            <Stat label="절약 금액" value={`${result.saved.toLocaleString()}원`} color="#FF6B6B" large />
          </>
        )}
        {tab === 'price' && (
          <>
            <Stat label="할인가" value={`${result.discounted.toLocaleString()}원`} color="#FF6B6B" large />
            <div className="w-px h-12 bg-[#E2E8F0]" />
            <Stat label="절약 금액" value={`${result.saved.toLocaleString()}원`} color={rc} large />
          </>
        )}
        {tab === 'original' && (
          <>
            <Stat label="원래 정가" value={`${result.original.toLocaleString()}원`} color="#1E293B" large />
            <div className="w-px h-12 bg-[#E2E8F0]" />
            <Stat label="절약 금액" value={`${result.saved.toLocaleString()}원`} color="#FF6B6B" large />
          </>
        )}
      </div>

      {/* 할인 레벨 뱃지 */}
      <div className="px-5 py-4">
        <DiscountBadge rate={result.rate} />
      </div>
    </div>
  );
}

function Stat({ label, value, color, large }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-extrabold leading-none ${large ? 'text-[26px]' : 'text-[18px]'}`} style={{ color }}>{value}</p>
    </div>
  );
}

function DiscountBadge({ rate }) {
  const levels = [
    { min: 50, icon: '🔥', label: '역대급 할인!',   bg: '#F3E8FF', color: '#7C3AED' },
    { min: 30, icon: '🎉', label: '꽤 좋은 할인',   bg: '#FFF0F0', color: '#FF6B6B' },
    { min: 10, icon: '👍', label: '무난한 할인',     bg: '#FFFBEB', color: '#D97706' },
    { min: 0,  icon: '🤔', label: '소소한 할인',     bg: '#F8FAFC', color: '#64748B' },
  ];
  const level = levels.find(l => rate >= l.min) || levels[levels.length - 1];
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: level.bg }}>
      <span className="text-[18px]">{level.icon}</span>
      <span className="text-[13px] font-bold" style={{ color: level.color }}>
        {level.label} ({rate}% 할인)
      </span>
    </div>
  );
}
