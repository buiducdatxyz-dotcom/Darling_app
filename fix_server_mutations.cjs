const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/user\.profile_data = profileData;/g, 'user.profile_data = profileData; saveMockDb();');
code = code.replace(/mockUsers = mockUsers\.filter\(u => u\.id\.toString\(\) !== userId\.toString\(\)\);/g, 'mockUsers = mockUsers.filter(u => u.id.toString() !== userId.toString()); saveMockDb();');
code = code.replace(/mockMatches\.push\({ id: mockMatches\.length \+ 1, user1_id: m1, user2_id: m2 }\);/g, 'mockMatches.push({ id: mockMatches.length + 1, user1_id: m1, user2_id: m2 }); saveMockDb();');
code = code.replace(/mockMatches\.push\(m\);/g, 'mockMatches.push(m); saveMockDb();');
code = code.replace(/mockMessages\.push\({ id, match_id: actualMatchId, sender_id, content, created_at: new Date\(\) }\);/g, 'mockMessages.push({ id, match_id: actualMatchId, sender_id, content, created_at: new Date() }); saveMockDb();');
code = code.replace(/user\.email = newEmail;/g, 'user.email = newEmail; saveMockDb();');
code = code.replace(/user\.password = hashedNewPassword;/g, 'user.password = hashedNewPassword; saveMockDb();');

fs.writeFileSync('server.ts', code);
console.log('Fixed mutations!');
