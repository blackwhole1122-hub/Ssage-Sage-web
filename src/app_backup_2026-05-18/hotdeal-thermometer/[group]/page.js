import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/lib/priceUtils';
import { extractPreferredUnitFromKeywords, matchesGroupByTitle } from '@/lib/keywordMatcher';
import ThermometerDetailClient from './ThermometerDetailClient';

const SITE_URL = 'https://www.ssagesage.com';

function formatWon(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '-';
  return `${Math.floor(n).toLocaleString()}원`;
}

function formatSignedPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.abs(n).toFixed(1);
  return n > 0 ? `+${rounded}%` : `-${rounded}%`;
}

function getRecentTrend(processedHistory) {
  if (!Array.isArray(processedHistory) || processedHistory.length < 4) {
    return { type: 'unknown', changePercent: 0 };
  }

  const recent = processedHistory.slice(-3);
  const previous = processedHistory.slice(-6, -3);
  if (previous.length === 0) {
    return { type: 'unknown', changePercent: 0 };
  }

  const recentAvg = recent.reduce((sum, row) => sum + row.price, 0) / recent.length;
  const previousAvg = previous.reduce((sum, row) => sum + row.price, 0) / previous.length;
  if (!Number.isFinite(recentAvg) || !Number.isFinite(previousAvg) || previousAvg <= 0) {
    return { type: 'unknown', changePercent: 0 };
  }

  const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
  const abs = Math.abs(changePercent);
  if (abs < 2) return { type: 'flat', changePercent };
  if (changePercent > 0) return { type: 'up', changePercent };
  return { type: 'down', changePercent };
}

function getPriceGuide(refLow, refAvg) {
  if (!refLow || !refAvg) return null;

  const safeLow = Math.floor(refLow);
  const good = Math.floor(refAvg * 0.95);
  const fair = Math.floor(refAvg * 1.05);

  return {
    strongDeal: safeLow,
    goodDeal: good,
    fairUpper: fair,
  };
}

function buildAnalysisSections({
  productName,
  unitLabel,
  refLow,
  refAvg,
  lastPrice,
  grade,
  processedHistory,
}) {
  const sampleCount = processedHistory.length;
  const hasComparison = refLow > 0 && refAvg > 0 && lastPrice > 0;
  const avgDiffPercent = hasComparison ? ((lastPrice - refAvg) / refAvg) * 100 : null;
  const lowDiffPercent = hasComparison ? ((lastPrice - refLow) / refLow) * 100 : null;
  const trend = getRecentTrend(processedHistory);
  const guide = getPriceGuide(refLow, refAvg);

  const summary = [];
  if (!hasComparison) {
    summary.push(`${productName}는 아직 비교용 데이터가 충분하지 않아 현재 가격 흐름을 참고용으로 보는 편이 좋아요.`);
  } else {
    summary.push(`현재 ${productName}의 마지막 확인 가격은 ${unitLabel} ${formatWon(lastPrice)} 수준입니다.`);

    if (avgDiffPercent <= -5) {
      summary.push(`최근 3개월 평균가보다 ${Math.abs(avgDiffPercent).toFixed(1)}% 낮아 평균 대비로는 꽤 괜찮은 구간에 들어와 있어요.`);
    } else if (avgDiffPercent < 0) {
      summary.push(`최근 3개월 평균가보다 ${Math.abs(avgDiffPercent).toFixed(1)}% 낮아 무난하게 접근할 수 있는 가격대로 보입니다.`);
    } else if (avgDiffPercent >= 5) {
      summary.push(`최근 3개월 평균가보다 ${avgDiffPercent.toFixed(1)}% 높아 급하게 살 이유가 없다면 조금 더 지켜보는 쪽이 나아요.`);
    } else {
      summary.push(`최근 3개월 평균가와 큰 차이가 없는 평이한 구간이라, 꼭 필요한 상황인지가 구매 판단의 핵심입니다.`);
    }

    if (lowDiffPercent !== null) {
      if (lowDiffPercent <= 3) {
        summary.push(`1년 최저가와도 차이가 크지 않아 최근 기준으로는 매력도가 높은 편이에요.`);
      } else if (lowDiffPercent <= 10) {
        summary.push(`1년 최저가보다는 조금 높지만, 과거 저점과의 간격이 아주 큰 편은 아닙니다.`);
      } else {
        summary.push(`다만 1년 최저가와는 아직 ${lowDiffPercent.toFixed(1)}% 정도 차이가 있어, 저점 재등장을 기다리는 선택지도 남아 있어요.`);
      }
    }

    if (trend.type === 'up') {
      summary.push(`최근 수집 구간만 놓고 보면 직전 흐름보다 ${trend.changePercent.toFixed(1)}% 정도 올라가는 방향이라, 추가 상승 전에 필요 수량만 먼저 사는 전략도 생각할 수 있습니다.`);
    } else if (trend.type === 'down') {
      summary.push(`최근 수집 구간만 보면 직전 흐름보다 ${Math.abs(trend.changePercent).toFixed(1)}% 정도 내려오고 있어, 조금 더 눌림이 나오는지 확인해볼 여지도 있어요.`);
    } else if (trend.type === 'flat') {
      summary.push(`최근 흐름은 큰 변동 없이 비슷한 구간에서 움직여서, 급등락보다는 안정 구간에 가깝습니다.`);
    }
  }

  const buyingGuide = guide
    ? `${productName}는 보통 ${unitLabel} ${formatWon(guide.goodDeal)} 이하로 내려오면 무난하게 볼 수 있고, ${formatWon(guide.strongDeal)} 안팎이면 강한 핫딜로 해석하기 좋습니다. 반대로 ${formatWon(guide.fairUpper)}를 웃돌면 평균 대비로는 다소 비싸게 느껴질 수 있어요.`
    : `${productName}는 아직 기준가 데이터가 부족해서 특정 가격대를 단정하기보다, 최근 가격 이력이 계속 쌓이는지부터 함께 보는 편이 좋습니다.`;

  const caution = `${productName}를 비교할 때는 단순 표기 가격보다 ${unitLabel} 단가 기준을 먼저 보는 편이 안전합니다. 묶음 수량, 무료배송 여부, 패키지 구성 변경, 카드 할인 포함 여부에 따라 체감 가격이 달라질 수 있고, 같은 상품명이라도 세부 옵션이 다르면 단가 비교가 어긋날 수 있어요.`;

  let recommendation = `${productName}가 지금 꼭 필요한 상황이라면 현재 가격도 참고 가능한 범위일 수 있지만, 대량 구매나 재구매 목적이라면 평균가와 저점 대비 차이를 한 번 더 확인한 뒤 결정하는 편이 좋습니다.`;
  if (grade === '역대급' || grade === '대박') {
    recommendation = `${productName}를 바로 써야 하거나 재고를 채워야 하는 상황이라면 지금 가격의 설득력이 충분한 편입니다. 특히 반복 구매 품목이라면 과거 평균 대비 메리트가 살아 있는 구간으로 볼 수 있어요.`;
  } else if (grade === '구매금지') {
    recommendation = `${productName}가 당장 급한 품목이 아니라면 지금은 기다리는 쪽이 더 합리적입니다. 현재 가격이 최근 평균보다 높은 구간일 가능성이 커서, 대체재가 있으면 잠시 보류하는 편이 좋아요.`;
  }

  const faq = [
    {
      question: `${unitLabel} 기준으로 보는 이유는?`,
      answer: `묶음 수량이나 용량이 달라도 같은 기준으로 비교해야 실제 체감 가격을 판단할 수 있기 때문입니다. 표기 가격만 보면 저렴해 보여도 ${unitLabel} 기준으로는 오히려 비쌀 수 있어요.`,
    },
    {
      question: '3개월 평균가는 어떻게 해석하면 되나요?',
      answer: '최근 시장 가격의 평소 구간을 보여주는 기준선으로 생각하면 됩니다. 현재 가격이 평균보다 충분히 낮으면 상대적으로 매력적인 구간, 높으면 기다릴 여지가 있는 구간으로 볼 수 있어요.',
    },
    {
      question: '1년 최저가와 차이가 크면 무조건 기다려야 하나요?',
      answer: '항상 그런 건 아닙니다. 최저가는 일시적인 특가일 수 있어서 재현되지 않을 수도 있어요. 그래서 최저가만 보지 말고 평균가, 최근 흐름, 필요 시점까지 함께 보는 편이 현실적입니다.',
    },
  ];

  return {
    summary: summary.join(' '),
    buyingGuide,
    caution,
    recommendation,
    faq,
    stats: {
      sampleCount,
      avgDiffPercent,
      avgDiffText: formatSignedPercent(avgDiffPercent),
      lowDiffPercent,
      lowDiffText: formatSignedPercent(lowDiffPercent),
    },
  };
}

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
  const hasComparison = refAvg > 0 && lastPrice > 0;
  const diffPercent = hasComparison ? Math.abs(((lastPrice - refAvg) / refAvg) * 100) : 0;
  const comparisonType = !hasComparison ? 'none' : lastPrice < refAvg ? 'lower' : lastPrice > refAvg ? 'higher' : 'same';
  const analysis = buildAnalysisSections({
    productName: product.group_name,
    unitLabel,
    refLow,
    refAvg,
    lastPrice,
    grade,
    processedHistory,
  });

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: analysis.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="max-w-xl mx-auto bg-gray-50 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-5">
          <div className="space-y-2">
            <h2 className="text-[15px] font-black text-gray-900">구매 판단 요약</h2>
            <p className="text-xs text-gray-700 leading-7">{analysis.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400">최근 비교</p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {analysis.stats.avgDiffText ? `${analysis.stats.avgDiffText} vs 평균가` : '데이터 확인중'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400">표본 수</p>
              <p className="mt-1 text-sm font-black text-gray-900">{analysis.stats.sampleCount}개</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-[15px] font-black text-gray-900">싸게 사는 기준</h2>
          <p className="text-xs text-gray-700 leading-7">{analysis.buyingGuide}</p>
        </section>

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-[15px] font-black text-gray-900">가격 비교 시 주의점</h2>
          <p className="text-xs text-gray-700 leading-7">{analysis.caution}</p>
        </section>

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-[15px] font-black text-gray-900">추천/비추천 상황</h2>
          <p className="text-xs text-gray-700 leading-7">{analysis.recommendation}</p>
        </section>

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-[15px] font-black text-gray-900">자주 묻는 질문</h2>
          <div className="space-y-4">
            {analysis.faq.map((item) => (
              <div key={item.question} className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-black text-gray-900">{`Q. ${item.question}`}</p>
                <p className="mt-2 text-xs text-gray-700 leading-7">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


