import { Outlet } from "react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Toaster } from "sonner";
import { useApp } from "../context/AppContext";
import { ProfileSetupModal } from "../components/ProfileSetupModal";
import ChatWidgetEnhanced from "../components/ChatWidgetEnhanced";
import { ChristmasHolidayTheme } from "../components/ChristmasHolidayTheme";

export function RootLayout() {
  const { currentUser, userType } = useApp();
  const isProfileSetupRequired = Boolean(
    currentUser && (currentUser.role === 'pending' || userType === 'pending')
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ChristmasHolidayTheme />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" richColors />
      <ProfileSetupModal isOpen={isProfileSetupRequired} />
      <ChatWidgetEnhanced />
    </div>
  );
}
