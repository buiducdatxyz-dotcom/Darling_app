const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /lastMsg\n\s*\};\n\s*\}\);/g,
  `message: lastMsg\n     };\n  });`
);

let changed = code.replace(
  /\{chat\.message\}/g,
  `{chat.message || chat.lastMsg || 'Bắt đầu trò chuyện'}`
);

fs.writeFileSync('src/components/MainApp.tsx', changed);
