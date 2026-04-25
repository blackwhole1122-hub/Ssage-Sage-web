import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BlogCategoryTabs from './BlogCategoryTabs.js';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.ssagesage.com';
const SITE_NAME = '?멸쾶?ш쾶';

export const metadata = {
  title: '?뺣낫紐⑥쓬 | ?멸쾶?ш쾶',
  description: '?ル뵜 ?쒖슜踰? 媛寃?鍮꾧탳 媛?대뱶, ?덉빟 轅?곸쓣 紐⑥븘???ㅼ쟾??釉붾줈洹몄엯?덈떎.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: `?뺣낫紐⑥쓬 | ${SITE_NAME}`,
    description: '?ル뵜 ?쒖슜踰뺢낵 媛寃?鍮꾧탳 ?곸쓣 鍮좊Ⅴ寃??뺤씤?대낫?몄슂.',
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `?뺣낫紐⑥쓬 | ${SITE_NAME}`,
    description: '?ル뵜 ?쒖슜踰뺢낵 媛寃?鍮꾧탳 ?곸쓣 鍮좊Ⅴ寃??뺤씤?대낫?몄슂.',
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
    <div className="bg-[#FAF6F0] min-h-screen">
      <div className="max-w-[1500px] mx-auto lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
          <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="bg-[#FFF9E6] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/blog" className="flex items-center">
              <span className="text-[24px] font-black text-[#1E293B] tracking-tight leading-[48px]">
                ?뺣낫紐⑥쓬
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-full hover:bg-[#FAF6F0] transition-colors"
          >
            ?덉쑝濡?
          </Link>
        </div>

        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            ?ル뵜紐⑥쓬
          </Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            荑좏뙜?ル뵜
          </Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            ?ル뵜?⑤룄怨?
          </Link>
          <Link href="/blog" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">
            ?뺣낫紐⑥쓬
          </Link>
          <Link href="/utility" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">
            ?좏떥由ы떚
          </Link>
        </nav>
      </header>

      <main className="px-4 py-8 md:py-12">
        <div className="lg:hidden mb-4 flex justify-center">
          <CoupangSidebarBanner mode="mobile" />
        </div>
<header className="mb-10">
          <p className="text-[15px] text-[#64748B] leading-relaxed">
            ?덉빟怨?媛寃⑸퉬援먯뿉 ?꾩????섎뒗 ?ㅼ쟾??媛?대뱶瑜?紐⑥븯?듬땲??
          </p>
        </header>

        <BlogCategoryTabs
          posts={posts}
          categories={categories}
          initialCategoryName={initialCategoryName}
        />
      </main>
          </div>

          <aside className="hidden lg:block w-[250px] shrink-0 pt-24 sticky top-24 self-start">
            <div>
              <CoupangSidebarBanner mode="desktop" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

