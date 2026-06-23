const fs = require('fs');

const replacement = `export function ChatView() {
  const { activeChatUser, setActiveChatUser, likedProfiles } = React.useContext(AppContext);
  const [activeChat, setActiveChat] = useState<{name: string, img: string} | null>(activeChatUser || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  
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

  useEffect(() => {
    if (activeChat) {
      try {
        const storedTheme = localStorage.getItem('ais_theme_' + activeChat.name);
        if (storedTheme) setChatTheme(storedTheme);
        const stored = localStorage.getItem('ais_chat_' + activeChat.name);
        if (stored) {
           setMessages(JSON.parse(stored));
           return;
        }
      } catch(e) {}
      setMessages([]);
    }
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
  }, [messages, showEmojiPicker, isRecording]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      if (notificationsEnabled) {
          playBlingSound();
          setNotification({ title: activeChat?.name || 'Tin nhắn mới', text: "Tuyệt quá! 😊" });
          setTimeout(() => setNotification(null), 3000);
      }
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Tuyệt quá! Bạn rảnh không, cuối tuần này đi cafe dạo phố nhé? 😊",
        sender: "them",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
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
              
              setTimeout(() => {
                 if (notificationsEnabled) {
                     playBlingSound();
                     setNotification({ title: activeChat?.name || 'Tin nhắn mới', text: "Giọng bạn hay quá!" });
                     setTimeout(() => setNotification(null), 3000);
                 }
                 setMessages(prev => [...prev, {
                     id: Date.now() + 1,
                     text: "Trời, giọng bạn hay quá! 🥰",
                     sender: "them",
                     time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                 }]);
              }, 2000);
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
      const matchedChats = [...likedProfiles];
      
      try {
         for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ais_chat_')) {
               const chatName = key.replace('ais_chat_', '');
               if (!matchedChats.find((c: any) => c.name === chatName)) {
                   const historyRaw = localStorage.getItem(key);
                   if (historyRaw && JSON.parse(historyRaw).length > 0) {
                      matchedChats.unshift({ name: chatName, images: [\`https://ui-avatars.com/api/?name=\${encodeURIComponent(chatName)}&background=ff9ca0&color=fff\`] });
                   }
               }
            }
         }
      } catch(e) {}
      
      if (activeChatUser && !matchedChats.find((c: any) => c.name === activeChatUser.name)) {
          matchedChats.unshift({ name: activeChatUser.name, images: [activeChatUser.img] });
      }

      setChats(matchedChats.map((c: any, i: number) => {
         let lastMsg = 'Bắt đầu trò chuyện...';
         try {
            const historyRaw = localStorage.getItem('ais_chat_' + c.name);
            if (historyRaw) {
               const parsed = JSON.parse(historyRaw);
               if (parsed.length > 0) {
                   lastMsg = parsed[parsed.length - 1].isImage ? '[Hình ảnh]' : (parsed[parsed.length - 1].isAudio ? '[Âm thanh]' : parsed[parsed.length - 1].text);
               }
            }
         } catch(e) {}
         
         return {
           name: c.name, 
           img: c.images?.[0] || c.img || \`https://i.pravatar.cc/150?img=\${i+4}\`, 
           isUnread: false,
           lastMsg,
           message: lastMsg
         };
      }));
  }, [likedProfiles, activeChatUser, messages, activeChat]);

  const toggleTheme = () => {
     const themes = ['#ff2d55', '#0084ff', '#8f47ff', '#ff9ca0', '#00cba9'];
     const nextTheme = themes[(themes.indexOf(chatTheme) + 1) % themes.length];
     setChatTheme(nextTheme);
     if (activeChat) localStorage.setItem('ais_theme_' + activeChat.name, nextTheme);
  };
  
  const handleBlock = () => {
     setConfirmModal({
        title: \`Chặn \${activeChat?.name}\`,
        message: \`Bạn có chắc chắn muốn chặn người dùng này không? Bạn sẽ không thể thấy hồ sơ hay nhận tin nhắn từ họ nữa.\`,
        onConfirm: () => {
            if (activeChat) localStorage.removeItem('ais_chat_' + activeChat.name);
            popAlert('Đã chặn người dùng này.');
            closeChat();
            setShowInfo(false);
        }
     });
  };

  const handleReport = () => {
     setConfirmModal({
        title: \`Báo cáo tài khoản\`,
        message: \`Bạn muốn báo cáo tài khoản này vì vi phạm tiêu chuẩn cộng đồng?\`,
        onConfirm: () => {
            popAlert('Cảm ơn. Chúng tôi sẽ xem xét báo cáo của bạn!');
        }
     });
  };

  const handleDeleteChat = () => {
     setConfirmModal({
        title: \`Xóa đoạn chat\`,
        message: \`Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này? Không thể hoàn tác.\`,
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
            <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="fixed top-12 left-4 right-4 bg-gray-900 text-white rounded-xl p-4 z-[999] shadow-lg flex items-center justify-between">
                <span className="text-[14px] font-medium">{alertMsg}</span>
                <button onClick={() => setAlertMsg(null)}><X className="w-5 h-5 opacity-70"/></button>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
            <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="fixed top-12 left-4 right-4 bg-white text-black rounded-2xl p-4 z-[999] shadow-2xl flex items-center gap-4">
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
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-6">
                <motion.div initial={{scale: 0.9}} animate={{scale: 1}} className="bg-white rounded-2xl w-full max-w-[320px] overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-6 flex flex-col items-center text-center">
                        <span className="text-[18px] font-bold text-black mb-2">{confirmModal.title}</span>
                        <span className="text-[15px] text-gray-500 leading-relaxed">{confirmModal.message}</span>
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
            className="bg-white fixed inset-0 z-[100] flex flex-col"
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
                     <div key={msg.id} className={\`flex items-end gap-2 \${isMe ? 'justify-end' : ''}\`}>
                       {!isMe && (
                         <img src={activeChat.img} className="w-[28px] h-[28px] rounded-full object-cover mb-1 shadow-sm border border-black/5 shrink-0" />
                       )}
                       <div className="flex flex-col gap-1 max-w-[75%]">
                          <div style={{ backgroundColor: isMe && !msg.isAudio && !msg.isImage ? chatTheme : (msg.isAudio || msg.isImage ? 'transparent' : '#ffffff') }} className={\`px-4 py-2.5 shadow-sm text-[15px] \${isMe ? 'text-white rounded-l-2xl rounded-tr-2xl rounded-br-sm font-medium' : 'bg-white border border-black/5 text-black rounded-r-2xl rounded-tl-2xl rounded-bl-sm'} \${msg.isImage || msg.isAudio ? 'p-0 shadow-none border-none' : ''}\`}>
                            {msg.isImage ? (
                              <img src={msg.text} className="w-full rounded-xl object-cover max-h-[250px] shadow-sm border border-black/5" alt="Chat image" />
                            ) : msg.isAudio ? (
                              <audio controls src={msg.text} className="h-10 max-w-full rounded-full shadow-sm" />
                            ) : (
                              msg.text
                            )}
                          </div>
                       </div>
                     </div>
                   );
                })}
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

                <div className="p-3 w-full flex items-center gap-2 relative z-30 bg-white">
                  <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     ref={fileInputRef}
                     onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                           const reader = new FileReader();
                           reader.onloadend = () => {
                               setMessages(prev => [...prev, {
                                 id: Date.now(),
                                 text: reader.result as string,
                                 sender: "me",
                                 isImage: true,
                                 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                               }]);
                           };
                           reader.readAsDataURL(e.target.files[0]);
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
                    <button style={{ backgroundColor: chatTheme }} onClick={handleSend} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition text-white shadow-sm ml-1">
                       <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  ) : (
                    <button 
                      onClick={toggleRecording}
                      className={\`w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition shadow-sm ml-1 \${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'}\`}
                    >
                       {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}
                </div>
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
             className="bg-gray-50 fixed inset-0 z-[110] flex flex-col h-full"
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
                    <span className="font-bold text-[22px] text-black">{activeChat.name}</span>
                    <span className="text-[15px] font-medium text-black/50 mt-1">Darling User</span>
                    
                    <div className="flex justify-center gap-8 mt-6">
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
                       <div className={\`w-[50px] h-7 rounded-full p-0.5 shadow-inner transition-colors \${notificationsEnabled ? 'bg-[#2cd94d]' : 'bg-gray-300'}\`}>
                          <div className={\`w-6 h-6 bg-white rounded-full shadow-sm transition-all \${notificationsEnabled ? 'ml-auto' : 'ml-0'}\`}></div>
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
                                      <div key={idx} className="aspect-square bg-gray-200 rounded-md overflow-hidden">
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
              onClick={() => setActiveChat({ name: chat.name, img: chat.img })}
            >
               {chat.isUnread && (
                   <div className="absolute top-[32px] left-[-8px] w-2 h-2 bg-[#ff2052] rounded-full"></div>
               )}
               
               <div className="relative pt-1 shrink-0 ml-1">
                 <img src={chat.img} className="w-[52px] h-[52px] rounded-full object-cover shadow-sm bg-black/5" />
               </div>
               
               <div className="flex-1 pt-1 overflow-hidden pr-2">
                 <div className="flex justify-between items-center mb-1">
                   <h3 className={\`font-bold text-[16px] \${chat.isUnread ? 'text-[#ff2d55]' : 'text-black'}\`}>{chat.name}</h3>
                 </div>
                 <span className={\`text-[14px] truncate block \${chat.isUnread ? 'text-black font-semibold' : 'text-gray-500'} \`}>
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

    </div>
  );
}\n`

const lines = fs.readFileSync('src/components/MainApp.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('export function ChatView('));
let end = lines.findIndex((l, i) => i > start && l.includes('export function ProfileView()'));
if (end === -1) end = lines.findIndex((l, i) => i > start && l.includes('export function ProfileViewRevised('));

if (start !== -1 && end !== -1) {
    const before = lines.slice(0, start).join('\n');
    const after = lines.slice(end).join('\n');
    fs.writeFileSync('src/components/MainApp.tsx', before + '\n' + replacement + '\n' + after);
    console.log("ChatView Replaced with latest functional updates!");
} else {
    console.log("ChatView bounds not found.");
}
