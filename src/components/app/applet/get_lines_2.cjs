const fs = require('fs');
const lines = fs.readFileSync('src/components/MainApp.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('export function ChatView('));
let end = lines.findIndex((l, i) => i > start && l.includes('export function ProfileView()'));
if (end === -1) end = lines.findIndex((l, i) => i > start && l.includes('export function ProfileViewRevised('));
console.log(start, end);
