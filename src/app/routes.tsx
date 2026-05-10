import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { RoleSelection } from "./pages/RoleSelection";
import { TouristLogin } from "./pages/tourist/TouristLogin";
import { TouristRegistration } from "./pages/tourist/TouristRegistration";
import { EmailVerification } from "./pages/tourist/EmailVerification";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/tourist/Dashboard";
import { Attractions } from "./pages/tourist/Attractions";
import { Events } from "./pages/tourist/Events";
import { Products } from "./pages/tourist/Products";
import { Accommodations } from "./pages/tourist/Accommodations";
import { Cart } from "./pages/tourist/Cart";
import { Checkout } from "./pages/tourist/Checkout";
import { OrderStatus } from "./pages/tourist/OrderStatus";
import { Settings } from "./pages/tourist/Settings";
import { ShippingAddresses } from "./pages/tourist/ShippingAddresses";
import { BusinessProfile } from "./pages/tourist/BusinessProfile";
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
import { ManageOrders as EnterpriseManageOrders } from "./pages/enterprise/ManageOrders";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "select-role", Component: RoleSelection },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
      { path: "tourist/login", Component: TouristLogin },
      { path: "tourist/register", Component: TouristRegistration },
      { path: "tourist/verify-email", Component: EmailVerification },
      { path: "attractions", Component: Attractions },
      { path: "events", Component: Events },
      { path: "products", Component: Products },
      { path: "accommodations", Component: Accommodations },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "status", Component: OrderStatus },
      { path: "settings", Component: Settings },
      { path: "settings/shipping", Component: ShippingAddresses },
      { path: "shipping-addresses", Component: ShippingAddresses },
      // Public business profile pages for registered businesses
      { path: "business/:type/:userId", Component: BusinessProfile },
      { path: "admin/login", Component: AdminLogin },
      { path: "admin/dashboard", Component: AdminDashboard },
      { path: "admin/listings", Component: ManageListings },
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
      { path: "enterprise/orders", Component: EnterpriseManageOrders },
    ],
  },
]);
