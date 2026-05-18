'use client'

import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { detectPageType, getOrCreateSessionId, resolveAttribution, sendAnalyticsEvent } from '@/lib/clientAnalytics';

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    async function searchAllDeals() {
      setLoading(true);
      
      try {
        // 💡 1. 두 테이블 동시에 검색 (Promise.all 사용)
        const [hotdealsRes, coupangRes] = await Promise.all([
          supabase
            .from('hotdeals')
            .select('*')
            .neq('source', 'zod')
            .ilike('title', `%${query}%`)
            .order('crawled_at', { ascending: false })
            .limit(30),
          supabase
            .from('coupang_hotdeals')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(30)
        ]);

        // 💡 2. 데이터 형식 통일하기 (매핑)
        const communityDeals = (hotdealsRes.data || []).map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          shop: item.shop || item.source,
          link: `/deal/${item.id}`,
          date: item.crawled_at,
          type: 'COMMUNITY'
        }));

        const coupangDeals = (coupangRes.data || []).map(item => ({
          id: item.product_id,
          title: item.name,
          price: `${item.discount_price.toLocaleString()}원`,
          image: item.image_url,
          shop: '쿠팡',
          link: `/coupang/${item.product_id}`,
          date: item.created_at,
          type: 'COUPANG'
        }));

        // 💡 3. 합치고 최신순 정렬
        const combinedResults = [...communityDeals, ...coupangDeals].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        setResults(combinedResults);
      } catch (error) {
        console.error('검색 오류:', error);
      } finally {
        setLoading(false);
      }
    }

    searchAllDeals();
  }, [query]);

  useEffect(() => {
    if (!query || loading) return;
    const attr = resolveAttribution('/search', typeof window !== 'undefined' ? window.location.search : '');
    sendAnalyticsEvent({
      eventName: 'search_result',
      sessionId: getOrCreateSessionId(),
      pagePath: '/search',
      pageType: detectPageType('/search'),
      source: attr.source,
      medium: attr.medium,
      campaign: attr.campaign,
      referrer: attr.referrer,
      shortSlug: attr.shortSlug,
      searchQuery: query,
      metadata: {
        resultsCount: results.length,
        noResults: results.length === 0,
      },
    });
  }, [query, loading, results.length]);

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      {/* 상단 네비 */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="text-[#64748B] hover:text-[#0ABAB5]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <Link href="/">
            <img src="/logo-ssagesage.png" alt="싸게사게" className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-[20px] font-bold mb-4">
          <span className="text-[#0ABAB5]">'{query}'</span> 검색 결과 {!loading && `(${results.length}건)`}
        </h1>

        {loading ? (
          <div className="text-center py-20 text-[#94A3B8]">검색 중... 🦀</div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#94A3B8] mb-4">검색 결과가 없네요. 다른 검색어는 어때요?</p>
            <Link href="/" className="text-[#0ABAB5] text-[14px] underline">홈으로 돌아가기</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((deal, idx) => (
              <Link 
                key={`${deal.type}-${deal.id}-${idx}`} 
                href={deal.link}
                onClick={() => {
                  const attr = resolveAttribution('/search', typeof window !== 'undefined' ? window.location.search : '');
                  sendAnalyticsEvent({
                    eventName: 'search_click',
                    sessionId: getOrCreateSessionId(),
                    pagePath: '/search',
                    pageType: detectPageType('/search'),
                    targetUrl: deal.link,
                    source: attr.source,
                    medium: attr.medium,
                    campaign: attr.campaign,
                    referrer: attr.referrer,
                    shortSlug: attr.shortSlug,
                    searchQuery: query,
                    metadata: {
                      resultType: deal.type,
                    },
                  });
                }}
                className="bg-white rounded-2xl border overflow-hidden hover:border-[#0ABAB5] transition-all flex"
              >
                <div className="relative w-32 h-32 flex-shrink-0">
                  <img 
                    src={deal.image || '/default-image.png'} 
                    alt={deal.title}
                    referrerPolicy="no-referrer" // 💡 뽐뿌 이미지 차단 우회
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      // 이미지 로딩 실패 시 404 에러를 방지하기 위해 대체 이미지로 교체
                      e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                    }}
                  />
                  <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${deal.type === 'COUPANG' ? 'bg-[#FF6B6B]' : 'bg-[#0ABAB5]'}`}>
                    {deal.type === 'COUPANG' ? '쿠팡' : '커뮤니티'}
                  </span>
                </div>
                <div className="p-4 flex-1 min-w-0">
                  <p className="text-[10px] text-[#94A3B8] mb-1">{deal.shop}</p>
                  <p className="text-[14px] font-medium line-clamp-2 mb-2 text-[#1E293B]">{deal.title}</p>
                  <p className="text-[16px] font-bold text-[#FF6B6B]">{deal.price}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[#94A3B8]">로딩 중...</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
