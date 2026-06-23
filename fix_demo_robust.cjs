const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

const regex = /export const USER_PROFILE_DATA = \{[\s\S]*?\};\n/m;
const stripped = `export const USER_PROFILE_DATA = {
    id: 999, 
    name: 'Người dùng mới', 
    dob: '2000-01-01',
    gender: 'Nam',
    height: '1m70',
    zodiac: 'Bảo Bình',
    location: 'Hà Nội',
    job: 'Chưa cập nhật',
    language: 'Tiếng Việt',
    religion: 'Không',
    communicationStyle: 'Nhắn tin nhiều hơn',
    need: 'Tìm người yêu',
    pet: 'Không nuôi',
    music: 'Khác',
    book: 'Khác',
    food: 'Khác',
    travel: 'Khác',
    game: 'Khác',
    sport: 'Khác',
    songTitle: '',
    songUrl: '',
    images: [] // Empty defaults so they setup their own app
};
`;

if (code.match(regex)) {
   code = code.replace(regex, stripped);
   fs.writeFileSync('src/components/MainApp.tsx', code);
   console.log("Demo account cleared successfully.");
} else {
   console.log("Failed to match USER_PROFILE_DATA");
}
