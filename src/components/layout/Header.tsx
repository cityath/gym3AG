import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold text-gray-900">
          City Athletes
        </Link>
        <div className="hidden md:flex items-center space-x-4">
          {(profile?.role === 'admin' || profile?.role === 'instructor') && (
            <Button variant="ghost" asChild>
              <Link to="/admin">Panel Admin</Link>
            </Button>
          )}
          <span className="text-sm text-gray-600">
            Hola, <span className="font-bold text-gray-800">{profile?.first_name || user?.email}</span>
          </span>
          <Button variant="outline" onClick={handleSignOut}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;