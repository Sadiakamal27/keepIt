import { Plus, Search, FileText, Trash2 } from "lucide-react"; 
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "./ui/input";
import { useState } from "react";
import { useAppContext } from "../contexts/AppContext";

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { notes, isLoading, deleteNote } = useAppContext();

  const routes = [
    { icon: Plus, path: "/new", label: "Create Note" },
  ];

  const filteredNotes = notes.filter(note =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id) => {
    const success = await deleteNote(id);
    if (success && location.pathname === `/notes/${id}`) {
      navigate("/"); 
    }
  };

  return (
    <div className="w-69 bg-white border-r p-4 flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4">Your Notes</h2>
      
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

      <div className="flex-1 overflow-y-auto mt-4">
        {isLoading ? (
          <div className="text-center py-4">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchQuery ? "No matching notes" : "No notes yet"}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <div
                  className="flex items-center gap-3 flex-1"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="truncate">
                    {note.content.substring(0, 30)}
                    {note.content.length > 30 && "..."}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="hidden group-hover:block  hover:text-white"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};