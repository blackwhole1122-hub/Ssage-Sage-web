'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { classifyClickEvent, trackLinkClick, trackPageView } from '@/lib/clientAnalytics';

function shouldSkipPath(pathname = '') {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/');
}

export default function SiteAnalyticsTracker() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const search = useMemo(() => (searchParams ? `?${searchParams.toString()}` : ''), [searchParams]);

  useEffect(() => {
    if (!pathname || shouldSkipPath(pathname)) return;
    trackPageView(pathname, search);
  }, [pathname, search]);

  useEffect(() => {
    if (!pathname || shouldSkipPath(pathname)) return;

    const onClick = (event) => {
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      const absoluteHref = new URL(href, window.location.origin).toString();
      const eventName = classifyClickEvent(absoluteHref, window.location.hostname);
      if (!eventName) return;

      trackLinkClick({
        href: absoluteHref,
        eventName,
        pathname: window.location.pathname,
      });
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  return null;
}

