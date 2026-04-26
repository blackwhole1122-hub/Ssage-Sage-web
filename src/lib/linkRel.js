export function isCoupangLink(href = '') {
  const value = String(href || '').trim();
  if (!value) return false;

  try {
    const parsed = new URL(value, 'https://example.com');
    if (parsed.origin === 'https://example.com' && value.startsWith('/')) return false;
    const host = parsed.hostname.toLowerCase();

    return (
      host === 'coupang.com' ||
      host.endsWith('.coupang.com') ||
      host === 'coupangpartners.com' ||
      host.endsWith('.coupangpartners.com') ||
      host === 'coupa.ng' ||
      host.endsWith('.coupa.ng')
    );
  } catch {
    return false;
  }
}

export function buildExternalRel(href = '') {
  return isCoupangLink(href) ? 'noopener noreferrer sponsored' : 'noopener noreferrer';
}
