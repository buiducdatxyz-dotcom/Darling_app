import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Star, Sparkles } from 'lucide-react';
import { parseLunarFromDob, evaluateLunarCompatibility } from '../utils/astrologyAndLunar';

interface LunarAnimalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDob?: string;
  userName?: string;
}

const LUNAR_ANIMALS = [
  { chi: 'Tý', name: 'Tý (Chuột)', symbol: '🐭', element: 'Thủy' },
  { chi: 'Sửu', name: 'Sửu (Trâu)', symbol: '🐂', element: 'Thổ' },
  { chi: 'Dần', name: 'Dần (Hổ)', symbol: '🐅', element: 'Mộc' },
  { chi: 'Mão', name: 'Mão (Mèo)', symbol: '🐱', element: 'Mộc' },
  { chi: 'Thìn', name: 'Thìn (Rồng)', symbol: '🐉', element: 'Thổ' },
  { chi: 'Tỵ', name: 'Tỵ (Rắn)', symbol: '🐍', element: 'Hỏa' },
  { chi: 'Ngọ', name: 'Ngọ (Ngựa)', symbol: '🐎', element: 'Hỏa' },
  { chi: 'Mùi', name: 'Mùi (Dê)', symbol: '🐐', element: 'Thổ' },
  { chi: 'Thân', name: 'Thân (Khỉ)', symbol: '🐒', element: 'Kim' },
  { chi: 'Dậu', name: 'Dậu (Gà)', symbol: '🐓', element: 'Kim' },
  { chi: 'Tuất', name: 'Tuất (Chó)', symbol: '🐕', element: 'Thổ' },
  { chi: 'Hợi', name: 'Hợi (Lợn)', symbol: '🐖', element: 'Thủy' }
];

export function LunarAnimalsModal({ isOpen, onClose, userDob = '2000-01-01', userName = 'Bạn' }: LunarAnimalsModalProps) {
  if (!isOpen) return null;

  const userLunar = parseLunarFromDob(userDob);

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#071322] flex flex-col text-white font-sans overflow-hidden"
    >
      <div className="relative pt-8 px-4 pb-4 z-10 shrink-0 border-b border-sky-800/40 bg-[#0c1f36]/90 backdrop-blur-md">
        <button onClick={onClose} className="absolute left-4 top-8 p-1.5 bg-white/10 hover:bg-white/20 rounded-full active:scale-90 transition-transform">
          <ChevronDown className="w-6 h-6 text-sky-300" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[18px] font-extrabold text-white">Tử Vi 12 Con Giáp</h2>
          <p className="text-[11px] text-sky-400 font-medium">Bản mệnh & Độ tương thích lứa đôi</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-900/25 via-[#071322] to-[#071322] pointer-events-none" />
        
        {/* User's Lunar Animal Card */}
        <div className="text-[60px] mb-2 z-10 filter drop-shadow">
          {LUNAR_ANIMALS.find(a => a.chi === userLunar.animal)?.symbol || '🐉'}
        </div>
        <h3 className="text-[22px] font-extrabold text-white mb-0.5 z-10">
          Tuổi {userLunar.canChi}
        </h3>
        <p className="text-sky-300 text-xs mb-6 z-10 font-medium">
          {userLunar.animalFullName} • {userLunar.elementFull}
        </p>
          
        <div className="bg-[#0f2744] w-full rounded-2xl p-5 shadow-xl border border-sky-500/20 relative mb-6 z-10">
          <h4 className="font-extrabold text-[15px] mb-2 flex items-center gap-2 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Độ tương thích với 12 Con Giáp
          </h4>
          <p className="text-sky-100/80 text-[13px] leading-relaxed mb-4">
            Thuật toán Tử Vi & Ngũ Hành tính toán độ hòa hợp Thiên Can - Địa Chi, Tam Hợp, Lục Hợp và Tứ Hành Xung đối với tuổi {userLunar.canChi}.
          </p>
          
          {/* 12 Animals Grid with Name BELOW Image/Icon */}
          <div className="grid grid-cols-3 gap-2.5">
            {LUNAR_ANIMALS.map((a) => {
              const comp = evaluateLunarCompatibility(userLunar.animal, a.chi, userLunar.element, a.element);
              const isTamHop = comp.type === 'tam_hop';
              const isLucHop = comp.type === 'luc_hop';
              const isTuXung = comp.type === 'tu_xung';

              return (
                <div 
                  key={a.chi} 
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center ${
                    isTamHop || isLucHop
                      ? 'bg-gradient-to-b from-pink-950/40 to-sky-950/60 border-pink-500/50 shadow-sm'
                      : isTuXung
                      ? 'bg-amber-950/20 border-amber-600/30'
                      : 'bg-black/30 border-white/10'
                  }`}
                >
                  {/* Icon / Image */}
                  <div className="text-3xl mb-1 filter drop-shadow-sm">{a.symbol}</div>
                  
                  {/* Name clearly shown BELOW Icon */}
                  <div className="text-[12px] font-extrabold text-white leading-tight mb-1">
                    {a.name}
                  </div>
                  
                  {/* Score */}
                  <div className={`text-[11px] font-black ${
                    comp.score >= 90 ? 'text-pink-400' : comp.score >= 80 ? 'text-sky-300' : 'text-amber-400'
                  }`}>
                    {comp.score}%
                  </div>

                  {/* Label badge */}
                  <span className="text-[9px] text-gray-400 mt-0.5 truncate max-w-full">
                    {isTamHop ? 'Tam Hợp' : isLucHop ? 'Lục Hợp' : isTuXung ? 'Tứ Xung' : 'Bình Hòa'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
