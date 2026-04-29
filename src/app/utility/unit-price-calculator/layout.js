import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '단위가격 계산기',
  description: '용량과 가격을 입력해 10g, 100g, 1kg 또는 10ml, 100ml, 1L 기준 단가를 비교하세요.',
  path: '/utility/unit-price-calculator',
});

export default function UnitPriceCalculatorLayout({ children }) {
  return children;
}

