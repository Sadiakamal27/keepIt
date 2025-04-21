import { Home, Plus, Settings, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "./ui/input"; // Make sure you have this component or create it
import { useState } from "react";

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const routes = [
    { icon: Plus, path: "/new", label: "Create Note" },
  ];

  return (
    <div className="w-69 bg-white border-r p-4 flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4">Your Notes</h2>
      
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto">
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