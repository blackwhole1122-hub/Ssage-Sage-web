'use client'

import { useState } from 'react';
import Link from 'next/link';
import CoupangInlineHorizontalBanner from '@/components/CoupangInlineHorizontalBanner';

export default function ImageBackgroundRemoverPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [results, setResults] = useState(null); // { weak, normal, strong }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [selectedModel, setSelectedModel] = useState('birefnet_hr');
  const [selectedVersion, setSelectedVersion] = useState('normal');

  const models = [
    {
      id: 'birefnet',
      name: 'BiRefNet',
      subtitle: '기본',
      emoji: '⚡',
      resolution: '1024px',
      speed: '빠름 (5초)',
      description: '일반 이미지에 최적'
    },
    {
      id: 'birefnet_hr',
      name: 'BiRefNet_HR',
      subtitle: '고해상도',
      emoji: '🏆',
      resolution: '2048px',
      speed: '중간 (8초)',
      description: '최고 품질'
    },
    {
      id: 'birefnet_dynamic',
      name: 'BiRefNet_dynamic',
      subtitle: '동적',
      emoji: '🎯',
      resolution: '자동',
      speed: '빠름 (6초)',
      description: '모든 해상도 자동 대응'
    }
  ];

  const versions = [
    { id: 'weak', name: '약하게', threshold: 0.2, emoji: '🟢', desc: '효과 보존' },
    { id: 'normal', name: '보통', threshold: 0.5, emoji: '🟡', desc: '균형' },
    { id: 'strong', name: '강하게', threshold: 0.8, emoji: '🔴', desc: '깔끔 제거' }
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다');
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResults(null);
      setError(null);
      setProcessingTime(null);
      setSelectedVersion('normal');
    } else {
      alert('이미지 파일만 업로드 가능합니다');
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    // ✨ [수정] rembg-api 재시도 헬퍼
    // AbortSignal.timeout() → AbortController + setTimeout 으로 교체 (구형 Chrome 호환)
    const fetchWithRetry = async (url, options, maxRetries = 3, retryDelayMs = 12000) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);
        try {
          const res = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) return res;
          // 5xx 서버 오류 시 재시도
          if (res.status >= 500 && attempt < maxRetries - 1) {
            console.warn(`rembg-api ${res.status} — ${retryDelayMs/1000}초 후 재시도 (${attempt+1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, retryDelayMs));
            continue;
          }
          throw new Error(`서버 오류 ${res.status}`);
        } catch (err) {
          clearTimeout(timeoutId);
          if (attempt < maxRetries - 1 && (err.name === 'TypeError' || err.name === 'AbortError' || String(err).includes('fetch'))) {
            console.warn(`rembg-api 연결 실패 — ${retryDelayMs/1000}초 후 재시도 (${attempt+1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, retryDelayMs));
            continue;
          }
          throw err;
        }
      }
      throw new Error('최대 재시도 횟수 초과');
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_REMBG_API_URL || 'http://100.83.35.111:8000/remove-bg';
      
      // 3가지 강도로 순차 처리
      const resultsObj = {};
      
      for (const version of versions) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('model', selectedModel);
        formData.append('threshold', version.threshold.toString());

        const response = await fetchWithRetry(apiUrl, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const blob = await response.blob();
          resultsObj[version.id] = URL.createObjectURL(blob);
        } else {
          throw new Error(`${version.name} 처리 실패`);
        }
      }
      
      setResults(resultsObj);
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      setProcessingTime(duration);

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      alert('배경 제거 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (version) => {
    if (!results || !results[version]) return;
    const a = document.createElement('a');
    a.href = results[version];
    const versionName = versions.find(v => v.id === version)?.name || '';
    const modelName = models.find(m => m.id === selectedModel)?.name || '';
    a.download = `${modelName}_${versionName}_${selectedFile?.name || 'image.png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    setProcessingTime(null);
  };

  const getCurrentModel = () => models.find(m => m.id === selectedModel);

  return (
    <div className="max-w-6xl mx-auto bg-[#FAF6F0] min-h-screen">
      <header className="sticky top-0 z-30 bg-[#FFF9E6] border-b border-[#E2E8F0]">
        <div className="bg-[#FFF9E6] px-4 py-3 flex items-center gap-3">
          <Link 
            href="/utility"
            className="text-[#64748B] hover:text-[#0ABAB5] transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <span className="text-[24px] font-black text-[#1E293B] tracking-tight">이미지 배경 제거하기</span>
        </div>

        <nav className="bg-[#FFF9E6] px-4 pb-1 flex items-center gap-5">
          <Link href="/hotdeals" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">핫딜모음</Link>
          <Link href="/coupang" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">쿠팡핫딜</Link>
          <Link href="/hotdeal-thermometer" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">핫딜온도계</Link>
          <Link href="/blog" className="py-3 text-[14px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">정보모음</Link>
          <Link href="/utility" className="relative py-3 text-[14px] font-bold text-[#0ABAB5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0ABAB5] after:rounded-full">유틸리티</Link>
        </nav>
      </header>

      <main className="px-4 py-8 md:py-12">
        <header className="mb-10">
          <p className="text-[15px] text-[#64748B] leading-relaxed mb-2">
            BiRefNet SOTA 성능 · 3가지 모델 · 3가지 강도 미리보기
          </p>
          <div className="flex items-center gap-2 text-[13px] text-[#94A3B8]">
            <span className="px-2 py-1 bg-[#E6FAF9] text-[#0ABAB5] rounded-md font-medium">무료</span>
            <span className="px-2 py-1 bg-[#E6FAF9] text-[#0ABAB5] rounded-md font-medium">무제한</span>
            <span className="px-2 py-1 bg-[#E6FAF9] text-[#0ABAB5] rounded-md font-medium">상업적 이용 가능</span>
          </div>
        </header>

        {/* AI 모델 선택 */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#E6FAF9] rounded-xl flex items-center justify-center text-2xl">🤖</div>
            <div>
              <h2 className="text-[18px] font-bold text-[#1E293B]">모델 선택</h2>
              <p className="text-[13px] text-[#64748B]">용도에 맞는 모델을 선택하세요</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedModel === model.id
                    ? 'border-[#0ABAB5] bg-[#E6FAF9]'
                    : 'border-[#E2E8F0] hover:border-[#0ABAB5]/50'
                }`}
              >
                <div className="text-3xl mb-2">{model.emoji}</div>
                <p className={`text-[14px] font-bold mb-1 ${
                  selectedModel === model.id ? 'text-[#0ABAB5]' : 'text-[#1E293B]'
                }`}>
                  {model.name}
                </p>
                <p className="text-[11px] text-[#64748B] mb-2">{model.subtitle}</p>
                <div className="text-[10px] text-[#94A3B8] space-y-1">
                  <div>📐 {model.resolution}</div>
                  <div>⏱️ {model.speed}</div>
                </div>
                <p className="text-[11px] text-[#64748B] mt-2 leading-snug">
                  {model.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 업로드 영역 */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#E6FAF9] rounded-xl flex items-center justify-center text-2xl">🖼️</div>
            <div>
              <h2 className="text-[18px] font-bold text-[#1E293B]">이미지 업로드</h2>
              <p className="text-[13px] text-[#64748B]">JPG, PNG 파일 (최대 10MB)</p>
            </div>
          </div>

          {!selectedFile && (
            <label className="block w-full border-2 border-dashed border-[#E2E8F0] rounded-xl p-8 text-center cursor-pointer hover:border-[#0ABAB5] transition-colors">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-4xl mb-3">📁</div>
              <p className="text-[14px] font-medium text-[#1E293B] mb-1">이미지를 선택하거나 드래그하세요</p>
              <p className="text-[12px] text-[#94A3B8]">PNG, JPG, JPEG 파일을 지원합니다</p>
            </label>
          )}

          {selectedFile && (
            <div className="p-4 bg-[#FAF6F0] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📎</span>
                  <div>
                    <p className="text-[13px] font-medium text-[#1E293B]">{selectedFile.name}</p>
                    <p className="text-[12px] text-[#64748B]">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · {getCurrentModel()?.emoji} {getCurrentModel()?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-[12px] text-[#64748B] hover:text-[#0ABAB5] transition-colors"
                >
                  다시 선택
                </button>
              </div>

              {!loading && !results && (
                <button
                  onClick={handleRemoveBackground}
                  className="w-full bg-[#0ABAB5] text-white py-3 rounded-xl font-bold hover:bg-[#099B96] transition-colors"
                >
                  {getCurrentModel()?.emoji} 3가지 강도로 배경 제거하기
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#0ABAB5] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[14px] text-[#64748B]">
                {getCurrentModel()?.emoji} AI가 3가지 강도로 처리하고 있어요...
              </p>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[13px] text-red-600">❌ {error}</p>
            </div>
          )}
        </div>

        {/* 결과 비교 (3가지 강도) */}
        {results && (
          <div className="bg-white rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#E6FAF9] rounded-xl flex items-center justify-center text-2xl">✨</div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1E293B]">결과 비교 ({getCurrentModel()?.name})</h2>
                  <p className="text-[13px] text-[#64748B]">원하는 강도를 선택하세요</p>
                </div>
              </div>
              {processingTime && (
                <span className="text-[12px] text-[#64748B]">⚡ {processingTime}초</span>
              )}
            </div>

            {/* 탭 */}
            <div className="flex gap-2 mb-4">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setSelectedVersion(version.id)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    selectedVersion === version.id
                      ? 'bg-[#0ABAB5] text-white shadow-lg'
                      : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
                  }`}
                >
                  <div className="text-xl mb-1">{version.emoji}</div>
                  <div className="text-[13px]">{version.name}</div>
                  <div className="text-[11px] opacity-75">{version.desc}</div>
                </button>
              ))}
            </div>

            {/* 선택된 버전 표시 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 원본 */}
              <div>
                <h3 className="text-[14px] font-bold text-[#1E293B] mb-3">원본 이미지</h3>
                <img src={previewUrl} alt="원본" className="w-full rounded-lg" />
              </div>

              {/* 선택된 결과 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-[#1E293B]">
                    {versions.find(v => v.id === selectedVersion)?.emoji} {versions.find(v => v.id === selectedVersion)?.name} 버전
                  </h3>
                </div>
                <div 
                  className="w-full rounded-lg overflow-hidden mb-3"
                  style={{ 
                    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                >
                  <img 
                    src={results[selectedVersion]} 
                    alt="결과"
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => handleDownload(selectedVersion)}
                  className="w-full bg-[#1E293B] text-white py-2 rounded-lg font-medium hover:bg-[#334155] transition-colors"
                >
                  💾 이 버전 다운로드
                </button>
              </div>
            </div>

            {/* 개별 다운로드 */}
            <div className="mt-4 p-3 bg-[#FAF6F0] rounded-lg">
              <p className="text-[12px] text-[#64748B] mb-2">💡 다른 강도도 다운로드:</p>
              <div className="flex gap-2">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleDownload(version.id)}
                    className="flex-1 py-2 bg-white rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                  >
                    {version.emoji} {version.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <CoupangInlineHorizontalBanner fillWidth />

        <div className="mt-8 p-4 bg-white rounded-xl border border-[#E2E8F0]">
          <p className="text-[12px] text-[#64748B] leading-relaxed">
            <strong>BiRefNet</strong> (MIT License): SOTA 성능의 배경 제거 AI · 3가지 모델 (기본/HR/dynamic) · 무료, 무제한, 상업적 이용 가능
          </p>
        </div>
      </main>
    </div>
  );
}
