import { Sidebar } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

function Layout() {
  const { user } = useAppContext();

  return (
    <div className="min-h-screen  flex flex-col">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] w-full">
        <Sidebar />
        <div className="flex-1 p-6 overflow-y-auto">
          {user && (
            <p className="mt-2">
              Logged in as: <strong>{user.email}</strong>
            </p>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
