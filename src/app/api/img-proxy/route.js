/**
 * /api/img-proxy/route.js
 * 핫링크 차단 이미지 프록시
 * 사용: <img src="/api/img-proxy?url=ENCODED_URL&ref=bbs.ruliweb.com" />
 *
 * 루리웹(i1/i2/i3.ruliweb.com) 등 Referer 기반 핫링크 차단 이미지를
 * 서버에서 올바른 Referer로 가져와 클라이언트에 전달합니다.
 */

export const runtime = 'edge'; // Vercel Edge Runtime 사용 (빠른 응답)

// 허용할 이미지 도메인 화이트리스트 (보안: 임의 URL 프록시 방지)
const ALLOWED_DOMAINS = [
  'i1.ruliweb.com',
  'i2.ruliweb.com',
  'i3.ruliweb.com',
  'img.ruliweb.com',
  'cdn.ruliweb.com',
  'ac-p1.namu.la',
  'ac-o.namu.la',
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const referer  = searchParams.get('ref') || '';

  // 파라미터 검증
  if (!imageUrl) {
    return new Response('url 파라미터 필요', { status: 400 });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(decodeURIComponent(imageUrl));
  } catch {
    return new Response('잘못된 URL', { status: 400 });
  }

  // 화이트리스트 도메인만 허용
  const hostname = parsedUrl.hostname;
  if (!ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
    return new Response('허용되지 않는 도메인', { status: 403 });
  }

  try {
    const upstream = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': referer
          ? (referer.startsWith('http') ? referer : `https://${referer}`)
          : `https://${hostname}`,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!upstream.ok) {
      return new Response(`업스트림 오류: ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const contentType = upstream.headers.get('Content-Type') || 'image/jpeg';
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(`프록시 오류: ${err.message}`, { status: 502 });
  }
}
