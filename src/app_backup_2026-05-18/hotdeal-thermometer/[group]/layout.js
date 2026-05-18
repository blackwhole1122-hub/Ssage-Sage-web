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
  const keyword = row?.group_name ? String(row.group_name).trim() : '';

  const title = keyword
    ? `${keyword} 가격 이력·최저가 추이`
    : '핫딜온도계 상세';

  const description = keyword
    ? `${keyword} 가격이 평소보다 싼지 핫딜온도계로 확인하세요. 최근 가격, 평균가, 최저가를 비교해 진짜 핫딜인지 확인할 수 있습니다.`
    : '상품 가격이 평소보다 싼지 핫딜온도계로 확인하세요. 최근 가격, 평균가, 최저가를 비교해 진짜 핫딜인지 확인할 수 있습니다.';

  return buildThermometerMeta({
    title,
    description,
    path: `/hotdeal-thermometer/${group}`,
  });
}

export default function ThermometerGroupLayout({ children }) {
  return children;
}
