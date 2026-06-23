const fs = require('fs');
let b = fs.readFileSync('src/components/MainApp.tsx', 'utf8');
b = b.replace('>${score}%</div>', '>{score}%</div>');
fs.writeFileSync('src/components/MainApp.tsx', b);
