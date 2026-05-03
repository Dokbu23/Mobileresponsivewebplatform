import { Outlet } from "react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { AppProvider } from "../context/AppContext";
import { Toaster } from "sonner";

export function RootLayout() {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <Toaster position="top-right" richColors />
      </div>
    </AppProvider>
  );
}
