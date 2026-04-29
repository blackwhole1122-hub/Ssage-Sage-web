import { createClient } from '@supabase/supabase-js';
import { buildThermometerMeta } from '@/lib/seoTemplates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getGroup(slug) {
  if (!slug || !supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('keyword_groups')
    .select('slug, group_name')
    .eq('slug', slug)
    .maybeSingle();
  return data || null;
}

export async function generateMetadata({ params }) {
  const { group } = await params;
  const row = await getGroup(group);
  const title = row?.group_name ? `${row.group_name} 가격이력` : '핫딜온도계 상세';
  const description = row?.group_name
    ? `${row.group_name}의 가격 이력과 현재 시세를 확인하고 구매 타이밍을 판단해보세요.`
    : '상품별 가격 이력과 현재 시세를 확인해보세요.';

  return buildThermometerMeta({
    title,
    description,
    path: `/hotdeal-thermometer/${group}`,
  });
}

export default function ThermometerGroupLayout({ children }) {
  return children;
}

