// src/app/sitemap.js
import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

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

  const staticPaths = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/hotdeals', priority: 0.9, changeFrequency: 'hourly' },
    { path: '/coupang', priority: 0.9, changeFrequency: 'hourly' },
    { path: '/hotdeal-thermometer', priority: 0.9, changeFrequency: 'daily' },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/privacy', priority: 0.4, changeFrequency: 'monthly' },
  ];
  const staticEntries = staticPaths.map((item) => ({
    url: `${baseUrl}${item.path}`,
    lastModified: new Date(),
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  // 1. 핫딜온도계 품목(slug)들 가져오기
  const { data: groups } = await supabase.from('keyword_groups').select('slug');
  const groupEntries = groups?.map((g) => ({
    url: `${baseUrl}/hotdeal-thermometer/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  })) || [];

  // 2. 공개된 블로그 글 가져오기 (예약 시간 지난 글만 포함)
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
    ...staticEntries,
    ...utilityEntries,
    ...groupEntries,
    ...blogEntries,
  ];
}
