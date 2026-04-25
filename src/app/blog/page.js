import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BlogCategoryTabs from './BlogCategoryTabs.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.ssagesage.com';
const SITE_NAME = '싸게사게';

export const metadata = {
  title: '정보모음 | 싸게사게',
  description: '핫딜 활용법, 가격 비교 가이드, 절약 꿀팁을 모아둔 실전형 블로그입니다.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: `정보모음 | ${SITE_NAME}`,
    description: '핫딜 활용법과 가격 비교 팁을 빠르게 확인해보세요.',
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `정보모음 | ${SITE_NAME}`,
    description: '핫딜 활용법과 가격 비교 팁을 빠르게 확인해보세요.',
  },
};

export const revalidate = 60;

async function getData() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [postsRes, catsRes] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('id, slug, title, description, emoji, created_at, category_id, scheduled_at')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true }),
  ]);

  const now = new Date();
  const posts = (postsRes.data || []).filter((post) => {
    if (!post.scheduled_at) return true;
    return new Date(post.scheduled_at) <= now;
  });

  return { posts, categories: catsRes.data || [] };
}

function buildItemListJsonLd(posts = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.slice(0, 20).map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  };
}

export default async function BlogListPage({ searchParams }) {
  const { posts, categories } = await getData();
  const params = await searchParams;
  const initialCategoryName =
    typeof params?.category === 'string' ? params.category : null;

  const listJsonLd = buildItemListJsonLd(posts);

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/blog" className="flex items-center">
              <span className="text-[24px] font-black text-[#1E293B] tracking-tight leading-[48px]">
                정보모음
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors"
          >
            홈으로
          </Link>
        </div>

        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            핫딜모음
          </Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            쿠팡핫딜
          </Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            핫딜온도계
          </Link>
          <Link href="/blog" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">
            정보모음
          </Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            유틸리티
          </Link>
        </nav>
      </header>

      <main className="px-4 py-8 md:py-12">
        <header className="mb-10">
          <p className="text-[15px] text-[#64748B] leading-relaxed">
            절약과 가격비교에 도움이 되는 실전형 가이드를 모았습니다.
          </p>
        </header>

        <BlogCategoryTabs
          posts={posts}
          categories={categories}
          initialCategoryName={initialCategoryName}
        />
      </main>
    </div>
  );
}
