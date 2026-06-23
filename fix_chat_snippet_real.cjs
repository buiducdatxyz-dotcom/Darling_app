const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /const chats: any\[\] = matchedChats\.map\(\(c: any, i: number\) => \(\{\n\s*name: c\.name, img: c\.images\?\.\[0\] \|\| c\.img \|\| `https:\/\/i\.pravatar\.cc\/150\?img=\$\{i\+4\}`,\s*isUnread: false\n\s*\}\)\);/,
  `const chats: any[] = matchedChats.map((c: any, i: number) => {
     let lastMsg = 'Bắt đầu trò chuyện...';
     try {
        const historyRaw = localStorage.getItem('ais_chat_' + c.name);
        if (historyRaw) {
           const parsed = JSON.parse(historyRaw);
           if (parsed.length > 0) {
               lastMsg = parsed[parsed.length - 1].isImage ? '[Hình ảnh]' : (parsed[parsed.length - 1].isAudio ? '[Âm thanh]' : parsed[parsed.length - 1].text);
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

let changedMapRender = code.replace(
  /<span className=\{`text-\[14px\] truncate block \$\{chat\.isUnread \? 'text-black font-semibold' : 'text-gray-500'\} `\}>\n\s*\{chat\.isUnread \? 'Bạn có tin nhắn mới' : 'Bắt đầu trò chuyện\.\.\.'\}\n\s*<\/span>/,
  `<span className={\`text-[14px] truncate block \${chat.isUnread ? 'text-black font-semibold' : 'text-gray-500'} \`}>
      {chat.lastMsg || 'Bắt đầu trò chuyện...'}
   </span>`
);

if (changedMapRender !== code) {
   fs.writeFileSync('src/components/MainApp.tsx', changedMapRender);
   console.log("Updated chat snippet rendering!");
} else {
   console.log("Regex for render failed");
   
   // Try a fallback search for the specific text
   let fallback = code.replace(
     /\{chat\.isUnread \? 'Bạn có tin nhắn mới' : 'Bắt đầu trò chuyện\.\.\.'\}/g,
     "{chat.lastMsg || 'Bắt đầu trò chuyện...'}"
   );
   fs.writeFileSync('src/components/MainApp.tsx', fallback);
}

