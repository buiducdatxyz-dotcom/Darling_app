const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /onClick=\{\(\) => setActiveChat\(\{ name: chat\.name, img: `https:\/\/i\.pravatar\.cc\/150\?img=\$\{i\+4\}` \}\)\}/g,
  `onClick={() => setActiveChat({ name: chat.name, img: chat.img })}`
);
code = code.replace(
  /src=\{`https:\/\/i\.pravatar\.cc\/150\?img=\$\{i\+4\}`\} className="w-\[52px\] h-\[52px\] rounded-full object-cover shadow-sm bg-black\/5" \/>/g,
  `src={chat.img} className="w-[52px] h-[52px] rounded-full object-cover shadow-sm bg-black/5" />`
);

fs.writeFileSync('src/components/MainApp.tsx', code);
