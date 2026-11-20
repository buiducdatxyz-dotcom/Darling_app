import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, RotateCcw, Heart, ArrowRight, ShieldCheck, Flame, Compass, Star } from 'lucide-react';
import { parseLunarFromDob, evaluateLunarCompatibility, LunarInfo } from '../utils/astrologyAndLunar';

interface LunarHoroscopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToCupid: (promptText: string) => void;
  userDob?: string;
  userName?: string;
  userZodiac?: string;
}

const LUNAR_ANIMALS_DATA = [
  { value: 'Tý', name: 'Tý (Chuột)', element: 'Thủy', symbol: '🐭' },
  { value: 'Sửu', name: 'Sửu (Trâu)', element: 'Thổ', symbol: '🐂' },
  { value: 'Dần', name: 'Dần (Hổ)', element: 'Mộc', symbol: '🐅' },
  { value: 'Mão', name: 'Mão (Mèo)', element: 'Mộc', symbol: '🐱' },
  { value: 'Thìn', name: 'Thìn (Rồng)', element: 'Thổ', symbol: '🐉' },
  { value: 'Tỵ', name: 'Tỵ (Rắn)', element: 'Hỏa', symbol: '🐍' },
  { value: 'Ngọ', name: 'Ngựa (Ngọ)', element: 'Hỏa', symbol: '🐎' },
  { value: 'Mùi', name: 'Mùi (Dê)', element: 'Thổ', symbol: '🐐' },
  { value: 'Thân', name: 'Thân (Khỉ)', element: 'Kim', symbol: '🐒' },
  { value: 'Dậu', name: 'Dậu (Gà)', element: 'Kim', symbol: '🐓' },
  { value: 'Tuất', name: 'Tuất (Chó)', element: 'Thổ', symbol: '🐕' },
  { value: 'Hợi', name: 'Hợi (Lợn)', element: 'Thủy', symbol: '🐖' }
];

export function LunarHoroscopeModal({
  isOpen,
  onClose,
  onSendToCupid,
  userDob = '2000-01-01',
  userName = 'Bạn',
  userZodiac = 'Bảo Bình'
}: LunarHoroscopeModalProps) {
  const [userLunar, setUserLunar] = useState<LunarInfo>(() => parseLunarFromDob(userDob));
  const [partnerAnimal, setPartnerAnimal] = useState('Dậu');
  const [partnerElement, setPartnerElement] = useState('Kim');
  const [isDivining, setIsDivining] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  // Sync user info if dob changes
  useEffect(() => {
    setUserLunar(parseLunarFromDob(userDob));
  }, [userDob]);

  const handleStartDivination = () => {
    setIsDivining(true);
    setResultReady(false);

    setTimeout(() => {
      setIsDivining(false);
      setResultReady(true);
    }, 2000);
  };

  const analysis = evaluateLunarCompatibility(
    userLunar.animal,
    partnerAnimal,
    userLunar.element,
    partnerElement
  );

  const handleConfirmAndSend = () => {
    const promptText = `☯️ **KẾT QUẢ XEM TỬ VI 12 CON GIÁP & VẬN TRÌNH TÌNH DUYÊN:**
- **Thông tin của mình (${userName}):**
  + Năm sinh: ${userLunar.year} (Can Chi: ${userLunar.canChi})
  + Tuổi con giáp: ${userLunar.animalFullName}
  + Ngũ hành nạp âm: ${userLunar.elementFull}
  + Cung hoàng đạo: ${userZodiac}

- **Thông tin đối phương:**
  + Tuổi con giáp: ${LUNAR_ANIMALS_DATA.find(a => a.value === partnerAnimal)?.name || partnerAnimal}
  + Bản mệnh: Mệnh ${partnerElement}

- **Kết quả quẻ Tử vi bước đầu:**
  + Độ tương hợp: ${analysis.typeTitle} (${analysis.score}/100 điểm)
  + Tương tác ngũ hành: ${analysis.elementRelation}
  + Nhận xét sơ lược: ${analysis.summary}

🏹 **Cupid AI ơi:** Hãy phân tích sâu sắc lá số tử vi kết hợp tình duyên của hai tuổi này:
1. Đọc vị tính cách và xung đột tiềm ẩn giữa hai người.
2. Cách hóa giải điểm khắc (nếu có) và mẹo kích hoạt cung Đào hoa / tình cảm gia tăng gắn kết.
3. Cho mình lời khuyên tâm lý tinh tế nhất nhé!`;

    onSendToCupid(promptText);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="w-full max-w-xl bg-gradient-to-b from-[#1c120c] via-[#120a06] to-[#0a0503] rounded-3xl border border-amber-600/30 text-white shadow-[0_25px_80px_rgba(217,119,6,0.25)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-amber-500/20 flex items-center justify-between bg-amber-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">☯️</span>
            <div>
              <h3 className="font-extrabold text-[16px] text-amber-300 tracking-wide">
                Bói Tử Vi & 12 Con Giáp
              </h3>
              <p className="text-[11px] text-amber-200/70">
                Thiên Can, Địa Chi & Vận Duyên Tình Cảm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {resultReady && (
              <button
                onClick={() => setResultReady(false)}
                className="p-1.5 text-amber-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Khởi quẻ lại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-amber-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {/* STEP 1: CONFIG & WHEEL SELECTION */}
            {!resultReady && !isDivining && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-md flex flex-col items-center text-center"
              >
                {/* Yin Yang Symbol Animation */}
                <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                    className="w-16 h-16 rounded-full border-2 border-amber-400/40 flex items-center justify-center text-3xl shadow-inner bg-gradient-to-tr from-amber-900 to-black"
                  >
                    ☯️
                  </motion.div>
                </div>

                <h4 className="text-xl font-black text-amber-300 mb-1">
                  Luận Giải Vận Trình Tình Duyên
                </h4>
                <p className="text-[12.5px] text-amber-100/80 mb-5 leading-relaxed">
                  Hệ thống tự động tra cứu tuổi Âm Lịch theo hồ sơ của bạn và đối chiếu tương sinh tương khắc với người ấy.
                </p>

                {/* Profile Box */}
                <div className="w-full bg-amber-950/40 border border-amber-600/30 rounded-2xl p-3.5 mb-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      Tuổi của bạn (Từ hồ sơ cá nhân):
                    </span>
                    <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      {userLunar.canChi} ({userLunar.year})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-[10px] block">Con giáp:</span>
                      <span className="font-extrabold text-white text-[13px]">{userLunar.animalFullName}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-[10px] block">Ngũ hành:</span>
                      <span className="font-extrabold text-amber-300 text-[13px]">{userLunar.elementFull.split(' ')[0]} {userLunar.elementFull.split(' ')[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Partner Animal Selector */}
                <div className="w-full bg-amber-950/40 border border-amber-600/30 rounded-2xl p-3.5 mb-6 text-left">
                  <span className="text-[11px] font-bold uppercase text-amber-400 block mb-2">
                    Chọn tuổi con giáp của người ấy (Crush / Người yêu):
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Tuổi con giáp:</label>
                      <select
                        value={partnerAnimal}
                        onChange={(e) => setPartnerAnimal(e.target.value)}
                        className="w-full bg-black/50 border border-amber-500/40 rounded-xl px-3 py-2 text-[13px] font-bold text-white outline-none focus:border-amber-400"
                      >
                        {LUNAR_ANIMALS_DATA.map(a => (
                          <option key={a.value} value={a.value} className="bg-gray-900 text-white">
                            {a.symbol} {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Mệnh ngũ hành:</label>
                      <select
                        value={partnerElement}
                        onChange={(e) => setPartnerElement(e.target.value)}
                        className="w-full bg-black/50 border border-amber-500/40 rounded-xl px-3 py-2 text-[13px] font-bold text-white outline-none focus:border-amber-400"
                      >
                        <option value="Kim" className="bg-gray-900">Mệnh Kim</option>
                        <option value="Thủy" className="bg-gray-900">Mệnh Thủy</option>
                        <option value="Mộc" className="bg-gray-900">Mệnh Mộc</option>
                        <option value="Hỏa" className="bg-gray-900">Mệnh Hỏa</option>
                        <option value="Thổ" className="bg-gray-900">Mệnh Thổ</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleStartDivination}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 hover:brightness-110 text-white font-extrabold text-[15px] rounded-2xl shadow-[0_8px_25px_rgba(245,158,11,0.35)] active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  Khởi Quẻ & Luận Tử Vi Tình Duyên
                </button>
              </motion.div>
            )}

            {/* STEP 2: DIVINING ANIMATION */}
            {isDivining && (
              <motion.div
                key="divining"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="w-32 h-32 rounded-full border-4 border-dashed border-amber-400/60 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
                      className="w-20 h-20 rounded-full border-2 border-amber-300/40 flex items-center justify-center text-4xl"
                    >
                      ☯️
                    </motion.div>
                  </motion.div>
                </div>

                <p className="text-amber-300 font-extrabold text-[16px] animate-pulse">
                  Đang lập lá số & định vị quẻ Tử Vi...
                </p>
                <p className="text-amber-100/70 text-xs mt-1">
                  Đối chiếu Thiên can, Địa chi và Ngũ hành âm dương ✨
                </p>
              </motion.div>
            )}

            {/* STEP 3: RESULT DISPLAY */}
            {resultReady && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center py-1 text-center"
              >
                {/* Score badge */}
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/40 px-4 py-1.5 rounded-full mb-3 shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-[13px] font-extrabold text-amber-200">
                    {analysis.typeTitle}
                  </span>
                  <span className="bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
                    {analysis.score}/100
                  </span>
                </div>

                <h4 className="text-2xl font-black text-white mb-1">
                  Tuổi {userLunar.animal} 💖 Tuổi {partnerAnimal}
                </h4>
                <p className="text-amber-200/80 text-xs mb-4">
                  {analysis.elementRelation}
                </p>

                {/* Insight Cards */}
                <div className="w-full space-y-3 mb-6 text-left">
                  <div className="bg-amber-950/40 border border-amber-600/30 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold uppercase text-amber-400 block mb-1">
                      Tổng quan duyên phận:
                    </span>
                    <p className="text-[13px] text-white/90 leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>

                  <div className="bg-amber-950/40 border border-amber-600/30 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold uppercase text-amber-400 block mb-1">
                      Tính cách & Sự kết nối:
                    </span>
                    <p className="text-[12.5px] text-white/80 leading-relaxed">
                      {analysis.details}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-amber-950/60 to-red-950/60 border border-amber-500/40 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold uppercase text-amber-300 block mb-1">
                      Bí quyết giao tiếp & Hóa giải:
                    </span>
                    <p className="text-[12.5px] text-amber-100/90 leading-relaxed italic">
                      "{analysis.communicationTip}"
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => setResultReady(false)}
                    className="py-3 px-4 bg-white/10 hover:bg-white/20 text-amber-200 font-bold text-xs rounded-xl transition-colors"
                  >
                    Xem tuổi khác
                  </button>

                  <button
                    onClick={handleConfirmAndSend}
                    className="flex-1 py-3.5 px-6 bg-gradient-to-r from-[#ff2d55] via-[#ff477e] to-pink-500 hover:brightness-110 text-white font-extrabold text-[14px] rounded-xl shadow-[0_8px_25px_rgba(255,45,85,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    Đưa kết quả cho Cupid AI phân tích
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
