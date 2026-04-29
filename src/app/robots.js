// src/app/robots.js
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: [
      'https://www.ssagesage.com/sitemap.xml',
      'https://www.ssagesage.com/feed.xml',
    ],
  };
}
