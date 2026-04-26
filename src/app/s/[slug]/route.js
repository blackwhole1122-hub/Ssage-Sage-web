import { NextResponse } from 'next/server';
import { decodeBlogShortSlug } from '@/lib/shortLinks';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')?.[0]?.trim() || '';
}

export async function GET(request, context) {
  const { slug } = await context.params;
  const postId = decodeBlogShortSlug(slug);
  const fallbackUrl = new URL('/blog', request.url);

  if (!Number.isSafeInteger(postId)) {
    return NextResponse.redirect(fallbackUrl, 302);
  }

  let post = null;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from('blog_posts')
      .select('id, slug, published, scheduled_at')
      .eq('id', postId)
      .eq('published', true)
      .maybeSingle();
    post = data || null;
  } catch {
    post = null;
  }

  if (!post?.slug) {
    return NextResponse.redirect(fallbackUrl, 302);
  }

  if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
    return NextResponse.redirect(fallbackUrl, 302);
  }

  const targetUrl = new URL(`/blog/${post.slug}`, request.url);
  const response = NextResponse.redirect(targetUrl, 302);
  response.cookies.set('ss_short_slug', String(slug), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  });

  try {
    const supabase = createSupabaseServerClient();
    await supabase.from('analytics_events').insert({
      event_name: 'short_link_click',
      page_path: `/s/${slug}`,
      page_type: 'short_link',
      target_url: targetUrl.pathname,
      short_slug: String(slug),
      referrer: request.headers.get('referer') || null,
      metadata: {
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || '',
      },
    });
  } catch {
    // tracking failures should not block redirect
  }

  return response;
}

