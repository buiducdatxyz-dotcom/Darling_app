const fs = require('fs');
let b = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

b = b.replace(
/const currentProfile = React\.useMemo\(\(\) => \{[\s\S]*?return rawProfile;\s*\}, \[rawProfile, myProfile\]\);/,
`const currentProfile = React.useMemo(() => {
    if (!rawProfile) return null;
    const myZodiacSymbol = getZodiacSymbol(myProfile.zodiac || 'Song Tử');
    const partnerZodiacSymbol = getZodiacSymbol(rawProfile.zodiac || 'Song Tử');
    
    let newAstrologyMatch = rawProfile.astrologyMatch || '';
    if (newAstrologyMatch.includes('Song Tử')) {
      newAstrologyMatch = newAstrologyMatch
        .replace(/Song Tử/g, myProfile.zodiac || 'Bạn')
        .replace(/♊/g, myZodiacSymbol);
    }

    const matchTags = [
      { key: 'lifestyle', label: 'Lối sống' },
      { key: 'prompt', label: 'Câu hỏi' },
      { key: 'job', label: 'Ngành nghề' },
      { key: 'language', label: 'Ngôn ngữ' },
      { key: 'religion', label: 'Tôn giáo' },
      { key: 'communicationStyle', label: 'Giao tiếp' },
      { key: 'need', label: 'Nhu cầu' },
      { key: 'pet', label: 'Thú cưng' },
      { key: 'music', label: 'Nghe nhạc' },
      { key: 'book', label: 'Sách' },
      { key: 'food', label: 'Đồ ăn' },
      { key: 'travel', label: 'Du lịch' },
      { key: 'game', label: 'Trò chơi' },
      { key: 'sport', label: 'Thể thao' },
    ];
    
    const matchingTags = [];
    matchTags.forEach(t => {
      const val = rawProfile[t.key];
      if (typeof val === 'string') {
        if (rawProfile.id === myProfile.id || val === myProfile[t.key]) {
           matchingTags.push({ label: t.label, value: val });
        }
      }
    });

    return { 
      ...rawProfile,
      partnerZodiac: rawProfile.name + ': ' + rawProfile.zodiac + ' ' + partnerZodiacSymbol,
      myZodiac: 'Bạn: ' + myProfile.zodiac + ' ' + myZodiacSymbol,
      astrologyMatch: newAstrologyMatch,
      matchingTags
    };
}, [rawProfile, myProfile]);`
);
fs.writeFileSync('src/components/MainApp.tsx', b);
