import { createClient } from '@supabase/supabase-js';
import HotdealsClient from './HotdealsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  return (
    <HotdealsClient
      initialDeals={initialDeals}
      initialCategory={initialCategory}
      initialSource={initialSource}
      initialQuery={initialQuery}
    />
  );
}
