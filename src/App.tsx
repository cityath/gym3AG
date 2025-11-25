import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/MainLayout";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminRoute from "./components/auth/AdminRoute";
import Users from "./pages/admin/Users";
import Classes from "./pages/admin/Classes";
import WeeklyCalendar from "./pages/admin/WeeklyCalendar";
import MonthlyCalendar from "./pages/admin/MonthlyCalendar";
import Preferences from "./pages/admin/Preferences";
import Settings from "./pages/admin/Settings";
import GenerateSchedule from "./pages/admin/GenerateSchedule";
import BookingDashboard from "./pages/admin/BookingDashboard";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas protegidas para usuarios */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          {/* Rutas protegidas para Admin */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />}>
              <Route index element={<Navigate to="booking-dashboard" replace />} />
              <Route path="booking-dashboard" element={<BookingDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="classes" element={<Classes />} />
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
      </BrowserRouter>
    </AuthProvider>
  </TooltipProvider>
);

export default App;