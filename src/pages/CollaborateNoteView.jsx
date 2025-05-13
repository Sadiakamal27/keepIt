// CollaborateNoteView.jsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import NoteTextarea from "../components/NoteTextarea";

export default function CollaborateNoteView() {
  const { noteId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, fetchNoteByToken } = useAppContext();
  const [collaborationToken] = useState(searchParams.get("token") || null);
  const [permission, setPermission] = useState("read");
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!noteId || isFetching) return;

    const fetchNote = async () => {
      setIsFetching(true);
      try {
        if (collaborationToken) {
          const note = await fetchNoteByToken(noteId, collaborationToken);
          if (note) {
            setPermission(note.permission || "read");
            setNoteContent(note.content || "");
            setNoteTitle(note.title || "");
          } else {
            setPermission("read");
            if (!isFetching) alert("Failed to load note. You may not have permission.");
          }
        } else if (user) {
          const response = await fetch(`http://localhost:5000/notes/${noteId}`, {
            headers: {
              "Content-Type": "application/json",
              "user-id": user.id,
            },
          });
          if (!response.ok) throw new Error("Note not found");
          const noteData = await response.json();
          setPermission("full");
          setNoteContent(noteData.content || "");
          setNoteTitle(noteData.title || "");
        } else {
          setPermission("read");
          setNoteContent("");
          setNoteTitle(`Collaborating on Note: ${noteId}`);
          if (!isFetching) alert("Please log in or use a valid collaboration link for full access.");
        }
      } catch (error) {
        console.error("Error fetching note:", error);
        setPermission("read");
        if (!isFetching) alert("Failed to load note. You may not have permission.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchNote();
  }, [noteId, collaborationToken, fetchNoteByToken, user]);

  if (!noteId) {
    return <div>Loading note...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col h-full p-4 text-lg space-y-4" dir="ltr">
        {user ? (
          <NoteTextarea
            initialContent={noteContent}
            initialTitle={noteTitle}
            permission={permission}
          />
        ) : (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
              {noteTitle || `Collaborating on Note: ${noteId}`}
            </h1>
            <div className="lexical-editor-wrapper min-h-[400px]">
              <textarea
                className="w-full p-4 border border-gray-300 rounded-md text-lg min-h-[400px] focus:ring-2 focus:ring-blue-500"
                disabled={permission === "read"}
                value={noteContent}
                rows={20}
                placeholder="Note content will appear here..."
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
            {permission !== "read" && (
              <div className="mt-4">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  onClick={() => {
                    console.log("Saving content:", noteContent);
                  }}
                >
                  Save Content
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}