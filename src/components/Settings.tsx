import React, { useState } from 'react';
import { ViewState } from '../types';
import { ArrowLeft, Bell, Lock, CircleHelp, Info, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsProps {
  onNavigate: (v: ViewState) => void;
}

export function SettingsView({ onNavigate }: SettingsProps) {
  const [activeSubView, setActiveSubView] = useState<null | 'security' | 'notifications' | 'help' | 'about'>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Settings states
  const [notiPush, setNotiPush] = useState(true);
  const [notiEmail, setNotiEmail] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{message: string, isError: boolean} | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailFeedback, setEmailFeedback] = useState<{message: string, isError: boolean} | null>(null);

  const handleChangeEmail = async () => {
     if (!newEmail || !emailPassword) {
         setEmailFeedback({ message: 'Vui lòng nhập đầy đủ thông tin', isError: true });
         return;
     }

     const oldEmail = sessionStorage.getItem('temp_register_email');
     if (!oldEmail) {
         setEmailFeedback({ message: 'Chưa đăng nhập', isError: true });
         return;
     }

     try {
         const res = await fetch('/api/auth/change-email', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ oldEmail, newEmail, password: emailPassword })
         });
         const data = await res.json();
         if (data.success) {
             setEmailFeedback({ message: 'Đổi email thành công!', isError: false });
             setNewEmail('');
             setEmailPassword('');
             sessionStorage.setItem('temp_register_email', newEmail);
         } else {
             setEmailFeedback({ message: data.error || 'Đổi email thất bại', isError: true });
         }
     } catch (e) {
         setEmailFeedback({ message: 'Đã xảy ra lỗi hệ thống', isError: true });
     }
  };

  const handleChangePassword = async () => {
     if (!newPassword) {
         setPasswordFeedback({ message: 'Vui lòng nhập mật khẩu mới', isError: true });
         return;
     }
     
     const email = sessionStorage.getItem('temp_register_email');
     if (!email) {
         setPasswordFeedback({ message: 'Lỗi xác thực. Hãy đăng nhập lại.', isError: true });
         return;
     }

     try {
         const res = await fetch('/api/auth/change-password', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, oldPassword, newPassword })
         });
         const data = await res.json();
         if (data.success) {
             setPasswordFeedback({ message: 'Đổi mật khẩu thành công!', isError: false });
             setOldPassword('');
             setNewPassword('');
         } else {
             setPasswordFeedback({ message: data.error || 'Đổi mật khẩu thất bại', isError: true });
         }
     } catch (e) {
         setPasswordFeedback({ message: 'Đã xảy ra lỗi hệ thống', isError: true });
     }
  };

  return (
    <div className="min-h-full w-full bg-[#fff0f1] font-sans flex flex-col relative">
      <div className="w-full flex-1 flex flex-col relative bg-white pb-10 overflow-hidden min-h-screen">
        
        {/* Main Settings View */}
        <AnimatePresence>
          {!activeSubView && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col pointer-events-auto h-full"
            >
              <div className="bg-[#ff9ca0] h-[90px] pt-[40px] px-4 flex items-center shrink-0 shadow-sm z-10 w-full relative">
                <button onClick={() => onNavigate('app_profile')} className="p-1 -ml-2 active:scale-90 transition">
                   <ArrowLeft className="w-7 h-7 text-black stroke-[2]" />
                </button>
                <span className="font-bold text-[20px] ml-2 tracking-tight">Cài đặt</span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pt-8 space-y-8 pb-32 bg-[#fafafa]">
                 <div>
                   <h2 className="text-[14px] font-bold text-[#ff2d55] mb-3 uppercase tracking-wider">Tài khoản & Bảo mật</h2>
                   <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                      <button onClick={() => setActiveSubView('security')} className="w-full flex items-center justify-between text-[16px] font-medium text-black h-14 px-4 active:bg-gray-50 transition border-b border-black/5">
                         <div className="flex items-center gap-3">
                           <Lock className="w-5 h-5 text-gray-500" />
                           Bảo mật tài khoản
                         </div>
                         <ChevronRight className="w-5 h-5 text-gray-300" />
                      </button>
                      <button onClick={() => setActiveSubView('notifications')} className="w-full flex items-center justify-between text-[16px] font-medium text-black h-14 px-4 active:bg-gray-50 transition">
                         <div className="flex items-center gap-3">
                           <Bell className="w-5 h-5 text-gray-500" />
                           Thông báo
                         </div>
                         <ChevronRight className="w-5 h-5 text-gray-300" />
                      </button>
                   </div>
                 </div>

                 <div>
                   <h2 className="text-[14px] font-bold text-[#ff2d55] mb-3 uppercase tracking-wider">Hỗ trợ</h2>
                   <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                      <button onClick={() => setActiveSubView('help')} className="w-full flex items-center justify-between text-[16px] font-medium text-black h-14 px-4 active:bg-gray-50 transition border-b border-black/5">
                         <div className="flex items-center gap-3">
                           <CircleHelp className="w-5 h-5 text-gray-500" />
                           Trung tâm trợ giúp
                         </div>
                         <ChevronRight className="w-5 h-5 text-gray-300" />
                      </button>
                      <button onClick={() => setActiveSubView('about')} className="w-full flex items-center justify-between text-[16px] font-medium text-black h-14 px-4 active:bg-gray-50 transition">
                         <div className="flex items-center gap-3">
                           <Info className="w-5 h-5 text-gray-500" />
                           Về chúng tôi
                         </div>
                         <ChevronRight className="w-5 h-5 text-gray-300" />
                      </button>
                   </div>
                 </div>

                 <div className="pt-6 flex flex-col gap-4">
                   <button 
                     className="w-full py-4 text-[16px] font-bold text-white bg-[#ff2d55] rounded-xl shadow-md active:bg-[#e02046] transition-colors"
                     onClick={() => {
                        localStorage.clear();
                        sessionStorage.clear(); onNavigate('login');
                     }}
                   >
                     Đăng xuất
                   </button>

                   <button 
                     onClick={() => setShowDeleteConfirm(true)}
                     className="w-full py-4 text-[16px] font-bold text-gray-600 bg-white border border-black/10 rounded-xl active:bg-gray-100 transition-colors shadow-sm"
                   >
                     Xóa tài khoản
                   </button>
                 </div>
                 
                 <div className="w-full text-center mt-12 pb-8">
                     <span className="text-[32px] font-bold tracking-tighter text-[#ff2d55] opacity-20">Darling</span>
                     <p className="text-[12px] text-gray-400 font-medium mt-1">Phiên bản 1.0.0 (build 84)</p>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sub Views */}
        <AnimatePresence>
          {activeSubView && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[#fafafa] flex flex-col pointer-events-auto h-full z-20"
            >
              <div className="bg-white border-b border-black/10 h-[90px] pt-[40px] px-4 flex items-center shrink-0 shadow-sm z-10 w-full relative">
                <button onClick={() => setActiveSubView(null)} className="p-1 -ml-2 active:scale-90 transition">
                   <ArrowLeft className="w-7 h-7 text-[#ff2d55] stroke-[2.5]" />
                </button>
                <span className="font-bold text-[18px] ml-2 text-black tracking-tight">
                  {activeSubView === 'security' && 'Bảo mật tài khoản'}
                  {activeSubView === 'notifications' && 'Cài đặt thông báo'}
                  {activeSubView === 'help' && 'Trung tâm trợ giúp'}
                  {activeSubView === 'about' && 'Về chúng tôi'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pt-6 pb-12">
                {activeSubView === 'security' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
                       <h3 className="text-[16px] font-bold mb-4">Mật khẩu của bạn</h3>
                       <div className="space-y-3">
                         {passwordFeedback && (
                           <div className={`text-[14px] ${passwordFeedback.isError ? 'text-red-500' : 'text-green-500'} font-medium`}>
                             {passwordFeedback.message}
                           </div>
                         )}
                         <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Mật khẩu hiện tại" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#ff2d55]/30 text-[15px]" />
                         <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#ff2d55]/30 text-[15px]" />
                         <button onClick={handleChangePassword} className="w-full py-3.5 bg-black text-white font-bold rounded-xl mt-2 active:scale-95 transition-transform text-[15px]">Cập nhật</button>
                       </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
                       <h3 className="text-[16px] font-bold mb-4">Chỉnh sửa email</h3>
                       <div className="space-y-3">
                         {emailFeedback && (
                           <div className={`text-[14px] ${emailFeedback.isError ? 'text-red-500' : 'text-green-500'} font-medium`}>
                             {emailFeedback.message}
                           </div>
                         )}
                         <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email mới" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#ff2d55]/30 text-[15px]" />
                         <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="Mật khẩu xác nhận" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#ff2d55]/30 text-[15px]" />
                         <button onClick={handleChangeEmail} className="w-full py-3.5 bg-black text-white font-bold rounded-xl mt-2 active:scale-95 transition-transform text-[15px]">Đổi email</button>
                       </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex items-center justify-between">
                       <div className="flex flex-col">
                         <h3 className="text-[16px] font-bold">Xác thực 2 yếu tố</h3>
                         <p className="text-gray-500 text-[13px] font-medium leading-tight mt-1 max-w-[200px]">Tăng cường bảo mật bằng mã SMS khi đăng nhập.</p>
                       </div>
                       <button 
                         onClick={() => setTwoFactor(!twoFactor)}
                         className={`w-[48px] h-[28px] rounded-full relative shrink-0 transition-colors ${twoFactor ? 'bg-[#ff2d55]' : 'bg-gray-300'}`}
                       >
                         <div className={`absolute top-1 w-[20px] h-[20px] bg-white rounded-full flex items-center justify-center shadow-sm transition-transform ${twoFactor ? 'right-1' : 'left-1'}`} />
                       </button>
                    </div>
                  </div>
                )}

                {activeSubView === 'notifications' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                       <div className="p-4 border-b border-black/5 flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-[16px] font-bold">Thông báo Đẩy</span>
                           <span className="text-[13px] text-gray-500 font-medium">Tin nhắn mới, Lượt thích</span>
                         </div>
                         <button onClick={() => setNotiPush(!notiPush)} className={`w-[48px] h-[28px] rounded-full relative shrink-0 transition-colors ${notiPush ? 'bg-[#ff2d55]' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-[20px] h-[20px] bg-white rounded-full transition-transform ${notiPush ? 'right-1' : 'left-1'}`} />
                         </button>
                       </div>
                       <div className="p-4 flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-[16px] font-bold">Email</span>
                           <span className="text-[13px] text-gray-500 font-medium">Khuyến mãi, Cập nhật ứng dụng</span>
                         </div>
                         <button onClick={() => setNotiEmail(!notiEmail)} className={`w-[48px] h-[28px] rounded-full relative shrink-0 transition-colors ${notiEmail ? 'bg-[#ff2d55]' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-[20px] h-[20px] bg-white rounded-full transition-transform ${notiEmail ? 'right-1' : 'left-1'}`} />
                         </button>
                       </div>
                    </div>
                  </div>
                )}

                {activeSubView === 'help' && (
                  <div className="space-y-4">
                    {['Làm thế nào để tạo tài khoản mới?', 'Tại sao tôi không có tương hợp?', 'Thay đổi thông tin hồ sơ như thế nào?', 'Làm sao để xóa tài khoản cá nhân?'].map((q, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 cursor-pointer active:scale-[0.98] transition-transform">
                        <h4 className="font-bold text-[15px] pr-8 relative">
                          {q}
                          <ChevronRight className="w-5 h-5 text-gray-300 absolute right-0 top-1/2 -translate-y-1/2" />
                        </h4>
                      </div>
                    ))}
                    <button className="w-full mt-4 py-4 bg-[#ff2d55]/10 text-[#ff2d55] font-bold rounded-xl active:bg-[#ff2d55]/20 transition-colors">
                      Liên hệ bộ phận chăm sóc
                    </button>
                  </div>
                )}

                {activeSubView === 'about' && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 text-center flex flex-col items-center">
                    <span className="text-[40px] font-bold tracking-tighter text-[#ff2d55] drop-shadow-sm mb-4">Darling</span>
                    <p className="text-[15px] font-medium text-gray-600 mb-6 leading-relaxed">
                      Darling là nền tảng kết nối và hẹn hò hoàn toàn mới, mang đến cho người dùng những trải nghiệm tìm kiếm chân thật, thú vị cùng phong cách sống hiện đại.
                    </p>
                    <div className="w-full space-y-4 text-left border-t border-black/10 pt-6">
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="text-gray-500 font-medium">Phiên bản</span>
                        <span className="font-bold">1.0.0</span>
                      </div>
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="text-gray-500 font-medium">Bản quyền</span>
                        <span className="font-bold">© 2026 Darling Inc.</span>
                      </div>
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="text-gray-500 font-medium">Điều khoản dịch vụ</span>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="text-gray-500 font-medium">Chính sách bảo mật</span>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm"
            >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="bg-white w-full max-w-[320px] rounded-3xl p-6 flex flex-col items-center shadow-2xl relative overflow-hidden"
               >
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                   <Lock className="w-8 h-8 text-red-500" />
                 </div>
                 <h2 className="text-[20px] font-bold text-center mb-2 text-black">Xóa tài khoản?</h2>
                 <p className="text-[14px] text-gray-500 text-center mb-6 leading-snug">Hành động này không thể hoàn tác. Mọi dữ liệu về hồ sơ, lượt thích, và tin nhắn sẽ bị xóa vĩnh viễn.</p>
                 
                 <div className="w-full flex flex-col gap-3">
                    <button 
                      onClick={async () => {
                        const userId = sessionStorage.getItem('user_id');
                        if (userId) {
                            try {
                                await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                            } catch (e) {
                                console.error(e);
                            }
                        }
                        localStorage.clear();
                        sessionStorage.clear(); window.location.reload();
                      }}
                      className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl text-[16px] shadow-sm active:scale-95 transition-transform"
                    >
                      Vẫn xóa tài khoản
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-full py-3.5 bg-gray-100 text-gray-800 font-bold rounded-xl text-[16px] active:scale-95 transition-transform"
                    >
                      Hủy bỏ
                    </button>
                 </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
