import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

const SITE_URL = 'https://www.ssagesage.com';
const SITE_TITLE = '싸게사게 통합 피드';
const SITE_DESC = '블로그, 핫딜온도계, 유틸리티의 최신 업데이트를 제공하는 싸게사게 통합 RSS';

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: blogRows, error: blogError } = await supabase
    .from('blog_posts')
    .select('slug, title, seo_title, description, seo_description, content, created_at, updated_at, scheduled_at, published')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(60);

  if (blogError) {
    return new Response('Failed to build RSS feed', { status: 500 });
  }

  const now = Date.now();
  const blogPosts = (blogRows || []).filter(
    (post) => !post.scheduled_at || new Date(post.scheduled_at).getTime() <= now
  );

  let thermometerRows = [];
  const thermoWithDates = await supabase
    .from('keyword_groups')
    .select('slug, group_name, updated_at, created_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(40);

  if (thermoWithDates.error) {
    const thermoFallback = await supabase
      .from('keyword_groups')
      .select('slug, group_name')
      .limit(40);
    thermometerRows = thermoFallback.data || [];
  } else {
    thermometerRows = thermoWithDates.data || [];
  }

  const utilityRows = [
    {
      slug: 'unit-price-calculator',
      title: '단위가격 계산기',
      path: '/utility/unit-price-calculator',
      description: '용량 대비 단가를 빠르게 비교하는 계산기',
    },
    {
      slug: 'discount-calculator',
      title: '할인율 계산기',
      path: '/utility/discount-calculator',
      description: '정가와 할인가 기반 할인율 계산기',
    },
    {
      slug: 'coupon-stack-calculator',
      title: '중복할인 계산기',
      path: '/utility/coupon-stack-calculator',
      description: '쿠폰/카드/포인트 중복할인 계산기',
    },
    {
      slug: 'direct-purchase-tax',
      title: '해외직구 세금 계산기',
      path: '/utility/direct-purchase-tax',
      description: '관부가세 포함 예상 결제금액 계산기',
    },
    {
      slug: 'nutrition-price-calculator',
      title: '영양성분 단가 계산기',
      path: '/utility/nutrition-price-calculator',
      description: '영양성분 1g당 가격 비교 계산기',
    },
    {
      slug: 'image-background-remover',
      title: '이미지 배경 제거',
      path: '/utility/image-background-remover',
      description: '이미지 배경을 빠르게 제거하는 도구',
    },
  ];

  const items = [
    ...blogPosts.map((post) => {
      const title = `[블로그] ${post.seo_title || post.title || '블로그 글'}`;
      const description =
        post.seo_description ||
        post.description ||
        String(post.content || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      const link = `${SITE_URL}/blog/${post.slug}`;
      const pubDate = toRfc2822(post.updated_at || post.created_at);
      return { title, description, link, pubDate };
    }),
    ...thermometerRows.map((row) => {
      const title = `[핫딜온도계] ${row.group_name || row.slug || '상품 시세'}`;
      const description = `${row.group_name || row.slug || '상품'} 가격 이력 및 시세 페이지`;
      const link = `${SITE_URL}/hotdeal-thermometer/${row.slug}`;
      const pubDate = toRfc2822(row.updated_at || row.created_at || new Date());
      return { title, description, link, pubDate };
    }),
    ...utilityRows.map((row) => {
      const title = `[유틸리티] ${row.title}`;
      const description = row.description;
      const link = `${SITE_URL}${row.path}`;
      const pubDate = toRfc2822(new Date());
      return { title, description, link, pubDate };
    }),
  ]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 120)
    .map((post) => {
      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(post.link)}</link>
          <guid isPermaLink="true">${escapeXml(post.link)}</guid>
          <pubDate>${escapeXml(post.pubDate)}</pubDate>
          <description>${escapeXml(post.description)}</description>
        </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
    },
  });
}
