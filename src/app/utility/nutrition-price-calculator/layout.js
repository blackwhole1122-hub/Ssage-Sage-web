import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '영양성분 단가 계산기',
  description: '단백질, 탄수화물, 지방 등 영양성분 1g당 가격을 계산해 가성비를 비교하세요.',
  path: '/utility/nutrition-price-calculator',
});

export default function NutritionPriceCalculatorLayout({ children }) {
  return children;
}

