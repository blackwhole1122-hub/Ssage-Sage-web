'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminKeywords() {
  const router = useRouter();
  const [tab, setTab] = useState('groups'); // 'groups' | 'suggestions'
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [form, setForm] = useState({
    category: '식품',
    sub_category: '',
    group_name: '',
    slug: '',
    keywords: ''
  });

  // 제안 키워드 → keyword_groups 추가 모달
  const [addModal, setAddModal] = useState(null); // suggestion 객체
  const [addForm, setAddForm] = useState({
    category: '식품',
    sub_category: '',
    group_name: '',
    slug: '',
    keywords: ''
  });

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => { if (tab === 'suggestions') fetchSuggestions(); }, [tab]);

  // ── 품목 그룹 ──────────────────────────────────────────────────
  async function fetchGroups() {
    setLoading(true);
    const { data } = await supabase
      .from('keyword_groups')
      .select('*')
      .order('category', { ascending: true })
      .order('sub_category', { ascending: true });
    if (data) setGroups(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.sub_category || !form.group_name || !form.slug || !form.keywords)
      return alert('모든 빈칸을 채워주세요!');
    const kwArray = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const { error } = await supabase.from('keyword_groups').insert({
      category: form.category,
      sub_category: form.sub_category,
      group_name: form.group_name,
      slug: form.slug,
      keywords: kwArray
    });
    if (error) { alert('등록 실패: ' + error.message); }
    else {
      alert('품목 그룹 등록 완료! 🚀');
      setForm({ ...form, group_name: '', slug: '', keywords: '' });
      fetchGroups();
    }
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('keyword_groups').delete().eq('id', id);
    if (!error) fetchGroups();
  }

  // ── 제안 키워드 ────────────────────────────────────────────────
  async function fetchSuggestions() {
    setSuggestLoading(true);
    const { data } = await supabase
      .from('keyword_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('appearance_count', { ascending: false });
    if (data) setSuggestions(data);
    setSuggestLoading(false);
  }

  async function handleReject(id) {
    await supabase
      .from('keyword_suggestions')
      .update({ status: 'rejected' })
      .eq('id', id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }

  // 제안 키워드 → keyword_groups 등록 모달 열기
  function openAddModal(suggestion) {
    setAddModal(suggestion);
    setAddForm({
      category: '식품',
      sub_category: '',
      group_name: suggestion.keyword,
      slug: '',
      keywords: suggestion.keyword,
    });
  }

  async function handleApprove() {
    if (!addForm.sub_category || !addForm.group_name || !addForm.slug || !addForm.keywords)
      return alert('모든 빈칸을 채워주세요!');

    const kwArray = addForm.keywords.split(',').map(k => k.trim()).filter(Boolean);

    // 1. keyword_groups에 추가
    const { error } = await supabase.from('keyword_groups').insert({
      category: addForm.category,
      sub_category: addForm.sub_category,
      group_name: addForm.group_name,
      slug: addForm.slug,
      keywords: kwArray
    });
    if (error) return alert('등록 실패: ' + error.message);

    // 2. suggestion 상태 → approved
    await supabase
      .from('keyword_suggestions')
      .update({ status: 'approved' })
      .eq('id', addModal.id);

    alert(`"${addForm.group_name}" 등록 완료! 🚀`);
    setAddModal(null);
    setSuggestions(prev => prev.filter(s => s.id !== addModal.id));
    fetchGroups();
  }

  const pendingCount = suggestions.length;

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen pb-20 font-sans">
      <header className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 text-xl px-2">←</button>
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">🔑 키워드 및 품목 그룹 관리</h1>
      </header>

      {/* ── 탭 ── */}
      <div className="flex gap-0 border-b bg-white px-4">
        <button
          onClick={() => setTab('groups')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-colors ${
            tab === 'groups' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400'
          }`}
        >
          등록된 품목 ({groups.length})
        </button>
        <button
          onClick={() => setTab('suggestions')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'suggestions' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400'
          }`}
        >
          제안 키워드
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <main className="p-4 flex flex-col gap-6">

        {/* ══ 탭 1: 품목 그룹 ══════════════════════════════════════ */}
        {tab === 'groups' && (
          <>
            {/* 입력 폼 */}
            <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
              <h2 className="text-sm font-black text-gray-700 mb-5 flex items-center gap-2">
                <span className="bg-orange-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]">＋</span>
                새로운 품목 그룹 추가
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">대분류</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                    <option>식품</option><option>생활잡화</option><option>가전/디지털</option><option>상품권</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">소분류</label>
                  <input type="text" value={form.sub_category} onChange={e => setForm({...form, sub_category: e.target.value})}
                    placeholder="예: 생수/음료" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">품목명 (표시용)</label>
                  <input type="text" value={form.group_name} onChange={e => setForm({...form, group_name: e.target.value})}
                    placeholder="예: 삼다수 2L" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">슬러그</label>
                  <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})}
                    placeholder="예: samdasoo-2l" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">매칭 키워드 (쉼표 구분, 제외는 !키워드)</label>
                  <textarea value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})}
                    placeholder="햇반, 햇반 210, !컵반" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-400 h-20 resize-none" />
                </div>
              </div>
              <button onClick={handleAdd} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl mt-6 hover:bg-orange-600 transition-all shadow-lg active:scale-[0.98]">
                품목 그룹 저장하기
              </button>
            </div>

            {/* 목록 */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-gray-400 px-1 uppercase tracking-widest">등록된 품목 ({groups.length})</h2>
              {loading ? (
                <div className="text-center py-20 text-gray-300 animate-pulse">불러오는 중...</div>
              ) : groups.map(g => (
                <div key={g.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">{g.category}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded">{g.sub_category}</span>
                      <span className="text-[9px] font-mono text-gray-300 ml-1">/{g.slug}</span>
                    </div>
                    <h3 className="text-sm font-black text-gray-800 mb-1">{g.group_name}</h3>
                    <p className="text-[11px] text-gray-400 truncate pr-4">
                      <span className="text-gray-300">🔑</span> {g.keywords.join(', ')}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="text-xs font-bold text-gray-300 hover:text-red-500 transition-colors px-2">삭제</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ 탭 2: 제안 키워드 ═══════════════════════════════════ */}
        {tab === 'suggestions' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-600">
              크롤링 데이터에서 <strong>6개월 내 서로 다른 날짜에 4회 이상</strong> 출현한 키워드입니다.
              품목 그룹으로 등록하거나 거절할 수 있습니다.
            </div>

            {suggestLoading ? (
              <div className="text-center py-20 text-gray-300 animate-pulse">분석 중...</div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-20 text-gray-300">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-sm">현재 제안된 키워드가 없습니다.</p>
                <p className="text-xs mt-1 text-gray-400">매주 월요일 새벽 3시에 자동 분석됩니다.</p>
              </div>
            ) : (
              suggestions.map(s => (
                <div key={s.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 키워드 + 출현 횟수 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base font-black text-gray-800">{s.keyword}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-blue-500 text-white rounded-full">
                          {s.appearance_count}일 출현
                        </span>
                      </div>

                      {/* 기간 + 사이트 */}
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className="text-[10px] text-gray-400">
                          📅 {s.first_seen} ~ {s.last_seen}
                        </span>
                        {(s.sources || []).map(src => (
                          <span key={src} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                            {src}
                          </span>
                        ))}
                      </div>

                      {/* 예시 제목 */}
                      {s.sample_titles?.length > 0 && (
                        <div className="space-y-1">
                          {s.sample_titles.slice(0, 2).map((t, i) => (
                            <p key={i} className="text-[11px] text-gray-400 truncate">
                              💬 {t}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => openAddModal(s)}
                        className="text-xs font-black px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors whitespace-nowrap"
                      >
                        + 등록
                      </button>
                      <button
                        onClick={() => handleReject(s.id)}
                        className="text-xs font-bold px-3 py-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-400 transition-colors whitespace-nowrap"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ══ 등록 모달 ═══════════════════════════════════════════════ */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-base font-black text-gray-800 mb-1">품목 그룹 등록</h2>
            <p className="text-xs text-gray-400 mb-5">
              제안 키워드 <strong className="text-blue-500">"{addModal.keyword}"</strong>을 품목 그룹으로 등록합니다.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">대분류</label>
                <select value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400">
                  <option>식품</option><option>생활잡화</option><option>가전/디지털</option><option>상품권</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">소분류</label>
                <input type="text" value={addForm.sub_category} onChange={e => setAddForm({...addForm, sub_category: e.target.value})}
                  placeholder="예: 생수/음료" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">품목명</label>
                <input type="text" value={addForm.group_name} onChange={e => setAddForm({...addForm, group_name: e.target.value})}
                  placeholder="예: 삼다수 2L" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">슬러그</label>
                <input type="text" value={addForm.slug} onChange={e => setAddForm({...addForm, slug: e.target.value})}
                  placeholder="예: samdasoo-2l" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">매칭 키워드 (쉼표 구분, 제외는 !키워드)</label>
                <textarea value={addForm.keywords} onChange={e => setAddForm({...addForm, keywords: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 h-16 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddModal(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm">
                취소
              </button>
              <button onClick={handleApprove}
                className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-black text-sm hover:bg-blue-600 transition-colors">
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
