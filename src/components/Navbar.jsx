import { Link } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext"; // Changed from useAuth
import { Button } from "@/components/ui/button";
import LogoutButton from "./LogoutButton";

function Navbar() {
  const { user } = useAppContext(); // Changed from useAuth

  return (
    <nav className="bg-amber-600 p-3 shadow-md w-full">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
        <Link to="/" className="flex items-center mr-auto">
          <img
            src="/keepitlogo.png"
            alt="KeepIt Logo"
            className="h-9 w-auto"
          />
          <h1 className="text-xl font-bold text-white ml-2">KeepIt</h1>
        </Link>
      
        {user && <LogoutButton />}
      </div>
    </nav>
  );
}

export default Navbar;