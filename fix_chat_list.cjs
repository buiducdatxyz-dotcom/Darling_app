const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /const matchedChats = \[\.\.\.likedProfiles\];\n\s*if \(activeChatUser && !matchedChats\.find\(\(c: any\) => c\.name === activeChatUser\.name\)\) \{\n\s*matchedChats\.unshift\(\{ name: activeChatUser\.name, images: \[activeChatUser\.img\] \}\);\n\s*\}/g,
  `const matchedChats = [...likedProfiles];
  
  // also add any chats from localStorage that have history
  try {
     for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ais_chat_')) {
           const chatName = key.replace('ais_chat_', '');
           if (!matchedChats.find((c: any) => c.name === chatName)) {
               const historyRaw = localStorage.getItem(key);
               if (historyRaw && JSON.parse(historyRaw).length > 0) {
                  matchedChats.unshift({ name: chatName, images: [\`https://ui-avatars.com/api/?name=\${encodeURIComponent(chatName)}&background=ff9ca0&color=fff\`] });
               }
           }
        }
     }
  } catch(e) {}
  
  if (activeChatUser && !matchedChats.find((c: any) => c.name === activeChatUser.name)) {
      matchedChats.unshift({ name: activeChatUser.name, images: [activeChatUser.img] });
  }`
);

fs.writeFileSync('src/components/MainApp.tsx', code);
