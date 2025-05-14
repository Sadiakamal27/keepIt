// CollaborateNoteView.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import NoteTextarea from "../components/NoteTextarea";

export default function CollaborateNoteView() {
  const { noteId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, fetchNoteByToken } = useAppContext();
  const [collaborationToken] = useState(searchParams.get("token") || null);
  const [permission, setPermission] = useState("read");
  const [originalContent, setOriginalContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false); // Track if fetch has been attempted

  const fetchNote = useCallback(async () => {
    if (!noteId || isFetching || hasFetched) return;

    setIsFetching(true);
    setError(null);
    try {
      if (collaborationToken) {
        const note = await fetchNoteByToken(noteId, collaborationToken);
        console.log("Fetched note with token:", note);
        if (note) {
          setPermission(note.permission || "read");
          console.log("Set permission to:", note.permission || "read");
          const content = note.note?.content || note.content || "";
          setOriginalContent(content);
          setNoteTitle(note.note?.title || note.title || "");
        } else {
          setPermission("read");
          setError("Failed to load note. You may not have permission.");
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
        setOriginalContent(noteData.content || "");
        setNoteTitle(noteData.title || "");
      } else {
        setPermission("read");
        setOriginalContent("");
        setNoteTitle(`Collaborating on Note: ${noteId}`);
        setError("Please log in or use a valid collaboration link for full access.");
      }
    } catch (error) {
      console.error("Error fetching note:", error);
      setError("Failed to load note: " + error.message);
      setPermission("read");
    } finally {
      setIsFetching(false);
      setHasFetched(true); // Mark fetch as complete
    }
  }, [noteId, collaborationToken, fetchNoteByToken, user, isFetching, hasFetched]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  if (isFetching) {
    return <div>Loading note...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col p-4">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col h-full p-4 text-lg space-y-4" dir="ltr">
        <NoteTextarea
          key={noteId} // Ensure NoteTextarea re-mounts only when noteId changes
          initialContent={originalContent}
          initialTitle={noteTitle}
          permission={permission}
          token={collaborationToken}
        />
      </div>
    </div>
  );
}