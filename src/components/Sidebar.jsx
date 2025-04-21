import { Home, Plus, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const routes = [
    
    { icon: Plus, path: "/new", label: "Create Note" },
    
  ];

  return (
    <div className="w-69 bg-white border-r p-4">
      <h2 className="text-xl font-bold mb-6">Your Notes</h2>
      <div className="space-y-2">
        {routes.map((route) => (
          <button
            key={route.path}
            onClick={() => navigate(route.path)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-100 ${
              location.pathname === route.path ? "bg-blue-50 text-blue-600" : ""
            }`}
          >
            <route.icon className="h-5 w-5" />
            <span>{route.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};