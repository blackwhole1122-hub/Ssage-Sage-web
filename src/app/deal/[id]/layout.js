import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.ssagesage.com';
const SITE_NAME = '싸게사게';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function buildDescription(deal) {
  const price = normalizeText(deal?.price || '가격 확인');
  const shop = normalizeText(deal?.shop || '');
  const crawledAt = formatDateTime(deal?.crawled_at);
  const parts = [price];
  if (shop) parts.push(shop);
  if (crawledAt) parts.push(`${crawledAt} 수집`);
  return `${parts.join(' · ')}. 상품명, 가격, 구매 링크 등 실시간 핫딜 상세 정보를 제공합니다.`;
}

async function getDeal(id) {
  if (!supabaseUrl || !supabaseKey || !id) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('hotdeals')
    .select('id, title, price, shop, source, crawled_at, image')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const canonical = `${SITE_URL}/deal/${id}`;
  const deal = await getDeal(id);

  if (!deal) {
    return {
      title: '핫딜 상세',
      description: '실시간 핫딜 상세 정보를 확인하세요.',
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const baseTitle = normalizeText(deal.title || '핫딜 상세');
  const title = `${baseTitle} | 핫딜 가격/출처 정리`;
  const description = buildDescription(deal);
  const ogImage = normalizeText(deal.image || '/og-image.png');

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function DealLayout({ children }) {
  return children;
}
