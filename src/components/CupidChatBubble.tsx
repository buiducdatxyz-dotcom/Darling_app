import { apiFetch } from '../utils/api';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Heart, X, Send, Mic, Copy, Check, RotateCcw, 
  Volume2, VolumeX, ChevronDown, Compass, Moon, Sun, 
  HelpCircle, MessageCircle, Flame, Shield, ArrowRight, Star, Lock
} from 'lucide-react';
import { TAROT_DECK, TarotCard } from '../data/tarot';
import { ZODIAC_LIST, ZODIAC_DATA, AppContext } from './MainApp';
import { TarotInteractiveModal, DrawnCard } from './TarotInteractiveModal';
import { LunarHoroscopeModal } from './LunarHoroscopeModal';
import { PremiumModal } from './PremiumModal';
import { parseLunarFromDob } from '../utils/astrologyAndLunar';

interface Message {
  id: number;
  sender: 'me' | 'cupid' | 'them';
  text: string;
  time: string;
  isAudio?: boolean;
  isImage?: boolean;
}

const ZODIAC_ICONS: Record<string, string> = {
  'Bạch Dương': '♈', 'Kim Ngưu': '♉', 'Song Tử': '♊', 'Cự Giải': '♋',
  'Sư Tử': '♌', 'Xử Nữ': '♍', 'Thiên Bình': '♎', 'Thiên Yết': '♏',
  'Nhân Mã': '♐', 'Ma Kết': '♑', 'Bảo Bình': '♒', 'Song Ngư': '♓'
};

export function CupidChatBubble() {
  const { myProfile, updateMyProfile } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewGreeting, setHasNewGreeting] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals for rich divination
  const [isTarotModalOpen, setIsTarotModalOpen] = useState(false);
  const [isLunarModalOpen, setIsLunarModalOpen] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(Boolean(myProfile?.isPremium));
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Dragging state for the floating bubble
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ais_chat_Cupid AI') || localStorage.getItem('cupid_ai_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const userName = myProfile?.name || 'bạn';
    return [
      {
        id: 1,
        sender: 'cupid',
        text: `Chào ${userName}, mình là **Cupid AI**! 🕊️💖

Là người bạn đồng hành thấu cảm và tinh tế, mình luôn ở đây để lắng nghe mọi tâm sự, nỗi niềm thầm kín và cùng bạn tháo gỡ khúc mắc trong tình yêu. 

Dựa vào thông tin hồ sơ của bạn, mình có thể phân tích tính cách, sự hòa hợp cảm xúc, trải bài Tarot 3 lá tương tác chân thực và xem Tử vi 12 con giáp chi tiết.

Hôm nay trong lòng bạn đang có điều gì trăn trở hay muốn tâm sự cùng Cupid không? Hãy cứ thoải mái chia sẻ nhé! ✨`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTool, setActiveTool] = useState<'none' | 'zodiac'>('none');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Zodiac Tool state
  const [myZodiac, setMyZodiac] = useState(() => myProfile?.zodiac || 'Bảo Bình');
  const [crushZodiac, setCrushZodiac] = useState('Thiên Bình');

  // Update zodiac if profile updates
  useEffect(() => {
    if (myProfile?.zodiac) {
      setMyZodiac(myProfile.zodiac);
    }
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

  useEffect(() => {
    const handleOpenTool = (event: Event) => {
      const tool = (event as CustomEvent<{ tool?: string }>).detail?.tool;
      setIsOpen(true);
      setHasNewGreeting(false);
      if ((tool === 'tarot' || tool === 'lunar') && !hasPremiumAccess) {
        setIsPremiumModalOpen(true);
        return;
      }
      if (tool === 'tarot') setIsTarotModalOpen(true);
      if (tool === 'lunar') setIsLunarModalOpen(true);
      if (tool === 'zodiac') setActiveTool('zodiac');
    };
    window.addEventListener('cupid_open_tool', handleOpenTool);
    return () => window.removeEventListener('cupid_open_tool', handleOpenTool);
  }, [hasPremiumAccess]);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages and sync across both Chat tab and Chat Bubble
  useEffect(() => {
    try {
      localStorage.setItem('ais_chat_Cupid AI', JSON.stringify(messages));
      localStorage.setItem('cupid_ai_messages', JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent('cupid_chat_sync', { detail: { messages, source: 'bubble' } }));
    } catch (e) {}
  }, [messages]);

  // Listen to 2-way real-time sync events from the Chat tab
  useEffect(() => {
    const handleSync = (e: any) => {
      const payload = e?.detail;
      if (payload?.source === 'bubble') return;
      const incoming = Array.isArray(payload) ? payload : payload?.messages;
      if (Array.isArray(incoming)) {
        setMessages(prev => {
          if (JSON.stringify(prev) === JSON.stringify(incoming)) return prev;
          return incoming;
        });
      } else {
        try {
          const saved = localStorage.getItem('ais_chat_Cupid AI') || localStorage.getItem('cupid_ai_messages');
          if (saved) {
            const parsed = JSON.parse(saved);
            setMessages(prev => (JSON.stringify(prev) === saved ? prev : parsed));
          }
        } catch(err) {}
      }
    };

    window.addEventListener('cupid_chat_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('cupid_chat_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping, activeTool]);

  // Dismiss initial greeting tooltip after 7s
  useEffect(() => {
    const t = setTimeout(() => {
      setHasNewGreeting(false);
    }, 7000);
    return () => clearTimeout(t);
  }, []);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'me',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setIsTyping(true);
    setActiveTool('none');

    // Compute user's rich astrological and lunar info from profile
    const userLunar = parseLunarFromDob(myProfile?.dob || '2000-01-01');

    const profilePayload = {
      name: myProfile?.name || 'Bạn',
      dob: myProfile?.dob,
      zodiac: myProfile?.zodiac || 'Bảo Bình',
      canChi: userLunar.canChi,
      animal: userLunar.animalFullName,
      element: userLunar.elementFull,
      gender: myProfile?.gender,
      height: myProfile?.height,
      location: myProfile?.location,
      job: myProfile?.job,
      language: myProfile?.language,
      communicationStyle: myProfile?.communicationStyle,
      intent: myProfile?.intent || myProfile?.need,
      pet: myProfile?.pet,
      music: myProfile?.music,
      food: myProfile?.food,
      travel: myProfile?.travel,
      bio: myProfile?.bio
    };

    try {
      const historyToSend = newHistory.map(m => ({
        role: m.sender === 'me' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await apiFetch('/api/chat/cupid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend,
          userProfile: profilePayload
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 429 && errorData.code === 'CUPID_DAILY_LIMIT') {
          const limitMessage: Message = {
            id: Date.now() + 1,
            sender: 'cupid',
            text: errorData.error || 'Bạn đã hết 3 lượt Cupid AI miễn phí hôm nay. Nâng cấp Premium để tiếp tục trò chuyện.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(previous => [...previous, limitMessage]);
          setIsTyping(false);
          setIsPremiumModalOpen(true);
          return;
        }
        throw new Error(errorData.error || 'Cupid AI hiện chưa thể trả lời. Vui lòng thử lại.');
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const cupidMsgId = Date.now() + 1;

      // Add empty message placeholder
      setMessages(prev => [
        ...prev,
        {
          id: cupidMsgId,
          sender: 'cupid',
          text: '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages(prev => prev.map(m => m.id === cupidMsgId ? { ...m, text: accumulated } : m));
      }

      playChime();
    } catch (err) {
      console.error("Cupid chat error, falling back locally:", err);
      setIsTyping(false);
      
      const cupidMsgId = Date.now() + 1;
      const fallbackText = `Chào ${myProfile?.name || 'bạn'}, mình luôn ở đây lắng nghe bạn. Trong tình cảm, sự thấu hiểu và chân thành luôn là chiếc chìa khóa quý giá nhất. Hãy cho mình biết bạn muốn phân tích sâu hơn về điều gì tiếp theo nhé! 💕`;

      setMessages(prev => [
        ...prev,
        {
          id: cupidMsgId,
          sender: 'cupid',
          text: fallbackText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      playChime();
    }
  };

  useEffect(() => {
    const handleCupidPrompt = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (!prompt?.trim()) return;
      setIsOpen(true);
      setHasNewGreeting(false);
      void handleSendMessage(prompt);
    };
    window.addEventListener('cupid_send_prompt', handleCupidPrompt);
    return () => window.removeEventListener('cupid_send_prompt', handleCupidPrompt);
  }, [handleSendMessage]);

  const handleSendZodiacSynastry = () => {
    const prompt = `Cupid AI ơi, mình thuộc cung ${myZodiac} (${ZODIAC_DATA[myZodiac]?.element || ''}) và đối phương thuộc cung ${crushZodiac} (${ZODIAC_DATA[crushZodiac]?.element || ''}). Hãy phân tích chi tiết độ tương thích tình cảm (Synastry), giải mã tâm lý và gợi ý cho mình câu hỏi và cách ứng xử tinh tế để chinh phục/hòa hợp với họ nhé!`;
    handleSendMessage(prompt);
  };

  const handleToggleVoice = async () => {
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
        const reader = new FileReader();
        reader.onloadend = () => {
          handleSendMessage("[Tin nhắn thoại] Cupid AI ơi, mình đang có chuyện tình cảm cần bạn tư vấn và gỡ rối giúp mình!");
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e: any) {
      console.warn("Mic access error:", e);
      setIsRecording(false);
    }
  };

  const extractScript = (text: string) => {
    const quoteMatch = text.match(/> \*(.*?)\*/s) || text.match(/> "(.*?)"/s) || text.match(/> (.*?)\n/s);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    return null;
  };

  const clearChat = () => {
    const initialMsg: Message = {
      id: Date.now(),
      sender: 'cupid',
      text: `Cuộc trò chuyện đã được làm mới! Cupid AI luôn sẵn sàng lắng nghe mọi câu chuyện tình cảm, trải bài Tarot hay giải mã tử vi cho bạn. Hãy bắt đầu nhé! 🕊️💖`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
  };

  return (
    <>
      {/* 1. FLOATING CHAT BUBBLE (Có thể di chuyển khi kéo - Draggable) */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        onDragStart={(_, info) => {
          dragStartPos.current = { x: info.point.x, y: info.point.y };
          isDraggingRef.current = false;
        }}
        onDrag={(_, info) => {
          const dist = Math.hypot(info.point.x - dragStartPos.current.x, info.point.y - dragStartPos.current.y);
          if (dist > 6) {
            isDraggingRef.current = true;
          }
        }}
        onDragEnd={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 150);
        }}
        className="fixed bottom-24 right-4 sm:right-6 z-[90] flex flex-col items-end pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
      >
        {/* Tooltip greeting when closed */}
        <AnimatePresence>
          {!isOpen && hasNewGreeting && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-2 max-w-[220px] bg-white text-gray-800 text-[12px] font-semibold py-2 px-3 rounded-2xl shadow-xl border border-pink-200 flex items-center gap-2 relative cursor-pointer"
              onClick={() => {
                if (isDraggingRef.current) return;
                setIsOpen(true);
                setHasNewGreeting(false);
              }}
            >
              <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 text-[#ff2d55] fill-[#ff2d55]" />
              </div>
              <span className="leading-tight">Tâm sự tình cảm, Tarot & Tử vi cùng Cupid AI nè! 💕</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHasNewGreeting(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-pink-200 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Animated Round Bubble */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (isDraggingRef.current) return;
            setIsOpen(prev => !prev);
            setHasNewGreeting(false);
          }}
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(255,45,85,0.45)] transition-all ${
            isOpen 
              ? 'bg-gray-900 text-white rotate-90' 
              : 'bg-gradient-to-tr from-[#ff2d55] via-[#ff477e] to-[#ff758c] text-white'
          }`}
          aria-label="Cupid AI Chatbot"
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Heart className="w-7 h-7 sm:w-8 sm:h-8 fill-white/20 stroke-white stroke-[2] drop-shadow-sm" />
              <Sparkles className="w-4 h-4 text-amber-200 absolute -top-1 -right-1 animate-pulse" />
              
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>
          )}
        </motion.button>
      </motion.div>

      {/* 2. CHAT BOT WINDOW (Mở ra từ bong bóng chat) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-24 right-3 sm:right-6 w-[395px] max-w-[calc(100vw-24px)] h-[590px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] z-[100] flex flex-col overflow-hidden border border-pink-100 font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ff2d55] via-[#ff477e] to-[#ff6b8b] px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-sm relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-black text-lg shadow-inner">
                    🏹
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-[16px] tracking-tight">Cupid AI</h3>
                    <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Tình Cảm & Huyền Học</span>
                  </div>
                  <p className="text-[11px] text-white/85 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    Thấu cảm & Đồng hành 24/7
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled(s => !s)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title={soundEnabled ? "Tắt âm" : "Bật âm"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-70" />}
                </button>
                <button
                  onClick={clearChat}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Làm mới cuộc trò chuyện"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Thu nhỏ bong bóng"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Action Chips Bar: ONLY 3 CHIPS (Tarot, Chiêm tinh, Tử vi) */}
            <div className="bg-[#fff5f6] border-b border-pink-100 px-3 py-2 flex items-center gap-2 shrink-0">
              {/* Chip 1: Trải bài Tarot */}
              <button
                onClick={() => hasPremiumAccess ? setIsTarotModalOpen(true) : setIsPremiumModalOpen(true)}
                className="flex-1 text-[11.5px] font-extrabold py-1.5 px-2.5 rounded-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
              >
                <span>🎴</span>
                <span>Trải bài Tarot</span>{!hasPremiumAccess && <Lock className="h-3 w-3" />}
              </button>

              {/* Chip 2: Chiêm tinh */}
              <button
                onClick={() => setActiveTool(activeTool === 'zodiac' ? 'none' : 'zodiac')}
                className={`flex-1 text-[11.5px] font-extrabold py-1.5 px-2.5 rounded-full flex items-center justify-center gap-1.5 border transition-all ${
                  activeTool === 'zodiac'
                    ? 'bg-[#ff2d55] text-white border-[#ff2d55] shadow-xs'
                    : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                }`}
              >
                <span>✨</span>
                <span>Chiêm tinh</span>
              </button>

              {/* Chip 3: Tử vi 12 con giáp */}
              <button
                onClick={() => hasPremiumAccess ? setIsLunarModalOpen(true) : setIsPremiumModalOpen(true)}
                className="flex-1 text-[11.5px] font-extrabold py-1.5 px-2.5 rounded-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
              >
                <span>☯️</span>
                <span>Tử vi</span>{!hasPremiumAccess && <Lock className="h-3 w-3" />}
              </button>
            </div>

            {/* INTERACTIVE ZODIAC SYNASTRY TOOL */}
            <AnimatePresence>
              {activeTool === 'zodiac' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-gradient-to-b from-purple-50 to-pink-50 p-3 border-b border-purple-200 shrink-0 overflow-hidden text-gray-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold text-purple-900 flex items-center gap-1">
                      <span>✨</span> Chiêm Tinh Synastry (Độ Tương Thích Hoàng Đạo)
                    </span>
                    <button onClick={() => setActiveTool('none')} className="text-gray-400 hover:text-gray-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">Cung của bạn:</label>
                      <select
                        value={myZodiac}
                        onChange={(e) => setMyZodiac(e.target.value)}
                        className="w-full text-[12px] font-bold bg-white border border-purple-200 rounded-lg p-1.5 outline-none text-purple-950"
                      >
                        {ZODIAC_LIST.map(z => (
                          <option key={z} value={z}>{ZODIAC_ICONS[z]} {z}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">Cung của người ấy:</label>
                      <select
                        value={crushZodiac}
                        onChange={(e) => setCrushZodiac(e.target.value)}
                        className="w-full text-[12px] font-bold bg-white border border-purple-200 rounded-lg p-1.5 outline-none text-purple-950"
                      >
                        {ZODIAC_LIST.map(z => (
                          <option key={z} value={z}>{ZODIAC_ICONS[z]} {z}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSendZodiacSynastry}
                    className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    Xem Điểm Hợp & Bí Quyết Chinh Phục <ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-gray-50/60 text-[13.5px]">
              {messages.map((msg) => {
                const isMe = msg.sender === 'me';
                const suggestedScript = !isMe ? extractScript(msg.text) : null;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex gap-2 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff2d55] to-[#ff6b8b] text-white flex items-center justify-center shrink-0 shadow-xs text-xs font-black">
                          🏹
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <div
                          className={`p-3 rounded-2xl leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-[#ff2d55] to-[#ff477e] text-white rounded-tr-xs shadow-sm font-medium'
                              : 'bg-white text-gray-800 rounded-tl-xs shadow-sm border border-gray-100'
                          }`}
                        >
                          {/* Markdown parsing for Cupid AI responses */}
                          <div className="whitespace-pre-line space-y-1.5">
                            {msg.text.split('\n\n').map((paragraph, pIdx) => {
                              if (paragraph.startsWith('### ')) {
                                return (
                                  <h4 key={pIdx} className="font-extrabold text-[#ff2d55] text-[13px] mt-2 mb-1 flex items-center gap-1.5 border-b border-pink-100 pb-0.5">
                                    {paragraph.replace('### ', '')}
                                  </h4>
                                );
                              }
                              if (paragraph.startsWith('> ')) {
                                return (
                                  <div key={pIdx} className="my-2 p-2.5 bg-pink-50/80 border-l-3 border-[#ff2d55] rounded-r-xl italic text-gray-800 text-[13px]">
                                    {paragraph.replace(/^> /gm, '')}
                                  </div>
                                );
                              }
                              return (
                                <p key={pIdx} className="leading-relaxed">
                                  {paragraph}
                                </p>
                              );
                            })}
                          </div>

                          {/* 1-Click Copy Script Button if advice includes sample script */}
                          {suggestedScript && (
                            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[11px] text-gray-400 font-medium">Mẫu tin nhắn gợi ý</span>
                              <button
                                onClick={() => copyToClipboard(suggestedScript, `script-${msg.id}`)}
                                className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-[#ff2d55] font-bold text-[11px] rounded-full flex items-center gap-1 transition-colors"
                              >
                                {copiedId === `script-${msg.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Đã sao chép!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Sao chép mẫu</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <span className={`text-[10px] text-gray-400 ${isMe ? 'text-right' : 'text-left'} px-1`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-gray-500 text-[12px] italic">
                  <div className="w-6 h-6 rounded-full bg-pink-100 text-[#ff2d55] flex items-center justify-center shrink-0 text-xs">
                    🏹
                  </div>
                  <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-1.5">
                    <span>Cupid đang lắng nghe & suy ngẫm</span>
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-[#ff2d55] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#ff2d55] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#ff2d55] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Box Footer */}
            <div className="p-2.5 bg-white border-t border-gray-100 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="flex items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'text-gray-400 hover:text-[#ff2d55] hover:bg-pink-50'
                  }`}
                  title={isRecording ? "Dừng ghi âm" : "Ghi âm giọng nói"}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={isRecording ? "Đang ghi âm..." : "Tâm sự cùng Cupid AI, Tarot, con giáp..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isRecording}
                  className="flex-1 bg-gray-100 hover:bg-gray-100/80 focus:bg-white border border-transparent focus:border-pink-200 rounded-full px-3.5 py-2 text-[13px] outline-none transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff2d55] to-[#ff477e] text-white flex items-center justify-center shrink-0 shadow-sm disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. INTERACTIVE TAROT MODAL (Trải bài 3 lá chân thực) */}
      <TarotInteractiveModal
        isOpen={isTarotModalOpen}
        onClose={() => setIsTarotModalOpen(false)}
        onSendToCupid={(promptText) => {
          setIsOpen(true);
          handleSendMessage(promptText);
        }}
        userZodiac={myProfile?.zodiac}
        userName={myProfile?.name}
      />

      {/* 4. INTERACTIVE LUNAR HOROSCOPE MODAL (Tử vi 12 con giáp) */}
      <LunarHoroscopeModal
        isOpen={isLunarModalOpen}
        onClose={() => setIsLunarModalOpen(false)}
        onSendToCupid={(promptText) => {
          setIsOpen(true);
          handleSendMessage(promptText);
        }}
        userDob={myProfile?.dob}
        userName={myProfile?.name}
        userZodiac={myProfile?.zodiac}
      />
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        userName={myProfile?.name}
        onPremiumActivated={() => {
          updateMyProfile({ isPremium: true });
          setHasPremiumAccess(true);
          window.dispatchEvent(new Event('premium_activated'));
        }}
      />
    </>
  );
}
