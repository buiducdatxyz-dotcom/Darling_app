const fs = require('fs');
try {
    const lines = fs.readFileSync('src/components/MainApp.tsx', 'utf8').split('\n');
    console.log("Lines read:", lines.length);
    const start = lines.findIndex(l => l.includes('export function ChatView('));
    if (start === -1) {
        console.log("Could not find start");
    } else {
        console.log("start found at:", start);
    }
    const end = lines.findIndex((l, i) => i > start && l.includes('export function ProfileView()'));
    console.log("end at:", end);
} catch (e) {
    console.error(e);
}
