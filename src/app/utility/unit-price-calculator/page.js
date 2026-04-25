'use client'

import { useState, useCallback } from 'react';
import Link from 'next/link';
import CoupangInlineHorizontalBanner from '@/components/CoupangInlineHorizontalBanner';

// ── 단위 변환 ──────────────────────────────────────────────────
const UNIT_BASE = {
  g:  { base: 1,    kind: 'solid' },
  kg: { base: 1000, kind: 'solid' },
  ml: { base: 1,    kind: 'liquid' },
  L:  { base: 1000, kind: 'liquid' },
};

const SOLID_STEPS  = [
  { label: '10g',   div: 10   },
  { label: '100g',  div: 100  },
  { label: '1kg',   div: 1000 },
];
const LIQUID_STEPS = [
  { label: '10ml',  div: 10   },
  { label: '100ml', div: 100  },
  { label: '1L',    div: 1000 },
];

function calcUnitPrices(price, amount, unit, qty) {
  const p = parseFloat(price);
  const a = parseFloat(amount);
  const q = parseFloat(qty) || 1;
  if (!p || !a) return null;

  const { base, kind } = UNIT_BASE[unit];
  const totalBaseUnits = a * base * q;   // 총 g 또는 총 ml
  const steps = kind === 'solid' ? SOLID_STEPS : LIQUID_STEPS;

  return {
    kind,
    perItem: q > 1 ? Math.round(p / q) : null,
    steps: steps.map(({ label, div }) => ({
      label,
      price: Math.round((p / totalBaseUnits) * div),
    })),
  };
}

// ── 색상 팔레트 (카드별) ───────────────────────────────────────
const CARD_COLORS = [
  { border: '#0ABAB5', bg: '#E6FAF9', label: '#0ABAB5', idx: 'A' },
  { border: '#FF6B6B', bg: '#FFF0F0', label: '#FF6B6B', idx: 'B' },
  { border: '#F59E0B', bg: '#FFFBEB', label: '#D97706', idx: 'C' },
];

const emptyProduct = () => ({ name: '', price: '', amount: '', unit: 'g', qty: '1' });

// ── 최저가 강조 ─────────────────────────────────────────────────
function getMinIdxAt(results, stepIdx) {
  const vals = results.map(r => r?.steps?.[stepIdx]?.price).filter(Boolean);
  if (vals.length < 2) return -1;
  const min = Math.min(...vals);
  return results.findIndex(r => r?.steps?.[stepIdx]?.price === min);
}

export default function UnitPriceCalculatorPage() {
  const [products, setProducts] = useState([emptyProduct(), emptyProduct()]);

  const update = useCallback((idx, field, val) => {
    setProducts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }, []);

  const addProduct = () => {
    if (products.length < 3) setProducts(p => [...p, emptyProduct()]);
  };

  const removeProduct = (idx) => {
    if (products.length <= 2) return;
    setProducts(p => p.filter((_, i) => i !== idx));
  };

  const results = products.map(p =>
    calcUnitPrices(p.price, p.amount, p.unit, p.qty)
  );

  const hasAnyResult = results.some(Boolean);

  // 결과 행의 단위 레이블 (첫 유효 결과에서 가져옴)
  const firstResult = results.find(Boolean);
  const steps = firstResult?.steps ?? [];
  const showPerItem = results.some(r => r?.perItem != null);

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <img src="/logo-ssagesage.png" alt="싸게사게" className="h-12 w-auto object-contain" />
          </Link>
          <Link href="/utility" className="text-[13px] font-medium text-[#64748B] hover:text-[#0ABAB5] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors">
            ← 유틸리티
          </Link>
        </div>
        <nav className="px-4 pb-1 flex items-center gap-5">
          {[['핫딜모음','/hotdeals'],['쿠팡핫딜','/coupang'],['핫딜온도계','/hotdeal-thermometer'],['정보모음','/blog'],['유틸리티','/utility']].map(([label, href]) => (
            <Link key={href} href={href} className={`py-3 text-[14px] font-medium transition-colors ${href === '/utility' ? 'relative font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full' : 'text-[#64748B] hover:text-[#1E293B]'}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="px-4 py-8">

        {/* ── 타이틀 ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[32px]">⚖️</span>
            <div>
              <h1 className="text-[24px] font-extrabold text-[#1E293B] leading-tight">단가척척</h1>
              <p className="text-[13px] text-[#64748B]">단가를 척척 계산해요</p>
            </div>
          </div>
          <p className="text-[14px] text-[#64748B] leading-relaxed mt-3">
            가격과 용량을 입력하면 <strong className="text-[#1E293B]">10g·100g·1kg당</strong> 단가를 바로 계산해드려요.<br />
            상품을 여러 개 입력하면 <strong className="text-[#0ABAB5]">가장 저렴한 단가</strong>를 자동으로 찾아드립니다.
          </p>
        </div>

        {/* ── 입력 카드 목록 ── */}
        <div className="flex flex-col gap-4 mb-6">
          {products.map((p, idx) => {
            const col = CARD_COLORS[idx];
            const isLiquid = ['ml','L'].includes(p.unit);
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border-2 overflow-hidden"
                style={{ borderColor: col.border }}
              >
                {/* 카드 상단 색상 바 */}
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: col.bg }}>
                  <span className="text-[13px] font-extrabold" style={{ color: col.label }}>
                    상품 {col.idx}
                  </span>
                  {products.length > 2 && (
                    <button onClick={() => removeProduct(idx)} className="text-[12px] text-[#94A3B8] hover:text-[#FF6B6B] transition-colors">
                      삭제
                    </button>
                  )}
                </div>

                <div className="p-4 grid grid-cols-1 gap-3">
                  {/* 상품명 */}
                  <input
                    type="text"
                    placeholder="상품명 (선택)"
                    value={p.name}
                    onChange={e => update(idx, 'name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[14px] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 transition-all"
                    style={{ '--tw-ring-color': col.border + '66' }}
                  />

                  {/* 가격 + 수량 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1 block">가격</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={p.price}
                          onChange={e => update(idx, 'price', e.target.value)}
                          className="w-full pl-4 pr-8 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[15px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#94A3B8] font-medium">원</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1 block">수량</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="1"
                          min="1"
                          value={p.qty}
                          onChange={e => update(idx, 'qty', e.target.value)}
                          className="w-full pl-4 pr-8 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[15px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#94A3B8] font-medium">개</span>
                      </div>
                    </div>
                  </div>

                  {/* 용량 + 단위 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1 block">
                        {isLiquid ? '용량 (1개당)' : '무게 (1개당)'}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={p.amount}
                        onChange={e => update(idx, 'amount', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[15px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1 block">단위</label>
                      <div className="grid grid-cols-4 gap-1 h-[50px]">
                        {Object.keys(UNIT_BASE).map(u => (
                          <button
                            key={u}
                            onClick={() => update(idx, 'unit', u)}
                            className={`rounded-xl text-[13px] font-bold transition-all ${
                              p.unit === u
                                ? 'text-white shadow-sm'
                                : 'bg-[#FAF6F0] text-[#64748B] border border-[#E2E8F0] hover:border-[#0ABAB5]'
                            }`}
                            style={p.unit === u ? { backgroundColor: col.border } : {}}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 상품 추가 버튼 ── */}
        {products.length < 3 && (
          <button
            onClick={addProduct}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#CBD5E1] text-[14px] font-semibold text-[#94A3B8] hover:border-[#0ABAB5] hover:text-[#0ABAB5] hover:bg-[#F0FDFC] transition-all mb-8"
          >
            + 상품 추가해서 비교하기
          </button>
        )}

        {/* ── 결과 테이블 ── */}
        {hasAnyResult && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h2 className="text-[15px] font-extrabold text-[#1E293B]">📊 단가 비교</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#FAF6F0]">
                    <th className="text-left px-5 py-3 text-[#94A3B8] font-semibold w-[80px]">기준</th>
                    {products.map((p, idx) => {
                      const col = CARD_COLORS[idx];
                      return (
                        <th key={idx} className="text-right px-4 py-3 font-bold" style={{ color: col.label }}>
                          {p.name || `상품 ${col.idx}`}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* 개당 가격 (수량 > 1인 경우) */}
                  {showPerItem && (
                    <tr className="border-t border-[#F1F5F9]">
                      <td className="px-5 py-3.5 text-[#64748B] font-semibold">1개당</td>
                      {results.map((r, idx) => (
                        <td key={idx} className="px-4 py-3.5 text-right font-bold text-[#1E293B]">
                          {r?.perItem != null ? (
                            <span>{r.perItem.toLocaleString()}<span className="text-[11px] font-medium text-[#94A3B8] ml-0.5">원</span></span>
                          ) : <span className="text-[#CBD5E1]">—</span>}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* 단위별 단가 행 */}
                  {steps.map((step, sIdx) => {
                    const minIdx = getMinIdxAt(results, sIdx);
                    return (
                      <tr key={sIdx} className="border-t border-[#F1F5F9]">
                        <td className="px-5 py-3.5 text-[#64748B] font-semibold">{step.label}당</td>
                        {results.map((r, pIdx) => {
                          const val = r?.steps?.[sIdx]?.price;
                          const isMin = minIdx === pIdx && products.length > 1;
                          return (
                            <td key={pIdx} className="px-4 py-3.5 text-right">
                              {val != null ? (
                                <span className={`font-bold ${isMin ? 'text-[#0ABAB5]' : 'text-[#1E293B]'}`}>
                                  {isMin && <span className="text-[10px] mr-1">🏆</span>}
                                  {val.toLocaleString()}
                                  <span className="text-[11px] font-medium text-[#94A3B8] ml-0.5">원</span>
                                </span>
                              ) : <span className="text-[#CBD5E1]">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 종합 판정 */}
            {products.length > 1 && (() => {
              // 100g/100ml 기준으로 최저가 상품 선택
              const midIdx = 1; // 100g or 100ml (index 1)
              const midMin = getMinIdxAt(results, midIdx);
              if (midMin < 0) return null;
              const winner = products[midMin];
              const col = CARD_COLORS[midMin];
              const midResult = results[midMin];
              const midStep = midResult?.steps?.[midIdx];
              return (
                <div className="px-5 py-4 border-t-2 border-[#E2E8F0]" style={{ backgroundColor: col.bg }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[24px]">🏆</span>
                    <div>
                      <p className="text-[13px] font-extrabold" style={{ color: col.label }}>
                        {winner.name || `상품 ${col.idx}`}이 가장 저렴해요!
                      </p>
                      <p className="text-[12px] text-[#64748B]">
                        {midStep?.label}당 <strong className="text-[#1E293B]">{midStep?.price?.toLocaleString()}원</strong>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <CoupangInlineHorizontalBanner fillWidth />

        {/* ── 안내 ── */}
        <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
          <p className="text-[12px] text-[#94A3B8] leading-relaxed">
            💡 <strong className="text-[#64748B]">이렇게 활용하세요</strong><br />
            핫딜에서 같은 상품 여러 옵션(용량·묶음)을 비교할 때 유용해요.<br />
            수량을 입력하면 묶음 상품도 자동으로 계산됩니다.
          </p>
        </div>

      </main>
    </div>
  );
}
