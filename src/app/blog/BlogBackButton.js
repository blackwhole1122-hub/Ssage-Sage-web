'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function BlogBackButton() {
  const [referrer, setReferrer] = useState('/blog');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = sessionStorage.getItem('blogListUrl');
      if (savedUrl) {
        setReferrer(savedUrl);
      }
    }
  }, []);

  return (
    <Link
      href={referrer}
      className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B] hover:text-[#0ABAB5] transition-colors mb-8"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      현명한 소비를 위한 생활정보
    </Link>
  );
}
