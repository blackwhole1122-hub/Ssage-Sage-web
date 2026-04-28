'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { buildExternalRel } from '@/lib/linkRel';

/*
  선택 기능(DB 저장까지 하려면 blog_posts에 아래 컬럼이 있으면 가장 좋습니다)
  - thumbnail_url text
  - og_image_url text
  - tags text[]   (또는 text 로 바꿔서 직접 처리)
  - affiliate_disclosure boolean

  이 코드는 위 컬럼이 없어도 저장 자체가 깨지지 않도록
  "기본 필드로 자동 재시도" fallback을 넣어두었습니다.
*/

const TOOLBAR = [
  { label: 'B', wrap: ['**', '**'], title: '굵게' },
  { label: 'I', wrap: ['*', '*'], title: '기울임' },
  { label: 'S', wrap: ['~~', '~~'], title: '취소선' },
  { label: 'H2', prefix: '## ', title: '제목2' },
  { label: 'H3', prefix: '### ', title: '제목3' },
  { label: 'H4', prefix: '#### ', title: '제목4' },
  { label: '`', wrap: ['`', '`'], title: '인라인 코드' },
  {
    label: '{ }',
    block: '```js\nconsole.log(\'hello\')\n```',
    title: '코드블록',
  },
  { label: '•', prefix: '- ', title: '목록' },
  { label: '1.', prefix: '1. ', title: '번호 목록' },
  { label: '☑', prefix: '- [ ] ', title: '체크리스트' },
  { label: '💬', prefix: '> ', title: '인용' },
  {
    label: '표',
    block: '| 항목 | 내용 |\n| --- | --- |\n| 예시 | 값 |',
    title: '표',
  },
  { label: '---', line: '---', title: '구분선' },
];

const EMOJIS = ['📝', '🔥', '💡', '🎉', '🚀', '📦', '🛒', '💰', '⚡', '🎯', '📊', '🔧', '✨', '🌟', '📌', '🏷️'];

const SEO_CHECK_KEYS = [
  'title',
  'description',
  'slug',
  'content',
  'headings',
  'internal-links',
  'external-links',
  'images',
  'alt-length',
  'alt-duplicate',
  'alt-filename',
  'keyword-input',
  'keyword-title',
  'keyword-description',
  'keyword-first-paragraph',
  'keyword-heading',
  'tags',
];

const DEFAULT_SEO_WEIGHTS = Object.freeze({
  title: 8,
  description: 8,
  slug: 6,
  content: 7,
  headings: 6,
  'internal-links': 5,
  'external-links': 5,
  images: 6,
  'alt-length': 5,
  'alt-duplicate': 4,
  'alt-filename': 4,
  'keyword-input': 3,
  'keyword-title': 8,
  'keyword-description': 7,
  'keyword-first-paragraph': 7,
  'keyword-heading': 6,
  tags: 3,
});

function createDefaultSeoWeights() {
  return { ...DEFAULT_SEO_WEIGHTS };
}

function normalizeSeoWeights(weightMap) {
  return SEO_CHECK_KEYS.reduce((acc, key) => {
    const raw = Number(weightMap?.[key]);
    const fallback = DEFAULT_SEO_WEIGHTS[key] ?? 1;
    acc[key] = Number.isFinite(raw) && raw >= 0 ? Math.min(10, Math.round(raw)) : fallback;
    return acc;
  }, {});
}

function getSeoWeightValue(weightMap, key) {
  const raw = Number(weightMap?.[key]);
  const fallback = DEFAULT_SEO_WEIGHTS[key] ?? 1;
  return Number.isFinite(raw) && raw >= 0 ? Math.min(10, Math.round(raw)) : fallback;
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateSlug(text = '') {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function slugifyText(text = '') {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toLocalDateTimeValue(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toUtcISOString(localDateTimeString) {
  if (!localDateTimeString) return null;
  return new Date(localDateTimeString).toISOString();
}

function removeMarkdown(md = '') {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`.*?`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*|__|\*|_|~~/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

function getTextStats(content = '') {
  const text = removeMarkdown(content);
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(words / 220));

  return { text, chars, charsNoSpace, words, readingMinutes };
}

function parseMarkdownAssets(content = '') {
  const tokenRegex = /!?\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  const links = [];
  const images = [];

  for (const match of content.matchAll(tokenRegex)) {
    const token = match[0] || '';
    const text = (match[1] || '').trim();
    const url = (match[2] || '').trim();
    const caption = (match[3] || '').trim();

    if (!url) continue;

    if (token.startsWith('![')) {
      images.push({ alt: text, url, caption });
      continue;
    }

    const lowerUrl = url.toLowerCase();
    const isExternal = /^https?:\/\//.test(lowerUrl) || lowerUrl.startsWith('//');
    const isInternal = !isExternal;
    links.push({ url, isInternal, isExternal });
  }

  return { links, images };
}

function normalizeAltText(value = '') {
  return value
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9가-힣\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFileBaseName(url = '') {
  if (!url) return '';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segment = cleanUrl.split('/').pop() || '';
    return decodeURIComponent(segment).replace(/\.[^.]+$/, '').trim();
  } catch {
    return url.split('?')[0].split('#')[0].split('/').pop()?.replace(/\.[^.]+$/, '').trim() || '';
  }
}

function parseStoredTags(raw) {
  if (Array.isArray(raw)) return raw.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof raw !== 'string') return [];
  const normalized = raw.trim().replace(/^\{/, '').replace(/\}$/, '');
  if (!normalized) return [];
  return normalized
    .split(',')
    .map((item) => item.replace(/^"+|"+$/g, '').trim())
    .filter(Boolean);
}

function hasCoupangLink(text = '') {
  return /(https?:\/\/)?([a-z0-9-]+\.)?(coupang\.com|link\.coupang\.com)\//i.test(String(text || ''));
}

function getLinkStats(links = []) {
  const internal = links.filter((item) => item.isInternal).length;
  const external = links.filter((item) => item.isExternal).length;
  return {
    total: links.length,
    internal,
    external,
  };
}

function getImageStats(images = []) {
  const total = images.length;
  const altValues = images.map((item) => (item.alt || '').trim());
  const withAlt = altValues.filter(Boolean).length;
  const filledAltValues = altValues.filter(Boolean);

  const tooShort = filledAltValues.filter((alt) => alt.length < 8).length;
  const tooLong = filledAltValues.filter((alt) => alt.length > 125).length;

  const normalizedAltMap = new Map();
  for (const alt of filledAltValues) {
    const key = normalizeAltText(alt);
    if (!key) continue;
    normalizedAltMap.set(key, (normalizedAltMap.get(key) || 0) + 1);
  }

  let duplicateAlt = 0;
  for (const count of normalizedAltMap.values()) {
    if (count > 1) duplicateAlt += count - 1;
  }

  const filenameLike = images.filter((item) => {
    const alt = normalizeAltText(item.alt || '');
    const fileName = normalizeAltText(getFileBaseName(item.url || ''));
    return alt && fileName && alt === fileName;
  }).length;

  return {
    total,
    withAlt,
    tooShort,
    tooLong,
    duplicateAlt,
    filenameLike,
  };
}

function extractFirstParagraphText(content = '') {
  const lines = content.split('\n');
  const parts = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (parts.length > 0) break;
      continue;
    }

    if (/^(#{1,6}\s|```|>|- |\* |\d+\.\s|!\[)/.test(line)) continue;
    parts.push(line);
  }

  return removeMarkdown(parts.join(' '));
}

function getSeoChecks({ title, description, slug, content, textStats, headingList, tags, focusKeyword }) {
  const normalizedTitle = (title || '').trim();
  const normalizedDescription = (description || '').trim();
  const normalizedSlug = (slug || '').trim();
  const normalizedTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const normalizedFocusKeyword = (focusKeyword || '').trim().toLowerCase();

  const assets = parseMarkdownAssets(content);
  const linkStats = getLinkStats(assets.links);
  const imageStats = getImageStats(assets.images);
  const firstParagraph = extractFirstParagraphText(content).toLowerCase();
  const headingText = headingList.map((item) => item.text || '').join(' ').toLowerCase();

  const keywordInTitle = normalizedFocusKeyword ? normalizedTitle.toLowerCase().includes(normalizedFocusKeyword) : false;
  const keywordInDescription = normalizedFocusKeyword ? normalizedDescription.toLowerCase().includes(normalizedFocusKeyword) : false;
  const keywordInFirstParagraph = normalizedFocusKeyword ? firstParagraph.includes(normalizedFocusKeyword) : false;
  const keywordInHeading = normalizedFocusKeyword ? headingText.includes(normalizedFocusKeyword) : false;

  const actionByKey = {
    title: '제목을 20~60자로 맞추고 핵심 키워드를 앞부분에 배치하세요.',
    description: '설명을 120~160자로 늘리고, 검색자가 얻을 이득을 한 문장으로 넣어주세요.',
    slug: 'slug는 짧고 명확하게, 공백 없이 하이픈(-)만 사용하세요.',
    content: `본문이 짧아요. 최소 ${Math.max(220 - textStats.words, 1)}단어 정도 추가해 핵심 정보를 보강하세요.`,
    headings: `H2/H3를 최소 ${Math.max(2 - headingList.length, 1)}개 더 추가해 문서 구조를 나누세요.`,
    'internal-links': '내 사이트의 관련 글/페이지로 내부 링크를 1개 이상 추가하세요.',
    'external-links': '공식 문서, 브랜드 페이지 같은 신뢰 가능한 외부 출처 링크를 1개 이상 추가하세요.',
    images: '모든 이미지에 alt를 작성하세요. alt는 이미지 내용을 설명하는 짧은 문장이어야 합니다.',
    'alt-length': 'alt 길이를 8~125자 범위로 맞추세요. 너무 짧거나 긴 alt를 수정하세요.',
    'alt-duplicate': '같은 alt를 반복하지 말고 이미지마다 다른 설명으로 바꿔주세요.',
    'alt-filename': '파일명 복붙 대신 실제 장면/의미를 설명하는 alt로 바꿔주세요.',
    'keyword-input': '포커스 키워드를 1개 지정하세요. 제목/설명/첫문단/헤딩 점검 기준이 됩니다.',
    'keyword-title': '포커스 키워드를 제목에 자연스럽게 1회 포함하세요.',
    'keyword-description': '포커스 키워드를 설명(메타 설명)에 1회 포함하세요.',
    'keyword-first-paragraph': '포커스 키워드를 첫 문단(초반 2~3문장) 안에 포함하세요.',
    'keyword-heading': 'H2/H3 중 최소 1개에 포커스 키워드(또는 매우 가까운 표현)를 넣으세요.',
    tags: '태그를 1개 이상 추가해 주제를 명확히 분류하세요.',
  };

  const priorityByKey = {
    title: 3,
    description: 3,
    slug: 2,
    content: 3,
    headings: 2,
    'internal-links': 2,
    'external-links': 2,
    images: 3,
    'alt-length': 1,
    'alt-duplicate': 1,
    'alt-filename': 1,
    'keyword-input': 3,
    'keyword-title': 3,
    'keyword-description': 2,
    'keyword-first-paragraph': 2,
    'keyword-heading': 2,
    tags: 1,
  };

  return [
    {
      key: 'title',
      label: 'SEO title length',
      detail: `${normalizedTitle.length} chars (target: 20-60)`,
      ok: normalizedTitle.length >= 20 && normalizedTitle.length <= 60,
    },
    {
      key: 'description',
      label: 'Meta description length',
      detail: `${normalizedDescription.length} chars (target: 120-160)`,
      ok: normalizedDescription.length >= 120 && normalizedDescription.length <= 160,
    },
    {
      key: 'slug',
      label: 'Slug quality',
      detail: normalizedSlug ? `/blog/${normalizedSlug}` : 'Slug is empty',
      ok: !!normalizedSlug && !/\s/.test(normalizedSlug) && normalizedSlug.length <= 80,
    },
    {
      key: 'content',
      label: 'Content length',
      detail: `${textStats.words} words (target: 220+)`,
      ok: textStats.words >= 220,
    },
    {
      key: 'headings',
      label: 'Headings (H2~H4)',
      detail: `${headingList.length} headings`,
      ok: headingList.length >= 2,
    },
    {
      key: 'internal-links',
      label: 'Internal links',
      detail: `${linkStats.internal} internal`,
      ok: linkStats.internal >= 1,
    },
    {
      key: 'external-links',
      label: 'External links',
      detail: `${linkStats.external} external`,
      ok: linkStats.external >= 1,
    },
    {
      key: 'images',
      label: 'Image alt coverage',
      detail: imageStats.total === 0 ? 'No images' : `${imageStats.withAlt}/${imageStats.total} with alt`,
      ok: imageStats.total > 0 && imageStats.withAlt === imageStats.total,
    },
    {
      key: 'alt-length',
      label: 'Alt length quality',
      detail: imageStats.total === 0
        ? 'No images'
        : `short ${imageStats.tooShort}, long ${imageStats.tooLong}`,
      ok: imageStats.total === 0 || (imageStats.tooShort === 0 && imageStats.tooLong === 0),
    },
    {
      key: 'alt-duplicate',
      label: 'Alt duplicate check',
      detail: imageStats.total === 0 ? 'No images' : `${imageStats.duplicateAlt} duplicates`,
      ok: imageStats.total === 0 || imageStats.duplicateAlt === 0,
    },
    {
      key: 'alt-filename',
      label: 'Alt filename check',
      detail: imageStats.total === 0 ? 'No images' : `${imageStats.filenameLike} filename-like alts`,
      ok: imageStats.total === 0 || imageStats.filenameLike === 0,
    },
    {
      key: 'keyword-input',
      label: 'Focus keyword',
      detail: normalizedFocusKeyword ? `"${focusKeyword}"` : 'Not set',
      ok: normalizedFocusKeyword.length > 0,
    },
    {
      key: 'keyword-title',
      label: 'Keyword in title',
      detail: keywordInTitle ? 'Included' : 'Missing',
      ok: !normalizedFocusKeyword || keywordInTitle,
    },
    {
      key: 'keyword-description',
      label: 'Keyword in description',
      detail: keywordInDescription ? 'Included' : 'Missing',
      ok: !normalizedFocusKeyword || keywordInDescription,
    },
    {
      key: 'keyword-first-paragraph',
      label: 'Keyword in first paragraph',
      detail: keywordInFirstParagraph ? 'Included' : 'Missing',
      ok: !normalizedFocusKeyword || keywordInFirstParagraph,
    },
    {
      key: 'keyword-heading',
      label: 'Keyword in headings',
      detail: keywordInHeading ? 'Included' : 'Missing',
      ok: !normalizedFocusKeyword || keywordInHeading,
    },
    {
      key: 'tags',
      label: 'Tags',
      detail: `${normalizedTags.length} tags`,
      ok: normalizedTags.length > 0,
    },
  ].map((item) => ({
    ...item,
    action: actionByKey[item.key] || '해당 항목을 보완해주세요.',
    priority: priorityByKey[item.key] || 1,
  }));
}

function getSeoSignalInfo(score) {
  if (score >= 80) return { label: 'GREEN', dot: 'bg-green-500', text: 'text-green-700', ring: 'ring-green-100' };
  if (score >= 60) return { label: 'AMBER', dot: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-100' };
  return { label: 'RED', dot: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-100' };
}

function formatInline(text = '') {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{width=(\d{1,3})%\})?/g, (_m, alt, src, _caption, width) => {
      const widthPercent = normalizeImageWidthPercent(width);
      const widthStyle = widthPercent ? `width:${widthPercent};` : 'width:auto;';
      return `<img alt="${alt}" src="${src}" data-preview-src="${src}" style="${widthStyle}max-width:min(100%,760px);height:auto;" class="preview-image my-4 rounded-2xl cursor-zoom-in border border-gray-200" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, linkText, href) => {
      const rel = buildExternalRel(href);
      return `<a href="${href}" target="_blank" rel="${rel}" class="text-blue-600 underline break-all">${linkText}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em]">$1</code>');
}

function normalizeImageWidthPercent(value = '') {
  const raw = String(value || '').replace('%', '').trim();
  if (!raw) return '';
  const num = Number(raw);
  if (!Number.isFinite(num)) return '';
  return `${Math.max(20, Math.min(100, Math.round(num)))}%`;
}

function parseMarkdownImageLine(line = '') {
  const match = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{width=(\d{1,3})%\})?$/);
  if (!match) return null;

  return {
    alt: match[1] || '',
    src: match[2] || '',
    caption: match[3] || '',
    widthPercent: normalizeImageWidthPercent(match[4] || ''),
  };
}

function renderImageFigure({ alt, src, caption, widthPercent }) {
  const safeAlt = escapeHtml(alt || '');
  const safeSrc = escapeHtml(src || '');
  const safeCaption = escapeHtml(caption || '');
  const imageWidthStyle = widthPercent ? `width:${widthPercent};` : 'width:auto;';

  return `
    <figure class="my-6 flex flex-col items-center">\n      <img alt="${safeAlt}" src="${safeSrc}" data-preview-src="${safeSrc}" style="${imageWidthStyle}max-width:min(100%,760px);height:auto;" class="preview-image rounded-2xl cursor-zoom-in border border-gray-200" />\n      ${safeCaption ? `<figcaption class="mt-2 text-center text-sm text-gray-500">${safeCaption}</figcaption>` : ''}\n    </figure>
  `;
}

function renderTable(block) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return `<p>${formatInline(block).replace(/\n/g, '<br />')}</p>`;

  const isTable =
    lines.every((line) => line.startsWith('|') && line.endsWith('|')) &&
    /^\|\s*[:-]+\s*(\|\s*[:-]+\s*)+\|$/.test(lines[1].replace(/---/g, '---'));

  if (!isTable) return `<p>${formatInline(block).replace(/\n/g, '<br />')}</p>`;

  const headers = lines[0].split('|').slice(1, -1).map((cell) => cell.trim());
  const rows = lines.slice(2).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

  return `
    <div class="my-4 overflow-x-auto rounded-2xl border border-gray-200">
      <table class="min-w-full border-collapse text-sm">
        <thead class="bg-gray-50">
          <tr>${headers.map((cell) => `<th class="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">${formatInline(cell)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr class="odd:bg-white even:bg-gray-50/50">${row.map((cell) => `<td class="border-b border-gray-100 px-4 py-3 align-top text-gray-700">${formatInline(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function markdownToHtml(md = '') {
  if (!md.trim()) return '<p class="text-gray-300">내용이 없습니다.</p>';

  let text = md.replace(/\r\n/g, '\n');
  const codeBlocks = [];

  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language = '', code = '') => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    const encoded = encodeURIComponent(code);

    codeBlocks.push(`
      <div class="group relative my-5 overflow-hidden rounded-2xl border border-gray-200 bg-[#0b1020]">
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-gray-300">
          <span>${escapeHtml(language || 'code')}</span>
          <button type="button" data-copy="${encoded}" class="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20">
            복사
          </button>
        </div>
        <pre class="overflow-x-auto p-4 text-sm leading-6 text-gray-100"><code>${escapeHtml(code)}</code></pre>
      </div>
    `);

    return token;
  });

  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  const html = blocks.map((block) => {
    const codeMatch = block.match(/^__CODE_BLOCK_(\d+)__$/);
    if (codeMatch) return codeBlocks[Number(codeMatch[1])];

    if (block === '---') return '<hr class="my-6 border-gray-200" />';

    const imageLines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (imageLines.length > 0) {
      const parsedImages = imageLines.map(parseMarkdownImageLine);
      if (parsedImages.every(Boolean)) {
        return parsedImages.map((image) => renderImageFigure(image)).join('');
      }
    }

    if (/^#{1,6}\s/.test(block)) {
      const level = Math.min(6, (block.match(/^#+/)?.[0].length || 1));
      const textOnly = block.replace(/^#{1,6}\s/, '').trim();
      const id = slugifyText(textOnly);
      return `<h${level} id="${id}" class="scroll-mt-24 font-bold text-gray-900 ${level === 1 ? 'text-3xl mt-8 mb-4' : level === 2 ? 'text-2xl mt-7 mb-3' : level === 3 ? 'text-xl mt-6 mb-3' : 'text-lg mt-5 mb-2'}">${formatInline(textOnly)}</h${level}>`;
    }

    if (/^(>\s?.+(\n>\s?.+)*)$/m.test(block)) {
      const body = block.replace(/^>\s?/gm, '').trim();
      return `<blockquote class="my-4 rounded-2xl border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-gray-700">${formatInline(body).replace(/\n/g, '<br />')}</blockquote>`;
    }

    if (/^(\|.+\|\n?)+$/m.test(block) && block.includes('\n| ---')) {
      return renderTable(block);
    }

    const checklistLines = block.split('\n');
    if (checklistLines.every((line) => /^- \[( |x)\] /.test(line.trim()))) {
      return `
        <ul class="my-4 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
          ${checklistLines.map((line) => {
            const checked = /^- \[x\]/.test(line.trim());
            const label = line.replace(/^- \[( |x)\]\s*/, '');
            return `<li class="flex items-start gap-3 text-gray-700"><span class="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${checked ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 bg-white text-transparent'}">✓</span><span>${formatInline(label)}</span></li>`;
          }).join('')}
        </ul>
      `;
    }

    if (checklistLines.every((line) => /^[-*]\s+/.test(line.trim()))) {
      return `
        <ul class="my-4 list-disc space-y-1 pl-6 text-gray-700">
          ${checklistLines.map((line) => `<li>${formatInline(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}
        </ul>
      `;
    }

    if (checklistLines.every((line) => /^\d+\.\s+/.test(line.trim()))) {
      return `
        <ol class="my-4 list-decimal space-y-1 pl-6 text-gray-700">
          ${checklistLines.map((line) => `<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}
        </ol>
      `;
    }

    return `<p class="my-3 text-gray-800 leading-7">${formatInline(block).replace(/\n/g, '<br />')}</p>`;
  }).join('');

  return html.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => codeBlocks[Number(index)] || '');
}

function extractHeadings(content = '') {
  return content
    .split('\n')
    .map((line) => {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (!match) return null;
      return {
        level: match[1].length,
        text: match[2].trim(),
        id: slugifyText(match[2].trim()),
      };
    })
    .filter(Boolean);
}

function buildSnapshot(form) {
  return JSON.stringify({
    title: form.title || '',
    slug: form.slug || '',
    description: form.description || '',
    content: form.content || '',
    emoji: form.emoji || '📝',
    published: !!form.published,
    categoryId: String(form.categoryId || ''),
    scheduledAt: form.scheduledAt || '',
    thumbnailUrl: form.thumbnailUrl || '',
    ogImageUrl: form.ogImageUrl || '',
    tags: Array.isArray(form.tags) ? form.tags : [],
    affiliateDisclosure: !!form.affiliateDisclosure,
    editorMode: form.editorMode || 'markdown',
    focusKeyword: form.focusKeyword || '',
    seoWeights: normalizeSeoWeights(form.seoWeights),
  });
}

function isFutureDate(localDateTimeString) {
  if (!localDateTimeString) return false;
  return new Date(localDateTimeString).getTime() > Date.now();
}

function getDerivedStatus({ published, scheduledAt }) {
  if (published) return 'published';
  if (scheduledAt && isFutureDate(scheduledAt)) return 'scheduled';
  return 'draft';
}

function getStatusLabel(status) {
  if (status === 'published') return '공개';
  if (status === 'scheduled') return '예약';
  return '임시저장';
}

function getStatusClass(status) {
  if (status === 'published') return 'bg-green-100 text-green-700';
  if (status === 'scheduled') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function BlogEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const draftId = searchParams.get('draft');

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const slugTimerRef = useRef(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState('idle');
  const [slugMessage, setSlugMessage] = useState('');

  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [published, setPublished] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);

  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [affiliateDisclosure, setAffiliateDisclosure] = useState(false);
  const [focusKeyword, setFocusKeyword] = useState('');
  const [seoWeights, setSeoWeights] = useState(() => createDefaultSeoWeights());

  const [showEmoji, setShowEmoji] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSplitPreview, setShowSplitPreview] = useState(false);
  const [editorMode, setEditorMode] = useState('markdown');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [metaUploading, setMetaUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState(null);
  const [previewToast, setPreviewToast] = useState('');
  const [lightboxImage, setLightboxImage] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [pendingContentImage, setPendingContentImage] = useState(null);
  const [imageAltInput, setImageAltInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [imageWidthInput, setImageWidthInput] = useState('100');
  const [thumbnailEditorOpen, setThumbnailEditorOpen] = useState(false);
  const [thumbnailEditorZoom, setThumbnailEditorZoom] = useState(1);
  const [thumbnailEditorOffsetX, setThumbnailEditorOffsetX] = useState(0);
  const [thumbnailEditorOffsetY, setThumbnailEditorOffsetY] = useState(0);

  const draftKey = useMemo(() => `blog-editor-draft:${editId ? `post:${editId}` : draftId || 'new'}`, [draftId, editId]);

  const textStats = useMemo(() => getTextStats(content), [content]);
  const headingList = useMemo(() => extractHeadings(content), [content]);
  const seoChecks = useMemo(
    () => getSeoChecks({ title, description, slug, content, textStats, headingList, tags, focusKeyword }),
    [title, description, slug, content, textStats, headingList, tags, focusKeyword]
  );
  const seoScore = useMemo(() => {
    if (!seoChecks.length) return 0;
    const weightedTotal = seoChecks.reduce((sum, item) => sum + getSeoWeightValue(seoWeights, item.key), 0);
    if (weightedTotal <= 0) return 0;
    const weightedPassed = seoChecks.reduce(
      (sum, item) => (item.ok ? sum + getSeoWeightValue(seoWeights, item.key) : sum),
      0
    );
    return Math.round((weightedPassed / weightedTotal) * 100);
  }, [seoChecks, seoWeights]);
  const seoSignal = useMemo(() => getSeoSignalInfo(seoScore), [seoScore]);
  const failedSeoChecks = useMemo(
    () => [...seoChecks.filter((item) => !item.ok)].sort((a, b) => (b.priority || 0) - (a.priority || 0)),
    [seoChecks]
  );
  const currentStatus = useMemo(() => getDerivedStatus({ published, scheduledAt: scheduleEnabled ? scheduledAt : '' }), [published, scheduledAt, scheduleEnabled]);

  const currentSnapshot = useMemo(() => {
    return buildSnapshot({
      title,
      slug,
      description,
      content,
      emoji,
      published,
      categoryId,
      scheduledAt: scheduleEnabled ? scheduledAt : '',
      thumbnailUrl,
      ogImageUrl,
      tags,
      affiliateDisclosure,
      editorMode,
      focusKeyword,
      seoWeights,
    });
  }, [title, slug, description, content, emoji, published, categoryId, scheduledAt, scheduleEnabled, thumbnailUrl, ogImageUrl, tags, affiliateDisclosure, editorMode, focusKeyword, seoWeights]);

  const isDirty = autosaveReady && initialSnapshot && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin');
        return;
      }

      const { data: catData } = await supabase
        .from('blog_categories')
        .select('*')
        .order('id', { ascending: true });

      if (catData) setCategories(catData);

      let form = {
        title: '',
        slug: '',
        description: '',
        content: '',
        emoji: '📝',
        published: false,
        categoryId: '',
        scheduledAt: '',
        scheduleEnabled: false,
        thumbnailUrl: '',
        ogImageUrl: '',
        tags: [],
        affiliateDisclosure: false,
        editorMode: 'markdown',
        focusKeyword: '',
        seoWeights: createDefaultSeoWeights(),
        slugManual: false,
      };

      if (editId) {
        const { data: post, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', editId)
          .single();

        if (!error && post) {
          const unifiedThumb = post.thumbnail_url || post.og_image_url || '';
          form = {
            title: post.title || '',
            slug: post.slug || '',
            description: post.description || '',
            content: post.content || '',
            emoji: post.emoji || '📝',
            published: !!post.published,
            categoryId: String(post.category_id || ''),
            scheduledAt: post.scheduled_at ? toLocalDateTimeValue(post.scheduled_at) : '',
            scheduleEnabled: !!post.scheduled_at,
            thumbnailUrl: unifiedThumb,
            ogImageUrl: unifiedThumb,
            tags: parseStoredTags(post.tags),
            affiliateDisclosure: !!post.affiliate_disclosure,
            focusKeyword: String(post.focus_keyword || parseStoredTags(post.tags)[0] || ''),
            seoWeights: createDefaultSeoWeights(),
            slugManual: true,
          };
        }
      }

      try {
        const localDraftRaw = localStorage.getItem(draftKey);
        if (localDraftRaw) {
          const draft = JSON.parse(localDraftRaw);
          const draftSnapshot = buildSnapshot(draft.form || {});
          const serverSnapshot = buildSnapshot(form);

          if (draftSnapshot && draftSnapshot !== serverSnapshot) {
            const shouldRestore = window.confirm('이전에 자동 임시저장된 내용이 있어요. 복구할까요?');
            if (shouldRestore && draft.form) {
              form = {
                ...form,
                ...draft.form,
                slugManual: draft.form.slug ? true : form.slugManual,
                scheduleEnabled: !!draft.form.scheduledAt,
              };
            }
          }
        }
      } catch (error) {
        console.error('임시저장 복구 실패:', error);
      }

      setTitle(form.title);
      setSlug(form.slug);
      setDescription(form.description);
      setContent(form.content);
      setEmoji(form.emoji);
      setPublished(form.published);
      setCategoryId(form.categoryId);
      setScheduledAt(form.scheduledAt);
      setScheduleEnabled(form.scheduleEnabled);
      setThumbnailUrl(form.thumbnailUrl);
      setOgImageUrl(form.ogImageUrl);
      setTags(form.tags);
      setAffiliateDisclosure(!!form.affiliateDisclosure);
      setEditorMode(form.editorMode || 'markdown');
      setFocusKeyword(form.focusKeyword || '');
      setSeoWeights(normalizeSeoWeights(form.seoWeights));
      setSlugManual(form.slugManual);

      const snapshot = buildSnapshot(form);
      setInitialSnapshot(snapshot);
      setLoading(false);
      setAutosaveReady(true);
    })();
  }, [draftKey, editId, router]);

  useEffect(() => {
    if (!slugManual) setSlug(generateSlug(title));
  }, [title, slugManual]);

  useEffect(() => {
    if (!autosaveReady || loading) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      try {
        const payload = {
          form: {
            title,
            slug,
            description,
            content,
            emoji,
            published,
            categoryId,
            scheduledAt: scheduleEnabled ? scheduledAt : '',
            thumbnailUrl,
            ogImageUrl,
            tags,
            affiliateDisclosure,
            editorMode,
            focusKeyword,
            seoWeights,
          },
          savedAt: Date.now(),
        };

        localStorage.setItem(draftKey, JSON.stringify(payload));
        setAutosavedAt(Date.now());
      } catch (error) {
        console.error('임시저장 실패:', error);
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [autosaveReady, loading, title, slug, description, content, emoji, published, categoryId, scheduledAt, scheduleEnabled, thumbnailUrl, ogImageUrl, tags, affiliateDisclosure, editorMode, focusKeyword, seoWeights, draftKey]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!slug.trim()) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }

    setSlugStatus('checking');
    setSlugMessage('슬러그 확인 중...');

    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);

    slugTimerRef.current = setTimeout(async () => {
      const candidate = slug.trim();
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', candidate)
        .limit(5);

      if (error) {
        setSlugStatus('error');
        setSlugMessage('슬러그 확인에 실패했어요.');
        return;
      }

      const taken = (data || []).some((row) => String(row.id) !== String(editId || ''));
      if (taken) {
        setSlugStatus('taken');
        setSlugMessage('이미 사용 중인 슬러그예요.');
      } else {
        setSlugStatus('available');
        setSlugMessage('사용 가능한 슬러그예요.');
      }
    }, 400);

    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, [slug, editId]);

  useEffect(() => {
    if (!previewToast) return;
    const timer = setTimeout(() => setPreviewToast(''), 1800);
    return () => clearTimeout(timer);
  }, [previewToast]);

  function setQuickSchedule(type) {
    const now = new Date();
    const next = new Date(now);

    if (type === 'plus1h') {
      next.setHours(next.getHours() + 1, 0, 0, 0);
    }

    if (type === 'tomorrow9') {
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
    }

    if (type === 'nextMonday9') {
      const day = next.getDay();
      const diff = ((8 - day) % 7) || 7;
      next.setDate(next.getDate() + diff);
      next.setHours(9, 0, 0, 0);
    }

    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;

    setScheduleEnabled(true);
    setScheduledAt(formatted);
    setPublished(false);
  }

  function addTag(value) {
    const cleaned = value.trim().replace(/^#/, '');
    if (!cleaned) return;
    if (tags.includes(cleaned)) return;
    setTags((prev) => [...prev, cleaned].slice(0, 10));
    if (!focusKeyword.trim()) setFocusKeyword(cleaned);
    setTagInput('');
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((item) => item !== tag));
  }

  function updateSeoWeight(key, value) {
    const parsed = Number(value);
    setSeoWeights((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) && parsed >= 0 ? Math.min(10, Math.round(parsed)) : 0,
    }));
  }

  function resetSeoWeights() {
    setSeoWeights(createDefaultSeoWeights());
  }

  function normalizeTagsForDb() {
    return tags.map((item) => item.trim()).filter(Boolean);
  }

  function setUnifiedThumbnail(url) {
    const value = String(url || '').trim();
    setThumbnailUrl(value);
    setOgImageUrl(value);
  }

  function createBasePayload() {
    const effectiveScheduledAt = scheduleEnabled ? scheduledAt : '';
    const isScheduled = effectiveScheduledAt && isFutureDate(effectiveScheduledAt);

    return {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      content,
      emoji,
      published: isScheduled ? false : published,
      category_id: categoryId ? Number(categoryId) : null,
      scheduled_at: effectiveScheduledAt ? toUtcISOString(effectiveScheduledAt) : null,
      updated_at: new Date().toISOString(),
    };
  }

  function createExtendedPayload(basePayload, options = {}) {
    const forcedAffiliate = options.forceAffiliateDisclosure;
    return {
      ...basePayload,
      thumbnail_url: thumbnailUrl.trim() || null,
      og_image_url: thumbnailUrl.trim() || null,
      tags: normalizeTagsForDb(),
      focus_keyword: focusKeyword.trim() || null,
      affiliate_disclosure: forcedAffiliate === undefined ? !!affiliateDisclosure : !!forcedAffiliate,
    };
  }

  function isMissingColumnError(error) {
    if (!error) return false;
    const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    return (
      error.code === 'PGRST204' ||
      error.code === '42703' ||
      message.includes('thumbnail_url') ||
      message.includes('og_image_url') ||
      message.includes('tags') ||
      message.includes('focus_keyword') ||
      message.includes('affiliate_disclosure')
    );
  }

  async function saveWithFallback(basePayload, options = {}) {
    const extendedPayload = createExtendedPayload(basePayload, options);

    let response = editId
      ? await supabase.from('blog_posts').update(extendedPayload).eq('id', editId)
      : await supabase.from('blog_posts').insert({ ...extendedPayload, created_at: new Date().toISOString() });

    if (response.error) {
      const message = `${response.error.message || ''} ${response.error.details || ''}`.toLowerCase();
      const maybeTagTypeMismatch =
        message.includes('tags') && (message.includes('array') || message.includes('type') || message.includes('malformed'));
      if (maybeTagTypeMismatch) {
        const retryPayload = { ...extendedPayload, tags: normalizeTagsForDb().join(',') };
        response = editId
          ? await supabase.from('blog_posts').update(retryPayload).eq('id', editId)
          : await supabase.from('blog_posts').insert({ ...retryPayload, created_at: new Date().toISOString() });
      }
    }

    if (response.error && isMissingColumnError(response.error)) {
      response = editId
        ? await supabase.from('blog_posts').update(basePayload).eq('id', editId)
        : await supabase.from('blog_posts').insert({ ...basePayload, created_at: new Date().toISOString() });

      if (!response.error) {
        alert('기본 저장은 완료됐어요. 다만 대표이미지/OG/태그/제휴 컬럼이 DB에 없어서 그 값들은 저장되지 않았어요.');
      }
    }

    return response;
  }

  async function uploadImageFile(file, folder = 'blog') {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('blog-images').upload(path, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
    return publicUrl;
  }

  async function handleContentImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const defaultAlt = file.name.replace(/\.[^.]+$/, '').trim() || '이미지';
    setPendingContentImage(file);
    setImageAltInput(defaultAlt);
    setImageCaptionInput('');
    setImageWidthInput('100');
    setImageDialogOpen(true);

    if (e.target) e.target.value = '';
  }

  function closeImageDialog() {
    if (uploading) return;
    setImageDialogOpen(false);
    setPendingContentImage(null);
    setImageAltInput('');
    setImageCaptionInput('');
    setImageWidthInput('100');
  }

  function buildImageMarkdown(alt, src, caption = '', width = '') {
    const safeAlt = String(alt || '').replace(/\]/g, '\\]').trim();
    const safeCaption = String(caption || '').replace(/"/g, '\\"').trim();
    const safeWidth = normalizeImageWidthPercent(width);
    const titlePart = safeCaption ? ` "${safeCaption}"` : '';
    const widthPart = safeWidth ? `{width=${safeWidth}}` : '';
    return `\n![${safeAlt}](${src}${titlePart})${widthPart}\n`;
  }

  async function confirmContentImageInsert() {
    if (!pendingContentImage) return;

    if (!imageAltInput.trim()) {
      alert('alt 텍스트를 입력해 주세요.');
      return;
    }

    const ta = textareaRef.current;
    const currentScrollPos = ta?.scrollTop || 0;
    const start = ta?.selectionStart ?? content.length;
    const end = ta?.selectionEnd ?? content.length;
    let newCursorPos = start;

    try {
      setUploading(true);
      const publicUrl = await uploadImageFile(pendingContentImage);
      const imgMd = buildImageMarkdown(imageAltInput, publicUrl, imageCaptionInput, imageWidthInput);
      setContent((prev) => {
        const safeStart = Math.max(0, Math.min(start, prev.length));
        const safeEnd = Math.max(safeStart, Math.min(end, prev.length));
        newCursorPos = safeStart + imgMd.length;
        return prev.slice(0, safeStart) + imgMd + prev.slice(safeEnd);
      });
      closeImageDialog();
    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);

      setTimeout(() => {
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newCursorPos, newCursorPos);
          ta.scrollTop = currentScrollPos;
        }
      }, 50);
    }
  }

  async function handleMetaImageUpload(type, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMetaUploading(true);
      const publicUrl = await uploadImageFile(file, 'blog-meta');
      if (type === 'thumbnail') setUnifiedThumbnail(publicUrl);
    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setMetaUploading(false);
      if (e.target) e.target.value = '';
    }
  }

  function openThumbnailEditor() {
    if (!thumbnailUrl) return;
    setThumbnailEditorZoom(1);
    setThumbnailEditorOffsetX(0);
    setThumbnailEditorOffsetY(0);
    setThumbnailEditorOpen(true);
  }

  async function applyThumbnailCrop() {
    if (!thumbnailUrl) return;
    try {
      setMetaUploading(true);
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
        img.src = thumbnailUrl;
      });

      const targetW = 1280;
      const targetH = 720;
      const ratio = targetW / targetH;
      const imageRatio = image.width / image.height;
      const baseW = imageRatio > ratio ? image.height * ratio : image.width;
      const baseH = imageRatio > ratio ? image.height : image.width / ratio;
      const zoom = clamp(thumbnailEditorZoom, 1, 3);
      const cropW = baseW / zoom;
      const cropH = baseH / zoom;
      const maxShiftX = (baseW - cropW) / 2;
      const maxShiftY = (baseH - cropH) / 2;
      const centerX = image.width / 2 + maxShiftX * (thumbnailEditorOffsetX / 100);
      const centerY = image.height / 2 + maxShiftY * (thumbnailEditorOffsetY / 100);
      const sx = clamp(centerX - cropW / 2, 0, image.width - cropW);
      const sy = clamp(centerY - cropH / 2, 0, image.height - cropH);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('캔버스 생성에 실패했습니다.');
      ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, targetW, targetH);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('이미지 변환에 실패했습니다.');
      const file = new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const newUrl = await uploadImageFile(file, 'blog-meta');
      setUnifiedThumbnail(newUrl);
      setThumbnailEditorOpen(false);
    } catch (error) {
      alert(`썸네일 편집 실패: ${error.message}`);
    } finally {
      setMetaUploading(false);
    }
  }

  function insertMarkdown(e, item) {
    if (e) e.preventDefault();

    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const currentScrollPos = ta.scrollTop;
    const selected = content.slice(start, end);

    let newText = content;
    let newCursorPos = start;
    let newSelectionEnd = start;

    if (item.wrap) {
      newText = content.slice(0, start) + item.wrap[0] + selected + item.wrap[1] + content.slice(end);
      newCursorPos = start + item.wrap[0].length;
      newSelectionEnd = newCursorPos + selected.length;
    } else if (item.prefix) {
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      newText = content.slice(0, lineStart) + item.prefix + content.slice(lineStart);
      newCursorPos = start + item.prefix.length;
      newSelectionEnd = newCursorPos + selected.length;
    } else if (item.line) {
      newText = content.slice(0, end) + `\n${item.line}\n` + content.slice(end);
      newCursorPos = end + 1;
      newSelectionEnd = newCursorPos + item.line.length;
    } else if (item.block) {
      const prefix = start > 0 ? '\n' : '';
      const suffix = end < content.length ? '\n' : '';
      newText = content.slice(0, start) + prefix + item.block + suffix + content.slice(end);
      newCursorPos = start + prefix.length;
      newSelectionEnd = newCursorPos + item.block.length;
    }

    setContent(newText);

    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newCursorPos, newSelectionEnd);
      ta.scrollTop = currentScrollPos;
    }, 0);
  }

  function insertLink(e) {
    e.preventDefault();
    const url = window.prompt('연결할 URL 주소를 입력하세요 (http:// 포함)');
    if (!url) return;
    if (hasCoupangLink(url)) setAffiliateDisclosure(true);

    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || '링크 문구';
    const linkMd = `[${selected}](${url})`;
    const newText = content.slice(0, start) + linkMd + content.slice(end);

    setContent(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + 1, start + 1 + selected.length);
    }, 0);
  }

  async function handleSave(mode = 'default') {
    if (!title.trim() || !slug.trim() || !content.trim()) {
      return alert('제목, 슬러그, 내용을 모두 입력하세요!');
    }

    if (slugStatus === 'taken') {
      return alert('이미 사용 중인 슬러그예요. 다른 슬러그로 바꿔주세요.');
    }

    if (scheduleEnabled && scheduledAt && !isFutureDate(scheduledAt)) {
      return alert('예약 시간은 현재보다 이후여야 해요.');
    }

    setSaving(true);

    let nextPublished = published;
    let nextScheduleEnabled = scheduleEnabled;
    let nextScheduledAt = scheduledAt;

    if (mode === 'publish-now') {
      nextPublished = true;
      nextScheduleEnabled = false;
      nextScheduledAt = '';
      setPublished(true);
      setScheduleEnabled(false);
      setScheduledAt('');
    }

    if (mode === 'save-draft') {
      nextPublished = false;
      setPublished(false);
    }

    if (mode === 'schedule') {
      if (!nextScheduleEnabled || !nextScheduledAt) {
        setSaving(false);
        return alert('예약발행 시간부터 설정해 주세요.');
      }
      if (!isFutureDate(nextScheduledAt)) {
        setSaving(false);
        return alert('예약 시간은 현재보다 이후여야 합니다.');
      }
      nextPublished = false;
      setPublished(false);
    }

    const autoAffiliateDisclosure = hasCoupangLink(content);
    if (autoAffiliateDisclosure && !affiliateDisclosure) {
      setAffiliateDisclosure(true);
    }

    const effectiveScheduledAt = nextScheduleEnabled ? nextScheduledAt : '';
    const isScheduled = effectiveScheduledAt && isFutureDate(effectiveScheduledAt);

    const basePayload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      content,
      emoji,
      published: isScheduled ? false : nextPublished,
      category_id: categoryId ? Number(categoryId) : null,
      scheduled_at: effectiveScheduledAt ? toUtcISOString(effectiveScheduledAt) : null,
      updated_at: new Date().toISOString(),
    };

    const res = await saveWithFallback(basePayload, {
      forceAffiliateDisclosure: affiliateDisclosure || autoAffiliateDisclosure,
    });

    setSaving(false);

    if (res.error) {
      alert(res.error.code === '23505' ? '이미 존재하는 슬러그입니다.' : '저장 실패: ' + res.error.message);
      return;
    }

    // Keep local draft so multiple temporary drafts can coexist.

    const snapshot = buildSnapshot({
      title,
      slug,
      description,
      content,
      emoji,
      published: basePayload.published,
      categoryId,
      scheduledAt: effectiveScheduledAt,
      thumbnailUrl,
      ogImageUrl,
      tags,
      affiliateDisclosure: affiliateDisclosure || autoAffiliateDisclosure,
      editorMode,
      focusKeyword,
      seoWeights,
    });

    setInitialSnapshot(snapshot);
    setSaved(true);
    setAutosavedAt(null);
    triggerSitemapRevalidate(slug.trim());

    setTimeout(() => {
      setSaved(false);
    }, 900);

    if (!editId) {
      const { data: savedPost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (savedPost?.id) {
        router.replace(`/admin/blog/editor?id=${savedPost.id}`);
      }
    }
  }

  function wrapSelection(before, after, placeholder = '텍스트') {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  function insertTextColor(e) {
    e.preventDefault();
    const color = window.prompt('색상 코드를 입력하세요. 예: #e11d48', '#e11d48');
    if (!color) return;
    wrapSelection(`<span style="color:${color};">`, '</span>');
  }

  function insertFontSize(e) {
    e.preventDefault();
    const size = window.prompt('폰트 크기(px)를 입력하세요. 예: 18', '18');
    if (!size) return;
    const px = Number(size);
    if (!Number.isFinite(px) || px < 10 || px > 72) {
      alert('10~72 사이 숫자를 입력해 주세요.');
      return;
    }
    wrapSelection(`<span style="font-size:${Math.round(px)}px;">`, '</span>');
  }

  function insertLongDivider(e) {
    e.preventDefault();
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const divider = '\n\n<hr style="border:0;border-top:2px solid #d1d5db;margin:28px 0;" />\n\n';
    const next = content.slice(0, start) + divider + content.slice(start);
    setContent(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + divider.length, start + divider.length);
    }, 0);
  }

  function insertHtmlTable(e) {
    e.preventDefault();
    const tableHtml = '\n<table style="width:100%;border-collapse:collapse;">\n  <colgroup>\n    <col style="width:40%;" />\n    <col style="width:60%;" />\n  </colgroup>\n  <thead>\n    <tr>\n      <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">항목</th>\n      <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">내용</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td style="border:1px solid #cbd5e1;padding:8px;">예시</td>\n      <td style="border:1px solid #cbd5e1;padding:8px;">값</td>\n    </tr>\n  </tbody>\n</table>\n';
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = content.slice(0, start) + tableHtml + content.slice(end);
    setContent(next);
  }

  async function handleDelete() {
    if (!editId) return;
    const confirmed = window.confirm('정말 이 글을 삭제할까요? 삭제 후 복구하기 어려워요.');
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase.from('blog_posts').delete().eq('id', editId);
    setDeleting(false);

    if (error) {
      alert('삭제 실패: ' + error.message);
      return;
    }

    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error(error);
    }

    triggerSitemapRevalidate(slug.trim());
    router.push('/admin/blog');
  }

  async function handleDuplicate() {
    if (!title.trim() || !content.trim()) {
      return alert('복제하려면 최소한 제목과 내용이 있어야 해요.');
    }

    setDuplicating(true);

    const basePayload = {
      ...createBasePayload(),
      title: `${title.trim()} (복사본)`,
      slug: `${generateSlug(`${title.trim()} copy`)}-${Date.now().toString().slice(-4)}`,
      published: false,
      scheduled_at: null,
      created_at: new Date().toISOString(),
    };

    const extendedPayload = createExtendedPayload(basePayload);

    let response = await supabase.from('blog_posts').insert(extendedPayload).select('id').single();

    if (response.error && isMissingColumnError(response.error)) {
      response = await supabase.from('blog_posts').insert(basePayload).select('id').single();
    }

    setDuplicating(false);

    if (response.error) {
      alert('복제 실패: ' + response.error.message);
      return;
    }

    router.push(`/admin/blog/editor?id=${response.data.id}`);
  }

  function handleBack() {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Do you want to leave this page?');
      if (!confirmed) return;
    }
    router.push('/admin/blog');
  }

  async function triggerSitemapRevalidate(targetSlug = '') {
    const paths = ['/sitemap.xml', '/blog'];
    if (targetSlug) paths.push(`/blog/${targetSlug}`);

    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
    } catch (error) {
      console.error('sitemap revalidate failed:', error);
    }
  }

  function handlePreviewClick(e) {
    const copyButton = e.target.closest('[data-copy]');
    if (copyButton) {
      const code = decodeURIComponent(copyButton.getAttribute('data-copy') || '');
      navigator.clipboard.writeText(code);
      setPreviewToast('코드가 복사됐어요.');
      return;
    }

    const image = e.target.closest('[data-preview-src]');
    if (image) {
      setLightboxImage(image.getAttribute('data-preview-src') || '');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto min-h-screen flex items-center justify-center text-gray-400 text-sm">
        에디터 준비 중... 🛡️
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen pb-10">
      <header className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-gray-400 hover:text-gray-800 text-xl px-1">←</button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{editId ? '✏️ 글 수정' : '✍️ 새 글 작성'}</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {autosavedAt ? `자동 임시저장됨 · ${new Date(autosavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '자동 임시저장 대기 중'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getStatusClass(currentStatus)}`}>
            {getStatusLabel(currentStatus)}
          </span>
          <button
            onClick={() => setShowPreview((p) => !p)}
            className={`text-xs px-4 py-2 rounded-full font-bold transition-colors ${showPreview ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {showPreview ? '✏️ 에디터' : '👁️ 미리보기'}
          </button>
          {!editId && (
            <button
              onClick={() => router.push(`/admin/blog/editor?draft=${Date.now()}`)}
              className="text-xs px-4 py-2 rounded-full font-bold bg-violet-100 text-violet-700 hover:bg-violet-200"
            >
              새 임시글
            </button>
          )}
          {editId && (
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="text-xs px-4 py-2 rounded-full font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              {duplicating ? '복제 중...' : '📄 복제'}
            </button>
          )}
          {editId && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-4 py-2 rounded-full font-bold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '🗑️ 삭제'}
            </button>
          )}
          <button
            onClick={() => handleSave('default')}
            disabled={saving || saved}
            className={`text-xs px-5 py-2 rounded-full font-bold shadow-sm transition-colors ${saved ? 'bg-green-500 text-white' : saving ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {saved ? '✅ 저장됨!' : saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>
      </header>

      <main className="p-4 flex flex-col gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowEmoji((p) => !p)}
              className="text-3xl w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-orange-50 transition-colors flex-shrink-0"
            >
              {emoji}
            </button>
            {showEmoji && (
              <div className="absolute top-16 left-0 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg p-3 flex flex-wrap gap-2 w-64">
                {EMOJIS.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setEmoji(item);
                      setShowEmoji(false);
                    }}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="글 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-bold bg-transparent border-none outline-none text-gray-900 placeholder-gray-300"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                <span>제목 {title.trim().length}자</span>
                <span>·</span>
                <span>{textStats.chars}자</span>
                <span>·</span>
                <span>예상 {textStats.readingMinutes}분 읽기</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2.5">
            <span className="text-xs text-gray-400 font-mono">/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              className="flex-1 text-xs font-mono bg-transparent border-none outline-none text-gray-600"
            />
            <button
              onClick={() => {
                setSlug(generateSlug(title));
                setSlugManual(false);
              }}
              className="text-[10px] text-orange-500 font-bold"
            >
              자동생성
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className={`font-semibold ${slugStatus === 'available' ? 'text-green-600' : slugStatus === 'taken' ? 'text-red-500' : slugStatus === 'error' ? 'text-orange-500' : 'text-gray-400'}`}>
              {slugMessage || '슬러그를 입력하면 중복 여부를 확인해요.'}
            </span>
            <span className={`font-medium ${slug.length > 80 ? 'text-red-500' : 'text-gray-400'}`}>
              슬러그 {slug.length}/80
            </span>
          </div>

          <textarea
            placeholder="구글 검색 결과에 표시될 글 요약을 입력하세요 (120~160자 권장)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
            <span className={description.length >= 120 && description.length <= 160 ? 'text-green-600 font-semibold' : ''}>
              설명 {description.length}자 · 120~160자 권장
            </span>
            <span className={title.length > 60 ? 'text-orange-500 font-semibold' : ''}>검색 제목은 보통 60자 안쪽이 좋아요.</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-gray-800">검색/대표 이미지 설정</h2>
            <div className="text-[11px] text-gray-400">OG 이미지는 대표 썸네일과 자동으로 동일하게 저장됩니다.</div>
          </div>

          <div className="grid md:grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500">🖼️ 대표 썸네일</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setUnifiedThumbnail(e.target.value)}
                  placeholder="대표 이미지 URL"
                  className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700"
                />
                <button
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
                >
                  {metaUploading ? '업로드 중...' : '업로드'}
                </button>
                <button
                  onClick={openThumbnailEditor}
                  disabled={!thumbnailUrl || metaUploading}
                  className="px-3 py-2 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 disabled:opacity-50"
                >
                  편집
                </button>
                <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMetaImageUpload('thumbnail', e)} />
              </div>
              {thumbnailUrl && <img src={thumbnailUrl} alt="thumbnail" className="h-48 w-full object-cover rounded-2xl border border-gray-200" />}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500"># 태그</label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput.replace(',', ''));
                  }
                }}
                placeholder="태그 입력 후 Enter"
                className="flex-1 min-w-52 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700"
              />
              <button
                onClick={() => addTag(tagInput)}
                className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-[11px] text-gray-400">태그를 넣으면 검색/분류/관련글 구성에 좋아요.</span>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => removeTag(tag)}
                    className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100"
                  >
                    #{tag} ×
                  </button>
                ))
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500">Focus keyword</label>
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="Example: wireless earbuds discount"
                className="text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700"
              />
              <span className="text-[11px] text-gray-400">SEO signal checks title, description, first paragraph, and headings against this keyword.</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-800">발행 설정</h2>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getStatusClass(currentStatus)}`}>{getStatusLabel(currentStatus)}</span>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-40">
              <span className="text-xs font-bold text-gray-500">🏷️ 카테고리</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700"
              >
                <option value="">미분류</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setPublished((prev) => !prev);
                if (!published) {
                  setScheduleEnabled(false);
                  setScheduledAt('');
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
            >
              <span className={`w-2 h-2 rounded-full ${published ? 'bg-green-500' : 'bg-gray-400'}`} />
              {published ? '공개' : '비공개'}
            </button>

            <button
              onClick={() => handleSave('publish-now')}
              disabled={saving}
              className="px-4 py-2 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              지금 발행
            </button>

            <button
              onClick={() => handleSave('save-draft')}
              disabled={saving}
              className="px-4 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              임시저장
            </button>
            <button
              onClick={() => handleSave('schedule')}
              disabled={saving || !scheduleEnabled || !scheduledAt}
              className="px-4 py-2 rounded-full text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
            >
              예약 발행
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setScheduleEnabled(checked);
                  if (!checked) setScheduledAt('');
                  if (checked) setPublished(false);
                }}
              />
              ⏰ 예약발행 사용
            </label>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="datetime-local"
                value={scheduledAt}
                disabled={!scheduleEnabled}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  if (e.target.value) setPublished(false);
                }}
                className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button onClick={() => setQuickSchedule('plus1h')} className="px-3 py-2 text-[11px] font-bold bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100">+1시간</button>
              <button onClick={() => setQuickSchedule('tomorrow9')} className="px-3 py-2 text-[11px] font-bold bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100">내일 09:00</button>
              <button onClick={() => setQuickSchedule('nextMonday9')} className="px-3 py-2 text-[11px] font-bold bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100">다음 월요일 09:00</button>
            </div>

            <div className="flex flex-wrap justify-between gap-2 text-[11px] text-gray-400">
              <span>
                {scheduleEnabled && scheduledAt
                  ? isFutureDate(scheduledAt)
                    ? '예약 시간은 정상이에요. 저장하면 예약 상태로 유지돼요.'
                    : '예약 시간은 현재보다 이후여야 해요.'
                  : '예약을 켜면 공개 상태 대신 예약 상태로 저장돼요.'}
              </span>
              <span>{scheduleEnabled && scheduledAt ? `선택됨: ${scheduledAt.replace('T', ' ')}` : '예약 시간 미설정'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-800">검색 미리보기</h2>
            <div className="text-[11px] text-gray-400">검색 결과/공유 카드에 어떻게 보일지 미리 점검해보세요.</div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-4 bg-white">
            <div className="text-[11px] text-green-700">https://example.com/blog/{slug || 'your-slug'}</div>
            <div className="mt-1 text-lg text-blue-700 font-semibold line-clamp-2">{title || '제목이 여기에 표시됩니다.'}</div>
            <div className="mt-1 text-sm text-gray-600 line-clamp-3">{description || '설명을 입력하면 구글/공유 미리보기에 더 잘 보일 수 있어요.'}</div>
            {(ogImageUrl || thumbnailUrl) && (
              <img
                src={ogImageUrl || thumbnailUrl}
                alt="preview"
                className="mt-3 h-40 w-full object-cover rounded-2xl border border-gray-200"
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {!showPreview ? (
            <>
              <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-50 flex-wrap">
                {TOOLBAR.map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => insertMarkdown(e, item)}
                    title={item.title}
                    className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button onClick={insertLink} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">🔗 링크</button>
                <button onClick={insertTextColor} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">A 색상</button>
                <button onClick={insertFontSize} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">A 크기</button>
                <button onClick={insertLongDivider} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">긴 줄</button>
                <button onClick={insertHtmlTable} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">HTML 표</button>
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">
                  🖼️ {uploading ? '업로드 중...' : '이미지'}
                </button>
                <button
                  onClick={() => setShowSplitPreview((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${showSplitPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {showSplitPreview ? 'Split ON' : 'Split Preview'}
                </button>
                <button
                  onClick={() => setEditorMode((prev) => (prev === 'markdown' ? 'html' : 'markdown'))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${editorMode === 'html' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {editorMode === 'html' ? 'HTML ON' : 'HTML'}
                </button>
                <button
                  onClick={() => setAffiliateDisclosure((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${affiliateDisclosure ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="쿠팡 제휴 문구를 게시글 상단 메타 정보에 노출합니다."
                >
                  {affiliateDisclosure ? '제휴 ON' : '제휴'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleContentImageUpload} />
              </div>

              <div className={showSplitPreview ? 'grid lg:grid-cols-2' : ''}>
                <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={editorMode === 'html' ? 'HTML로 작성하세요...' : '마크다운으로 작성하세요...'}
                className={`w-full h-[32rem] px-5 py-4 text-sm font-mono text-gray-800 resize-none focus:outline-none leading-relaxed ${showSplitPreview ? 'border-r border-gray-100' : ''}`}
                />
                {showSplitPreview && (
                  <div
                    onClick={handlePreviewClick}
                    className="max-w-none px-6 py-5 min-h-[32rem] text-gray-800 leading-relaxed prose prose-sm prose-img:rounded-2xl overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: editorMode === 'html' ? content : markdownToHtml(content) }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="grid lg:grid-cols-[220px_1fr] gap-0">
              <aside className="hidden lg:block border-r border-gray-100 bg-gray-50/70 p-4">
                <div className="sticky top-24">
                  <h3 className="text-xs font-bold text-gray-700 mb-3">목차</h3>
                  <div className="flex flex-col gap-1">
                    {headingList.length === 0 ? (
                      <span className="text-[11px] text-gray-400">제목(H1~H4)을 넣으면 여기에 보여요.</span>
                    ) : (
                      headingList.map((heading, index) => (
                        <a
                          key={`${heading.id}-${index}`}
                          href={`#${heading.id}`}
                          className={`text-[12px] text-gray-600 hover:text-blue-600 ${heading.level === 1 ? 'font-bold' : heading.level === 2 ? 'pl-2' : heading.level === 3 ? 'pl-4' : 'pl-6'}`}
                        >
                          {heading.text}
                        </a>
                      ))
                    )}
                  </div>
                </div>
              </aside>

              <div className="relative">
                {previewToast && (
                  <div className="absolute right-4 top-4 z-10 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    {previewToast}
                  </div>
                )}
                <div
                  onClick={handlePreviewClick}
                  className="max-w-none px-6 py-5 min-h-[32rem] text-gray-800 leading-relaxed prose prose-sm prose-img:rounded-2xl"
                  dangerouslySetInnerHTML={{ __html: editorMode === 'html' ? content : markdownToHtml(content) }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-800">본문 통계</h3>
            <div className="text-sm text-gray-600">전체 글자 수: <span className="font-bold text-gray-900">{textStats.chars}</span></div>
            <div className="text-sm text-gray-600">공백 제외: <span className="font-bold text-gray-900">{textStats.charsNoSpace}</span></div>
            <div className="text-sm text-gray-600">단어 수: <span className="font-bold text-gray-900">{textStats.words}</span></div>
            <div className="text-sm text-gray-600">예상 읽는 시간: <span className="font-bold text-gray-900">{textStats.readingMinutes}분</span></div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-800">SEO Signal</h3>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-2 ${seoSignal.ring} ${seoSignal.text}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${seoSignal.dot}`} />
                {seoSignal.label} {seoScore} pts
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {seoChecks.map((item) => (
                <div key={item.key} className="flex items-start gap-3 text-sm">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.ok ? 'bg-green-500' : 'bg-red-400'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold ${item.ok ? 'text-green-700' : 'text-gray-700'}`}>{item.label}</div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                        W {getSeoWeightValue(seoWeights, item.key)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-xs font-bold text-gray-700 mb-2">현재 부족한 점 진단</div>
              {failedSeoChecks.length === 0 ? (
                <div className="text-xs text-green-700 font-semibold">좋아요. 현재 기준에서 보완 필요 항목이 없습니다.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {failedSeoChecks.slice(0, 6).map((item) => (
                    <div key={`guide-${item.key}`} className="rounded-lg bg-white border border-gray-100 px-2.5 py-2">
                      <div className="text-[12px] font-semibold text-gray-800">{item.label}</div>
                      <div className="text-[11px] text-gray-500">현재: {item.detail}</div>
                      <div className="text-[11px] text-blue-700 mt-0.5">개선: {item.action}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-gray-600">Score weights</h4>
                <button
                  type="button"
                  onClick={resetSeoWeights}
                  className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-200"
                >
                  Reset
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {seoChecks.map((item) => (
                  <label key={`weight-${item.key}`} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                    <span className="truncate text-[11px] text-gray-600">{item.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={getSeoWeightValue(seoWeights, item.key)}
                      onChange={(e) => updateSeoWeight(item.key, e.target.value)}
                      className="w-12 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-right text-[11px] font-bold text-gray-700"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-gray-400">Set weight to 0 to exclude that item from score.</div>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">빠른 액션</h3>
            <button onClick={() => handleSave('save-draft')} disabled={saving} className="w-full py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">임시저장</button>
            <button onClick={() => handleSave('publish-now')} disabled={saving} className="w-full py-3 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">지금 발행</button>
            <button onClick={() => handleSave('schedule')} disabled={saving || !scheduleEnabled || !scheduledAt} className="w-full py-3 rounded-2xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50">예약 발행</button>
            <button onClick={() => handleSave('default')} disabled={saving || saved} className={`w-full py-3 rounded-2xl font-bold text-sm ${saved ? 'bg-green-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}>
              {saved ? '✅ 저장 완료!' : '현재 상태 저장'}
            </button>
          </div>
        </div>
      </main>

      {thumbnailEditorOpen && thumbnailUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setThumbnailEditorOpen(false)}>
          <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900">썸네일 편집</h3>
            <p className="mt-1 text-xs text-gray-500">16:9 카드 기준으로 썸네일 확대/위치를 조절합니다.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              <div className="relative aspect-[16/9] w-full">
                <img
                  src={thumbnailUrl}
                  alt="thumbnail editor"
                  className="absolute left-1/2 top-1/2 h-full w-full max-w-none object-cover"
                  style={{
                    transform: `translate(-50%, -50%) translate(${thumbnailEditorOffsetX}%, ${thumbnailEditorOffsetY}%) scale(${thumbnailEditorZoom})`,
                  }}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="text-xs text-gray-600">확대
                <input type="range" min="1" max="3" step="0.05" value={thumbnailEditorZoom} onChange={(e) => setThumbnailEditorZoom(Number(e.target.value))} className="mt-1 w-full" />
              </label>
              <label className="text-xs text-gray-600">좌우 이동
                <input type="range" min="-100" max="100" step="1" value={thumbnailEditorOffsetX} onChange={(e) => setThumbnailEditorOffsetX(Number(e.target.value))} className="mt-1 w-full" />
              </label>
              <label className="text-xs text-gray-600">상하 이동
                <input type="range" min="-100" max="100" step="1" value={thumbnailEditorOffsetY} onChange={(e) => setThumbnailEditorOffsetY(Number(e.target.value))} className="mt-1 w-full" />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setThumbnailEditorOpen(false)} disabled={metaUploading} className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-60">취소</button>
              <button onClick={applyThumbnailCrop} disabled={metaUploading} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{metaUploading ? '적용 중...' : '적용'}</button>
            </div>
          </div>
        </div>
      )}

      {imageDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={closeImageDialog}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">이미지 설명 입력</h3>
            <p className="mt-1 text-xs text-gray-500">alt 텍스트는 필수, 캡션은 선택입니다.</p>

            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">alt 텍스트 (필수)</label>
                <input
                  type="text"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="예: 무선 이어폰 제품 박스 사진"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">캡션 (선택)</label>
                <input
                  type="text"
                  value={imageCaptionInput}
                  onChange={(e) => setImageCaptionInput(e.target.value)}
                  placeholder="예: 2026년 4월 할인 행사 대표 이미지"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">Width (%)</label>
                <input
                  type="number"
                  min={20}
                  max={100}
                  step={5}
                  value={imageWidthInput}
                  onChange={(e) => setImageWidthInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="text-[11px] text-gray-400">20~100 사이로 입력하면 이미지 너비가 적용됩니다.</div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeImageDialog}
                disabled={uploading}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={confirmContentImageInsert}
                disabled={uploading || !imageAltInput.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? '업로드 중...' : '삽입'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage('')}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <img
            src={lightboxImage}
            alt="preview"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

export default function BlogEditorPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">로딩 중...</div>}>
      <BlogEditorInner />
    </Suspense>
  );
}
