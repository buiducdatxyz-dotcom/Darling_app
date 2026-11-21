import { apiFetch } from '../utils/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { ViewState } from '../types';
import { Smile, Users, Heart, MessageSquare, User, Star, ArrowLeft, X, Bookmark, Image as ImageIcon, Phone, Video, MoreVertical, Mic, Send, Plus, Play, Pause, Music, Zap, Settings2, ChevronDown, Info, MapPin, Check, ChevronRight, Lock, Plane, Camera } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { TAROT_DECK, TarotCard } from '../data/tarot';
import { CupidChatBubble } from './CupidChatBubble';
import { TarotInteractiveModal } from './TarotInteractiveModal';
import { MomentsView } from './MomentsView';
import { LunarAnimalsModal } from './LunarAnimalsModal';
import { PremiumModal } from './PremiumModal';
import { MusicClipModal } from './MusicClipModal';
import { calculateFullCompatibility, getLunarAnimalFromDob, getWesternZodiacFromDob } from '../utils/compatibility';
import { 
  genders, jobs, languages, religions, communicationStyles, intents, pets, 
  musics, books, foods, travels, games, sports 
} from '../data';

const SettingsIcon = LucideIcons.Settings;

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
    isPremium: false,
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
  exploreUsers: any[];
  likedProfiles: any[];
  savedProfiles: any[];
  toggleLike: (profile: any, skipApiCall?: boolean) => void;
  toggleSave: (profile: any) => void;
  swipedRecords?: { target_user_id: number; action: string }[];
  registerSwipe?: (targetUserId: number, action: 'like' | 'pass' | 'viewed') => void;
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
  logout?: () => void;
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
  fetchMoreUsers: (includeViewed?: boolean | 'replay') => Promise<boolean>;
  replayProfiles: () => Promise<boolean>;
}>({ 
  serverUsers: [],
  exploreUsers: [],
  likedProfiles: [], 
  savedProfiles: [], 
  toggleLike: () => {}, 
  toggleSave: () => {},
  swipedRecords: [],
  registerSwipe: () => {},
  fetchMoreUsers: async () => false,
  replayProfiles: async () => false,
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
  setGlobalMatchModal: () => {},
  logout: () => {}
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
  const pendingLikeIdsRef = React.useRef<Set<number>>(new Set());
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
  const [exploreUsers, setExploreUsers] = useState<any[]>([]);
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

  const registerSwipe = React.useCallback((targetUserId: number, action: 'like' | 'pass' | 'viewed') => {
    setSwipedRecords(prev => {
      const cleaned = prev.filter(r => r.target_user_id !== targetUserId);
      return [...cleaned, { target_user_id: targetUserId, action }];
    });
    const myId = sessionStorage.getItem('user_id');
    if (myId) {
      if (action === 'pass') {
        apiFetch('/api/matches/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: parseInt(myId), target_user_id: targetUserId, action: 'PASS' })
        }).catch(() => {});
      } else if (action === 'viewed') {
        apiFetch(`/api/users/${targetUserId}/view`, { method: 'POST' }).catch(() => {});
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
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id') || (myProfile?.id != null ? String(myProfile.id) : '999');
    if (!userId) return false;
    setIsSavingPref(true);
    try {
      const res = await apiFetch(`/api/user_preferences/${userId}`, {
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
        
        // Fetch profile
        apiFetch(`/api/users/profile/${uId}`)
          .then(r => r.json())
          .then(data => {
             if (data.success && data.data) {
                setMyProfile(data.data);
                localStorage.setItem('ais_profile', JSON.stringify(data.data));
             }
          })
          .catch(() => {});

        // Fetch preferences
        apiFetch(`/api/user_preferences/${uId}`)
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
        setMyProfile(USER_PROFILE_DATA);
        localStorage.removeItem('ais_profile');
        setSettings({
           activePriorities: ['Dành Cho Bạn'],
           distance: 100,
           isDistanceFlexible: true,
           ageMin: 18,
           ageMax: 31,
           isAgeFlexible: true,
           interestedIn: 'Mọi người',
           location: 'Hà Nội, Hà Nội'
        });
        localStorage.removeItem('ais_user_settings');
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

  const fetchMoreUsers = React.useCallback((includeViewed: boolean | 'replay' = false): Promise<boolean> => {
     const query = includeViewed === 'replay' ? '?forReplay=1' : includeViewed ? '?forExplore=1' : '';
     return apiFetch(`/api/users/explore${query}`)
       .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
       .then(({ ok, data }) => {
            if (ok && data.success && Array.isArray(data.data)) {
                const userList = data.data.map((u:any) => {
                   let profileData = u.profile_data || {};
                    if (typeof profileData === 'string') {
                        try { profileData = JSON.parse(profileData); } catch(e){}
                    }
                    let dob = profileData.dob;
                   const hasBirthDate = Boolean(profileData.dob);
                   const hasZodiac = Boolean(profileData.zodiac || profileData.dob);
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
                      isPremium: u.is_premium === true || Number(u.is_premium) === 1 || profileData.isPremium === true || Number(profileData.isPremium) === 1,
                      createdAt: u.created_at,
                      hasMoments: Boolean(profileData.hasMoments),
                      hasBirthDate,
                      hasZodiac,
                      tarotInterest: Boolean(profileData.tarotInterest || profileData.tarot || (Array.isArray(profileData.interests) && profileData.interests.some((interest: string) => /tarot/i.test(interest)))),
                     distanceKm: u.distance_km == null ? null : Number(u.distance_km),
                     lat: profileData.lat, lng: profileData.lng,
                     name: profileData.name || 'Người dùng mới',
                     gender: displayGender,
                     dob: dob,
                     distance: u.distance_km == null ? 'Chưa xác định vị trí' : `Cách ${u.distance_km} km`,
                     bio: profileData.bio || '',
                      zodiac: profileData.zodiac || (hasBirthDate ? getWesternZodiacFromDob(profileData.dob) : 'Bạch Dương'),
                     location: profileData.hometown || profileData.location || 'Hà Nội',
                     images: Array.isArray(profileData.images)
                       ? [...new Set(profileData.images.map((image: any) => String(image || '').trim()).filter(Boolean))]
                       : [],
                     job: profileData.job || 'Chưa cập nhật',
                     need: profileData.need || profileData.intent || profileData.intents || '',
                     interests: Array.isArray(profileData.interests) ? profileData.interests : [],
                     prompts: profileData.prompts || [],
                     lifestyle: profileData.lifestyle || {},
                     height: profileData.height || (['1m60', '1m62', '1m65', '1m68', '1m70', '1m72', '1m75', '1m78', '1m80', '1m82'][u.id % 10]),
                     language: profileData.language || 'Tiếng Việt',
                     religion: profileData.religion || 'Không',
                     communicationStyle: profileData.communicationStyle || '',
                     pet: profileData.pet || profileData.lifestyle?.pet || '',
                     music: profileData.music || profileData.lifestyle?.music || '',
                     book: profileData.book || profileData.lifestyle?.book || '',
                     food: profileData.food || profileData.lifestyle?.food || '',
                     travel: profileData.travel || profileData.lifestyle?.travel || '',
                     game: profileData.game || profileData.lifestyle?.game || '',
                     sport: profileData.sport || profileData.lifestyle?.sport || '',
                      songTitle: profileData.songTitle,
                      songUrl: profileData.songUrl
                  };
               });
               const myId = parseInt(sessionStorage.getItem('user_id') || localStorage.getItem('user_id') || '0');
               const eligibleUsers = userList.filter((u:any) => Number(u.id) !== myId && u.images.length > 0);
               if (includeViewed === true) setExploreUsers(eligibleUsers);
               else setServerUsers(eligibleUsers);
               return true;
            }
            return false;
       }).catch(()=>false);
  }, [myProfile]);

  const replayProfiles = React.useCallback(async () => {
    try {
      const replayed = await fetchMoreUsers('replay');
      if (!replayed) return false;
      setSwipedRecords(previous => previous.filter(record => record.action === 'like'));
      return true;
    } catch {
      return false;
    }
  }, [fetchMoreUsers]);

  useEffect(() => {
     // Sync matches and historical swipes with backend database
     const userId = sessionStorage.getItem('user_id');
     if (userId) {
         apiFetch(`/api/matches/${userId}`)
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

         apiFetch(`/api/users/${userId}/swipes`)
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
                     apiFetch(`/api/users/profile/${myId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profileData: { ...myProfile, lat, lng } })
                     }).then(() => fetchMoreUsers()).catch(() => {});
                 }
             }
         }, () => {}, { timeout: 10000 });
     }
  }, [fetchMoreUsers]);

  const updateSetupData = (data: any) => setSetupData((prev: any) => ({ ...prev, ...data }));

  const toggleLike = (profile: any, skipApiCall?: boolean) => {
    const targetId = Number(profile?.id);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) return;
    const currentLikes = Array.isArray(likedProfiles) ? likedProfiles.filter(Boolean) : [];
    if (currentLikes.some(item => Number(item.id) === targetId)) {
      setLikedProfiles(previous => previous.filter(item => Number(item?.id) !== targetId));
      setSwipedRecords(previous => previous.filter(record => Number(record.target_user_id) !== targetId));
      return;
    }

    if (skipApiCall) {
      setLikedProfiles(previous => previous.some(item => Number(item?.id) === targetId) ? previous : [...previous, profile]);
      return;
    }

    const myId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
    if (!myId || pendingLikeIdsRef.current.has(targetId)) return;
    pendingLikeIdsRef.current.add(targetId);
    apiFetch('/api/matches/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(myId), target_user_id: targetId, action: 'LIKE' })
    })
      .then(async response => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!response.ok || !data.success) {
          if (response.status === 429 && data.code === 'LIKE_DAILY_LIMIT') window.dispatchEvent(new Event('premium_required'));
          return;
        }
        setLikedProfiles(previous => previous.some(item => Number(item?.id) === targetId) ? previous : [...previous, { ...profile, ...(data.match_id ? { match_id: data.match_id } : {}) }]);
        setSwipedRecords(previous => [...previous.filter(record => Number(record.target_user_id) !== targetId), { target_user_id: targetId, action: 'like' }]);
        if (data.match_id) setGlobalMatchModal(profile);
      })
      .catch(error => console.error('Could not save like:', error))
      .finally(() => pendingLikeIdsRef.current.delete(targetId));
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

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setMyProfile(USER_PROFILE_DATA);
    setServerUsers([]);
    setExploreUsers([]);
    setLikedProfiles([]);
    setSavedProfiles([]);
    setSwipedRecords([]);
    setLastLoadedUserId(null);
    setSetupData({});
    setActiveChatUser(null);
    setSettings({
       activePriorities: ['Dành Cho Bạn'],
       distance: 100,
       isDistanceFlexible: true,
       ageMin: 18,
       ageMax: 31,
       isAgeFlexible: true,
       interestedIn: 'Mọi người',
       location: 'Hà Nội, Hà Nội'
    });
    if (onNavigate) {
       onNavigate('login');
    } else {
       window.location.reload();
    }
  };

  return (
    <AppContext.Provider value={{ serverUsers, exploreUsers, likedProfiles, savedProfiles, toggleLike, toggleSave, swipedRecords, registerSwipe, settings, updateSettings, onNavigate, activeChatUser, setActiveChatUser, isTestFemaleView, toggleTestFemaleView: () => setIsTestFemaleView(v => !v), myProfile, updateMyProfile, setupData, updateSetupData, globalMatchModal, setGlobalMatchModal, fetchMoreUsers, replayProfiles, saveSettings, isSavingPref, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  const { myProfile, updateMyProfile } = React.useContext(AppContext);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  useEffect(() => {
    const showGate = () => setShowPremiumGate(true);
    window.addEventListener('premium_required', showGate);
    return () => window.removeEventListener('premium_required', showGate);
  }, []);
  const navItems = [
    { id: 'app_swipe', icon: <Smile className="w-7 h-7 stroke-[2]" />, label: 'Xem' },
    { id: 'app_explore', icon: <Users className="w-7 h-7 stroke-[2]" />, label: 'Khám phá' },
    { id: 'app_likes', icon: <Heart className="w-7 h-7 stroke-[2]" />, label: 'Lượt thích' },
    { id: 'app_chat', icon: <MessageSquare className="w-7 h-7 stroke-[2]" />, label: 'Chat' },
    { id: 'app_profile', icon: <User className="w-7 h-7 stroke-[2]" />, label: 'Hồ sơ' },
  ] as const;
  const visibleNavItems: any[] = [...navItems];
  if ((myProfile as any)?.isAdmin) visibleNavItems.push({ id: 'app_admin', icon: <LucideIcons.ShieldCheck className="w-7 h-7 stroke-[2]" />, label: 'Quản trị' });

  return (
    <div className="h-full w-full bg-[#f0f9ff] font-sans flex flex-col items-center relative overflow-hidden">
      <div className="w-full h-full flex flex-col bg-[#eaf4ff]">
        <div className="flex-1 overflow-y-hidden relative flex flex-col">
          <div className="absolute inset-0 overflow-y-auto">
             {children}
          </div>
        </div>

      <div className="bg-[#eaf4ff] border-t border-black/10 z-50 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-between items-center h-[72px] px-2 pb-1">
          {visibleNavItems.map((item) => {
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
      <CupidChatBubble />
      <PremiumModal
        isOpen={showPremiumGate}
        onClose={() => setShowPremiumGate(false)}
        userName={myProfile?.name}
        onPremiumActivated={() => {
          updateMyProfile({ isPremium: true });
          window.dispatchEvent(new Event('premium_activated'));
        }}
      />
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
    songTitle: 'Lofi Chill Vibes', songUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
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
    songTitle: 'Yêu Em Hơn Mỗi Ngày', songUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
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
    songTitle: 'Enthusiast (Romantic Lofi)', songUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
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
  const { distance = 100, ageMin = 18, ageMax = 31, interestedIn = 'Mọi người', isAgeFlexible = true } = settings;

  return profiles.filter(profile => {
    
    const profileDistance = profile.distanceKm == null ? null : Number(profile.distanceKm);
    
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

    const distanceMatch = isExplore || profileDistance == null || profileDistance <= distance;

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

    return distanceMatch && ageMatch && genderMatch;
  }).map(profile => ({
     ...profile,
     currentDistanceDisplay: profile.distanceKm == null
       ? 'Chưa xác định vị trí'
       : `Cách ${profile.distanceKm} km`
  }));
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

export function ProfileSwiper({ profiles, title, onClose, onReachEnd, canReplay = false, onReplay, storageKey, readOnly = false }: { profiles: any[], title: string, onClose?: () => void, onReachEnd?: () => void, canReplay?: boolean, onReplay?: () => Promise<boolean> | boolean | void, storageKey?: string, readOnly?: boolean, key?: any }) {
  const { likedProfiles, toggleLike, settings, updateSettings, myProfile, updateMyProfile, saveSettings, isSavingPref, registerSwipe, setActiveChatUser, onNavigate } = React.useContext(AppContext);
  const normalizePriorityList = (priorities: any) => {
    const aliases: Record<string, string> = { 'Chiêm tinh': 'Cung hoàng đạo', '12 Con Giáp': 'Tử vi', '12 con giáp': 'Tử vi', 'Tarot': 'Trải bài Tarot', 'Trải bài tarot': 'Trải bài Tarot' };
    const normalized = (Array.isArray(priorities) ? priorities : ['Dành Cho Bạn']).map((priority: string) => aliases[priority] || priority);
    return [...new Set(normalized)];
  };
  const sessionProfileKey = storageKey || `swipe_id_${title}`;
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayError, setReplayError] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => {
     const storedId = sessionStorage.getItem(sessionProfileKey);
     if (storedId) {
         const foundIdx = profiles.findIndex(p => p.type !== 'advertisement' && (p.id === parseInt(storedId) || p.id === storedId));
         if (foundIdx !== -1) return foundIdx;
     }
     return 0;
  });
  const profileListRef = React.useRef(profiles);
  const activeProfileIdRef = React.useRef<any>(profiles[currentIndex]?.id ?? null);
  const skipRegisterForListRef = React.useRef<any>(null);

  const rawProfile = profiles[currentIndex] || null;

  useEffect(() => {
     if (profileListRef.current === profiles) return;
     const activeId = activeProfileIdRef.current ?? sessionStorage.getItem(sessionProfileKey);
     const restoredIndex = activeId == null ? -1 : profiles.findIndex(profile => String(profile.id) === String(activeId));
     profileListRef.current = profiles;
     skipRegisterForListRef.current = profiles;
     const fallbackIndex = activeId == null ? 0 : Math.min(currentIndex, Math.max(0, profiles.length - 1));
     setCurrentIndex(restoredIndex >= 0 ? restoredIndex : fallbackIndex);
      if (!readOnly && restoredIndex < 0 && profiles[fallbackIndex]?.id != null && profiles[fallbackIndex].type !== 'advertisement') {
        registerSwipe?.(Number(profiles[fallbackIndex].id), 'viewed');
     }
     setCurrentImageIndex(0);
     setIsPlaying(false);
   }, [profiles, sessionProfileKey, currentIndex, registerSwipe, readOnly]);

  useEffect(() => {
    if (skipRegisterForListRef.current === profiles) {
      skipRegisterForListRef.current = null;
      return;
    }
     if (!readOnly && rawProfile?.id != null && rawProfile.type !== 'advertisement' && registerSwipe) {
       registerSwipe(Number(rawProfile.id), 'viewed');
     }
   }, [rawProfile?.id, rawProfile?.type, registerSwipe, readOnly]);

  useEffect(() => {
     if (rawProfile?.id != null) activeProfileIdRef.current = rawProfile.id;
      if (!readOnly && rawProfile && rawProfile.id != null && rawProfile.type !== 'advertisement') {
          sessionStorage.setItem(sessionProfileKey, String(rawProfile.id));
      }
   }, [currentIndex, rawProfile, sessionProfileKey, readOnly]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAstrologyModalOpen, setIsAstrologyModalOpen] = useState(false);
  const [showFullReading, setShowFullReading] = useState(false);
  const [astrologyCardIndex, setAstrologyCardIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [topActionModal, setTopActionModal] = useState<null | 'music' | 'astrology' | 'zodiacCompatibility' | 'settings' | 'tarot' | 'lunar' | 'moments' | 'premium'>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(Boolean(myProfile?.isPremium));
  const [compatibilityZodiac, setCompatibilityZodiac] = useState(myProfile?.zodiac || ZODIAC_LIST[0]);
  const [partnerCompatibilityZodiac, setPartnerCompatibilityZodiac] = useState(ZODIAC_LIST[6]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [currentTarotIndex, setCurrentTarotIndex] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const { activePriorities, distance, isDistanceFlexible, ageMin, ageMax, isAgeFlexible, interestedIn } = settings;

  const togglePriority = (priority: string) => {
    const newPriorities = activePriorities.includes(priority) 
      ? activePriorities.filter(p => p !== priority) 
      : [...activePriorities, priority];
    updateSettings({ activePriorities: newPriorities });
  };

  const [localSettings, setLocalSettings] = useState(() => ({
     activePriorities: normalizePriorityList(settings.activePriorities),
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
           activePriorities: normalizePriorityList(settings.activePriorities),
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

  useEffect(() => {
    if (myProfile?.zodiac && ZODIAC_LIST.includes(myProfile.zodiac)) setCompatibilityZodiac(myProfile.zodiac);
  }, [myProfile?.zodiac]);

  useEffect(() => {
    let active = true;
    const activatePremium = () => setHasPremiumAccess(true);
    window.addEventListener('premium_activated', activatePremium);
    apiFetch('/api/advertisements/feed')
      .then(response => response.json())
      .then(data => { if (active && data.success) setHasPremiumAccess(Boolean(data.isPremium)); })
      .catch(() => { if (active) setHasPremiumAccess(Boolean(myProfile?.isPremium)); });
    return () => {
      active = false;
      window.removeEventListener('premium_activated', activatePremium);
    };
  }, [myProfile?.isPremium]);

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
    if (rawProfile?.type === 'advertisement') return rawProfile;
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

  useEffect(() => { setFriendRequestSent(false); }, [currentProfile?.id]);

  const [currentProfileAudioUrl, setCurrentProfileAudioUrl] = useState<string | null>(null);

  useEffect(() => {
     let active = true;
     setCurrentProfileAudioUrl(null);
     setIsPlaying(false);
     if (currentProfile?.songTitle) {
         if (currentProfile.songUrl) {
            setCurrentProfileAudioUrl(currentProfile.songUrl);
         } else {
            apiFetch(`/api/users/${currentProfile.id}/song`)
              .then(res => res.json())
              .then(data => {
                  if (active && data.success && data.data && data.data.song_data) {
                      setCurrentProfileAudioUrl(data.data.song_data);
                  }
              }).catch(() => {});
         }
     } else {
         setCurrentProfileAudioUrl(null);
     }
     return () => { active = false; };
  }, [currentProfile?.id, currentProfile?.songTitle, currentProfile?.songUrl]);

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };
  const currentAge = currentProfile ? calculateAge(currentProfile.dob) : '';

  const handleBack = () => {
    if (currentIndex > 0) {
      activeProfileIdRef.current = profiles[currentIndex - 1]?.id ?? null;
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
       if (isPlaying && currentProfileAudioUrl) {
          audioRef.current.play().catch(e => {
             console.error("Audio playback failed", e);
             setIsPlaying(false);
          });
       } else {
          audioRef.current.pause();
       }
    }
  }, [isPlaying, currentImageIndex, currentProfile, currentProfileAudioUrl]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      activeProfileIdRef.current = profiles[currentIndex + 1]?.id ?? null;
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onReachEnd) {
         activeProfileIdRef.current = null;
         sessionStorage.removeItem(sessionProfileKey);
         setCurrentIndex(profiles.length);
         onReachEnd();
      } else {
         activeProfileIdRef.current = null;
         setCurrentIndex(profiles.length); // stop at the end instead of showing the same profiles again
      }
    }
    setCurrentImageIndex(0);
    setIsAstrologyModalOpen(false);
    setIsPlaying(false);
    x.set(0);
  };

  const replayAndReset = async () => {
    if (isReplaying) return;
    setIsReplaying(true);
    setReplayError(false);
    try {
      const replayed = await onReplay?.();
      if (replayed === false) {
        setReplayError(true);
        return;
      }
      activeProfileIdRef.current = null;
      sessionStorage.removeItem(sessionProfileKey);
      setCurrentIndex(0);
    } catch {
      setReplayError(true);
    } finally {
      setIsReplaying(false);
    }
  };

  const isLiked = currentProfile ? (likedProfiles || []).some(p => p && p.id === currentProfile.id) : false;
  const adTargetUrl = currentProfile?.type === 'advertisement' ? (() => {
    try {
      const parsed = new URL(currentProfile.target_url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
    } catch {
      return null;
    }
  })() : null;
  const zodiacCompatibilityScore = calculateZodiacCompatibility(compatibilityZodiac)[partnerCompatibilityZodiac] || 50;

  const onLikeClick = () => {
    if (currentProfile) {
       toggleLike(currentProfile);
       if (!isLiked) {
          x.set(100);
          setTimeout(() => handleNext(), 300);
       }
    }
  };

  const onAddFriendClick = async () => {
    if (!currentProfile || isSendingFriendRequest) return;
    setIsSendingFriendRequest(true);
    try {
      const response = await apiFetch('/api/friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: Number(currentProfile.id) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không gửi được lời mời kết bạn.');
      setFriendRequestSent(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không gửi được lời mời kết bạn.');
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  const openCupidTool = (tool: 'tarot' | 'zodiac' | 'lunar') => {
    if (!hasPremiumAccess && (tool === 'tarot' || tool === 'lunar')) {
      setTopActionModal('premium');
      return;
    }
    setTopActionModal(null);
    window.dispatchEvent(new CustomEvent('cupid_open_tool', { detail: { tool } }));
  };

  const startMomentChat = async (moment: { userId: number; userName: string; userAvatar: string; imageUrl: string }) => {
    const userId = Number(sessionStorage.getItem('user_id') || localStorage.getItem('user_id'));
    if (!userId) return;
    try {
      const matchesResponse = await apiFetch(`/api/matches/${userId}`);
      const matchesResult = await matchesResponse.json();
      const match = (matchesResult.data || []).find((item: any) => Number(item.user_id) === Number(moment.userId));
      if (!matchesResponse.ok || !match) {
        window.alert('Bạn cần kết bạn với người này trước khi bắt đầu trò chuyện.');
        return;
      }
      const profileData = typeof match.profile_data === 'string' ? JSON.parse(match.profile_data) : (match.profile_data || {});
      const messageResponse = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: match.match_id, sender_id: userId, text: moment.imageUrl })
      });
      if (!messageResponse.ok) throw new Error('Không gửi được ảnh khoảnh khắc vào cuộc trò chuyện.');
      setActiveChatUser({
        id: Number(match.user_id), userId: Number(match.user_id), matchId: Number(match.match_id),
        name: profileData.name || moment.userName, img: profileData.images?.[0] || moment.userAvatar,
      });
      onNavigate?.('app_chat');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện.');
    }
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
    <div className="h-full w-full flex flex-col bg-[#eaf4ff]">
      {/* Top Banner */}
      <div className="bg-[#eaf4ff] px-4 justify-between flex items-center pt-8 pb-3 z-20 shrink-0 shadow-sm border-b border-black/10 relative">
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
                <div className="flex bg-black/15 rounded-full p-1 w-max gap-1">
                   <button className="bg-white rounded-full px-4 py-1.5 text-[14px] font-bold shadow-sm border border-black/5 flex items-center shrink-0 text-black">
                     Dành Cho Bạn
                   </button>
                   <button onClick={() => setTopActionModal('moments')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white flex items-center gap-1.5 shrink-0 bg-white/20 hover:bg-white/30 transition-colors">
                     <Camera className="w-4 h-4" />
                     <span>Khoảnh khắc</span>
                   </button>
                   <button onClick={() => setTopActionModal(hasPremiumAccess ? 'music' : 'premium')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white flex items-center gap-1.5 shrink-0 bg-cyan-500/40 hover:bg-cyan-500/60 transition-colors">
                     <Music className="w-4 h-4" />
                     <span>Âm nhạc</span>
                     {!hasPremiumAccess && <Lock className="h-3 w-3" />}
                   </button>
                   <button onClick={() => setTopActionModal('astrology')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white flex items-center gap-1 shrink-0 bg-sky-500/45 hover:bg-sky-500/65 transition-colors">
                     <span>Cung hoàng đạo</span>
                   </button>
                   <button onClick={() => setTopActionModal('lunar')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white flex items-center gap-1 shrink-0 bg-amber-500/45 hover:bg-amber-500/65 transition-colors">
                     <span>12 con giáp</span>
                   </button>
                   <button onClick={() => openCupidTool('tarot')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white/90 flex items-center gap-1 shrink-0 bg-violet-500/40 hover:bg-violet-500/60 transition-colors">
                     <span>Trải bài Tarot</span>
                     {!hasPremiumAccess && <Lock className="h-3 w-3" />}
                   </button>
                   <button onClick={() => setTopActionModal('zodiacCompatibility')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white/90 flex items-center gap-1 shrink-0 bg-indigo-500/40 hover:bg-indigo-500/60 transition-colors">
                     <span>Chiêm tinh</span>
                   </button>
                   <button onClick={() => openCupidTool('lunar')} className="rounded-full px-4 py-1.5 text-[14px] font-bold text-white/90 flex items-center gap-1 shrink-0 bg-amber-500/40 hover:bg-amber-500/60 transition-colors">
                     <span>Tử vi</span>
                     {!hasPremiumAccess && <Lock className="h-3 w-3" />}
                   </button>
                </div>
             </div>
             <button 
               onClick={() => setTopActionModal('premium')}
               className="bg-amber-400/25 hover:bg-amber-400/35 p-2 rounded-full shrink-0 border border-amber-300/40 active:scale-95 transition-transform"
               title="Gói Premium DSS Nâng Cao"
             >
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
             </button>
          </div>
        )}
      </div>

      {/* Card area */}
      <div className="flex-1 relative bg-[#f0f9ff] overflow-hidden">
        {profiles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col justify-center items-center gap-5 px-8 text-center">
            <p className="text-lg font-bold text-slate-700">Đã hết hồ sơ trong khu vực của bạn, bạn hãy tăng thêm khoảng cách tối đa để xem thêm hồ sơ</p>
            {onClose ? (
              <button onClick={onClose} className="rounded-full bg-sky-600 px-5 py-3 font-bold text-white shadow-lg active:scale-95">Quay lại khám phá</button>
            ) : (
              <button onClick={() => setTopActionModal('settings')} className="rounded-full bg-sky-600 px-5 py-3 font-bold text-white shadow-lg active:scale-95">Điều chỉnh khoảng cách</button>
            )}
            {canReplay && <>
              <button disabled={isReplaying} onClick={() => { void replayAndReset(); }} className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 font-extrabold text-white shadow-lg active:scale-95 disabled:opacity-60">{isReplaying ? 'Đang tải hồ sơ…' : 'Xem lại hồ sơ'}</button>
              {replayError && <p className="text-sm font-semibold text-rose-600">Chưa thể tải lại hồ sơ. Vui lòng thử lại.</p>}
            </>}
          </div>
        ) : currentProfile?.type === 'advertisement' ? (
          <motion.div key={currentProfile.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white">
            <span className="mb-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800">Quảng cáo</span>
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <img src={currentProfile.image_url} alt={currentProfile.title || 'Sản phẩm quảng cáo'} className="h-72 w-full object-cover" />
              <div className="p-5 text-left">
                <h2 className="text-xl font-extrabold text-slate-900">{currentProfile.title}</h2>
                {currentProfile.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{currentProfile.description}</p>}
                {adTargetUrl ? (
                  <a href={adTargetUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center rounded-xl bg-amber-400 px-4 py-3 font-extrabold text-slate-950 shadow-md hover:bg-amber-300">
                    Tìm hiểu thêm <LucideIcons.ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-red-600">Liên kết quảng cáo không hợp lệ.</p>
                )}
              </div>
            </div>
            <button onClick={handleNext} className="mt-5 rounded-full bg-sky-700 px-6 py-3 font-bold text-white shadow active:scale-95">Tiếp tục xem hồ sơ</button>
          </motion.div>
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
                drag={readOnly ? false : 'x'}
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
                    <span className="mb-2 self-start rounded-full bg-sky-600/90 px-3 py-1 text-xs font-extrabold text-white shadow">{currentProfile.compatibilityScore}% tương thích</span>
                    
                    <div className="relative pointer-events-auto">
  <AnimatePresence mode="wait">
    <motion.div key={"info" + currentImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full flex flex-col gap-2">
      {(() => {
         // Determine which info blocks to show for each image
         const renderElements = [];
         
         const hasMusic = !!currentProfile.songTitle;
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

         const isMusicPriority = settings?.activePriorities?.includes('Âm nhạc');
         const isAstrologyPriority = settings?.activePriorities?.includes('Cung hoàng đạo');

         if (hasMusic && (isMusicPriority || currentImageIndex === targetMusicIndex)) {
            renderElements.push(
              <button
                key="profile_music"
                type="button"
                disabled={!currentProfileAudioUrl}
                onClick={(event) => { event.stopPropagation(); setIsPlaying(value => !value); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-sky-200/60 bg-slate-950/70 px-4 py-3 text-left text-white shadow-lg backdrop-blur-md transition hover:bg-slate-900 disabled:opacity-70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-sky-600 text-slate-950">
                  {isPlaying ? <LucideIcons.Pause className="h-5 w-5 fill-current" /> : <LucideIcons.Play className="h-5 w-5 fill-current" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-sky-200">Âm nhạc yêu thích</span>
                  <span className="block truncate text-sm font-bold">{currentProfile.songTitle}</span>
                </span>
                <LucideIcons.AudioLines className="h-5 w-5 shrink-0 text-sky-200" />
              </button>
            );
         }

         // BioCard (Giới thiệu bản thân) ONLY if currentProfile has a bio, on currentImageIndex === 0
         if (currentImageIndex === 0 && currentProfile.bio && currentProfile.bio.trim() !== '' && !isMusicPriority && !isAstrologyPriority) {
            renderElements.push(
               <BioCard key="bio_card" bio={currentProfile.bio} />
            );
         }

         // 1. Render Common Points ("Điểm chung" or "Tìm người yêu" description card) ONLY on index 0 and ONLY if hasCommonPoints is true
         if (currentImageIndex === 0 && hasCommonPoints && !isMusicPriority && !isAstrologyPriority) {
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
         
         // 2. Render Astrology ("Cung hoàng đạo") card
         const shouldShowAstro = isAstrologyPriority || (currentImageIndex === targetAstrologyIndex && !isMusicPriority);
         if (shouldShowAstro) {
            renderElements.push(
              <div key="astro" className="bg-black/50 backdrop-blur-md px-4 py-3.5 rounded-xl border border-white/20 shadow-sm text-[14px] text-white cursor-pointer transition-all w-full" onClick={(e) => { e.stopPropagation(); setIsAstrologyModalOpen(true); }}>
                 <div className="line-clamp-2">
                   <span className="font-bold text-[#ffd700]">Cung hoàng đạo: </span>
                   <span className="text-white/90">{currentProfile.astrologyMatch}</span>
                 </div>
                 <div className="text-[#ffd700] mt-1 font-bold text-[13px] hover:underline">Xem thêm {'>'}</div>
              </div>
            );
         }

         // 3. Render Badges ("Nhu cầu", "Cung hoàng đạo", "Ngành nghề") at target index
         if (currentImageIndex === targetBadgesIndex && !isMusicPriority && !isAstrologyPriority) {
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

         if (slice.length > 0 && !isMusicPriority && !isAstrologyPriority) {
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
  <audio ref={audioRef} src={currentProfileAudioUrl || undefined} onEnded={() => setIsPlaying(false)} className="hidden" />
</div>
                  </div>
                </div>

                {/* Action Buttons Fixed at Bottom of Profile Card Area */}
                {!readOnly && <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-40 w-full pointer-events-auto">
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
                   <motion.button whileTap={{ scale: 0.85 }} onClick={onAddFriendClick} disabled={isSendingFriendRequest || friendRequestSent} title="Thêm bạn" className="w-[76px] h-[60px] bg-white rounded-full flex flex-col justify-center items-center gap-0.5 shrink-0 shadow-xl border border-sky-200 disabled:opacity-80">
                     <LucideIcons.UserPlus className={`w-6 h-6 stroke-[2.5] ${friendRequestSent ? 'text-emerald-600' : 'text-sky-600'}`} />
                     <span className={`text-[9px] leading-none font-extrabold ${friendRequestSent ? 'text-emerald-700' : 'text-sky-700'}`}>{friendRequestSent ? 'Đã gửi' : isSendingFriendRequest ? 'Đang gửi' : ''}</span>
                   </motion.button>
                </div>}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center h-full text-gray-500 w-full absolute inset-0 font-medium"
            >
              <div className="flex flex-col items-center gap-5 px-8 text-center">
                <p className="font-bold">Đã hết hồ sơ trong khu vực của bạn, bạn hãy tăng thêm khoảng cách tối đa để xem thêm hồ sơ</p>
                {onClose ? (
                  <button onClick={onClose} className="rounded-full bg-sky-600 px-5 py-3 font-bold text-white">Quay lại khám phá</button>
                ) : (
                  <button onClick={() => setTopActionModal('settings')} className="rounded-full bg-sky-600 px-5 py-3 font-bold text-white">Điều chỉnh khoảng cách</button>
                )}
                {canReplay && <>
                  <button disabled={isReplaying} onClick={() => { void replayAndReset(); }} className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 font-extrabold text-white shadow-lg active:scale-95 disabled:opacity-60">{isReplaying ? 'Đang tải hồ sơ…' : 'Xem lại hồ sơ'}</button>
                  {replayError && <p className="text-sm font-semibold text-rose-600">Chưa thể tải lại hồ sơ. Vui lòng thử lại.</p>}
                </>}
              </div>
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
                         <img src={myProfile.images?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-[46px] h-[46px] rounded-full border-[2px] border-[#1e0a45] overflow-hidden shrink-0 bg-gray-500 z-20 shadow-sm">
                         <img src={currentProfile.images?.[0] || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" />
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
          <MusicClipModal
            userId={myProfile?.id || sessionStorage.getItem('user_id') || localStorage.getItem('user_id') || ''}
            currentTitle={myProfile?.songTitle}
            onClose={() => setTopActionModal(null)}
            onSaved={(songTitle) => {
              updateMyProfile({ songTitle, songUrl: '' });
            }}
          />
        )}
        {topActionModal === 'lunar' && (
          <LunarAnimalsModal
            isOpen={topActionModal === 'lunar'}
            onClose={() => setTopActionModal(null)}
            userDob={myProfile?.dob}
            userName={myProfile?.name}
          />
        )}

        {topActionModal === 'moments' && (
          <MomentsView
            onClose={() => setTopActionModal(null)}
            myProfile={myProfile}
            onStartChat={startMomentChat}
          />
        )}

        {topActionModal === 'premium' && (
          <PremiumModal
            isOpen={topActionModal === 'premium'}
            onClose={() => setTopActionModal(null)}
            userName={myProfile?.name}
            onPremiumActivated={() => {
              updateMyProfile({ isPremium: true });
              window.dispatchEvent(new Event('premium_activated'));
            }}
          />
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
                   <h2 className="text-[18px] font-bold">Cung hoàng đạo của bạn</h2>
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
                            <div key={z} className="bg-white/5 p-3 rounded-xl border border-white/10 text-center flex flex-col items-center">
                               <div className="text-2xl mb-1">{ZODIAC_DATA[z]?.symbol}</div>
                               <div className="text-[12px] font-extrabold text-white mb-0.5">{z}</div>
                               <div className={`text-xs font-bold ${score >= 70 ? 'text-sky-300' : 'text-gray-400'}`}>{score}% tương thích</div>
                            </div>
                          );
                       })}
                    </div>
                </div>
             </div>
          </motion.div>
        )}

        {topActionModal === 'zodiacCompatibility' && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[75] flex flex-col bg-[#10152e] text-white"
          >
            <div className="relative shrink-0 border-b border-indigo-200/15 px-4 pb-4 pt-7">
              <button onClick={() => setTopActionModal(null)} className="absolute left-4 top-7 rounded-full bg-white/10 p-1.5 transition-transform active:scale-90" aria-label="Đóng">
                <ChevronDown className="h-6 w-6" />
              </button>
              <div className="text-center">
                <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-indigo-200">Bản đồ kết nối</p>
                <h2 className="mt-1 text-xl font-black">Tương hợp 12 cung hoàng đạo</h2>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-4 pb-5 pt-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.18),_transparent_45%)]" />
              <div className="relative mx-auto max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Cung của bạn', value: compatibilityZodiac, onChange: setCompatibilityZodiac },
                    { label: 'Cung đối phương', value: partnerCompatibilityZodiac, onChange: setPartnerCompatibilityZodiac },
                  ].map(({ label, value, onChange }) => (
                    <label key={label} className="rounded-2xl border border-indigo-100/15 bg-white/[0.07] p-3 shadow-lg shadow-indigo-950/20">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-indigo-100/65">{label}</span>
                      <span className="mb-2 block text-center text-4xl text-indigo-100">{ZODIAC_DATA[value]?.symbol || '✦'}</span>
                      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#191e3c] px-2 py-2 text-center text-sm font-extrabold text-white outline-none focus:border-indigo-300">
                        {ZODIAC_LIST.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="my-4 rounded-3xl border border-indigo-200/20 bg-gradient-to-br from-indigo-500/20 via-white/[0.07] to-sky-400/10 p-5 text-center shadow-xl shadow-indigo-950/25">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-indigo-200/30 bg-[#10152e]/70 shadow-[0_0_35px_rgba(129,140,248,0.22)]">
                    <span className="text-4xl font-black text-indigo-100">{zodiacCompatibilityScore}%</span>
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Độ tương hợp</p>
                  <h3 className="mt-1 text-lg font-black">{compatibilityZodiac} <span className="text-indigo-200">×</span> {partnerCompatibilityZodiac}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{getElementComboText(compatibilityZodiac, partnerCompatibilityZodiac)}</p>
                  <p className="mt-3 text-xs leading-relaxed text-indigo-100/70">Chiêm tinh mang tính tham khảo, giúp hai bạn có thêm góc nhìn để trò chuyện và thấu hiểu nhau.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                    <h3 className="text-sm font-extrabold">Chọn một cung để xem độ tương hợp</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ZODIAC_LIST.map(sign => {
                      const score = calculateZodiacCompatibility(compatibilityZodiac)[sign] || 50;
                      const selected = sign === partnerCompatibilityZodiac;
                      return (
                        <button key={sign} onClick={() => setPartnerCompatibilityZodiac(sign)} className={`rounded-2xl border p-2 text-center transition active:scale-95 ${selected ? 'border-indigo-300 bg-indigo-400/20 shadow-md shadow-indigo-950/30' : 'border-white/10 bg-white/[0.04] hover:bg-white/10'}`}>
                          <span className="block text-2xl">{ZODIAC_DATA[sign]?.symbol || '✦'}</span>
                          <span className="mt-1 block truncate text-[11px] font-extrabold">{sign}</span>
                          <span className={`mt-0.5 block text-[10px] font-bold ${score >= 75 ? 'text-sky-200' : 'text-indigo-100/65'}`}>{score}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#10152e]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <button
                onClick={() => {
                  const promptText = `Cupid AI, hãy phân tích kết quả chiêm tinh tương hợp của cặp ${compatibilityZodiac} và ${partnerCompatibilityZodiac}. Điểm tham khảo hiện tại là ${zodiacCompatibilityScore}%. Hãy giải thích điểm hòa hợp, khác biệt trong cảm xúc và giao tiếp, những điều hai người có thể học hỏi ở nhau, cùng một vài gợi ý hẹn hò và trò chuyện tinh tế. Nhắc mình rằng chiêm tinh chỉ mang tính tham khảo.`;
                  window.dispatchEvent(new CustomEvent('cupid_send_prompt', { detail: { prompt: promptText } }));
                  setTopActionModal(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 px-4 py-3.5 font-extrabold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:brightness-110 active:scale-[0.99]"
              >
                <Send className="h-5 w-5" /> Đưa kết quả cho Cupid AI phân tích
              </button>
            </div>
          </motion.div>
        )}

        {topActionModal === 'tarot' && (
          <TarotInteractiveModal
            isOpen={topActionModal === 'tarot'}
            onClose={() => setTopActionModal(null)}
            onSendToCupid={(promptText) => {
              setTopActionModal(null);
              try {
                const saved = localStorage.getItem('ais_chat_Cupid AI') || localStorage.getItem('cupid_ai_messages') || '[]';
                const parsed = JSON.parse(saved);
                const userMsg = {
                  id: Date.now(),
                  sender: 'me',
                  text: promptText,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                const updated = [...parsed, userMsg];
                localStorage.setItem('ais_chat_Cupid AI', JSON.stringify(updated));
                localStorage.setItem('cupid_ai_messages', JSON.stringify(updated));
                window.dispatchEvent(new CustomEvent('cupid_chat_sync', { detail: { messages: updated } }));
                if (setActiveChatUser) {
                  setActiveChatUser({
                    id: 'cupid-ai',
                    name: 'Cupid AI',
                    img: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800'
                  });
                }
                if (onNavigate) {
                  onNavigate('chats');
                }
              } catch (e) {}
            }}
            userZodiac={myProfile?.zodiac}
            userName={myProfile?.name}
          />
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
                 <div className="mb-6 mt-2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#222b3d] to-[#1a1d29] p-4 shadow-lg shadow-black/10">
                    <div className="mb-3">
                      <h3 className="text-[15px] font-extrabold">Ưu tiên hồ sơ</h3>
                      <p className="mt-1 text-xs leading-relaxed text-white/55">Chọn một hoặc nhiều mục để xếp hồ sơ phù hợp lên trước. Tiêu chí tuổi, khoảng cách và giới tính vẫn được áp dụng.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Dành Cho Bạn', icon: '💞' },
                        { label: 'Khoảnh khắc', icon: '📸' },
                        { label: 'Tử vi', icon: '🐉' },
                        { label: 'Âm nhạc', icon: '🎵' },
                        { label: 'Cung hoàng đạo', icon: '♈' },
                        { label: 'Trải bài Tarot', icon: '🎴' },
                      ].map(({ label, icon }) => {
                        const selected = (localSettings.activePriorities || []).includes(label);
                        return (
                          <button
                            key={label}
                            onClick={() => toggleLocalPriority(label)}
                            aria-pressed={selected}
                            className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12px] font-extrabold transition-all active:scale-[0.98] ${selected ? 'border-sky-300/70 bg-sky-400/15 text-sky-100 shadow-md shadow-sky-950/20' : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.08]'}`}
                          >
                            <span className="text-base">{icon}</span><span className="leading-tight">{label}</span>
                            {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-sky-300" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-white/45">Khoảnh khắc, âm nhạc, ngày sinh, cung hoàng đạo và sở thích Tarot được dùng để xếp hạng; các mục không có dữ liệu sẽ không loại hồ sơ khỏi danh sách.</p>
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
                            min="2" max="1000" 
                            value={localSettings.distance} 
                            onChange={(e) => updateLocalSettings({ distance: parseInt(e.target.value) })}
                            className="w-full absolute inset-0 opacity-0 cursor-pointer z-10" 
                          />
                         <div className="w-full h-[4px] bg-white/20 rounded-full relative pointer-events-none">
                            <div className="absolute left-0 top-0 bottom-0 bg-[#ff2d55] rounded-full" style={{ width: `${(localSettings.distance / 1000) * 100}%` }}></div>
                            <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[#ff2d55] rounded-full shadow-md" style={{ left: `calc(${(localSettings.distance / 1000) * 100}% - 12px)` }}></div>
                         </div>
                      </div>
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
  const { settings, isTestFemaleView, myProfile, serverUsers, likedProfiles, savedProfiles, swipedRecords, fetchMoreUsers, replayProfiles, updateMyProfile } = React.useContext(AppContext);
  const allProfiles = serverUsers;
  const sessionShuffleSeed = React.useRef(Math.random());
  const [feedAdvertisements, setFeedAdvertisements] = useState<any[]>([]);
  const [isPremiumAccount, setIsPremiumAccount] = useState(false);
  const likedProfilesRef = React.useRef(likedProfiles);
  const swipedRecordsRef = React.useRef(swipedRecords);
  likedProfilesRef.current = likedProfiles;
  swipedRecordsRef.current = swipedRecords;

  useEffect(() => {
    let isCurrent = true;
    apiFetch('/api/advertisements/feed')
      .then(response => response.json())
      .then(data => {
        if (!isCurrent || !data.success) return;
        setIsPremiumAccount(!!data.isPremium);
        setFeedAdvertisements(Array.isArray(data.advertisements) ? data.advertisements : []);
      })
      .catch(() => {
        if (isCurrent) {
          setIsPremiumAccount(false);
          setFeedAdvertisements([]);
        }
      });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    const activatePremium = () => setIsPremiumAccount(true);
    window.addEventListener('premium_activated', activatePremium);
    return () => window.removeEventListener('premium_activated', activatePremium);
  }, []);

  const computePool = React.useCallback((usersList: any[]) => {
     let basePool = isTestFemaleView ? [myProfile] : filterProfiles(usersList, settings, myProfile.gender);
     if (!isTestFemaleView) {
        basePool = basePool.filter(p => p.id !== myProfile.id && (!p.email || p.email !== myProfile.email));
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

      const aliases: Record<string, string> = { 'Chiêm tinh': 'Cung hoàng đạo', '12 Con Giáp': 'Tử vi', '12 con giáp': 'Tử vi', 'Tarot': 'Trải bài Tarot', 'Trải bài tarot': 'Trải bài Tarot' };
      const selectedPriorities = [...new Set((Array.isArray(settings.activePriorities) ? settings.activePriorities : ['Dành Cho Bạn']).map((priority: string) => aliases[priority] || priority))].filter((priority: string) => priority !== 'Dành Cho Bạn');
      const getPriorityScore = (profile: any) => {
        const profileInterests = Array.isArray(profile.interests) ? profile.interests : [];
        const matches: Record<string, boolean> = {
          'Khoảnh khắc': Boolean(profile.hasMoments),
          'Tử vi': Boolean(profile.hasBirthDate || profile.dob),
          'Âm nhạc': Boolean(profile.songTitle),
          'Cung hoàng đạo': Boolean(profile.hasZodiac || profile.zodiac),
          'Trải bài Tarot': Boolean(profile.tarotInterest || profileInterests.some((interest: string) => /tarot/i.test(interest))),
        };
        return selectedPriorities.reduce((score: number, priority: string) => score + Number(Boolean(matches[priority])), 0);
      };

      const scoredPool = basePool.map(p => {
        const cpd = getCommonPointsData(p);
        const compatibilityScore = calculateFullCompatibility(myProfile, p).totalScore;
        return {
          ...p,
           compatibilityScore,
           priorityScore: getPriorityScore(p),
          scoredCommonPoints: cpd.count,
          commonPoints: p.commonPoints && p.commonPoints.startsWith('Hợp gu') ? p.commonPoints : cpd.text,
       };
     });

     const likedIds = new Set((likedProfilesRef.current || []).map((profile: any) => Number(profile.id)));
     const viewedIds = new Set((swipedRecordsRef.current || []).map((record: any) => Number(record.target_user_id)));
     const currentFeedProfileId = sessionStorage.getItem('swipe_id_feed');
     const feedPool = scoredPool.filter(profile =>
       !likedIds.has(Number(profile.id))
       && (!viewedIds.has(Number(profile.id)) || String(profile.id) === String(currentFeedProfileId))
     );
     const tieScore = (profile: any) => Math.sin((Number(profile.id) || 0) * 12.9898 + sessionShuffleSeed.current * 78.233);

      return [...feedPool].sort((a, b) => {
         const compatibilityDiff = b.compatibilityScore - a.compatibilityScore;
         if (compatibilityDiff) return compatibilityDiff;
         const priorityDiff = b.priorityScore - a.priorityScore;
         if (priorityDiff) return priorityDiff;
         if (Boolean(a.isPremium) !== Boolean(b.isPremium)) return a.isPremium ? -1 : 1;
         const distanceA = a.distanceKm == null ? Number.POSITIVE_INFINITY : Number(a.distanceKm);
        const distanceB = b.distanceKm == null ? Number.POSITIVE_INFINITY : Number(b.distanceKm);
        if (distanceA !== distanceB) return distanceA - distanceB;
        const createdA = new Date(a.createdAt || 0).getTime() || 0;
        const createdB = new Date(b.createdAt || 0).getTime() || 0;
        if (createdA !== createdB) return createdB - createdA;
        return tieScore(a) - tieScore(b);
     });
  }, [settings, myProfile, isTestFemaleView]);

  const [activePool, setActivePool] = useState<any[]>(() => computePool(allProfiles));
  const profilesWithAds = React.useMemo(() => {
    if (isPremiumAccount || feedAdvertisements.length === 0) return activePool;
    const items: any[] = [];
    activePool.forEach((profile, index) => {
      items.push(profile);
      const shouldInsertAd = (index + 1) % 5 === 0 && index < activePool.length - 1;
      if (shouldInsertAd) {
        const ad = feedAdvertisements[Math.floor(index / 5) % feedAdvertisements.length];
        items.push({ ...ad, type: 'advertisement', id: `ad-${ad.id}-${index + 1}` });
      }
    });
    return items;
  }, [activePool, feedAdvertisements, isPremiumAccount]);

  const candidateSignature = allProfiles.map(profile => `${profile.id}:${profile.distanceKm ?? 'x'}:${profile.createdAt || ''}`).join(',');
  const currentPrefRefString = `${candidateSignature}-${JSON.stringify(settings)}-${JSON.stringify([myProfile.id, myProfile.lat, myProfile.lng, myProfile.dob, myProfile.zodiac, myProfile.pet, myProfile.music, myProfile.book, myProfile.food, myProfile.travel, myProfile.game, myProfile.sport, myProfile.religion, myProfile.need, myProfile.job])}-${isTestFemaleView}`;
  const lastPrefRefKey = useRef<string>(currentPrefRefString);

  useEffect(() => {
    const prefRefKey = `${candidateSignature}-${JSON.stringify(settings)}-${JSON.stringify([myProfile.id, myProfile.lat, myProfile.lng, myProfile.dob, myProfile.zodiac, myProfile.pet, myProfile.music, myProfile.book, myProfile.food, myProfile.travel, myProfile.game, myProfile.sport, myProfile.religion, myProfile.need, myProfile.job])}-${isTestFemaleView}`;
    const prefChanged = lastPrefRefKey.current !== prefRefKey;
    
    if (prefChanged) {
       lastPrefRefKey.current = prefRefKey;
       setActivePool(computePool(allProfiles));
    }
  }, [allProfiles, candidateSignature, settings, myProfile, isTestFemaleView, activePool.length, computePool]);

  return (
    <ProfileSwiper 
       profiles={profilesWithAds} 
       title="Dành cho bạn" 
       storageKey="swipe_id_feed"
       canReplay={isPremiumAccount}
       onReplay={async () => {
          const replayed = await replayProfiles();
           return replayed;
       }}
       onReachEnd={() => {
          sessionStorage.removeItem('swipe_id_feed');
          if (fetchMoreUsers) fetchMoreUsers();
       }} 
    />
  );
}

// Explore View
export function ExploreView() {
  const { exploreUsers, myProfile, fetchMoreUsers } = React.useContext(AppContext);
  const [selectedMainCategory, setSelectedMainCategory] = useState<any>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<any>(null);

  useEffect(() => { fetchMoreUsers(true); }, [fetchMoreUsers]);
  const filteredExploreProfiles = (exploreUsers || []).filter(profile => Number(profile.id) !== Number(myProfile.id));
  const normalizeExploreValue = (value: any): string => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  const flattenExploreValues = (value: any): string[] => {
    if (Array.isArray(value)) return value.flatMap(flattenExploreValues);
    if (value && typeof value === 'object') return Object.values(value).flatMap(flattenExploreValues);
    return value == null ? [] : [String(value)];
  };
  const hasExploreValue = (value: any, reject: string[] = []) =>
    flattenExploreValues(value).some(item => {
      const clean = normalizeExploreValue(item);
      return !!clean && !['khac', 'khong ro', 'chua cap nhat', 'khong nuoi', 'khong choi', ...reject].some(word => clean === normalizeExploreValue(word));
    });
  const hasInterest = (profile: any, words: string[]) => {
    const interests = flattenExploreValues(profile.interests).map(normalizeExploreValue);
    return interests.some(interest => words.some(word => interest.includes(normalizeExploreValue(word))));
  };

  const checkNeed = (needVal: any, allowedValues: string[]) => {
     const values = flattenExploreValues(needVal).map(normalizeExploreValue).filter(Boolean);
     const allowed = allowedValues.map(normalizeExploreValue);
     return values.some(value => allowed.some(item => value.includes(item) || item.includes(value)));
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
         { id: 'thu_cung', title: 'Yêu thú cưng', icon: '🐶', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.pet || p.lifestyle?.pet, ['khong nuoi', 'di ung voi dong vat'])) },
         { id: 'nghe_nhac', title: 'Đam mê âm nhạc', icon: '🎧', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.music || p.lifestyle?.music)) },
         { id: 'du_lich', title: 'Thích xê dịch', icon: '✈️', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.travel || p.lifestyle?.travel)) }
       ]
    },
    { 
       id: 'so_thich',
       title: 'Sở thích chung', 
       img: 'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?auto=format&fit=crop&q=80&w=800',
       subCategories: [
         { id: 'the_thao', title: 'Yêu thể thao', icon: '⚽', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.sport || p.lifestyle?.sport, ['luoi van dong']) || hasInterest(p, ['sport', 'the thao', 'gym', 'yoga', 'bong', 'chay'])) },
         { id: 'am_thuc', title: 'Đam mê ẩm thực', icon: '🍜', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.food || p.lifestyle?.food) || hasInterest(p, ['food', 'am thuc', 'nau an', 'ca phe'])) },
         { id: 'game', title: 'Mê Game', icon: '🎮', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.game || p.lifestyle?.game, ['khong choi']) || hasInterest(p, ['game', 'tro choi'])) },
         { id: 'sach', title: 'Mọt sách', icon: '📚', profiles: filteredExploreProfiles.filter((p: any) => hasExploreValue(p.book || p.lifestyle?.book) || hasInterest(p, ['book', 'sach', 'doc'])) },
       ]
    },
  ];

  if (selectedSubCategory) {
     return (
       <div className="absolute inset-0 z-50 bg-[#eaf4ff]">
         <ProfileSwiper profiles={selectedSubCategory.profiles} title={selectedSubCategory.title} onClose={() => setSelectedSubCategory(null)} />
       </div>
     );
  }

  if (selectedMainCategory) {
     return (
       <div className="bg-[#eaf4ff] h-full w-full flex flex-col pt-8 overflow-hidden absolute inset-0 z-50">
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
                       className="bg-[#f0f9ff] rounded-[24px] aspect-square flex flex-col items-center justify-center p-4 border border-black/5 shadow-sm cursor-pointer"
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
    <div className="bg-[#eaf4ff] h-full flex flex-col p-4 pt-8 overflow-hidden">
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
  const { likedProfiles, toggleLike, onNavigate, setActiveChatUser, myProfile, serverUsers } = React.useContext(AppContext);
  const [activeTab, setActiveTab] = useState<'liked'|'received'|'friends'|'moments'>('received');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [ownMoments, setOwnMoments] = useState<any[]>([]);
  const [selectedOwnMoment, setSelectedOwnMoment] = useState<any>(null);
  const [momentReactions, setMomentReactions] = useState<any[]>([]);



  useEffect(() => {
     let active = true;
     const fetchMatches = async () => {
        const userId = sessionStorage.getItem('user_id');
        if (userId) {
           try {
              const res = await apiFetch(`/api/likes/${userId}`);
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
                         dob: profileData.dob || '2001-01-01',
                         zodiac: profileData.zodiac || 'Song Tử',
                         food: profileData.food || profileData.lifestyle?.food,
                         travel: profileData.travel || profileData.lifestyle?.travel,
                         sport: profileData.sport || profileData.lifestyle?.sport,
                         music: profileData.music || profileData.lifestyle?.music,
                         need: profileData.need || profileData.intent,
                         communicationStyle: profileData.communicationStyle,
                         pet: profileData.pet || profileData.lifestyle?.pet,
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

  useEffect(() => {
    let active = true;
    const userId = sessionStorage.getItem('user_id');
    if (!userId) return () => { active = false; };
    Promise.all([
      apiFetch('/api/friend-requests/incoming').then(response => response.json()),
      apiFetch('/api/moments/mine').then(response => response.json()),
    ]).then(([requestResult, momentResult]) => {
      if (!active) return;
      if (Array.isArray(requestResult?.data)) {
        setFriendRequests(requestResult.data.map((request: any) => {
          const profile = typeof request.profile_data === 'string' ? JSON.parse(request.profile_data) : (request.profile_data || {});
          return {
            id: Number(request.user_id), requestId: Number(request.request_id), name: profile.name || 'Người dùng mới',
            time: request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Vừa xong',
            count: profile.location || profile.hometown || 'Gần bạn', dob: profile.dob || '2001-01-01', zodiac: profile.zodiac || '',
            food: profile.food || profile.lifestyle?.food, travel: profile.travel || profile.lifestyle?.travel,
            sport: profile.sport || profile.lifestyle?.sport, music: profile.music || profile.lifestyle?.music,
            need: profile.need || profile.intent || profile.intents, communicationStyle: profile.communicationStyle,
            pet: profile.pet || profile.lifestyle?.pet, img: profile.images?.[0] || request.user_avatar || '', ...profile,
          };
        }));
      }
      if (Array.isArray(momentResult?.data)) setOwnMoments(momentResult.data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Map contextual profiles to the list format
  const mappedLiked = (likedProfiles || [])
    .filter(p => p && p.id)
    .map(p => ({
      ...p,
      id: p.id,
      name: p.name || 'Người dùng mới',
      time: 'Vừa xong',
      count: p.distance || 'Gần bạn',
      img: p.images && p.images.length > 0 ? p.images[0] : (p.img || 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&q=80&w=800')
    }));

  const mappedFriends = friendRequests.filter(profile => profile && profile.id).map(profile => ({ ...profile, img: profile.img || profile.images?.[0] || "" }));

  // Enrich profile with 4-pillar compatibility calculation
  const enrichWithCompatibility = (profile: any) => {
    const fullServerUser = serverUsers?.find(u => u.id === profile.id);
    const partnerData = {
      ...profile,
      ...(fullServerUser || {}),
      dob: profile.dob || fullServerUser?.dob || '2001-01-01',
      zodiac: profile.zodiac || fullServerUser?.zodiac || 'Kim Ngưu',
      food: profile.food || fullServerUser?.food || 'Cà phê',
      travel: profile.travel || fullServerUser?.travel || 'Đà Lạt',
      sport: profile.sport || fullServerUser?.sport || 'Gym',
      music: profile.music || fullServerUser?.music || 'V-pop',
      need: profile.need || fullServerUser?.need || 'Tìm người yêu',
      communicationStyle: profile.communicationStyle || fullServerUser?.communicationStyle || 'Nhắn tin nhiều hơn',
      pet: profile.pet || fullServerUser?.pet || 'Yêu thích'
    };

    const comp = calculateFullCompatibility(myProfile, partnerData);
    return {
      ...profile,
      partnerData,
      compatibilityScore: comp.totalScore,
      compatibilityBreakdown: comp.breakdown,
      compatibilitySummary: comp.summaryText
    };
  };

  const rawList = activeTab === 'liked' ? mappedLiked : activeTab === 'friends' ? mappedFriends : activeTab === 'received' ? receivedLikes : [];

  // Compute percentage and sort descending by compatibilityScore (highest at the top)
  const displayList = rawList
    .map(enrichWithCompatibility)
    .sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));

  const handleProfileClick = (like: any) => {
    setSelectedProfile(like);
  };

  const respondFriendRequest = async (profile: any, response: 'accept' | 'reject') => {
    try {
      const resultResponse = await apiFetch(`/api/friend-requests/${profile.requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      const result = await resultResponse.json();
      if (!resultResponse.ok) throw new Error(result.error || 'Không cập nhật được lời mời kết bạn.');
      setFriendRequests(previous => previous.filter(request => request.requestId !== profile.requestId));
      if (response === 'accept') {
        setSelectedProfile({ ...profile, matchId: result.match_id });
        setShowMatch(true);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không cập nhật được lời mời kết bạn.');
    }
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

  const openMomentReactions = async (moment: any) => {
    setSelectedOwnMoment(moment);
    setMomentReactions([]);
    try {
      const response = await apiFetch(`/api/moments/${moment.id}/reactions`);
      const result = await response.json();
      if (response.ok && Array.isArray(result.data)) setMomentReactions(result.data);
    } catch { setMomentReactions([]); }
  };

  return (
    <div className="bg-[#eaf4ff] min-h-full flex flex-col relative overflow-hidden">
      <h1 className="text-[28px] font-bold p-6 pt-10 pb-4 shrink-0">Hoạt động</h1>
      
      <div className="flex px-3 border-b border-black/10 shrink-0 gap-1">
        {([
          ['received', 'Lượt thích'],
          ['liked', 'Đã thích'],
          ['friends', 'Bạn mới'],
          ['moments', 'Khoảnh khắc'],
        ] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 pb-3 pt-1 text-[16px] font-semibold text-center relative outline-none">
            <span className={activeTab === tab ? 'font-extrabold text-sky-800' : 'text-black/60'}>{label}</span>
            {activeTab === tab && <motion.div layoutId="likesTabOutline" className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-sky-600 z-0 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 relative pb-24 overflow-y-auto w-full">
         {activeTab === 'moments' ? (
           <div className="grid grid-cols-2 gap-3 p-4 max-w-sm mx-auto w-full">
             {ownMoments.map(moment => (
               <button key={moment.id} onClick={() => openMomentReactions(moment)} className="overflow-hidden rounded-2xl bg-white text-left shadow-sm border border-sky-100">
                 <img src={moment.imageUrl} alt="Khoảnh khắc của bạn" className="w-full aspect-square object-cover" />
                 <div className="p-2.5">
                   <p className="text-xs font-semibold text-slate-800 line-clamp-2">{moment.caption || 'Khoảnh khắc'}</p>
                   <p className="mt-1 text-[11px] font-bold text-sky-700">{Object.values(moment.reactions || {}).reduce((sum: number, count: any) => sum + Number(count || 0), 0)} biểu cảm ? Xem ai đã thích?</p>
                 </div>
               </button>
             ))}
             {ownMoments.length === 0 && <p className="col-span-2 mt-10 text-center text-sm font-semibold text-slate-500">Bạn chưa đăng khoảnh khắc nào.</p>}
           </div>
         ) : (
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
                   className={`bg-white rounded-[16px] p-3 mx-1 flex items-center justify-between shadow-sm active:scale-95 transition-transform group border border-white hover:border-black/5 cursor-pointer`}
                 >
                   <div className="flex items-center gap-4">
                     <img src={like.img} className="w-[52px] h-[52px] rounded-full object-cover group-hover:scale-105 transition-transform" />
                     <div>
                       <div className="flex items-center gap-1.5">
                         <p className="font-bold text-[16px] text-black">{like.name}</p>
                         {like.zodiac && (
                           <span className="text-[11px] font-medium text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded">
                             {like.zodiac}
                           </span>
                         )}
                       </div>
                       <p className="text-[13px] text-gray-500 font-medium leading-tight">{like.time}</p>
                       {activeTab === 'received' ? 
                         <p className="text-[13px] text-black font-medium mt-1">Đã thích bạn</p> :
                         <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                           {activeTab === 'friends' ? <LucideIcons.UserPlus className="w-[14px] h-[14px] stroke-[2.5] text-sky-600" /> : <Heart className="w-[14px] h-[14px] stroke-[2.5] text-[#ff2d55]" />}
                           <span className={`text-[13px] font-bold ${activeTab === 'friends' ? 'text-sky-600' : 'text-[#ff2d55]'}`}>{like.count}</span>
                         </div>
                       }
                     </div>
                   </div>

                   <div className="flex items-center gap-2.5">
                     <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-black text-white flex items-center gap-1 shadow-xs ${
                           (like.compatibilityScore || 80) >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                           (like.compatibilityScore || 80) >= 80 ? 'bg-gradient-to-r from-sky-500 to-blue-600' :
                           'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}>
                           <Zap className="w-3.5 h-3.5 fill-current" />
                           <span>{like.compatibilityScore || 80}% hợp</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold max-w-[100px] text-right truncate">
                           {like.compatibilityBreakdown?.lunar?.relation?.split('(')[0] || 'Tương hợp cao'}
                        </span>
                     </div>
                     {activeTab === 'received' && (
                        <div className="w-9 h-9 rounded-full bg-[#eaf4ff]/20 flex justify-center items-center shrink-0">
                           <Heart className="w-4 h-4 text-[#ff2d55] fill-[#ff2d55]" />
                        </div>
                     )}
                     {activeTab === 'friends' && (
                       <div className="flex items-center gap-1">
                         <button title="Đồng ý kết bạn" onClick={event => { event.stopPropagation(); respondFriendRequest(like, 'accept'); }} className="rounded-full bg-emerald-500 p-2 text-white shadow-sm active:scale-90"><Check className="h-4 w-4 stroke-[3]" /></button>
                         <button title="Từ chối" onClick={event => { event.stopPropagation(); respondFriendRequest(like, 'reject'); }} className="rounded-full bg-rose-500 p-2 text-white shadow-sm active:scale-90"><X className="h-4 w-4 stroke-[3]" /></button>
                       </div>
                     )}
                   </div>
                 </motion.div>
               ))}
               {displayList.length === 0 && (
                 <div className="text-center text-black/60 font-medium mt-10">
                   {activeTab === 'friends' ? 'Chưa có hồ sơ nào được lưu.' : activeTab === 'liked' ? 'Bạn chưa thích ai.' : 'Chưa có lượt thích nào.'}
                 </div>
               )}
            </motion.div>
         </AnimatePresence>
         )}
      </div>

      {/* Received Profile Viewer Overlay */}
      <AnimatePresence>
        {selectedProfile && !showMatch && (
           <motion.div
             initial={{ opacity: 0, y: 200 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 200 }}
             className="absolute inset-0 z-[100] bg-[#f0f9ff] flex flex-col px-4 pt-10 pb-20 overflow-hidden"
           >
              <div className="w-full flex-1 relative bg-white rounded-[24px] shadow-xl overflow-hidden border border-black/10 flex flex-col mb-4 overflow-y-auto">
                <div className="relative w-full h-[280px] shrink-0 bg-black">
                  <img src={selectedProfile.img} alt="Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 pt-20 pb-4 px-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none flex flex-col justify-end">
                     <div className="flex items-center justify-between">
                       <h2 className="text-[28px] font-extrabold text-white tracking-tight">{selectedProfile.name}</h2>
                       <div className="px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-sm flex items-center gap-1 shadow-md">
                         <Zap className="w-4 h-4 fill-current" />
                         <span>{selectedProfile.compatibilityScore || 85}% tương thích</span>
                       </div>
                     </div>
                     <p className="text-xs text-sky-200 mt-0.5">{selectedProfile.count || 'Gần bạn'} • {selectedProfile.time || 'Vừa xong'}</p>
                  </div>
                </div>

                {/* 4-Pillar Compatibility Breakdown Section */}
                <div className="p-5 space-y-4">
                  <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">Đánh giá hòa hợp 4 trụ cột</span>
                      <span className="text-xs font-black text-sky-700">{selectedProfile.compatibilityScore || 85}/100%</span>
                    </div>
                    <p className="text-xs text-sky-800 font-medium leading-relaxed">
                      {selectedProfile.compatibilitySummary || 'Hai bạn có tần số rung động và lối sống rất đồng điệu!'}
                    </p>
                  </div>

                  {selectedProfile.compatibilityBreakdown && (
                    <div className="space-y-3">
                      {/* Trụ cột 1: Sở thích */}
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>🎨</span> Sở thích chung (25%)
                          </span>
                          <span className="font-extrabold text-blue-600">
                            {selectedProfile.compatibilityBreakdown.interests.score}/25đ ({selectedProfile.compatibilityBreakdown.interests.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1.5">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all" 
                            style={{ width: `${selectedProfile.compatibilityBreakdown.interests.percent}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {selectedProfile.compatibilityBreakdown.interests.details}
                        </p>
                      </div>

                      {/* Trụ cột 2: Phong cách sống */}
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>🌿</span> Phong cách sống (25%)
                          </span>
                          <span className="font-extrabold text-emerald-600">
                            {selectedProfile.compatibilityBreakdown.lifestyle.score}/25đ ({selectedProfile.compatibilityBreakdown.lifestyle.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1.5">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${selectedProfile.compatibilityBreakdown.lifestyle.percent}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {selectedProfile.compatibilityBreakdown.lifestyle.details}
                        </p>
                      </div>

                      {/* Trụ cột 3: 12 Con Giáp */}
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>🐾</span> 12 Con Giáp (25%)
                          </span>
                          <span className="font-extrabold text-amber-600">
                            {selectedProfile.compatibilityBreakdown.lunar.score}/25đ ({selectedProfile.compatibilityBreakdown.lunar.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1.5">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all" 
                            style={{ width: `${selectedProfile.compatibilityBreakdown.lunar.percent}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {selectedProfile.compatibilityBreakdown.lunar.animalA} & {selectedProfile.compatibilityBreakdown.lunar.animalB} • {selectedProfile.compatibilityBreakdown.lunar.relation}
                        </p>
                      </div>

                      {/* Trụ cột 4: Chiêm tinh */}
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>✨</span> Chiêm tinh hoàng đạo (25%)
                          </span>
                          <span className="font-extrabold text-purple-600">
                            {selectedProfile.compatibilityBreakdown.zodiac.score}/25đ ({selectedProfile.compatibilityBreakdown.zodiac.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1.5">
                          <div 
                            className="bg-purple-500 h-full rounded-full transition-all" 
                            style={{ width: `${selectedProfile.compatibilityBreakdown.zodiac.percent}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {selectedProfile.compatibilityBreakdown.zodiac.signA} & {selectedProfile.compatibilityBreakdown.zodiac.signB} • {selectedProfile.compatibilityBreakdown.zodiac.relation}
                        </p>
                      </div>
                    </div>
                  )}
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
                 {activeTab !== 'liked' && activeTab !== 'friends' && (
                    <button onClick={() => {
                        // Nếu ở tab "Lượt thích" (received) thì hành động này là "Chấp nhận" => tạo match_id để mở chat
                        const myId = sessionStorage.getItem('user_id');
                        if (activeTab === 'received' && myId) {
                            apiFetch('/api/matches/swipe', {
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
            className="absolute inset-0 z-[110] bg-[#eaf4ff] flex flex-col items-center justify-center p-6 text-black"
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
      {selectedOwnMoment && (
        <div className="absolute inset-0 z-[120] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[90%] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-4">
              <h2 className="font-extrabold text-slate-900">Ai đã biểu cảm?</h2>
              <button onClick={() => setSelectedOwnMoment(null)} className="rounded-full bg-slate-100 p-2 text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <img src={selectedOwnMoment.imageUrl} alt="Khoảnh khắc của bạn" className="w-full max-h-80 object-cover" />
            {selectedOwnMoment.caption && <p className="px-4 pt-3 text-sm font-medium text-slate-800">{selectedOwnMoment.caption}</p>}
            <div className="space-y-2 p-4">
              {momentReactions.map((reaction, index) => (
                <div key={String(reaction.userId) + '-' + index} className="flex items-center gap-3 rounded-xl bg-sky-50 p-2.5">
                  <img src={reaction.userAvatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(reaction.userName))} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <span className="flex-1 text-sm font-bold text-slate-800">{reaction.userName}</span>
                  <span className="text-xl">{{ heart: '❤️', smile: '😄', surprised: '😮', sad: '😢' }[reaction.reaction]}</span>
                </div>
              ))}
              {momentReactions.length === 0 && <p className="py-5 text-center text-sm text-slate-500">Chưa có ai biểu cảm.</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Chat View
export function ChatView() {
  const { activeChatUser, setActiveChatUser, likedProfiles, serverUsers, updateMyProfile, myProfile } = React.useContext(AppContext);
  const [activeChat, setActiveChat] = useState<{id?: number, matchId?: number, name: string, img: string} | null>(activeChatUser || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showInfoProfile, setShowInfoProfile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  const partnerProfile = React.useMemo(() => {
     if (!activeChat) return null;
     const inServer = serverUsers.find((u:any) => u.id === activeChat.id || u.id === (activeChat as any).userId);
     if (inServer) return inServer;
     const inLiked = likedProfiles.find((u:any) => u.id === activeChat.id || u.id === (activeChat as any).userId);
     if (inLiked) return inLiked;
     const isAi = activeChat.name === 'Cupid AI' || activeChat.name === 'Darling';
     return { 
       id: activeChat.id || 9999, 
       ...activeChat, 
       name: activeChat.name, 
       images: (activeChat as any).images || [activeChat.img], 
       bio: isAi ? 'Cupid AI - Chuyên gia tư vấn tình cảm, Tarot & Chiêm tinh học' : ((activeChat as any).bio || 'Người dùng'), 
       location: (activeChat as any).location || 'Hà Nội' 
     };
  }, [activeChat, serverUsers, likedProfiles]);
  
  // Custom states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatTheme, setChatTheme] = useState('#ff2d55');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationsEnabledRef = useRef(true);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);
  const [showMedia, setShowMedia] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Modals & Alerts
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<{title: string, text: string} | null>(null);

  const emojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','🥹','😊','😇','🙂','🙃','😉','😍','🥰','😘','😗','😙','😚','🤗','🤭','🫢','🤔','🫡','😎','🥳','😭','😢','😤','😡','🤯','🥺','😴','🤒','👋','🤝','🙏','👏','🙌','👍','👎','👌','🫶','❤️','🧡','💛','💚','💙','💜','🤍','🖤','💔','💕','💞','💘','💖','💗','💓','💝','💌','💋','🔥','✨','🌟','🎉','🎊','🌹','🌷','🍀','☀️','🌙','☕','🍰','🎵','💯'];
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollCorrectionRef = useRef<{ height: number; top: number } | null>(null);
  const followMessagesRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef(0);

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

  const isAiChat = activeChat?.name === 'Cupid AI' || activeChat?.name === 'Darling';
  const canChat = isAiChat || !!activeChat?.matchId;

  useEffect(() => {
    let interval: any;
    if (activeChat) {
      let hasInitialSnapshot = false;
      let isFetchingMessages = false;
      lastMessageIdRef.current = 0;
      setHasOlderMessages(false);
      const fetchMessages = () => {
         if (activeChat.matchId && !isAiChat && !isFetchingMessages) {
           isFetchingMessages = true;
           const myId = sessionStorage.getItem('user_id');
           const cursor = hasInitialSnapshot ? `&after_id=${lastMessageIdRef.current}` : '';
           apiFetch(`/api/messages/${activeChat.matchId}?user_id=${myId}${cursor}`)
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
                    
                     const isInitialLoad = !hasInitialSnapshot;
                     const arrived = isInitialLoad ? [] : newMessages.filter((message: any) => message.sender === 'them');
                     hasInitialSnapshot = true;
                     if (newMessages.length) {
                       lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...newMessages.map((message: any) => Number(message.id) || 0));
                     }
                     if (arrived.length && notificationsEnabledRef.current) {
                       const latest = arrived[arrived.length - 1];
                       playBlingSound();
                       setNotification({ title: activeChat.name, text: latest.text || 'Đã gửi một nội dung mới' });
                       window.setTimeout(() => setNotification(null), 3500);
                       if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                         new Notification(activeChat.name, { body: latest.text || 'Đã gửi một nội dung mới', icon: activeChat.img });
                       }
                     }
                      if (isInitialLoad) {
                        setHasOlderMessages(newMessages.length === 100);
                        setMessages(newMessages);
                      } else if (newMessages.length) {
                        setMessages(previous => {
                          const merged = [...previous];
                          newMessages.forEach((message: any) => {
                            const optimisticIndex = message.sender === 'me'
                              ? merged.findIndex((existing: any) => existing.pending && existing.sender === 'me' && existing.text === message.text)
                              : -1;
                            if (optimisticIndex >= 0) merged[optimisticIndex] = message;
                            else if (!merged.some((existing: any) => String(existing.id) === String(message.id))) merged.push(message);
                          });
                          return merged.slice(-300);
                        });
                      }
                }
             })
              .catch(() => {})
              .finally(() => { isFetchingMessages = false; });
         }
      };

      try {
        const storedTheme = localStorage.getItem('ais_theme_' + activeChat.name);
        if (storedTheme) setChatTheme(storedTheme);
        
        fetchMessages();
        interval = setInterval(fetchMessages, 1200);
        
        if (!activeChat.matchId || activeChat.name === 'Cupid AI' || activeChat.name === 'Darling') {
            const raw = localStorage.getItem('ais_chat_' + activeChat.name) || (activeChat.name === 'Cupid AI' ? localStorage.getItem('cupid_ai_messages') : null);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                setMessages(parsed);
              } catch(e) {
                setMessages([]);
              }
            } else if (activeChat.name === 'Cupid AI') {
              const defaultGreeting = [
                {
                  id: 1,
                  sender: 'them',
                  text: `Chào bạn, mình là **Cupid AI**! 🕊️💖\n\nLà người bạn đồng hành thấu cảm và tinh tế, mình ở đây để lắng nghe và chia sẻ cùng bạn mọi câu chuyện tình cảm, tâm lý giao tiếp lứa đôi, cũng như trải bài Tarot, Chiêm tinh 12 cung hoàng đạo và Tử vi 12 con giáp.\n\nHôm nay bạn đang có câu chuyện ngọt ngào nào muốn chia sẻ, hay có băn khoăn gì về chuyện tình cảm cần Cupid gỡ rối không nè? ✨`,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ];
              setMessages(defaultGreeting);
              localStorage.setItem('ais_chat_Cupid AI', JSON.stringify(defaultGreeting));
              localStorage.setItem('cupid_ai_messages', JSON.stringify(defaultGreeting));
            } else {
              setMessages([]);
            }
        }
      } catch(e) {}
    } else {
        setMessages([]);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [activeChat]);

  const loadOlderMessages = async () => {
    const firstMessage = messages.find(message => Number.isSafeInteger(Number(message.id)) && Number(message.id) > 0);
    if (!activeChat?.matchId || !firstMessage || isLoadingOlderMessages) return;
    const myId = sessionStorage.getItem('user_id');
    const container = messagesScrollRef.current;
    const previousHeight = container?.scrollHeight || 0;
    const previousTop = container?.scrollTop || 0;
    setIsLoadingOlderMessages(true);
    try {
      const response = await apiFetch(`/api/messages/${activeChat.matchId}?user_id=${myId}&before_id=${Number(firstMessage.id)}`);
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.data)) return;
      const olderMessages = data.data.map((message: any) => ({
        id: message.id,
        sender: Number(message.sender_id) === Number(myId) ? 'me' : 'them',
        text: message.text ?? message.content,
        isImage: !!message.is_image || String(message.text ?? message.content ?? '').startsWith('data:image/'),
        isAudio: String(message.text ?? message.content ?? '').startsWith('data:audio/'),
        time: new Date(message.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setHasOlderMessages(olderMessages.length === 100);
      if (olderMessages.length) {
        pendingScrollCorrectionRef.current = { height: previousHeight, top: previousTop };
        setMessages(previous => {
          const existingIds = new Set(previous.map(message => String(message.id)));
          return [...olderMessages.filter((message: any) => !existingIds.has(String(message.id))), ...previous];
        });
      }
    } catch {
      popAlert('Không tải được tin nhắn cũ. Hãy thử lại.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  useEffect(() => {
    if (activeChat && messages.length > 0) {
      localStorage.setItem('ais_chat_' + activeChat.name, JSON.stringify(messages));
      if (activeChat.name === 'Cupid AI') {
        localStorage.setItem('cupid_ai_messages', JSON.stringify(messages));
        window.dispatchEvent(new CustomEvent('cupid_chat_sync', { detail: { messages, source: 'chat_view' } }));
      }
    }
  }, [messages, activeChat]);

  // Real-time two-way synchronization listener for Cupid AI with CupidChatBubble
  useEffect(() => {
    if (activeChat?.name === 'Cupid AI') {
      const handleSync = (e: any) => {
        const payload = e?.detail;
        if (payload?.source === 'chat_view') return; // Ignore own broadcast
        const incoming = Array.isArray(payload) ? payload : payload?.messages;
        if (Array.isArray(incoming)) {
          const normalized = incoming.map((m: any) => ({
            ...m,
            sender: m.sender === 'cupid' ? 'them' : m.sender
          }));
          setMessages(prev => {
            if (JSON.stringify(prev) === JSON.stringify(normalized)) return prev;
            return normalized;
          });
        }
      };

      window.addEventListener('cupid_chat_sync', handleSync);
      window.addEventListener('storage', handleSync);
      return () => {
        window.removeEventListener('cupid_chat_sync', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }
  }, [activeChat]);

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
       const correction = pendingScrollCorrectionRef.current;
       if (correction && messagesScrollRef.current) {
         messagesScrollRef.current.scrollTop = correction.top + (messagesScrollRef.current.scrollHeight - correction.height);
         pendingScrollCorrectionRef.current = null;
       } else if (followMessagesRef.current) {
         endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
       }
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
          
           const res = await apiFetch('/api/chat/cupid', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ messages: historyToSend })
           });

           if (!res.ok) {
             const errorData = await res.json().catch(() => ({}));
             if (res.status === 429 && errorData.code === 'CUPID_DAILY_LIMIT') {
               setMessages(prev => [...prev, {
                 id: Date.now() + 1,
                 text: errorData.error || 'Bạn đã hết 3 lượt Cupid AI miễn phí hôm nay. Nâng cấp Premium để tiếp tục trò chuyện.',
                 sender: 'them',
                 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
               }]);
               setIsTyping(false);
               setIsPremiumModalOpen(true);
               return;
             }
             throw new Error(errorData.error || 'Cupid AI hiện chưa thể trả lời. Vui lòng thử lại.');
           }

           if (!res.body) {
              setIsTyping(false);
              return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          const aiMessageId = Date.now() + 1;

          // Immediately add a message placeholder for the streaming answer
          setMessages(prev => [...prev, {
              id: aiMessageId,
              text: "",
              sender: "them",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setIsTyping(false);

          let accumulatedText = "";
          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              accumulatedText += chunk;
              // Stream text into the message
              setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, text: accumulatedText } : m));
          }

          if (notificationsEnabled && accumulatedText) {
              playBlingSound();
              setNotification({ title: 'Cupid AI', text: accumulatedText });
              setTimeout(() => setNotification(null), 3000);
          }
      } catch (err) {
          setIsTyping(false);
          console.error(err);
      }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    followMessagesRef.current = true;
    
    const textToSend = inputText;
    const newMessage = {
      id: Date.now(),
      text: textToSend,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pending: !isAiChat
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowEmojiPicker(false);
    
    if (activeChat?.matchId) {
       const myId = sessionStorage.getItem('user_id');
       if (myId) {
           try {
             const response = await apiFetch('/api/messages', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ match_id: activeChat.matchId, sender_id: parseInt(myId), text: textToSend })
             });
             const result = await response.json().catch(() => ({}));
             if (!response.ok || !result.success) throw new Error('Không gửi được tin nhắn. Vui lòng thử lại.');
             setMessages(prev => prev.map(message => message.id === newMessage.id ? { ...message, id: result.messageId ?? message.id, pending: false } : message));
           } catch {
             setMessages(prev => prev.map(message => message.id === newMessage.id ? { ...message, pending: false, failed: true } : message));
             setAlertMsg('Tin nhắn chưa gửi được. Hãy kiểm tra kết nối rồi thử lại.');
           }
        } else {
          setMessages(prev => prev.map(message => message.id === newMessage.id ? { ...message, pending: false, failed: true } : message));
          setAlertMsg('Bạn cần đăng nhập lại để gửi tin nhắn.');
        }
    }
    
    if (isAiChat) {
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
                    apiFetch('/api/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ match_id: activeChat.matchId, sender_id: parseInt(myId), text: base64Audio })
                    }).catch(()=>{});
                 }
              }
              
              if (isAiChat) {
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
             const res = await apiFetch(`/api/matches/${userId}`);
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
          if (localStorage.getItem('ais_blocked_Cupid') || localStorage.getItem('ais_blocked_Darling')) {
              // Blocked
          } else if (!matchedChats.find((c: any) => c.name === 'Cupid AI' || c.name === 'Darling')) {
              matchedChats.unshift({ name: 'Cupid AI', images: ['https://ui-avatars.com/api/?name=Cupid+AI&background=ff2d55&color=fff&rounded=true&bold=true'] });
          }
       } catch(e) {}

       const mappedChats = matchedChats.map((c: any, i: number) => {
          let lastMsg = 'Bắt đầu trò chuyện...';
          let lastTimestamp = 0;
          try {
             const historyRaw = localStorage.getItem('ais_chat_' + c.name) || (c.name === 'Cupid AI' ? localStorage.getItem('cupid_ai_messages') : null);
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
    const handleSyncMatches = () => { if (active) fetchMatches(); };
    window.addEventListener('cupid_chat_sync', handleSyncMatches);
    return () => { 
      active = false; 
      window.removeEventListener('cupid_chat_sync', handleSyncMatches);
    };
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
    <div className="bg-[#eaf4ff] h-full flex flex-col p-6 pt-10 relative overflow-hidden">
      
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
             <div className="bg-[#eaf4ff] h-[90px] pt-[40px] px-4 flex items-center gap-3 shrink-0 shadow-sm z-10 sticky top-0 border-b border-black/10">
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

              <div ref={messagesScrollRef} onScroll={event => {
                const element = event.currentTarget;
                followMessagesRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
              }} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f9ff] pb-32">
                 {hasOlderMessages && (
                   <div className="flex justify-center py-1">
                     <button onClick={() => { void loadOlderMessages(); }} disabled={isLoadingOlderMessages} className="rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-xs font-bold text-sky-700 shadow-sm disabled:opacity-60">
                       {isLoadingOlderMessages ? 'Đang tải tin cũ…' : 'Tải tin nhắn cũ hơn'}
                     </button>
                   </div>
                 )}
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
                        <div className={`text-[11px] text-slate-400 font-medium mt-0.5 mb-1 tracking-wide ${isMe ? 'mr-1' : 'ml-[38px]'}`}>
                           {msg.time || ''}{isMe && i === messages.length - 1 ? ` · ${msg.failed ? 'Gửi thất bại' : msg.pending ? 'Đang gửi…' : 'Đã gửi'}` : ''}
                        </div>
                     </div>
                   );
                })}
                 {isTyping && (
                    <div className="flex flex-col gap-1 items-start mb-4">
                      <div className="flex items-end gap-2">
                        <img src={activeChat.img || 'https://ui-avatars.com/api/?name=Darling&background=ff2d55&color=fff&rounded=true&bold=true'} className="w-[28px] h-[28px] rounded-full object-cover mb-1 shadow-sm border border-black/5 shrink-0" />
                        <div className="flex flex-col gap-1 max-w-[75%]">
                           <div className="px-4 py-2.5 shadow-sm text-[15px] bg-white border border-black/5 text-black rounded-r-2xl rounded-tl-2xl rounded-bl-sm flex items-center gap-1.5 font-medium animate-pulse">
                              <span className="text-[13px] text-gray-500 italic mr-1">{isAiChat ? 'Cupid AI đang suy ngẫm & soạn tin' : 'Đang soạn tin'}</span>
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
                         className="absolute bottom-full left-0 w-full bg-white border-b border-gray-100 p-3 grid grid-cols-8 gap-1 max-h-56 overflow-y-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 hide-scrollbar"
                     >
                        {emojis.map(emoji => (
                           <button 
                             key={emoji} 
                             onClick={() => setInputText(prev => prev + emoji)}
                              className="text-[25px] p-1 hover:bg-sky-50 rounded-lg transition"
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
                <div className="w-full flex flex-col">
                  {isAiChat && (
                     <div className="px-3 pt-2 pb-1.5 bg-[#fff5f6] flex gap-2 overflow-x-auto border-b border-pink-100 hide-scrollbar">
                        {[
                          { label: "🎴 Trải bài Tarot", prompt: "Cupid ơi, hãy trải cho mình một quẻ bài Tarot 3 lá (Quá khứ - Hiện tại - Tương lai) về mối quan hệ này nhé!" },
                          { label: "♈ Chiêm tinh Synastry", prompt: "Cupid ơi, hãy phân tích độ tương thích giữa hai cung hoàng đạo và cách hóa giải khác biệt nhé!" },
                          { label: "🐉 Tử vi 12 con giáp", prompt: "Cupid ơi, hãy xem giúp mình tính cách tình duyên và độ hợp nhau theo tuổi 12 con giáp nhé!" },
                          { label: "💬 Bắt chuyện tinh tế", prompt: "Cupid ơi, gợi ý cho mình vài câu bắt chuyện (ice-breaker) thật tinh tế với crush nhé!" },
                          { label: "🚨 Bị 'seen' không rep", prompt: "Người ấy đã 'seen' tin nhắn mà không trả lời, Cupid tư vấn giúp mình cách xử lý tâm lý và gửi tin nhắn nhé!" },
                          { label: "🌸 Dỗ người yêu giận", prompt: "Người yêu mình đang giận dỗi, Cupid chỉ mình các bước dỗ dành ngọt ngào và mẫu tin nhắn nhé!" },
                          { label: "🌱 Chữa lành tổn thương", prompt: "Cupid ơi, hãy cho mình lời khuyên chữa lành sau một mối quan hệ độc hại nhé!" }
                        ].map((item, idx) => (
                           <button
                             key={idx}
                             onClick={() => {
                                setInputText(item.prompt);
                             }}
                             className="shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full bg-white border border-black/10 text-[#ff2d55] hover:bg-[#ff2d55]/5 active:scale-95 transition-transform shadow-xs"
                           >
                             {item.label}
                           </button>
                        ))}
                     </div>
                  )}
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
                                         apiFetch('/api/messages', {
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
                     <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer" onClick={async () => {
                       if (!notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
                         await Notification.requestPermission();
                       }
                       setNotificationsEnabled(value => !value);
                     }}>
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
          <ProfileSwiper profiles={[partnerProfile]} title={activeChat?.name || 'Hồ sơ'} onClose={() => setShowInfoProfile(false)} readOnly />
         </div>
      )}

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        userName={myProfile?.name}
        onPremiumActivated={() => {
          updateMyProfile({ isPremium: true });
          window.dispatchEvent(new Event('premium_activated'));
        }}
      />

    </div>
  );
}

export function ProfileView({ onNavigate }: { onNavigate?: (v: any) => void }) {
  const { logout } = React.useContext(AppContext);
  return (
    <div className="bg-[#eaf4ff] min-h-screen p-6 pb-24 text-gray-900 font-sans">
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
         <button onClick={() => { if (logout) logout(); else { localStorage.clear(); sessionStorage.clear(); if(onNavigate) onNavigate('login'); } }} className="bg-[#e05744] text-white px-6 py-3 rounded-lg font-medium shadow-sm active:bg-red-700 transition">
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
      <div className="bg-[#eaf4ff] min-h-full p-6 pt-10 text-black font-sans flex flex-col relative pb-24">
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
                           await apiFetch(`/api/users/profile/${userId}`, {
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
    <div className="bg-[#eaf4ff] min-h-full p-6 pt-10 pb-24 text-black font-sans flex flex-col">
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
