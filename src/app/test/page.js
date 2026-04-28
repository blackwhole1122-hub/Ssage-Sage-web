import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const metadata = {
  title: 'Blog List Thumbnail Test',
  robots: {
    index: false,
    follow: false,
  },
};

async function getPosts() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, created_at, thumbnail_url, og_image_url, published, scheduled_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(30);

  const now = new Date();
  return (data || []).filter((post) => !post.scheduled_at || new Date(post.scheduled_at) <= now);
}

function getThumb(post) {
  return post.thumbnail_url || post.og_image_url || '';
}

function getThumbSource(post) {
  if (post.thumbnail_url) return 'thumbnail_url';
  if (post.og_image_url) return 'og_image_url';
  return 'none';
}

export default async function BlogListThumbTestPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-slate-900">/test - 현재 블로그 카드 복제</h1>
          <p className="mt-1 text-xs font-bold text-rose-600">CURRENT CARD CLONE</p>
          <p className="mt-2 text-sm text-slate-600">지금 /blog에서 보이는 카드 스타일 그대로입니다.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {posts.map((post) => {
            const thumb = getThumb(post);
            const icon = post.emoji || (thumb ? '🖼️' : '📝');
            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group deal-card flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-all duration-200 hover:border-[#0ABAB5]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF6F0] text-2xl transition-colors group-hover:bg-[#E6FAF9]">
                  {icon}
                </div>

                <h2 className="mb-1.5 line-clamp-1 text-[16px] font-bold text-[#1E293B] transition-colors group-hover:text-[#0ABAB5]">
                  {post.title}
                </h2>

                <p className="mb-4 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[#64748B]">
                  {post.description || '설명이 없는 게시글입니다.'}
                </p>

                <div className="border-t border-[#E2E8F0] pt-3 text-[12px] font-medium text-[#94A3B8]">
                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </div>
              </Link>
            );
          })}

          {posts.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              게시글 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
