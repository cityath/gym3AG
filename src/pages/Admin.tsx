import { NavLink, Outlet } from "react-router-dom";
import { Users, LayoutDashboard, Calendar, ChevronDown, ChevronRight, Settings, BookCheck, Menu } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const AdminSidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const { profile } = useAuth();
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);

  const baseLinkClass = "flex items-center px-4 py-2 text-sm font-medium rounded-md";
  const activeLinkClass = "bg-gray-100 text-gray-900";
  const inactiveLinkClass = "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(baseLinkClass, isActive ? activeLinkClass : inactiveLinkClass);

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          {profile?.role === 'admin' ? 'Administración' : 'Panel de Instructor'}
        </h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/admin/booking-dashboard" className={getNavLinkClass} onClick={handleLinkClick}>
          <BookCheck className="mr-3 h-5 w-5" />
          <span>Booking Dashboard</span>
        </NavLink>
        {profile?.role === 'admin' && (
          <NavLink to="/admin/users" className={getNavLinkClass} onClick={handleLinkClick}>
            <Users className="mr-3 h-5 w-5" />
            <span>Usuarios</span>
          </NavLink>
        )}
        <NavLink to="/admin/classes" className={getNavLinkClass} onClick={handleLinkClick}>
          <LayoutDashboard className="mr-3 h-5 w-5" />
          <span>Clases</span>
        </NavLink>
        <Collapsible open={isScheduleOpen} onOpenChange={setIsScheduleOpen} className="space-y-1">
          <CollapsibleTrigger className="w-full">
            <div className={cn(baseLinkClass, inactiveLinkClass, "justify-between w-full")}>
              <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5" />
                <span>Programación</span>
              </div>
              {isScheduleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-1">
             <NavLink to="/admin/schedule/weekly" className={getNavLinkClass} onClick={handleLinkClick}>
              <span className="mr-3 h-5 w-5" />
              <span>Calendario Semanal</span>
            </NavLink>
            <NavLink to="/admin/schedule/monthly" className={getNavLinkClass} onClick={handleLinkClick}>
              <span className="mr-3 h-5 w-5" />
              <span>Calendario Mensual</span>
            </NavLink>
             <NavLink to="/admin/schedule/preferences" className={getNavLinkClass} onClick={handleLinkClick}>
               <span className="mr-3 h-5 w-5" />
              <span>Preferencias</span>
            </NavLink>
            <NavLink to="/admin/schedule/generate" className={getNavLinkClass} onClick={handleLinkClick}>
               <span className="mr-3 h-5 w-5" />
              <span>Generar Programación</span>
            </NavLink>
          </CollapsibleContent>
        </Collapsible>
        {profile?.role === 'admin' && (
          <NavLink to="/admin/settings" className={getNavLinkClass} onClick={handleLinkClick}>
            <Settings className="mr-3 h-5 w-5" />
            <span>Configuración</span>
          </NavLink>
        )}
      </nav>
    </>
  );
};

const Admin = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r shrink-0">
        <AdminSidebarContent />
      </aside>

      <div className="flex flex-col flex-1">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <h2 className="text-lg font-semibold">Panel Admin</h2>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <AdminSidebarContent onLinkClick={() => setIsMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Admin;