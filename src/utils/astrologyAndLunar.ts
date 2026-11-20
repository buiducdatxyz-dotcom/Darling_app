// Utility helper for Astrology (12 Zodiac Signs) & Vietnamese Lunar Animals (12 Con Giáp & Can Chi & Ngũ Hành)

export interface LunarInfo {
  year: number;
  can: string;
  chi: string;
  canChi: string;
  animal: string;
  animalFullName: string;
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
  elementFull: string;
  traits: string[];
  loveStyle: string;
}

const CAN_LIST = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const CHI_LIST = [
  { chi: 'Thân', animal: 'Khỉ', name: 'Thân (Khỉ)' },
  { chi: 'Dậu', animal: 'Gà', name: 'Dậu (Gà)' },
  { chi: 'Tuất', animal: 'Chó', name: 'Tuất (Chó)' },
  { chi: 'Hợi', animal: 'Lợn', name: 'Hợi (Lợn)' },
  { chi: 'Tý', animal: 'Chuột', name: 'Tý (Chuột)' },
  { chi: 'Sửu', animal: 'Trâu', name: 'Sửu (Trâu)' },
  { chi: 'Dần', animal: 'Hổ', name: 'Dần (Hổ)' },
  { chi: 'Mão', animal: 'Mèo', name: 'Mão (Mèo)' },
  { chi: 'Thìn', animal: 'Rồng', name: 'Thìn (Rồng)' },
  { chi: 'Tỵ', animal: 'Rắn', name: 'Tỵ (Rắn)' },
  { chi: 'Ngọ', animal: 'Ngựa', name: 'Ngọ (Ngựa)' },
  { chi: 'Mùi', animal: 'Dê', name: 'Mùi (Dê)' }
];

// Can Chi to Element (Lục Thập Hoa Giáp Nạp Âm) mapping
export function getNapAmElement(year: number): { element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ'; elementFull: string } {
  const canIndex = (year % 10);
  const chiIndex = (year % 12);
  
  // Standard Can value: Giáp/Ất=1, Bính/Đinh=2, Mậu/Kỷ=3, Canh/Tân=4, Nhâm/Quý=5
  const canVal: Record<string, number> = {
    'Giáp': 1, 'Ất': 1,
    'Bính': 2, 'Đinh': 2,
    'Mậu': 3, 'Kỷ': 3,
    'Canh': 4, 'Tân': 4,
    'Nhâm': 5, 'Quý': 5
  };

  // Chi value: Tý/Sửu/Ngọ/Mùi=0, Dần/Mão/Thân/Dậu=1, Thìn/Tỵ/Tuất/Hợi=2
  const chiVal: Record<string, number> = {
    'Tý': 0, 'Sửu': 0, 'Ngọ': 0, 'Mùi': 0,
    'Dần': 1, 'Mão': 1, 'Thân': 1, 'Dậu': 1,
    'Thìn': 2, 'Tỵ': 2, 'Tuất': 2, 'Hợi': 2
  };

  const can = CAN_LIST[canIndex] || 'Canh';
  const chi = CHI_LIST[chiIndex]?.chi || 'Tý';

  let sum = (canVal[can] || 1) + (chiVal[chi] || 0);
  if (sum > 5) sum -= 5;

  const elements: Record<number, { element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ'; elementFull: string }> = {
    1: { element: 'Kim', elementFull: 'Mệnh Kim (Vàng kim, ý chí kiên định, sắc sảo)' },
    2: { element: 'Thủy', elementFull: 'Mệnh Thủy (Dòng nước, linh hoạt, trực giác cao)' },
    3: { element: 'Hỏa', elementFull: 'Mệnh Hỏa (Lửa rực, nồng nàn, nhiệt huyết)' },
    4: { element: 'Thổ', elementFull: 'Mệnh Thổ (Đất màu mỡ, vững chãi, ấm áp)' },
    5: { element: 'Mộc', elementFull: 'Mệnh Mộc (Cây xanh tươi, nhân ái, phát triển)' }
  };

  return elements[sum] || { element: 'Thổ', elementFull: 'Mệnh Thổ (Vững chãi, đáng tin cậy)' };
}

export function parseLunarFromDob(dob: string): LunarInfo {
  let year = 2000;
  if (dob) {
    const parts = dob.split('-');
    if (parts.length > 0 && !isNaN(parseInt(parts[0]))) {
      year = parseInt(parts[0]);
    }
  }

  const can = CAN_LIST[year % 10] || 'Canh';
  const chiData = CHI_LIST[year % 12] || CHI_LIST[4];
  const { element, elementFull } = getNapAmElement(year);

  const animalTraits: Record<string, { traits: string[]; loveStyle: string }> = {
    'Tý': {
      traits: ['Thông minh', 'Nhạy cảm', 'Tỉ mỉ', 'Biết chăm lo'],
      loveStyle: 'Yêu chân thành, quan tâm chu đáo và luôn để ý đến cảm xúc của đối phương.'
    },
    'Sửu': {
      traits: ['Kiên định', 'Chân thành', 'Bền bỉ', 'Đáng tin cậy'],
      loveStyle: 'Ít nói lời hoa mỹ nhưng thể hiện tình yêu bằng hành động thực tế và sự thủy chung.'
    },
    'Dần': {
      traits: ['Mạnh mẽ', 'Nhiệt huyết', 'Bảo vệ', 'Quyến rũ'],
      loveStyle: 'Mãnh liệt, chủ động, thích chở che và tạo cảm giác an tâm tuyệt đối cho nửa kia.'
    },
    'Mão': {
      traits: ['Nhẹ nhàng', 'Tinh tế', 'Lãng mạn', 'Khéo léo'],
      loveStyle: 'Thích sự bình yên, ngọt ngào, tinh tế trong từng cử chỉ và biết cách lắng nghe.'
    },
    'Thìn': {
      traits: ['Bản lĩnh', 'Tự tin', 'Rộng lượng', 'Cuốn hút'],
      loveStyle: 'Yêu hết mình, hào sảng, luôn mong muốn mang lại những điều tốt nhất cho người mình yêu.'
    },
    'Tỵ': {
      traits: ['Trực giác nhạy bén', 'Sâu sắc', 'Bí ẩn', 'Chung thủy'],
      loveStyle: 'Bề ngoài trầm tĩnh nhưng bên trong ấm áp, thấu hiểu nội tâm đối phương một cách kỳ diệu.'
    },
    'Ngọ': {
      traits: ['Phóng khoáng', 'Vui vẻ', 'Năng động', 'Chân thật'],
      loveStyle: 'Tươi vui, tràn đầy năng lượng tích cực, thích cùng người yêu trải nghiệm những điều mới lạ.'
    },
    'Mùi': {
      traits: ['Hiền hậu', 'Giàu cảm xúc', 'Tâm lý', 'Bao dung'],
      loveStyle: 'Dịu dàng, giàu đức hy sinh, mang lại cảm giác ấm áp và bình yên như một mái ấm.'
    },
    'Thân': {
      traits: ['Hài hước', 'Linh hoạt', 'Thông minh', 'Tháo vát'],
      loveStyle: 'Luôn tạo ra tiếng cười, xua tan căng thẳng và đồng hành như một người bạn tri kỷ.'
    },
    'Dậu': {
      traits: ['Ngay thẳng', 'Cẩn thận', 'Trách nhiệm', 'Quan tâm'],
      loveStyle: 'Tận tụy, có trách nhiệm cao, luôn muốn vun vén mối quan hệ trở nên vững bền, chỉn chu.'
    },
    'Tuất': {
      traits: ['Trung thành', 'Trọng tình cảm', 'Chân phương', 'Bảo bọc'],
      loveStyle: 'Chung thủy sắt son, luôn đứng về phía người mình yêu trong mọi hoàn cảnh.'
    },
    'Hợi': {
      traits: ['Hòa nhã', 'Lương thiện', 'Khoan dung', 'Ngọt ngào'],
      loveStyle: 'Ấm áp, dễ gần, thích được nuông chiều và cũng sẵn sàng yêu thương vô điều kiện.'
    }
  };

  const meta = animalTraits[chiData.chi] || animalTraits['Thìn'];

  return {
    year,
    can,
    chi: chiData.chi,
    canChi: `${can} ${chiData.chi}`,
    animal: chiData.chi,
    animalFullName: chiData.name,
    element,
    elementFull,
    traits: meta.traits,
    loveStyle: meta.loveStyle
  };
}

export interface CompatibilityAnalysis {
  type: 'tam_hop' | 'luc_hop' | 'tu_xung' | 'binh_hoa';
  typeTitle: string;
  score: number;
  elementRelation: string;
  summary: string;
  details: string;
  communicationTip: string;
}

export function evaluateLunarCompatibility(userAnimal: string, partnerAnimal: string, userElement: string = 'Kim', partnerElement: string = 'Thủy'): CompatibilityAnalysis {
  const tamHopGroups = [
    ['Thân', 'Tý', 'Thìn'],
    ['Dần', 'Ngọ', 'Tuất'],
    ['Tỵ', 'Dậu', 'Sửu'],
    ['Hợi', 'Mão', 'Mùi']
  ];

  const lucHopPairs: Record<string, string> = {
    'Tý': 'Sửu', 'Sửu': 'Tý',
    'Dần': 'Hợi', 'Hợi': 'Dần',
    'Mão': 'Tuất', 'Tuất': 'Mão',
    'Thìn': 'Dậu', 'Dậu': 'Thìn',
    'Tỵ': 'Thân', 'Thân': 'Tỵ',
    'Ngọ': 'Mùi', 'Mùi': 'Ngọ'
  };

  const tuXungGroups = [
    ['Dần', 'Thân', 'Tỵ', 'Hợi'],
    ['Tý', 'Ngọ', 'Mão', 'Dậu'],
    ['Thìn', 'Tuất', 'Sửu', 'Mùi']
  ];

  // Element interaction
  const sinhDict: Record<string, string> = {
    'Kim': 'Thủy', 'Thủy': 'Mộc', 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim'
  };
  const khacDict: Record<string, string> = {
    'Kim': 'Mộc', 'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim'
  };

  let elementRelation = 'Bình hòa, hỗ trợ lẫn nhau trong cuộc sống.';
  if (sinhDict[userElement] === partnerElement || sinhDict[partnerElement] === userElement) {
    elementRelation = `Tương Sinh (${userElement} và ${partnerElement}) - nuôi dưỡng và bồi đắp năng lượng cho nhau rất tốt.`;
  } else if (khacDict[userElement] === partnerElement || khacDict[partnerElement] === userElement) {
    elementRelation = `Tương Khắc (${userElement} và ${partnerElement}) - tính cách có phần đối lập, cần kiên nhẫn lắng nghe để bù trừ.`;
  }

  // Check Tam Hợp
  const isTamHop = tamHopGroups.some(group => group.includes(userAnimal) && group.includes(partnerAnimal));
  if (isTamHop && userAnimal !== partnerAnimal) {
    return {
      type: 'tam_hop',
      typeTitle: 'Tam Hợp Tình Duyên (Đại Cát)',
      score: 95,
      elementRelation,
      summary: `Tuổi ${userAnimal} và tuổi ${partnerAnimal} thuộc bộ Tam Hợp định mệnh! Hai bạn có sự hòa hợp bẩm sinh về tần số cảm xúc và mục tiêu sống.`,
      details: 'Khi ở bên nhau, hai người luôn cảm thấy tự nhiên, dễ dàng thấu hiểu suy nghĩ của đối phương mà không cần phải gồng mình giải thích. Mối quan hệ phát triển rất bền vững và mang lại may mắn, tài lộc cho cả hai.',
      communicationTip: 'Hãy duy trì sự chia sẻ chân thành thường xuyên; chỉ cần một ánh mắt hay cử chỉ nhỏ là người ấy đã hiểu được tâm tư của bạn rồi.'
    };
  }

  // Check Lục Hợp
  if (lucHopPairs[userAnimal] === partnerAnimal) {
    return {
      type: 'luc_hop',
      typeTitle: 'Lục Hợp Quý Nhân (Cực Kỳ Ăn Ý)',
      score: 92,
      elementRelation,
      summary: `Tuổi ${userAnimal} và tuổi ${partnerAnimal} là cặp Lục Hợp trời sinh! Sự bù trừ và gắn kết âm dương đạt đến độ hoàn hảo.`,
      details: 'Một người thường giỏi nhìn xa trông rộng, người kia lại chu đáo tỉ mỉ trong từng chi tiết. Hai bạn như hai mảnh ghép hoàn hảo lấp đầy những khoảng trống của nhau.',
      communicationTip: 'Đừng ngại thể hiện sự ngưỡng mộ đối với điểm mạnh của đối phương, họ sẽ vô cùng hạnh phúc khi được bạn trân trọng.'
    };
  }

  // Check Tứ Hành Xung
  const isTuXung = tuXungGroups.some(group => group.includes(userAnimal) && group.includes(partnerAnimal));
  if (isTuXung) {
    return {
      type: 'tu_xung',
      typeTitle: 'Thử Thách & Tôi Luyện (Cần Nhường Nhịn)',
      score: 65,
      elementRelation,
      summary: `Tuổi ${userAnimal} và tuổi ${partnerAnimal} có sự va chạm về trường năng lượng (Tứ Hành Xung). Đây là mối quan hệ vừa có sức hút mãnh liệt nhưng cũng dễ xảy ra cọ xát.`,
      details: 'Sự khác biệt về cách thể hiện cảm xúc và cái tôi có thể dẫn đến những hiểu lầm không đáng có. Tuy nhiên, nếu cả hai học được cách hạ bớt tự ái và lắng nghe sâu sắc, đây sẽ là mối liên kết giúp cả hai trưởng thành vượt bậc.',
      communicationTip: 'Tuyệt đối không tranh cãi khi cơn giận đang ở đỉnh điểm. Hãy áp dụng quy tắc "nguội 20 phút", sau đó bình tĩnh nói về cảm xúc của bản thân thay vì trách móc đối phương.'
    };
  }

  // Bình Hòa
  return {
    type: 'binh_hoa',
    typeTitle: 'Bình Hòa Duyên Phận (Êm Đềm & Tiến Triển Tốt)',
    score: 82,
    elementRelation,
    summary: `Tuổi ${userAnimal} và tuổi ${partnerAnimal} ở thế bình hòa, không xung đột gay gắt cũng không phụ thuộc lẫn nhau, là nền tảng tốt cho tình cảm phát triển tự nhiên.`,
    details: 'Mối quan hệ này có thể phát triển từ tình bạn ấm áp thành tình yêu sâu sắc. Hai bạn tôn trọng sự độc lập của nhau, cho nhau không gian riêng vừa vặn mà vẫn gắn kết bền chặt.',
    communicationTip: 'Hãy chủ động tạo thêm những buổi hẹn hò bất ngờ, cùng nhau khám phá sở thích mới để ngọn lửa lãng mạn luôn bùng cháy.'
  };
}
