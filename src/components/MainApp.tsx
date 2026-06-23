import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { ViewState } from '../types';
import { Smile, Users, Heart, MessageSquare, User, Star, ArrowLeft, X, Bookmark, Image as ImageIcon, Phone, Video, MoreVertical, Mic, Send, Plus, Play, Pause, Music, Zap, Settings2, ChevronDown, Info, MapPin, Check, ChevronRight, Lock, Plane } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { TAROT_DECK, TarotCard } from '../data/tarot';
import { 
  genders, jobs, languages, religions, communicationStyles, intents, pets, 
  musics, books, foods, travels, games, sports 
} from '../data';

const SettingsIcon = LucideIcons.Settings;

// Caching identical audio files to save memory
const globalAudioCache: Record<string, string> = (window as any).globalAudioCache || {};
(window as any).globalAudioCache = globalAudioCache;

export function MainAppSelectField({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (val: string) => void }) {
  const isCustomOption = value && !options.includes(value) && value !== 'Khác';
  const showCustomInput = value === 'Khác' || isCustomOption;
  const selectValue = isCustomOption ? 'Khác' : value;

  return (
    <div className="mb-4">
      <label className="text-[15px] text-black font-medium mb-1 block">{label}</label>
      <select value={selectValue} onChange={e => {
          if (e.target.value === 'Khác') {
              onChange('Khác');
          } else {
              onChange(e.target.value);
          }
      }} className="w-full bg-black/10 border-none rounded-[4px] px-4 py-3 font-medium text-[15px] outline-none appearance-none">
         <option value="">Lựa chọn</option>
         {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
      {showCustomInput && (
         <input 
            type="text" 
            placeholder="Nhập thông tin của bạn..."
            value={isCustomOption ? value : ''}
            onChange={e => onChange(e.target.value || 'Khác')}
            className="w-full mt-2 bg-black/10 border-none rounded-[4px] px-4 py-3 font-medium text-[15px] outline-none"
         />
      )}
    </div>
  );
}

interface AppShellProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

export function getUniqueUnsplashPortraits(gender: string, uId: number): string[] {
  const femaleImages = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800'
  ];

  const maleImages = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&q=80&w=800'
  ];

  const parsedId = typeof uId === 'string' ? parseInt(uId, 10) || 0 : uId;
  const list = gender === 'Nam' ? maleImages : femaleImages;
  
  const idx1 = (parsedId * 7) % list.length;
  const idx2 = (parsedId * 11 + 2) % list.length;
  const idx3 = (parsedId * 13 + 5) % list.length;

  const firstSelected = list[idx1];
  const secondSelected = list[idx2 === idx1 ? (idx2 + 1) % list.length : idx2];
  const thirdSelected = list[idx3 === idx1 || idx3 === idx2 ? (idx3 + 3) % list.length : idx3];

  return [firstSelected, secondSelected, thirdSelected];
}

export const USER_PROFILE_DATA = {
    id: 999, 
    name: 'Người dùng mới', 
    dob: '2000-01-01',
    gender: 'Nam',
    height: '1m70',
    zodiac: 'Bảo Bình',
    location: 'Hà Nội',
    lat: 0,
    lng: 0,
    job: 'Chưa cập nhật',
    language: 'Tiếng Việt',
    religion: 'Không',
    communicationStyle: 'Nhắn tin nhiều hơn',
    need: 'Tìm người yêu',
    pet: 'Không nuôi',
    music: 'Khác',
    book: 'Khác',
    food: 'Khác',
    travel: 'Khác',
    game: 'Khác',
    sport: 'Khác',
    songTitle: '',
    songUrl: '',
    bio: '',
    images: [] // Empty defaults so they setup their own app
};

export const ZODIAC_DATA: any = {
  'Bạch Dương': { symbol: '♈', element: 'Lửa', range: '21/3 - 19/4' },
  'Kim Ngưu': { symbol: '♉', element: 'Đất', range: '20/4 - 20/5' },
  'Song Tử': { symbol: '♊', element: 'Khí', range: '21/5 - 20/6' },
  'Cự Giải': { symbol: '♋', element: 'Nước', range: '21/6 - 22/7' },
  'Sư Tử': { symbol: '♌', element: 'Lửa', range: '23/7 - 22/8' },
  'Xử Nữ': { symbol: '♍', element: 'Đất', range: '23/8 - 22/9' },
  'Thiên Bình': { symbol: '♎', element: 'Khí', range: '23/9 - 22/10' },
  'Thiên Yết': { symbol: '♏', element: 'Nước', range: '23/10 - 21/11' },
  'Bò Cạp': { symbol: '♏', element: 'Nước', range: '23/10 - 21/11' },
  'Nhân Mã': { symbol: '♐', element: 'Lửa', range: '22/11 - 21/12' },
  'Ma Kết': { symbol: '♑', element: 'Đất', range: '22/12 - 19/1' },
  'Bảo Bình': { symbol: '♒', element: 'Khí', range: '20/1 - 18/2' },
  'Song Ngư': { symbol: '♓', element: 'Nước', range: '19/2 - 20/3' },
};

export const ZODIAC_LIST = [
  'Bạch Dương', 'Kim Ngưu', 'Song Tử', 'Cự Giải', 'Sư Tử', 'Xử Nữ', 
  'Thiên Bình', 'Thiên Yết', 'Nhân Mã', 'Ma Kết', 'Bảo Bình', 'Song Ngư'
];

const ASTRO_ELEMENTS: any = {
  'Bạch Dương': 'fire', 'Sư Tử': 'fire', 'Nhân Mã': 'fire',
  'Kim Ngưu': 'earth', 'Xử Nữ': 'earth', 'Ma Kết': 'earth',
  'Song Tử': 'air', 'Thiên Bình': 'air', 'Bảo Bình': 'air',
  'Cự Giải': 'water', 'Bò Cạp': 'water', 'Thiên Yết': 'water', 'Song Ngư': 'water'
};

const getPartnerPerspectiveText = (myZodiac: string, partnerZodiac: string, partnerName: string) => {
   const e1 = ASTRO_ELEMENTS[myZodiac] || 'fire';
   const e2 = ASTRO_ELEMENTS[partnerZodiac] || 'water';
   if (e1 === 'fire') {
      return `${partnerName} nhận thấy bạn là một nguồn năng lượng tích cực, đầy đam mê và luôn thúc đẩy họ hành động. Đôi khi bạn hơi bốc đồng, nhưng điều đó lại tạo nên sự thú vị.`;
   }
   if (e1 === 'earth') {
      return `${partnerName} coi bạn là chỗ dựa vững chắc, có tính kiên nhẫn đáng ngạc nhiên. Bạn mang lại cho họ cảm giác an toàn và ổn định trong một thế giới đầy biến động.`;
   }
   if (e1 === 'air') {
      return `${partnerName} bị thu hút bởi trí tuệ và sự sáng tạo không giới hạn của bạn. Họ thích cách bạn luôn có những ý tưởng mới mẻ để giữ cho cuộc trò chuyện không bao giờ nhàm chán.`;
   }
   if (e1 === 'water') {
      return `${partnerName} đánh giá cao sự tinh tế và khả năng thấu hiểu cảm xúc sâu sắc của bạn. Họ cảm nhận được sự ấm áp và chân thành mỗi khi ở bên bạn.`;
   }
   return `${partnerName} cảm thấy bạn rất đặc biệt và mang đến luồng gió mới mẻ cho mọi trải nghiệm chung của hai người.`;
};

const getElementPercents = (myZodiac: string, partnerZodiac: string) => {
   const e1 = ASTRO_ELEMENTS[myZodiac] || 'fire';
   const e2 = ASTRO_ELEMENTS[partnerZodiac] || 'water';
   let p: any = { fire: 0, earth: 0, air: 0, water: 0 };
   if (e1 === e2) {
       p[e1] = 85;
       p[e1==='fire'?'water':'fire'] = 5;
       p[e1==='earth'?'air':'earth'] = 5;
       p[e1==='air'?'water':'air'] = 5;
   } else {
       p[e1] = 50;
       p[e2] = 50;
   }
   return p;
};

const getElementComboText = (myZodiac: string, partnerZodiac: string) => {
   const e1 = ASTRO_ELEMENTS[myZodiac] || 'fire';
   const e2 = ASTRO_ELEMENTS[partnerZodiac] || 'water';
   const combo = [e1, e2].sort().join('_');
   const texts: any = {
      'fire_fire': 'Hai ngọn lửa bùng cháy mãnh liệt! Sự cuồng nhiệt và nguồn năng lượng dồi dào sẽ khiến mối quan hệ này không bao giờ nhàm chán.',
      'earth_earth': 'Vững chãi như đá! Sự ổn định, kiên nhẫn và đồng điệu thực tế tạo nên một nền tảng không thể phá vỡ.',
      'air_air': 'Một làn gió mới! Giao tiếp liên tục và không giới hạn, hai bạn luôn tìm thấy niềm vui trong thế giới ý tưởng.',
      'water_water': 'Đại dương cảm xúc! Sự thấu hiểu sâu sắc và liên kết linh hồn mãnh liệt, hai trái tim hòa chung một nhịp đập.',
      'earth_fire': 'Ngọn lửa làm ấm mặt đất! Dù có đôi chút khác biệt về nhịp độ, sự bù trừ giữa thực tế và định hướng lại rất hài hòa.',
      'air_fire': 'Gió thổi bùng ngọn lửa! Khí cung cấp sức sống cho Lửa, tạo nên một sự kết hợp bùng nổ, rực rỡ và đầy đam mê.',
      'fire_water': 'Sự kết hợp đầy thách thức nhưng cực kỳ quyến rũ! Lửa mang lại sự sống động, trong khi Nước làm dịu đi sự bốc đồng.',
      'air_earth': 'Lý trí và Thực tế. Sự nhẹ nhàng của Khí kết hợp với sự vững vàng của Đất, giúp hai người học hỏi lẫn nhau để bay cao hơn.',
      'earth_water': 'Đất và Nước - một sự kết hợp trù phú. Nước mang lại sức sống cho Đất, và Đất mang lại nơi an toàn cho Nước nương tựa.',
      'air_water': 'Mây và Mưa. Cả hai cùng cảm nhận thế giới qua tư duy và trực giác. Một mối liên kết tâm linh kỳ diệu, khó diễn tả bằng lời.'
   };
   return texts[combo] || 'Sự kết hợp độc đáo! Hai bạn mang đến một năng lượng hoàn toàn mới cho nhau.';
};

const getTeaserText = (myZodiac: string, partnerZodiac: string) => {
   const comboScore = calculateZodiacCompatibility(myZodiac)[partnerZodiac] || 50;
   if (comboScore >= 80) return "Dường như vũ trụ đã sắp xếp cuộc gặp gỡ này! Có một bí mật tuyệt vời nói lên sự gắn kết đặc biệt giữa hai bạn...";
   if (comboScore >= 60) return "Sự tương tác giữa mảnh ghép này ẩn chứa nhiều bất ngờ. Cả hai có những rung động đồng điệu lạ kỳ...";
   return "Một mối quan hệ chứa đựng nhiều hương vị nhưng cũng đầy tiềm năng phát triển. Có một thông điệp ẩn giấu dành cho hai bạn...";
};

const getFullAstrologyText = (myZodiac: string, partnerZodiac: string) => {
    return "Khi hai năng lượng này gặp nhau, vũ trụ tạo ra một phản ứng hóa học thú vị. Các góc chiếu chiêm tinh cho thấy sự giao thoa trong cả mặt cảm xúc và tư duy. Nửa kia sẽ giúp bạn nhìn nhận thế giới qua một lăng kính hoàn toàn mới, đồng thời bạn cũng chính là mỏ neo giúp họ tìm thấy điểm tựa cân bằng. Hãy tiếp cận với một sự cởi mở, lắng nghe trực giác và bạn có thể khám phá ra những khả năng tuyệt vời trong mối quan hệ đặc biệt này!";
};

export const calculateZodiacCompatibility = (myZodiac: string) => {
  const myData = ZODIAC_DATA[myZodiac] || { element: 'Khí' };
  const e1 = myData.element;

  const scores: any = {};
  ZODIAC_LIST.forEach(z => {
    const e2 = ZODIAC_DATA[z]?.element || 'Lửa';
    let score = 60;
    if (e1 === e2) score = 95;
    else if ((e1 === 'Lửa' && e2 === 'Khí') || (e1 === 'Khí' && e2 === 'Lửa')) score = 90;
    else if ((e1 === 'Đất' && e2 === 'Nước') || (e1 === 'Nước' && e2 === 'Đất')) score = 85;
    else if ((e1 === 'Lửa' && e2 === 'Nước') || (e1 === 'Nước' && e2 === 'Lửa')) score = 50;
    else if ((e1 === 'Đất' && e2 === 'Khí') || (e1 === 'Khí' && e2 === 'Đất')) score = 55;
    else if ((e1 === 'Lửa' && e2 === 'Đất') || (e1 === 'Đất' && e2 === 'Lửa')) score = 65;
    
    score += (z.length % 5) * 2;
    if (score > 100) score = 100;
    scores[z] = score;
  });
  return scores;
};

export const AppContext = React.createContext<{
  serverUsers: any[];
  likedProfiles: any[];
  savedProfiles: any[];
  toggleLike: (profile: any, skipApiCall?: boolean) => void;
  toggleSave: (profile: any) => void;
  swipedRecords?: { target_user_id: number; action: string }[];
  registerSwipe?: (targetUserId: number, action: 'like' | 'pass') => void;
  settings: {
    activePriorities: string[];
    distance: number;
    isDistanceFlexible: boolean;
    ageMin: number;
    ageMax: number;
    isAgeFlexible: boolean;
    interestedIn: 'Mọi người' | 'Nam' | 'Nữ' | 'LGBTQ+' | 'Khác';
    location: string;
  };
  updateSettings: (newSettings: any) => void;
  saveSettings?: (currentSettings: any) => Promise<boolean>;
  isSavingPref?: boolean;
  onNavigate?: (view: ViewState) => void;
  activeChatUser: any;
  setActiveChatUser: (user: any) => void;
  isTestFemaleView: boolean;
  toggleTestFemaleView: () => void;
  myProfile: typeof USER_PROFILE_DATA;
  updateMyProfile: (updatedData: Partial<typeof USER_PROFILE_DATA>) => void;
  setupData: any;
  updateSetupData: (data: any) => void;
  globalMatchModal: any;
  setGlobalMatchModal: (p: any) => void;
  fetchMoreUsers: () => void;
}>({ 
  likedProfiles: [], 
  savedProfiles: [], 
  toggleLike: () => {}, 
  toggleSave: () => {},
  swipedRecords: [],
  registerSwipe: () => {},
  fetchMoreUsers: () => {},
  isSavingPref: false,
  saveSettings: async () => false,
  settings: {
    activePriorities: ['Dành Cho Bạn'],
    distance: 100,
    isDistanceFlexible: true,
    ageMin: 18,
    ageMax: 31,
    isAgeFlexible: true,
    interestedIn: 'Mọi người',
    location: 'Hà Nội, Hà Nội'
  },
  updateSettings: () => {},
  activeChatUser: null,
  setActiveChatUser: () => {},
  isTestFemaleView: false,
  toggleTestFemaleView: () => {},
  myProfile: USER_PROFILE_DATA,
  updateMyProfile: () => {},
  setupData: {},
  updateSetupData: () => {},
  globalMatchModal: null,
  setGlobalMatchModal: () => {}
});

export function GlobalAppStateProvider({ children, onNavigate }: { children: React.ReactNode, onNavigate?: (v: ViewState) => void }) {
  const [likedProfiles, setLikedProfiles] = useState<any[]>(() => {
    try {
      const d = localStorage.getItem('ais_liked');
      if (d) {
        const parsed = JSON.parse(d);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      }
      return [];
    } catch(e) {
      return [];
    }
  });
  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => {
    try {
      const d = localStorage.getItem('ais_saved');
      if (d) {
        const parsed = JSON.parse(d);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      }
      return [];
    } catch(e) {
      return [];
    }
  });
  const [serverUsers, setServerUsers] = useState<any[]>([]);
  const [swipedRecords, setSwipedRecords] = useState<{ target_user_id: number; action: string }[]>(() => {
    try {
      const d = localStorage.getItem('ais_swipes');
      if (d) {
        const parsed = JSON.parse(d);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const registerSwipe = React.useCallback((targetUserId: number, action: 'like' | 'pass') => {
    setSwipedRecords(prev => {
      const cleaned = prev.filter(r => r.target_user_id !== targetUserId);
      return [...cleaned, { target_user_id: targetUserId, action }];
    });
    const myId = sessionStorage.getItem('user_id');
    if (myId) {
      if (action === 'pass') {
        fetch('/api/matches/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: parseInt(myId), target_user_id: targetUserId, action: 'PASS' })
        }).catch(() => {});
      }
    }
  }, []);

  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [isTestFemaleView, setIsTestFemaleView] = useState(false);
  const [myProfile, setMyProfile] = useState<typeof USER_PROFILE_DATA>(() => { try { const d = localStorage.getItem('ais_profile'); return d ? JSON.parse(d) : USER_PROFILE_DATA; } catch(e){ return USER_PROFILE_DATA; } });
  const [setupData, setSetupData] = useState<any>({});
  const [globalMatchModal, setGlobalMatchModal] = useState<any>(null);
  
  const [settings, setSettings] = useState(() => {
     try {
        const stored = localStorage.getItem('ais_user_settings');
        if (stored) {
           return JSON.parse(stored);
        }
     } catch (e) {}
     return {
        activePriorities: ['Dành Cho Bạn'],
        distance: 100,
        isDistanceFlexible: true,
        ageMin: 18,
        ageMax: 31,
        isAgeFlexible: true,
        interestedIn: 'Mọi người' as 'Mọi người' | 'Nam' | 'Nữ' | 'LGBTQ+' | 'Khác',
        location: 'Hà Nội, Hà Nội'
     };
  });

  const [isSavingPref, setIsSavingPref] = React.useState(false);
  const [lastLoadedUserId, setLastLoadedUserId] = React.useState<string | null>(null);

  const saveSettings = async (currentSettings: any) => {
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id') || (myProfile && myProfile.id ? myProfile.id.toString() : '999');
    if (!userId) return false;
    setIsSavingPref(true);
    try {
      const res = await fetch(`/api/user_preferences/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: currentSettings })
      });
      const data = await res.json();
      return !!data.success;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsSavingPref(false);
    }
  };

  React.useEffect(() => {
    const checkUserAndLoadPrefs = () => {
      const uId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
      if (uId && uId !== lastLoadedUserId) {
        setLastLoadedUserId(uId);
        fetch(`/api/user_preferences/${uId}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.preferences) {
              try {
                const parsed = typeof data.preferences === 'string' ? JSON.parse(data.preferences) : data.preferences;
                if (parsed) {
                  setSettings(prev => ({ ...prev, ...parsed }));
                  localStorage.setItem('ais_user_settings', JSON.stringify(parsed));
                }
              } catch (e) {}
            }
          })
          .catch(() => {});
      } else if (!uId && lastLoadedUserId) {
        setLastLoadedUserId(null);
      }
    };

    checkUserAndLoadPrefs();
    const interval = setInterval(checkUserAndLoadPrefs, 1000);
    return () => clearInterval(interval);
  }, [lastLoadedUserId]);

  const updateSettings = (partialSettings: any) => {
    setSettings(prev => {
       const next = { ...prev, ...partialSettings };
       try {
          localStorage.setItem('ais_user_settings', JSON.stringify(next));
       } catch (e) {}
       return next;
    });
  };

  const updateMyProfile = (newProfileInfo: Partial<typeof USER_PROFILE_DATA>) => {
    setMyProfile(prev => ({ ...prev, ...newProfileInfo }));
  };

  const fetchMoreUsers = React.useCallback(() => {
     fetch('/api/users/explore')
       .then(r => r.json())
       .then(data => {
            if (data.success && data.data) {
                const userList = data.data.map((u:any) => {
                   let profileData = u.profile_data || {};
                   if (typeof profileData === 'string') {
                       try { profileData = JSON.parse(profileData); } catch(e){}
                   }
                   let dob = profileData.dob;
                  if (!dob && typeof profileData.age === 'number') {
                      const year = new Date().getFullYear() - profileData.age;
                      dob = `${year}-01-01`;
                  } else if (!dob) dob = '2000-01-01';
                  let displayGender = profileData.gender;
                  if (!displayGender && profileData.name) {
                      displayGender = 'Nữ';
                      if (profileData.name.includes('Đăng') || profileData.name.includes('Tuấn')) displayGender = 'Nam';
                  }

                  return {
                     id: u.id,
                     email: u.email,
                     lat: profileData.lat, lng: profileData.lng,
                     name: profileData.name || 'Người dùng mới',
                     gender: displayGender,
                     dob: dob,
                     distance: (() => { let d = `Cách ${((u.id * 17) % 50) + 1} km`; if (myProfile?.lat && myProfile?.lng && profileData.lat && profileData.lng) { const R = 6371; const dLat = (profileData.lat - myProfile.lat) * Math.PI / 180; const dLon = (profileData.lng - myProfile.lng) * Math.PI / 180; const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(myProfile.lat * Math.PI / 180) * Math.cos(profileData.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); d = `Cách ${Math.max(1, Math.round(R * c))} km`; } return d; })(),
                     bio: profileData.bio || '',
                     zodiac: profileData.zodiac || 'Bạch Dương',
                     location: profileData.hometown || profileData.location || 'Hà Nội',
                     images: (() => {
                        const hasCustom = profileData.images && profileData.images.length > 0 && !profileData.images[0].includes('photo-1549880338-65ddcdfd017b');
                        return hasCustom ? profileData.images : getUniqueUnsplashPortraits(displayGender, u.id);
                     })(),
                     job: profileData.job || 'Chưa cập nhật',
                     need: profileData.need || profileData.intents || (profileData.interests && profileData.interests.length > 0 ? profileData.interests[0] : 'Trò chuyện vui vẻ'),
                     prompts: profileData.prompts || [],
                     lifestyle: profileData.lifestyle || {},
                     height: profileData.height || (['1m60', '1m62', '1m65', '1m68', '1m70', '1m72', '1m75', '1m78', '1m80', '1m82'][u.id % 10]),
                     language: profileData.language || 'Tiếng Việt',
                     religion: profileData.religion || 'Không',
                     communicationStyle: profileData.communicationStyle || (['Nghiện nhắn tin', 'Thích gọi điện', 'Thích gọi video', 'Thích gặp mặt trực tiếp'][u.id % 4] || 'Thích gặp mặt trực tiếp'),
                     pet: profileData.pet || profileData.lifestyle?.pet || (['Chó', 'Mèo', 'Yêu thích nhưng không nuôi', 'Không nuôi thú cưng'][u.id % 4]),
                     music: profileData.music || profileData.lifestyle?.music || (['V-pop', 'K-pop', 'Nhạc điện tử', 'Taylor Swift', 'Sơn Tùng MTP'][u.id % 5]),
                     book: profileData.book || profileData.lifestyle?.book || (['Tình cảm', 'Bí ẩn', 'Truyền cảm hứng', 'Tiểu thuyết trinh thám'][u.id % 4]),
                     food: profileData.food || profileData.lifestyle?.food || (['Đồ ăn cay', 'Ăn chay', 'Đồ nướng', 'Cà phê', 'Phở'][u.id % 5]),
                     travel: profileData.travel || profileData.lifestyle?.travel || (['Bãi biển', 'Đà Lạt', 'SaPa', 'Hội An', 'Thành phố'][u.id % 5]),
                     game: profileData.game || profileData.lifestyle?.game || (['Genshin Impact', 'FiFa', 'Liên quân', 'Minecraft', 'Board games'][u.id % 5]),
                     sport: profileData.sport || profileData.lifestyle?.sport || (['Pickleball', 'Bóng đá', 'Gym', 'Tennis'][u.id % 4])
                  };
               });
               const myId = parseInt(sessionStorage.getItem('user_id') || '0');
               setServerUsers(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const newUsers = userList.filter((u:any) => u.id !== myId && !existingIds.has(u.id));
                  return [...prev, ...newUsers];
               });
           }
       }).catch(()=>{});
  }, [myProfile]);

  useEffect(() => {
     // Sync matches and historical swipes with backend database
     const userId = sessionStorage.getItem('user_id');
     if (userId) {
         fetch(`/api/matches/${userId}`)
           .then(r => r.json())
           .then(data => {
               if (data.success && data.data) {
                   setLikedProfiles(prev => {
                       let needsUpdate = false;
                       const newLiked = prev.map(p => {
                           const m = data.data.find((bm: any) => bm.user_id === p.id);
                           if (m && !p.matchId && !p.match_id) {
                               needsUpdate = true;
                               return { ...p, matchId: m.match_id, match_id: m.match_id };
                           }
                           return p;
                       });
                       return needsUpdate ? newLiked : prev;
                   });
               }
           }).catch(()=>{});

         fetch(`/api/users/${userId}/swipes`)
           .then(r => r.json())
           .then(data => {
               if (data.success && Array.isArray(data.data)) {
                   setSwipedRecords(data.data);
               }
           }).catch(()=>{});
     }
  }, []);
  
  React.useEffect(() => {
     fetchMoreUsers();
  }, [fetchMoreUsers]);

  React.useEffect(() => {
     try {
       localStorage.setItem('ais_liked', JSON.stringify(likedProfiles || []));
     } catch(e) {}
  }, [likedProfiles]);

  React.useEffect(() => {
     try {
       localStorage.setItem('ais_swipes', JSON.stringify(swipedRecords || []));
     } catch(e) {}
  }, [swipedRecords]);

  React.useEffect(() => {
     try {
       localStorage.setItem('ais_saved', JSON.stringify(savedProfiles || []));
     } catch(e) {}
  }, [savedProfiles]);

  React.useEffect(() => {
     try {
       localStorage.setItem('ais_profile', JSON.stringify(myProfile));
     } catch(e) {}
  }, [myProfile]);
  
  React.useEffect(() => {
     if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition((pos) => {
             const lat = pos.coords.latitude;
             const lng = pos.coords.longitude;
             if (myProfile.lat !== lat || myProfile.lng !== lng) {
                 updateMyProfile({ lat, lng });
                 const myId = sessionStorage.getItem('user_id');
                 if (myId) {
                     fetch(`/api/users/profile/${myId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profileData: { ...myProfile, lat, lng } })
                     }).catch(() => {});
                 }
                 setServerUsers(prev => prev.map((u:any) => {
                     let d = `Cách ${((u.id * 17) % 50) + 1} km`;
                     if (u.lat && u.lng) {
                         const R = 6371;
                         const dLat = (u.lat - lat) * Math.PI / 180;
                         const dLon = (u.lng - lng) * Math.PI / 180;
                         const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat * Math.PI / 180) * Math.cos(u.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                         d = `Cách ${Math.max(1, Math.round(R * c))} km`;
                     }
                     return { ...u, distance: d };
                 }));
             }
         }, () => {}, { timeout: 10000 });
     }
  }, []);

  const updateSetupData = (data: any) => setSetupData((prev: any) => ({ ...prev, ...data }));

  const toggleLike = (profile: any, skipApiCall?: boolean) => {
    if (!profile || !profile.id) return;
    setLikedProfiles((prev) => {
       const arr = Array.isArray(prev) ? prev : [];
       const cleanArr = arr.filter(p => p && p.id);
       const isLiked = cleanArr.some(p => p.id === profile.id);
       if (!isLiked && !skipApiCall) {
           // Send LIKE match to backend
           const myId = sessionStorage.getItem('user_id');
           if (myId) {
               fetch('/api/matches/swipe', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ user_id: parseInt(myId), target_user_id: profile.id, action: 'LIKE' })
               }).then(r => r.json()).then(data => {
                   if (data.success && data.match_id) {
                       setLikedProfiles(p => {
                           const pArr = Array.isArray(p) ? p : [];
                           return pArr.filter(Boolean).map(x => x.id === profile.id ? { ...x, match_id: data.match_id } : x);
                       });
                       setGlobalMatchModal(profile);
                   }
               }).catch(()=>{});
           }
           // Add to swipedRecords
           setSwipedRecords(p => {
              const cleaned = p.filter(r => r.target_user_id !== profile.id);
              return [...cleaned, { target_user_id: profile.id, action: 'like' }];
           });
       } else if (isLiked) {
           // Removed like, so they can see again, remove swipe
           setSwipedRecords(p => p.filter(r => r.target_user_id !== profile.id));
       }
       return isLiked ? cleanArr.filter(p => p.id !== profile.id) : [...cleanArr, profile];
    });
  };

  const toggleSave = (profile: any) => {
    if (!profile || !profile.id) return;
    setSavedProfiles((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const cleanArr = arr.filter(p => p && p.id);
      const isSaved = cleanArr.some(p => p.id === profile.id);
      return isSaved ? cleanArr.filter(p => p.id !== profile.id) : [...cleanArr, profile];
    });
  };

  return (
    <AppContext.Provider value={{ serverUsers, likedProfiles, savedProfiles, toggleLike, toggleSave, swipedRecords, registerSwipe, settings, updateSettings, onNavigate, activeChatUser, setActiveChatUser, isTestFemaleView, toggleTestFemaleView: () => setIsTestFemaleView(v => !v), myProfile, updateMyProfile, setupData, updateSetupData, globalMatchModal, setGlobalMatchModal, fetchMoreUsers, saveSettings, isSavingPref }}>
      {children}
    </AppContext.Provider>
  );
}

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  const navItems = [
    { id: 'app_swipe', icon: <Smile className="w-8 h-8 stroke-[2]" />, label: 'Xem' },
    { id: 'app_explore', icon: <Users className="w-8 h-8 stroke-[2]" />, label: 'Khám phá' },
    { id: 'app_likes', icon: <Heart className="w-8 h-8 stroke-[2]" />, label: 'Lượt thích' },
    { id: 'app_chat', icon: <MessageSquare className="w-8 h-8 stroke-[2]" />, label: 'Chat' },
    { id: 'app_profile', icon: <User className="w-8 h-8 stroke-[2]" />, label: 'Hồ sơ' },
  ] as const;

  return (
    <div className="h-full w-full bg-[#fff0f1] font-sans flex flex-col items-center relative overflow-hidden">
      <div className="w-full h-full flex flex-col bg-[#ff9ca0]">
        <div className="flex-1 overflow-y-hidden relative flex flex-col">
          <div className="absolute inset-0 overflow-y-auto">
             {children}
          </div>
        </div>

      <div className="bg-[#ff9ca0] border-t border-black/10 z-50 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-between items-center h-[72px] px-2 pb-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate(item.id as ViewState)}
                className="flex-1 flex flex-col justify-center items-center h-full gap-1 relative outline-none"
              >
                  <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg w-[52px] text-black z-10 transition-colors ${isActive ? '' : 'opacity-70'}`}>
                    {item.icon}
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="absolute top-1.5 w-[52px] h-10 bg-white rounded-xl z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                  <span className={`text-[10px] z-10 ${isActive ? 'font-bold text-black' : 'font-medium text-black/70'}`}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Store dummy profiles inside SwipeView

const MATCH_PROFILES: any[] = [
  {
    id: 1, name: 'Hoàng Anh', dob: '1998-05-12', distance: 'Cách 2 km',
    astrologyMatch: 'Thiên Bình và Bạn là một cặp đôi thú vị! 🌟',
    commonPoints: 'Hợp gu vì cùng thích Du lịch, Phim ảnh',
    zodiac: 'Thiên Bình', location: 'Hà Nội',
    height: '1m80', pet: 'Chó', music: 'US-UK',
    images: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'
    ],
    job: 'Kỹ sư', language: 'Tiếng Anh, Tiếng Việt',
    religion: 'Không', communicationStyle: 'Nhắn tin nhiều hơn',
    need: 'Tìm người yêu', 
    book: 'Truyền cảm hứng', food: 'Đồ Việt', travel: 'Biển', game: 'Gacha/Genshin', sport: 'Gym'
  },
  {
    id: 2, name: 'Mai Linh', dob: '2001-08-20', distance: 'Cách 5 km',
    astrologyMatch: 'Sư Tử và Bạn có nhiều sở thích tương đồng! ✨',
    commonPoints: 'Cùng chung sở thích: Thú cưng, Thể thao',
    zodiac: 'Sư Tử', location: 'Hà Nội',
    height: '1m62', pet: 'Mèo', music: 'V-pop',
    images: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800'
    ],
    job: 'Kế toán', language: 'Tiếng Việt',
    religion: 'Phật Giáo', communicationStyle: 'Gặp mặt trực tiếp',
    need: 'Tìm người yêu', 
    book: 'Tình cảm', food: 'Đồ Việt', travel: 'Đà Lạt', game: 'Không chơi', sport: 'Chạy bộ'
  },
  {
    id: 3, name: 'Quốc Bảo', dob: '1995-12-05', distance: 'Cách 10 km',
    astrologyMatch: 'Nhân Mã và Bạn đôi khi cãi nhau nhưng lại rất hợp! 🔥',
    commonPoints: 'Cùng chung đam mê Game',
    zodiac: 'Nhân Mã', location: 'Hà Nội',
    height: '1m78', pet: 'Không nuôi', music: 'Nhạc điện tử',
    songTitle: 'Test Song', songUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800'
    ],
    job: 'Chủ Studio', language: 'Tiếng Anh, Tiếng pháp',
    religion: 'Không', communicationStyle: 'Tùy tâm trạng',
    need: 'Tìm bạn bè mới', 
    book: 'Bí ẩn', food: 'Ăn chay', travel: 'SaPa', game: 'FiFa', sport: 'Bóng đá'
  }
];


export function filterProfiles(profiles: any[], settings: any, myGender: string = 'Nữ', isExplore: boolean = false) {
  const { activePriorities = ['Dành Cho Bạn'], distance = 100, ageMin = 18, ageMax = 31, interestedIn = 'Mọi người', location = 'Hà Nội', isDistanceFlexible = true, isAgeFlexible = true } = settings;
  const cleanSettingsLocation = location.split(',')[0].trim();

  return profiles.filter(profile => {
    
    // Check if location matches. If it doesn't match perfectly, we simulate distance
    const baseProfileLocation = profile.location || 'Hà Nội';
    let profileDistance = 0;

    if (cleanSettingsLocation === 'Gần bạn') {
      profileDistance = parseInt(profile.distance.replace(/[^0-9]/g, '')) || 5;
    } else if (baseProfileLocation === cleanSettingsLocation) {
      // In same city, use the profile's base short distance
      const distMatch = profile.distance.match(/\d+/);
      if (distMatch) {
        profileDistance = parseInt(distMatch[0], 10);
      }
    } else {
      // In another city, distance is very large (e.g., 500km, 1000km, 1500km)
      if (cleanSettingsLocation === 'TP. Hồ Chí Minh' && baseProfileLocation === 'Hà Nội') profileDistance = 1137;
      else if (cleanSettingsLocation === 'Hà Nội' && baseProfileLocation === 'TP. Hồ Chí Minh') profileDistance = 1137;
      else if (cleanSettingsLocation === 'Đà Nẵng' && baseProfileLocation === 'Hà Nội') profileDistance = 627;
      else profileDistance = 1500;
    }
    
    // Age matching 
    let profileAge = 0;
    if (profile.dob) {
       const diff = Date.now() - new Date(profile.dob).getTime();
       profileAge = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }

    // Gender inference based on common Vietnamese names for demo purposes (if gender missing)
    let profileGender = profile.gender || 'Nữ';
    if (!profile.gender && (profile.name.includes('Hoàng Anh') || profile.name.includes('Đăng') || profile.name.includes('Đại') || profile.name.includes('Tuấn'))) {
       profileGender = 'Nam';
    }

    let distanceMatch = isExplore ? true : (profileDistance <= distance);
    if (!isExplore && !distanceMatch && isDistanceFlexible) {
       distanceMatch = true; // allow greater distance
    }

    let ageMatch = isExplore ? true : (profileAge >= ageMin && profileAge <= ageMax);
    if (!isExplore && !ageMatch && isAgeFlexible) {
       const minAllowedAge = Math.max(18, ageMin - 5);
       const maxAllowedAge = ageMax + 10;
       ageMatch = (profileAge >= minAllowedAge && profileAge <= maxAllowedAge);
    }

    let genderMatch = true;
    if (interestedIn === 'Mọi người') {
        genderMatch = true;
    } else if (interestedIn === 'Nam') {
        genderMatch = profileGender === 'Nam';
    } else if (interestedIn === 'Nữ') {
        genderMatch = profileGender === 'Nữ';
    } else if (interestedIn === 'LGBTQ+') {
        genderMatch = profileGender === 'LGBTQ+';
    } else if (interestedIn === 'Khác') {
        genderMatch = profileGender === 'Khác';
    } else {
        // Fallback or explicit mapping if something strange
        if (myGender === 'Nữ') {
            genderMatch = profileGender === 'Nam';
        } else if (myGender === 'Nam') {
            genderMatch = profileGender === 'Nữ';
        } else {
            genderMatch = true;
        }
    }

    // For priorities like "Âm nhạc" hay "Chiêm tinh", check if they exist on the profile
    let priorityMatch = true;
    if (activePriorities.includes('Âm nhạc') && !profile.music) {
      priorityMatch = false;
    }
    if (activePriorities.includes('Chiêm tinh') && !profile.astrologyMatch) {
      priorityMatch = false;
    }

    return distanceMatch && ageMatch && genderMatch && priorityMatch;
  }).map(profile => {
     // Augment the display distance dynamically based on the current location
     const baseProfileLocation = profile.location || 'Hà Nội';
     let displayDistance = profile.distance;
     
     if (cleanSettingsLocation === 'Gần bạn') {
        // Assume all profiles are near if location is 'Gần bạn'
        displayDistance = profile.distance;
     } else if (baseProfileLocation !== cleanSettingsLocation) {
        let km = 1500;
        if (cleanSettingsLocation === 'TP. Hồ Chí Minh' && baseProfileLocation === 'Hà Nội') km = 1137;
        else if (cleanSettingsLocation === 'Hà Nội' && baseProfileLocation === 'TP. Hồ Chí Minh') km = 1137;
        else if (cleanSettingsLocation === 'Đà Nẵng' && baseProfileLocation === 'Hà Nội') km = 627;
        displayDistance = `Cách ${km} km`;
     }
     
     return { ...profile, currentDistanceDisplay: displayDistance };
  });
}

const VIETNAM_LOCATIONS = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre',
  'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk',
  'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam',
  'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang'
];

const playSound = (type: 'shuffle' | 'slide' | 'ting') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'ting') {
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       osc.type = 'sine';
       osc.frequency.setValueAtTime(800, ctx.currentTime);
       osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1);
       gain.gain.setValueAtTime(0, ctx.currentTime);
       gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
       gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
       osc.start(ctx.currentTime);
       osc.stop(ctx.currentTime + 1.5);
    } else if (type === 'shuffle' || type === 'slide') {
       const bufferSize = ctx.sampleRate * (type === 'shuffle' ? 1.2 : 0.2);
       const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
       const data = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) {
         data[i] = Math.random() * 2 - 1;
       }
       const noise = ctx.createBufferSource();
       noise.buffer = buffer;
       
       const filter = ctx.createBiquadFilter();
       filter.type = type === 'shuffle' ? 'bandpass' : 'lowpass';
       filter.frequency.setValueAtTime(type === 'shuffle' ? 1000 : 3000, ctx.currentTime);
       
       if (type === 'shuffle') {
          for (let i = 0; i < 6; i++) {
             filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + i * 0.2 + 0.1);
             filter.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + i * 0.2 + 0.2);
          }
       } else {
          filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.2);
       }
       
       const gain = ctx.createGain();
       gain.gain.setValueAtTime(type === 'shuffle' ? 0.4 : 0.6, ctx.currentTime);
       gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === 'shuffle' ? 1.2 : 0.2));
       
       noise.connect(filter);
       filter.connect(gain);
       gain.connect(ctx.destination);
       
       noise.start();
    }
  } catch(e) {
    console.error("Audio error", e);
  }
};

function TarotReadingFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0); // 0: intro, 1: shuffling, 2: pick_top, 3: pick_bottom, 4: table, 5: revealed
  const [cards, setCards] = useState<{top: TarotCard, bottom: TarotCard} | null>(null);
  const [selectedCard, setSelectedCard] = useState<{card: TarotCard, position: "top" | "bottom"} | null>(null);

  const startShuffling = () => {
    setStep(1);
    playSound('shuffle');
    setTimeout(() => {
      const shuffled = [...TAROT_DECK].sort(() => 0.5 - Math.random());
      setCards({ top: shuffled[0], bottom: shuffled[1] });
      setStep(2);
    }, 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#150a21] flex flex-col text-white overflow-hidden"
    >
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#4a1b7e]/20 via-[#150a21] to-[#150a21] pointer-events-none" />
       
       <div className="relative pt-6 px-4 pb-4 z-10 shrink-0 border-b border-white/10 bg-[#150a21]/80 backdrop-blur-md">
          <button onClick={onClose} className="absolute left-4 top-6 p-1 bg-white/10 rounded-full active:scale-90 transition-transform">
             <ChevronDown className="w-6 h-6 text-white" />
          </button>
          <div className="flex flex-col items-center">
             <h2 className="text-[18px] font-bold tracking-wide">Tarot Tình Yêu</h2>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center relative z-10">
          
          <AnimatePresence mode="wait">
             {step === 0 && (
               <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm text-center">
                  <span className="text-6xl mb-6">🔮</span>
                  <h3 className="text-2xl font-bold mb-4 text-purple-200">Trải Bài Tình Yêu</h3>
                  <p className="text-white/80 leading-relaxed mb-10 text-[15px]">
                     Thuật toán của vũ trụ đã sẵn sàng trả lời ngài.<br/><br/>
                     Hãy hít thở sâu, tập trung nghĩ tới điều bạn đang thắc mắc trong chuyện tình cảm.
                  </p>
                  <button onClick={startShuffling} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all text-[16px]">
                     Bắt đầu xào bài
                  </button>
               </motion.div>
             )}

             {step === 1 && (
               <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                  <div className="relative w-40 h-56 mb-8">
                     {[...Array(5)].map((_, i) => (
                        <motion.div 
                           key={i} 
                           className="absolute inset-0 bg-[#291749] border-2 border-purple-500/30 rounded-xl shadow-xl flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"
                           animate={{
                             x: [0, (i%2===0 ? 40 : -40), 0],
                             y: [0, -20, 0],
                             rotate: [0, (i%2===0 ? 10 : -10), 0]
                           }}
                           transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        >
                           <div className="w-16 h-16 border border-purple-500/20 rounded-full flex items-center justify-center">
                             <Star className="w-6 h-6 text-purple-500/50" />
                           </div>
                        </motion.div>
                     ))}
                  </div>
                  <p className="text-white/80 animate-pulse font-medium">Đang xào bài...</p>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm text-center">
                  <div className="w-32 h-44 bg-[#291749] border-2 border-purple-500/50 rounded-xl mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-transparent"></div>
                     <Star className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Lá bài đầu tiên</h3>
                  <p className="text-white/70 mb-8 text-[15px]">Gom các lá bài thành 1 bộ. Bạn hãy lấy lá bài thứ 7 từ trên xuống và đặt lên bàn (mặt úp).</p>
                  <button onClick={() => { playSound('slide'); setStep(3); }} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-4 rounded-xl transition-all">
                     Rút lá thứ 7 (Phía trên)
                  </button>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm text-center">
                  <div className="w-32 h-44 bg-[#291749] border-2 border-pink-500/50 rounded-xl mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/20 to-transparent"></div>
                     <Star className="w-8 h-8 text-pink-400 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Lá bài thứ hai</h3>
                  <p className="text-white/70 mb-8 text-[15px]">Tiếp tục lấy lá bài thứ 7 tiếp theo và đặt ở dưới lá đầu tiên (mặt úp).</p>
                  <button onClick={() => { playSound('slide'); setStep(4); }} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-4 rounded-xl transition-all">
                     Rút lá thứ 7 (Phía dưới)
                  </button>
               </motion.div>
             )}

             {step === 4 && (
               <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm text-center">
                  <div className="flex flex-col gap-4 mb-10">
                     <div className="w-24 h-36 bg-[#291749] border-2 border-purple-500/50 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <span className="text-white/40 text-xs font-bold">TOP</span>
                     </div>
                     <div className="w-24 h-36 bg-[#291749] border-2 border-pink-500/50 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        <span className="text-white/40 text-xs font-bold">BOTTOM</span>
                     </div>
                  </div>
                  <p className="text-white/80 mb-8 text-[15px]">Hai lá bài đã được đặt sẵn sàng. Đảm bảo bạn không xáo trộn chúng.</p>
                  <button onClick={() => { playSound('ting'); setStep(5); }} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 text-[16px]">
                     Lật 2 lá bài lên
                     <Zap className="w-5 h-5" />
                  </button>
               </motion.div>
             )}

             {step === 5 && cards && !selectedCard && (
               <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full max-w-md pb-6 pt-2">
                  <div className="text-center mb-6">
                     <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-2">Đọc Ý Nghĩa</h3>
                     <p className="text-white/60 text-sm">Trái tim và Kết quả</p>
                  </div>
                  
                  {/* Lá 1 */}
                  <div 
                    onClick={() => setSelectedCard({card: cards.top, position: 'top'})}
                    className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/20 shadow-xl flex gap-4 cursor-pointer hover:bg-white/10 transition-colors active:scale-95"
                  >
                     <div className="w-28 h-40 shrink-0 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.2)] relative">
                        <img src={cards.top.image} alt={cards.top.name} className="w-full h-full object-cover animate-in fade-in duration-700" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 px-2 py-1 rounded text-xs font-bold">Xem chi tiết</span>
                        </div>
                     </div>
                     <div className="flex flex-col py-1 flex-1">
                        <div className="text-xs text-purple-300 font-bold mb-1 tracking-wider uppercase">Lá trên (Tình trạng)</div>
                        <h4 className="text-[17px] font-bold text-white mb-2">{cards.top.name}</h4>
                        <p className="text-white/80 text-[13px] leading-relaxed line-clamp-4">{cards.top.meaningTop}</p>
                        <p className="text-purple-300 text-[11px] font-semibold mt-auto self-start">Kích để xem chi tiết</p>
                     </div>
                  </div>

                  {/* Lá 2 */}
                  <div 
                    onClick={() => setSelectedCard({card: cards.bottom, position: 'bottom'})}
                    className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/20 shadow-xl flex gap-4 cursor-pointer hover:bg-white/10 transition-colors active:scale-95"
                  >
                     <div className="flex flex-col py-1 text-right flex-1">
                        <div className="text-xs text-pink-300 font-bold mb-1 tracking-wider uppercase">Lá dưới (Tương lai)</div>
                        <h4 className="text-[17px] font-bold text-white mb-2">{cards.bottom.name}</h4>
                        <p className="text-white/80 text-[13px] leading-relaxed line-clamp-4">{cards.bottom.meaningBottom}</p>
                        <p className="text-pink-300 text-[11px] font-semibold mt-auto self-end">Kích để xem chi tiết</p>
                     </div>
                     <div className="w-28 h-40 shrink-0 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.2)] relative">
                        <img src={cards.bottom.image} alt={cards.bottom.name} className="w-full h-full object-cover animate-in fade-in duration-700" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 px-2 py-1 rounded text-xs font-bold">Xem chi tiết</span>
                        </div>
                     </div>
                  </div>

                  <button onClick={() => setStep(0)} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 rounded-xl transition-all">
                     Bói bài khác
                  </button>
               </motion.div>
             )}

             {step === 5 && selectedCard && (
               <motion.div key="fullDetail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full max-w-md pb-6">
                  <div className="w-full flex justify-between items-center mb-6">
                     <button onClick={() => setSelectedCard(null)} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl active:scale-95 transition-all text-white font-bold">
                        <ArrowLeft className="w-5 h-5" /> Quay Lại
                     </button>
                     <h3 className="text-lg font-bold text-white pr-4">Chi Tiết Lá Bài</h3>
                     <div></div>
                  </div>
                  
                  <div className={`w-40 h-56 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] mb-6 border-2 ${selectedCard.position === 'top' ? 'border-purple-500/50 shadow-purple-500/20' : 'border-pink-500/50 shadow-pink-500/20'}`}>
                     <img src={selectedCard.card.image} alt={selectedCard.card.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-2 text-center">{selectedCard.card.name}</h2>
                  <div className={`text-sm font-bold uppercase tracking-wider mb-6 ${selectedCard.position === 'top' ? 'text-purple-300' : 'text-pink-300'}`}>
                     Vị trí: {selectedCard.position === 'top' ? 'Tình Trạng (Lá Trên)' : 'Tương Lai (Lá Dưới)'}
                  </div>
                  
                  <div className="w-full bg-black/30 rounded-2xl p-5 border border-white/10 text-left">
                     <div className="mb-4">
                        <h4 className="text-white/60 text-xs font-bold uppercase mb-1">Tóm tắt</h4>
                        <p className="text-white/95 leading-relaxed text-[15px]">
                            {selectedCard.position === 'top' ? selectedCard.card.meaningTop : selectedCard.card.meaningBottom}
                        </p>
                     </div>
                     <div className="w-full h-px bg-white/10 my-4"></div>
                     <div>
                        <h4 className="text-white/60 text-xs font-bold uppercase mb-2">Ý nghĩa chung trong tình cảm</h4>
                        <p className="text-white/90 leading-relaxed text-[14px]">
                            {selectedCard.card.fullMeaning}
                        </p>
                     </div>
                  </div>
                  
                  <button onClick={() => setSelectedCard(null)} className="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                     <ArrowLeft className="w-5 h-5" /> Quay lại xem bài
                  </button>
               </motion.div>
             )}
          </AnimatePresence>
       </div>
    </motion.div>
  );
}

function BioCard({ bio }: { bio: string; key?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 100;
  const isLong = bio.length > maxLength;

  const displayText = isExpanded ? bio : (isLong ? bio.slice(0, maxLength) + '...' : bio);

  return (
    <div className="bg-black/80 backdrop-blur-md px-4 py-3.5 rounded-xl border border-white/20 shadow-sm text-[14px] text-white flex flex-col gap-1.5 self-stretch">
       <div>
          <span className="font-bold text-[#ffd700]">Giới thiệu bản thân: </span>
          <span className="text-white/95 leading-relaxed break-all">{displayText}</span>
       </div>
       {isLong && (
          <button 
             onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
             }}
             className="text-[#ffd700] hover:underline font-bold text-xs text-left w-max self-start mt-0.5 active:scale-95 transition-all"
          >
             {isExpanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
       )}
    </div>
  );
}

export function ProfileSwiper({ profiles, title, onClose, onReachEnd }: { profiles: any[], title: string, onClose?: () => void, onReachEnd?: () => void, key?: any }) {
  const { likedProfiles, savedProfiles, toggleLike, toggleSave, settings, updateSettings, myProfile, updateMyProfile, saveSettings, isSavingPref, registerSwipe } = React.useContext(AppContext);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => {
     const storedId = sessionStorage.getItem(`swipe_id_${title}`);
     if (storedId) {
         const foundIdx = profiles.findIndex(p => p.id === parseInt(storedId) || p.id === storedId);
         if (foundIdx !== -1) return foundIdx;
     }
     return 0;
  });

  const rawProfile = profiles[currentIndex] || null;

  useEffect(() => {
     if (rawProfile) {
         sessionStorage.setItem(`swipe_id_${title}`, rawProfile.id.toString());
     }
  }, [currentIndex, rawProfile, title]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAstrologyModalOpen, setIsAstrologyModalOpen] = useState(false);
  const [showFullReading, setShowFullReading] = useState(false);
  const [astrologyCardIndex, setAstrologyCardIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [topActionModal, setTopActionModal] = useState<null | 'music' | 'astrology' | 'settings' | 'tarot'>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [currentTarotIndex, setCurrentTarotIndex] = useState(0);
  const musicInputRef = React.useRef<HTMLInputElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const { activePriorities, distance, isDistanceFlexible, ageMin, ageMax, isAgeFlexible, interestedIn } = settings;

  const togglePriority = (priority: string) => {
    const newPriorities = activePriorities.includes(priority) 
      ? activePriorities.filter(p => p !== priority) 
      : [...activePriorities, priority];
    updateSettings({ activePriorities: newPriorities });
  };

  const [localSettings, setLocalSettings] = useState(() => ({
     activePriorities: settings.activePriorities || ['Dành Cho Bạn'],
     distance: settings.distance ?? 100,
     isDistanceFlexible: settings.isDistanceFlexible ?? true,
     ageMin: settings.ageMin ?? 18,
     ageMax: settings.ageMax ?? 31,
     isAgeFlexible: settings.isAgeFlexible ?? true,
     interestedIn: settings.interestedIn || 'Mọi người',
     location: settings.location || 'Hà Nội, Hà Nội'
  }));

  useEffect(() => {
     if (topActionModal === 'settings') {
        setLocalSettings({
           activePriorities: settings.activePriorities || ['Dành Cho Bạn'],
           distance: settings.distance ?? 100,
           isDistanceFlexible: settings.isDistanceFlexible ?? true,
           ageMin: settings.ageMin ?? 18,
           ageMax: settings.ageMax ?? 31,
           isAgeFlexible: settings.isAgeFlexible ?? true,
           interestedIn: settings.interestedIn || 'Mọi người',
           location: settings.location || 'Hà Nội, Hà Nội'
        });
     }
  }, [topActionModal, settings]);

  const updateLocalSettings = (partial: any) => {
     setLocalSettings(prev => ({ ...prev, ...partial }));
  };

  const toggleLocalPriority = (priority: string) => {
     const lp = localSettings.activePriorities || [];
     const newPriorities = lp.includes(priority)
        ? lp.filter(p => p !== priority)
        : [...lp, priority];
     updateLocalSettings({ activePriorities: newPriorities });
  };
  
  const getZodiacSymbol = (zodiac: string) => {
    const map: any = {
      'Bạch Dương': '♈', 'Kim Ngưu': '♉', 'Song Tử': '♊', 'Cự Giải': '♋', 'Sư Tử': '♌', 'Xử Nữ': '♍',
      'Thiên Bình': '♎', 'Bò Cạp': '♏', 'Thiên Yết': '♏', 'Nhân Mã': '♐', 'Ma Kết': '♑', 'Bảo Bình': '♒', 'Song Ngư': '♓'
    };
    return map[zodiac] || '';
  };

  const currentProfile = React.useMemo(() => {
    if (rawProfile && !rawProfile.astrologyDetails) {
       rawProfile.astrologyDetails = {
           vibe: Math.floor(Math.random() * 3) + 3,
           communication: Math.floor(Math.random() * 3) + 3,
           emotion: Math.floor(Math.random() * 3) + 3,
           attraction: Math.floor(Math.random() * 3) + 3,
           sun: rawProfile.zodiac || 'Không rõ',
           moon: 'Chưa rõ',
           rising: 'Chưa rõ'
       };
    }
    if (!rawProfile) return null;
    const myZodiacSymbol = getZodiacSymbol(myProfile.zodiac || 'Song Tử');
    const partnerZodiacSymbol = getZodiacSymbol(rawProfile.zodiac || 'Song Tử');
    
    let newAstrologyMatch = getTeaserText(myProfile.zodiac || 'Song Tử', rawProfile.zodiac || 'Bạch Dương');

    const matchTags = [
      { key: 'lifestyle', label: 'Lối sống' },
      { key: 'prompt', label: 'Câu hỏi' },
      { key: 'job', label: 'Ngành nghề' },
      { key: 'language', label: 'Ngôn ngữ' },
      { key: 'religion', label: 'Tôn giáo' },
      { key: 'communicationStyle', label: 'Giao tiếp' },
      { key: 'need', label: 'Nhu cầu' },
      { key: 'pet', label: 'Thú cưng' },
      { key: 'music', label: 'Nghe nhạc' },
      { key: 'book', label: 'Sách' },
      { key: 'food', label: 'Đồ ăn' },
      { key: 'travel', label: 'Du lịch' },
      { key: 'game', label: 'Trò chơi' },
      { key: 'sport', label: 'Thể thao' },
      { key: 'gender', label: 'Giới tính' },
      { key: 'height', label: 'Chiều cao' },
      { key: 'zodiac', label: 'Cung hoàng đạo' }
    ];
    
    const matchingTags = [];
    matchTags.forEach(t => {
      const isMyPreview = rawProfile.id === myProfile.id;
      const theirVal = rawProfile[t.key];
      const myVal = myProfile[t.key];

      if (theirVal && typeof theirVal === 'string') {
        const isMatch = theirVal === myVal;
        if (isMyPreview || isMatch) {
           matchingTags.push({ label: t.label, value: theirVal });
        }
      }
    });

    return {
      ...rawProfile,
      myZodiac: `Bạn: ${myProfile.zodiac} ${myZodiacSymbol}`,
      partnerZodiac: `${rawProfile.name}: ${rawProfile.zodiac} ${partnerZodiacSymbol}`,
      astrologyMatch: newAstrologyMatch,
      matchingTags
    };
  }, [rawProfile, myProfile]);

  const [currentProfileAudioUrl, setCurrentProfileAudioUrl] = useState<string | null>(null);

  useEffect(() => {
     if (currentProfile?.songTitle) {
         if (currentProfile.songUrl) {
            setCurrentProfileAudioUrl(currentProfile.songUrl);
         } else {
            fetch(`/api/users/${currentProfile.id}/song`)
              .then(res => res.json())
              .then(data => {
                  if (data.success && data.data) {
                      setCurrentProfileAudioUrl(data.data.song_data);
                  } else {
                      setCurrentProfileAudioUrl(null);
                  }
              }).catch(() => setCurrentProfileAudioUrl(null));
         }
     } else {
         setCurrentProfileAudioUrl(null);
     }
  }, [currentProfile]);

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };
  const currentAge = currentProfile ? calculateAge(currentProfile.dob) : '';

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCurrentImageIndex(0);
      setIsAstrologyModalOpen(false);
      setIsPlaying(false);
      x.set(0);
    }
  };

  const nextImage = () => {
    if (currentProfile && currentImageIndex < currentProfile.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setIsAstrologyModalOpen(false);
      setIsPlaying(false);
    }
  };

  const prevImage = () => {
    if (currentProfile && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setIsAstrologyModalOpen(false);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
       if (isPlaying) {
          audioRef.current.play().catch(e => console.error("Audio playback failed", e));
       } else {
          audioRef.current.pause();
       }
    }
  }, [isPlaying, currentImageIndex, currentProfile]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onReachEnd) {
         setCurrentIndex(0); // reset index for new batch
         onReachEnd();
      } else {
         setCurrentIndex(0); // loop for prototype
      }
    }
    setCurrentImageIndex(0);
    setIsAstrologyModalOpen(false);
    setIsPlaying(false);
    x.set(0);
  };

  const isLiked = currentProfile ? (likedProfiles || []).some(p => p && p.id === currentProfile.id) : false;
  const isSaved = currentProfile ? (savedProfiles || []).some(p => p && p.id === currentProfile.id) : false;

  const onLikeClick = () => {
    if (currentProfile) {
       toggleLike(currentProfile);
       if (!isLiked) {
          x.set(100);
          setTimeout(() => handleNext(), 300);
       }
    }
  };

  const onSaveClick = () => {
    if (currentProfile) toggleSave(currentProfile);
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      // Swiped right (like)
      if (currentProfile && !isLiked) toggleLike(currentProfile);
      handleNext();
    } else if (info.offset.x < -100) {
      // Swiped left (nope)
      if (currentProfile && registerSwipe) {
         registerSwipe(currentProfile.id, 'pass');
      }
      handleNext();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#ff9ca0]">
      {/* Top Banner */}
      <div className="bg-[#ff9ca0] px-4 justify-between flex items-center pt-8 pb-3 z-20 shrink-0 shadow-sm border-b border-black/10 relative">
        {onClose ? (
           <>
             <button onClick={onClose} className="p-1.5 active:scale-90 transition-transform">
                <ArrowLeft className="w-6 h-6 text-black" />
             </button>
             <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
                <Star className="w-8 h-8 stroke-[2.5]" />
                <div className="bg-white rounded-full px-5 py-1.5 text-[15px] font-bold shadow-sm border border-black/5">
                  {title}
                </div>
             </div>
           </>
        ) : (
          <div className="w-full flex items-center px-1">
             <button onClick={() => setTopActionModal('settings')} className="p-1.5 shrink-0 text-black/60">
                <Settings2 className="w-6 h-6 stroke-[2]" />
             </button>
             <div className="flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mx-2">
                <div className="flex bg-black/10 rounded-full p-1 w-max gap-1">
                   <button className="bg-white rounded-full px-4 py-1.5 text-[14px] font-bold shadow-sm border border-black/5 flex items-center shrink-0">
                     Dành Cho Bạn
                   </button>
                   <button onClick={() => setTopActionModal('music')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-black/60 shrink-0 hover:bg-black/5 transition-colors">
                     Âm nhạc
                   </button>
                   <button onClick={() => setTopActionModal('astrology')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-black/60 flex items-center gap-1 shrink-0 hover:bg-black/5 transition-colors">
                     <span>Chiêm tinh</span>
                   </button>
                   <button onClick={() => setTopActionModal('tarot')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-[#ff2d55] flex items-center gap-1 shrink-0 bg-pink-100/50 hover:bg-pink-100/80 transition-colors">
                     <span>Tarot tình yêu</span>
                   </button>
                </div>
             </div>
             <button className="bg-purple-600/20 p-2 rounded-full shrink-0">
                <Zap className="w-5 h-5 text-purple-600 fill-purple-600" />
             </button>
          </div>
        )}
      </div>

      {/* Card area */}
      <div className="flex-1 relative bg-[#fff0f1] overflow-hidden">
        {profiles.length === 0 ? (
          <div className="absolute inset-0 flex justify-center items-center">
            <p className="text-xl font-bold text-black/30">Không có hồ sơ nào</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {currentProfile ? (
              <motion.div 
                key={currentProfile.id}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute inset-0 flex flex-col w-full h-full"
              >
              <motion.div 
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragSnapToOrigin={true}
                style={{ x, rotate }}
                onDragEnd={handleDragEnd}
                whileDrag={{ scale: 1.05 }}
                className="w-full flex-1 flex flex-col bg-black relative touch-none cursor-grab active:cursor-grabbing z-10 overflow-hidden min-h-0"
              >
                <div className="w-full h-full relative bg-black group overflow-hidden">
                  <img src={currentProfile.images[currentImageIndex]} alt="Profile" className="w-full h-full object-cover transition-opacity duration-300 pointer-events-none" />
                  
                  {/* Image Navigation Overlays */}
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 h-full z-20" onClick={prevImage}></div>
                    <div className="w-1/2 h-full z-20" onClick={nextImage}></div>
                  </div>

                  {/* Progress bars */}
                  {currentProfile.images.length > 1 && (
                    <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-6 z-30 pointer-events-none">
                      {currentProfile.images.map((_, i) => (
                        <div key={i} className={`h-[4px] flex-1 rounded-full shadow-sm transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                      ))}
                    </div>
                  )}

                  {/* Info Overlay at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 pt-32 pb-[110px] px-6 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-30 flex flex-col justify-end">
                    <h2 className="text-[32px] font-bold tracking-tight text-white leading-none drop-shadow-lg flex items-center gap-2">
                       {currentProfile.name} 
                       <span className="text-[26px] font-normal">{currentAge}</span>
                    </h2>
                    <p className="text-[16px] font-medium text-white/90 drop-shadow-md mt-1 mb-4">{currentProfile.currentDistanceDisplay || currentProfile.distance}</p>
                    
                    <div className="relative pointer-events-auto">
  <AnimatePresence mode="wait">
    <motion.div key={"info" + currentImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full flex flex-col gap-2">
      {(() => {
         // Determine which info blocks to show for each image
         const renderElements = [];
         
         const hasMusic = !!(currentProfile.songTitle && currentProfile.songUrl);
         const imagesCount = currentProfile.images.length || 1;

         const commonFieldsCheck = ['pet', 'music', 'book', 'food', 'travel', 'game', 'sport', 'religion', 'communicationStyle', 'need', 'zodiac', 'job'];
         const matchedKeys = commonFieldsCheck.filter(k => {
            const v1 = myProfile[k];
            const v2 = currentProfile ? (currentProfile[k] || (currentProfile.lifestyle && currentProfile.lifestyle[k])) : null;
            if (!v1 || !v2) return false;
            const s1 = String(v1).trim().toLowerCase();
            const s2 = String(v2).trim().toLowerCase();
            if (s1 === 'khác' || s1 === 'chưa cập nhật' || s1 === '' || s1 === 'không' || s1 === 'không nuôi') return false;
            return s1 === s2;
         });
         const hasCommonPoints = matchedKeys.length > 0;

         const isMatchWithMe = (key: string, value: any) => {
            if (!value) return false;
            const myVal = myProfile[key];
            if (!myVal) return false;
            const valStr = String(value).trim().toLowerCase();
            const myStr = String(myVal).trim().toLowerCase();
            if (valStr === 'khác' || valStr === 'chưa cập nhật' || valStr === 'không' || valStr === 'không nuôi' || valStr === '') return false;
            return valStr === myStr;
         };

         // Determine where elements go depending on whether they have common points or not
         let targetAstrologyIndex = 0;
         let targetBadgesIndex = 0;
         let targetMusicIndex = 0;

         if (hasCommonPoints) {
            // Put "Điểm chung" on index 0
            // Put Astrology & Music on index 1
            // Put Badges on index 2 (if exists, else 1)
            if (imagesCount === 1) {
               targetAstrologyIndex = 0;
               targetBadgesIndex = 0;
               targetMusicIndex = 0;
            } else if (imagesCount === 2) {
               targetAstrologyIndex = 1;
               targetMusicIndex = 1;
               targetBadgesIndex = 1;
            } else {
               targetAstrologyIndex = 1;
               targetMusicIndex = 1;
               targetBadgesIndex = 2;
            }
         } else {
            // NO common points: Don't show "Điểm chung" card
            // Put Astrology on index 0 (since face area is clear, we can show it here)
            // Put Badges on index 1 (or 0 if only 1 image)
            if (imagesCount === 1) {
               targetAstrologyIndex = 0;
               targetBadgesIndex = 0;
               targetMusicIndex = 0;
            } else if (imagesCount === 2) {
               targetAstrologyIndex = 0;
               targetBadgesIndex = 1;
               targetMusicIndex = 1;
            } else {
               targetAstrologyIndex = 0;
               targetMusicIndex = 1;
               targetBadgesIndex = 1;
            }
         }

         // BioCard (Giới thiệu bản thân) ONLY if currentProfile has a bio, on currentImageIndex === 0
         if (currentImageIndex === 0 && currentProfile.bio && currentProfile.bio.trim() !== '') {
            renderElements.push(
               <BioCard key="bio_card" bio={currentProfile.bio} />
            );
         }

         // 1. Render Common Points ("Điểm chung" or "Tìm người yêu" description card) ONLY on index 0 and ONLY if hasCommonPoints is true
         if (currentImageIndex === 0 && hasCommonPoints) {
            const isLookingForLove = title === 'Tìm người yêu' || (currentProfile.need || '').toLowerCase().includes('yêu') || (currentProfile.need || '').toLowerCase().includes('lover');
            if (isLookingForLove) {
               renderElements.push(
                 <div key="common_love" className="bg-gradient-to-r from-red-600/75 via-pink-600/70 to-red-500/75 backdrop-blur-md px-4 py-3.5 rounded-xl border border-red-300/30 shadow-lg text-[14px] text-white animate-[pulse_2.5s_infinite] flex items-start gap-2">
                    <span className="text-lg">❤️</span>
                    <div>
                      <span className="font-bold text-yellow-300">Tìm người yêu: </span>
                      <span className="text-white/95 leading-relaxed font-semibold">
                        {currentProfile.bio ? `"${currentProfile.bio}"` : `Muốn tìm một người đồng hành thấu hiểu để chia sẻ yêu thương, nhắn tin mỗi ngày và cùng nhau hẹn hò lãng mạn.`}
                      </span>
                    </div>
                 </div>
               );
            } else {
               renderElements.push(
                 <div key="common" className="bg-black/50 backdrop-blur-md px-4 py-3.5 rounded-xl border border-white/20 shadow-sm text-[14px] text-white">
                    <span className="font-bold text-[#ff9ca0]">Điểm chung: </span>
                    <span>{currentProfile.commonPoints || 'Chưa có thông tin'}</span>
                 </div>
               );
            }
         }
         
         // 2. Render Astrology ("Chiêm tinh") card at target index
         if (currentImageIndex === targetAstrologyIndex) {
            renderElements.push(
              <div key="astro" className="bg-black/50 backdrop-blur-md px-4 py-3.5 rounded-xl border border-white/20 shadow-sm text-[14px] text-white cursor-pointer transition-all" onClick={(e) => { e.stopPropagation(); setIsAstrologyModalOpen(true); }}>
                 <div className="line-clamp-2">
                   <span className="font-bold text-[#ffd700]">Chiêm tinh: </span>
                   <span className="text-white/90">{currentProfile.astrologyMatch}</span>
                 </div>
                 <div className="text-[#ffd700] mt-1 font-bold text-[13px] hover:underline">Xem thêm {'>'}</div>
              </div>
            );
         }

         // 3. Render Badges ("Nhu cầu", "Cung hoàng đạo", "Ngành nghề") at target index
         if (currentImageIndex === targetBadgesIndex) {
            const badgesDef = [
               { key: 'need', label: 'Nhu cầu', icon: '🎯' },
               { key: 'zodiac', label: 'Cung hoàng đạo', icon: '🧭' },
               { key: 'job', label: 'Ngành nghề', icon: '💼' }
            ];
            const visibleBadges = badgesDef.map(b => {
               const val = currentProfile[b.key] || (currentProfile.lifestyle && currentProfile.lifestyle[b.key]);
               if (!val || val === 'Chưa cập nhật' || val === 'Khác') return null;
               const isMatch = isMatchWithMe(b.key, val);
               return { ...b, val, isMatch };
            }).filter(Boolean);

            if (visibleBadges.length > 0) {
               renderElements.push(
                 <div key="special_badges" className="flex flex-wrap gap-2 mt-1">
                    {visibleBadges.map((badge: any) => (
                       <span 
                         key={badge.key}
                         style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                         className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold border backdrop-blur-md shadow-md transition-all ${
                           badge.isMatch 
                             ? 'bg-sky-500/80 text-white border-sky-400/40 shadow-sky-500/20' 
                             : 'bg-white/10 text-white border-white/20 font-medium'
                         }`}
                       >
                          <span>{badge.icon}</span>
                          <span className="opacity-80">{badge.label}:</span>
                          <span className={badge.isMatch ? 'text-white' : 'text-white/95'}>{badge.val}</span>
                       </span>
                    ))}
                 </div>
               );
            }
         }

         // 4. Render Music player at target index
         if (hasMusic && currentImageIndex === targetMusicIndex) {
            renderElements.push(
              <div key="music" className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-sm flex items-center justify-between mt-1 text-white max-w-[250px]" onClick={(e) => {
                 e.stopPropagation();
                 if (audioRef.current) {
                    if (isPlaying) {
                       audioRef.current.pause();
                    } else {
                       audioRef.current.play();
                    }
                    setIsPlaying(!isPlaying);
                 }
              }}>
                 <div className="flex items-center gap-3 w-content">
                    <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center shrink-0">
                       {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-[1px]" />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[13px] font-bold truncate">{currentProfile.songTitle}</span>
                       <span className="text-[11px] text-white/70 truncate">Tải lên bởi {currentProfile.name}</span>
                    </div>
                 </div>
                 <div className="flex gap-1 ml-4 justify-center items-center">
                    <span className={"w-1 h-3 bg-white/50 rounded-full " + (isPlaying ? 'animate-[bounce_0.8s_infinite]' : '')}></span>
                    <span className={"w-1 h-4 bg-white/70 rounded-full " + (isPlaying ? 'animate-[bounce_1s_infinite]' : '')}></span>
                    <span className={"w-1 h-2 bg-white/40 rounded-full " + (isPlaying ? 'animate-[bounce_0.6s_infinite]' : '')}></span>
                 </div>
              </div>
            );
         }

         // 5. Render Hobby/Interest Tags at appropriate index (distributed to give space)
         const tagsToShow = currentProfile.matchingTags || [];
         let slice = [];
         
         const startTagsIndex = (hasCommonPoints ? (imagesCount > 2 ? 2 : 1) : 1);

         if (imagesCount === 1) {
             slice = tagsToShow;
         } else {
             if (currentImageIndex >= startTagsIndex) {
                 const remainingImagesCount = Math.max(1, imagesCount - startTagsIndex);
                 const tagsPerImg = Math.ceil(tagsToShow.length / remainingImagesCount);
                 const tagIndex = currentImageIndex - startTagsIndex;
                 const startIndex = tagIndex * tagsPerImg;
                 slice = tagsToShow.slice(startIndex, startIndex + tagsPerImg);
             }
         }

         if (slice.length > 0) {
            renderElements.push(
              <div key="tags" className="flex flex-wrap gap-2 mt-1">
                 {slice.map((t: any, i: number) => (
                    <div key={i} className="bg-sky-500/80 backdrop-blur-md rounded-full px-3 py-1 text-[13px] text-white border border-sky-400/40 shadow-sm font-bold">
                       <span className="font-bold opacity-80 mr-1">{t.label}:</span>
                       <span className="font-semibold text-white">{t.value}</span>
                    </div>
                 ))}
              </div>
            );
         }

         if (renderElements.length === 0) {
            // fallback if empty
            return <div className="h-4"></div>;
         }

         return renderElements;
      })()}
    </motion.div>
  </AnimatePresence>
  {currentProfileAudioUrl && (
     <audio ref={audioRef} src={currentProfileAudioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
  )}
</div>
                  </div>
                </div>

                {/* Action Buttons Fixed at Bottom of Profile Card Area */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-40 w-full pointer-events-auto">
                   <motion.button whileTap={{ scale: 0.85 }} onClick={handleBack} className="w-[60px] h-[60px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-xl border border-black/5">
                     <ArrowLeft className="w-7 h-7 text-[#2dd881] stroke-[2.5]" />
                   </motion.button>
                   <motion.button whileTap={{ scale: 0.85 }} onClick={() => {
                    if (currentProfile && registerSwipe) {
                      registerSwipe(currentProfile.id, 'pass');
                    }
                    handleNext();
                  }} className="w-[72px] h-[72px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-xl border border-black/5">
                     <X className="w-9 h-9 text-[#ff3b30] stroke-[2.5]" />
                   </motion.button>
                   <motion.button whileTap={{ scale: 0.85 }} onClick={onLikeClick} className="w-[72px] h-[72px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-xl border border-black/5">
                     <Heart className={`w-8 h-8 flex-shrink-0 stroke-[2] ${isLiked ? 'text-[#ff4081] fill-[#ff4081]' : 'text-[#ff4081]'}`} />
                   </motion.button>
                   <motion.button whileTap={{ scale: 0.85 }} onClick={onSaveClick} className="w-[60px] h-[60px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-xl border border-black/5">
                     <Bookmark className={`w-7 h-7 stroke-[2] ${isSaved ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-500'}`} />
                   </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center h-full text-gray-500 w-full absolute inset-0 font-medium"
            >
              Hết hồ sơ để xem
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {isAstrologyModalOpen && currentProfile && currentProfile.astrologyDetails && (
          <motion.div 
             initial={{ opacity: 0, y: '100%' }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: '100%' }}
             transition={{ type: "spring", damping: 25, stiffness: 200 }}
             className="absolute inset-0 z-50 bg-[#1e0a45] flex flex-col text-white overflow-hidden"
          >
             {/* Space Background Elements */}
             <div className="absolute inset-0 bg-gradient-to-b from-[#311175] via-[#1c0846] to-[#0d0320] pointer-events-none" />
             
             {/* Stars */}
             <div className="absolute top-12 left-10 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_15px_4px_rgba(255,255,255,0.8)] opacity-90" />
             <div className="absolute top-32 right-12 w-2 h-2 bg-white rounded-full shadow-[0_0_20px_5px_rgba(255,255,255,0.9)] opacity-100" />
             <div className="absolute top-48 left-1/4 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.6)] opacity-60" />
             <div className="absolute top-20 right-1/3 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.5)] opacity-50" />
             
             {/* Light Beam */}
             <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#8f47ff]/30 to-transparent pointer-events-none" />

             {/* Header */}
             <div className="relative pt-6 px-4 pb-2 z-10 shrink-0">
                <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-4" />
                <button onClick={() => setIsAstrologyModalOpen(false)} className="absolute left-4 top-8 p-1 rounded-full active:scale-90 transition-transform">
                   <X className="w-6 h-6 text-white/80" />
                </button>
                <button className="absolute right-4 top-8 p-1.5 bg-white/20 rounded-full active:scale-90 transition-transform">
                   <Info className="w-4 h-4 text-white" />
                </button>
                
                <div className="flex justify-between items-end mt-10 mb-4 px-1">
                   <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1 opacity-90"><Star className="w-4 h-4 text-purple-300 fill-purple-300"/> <span className="font-bold text-[14px]">Aura Chiêm tinh</span></div>
                      <h2 className="text-[32px] font-bold tracking-tight leading-none">Bạn và {currentProfile.name}</h2>
                   </div>
                   <div className="flex -space-x-3 mb-1">
                      <div className="w-[46px] h-[46px] rounded-full border-[2px] border-[#1e0a45] overflow-hidden shrink-0 bg-gray-500 z-10 shadow-sm">
                         <img src={myProfile.images?.[0]} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-[46px] h-[46px] rounded-full border-[2px] border-[#1e0a45] overflow-hidden shrink-0 bg-gray-500 z-20 shadow-sm">
                         <img src={currentProfile.images?.[0]} className="w-full h-full object-cover" />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto px-5 py-2 relative z-10">
                 
                 <style dangerouslySetInnerHTML={{__html: `
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                 `}} />

                 {/* Horizontal scroll container for cards */}
                 <div 
                    className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 mb-4" 
                    onScroll={(e) => {
                       const scrollLeft = (e.target as HTMLElement).scrollLeft;
                       const width = (e.target as HTMLElement).offsetWidth;
                       setAstrologyCardIndex(Math.round(scrollLeft / width));
                    }}
                 >
                    <div className="w-full shrink-0 snap-center h-full">
                        <div className="bg-[#4b2f89]/40 backdrop-blur-md rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#8352db]/30 relative h-full min-h-[165px]">
                            <div className="flex items-center gap-2 mb-3">
                               <Star className="w-5 h-5 text-[#f4902b] fill-[#f4902b]" />
                               <span className="font-bold text-[16px] text-white">Tính cách mỗi bên</span>
                            </div>
                            <div className="flex flex-col gap-1.5 mb-2 text-[14px]">
                               <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-1.5 border border-white/5">
                                   <span className="text-white/90 font-medium">{currentProfile.myZodiac}</span>
                                   <span className="text-[12px] text-white/50 uppercase font-bold tracking-wider">{ASTRO_ELEMENTS[myProfile.zodiac || 'Bạch Dương'] === 'fire' ? 'Lửa' : ASTRO_ELEMENTS[myProfile.zodiac || 'Bạch Dương'] === 'water' ? 'Nước' : ASTRO_ELEMENTS[myProfile.zodiac || 'Bạch Dương'] === 'air' ? 'Khí' : 'Đất'}</span>
                               </div>
                               <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-1.5 border border-white/5">
                                   <span className="text-white/90 font-medium">{currentProfile.partnerZodiac}</span>
                                   <span className="text-[12px] text-white/50 uppercase font-bold tracking-wider">{ASTRO_ELEMENTS[currentProfile?.zodiac || 'Bạch Dương'] === 'fire' ? 'Lửa' : ASTRO_ELEMENTS[currentProfile?.zodiac || 'Bạch Dương'] === 'water' ? 'Nước' : ASTRO_ELEMENTS[currentProfile?.zodiac || 'Bạch Dương'] === 'air' ? 'Khí' : 'Đất'}</span>
                               </div>
                            </div>
                            <p className="font-bold text-[15px] leading-snug text-white">
                               {getElementComboText(myProfile.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương')}
                            </p>
                        </div>
                    </div>
                    <div className="w-full shrink-0 snap-center h-full">
                        <div className="bg-[#4b2f89]/40 backdrop-blur-md rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#8352db]/30 relative h-full min-h-[165px]">
                            <div className="flex items-center gap-2 mb-3">
                               <Heart className="w-5 h-5 text-[#ff2d55] fill-[#ff2d55]" />
                               <span className="font-bold text-[16px] text-white">Kết nối cảm xúc</span>
                            </div>
                            <p className="font-bold text-[15px] leading-relaxed text-white mt-1">
                               {getFullAstrologyText(myProfile.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương')}
                            </p>
                        </div>
                    </div>
                    <div className="w-full shrink-0 snap-center h-full">
                        <div className="bg-[#4b2f89]/40 backdrop-blur-md rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#8352db]/30 relative h-full min-h-[165px]">
                            <div className="flex items-center gap-2 mb-3">
                               <Smile className="w-5 h-5 text-blue-400 fill-blue-400" />
                               <span className="font-bold text-[16px] text-white">Cách nhìn nhận của nửa kia</span>
                            </div>
                            <p className="font-bold text-[15px] leading-relaxed text-white mt-1">
                               {getPartnerPerspectiveText(myProfile?.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương', currentProfile?.name || 'Họ')}
                            </p>
                        </div>
                    </div>
                 </div>

                 {/* Pagination Dots */}
                 <div className="flex justify-center gap-1.5 mb-8">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${astrologyCardIndex === 0 ? 'bg-white' : 'bg-white/30'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${astrologyCardIndex === 1 ? 'bg-white' : 'bg-white/30'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${astrologyCardIndex === 2 ? 'bg-white' : 'bg-white/30'}`} />
                 </div>

                 <h3 className="text-[22px] font-bold mb-5 tracking-tight">Tương thích</h3>
                 <div className="grid grid-cols-2 gap-x-6 gap-y-6 mb-10">
                    <div>
                        <span className="text-[15px] font-medium text-white/90 block mb-2">Vibe</span>
                        <div className="flex h-[10px] gap-[3px]">
                           {[...Array(5)].map((_, i) => (
                             <div key={i} className={`flex-1 rounded-[3px] ${i < currentProfile.astrologyDetails.vibe ? 'bg-[#ff2d55]' : 'bg-[#4b3570]'}`} />
                           ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-[15px] font-medium text-white/90 block mb-2">Giao tiếp</span>
                        <div className="flex h-[10px] gap-[3px]">
                           {[...Array(5)].map((_, i) => (
                             <div key={i} className={`flex-1 rounded-[3px] ${i < currentProfile.astrologyDetails.communication ? 'bg-[#ff2d55]' : 'bg-[#4b3570]'}`} />
                           ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-[15px] font-medium text-white/90 block mb-2">Cảm xúc</span>
                        <div className="flex h-[10px] gap-[3px]">
                           {[...Array(5)].map((_, i) => (
                             <div key={i} className={`flex-1 rounded-[3px] ${i < currentProfile.astrologyDetails.emotion ? 'bg-[#ff2d55]' : 'bg-[#4b3570]'}`} />
                           ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-[15px] font-medium text-white/90 block mb-2">Hấp dẫn nhau</span>
                        <div className="flex h-[10px] gap-[3px]">
                           {[...Array(5)].map((_, i) => (
                             <div key={i} className={`flex-1 rounded-[3px] ${i < currentProfile.astrologyDetails.attraction ? 'bg-[#ff2d55]' : 'bg-[#4b3570]'}`} />
                           ))}
                        </div>
                    </div>
                 </div>

                 <h3 className="text-[22px] font-bold mb-6 tracking-tight">Các yếu tố</h3>
                 <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                     <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                           <div className="w-[52px] h-[52px] bg-[#3a1964] rounded-full flex items-center justify-center border border-[#7a4bbb] shadow-[0_0_15px_rgba(255,60,60,0.3)] shrink-0 mb-2">
                              <span className="text-[26px]">🔥</span>
                           </div>
                           <div className="bg-white text-black text-[11px] font-bold px-2 py-0.5 rounded-full">{getElementPercents(myProfile?.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương').fire}%</div>
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-[16px] leading-tight mb-1">Lửa</span>
                           <span className="text-[13px] text-white/70 leading-snug">Đam mê và Hành động</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                           <div className="w-[52px] h-[52px] bg-[#1a2d42] rounded-full flex items-center justify-center border border-[#3b725c] shadow-[0_0_15px_rgba(60,255,150,0.1)] shrink-0 mb-2">
                              <span className="text-[26px]">🪴</span>
                           </div>
                           <div className="bg-white text-black text-[11px] font-bold px-2 py-0.5 rounded-full">{getElementPercents(myProfile?.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương').earth}%</div>
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-[16px] leading-tight mb-1">Đất</span>
                           <span className="text-[13px] text-white/70 leading-snug">Lý trí và Thực tế</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                           <div className="w-[52px] h-[52px] bg-[#22396e] rounded-full flex items-center justify-center border border-[#4b84bb] shadow-[0_0_15px_rgba(100,180,255,0.2)] shrink-0 mb-2">
                              <span className="text-[26px]">🌬️</span>
                           </div>
                           <div className="bg-white text-black text-[11px] font-bold px-2 py-0.5 rounded-full">{getElementPercents(myProfile?.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương').air}%</div>
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-[16px] leading-tight mb-1">Khí</span>
                           <span className="text-[13px] text-white/70 leading-snug">Giao tiếp và Sáng tạo</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                           <div className="w-[52px] h-[52px] bg-[#1b4e6d] rounded-full flex items-center justify-center border border-[#2db8d8] shadow-[0_0_15px_rgba(60,200,255,0.3)] shrink-0 mb-2">
                              <span className="text-[26px]">💧</span>
                           </div>
                           <div className="bg-white text-black text-[11px] font-bold px-2 py-0.5 rounded-full">{getElementPercents(myProfile?.zodiac || 'Bạch Dương', currentProfile?.zodiac || 'Bạch Dương').water}%</div>
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-[16px] leading-tight mb-1">Nước</span>
                           <span className="text-[13px] text-white/70 leading-snug">Cảm xúc và Bản năng</span>
                        </div>
                     </div>
                 </div>

                 <div className="bg-[#381c6c]/80 backdrop-blur-md rounded-2xl p-5 text-center mb-6 border border-[#522a94]">
                    <h4 className="font-bold text-[15px] mb-3">Giải mã các yếu tố của bạn</h4>
                    <p className="text-[15px] text-white/90 font-medium">"{getElementComboText(currentProfile?.myZodiac || 'Bạch Dương', currentProfile?.partnerZodiac || 'Bạch Dương')}"</p>
                 </div>
                 
                 <div className="bg-[#522a94]/40 backdrop-blur-md rounded-2xl p-5 mb-8 relative border border-[#8352db]/50 cursor-pointer overflow-hidden transition-all duration-300" onClick={() => setShowFullReading(v => !v)}>
                    {!showFullReading && <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1e0a45] to-transparent z-10 pointer-events-none rounded-b-2xl" />}
                    <h4 className="font-bold text-[16px] mb-3 text-[#ff9ca0] flex justify-between items-center">
                        Thông điệp vũ trụ
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFullReading ? 'rotate-180' : ''}`} />
                    </h4>
                    
                    <div className="relative">
                       <p className={`text-[14px] text-white/90 leading-relaxed transition-all duration-300 ${!showFullReading ? 'line-clamp-2 blur-[1px]' : ''}`}>
                          {getTeaserText(currentProfile?.myZodiac || 'Bạch Dương', currentProfile?.partnerZodiac || 'Bạch Dương')}
                          {showFullReading && (
                             <span className="block mt-4 pt-4 border-t border-white/10 text-white/80">
                               {getFullAstrologyText(currentProfile?.myZodiac || 'Bạch Dương', currentProfile?.partnerZodiac || 'Bạch Dương')}
                             </span>
                          )}
                       </p>
                    </div>
                    
                    {!showFullReading && (
                       <div className="text-center mt-3 relative z-20">
                          <span className="text-[13px] font-bold text-[#ff9ca0] uppercase tracking-wider flex justify-center items-center gap-1">
                             <Star className="w-3 h-3" /> Xem thêm để giải mã <Star className="w-3 h-3" />
                          </span>
                       </div>
                    )}
                 </div>
             </div>

             <div className="p-4 pt-0 shrink-0 z-10 w-full mb-4">
                <button 
                  onClick={() => { setIsAstrologyModalOpen(false); setTopActionModal('astrology'); }}
                  className="w-full bg-white/10 border border-white/20 text-white font-bold text-[16px] py-[12px] rounded-full active:scale-95 transition-transform"
                >
                   Khám phá chiêm tinh cá nhân
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {topActionModal === 'music' && (
          <motion.div 
             initial={{ opacity: 0, y: '100%' }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: '100%' }}
             transition={{ type: "spring", damping: 25, stiffness: 200 }}
             className="absolute inset-0 z-50 bg-[#160b2b] flex flex-col text-white"
          >
             <div className="relative pt-6 px-4 pb-4 z-10 shrink-0 border-b border-white/10">
                <button onClick={() => setTopActionModal(null)} className="absolute left-4 top-6 p-1 bg-white/10 rounded-full active:scale-90 transition-transform">
                   <ChevronDown className="w-6 h-6 text-white" />
                </button>
                <div className="flex flex-col items-center">
                   <h2 className="text-[18px] font-bold">Tải nhạc nền</h2>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex justify-center items-center mb-6 border border-white/10">
                   <Music className="w-10 h-10 text-pink-400" />
                </div>
                <h3 className="text-[20px] font-bold mb-2">Mang âm nhạc vào hồ sơ</h3>
                <p className="text-white/60 text-center text-[15px] px-4 mb-8">
                   Thể hiện phong cách cá nhân bằng cách thêm một bài hát nền vào hồ sơ của bạn.
                </p>
                <input type="file" accept="audio/*" ref={musicInputRef} className="hidden" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                       const file = e.target.files[0];
                       const reader = new FileReader();
                       reader.onload = async (event) => {
                           if (event.target?.result) {
                               const base64Audio = event.target.result as string;
                               const userId = sessionStorage.getItem('user_id');
                               if (userId) {
                                   try {
                                       await fetch(`/api/users/${userId}/song`, {
                                           method: 'POST',
                                           headers: { 'Content-Type': 'application/json' },
                                           body: JSON.stringify({ songTitle: file.name, songData: base64Audio })
                                       });
                                   } catch (err) { console.error('Upload failed'); }
                               }
                               if (!globalAudioCache[file.name]) {
                                   globalAudioCache[file.name] = URL.createObjectURL(file);
                               }
                               updateMyProfile({ songTitle: file.name, songUrl: globalAudioCache[file.name] });
                               setTopActionModal(null);
                           }
                       };
                       reader.readAsDataURL(file);
                    }
                 }} />
                 <button className="w-[80%] bg-pink-600 font-bold text-white py-3.5 rounded-full shadow-lg active:scale-95 transition-transform" onClick={() => musicInputRef.current?.click()}>
                    Tải bài hát lên
                 </button>
                 {myProfile.songTitle && (
                    <p className="mt-6 text-green-400 font-bold text-center px-4 w-full truncate border border-green-500/20 bg-green-500/10 rounded-xl py-3">Bài hát hiện tại: {myProfile.songTitle}</p>
                 )}
             </div>
          </motion.div>
        )}
        
        {topActionModal === 'astrology' && (
          <motion.div 
             initial={{ opacity: 0, y: '100%' }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: '100%' }}
             transition={{ type: "spring", damping: 25, stiffness: 200 }}
             className="absolute inset-0 z-50 bg-[#160b2b] flex flex-col text-white"
          >
             <div className="relative pt-6 px-4 pb-4 z-10 shrink-0 border-b border-white/10">
                <button onClick={() => setTopActionModal(null)} className="absolute left-4 top-6 p-1 bg-white/10 rounded-full active:scale-90 transition-transform">
                   <ChevronDown className="w-6 h-6 text-white" />
                </button>
                <div className="flex flex-col items-center">
                   <h2 className="text-[18px] font-bold">Chiêm tinh của bạn</h2>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-[#3a1c71]/20 via-[#d76d77]/10 to-[#ffaf7b]/10 pointer-events-none" />
                
                <div className="text-[64px] mb-4 z-10">{ZODIAC_DATA[myProfile.zodiac]?.symbol || '♈'}</div>
                 <h3 className="text-[24px] font-bold mb-1 z-10">{myProfile.zodiac}</h3>
                 <p className="text-white/60 mb-8 z-10">Cung {ZODIAC_DATA[myProfile.zodiac]?.element || 'Khí'} • {ZODIAC_DATA[myProfile.zodiac]?.range || ''}</p>
                 
                 <div className="bg-[#291749] w-full rounded-2xl p-5 shadow-lg border border-white/5 relative mb-6 z-10">
                    <h4 className="font-bold text-[16px] mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      Khám phá độ tương thích
                    </h4>
                    <p className="text-white/80 text-[14px] leading-relaxed mb-4">
                      Chúng tôi sử dụng thuật toán chiêm tinh học để tìm ra những hồ sơ có độ tương thích cao về vibe, giao tiếp, cảm xúc đối với {myProfile.zodiac}.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                       {ZODIAC_LIST.map((z) => {
                          const score = calculateZodiacCompatibility(myProfile.zodiac || 'Song Tử')[z];
                          return (
                            <div key={z} className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                               <div className="text-xl mb-1">{ZODIAC_DATA[z]?.symbol}</div>
                               <div className={`text-xs font-bold ${score >= 70 ? 'text-pink-400' : 'text-gray-400'}`}>{score}%</div>
                            </div>
                          );
                       })}
                    </div>
                </div>
             </div>
          </motion.div>
        )}

        {topActionModal === 'tarot' && (
          <TarotReadingFlow onClose={() => setTopActionModal(null)} />
        )}

        {topActionModal === 'settings' && (
          <motion.div 
             initial={{ opacity: 0, x: '-100%' }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: '-100%' }}
             transition={{ type: "spring", damping: 25, stiffness: 200 }}
             className="absolute inset-0 z-50 bg-[#111] flex flex-col text-white"
          >
             <div className="flex items-center px-4 pt-10 pb-4 shrink-0 relative">
                <button onClick={() => setTopActionModal(null)} className="p-1.5 active:scale-90 transition-transform absolute left-4">
                   <ArrowLeft className="w-6 h-6 text-[#ff2d55]" strokeWidth={2.5} />
                </button>
                <h2 className="text-[18px] font-bold mx-auto">Tiêu chí ưu tiên</h2>
             </div>
             
             <div className="flex-1 overflow-y-auto px-4 pb-12 pt-2">
                {/* Horizontal Chips section */}
                <div className="bg-[#222] rounded-3xl pt-2 px-2 pb-6 mb-6 mt-2">
                   <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                     {['Dành Cho Bạn', 'Chiêm tinh', 'Âm nhạc', 'Tarot tình yêu'].map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => toggleLocalPriority(cat)}
                           className={`rounded-full px-5 py-2 text-[14px] font-bold shrink-0 transition-colors ${
                              (localSettings.activePriorities || []).includes(cat) 
                                 ? 'border border-white bg-transparent text-white' 
                                 : 'border border-white/20 bg-transparent text-white/50'
                           }`}
                        >
                           {cat}
                        </button>
                     ))}
                   </div>
                </div>

                {/* Location Section */}
                <div className="bg-[#222] rounded-2xl p-5 mb-4">
                   <div className="text-[16px] font-bold mb-4">Địa điểm</div>
                   <div className="flex items-center gap-3 mb-4">
                      <MapPin className="w-6 h-6 text-[#ff2d55] fill-[#ff2d55]" strokeWidth={1} stroke="#111" />
                      <span className="font-bold text-[16px]">{localSettings.location}</span>
                   </div>
                   <button 
                     onClick={() => setIsLocationModalOpen(true)}
                     className="text-[#ff2d55] font-bold text-[15px] active:scale-95 transition-transform"
                   >
                     Thay đổi địa điểm
                   </button>
                </div>
                <p className="text-white/60 text-[14px] px-2 mb-8 leading-snug">Thay đổi địa điểm tìm tương hợp đến bất kỳ đâu.</p>

                {/* Distance Section */}
                <div className="bg-[#222] rounded-2xl mb-6 flex flex-col overflow-hidden">
                   <div className="p-5 border-b border-black/40">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-[16px] font-bold">Khoảng cách tối đa</span>
                         <span className="text-[16px] text-white font-medium text-opacity-80">{localSettings.distance}km.</span>
                      </div>
                      <div className="w-full relative mb-2 h-[24px] flex items-center">
                         <input 
                            type="range" 
                            min="2" max="160" 
                            value={localSettings.distance} 
                            onChange={(e) => updateLocalSettings({ distance: parseInt(e.target.value) })}
                            className="w-full absolute inset-0 opacity-0 cursor-pointer z-10" 
                          />
                         <div className="w-full h-[4px] bg-white/20 rounded-full relative pointer-events-none">
                            <div className="absolute left-0 top-0 bottom-0 bg-[#ff2d55] rounded-full" style={{ width: `${(localSettings.distance / 160) * 100}%` }}></div>
                            <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[#ff2d55] rounded-full shadow-md" style={{ left: `calc(${(localSettings.distance / 160) * 100}% - 12px)` }}></div>
                         </div>
                      </div>
                   </div>
                   <div className="p-5 flex items-center justify-between">
                      <span className="text-[16px] font-medium w-[75%] leading-snug">Hiển thị những người ở xa hơn nếu tôi hết hồ sơ để xem</span>
                      <button 
                        onClick={() => updateLocalSettings({ isDistanceFlexible: !localSettings.isDistanceFlexible })}
                        className={`w-[44px] h-[26px] rounded-full relative shrink-0 transition-colors ${localSettings.isDistanceFlexible ? 'bg-[#ff2d55]' : 'bg-white/20'}`}
                      >
                         <div className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full flex items-center justify-center shadow-sm transition-transform ${localSettings.isDistanceFlexible ? 'right-0.5' : 'left-0.5'}`}>
                            {localSettings.isDistanceFlexible && <Check className="w-[14px] h-[14px] text-[#ff2d55]" strokeWidth={4} />}
                         </div>
                      </button>
                   </div>
                </div>

                {/* Interested In Section */}
                <button 
                  onClick={() => {
                     const currentInt = localSettings.interestedIn || 'Mọi người';
                     const nextInt = currentInt === 'Mọi người' ? 'Nam' : currentInt === 'Nam' ? 'Nữ' : currentInt === 'Nữ' ? 'LGBTQ+' : currentInt === 'LGBTQ+' ? 'Khác' : 'Mọi người';
                     updateLocalSettings({ interestedIn: nextInt });
                  }}
                  className="w-full bg-[#222] rounded-2xl p-5 mb-6 flex justify-between items-center text-left active:bg-[#333] transition-colors"
                >
                   <div className="flex flex-col gap-2">
                      <span className="text-[14px] font-bold text-white/50">Quan Tâm Tới</span>
                      <span className="text-[17px] font-medium">{localSettings.interestedIn}</span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-white/50" />
                </button>

                {/* Age Section */}
                <div className="bg-[#222] rounded-2xl mb-6 flex flex-col overflow-hidden">
                   <div className="p-5 border-b border-black/40">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-[16px] font-bold">Độ tuổi</span>
                         <span className="text-[16px] text-white font-medium text-opacity-80">{localSettings.ageMin} - {localSettings.ageMax}</span>
                      </div>
                      
                      <div className="flex gap-6 mb-2">
                         <div className="flex-1 flex flex-col gap-3">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Tối thiểu</span>
                            <div className="relative w-full h-[24px] flex items-center">
                               <input 
                                  type="range" 
                                  min="18" max="100" 
                                  value={localSettings.ageMin} 
                                  onChange={(e) => updateLocalSettings({ ageMin: Math.min(parseInt(e.target.value), localSettings.ageMax - 1) })}
                                  className="w-full absolute inset-0 opacity-0 cursor-pointer z-10" 
                               />
                               <div className="w-full h-[4px] bg-white/20 rounded-full relative pointer-events-none">
                                  <div className="absolute left-0 top-0 bottom-0 bg-[#ff2d55] rounded-full" style={{ width: `${((localSettings.ageMin - 18) / 82) * 100}%` }}></div>
                                  <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[#ff2d55] rounded-full shadow-md" style={{ left: `calc(${((localSettings.ageMin - 18) / 82) * 100}% - 12px)` }}></div>
                               </div>
                            </div>
                         </div>
                         <div className="flex-1 flex flex-col gap-3">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Tối đa</span>
                            <div className="relative w-full h-[24px] flex items-center">
                               <input 
                                  type="range" 
                                  min="18" max="100" 
                                  value={localSettings.ageMax} 
                                  onChange={(e) => updateLocalSettings({ ageMax: Math.max(parseInt(e.target.value), localSettings.ageMin + 1) })}
                                  className="w-full absolute inset-0 opacity-0 cursor-pointer z-10" 
                               />
                               <div className="w-full h-[4px] bg-white/20 rounded-full relative pointer-events-none">
                                  <div className="absolute left-0 top-0 bottom-0 bg-[#ff2d55] rounded-full" style={{ width: `${((localSettings.ageMax - 18) / 82) * 100}%` }}></div>
                                  <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[#ff2d55] rounded-full shadow-md" style={{ left: `calc(${((localSettings.ageMax - 18) / 82) * 100}% - 12px)` }}></div>
                               </div>
                            </div>
                         </div>
                      </div>

                   </div>
                   <div className="p-5 flex items-center justify-between">
                      <span className="text-[16px] font-medium w-[80%] leading-snug pr-4">Hiển thị những người ở ngoài độ tuổi ưu tiên của tôi thêm một chút nếu tôi hết hồ sơ để xem</span>
                      <button 
                        onClick={() => updateLocalSettings({ isAgeFlexible: !localSettings.isAgeFlexible })}
                        className={`w-[44px] h-[26px] rounded-full relative shrink-0 transition-colors ${localSettings.isAgeFlexible ? 'bg-[#ff2d55]' : 'bg-white/20'}`}
                      >
                         <div className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full flex items-center justify-center shadow-sm transition-transform ${localSettings.isAgeFlexible ? 'right-0.5' : 'left-0.5'}`}>
                            {localSettings.isAgeFlexible && <Check className="w-[14px] h-[14px] text-[#ff2d55]" strokeWidth={4} />}
                         </div>
                      </button>
                   </div>
                </div>

             </div>

             {/* Sticky Save button and feedback footer */}
             <div className="px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+12px)] shrink-0 border-t border-white/10 bg-[#111] z-10 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
                {showSaveSuccess && (
                   <div className="bg-[#4caf50] text-white p-3.5 rounded-2xl font-bold text-center text-sm mb-3 shadow-[0_4px_12px_rgba(76,175,80,0.3)] flex items-center justify-center gap-2 animate-bounce">
                      <span className="text-[16px]">✓</span> Bạn đã lưu thành công!
                   </div>
                )}
                <button
                   onClick={async () => {
                      if (saveSettings) {
                         const success = await saveSettings(localSettings);
                         if (success) {
                            updateSettings(localSettings);
                            setShowSaveSuccess(true);
                            setTimeout(() => {
                               setShowSaveSuccess(false);
                               setTopActionModal(null);
                            }, 1200);
                         }
                      }
                   }}
                   disabled={isSavingPref}
                   className="w-full py-4 bg-[#ff2d55] text-white hover:bg-[#e0244b] rounded-full font-bold text-[16px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                >
                   {isSavingPref ? 'Đang lưu bộ lọc...' : 'Lưu bộ lọc & Áp dụng'}
                </button>
             </div>
          </motion.div>
        )}

        {isLocationModalOpen && (
          <motion.div 
             initial={{ opacity: 0, x: 300 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 300 }}
             transition={{ type: 'spring', damping: 25, stiffness: 200 }}
             className="absolute inset-0 bg-[#0a0a0a] z-[100] flex flex-col font-sans"
          >
             <div className="h-[72px] flex items-center px-4 shrink-0 relative mb-4">
                <button 
                   onClick={() => setIsLocationModalOpen(false)}
                   className="p-2 absolute left-2 text-[#ff2d55] active:scale-95 transition-transform"
                >
                   <ArrowLeft className="w-7 h-7" strokeWidth={2.5} />
                </button>
                <div className="w-full text-center text-white text-[19px] font-bold tracking-tight">Địa điểm</div>
             </div>
             
             <div className="flex-1 overflow-y-auto pb-8 px-4">
                <div className="text-[14px] font-bold text-white/50 mb-3 ml-1 uppercase tracking-wider">Địa Điểm Hiện Tại</div>
                <div className="bg-[#1c1c1c] rounded-2xl mb-8 flex flex-col border border-white/5">
                   <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <MapPin className="w-5 h-5 text-[#ff2d55] fill-[#ff2d55]" strokeWidth={1} stroke="#111" />
                         <span className="text-white text-[16px] font-medium">{localSettings.location}</span>
                      </div>
                      <Check className="w-6 h-6 text-[#ff2d55]" strokeWidth={3} />
                   </div>
                </div>

                <div className="text-[14px] font-bold text-white/50 mb-3 ml-1 uppercase tracking-wider">Danh Sách Địa Điểm</div>
                <div className="bg-[#1c1c1c] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                   {VIETNAM_LOCATIONS.slice(0, 15).map((loc) => {
                      const isSelected = localSettings.location === loc || localSettings.location.startsWith(loc);
                      return (
                        <button
                          key={loc}
                          onClick={() => {
                             updateLocalSettings({ location: loc });
                             setIsLocationModalOpen(false);
                          }}
                          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                          <span className={`text-[16px] ${isSelected ? 'text-[#ff2d55] font-bold' : 'text-white/90 font-medium'}`}>{loc}</span>
                          {isSelected && <Check className="w-5 h-5 text-[#ff2d55]" strokeWidth={3} />}
                        </button>
                      );
                   })}
                </div>
             </div>
          </motion.div>
        )}
       </AnimatePresence>
     </div>
   );
}

export function SwipeView() {
  const { settings, isTestFemaleView, myProfile, serverUsers, likedProfiles, savedProfiles, swipedRecords, fetchMoreUsers } = React.useContext(AppContext);
  const allProfiles = serverUsers.length > 0 ? serverUsers : MATCH_PROFILES;

  const computePool = React.useCallback((usersList: any[]) => {
     let basePool = isTestFemaleView ? [myProfile] : filterProfiles(usersList, settings, myProfile.gender);
     if (!isTestFemaleView) {
        basePool = basePool.filter(p => p.id !== myProfile.id && (!p.email || p.email !== myProfile.email));
     }
     
     // Fallback matching if filters are too strict
     if (!isTestFemaleView && basePool.length === 0) {
        basePool = usersList.filter(p => {
           let pGender = p.gender || 'Nữ';
           if (!p.gender && p.name && (p.name.includes('Hoàng Anh') || p.name.includes('Đăng') || p.name.includes('Đại') || p.name.includes('Tuấn'))) pGender = 'Nam';
           if (settings.interestedIn === 'Mọi người') return true;
           if (settings.interestedIn === 'Nam') return pGender === 'Nam';
           if (settings.interestedIn === 'Nữ') return pGender === 'Nữ';
           if (settings.interestedIn === 'LGBTQ+') return pGender === 'LGBTQ+';
           if (settings.interestedIn === 'Khác') return pGender === 'Khác';
           
           if (myProfile.gender === 'Nữ') return pGender === 'Nam';
           if (myProfile.gender === 'Nam') return pGender === 'Nữ';
           return true; 
        }).filter(p => p.id !== myProfile.id && (!p.email || p.email !== myProfile.email));
     }

     const getCommonPointsData = (p: any) => {
        let count = 0;
        let matchedLabels: string[] = [];
        const checkMatch = (key: string, label: string) => {
           const val1 = myProfile[key];
           const val2 = p[key] || (p.lifestyle && p.lifestyle[key]);

           if (val1 && val2 && val1 === val2 && val1 !== 'Khác' && val1 !== 'Chưa cập nhật' && val1 !== '' && val1 !== 'Không' && val1 !== 'Không nuôi') {
               count++;
               matchedLabels.push(label);
           }
        }
        checkMatch('pet', 'Thú cưng'); checkMatch('music', 'Âm nhạc'); checkMatch('book', 'Sách'); checkMatch('food', 'Ẩm thực'); checkMatch('travel', 'Du lịch'); checkMatch('game', 'Game'); checkMatch('sport', 'Thể thao'); checkMatch('religion', 'Tôn giáo'); checkMatch('communicationStyle', 'Giao tiếp'); checkMatch('need', 'Mục tiêu'); checkMatch('zodiac', 'Cung hoàng đạo'); checkMatch('job', 'Công việc');
        
        let text = 'Chưa có thông tin điểm chung';
        if (count > 0) {
            text = `Vì cùng chung: ${matchedLabels.slice(0, 3).join(', ')}${count > 3 ? '...' : ''}`;
        }
        return { count, text };
     };

     const scoredPool = basePool.map(p => {
        const cpd = getCommonPointsData(p);
        const noise = Math.random() * 4.0;
        return {
          ...p,
          scoredCommonPoints: cpd.count,
          commonPoints: p.commonPoints && p.commonPoints.startsWith('Hợp gu') ? p.commonPoints : cpd.text,
          _sortWeight: cpd.count + noise
        };
     });

     const likedIds = new Set((likedProfiles || []).map(p => p.id));
     const viewedIds = new Set((swipedRecords || []).map(r => r.target_user_id));

     const unlikedPool = scoredPool.filter(p => !likedIds.has(p.id));
     let finalPool = unlikedPool.filter(p => !viewedIds.has(p.id));

     if (finalPool.length === 0 && unlikedPool.length > 0) {
        finalPool = unlikedPool; // loop back, using passed profiles but still omitting liked ones!
     }

     return [...finalPool].sort((a, b) => b._sortWeight - a._sortWeight);
  }, [settings, myProfile, isTestFemaleView, likedProfiles, swipedRecords]);

  const [activePool, setActivePool] = useState<any[]>(() => computePool(allProfiles));
  
  const currentPrefRefString = `${allProfiles.length}-${settings.distance}-${settings.ageMin}-${settings.ageMax}-${settings.interestedIn}-${settings.location}-${settings.activePriorities?.join(',') || ''}-${settings.isAgeFlexible}-${settings.isDistanceFlexible}-${isTestFemaleView}`;
  const lastPrefRefKey = useRef<string>(currentPrefRefString);

  useEffect(() => {
    const prefRefKey = `${allProfiles.length}-${settings.distance}-${settings.ageMin}-${settings.ageMax}-${settings.interestedIn}-${settings.location}-${settings.activePriorities?.join(',') || ''}-${settings.isAgeFlexible}-${settings.isDistanceFlexible}-${isTestFemaleView}`;
    const prefChanged = lastPrefRefKey.current !== prefRefKey;
    
    if (prefChanged || activePool.length === 0) {
       lastPrefRefKey.current = prefRefKey;
       setActivePool(computePool(allProfiles));
    }
  }, [allProfiles, settings, myProfile, isTestFemaleView, likedProfiles, swipedRecords, activePool.length, computePool]);

  return (
    <ProfileSwiper 
       key={activePool.map(p => p.id).join(',')} 
       profiles={activePool} 
       title="Dành cho bạn" 
       onReachEnd={() => {
          sessionStorage.removeItem('swipe_id_Dành cho bạn');
          setActivePool([]); // Triggers full scan & loop logic inside our layout wrapper
          if (fetchMoreUsers) fetchMoreUsers();
       }} 
    />
  );
}

// Explore View
export function ExploreView() {
  const { settings, serverUsers, myProfile, likedProfiles, savedProfiles } = React.useContext(AppContext);
  const [selectedMainCategory, setSelectedMainCategory] = useState<any>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<any>(null);

  const allProfiles = serverUsers.length > 0 ? serverUsers : MATCH_PROFILES;
  let filteredExploreProfiles = filterProfiles(allProfiles, settings, myProfile.gender, true).filter(p => {
     if (p.id === myProfile.id || (p.email && p.email === myProfile.email)) return false;
     const isLikedOrSaved = (likedProfiles || []).some(lp => lp && lp.id === p.id) || (savedProfiles || []).some(sp => sp && sp.id === p.id);
     return !isLikedOrSaved;
  });

  if (filteredExploreProfiles.length === 0) {
      filteredExploreProfiles = allProfiles.filter(p => {
         let pGender = p.gender || 'Nữ';
         if (!p.gender && (p.name.includes('Hoàng Anh') || p.name.includes('Đăng') || p.name.includes('Đại') || p.name.includes('Tuấn'))) pGender = 'Nam';
         if (settings.interestedIn === 'Mọi người') return true;
         if (settings.interestedIn === 'Nam') return pGender === 'Nam';
         if (settings.interestedIn === 'Nữ') return pGender === 'Nữ';
         if (settings.interestedIn === 'LGBTQ+') return pGender === 'LGBTQ+';
         if (settings.interestedIn === 'Khác') return pGender === 'Khác';
         
         if (myProfile.gender === 'Nữ') return pGender === 'Nam';
         if (myProfile.gender === 'Nam') return pGender === 'Nữ';
         return true;
      }).filter(p => {
         if (p.id === myProfile.id || (p.email && p.email === myProfile.email)) return false;
         const isLikedOrSaved = (likedProfiles || []).some(lp => lp && lp.id === p.id) || (savedProfiles || []).some(sp => sp && sp.id === p.id);
         return !isLikedOrSaved;
      });
  }

  const checkNeed = (needVal: any, allowedValues: string[]) => {
     if (!needVal) return false;
     const val = String(needVal).toLowerCase().trim();
     return allowedValues.some(a => {
        const cleanA = a.toLowerCase().trim();
        return val.includes(cleanA) || cleanA.includes(val);
     });
  };

  const categories = [
    { 
       id: 'muc_dich',
       title: 'Hẹn hò chung mục đích', 
       img: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&q=80&w=800',
       subCategories: [
         { id: 'tim_nguoi_yeu', title: 'Tìm người yêu', icon: '❤️', profiles: filteredExploreProfiles.filter((p: any) => checkNeed(p.need, ['Tìm người yêu', 'Tìm bạn đời', 'Hẹn hò vui vẻ', 'Yêu', 'Hẹn hò', 'Lover'])) },
         { id: 'tim_ban', title: 'Tìm bạn bè mới', icon: '👋', profiles: filteredExploreProfiles.filter((p: any) => checkNeed(p.need, ['Tìm bạn bè mới', 'Kết bạn mới', 'Khám phá thế giới', 'Tìm bạn', 'Kết bạn', 'Bè mới', 'Friend'])) },
         { id: 'chat_cho_vui', title: 'Trò chuyện vui vẻ', icon: '🍸', profiles: filteredExploreProfiles.filter((p: any) => checkNeed(p.need, ['Chat cho vui', 'Giết thời gian', 'Muốn trò chuyện', 'Lời nói khích lệ', 'Không xác định', 'Trò chuyện', 'Giao lưu', 'Vui vẻ', 'Chat'])) }
       ]
    },
    { 
       id: 'phong_cach',
       title: 'Đồng điệu tính cách', 
       img: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800',
       subCategories: [
         { id: 'thu_cung', title: 'Yêu thú cưng', icon: '🐶', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.pet || p.lifestyle?.pet; return v && v !== 'Không nuôi' && v !== 'Dị ứng với động vật' }) },
         { id: 'nghe_nhac', title: 'Đam mê âm nhạc', icon: '🎧', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.music || p.lifestyle?.music; return v && v !== 'Khác' }) },
         { id: 'du_lich', title: 'Thích xê dịch', icon: '✈️', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.travel || p.lifestyle?.travel; return v && v !== 'Khác' }) }
       ]
    },
    { 
       id: 'so_thich',
       title: 'Sở thích chung', 
       img: 'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?auto=format&fit=crop&q=80&w=800',
       subCategories: [
         { id: 'the_thao', title: 'Yêu thể thao', icon: '⚽', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.sport || p.lifestyle?.sport; return v && v !== 'Khác' && v !== 'Lười vận động' }) },
         { id: 'am_thuc', title: 'Đam mê ẩm thực', icon: '🍜', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.food || p.lifestyle?.food; return v && v !== 'Khác' }) },
         { id: 'game', title: 'Mê Game', icon: '🎮', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.game || p.lifestyle?.game; return v && v !== 'Không chơi' && v !== 'Khác' }) },
         { id: 'sach', title: 'Mọt sách', icon: '📚', profiles: filteredExploreProfiles.filter((p: any) => { const v = p.book || p.lifestyle?.book; return v && v !== 'Khác' }) },
       ]
    },
  ];

  if (selectedSubCategory) {
     return (
       <div className="absolute inset-0 z-50 bg-[#ff9ca0]">
         <ProfileSwiper profiles={selectedSubCategory.profiles} title={selectedSubCategory.title} onClose={() => setSelectedSubCategory(null)} />
       </div>
     );
  }

  if (selectedMainCategory) {
     return (
       <div className="bg-[#ff9ca0] h-full w-full flex flex-col pt-8 overflow-hidden absolute inset-0 z-50">
          <div className="flex items-center px-4 pb-4 mb-4 border-b border-black/10 shrink-0">
             <button onClick={() => setSelectedMainCategory(null)} className="p-1.5 active:scale-90 transition-transform -ml-2 mr-2">
                <ArrowLeft className="w-7 h-7 text-black" />
             </button>
             <h1 className="text-[24px] font-bold text-black truncate">{selectedMainCategory.title}</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-[100px]">
              <div className="grid grid-cols-2 gap-4">
                 {selectedMainCategory.subCategories.map((sub: any, idx: number) => (
                    <motion.div 
                       key={sub.id}
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: idx * 0.05 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={() => setSelectedSubCategory(sub)}
                       className="bg-[#fff0f1] rounded-[24px] aspect-square flex flex-col items-center justify-center p-4 border border-black/5 shadow-sm cursor-pointer"
                    >
                       <span className="text-[48px] mb-3">{sub.icon}</span>
                        <span className="font-bold text-[15px] text-center text-black px-2">{sub.title}</span>
                        <span className="text-[12px] font-medium text-gray-400 mt-1">{sub.profiles.length > 0 ? (sub.profiles.length + ' người phù hợp') : 'Chưa có ai'}</span>
                     </motion.div>
                 ))}
              </div>
          </div>
       </div>
     );
  }

  return (
    <div className="bg-[#ff9ca0] h-full flex flex-col p-4 pt-8 overflow-hidden">
       <h1 className="text-[28px] font-bold mb-6 ml-1 mt-4 shrink-0">Khám phá</h1>
       
       <div className="space-y-6 overflow-y-auto pb-24 pr-2 -mr-2">
         {categories.map((item, index) => (
           <motion.div 
             key={index}
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: index * 0.1 }}
             whileTap={{ scale: 0.96 }}
             onClick={() => setSelectedMainCategory(item)}
             className="cursor-pointer group"
           >
             <p className="font-medium text-black ml-1 mb-2 group-hover:text-black/80 transition-colors">{item.title}</p>
             <div className="relative h-[160px] rounded-[18px] overflow-hidden shadow-sm">
               <img src={item.img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </div>
           </motion.div>
         ))}
       </div>
    </div>
  );
}

// Likes View
export function LikesView() {
  const { likedProfiles, savedProfiles, toggleLike, onNavigate, setActiveChatUser } = React.useContext(AppContext);
  const [activeTab, setActiveTab] = useState<'liked'|'received'|'saved'>('received');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);

  useEffect(() => {
     let active = true;
     const fetchMatches = async () => {
        const userId = sessionStorage.getItem('user_id');
        if (userId) {
           try {
              const res = await fetch(`/api/likes/${userId}`);
              const data = await res.json();
              if (data.success && data.data && active) {
                  const mapped = data.data.map((m: any) => {
                      let profileData = m.profile_data || {};
                      if (typeof profileData === 'string') {
                          try { profileData = JSON.parse(profileData); } catch(e){}
                      }
                      return {
                         id: m.user_id,
                         matchId: m.match_id,
                         name: profileData.name || 'Người dùng',
                         time: 'Vừa xong',
                         count: profileData.location || 'Gần bạn',
                         img: (() => {
                            const hasCustom = profileData.images && profileData.images.length > 0 && !profileData.images[0].includes('photo-1549880338-65ddcdfd017b');
                            return hasCustom ? profileData.images[0] : getUniqueUnsplashPortraits(profileData.gender || 'Nữ', m.user_id)[0];
                         })()
                      };
                  });
                  setReceivedLikes(mapped);
              }
           } catch(e) {}
        }
     };
     fetchMatches();
     return () => { active = false; };
  }, []);

  // Map contextual profiles to the list format
  const mappedLiked = (likedProfiles || [])
    .filter(p => p && p.id)
    .map(p => ({
      id: p.id,
      name: p.name || 'Người dùng mới',
      time: 'Vừa xong',
      count: p.distance || 'Gần bạn',
      img: p.images && p.images.length > 0 ? p.images[0] : (p.img || 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&q=80&w=800')
    }));

  const mappedSaved = (savedProfiles || [])
    .filter(p => p && p.id)
    .map(p => ({
      id: p.id,
      name: p.name || 'Người dùng mới',
      time: 'Vừa xong',
      count: p.distance || 'Gần bạn',
      img: p.images && p.images.length > 0 ? p.images[0] : (p.img || 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&q=80&w=800')
    }));

  const displayList = activeTab === 'liked' ? mappedLiked : activeTab === 'saved' ? mappedSaved : receivedLikes;

  const handleProfileClick = (like: any) => {
    setSelectedProfile(like);
  };

  const closeMatch = () => {
    setShowMatch(false);
    setSelectedProfile(null);
  };

  const handleStartChat = () => {
    if (selectedProfile && setActiveChatUser && onNavigate) {
      setActiveChatUser({ id: selectedProfile.id, matchId: selectedProfile.matchId, name: selectedProfile.name, img: selectedProfile.img });
      onNavigate('app_chat');
    }
  };

  return (
    <div className="bg-[#ff9ca0] min-h-full flex flex-col relative overflow-hidden">
      <h1 className="text-[28px] font-bold p-6 pt-10 pb-4 shrink-0">Hoạt động</h1>
      
      <div className="flex px-4 border-b border-black/10 shrink-0 gap-2">
        <button 
          onClick={() => setActiveTab('received')}
          className="flex-1 pb-3 text-[16px] text-center relative outline-none"
        >
          <span className={`${activeTab === 'received' ? 'font-bold text-black' : 'text-black/60'} transition-colors relative z-10`}>Lượt thích</span>
          {activeTab === 'received' && (
             <motion.div layoutId="likesTabOutline" className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-black z-0" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('liked')}
          className="flex-1 pb-3 text-[16px] text-center relative outline-none"
        >
          <span className={`${activeTab === 'liked' ? 'font-bold text-black' : 'text-black/60'} transition-colors relative z-10`}>Đã thích</span>
          {activeTab === 'liked' && (
             <motion.div layoutId="likesTabOutline" className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-black z-0" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className="flex-1 pb-3 text-[16px] text-center relative outline-none"
        >
          <span className={`${activeTab === 'saved' ? 'font-bold text-black' : 'text-black/60'} transition-colors relative z-10`}>Đã lưu</span>
          {activeTab === 'saved' && (
             <motion.div layoutId="likesTabOutline" className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-black z-0" />
          )}
        </button>
      </div>

      <div className="flex-1 relative pb-24 overflow-y-auto w-full">
         <AnimatePresence mode="wait">
            <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: activeTab === 'liked' ? -20 : 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: activeTab === 'liked' ? 20 : -20 }}
               transition={{ duration: 0.15 }}
               className="p-4 space-y-3 max-w-sm mx-auto w-full absolute inset-0"
            >
               {displayList.map((like, i) => (
                 <motion.div 
                   key={i} 
                   onClick={() => handleProfileClick(like)}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className={`bg-white rounded-[16px] p-3 mx-1 flex items-center justify-between shadow-sm active:scale-95 transition-transform group border border-white hover:border-black/5 ${activeTab === 'received' ? 'cursor-pointer' : ''}`}
                 >
                   <div className="flex items-center gap-4">
                     <img src={like.img} className="w-[52px] h-[52px] rounded-full object-cover group-hover:scale-105 transition-transform" />
                     <div>
                       <p className="font-bold text-[16px] text-black">{like.name}</p>
                       <p className="text-[13px] text-gray-500 font-medium leading-tight">{like.time}</p>
                       {activeTab === 'received' ? 
                         <p className="text-[13px] text-black font-medium mt-1">Đã thích bạn</p> :
                         <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                           {activeTab === 'saved' ? <Bookmark className="w-[14px] h-[14px] stroke-[2.5] text-yellow-500" /> : <Heart className="w-[14px] h-[14px] stroke-[2.5] text-[#ff2d55]" />}
                           <span className={`text-[13px] font-bold ${activeTab === 'saved' ? 'text-yellow-600' : 'text-[#ff2d55]'}`}>{like.count}</span>
                         </div>
                       }
                     </div>
                   </div>
                   {activeTab === 'received' && (
                      <div className="w-10 h-10 rounded-full bg-[#ff9ca0]/30 flex justify-center items-center mr-2">
                         <Heart className="w-5 h-5 text-[#ff2d55] fill-[#ff2d55]" />
                      </div>
                   )}
                 </motion.div>
               ))}
               {displayList.length === 0 && (
                 <div className="text-center text-black/60 font-medium mt-10">
                   {activeTab === 'saved' ? 'Chưa có hồ sơ nào được lưu.' : activeTab === 'liked' ? 'Bạn chưa thích ai.' : 'Chưa có lượt thích nào.'}
                 </div>
               )}
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Received Profile Viewer Overlay */}
      <AnimatePresence>
        {selectedProfile && !showMatch && (
           <motion.div
             initial={{ opacity: 0, y: 200 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 200 }}
             className="absolute inset-0 z-[100] bg-[#fff0f1] flex flex-col px-5 pt-12 pb-24 overflow-hidden"
           >
              <div className="w-full flex-1 relative bg-black rounded-[24px] shadow-xl overflow-hidden border border-black/5 flex flex-col mb-4 max-h-[80vh]">
                <img src={selectedProfile.img} alt="Profile" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 pt-24 pb-6 px-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none flex flex-col justify-end">
                   <h2 className="text-[32px] font-bold mb-0.5 tracking-tight text-white">{selectedProfile.name}</h2>
                   <div className="mt-3 bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-sm text-[14px] text-white">
                      <span className="font-bold text-[#ff9ca0]">
                         {activeTab === 'received' ? `Người này đã thích bạn ${selectedProfile.time}` : 
                          activeTab === 'liked' ? `Bạn đã thích người này ${selectedProfile.time}` : 
                          `Bạn đã lưu hồ sơ người này ${selectedProfile.time}`}
                      </span>
                   </div>
                </div>
              </div>
              <div className="flex justify-center items-center gap-6 z-50 shrink-0 h-[80px]">
                 <button onClick={() => setSelectedProfile(null)} className="w-[64px] h-[64px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-lg border border-black/5 active:scale-95 transition-transform">
                   <X className="w-8 h-8 text-[#ff2d55] stroke-[2.5]" />
                 </button>
                 {activeTab === 'liked' && (
                    <button onClick={() => {
                        const p = { id: selectedProfile.id, name: selectedProfile.name, images: [selectedProfile.img], location: selectedProfile.count };
                        toggleLike(p);
                        setSelectedProfile(null);
                    }} className="w-[72px] h-[72px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-lg border border-black/5 active:scale-95 transition-transform flex-col gap-1">
                      <Heart className="w-5 h-5 flex-shrink-0 text-gray-400 fill-gray-400 stroke-[2]" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Bỏ thích</span>
                    </button>
                 )}
                 {activeTab !== 'liked' && (
                    <button onClick={() => {
                        // Nếu ở tab "Lượt thích" (received) thì hành động này là "Chấp nhận" => tạo match_id để mở chat
                        const myId = sessionStorage.getItem('user_id');
                        if (activeTab === 'received' && myId) {
                            fetch('/api/matches/swipe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: parseInt(myId), target_user_id: selectedProfile.id, action: 'LIKE' })
                            })
                              .then(r => r.json())
                              .then(data => {
                                  if (data?.success && data?.match_id) {
                                      setSelectedProfile((prev: any) => ({ ...prev, matchId: data.match_id }));
                                      setShowMatch(true);
                                      setReceivedLikes(prev => prev.filter(r => r.id !== selectedProfile.id));
                                      const p = { id: selectedProfile.id, name: selectedProfile.name, images: [selectedProfile.img], location: selectedProfile.count, match_id: data.match_id };
                                      toggleLike(p, true);
                                  } else {
                                      // fallback: vẫn lưu like local để không mất trạng thái
                                      const p = { id: selectedProfile.id, name: selectedProfile.name, images: [selectedProfile.img], location: selectedProfile.count };
                                      toggleLike(p);
                                      setSelectedProfile(null);
                                  }
                              })
                              .catch(() => {
                                  const p = { id: selectedProfile.id, name: selectedProfile.name, images: [selectedProfile.img], location: selectedProfile.count };
                                  toggleLike(p);
                                  setSelectedProfile(null);
                              });
                        } else {
                            const p = { id: selectedProfile.id, name: selectedProfile.name, images: [selectedProfile.img], location: selectedProfile.count };
                            toggleLike(p);
                            setSelectedProfile(null);
                        }
                    }} className="w-[72px] h-[72px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-lg border border-black/5 active:scale-95 transition-transform">
                      <Heart className="w-8 h-8 flex-shrink-0 text-[#2dd881] fill-[#2dd881] stroke-[2]" />
                    </button>
                 )}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Match Overlay */}
      <AnimatePresence>
        {showMatch && selectedProfile && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-[#ff9ca0] flex flex-col items-center justify-center p-6 text-black"
          >
            <h2 className="text-[40px] font-bold mb-10 italic tracking-tighter text-[#ff2d55] drop-shadow-sm">It's a Match!</h2>
            <div className="flex gap-4 mb-16 relative">
              <div className="w-[130px] h-[130px] rounded-full overflow-hidden border-4 border-white shadow-xl relative bg-[#dfd6ff] flex justify-center items-center -mr-6 z-10">
                <User className="w-[64px] h-[64px] text-[#6b58dc]" strokeWidth={1.5} />
              </div>
              <div className="w-[130px] h-[130px] rounded-full overflow-hidden border-4 border-white shadow-xl z-20">
                <img src={selectedProfile.img} alt="Match profile" className="w-full h-full object-cover" />
              </div>
            </div>
            <p className="text-center text-[18px] font-medium mb-12 text-black/80">Bạn và <span className="font-bold text-black border-b border-black">{selectedProfile.name}</span> đã thích nhau!</p>
            
            <button 
              onClick={handleStartChat}
              className="w-full py-4 text-[17px] font-bold text-white bg-[#ff2d55] rounded-2xl active:scale-95 transition-transform shadow-md mb-4"
            >
              Nhắn tin ngay
            </button>
            <button 
              onClick={closeMatch}
              className="w-full py-4 text-[17px] font-bold text-black border-[1.5px] border-black bg-transparent rounded-2xl active:scale-95 transition-transform"
            >
              Tiếp tục xem
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Chat View
export function ChatView() {
  const { activeChatUser, setActiveChatUser, likedProfiles, serverUsers } = React.useContext(AppContext);
  const [activeChat, setActiveChat] = useState<{id?: number, matchId?: number, name: string, img: string} | null>(activeChatUser || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showInfoProfile, setShowInfoProfile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const partnerProfile = React.useMemo(() => {
     if (!activeChat) return null;
     const inServer = serverUsers.find((u:any) => u.id === activeChat.id || u.id === (activeChat as any).userId);
     if (inServer) return inServer;
     const inLiked = likedProfiles.find((u:any) => u.id === activeChat.id || u.id === (activeChat as any).userId);
     if (inLiked) return inLiked;
     return { id: activeChat.id || 9999, ...activeChat, name: activeChat.name, images: (activeChat as any).images || [activeChat.img], bio: activeChat.name === 'Darling' ? 'Chuyên gia tư vấn hẹn hò AI' : ((activeChat as any).bio || 'Người dùng Darling'), location: (activeChat as any).location || 'Hà Nội' };
  }, [activeChat, serverUsers, likedProfiles]);
  
  // Custom states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatTheme, setChatTheme] = useState('#ff2d55');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showMedia, setShowMedia] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Modals & Alerts
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<{title: string, text: string} | null>(null);

  const emojis = ['😀','😂','🥰','😍','😎','😢','😡','👍','❤️','🔥','✨','🎉','🤔','😅','🙌','👏'];
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playBlingSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const popAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const canChat = activeChat?.name === 'Darling' || !!activeChat?.matchId;

  useEffect(() => {
    let interval: any;
    if (activeChat) {
      const fetchMessages = () => {
         if (activeChat.matchId && activeChat.name !== 'Darling') {
           const myId = sessionStorage.getItem('user_id');
           fetch(`/api/messages/${activeChat.matchId}?user_id=${myId}`)
             .then(res => res.json())
             .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    const newMessages = data.data.map((m: any) => ({
                       id: m.id,
                       sender: m.sender_id === parseInt(sessionStorage.getItem('user_id') || '0') ? 'me' : 'them',
                       text: m.text ?? m.content,
                       isImage: !!((m.is_image) || ((m.text ?? m.content)?.startsWith('data:image/')) || (((m.text ?? m.content)?.startsWith('http')) && ((m.text ?? m.content)?.match(/\.(jpg|jpeg|png|gif|webp)/i)))),
                       isAudio: !!((m.text ?? m.content)?.startsWith('data:audio/')),
                       time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }));
                    
                    setMessages(prev => {
                       if (prev.length > 0 && newMessages.length > prev.length) {
                          const lastMsg = newMessages[newMessages.length - 1];
                          if (lastMsg.sender === 'them') {
                             try {
                               const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                               const osc = ctx.createOscillator();
                               const gainNode = ctx.createGain();
                               osc.type = 'sine';
                               osc.frequency.setValueAtTime(880, ctx.currentTime);
                               osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
                               gainNode.gain.setValueAtTime(0, ctx.currentTime);
                               gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
                               gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                               osc.connect(gainNode);
                               gainNode.connect(ctx.destination);
                               osc.start();
                               osc.stop(ctx.currentTime + 0.3);
                             } catch(e) {}
                          }
                       }
                       return newMessages;
                    });
                }
             })
             .catch(() => {});
         }
      };

      try {
        const storedTheme = localStorage.getItem('ais_theme_' + activeChat.name);
        if (storedTheme) setChatTheme(storedTheme);
        
        fetchMessages();
        interval = setInterval(fetchMessages, 2500);
        
        if (!activeChat.matchId || activeChat.name === 'Darling') {
            const stored = localStorage.getItem('ais_chat_' + activeChat.name);
            if (stored) setMessages(JSON.parse(stored));
            else setMessages([]);
        }
      } catch(e) {}
    } else {
        setMessages([]);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [activeChat]);

  useEffect(() => {
    if (activeChat && messages.length > 0) {
      localStorage.setItem('ais_chat_' + activeChat.name, JSON.stringify(messages));
    }
  }, [messages, activeChat]);

  useEffect(() => {
    if (activeChat) {
      setInputText('');
    }
  }, [activeChat]);

  const closeChat = () => {
    setActiveChat(null);
    if (setActiveChatUser) setActiveChatUser(null);
  }

  useEffect(() => {
     try {
       endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
     } catch(e) {}
  }, [messages, showEmojiPicker, isRecording, isTyping]);

  const callAI = async (text: string, currentHistory: any[]) => {
      try {
          setIsTyping(true);
          const historyToSend = currentHistory.map(m => ({
              role: m.sender === 'me' ? 'user' : 'model',
              parts: [{ text: m.isImage ? '[Người dùng gửi Hình ảnh]' : (m.isAudio ? '[Người dùng gửi Âm thanh]' : m.text) }]
          }));
          
          historyToSend.push({ role: 'user', parts: [{ text }] });
          
          const res = await fetch('/api/chat/darling', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: historyToSend })
          });
          const data = await res.json();
          setIsTyping(false);
          if (data.success && data.text) {
              if (notificationsEnabled) {
                  playBlingSound();
                  setNotification({ title: 'Darling', text: data.text });
                  setTimeout(() => setNotification(null), 3000);
              }
              setMessages(prev => [...prev, {
                  id: Date.now() + 1,
                  text: data.text,
                  sender: "them",
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
          }
      } catch (err) {
          setIsTyping(false);
          console.error(err);
      }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const textToSend = inputText;
    const newMessage = {
      id: Date.now(),
      text: textToSend,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowEmojiPicker(false);
    
    if (activeChat?.matchId) {
       const myId = sessionStorage.getItem('user_id');
       if (myId) {
          fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ match_id: activeChat.matchId, sender_id: parseInt(myId), text: textToSend })
          }).catch(()=>{});
       }
    }
    
    if (activeChat?.name === 'Darling') {
        callAI(textToSend, messages);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
           if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
           const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
           // Read as base64 to store in localStorage
           const reader = new FileReader();
           reader.onloadend = () => {
              const base64Audio = reader.result as string;
              setMessages(prev => [...prev, {
                  id: Date.now(),
                  text: base64Audio,
                  sender: "me",
                  isAudio: true,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
              
              if (activeChat?.matchId) {
                 const myId = sessionStorage.getItem('user_id');
                 if (myId) {
                    fetch('/api/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ match_id: activeChat.matchId, sender_id: parseInt(myId), text: base64Audio })
                    }).catch(()=>{});
                 }
              }
              
              if (activeChat?.name === 'Darling') {
                  callAI("[Tin nhắn thoại]", messages);
              }
           };
           reader.readAsDataURL(audioBlob);

           stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (e: any) {
        if (e.name === 'NotAllowedError' || e?.message?.includes('Permission denied')) {
            popAlert('Cần quyền truy cập Micro để thu âm. Hãy cấp quyền trên trình duyệt.');
        } else {
            popAlert('Lỗi truy cập Micro: ' + e?.message);
        }
        setIsRecording(false);
    }
  };

  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchMatches = async () => {
       let backendMatches: any[] = [];
       const userId = sessionStorage.getItem('user_id');
       if (userId) {
          try {
             const res = await fetch(`/api/matches/${userId}`);
             const data = await res.json();
             if (data.success && data.data) {
                 backendMatches = data.data.map((m: any) => {
                     let profileData = m.profile_data || {};
                     if (typeof profileData === 'string') {
                         try { profileData = JSON.parse(profileData); } catch(e){}
                     }
                     return {
                        id: m.user_id,
                        matchId: m.match_id,
                        userId: m.user_id,
                        ...profileData,
                        name: profileData.name || 'Người dùng',
                        images: (() => {
                           const hasCustom = profileData.images && profileData.images.length > 0 && !profileData.images[0].includes('photo-1549880338-65ddcdfd017b');
                           return hasCustom ? profileData.images : getUniqueUnsplashPortraits(profileData.gender || 'Nữ', m.user_id);
                        })(),
                     };
                 });
             }
          } catch(e) {}
       }
       
       if (!active) return;

       let matchedChats = [...backendMatches];
       
       // (Removed likedProfiles deduplication to prevent showing un-mutually matched profiles in chat)
       
       try {
          for (let i = 0; i < localStorage.length; i++) {
             const key = localStorage.key(i);
             if (key && key.startsWith('ais_chat_')) {
                const chatName = key.replace('ais_chat_', '');
                if (!matchedChats.find((c: any) => c.name === chatName)) {
                    const historyRaw = localStorage.getItem(key);
                    if (historyRaw && JSON.parse(historyRaw).length > 0) {
                       matchedChats.unshift({ name: chatName, images: [`https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=ff9ca0&color=fff`] });
                    }
                }
             }
          }
       } catch(e) {}
       
       if (activeChatUser && !matchedChats.find((c: any) => c.name === activeChatUser.name)) {
           matchedChats.unshift({ id: activeChatUser.id, userId: activeChatUser.userId, matchId: activeChatUser.matchId, name: activeChatUser.name, images: [activeChatUser.img] });
       }
       
       try {
          if (localStorage.getItem('ais_blocked_Darling')) {
              // Blocked
          } else if (!matchedChats.find((c: any) => c.name === 'Darling')) {
              matchedChats.unshift({ name: 'Darling', images: ['https://ui-avatars.com/api/?name=Darling&background=ff2d55&color=fff&rounded=true&bold=true'] });
          }
       } catch(e) {}

       const mappedChats = matchedChats.map((c: any, i: number) => {
          let lastMsg = 'Bắt đầu trò chuyện...';
          let lastTimestamp = 0;
          try {
             const historyRaw = localStorage.getItem('ais_chat_' + c.name);
             if (historyRaw) {
                const parsed = JSON.parse(historyRaw);
                if (parsed.length > 0) {
                    const last = parsed[parsed.length - 1];
                    lastMsg = last.isImage ? '[Hình ảnh]' : (last.isAudio ? '[Âm thanh]' : last.text);
                    lastTimestamp = last.id || 0;
                }
             }
          } catch(e) {}
          
          return {
            id: c.id,
            userId: c.userId,
            matchId: c.matchId,
            ...c,
            name: c.name, 
            img: c.images?.[0] || c.img || `https://i.pravatar.cc/150?img=${i+4}`, 
            isUnread: false,
            lastMsg,
            message: lastMsg,
            lastTime: lastTimestamp
          };
       });
       
       mappedChats.sort((a: any, b: any) => b.lastTime - a.lastTime);
       setChats(mappedChats);
    };
    
    fetchMatches();
    return () => { active = false; };
  }, [likedProfiles, activeChatUser, messages, activeChat]);

  const toggleTheme = () => {
     const themes = ['#ff2d55', '#0084ff', '#8f47ff', '#ff9ca0', '#00cba9'];
     const nextTheme = themes[(themes.indexOf(chatTheme) + 1) % themes.length];
     setChatTheme(nextTheme);
     if (activeChat) localStorage.setItem('ais_theme_' + activeChat.name, nextTheme);
  };
  
  const handleBlock = () => {
     setConfirmModal({
        title: `Chặn ${activeChat?.name}`,
        message: `Bạn có chắc chắn muốn chặn người dùng này không? Bạn sẽ không thể thấy hồ sơ hay nhận tin nhắn từ họ nữa.`,
        onConfirm: () => {
            if (activeChat) {
                localStorage.removeItem('ais_chat_' + activeChat.name);
                if (activeChat.name === 'Darling') {
                    localStorage.setItem('ais_blocked_Darling', 'true');
                }
            }
            popAlert('Đã chặn người dùng này.');
            closeChat();
            setShowInfo(false);
            // Trigger re-render of chats by toggling a dummy state if needed, or window reload
            window.location.reload();
        }
     });
  };

  const handleReport = () => {
     setConfirmModal({
        title: `Báo cáo tài khoản`,
        message: `Bạn muốn báo cáo tài khoản này vì vi phạm tiêu chuẩn cộng đồng?`,
        onConfirm: () => {
            popAlert('Cảm ơn. Chúng tôi sẽ xem xét báo cáo của bạn!');
        }
     });
  };

  const handleDeleteChat = () => {
     setConfirmModal({
        title: `Xóa đoạn chat`,
        message: `Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này? Không thể hoàn tác.`,
        onConfirm: () => {
            if (activeChat) localStorage.removeItem('ais_chat_' + activeChat.name);
            setMessages([]);
            setShowInfo(false);
            closeChat();
        }
     });
  };

  const chatImages = messages.filter(m => m.isImage).map(m => m.text);

  return (
    <div className="bg-[#ff9ca0] h-full flex flex-col p-6 pt-10 relative overflow-hidden">
      
      {/* GLOBAL ALERTS & NOTIFICATIONS */}
      <AnimatePresence>
        {alertMsg && (
            <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="absolute top-12 left-4 right-4 bg-gray-900 text-white rounded-xl p-4 z-[999] shadow-lg flex items-center justify-between">
                <span className="text-[14px] font-medium">{alertMsg}</span>
                <button onClick={() => setAlertMsg(null)}><X className="w-5 h-5 opacity-70"/></button>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
            <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="absolute top-12 left-4 right-4 bg-white text-black rounded-2xl p-4 z-[999] shadow-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-[#ff2d55] rounded-full flex items-center justify-center text-white"><MessageSquare className="w-5 h-5"/></div>
                <div className="flex flex-col">
                   <span className="text-[15px] font-bold">{notification.title}</span>
                   <span className="text-[14px] text-gray-600 line-clamp-1">{notification.text}</span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute inset-0 bg-black/50 z-[999] flex items-center justify-center p-6">
                <motion.div initial={{scale: 0.9}} animate={{scale: 1}} className="bg-white rounded-2xl w-full max-w-[320px] overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-6 flex flex-col items-center text-center">
                        <span className="text-[18px] font-bold text-black mb-2">{confirmModal.title}</span>
                        <span className="text-[15px] text-gray-500 leading-relaxed text-center">{confirmModal.message}</span>
                    </div>
                    <div className="flex border-t border-gray-200">
                        <button className="flex-1 py-4 text-[16px] font-medium text-gray-500 border-r border-gray-200 active:bg-gray-50" onClick={() => setConfirmModal(null)}>Hủy</button>
                        <button className="flex-1 py-4 text-[16px] font-bold text-[#ff2d55] active:bg-gray-50" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Đồng ý</button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeChat && (
          <motion.div 
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="bg-white absolute inset-0 z-[100] flex flex-col"
          >
             <div className="bg-[#ff9ca0] h-[90px] pt-[40px] px-4 flex items-center gap-3 shrink-0 shadow-sm z-10 sticky top-0 border-b border-black/10">
                <button onClick={closeChat} className="p-1 -ml-2 active:scale-90 transition">
                   <ArrowLeft className="w-7 h-7 text-black stroke-[2]" />
                </button>
                <div className="relative">
                   <img src={activeChat.img} className="w-[42px] h-[42px] rounded-full object-cover border border-black/10" />
                   <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#ff9ca0] rounded-full"></div>
                </div>
                <div className="flex-1 flex flex-col cursor-pointer" onClick={() => setShowInfo(true)}>
                   <span className="font-bold text-[17px] leading-tight text-black">{activeChat.name}</span>
                   <span className="text-[12px] font-medium text-black/70">Đang hoạt động</span>
                </div>
                <button onClick={() => setShowInfo(true)} className="p-2 active:scale-90 transition rounded-full hover:bg-black/5 mr-1">
                   <Info className="w-6 h-6 text-black stroke-[2]" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fff0f1] pb-32">
                <div className="text-center text-[12px] text-gray-500 my-4 font-medium">Hôm nay</div>
                {messages.map((msg, i) => {
                   const isMe = msg.sender === 'me';
                   return (
                     <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'} mb-[2px]`}>
                       <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                         {!isMe && (
                           <img src={activeChat.img} className="w-[28px] h-[28px] rounded-full object-cover mb-1 shadow-sm border border-black/5 shrink-0" />
                         )}
                         <div className="flex flex-col gap-1 max-w-[75%]">
                            <div style={{ backgroundColor: isMe && !msg.isAudio && !msg.isImage ? chatTheme : (msg.isAudio || msg.isImage ? 'transparent' : '#ffffff') }} className={`px-4 py-2.5 shadow-sm text-[15px] ${isMe ? 'text-white rounded-l-2xl rounded-tr-2xl rounded-br-sm font-medium' : 'bg-white border border-black/5 text-black rounded-r-2xl rounded-tl-2xl rounded-bl-sm'} ${msg.isImage || msg.isAudio ? 'p-0 shadow-none border-none' : ''}`}>
                              {msg.isImage ? (
                                <img src={msg.text} className="w-full rounded-xl object-cover max-h-[250px] shadow-sm border border-black/5" alt="Chat image" />
                              ) : msg.isAudio ? (
                                <audio controls src={msg.text} className="h-10 max-w-full rounded-full shadow-sm bg-white border border-gray-200" />
                              ) : (
                                msg.text
                             )}
                            </div>
                         </div>
                       </div>
                       {isMe && i === messages.length - 1 && (
                          <div className="text-[11px] text-gray-400 font-medium mr-[2px] flex items-center gap-1 mt-1 mb-2 tracking-wide">
                             {activeChat?.name === 'Darling' ? 'Đã gửi' : (msg.id > 1000000000000 ? 'Đang gửi...' : 'Đã gửi')}
                          </div>
                       )}
                       {!isMe && i === messages.length - 1 && (
                          <div className="text-[11px] text-gray-400 font-medium ml-[38px] flex items-center gap-1 mt-1 mb-2 tracking-wide">
                             Đã nhận
                          </div>
                       )}
                     </div>
                   );
                })}
                 {isTyping && (
                    <div className="flex flex-col gap-1 items-start mb-4">
                      <div className="flex items-end gap-2">
                        <img src={activeChat.img || 'https://ui-avatars.com/api/?name=Darling&background=ff2d55&color=fff&rounded=true&bold=true'} className="w-[28px] h-[28px] rounded-full object-cover mb-1 shadow-sm border border-black/5 shrink-0" />
                        <div className="flex flex-col gap-1 max-w-[75%]">
                           <div className="px-4 py-2.5 shadow-sm text-[15px] bg-white border border-black/5 text-black rounded-r-2xl rounded-tl-2xl rounded-bl-sm flex items-center gap-1.5 font-medium animate-pulse">
                              <span className="text-[13px] text-gray-500 italic mr-1">Darling đang soạn tin</span>
                              <span className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                           </div>
                        </div>
                      </div>
                    </div>
                 )}
                <div ref={endOfMessagesRef} />
             </div>
             
             <div className="bg-white border-t border-black/10 flex flex-col shrink-0 pb-[env(safe-area-inset-bottom)] relative">
                
                {/* EMOJI PICKER */}
                <AnimatePresence>
                  {showEmojiPicker && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 w-full bg-white border-b border-gray-100 p-2 flex gap-2 overflow-x-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 items-center hide-scrollbar"
                     >
                        {emojis.map(emoji => (
                           <button 
                             key={emoji} 
                             onClick={() => setInputText(prev => prev + emoji)}
                             className="text-[26px] p-2 hover:bg-gray-100 rounded-lg shrink-0 transition"
                           >
                             {emoji}
                           </button>
                        ))}
                     </motion.div>
                  )}
                </AnimatePresence>

                {!canChat ? (
                  <div className="p-4 text-[14px] text-gray-600 font-medium">
                    Bạn cần ghép đôi (chấp nhận lời kết bạn) để có thể nhắn tin với người này.
                  </div>
                ) : (
                <div className="p-3 w-full flex items-center gap-2 relative z-30 bg-white">
                  <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     ref={fileInputRef}
                     onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                           const file = e.target.files[0];
                           const reader = new FileReader();
                           reader.onloadend = () => {
                               const img = new Image();
                               img.onload = () => {
                                   const canvas = document.createElement('canvas');
                                   let width = img.width;
                                   let height = img.height;
                                   const MAX = 800; // max width/height
                                   if (width > MAX || height > MAX) {
                                       if (width > height) {
                                           height *= MAX / width;
                                           width = MAX;
                                       } else {
                                           width *= MAX / height;
                                           height = MAX;
                                       }
                                   }
                                   canvas.width = width;
                                   canvas.height = height;
                                   const ctx = canvas.getContext('2d');
                                   if (ctx) ctx.drawImage(img, 0, 0, width, height);
                                   const base64Image = canvas.toDataURL('image/jpeg', 0.8);

                                   setMessages(prev => [...prev, {
                                     id: Date.now(),
                                     text: base64Image,
                                     sender: "me",
                                     isImage: true,
                                     time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                   }]);
                                   
                                   if (activeChat?.matchId) {
                                      const myId = sessionStorage.getItem('user_id');
                                      if (myId) {
                                         fetch('/api/messages', {
                                             method: 'POST',
                                             headers: { 'Content-Type': 'application/json' },
                                             body: JSON.stringify({ match_id: activeChat.matchId, sender_id: parseInt(myId), text: base64Image })
                                         }).catch(()=>{});
                                      }
                                   }
                                   
                                   if (activeChat?.name === 'Darling') {
                                       callAI("[Gửi hình ảnh]", messages);
                                   }
                               };
                               img.src = reader.result as string;
                           };
                           reader.readAsDataURL(file);
                        }
                     }}
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-95 transition shrink-0 ml-1">
                     <Plus className="w-5 h-5" />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-95 transition shrink-0">
                     <ImageIcon className="w-5 h-5" />
                  </button>
                  <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 border border-black/5">
                     <input 
                       type="text" 
                       value={inputText}
                       onChange={e => setInputText(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' ? handleSend() : null}
                       placeholder="Nhắn tin..."
                       className="bg-transparent flex-1 outline-none text-[15px] w-full min-w-0"
                     />
                     <button 
                       onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                       className="p-1.5 active:scale-95 transition text-gray-500 hover:text-black"
                     >
                        <Smile className="w-5 h-5" />
                     </button>
                  </div>
                  {inputText.trim() ? (
                    <button style={{ backgroundColor: chatTheme }} onClick={handleSend} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition text-white shadow-sm ml-1 disabled:opacity-50" disabled={isTyping}>
                       <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  ) : (
                    <button 
                      onClick={toggleRecording}
                      disabled={isTyping}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition shadow-sm ml-1 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'} disabled:opacity-50`}
                    >
                       {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}
                </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && activeChat && (
           <motion.div
             initial={{ opacity: 0, x: 200 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 200 }}
             className="bg-gray-50 absolute inset-0 z-[110] flex flex-col h-full"
           >
              <div className="bg-white h-[90px] pt-[40px] px-4 flex items-center justify-between shrink-0 shadow-sm border-b border-black/5 z-10">
                 <button onClick={() => setShowInfo(false)} className="p-1 -ml-2 active:scale-90 transition">
                    <ArrowLeft className="w-7 h-7 text-black stroke-[2]" />
                 </button>
                 <span className="font-bold text-[17px] text-black">Thông tin</span>
                 <div className="w-8"></div>
              </div>
              <div className="flex-1 overflow-y-auto pb-20">
                 <div className="flex flex-col items-center pt-8 pb-6 bg-white border-b border-black/5">
                    <img src={activeChat.img} className="w-[100px] h-[100px] rounded-full object-cover shadow-sm mb-4" />
                    <span className="font-bold text-[22px] text-black">
                       {activeChat.name}
                       {activeChat.name === 'Darling' && <Zap className="w-5 h-5 ml-2 inline text-[#ff2d55] fill-[#ff2d55]" />}
                    </span>
                    <span className="text-[15px] font-medium text-black/50 mt-1">
                       {activeChat.name === 'Darling' ? 'Chuyên gia tư vấn Tình yêu' : 'Darling User'}
                    </span>
                    
                    <div className="flex justify-center gap-6 mt-6">
                       <div className="flex flex-col items-center gap-2 cursor-pointer active:opacity-60" onClick={() => setShowInfoProfile(true)}>
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-sm">
                             <User className="w-5 h-5" />
                          </div>
                          <span className="text-[12px] font-medium text-black/70">Hồ sơ</span>
                       </div>
                       <div className="flex flex-col items-center gap-2 cursor-pointer active:opacity-60" onClick={() => setShowInfo(false)}>
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-sm">
                             <MessageSquare className="w-5 h-5" />
                          </div>
                          <span className="text-[12px] font-medium text-black/70">Nhắn tin</span>
                       </div>
                       <div className="flex flex-col items-center gap-2 cursor-pointer active:opacity-60" onClick={() => {setShowInfo(false); toggleRecording();}}>
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-sm">
                             <Mic className="w-5 h-5" />
                          </div>
                          <span className="text-[12px] font-medium text-black/70">Ghi âm</span>
                       </div>
                    </div>
                 </div>

                 <div className="mt-4 bg-white border-y border-black/5 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-black/5 active:bg-gray-50 cursor-pointer" onClick={toggleTheme}>
                       <span className="text-[16px] font-medium text-black">Chủ đề</span>
                       <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full" style={{ backgroundColor: chatTheme }}></div>
                           <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
                       </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border-b border-black/5 active:bg-gray-50 cursor-pointer" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                       <span className="text-[16px] font-medium text-black">Biểu tượng cảm xúc</span>
                       <div className="flex items-center gap-2">
                           <Smile className="w-6 h-6" style={{ color: chatTheme }} />
                           <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
                       </div>
                    </div>
                    <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer" onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
                       <span className="text-[16px] font-medium text-black">Bật thông báo</span>
                       <div className={`w-[50px] h-7 rounded-full p-0.5 shadow-inner transition-colors ${notificationsEnabled ? 'bg-[#2cd94d]' : 'bg-gray-300'}`}>
                          <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${notificationsEnabled ? 'ml-auto' : 'ml-0'}`}></div>
                       </div>
                    </div>
                 </div>

                 <div className="mt-4 bg-white border-y border-black/5 flex flex-col">
                    <div className="flex flex-col">
                       <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer" onClick={() => setShowMedia(!showMedia)}>
                          <span className="text-[16px] font-medium text-black">Hình ảnh phương tiện</span>
                          <div className="flex items-center gap-2">
                              {showMedia ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />}
                          </div>
                       </div>
                       {showMedia && (
                         <div className="px-4 pb-4">
                            {chatImages.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2">
                                  {chatImages.map((imgSrc, idx) => (
                                      <div key={idx} className="aspect-square bg-gray-200 rounded-md overflow-hidden border border-black/5">
                                         <img src={imgSrc} className="w-full h-full object-cover" />
                                      </div>
                                  ))}
                                </div>
                            ) : (
                                <div className="text-[14px] text-gray-400 text-center py-4">Chưa có hình ảnh nào</div>
                            )}
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="mt-4 bg-white border-y border-black/5 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-black/5 active:bg-gray-50 cursor-pointer" onClick={handleBlock}>
                       <span className="text-[16px] font-medium text-[#ff2d55]">Chặn người dùng</span>
                    </div>
                    <div className="flex items-center justify-between p-4 border-b border-black/5 active:bg-gray-50 cursor-pointer" onClick={handleReport}>
                       <span className="text-[16px] font-medium text-[#ff2d55]">Báo cáo tài khoản</span>
                    </div>
                    <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer" onClick={handleDeleteChat}>
                       <span className="text-[16px] font-medium text-[#ff2d55]">Xóa đoạn chat</span>
                    </div>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-[28px] font-bold mb-6 shrink-0">Chat</h1>
      
      <div className="space-y-0 overflow-y-auto flex-1 pb-24">
        {chats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
             <p className="text-[17px] font-medium text-black/40">Bạn chưa có đoạn chat nào</p>
          </div>
        ) : (
          chats.map((chat, i) => (
            <div 
              key={i} 
              className="flex items-start gap-4 text-black border-none pb-4 pt-2 relative cursor-pointer active:opacity-60 transition"
              onClick={() => setActiveChat({ ...chat })}
            >
               {chat.isUnread && (
                   <div className="absolute top-[32px] left-[-8px] w-2 h-2 bg-[#ff2052] rounded-full"></div>
               )}
               
               <div className="relative pt-1 shrink-0 ml-1">
                 <img src={chat.img} className="w-[52px] h-[52px] rounded-full object-cover shadow-sm bg-black/5" />
               </div>
               
               <div className="flex-1 pt-1 overflow-hidden pr-2">
                 <div className="flex justify-between items-center mb-1">
                   <h3 className={`font-bold text-[16px] ${chat.isUnread ? 'text-[#ff2d55]' : 'text-black'}`}>
                       {chat.name}
                       {chat.name === 'Darling' && <span className="ml-2 text-[10px] bg-[#ff2d55] text-white px-1.5 py-0.5 rounded-sm font-bold uppercase inline-block -translate-y-0.5">AI</span>}
                   </h3>
                 </div>
                 <span className={`text-[14px] truncate block ${chat.isUnread ? 'text-black font-semibold' : 'text-gray-500'} `}>
                   {chat.message || chat.lastMsg || 'Bắt đầu trò chuyện...'}
                 </span>
               </div>
               <div className="shrink-0 flex items-end justify-center self-stretch pb-5">
                   <ChevronRight className="w-5 h-5 text-black/20" strokeWidth={1.5} />
               </div>
               <div className="absolute bottom-0 left-[68px] right-0 h-[1px] bg-black/5"></div>
            </div>
          ))
        )}
      </div>

      {showInfoProfile && partnerProfile && (
         <div className="absolute inset-0 z-[120] bg-white overflow-hidden flex flex-col h-full w-full">
            <ProfileSwiper profiles={[partnerProfile]} title={activeChat?.name || 'Hồ sơ'} onClose={() => setShowInfoProfile(false)} />
         </div>
      )}

    </div>
  );
}

export function ProfileView({ onNavigate }: { onNavigate?: (v: any) => void }) {
  return (
    <div className="bg-[#ff9ca0] min-h-screen p-6 pb-24 text-gray-900 font-sans">
       <div className="flex justify-between items-start mb-6">
          <div className="w-24 h-24 bg-[#ddd4ff] rounded-full flex items-center justify-center border border-black/10">
             <User className="w-12 h-12 text-[#6e5dc6]" />
          </div>
          <button className="p-2">
             <Star className="w-8 h-8 opacity-80" /> {/* Gear icon placeholder */}
          </button>
       </div>

       <div className="mb-6">
         <h1 className="text-3xl font-bold mb-3">Use name</h1>
         <button className="px-6 py-2 bg-[#f0eaff] rounded-lg font-medium text-gray-800 flex items-center gap-2">
            <span className="text-xs">✏️</span> Chỉnh sửa hồ sơ
         </button>
       </div>

       <div className="space-y-4">
         <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <span className="text-lg">Họ tên:</span>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Tên người dùng</span>
              <Star className="w-5 h-5 text-blue-500" />
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <span className="text-lg">Ngày tháng năm sinh:</span>
            <span className="text-gray-800">01/01/2000</span>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <span className="text-lg">Giới tính:</span>
            <span className="text-blue-600">Nam</span>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <span className="text-lg">Chiều cao:</span>
            <span className="text-gray-500">1m70cm</span>
         </div>

         <div className="pt-2">
            <span className="text-lg block mb-4">Ảnh:</span>
            <div className="grid grid-cols-2 gap-4 max-w-[200px]">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square bg-[#222] rounded-xl flex items-center justify-center">
                   <ImageIcon className="w-12 h-12 text-[#ff9ca0]" />
                </div>
              ))}
            </div>
         </div>
       </div>

       <div className="flex justify-end mt-8">
         <button onClick={() => { localStorage.clear(); sessionStorage.clear(); if(onNavigate) onNavigate('login'); }} className="bg-[#f03e5c] text-white px-6 py-3 rounded-lg font-medium shadow-sm active:bg-red-700 transition">
           Đăng xuất
         </button>
       </div>
    </div>
  );
}

// Let's modify ProfileView to use real settings gear
export function ProfileViewRevised({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  const { isTestFemaleView, toggleTestFemaleView, myProfile: myProfileData, updateMyProfile, settings } = React.useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleAutoLocation = () => {
     if (!navigator.geolocation) {
         alert('Trình duyệt không hỗ trợ Geolocation');
         return;
     }
     setIsLocating(true);
     navigator.geolocation.getCurrentPosition(
         async (position) => {
             const { latitude, longitude } = position.coords;
             try {
                 const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                 const data = await res.json();
                 const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state || 'Gần bạn';
                 updateMyProfile({ location: city });
             } catch {
                 updateMyProfile({ location: 'Gần bạn' });
             } finally {
                 setIsLocating(false);
             }
         },
         (error) => {
             console.error(error);
             alert('Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
             setIsLocating(false);
         }
     );
  };

  const handleRemoveImage = (index: number) => {
     const newImages = [...myProfileData.images];
     newImages.splice(index, 1);
     updateMyProfile({ images: newImages });
  };
  
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const newImages = [...myProfileData.images, event.target.result as string];
                updateMyProfile({ images: newImages });
            }
        };
        reader.readAsDataURL(file);
     }
  };

  if (isEditing) {
    return (
      <div className="bg-[#ff9ca0] min-h-full p-6 pt-10 text-black font-sans flex flex-col relative pb-24">
        {editStep === 1 && (
           <div className="w-full flex-1 flex flex-col">
              <h2 className="text-[22px] font-bold text-center mb-8 mt-4">Thông tin cơ bản</h2>
              <div className="space-y-4 flex-1">
                 <div>
                    <label className="text-[15px] text-black font-medium mb-1 block">Họ tên/nick name:</label>
                    <input type="text" value={myProfileData.name} onChange={e => updateMyProfile({ name: e.target.value })} className="w-full bg-black/10 border-none rounded-[4px] px-4 py-3 font-medium text-[15px] outline-none" />
                 </div>
                 <div>
                    <label className="text-[15px] text-black font-medium mb-1 block">Ngày/tháng/năm sinh:</label>
                    <input type="date" value={myProfileData.dob} onChange={e => updateMyProfile({ dob: e.target.value })} className="w-full bg-black/10 border-none rounded-[4px] px-4 py-3 font-medium text-[15px] outline-none" />
                 </div>
                 <MainAppSelectField label="Giới tính" options={genders} value={myProfileData.gender} onChange={v => updateMyProfile({gender: v})} />
                 <div>
                    <label className="text-[15px] text-black font-medium mb-1 block">Chiều cao:</label>
                    <input type="text" value={myProfileData.height} onChange={e => updateMyProfile({ height: e.target.value })} className="w-full bg-black/10 border-none rounded-[4px] px-4 py-3 font-medium text-[15px] outline-none" />
                 </div>
                 <div>
                    <div className="flex items-center justify-between mb-1">
                       <label className="text-[15px] text-black font-medium block">Địa điểm:</label>
                       <button onClick={handleAutoLocation} className="text-[#ff2d55] text-[13px] font-bold active:scale-95 transition-transform">
                          {isLocating ? 'Đang xác định...' : 'Lấy vị trí'}
                       </button>
                    </div>
                    <div className="relative">
                       <input type="text" value={myProfileData.location || settings.location} onChange={e => updateMyProfile({ location: e.target.value })} className="w-full bg-black/10 border-none rounded-[4px] pl-10 pr-4 py-3 font-medium text-[15px] outline-none" />
                       <MapPin className="w-[18px] h-[18px] absolute left-3 top-[14px] text-black/50" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[15px] text-black font-medium mb-1 block">Giới thiệu về bản thân (Tối đa 500 ký tự):</label>
                    <textarea 
                       value={myProfileData.bio || ''} 
                       onChange={e => {
                          const val = e.target.value;
                          if (val.length <= 500) {
                             updateMyProfile({ bio: val });
                          }
                       }} 
                       className="w-full bg-black/10 border-none rounded-lg px-4 py-3 font-medium text-[15px] outline-none h-28 resize-none" 
                       placeholder="Hãy giới thiệu thêm về chính bạn..."
                    />
                    <div className="text-right text-xs text-black/60 mt-1 font-mono">
                       {(myProfileData.bio || '').length}/500 ký tự
                    </div>
                 </div>
                 <div className="pt-2">
                    <label className="text-[15px] text-black font-medium mb-3 block">Ảnh của bạn:</label>
                    <div className="grid grid-cols-2 gap-4 max-w-[240px]">
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadImage} />
                       {[0, 1, 2, 3].map(i => (
                         <div key={i} onClick={() => !myProfileData.images[i] && fileInputRef.current?.click()} className="aspect-square bg-[#222] rounded-2xl flex items-center justify-center overflow-hidden relative group cursor-pointer">
                            {myProfileData.images[i] ? (
                               <>
                                  <img src={myProfileData.images[i]} className="w-full h-full object-cover" />
                                  <div onClick={(e) => { e.stopPropagation(); handleRemoveImage(i); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full cursor-pointer hover:bg-black/80">
                                      <X className="w-4 h-4" />
                                  </div>
                               </>
                            ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center text-white/50 hover:bg-white/5 transition-colors">
                                  <ImageIcon className="w-8 h-8 mb-1" />
                                  <span className="text-[10px] font-bold">Thêm ảnh</span>
                               </div>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="flex justify-center mt-8 pb-4">
                 <button onClick={() => {
                     if (myProfileData.images.length < 2) {
                        alert('Vui lòng tải lên ít nhất 2 ảnh!');
                        return;
                     }
                     if (myProfileData.images.length > 4) {
                        alert('Bạn chỉ có thể tải lên tối đa 4 ảnh!');
                        return;
                     }
                     setEditStep(2);
                  }} className="bg-[#00b05b] hover:bg-[#00904a] text-white px-8 py-3 rounded-md font-medium min-w-[120px] transition-colors">
                    Tiếp theo
                 </button>
              </div>
           </div>
        )}

        {editStep === 2 && (
           <div className="w-full flex-1 flex flex-col">
              <h2 className="text-[22px] font-bold text-center mb-8 mt-4">Phong cách sống</h2>
              <div className="space-y-4 flex-1">
                 <MainAppSelectField label="Ngành nghề" options={jobs} value={myProfileData.job} onChange={v => updateMyProfile({job: v})} />
                 <MainAppSelectField label="Ngôn Ngữ" options={languages} value={myProfileData.language} onChange={v => updateMyProfile({language: v})} />
                 <MainAppSelectField label="Tôn giáo" options={religions} value={myProfileData.religion} onChange={v => updateMyProfile({religion: v})} />
                 <MainAppSelectField label="Phong cách giao tiếp" options={communicationStyles} value={myProfileData.communicationStyle} onChange={v => updateMyProfile({communicationStyle: v})} />
                 <MainAppSelectField label="Nhu cầu" options={intents} value={myProfileData.intent || myProfileData.need || ''} onChange={v => updateMyProfile({need: v, intent: v})} />
              </div>
              <div className="flex justify-between mt-8 pb-4">
                 <button onClick={() => setEditStep(1)} className="bg-[#00b05b] hover:bg-[#00904a] text-white px-8 py-3 rounded-md font-medium min-w-[120px] transition-colors">
                    Quay lại
                 </button>
                 <button onClick={() => setEditStep(3)} className="bg-[#00b05b] hover:bg-[#00904a] text-white px-8 py-3 rounded-md font-medium min-w-[120px] transition-colors">
                    Tiếp theo
                 </button>
              </div>
           </div>
        )}

        {editStep === 3 && (
           <div className="w-full flex-1 flex flex-col">
              <h2 className="text-[22px] font-bold text-center mb-8 mt-4">Sở thích của bạn</h2>
              <div className="space-y-4 flex-1">
                 <MainAppSelectField label="Thú cưng" options={pets} value={myProfileData.pet} onChange={v => updateMyProfile({pet: v})} />
                 <MainAppSelectField label="Âm nhạc" options={musics} value={myProfileData.music} onChange={v => updateMyProfile({music: v})} />
                 <MainAppSelectField label="Sách" options={books} value={myProfileData.book} onChange={v => updateMyProfile({book: v})} />
                 <MainAppSelectField label="Đồ ăn" options={foods} value={myProfileData.food} onChange={v => updateMyProfile({food: v})} />
                 <MainAppSelectField label="Du lịch" options={travels} value={myProfileData.travel} onChange={v => updateMyProfile({travel: v})} />
                 <MainAppSelectField label="Trò chơi" options={games} value={myProfileData.game} onChange={v => updateMyProfile({game: v})} />
                 <MainAppSelectField label="Thể thao" options={sports} value={myProfileData.sport} onChange={v => updateMyProfile({sport: v})} />
              </div>
              <div className="flex justify-between mt-8 pb-4">
                 <button onClick={() => setEditStep(2)} className="bg-[#00b05b] hover:bg-[#00904a] text-white px-8 py-3 rounded-md font-medium min-w-[120px] transition-colors">
                    Quay lại
                 </button>
                 <button onClick={async () => {
                    const userId = sessionStorage.getItem('user_id');
                    if (userId) {
                       try {
                           const filteredObj = { ...myProfileData, images: myProfileData.images.filter((img: string) => img !== '') };
                           await fetch(`/api/users/profile/${userId}`, {
                               method: 'PUT',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ profileData: filteredObj })
                           });
                       } catch (e) {
                           console.error(e);
                       }
                    }
                    setEditStep(1); 
                    setIsEditing(false);
                 }} className="bg-[#00b05b] hover:bg-[#00904a] text-white px-8 py-3 rounded-md font-medium min-w-[120px] transition-colors">
                    Hoàn thành
                 </button>
              </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#ff9ca0] min-h-full p-6 pt-10 pb-24 text-black font-sans flex flex-col">
       <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-6">
            <div className="w-[100px] h-[100px] bg-[#dfd6ff] rounded-full flex items-center justify-center border-[4px] border-white overflow-hidden shadow-sm shrink-0">
               {myProfileData.images && myProfileData.images[0] ? (
                  <img src={myProfileData.images[0]} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                  <User className="w-[50px] h-[50px] text-[#6b58dc]" strokeWidth={1.5} />
               )}
            </div>
            <div className="flex flex-col">
               <h1 className="text-[28px] font-bold mb-1 tracking-tight text-shadow-sm leading-none">{myProfileData.name}</h1>
               <div className="text-black/80 font-medium text-[15px] mb-2">{settings.location}</div>
            </div>
          </div>
          <button onClick={() => onNavigate('app_settings')} className="p-1 relative right-[-5px] active:scale-95 transition-transform">
             <SettingsIcon className="w-[30px] h-[30px] stroke-[2]" />
          </button>
       </div>

       <div className="w-full">
           <button onClick={() => setIsEditing(true)} className="w-full bg-white/60 hover:bg-white/80 active:scale-95 transition-all text-black font-bold py-3.5 rounded-2xl shadow-sm border border-black/5 flex items-center justify-center gap-2 mb-4">
              Chỉnh sửa hồ sơ
           </button>

           <button 
              onClick={toggleTestFemaleView} 
              className={`w-full py-3.5 rounded-2xl shadow-sm border flex items-center justify-center gap-2 font-bold mb-4 active:scale-95 transition-all ${isTestFemaleView ? 'bg-[#ff2d55] text-white border-transparent' : 'bg-white/40 text-black border-black/10 hover:bg-white/60'}`}
           >
              <Users className="w-5 h-5" />
              {isTestFemaleView ? 'Đang bật Xem trước (Hủy)' : 'Xem trước góc nhìn'}
           </button>
           {isTestFemaleView && (
              <p className="text-xs text-center font-bold text-red-600 mb-4 px-4 bg-white/50 py-2 rounded-xl border border-red-200">
                Chế độ Xem trước đang bật! Hãy sang tab "Xem" để xem hồ sơ của bạn dưới góc nhìn của người khác.
              </p>
           )}
       </div>

       <div className="space-y-4 mt-2 p-1 border-t border-black/20 pt-6 flex-1">
         <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <span className="text-[16px] font-medium text-gray-800">Ngày sinh:</span>
            <span className="text-black text-[15px] font-bold">{myProfileData.dob}</span>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <span className="text-[16px] font-medium text-gray-800">Giới tính:</span>
            <span className="text-black text-[15px] font-bold">{myProfileData.gender}</span>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <span className="text-[16px] font-medium text-gray-800">Chiều cao:</span>
            <span className="text-black text-[15px] font-bold">{myProfileData.height}</span>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <span className="text-[16px] font-medium text-gray-800">Cung hoàng đạo:</span>
            <span className="text-black text-[15px] font-bold">{myProfileData.zodiac}</span>
         </div>
         <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <span className="text-[16px] font-medium text-gray-800">Địa điểm:</span>
            <span className="text-black text-[15px] font-bold">{myProfileData.location || settings.location}</span>
         </div>
         <div className="flex flex-col gap-5 mt-2">
            <div>
               <h3 className="font-bold text-[18px] text-gray-900 mb-3">Phong cách sống</h3>
               <div className="flex flex-wrap gap-2 text-[13px] font-medium">
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Ngành nghề: {myProfileData.job}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Ngôn ngữ: {myProfileData.language}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Tôn giáo: {myProfileData.religion}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Giao tiếp: {myProfileData.communicationStyle}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Nhu cầu: {myProfileData.need}</span>
               </div>
            </div>

            <div className="mb-2">
               <h3 className="font-bold text-[18px] text-gray-900 mb-3">Sở thích của bạn</h3>
               <div className="flex flex-wrap gap-2 text-[13px] font-medium">
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Thú cưng: {myProfileData.pet}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Âm nhạc: {myProfileData.music}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Sách: {myProfileData.book}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Đồ ăn: {myProfileData.food}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Du lịch: {myProfileData.travel}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Trò chơi: {myProfileData.game}</span>
                   <span className="bg-white/50 px-3 py-2 rounded-full border border-black/5">Thể thao: {myProfileData.sport}</span>
               </div>
            </div>
         </div>

         <div className="pt-4">
            <span className="text-[17px] font-bold text-gray-900 block mb-4">Hình ảnh hồ sơ:</span>
            <div className="grid grid-cols-2 gap-3 w-full">
              {myProfileData.images.map((img, i) => (
                <div key={i} className="aspect-[4/5] bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-sm border border-black/5">
                   <img src={img} alt={`Profile ${i+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
         </div>
       </div>
    </div>
  );
}