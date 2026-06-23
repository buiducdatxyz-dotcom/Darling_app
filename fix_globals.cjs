const fs = require('fs');

let content = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

content = content.replace(
  /setupData: any;\n\s*updateSetupData: \(data: any\) => void;\n\}>/,
  "setupData: any;\n  updateSetupData: (data: any) => void;\n  globalMatchModal: any;\n  setGlobalMatchModal: (p: any) => void;\n}>"
);

content = content.replace(
  /setupData: \{\},\n\}\);/,
  "setupData: {},\n  globalMatchModal: null,\n  setGlobalMatchModal: () => {},\n});"
);

content = content.replace(
  /\{currentView === 'app_chat' && <ChatView \/>\}/,
  `{currentView === 'app_chat' && <ChatView />}

      {/* GLOBAL Match Overlay */}
      <AnimatePresence>
        {globalMatchModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[#ff9ca0] flex flex-col items-center justify-center p-6 text-black"
          >
            <h2 className="text-[40px] font-bold mb-10 italic tracking-tighter text-[#ff2d55] drop-shadow-sm">It's a Match!</h2>
            <div className="flex gap-4 mb-16 relative">
              <div className="w-[130px] h-[130px] rounded-full overflow-hidden border-4 border-white shadow-xl relative bg-[#dfd6ff] flex justify-center items-center -mr-6 z-10">
                <User className="w-[64px] h-[64px] text-[#6b58dc]" strokeWidth={1.5} />
              </div>
              <div className="w-[130px] h-[130px] rounded-full overflow-hidden border-4 border-white shadow-xl z-20">
                <img src={globalMatchModal.images?.[0] || globalMatchModal.img || ''} alt="Match profile" className="w-full h-full object-cover bg-white" />
              </div>
            </div>
            <p className="text-center text-[18px] font-medium mb-12 text-black/80">Bạn và <span className="font-bold text-black border-b border-black">{globalMatchModal.name}</span> đã thích nhau!</p>
            
            <button 
              onClick={() => {
                const user = { id: globalMatchModal.id, name: globalMatchModal.name, img: globalMatchModal.images?.[0] || globalMatchModal.img || '' };
                setActiveChatUser(user);
                setCurrentView('app_chat');
                setGlobalMatchModal(null);
              }}
              className="w-full py-4 text-[17px] font-bold text-white bg-[#ff2d55] rounded-2xl active:scale-95 transition-transform shadow-md mb-4"
            >
              Nhắn tin ngay
            </button>
            <button 
              onClick={() => setGlobalMatchModal(null)}
              className="w-full py-4 text-[17px] font-bold text-black border-[1.5px] border-black bg-transparent rounded-2xl active:scale-95 transition-transform"
            >
              Tiếp tục xem
            </button>
          </motion.div>
        )}
      </AnimatePresence>`
);

fs.writeFileSync('src/components/MainApp.tsx', content);
console.log('Fixed globals');
