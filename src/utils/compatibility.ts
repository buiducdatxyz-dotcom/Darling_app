// Compatibility & Horoscope calculation engine for Cupid Dating App
// Distributes 100% across:
// 1. Sở thích (Interests): 25%
// 2. Phong cách sống (Lifestyle): 25%
// 3. 12 Con Giáp (Eastern Lunar Zodiac): 25%
// 4. Chiêm tinh (Western Astrology): 25%

export interface LunarInfo {
  stem: string; // Thiên Can (Giáp, Ất, Bính, ...)
  branch: string; // Địa Chi (Tý, Sửu, Dần, ...)
  animal: string; // Tên con vật tiếng Việt (Chuột, Trâu, Hổ, Mèo, Rồng, Rắn, Ngựa, Dê, Khỉ, Gà, Chó, Lợn)
  emoji: string;
  fullName: string; // e.g. "Canh Thìn (Tuổi Rồng 🐉)"
  shortName: string; // e.g. "Thìn (Rồng 🐉)"
}

export const LUNAR_ANIMALS: Record<number, { branch: string; animal: string; emoji: string }> = {
  0: { branch: 'Tý', animal: 'Chuột', emoji: '🐁' },
  1: { branch: 'Sửu', animal: 'Trâu', emoji: '🐂' },
  2: { branch: 'Dần', animal: 'Hổ', emoji: '🐅' },
  3: { branch: 'Mão', animal: 'Mèo', emoji: '🐈' },
  4: { branch: 'Thìn', animal: 'Rồng', emoji: '🐉' },
  5: { branch: 'Tỵ', animal: 'Rắn', emoji: '🐍' },
  6: { branch: 'Ngọ', animal: 'Ngựa', emoji: '🐎' },
  7: { branch: 'Mùi', animal: 'Dê', emoji: '🐐' },
  8: { branch: 'Thân', animal: 'Khỉ', emoji: '🐒' },
  9: { branch: 'Dậu', animal: 'Gà', emoji: '🐓' },
  10: { branch: 'Tuất', animal: 'Chó', emoji: '🐕' },
  11: { branch: 'Hợi', animal: 'Lợn', emoji: '🐖' }
};

export const HEAVENLY_STEMS: Record<number, string> = {
  0: 'Canh',
  1: 'Tân',
  2: 'Nhâm',
  3: 'Quý',
  4: 'Giáp',
  5: 'Ất',
  6: 'Bính',
  7: 'Đinh',
  8: 'Mậu',
  9: 'Kỷ'
};

export function getLunarAnimalFromDob(dobString?: string): LunarInfo {
  let year = 2000;
  if (dobString) {
    const parts = dobString.split(/[-/]/);
    if (parts.length >= 1) {
      const parsedYear = parseInt(parts[0].length === 4 ? parts[0] : parts[parts.length - 1], 10);
      if (!isNaN(parsedYear) && parsedYear > 1920 && parsedYear < 2050) {
        year = parsedYear;
      }
    }
  }

  const stemIndex = Math.abs(year % 10);
  const stem = HEAVENLY_STEMS[stemIndex] || 'Canh';

  // Branch: (year - 4) % 12
  const branchIndex = (((year - 4) % 12) + 12) % 12;
  const branchInfo = LUNAR_ANIMALS[branchIndex] || LUNAR_ANIMALS[4];

  return {
    stem,
    branch: branchInfo.branch,
    animal: branchInfo.animal,
    emoji: branchInfo.emoji,
    fullName: `${stem} ${branchInfo.branch} (Tuổi ${branchInfo.animal} ${branchInfo.emoji})`,
    shortName: `${branchInfo.branch} (${branchInfo.animal} ${branchInfo.emoji})`
  };
}

export function getWesternZodiacFromDob(dobString?: string): string {
  if (!dobString) return 'Bạch Dương';
  const date = new Date(dobString);
  if (isNaN(date.getTime())) return 'Bạch Dương';
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Bảo Bình';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Song Ngư';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Bạch Dương';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Kim Ngưu';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'Song Tử';
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'Cự Giải';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Sư Tử';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Xử Nữ';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return 'Thiên Bình';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 21)) return 'Bọ Cạp';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Nhân Mã';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Ma Kết';
  return 'Bạch Dương';
}

// 12 Con Giáp Tam Hợp & Lục Hợp groups
const TAM_HOP_GROUPS = [
  ['Thân', 'Tý', 'Thìn'],
  ['Dần', 'Ngọ', 'Tuất'],
  ['Tỵ', 'Dậu', 'Sửu'],
  ['Hợi', 'Mão', 'Mùi']
];

const LUC_HOP_PAIRS = [
  ['Tý', 'Sửu'],
  ['Dần', 'Hợi'],
  ['Mão', 'Tuất'],
  ['Thìn', 'Dậu'],
  ['Tỵ', 'Thân'],
  ['Ngọ', 'Mùi']
];

const TU_HANH_XUNG_GROUPS = [
  ['Dần', 'Thân', 'Tỵ', 'Hợi'],
  ['Tý', 'Ngọ', 'Mão', 'Dậu'],
  ['Thìn', 'Tuất', 'Sửu', 'Mùi']
];

export function calculateLunarMatch(branchA: string, branchB: string): { score: number; relation: string } {
  const cleanA = branchA.split(' ')[0].trim();
  const cleanB = branchB.split(' ')[0].trim();

  if (cleanA === cleanB) {
    return { score: 22, relation: 'Đồng con giáp (Hiểu tính cách nhau)' };
  }

  // Check Tam Hợp (Three Harmonies - Top tier)
  for (const group of TAM_HOP_GROUPS) {
    if (group.includes(cleanA) && group.includes(cleanB)) {
      return { score: 25, relation: 'Tam Hợp (Đại cát, cực kỳ tâm đầu ý hợp)' };
    }
  }

  // Check Lục Hợp (Six Harmonies - Highly favorable)
  for (const pair of LUC_HOP_PAIRS) {
    if ((pair[0] === cleanA && pair[1] === cleanB) || (pair[1] === cleanA && pair[0] === cleanB)) {
      return { score: 24, relation: 'Lục Hợp (Âm dương hòa hợp, gắn bó keo sơn)' };
    }
  }

  // Check Tứ Hành Xung / Lục Xung
  for (const group of TU_HANH_XUNG_GROUPS) {
    if (group.includes(cleanA) && group.includes(cleanB)) {
      return { score: 14, relation: 'Tứ Hành Xung (Cần nhường nhịn và thấu hiểu)' };
    }
  }

  // Neutral / Bình hòa
  return { score: 20, relation: 'Bình Hòa (Dễ hòa nhập, bù trừ tính cách)' };
}

// Zodiac Elements
const ZODIAC_ELEMENT_MAP: Record<string, 'Lửa' | 'Đất' | 'Khí' | 'Nước'> = {
  'Bạch Dương': 'Lửa',
  'Sư Tử': 'Lửa',
  'Nhân Mã': 'Lửa',
  'Kim Ngưu': 'Đất',
  'Xử Nữ': 'Đất',
  'Ma Kết': 'Đất',
  'Song Tử': 'Khí',
  'Thiên Bình': 'Khí',
  'Bảo Bình': 'Khí',
  'Cự Giải': 'Nước',
  'Bọ Cạp': 'Nước',
  'Song Ngư': 'Nước'
};

export function calculateZodiacMatch(zodiacA: string, zodiacB: string): { score: number; relation: string } {
  const elemA = ZODIAC_ELEMENT_MAP[zodiacA] || 'Khí';
  const elemB = ZODIAC_ELEMENT_MAP[zodiacB] || 'Khí';

  if (zodiacA === zodiacB) {
    return { score: 24, relation: `Cùng cung ${zodiacA} (Đồng điệu tâm hồn)` };
  }

  if (elemA === elemB) {
    return { score: 24.5, relation: `Cùng nguyên tố ${elemA} (Cực kỳ hòa hợp năng lượng)` };
  }

  if ((elemA === 'Lửa' && elemB === 'Khí') || (elemA === 'Khí' && elemB === 'Lửa')) {
    return { score: 23.5, relation: 'Lửa & Khí (Truyền cảm hứng và bùng nổ nhiệt huyết)' };
  }

  if ((elemA === 'Đất' && elemB === 'Nước') || (elemA === 'Nước' && elemB === 'Đất')) {
    return { score: 23, relation: 'Đất & Nước (Bền vững, chở che và thấu cảm sâu sắc)' };
  }

  if ((elemA === 'Lửa' && elemB === 'Đất') || (elemA === 'Đất' && elemB === 'Lửa')) {
    return { score: 18, relation: 'Lửa & Đất (Cần dung hòa giữa thực tế và đam mê)' };
  }

  if ((elemA === 'Khí' && elemB === 'Nước') || (elemA === 'Nước' && elemB === 'Khí')) {
    return { score: 17.5, relation: 'Khí & Nước (Sự kết hợp giữa tư duy lý trí và cảm xúc)' };
  }

  return { score: 15, relation: 'Trái dấu bù trừ (Học cách tôn trọng sự khác biệt)' };
}

export function calculateInterestsMatch(profileA: any, profileB: any): { score: number; details: string; matchedCount: number } {
  const fields = ['music', 'food', 'travel', 'sport', 'book', 'game'];
  let commonCount = 0;
  const commonItems: string[] = [];

  fields.forEach(f => {
    const valA = profileA?.[f] || profileA?.lifestyle?.[f];
    const valB = profileB?.[f] || profileB?.lifestyle?.[f];
    if (valA && valB && valA !== 'Khác' && valB !== 'Khác') {
      if (valA.toLowerCase().trim() === valB.toLowerCase().trim()) {
        commonCount++;
        commonItems.push(valA);
      }
    }
  });

  // Base interest score 16 + 2.5 per match up to 25
  const score = Math.min(25, Math.max(16, 16 + commonCount * 2.5));
  const details = commonCount > 0 
    ? `Có ${commonCount} sở thích chung (${commonItems.slice(0, 2).join(', ')})`
    : 'Gu sở thích phong phú, mở ra nhiều chủ đề mới để trò chuyện';

  return { score, details, matchedCount: commonCount };
}

export function calculateLifestyleMatch(profileA: any, profileB: any): { score: number; details: string } {
  let matchedPoints = 0;
  let checks = 0;

  // 1. Intent / Need
  const needA = profileA?.need || profileA?.intent || 'Tìm người yêu';
  const needB = profileB?.need || profileB?.intent || 'Tìm người yêu';
  if (needA && needB) {
    checks++;
    if (needA.toLowerCase().trim() === needB.toLowerCase().trim()) {
      matchedPoints += 3;
    } else {
      matchedPoints += 1.5;
    }
  }

  // 2. Communication style
  const commA = profileA?.communicationStyle || 'Nhắn tin nhiều hơn';
  const commB = profileB?.communicationStyle || 'Nhắn tin nhiều hơn';
  if (commA && commB) {
    checks++;
    if (commA.toLowerCase().trim() === commB.toLowerCase().trim()) {
      matchedPoints += 3;
    } else {
      matchedPoints += 1.8;
    }
  }

  // 3. Pet preference
  const petA = profileA?.pet || 'Yêu thích';
  const petB = profileB?.pet || 'Yêu thích';
  if (petA && petB) {
    checks++;
    if (petA === petB || (petA !== 'Không nuôi thú cưng' && petB !== 'Không nuôi thú cưng')) {
      matchedPoints += 2.5;
    } else {
      matchedPoints += 1.2;
    }
  }

  // Base 16 + scaled points up to 25
  const score = Math.min(25, Math.max(16.5, 16.5 + (matchedPoints / (checks * 3)) * 8.5));
  const details = score >= 22 
    ? 'Nhịp sống và thói quen sinh hoạt cực kỳ đồng điệu'
    : 'Lối sống cởi mở, tôn trọng không gian riêng của nhau';

  return { score, details };
}

export interface FullCompatibilityResult {
  totalScore: number; // 0 - 100
  breakdown: {
    interests: { score: number; max: number; percent: number; label: string; details: string };
    lifestyle: { score: number; max: number; percent: number; label: string; details: string };
    lunar: { score: number; max: number; percent: number; label: string; animalA: string; animalB: string; relation: string };
    zodiac: { score: number; max: number; percent: number; label: string; signA: string; signB: string; relation: string };
  };
  summaryText: string;
}

export function calculateFullCompatibility(myProfile: any, partnerProfile: any): FullCompatibilityResult {
  // 1. Lunar Animal
  const myLunar = myProfile?.lunarAnimalInfo || getLunarAnimalFromDob(myProfile?.dob);
  const partnerLunar = partnerProfile?.lunarAnimalInfo || getLunarAnimalFromDob(partnerProfile?.dob);
  const lunarRes = calculateLunarMatch(myLunar.branch, partnerLunar.branch);

  // 2. Zodiac Sign
  const myZodiac = myProfile?.zodiac || getWesternZodiacFromDob(myProfile?.dob);
  const partnerZodiac = partnerProfile?.zodiac || getWesternZodiacFromDob(partnerProfile?.dob);
  const zodiacRes = calculateZodiacMatch(myZodiac, partnerZodiac);

  // 3. Interests
  const interestsRes = calculateInterestsMatch(myProfile, partnerProfile);

  // 4. Lifestyle
  const lifestyleRes = calculateLifestyleMatch(myProfile, partnerProfile);

  const totalScore = Math.min(99, Math.max(55, Math.round(
    interestsRes.score +
    lifestyleRes.score +
    lunarRes.score +
    zodiacRes.score
  )));

  let summaryText = 'Hai bạn có tần số rung động rất tương đồng!';
  if (totalScore >= 90) {
    summaryText = 'Mảnh ghép định mệnh! Vũ trụ sắp đặt 4 yếu tố từ con giáp đến sở thích đều hòa quyện tuyệt vời.';
  } else if (totalScore >= 80) {
    summaryText = 'Độ tương thích rất cao! Cả hai dễ dàng tìm thấy tiếng nói chung và sẻ chia mọi khoảnh khắc.';
  } else if (totalScore >= 70) {
    summaryText = 'Mối liên kết nhiều hứa hẹn! Điểm tương đồng và khác biệt tạo nên sức hút bù trừ mạnh mẽ.';
  }

  return {
    totalScore,
    breakdown: {
      interests: {
        score: Math.round(interestsRes.score),
        max: 25,
        percent: Math.round((interestsRes.score / 25) * 100),
        label: 'Sở thích tương đồng',
        details: interestsRes.details
      },
      lifestyle: {
        score: Math.round(lifestyleRes.score),
        max: 25,
        percent: Math.round((lifestyleRes.score / 25) * 100),
        label: 'Phong cách sống',
        details: lifestyleRes.details
      },
      lunar: {
        score: Math.round(lunarRes.score),
        max: 25,
        percent: Math.round((lunarRes.score / 25) * 100),
        label: '12 Con Giáp',
        animalA: myLunar.shortName,
        animalB: partnerLunar.shortName,
        relation: lunarRes.relation
      },
      zodiac: {
        score: Math.round(zodiacRes.score),
        max: 25,
        percent: Math.round((zodiacRes.score / 25) * 100),
        label: 'Chiêm tinh hoàng đạo',
        signA: myZodiac,
        signB: partnerZodiac,
        relation: zodiacRes.relation
      }
    },
    summaryText
  };
}
