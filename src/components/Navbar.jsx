import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import LogoutButton from "./LogoutButton";
import ShareNote from "./ShareNote";

function Navbar() {
  const { user } = useAppContext();
  const location = useLocation();

  
  const getNoteId = () => {
   
    const match = location.pathname.match(/\/(?:note|notes)\/([^/]+)/);
    return match ? match[1] : null;
  };

  const noteId = getNoteId();
  console.log("Current noteId:", noteId); 

  return (
    <nav className="bg-amber-600 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
        <Link to="/" className="flex items-center">
          <img src="/keepitlogo.png" alt="KeepIt Logo" className="h-9 w-auto" />
          <h1 className="text-xl font-bold text-white ml-2">KeepIt</h1>
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <LogoutButton />
            {noteId && (
              <div className="relative">
                <ShareNote noteId={noteId} />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
