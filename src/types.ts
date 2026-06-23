export type Gender = 'Nam' | 'Nữ' | 'Khác';

export interface UserProfile {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  zodiac: string;
  gender: Gender;
  height: string;
  photos: string[];
  
  job: string;
  language: string;
  religion: string;
  communicationStyle: string;
  intent: string; // nhu cầu

  pet: string;
  music: string;
  book: string;
  food: string;
  travel: string;
  game: string;
  sport: string;
  
  // For matching
  distance?: number;
  movie?: string;
  socialMedia?: string;
  soulMark?: string; // Dấu ấn tâm hồn
}

export type ViewState = 
  | 'login' 
  | 'register' 
  | 'setup_basic' 
  | 'setup_lifestyle' 
  | 'setup_interests' 
  | 'setup_location'
  | 'welcome'
  | 'app_swipe' 
  | 'app_explore' 
  | 'app_likes' 
  | 'app_chat' 
  | 'app_profile' 
  | 'app_edit_profile'
  | 'app_settings';
