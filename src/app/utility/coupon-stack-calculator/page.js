'use client'

import { useState, useCallback } from 'react';
import Link from 'next/link';
import CoupangInlineHorizontalBanner from '@/components/CoupangInlineHorizontalBanner';

// ── 네비게이션 ─────────────────────────────────────────────────
const NAV_LINKS = [
  ['핫딜모음', '/hotdeals'],
  ['쿠팡핫딜', '/coupang'],
  ['핫딜온도계', '/hotdeal-thermometer'],
  ['정보모음', '/blog'],
  ['유틸리티', '/utility'],
];

// ── 할인 단계 타입 ─────────────────────────────────────────────
const STEP_TYPES = [
  { id: 'rate',   label: '% 할인',   placeholder: '예: 10',    suffix: '%',  hint: '상품 자체 할인, 쿠폰 % 등' },
  { id: 'amount', label: '정액 할인', placeholder: '예: 3,000', suffix: '원', hint: '카드 즉시할인, 포인트 차감 등' },
];

const PRESET_STEPS = [
  { label: '상품 할인',     type: 'rate',   value: '' },
  { label: '쿠폰',         type: 'rate',   value: '' },
  { label: '카드 즉시할인', type: 'amount', value: '' },
  { label: '포인트 사용',   type: 'amount', value: '' },
];

const emptyStep = () => ({ label: '', type: 'rate', value: '' });

// ── 계산 엔진 ──────────────────────────────────────────────────
function calculate(basePrice, steps) {
  const base = parseFloat(basePrice);
  if (!base || base <= 0) return null;

  let current = base;
  const trace = [];

  for (const step of steps) {
    const val = parseFloat(step.value);
    if (!val || val <= 0) continue;

    let before = current;
    let discount = 0;

    if (step.type === 'rate') {
      if (val >= 100) continue;
      discount = current * (val / 100);
    } else {
      discount = Math.min(val, current); // 정액은 현재가 초과 불가
    }

    current = Math.max(0, current - discount);
    trace.push({
      label: step.label || (step.type === 'rate' ? `${val}% 할인` : `${val.toLocaleString()}원 할인`),
      type: step.type,
      val,
      before: Math.round(before),
      discount: Math.round(discount),
      after: Math.round(current),
    });
  }

  if (trace.length === 0) return null;

  const totalSaved = base - current;
  const totalRate = (totalSaved / base) * 100;

  return {
    base: Math.round(base),
    final: Math.round(current),
    totalSaved: Math.round(totalSaved),
    totalRate: Math.round(totalRate * 10) / 10,
    trace,
  };
}

export default function CouponStackCalculatorPage() {
  const [basePrice, setBasePrice] = useState('');
  const [steps, setSteps] = useState(PRESET_STEPS.slice(0, 3).map(s => ({ ...s })));

  const updateStep = useCallback((idx, field, val) => {
    setSteps(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }, []);

  const addStep = () => {
    if (steps.length < 6) setSteps(p => [...p, emptyStep()]);
  };

  const removeStep = (idx) => {
    if (steps.length <= 1) return;
    setSteps(p => p.filter((_, i) => i !== idx));
  };

  const result = calculate(basePrice, steps);

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
            <span className="text-[32px]">🧾</span>
            <div>
              <h1 className="text-[24px] font-extrabold text-[#1E293B] leading-tight">중복할인 계산기</h1>
              <p className="text-[13px] text-[#64748B]">쿠폰·카드·포인트 다 합치면 얼마?</p>
            </div>
          </div>
          <p className="text-[14px] text-[#64748B] leading-relaxed mt-3">
            할인이 여러 개 겹칠 때 <strong className="text-[#1E293B]">순서대로 차감</strong>해서<br />
            <strong className="text-[#0ABAB5]">최종 결제 금액</strong>과 실질 할인율을 계산해드려요.
          </p>
        </div>

        {/* ── 정가 입력 ── */}
        <div className="bg-white rounded-2xl border-2 border-[#0ABAB5] overflow-hidden mb-4">
          <div className="px-5 py-3 bg-[#E6FAF9]">
            <p className="text-[13px] font-bold text-[#0ABAB5]">① 정가 입력</p>
          </div>
          <div className="p-5">
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="예: 49,800"
                value={basePrice}
                onChange={e => setBasePrice(e.target.value)}
                className="w-full pl-4 pr-12 py-4 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[20px] font-extrabold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal placeholder:text-[16px] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 focus:border-[#0ABAB5] transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-[#94A3B8] font-semibold">원</span>
            </div>
          </div>
        </div>

        {/* ── 할인 단계 입력 ── */}
        <div className="bg-white rounded-2xl border-2 border-[#E2E8F0] overflow-hidden mb-4">
          <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <p className="text-[13px] font-bold text-[#64748B]">② 할인 항목 (적용 순서대로 입력)</p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {steps.map((step, idx) => (
              <StepRow
                key={idx}
                idx={idx}
                step={step}
                onUpdate={updateStep}
                onRemove={removeStep}
                canRemove={steps.length > 1}
                isLast={idx === steps.length - 1}
              />
            ))}
          </div>

          {steps.length < 6 && (
            <div className="px-4 pb-4">
              <button onClick={addStep}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#CBD5E1] text-[13px] font-semibold text-[#94A3B8] hover:border-[#0ABAB5] hover:text-[#0ABAB5] hover:bg-[#F0FDFC] transition-all">
                + 할인 항목 추가
              </button>
            </div>
          )}
        </div>

        {/* ── 결과 ── */}
        {result ? (
          <ResultSection result={result} />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center mt-6">
            <span className="text-[36px] block mb-3">🧮</span>
            <p className="text-[14px] text-[#94A3B8]">정가와 할인 항목을 입력하면 바로 계산돼요</p>
          </div>
        )}

        <CoupangInlineHorizontalBanner fillWidth />

        {/* ── 안내 ── */}
        <div className="mt-6 bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
          <p className="text-[12px] text-[#94A3B8] leading-relaxed">
            💡 <strong className="text-[#64748B]">% 할인은 그 시점 가격에서</strong> 차감됩니다.
            예: 정가 10,000원 → 쿠폰 10% → 카드 1,000원 → 최종 8,000원
          </p>
        </div>

      </main>
    </div>
  );
}

// ── 할인 단계 행 ───────────────────────────────────────────────
function StepRow({ idx, step, onUpdate, onRemove, canRemove, isLast }) {
  const stepNum = idx + 1;
  return (
    <div className="flex gap-2 items-start">
      {/* 순서 번호 */}
      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#0ABAB5] text-white text-[12px] font-extrabold flex items-center justify-center mt-3">
        {stepNum}
      </div>

      <div className="flex-1 bg-[#FAF6F0] rounded-xl p-3 border border-[#E2E8F0]">
        {/* 항목명 */}
        <input
          type="text"
          placeholder={`할인 항목 ${stepNum} (예: 네이버페이 쿠폰)`}
          value={step.label}
          onChange={e => onUpdate(idx, 'label', e.target.value)}
          className="w-full bg-transparent text-[13px] font-medium text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none mb-2"
        />

        <div className="flex gap-2">
          {/* 타입 토글 */}
          <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0] flex-shrink-0">
            {STEP_TYPES.map(t => (
              <button key={t.id} onClick={() => onUpdate(idx, 'type', t.id)}
                className={`px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  step.type === t.id ? 'bg-[#0ABAB5] text-white' : 'bg-white text-[#94A3B8] hover:text-[#0ABAB5]'
                }`}>
                {t.suffix}
              </button>
            ))}
          </div>

          {/* 값 입력 */}
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              placeholder={STEP_TYPES.find(t => t.id === step.type)?.placeholder}
              value={step.value}
              onChange={e => onUpdate(idx, 'value', e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[14px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#94A3B8] font-semibold">
              {step.type === 'rate' ? '%' : '원'}
            </span>
          </div>
        </div>
      </div>

      {/* 삭제 */}
      {canRemove ? (
        <button onClick={() => onRemove(idx)} className="mt-3 text-[#CBD5E1] hover:text-[#FF6B6B] transition-colors flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </button>
      ) : (
        <div className="w-[18px] flex-shrink-0" />
      )}
    </div>
  );
}

// ── 결과 섹션 ─────────────────────────────────────────────────
function ResultSection({ result }) {
  return (
    <div className="mt-6 flex flex-col gap-4">

      {/* 최종 결제금액 강조 카드 */}
      <div className="bg-white rounded-2xl border-2 border-[#FF6B6B] overflow-hidden">
        <div className="px-5 py-3 bg-[#FFF0F0]">
          <p className="text-[13px] font-bold text-[#FF6B6B]">최종 결제 금액</p>
        </div>
        <div className="px-5 py-5 flex items-center justify-between">
          <div>
            <p className="text-[32px] font-extrabold text-[#FF6B6B] leading-none">
              {result.final.toLocaleString()}<span className="text-[18px] ml-1">원</span>
            </p>
            <p className="text-[13px] text-[#94A3B8] mt-1">
              정가 {result.base.toLocaleString()}원에서 {result.totalRate}% 할인
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-[#94A3B8] mb-0.5">총 절약</p>
            <p className="text-[20px] font-extrabold text-[#0ABAB5]">{result.totalSaved.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      {/* 단계별 계산 과정 */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F1F5F9]">
          <h2 className="text-[14px] font-extrabold text-[#1E293B]">📋 단계별 계산 과정</h2>
        </div>

        <div className="p-4 flex flex-col gap-0">
          {/* 정가 */}
          <div className="flex items-center justify-between py-3 border-b border-[#F8FAFC]">
            <span className="text-[13px] text-[#94A3B8] font-medium">정가</span>
            <span className="text-[14px] font-bold text-[#1E293B]">{result.base.toLocaleString()}원</span>
          </div>

          {/* 각 할인 단계 */}
          {result.trace.map((t, i) => (
            <div key={i} className="border-b border-[#F8FAFC] last:border-0">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0ABAB5] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="text-[13px] text-[#1E293B] font-medium">{t.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-[13px] font-bold text-[#FF6B6B]">−{t.discount.toLocaleString()}원</span>
                  <span className="text-[11px] text-[#94A3B8] ml-1.5">
                    {t.type === 'rate' ? `(${t.val}%)` : '(정액)'}
                  </span>
                </div>
              </div>
              <div className="flex justify-end pb-2">
                <span className="text-[12px] text-[#64748B]">→ <strong>{t.after.toLocaleString()}원</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* 최종 합계 바 */}
        <div className="px-5 py-4 bg-[#FAF6F0] border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[#94A3B8]">할인 진행률</span>
            <span className="text-[12px] font-bold text-[#0ABAB5]">{result.totalRate}%</span>
          </div>
          <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0ABAB5] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(result.totalRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
