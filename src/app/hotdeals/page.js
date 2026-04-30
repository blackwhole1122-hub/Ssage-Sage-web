import { createClient } from '@supabase/supabase-js';
import HotdealsClient from './HotdealsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.ssagesage.com';

export const metadata = {
  title: '실시간 핫딜 모음 | 커뮤니티 특가/최저가 탐색',
  description:
    '커뮤니티 실시간 핫딜을 한곳에서 모아보고 가격, 출처, 상품 정보를 빠르게 확인하세요.',
  alternates: { canonical: `${SITE_URL}/hotdeals` },
  openGraph: {
    title: '실시간 핫딜 모음 | 커뮤니티 특가/최저가 탐색',
    description:
      '커뮤니티 실시간 핫딜을 한곳에서 모아보고 가격, 출처, 상품 정보를 빠르게 확인하세요.',
    url: `${SITE_URL}/hotdeals`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '실시간 핫딜 모음 | 커뮤니티 특가/최저가 탐색',
    description:
      '커뮤니티 실시간 핫딜을 한곳에서 모아보고 가격, 출처, 상품 정보를 빠르게 확인하세요.',
  },
};

async function getInitialDeals({ sourceFilter, searchQuery }) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let query = supabase
    .from('hotdeals')
    .select('*')
    .neq('source', 'zod')
    .order('crawled_at', { ascending: false })
    .range(0, 19);

  if (sourceFilter && sourceFilter !== '전체') query = query.eq('source', sourceFilter);
  if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export default async function HotdealsPage({ searchParams }) {
  const params = await searchParams;
  const initialCategory = typeof params?.category === 'string' ? params.category : '전체';
  const initialSource = typeof params?.source === 'string' ? params.source : '전체';
  const initialQuery = typeof params?.q === 'string' ? params.q : '';
  const initialDeals = await getInitialDeals({ sourceFilter: initialSource, searchQuery: initialQuery });
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '실시간 핫딜 목록',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: initialDeals.length,
    itemListElement: initialDeals.map((deal, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/deal/${deal.id}`,
      name: deal.title || '핫딜',
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <HotdealsClient
        initialDeals={initialDeals}
        initialCategory={initialCategory}
        initialSource={initialSource}
        initialQuery={initialQuery}
      />
    </>
  );
}
