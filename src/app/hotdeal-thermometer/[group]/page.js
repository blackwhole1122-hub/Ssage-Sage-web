import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/lib/priceUtils';
import { extractPreferredUnitFromKeywords, matchesGroupByTitle } from '@/lib/keywordMatcher';
import ThermometerDetailClient from './ThermometerDetailClient';

const SITE_URL = 'https://www.ssagesage.com';

function getStrictPriceByPreferredUnit(row, preferredUnit) {
  if (preferredUnit === '100g') {
    const v = Number(row?.price_per_100g);
    return Number.isFinite(v) && v > 0 ? { price: v, label: '100g당' } : { price: 0, label: '100g당' };
  }
  if (preferredUnit === '100ml') {
    const v = Number(row?.price_per_100ml);
    return Number.isFinite(v) && v > 0 ? { price: v, label: '100ml당' } : { price: 0, label: '100ml당' };
  }
  if (preferredUnit === 'unit') {
    const v = Number(row?.price_per_unit);
    const unitCount = Number(row?.count);
    const label = unitCount > 1 ? '1개당' : '개당';
    return Number.isFinite(v) && v > 0 ? { price: v, label } : { price: 0, label };
  }
  return { price: 0, label: '단위가' };
}

function gradeStyles(grade) {
  return {
    역대급: 'bg-purple-600 text-white',
    대박: 'bg-red-500 text-white',
    중박: 'bg-orange-400 text-white',
    평범: 'bg-gray-400 text-white',
    구매금지: 'bg-black text-white',
  }[grade] || 'bg-gray-400 text-white';
}

async function getDetailData(groupSlug) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const [{ data: product }, { data: benchmark }, { data: priceHistory }] = await Promise.all([
    supabase.from('keyword_groups').select('*').eq('slug', groupSlug).maybeSingle(),
    supabase.from('price_benchmarks').select('*').eq('slug', groupSlug).maybeSingle(),
    supabase
      .from('price_history')
      .select('*')
      .eq('group_slug', groupSlug)
      .order('crawled_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true, nullsFirst: false }),
  ]);

  if (!product) return null;

  const preferredUnit = extractPreferredUnitFromKeywords(product.keywords || []);
  const processedHistory = (priceHistory || [])
    .filter((row) => matchesGroupByTitle(row.title || row.group_name || '', product.keywords || []))
    .map((row) => {
      const unit = getStrictPriceByPreferredUnit(row, preferredUnit);
      return {
        ...row,
        price: unit.price,
        label: unit.label,
        date: row.crawled_at || row.created_at,
      };
    })
    .filter((row) => Number.isFinite(row.price) && row.price > 0);

  const latest = processedHistory.length > 0 ? processedHistory[processedHistory.length - 1] : null;
  const refLow = Number(benchmark?.ref_low) || 0;
  const refAvg = Number(benchmark?.ref_avg) || 0;
  const lastPrice = Number(latest?.price) || 0;
  const grade = refLow > 0 && refAvg > 0 ? calculateGrade(refAvg, refLow, refAvg) : null;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const historyRows = processedHistory
    .filter((row) => {
      const d = new Date(row.date);
      return !Number.isNaN(d.getTime()) && d >= oneYearAgo;
    })
    .reverse();

  return {
    product,
    benchmark,
    processedHistory,
    historyRows,
    refLow,
    refAvg,
    lastPrice,
    unitLabel: latest?.label || '단위가',
    grade,
  };
}

export async function generateMetadata({ params }) {
  const { group } = await params;
  const data = await getDetailData(group);
  if (!data) {
    return {
      title: '상품을 찾을 수 없습니다',
      robots: { index: false, follow: false },
    };
  }

  const keyword = data.product.group_name;
  const title = `${keyword} 가격 이력·최저가 추이 | 핫딜온도계`;
  const description = `[${keyword}] 가격이 평소보다 싼지 핫딜온도계로 확인하세요. 최근 가격, 평균가, 최저가를 비교해 진짜 핫딜인지 볼 수 있습니다.`;
  const canonical = `${SITE_URL}/hotdeal-thermometer/${data.product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'ko_KR',
      siteName: '싸게사게',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export const revalidate = 300;

export default async function ThermometerDetailPage({ params }) {
  const { group } = await params;
  const data = await getDetailData(group);
  if (!data) notFound();

  const { product, refLow, refAvg, lastPrice, unitLabel, grade, processedHistory, historyRows } = data;
  const canonical = `${SITE_URL}/hotdeal-thermometer/${product.slug}`;
  const coupangSearchUrl = `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(product.group_name)}`;
  const coupangRedirectUrl = `/api/coupang?url=${encodeURIComponent(coupangSearchUrl)}`;
  const hasComparison = refAvg > 0 && lastPrice > 0;
  const diffPercent = hasComparison ? Math.abs(((lastPrice - refAvg) / refAvg) * 100) : 0;
  const comparisonType = !hasComparison ? 'none' : lastPrice < refAvg ? 'lower' : lastPrice > refAvg ? 'higher' : 'same';

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.group_name} 가격 이력`,
    category: product.category || undefined,
    image: `https://bpoerueomemrufjoxrej.supabase.co/storage/v1/object/public/thermometer/${product.slug}.png`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KRW',
      price: lastPrice > 0 ? Math.floor(lastPrice) : undefined,
      availability: 'https://schema.org/InStock',
      url: canonical,
    },
  };

  return (
    <div className="max-w-xl mx-auto bg-gray-50 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <header className="p-4 flex items-center bg-white border-b sticky top-0 z-10">
        <Link href="/hotdeal-thermometer" className="mr-4">
          ←
        </Link>
        <h1 className="text-sm font-black text-gray-800">{`${product.group_name} 가격 이력`}</h1>
      </header>

      <main className="p-6 space-y-6">
        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-[15px] font-black text-gray-900">{`${product.group_name} 평균가격`}</h2>
          <div className="flex justify-between items-center text-gray-400">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${gradeStyles(grade)}`}>{grade || '분석중'}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">{`${unitLabel} 기준`}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-6 border-t border-gray-50">
            <div className="space-y-1">
              <p className="text-[9px] text-gray-400 font-bold">1년 최저가</p>
              <p className="text-base font-black text-purple-600 truncate">{refLow > 0 ? `${Math.floor(refLow).toLocaleString()}원` : '-'}</p>
            </div>
            <div className="space-y-1 text-center border-x border-gray-50">
              <p className="text-[9px] text-gray-400 font-bold">평균가(3개월)</p>
              <p className="text-base font-black text-gray-800 truncate">{refAvg > 0 ? `${Math.floor(refAvg).toLocaleString()}원` : '-'}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] text-gray-400 font-bold">마지막 가격</p>
              <p className="text-base font-black text-blue-600 truncate">{lastPrice > 0 ? `${Math.floor(lastPrice).toLocaleString()}원` : '-'}</p>
            </div>
          </div>
        </section>

        <ThermometerDetailClient
          productName={product.group_name}
          unitLabel={unitLabel}
          processedHistory={processedHistory}
          historyRows={historyRows}
        />

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-black text-gray-800">{`${product.group_name}가격, 어떻게 보면 될까요?`}</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            {comparisonType === 'none' && '비교할 데이터가 아직 충분하지 않아 참고용으로 확인해 주세요.'}
            {comparisonType === 'lower' && (
              <>마지막 가격이 평균가보다 약 <strong>{diffPercent.toFixed(1)}%</strong> 낮은 상태예요.</>
            )}
            {comparisonType === 'higher' && (
              <>마지막 가격이 평균가보다 약 <strong>{diffPercent.toFixed(1)}%</strong> 높은 상태예요.</>
            )}
            {comparisonType === 'same' && '마지막 가격이 평균가와 거의 비슷한 상태예요.'}
          </p>
        </section>

        <div>
          <a
            href={coupangRedirectUrl}
            rel="sponsored"
            className="block w-full text-center bg-[#0ABAB5] hover:bg-[#09A7A2] text-white font-extrabold text-[16px] py-4 rounded-2xl transition-colors"
          >
            쿠팡에서 최저가 구매하기
          </a>
          <p className="mt-2 text-[11px] text-gray-500 text-center">
            이 포스팅은 제휴마케팅 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}

