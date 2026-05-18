import { COUPANG_SECTION_ENABLED } from '@/lib/siteSections';

export const metadata = COUPANG_SECTION_ENABLED
  ? {}
  : {
      robots: {
        index: false,
        follow: false,
      },
    };

export default function CoupangLayout({ children }) {
  return children;
}
