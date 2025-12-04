import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ProfileForm from "@/components/ProfileForm";
import { NotificationSettings } from "@/components/NotificationSettings";

const Profile = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ProfileForm />
      <NotificationSettings />
      <div className="text-center">
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;