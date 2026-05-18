import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '중복할인 계산기',
  description: '쿠폰, 카드 즉시할인, 포인트를 순서대로 적용해 최종 결제금액과 총 할인율을 계산하세요.',
  path: '/utility/coupon-stack-calculator',
});

export default function CouponStackCalculatorLayout({ children }) {
  return children;
}

