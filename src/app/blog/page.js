import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BlogCategoryTabs from './BlogCategoryTabs.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.ssagesage.com';
const SITE_NAME = '싸게사게';

export const metadata = {
  title: `정보모음 | ${SITE_NAME}`,
  description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: `정보모음 | ${SITE_NAME}`,
    description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `정보모음 | ${SITE_NAME}`,
    description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
  },
};

export const revalidate = 60;

async function getData() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [postsResInitial, catsRes, subcatsRes] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('blog_subcategories')
      .select('*')
      .order('id', { ascending: true }),
  ]);

  const normalizePost = (item = {}) => ({
    ...item,
    published_at: item.published_at || item.created_at || null,
    thumbnail_url: item.thumbnail_url ?? item.og_image_url ?? null,
    og_image_url: item.og_image_url ?? item.thumbnail_url ?? null,
    tags: Array.isArray(item?.tags) ? item.tags : [],
  });

  let postsRes = postsResInitial;
  if (postsResInitial?.error) {
    const msg = `${postsResInitial.error.message || ''} ${postsResInitial.error.details || ''}`.toLowerCase();
    const missingPublishedAt = msg.includes('published_at');
    if (missingPublishedAt || postsResInitial.error.code === '42703' || postsResInitial.error.code === 'PGRST204') {
      const fallbackRes = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (!fallbackRes.error) {
        postsRes = {
          ...fallbackRes,
          data: (fallbackRes.data || []).map(normalizePost),
        };
      }
    }
  }

  const normalizedPosts = (postsRes.data || []).map(normalizePost);
  const now = new Date();
  const posts = normalizedPosts.filter((post) => {
    if (!post.scheduled_at) return true;
    return new Date(post.scheduled_at) <= now;
  });

  return { posts, categories: catsRes.data || [], subcategories: subcatsRes.data || [] };
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
  const { posts, categories, subcategories } = await getData();
  const params = await searchParams;
  const initialCategoryName =
    typeof params?.category === 'string' ? params.category : null;
  const initialSubcategorySlug =
    typeof params?.subcategory === 'string' ? params.subcategory : null;

  const listJsonLd = buildItemListJsonLd(posts);

  return (
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

            <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
              <div className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href="/" className="flex items-center">
                    <span className="text-[24px] font-black text-[#1E293B] tracking-tight leading-[48px]">
                      정보모음
                    </span>
                  </Link>
                </div>
                <Link
                  href="/"
                  className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors"
                >
                  홈
                </Link>
              </div>

              <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5">
                <Link href="/" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">
                  블로그
                </Link>
              </nav>
            </header>

            <main className="px-4 py-8 md:py-12">
              <BlogCategoryTabs
                posts={posts}
                categories={categories}
                subcategories={subcategories}
                initialCategoryName={initialCategoryName}
                initialSubcategorySlug={initialSubcategorySlug}
              />
            </main>

            <footer className="bg-white border-t border-[#E2E8F0] px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[20px]">📝</span>
                <span className="text-[14px] font-bold text-[#1E293B]">{SITE_NAME}</span>
              </div>
              <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                현재 도메인 메인은 블로그 중심으로 운영하고 있습니다.
              </p>
              <div className="flex items-center gap-3 text-[12px]">
                <Link href="/" className="text-[#64748B] hover:text-[#1E293B] transition-colors">블로그</Link>
                <span className="text-[#CBD5E1]">·</span>
                <Link href="/privacy" className="text-[#64748B] hover:text-[#1E293B] transition-colors">개인정보처리방침</Link>
                <span className="text-[#CBD5E1]">·</span>
                <Link href="/login" className="text-[#64748B] hover:text-[#1E293B] transition-colors">로그인</Link>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-[#94A3B8]">© 2026 {SITE_NAME}</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
