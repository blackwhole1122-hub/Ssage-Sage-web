'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatSlug, setNewSubcatSlug] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [subcatSaving, setSubcatSaving] = useState(false);

  // 1. 페이지 로드 시 실행되는 로직
  useEffect(() => {
    const initAdmin = async () => {
      // 세션 체크
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        router.push('/admin'); 
        return; 
      } 
      // 데이터 불러오기
      await fetchData(); 
    };

    initAdmin();
  }, [router]);

  // 2. 데이터 가져오기 공통 함수
  async function fetchData() {
    setLoading(true);
    try {
      const [postsRes, catsRes, subcatsRes] = await Promise.all([
        supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('blog_categories').select('*').order('id', { ascending: true }),
        supabase.from('blog_subcategories').select('*').order('id', { ascending: true }),
      ]);
      
      if (postsRes.data) setPosts(postsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (!subcatsRes.error && subcatsRes.data) setSubcategories(subcatsRes.data);
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  // 3. 카테고리 추가 로직
  async function addCategory() {
    if (!newCatName.trim()) return alert('카테고리 이름을 입력하세요');
    const slug = newCatSlug.trim() || newCatName.trim().toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').replace(/\s+/g, '-');
    
    setCatSaving(true);
    const { data, error } = await supabase.from('blog_categories')
      .insert({ name: newCatName.trim(), slug })
      .select().single();
      
    setCatSaving(false);

    if (error) { 
      alert(error.code === '23505' ? '이미 같은 슬러그의 카테고리가 있어요!' : `추가 실패: ${error.message}`); 
    } else if (data) { 
      setCategories(prev => [...prev, data]); 
      setNewCatName(''); 
      setNewCatSlug(''); 
    }
  }

  async function addSubcategory() {
    if (!selectedParentCategoryId) return alert('먼저 큰 카테고리를 선택해 주세요.');
    if (!newSubcatName.trim()) return alert('세부카테고리 이름을 입력하세요.');

    const slug =
      newSubcatSlug.trim() ||
      newSubcatName.trim().toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').replace(/\s+/g, '-');

    setSubcatSaving(true);
    const { data, error } = await supabase
      .from('blog_subcategories')
      .insert({
        category_id: Number(selectedParentCategoryId),
        name: newSubcatName.trim(),
        slug,
      })
      .select()
      .single();
    setSubcatSaving(false);

    if (error) {
      alert(error.code === '23505' ? '이미 같은 세부카테고리 슬러그가 있어요!' : `추가 실패: ${error.message}`);
      return;
    }

    if (data) {
      setSubcategories((prev) => [...prev, data]);
      setNewSubcatName('');
      setNewSubcatSlug('');
    }
  }

  // 4. 게시 상태 토글
  async function togglePublish(post) {
    const { error } = await supabase.from('blog_posts')
      .update({ published: !post.published, updated_at: new Date().toISOString() })
      .eq('id', post.id);
    if (!error) setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, published: !p.published } : p)));
  }

  // 5. 글 삭제
  async function deletePost(post) {
    if (!confirm(`"${post.title}" 글을 삭제할까요?`)) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', post.id);
    if (!error) setPosts(prev => prev.filter(p => p.id !== post.id));
  }

  async function deleteSubcategory(subcat) {
    if (!confirm(`"${subcat.name}" 세부카테고리를 삭제할까요?`)) return;
    const { error } = await supabase.from('blog_subcategories').delete().eq('id', subcat.id);
    if (!error) {
      setSubcategories((prev) => prev.filter((item) => item.id !== subcat.id));
    }
  }

  const getStatusInfo = (post) => {
    if (!post.published) return { label: '비공개', color: 'bg-gray-100 text-gray-500' };
    if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
      return { label: '⏰ 예약됨', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: '게시됨', color: 'bg-green-100 text-green-700' };
  };

  const getSubcategoryName = (post) => {
    const subcat = subcategories.find((s) => s.id === post.subcategory_id);
    return subcat?.name || null;
  };

  if (loading) return <div className="p-20 text-center text-gray-400 font-bold">블로그 정보 불러오는 중... ⏳</div>;

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen pb-10">
      <header className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 hover:text-gray-800 text-xl px-1">←</button>
          <h1 className="text-lg font-bold text-gray-800">📝 블로그 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCategoryManager(!showCategoryManager)}
            className={`text-xs px-4 py-2 rounded-full font-bold transition-colors ${showCategoryManager ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            🏷️ 카테고리 설정
          </button>
          <button onClick={() => router.push('/admin/blog/editor')}
            className="text-xs bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors font-bold shadow-sm">
            + 새 글 작성
          </button>
        </div>
      </header>

      <main className="p-4 flex flex-col gap-6">
        {showCategoryManager && (
          <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">🏷️ 카테고리 추가/관리</h2>
            <div className="flex items-center gap-2 mb-4">
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="이름 (예: 리뷰)"
                className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <input type="text" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="슬러그 (review)"
                className="w-32 px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <button onClick={addCategory} disabled={catSaving}
                className="text-xs bg-orange-500 text-white px-5 py-2.5 rounded-2xl hover:bg-orange-600 font-bold flex-shrink-0">
                {catSaving ? '...' : '추가'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full">
                  <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                  <button onClick={async () => {
                    if(confirm('삭제할까요?')) {
                      await supabase.from('blog_categories').delete().eq('id', cat.id);
                      fetchData();
                    }
                  }} className="text-red-400 text-xs hover:text-red-600">✕</button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">🧩 세부카테고리 추가/관리</h3>
              <div className="grid md:grid-cols-[180px_1fr_180px_auto] gap-2 mb-4">
                <select
                  value={selectedParentCategoryId}
                  onChange={(e) => setSelectedParentCategoryId(e.target.value)}
                  className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">큰 카테고리 선택</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  placeholder="세부카테고리 이름"
                  className="px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="text"
                  value={newSubcatSlug}
                  onChange={(e) => setNewSubcatSlug(e.target.value)}
                  placeholder="세부 슬러그"
                  className="px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={addSubcategory}
                  disabled={subcatSaving}
                  className="text-xs bg-orange-500 text-white px-5 py-2.5 rounded-2xl hover:bg-orange-600 font-bold flex-shrink-0"
                >
                  {subcatSaving ? '...' : '추가'}
                </button>
              </div>

              <div className="space-y-3">
                {categories.map((cat) => {
                  const items = subcategories.filter((s) => s.category_id === cat.id);
                  return (
                    <div key={`subcat-group-${cat.id}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <div className="text-xs font-bold text-gray-700 mb-2">{cat.name}</div>
                      {items.length === 0 ? (
                        <div className="text-xs text-gray-400">등록된 세부카테고리가 없습니다.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {items.map((subcat) => (
                            <div key={subcat.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full">
                              <span className="text-xs font-semibold text-gray-700">{subcat.name}</span>
                              <button
                                onClick={() => deleteSubcategory(subcat)}
                                className="text-red-400 text-xs hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {posts.map(post => {
            const status = getStatusInfo(post);
            return (
              <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 hover:border-blue-200 transition-all flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl bg-gray-50 w-14 h-14 flex items-center justify-center rounded-2xl flex-shrink-0">{post.emoji || '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 mb-1 truncate">{post.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 rounded-lg">
                        {categories.find(c => c.id === post.category_id)?.name || '미분류'}
                      </span>
                      {getSubcategoryName(post) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg">
                          {getSubcategoryName(post)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono">/{post.slug}</span>
                    </div>
                  </div>
                  <button onClick={() => togglePublish(post)} className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all shadow-sm ${status.color}`}>
                    {status.label}
                  </button>
                </div>
                
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <button onClick={() => router.push(`/admin/blog/editor?id=${post.id}`)} 
                    className="flex-1 py-2.5 bg-gray-50 text-gray-600 rounded-2xl text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-all">
                    수정하기
                  </button>
                  <button onClick={() => deletePost(post)}
                    className="px-5 py-2.5 bg-red-50 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-100 transition-all">
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
          {posts.length === 0 && <p className="text-center text-gray-300 py-10">작성된 글이 없습니다. 첫 글을 작성해 보세요! ✍️</p>}
        </div>
      </main>
    </div>
  );
}
