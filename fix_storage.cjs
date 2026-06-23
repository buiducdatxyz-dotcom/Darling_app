const fs = require('fs');
const files = [
  'src/components/MainApp.tsx',
  'src/components/Auth.tsx',
  'src/components/Settings.tsx',
  'src/components/SetupProfile.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
     let content = fs.readFileSync(f, 'utf8');
     content = content.replace(/localStorage\.setItem\('user_id'/g, "sessionStorage.setItem('user_id'");
     content = content.replace(/localStorage\.getItem\('user_id'\)/g, "sessionStorage.getItem('user_id')");
     
     content = content.replace(/localStorage\.setItem\('auth_token'/g, "sessionStorage.setItem('auth_token'");
     content = content.replace(/localStorage\.getItem\('auth_token'\)/g, "sessionStorage.getItem('auth_token')");

     content = content.replace(/localStorage\.setItem\('temp_register_email'/g, "sessionStorage.setItem('temp_register_email'");
     content = content.replace(/localStorage\.getItem\('temp_register_email'\)/g, "sessionStorage.getItem('temp_register_email')");

     content = content.replace(/localStorage\.setItem\('temp_register_password'/g, "sessionStorage.setItem('temp_register_password'");
     content = content.replace(/localStorage\.getItem\('temp_register_password'\)/g, "sessionStorage.getItem('temp_register_password')");

     content = content.replace(/localStorage\.setItem\('ais_user_email'/g, "sessionStorage.setItem('ais_user_email'");
     content = content.replace(/localStorage\.getItem\('ais_user_email'\)/g, "sessionStorage.getItem('ais_user_email')");
     
     fs.writeFileSync(f, content);
  }
});
console.log("Done");
