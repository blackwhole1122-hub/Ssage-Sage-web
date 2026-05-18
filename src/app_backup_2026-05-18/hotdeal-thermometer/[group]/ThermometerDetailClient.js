'use client';

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

export default function ThermometerDetailClient({
  productName,
  unitLabel,
  processedHistory,
  historyRows,
}) {
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(15);

  const lineData = useMemo(
    () => ({
      labels: processedHistory.map((h) =>
        new Date(h.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
      ),
      datasets: [
        {
          data: processedHistory.map((h) => h.price),
          fill: true,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.05)',
          tension: 0.3,
          pointRadius: 1,
        },
      ],
    }),
    [processedHistory]
  );

  const visibleHistoryRows = historyRows.slice(0, visibleHistoryCount);
  const hasMoreHistory = visibleHistoryCount < historyRows.length;

  return (
    <>
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <h2 className="text-[15px] font-black text-gray-900 mb-2">{`${productName} 가격 추이 그래프`}</h2>
        <h3 className="text-sm font-black text-gray-800 mb-6">{`${unitLabel} 가격 변화 흐름`}</h3>
        <div className="h-48 w-full">
          {processedHistory.length > 0 ? (
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          ) : (
            <div className="text-center text-gray-400 py-20 text-xs italic">가격 이력이 아직 없습니다.</div>
          )}
        </div>
      </div>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <h2 className="text-[15px] font-black text-gray-900 mb-4">수집가격 이력 (최근 1년)</h2>
        {visibleHistoryRows.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left px-3 py-2 border-b border-gray-200">날짜</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">품목</th>
                    <th className="text-right px-3 py-2 border-b border-gray-200">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHistoryRows.map((row, idx) => {
                    const dateText = new Date(row.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    });
                    return (
                      <tr key={`${row.date}-${idx}`} className="text-gray-700">
                        <td className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">{dateText}</td>
                        <td className="px-3 py-2 border-b border-gray-100">{row.title || productName}</td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap">
                          {`${Math.floor(row.price).toLocaleString()}원 (${row.label || unitLabel})`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMoreHistory && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleHistoryCount((prev) => prev + 15)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-[12px] font-bold text-[#0ABAB5] bg-[#E6FAF9] hover:bg-[#D6F5F3] transition-colors"
                >
                  더보기
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-500">수집된 가격 이력이 아직 없습니다.</p>
        )}
      </section>
    </>
  );
}

