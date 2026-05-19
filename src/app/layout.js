import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import SiteAnalyticsTracker from '@/components/SiteAnalyticsTracker';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const SITE_URL = 'https://www.ssagesage.com';
const SITE_NAME = '현명한 소비를 위한 생활정보';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
  keywords: ['구매가이드', '가격비교', '할인정보', '생활정보', SITE_NAME],
  icons: { icon: '/favicon.ico' },
  verification: {
    google: 'AlYaCKTyHzy8ufh7Fp9WB1vUw53b-SzuLTPxuulrKnE',
    other: { 'naver-site-verification': '4e8e9141f9ec9d45577433029e1c20c21d56fd0f' },
  },
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_NAME,
    description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
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
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-ssagesage.png`,
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
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
