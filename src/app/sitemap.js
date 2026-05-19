import { createSupabaseServerClient } from '@/lib/supabaseServer';

const SITE_URL = 'https://www.ssagesage.com';

export const revalidate = 300;

export default async function sitemap() {
  const now = new Date();
  const staticEntries = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    const supabase = createSupabaseServerClient();

    let { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at, created_at, scheduled_at')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false });

    if (
      error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        String(error.message || '').toLowerCase().includes('published_at'))
    ) {
      const fallback = await supabase
        .from('blog_posts')
        .select('slug, updated_at, created_at, scheduled_at')
        .eq('published', true)
        .order('created_at', { ascending: false });

      posts = (fallback.data || []).map((post) => ({
        ...post,
        published_at: post.created_at || null,
      }));
      error = fallback.error;
    }

    if (error) {
      console.error('sitemap blog post fetch failed:', error);
      return staticEntries;
    }

    const blogEntries = (posts || [])
      .filter((post) => !post.scheduled_at || new Date(post.scheduled_at) <= now)
      .map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updated_at || post.published_at || post.created_at || now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }));

    return [...staticEntries, ...blogEntries];
  } catch (error) {
    console.error('sitemap generation failed:', error);
    return staticEntries;
  }
}
