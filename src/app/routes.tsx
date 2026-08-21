import { createBrowserRouter, useNavigate } from "react-router";
import { useEffect } from "react";


import { RootLayout } from "./layouts/RootLayout";
import { RoleSelection } from "./pages/RoleSelection";
import { UnifiedLogin } from "./pages/UnifiedLogin";
import { UnifiedRegister } from "./pages/UnifiedRegister";
import { TouristLogin } from "./pages/tourist/TouristLogin";
import { TouristRegistration } from "./pages/tourist/TouristRegistration";
import { EmailVerification } from "./pages/tourist/EmailVerification";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Profile } from "./pages/Profile";
import { Dashboard } from "./pages/tourist/Dashboard";
import { Attractions } from "./pages/tourist/Attractions";
import { Events } from "./pages/tourist/Events";
import { Products } from "./pages/tourist/Products";
import { Accommodations } from "./pages/tourist/Accommodations";
import { Settings } from "./pages/tourist/Settings";
import { BusinessProfile } from "./pages/tourist/BusinessProfile";
import { MapExplore } from "./pages/tourist/MapExplore";
import { Itinerary } from "./pages/tourist/Itinerary";
import { Wishlist } from "./pages/tourist/Wishlist";

import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ManageListings } from "./pages/admin/ManageListings";
import { ManageEvents } from "./pages/admin/ManageEvents";
import { ManageUsers } from "./pages/admin/ManageUsers";
import { ManageSubscriptions } from "./pages/admin/ManageSubscriptions";
import { ManagePaymentSettings } from "./pages/admin/ManagePaymentSettings";
import { ResortLogin } from "./pages/resort/ResortLogin";
import { ResortRegistration } from "./pages/resort/ResortRegistration";
import { ResortDashboard } from "./pages/resort/ResortDashboard";
import { ResortProfile } from "./pages/resort/ResortProfile";
import { ResortProfileSetup } from "./pages/resort/ResortProfileSetup";
import { EnterpriseLogin } from "./pages/enterprise/EnterpriseLogin";
import { EnterpriseRegistration } from "./pages/enterprise/EnterpriseRegistration";
import { EnterpriseDashboard } from "./pages/enterprise/EnterpriseDashboard";
import { EnterpriseProfile } from "./pages/enterprise/EnterpriseProfile";
import { EnterpriseProfileSetup } from "./pages/enterprise/EnterpriseProfileSetup";

function SmartRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const userType = window.localStorage.getItem('discover-mansalay:userType');
    switch (userType) {
      case 'admin':
        navigate('/admin/dashboard', { replace: true });
        break;
      case 'resort':
      case 'enterprise':
      case 'tourist':
      default:
        navigate('/dashboard', { replace: true });
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

import { AdminContent } from "./pages/admin/AdminContent";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, Component: SmartRedirect },
      { path: "dashboard", Component: Dashboard },
      { path: "login", Component: UnifiedLogin },
      { path: "register", Component: UnifiedRegister },
      { path: "select-role", Component: RoleSelection },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
      { path: "profile", Component: Profile },
      { path: "tourist/login", Component: TouristLogin },
      { path: "tourist/register", Component: TouristRegistration },
      { path: "tourist/verify-email", Component: EmailVerification },
      { path: "attractions", Component: Attractions },
      { path: "events", Component: Events },
      { path: "products", Component: Products },
      { path: "accommodations", Component: Accommodations },
      { path: "map", Component: MapExplore },
      { path: "itinerary", Component: Itinerary },
      { path: "settings", Component: Settings },
      { path: "wishlist", Component: Wishlist },

      // Note: Cart, checkout, shipping addresses removed - this is now a display-only platform
      // Public business profile pages for registered businesses
      { path: "business/:type/:userId", Component: BusinessProfile },
      { path: "admin/login", Component: AdminLogin },
      { path: "admin/dashboard", Component: AdminDashboard },
      { path: "admin/publish", Component: AdminContent },
      { path: "admin/listings", Component: AdminContent },
      { path: "admin/events", Component: ManageEvents },
      { path: "admin/users", Component: ManageUsers },
      { path: "admin/subscriptions", Component: ManageSubscriptions },
      { path: "admin/payment-settings", Component: ManagePaymentSettings },
      { path: "resort/login", Component: ResortLogin },
      { path: "resort/register", Component: ResortRegistration },
      { path: "resort/verify-email", Component: EmailVerification },
      { path: "resort/dashboard", Component: ResortDashboard },
      { path: "resort/profile", Component: ResortProfile },
      { path: "resort/profile/setup", Component: ResortProfileSetup },
      { path: "enterprise/login", Component: EnterpriseLogin },
      { path: "enterprise/register", Component: EnterpriseRegistration },
      { path: "enterprise/verify-email", Component: EmailVerification },
      { path: "enterprise/dashboard", Component: EnterpriseDashboard },
      { path: "enterprise/profile", Component: EnterpriseProfile },
      { path: "enterprise/profile/setup", Component: EnterpriseProfileSetup },
    ],
  },
]);
