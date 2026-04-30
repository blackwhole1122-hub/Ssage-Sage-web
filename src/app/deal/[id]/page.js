'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'dompurify';

export default function DealDetailPage({ params: promiseParams }) {
  const params = use(promiseParams);
  const [deal, setDeal] = useState(null);
  const [matchedBlogCtas, setMatchedBlogCtas] = useState([]);
  const [thermometerInfo, setThermometerInfo] = useState({
    loading: true,
    hasMatchedSlug: false,
    href: '/hotdeal-thermometer',
    lastPrice: null,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const normalizeText = (value = '') =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const parseExcludeKeywords = (raw = '') =>
    String(raw || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

  const parseMatchKeywords = (raw = '') =>
    String(raw || '')
      .split(',')
      .map((item) => normalizeText(item))
      .filter(Boolean);

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
        const haystack = normalizeText(`${data?.title || ''} ${data?.content || ''} ${data?.shop || ''}`);

        const { data: ctaPosts } = await supabase
          .from('blog_posts')
          .select('id, slug, title, cta_keyword, cta_message, cta_exclude_keywords, published, scheduled_at')
          .eq('published', true)
          .not('cta_keyword', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(300);

        if (Array.isArray(ctaPosts) && ctaPosts.length > 0) {
          const now = Date.now();
          const matched = ctaPosts.filter((post) => {
            const keywords = parseMatchKeywords(post?.cta_keyword || '');
            if (keywords.length === 0) return false;

            const scheduledAt = post?.scheduled_at ? new Date(post.scheduled_at).getTime() : null;
            if (scheduledAt && Number.isFinite(scheduledAt) && scheduledAt > now) return false;

            const hitKeyword = keywords.find((kw) => haystack.includes(kw));
            if (!hitKeyword) return false;

            const excludes = parseExcludeKeywords(post?.cta_exclude_keywords);
            if (excludes.length > 0 && excludes.some((kw) => haystack.includes(kw))) return false;

            return true;
          });

          if (matched.length > 0) {
            setMatchedBlogCtas(
              matched.map((item) => ({
                slug: item.slug,
                keyword:
                  parseMatchKeywords(item.cta_keyword || '').find((kw) => haystack.includes(kw)) ||
                  String(item.cta_keyword || '').trim(),
                message: String(item.cta_message || '').trim(),
                title: item.title,
              }))
            );
          } else {
            setMatchedBlogCtas([]);
          }
        } else {
          setMatchedBlogCtas([]);
        }

        const slug = String(data?.group_slug || '').trim();

        if (slug) {
          const [{ data: groupData }, { data: latestPriceRow }] = await Promise.all([
            supabase
              .from('keyword_groups')
              .select('slug')
              .eq('slug', slug)
              .maybeSingle(),
            supabase
              .from('price_history')
              .select('price_num, price')
              .eq('group_slug', slug)
              .order('crawled_at', { ascending: false, nullsFirst: false })
              .order('created_at', { ascending: false, nullsFirst: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const parsedPriceNum = Number(latestPriceRow?.price_num);
          const parsedFromText = Number(String(latestPriceRow?.price || '').replace(/[^\d]/g, ''));
          const lastPrice =
            Number.isFinite(parsedPriceNum) && parsedPriceNum > 0
              ? parsedPriceNum
              : Number.isFinite(parsedFromText) && parsedFromText > 0
                ? parsedFromText
                : null;

          if (groupData?.slug) {
            setThermometerInfo({
              loading: false,
              hasMatchedSlug: true,
              href: `/hotdeal-thermometer/${groupData.slug}`,
              lastPrice,
            });
          } else {
            setThermometerInfo({
              loading: false,
              hasMatchedSlug: false,
              href: '/hotdeal-thermometer',
              lastPrice: null,
            });
          }
        } else {
          setThermometerInfo({
            loading: false,
            hasMatchedSlug: false,
            href: '/hotdeal-thermometer',
            lastPrice: null,
          });
        }
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
        <span className="text-4xl">🔍</span>
        <p className="text-[15px] font-semibold">게시물을 찾을 수 없습니다.</p>
        <Link href="/hotdeals" className="text-[#0ABAB5] underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const cleanedRawContent = (deal.content || '')
    // Remove common crawler artifacts that appear as broken trailing markup.
    .replace(/\r\n/g, '\n')
    // Remove affiliate disclosure lines captured from crawlers.
    .replace(/^.*(?:제휴마케팅 활동의 일환|일정액의 수수료를 제공받을 수 있습니다|쿠팡파트너스의 일환).*(?:\n|$)/gim, '')
    .replace(/^.*(?:\[\s*이\s*포스팅은|<\s*\[\s*이\s*포스팅은).*(?:\n|$)/gim, '')
    .replace(/^\s*["'`]*\s*<\s*$/gm, '')
    .replace(/^\s*["'`]+\s*$/gm, '')
    .replace(/(?:\s|&nbsp;)*(?:"|&quot;|&#34;|&#x22;)?(?:<|&lt;|&#60;|&#x3c;|\\u003c)\s*$/i, '')
    .replace(/(?:\s|&nbsp;)*(?:\\u003c|\\x3c)\s*$/i, '');

  const sanitizedContent = DOMPurify.sanitize(cleanedRawContent, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'b',
      'strong',
      'i',
      'em',
      'u',
      'a',
      'img',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'video',
      'source',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'style',
      'class',
      'target',
      'rel',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'referrerpolicy',
    ],
    ALLOW_DATA_ATTR: false,
  });

  const sanitizedContentNormalized = sanitizedContent
    .replace(/(?:\s|&nbsp;)*(?:\[\s*이\s*포스팅은.*?수수료를\s*제공받을\s*수\s*있습니다\.?\s*\]?)/gim, '')
    .replace(/(?:&quot;|&#34;|&#x22;)\s*&lt;\s*$/i, '')
    .replace(/^\s*(?:&quot;|&#34;|&#x22;)\s*&lt;\s*$/gim, '')
    .replace(/(?:\s|&nbsp;)*(?:&lt;|&#60;|&#x3c;|<)\s*$/i, '');

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const coupangSearchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(deal.title || '')}`;
  const coupangPartnerLink = `/api/coupang?url=${encodeURIComponent(coupangSearchUrl)}`;
  const parsedDealPrice = Number(String(deal.price || '').replace(/[^\d]/g, ''));
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : `https://www.ssagesage.com/deal/${deal.id}`;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: deal.title || '핫딜 상품',
    image: deal.image ? [deal.image] : undefined,
    category: deal.category || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KRW',
      price: Number.isFinite(parsedDealPrice) && parsedDealPrice > 0 ? parsedDealPrice : undefined,
      availability: 'https://schema.org/InStock',
      seller: deal.shop ? { '@type': 'Organization', name: deal.shop } : undefined,
      url: deal.shop_url || coupangPartnerLink || canonicalUrl,
    },
  };
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: deal.title || '핫딜 상세',
    datePublished: deal.crawled_at || undefined,
    dateModified: deal.crawled_at || undefined,
    mainEntityOfPage: canonicalUrl,
    image: deal.image ? [deal.image] : undefined,
    publisher: {
      '@type': 'Organization',
      name: '싸게사게',
      logo: { '@type': 'ImageObject', url: 'https://www.ssagesage.com/logo-ssagesage.png' },
    },
  };
  const detailJsonLd = [productJsonLd, articleJsonLd];

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(detailJsonLd) }} />
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={handleBack} className="text-[#64748B] hover:text-[#0ABAB5]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1E293B]">핫딜 상세</h1>
      </header>

      <main className="p-4 flex flex-col">
        <h1 className="text-[20px] font-bold mb-1">{deal.title}</h1>
        {deal.crawled_at && (
          <p className="text-[12px] text-[#94A3B8] mb-3">등록 {formatDate(deal.crawled_at)}</p>
        )}

        {deal.image && (
          <img
            src={deal.image}
            alt={deal.title}
            className="w-full rounded-xl mb-4"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="bg-white rounded-xl p-4 mb-6">
          <p className="text-[16px] font-bold text-[#FF6B6B] mb-2">{deal.price}</p>
          <p className="text-[13px] text-[#64748B]">{deal.shop}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] mb-10 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#1E293B] mb-4 pb-2 border-b border-[#F1F5F9]">상세 내용</h3>
          <div
            className="prose prose-sm max-w-none text-[#334155] leading-relaxed break-words [&_*]:!text-left prose-p:my-1 prose-br:hidden"
            dangerouslySetInnerHTML={{ __html: sanitizedContentNormalized }}
          />
        </div>

        {!thermometerInfo.loading && (
          <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
            {thermometerInfo.hasMatchedSlug ? (
              <div className="space-y-2">
                <p className="text-[13px] text-[#475569]">
                  수집된 마지막 가격은{' '}
                  <span className="font-bold text-[#1E293B]">
                    {thermometerInfo.lastPrice ? `${thermometerInfo.lastPrice.toLocaleString()}원` : '확인 중'}
                  </span>
                  이에요.
                </p>
                <a
                  href={thermometerInfo.href}
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0ABAB5] hover:underline"
                >
                  가격이력을 보려면 클릭하세요
                </a>
              </div>
            ) : (
              <a
                href={thermometerInfo.href}
                className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0ABAB5] hover:underline"
              >
                가격이력 확인하러 가기
              </a>
            )}
          </div>
        )}

        {matchedBlogCtas.length > 0 && (
          <div className="mb-4 space-y-3">
            {matchedBlogCtas.map((item) => (
              <div key={`${item.slug}-${item.keyword}`} className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] text-[#1E3A8A] leading-relaxed">
                    지금 보고 있는 <span className="font-bold">[{item.keyword}]</span>,{' '}
                    {item.message || `${item.keyword} 관련 비교 정보를 정리한 글이 있어요.`}
                  </p>
                  <a
                    href={`/blog/${item.slug}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1D4ED8]"
                  >
                    바로보기
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {deal.title && (
          <a
            href={coupangPartnerLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block w-full bg-[#0ABAB5] text-white text-center py-4 rounded-xl font-bold mb-3 shadow-sm"
          >
            쿠팡 최저가 구매하러가기
          </a>
        )}

        {deal.shop_url && (
          <a
            href={deal.shop_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white text-[#1E293B] border border-[#E2E8F0] text-center py-4 rounded-xl font-bold mb-3 hover:bg-[#FAF6F0] transition-colors"
          >
            구매하러 가기
          </a>
        )}

        {deal.url && (
          <>
            <a
              href={deal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white text-[#1E293B] border border-[#E2E8F0] text-center py-4 rounded-xl font-bold mb-2 hover:bg-[#FAF6F0] transition-colors"
            >
              원본게시글 보기
            </a>
          </>
        )}
      </main>
    </div>
  );
}
