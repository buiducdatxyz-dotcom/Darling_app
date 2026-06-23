const fs = require('fs');
let code = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

code = code.replace(
  /useEffect\(\(\) => \{\n\s*if \(activeChat\) \{\n\s*setMessages\(\[\]\);\n\s*setInputText\(''\);\n\s*\}\n\s*\}, \[activeChat\]\);/g,
  `useEffect(() => {
    if (activeChat) {
      setInputText('');
    }
  }, [activeChat]);`
);

fs.writeFileSync('src/components/MainApp.tsx', code);
