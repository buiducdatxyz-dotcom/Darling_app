import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, RotateCcw, ChevronLeft, ChevronRight, ArrowRight, Eye, Heart } from 'lucide-react';
import { TAROT_DECK, TarotCard } from '../data/tarot';

export interface DrawnCard {
  card: TarotCard;
  isReversed: boolean;
  position: 'past' | 'present' | 'future';
  positionLabel: string;
}

interface TarotInteractiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToCupid: (readingSummary: string, cards: DrawnCard[]) => void;
  userZodiac?: string;
  userName?: string;
}

export function TarotInteractiveModal({
  isOpen,
  onClose,
  onSendToCupid,
  userZodiac = 'Bảo Bình',
  userName = 'bạn'
}: TarotInteractiveModalProps) {
  // Steps:
  // 0: Intro & Question Focus
  // 1: Shuffling deck animation
  // 2: Picking 3 cards from spread
  // 3: Reveal & 3D Flip
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [pickedCards, setPickedCards] = useState<DrawnCard[]>([]);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([0, 1, 2]);
  const [selectedDetailCard, setSelectedDetailCard] = useState<DrawnCard | null>(null);

  // Deck for spreading
  const [spreadDeck, setSpreadDeck] = useState<{ id: number; card: TarotCard; isReversed: boolean }[]>([]);

  const startShuffle = () => {
    setStep(1);
    setPickedCards([]);
    setSelectedDetailCard(null);

    // Prepare a randomized subset of the tarot deck (e.g. 21 cards for arc spread)
    setTimeout(() => {
      const shuffled = [...TAROT_DECK].sort(() => 0.5 - Math.random());
      const spread = shuffled.slice(0, 21).map((card, i) => ({
        id: i,
        card,
        isReversed: Math.random() < 0.25 // 25% chance of reversed
      }));
      setSpreadDeck(spread);
      setStep(2);
    }, 2200);
  };

  const handlePickCard = (item: { id: number; card: TarotCard; isReversed: boolean }) => {
    if (pickedCards.some(p => p.card.name === item.card.name)) return;
    if (pickedCards.length >= 3) return;

    const positions: Array<{ pos: 'past' | 'present' | 'future'; label: string }> = [
      { pos: 'past', label: 'Quá Khứ / Năng Lượng Bản Thân' },
      { pos: 'present', label: 'Hiện Tại / Thử Thách & Năng Lượng Đối Phương' },
      { pos: 'future', label: 'Tương Lai / Xu Hướng & Lời Khuyên Vũ Trụ' }
    ];

    const currentPos = positions[pickedCards.length];
    const newPicked: DrawnCard = {
      card: item.card,
      isReversed: item.isReversed,
      position: currentPos.pos,
      positionLabel: currentPos.label
    };

    const updated = [...pickedCards, newPicked];
    setPickedCards(updated);

    if (updated.length === 3) {
      setTimeout(() => {
        setStep(3);
        setRevealedIdx([0, 1, 2]);
      }, 700);
    }
  };

  const handleConfirmAndSend = () => {
    if (pickedCards.length < 3) return;

    const promptText = `🔮 **KẾT QUẢ TRẢI BÀI TAROT TÌNH YÊU 3 LÁ VỪA RÚT:**
1. **Lá 1 - Quá khứ & Năng lượng bản thân:** "${pickedCards[0].card.name}" (${pickedCards[0].isReversed ? 'Lá Ngược' : 'Lá Xuôi'})
   - Ý nghĩa: ${pickedCards[0].card.meaningTop}

2. **Lá 2 - Hiện tại & Năng lượng đối phương / Thử thách:** "${pickedCards[1].card.name}" (${pickedCards[1].isReversed ? 'Lá Ngược' : 'Lá Xuôi'})
   - Ý nghĩa: ${pickedCards[1].card.meaningTop}

3. **Lá 3 - Tương lai & Lời khuyên vũ trụ:** "${pickedCards[2].card.name}" (${pickedCards[2].isReversed ? 'Lá Ngược' : 'Lá Xuôi'})
   - Ý nghĩa: ${pickedCards[2].card.meaningBottom}

🏹 **Cupid AI ơi:** Dựa vào năng lượng 3 lá bài này kết hợp cùng tính cách cung ${userZodiac} của mình, hãy phân tích sâu sắc tâm lý của đối phương, gỡ rối những khúc mắc hiện tại, và mách mình các bước hành động/mẫu câu trò chuyện khéo léo nhất để tình cảm thăng hoa nhé!`;

    onSendToCupid(promptText, pickedCards);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="w-full max-w-2xl bg-gradient-to-b from-[#180a2e] via-[#100720] to-[#0a0414] rounded-3xl border border-purple-500/30 text-white shadow-[0_25px_80px_rgba(147,51,234,0.35)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-purple-500/20 flex items-center justify-between bg-purple-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔮</span>
            <div>
              <h3 className="font-extrabold text-[16px] text-amber-200 tracking-wide flex items-center gap-1.5">
                Trải Bài Tarot Tình Yêu 3 Lá
              </h3>
              <p className="text-[11px] text-purple-300">
                Kết nối năng lượng vũ trụ cùng Cupid AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {step === 3 && (
              <button
                onClick={() => setStep(0)}
                className="p-1.5 text-purple-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Bốc lại quẻ bài"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-purple-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {/* STEP 0: INTRO */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center max-w-md py-4"
              >
                <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 bg-purple-600/30 rounded-full blur-xl animate-pulse"></div>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-800 to-pink-600 border border-purple-300/40 flex items-center justify-center text-4xl shadow-lg relative">
                    🎴
                  </div>
                </div>

                <h4 className="text-2xl font-black text-amber-200 mb-2">
                  Lắng Nghe Thông Điệp Trái Tim
                </h4>
                <p className="text-[13.5px] text-purple-200/90 leading-relaxed mb-6">
                  Hãy hít một hơi thật sâu, tịnh tâm nghĩ về người bạn đang thương hoặc khúc mắc tình cảm cần giải tỏa. 
                  Bạn sẽ tự tay rút 3 lá bài định mệnh:
                </p>

                <div className="grid grid-cols-3 gap-2.5 mb-7 text-left text-[11.5px]">
                  <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-500/20">
                    <span className="font-bold text-amber-300 block mb-0.5">1. Quá Khứ</span>
                    <span className="text-white/70">Năng lượng bản thân & gốc rễ câu chuyện</span>
                  </div>
                  <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-500/20">
                    <span className="font-bold text-pink-300 block mb-0.5">2. Hiện Tại</span>
                    <span className="text-white/70">Năng lượng đối phương & trở ngại</span>
                  </div>
                  <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-500/20">
                    <span className="font-bold text-emerald-300 block mb-0.5">3. Tương Lai</span>
                    <span className="text-white/70">Xu hướng phát triển & lời khuyên</span>
                  </div>
                </div>

                <button
                  onClick={startShuffle}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:brightness-110 text-white font-extrabold text-[15px] rounded-2xl shadow-[0_8px_25px_rgba(236,72,153,0.35)] active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  Bắt Đầu Xào Bài Vũ Trụ
                </button>
              </motion.div>
            )}

            {/* STEP 1: SHUFFLING ANIMATION */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-8"
              >
                <div className="relative w-44 h-60 mb-6">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 bg-[#251242] border-2 border-amber-400/40 rounded-2xl shadow-xl flex items-center justify-center bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-purple-900/60 to-[#1b0c33]"
                      animate={{
                        x: [0, (i % 2 === 0 ? 50 : -50), 0],
                        y: [0, -25, 0],
                        rotate: [0, (i % 2 === 0 ? 12 : -12), 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.9,
                        delay: i * 0.12,
                        ease: 'easeInOut'
                      }}
                    >
                      <div className="w-20 h-28 border border-amber-400/30 rounded-xl flex flex-col items-center justify-center">
                        <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                        <span className="text-[10px] text-amber-200 font-bold mt-2">TAROT</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <p className="text-amber-200 font-bold text-[15px] animate-pulse">
                  Đang thanh tẩy và xào bài vũ trụ...
                </p>
                <p className="text-purple-300 text-xs mt-1">
                  Hãy gửi gắm câu hỏi của bạn vào từng quân bài ✨
                </p>
              </motion.div>
            )}

            {/* STEP 2: CARD SPREAD & USER DRAWS 3 CARDS */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center py-2"
              >
                <div className="text-center mb-4">
                  <span className="text-[11px] uppercase font-bold text-amber-300 tracking-wider bg-purple-900/60 px-3 py-1 rounded-full border border-purple-500/30">
                    Bước rút bài
                  </span>
                  <h4 className="text-xl font-black text-white mt-1.5">
                    Hãy tự tay bốc {3 - pickedCards.length} lá bài nữa
                  </h4>
                  <p className="text-purple-300 text-xs">
                    Lướt qua dải bài và chạm vào lá bài thu hút trực giác của bạn nhất
                  </p>
                </div>

                {/* 3 Pick Slots */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
                  {['Quá Khứ', 'Hiện Tại', 'Tương Lai'].map((title, idx) => {
                    const card = pickedCards[idx];
                    return (
                      <div
                        key={idx}
                        className={`h-36 sm:h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-all ${
                          card
                            ? 'bg-gradient-to-b from-purple-800/80 to-indigo-900/80 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                            : 'bg-purple-950/30 border-purple-500/30'
                        }`}
                      >
                        {card ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-amber-300 font-bold uppercase mb-1">
                              {title}
                            </span>
                            <div className="w-16 h-22 rounded-lg overflow-hidden border border-amber-400/40 shadow-sm relative">
                              <img
                                src={card.card.image}
                                alt={card.card.name}
                                className={`w-full h-full object-cover ${card.isReversed ? 'rotate-180' : ''}`}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-white mt-1 line-clamp-1">
                              {card.card.name}
                            </span>
                          </div>
                        ) : (
                          <div className="text-purple-400/60 flex flex-col items-center">
                            <span className="text-2xl mb-1">{idx === 0 ? '🌱' : idx === 1 ? '🔥' : '🌟'}</span>
                            <span className="text-[11px] font-bold text-purple-300">{title}</span>
                            <span className="text-[9px] text-purple-400/70 mt-0.5">Chưa chọn</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Arc / Horizontal Deck Spread */}
                <div className="w-full overflow-x-auto py-4 px-2 flex justify-start sm:justify-center gap-1.5 sm:gap-2 hide-scrollbar">
                  {spreadDeck.map((item, i) => {
                    const isPicked = pickedCards.some(p => p.card.name === item.card.name);
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={!isPicked ? { y: -16, scale: 1.08 } : {}}
                        whileTap={!isPicked ? { scale: 0.95 } : {}}
                        onClick={() => handlePickCard(item)}
                        disabled={isPicked || pickedCards.length >= 3}
                        className={`w-12 sm:w-14 h-20 sm:h-24 rounded-xl shrink-0 border border-amber-400/40 bg-gradient-to-b from-[#2d1554] via-[#1c0d35] to-[#120824] shadow-md flex items-center justify-center transition-opacity relative overflow-hidden ${
                          isPicked ? 'opacity-25 pointer-events-none' : 'cursor-pointer hover:border-amber-300'
                        }`}
                      >
                        <div className="w-8 h-14 border border-amber-400/20 rounded-md flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300/60" />
                        </div>
                        {/* Glow on hover */}
                        <div className="absolute inset-0 bg-amber-400/0 hover:bg-amber-400/10 transition-colors pointer-events-none" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: REVEAL & 3D FLIP RESULTS */}
            {step === 3 && pickedCards.length === 3 && !selectedDetailCard && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center py-1"
              >
                <div className="text-center mb-5">
                  <h4 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-pink-300 to-purple-200 bg-clip-text text-transparent">
                    Quẻ Bài Định Mệnh Của Bạn
                  </h4>
                  <p className="text-purple-300 text-xs mt-1">
                    Bấm vào từng lá bài để đọc chi tiết hoặc chuyển cho Cupid AI phân tích toàn diện
                  </p>
                </div>

                {/* 3 Revealed Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-6">
                  {pickedCards.map((drawn, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedDetailCard(drawn)}
                      className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 hover:border-amber-400/50 rounded-2xl p-3 flex sm:flex-col items-center gap-3 cursor-pointer shadow-lg transition-all"
                    >
                      <div className="relative w-20 sm:w-28 h-28 sm:h-40 rounded-xl overflow-hidden shadow-md border border-purple-400/30 shrink-0">
                        <img
                          src={drawn.card.image}
                          alt={drawn.card.name}
                          className={`w-full h-full object-cover ${drawn.isReversed ? 'rotate-180' : ''}`}
                        />
                        {drawn.isReversed && (
                          <div className="absolute top-1 right-1 bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Ngược
                          </div>
                        )}
                      </div>

                      <div className="flex-1 sm:text-center">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide block mb-0.5">
                          {idx === 0 ? 'Quá Khứ' : idx === 1 ? 'Hiện Tại' : 'Tương Lai'}
                        </span>
                        <h5 className="font-extrabold text-[14px] text-white leading-tight mb-1">
                          {drawn.card.name}
                        </h5>
                        <p className="text-[11px] text-purple-200/80 line-clamp-2 leading-relaxed">
                          {idx === 2 ? drawn.card.meaningBottom : drawn.card.meaningTop}
                        </p>
                        <span className="text-[10px] text-amber-400 font-semibold mt-1 inline-flex items-center gap-0.5">
                          Xem chi tiết <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom Action: Send To Cupid Button */}
                <div className="w-full flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => setStep(0)}
                    className="py-3 px-4 bg-white/10 hover:bg-white/20 text-purple-200 font-bold text-xs rounded-xl transition-colors text-center"
                  >
                    Bói quẻ khác
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

            {/* DETAIL MODAL OVERLAY */}
            {selectedDetailCard && (
              <motion.div
                key="detailView"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg flex flex-col items-center py-2 text-center"
              >
                <div className="w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/60 mb-3">
                  <img
                    src={selectedDetailCard.card.image}
                    alt={selectedDetailCard.card.name}
                    className={`w-full h-full object-cover ${selectedDetailCard.isReversed ? 'rotate-180' : ''}`}
                  />
                </div>

                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                  {selectedDetailCard.positionLabel} ({selectedDetailCard.isReversed ? 'Chiều Ngược' : 'Chiều Xuôi'})
                </span>
                <h4 className="text-2xl font-black text-white mb-3">
                  {selectedDetailCard.card.name}
                </h4>

                <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-4 text-left text-[13px] leading-relaxed space-y-2.5 mb-5 w-full">
                  <div>
                    <span className="text-amber-300 font-bold text-xs uppercase block mb-0.5">Thông điệp cốt lõi:</span>
                    <p className="text-white/90">
                      {selectedDetailCard.position === 'future' 
                        ? selectedDetailCard.card.meaningBottom 
                        : selectedDetailCard.card.meaningTop}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-purple-500/20">
                    <span className="text-pink-300 font-bold text-xs uppercase block mb-0.5">Ý nghĩa tình cảm sâu sắc:</span>
                    <p className="text-purple-200/90 text-xs leading-relaxed">
                      {selectedDetailCard.card.fullMeaning}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetailCard(null)}
                  className="py-2.5 px-6 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Quay lại xem 3 lá
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
