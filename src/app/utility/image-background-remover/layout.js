import { buildUtilityMeta } from '@/lib/seoTemplates';

export const metadata = buildUtilityMeta({
  title: '이미지 배경 제거',
  description: '상품 이미지를 업로드해 배경을 자동 제거하고 깔끔한 컷을 빠르게 만들 수 있습니다.',
  path: '/utility/image-background-remover',
});

export default function ImageBackgroundRemoverLayout({ children }) {
  return children;
}

