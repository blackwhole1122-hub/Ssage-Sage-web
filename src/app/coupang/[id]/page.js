'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CoupangDetailPage({ params: promiseParams }) {
  const params = use(promiseParams);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referrer, setReferrer] = useState('/coupang');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedReferrer = sessionStorage.getItem('coupangListUrl');
      if (savedReferrer) setReferrer(savedReferrer);
    }

    async function fetchProduct() {
      const { data, error } = await supabase
        .from('coupang_hotdeals')
        .select('*')
        .eq('product_id', params.id)
        .single();

      if (error) {
        console.error('Error:', error);
      } else {
        setProduct(data);
      }
      setLoading(false);
    }

    fetchProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <span className="text-4xl">🔎</span>
        <p className="text-[15px] font-semibold">상품을 찾을 수 없습니다.</p>
        <Link href="/coupang" className="text-[#0ABAB5] underline">
          쿠팡핫딜로 돌아가기
        </Link>
      </div>
    );
  }

  const coupangTargetUrl =
    product.partners_link ||
    product.product_url ||
    product.url ||
    '';
  const partnerRedirectUrl = coupangTargetUrl
    ? `/api/coupang?url=${encodeURIComponent(coupangTargetUrl)}`
    : '';
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : `https://www.ssagesage.com/coupang/${product.product_id}`;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name || '쿠팡 핫딜 상품',
    image: product.image_url ? [product.image_url] : undefined,
    category: product.category || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KRW',
      price: Number.isFinite(Number(product.discount_price)) ? Number(product.discount_price) : undefined,
      availability: 'https://schema.org/InStock',
      url: coupangTargetUrl || canonicalUrl,
      seller: { '@type': 'Organization', name: '쿠팡' },
    },
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Link href={referrer} className="text-[#64748B] hover:text-[#0ABAB5]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[16px] font-bold text-[#1E293B]">쿠팡핫딜</h1>
      </header>

      <main className="p-4">
        {product.image_url && (
          <div className="bg-white rounded-xl p-4 mb-4">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full max-w-md mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="bg-white rounded-xl p-4 mb-4">
          <span className="inline-block text-[11px] font-semibold text-[#64748B] bg-[#FAF6F0] px-2 py-0.5 rounded-md mb-2">
            {product.category}
          </span>
          <h1 className="text-[18px] font-bold mb-3">{product.name}</h1>

          {product.original_price > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] text-[#94A3B8] line-through">
                {product.original_price.toLocaleString()}원
              </span>
              <span className="text-[13px] font-bold text-[#FF6B6B]">
                -{product.discount_rate}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[24px] font-extrabold text-[#FF6B6B]">
              {product.discount_price.toLocaleString()}원
            </span>
            <span className="text-[12px] font-bold text-[#5CE1E6]">무료배송</span>
          </div>
        </div>

        {partnerRedirectUrl && (
          <div className="mt-4">
            <a
              href={partnerRedirectUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full bg-[#0ABAB5] text-white text-center py-4 rounded-xl font-bold text-[16px] mb-3"
            >
              구매하러 가기
            </a>
            <p className="text-[12px] text-black text-center font-medium opacity-80">
              이 배너는 제휴 활동의 일환으로 일정액의 수수료를 제공받습니다
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
