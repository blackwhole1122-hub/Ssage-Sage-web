export function isNumericId(value) {
  const raw = String(value ?? '').trim();
  return /^\d+$/.test(raw);
}

export function encodeBlogShortSlug(postId) {
  const raw = String(postId ?? '').trim();
  if (!isNumericId(raw)) return null;
  const num = Number(raw);
  if (!Number.isSafeInteger(num) || num < 0) return null;
  return num.toString(36);
}

export function decodeBlogShortSlug(slug) {
  const raw = String(slug ?? '').trim().toLowerCase();
  if (!/^[0-9a-z]+$/.test(raw)) return null;
  const num = parseInt(raw, 36);
  if (!Number.isSafeInteger(num) || num < 0) return null;
  return num;
}

export function buildBlogShortUrl(slug, origin = '') {
  if (!slug) return '';
  const safeOrigin = String(origin || '').replace(/\/+$/, '');
  return safeOrigin ? `${safeOrigin}/s/${slug}` : `/s/${slug}`;
}

