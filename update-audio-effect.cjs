const fs = require('fs');
let b = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

b = b.replace(
/const x = useMotionValue\(0\);/,
`useEffect(() => {
    if (audioRef.current) {
       if (isPlaying) {
          audioRef.current.play().catch(e => console.error("Audio playback failed", e));
       } else {
          audioRef.current.pause();
       }
    }
  }, [isPlaying, currentImageIndex, currentProfile]);

  const x = useMotionValue(0);`
);

fs.writeFileSync('src/components/MainApp.tsx', b);
