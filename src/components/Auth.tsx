import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../types';
import { Heart } from 'lucide-react';
import { AppContext } from './MainApp';

interface AuthProps {
  onNavigate: (view: ViewState) => void;
  onLoginSuccess: () => void;
}

export function Login({ onNavigate, onLoginSuccess }: AuthProps) {
  const { updateMyProfile } = React.useContext(AppContext);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);

  const handleForgotPassword = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu mới');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
         setError('Đổi mật khẩu thành công! Hãy đăng nhập.');
         setTimeout(() => setError(''), 3000);
         setIsForgotPassword(false);
         setPassword('');
      } else {
         setError(data.error || 'Không thể đổi mật khẩu');
      }
    } catch (e) {
      setError('Lỗi kết nối server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();

      if (!res.ok) {
         setError(data.error || 'Đăng nhập thất bại');
         setIsSubmitting(false);
         return;
      }

      // Store auth info
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('temp_register_email', cleanEmail); // for ProfileView to read
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('temp_register_email', cleanEmail);
      if (data.user && data.user.id) {
         sessionStorage.setItem('user_id', data.user.id.toString());
         localStorage.setItem('user_id', data.user.id.toString());
      }

      if (data.user && data.user.profileData) {
         const profile = typeof data.user.profileData === 'string' ? JSON.parse(data.user.profileData) : data.user.profileData;
         updateMyProfile({
            name: profile.name,
            dob: profile.dob,
            gender: profile.gender,
            zodiac: profile.zodiac,
            height: profile.height,
            images: profile.images || [],
            job: profile.job,
            language: profile.language,
            religion: profile.religion,
            communicationStyle: profile.communicationStyle,
            intent: profile.intent,
            pet: profile.pet,
            music: profile.music,
            book: profile.book,
            food: profile.food,
            travel: profile.travel,
            game: profile.game,
            sport: profile.sport,
         });
      }

      setIsSubmitting(false);
      onLoginSuccess();
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ff9ca0] flex flex-col items-center justify-center p-6 text-black font-sans box-border relative overflow-hidden">
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 bg-red-500 text-white px-6 py-3 rounded-full text-sm font-medium z-50 shadow-lg text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-full max-w-[320px] flex flex-col items-center mt-[-10vh]">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Darling</h1>
        <div className="relative mb-14 flex justify-center items-center">
          <Heart className="w-[72px] h-[72px] text-white absolute -left-5 top-2 fill-transparent stroke-[3]" />
          <Heart className="w-[56px] h-[56px] text-black absolute left-5 top-8 stroke-[3]" />
        </div>
        
        {isForgotPassword ? (
          <div className="text-center mb-8 mt-16">
            <h2 className="text-[22px] font-bold mb-2">Đổi mật khẩu</h2>
            <p className="text-[15px] leading-snug">Nhập Email của bạn và mật khẩu mới để đặt lại.</p>
          </div>
        ) : (
          <div className="text-center mb-8 mt-16">
            <h2 className="text-[22px] font-bold mb-2">Đăng nhập tài khoản</h2>
            <p className="text-[15px] leading-snug">Nhập Email và mật khẩu của bạn để đăng nhập vào<br/>ứng dụng này</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isForgotPassword ? "Email tài khoản" : "email@domain.com"}
            className="w-full px-4 py-3 rounded-[10px] border-none bg-white font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            placeholder={isForgotPassword ? "Mật khẩu mới thay thế" : "Mật khẩu"}
            className="w-full px-4 py-3 rounded-[10px] border-none bg-white font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white mb-1"
          />
          
          {isForgotPassword ? (
            <>
              <button 
                onClick={handleForgotPassword}
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-[10px] font-medium text-white shadow-sm transition-colors flex items-center justify-center ${
                   isSubmitting ? 'bg-gray-400' : 'bg-[#ff686b] active:bg-[#e0585c]'
                }`}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
              <button 
                onClick={() => { setIsForgotPassword(false); setError(''); setPassword(''); }}
                className="w-full py-3.5 rounded-[10px] font-medium text-black shadow-sm bg-white/50 active:bg-white/80 transition-colors"
              >
                Trở lại đăng nhập
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleLogin}
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-[10px] font-medium text-white shadow-sm transition-colors flex items-center justify-center ${
                   isSubmitting ? 'bg-gray-400' : 'bg-[#2cd94d] active:bg-[#25c444]'
                }`}
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
              
              <button 
                onClick={() => onNavigate('register')}
                className="w-full py-3.5 rounded-[10px] font-medium text-white shadow-sm bg-[#0a84ff] active:bg-[#0070e0] transition-colors"
              >
                Đăng ký
              </button>
              
              <button 
                onClick={() => { setIsForgotPassword(true); setError(''); setPassword(''); }}
                className="w-full py-3.5 rounded-[10px] font-medium text-white shadow-sm bg-[#ff686b] active:bg-[#e0585c] transition-colors"
              >
                Quên mật khẩu
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Register({ onNavigate, onLoginSuccess }: AuthProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleRegister = () => {
    if (!email || !password || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp!');
      return;
    }
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    
    // Store temporarily in memory or pass through a global state
    sessionStorage.setItem('temp_register_email', cleanEmail);
    sessionStorage.setItem('temp_register_password', password);
    onNavigate('setup_basic');
  };

  return (
    <div className="min-h-screen bg-[#ff9ca0] flex flex-col items-center justify-center p-6 text-black font-sans box-border relative overflow-hidden">
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 bg-red-500 text-white px-6 py-3 rounded-full text-sm font-medium z-50 shadow-lg text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        key="form"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="w-full max-w-[320px] flex flex-col items-center"
      >
        <h1 className="text-[28px] font-bold mb-8 tracking-tight">Đăng ký</h1>
        
        <div className="w-full flex flex-col gap-3">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email của bạn" 
            className="w-full px-4 py-3 rounded-[10px] border-none bg-white font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu" 
            className="w-full px-4 py-3 rounded-[10px] border-none bg-white font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu" 
            className="w-full px-4 py-3 rounded-[10px] border-none bg-white font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          />
          
          <button 
            onClick={handleRegister}
            className="w-full py-3.5 rounded-[10px] font-medium text-white shadow-sm bg-[#0a84ff] active:bg-[#0070e0] transition-colors flex items-center justify-center gap-2 mt-4"
          >
            Đăng ký
          </button>
          
          <button 
            onClick={() => onNavigate('login')}
            className="w-full py-3.5 rounded-[10px] font-medium text-white shadow-sm bg-gray-400 transition-colors"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </motion.div>
    </div>
  );
}
