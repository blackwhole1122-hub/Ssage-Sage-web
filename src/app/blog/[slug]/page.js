import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CoupangSidebarBanner from '@/components/CoupangSidebarBanner';
import { buildExternalRel } from '@/lib/linkRel';
import { encodeBlogShortSlug } from '@/lib/shortLinks';
import BlogShareButton from './BlogShareButton';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.ssagesage.com';
const AFFILIATE_DISCLOSURE_TEXT = '\uC774 \uAC8C\uC2DC\uBB3C\uC740 \uCFE0\uD321 \uD30C\uD2B8\uB108\uC2A4 \uD65C\uB3D9\uC758 \uC77C\uD658\uC73C\uB85C, \uC774\uC5D0 \uB530\uB978 \uC77C\uC815\uC561\uC758\uC218\uC218\uB8CC\uB97C \uBC1B\uC2B5\uB2C8\uB2E4.';
const SITE_NAME = '싸게사게';

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function removeMarkdown(md = '') {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`.*?`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*|__|\*|_|~~/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

function slugifyText(text = '') {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function shouldUseImageProxy(src = '') {
  try {
    const parsed = new URL(src);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'ac-p1.namu.la' ||
      host.endsWith('.namu.la') ||
      host === 'i1.ruliweb.com' ||
      host === 'i2.ruliweb.com' ||
      host === 'i3.ruliweb.com' ||
      host.endsWith('.ruliweb.com')
    );
  } catch {
    return false;
  }
}

function getProxyReferer(src = '') {
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (host.includes('namu.la')) return 'namu.wiki';
    if (host.includes('ruliweb.com')) return 'bbs.ruliweb.com';
    return host;
  } catch {
    return '';
  }
}

function buildSafeImageSrc(src = '') {
  const raw = String(src || '').trim();
  if (!raw) return raw;
  if (!shouldUseImageProxy(raw)) return raw;
  const ref = getProxyReferer(raw);
  return `/api/img-proxy?url=${encodeURIComponent(raw)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
}

function normalizeImageWidthPercent(value = '') {
  const raw = String(value || '').replace('%', '').trim();
  if (!raw) return '';
  const num = Number(raw);
  if (!Number.isFinite(num)) return '';
  return `${Math.max(20, Math.min(100, Math.round(num)))}%`;
}

function renderMarkdownImageFigure(alt = '', src = '', caption = '', widthPercent = '') {
  const safeAlt = escapeHtml(alt);
  const safeSrc = escapeHtml(buildSafeImageSrc(src));
  const safeCaption = escapeHtml(caption || '');
  const safeWidth = normalizeImageWidthPercent(widthPercent);
  const widthStyle = safeWidth ? `width:${safeWidth};` : 'width:auto;';
  return `<figure class="md-figure"><img src="${safeSrc}" alt="${safeAlt}" class="md-img" style="${widthStyle}max-width:min(100%,760px);height:auto;" loading="lazy" referrerpolicy="no-referrer" />${safeCaption ? `<figcaption class="md-figcaption">${safeCaption}</figcaption>` : ''}</figure>`;
}

function renderMarkdownTable(block = '') {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return block;
  if (!lines.every((line) => line.startsWith('|') && line.endsWith('|'))) return block;
  if (!/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(lines[1])) return block;

  const headers = lines[0].split('|').slice(1, -1).map((cell) => cell.trim());
  const rows = lines
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((row) => row.length > 0);

  if (headers.length === 0) return block;

  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headers
    .map((cell) => `<th class="md-table_th">${cell}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td class="md-table_td">${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

function isExternalHref(href = '') {
  const lower = href.toLowerCase().trim();
  return /^https?:\/\//.test(lower) || lower.startsWith('//');
}

function isCoupangHref(href = '') {
  const lower = String(href || '').toLowerCase().trim();
  return /^(https?:\/\/)?([a-z0-9-]+\.)?(coupang\.com|link\.coupang\.com)\//.test(lower);
}

function getPreferredPostImage(post) {
  return post?.og_image_url || post?.thumbnail_url || '/og-image.png';
}

function markdownToHtml(md = '') {
  let html = md || '';
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre class="md-codeblock"><code class="language-${lang}">${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  html = html.replace(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{width=(\d{1,3})%\})?$/gm, (_m, alt, src, caption = '', width = '') => {
    return renderMarkdownImageFigure(alt, src, caption, width);
  });
  html = html.replace(/((?:^\|.*\|\s*$\n?){2,})/gm, (tableBlock) => renderMarkdownTable(tableBlock));
  html = html.replace(/:::startbox(?:\[(.*?)\])?\n([\s\S]*?)\n:::/g, (_m, title = '', body = '') => {
    const safeTitle = escapeHtml((title || '이 글을 읽으면 알 수 있어요').trim());
    const items = String(body || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*]\s+/, ''))
      .filter(Boolean);
    if (!items.length) return '';
    return `<section class="md-startbox"><h3 class="md-startbox-title">${safeTitle}</h3><ul class="md-startbox-list">${items.map((item) => `<li class="md-startbox-item"><span class="md-startbox-check">☑</span><span>${escapeHtml(item)}</span></li>`).join('')}</ul></section>`;
  });
  html = html.replace(/^\[([^\]]+)\]\(([^)]+)\)\s*$/gm, (_m, text, href) => {
    if (!isCoupangHref(href)) return _m;
    const safeHref = escapeHtml(href || '');
    const safeText = escapeHtml(text || '');
    const rel = buildExternalRel(href);
    return `<a href="${safeHref}" class="md-coupang-btn md-coupang-btn-lg" target="_blank" rel="${rel}">${safeText}</a>`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
    const safeHref = escapeHtml(href || '');
    const safeText = escapeHtml(text || '');
    if (isCoupangHref(href)) {
      const rel = buildExternalRel(href);
      return `<a href="${safeHref}" class="md-coupang-btn" target="_blank" rel="${rel}">${safeText}</a>`;
    }
    if (isExternalHref(href)) {
      const rel = buildExternalRel(href);
      return `<a href="${safeHref}" class="md-link" target="_blank" rel="${rel}">${safeText}</a>`;
    }
    return `<a href="${safeHref}" class="md-link">${safeText}</a>`;
  });
  html = html.replace(/^### (.+)$/gm, (_m, text) => `<h3 id="${slugifyText(text)}" class="md-h3">${text}</h3>`);
  html = html.replace(/^## (.+)$/gm, (_m, text) => `<h2 id="${slugifyText(text)}" class="md-h2">${text}</h2>`);
  html = html.replace(/^# (.+)$/gm, (_m, text) => `<h1 id="${slugifyText(text)}" class="md-h1">${text}</h1>`);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/^> (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');
  html = html
    .split('\n\n')
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      if (/^<(h[1-6]|pre|ul|blockquote|hr|figure|div|table)/.test(t)) return t;
      return `<p class="md-p">${t.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
  return html;
}

async function getPost(slug) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const normalizedSlug = decodeURIComponent(slug).normalize('NFC');

  const extendedSelect = 'id, slug, title, description, content, emoji, created_at, updated_at, scheduled_at, og_image_url, thumbnail_url, tags, affiliate_disclosure, category_id, blog_categories(name, slug)';
  const baseSelect = 'id, slug, title, description, content, emoji, created_at, updated_at, scheduled_at, category_id, blog_categories(name, slug)';

  let { data, error } = await supabase
    .from('blog_posts')
    .select(extendedSelect)
    .eq('slug', normalizedSlug)
    .eq('published', true)
    .maybeSingle();

  // Fallback for older DB schemas where optional SEO/media columns are not added yet.
  if (error && error.code === '42703') {
    const fallback = await supabase
      .from('blog_posts')
      .select(baseSelect)
      .eq('slug', normalizedSlug)
      .eq('published', true)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Supabase post fetch error:', error.message);
    return null;
  }
  if (!data) return null;
  if (data.scheduled_at) {
    const scheduledDate = new Date(data.scheduled_at);
    const now = new Date();
    if (scheduledDate > new Date(now.getTime() + 60000)) return null;
  }
  return {
    ...data,
    og_image_url: data?.og_image_url || null,
    thumbnail_url: data?.thumbnail_url || null,
    tags: Array.isArray(data?.tags) ? data.tags : [],
    affiliate_disclosure: !!data?.affiliate_disclosure,
  };
}

async function getRelatedPosts(post) {
  if (!post?.id) return [];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const nowIso = new Date().toISOString();

  let query = supabase
    .from('blog_posts')
    .select('id, slug, title, description, created_at, category_id')
    .eq('published', true)
    .neq('id', post.id)
    .or(`scheduled_at.is.null,scheduled_at.lte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(4);

  if (post.category_id) {
    query = query.eq('category_id', post.category_id);
  }

  const { data } = await query;
  return data || [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: '글을 찾을 수 없습니다',
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const summary = post.description || removeMarkdown(post.content || '').slice(0, 155);
  const image = getPreferredPostImage(post);

  return {
    title: `${post.title} | ${SITE_NAME} 블로그`,
    description: summary,
    alternates: { canonical },
    keywords: Array.isArray(post.tags) ? post.tags : [],
    openGraph: {
      title: post.title,
      description: summary,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: summary,
      images: [image],
    },
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const htmlContent = markdownToHtml(post.content || '');
  const categoryName = post.blog_categories?.name || null;
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const summary = post.description || removeMarkdown(post.content || '').slice(0, 155);
  const image = getPreferredPostImage(post);
  const keywords = Array.isArray(post.tags) ? post.tags.filter(Boolean) : [];
  const relatedPosts = await getRelatedPosts(post);
  const shortSlug = encodeBlogShortSlug(post.id);
  const wordCount = removeMarkdown(post.content || '').split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      mainEntityOfPage: canonical,
      headline: post.title,
      description: summary,
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      articleSection: categoryName || undefined,
      keywords: keywords.length ? keywords.join(', ') : undefined,
      wordCount,
      timeRequired: `PT${readingMinutes}M`,
      image: [`${SITE_URL}${image.startsWith('http') ? '' : image}`],
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-ssagesage.png` },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: '블로그', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-[#FAF6F0] min-h-screen">
        <div className="max-w-[1500px] mx-auto lg:px-4">
          <div className="lg:flex lg:items-start lg:gap-6">
          <div className="hidden lg:block w-[250px] shrink-0" aria-hidden="true" />
            <div className="w-full lg:max-w-4xl lg:flex-1 lg:min-w-0">
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

              <article className="px-4 py-10 md:py-16">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B] hover:text-[#0ABAB5] transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          정보모음
        </Link>

        <header className="mb-10">
          <div className="text-4xl mb-4">{post.emoji || '📝'}</div>
          {categoryName && (
            <span className="inline-block text-[12px] bg-[#E6FAF9] text-[#0ABAB5] px-2.5 py-1 rounded-full mb-3 font-semibold">
              {categoryName}
            </span>
          )}
          <div className="mb-4 flex items-start justify-between gap-3">
            <h1 className="text-[24px] md:text-[28px] font-bold text-[#1E293B] leading-tight">
              {post.title}
            </h1>
            <BlogShareButton shortSlug={shortSlug} />
          </div>
          {post.description && (
            <p className="text-[15px] text-[#64748B] leading-relaxed mb-4">{post.description}</p>
          )}
          <div className="flex items-center gap-3 text-[12px] text-[#94A3B8]">
            <time>
              {new Date(post.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <span>·</span>
            <span>약 {readingMinutes}분 읽기</span>
            {post.affiliate_disclosure && (
              <>
                <span>·</span>
                <span>{AFFILIATE_DISCLOSURE_TEXT}</span>
              </>
            )}
          </div>
        </header>

        <hr className="border-[#E2E8F0] mb-10" />

        <div className="
          [&_.md-h1]:text-[22px] [&_.md-h1]:font-bold [&_.md-h1]:mt-10 [&_.md-h1]:mb-4 [&_.md-h1]:text-[#1E293B]
          [&_.md-h2]:text-[19px] [&_.md-h2]:font-bold [&_.md-h2]:mt-8 [&_.md-h2]:mb-3 [&_.md-h2]:text-[#1E293B]
          [&_.md-h3]:text-[17px] [&_.md-h3]:font-semibold [&_.md-h3]:mt-6 [&_.md-h3]:mb-2 [&_.md-h3]:text-[#1E293B]
          [&_.md-p]:text-[#1E293B] [&_.md-p]:leading-[1.9] [&_.md-p]:mb-5 [&_.md-p]:text-[15px]
          [&_.md-link]:text-[#0ABAB5] [&_.md-link]:underline [&_.md-link]:underline-offset-2
          [&_.md-coupang-btn]:inline-flex [&_.md-coupang-btn]:items-center [&_.md-coupang-btn]:justify-center [&_.md-coupang-btn]:rounded-xl [&_.md-coupang-btn]:bg-[#ff6b35] [&_.md-coupang-btn]:px-3 [&_.md-coupang-btn]:py-1.5 [&_.md-coupang-btn]:text-[12px] [&_.md-coupang-btn]:font-bold [&_.md-coupang-btn]:text-white [&_.md-coupang-btn]:no-underline [&_.md-coupang-btn]:shadow-sm [&_.md-coupang-btn]:hover:bg-[#ff5a1f]
          [&_.md-coupang-btn-lg]:my-3 [&_.md-coupang-btn-lg]:w-full [&_.md-coupang-btn-lg]:py-3 [&_.md-coupang-btn-lg]:text-[15px]
          [&_.md-startbox]:my-6 [&_.md-startbox]:rounded-2xl [&_.md-startbox]:border [&_.md-startbox]:border-emerald-200 [&_.md-startbox]:bg-emerald-50/70 [&_.md-startbox]:px-4 [&_.md-startbox]:py-4
          [&_.md-startbox-title]:mb-2 [&_.md-startbox-title]:text-[15px] [&_.md-startbox-title]:font-bold [&_.md-startbox-title]:text-emerald-800
          [&_.md-startbox-list]:space-y-1.5
          [&_.md-startbox-item]:flex [&_.md-startbox-item]:items-start [&_.md-startbox-item]:gap-2 [&_.md-startbox-item]:text-[14px] [&_.md-startbox-item]:text-emerald-900
          [&_.md-startbox-check]:mt-0.5 [&_.md-startbox-check]:text-emerald-600
          [&_.md-figure]:my-6 [&_.md-figure]:flex [&_.md-figure]:flex-col [&_.md-figure]:items-center
          [&_.md-img]:rounded-xl [&_.md-img]:my-2 [&_.md-img]:max-w-full
          [&_.md-figcaption]:mt-2 [&_.md-figcaption]:text-center [&_.md-figcaption]:text-[13px] [&_.md-figcaption]:text-[#64748B]
          [&_.md-quote]:border-l-4 [&_.md-quote]:border-[#0ABAB5] [&_.md-quote]:pl-5 [&_.md-quote]:text-[#64748B] [&_.md-quote]:italic [&_.md-quote]:my-6 [&_.md-quote]:bg-[#E6FAF9] [&_.md-quote]:py-3 [&_.md-quote]:pr-4 [&_.md-quote]:rounded-r-lg
          [&_.md-ul]:list-disc [&_.md-ul]:pl-6 [&_.md-ul]:my-5
          [&_.md-li]:text-[#1E293B] [&_.md-li]:mb-2 [&_.md-li]:leading-[1.8]
          [&_.md-codeblock]:bg-[#1E293B] [&_.md-codeblock]:text-[#86EFAC] [&_.md-codeblock]:p-5 [&_.md-codeblock]:rounded-xl [&_.md-codeblock]:overflow-x-auto [&_.md-codeblock]:text-sm [&_.md-codeblock]:my-6
          [&_.md-inline-code]:bg-[#FAF6F0] [&_.md-inline-code]:text-[#FF6B6B] [&_.md-inline-code]:px-1.5 [&_.md-inline-code]:py-0.5 [&_.md-inline-code]:rounded [&_.md-inline-code]:text-sm [&_.md-inline-code]:font-mono
          [&_.md-hr]:border-[#E2E8F0] [&_.md-hr]:my-8
          [&_.md-table-wrap]:my-6 [&_.md-table-wrap]:overflow-x-auto [&_.md-table-wrap]:rounded-xl [&_.md-table-wrap]:border [&_.md-table-wrap]:border-[#E2E8F0]
          [&_.md-table]:w-full [&_.md-table]:min-w-[560px] [&_.md-table]:border-collapse [&_.md-table]:text-[14px]
          [&_.md-table_th]:bg-[#FFF9E6] [&_.md-table_th]:text-left [&_.md-table_th]:text-[#334155] [&_.md-table_th]:font-semibold [&_.md-table_th]:px-4 [&_.md-table_th]:py-3 [&_.md-table_th]:border-b [&_.md-table_th]:border-[#E2E8F0]
          [&_.md-table_td]:px-4 [&_.md-table_td]:py-3 [&_.md-table_td]:text-[#1E293B] [&_.md-table_td]:border-b [&_.md-table_td]:border-[#F1F5F9]"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <footer className="mt-16 pt-8 border-t border-[#E2E8F0]">
          {relatedPosts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[16px] font-bold text-[#1E293B] mb-3">관련 글</h2>
              <ul className="grid gap-2 md:grid-cols-2">
                {relatedPosts.map((item) => (
                  <li key={item.id}>
                    <Link href={`/blog/${item.slug}`} className="text-[14px] text-[#0ABAB5] hover:underline">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/blog" className="inline-flex items-center gap-2 text-[14px] text-[#0ABAB5] font-semibold hover:underline transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            다른 글 더 보기
          </Link>
        </footer>
              </article>
            </div>

          <aside className="hidden lg:block w-[250px] shrink-0 pt-24 sticky top-24 self-start">
              <div>
                <CoupangSidebarBanner mode="desktop" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
