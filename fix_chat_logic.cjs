const fs = require('fs');

let content = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

// 1. Change endpoint in LikesView from /api/matches to /api/likes
content = content.replace(
  /const res = await fetch\(\`\/api\/matches\/\$\{userId\}\`\);/,
  "const res = await fetch(`/api/likes/${userId}`);"
);

// 2. Change Heart button behavior in LikesView
content = content.replace(
  /<button onClick=\{\(\) => setShowMatch\(true\)\} className="w-\[72px\] h-\[72px\] bg-white rounded-full flex justify-center items-center shrink-0 shadow-lg border border-black\/5 active:scale-95 transition-transform">\n\s*<Heart className="w-8 h-8 flex-shrink-0 text-\[#2dd881\] fill-\[#2dd881\] stroke-\[2\]" \/>\n\s*<\/button>/,
  `{activeTab !== 'liked' && (
                    <button onClick={() => {
                        // Call toggleLike directly for logic
                        // If it's 'received', it creates a match
                        const p = { id: selectedProfile.id, name: selectedProfile.name, images: [selectedProfile.img], location: selectedProfile.count };
                        toggleLike(p);
                        if (activeTab === 'received') {
                            setShowMatch(true);
                            setReceivedLikes(prev => prev.filter(r => r.id !== selectedProfile.id));
                        } else {
                            setSelectedProfile(null);
                        }
                    }} className="w-[72px] h-[72px] bg-white rounded-full flex justify-center items-center shrink-0 shadow-lg border border-black/5 active:scale-95 transition-transform">
                      <Heart className="w-8 h-8 flex-shrink-0 text-[#2dd881] fill-[#2dd881] stroke-[2]" />
                    </button>
                 )}`
);

// 3. Prevent deduplicating likedProfiles into matchedChats in ChatView
content = content.replace(
  /\/\/ Deduplicate likedProfiles\n\s*likedProfiles\.forEach\(lp => \{\n\s*if \(!matchedChats\.find\(c => c\.name === lp\.name\)\) \{\n\s*matchedChats\.push\(lp\);\n\s*\}\n\s*\}\);/g,
  `// (Removed likedProfiles deduplication to prevent showing un-mutually matched profiles in chat)`
);

fs.writeFileSync('src/components/MainApp.tsx', content);
console.log('Fixed LikesView and ChatView logic!');
