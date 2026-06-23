const fs = require('fs');

let b = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

// 1. ASTROLOGY DETAILS FIX
b = b.replace(
  /const currentProfile = React\.useMemo\(\(\) => \{/,
  `const currentProfile = React.useMemo(() => {
    if (rawProfile && !rawProfile.astrologyDetails) {
       rawProfile.astrologyDetails = {
           vibe: Math.floor(Math.random() * 3) + 3,
           communication: Math.floor(Math.random() * 3) + 3,
           emotion: Math.floor(Math.random() * 3) + 3,
           attraction: Math.floor(Math.random() * 3) + 3,
           sun: rawProfile.zodiac || 'Không rõ',
           moon: 'Chưa rõ',
           rising: 'Chưa rõ'
       };
    }`
);

// 2. STATE PERSISTENCE IN GLOBAL APP STATE
b = b.replace(
  /const \[likedProfiles, setLikedProfiles\] = useState<any\[\]>\(\[\]\);\n\s*const \[savedProfiles, setSavedProfiles\] = useState<any\[\]>\(\[\]\);\n\s*const \[activeChatUser, setActiveChatUser\] = useState<any>\(null\);\n\s*const \[isTestFemaleView, setIsTestFemaleView\] = useState\(false\);\n\s*const \[myProfile, setMyProfile\] = useState\(USER_PROFILE_DATA\);/,
  `const [likedProfiles, setLikedProfiles] = useState<any[]>(() => { try { const d = localStorage.getItem('ais_liked'); return d ? JSON.parse(d) : []; } catch(e){ return []; } });
  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => { try { const d = localStorage.getItem('ais_saved'); return d ? JSON.parse(d) : []; } catch(e){ return []; } });
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [isTestFemaleView, setIsTestFemaleView] = useState(false);
  const [myProfile, setMyProfile] = useState<typeof USER_PROFILE_DATA>(() => { try { const d = localStorage.getItem('ais_profile'); return d ? JSON.parse(d) : USER_PROFILE_DATA; } catch(e){ return USER_PROFILE_DATA; } });
  
  React.useEffect(() => { localStorage.setItem('ais_liked', JSON.stringify(likedProfiles)); }, [likedProfiles]);
  React.useEffect(() => { localStorage.setItem('ais_saved', JSON.stringify(savedProfiles)); }, [savedProfiles]);
  React.useEffect(() => { localStorage.setItem('ais_profile', JSON.stringify(myProfile)); }, [myProfile]);`
);


// 3. LOGOUT BUTTON
b = b.replace(
  /<button className="bg-\[#f03e5c\] text-white px-6 py-3 rounded-lg font-medium shadow-sm active:bg-red-700 transition">\n\s*Đăng xuất\n\s*<\/button>/g,
  `<button onClick={() => { localStorage.clear(); if(onNavigate) onNavigate('login'); }} className="bg-[#f03e5c] text-white px-6 py-3 rounded-lg font-medium shadow-sm active:bg-red-700 transition">\n           Đăng xuất\n         </button>`
);


fs.writeFileSync('src/components/MainApp.tsx', b);
