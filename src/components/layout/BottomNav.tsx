import { NavLink } from "react-router-dom";
import { CalendarDays, Ticket, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const { profile } = useAuth();
  const activeLinkClass = "text-blue-600";
  const inactiveLinkClass = "text-gray-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
      <div className="flex justify-around max-w-7xl mx-auto">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full pt-2 pb-1 text-sm ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          <CalendarDays className="h-6 w-6 mb-1" />
          <span>Classes</span>
        </NavLink>
        <NavLink
          to="/my-bookings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full pt-2 pb-1 text-sm ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          <Ticket className="h-6 w-6 mb-1" />
          <span>My Bookings</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full pt-2 pb-1 text-sm ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          <User className="h-6 w-6 mb-1" />
          <span>Profile</span>
        </NavLink>
        {(profile?.role === 'admin' || profile?.role === 'instructor') && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full pt-2 pb-1 text-sm ${isActive ? activeLinkClass : inactiveLinkClass}`
            }
          >
            <Shield className="h-6 w-6 mb-1" />
            <span>{profile.role === 'admin' ? 'Admin' : 'Panel'}</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;