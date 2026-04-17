'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminKeywordSuggestions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processing, setProcessing] = useState(null); // 현재 처리 중인 키워드 id

  // 승인 시 필요한 추가 정보 입력 모달
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({
    category: '식품',
    sub_category: '',
    group_name: '',
    slug: '',
    extra_keywords: '',
  });

  useEffect(() => {
    fetchSuggestions();
  }, [statusFilter]);

  async function fetchSuggestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('keyword_suggestions')
      .select('*')
      .eq('status', statusFilter)
      .order('appearance_count', { ascending: false });

    if (data) setSuggestions(data);
    setLoading(false);
  }

  // ─── 거절 처리 ────────────────────────────────────────────
  async function handleReject(id) {
    if (!confirm('이 키워드를 거절하시겠습니까?\n거절하면 다시 제안되지 않습니다.')) return;
    setProcessing(id);
    const { error } = await supabase
      .from('keyword_suggestions')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      alert('거절 처리 실패: ' + error.message);
    }
    setProcessing(null);
    fetchSuggestions();
  }

  // ─── 승인 모달 열기 ───────────────────────────────────────
  function openApproveModal(suggestion) {
    // 키워드에서 자동 추론할 수 있는 것들 미리 채움
    const kw = suggestion.keyword;
    const autoSlug = kw
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9가-힣\-]/g, '')
      .toLowerCase();

    setApproveForm({
      category: '식품',
      sub_category: '',
      group_name: kw,
      slug: autoSlug,
      extra_keywords: '',
    });
    setApproveModal(suggestion);
  }

  // ─── 승인 + keyword_groups 추가 + price_benchmarks 초기화 ──
  async function handleApprove() {
    const s = approveModal;
    if (!approveForm.sub_category || !approveForm.group_name || !approveForm.slug) {
      return alert('소분류, 품목명, 슬러그는 필수입니다!');
    }

    setProcessing(s.id);

    // 1. 키워드 배열 구성 (기본 키워드 + 추가 키워드)
    const baseKw = s.keyword;
    const extraKws = approveForm.extra_keywords
      ? approveForm.extra_keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const allKeywords = [baseKw, ...extraKws];

    // 2. keyword_groups 테이블에 추가
    const { error: groupError } = await supabase.from('keyword_groups').insert({
      category: approveForm.category,
      sub_category: approveForm.sub_category,
      group_name: approveForm.group_name,
      slug: approveForm.slug,
      keywords: allKeywords,
    });

    if (groupError) {
      alert('키워드 그룹 추가 실패: ' + groupError.message);
      setProcessing(null);
      return;
    }

    // 3. price_benchmarks 초기 레코드 생성 (ref_low=0, ref_avg=0 → 데이터 쌓이면 갱신)
    await supabase.from('price_benchmarks').upsert({
      slug: approveForm.slug,
      ref_low: 0,
      ref_avg: 0,
    }, { onConflict: 'slug', ignoreDuplicates: true });

    // 4. keyword_suggestions 상태를 approved로 변경
    await supabase
      .from('keyword_suggestions')
      .update({ status: 'approved' })
      .eq('id', s.id);

    alert(`✅ "${approveForm.group_name}" 그룹이 추가되었습니다!\n\n⚠️ 서버 crawlers.py의 KEYWORD_GROUPS_PY에도\n아래 항목을 수동 추가해주세요:\n\n{"group": "${approveForm.group_name}", "slug": "${approveForm.slug}", "keywords": ${JSON.stringify(allKeywords)}}\n\n그리고 lib/keywords.js에도 동일하게 추가하세요.`);

    setProcessing(null);
    setApproveModal(null);
    fetchSuggestions();
  }

  // ─── 일괄 거절 ────────────────────────────────────────────
  async function handleBulkReject() {
    const pendingIds = suggestions.map(s => s.id);
    if (!pendingIds.length) return;
    if (!confirm(`현재 보이는 ${pendingIds.length}개 키워드를 모두 거절하시겠습니까?`)) return;

    for (const id of pendingIds) {
      await supabase
        .from('keyword_suggestions')
        .update({ status: 'rejected' })
        .eq('id', id);
    }
    fetchSuggestions();
  }

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen pb-20 font-sans">
      {/* 헤더 */}
      <header className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 text-xl px-2">←</button>
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">🔍 키워드 제안 관리</h1>
      </header>

      <main className="p-4 flex flex-col gap-4">

        {/* 설명 카드 */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 leading-relaxed">
          <p className="font-bold mb-1">📊 자동 발견된 키워드 후보</p>
          <p>크롤링 로그에서 <strong>6개월간 서로 다른 날짜에 4회 이상</strong> 출현한 키워드가 자동으로 이곳에 올라옵니다.</p>
          <p className="mt-1">승인하면 <strong>keyword_groups</strong>에 자동 추가되어 price history 수집이 시작됩니다.</p>
        </div>

        {/* 상태 필터 탭 */}
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                statusFilter === s
                  ? s === 'pending' ? 'bg-orange-500 text-white'
                    : s === 'approved' ? 'bg-green-500 text-white'
                    : 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s === 'pending' ? '⏳ 대기중' : s === 'approved' ? '✅ 승인됨' : '❌ 거절됨'}
            </button>
          ))}

          {/* 일괄 거절 (pending 탭에서만) */}
          {statusFilter === 'pending' && suggestions.length > 0 && (
            <button
              onClick={handleBulkReject}
              className="ml-auto px-3 py-2 rounded-full text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              전체 거절
            </button>
          )}
        </div>

        {/* 목록 */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 px-1 uppercase tracking-widest">
            {statusFilter === 'pending' ? '대기중' : statusFilter === 'approved' ? '승인됨' : '거절됨'} ({suggestions.length})
          </h2>

          {loading ? (
            <div className="text-center py-20 text-gray-300 animate-pulse">데이터를 불러오고 있습니다...</div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-20 text-gray-300">
              {statusFilter === 'pending' ? '새로운 키워드 제안이 없습니다 🎉' : '항목이 없습니다'}
            </div>
          ) : (
            suggestions.map(s => (
              <div
                key={s.id}
                className={`bg-white p-5 rounded-3xl border shadow-sm transition-all ${
                  processing === s.id ? 'opacity-50 pointer-events-none' : ''
                } ${statusFilter === 'pending' ? 'border-orange-100 hover:border-orange-300' : 'border-gray-100'}`}
              >
                {/* 상단: 키워드 + 출현 횟수 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-gray-800 mb-1">{s.keyword}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">
                        {s.appearance_count}일 출현
                      </span>
                      {s.first_seen && (
                        <span className="text-[10px] text-gray-400">
                          {s.first_seen} ~ {s.last_seen}
                        </span>
                      )}
                      {s.sources && s.sources.length > 0 && (
                        <span className="text-[10px] text-gray-300">
                          출처: {s.sources.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 출현 횟수 배지 */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black ${
                    s.appearance_count >= 10 ? 'bg-red-50 text-red-600' :
                    s.appearance_count >= 7 ? 'bg-orange-50 text-orange-600' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>
                    {s.appearance_count}
                  </div>
                </div>

                {/* 샘플 제목 */}
                {s.sample_titles && s.sample_titles.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-3 mb-3">
                    <p className="text-[10px] font-bold text-gray-400 mb-1.5">📋 샘플 제목</p>
                    {s.sample_titles.slice(0, 3).map((title, i) => (
                      <p key={i} className="text-[11px] text-gray-500 truncate leading-relaxed">
                        • {title}
                      </p>
                    ))}
                  </div>
                )}

                {/* 액션 버튼 (pending에서만) */}
                {statusFilter === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => openApproveModal(s)}
                      className="flex-1 bg-green-500 text-white font-bold py-3 rounded-2xl text-sm hover:bg-green-600 transition-all active:scale-[0.98]"
                    >
                      ✅ 승인 (그룹 추가)
                    </button>
                    <button
                      onClick={() => handleReject(s.id)}
                      className="px-6 bg-gray-100 text-gray-400 font-bold py-3 rounded-2xl text-sm hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* ─── 승인 모달 ─────────────────────────────────────── */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-gray-800">키워드 그룹 추가</h2>
                <button onClick={() => setApproveModal(null)} className="text-gray-300 text-2xl hover:text-gray-500">×</button>
              </div>

              {/* 발견된 키워드 표시 */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-5">
                <p className="text-[10px] font-bold text-green-500 mb-1">발견된 키워드</p>
                <p className="text-base font-black text-green-700">{approveModal.keyword}</p>
                <p className="text-[10px] text-green-500 mt-1">
                  {approveModal.appearance_count}일 출현 | {approveModal.first_seen} ~ {approveModal.last_seen}
                </p>
              </div>

              {/* 입력 폼 */}
              <div className="space-y-4">
                {/* 대분류 */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 ml-1 block mb-1.5">대분류</label>
                  <select
                    value={approveForm.category}
                    onChange={e => setApproveForm({...approveForm, category: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                  >
                    <option>식품</option>
                    <option>생활잡화</option>
                    <option>가전/디지털</option>
                    <option>상품권</option>
                  </select>
                </div>

                {/* 소분류 */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 ml-1 block mb-1.5">소분류 *</label>
                  <input
                    type="text"
                    value={approveForm.sub_category}
                    onChange={e => setApproveForm({...approveForm, sub_category: e.target.value})}
                    placeholder="예: 생수/음료, 가공식품, 유제품"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                {/* 품목명 */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 ml-1 block mb-1.5">품목명 (표시용) *</label>
                  <input
                    type="text"
                    value={approveForm.group_name}
                    onChange={e => setApproveForm({...approveForm, group_name: e.target.value})}
                    placeholder="예: 삼다수 2L"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                {/* 슬러그 */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 ml-1 block mb-1.5">슬러그 (영문, price_history 연결용) *</label>
                  <input
                    type="text"
                    value={approveForm.slug}
                    onChange={e => setApproveForm({...approveForm, slug: e.target.value})}
                    placeholder="예: samdasoo-2l"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-400 font-mono"
                  />
                </div>

                {/* 추가 매칭 키워드 */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 ml-1 block mb-1.5">
                    추가 매칭 키워드 (쉼표 구분, 제외는 !키워드)
                  </label>
                  <textarea
                    value={approveForm.extra_keywords}
                    onChange={e => setApproveForm({...approveForm, extra_keywords: e.target.value})}
                    placeholder={`"${approveModal.keyword}"은 자동 포함됩니다. 예: 1L, !스파게티니`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-400 h-20 resize-none"
                  />
                  <p className="text-[10px] text-gray-300 mt-1 ml-1">
                    기본 키워드 "{approveModal.keyword}"은 자동 포함
                  </p>
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setApproveModal(null)}
                  className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl text-sm hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing === approveModal?.id}
                  className="flex-[2] bg-green-500 text-white font-black py-4 rounded-2xl text-sm hover:bg-green-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {processing === approveModal?.id ? '처리중...' : '✅ 그룹 추가 & 승인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
