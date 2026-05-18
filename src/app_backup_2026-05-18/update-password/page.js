'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    // 1. 비밀번호 일치 확인
    if (password !== confirmPassword) {
      setMessage("❌ 비밀번호가 서로 달라요. 다시 확인해 주세요!");
      return;
    }

    if (password.length < 8) {
      setMessage("❌ 비밀번호는 최소 8자리 이상이어야 해요!");
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 🌟 Supabase 비밀번호 업데이트 API 호출
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      setMessage('✅ 비밀번호가 변경되었어요! 잠시 후 로그인 페이지로 이동합니다.');
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error) {
      setMessage(`❌ 에러: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800">새 비밀번호 설정</h2>
          <p className="text-sm text-gray-500 mt-2">
            안전한 비밀번호로 변경하고 다시 시작해 보아요!
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자리 이상 입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-medium text-center ${message.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {loading ? '변경하는 중...' : '비밀번호 변경하기'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/login')}
            className="text-sm text-gray-400 hover:text-gray-600 underline decoration-gray-200 underline-offset-4"
          >
            나중에 변경할래요
          </button>
        </div>
      </div>
    </div>
  );
}