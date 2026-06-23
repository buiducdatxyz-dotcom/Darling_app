const fs = require('fs');
let b = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

// 1. Add audioRef to ProfileSwiper
b = b.replace(
/const musicInputRef = React\.useRef<HTMLInputElement>\(null\);/,
`const musicInputRef = React.useRef<HTMLInputElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);`
);

// 2. Add an audio element to the swiper container and the music player button in renderElements
b = b.replace(
/<div className="relative pointer-events-auto">\s*<AnimatePresence mode="wait">\s*<motion.div key=\{"info" \+ currentImageIndex\}[^>]*>[\s\S]*?<\/motion.div>\s*<\/AnimatePresence>\s*<\/div>/,
`<div className="relative pointer-events-auto">
  <AnimatePresence mode="wait">
    <motion.div key={"info" + currentImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full flex flex-col gap-2">
      {(() => {
         // Determine which info blocks to show for each image
         const renderElements = [];
         
         if (currentImageIndex === 0) {
            renderElements.push(
              <div key="common" className="bg-black/50 backdrop-blur-md px-4 py-3.5 rounded-xl border border-white/20 shadow-sm text-[14px] text-white">
                 <span className="font-bold text-[#ff9ca0]">Điểm chung: </span>
                 <span>{currentProfile.commonPoints || 'Chưa có thông tin'}</span>
              </div>
            );
         }
         
         if (currentImageIndex === 1) {
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

         // Music player: if the profile has a song (either from myProfile preview or rawProfile)
         if (currentProfile.songTitle && currentProfile.songUrl && currentImageIndex === 0) {
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
                    <span className={\`w-1 h-3 bg-white/50 rounded-full \${isPlaying ? 'animate-[bounce_0.8s_infinite]' : ''}\`}></span>
                    <span className={\`w-1 h-4 bg-white/70 rounded-full \${isPlaying ? 'animate-[bounce_1s_infinite]' : ''}\`}></span>
                    <span className={\`w-1 h-2 bg-white/40 rounded-full \${isPlaying ? 'animate-[bounce_0.6s_infinite]' : ''}\`}></span>
                 </div>
              </div>
            );
         }

         const imagesCount = currentProfile.images.length || 1;
         const tagsToShow = currentProfile.matchingTags || [];
         
         // distribute tags amongst all images
         const tagsPerImg = Math.ceil(tagsToShow.length / imagesCount);
         const startIndex = currentImageIndex * tagsPerImg;
         const slice = tagsToShow.slice(startIndex, startIndex + tagsPerImg);

         if (slice.length > 0) {
            renderElements.push(
              <div key="tags" className="flex flex-wrap gap-2 mt-1">
                 {slice.map((t: any, i: number) => (
                    <div key={i} className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[13px] text-white border border-white/10 shadow-sm">
                       <span className="font-bold opacity-80 mr-1">{t.label}:</span>
                       <span className="font-medium">{t.value}</span>
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
  {currentProfile.songUrl && (
     <audio ref={audioRef} src={currentProfile.songUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
  )}
</div>`
);

fs.writeFileSync('src/components/MainApp.tsx', b);
