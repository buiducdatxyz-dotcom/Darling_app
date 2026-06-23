const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /const chats: any\[\] = \[\];/g,
  `const { likedProfiles } = React.useContext(AppContext);
  const matchedChats = [...likedProfiles];
  if (activeChatUser && !matchedChats.find((c: any) => c.name === activeChatUser.name)) {
      matchedChats.unshift({ name: activeChatUser.name, images: [activeChatUser.img] });
  }

  const chats: any[] = matchedChats.map((c: any, i: number) => ({
     name: c.name, img: c.images?.[0] || c.img || \`https://i.pravatar.cc/150?img=\${i+4}\`, isUnread: false
  }));`
);

fs.writeFileSync('src/components/MainApp.tsx', code);
