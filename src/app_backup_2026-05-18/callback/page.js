'use client'
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  return (
    <div style={{padding: '40px', fontFamily: 'monospace'}}>
      <h1>Threads OAuth Callback</h1>
      {code ? (
        <>
          <p style={{color: 'green'}}>✅ code 받기 성공!</p>
          <p>아래 code를 복사하세요:</p>
          <textarea
            readOnly
            value={code}
            style={{width: '100%', height: '100px', fontSize: '12px'}}
          />
        </>
      ) : (
        <p style={{color: 'red'}}>❌ code가 없어요.</p>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>로딩중...</div>}>
      <CallbackContent />
    </Suspense>
  );
}