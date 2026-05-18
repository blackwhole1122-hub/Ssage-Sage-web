'use client'
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [telegramId, setTelegramId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const router = useRouter();

  const handleDisconnectTelegram = async () => {
    const confirmDisconnect = confirm("정말 텔레그램 연동을 해제하시겠어요? 더 이상 핫딜 알림을 받을 수 없게 됩니다.");
    if (confirmDisconnect) {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: null, auth_code: null, auth_code_expires_at: null })
        .eq('id', user.id);
      if (error) {
        alert('연동 해제 중 오류가 발생했습니다.');
      } else {
        setTelegramId(null);
        setAuthCode('');
        alert('텔레그램 연동이 해제되었습니다.');
      }
    }
  };

  const fetchData = useCallback(async (userId) => {
    const { data: kwData } = await supabase
      .from('user_keywords')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const { data: profData } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', userId)
      .single();
    if (kwData) setKeywords(kwData);
    if (profData) setTelegramId(profData.telegram_chat_id);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요해요!');
        router.push('/login');
      } else {
        setUser(session.user);
        await fetchData(session.user.id);
        setLoading(false);
      }
    };
    checkUser();
  }, [router, fetchData]);

  const generateAuthCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, auth_code: code, auth_code_expires_at: expiresAt,
        display_name: user.user_metadata?.display_name || '회원'
      });
    if (error) {
      alert('코드 생성에 실패했습니다.');
    } else {
      setAuthCode(code);
      await fetchData(user.id);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    if (keywords.some(k => k.keyword === newKeyword.trim())) {
      alert('이미 등록된 키워드예요!');
      setNewKeyword('');
      return;
    }
    const { error } = await supabase
      .from('user_keywords')
      .insert([{ user_id: user.id, keyword: newKeyword.trim() }]);
    if (error) {
      alert('키워드 추가에 실패했습니다.');
    } else {
      setNewKeyword('');
      await fetchData(user.id);
    }
  };

  const deleteKeyword = async (id) => {
    const { error } = await supabase.from('user_keywords').delete().eq('id', id);
    if (!error) await fetchData(user.id);
  };

  const handleWithdrawal = async () => {
    const confirmWithdrawal = confirm("정말 탈퇴하시겠어요? 등록된 키워드와 알림 설정이 모두 삭제됩니다.");
    if (confirmWithdrawal) {
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) throw error;
        await supabase.auth.signOut();
        alert('그동안 이용해주셔서 감사합니다.');
        router.push('/');
        router.refresh();
      } catch (error) {
        alert('탈퇴 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="loading-spinner"></div>
      <span className="text-[14px] text-[#64748B]">확인 중</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-[#FAF6F0] min-h-screen pb-10">
      
      {/* ── 헤더 ── */}
      <header className="bg-[#FFF9E6] sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b border-[#E2E8F0]">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#FAF6F0] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[15px] font-bold text-[#1E293B]">마이페이지</span>
      </header>

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* ── 프로필 카드 ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-[#E6FAF9] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0ABAB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#1E293B]">
                {user?.user_metadata?.display_name || '회원'}님
              </p>
              <p className="text-[13px] text-[#94A3B8]">핫딜 알림 관리</p>
            </div>
          </div>
        </div>

        {/* ── 키워드 알림 ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ABAB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h2 className="text-[16px] font-bold text-[#1E293B]">키워드 알림</h2>
          </div>

          {/* 키워드 입력 */}
          <div className="flex gap-2 mb-5">
            <input 
              type="text" 
              value={newKeyword} 
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="예: 아이폰, 맥북, 플스"
              className="flex-1 px-4 py-3 rounded-xl bg-[#FAF6F0] border-none focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] focus:bg-white text-[14px] placeholder:text-[#94A3B8] transition-all"
            />
            <button 
              onClick={addKeyword} 
              className="px-5 py-3 bg-[#0ABAB5] text-white font-bold text-[14px] rounded-xl hover:bg-[#089490] transition-colors flex-shrink-0"
            >
              추가
            </button>
          </div>

          {/* 등록된 키워드 */}
          <div>
            <p className="text-[12px] font-semibold text-[#94A3B8] mb-2">등록된 키워드 ({keywords.length})</p>
            {keywords.length === 0 ? (
              <p className="text-[13px] text-[#94A3B8] py-4 text-center">아직 등록된 키워드가 없어요</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <div 
                    key={kw.id} 
                    className="flex items-center gap-1.5 bg-[#E6FAF9] text-[#0ABAB5] pl-3 pr-2 py-1.5 rounded-full"
                  >
                    <span className="text-[13px] font-medium">{kw.keyword}</span>
                    <button 
                      onClick={() => deleteKeyword(kw.id)} 
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#0ABAB5] hover:text-white text-[#0ABAB5]/50 transition-colors text-[12px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 텔레그램 연동 ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ABAB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>
            </svg>
            <h2 className="text-[16px] font-bold text-[#1E293B]">텔레그램 알림</h2>
          </div>

          {telegramId ? (
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E6FAF9] rounded-full mb-3">
                <div className="w-2 h-2 rounded-full bg-[#0ABAB5]"></div>
                <span className="text-[13px] font-bold text-[#0ABAB5]">연동 완료</span>
              </div>
              <p className="text-[12px] text-[#94A3B8] mb-4">Chat ID: {telegramId}</p>
              <button 
                onClick={handleDisconnectTelegram}
                className="text-[12px] text-[#64748B] hover:text-[#FF6B6B] underline underline-offset-4 transition-colors"
              >
                연동 해제하기
              </button>
            </div>
          ) : (
            <div className="text-center py-3">
              {authCode ? (
                <div>
                  <p className="text-[12px] text-[#64748B] mb-2">아래 코드를 텔레그램 봇에 입력하세요</p>
                  <p className="text-[28px] font-extrabold text-[#0ABAB5] tracking-[0.3em] mb-4">{authCode}</p>
                  <a 
                    href={`tg://resolve?domain=Ssagesage_bot&start=${authCode}`}
                    target="_blank" 
                    className="inline-flex items-center gap-2 bg-[#0ABAB5] text-white px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-[#089490] transition-colors"
                  >
                    텔레그램에서 인증하기
                  </a>
                </div>
              ) : (
                <div>
                  <p className="text-[13px] text-[#64748B] mb-3">
                    텔레그램을 연결하면 키워드 핫딜 알림을 받을 수 있어요
                  </p>
                  <button 
                    onClick={generateAuthCode}
                    className="px-5 py-2.5 bg-[#FAF6F0] text-[#1E293B] rounded-xl font-semibold text-[14px] hover:bg-[#F0EAE0] transition-colors"
                  >
                    인증번호 발급받기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 계정 관리 ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleWithdrawal} 
              className="text-[13px] text-[#94A3B8] hover:text-[#FF6B6B] transition-colors"
            >
              회원탈퇴
            </button>
            <button 
              onClick={async () => { 
                await supabase.auth.signOut(); 
                router.push('/'); 
                router.refresh(); 
              }} 
              className="px-4 py-2 text-[14px] font-semibold text-[#64748B] hover:bg-[#FAF6F0] rounded-xl transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
