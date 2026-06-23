import React from 'react';
import { ViewState } from '../types';
import { genders, jobs, languages, religions, communicationStyles, intents, pets, musics, books, foods, travels, games, sports } from '../data';
import { Calendar, Image as ImageIcon, ChevronDown, ChevronsUpDown, MapPin, CheckCircle } from 'lucide-react';
import { AppContext } from './MainApp';

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
  
  const getZodiacSign = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1; // 1-12
    if (!day || !month) return '';

    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Bảo Bình";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Song Ngư";
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Bạch Dương";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Kim Ngưu";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return "Song Tử";
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return "Cự Giải";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Sư Tử";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Xử Nữ";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return "Thiên Bình";
    if ((month === 10 && day >= 24) || (month === 11 && day <= 21)) return "Bọ Cạp";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Nhân Mã";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Ma Kết";
    return "";
  };

  const zodiac = getZodiacSign(dob);

  const handleNext = () => {
    if (!name || !dob || !gender || !height || !images.some(img => img !== '')) {
       setError('Vui lòng điền đầy đủ thông tin và chọn ít nhất 1 ảnh.');
       return;
    }
    setError('');
    updateSetupData({ name, dob, gender, height, zodiac, images: images.filter(img => img !== '') });
    onNavigate('setup_lifestyle');
  };

  return (
    <div className="absolute inset-0 bg-[#ff9ca0] p-6 pt-12 pb-10 text-black font-sans flex flex-col overflow-hidden">
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
          {zodiac && (
            <p className="text-sm mt-2 font-medium bg-white/40 px-3 py-1.5 rounded-lg inline-block border border-black/5">
              Cung hoàng đạo: <span className="font-bold">{zodiac}</span>
            </p>
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
        <div className="max-w-[340px] w-full">
          <button 
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-[#ff2d55] active:bg-[#e02045] transition-colors shadow-sm text-[15px]"
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
    <div className="absolute inset-0 bg-[#ff9ca0] p-6 pt-12 pb-10 text-black font-sans flex flex-col overflow-hidden">
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
    <div className="absolute inset-0 bg-[#ff9ca0] p-6 pt-12 pb-10 text-black font-sans flex flex-col items-center justify-center overflow-hidden">
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
    <div className="absolute inset-0 bg-[#ff9ca0] p-6 pt-12 pb-10 text-black font-sans flex flex-col overflow-hidden">
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
  const { setupData, updateSetupData, updateMyProfile, updateSettings } = React.useContext(AppContext);
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [locationStatus, setLocationStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');

  const handleAllowLocation = () => {
    setLocationStatus('loading');
    setError('');
    
    if (!navigator.geolocation) {
       setError('Trình duyệt của bạn không hỗ trợ định vị.');
       setLocationStatus('idle');
       return;
    }

    navigator.geolocation.getCurrentPosition(
       async (position) => {
         const { latitude, longitude } = position.coords;
         try {
             // Use reverse geocoding
             const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
             const data = await res.json();
             const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state || 'Gần bạn';
             updateSetupData({ location: city });
             setLocationStatus('success');
         } catch {
             updateSetupData({ location: 'Gần bạn' });
             setLocationStatus('success');
         }
       },
       (err) => {
         console.error(err);
         setError('Không thể lấy vị trí. Vui lòng kiểm tra quyền cài đặt.');
         setLocationStatus('idle');
       }
    );
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    
    const email = sessionStorage.getItem('temp_register_email');
    const password = sessionStorage.getItem('temp_register_password');
    
    try {
      // 1. Create account
      const regRes = await fetch('/api/auth/register', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password })
      });
      const regData = await regRes.json();
      
      if (!regRes.ok) {
         setError(regData.error || 'Có lỗi xảy ra khi tạo tài khoản');
         setIsSubmitting(false);
         return;
      }

      // 2. Save profile
      await fetch('/api/users/profile', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, profileData: { ...setupData, need: setupData.intent } })
      });

      if (regData.success) {
         sessionStorage.setItem('user_id', regData.userId.toString());
         localStorage.setItem('user_id', regData.userId.toString());
      }

      // Set global profile in context
      updateMyProfile({
          id: regData.userId || 999,
          name: setupData.name,
          dob: setupData.dob,
          zodiac: setupData.zodiac,
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
          location: setupData.location,
      } as any);

      updateSettings({
          interestedIn: setupData.gender === 'Nam' ? 'Nữ' : 'Nam',
          location: setupData.location || 'Hà Nội, Hà Nội'
      });

      sessionStorage.removeItem('temp_register_password');

      setIsSubmitting(false);
      onNavigate('welcome');
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối đến máy chủ.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#ff9ca0] p-6 pt-12 pb-10 text-white font-sans flex flex-col items-center justify-center overflow-hidden">
       <div className="bg-white rounded-3xl p-8 max-w-[340px] w-full text-center shadow-xl text-black flex flex-col items-center">
          <div className="w-20 h-20 bg-[#ffeff1] rounded-full flex items-center justify-center mb-6">
             <MapPin className="w-10 h-10 text-[#ff2d55]" />
          </div>
          <h2 className="text-[22px] font-bold mb-3">Bật vị trí</h2>
          <p className="text-[15px] text-gray-600 mb-8 font-medium">
             Cho phép Darling truy cập vào thông tin vị trí thiết bị của bạn để tìm những hồ sơ ấn tượng ở khu vực lân cận.
          </p>
          
          {error && <p className="text-red-500 text-sm font-medium mb-4">{error}</p>}
          
          {locationStatus === 'success' ? (
             <div className="text-green-600 font-bold mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Đã xác định vị trí
             </div>
          ) : (
             <button 
                onClick={handleAllowLocation}
                disabled={locationStatus === 'loading'}
                className="w-full py-3.5 mb-3 rounded-xl font-bold text-white bg-[#0a84ff] active:bg-[#0070e0] transition-colors shadow-sm text-[15px]"
             >
                {locationStatus === 'loading' ? 'Đang tải...' : 'Cho phép'}
             </button>
          )}

          <button 
             onClick={handleFinish}
             disabled={isSubmitting}
             className="w-full py-3.5 mt-2 rounded-xl font-bold text-black border-2 border-black/10 active:bg-gray-100 transition-colors text-[15px]"
          >
             {isSubmitting ? 'Đang lưu...' : (locationStatus === 'success' ? 'Tiếp tục' : 'Để sau')}
          </button>
       </div>
    </div>
  );
}
