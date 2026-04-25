'use client';

import { useEffect, useRef, useState } from 'react';

function getBannerSize(containerWidth, fillWidth, preset) {
  if (preset === 'wide70') {
    const baseWidth = 864;
    const baseHeight = 70;
    const width = Math.max(320, Math.min(baseWidth, Math.round(containerWidth || baseWidth)));
    const height = Math.max(36, Math.round((width / baseWidth) * baseHeight));
    return { width, height };
  }

  const width = fillWidth
    ? Math.max(320, Math.round(containerWidth || 0))
    : Math.max(320, Math.min(760, Math.round((containerWidth || 0) * 0.72)));
  const height = Math.max(90, Math.min(150, Math.round(width * 0.22)));
  return { width, height };
}

export default function CoupangInlineHorizontalBanner({ fillWidth = false, preset = 'default' }) {
  const wrapperRef = useRef(null);
  const slotRef = useRef(null);
  const renderTokenRef = useRef(0);
  const [size, setSize] = useState(null);

  useEffect(() => {
    const update = () => {
      const width = wrapperRef.current?.clientWidth || 320;
      setSize(getBannerSize(width, fillWidth, preset));
    };

    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [fillWidth, preset]);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || !size) return;

    const token = ++renderTokenRef.current;

    slot.innerHTML = '';

    const externalScript = document.createElement('script');
    externalScript.src = 'https://ads-partners.coupang.com/g.js';
    externalScript.async = true;

    const inlineScript = document.createElement('script');
    inlineScript.text = `
      new PartnersCoupang.G({
        id: ${preset === 'wide70' ? 983844 : 983816},
        template: "carousel",
        trackingCode: "AF9495324",
        width: "${size.width}",
        height: "${size.height}",
        tsource: ""
      });
    `;

    externalScript.onload = () => {
      if (renderTokenRef.current !== token) return;
      slot.appendChild(inlineScript);
    };

    slot.appendChild(externalScript);

    return () => {
      slot.innerHTML = '';
    };
  }, [size?.width, size?.height]);

  if (!size) return null;

  return (
    <div className="mt-6" ref={wrapperRef}>
      <div
        className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
        style={{ width: '100%', maxWidth: fillWidth ? 'none' : `${size.width}px`, height: `${size.height}px` }}
      >
        <div ref={slotRef} style={{ width: `${size.width}px`, height: `${size.height}px` }} />
      </div>
      <p className="mt-2 text-center text-[11px] text-[#64748B]">
        이 배너는 제휴 활동의 일환으로 일정액의 수수료를 제공받습니다
      </p>
    </div>
  );
}
