import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Crown, Heart, Music2, Shield, Sparkles, Users, X, Zap } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onPremiumActivated?: () => void;
}

export function PremiumModal({ isOpen, onClose, userName = 'Bạn', onPremiumActivated }: PremiumModalProps) {
  const [showTrialCode, setShowTrialCode] = useState(false);
  const [trialCode, setTrialCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowTrialCode(false);
      setTrialCode('');
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const redeemTrial = async () => {
    if (isRedeeming) return;
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
    if (!userId) {
      setFeedback({ text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', error: true });
      return;
    }
    setIsRedeeming(true);
    setFeedback(null);
    try {
      const response = await apiFetch('/api/premium/redeem-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trialCode.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Không kích hoạt được mã dùng thử.');
      setSubscribed(true);
      setFeedback({ text: `Premium dùng thử đã được kích hoạt cho ${userName}.`, error: false });
      onPremiumActivated?.();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Không kích hoạt được mã dùng thử.', error: true });
    } finally {
      setIsRedeeming(false);
    }
  };

  const premiumBenefits = [
    { icon: Shield, color: 'text-cyan-300', title: 'Không có quảng cáo', description: 'Duyệt hồ sơ liền mạch, không chèn quảng cáo.' },
    { icon: Sparkles, color: 'text-sky-300', title: 'Xem lại hồ sơ đã lướt', description: 'Mở lại hồ sơ bạn đã bỏ qua sau khi xem hết.' },
    { icon: Users, color: 'text-indigo-300', title: 'Ưu tiên hiển thị hồ sơ', description: 'Hồ sơ Premium được xếp trước khi các hồ sơ có cùng điểm tương hợp.' },
    { icon: Heart, color: 'text-rose-300', title: 'Lượt thích không giới hạn', description: 'Thể hiện sự quan tâm với mọi hồ sơ bạn yêu thích.' },
    { icon: Music2, color: 'text-sky-300', title: 'Âm nhạc hồ sơ', description: 'Thêm đoạn nhạc 15 giây và nghe nhạc trên hồ sơ.' },
    { icon: Sparkles, color: 'text-violet-300', title: 'Bộ công cụ DSS', description: 'Cupid AI, Tử vi, Trải bài Tarot và Chiêm tinh.' },
  ];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/85 p-4 font-sans backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[92%] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-sky-300/25 bg-gradient-to-b from-[#102d4b] via-[#0a1a2f] to-[#06101e] text-white shadow-[0_25px_80px_rgba(14,165,233,0.3)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-sky-300/15 bg-sky-950/35 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-sky-400 text-slate-950 shadow-lg"><Crown className="h-5 w-5" /></div>
            <div><h2 className="font-extrabold">Cupid Premium</h2><p className="text-xs text-sky-200">Gói hội viên 1 tháng</p></div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-sky-100/70 hover:bg-white/10 hover:text-white" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {subscribed ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-emerald-300"><Check className="h-8 w-8" /></div>
              <h3 className="text-xl font-black">Dùng thử đã kích hoạt</h3>
              <p className="mt-2 text-sm leading-relaxed text-sky-100/75">Tài khoản của bạn có quyền lợi Premium trong 7 ngày.</p>
              <button onClick={onClose} className="mt-7 w-full rounded-2xl bg-sky-500 py-3 font-extrabold text-white hover:bg-sky-400">Bắt đầu trải nghiệm</button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-200"><Sparkles className="h-3 w-3" /> Kết nối sâu sắc hơn</span>
                <h3 className="mt-3 text-2xl font-black">Dành riêng cho bạn</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-sky-100/70">Tận hưởng trải nghiệm hẹn hò tập trung và nhiều công cụ khám phá hơn.</p>
              </div>

              <div className="space-y-2.5">
                {premiumBenefits.map(({ icon: BenefitIcon, color, title, description }) => (
                  <div key={title} className="flex gap-3 rounded-2xl border border-sky-300/15 bg-white/[0.04] p-3.5">
                    <BenefitIcon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                    <div><p className="text-sm font-extrabold">{title}</p><p className="mt-0.5 text-xs leading-relaxed text-sky-100/65">{description}</p></div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl border border-amber-300/35 bg-gradient-to-r from-amber-300/15 to-sky-300/10 p-4">
                  <div><p className="text-xs font-bold text-amber-100">Premium · 1 tháng</p><p className="mt-1 text-2xl font-black">79.000 <span className="text-base">VND</span></p></div>
                  <Zap className="h-7 w-7 fill-amber-300 text-amber-300" />
                </div>
              </div>

              {!showTrialCode ? (
                <button onClick={() => { setShowTrialCode(true); setFeedback(null); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-sky-400 to-blue-500 py-3.5 font-extrabold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:brightness-110 active:scale-[0.99]">
                  <Zap className="h-5 w-5 fill-current" /> Nâng Cấp Gói Premium Ngay <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="mt-5 rounded-2xl border border-sky-300/25 bg-slate-950/45 p-4">
                  <label htmlFor="premium-trial-code" className="mb-2 block text-sm font-extrabold">Nhập mã dùng thử</label>
                  <div className="flex gap-2">
                    <input id="premium-trial-code" inputMode="numeric" autoComplete="one-time-code" value={trialCode} onChange={event => setTrialCode(event.target.value.slice(0, 32))} onKeyDown={event => { if (event.key === 'Enter') void redeemTrial(); }} placeholder="Mã dùng thử" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-300" />
                    <button disabled={!trialCode.trim() || isRedeeming} onClick={() => { void redeemTrial(); }} className="rounded-xl bg-sky-500 px-4 py-2 font-extrabold text-white hover:bg-sky-400 disabled:opacity-50">{isRedeeming ? 'Đang kiểm tra…' : 'Áp dụng'}</button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-sky-100/55">Mã hợp lệ kích hoạt Premium dùng thử 7 ngày, mỗi tài khoản dùng một lần.</p>
                </div>
              )}
              {feedback && <p role="status" className={feedback.error ? 'mt-3 rounded-xl bg-rose-400/10 px-3 py-2.5 text-sm font-semibold text-rose-200' : 'mt-3 rounded-xl bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-200'}>{feedback.text}</p>}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
