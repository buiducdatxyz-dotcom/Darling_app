/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ViewState } from './types';
import { Login, Register } from './components/Auth';
import { SetupBasic, SetupLifestyle, SetupInterests, SetupLocation, WelcomeView } from './components/SetupProfile';
import { AppShell, SwipeView, ExploreView, LikesView, ChatView, ProfileViewRevised, GlobalAppStateProvider } from './components/MainApp';
import { SettingsView } from './components/Settings';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (isLoggedIn) {
      // Restore keys to sessionStorage if they are lost but present in localStorage
      const uId = localStorage.getItem('user_id');
      const email = localStorage.getItem('temp_register_email');
      const token = localStorage.getItem('auth_token');
      
      if (uId && !sessionStorage.getItem('user_id')) {
        sessionStorage.setItem('user_id', uId);
      }
      if (email && !sessionStorage.getItem('temp_register_email')) {
        sessionStorage.setItem('temp_register_email', email);
      }
      if (token && !sessionStorage.getItem('auth_token')) {
        sessionStorage.setItem('auth_token', token);
      }
      
      setCurrentView('app_swipe');
    }
    setIsLoaded(true);
  }, []);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('is_logged_in', 'true');
    setCurrentView('app_swipe');
  };

  const isAppShellView = currentView.startsWith('app_') && currentView !== 'app_settings';

  const renderView = () => {
    if (isAppShellView) {
      return (
        <AppShell currentView={currentView} onNavigate={handleNavigate}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full h-full"
            >
              {currentView === 'app_swipe' && <SwipeView />}
              {currentView === 'app_explore' && <ExploreView />}
              {currentView === 'app_likes' && <LikesView />}
              {currentView === 'app_chat' && <ChatView />}
              {currentView === 'app_profile' && <ProfileViewRevised onNavigate={handleNavigate} />}
            </motion.div>
          </AnimatePresence>
        </AppShell>
      );
    }

    switch (currentView) {
      case 'login':
        return <Login onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'register':
        return <Register onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'setup_basic':
        return <SetupBasic onNavigate={handleNavigate} />;
      case 'setup_lifestyle':
        return <SetupLifestyle onNavigate={handleNavigate} />;
      case 'setup_interests':
        return <SetupInterests onNavigate={handleNavigate} />;
      case 'setup_location':
        return <SetupLocation onNavigate={handleNavigate} />;
      case 'welcome':
        return <WelcomeView onNavigate={(view) => {
          localStorage.setItem('is_logged_in', 'true');
          handleNavigate(view);
        }} />;
      case 'app_settings':
        return <SettingsView onNavigate={handleNavigate} />;
      default:
        return <Login onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  if (!isLoaded) return null;

  return (
    <GlobalAppStateProvider onNavigate={handleNavigate}>
      <div className="w-full h-[100dvh] bg-[#f0f0f0] sm:bg-black/80 flex items-center justify-center relative overflow-hidden">
        <div className="w-full h-full max-w-[450px] bg-[#ff9ca0] overflow-hidden relative shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={isAppShellView ? 'app_shell' : currentView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </GlobalAppStateProvider>
  );
}
