'use client';

import { useMemo, useState } from 'react';
import { buildBlogShortUrl } from '@/lib/shortLinks';

export default function BlogShareButton({ shortSlug }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const shortUrl = useMemo(() => {
    if (!shortSlug) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return buildBlogShortUrl(shortSlug, origin);
  }, [shortSlug]);

  async function handleCopy() {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setCopyError('');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError('복사 실패');
      setTimeout(() => setCopyError(''), 1800);
    }
  }

  if (!shortSlug) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-9 items-center rounded-full border border-[#D1D5DB] bg-white px-3 text-[12px] font-semibold text-[#334155] hover:border-[#0ABAB5] hover:text-[#0ABAB5] transition-colors"
      title={shortUrl || '공유 링크 생성 불가'}
    >
      {copied ? '복사됨' : copyError || '공유'}
    </button>
  );
}

