'use client'

import { useState, useCallback } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  ['핫딜모음', '/hotdeals'], ['쿠팡핫딜', '/coupang'],
  ['핫딜온도계', '/hotdeal-thermometer'], ['정보모음', '/blog'], ['유틸리티', '/utility'],
];

// ── 영양소 정의 ────────────────────────────────────────────────
const NUTRIENTS = [
  { id: 'protein',  label: '단백질',  unit: 'g',   icon: '💪', color: '#0ABAB5', desc: '근육·다이어트 식품 비교에 유용' },
  { id: 'calories', label: '칼로리',  unit: 'kcal', icon: '🔥', color: '#FF6B6B', desc: '에너지 효율 비교' },
  { id: 'carbs',    label: '탄수화물', unit: 'g',   icon: '🌾', color: '#F59E0B', desc: '저탄고지 식품 비교' },
  { id: 'fat',      label: '지방',    unit: 'g',   icon: '🧈', color: '#8B5CF6', desc: '지방 함량 비교' },
  { id: 'fiber',    label: '식이섬유', unit: 'g',   icon: '🥦', color: '#10B981', desc: '건강기능식품 비교' },
  { id: 'sugar',    label: '당류',    unit: 'g',   icon: '🍬', color: '#EC4899', desc: '당 섭취 관리' },
];

// ── 서빙 기준 정의 ─────────────────────────────────────────────
const BASES = [
  { id: 'per1g',    label: '1g당',    multiplier: 1 },
  { id: 'per100g',  label: '100g당',  multiplier: 100 },
  { id: 'per1kg',   label: '1kg당',   multiplier: 1000 },
  { id: 'perServ',  label: '1회분당', multiplier: null }, // special
];

const CARD_COLORS = [
  { border: '#0ABAB5', bg: '#E6FAF9', label: '#0ABAB5', idx: 'A' },
  { border: '#FF6B6B', bg: '#FFF0F0', label: '#FF6B6B', idx: 'B' },
  { border: '#F59E0B', bg: '#FFFBEB', label: '#D97706', idx: 'C' },
];

const emptyProduct = () => ({
  name: '', price: '', weight: '', servingSize: '', qty: '1',
  protein: '', calories: '', carbs: '', fat: '', fiber: '', sugar: '',
});

// ── 계산 엔진 ──────────────────────────────────────────────────
function calcProduct(p, activeNutrients) {
  const price = parseFloat(p.price);
  const weight = parseFloat(p.weight); // 총 중량 (g)
  const qty = parseFloat(p.qty) || 1;
  const servingSize = parseFloat(p.servingSize);

  if (!price || !weight) return null;

  const totalWeight = weight * qty;
  const totalPrice = price;

  const results = {};

  for (const nId of activeNutrients) {
    const val100g = parseFloat(p[nId]); // 100g당 영양소 (표준 기재 방식)
    if (!val100g) continue;

    const totalNutrient = (totalWeight / 100) * val100g;
    if (totalNutrient <= 0) continue;

    results[nId] = {
      per1g:    totalPrice / totalNutrient,
      per10g:   (totalPrice / totalNutrient) * 10,
      per100g:  (totalPrice / totalNutrient) * 100,
      // 1회분당
      perServ: servingSize
        ? totalPrice / (totalWeight / servingSize) / (servingSize / 100 * val100g) * (servingSize / 100 * val100g) / totalWeight * totalPrice / ((totalWeight / servingSize))
        : null,
    };

    // 더 직관적인 계산: 영양소 1단위당 가격
    // "단백질 1g을 이 식품에서 섭취하는 데 드는 비용"
    const pricePerNutrientG = totalPrice / totalNutrient;
    results[nId] = {
      perNutrientG:   Math.round(pricePerNutrientG * 10) / 10,   // 영양소 1g당 가격
      perNutrient10g: Math.round(pricePerNutrientG * 10 * 10) / 10,
      perFoodG:       Math.round((totalPrice / totalWeight) * 100) / 100, // 식품 1g당
      totalNutrient:  Math.round(totalNutrient * 10) / 10,
    };
  }

  return Object.keys(results).length > 0 ? {
    results,
    pricePerFoodG: totalPrice / totalWeight,
  } : null;
}

function getBestIdx(calcResults, nId, field) {
  const vals = calcResults.map(r => r?.results?.[nId]?.[field]).filter(v => v != null && v > 0);
  if (vals.length < 2) return -1;
  const min = Math.min(...vals);
  return calcResults.findIndex(r => r?.results?.[nId]?.[field] === min);
}

export default function NutritionPriceCalculatorPage() {
  const [products, setProducts] = useState([emptyProduct(), emptyProduct()]);
  const [activeNutrients, setActiveNutrients] = useState(['protein', 'calories']);

  const update = useCallback((idx, field, val) => {
    setProducts(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });
  }, []);

  const toggleNutrient = (nId) => {
    setActiveNutrients(prev =>
      prev.includes(nId) ? prev.filter(n => n !== nId) : [...prev, nId]
    );
  };

  const calcResults = products.map(p => calcProduct(p, activeNutrients));
  const hasResult = calcResults.some(Boolean);

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">
      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/"><img src="/logo-ssagesage.png" alt="싸게사게" className="h-12 w-auto object-contain" /></Link>
          <Link href="/utility" className="text-[13px] font-medium text-[#64748B] hover:text-[#0ABAB5] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors">← 유틸리티</Link>
        </div>
        <nav className="px-4 pb-1 flex items-center gap-5">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className={`py-3 text-[14px] font-medium transition-colors ${href === '/utility' ? 'relative font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full' : 'text-[#64748B] hover:text-[#1E293B]'}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="px-4 py-8">
        {/* 타이틀 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[32px]">🥩</span>
            <div>
              <h1 className="text-[24px] font-extrabold text-[#1E293B] leading-tight">영양성분 단가 계산기</h1>
              <p className="text-[13px] text-[#64748B]">단백질 1g 섭취에 드는 비용은?</p>
            </div>
          </div>
          <p className="text-[14px] text-[#64748B] leading-relaxed mt-3">
            닭가슴살·프로틴·그릭요거트 등 <strong className="text-[#1E293B]">영양소 1g당 가격</strong>을 비교해서<br />
            <strong className="text-[#0ABAB5]">가장 효율적인 식품</strong>을 찾아보세요.
          </p>
        </div>

        {/* 영양소 선택 */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-5">
          <p className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wide mb-3">비교할 영양소 선택</p>
          <div className="flex flex-wrap gap-2">
            {NUTRIENTS.map(n => (
              <button key={n.id} onClick={() => toggleNutrient(n.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all border ${
                  activeNutrients.includes(n.id)
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-[#FAF6F0] text-[#64748B] border-[#E2E8F0] hover:border-[#0ABAB5]'
                }`}
                style={activeNutrients.includes(n.id) ? { backgroundColor: n.color, borderColor: n.color } : {}}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        </div>

        {/* 상품 입력 카드 */}
        <div className="flex flex-col gap-4 mb-5">
          {products.map((p, idx) => {
            const col = CARD_COLORS[idx];
            return (
              <div key={idx} className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: col.border }}>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: col.bg }}>
                  <span className="text-[13px] font-extrabold" style={{ color: col.label }}>상품 {col.idx}</span>
                  {products.length > 2 && (
                    <button onClick={() => setProducts(p => p.filter((_,i)=>i!==idx))} className="text-[12px] text-[#94A3B8] hover:text-[#FF6B6B]">삭제</button>
                  )}
                </div>

                <div className="p-4 grid gap-3">
                  {/* 상품명 */}
                  <input type="text" placeholder="상품명 (예: 동원 닭가슴살 100g)" value={p.name}
                    onChange={e => update(idx, 'name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[14px] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30 transition-all" />

                  {/* 가격 / 총 중량 / 수량 */}
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="가격" suffix="원" placeholder="0" value={p.price} onChange={v => update(idx, 'price', v)} />
                    <NumField label="총 중량" suffix="g" placeholder="100" value={p.weight} onChange={v => update(idx, 'weight', v)} hint="전체" />
                    <NumField label="수량" suffix="개" placeholder="1" value={p.qty} onChange={v => update(idx, 'qty', v)} />
                  </div>

                  {/* 영양소 입력 (100g 기준) */}
                  <div className="pt-1">
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">영양성분 <span className="normal-case font-normal">(포장지 기준 — 보통 100g당 표기)</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      {NUTRIENTS.filter(n => activeNutrients.includes(n.id)).map(n => (
                        <NumField key={n.id} label={`${n.icon} ${n.label} (100g당)`} suffix={n.unit}
                          placeholder="0" value={p[n.id]} onChange={v => update(idx, n.id, v)}
                          accentColor={n.color} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 상품 추가 */}
        {products.length < 3 && (
          <button onClick={() => setProducts(p => [...p, emptyProduct()])}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#CBD5E1] text-[14px] font-semibold text-[#94A3B8] hover:border-[#0ABAB5] hover:text-[#0ABAB5] hover:bg-[#F0FDFC] transition-all mb-6">
            + 상품 추가해서 비교하기
          </button>
        )}

        {/* 결과 */}
        {hasResult && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h2 className="text-[15px] font-extrabold text-[#1E293B]">📊 영양 단가 비교</h2>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">🏆 표시 = 해당 영양소를 가장 저렴하게 섭취할 수 있는 상품</p>
            </div>

            {activeNutrients.map(nId => {
              const nutrient = NUTRIENTS.find(n => n.id === nId);
              const anyHas = calcResults.some(r => r?.results?.[nId]);
              if (!anyHas) return null;
              const bestIdx = getBestIdx(calcResults, nId, 'perNutrientG');
              return (
                <div key={nId} className="border-b border-[#F8FAFC] last:border-0">
                  <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: nutrient.color + '15' }}>
                    <span className="text-[16px]">{nutrient.icon}</span>
                    <span className="text-[14px] font-extrabold" style={{ color: nutrient.color }}>{nutrient.label} 단가</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-[#FAF6F0]">
                          <th className="text-left px-5 py-2.5 text-[#94A3B8] font-semibold">기준</th>
                          {products.map((p, i) => (
                            <th key={i} className="text-right px-4 py-2.5 font-bold" style={{ color: CARD_COLORS[i].label }}>
                              {p.name || `상품 ${CARD_COLORS[i].idx}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { field: 'perNutrientG',   label: `${nutrient.label} 1${nutrient.unit}당` },
                          { field: 'perNutrient10g',  label: `${nutrient.label} 10${nutrient.unit}당` },
                          { field: 'totalNutrient',   label: `총 ${nutrient.label} 함량`, suffix: nutrient.unit, noMin: true },
                        ].map(({ field, label, suffix, noMin }) => {
                          const minIdx = noMin ? -1 : getBestIdx(calcResults, nId, field);
                          return (
                            <tr key={field} className="border-t border-[#F1F5F9]">
                              <td className="px-5 py-3 text-[#64748B] font-semibold">{label}</td>
                              {calcResults.map((r, pIdx) => {
                                const val = r?.results?.[nId]?.[field];
                                const isMin = !noMin && minIdx === pIdx && products.length > 1 && val != null;
                                return (
                                  <td key={pIdx} className="px-4 py-3 text-right">
                                    {val != null ? (
                                      <span className={`font-bold ${isMin ? '' : 'text-[#1E293B]'}`} style={isMin ? { color: nutrient.color } : {}}>
                                        {isMin && <span className="text-[10px] mr-1">🏆</span>}
                                        {suffix ? val.toLocaleString() : Math.round(val).toLocaleString()}
                                        <span className="text-[11px] font-medium text-[#94A3B8] ml-0.5">{suffix || '원'}</span>
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
                </div>
              );
            })}

            {/* 종합 판정 */}
            {(() => {
              const mainNutrient = activeNutrients[0];
              const bestIdx = getBestIdx(calcResults, mainNutrient, 'perNutrientG');
              if (bestIdx < 0) return null;
              const n = NUTRIENTS.find(n => n.id === mainNutrient);
              const col = CARD_COLORS[bestIdx];
              const winner = products[bestIdx];
              const price = calcResults[bestIdx]?.results?.[mainNutrient]?.perNutrientG;
              return (
                <div className="px-5 py-4 border-t-2 border-[#E2E8F0]" style={{ backgroundColor: col.bg }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[24px]">🏆</span>
                    <div>
                      <p className="text-[13px] font-extrabold" style={{ color: col.label }}>
                        {winner.name || `상품 ${col.idx}`}이 {n?.label} 섭취 효율이 가장 좋아요!
                      </p>
                      <p className="text-[12px] text-[#64748B]">
                        {n?.label} 1{n?.unit}당 <strong className="text-[#1E293B]">{Math.round(price || 0).toLocaleString()}원</strong>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 안내 */}
        <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
          <p className="text-[12px] text-[#94A3B8] leading-relaxed">
            💡 <strong className="text-[#64748B]">영양성분 입력 방법</strong><br />
            제품 포장지 뒷면의 영양정보 표를 확인하세요. 보통 <strong className="text-[#1E293B]">100g당</strong> 또는 <strong className="text-[#1E293B]">1회 제공량</strong>으로 표기됩니다.<br />
            100g당 표기 기준으로 입력하면 가장 정확해요.
          </p>
        </div>
      </main>
    </div>
  );
}

function NumField({ label, suffix, placeholder, value, onChange, hint, accentColor }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-[#94A3B8] leading-tight">{label}</label>
        {hint && <span className="text-[10px] text-[#CBD5E1]">{hint}</span>}
      </div>
      <div className="relative">
        <input type="number" inputMode="decimal" placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-3 pr-7 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E2E8F0] text-[14px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal focus:outline-none focus:ring-2 focus:border-transparent transition-all"
          style={{ '--tw-ring-color': (accentColor || '#0ABAB5') + '40' }} />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#94A3B8]">{suffix}</span>
      </div>
    </div>
  );
}
