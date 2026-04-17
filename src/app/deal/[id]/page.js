'use client'

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'dompurify';

export default function DealDetailPage({ params: promiseParams }) {
  // ✨ Next.js 16: params를 unwrap
  const params = use(promiseParams);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✨ [수정] sessionStorage 기반 referrer 제거 → router.back() 으로 교체
  //    이전 방문에서 남은 필터 URL이 뒤로가기에 잘못 적용되는 문제 해결
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/hotdeals');
    }
  };

  useEffect(() => {
    async function fetchDeal() {
      const { data, error } = await supabase
        .from('hotdeals')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error:', error);
      } else {
        setDeal(data);
      }
      setLoading(false);
    }

    fetchDeal();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <span className="text-4xl">🦀</span>
        <p className="text-[15px] font-semibold">게시물을 찾을 수 없습니다</p>
        <Link href="/hotdeals" className="text-[#0ABAB5] underline">홈으로 돌아가기</Link>
      </div>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(deal.content || '', {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'img', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'video', 'source'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'rel', 'controls', 'autoplay', 'loop', 'muted', 'referrerpolicy'],
    ALLOW_DATA_ATTR: false,
  });

  // ✨ [추가] 날짜 포맷 헬퍼
  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">
      {/* ✨ 뒤로가기 버튼 - router.back() 으로 정확한 이전 페이지 이동 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button 
          onClick={handleBack}
          className="text-[#64748B] hover:text-[#0ABAB5]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1E293B]">핫딜 상세</h1>
      </header>

      {/* 본문 내용 */}
      <main className="p-4 flex flex-col">
        {/* 1. 상품 제목 + 업로드 날짜 */}
        <h1 className="text-[20px] font-bold mb-1">{deal.title}</h1>
        {deal.crawled_at && (
          <p className="text-[12px] text-[#94A3B8] mb-3">
            🕐 {formatDate(deal.crawled_at)}
          </p>
        )}
        
        {/* 2. 대표 이미지 */}
        {deal.image && (
          <img 
            src={deal.image} 
            alt={deal.title}
            className="w-full rounded-xl mb-4"
            referrerPolicy="no-referrer"
          />
        )}

        {/* 3. 가격 카드 (가격 + 판매처) */}
        <div className="bg-white rounded-xl p-4 mb-6">
          <p className="text-[16px] font-bold text-[#FF6B6B] mb-2">{deal.price}</p>
          <p className="text-[13px] text-[#64748B]">{deal.shop}</p>
        </div>

        {/* 4. 상세 설명 (박스 테두리 디자인 적용) */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] mb-10 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#1E293B] mb-4 pb-2 border-b border-[#F1F5F9]">상세 내용</h3>
          
          <div 
            className="prose prose-sm max-w-none text-[#334155] leading-relaxed break-words [&_*]:!text-left prose-p:my-1 prose-br:hidden"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>

        {/* 5. 구매하러 가기 버튼 (메인 액션) */}
        {deal.shop_url && (
          <a 
            href={deal.shop_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#0ABAB5] text-white text-center py-4 rounded-xl font-bold mb-3 shadow-sm"
          >
            구매하러 가기
          </a>
        )}

        {/* 6. 원본게시글 보기 버튼 (보조 액션) */}
        {deal.url && (
          <a 
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white text-[#1E293B] border border-[#E2E8F0] text-center py-4 rounded-xl font-bold mb-8 hover:bg-[#FAF6F0] transition-colors"
          >
            원본게시글 보기
          </a>
        )}

      </main>
    </div>
  );
}
