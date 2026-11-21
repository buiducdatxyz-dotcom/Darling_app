import { apiFetch } from '../utils/api';
import React from 'react';
import { ViewState } from '../types';
import { genders, jobs, languages, religions, communicationStyles, intents, pets, musics, books, foods, travels, games, sports } from '../data';
import { Calendar, Image as ImageIcon, ChevronDown, ChevronsUpDown, MapPin, CheckCircle, Sparkles, Shield, Camera, FolderOpen } from 'lucide-react';
import { AppContext } from './MainApp';
import { getLunarAnimalFromDob, getWesternZodiacFromDob } from '../utils/compatibility';

interface SetupProps {
  onNavigate: (view: ViewState) => void;
}

export function SetupBasic({ onNavigate }: SetupProps) {
  const { setupData, updateSetupData } = React.useContext(AppContext);
  const [dob, setDob] = React.useState(setupData.dob || '');
  const [name, setName] = React.useState(setupData.name || '');
  const [gender, setGender] = React.useState(setupData.gender || '');
  const [height, setHeight] = React.useState(setupData.height || '');
  const [images, setImages] = React.useState<string[]>(
    setupData.images && setupData.images.length > 0 
      ? [...setupData.images, ...Array(4 - setupData.images.length).fill('')] 
      : ['', '', '', '']
  );
  const [error, setError] = React.useState('');
  
  const zodiac = getWesternZodiacFromDob(dob);
  const lunarAnimal = getLunarAnimalFromDob(dob);

  const handleNext = () => {
    if (!name || !dob || !gender || !height || !images.some(img => img !== '')) {
       setError('Vui lòng điền đầy đủ thông tin và chọn ít nhất 1 ảnh.');
       return;
    }
    setError('');
    updateSetupData({ 
      name, 
      dob, 
      gender, 
      height, 
      zodiac, 
      lunarAnimal: lunarAnimal.fullName,
      lunarBranch: lunarAnimal.branch,
      images: images.filter(img => img !== '') 
    });
    onNavigate('setup_lifestyle');
  };

  return (
    <div className="absolute inset-0 bg-[#eaf4ff] p-6 pt-12 pb-10 text-black font-sans flex flex-col overflow-hidden">
      <h1 className="text-[26px] font-bold text-center mb-6 tracking-tight shrink-0">Thông tin cơ bản</h1>
      
      <div className="space-y-4 max-w-[340px] w-full mx-auto flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar min-h-0">
        {error && (
            <div className="bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium mb-2 shadow-sm text-center">
               {error}
            </div>
        )}
        <div>
          <label className="block text-[17px] mb-1 font-medium">Họ tên/nick name:</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 bg-white bg-opacity-80 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-black/20 text-[15px]" placeholder="Nhập tên của bạn" />
        </div>
        
        <div>
          <label className="block text-[17px] mb-1 font-medium">Ngày/tháng/năm sinh:</label>
          <div className="relative">
            <input 
              type="date" 
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2.5 bg-white bg-opacity-80 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-black/20 text-[15px] pr-10" 
            />
          </div>
          {dob && (
            <div className="flex flex-col gap-2 mt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold bg-white/80 text-sky-950 px-3 py-1.5 rounded-lg border border-black/5 shadow-xs flex items-center gap-1.5">
                  <span>✨ Cung hoàng đạo:</span>
                  <span className="font-extrabold text-blue-800">{zodiac}</span>
                </div>
                <div className="text-xs font-semibold bg-white/80 text-sky-950 px-3 py-1.5 rounded-lg border border-black/5 shadow-xs flex items-center gap-1.5">
                  <span>🐾 12 Con giáp:</span>
                  <span className="font-extrabold text-amber-800">{lunarAnimal.fullName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <SelectField label="Giới tính:" options={genders} value={gender} onChange={setGender} />
        </div>
        
        <div className="flex items-center gap-3 mt-1">
          <label className="text-[17px] whitespace-nowrap min-w-[100px] font-medium block">Chiều cao:</label>
          <div className="relative flex-1">
             <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className="w-full px-3 py-2 bg-white bg-opacity-80 rounded-lg border-none pr-8 text-[15px] focus:outline-none focus:ring-2 focus:ring-black/20" />
             <span className="absolute right-3 top-2 text-[15px] text-gray-500 font-medium">cm</span>
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-[17px] mb-4 font-medium">Ảnh của bạn:</label>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-1">
            {images.map((img, i) => (
              <div key={i} className="aspect-square bg-black/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border-2 border-dashed border-black/20 cursor-pointer active:bg-black/20 transition-colors">
                 {img ? (
                   <>
                     <img src={img} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         const newImg = [...images];
                         newImg[i] = '';
                         setImages(newImg);
                       }}
                       className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full shadow-sm"
                     >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                     </button>
                   </>
                 ) : (
                   <>
                     <input 
                       type="file" 
                       accept="image/*" 
                       className="absolute inset-0 opacity-0 cursor-pointer"
                       onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onload = (e) => {
                                const newImg = [...images];
                                newImg[i] = e.target?.result as string;
                                setImages(newImg);
                             };
                             reader.readAsDataURL(file);
                          }
                       }}
                     />
                     <ImageIcon className="w-[40px] h-[40px] text-black/40 stroke-[1.5] mb-2" />
                     <span className="text-[13px] text-black/60 font-medium">Thêm ảnh</span>
                   </>
                 )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 pt-4 flex justify-center mt-auto">
        <div className="max-w-[340px] w-full flex gap-3">
          <button
            onClick={() => onNavigate('register')}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-800 bg-white active:bg-slate-100 transition-colors shadow-sm text-[15px]"
          >
            Sửa email/mật khẩu
          </button>
          <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#ff2d55] active:bg-[#e02045] transition-colors shadow-sm text-[15px]"
          >
            Tiếp theo
          </button>
        </div>
      </div>
    </div>
  );
}

export function SelectField({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (val: string) => void }) {
  const isCustomOption = value && !options.includes(value) && value !== 'Khác';
  const showCustomInput = value === 'Khác' || isCustomOption;
  const selectValue = isCustomOption ? 'Khác' : value;

  return (
    <div className="mb-4">
      <label className="block text-[16px] font-medium mb-1.5 ml-1">{label}</label>
      <div className="relative">
         <select value={selectValue} onChange={e => {
             if (e.target.value === 'Khác') {
                 onChange('Khác');
             } else {
                 onChange(e.target.value);
             }
         }} className="w-full px-4 py-3 bg-white rounded-lg appearance-none border-none focus:outline-none focus:ring-2 focus:ring-black/20 text-[15px] shadow-sm">
            <option value="">Lựa chọn</option>
            {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
         </select>
         <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 stroke-[2] pointer-events-none text-gray-500" />
      </div>
      {showCustomInput && (
         <input 
            type="text" 
            placeholder="Nhập thông tin của bạn..."
            value={isCustomOption ? value : ''}
            onChange={e => onChange(e.target.value || 'Khác')}
            className="w-full mt-2 px-4 py-3 bg-white rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-black/20 text-[15px] shadow-sm"
         />
      )}
    </div>
  );
}

export function SetupLifestyle({ onNavigate }: SetupProps) {
  const { setupData, updateSetupData } = React.useContext(AppContext);
  const [job, setJob] = React.useState(setupData.job || '');
  const [lang, setLang] = React.useState(setupData.language || '');
  const [rel, setRel] = React.useState(setupData.religion || '');
  const [style, setStyle] = React.useState(setupData.communicationStyle || '');
  const [intent, setIntent] = React.useState(setupData.intent || '');
  const [error, setError] = React.useState('');

  const handleNext = () => {
    if (!job || !lang || !rel || !style || !intent) {
       setError('Vui lòng chọn đầy đủ các mục.');
       return;
    }
    setError('');
    updateSetupData({ job, language: lang, religion: rel, communicationStyle: style, intent });
    onNavigate('setup_interests');
  };

  return (
    <div className="absolute inset-0 bg-[#eaf4ff] p-6 pt-12 pb-10 text-black font-sans flex flex-col overflow-hidden">
      <h1 className="text-[26px] font-bold text-center mb-6 tracking-tight shrink-0">Phong cách sống</h1>
      
      <div className="max-w-[340px] w-full mx-auto flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar min-h-0">
        {error && (
            <div className="bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium mb-4 shadow-sm text-center">
               {error}
            </div>
        )}
        <SelectField label="Ngành nghề:" options={jobs} value={job} onChange={setJob} />
        <SelectField label="Ngôn Ngữ:" options={languages} value={lang} onChange={setLang} />
        <SelectField label="Tôn giáo:" options={religions} value={rel} onChange={setRel} />
        <SelectField label="Phong cách giao tiếp:" options={communicationStyles} value={style} onChange={setStyle} />
        <SelectField label="Nhu cầu:" options={intents} value={intent} onChange={setIntent} />
      </div>

      <div className="shrink-0 pt-4 flex justify-center mt-auto">
        <div className="max-w-[340px] w-full flex justify-between gap-4">
          <button 
            onClick={() => onNavigate('setup_basic')}
            className="flex-1 py-3.5 rounded-xl font-bold text-black bg-white active:bg-gray-100 transition-colors shadow-sm text-[15px]"
          >
            Quay lại
          </button>
          <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#ff2d55] active:bg-[#e02045] transition-colors shadow-sm text-[15px]"
          >
            Tiếp theo
          </button>
        </div>
      </div>
    </div>
  );
}

export function WelcomeView({ onNavigate }: SetupProps) {
  return (
    <div className="absolute inset-0 bg-[#eaf4ff] p-6 pt-12 pb-10 text-black font-sans flex flex-col items-center justify-center overflow-hidden">
      <h1 className="text-[32px] font-bold text-center mb-4 tracking-tight">Chào mừng bạn đến với Darling</h1>
      <p className="text-[16px] text-center mb-10 text-gray-900 leading-relaxed max-w-[300px]">
        Hồ sơ của bạn đã được thiết lập thành công. Hãy bắt đầu khám phá và tìm kiếm những người bạn mới nhé!
      </p>
      <div className="w-full max-w-[340px]">
        <button 
          onClick={() => {
             localStorage.setItem('is_logged_in', 'true');
             window.location.reload();
          }}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-[#0a84ff] active:bg-[#0070e0] transition-colors shadow-sm text-[15px]"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
export function SetupInterests({ onNavigate }: SetupProps) {
  const { setupData, updateSetupData, updateMyProfile } = React.useContext(AppContext);
  const [pet, setPet] = React.useState(setupData.pet || '');
  const [music, setMusic] = React.useState(setupData.music || '');
  const [book, setBook] = React.useState(setupData.book || '');
  const [food, setFood] = React.useState(setupData.food || '');
  const [travel, setTravel] = React.useState(setupData.travel || '');
  const [game, setGame] = React.useState(setupData.game || '');
  const [sport, setSport] = React.useState(setupData.sport || '');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFinish = async () => {
    if (!pet || !music || !book || !food || !travel || !game || !sport) {
       setError('Vui lòng chọn đầy đủ các sở thích.');
       return;
    }
    setError('');
    
    const finalData = { ...setupData, pet, music, book, food, travel, game, sport };
    updateSetupData(finalData);
    onNavigate('setup_location');
  };

  return (
    <div className="absolute inset-0 bg-[#eaf4ff] p-6 pt-12 pb-10 text-black font-sans flex flex-col overflow-hidden">
      <h1 className="text-[26px] font-bold text-center mb-6 tracking-tight shrink-0">Sở thích của bạn</h1>
      
      <div className="max-w-[340px] w-full mx-auto flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar min-h-0">
        {error && (
            <div className="bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium mb-4 shadow-sm text-center">
               {error}
            </div>
        )}
        <SelectField label="Thú cưng:" options={pets} value={pet} onChange={setPet} />
        <SelectField label="Âm nhạc:" options={musics} value={music} onChange={setMusic} />
        <SelectField label="Sách:" options={books} value={book} onChange={setBook} />
        <SelectField label="Đồ ăn:" options={foods} value={food} onChange={setFood} />
        <SelectField label="Du lịch:" options={travels} value={travel} onChange={setTravel} />
        <SelectField label="Trò chơi:" options={games} value={game} onChange={setGame} />
        <SelectField label="Thể thao:" options={sports} value={sport} onChange={setSport} />
      </div>

      <div className="shrink-0 pt-4 flex justify-center mt-auto">
        <div className="max-w-[340px] w-full flex justify-between gap-4">
          <button 
            onClick={() => onNavigate('setup_lifestyle')}
            className="flex-1 py-3.5 rounded-xl font-bold text-black bg-white active:bg-gray-100 transition-colors shadow-sm text-[15px]"
          >
            Quay lại
          </button>
          <button 
            onClick={handleFinish}
            disabled={isSubmitting}
            className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-sm text-[15px] transition-colors ${
               isSubmitting ? 'bg-gray-400' : 'bg-[#ff2d55] active:bg-[#e02045]'
            }`}
          >
            {isSubmitting ? 'Đang lưu...' : 'Hoàn thành'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SetupLocation({ onNavigate }: SetupProps) {
  const { setupData, updateSetupData, updateMyProfile, updateSettings, resetSetupData } = React.useContext(AppContext);
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Permission toggles
  const [allowCamera, setAllowCamera] = React.useState(true);
  const [allowLocation, setAllowLocation] = React.useState(true);
  const [allowStorage, setAllowStorage] = React.useState(true);

  const requestPermissionsAndSave = async (skipPrompts = false) => {
    const email = sessionStorage.getItem('temp_register_email')?.trim().toLowerCase();
    const password = sessionStorage.getItem('temp_register_password');
    const pendingEmail = sessionStorage.getItem('registration_pending_email')?.trim().toLowerCase();
    const hasPendingRegistration = Boolean(
      email && pendingEmail === email &&
      sessionStorage.getItem('auth_token') &&
      sessionStorage.getItem('user_id')
    );
    if (!email) {
      setError('Không tìm thấy email đăng ký. Hãy quay lại nhập email và mật khẩu.');
      return;
    }
    if (!hasPendingRegistration && !password) {
      setError('Phiên đăng ký đã hết hạn. Hãy quay lại nhập lại mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    let determinedLocation = setupData.location || 'Hà Nội, Hà Nội';

    if (!skipPrompts && !hasPendingRegistration) {
      // 1. Camera permission request
      if (allowCamera && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          stream.getTracks().forEach(t => t.stop());
          localStorage.setItem('camera_permission_granted', 'true');
        } catch (e) {
          console.warn("Camera grant prompt result:", e);
          localStorage.setItem('camera_permission_granted', 'false');
        }
      } else {
        localStorage.setItem('camera_permission_granted', String(allowCamera));
      }

      // 2. Storage permission save
      localStorage.setItem('storage_permission_granted', String(allowStorage));

      // 3. Location permission request
      if (allowLocation && navigator.geolocation) {
        try {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const { latitude, longitude } = pos.coords;
                localStorage.setItem('location_permission_granted', 'true');
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                  const data = await res.json();
                  const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state || 'Gần bạn';
                  determinedLocation = city;
                  updateSetupData({ location: city });
                } catch {
                  determinedLocation = 'Gần bạn';
                }
                resolve();
              },
              (err) => {
                console.warn("Location prompt error:", err);
                localStorage.setItem('location_permission_granted', 'false');
                resolve();
              },
              { timeout: 4000 }
            );
          });
        } catch (e) {}
      } else {
        localStorage.setItem('location_permission_granted', String(allowLocation));
      }
    } else {
      localStorage.setItem('camera_permission_granted', 'false');
      localStorage.setItem('location_permission_granted', 'false');
      localStorage.setItem('storage_permission_granted', 'true');
    }

    try {
      let newUserId: number | string;
      if (hasPendingRegistration) {
        newUserId = sessionStorage.getItem('user_id')!;
      } else {
        // Create the account once; a profile-save retry reuses this session.
        const regRes = await apiFetch('/api/auth/register', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email, password })
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok) {
           setError(regData.error || 'Có lỗi xảy ra khi tạo tài khoản. Hãy kiểm tra thông tin và thử lại.');
           return;
        }

        newUserId = regData?.user?.id ?? regData?.userId;
        if (!newUserId || !regData?.token) {
          setError('Tài khoản có thể đã được tạo nhưng phiên đăng nhập chưa sẵn sàng. Hãy đăng nhập bằng email này hoặc liên hệ hỗ trợ.');
          return;
        }
        sessionStorage.setItem('auth_token', regData.token);
        localStorage.setItem('auth_token', regData.token);
        sessionStorage.setItem('user_id', String(newUserId));
        localStorage.setItem('user_id', String(newUserId));
        sessionStorage.setItem('registration_pending_email', email);
      }

      // 2. Save profile
      const profileRes = await apiFetch('/api/users/profile', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, profileData: { ...setupData, location: determinedLocation, need: setupData.intent } })
      });
      if (!profileRes.ok) {
        const profileError = await profileRes.json().catch(() => ({}));
        throw new Error(profileError.error || 'Không lưu được hồ sơ. Tài khoản đã được tạo; hãy thử lưu lại.');
      }

      // Set global profile in context
      updateMyProfile({
          id: newUserId,
          name: setupData.name,
          dob: setupData.dob,
          zodiac: setupData.zodiac,
          lunarAnimal: setupData.lunarAnimal,
          lunarBranch: setupData.lunarBranch,
          gender: setupData.gender,
          height: setupData.height,
          images: setupData.images || [],
          job: setupData.job,
          language: setupData.language,
          religion: setupData.religion,
          communicationStyle: setupData.communicationStyle,
          need: setupData.intent,
          intent: setupData.intent,
          pet: setupData.pet,
          music: setupData.music,
          book: setupData.book,
          food: setupData.food,
          travel: setupData.travel,
          game: setupData.game,
          sport: setupData.sport,
          location: determinedLocation,
      } as any);

      updateSettings({
          interestedIn: setupData.gender === 'Nam' ? 'Nữ' : 'Nam',
          location: determinedLocation
      });

      sessionStorage.removeItem('temp_register_password');
      sessionStorage.removeItem('registration_pending_email');
      sessionStorage.removeItem('setup_draft_email');
      resetSetupData();
      onNavigate('welcome');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng rồi thử lưu lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#eaf4ff] p-5 pt-10 pb-8 text-black font-sans flex flex-col items-center justify-center overflow-y-auto">
       <div className="bg-white rounded-3xl p-6 max-w-[360px] w-full shadow-2xl text-black flex flex-col items-center">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-3 border border-sky-100 shadow-sm">
             <Shield className="w-8 h-8 text-[#0284c7]" />
          </div>
          <h2 className="text-[20px] font-extrabold mb-1 tracking-tight text-center">Quyền truy cập ứng dụng</h2>
          <p className="text-[13px] text-gray-500 mb-5 text-center leading-relaxed">
             Cho phép truy cập các tính năng thiết bị để có trải nghiệm kết nối trọn vẹn nhất. Bạn có thể thay đổi lại trong Cài đặt bất cứ lúc nào.
          </p>

          {error && <p className="text-red-500 text-xs font-bold mb-3 text-center">{error}</p>}

          {/* 3 Permission Toggles */}
          <div className="w-full space-y-2.5 mb-6">
             {/* 1. Camera */}
             <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-black/5">
                <div className="flex items-center gap-2.5 pr-2">
                   <div className="w-8 h-8 rounded-lg bg-sky-100/80 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-[#0284c7]" />
                   </div>
                   <div>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug">Máy ảnh (Camera)</p>
                      <p className="text-[11px] text-gray-500">Chụp ảnh khoảnh khắc & đại diện</p>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setAllowCamera(!allowCamera)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${allowCamera ? 'bg-[#0284c7]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${allowCamera ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>

             {/* 2. Location */}
             <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-black/5">
                <div className="flex items-center gap-2.5 pr-2">
                   <div className="w-8 h-8 rounded-lg bg-rose-100/80 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-rose-500" />
                   </div>
                   <div>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug">Vị trí (Location)</p>
                      <p className="text-[11px] text-gray-500">Tìm kiếm người dùng xung quanh</p>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setAllowLocation(!allowLocation)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${allowLocation ? 'bg-[#0284c7]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${allowLocation ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>

             {/* 3. Storage */}
             <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-black/5">
                <div className="flex items-center gap-2.5 pr-2">
                   <div className="w-8 h-8 rounded-lg bg-amber-100/80 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-amber-600" />
                   </div>
                   <div>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug">Thư mục & Tệp tin</p>
                      <p className="text-[11px] text-gray-500">Tải ảnh từ thư viện thiết bị</p>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setAllowStorage(!allowStorage)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${allowStorage ? 'bg-[#0284c7]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${allowStorage ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>
          </div>

          <button 
             onClick={() => requestPermissionsAndSave(false)}
             disabled={isSubmitting}
             className="w-full py-3.5 mb-2 rounded-xl font-bold text-white bg-[#ff2d55] hover:bg-[#e0244b] active:scale-[0.98] transition-all shadow-md text-[15px] flex items-center justify-center gap-2"
          >
             {isSubmitting ? 'Đang xử lý...' : 'Cho phép & Tiếp tục'}
          </button>

          <button 
             onClick={() => requestPermissionsAndSave(true)}
             disabled={isSubmitting}
             className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
             Để sau (Bỏ qua)
          </button>
          <button
             type="button"
             onClick={() => onNavigate('setup_interests')}
             disabled={isSubmitting}
             className="w-full py-2 text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors"
          >
             Quay lại sở thích
          </button>
       </div>
    </div>
  );
}
