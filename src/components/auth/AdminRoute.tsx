import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AdminRoute = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;