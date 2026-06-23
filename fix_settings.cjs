const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf8');
code = code.replace(/localStorage\.removeItem\('is_logged_in'\);/g, "localStorage.clear();");
fs.writeFileSync('src/components/Settings.tsx', code);
