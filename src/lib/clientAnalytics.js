'use client';

import { isCoupangLink } from '@/lib/linkRel';

const SESSION_KEY = 'ss_session_id';
const ATTRIBUTION_KEY = 'ss_attr';

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const key = `${name}=`;
  const found = document.cookie.split(';').map((v) => v.trim()).find((part) => part.startsWith(key));
  return found ? decodeURIComponent(found.slice(key.length)) : '';
}

function isSearchReferrer(hostname = '') {
  return (
    hostname.includes('google.') ||
    hostname.includes('naver.') ||
    hostname.includes('daum.') ||
    hostname.includes('bing.') ||
    hostname.includes('yahoo.')
  );
}

export function detectPageType(pathname = '') {
  if (!pathname) return 'unknown';
  if (pathname.startsWith('/blog/')) return 'blog_post';
  if (pathname === '/blog') return 'blog_list';
  if (pathname.startsWith('/deal/')) return 'hotdeal_detail';
  if (pathname.startsWith('/hotdeals')) return 'hotdeals';
  if (pathname.startsWith('/coupang/')) return 'product_detail';
  if (pathname === '/coupang') return 'product_list';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/utility')) return 'utility';
  return 'page';
}

export function getOrCreateSessionId() {
  if (typeof window === 'undefined') return '';
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const generated = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(SESSION_KEY, generated);
  return generated;
}

export function resolveAttribution(pathname = '', search = '') {
  if (typeof window === 'undefined') {
    return { source: 'direct', medium: 'none', campaign: '', referrer: '', shortSlug: '' };
  }

  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}');
  } catch {
    stored = {};
  }

  const params = new URLSearchParams(search || window.location.search || '');
  const utmSource = params.get('utm_source') || '';
  const utmMedium = params.get('utm_medium') || '';
  const utmCampaign = params.get('utm_campaign') || '';
  const shortSlug = readCookie('ss_short_slug') || stored.shortSlug || '';

  let source = utmSource || stored.source || 'direct';
  let medium = utmMedium || stored.medium || 'none';
  let campaign = utmCampaign || stored.campaign || '';
  let referrer = stored.referrer || '';

  if (typeof document !== 'undefined' && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      const currentHost = window.location.hostname;
      if (ref.hostname && ref.hostname !== currentHost) {
        source = utmSource || ref.hostname;
        medium = utmMedium || (isSearchReferrer(ref.hostname) ? 'organic' : 'referral');
        referrer = ref.href;
      }
    } catch {
      // ignore invalid referrer URL
    }
  }

  const nextState = { source, medium, campaign, referrer, shortSlug };
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(nextState));
  return nextState;
}

export function sendAnalyticsEvent(payload) {
  if (typeof window === 'undefined') return;
  const data = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
      return;
    }
  } catch {
    // fallback to fetch
  }

  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
    keepalive: true,
  }).catch(() => {});
}

export function trackPageView(pathname = '', search = '') {
  const sessionId = getOrCreateSessionId();
  const attr = resolveAttribution(pathname, search);
  sendAnalyticsEvent({
    eventName: 'page_view',
    sessionId,
    pagePath: pathname,
    pageType: detectPageType(pathname),
    source: attr.source,
    medium: attr.medium,
    campaign: attr.campaign,
    referrer: attr.referrer,
    shortSlug: attr.shortSlug,
  });
}

export function trackLinkClick({ href = '', eventName = 'link_click', pathname = '', metadata = {} }) {
  const sessionId = getOrCreateSessionId();
  const attr = resolveAttribution(pathname, typeof window !== 'undefined' ? window.location.search : '');
  sendAnalyticsEvent({
    eventName,
    sessionId,
    pagePath: pathname,
    pageType: detectPageType(pathname),
    targetUrl: href,
    source: attr.source,
    medium: attr.medium,
    campaign: attr.campaign,
    referrer: attr.referrer,
    shortSlug: attr.shortSlug,
    metadata,
  });
}

export function classifyClickEvent(href, currentHost = '') {
  try {
    const parsed = new URL(href);
    if (parsed.hostname !== currentHost) {
      return isCoupangLink(parsed.href) ? 'coupang_click' : 'external_click';
    }
    if (parsed.pathname.startsWith('/deal/') || parsed.pathname.startsWith('/coupang/')) {
      return 'product_click';
    }
    return 'internal_click';
  } catch {
    return '';
  }
}

