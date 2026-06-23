const fs = require('fs');
const path = require('path');

// 1. Update MainApp.tsx
const mainAppPath = path.join(__dirname, 'src', 'components', 'MainApp.tsx');
if (fs.existsSync(mainAppPath)) {
    let content = fs.readFileSync(mainAppPath, 'utf8');

    // Add AppContext usage in ProfileView
    const profileViewTarget = "export function ProfileView({ onNavigate }: { onNavigate?: (v: any) => void }) {\n  return (";
    const profileViewReplacement = "export function ProfileView({ onNavigate }: { onNavigate?: (v: any) => void }) {\n  const { logout } = React.useContext(AppContext);\n  return (";

    if (content.includes(profileViewTarget)) {
        content = content.replace(profileViewTarget, profileViewReplacement);
    } else {
        console.log("Could not find profileViewTarget in MainApp.tsx");
    }

    // Replace the button's onClick in ProfileView
    const buttonTarget = "onClick={() => { localStorage.clear(); sessionStorage.clear(); if(onNavigate) onNavigate('login'); }}";
    const buttonReplacement = "onClick={() => { if (logout) logout(); else { localStorage.clear(); sessionStorage.clear(); if(onNavigate) onNavigate('login'); } }}";

    if (content.includes(buttonTarget)) {
        content = content.replace(buttonTarget, buttonReplacement);
    } else {
        console.log("Could not find buttonTarget in MainApp.tsx");
    }

    fs.writeFileSync(mainAppPath, content, 'utf8');
    console.log("MainApp.tsx logout calls updated!");
}

// 2. Update Settings.tsx
const settingsPath = path.join(__dirname, 'src', 'components', 'Settings.tsx');
if (fs.existsSync(settingsPath)) {
    let content = fs.readFileSync(settingsPath, 'utf8');

    // Add import
    const importTarget = "import { ArrowLeft, Bell, Lock, CircleHelp, Info, ChevronRight, Check } from 'lucide-react';";
    const importReplacement = "import { ArrowLeft, Bell, Lock, CircleHelp, Info, ChevronRight, Check } from 'lucide-react';\nimport { AppContext } from './MainApp';";

    if (content.includes(importTarget)) {
        content = content.replace(importTarget, importReplacement);
    } else {
        console.log("Could not find importTarget in Settings.tsx");
    }

    // Add useContext inside SettingsView
    const viewTarget = "export function SettingsView({ onNavigate }: SettingsProps) {\n  const [activeSubView, setActiveSubView] = useState<null | 'security' | 'notifications' | 'help' | 'about'>(null);";
    const viewReplacement = "export function SettingsView({ onNavigate }: SettingsProps) {\n  const { logout } = React.useContext(AppContext);\n  const [activeSubView, setActiveSubView] = useState<null | 'security' | 'notifications' | 'help' | 'about'>(null);";

    if (content.includes(viewTarget)) {
        content = content.replace(viewTarget, viewReplacement);
    } else {
        console.log("Could not find viewTarget in Settings.tsx");
    }

    // Replace logout in SettingsView
    const logoutTarget1 = "onClick={() => {\n                         localStorage.clear();\n                         sessionStorage.clear(); onNavigate('login');\n                      }}";
    const logoutReplacement1 = "onClick={() => {\n                         if (logout) logout(); else {\n                            localStorage.clear();\n                            sessionStorage.clear(); onNavigate('login');\n                         }\n                      }}";

    if (content.includes(logoutTarget1)) {
        content = content.replace(logoutTarget1, logoutReplacement1);
    } else {
        // Try single-line match
        const logoutTarget1_alt = "localStorage.clear();\n                         sessionStorage.clear(); onNavigate('login');";
        const logoutReplacement1_alt = "if (logout) logout(); else {\n                         localStorage.clear();\n                         sessionStorage.clear(); onNavigate('login');\n                         }";
        if (content.includes(logoutTarget1_alt)) {
            content = content.replace(logoutTarget1_alt, logoutReplacement1_alt);
        } else {
            console.log("Could not find logoutTarget1 or alt in Settings.tsx");
        }
    }

    // Replace reload on delete account
    const deleteTarget = "localStorage.clear();\n                         sessionStorage.clear(); window.location.reload();";
    const deleteReplacement = "if (logout) logout(); else {\n                         localStorage.clear();\n                         sessionStorage.clear(); window.location.reload();\n                         }";

    if (content.includes(deleteTarget)) {
        content = content.replace(deleteTarget, deleteReplacement);
    } else {
        console.log("Could not find deleteTarget in Settings.tsx");
    }

    fs.writeFileSync(settingsPath, content, 'utf8');
    console.log("Settings.tsx logout calls updated!");
}
