/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ViewState } from './types';

const Login = React.lazy(() => import('./components/Auth').then(module => ({ default: module.Login })));
const Register = React.lazy(() => import('./components/Auth').then(module => ({ default: module.Register })));
const SetupBasic = React.lazy(() => import('./components/SetupProfile').then(module => ({ default: module.SetupBasic })));
const SetupLifestyle = React.lazy(() => import('./components/SetupProfile').then(module => ({ default: module.SetupLifestyle })));
const SetupInterests = React.lazy(() => import('./components/SetupProfile').then(module => ({ default: module.SetupInterests })));
const SetupLocation = React.lazy(() => import('./components/SetupProfile').then(module => ({ default: module.SetupLocation })));
const WelcomeView = React.lazy(() => import('./components/SetupProfile').then(module => ({ default: module.WelcomeView })));
const AppShell = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.AppShell })));
const SwipeView = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.SwipeView })));
const ExploreView = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.ExploreView })));
const LikesView = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.LikesView })));
const ChatView = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.ChatView })));
const ProfileViewRevised = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.ProfileViewRevised })));
const GlobalAppStateProvider = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.GlobalAppStateProvider })));
const MomentsView = React.lazy(() => import('./components/MomentsView').then(module => ({ default: module.MomentsView })));
const SettingsView = React.lazy(() => import('./components/Settings').then(module => ({ default: module.SettingsView })));
const AdminPanelView = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanelView })));

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

  const isAppShellView = currentView.startsWith('app_');

  const renderView = () => {
    if (isAppShellView) {
      return (
          <AppShell currentView={currentView} onNavigate={handleNavigate}>
            <div className="absolute inset-0">
              <div className={`absolute inset-0 ${currentView === 'app_swipe' ? '' : 'invisible pointer-events-none'}`} aria-hidden={currentView !== 'app_swipe'}>
                <SwipeView />
              </div>
              <AnimatePresence mode="popLayout">
                {currentView !== 'app_swipe' && (
                  <motion.div
                    key={currentView}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full"
                  >
                    {currentView === 'app_moments' && <MomentsView myProfile={undefined} />}
                    {currentView === 'app_explore' && <ExploreView />}
                    {currentView === 'app_likes' && <LikesView />}
                    {currentView === 'app_chat' && <ChatView />}
                    {currentView === 'app_profile' && <ProfileViewRevised onNavigate={handleNavigate} />}
                    {currentView === 'app_admin' && <AdminPanelView />}
                    {currentView === 'app_settings' && <SettingsView onNavigate={handleNavigate} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
      default:
        return <Login onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  if (!isLoaded) return null;

  return (
    <Suspense fallback={<div className="w-full h-[100dvh] flex items-center justify-center bg-sky-50 text-sky-700 font-semibold"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />Đang tải ứng dụng…</div>}>
      <GlobalAppStateProvider onNavigate={handleNavigate} enabled={isAppShellView}>
        <div className="w-full h-[100dvh] bg-[#eef6ff] sm:bg-[#dbeafe] flex items-center justify-center relative overflow-hidden">
          <div className="w-full h-full max-w-[450px] bg-[#eaf4ff] overflow-hidden relative shadow-2xl sm:rounded-[28px]">
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
    </Suspense>
  );
}
