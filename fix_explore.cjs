const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /<span className="text-\[48px\] mb-3">\{sub\.icon\}<\/span>\n\s*<span className="font-bold text-\[15px\] text-center text-black px-2">\{sub\.title\}<\/span>\n\s*<\/motion\.div>/g,
  `<span className="text-[48px] mb-3">{sub.icon}</span>
                        <span className="font-bold text-[15px] text-center text-black px-2">{sub.title}</span>
                        <span className="text-[12px] font-medium text-gray-400 mt-1">{sub.profiles.length > 0 ? (sub.profiles.length + ' người phù hợp') : 'Chưa có ai'}</span>
                     </motion.div>`
);

fs.writeFileSync('src/components/MainApp.tsx', code);
