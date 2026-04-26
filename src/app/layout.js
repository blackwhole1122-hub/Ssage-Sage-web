import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import SiteAnalyticsTracker from '@/components/SiteAnalyticsTracker';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const SITE_URL = 'https://www.ssagesage.com';
const SITE_NAME = '싸게사게';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | 실시간 핫딜 모음과 가격 분석`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    '커뮤니티 핫딜, 쿠팡딜, 가격비교 도구를 한 곳에서 확인하는 절약 플랫폼입니다.',
  keywords: ['핫딜', '최저가', '가격비교', '쿠팡', '절약', '싸게사게'],
  icons: { icon: '/favicon.ico' },
  verification: {
    google: 'AlYaCKTyHzy8ufh7Fp9WB1vUw53b-SzuLTPxuulrKnE',
    other: { 'naver-site-verification': '4e8e9141f9ec9d45577433029e1c20c21d56fd0f' },
  },
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME} | 핫딜 모음 & 가격 분석`,
    description: '지금 뜨는 핫딜과 가격 흐름을 빠르게 확인해보세요.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | 핫딜 모음 & 가격 분석`,
    description: '지금 뜨는 핫딜과 가격 흐름을 빠르게 확인해보세요.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <SiteAnalyticsTracker />
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
