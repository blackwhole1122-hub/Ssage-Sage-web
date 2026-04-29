const SITE_NAME = '싸게사게';
const SITE_URL = 'https://www.ssagesage.com';

function compact(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncate(value = '', max = 155) {
  const v = compact(value);
  if (v.length <= max) return v;
  return `${v.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function buildBlogMeta({ title, description, fallbackText = '', path = '/blog' }) {
  const safeTitle = compact(title || '정보모음');
  const safeDescription = truncate(
    description || fallbackText || '실사용 기반의 구매 가이드와 비교 정보를 제공합니다.'
  );
  const canonical = `${SITE_URL}${path}`;
  return {
    title: `${safeTitle} | ${SITE_NAME} 블로그`,
    description: safeDescription,
    alternates: { canonical },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
    },
  };
}

export function buildThermometerMeta({ title, description, path }) {
  const safeTitle = compact(title || '핫딜온도계');
  const safeDescription = truncate(
    description || '상품별 가격 이력과 현재 시세를 기반으로 구매 타이밍 판단을 돕습니다.'
  );
  const canonical = `${SITE_URL}${path || '/hotdeal-thermometer'}`;
  return {
    title: `${safeTitle} | ${SITE_NAME}`,
    description: safeDescription,
    alternates: { canonical },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
    },
  };
}

export function buildUtilityMeta({ title, description, path }) {
  const safeTitle = compact(title || '유틸리티');
  const safeDescription = truncate(
    description || '구매 전 계산이 필요한 값을 빠르게 확인할 수 있는 실전 도구 모음입니다.'
  );
  const canonical = `${SITE_URL}${path || '/utility'}`;
  return {
    title: `${safeTitle} | ${SITE_NAME}`,
    description: safeDescription,
    alternates: { canonical },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
    },
  };
}

