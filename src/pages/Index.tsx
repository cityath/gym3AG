import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      return; // Wait for loading to finish
    }
    if (user) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show a loading indicator while redirecting
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <p>Loading...</p>
    </div>
  );
};

export default Index;