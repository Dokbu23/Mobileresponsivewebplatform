import { Outlet } from "react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Toaster } from "sonner";
import { useApp } from "../context/AppContext";
import { ProfileSetupModal } from "../components/ProfileSetupModal";
import ChatWidgetEnhanced from "../components/ChatWidgetEnhanced";

export function RootLayout() {
  // Safely handle context usage with try-catch for HMR scenarios
  let currentUser = null;
  let userType = null;
  let isProfileSetupRequired = false;
  
  try {
    const appContext = useApp();
    currentUser = appContext.currentUser;
    userType = appContext.userType;
    isProfileSetupRequired = Boolean(
      currentUser && (currentUser.role === 'pending' || userType === 'pending')
    );
  } catch (error) {
    // Context not available during HMR or provider initialization
    console.warn('AppContext not available in RootLayout:', error instanceof Error ? error.message : error);
    isProfileSetupRequired = false;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" richColors />
      {isProfileSetupRequired && <ProfileSetupModal isOpen={isProfileSetupRequired} />}
      <ChatWidgetEnhanced />
    </div>
  );
}
