import { Button } from "@/components/ui/button";
import { useAppContext } from "../contexts/AppContext"; // Changed from useAuth
import { useNavigate } from "react-router-dom";

function LogoutButton() {
  const { logout } = useAppContext(); // Changed from useAuth
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      className="text-white hover:bg-amber-700"
    >
      Logout
    </Button>
  );
}

export default LogoutButton;