'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDeals: 0,
    todayDeals: 0,
    totalPriceHistory: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        router.push('/admin');
        return;
      }
      await fetchStats();
      if (mounted) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/admin');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function fetchStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [{ count: totalDeals }, { count: todayDeals }, { count: totalPriceHistory }] = await Promise.all([
        supabase.from('hotdeals').select('*', { count: 'exact', head: true }),
        supabase.from('hotdeals').select('*', { count: 'exact', head: true }).gte('crawled_at', today.toISOString()),
        supabase.from('price_history').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalDeals: totalDeals || 0,
        todayDeals: todayDeals || 0,
        totalPriceHistory: totalPriceHistory || 0,
      });
    } catch (error) {
      console.error('대시보드 통계 로딩 실패:', error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">권한 확인 중...</div>;
  }

  const cardBase = 'rounded-3xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="mx-auto max-w-5xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 shadow-sm">
          <h1 className="text-lg font-bold text-blue-600">싸게사게 Admin</h1>
          <button onClick={handleLogout} className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-100">
            로그아웃
          </button>
        </header>

        <main className="flex flex-col gap-6 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={`${cardBase} border-gray-100 text-center`}>
              <p className="mb-2 text-xs font-bold text-gray-400">전체 핫딜</p>
              <p className="text-3xl font-black text-gray-800">{stats.totalDeals.toLocaleString()}</p>
            </div>
            <div className={`${cardBase} border-blue-100 text-center`}>
              <p className="mb-2 text-xs font-bold text-gray-400">오늘 수집</p>
              <p className="text-3xl font-black text-blue-600">{stats.todayDeals.toLocaleString()}</p>
            </div>
            <div className={`${cardBase} border-orange-100 text-center`}>
              <p className="mb-2 text-xs font-bold text-gray-400">가격 이력</p>
              <p className="text-3xl font-black text-orange-500">{stats.totalPriceHistory.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <a href="/admin/keywords" className={`${cardBase} border-orange-100 bg-orange-50/20`}>
              <div className="mb-3 text-3xl">🔑</div>
              <p className="text-base font-bold text-gray-800">키워드 & 그룹 관리</p>
              <p className="mt-1 text-xs text-gray-400">품목 분류 키워드/그룹 관리</p>
            </a>

            <a href="/admin/thermometer" className={`${cardBase} border-gray-100`}>
              <div className="mb-3 text-3xl">🌡️</div>
              <p className="text-base font-bold text-gray-800">온도계 이미지 관리</p>
              <p className="mt-1 text-xs text-gray-400">그룹별 온도계 이미지 업로드</p>
            </a>

            <a href="/admin/blog" className={`${cardBase} border-gray-100`}>
              <div className="mb-3 text-3xl">📝</div>
              <p className="text-base font-bold text-gray-800">블로그 관리</p>
              <p className="mt-1 text-xs text-gray-400">글 작성/수정/발행 관리</p>
            </a>

            <a href="/admin/hotdeals" className={`${cardBase} border-gray-100`}>
              <div className="mb-3 text-3xl">🛒</div>
              <p className="text-base font-bold text-gray-800">핫딜 데이터 관리</p>
              <p className="mt-1 text-xs text-gray-400">수집 데이터 조회 및 정리</p>
            </a>

            <a href="/admin/keyword-suggestions" className={`${cardBase} border-gray-100`}>
              <div className="mb-3 text-3xl">💡</div>
              <p className="text-base font-bold text-gray-800">키워드 제안 관리</p>
              <p className="mt-1 text-xs text-gray-400">추천 키워드 검토/반영</p>
            </a>

            <a href="/admin/analytics" className={`${cardBase} border-emerald-100 bg-emerald-50/30`}>
              <div className="mb-3 text-3xl">📊</div>
              <p className="text-base font-bold text-gray-800">유입분석</p>
              <p className="mt-1 text-xs text-gray-400">방문/클릭/CTR/단축링크 분석</p>
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

