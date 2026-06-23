const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /const chats: any\[\] = matchedChats\.map\(\(c: any, i: number\) => \(\{\n\s*name: c\.name, img: c\.images\?\.\[0\] \|\| c\.img \|\| \\`https:\/\/i\.pravatar\.cc\/150\?img=\\\$\{i\+4\}\\`, isUnread: false\n\s*\}\)\);/g,
  `const chats: any[] = matchedChats.map((c: any, i: number) => {
     let lastMsg = 'Bắt đầu trò chuyện...';
     try {
        const historyRaw = localStorage.getItem('ais_chat_' + c.name);
        if (historyRaw) {
           const parsed = JSON.parse(historyRaw);
           if (parsed.length > 0) {
               lastMsg = parsed[parsed.length - 1].isImage ? '[Hình ảnh]' : parsed[parsed.length - 1].text;
           }
        }
     } catch(e) {}
     
     return {
       name: c.name, 
       img: c.images?.[0] || c.img || \`https://i.pravatar.cc/150?img=\${i+4}\`, 
       isUnread: false,
       lastMsg
     };
  });`
);

fs.writeFileSync('src/components/MainApp.tsx', code);
