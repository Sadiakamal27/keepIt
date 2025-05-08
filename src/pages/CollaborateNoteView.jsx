import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import NoteTextarea from "../components/NoteTextarea";

export default function CollaborateNoteView() {
    const { noteId } = useParams();
      
  const { user, fetchNoteByToken } = useAppContext();
  const [collaborationToken, setCollaborationToken] = useState(null);
  const [permission, setPermission] = useState("read");


  useEffect(() => {
    if (router.query.token) {
      setCollaborationToken(router.query.token);
    }
  }, [router.query]);

  
  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      try {
        if (collaborationToken) {
          const note = await fetchNoteByToken(noteId, collaborationToken);
          setPermission(note.permission || "read");
        }
      } catch (error) {
        console.error("Error fetching note:", error);
        alert("Failed to load note. You may not have permission.");
      }
    };

    fetchNote();
  }, [noteId, collaborationToken, fetchNoteByToken]);

  if (!noteId) {
    return <div>Loading note...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col h-full p-4 space-y-4" dir="ltr">
        {user ? (
          <NoteTextarea />
        ) : (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
              Collaborating on Note: {noteId}
            </h1>
            <div className="lexical-editor-wrapper">
              <textarea
                className="w-full p-4 border border-gray-300 rounded-md"
                disabled={permission === 'read'}
                rows={10}
                placeholder="Note content will appear here..."
              />
            </div>
            {permission !== 'read' && (
              <div className="mt-4">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
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