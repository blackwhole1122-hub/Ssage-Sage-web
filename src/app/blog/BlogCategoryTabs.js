'use client'

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORY_ICONS = {};
const CATEGORY_COLORS = {};

export default function BlogCategoryTabs({
  posts,
  categories,
  initialCategoryName,
}) {
  const router = useRouter();
  const postDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const initialCategoryId = useMemo(() => {
    if (!initialCategoryName) return null;
    return categories.find((c) => c.name === initialCategoryName)?.id ?? null;
  }, [categories, initialCategoryName]);

  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId);
  const [searchQuery, setSearchQuery] = useState('');

  const postCountByCategoryId = useMemo(() => {
    const map = new Map();
    for (const post of posts || []) {
      const key = post?.category_id ?? null;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [posts]);

  useEffect(() => {
    setActiveCategoryId(initialCategoryId);
  }, [initialCategoryId]);

  const updateURL = useCallback(
    (categoryId) => {
      let url;

      if (categoryId) {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
          url = `/blog?category=${encodeURIComponent(category.name)}`;
          router.push(url, { scroll: false });
        }
      } else {
        url = '/blog';
        router.push(url, { scroll: false });
      }

      if (typeof window !== 'undefined' && url) {
        sessionStorage.setItem('blogListUrl', url);
      }
    },
    [router, categories]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('blogListUrl', currentUrl);
    }
  }, [activeCategoryId]);

  const categoryFilteredPosts = activeCategoryId
    ? posts.filter((post) => post.category_id === activeCategoryId)
    : posts;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = normalizedQuery
    ? categoryFilteredPosts.filter((post) => {
        const title = String(post?.title || '').toLowerCase();
        const description = String(post?.description || '').toLowerCase();
        const tags = Array.isArray(post?.tags) ? post.tags.join(' ').toLowerCase() : '';
        return (
          title.includes(normalizedQuery) ||
          description.includes(normalizedQuery) ||
          tags.includes(normalizedQuery)
        );
      })
    : categoryFilteredPosts;

  return (
    <div>
      {/* 카테고리 탭 */}
      <nav className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => {
            setActiveCategoryId(null);
            updateURL(null);
          }}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
            activeCategoryId === null
              ? 'bg-[#1E293B] text-white'
              : 'bg-[#FAF6F0] text-[#64748B] hover:bg-[#F0EAE0] hover:text-[#1E293B]'
          }`}
        >
          전체 ({posts.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategoryId(cat.id);
              updateURL(cat.id);
            }}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeCategoryId === cat.id
                ? 'bg-[#1E293B] text-white'
                : 'bg-[#FAF6F0] text-[#64748B] hover:bg-[#F0EAE0] hover:text-[#1E293B]'
            }`}
          >
            {CATEGORY_ICONS[cat.name] && (
              <span className="text-[14px] leading-none">{CATEGORY_ICONS[cat.name]}</span>
            )}
            {cat.name} ({postCountByCategoryId.get(cat.id) || 0})
          </button>
        ))}
      </nav>

      <div className="mb-6">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍"
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 pr-10 text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0ABAB5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[12px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              aria-label="검색어 지우기"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {/* 블로그 글 목록 그리드 */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const category = categories.find((c) => c.id === post.category_id);
            const icon = post.emoji || CATEGORY_ICONS[category?.name] || '📝';
            const hoverBg = CATEGORY_COLORS[category?.name] || 'group-hover:bg-[#E6FAF9]';
            const thumb = post.thumbnail_url || post.og_image_url || '';

            if (thumb) {
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#0ABAB5] transition-all duration-200 overflow-hidden flex flex-col deal-card"
                >
                  <img
                    src={thumb}
                    alt={post.title || 'thumbnail'}
                    className="w-full aspect-[16/9] object-cover"
                  />
                  <div className="p-5 flex flex-col">
                    <h2 className="text-[16px] font-bold text-[#1E293B] mb-3 group-hover:text-[#0ABAB5] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <div className="text-[12px] text-[#94A3B8] font-medium pt-3 border-t border-[#E2E8F0]">
                      {postDateFormatter.format(new Date(post.created_at))}
                    </div>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl p-5 border border-[#E2E8F0] hover:border-[#0ABAB5] transition-all duration-200 overflow-hidden flex flex-col deal-card"
              >
                <div className={`w-12 h-12 flex items-center justify-center bg-[#FAF6F0] rounded-xl text-2xl mb-4 transition-colors ${hoverBg}`}>
                  {icon}
                </div>

                <h2 className="text-[16px] font-bold text-[#1E293B] mb-1.5 group-hover:text-[#0ABAB5] transition-colors line-clamp-1">
                  {post.title}
                </h2>

                <p className="text-[13px] text-[#64748B] line-clamp-2 leading-relaxed mb-4 flex-1">
                  {post.description}
                </p>

                <div className="text-[12px] text-[#94A3B8] font-medium pt-3 border-t border-[#E2E8F0]">
                  {postDateFormatter.format(new Date(post.created_at))}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-[#E2E8F0]">
          <span className="text-4xl block mb-3">🗂️</span>
          <p className="text-[15px] font-semibold text-[#1E293B]">
            {normalizedQuery ? '검색 결과가 없어요.' : '이 카테고리에는 아직 글이 없어요.'}
          </p>
          <p className="text-[13px] text-[#64748B] mt-1">
            {normalizedQuery ? '다른 키워드로 검색해보세요.' : '곧 유용한 정보가 올라올 예정이에요.'}
          </p>
        </div>
      )}
    </div>
  );
}


