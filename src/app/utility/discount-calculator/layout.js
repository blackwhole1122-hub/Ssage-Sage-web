import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '할인율 계산기',
  description: '정가와 할인 가격을 입력하면 할인율과 절약 금액을 바로 계산할 수 있습니다.',
  path: '/utility/discount-calculator',
});

export default function DiscountCalculatorLayout({ children }) {
  return children;
}

