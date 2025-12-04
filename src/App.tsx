import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationProvider } from "@/hooks/useNotifications";
import { NotificationPermissionBanner } from "@/components/NotificationPermissionBanner";
import LoadingSpinner from "./components/LoadingSpinner";

// Carga perezosa de todos los componentes de página y layouts
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MainLayout = lazy(() => import("./components/layout/MainLayout"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminRoute = lazy(() => import("./components/auth/AdminRoute"));
const Users = lazy(() => import("./pages/admin/Users"));
const Classes = lazy(() => import("./pages/admin/Classes"));
const WeeklyCalendar = lazy(() => import("./pages/admin/WeeklyCalendar"));
const MonthlyCalendar = lazy(() => import("./pages/admin/MonthlyCalendar"));
const Preferences = lazy(() => import("./pages/admin/Preferences"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const GenerateSchedule = lazy(() => import("./pages/admin/GenerateSchedule"));
const BookingDashboard = lazy(() => import("./pages/admin/BookingDashboard"));
const Packages = lazy(() => import("./pages/admin/Packages"));
const PackagesPage = lazy(() => import("./pages/Packages"));

import { ReloadPrompt } from "@/components/ReloadPrompt";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <ReloadPrompt />
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Rutas protegidas para usuarios */}
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Rutas protegidas para Admin */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<Admin />}>
                  <Route index element={<Navigate to="booking-dashboard" replace />} />
                  <Route path="booking-dashboard" element={<BookingDashboard />} />
                  <Route path="users" element={<Users />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="packages" element={<Packages />} />
                  <Route path="schedule/weekly" element={<WeeklyCalendar />} />
                  <Route path="schedule/monthly" element={<MonthlyCalendar />} />
                  <Route path="schedule/preferences" element={<Preferences />} />
                  <Route path="schedule/generate" element={<GenerateSchedule />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              {/* No encontrado */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <NotificationPermissionBanner />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  </TooltipProvider>
);

export default App;