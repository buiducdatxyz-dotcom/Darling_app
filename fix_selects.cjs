const fs = require('fs');
let content = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

// Replace Step 1 / Gender
content = content.replace(/<div>\s*<label[^>]*>Giới tính:<\/label>\s*<select[^>]*value={myProfileData\.gender}[^>]*onChange={e => updateMyProfile\(\{ gender: e\.target\.value \}\)}[^>]*>\s*<option[^>]*>Nam<\/option>\s*<option[^>]*>Nữ<\/option>\s*<option[^>]*>Khác<\/option>\s*<\/select>\s*<\/div>/, '<MainAppSelectField label="Giới tính" options={genders} value={myProfileData.gender} onChange={v => updateMyProfile({gender: v})} />');

// Replace Step 2
content = content.replace(/<div>\s*<label[^>]*>Ngành nghề:<\/label>\s*<select[^>]*value={myProfileData\.job}[^>]*onChange={e => updateMyProfile\(\{ job: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Ngành nghề" options={jobs} value={myProfileData.job} onChange={v => updateMyProfile({job: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Ngôn Ngữ:<\/label>\s*<select[^>]*value={myProfileData\.language}[^>]*onChange={e => updateMyProfile\(\{ language: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Ngôn Ngữ" options={languages} value={myProfileData.language} onChange={v => updateMyProfile({language: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Tôn giáo:<\/label>\s*<select[^>]*value={myProfileData\.religion}[^>]*onChange={e => updateMyProfile\(\{ religion: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Tôn giáo" options={religions} value={myProfileData.religion} onChange={v => updateMyProfile({religion: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Phong cách giao tiếp:<\/label>\s*<select[^>]*value={myProfileData\.communicationStyle}[^>]*onChange={e => updateMyProfile\(\{ communicationStyle: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Phong cách giao tiếp" options={communicationStyles} value={myProfileData.communicationStyle} onChange={v => updateMyProfile({communicationStyle: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Nhu cầu:<\/label>\s*<select[^>]*value={myProfileData\.need}[^>]*onChange={e => updateMyProfile\(\{ need: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Nhu cầu" options={intents} value={myProfileData.intent || myProfileData.need || \'\'} onChange={v => updateMyProfile({need: v, intent: v})} />');

// Replace Step 3
content = content.replace(/<div>\s*<label[^>]*>Thú cưng:<\/label>\s*<select[^>]*value={myProfileData\.pet}[^>]*onChange={e => updateMyProfile\(\{ pet: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Thú cưng" options={pets} value={myProfileData.pet} onChange={v => updateMyProfile({pet: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Âm nhạc:<\/label>\s*<select[^>]*value={myProfileData\.music}[^>]*onChange={e => updateMyProfile\(\{ music: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Âm nhạc" options={musics} value={myProfileData.music} onChange={v => updateMyProfile({music: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Sách:<\/label>\s*<select[^>]*value={myProfileData\.book}[^>]*onChange={e => updateMyProfile\(\{ book: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Sách" options={books} value={myProfileData.book} onChange={v => updateMyProfile({book: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Đồ ăn:<\/label>\s*<select[^>]*value={myProfileData\.food}[^>]*onChange={e => updateMyProfile\(\{ food: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Đồ ăn" options={foods} value={myProfileData.food} onChange={v => updateMyProfile({food: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Du lịch:<\/label>\s*<select[^>]*value={myProfileData\.travel}[^>]*onChange={e => updateMyProfile\(\{ travel: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Du lịch" options={travels} value={myProfileData.travel} onChange={v => updateMyProfile({travel: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Trò chơi:<\/label>\s*<select[^>]*value={myProfileData\.game}[^>]*onChange={e => updateMyProfile\(\{ game: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Trò chơi" options={games} value={myProfileData.game} onChange={v => updateMyProfile({game: v})} />');

content = content.replace(/<div>\s*<label[^>]*>Thể thao:<\/label>\s*<select[^>]*value={myProfileData\.sport}[^>]*onChange={e => updateMyProfile\(\{ sport: e\.target\.value \}\)}[^>]*>[\s\S]*?<\/select>\s*<\/div>/, '<MainAppSelectField label="Thể thao" options={sports} value={myProfileData.sport} onChange={v => updateMyProfile({sport: v})} />');

fs.writeFileSync('src/components/MainApp.tsx', content);
