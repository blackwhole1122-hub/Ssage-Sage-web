import { UTILITY_SECTION_ENABLED } from '@/lib/siteSections';

export const metadata = UTILITY_SECTION_ENABLED
  ? {}
  : {
      robots: {
        index: false,
        follow: false,
      },
    };

export default function UtilityLayout({ children }) {
  return children;
}
