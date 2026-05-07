export const DEALS_SECTION_ENABLED = false;
export const COUPANG_SECTION_ENABLED = false;
export const UTILITY_SECTION_ENABLED = false;
export const DEFAULT_PUBLIC_LANDING = '/hotdeal-thermometer';

const PRIMARY_NAV_LINKS = [
  {
    key: 'hotdeals',
    href: '/hotdeals',
    label: '핫딜모음',
    enabled: DEALS_SECTION_ENABLED,
  },
  {
    key: 'coupang',
    href: '/coupang',
    label: '쿠팡핫딜',
    enabled: COUPANG_SECTION_ENABLED,
  },
  {
    key: 'thermometer',
    href: '/hotdeal-thermometer',
    label: '핫딜온도계',
    enabled: true,
  },
  {
    key: 'blog',
    href: '/blog',
    label: '정보모음',
    enabled: true,
  },
  {
    key: 'utility',
    href: '/utility',
    label: '유틸리티',
    enabled: UTILITY_SECTION_ENABLED,
  },
];

export function getPrimaryNavLinks() {
  return PRIMARY_NAV_LINKS.filter((item) => item.enabled);
}
