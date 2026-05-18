import {
  COUPANG_SECTION_ENABLED,
  DEALS_SECTION_ENABLED,
  UTILITY_SECTION_ENABLED,
} from '@/lib/siteSections';

export async function GET() {
  const hiddenSections = [];

  if (!DEALS_SECTION_ENABLED) {
    hiddenSections.push('Disallow: /hotdeals/');
    hiddenSections.push('Disallow: /deal/');
  }

  if (!COUPANG_SECTION_ENABLED) {
    hiddenSections.push('Disallow: /coupang/');
  }

  if (!UTILITY_SECTION_ENABLED) {
    hiddenSections.push('Disallow: /utility/');
  }

  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
${hiddenSections.join('\n')}

Sitemap: https://www.ssagesage.com/sitemap.xml
Sitemap: https://www.ssagesage.com/feed.xml

#DaumWebMasterTool:b406f2aa13544fed4eeac9556ff20624eaeefa7dd4db9058a09671a24d25a9f3:krAfvsEJbH4dof6+UYGOfA==`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
