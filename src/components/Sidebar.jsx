import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";

export function Sidebar({ notes = [] }) {
  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <div className="md:hidden p-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px]">
            <SidebarContent notes={notes} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r bg-gray-50/40 p-4">
        <SidebarContent notes={notes} />
      </div>
    </>
  );
}

function SidebarContent({ notes }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold px-2">All Notes</h1>
      <div className="space-y-1">
        {notes.map((note) => (
          <Link
            key={note.id}
            to={`/notes/${note.id}`}
            className="block px-2 py-1.5 rounded hover:bg-gray-100 text-sm font-medium transition-colors"
          >
            {note.title}
          </Link>
        ))}
        <Link
          to="/notes/new"
          className="block px-2 py-1.5 rounded text-blue-600 hover:bg-blue-50 text-sm font-medium mt-2 transition-colors"
        >
          + New Note
        </Link>
      </div>
    </div>
  );
}