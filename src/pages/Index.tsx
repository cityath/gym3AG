import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      return; // Espera a que termine la carga
    }
    if (user) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // Muestra un indicador de carga mientras se redirige
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <p>Cargando...</p>
    </div>
  );
};

export default Index;