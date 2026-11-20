import { apiFetch } from '../utils/api';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Zap, RefreshCw, Send, Heart, Smile, Sparkles, X, ChevronLeft, ChevronRight, User, Users, Flame, Eye, SwitchCamera, ShieldCheck, AlertCircle, Image as ImageIcon } from 'lucide-react';

export interface MomentItem {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  audience: 'lover' | 'friends' | 'all' | 'selected';
  recipientIds?: number[];
  reactions: {
    heart: number;
    smile: number;
    surprised: number;
    sad: number;
  };
  userReaction?: 'heart' | 'smile' | 'surprised' | 'sad';
}

interface MomentsViewProps {
  onClose?: () => void;
  myProfile?: any;
  onStartChat?: (moment: MomentItem) => void;
}

export function MomentsView({ onClose, myProfile, onStartChat }: MomentsViewProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'feed'>('camera');
  const [moments, setMoments] = useState<MomentItem[]>([]);

  // Camera & Capture state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<'selected' | 'all'>('selected');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  
  // Real Camera permission state
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>(() => {
    const saved = localStorage.getItem('camera_permission_granted');
    return saved === 'true' ? 'granted' : 'prompt';
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [feedIndex, setFeedIndex] = useState(0);

  // Floating reaction animation
  const [floatingReaction, setFloatingReaction] = useState<{ id: number; symbol: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch('/api/moments')
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (!active || !Array.isArray(result?.data)) return;
        setMoments(result.data);
      })
      .catch(error => console.warn('Could not load moments:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const userId = myProfile?.id || sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
    if (!userId) return;
    let active = true;
    setFriendsLoading(true);
    apiFetch(`/api/matches/${userId}`)
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (!active || !Array.isArray(result?.data)) return;
        setFriends(result.data.map((row: any) => {
          let profile = row.profile_data || {};
          if (typeof profile === 'string') { try { profile = JSON.parse(profile); } catch { profile = {}; } }
          return { id: Number(row.user_id), name: profile.name || 'Bạn bè', image: profile.images?.[0] || row.user_avatar || '' };
        }).filter((friend: any) => Number.isSafeInteger(friend.id) && friend.id > 0));
      })
      .catch(() => { if (active) setFriends([]); })
      .finally(() => { if (active) setFriendsLoading(false); });
    return () => { active = false; };
  }, [myProfile?.id]);

  // Attach stream to video whenever element or stream is available
  const attachStreamToVideo = (videoEl: HTMLVideoElement | null) => {
    videoRef.current = videoEl;
    if (videoEl && streamRef.current) {
      videoEl.srcObject = streamRef.current;
      videoEl.play().catch(err => console.warn("Video auto-play error:", err));
    }
  };

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.warn("Video play error:", err));
    }
  }, [cameraActive, permissionStatus, facingMode]);

  // Request camera access explicitly with progressive fallback
  const requestCameraAccess = async (requestedFacing: 'user' | 'environment' = facingMode) => {
    const requestId = ++cameraRequestIdRef.current;
    setPermissionStatus('requesting');
    setCameraError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ MediaDevices API");
      }

      let stream: MediaStream | null = null;
      try {
        // Attempt 1: High quality matching facing mode
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: requestedFacing,
            width: { ideal: 1080 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (err1) {
        try {
          // Attempt 2: Simple facing mode
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: requestedFacing },
            audio: false
          });
        } catch (err2) {
          // Attempt 3: Generic video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      if (stream) {
        if (requestId !== cameraRequestIdRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        setCameraActive(true);
        setFlashEnabled(false);
        setPermissionStatus('granted');
        localStorage.setItem('camera_permission_granted', 'true');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      if (requestId !== cameraRequestIdRef.current) return;
      console.warn("Camera permission error or not available:", err);
      setCameraActive(false);
      setPermissionStatus('denied');
      localStorage.setItem('camera_permission_granted', 'false');
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Quyền truy cập máy ảnh đang bị chặn. Bạn có thể nhấn nút chụp bằng camera bên dưới hoặc tải lại trang.'
          : 'Không thể khởi động camera trực tiếp trên trình duyệt này.'
      );
    }
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    requestCameraAccess(nextFacing);
  };

  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as (MediaStreamTrack & {
      getCapabilities?: () => { torch?: boolean };
    }) | undefined;
    const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean } | undefined;
    if (!track?.applyConstraints || !capabilities?.torch) {
      setCameraError('Đèn flash không được trình duyệt hoặc thiết bị này hỗ trợ.');
      return;
    }
    try {
      const next = !flashEnabled;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setFlashEnabled(next);
      setCameraError(null);
    } catch {
      setCameraError('Không thể bật đèn flash trên thiết bị này.');
    }
  };

  // Start real camera when active tab is camera and clean up ONLY on tab switch or unmount
  useEffect(() => {
    if (activeTab === 'camera' && !capturedPhoto) {
      requestCameraAccess(facingMode);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    }

    return () => {
      cameraRequestIdRef.current += 1;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [activeTab, capturedPhoto]);

  // Snap real photo directly from video stream
  const handleCapture = () => {
    if (!videoRef.current || !cameraActive || videoRef.current.videoWidth === 0) {
      setCameraError('Chưa nhận được hình ảnh từ camera. Hãy cấp quyền truy cập hoặc dùng camera của thiết bị.');
      nativeCameraInputRef.current?.click();
      return;
    }

    if (videoRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = 720;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const minDim = Math.min(video.videoWidth || 720, video.videoHeight || 720);
        const startX = ((video.videoWidth || minDim) - minDim) / 2;
        const startY = ((video.videoHeight || minDim) - minDim) / 2;

        // If front camera, mirror image for natural selfie feel
        if (facingMode === 'user') {
          ctx.translate(size, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPhoto(dataUrl);

        // Stop stream while reviewing
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setCameraActive(false);
        return;
      }
    }

  };

  // Upload custom file fallback
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Post moment
  const handlePost = async () => {
    if (!capturedPhoto || isPosting) return;
    if (audience === 'selected' && selectedRecipientIds.length === 0) {
      setPostError('Hãy chọn ít nhất một người bạn hoặc chọn Tất cả bạn bè.');
      return;
    }

    const newMoment: MomentItem = {
      id: Date.now(),
      userId: Number(sessionStorage.getItem('user_id') || localStorage.getItem('user_id') || myProfile?.id || 0),
      userName: `${myProfile?.name || 'Bạn'} (Tôi)`,
      userAvatar: myProfile?.images?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400',
      imageUrl: capturedPhoto,
      caption: caption.trim() || 'Khoảnh khắc mới chia sẻ ✨',
      createdAt: 'Vừa xong',
      audience,
      recipientIds: audience === 'all' ? [] : selectedRecipientIds,
      reactions: { heart: 1, smile: 0, surprised: 0, sad: 0 },
      userReaction: 'heart'
    };

    setPostError(null);
    setIsPosting(true);

    // Sync to backend
    try {
      const response = await apiFetch('/api/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMoment)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Không lưu được khoảnh khắc.');
      }
      const result = await response.json();
      setMoments(current => [result.data || newMoment, ...current.filter(moment => Number(moment.id) !== Number(result.data?.id))]);
      setCapturedPhoto(null);
      setCaption('');
      setActiveTab('feed');
      setFeedIndex(0);
    } catch(err) {
      setPostError(err instanceof Error ? err.message : 'Không lưu được khoảnh khắc lên máy chủ.');
    } finally {
      setIsPosting(false);
    }
  };

  // React to moment
  const handleReact = async (momentId: number, reactionType: 'heart' | 'smile' | 'surprised' | 'sad') => {
    const symbolMap = {
      heart: '❤️',
      smile: '😄',
      surprised: '😮',
      sad: '😢'
    };

    setFloatingReaction({ id: Date.now(), symbol: symbolMap[reactionType] });
    setTimeout(() => setFloatingReaction(null), 1200);

    try {
      const response = await apiFetch(`/api/moments/${momentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: reactionType })
      });
      if (!response.ok) throw new Error('Không lưu được biểu cảm vào cơ sở dữ liệu.');
      const feedResponse = await apiFetch('/api/moments');
      const result = await feedResponse.json();
      if (feedResponse.ok && Array.isArray(result.data)) setMoments(result.data);
    } catch (error) {
      setPostError(error instanceof Error ? error.message : 'Không lưu được biểu cảm.');
    }
  };

  const currentFeedMoment = moments[feedIndex] || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#eaf4ff] flex flex-col text-slate-800 font-sans overflow-hidden select-none"
    >
      {/* Floating Reaction Animation */}
      <AnimatePresence>
        {floatingReaction && (
          <motion.div
            key={floatingReaction.id}
            initial={{ opacity: 1, scale: 0.8, y: 0 }}
            animate={{ opacity: 0, scale: 2.5, y: -180 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute left-1/2 bottom-36 -translate-x-1/2 text-6xl pointer-events-none z-[80]"
          >
            {floatingReaction.symbol}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="pt-8 px-4 pb-3 flex items-center justify-between border-b border-blue-200 bg-white/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5 text-sky-300" />
            </button>
          )}
          <div>
            <h2 className="text-[17px] font-extrabold text-slate-800 flex items-center gap-1.5">
              <span> khoảnh Khắc </span>
            </h2>
            <p className="text-[11px] text-sky-700 font-medium">
              Chụp khoảnh khắc & gửi tức thì đến người thương
            </p>
          </div>
        </div>

        {/* View Switcher: Chụp Ảnh vs Xem Ảnh (Feed) */}
        <div className="flex bg-blue-100 p-1 rounded-full border border-blue-200">
          <button
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all ${
              activeTab === 'camera'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                : 'text-sky-700 hover:text-sky-950'
            }`}
          >
            Chụp ảnh
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all relative ${
              activeTab === 'feed'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                : 'text-sky-700 hover:text-sky-950'
            }`}
          >
            Xem ảnh
            {moments.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-pink-500 absolute -top-0.5 -right-0.5 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {postError && <div role="alert" className="absolute top-24 left-4 right-4 z-40 rounded-xl bg-rose-100 border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 shadow-md">{postError}</div>}

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-[#f4f9ff] to-[#eaf4ff] pointer-events-none" />

        {/* 1. CAMERA VIEW */}
        {activeTab === 'camera' && (
          <div className="w-full max-w-sm flex flex-col items-center z-10">
            {/* Square Viewport (Khung vuông chuẩn Locket) */}
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black border-2 border-sky-500/40 shadow-[0_15px_40px_rgba(2,132,199,0.3)] mb-4 flex items-center justify-center">
              {capturedPhoto ? (
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={attachStreamToVideo}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''} ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* Fallback Viewfinder if video stream is still initializing or restricted */}
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-blue-100 via-white to-sky-100">
                      <div className="relative w-20 h-20 rounded-3xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3 border border-sky-400/40 shadow-lg animate-pulse">
                        <Camera className="w-10 h-10" />
                      </div>

                      <h3 className="text-[16px] font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                        <span>📷</span> {permissionStatus === 'requesting' ? 'Đang kết nối camera…' : 'Camera chưa bật'}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-[240px]">
                        {cameraError || 'Cho phép truy cập camera để chụp ảnh trực tiếp từ thiết bị.'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Controls inside camera viewfinder */}
              {!capturedPhoto && (
                <>
                  {/* Flash Toggle */}
                  <button
                    onClick={toggleFlash}
                    className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-colors ${
                      flashEnabled
                        ? 'bg-amber-400 text-black shadow-md'
                        : 'bg-black/50 text-white/80 hover:text-white'
                    }`}
                    title="Bật/Tắt đèn Flash"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                  </button>

                  {/* Switch Front/Back Camera */}
                  <button
                    onClick={toggleFacingMode}
                    className="absolute top-3 left-3 p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white/90 hover:text-white transition-colors"
                    title="Đổi camera trước/sau"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Retake Button if photo captured */}
              {capturedPhoto && (
                <button
                  onClick={() => {
                    setCapturedPhoto(null);
                    setPermissionStatus('granted');
                  }}
                  className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-xs font-bold flex items-center gap-1 hover:bg-black/80 shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Chụp lại
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Caption Input & Audience Selector */}
            {capturedPhoto ? (
              <div className="w-full space-y-3">
                {/* Caption input (giống Locket widget) */}
                <input
                  type="text"
                  placeholder="Ghi chú thích cho khoảnh khắc..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={120}
                  className="w-full bg-white border border-sky-300 rounded-2xl px-4 py-3 text-[14px] text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 shadow-sm"
                />

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-sky-800">Gửi khoảnh khắc tới:</span>
                    <button type="button" onClick={() => { setAudience('all'); setSelectedRecipientIds([]); }} className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                      audience === 'all' ? 'border-sky-500 bg-sky-500 text-white' : 'border-sky-200 bg-white text-sky-800 hover:bg-sky-50'
                    }`}>
                      <Users className="mr-1 inline h-3.5 w-3.5" />Tất cả bạn bè
                    </button>
                  </div>
                  <button type="button" onClick={() => setAudience('selected')} className={`mb-2 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                    audience === 'selected' ? 'border-blue-500 bg-blue-100 text-blue-900' : 'border-blue-200 bg-white text-slate-600'
                  }`}>Chọn bạn bè</button>
                  {audience === 'selected' && (
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-blue-200 bg-white p-2">
                      {friendsLoading ? <p className="p-2 text-xs text-slate-500">Đang tải danh sách bạn bè…</p> : friends.length === 0 ? (
                        <p className="p-2 text-xs text-slate-500">Bạn chưa có bạn bè. Hãy kết bạn trước hoặc chọn “Tất cả bạn bè”.</p>
                      ) : friends.map((friend: any) => {
                        const selected = selectedRecipientIds.includes(friend.id);
                        return (
                          <button type="button" key={friend.id} onClick={() => setSelectedRecipientIds(ids => selected ? ids.filter(id => id !== friend.id) : [...ids, friend.id])} className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${
                            selected ? 'bg-sky-100 text-sky-950' : 'hover:bg-slate-50 text-slate-700'
                          }`}>
                            {friend.image ? <img src={friend.image} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100"><User className="h-4 w-4 text-sky-700" /></span>}
                            <span className="min-w-0 flex-1 truncate text-xs font-bold">{friend.name}</span>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                            }`}>{selected && <span className="text-[10px]">✓</span>}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {audience === 'selected' && <p className="mt-1 text-[11px] font-semibold text-sky-800">Đã chọn {selectedRecipientIds.length} người</p>}
                </div>

                {/* Post Button */}
                <button
                  onClick={handlePost}
                  disabled={isPosting}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-[15px] rounded-2xl shadow-[0_8px_25px_rgba(2,132,199,0.35)] active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Send className="w-4 h-4 ml-1" />
                  {isPosting ? 'Đang đăng…' : 'Đăng Khoảnh Khắc'}
                </button>
              </div>
            ) : (
              /* Capture Controls */
              <div className="w-full flex items-center justify-around py-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-black transition-colors"
                  title="Tải ảnh từ thư viện"
                >
                  <ImageIcon className="w-10 h-10" />
                </button>

                {/* Main Shutter Button */}
                <button
                  onClick={handleCapture}
                  className="w-20 h-20 rounded-full border-4 border-white/90 p-1 flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_30px_rgba(2,132,199,0.5)]"
                >
                  <div className="w-full h-full rounded-full bg-white hover:bg-sky-100 transition-colors" />
                </button>

                <button
                  onClick={() => setActiveTab('feed')}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-black transition-colors"
                  title="Xem khoảnh khắc bạn bè"
                >
                  <Eye className="w-10 h-10" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. FEED VIEW (Vuốt sang trái để xem ảnh bạn bè & người yêu) */}
        {activeTab === 'feed' && (
          <div className="w-full max-w-sm flex flex-col items-center z-10">
            {moments.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-400 mb-4 text-sm">Chưa có khoảnh khắc nào</p>
                <button
                  onClick={() => setActiveTab('camera')}
                  className="px-5 py-2.5 bg-sky-600 rounded-full text-white font-bold text-xs"
                >
                  Chụp khoảnh khắc đầu tiên
                </button>
              </div>
            ) : (
              currentFeedMoment && (
                <div className="w-full flex flex-col items-center">
                  {/* Sender Header */}
                  <div className="w-full flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentFeedMoment.userAvatar}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full object-cover border border-sky-400/50 shadow-sm"
                      />
                      <div>
                        <h4 className="font-extrabold text-[15px] text-black leading-tight">
                          {currentFeedMoment.userName}
                        </h4>
                        <span className="text-[12px] text-black font-medium">
                          {currentFeedMoment.createdAt} • {currentFeedMoment.audience === 'lover' ? '❤️ Người yêu' : '👥 Bạn bè'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs bg-sky-950/80 border border-sky-800/60 px-2.5 py-1 rounded-full text-sky-300 font-bold">
                      {feedIndex + 1} / {moments.length}
                    </span>
                  </div>

                  {/* Square Photo with Drag/Swipe left animation */}
                  <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black border-2 border-sky-500/40 shadow-[0_15px_40px_rgba(2,132,199,0.3)] mb-3">
                    <motion.div
                      key={currentFeedMoment.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.4}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -40 && feedIndex < moments.length - 1) {
                          setFeedIndex(prev => prev + 1);
                        } else if (info.offset.x > 40 && feedIndex > 0) {
                          setFeedIndex(prev => prev - 1);
                        }
                      }}
                      className="w-full h-full cursor-grab active:cursor-grabbing"
                    >
                      <img
                        src={currentFeedMoment.imageUrl}
                        alt="Moment"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </motion.div>

                    {/* Nav arrow overlays */}
                    {feedIndex > 0 && (
                      <button
                        onClick={() => setFeedIndex(prev => Math.max(0, prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    {feedIndex < moments.length - 1 && (
                      <button
                        onClick={() => setFeedIndex(prev => Math.min(moments.length - 1, prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="w-full bg-[#0d1f33] border border-sky-800/40 rounded-2xl p-3 mb-4 text-center">
                    <p className="text-[13.5px] text-white font-medium leading-relaxed">
                      "{currentFeedMoment.caption}"
                    </p>
                  </div>

                  {/* 4 REACTION BUTTONS (❤️ 😄 😮 😢) */}
                  <div className="w-full bg-black/40 border border-sky-900/50 rounded-2xl p-2.5 flex items-center justify-around">
                    {/* 1. Trái Tim */}
                    <button
                      onClick={() => handleReact(currentFeedMoment.id, 'heart')}
                      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-transform active:scale-80 ${
                        currentFeedMoment.userReaction === 'heart' ? 'bg-pink-600/30' : 'hover:bg-white/5'
                      }`}
                      title="Trái Tim"
                    >
                      <span className="text-3xl filter drop-shadow">❤️</span>
                      <span className="text-[12px] font-bold text-pink-300">
                        {currentFeedMoment.reactions.heart || 0}
                      </span>
                    </button>

                    {/* 2. Mặt Cười */}
                    <button
                      onClick={() => handleReact(currentFeedMoment.id, 'smile')}
                      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-transform active:scale-80 ${
                        currentFeedMoment.userReaction === 'smile' ? 'bg-amber-600/30' : 'hover:bg-white/5'
                      }`}
                      title="Mặt Cười"
                    >
                      <span className="text-3xl filter drop-shadow">😄</span>
                      <span className="text-[12px] font-bold text-amber-300">
                        {currentFeedMoment.reactions.smile || 0}
                      </span>
                    </button>

                    {/* 3. Ngạc Nhiên */}
                    <button
                      onClick={() => handleReact(currentFeedMoment.id, 'surprised')}
                      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-transform active:scale-80 ${
                        currentFeedMoment.userReaction === 'surprised' ? 'bg-purple-600/30' : 'hover:bg-white/5'
                      }`}
                      title="Ngạc Nhiên"
                    >
                      <span className="text-3xl filter drop-shadow">😮</span>
                      <span className="text-[12px] font-bold text-purple-300">
                        {currentFeedMoment.reactions.surprised || 0}
                      </span>
                    </button>

                    {/* 4. Mặt Buồn */}
                    <button
                      onClick={() => handleReact(currentFeedMoment.id, 'sad')}
                      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-transform active:scale-80 ${
                        currentFeedMoment.userReaction === 'sad' ? 'bg-blue-600/30' : 'hover:bg-white/5'
                      }`}
                      title="Mặt Buồn"
                    >
                      <span className="text-3xl filter drop-shadow">😢</span>
                      <span className="text-[12px] font-bold text-blue-300">
                        {currentFeedMoment.reactions.sad || 0}
                      </span>
                    </button>
                  </div>

                  {onStartChat && currentFeedMoment.userId !== Number(sessionStorage.getItem('user_id')) && (
                    <button
                      onClick={() => onStartChat(currentFeedMoment)}
                      className="mt-3 w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-white shadow-md hover:bg-sky-400 active:scale-[0.98]"
                    >
                      <span className="inline-flex items-center justify-center gap-2"><Send className="h-4 w-4" />Trò chuyện về khoảnh khắc này</span>
                    </button>
                  )}

                  <p className="text-[12px] text-black/60 mt-3 text-center">
                    👈 Vuốt sang trái / phải để xem các khoảnh khắc tiếp theo
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
