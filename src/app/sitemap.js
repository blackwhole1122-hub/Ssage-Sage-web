// src/app/sitemap.js
import { createClient } from '@supabase/supabase-js';

export default async function sitemap() {
  const baseUrl = 'https://www.ssagesage.com';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const utilityPaths = [
    '/utility',
    '/utility/coupon-stack-calculator',
    '/utility/direct-purchase-tax',
    '/utility/discount-calculator',
    '/utility/image-background-remover',
    '/utility/nutrition-price-calculator',
    '/utility/unit-price-calculator',
  ];
  const utilityEntries = utilityPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '/utility' ? 0.8 : 0.7,
  }));

  // 1. 핫딜온도계 품목(slug)들 가져오기
  const { data: groups } = await supabase.from('keyword_groups').select('slug');
  const groupEntries = groups?.map((g) => ({
    url: `${baseUrl}/hotdeal-thermometer/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  })) || [];

  // 2. 최신 핫딜 100개 가져오기
  const { data: deals } = await supabase
    .from('hotdeals')
    .select('id')
    .order('crawled_at', { ascending: false })
    .limit(100);

  const dealEntries = deals?.map((d) => ({
    url: `${baseUrl}/deal/${d.id}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.6,
  })) || [];

  // 3. 공개된 블로그 글 가져오기 (예약 시간 지난 글만 포함)
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, created_at, scheduled_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  const now = new Date();
  const blogEntries = (blogPosts || [])
    .filter((post) => !post.scheduled_at || new Date(post.scheduled_at) <= now)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updated_at || post.created_at || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  return [
    { url: baseUrl, lastModified: new Date(), priority: 1 },
    { url: `${baseUrl}/hotdeal-thermometer`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), priority: 0.8 },
    ...utilityEntries,
    ...groupEntries,
    ...dealEntries,
    ...blogEntries,
  ];
}
