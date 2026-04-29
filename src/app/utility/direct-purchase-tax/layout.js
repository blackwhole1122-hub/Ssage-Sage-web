import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '해외직구 세금 계산기',
  description: '직구 금액 기준으로 관부가세를 계산해 실 결제 총액을 미리 확인하세요.',
  path: '/utility/direct-purchase-tax',
});

export default function DirectPurchaseTaxLayout({ children }) {
  return children;
}

