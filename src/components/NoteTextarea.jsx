import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function NoteTextarea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, isLoading, updateNote, addNote } = useAppContext();
  
  const [title , setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currentNote = id ? notes.find(note => String(note.id) === String(id)) : null;

  useEffect(() => {
    if (id && !currentNote && !isLoading) {

      const fetchNote = async () => {
        try {
          const response = await fetch(`http://localhost:5000/notes/${id}`, {
            headers: {
              "Content-Type": "application/json",
              "user-id": localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).id : "",
            },
          });
          if (!response.ok) throw new Error("Failed to fetch note");
          const note = await response.json();
          setTitle(note.title);
          setContent(note.content);
        } catch (error) {
          console.error("Fetch note error:", error);
          setTitle("");
          setContent(""); 
          navigate("/"); 
        }
      };
      fetchNote();
    } else if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
    } else {
      setTitle("");
      setContent(""); 
    }
  }, [currentNote, id, isLoading, navigate]);

  const handleSave = async () => {
    if (!content.trim()|| !title.trim()) {
      alert("Title and content cannot be empty!"); 
      return;
    }
  
    setIsSaving(true);
    try {
      if (currentNote) {
        const success = await updateNote(currentNote.id, title , content);
        if (!success) throw new Error("Failed to update note");
      } else {
        const success = await addNote({ title , content });
        if (success) {
          setTitle("");
          setContent(""); 
        } else {
          throw new Error("Failed to create note");
        }
      }
    } catch (error) {
      console.error("Save error:", error);
     
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-100 p-4 space-y-4">
      <Textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="custom-title-textarea font-semibold border-none p-1 focus:ring-0 resize-none min-h-[60px] h-[50px] overflow-hidden"
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 48)}px`;
        }}
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start typing your note here..."
        className="flex-1 border-none p-2 focus:ring-0 resize-none"
      />
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            currentNote ? "Update" : "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

export default NoteTextarea;