import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { RoleSelection } from "./pages/RoleSelection";
import { TouristLogin } from "./pages/tourist/TouristLogin";
import { Dashboard } from "./pages/tourist/Dashboard";
import { Attractions } from "./pages/tourist/Attractions";
import { Events } from "./pages/tourist/Events";
import { Products } from "./pages/tourist/Products";
import { Accommodations } from "./pages/tourist/Accommodations";
import { Cart } from "./pages/tourist/Cart";
import { Checkout } from "./pages/tourist/Checkout";
import { OrderStatus } from "./pages/tourist/OrderStatus";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ManageListings } from "./pages/admin/ManageListings";
import { ManageUsers } from "./pages/admin/ManageUsers";
import { ManageOrders } from "./pages/admin/ManageOrders";
import { ResortLogin } from "./pages/resort/ResortLogin";
import { ResortRegistration } from "./pages/resort/ResortRegistration";
import { ResortDashboard } from "./pages/resort/ResortDashboard";
import { ResortProfile } from "./pages/resort/ResortProfile";
import { EnterpriseLogin } from "./pages/enterprise/EnterpriseLogin";
import { EnterpriseRegistration } from "./pages/enterprise/EnterpriseRegistration";
import { EnterpriseDashboard } from "./pages/enterprise/EnterpriseDashboard";
import { EnterpriseProfile } from "./pages/enterprise/EnterpriseProfile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "dashboard", Component: Dashboard },
      { path: "select-role", Component: RoleSelection },
      { path: "tourist/login", Component: TouristLogin },
      { path: "attractions", Component: Attractions },
      { path: "events", Component: Events },
      { path: "products", Component: Products },
      { path: "accommodations", Component: Accommodations },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "status", Component: OrderStatus },
      { path: "admin/login", Component: AdminLogin },
      { path: "admin/dashboard", Component: AdminDashboard },
      { path: "admin/listings", Component: ManageListings },
      { path: "admin/users", Component: ManageUsers },
      { path: "admin/orders", Component: ManageOrders },
      { path: "resort/login", Component: ResortLogin },
      { path: "resort/register", Component: ResortRegistration },
      { path: "resort/dashboard", Component: ResortDashboard },
      { path: "resort/profile", Component: ResortProfile },
      { path: "enterprise/login", Component: EnterpriseLogin },
      { path: "enterprise/register", Component: EnterpriseRegistration },
      { path: "enterprise/dashboard", Component: EnterpriseDashboard },
      { path: "enterprise/profile", Component: EnterpriseProfile },
    ],
  },
]);
