'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/*
  선택 기능(DB 저장까지 하려면 blog_posts에 아래 컬럼이 있으면 가장 좋습니다)
  - thumbnail_url text
  - og_image_url text
  - tags text[]   (또는 text 로 바꿔서 직접 처리)

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

function formatInline(text = '') {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<img alt="$1" src="$2" data-preview-src="$2" class="preview-image my-4 max-w-full rounded-2xl cursor-zoom-in border border-gray-200" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em]">$1</code>');
}

function parseMarkdownImageLine(line = '') {
  const match = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
  if (!match) return null;

  return {
    alt: match[1] || '',
    src: match[2] || '',
    caption: match[3] || '',
  };
}

function renderImageFigure({ alt, src, caption }) {
  const safeAlt = escapeHtml(alt || '');
  const safeSrc = escapeHtml(src || '');
  const safeCaption = escapeHtml(caption || '');

  return `
    <figure class="my-6">\n      <img alt="${safeAlt}" src="${safeSrc}" data-preview-src="${safeSrc}" class="preview-image w-full max-w-full rounded-2xl cursor-zoom-in border border-gray-200" />\n      ${safeCaption ? `<figcaption class="mt-2 text-center text-sm text-gray-500">${safeCaption}</figcaption>` : ''}\n    </figure>
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

function BlogEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const ogInputRef = useRef(null);
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

  const [showEmoji, setShowEmoji] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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

  const draftKey = useMemo(() => `blog-editor-draft:${editId || 'new'}`, [editId]);

  const textStats = useMemo(() => getTextStats(content), [content]);
  const headingList = useMemo(() => extractHeadings(content), [content]);
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
    });
  }, [title, slug, description, content, emoji, published, categoryId, scheduledAt, scheduleEnabled, thumbnailUrl, ogImageUrl, tags]);

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
        slugManual: false,
      };

      if (editId) {
        const { data: post, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', editId)
          .single();

        if (!error && post) {
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
            thumbnailUrl: post.thumbnail_url || '',
            ogImageUrl: post.og_image_url || '',
            tags: Array.isArray(post.tags)
              ? post.tags
              : typeof post.tags === 'string'
                ? post.tags.split(',').map((item) => item.trim()).filter(Boolean)
                : [],
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
  }, [autosaveReady, loading, title, slug, description, content, emoji, published, categoryId, scheduledAt, scheduleEnabled, thumbnailUrl, ogImageUrl, tags, draftKey]);

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
    setTagInput('');
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((item) => item !== tag));
  }

  function normalizeTagsForDb() {
    return tags.map((item) => item.trim()).filter(Boolean);
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

  function createExtendedPayload(basePayload) {
    return {
      ...basePayload,
      thumbnail_url: thumbnailUrl.trim() || null,
      og_image_url: ogImageUrl.trim() || null,
      tags: normalizeTagsForDb(),
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
      message.includes('tags')
    );
  }

  async function saveWithFallback(basePayload) {
    const extendedPayload = createExtendedPayload(basePayload);

    let response = editId
      ? await supabase.from('blog_posts').update(extendedPayload).eq('id', editId)
      : await supabase.from('blog_posts').insert({ ...extendedPayload, created_at: new Date().toISOString() });

    if (response.error && isMissingColumnError(response.error)) {
      response = editId
        ? await supabase.from('blog_posts').update(basePayload).eq('id', editId)
        : await supabase.from('blog_posts').insert({ ...basePayload, created_at: new Date().toISOString() });

      if (!response.error) {
        alert('기본 저장은 완료됐어요. 다만 대표이미지/OG/태그 컬럼이 DB에 없어서 그 값들은 저장되지 않았어요.');
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
    setImageDialogOpen(true);

    if (e.target) e.target.value = '';
  }

  function closeImageDialog() {
    if (uploading) return;
    setImageDialogOpen(false);
    setPendingContentImage(null);
    setImageAltInput('');
    setImageCaptionInput('');
  }

  function buildImageMarkdown(alt, src, caption = '') {
    const safeAlt = String(alt || '').replace(/\]/g, '\\]').trim();
    const safeCaption = String(caption || '').replace(/"/g, '\\"').trim();
    const titlePart = safeCaption ? ` "${safeCaption}"` : '';
    return `\n![${safeAlt}](${src}${titlePart})\n`;
  }

  async function confirmContentImageInsert() {
    if (!pendingContentImage) return;

    if (!imageAltInput.trim()) {
      alert('alt 텍스트를 입력해 주세요.');
      return;
    }

    const ta = textareaRef.current;
    const currentScrollPos = ta?.scrollTop || 0;

    try {
      setUploading(true);
      const publicUrl = await uploadImageFile(pendingContentImage);
      const imgMd = buildImageMarkdown(imageAltInput, publicUrl, imageCaptionInput);
      setContent((prev) => prev + imgMd);
      closeImageDialog();
    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);

      setTimeout(() => {
        if (ta) {
          ta.focus();
          ta.scrollTop = Math.max(currentScrollPos, ta.scrollHeight);
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
      if (type === 'thumbnail') setThumbnailUrl(publicUrl);
      if (type === 'og') setOgImageUrl(publicUrl);
    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setMetaUploading(false);
      if (e.target) e.target.value = '';
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

    const res = await saveWithFallback(basePayload);

    setSaving(false);

    if (res.error) {
      alert(res.error.code === '23505' ? '이미 존재하는 슬러그입니다.' : '저장 실패: ' + res.error.message);
      return;
    }

    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error(error);
    }

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
    });

    setInitialSnapshot(snapshot);
    setSaved(true);
    setAutosavedAt(null);
    triggerSitemapRevalidate(slug.trim());

    setTimeout(() => {
      setSaved(false);
      router.push('/admin/blog');
    }, 900);
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
            <div className="text-[11px] text-gray-400">대표 이미지, OG 이미지, 태그를 미리 넣어둘 수 있어요.</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500">🖼️ 대표 썸네일</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="대표 이미지 URL"
                  className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700"
                />
                <button
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
                >
                  {metaUploading ? '업로드 중...' : '업로드'}
                </button>
                <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMetaImageUpload('thumbnail', e)} />
              </div>
              {thumbnailUrl && <img src={thumbnailUrl} alt="thumbnail" className="h-36 w-full object-cover rounded-2xl border border-gray-200" />}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500">🌐 OG 이미지</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ogImageUrl}
                  onChange={(e) => setOgImageUrl(e.target.value)}
                  placeholder="공유 미리보기 이미지 URL"
                  className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700"
                />
                <button
                  onClick={() => ogInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
                >
                  {metaUploading ? '업로드 중...' : '업로드'}
                </button>
                <input ref={ogInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMetaImageUpload('og', e)} />
              </div>
              {ogImageUrl && <img src={ogImageUrl} alt="og" className="h-36 w-full object-cover rounded-2xl border border-gray-200" />}
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
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">
                  🖼️ {uploading ? '업로드 중...' : '이미지'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleContentImageUpload} />
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="마크다운으로 작성하세요..."
                className="w-full h-[32rem] px-5 py-4 text-sm font-mono text-gray-800 resize-none focus:outline-none leading-relaxed"
              />
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
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
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

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-800">작성 가이드</h3>
            <div className="text-sm text-gray-600">• 제목은 60자 안쪽이면 좋아요.</div>
            <div className="text-sm text-gray-600">• 설명은 120~160자가 적당해요.</div>
            <div className="text-sm text-gray-600">• 대표 이미지와 태그가 있으면 공유 품질이 좋아져요.</div>
            <div className="text-sm text-gray-600">• 저장하지 않아도 자동 임시저장돼요.</div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">빠른 액션</h3>
            <button onClick={() => handleSave('save-draft')} disabled={saving} className="w-full py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">임시저장</button>
            <button onClick={() => handleSave('publish-now')} disabled={saving} className="w-full py-3 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">지금 발행</button>
            <button onClick={() => handleSave('default')} disabled={saving || saved} className={`w-full py-3 rounded-2xl font-bold text-sm ${saved ? 'bg-green-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}>
              {saved ? '✅ 저장 완료!' : '현재 상태 저장'}
            </button>
          </div>
        </div>
      </main>

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
              </div>

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
