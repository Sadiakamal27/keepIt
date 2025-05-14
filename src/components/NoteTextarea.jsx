import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import ToolbarPlugin from "./ToolbarPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const editorConfig = {
  namespace: "KeepitEditor",
  theme: {
    root: "p-4 min-h-[200px] border rounded-md focus:outline-none ltr editor-root",
    paragraph: "m-0 ltr",
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
    },
  },
  onError(error) {
    console.error("Lexical Error:", error);
  },
};

function InitializeEditorPlugin({ initialContent }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (initialContent === null || initialContent === undefined || initialContent === "") {
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(""));
        root.append(paragraph);
      } else {
        try {
          const editorState = editor.parseEditorState(initialContent);
          editor.setEditorState(editorState);
        } catch (e) {
          console.error("Failed to parse editor state:", e);
          root.clear();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(""));
          root.append(paragraph);
        }
      }
    });
  }, [editor, initialContent]);

  return null;
}

function NoteTextarea({ initialContent, initialTitle, permission, token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, isLoading, updateNote, addNote } = useAppContext();
  const [title, setTitle] = useState(initialTitle || "");
  const [editorInstance, setEditorInstance] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const contentEditableRef = useRef(null);
  const currentNote = id ? notes.find((note) => String(note.id) === String(id)) : null;

  const debouncedSetEditorInstance = useCallback(
    debounce((jsonState) => {
      setEditorInstance(jsonState);
    }, 1000),
    []
  );

  useEffect(() => {
    if (id && !currentNote && !isLoading && !initialContent && !initialTitle) {
      setIsFetching(true);
      const fetchNote = async () => {
        try {
          const headers = {
            "Content-Type": "application/json",
            "user-id": localStorage.getItem("user")
              ? JSON.parse(localStorage.getItem("user")).id
              : "",
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          const response = await fetch(`http://localhost:5000/notes/${id}`, {
            headers,
          });
          if (!response.ok) throw new Error("Failed to fetch note");
          const note = await response.json();
          setTitle(note.title || "");
          setEditorInstance(note.content || "");
        } catch (error) {
          console.error("Fetch note error:", error);
          setTitle("");
          setEditorInstance("");
          navigate("/");
        } finally {
          setIsFetching(false);
        }
      };
      fetchNote();
    } else if (currentNote) {
      setTitle(currentNote.title || "");
      setEditorInstance(currentNote.content || "");
    } else {
      setTitle(initialTitle || "");
      setEditorInstance(initialContent || "");
    }
  }, [currentNote, id, isLoading, navigate, initialContent, initialTitle, token]);

  const onChange = useCallback(
    (editorState) => {
      editorState.read(() => {
        const jsonState = JSON.stringify(editorState.toJSON());
        debouncedSetEditorInstance(jsonState);
      });
    },
    [debouncedSetEditorInstance]
  );

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Title cannot be empty!");
      return;
    }

    if (permission !== "write" && permission !== "full") {
      console.log("Permission check failed. Current permission:", permission);
      alert("You do not have permission to edit this note.");
      return;
    }

    setIsSaving(true);
    try {
      let currentEditorState = editorInstance;

      if (!currentEditorState) {
        alert("Content cannot be empty!");
        return;
      }

     
      console.log("handleSave - Pre-condition id:", id, "typeof id:", typeof id, "token:", token);
      if (id && typeof id === "string" && id.trim()) { 
        console.log("Executing update for id:", id);
        const success = await updateNote(id, title, currentEditorState, token);
        if (!success) {
          throw new Error("Failed to update note. Check console for details.");
        }
        console.log("Note updated successfully with ID:", id);
      } else {
        console.log("Attempting to create a new note. id is invalid:", id);
        const success = await addNote({ title, content: currentEditorState });
        if (success) {
          setTitle("");
          setEditorInstance("");
          navigate("/");
          console.log("New note created successfully");
        } else {
          throw new Error("Failed to create note");
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save note: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4" dir="ltr">
      <Textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="custom-title-textarea font-semibold border-none p-1 focus:ring-0 resize-none min-h-[60px] h-[50px] overflow-hidden"
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 48)}px`;
        }}
        readOnly={permission === "read"}
      />
      
      <div className="lexical-editor-wrapper">
        <LexicalComposer initialConfig={editorConfig}>
          <ToolbarPlugin disabled={permission === "read"} />
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                ref={contentEditableRef} 
                className="flex-1 min-h-[200px] editor-input"
                readOnly={permission === "read"} 
              />
            }
            placeholder={
              <div
                className="absolute top-[10px] left-[20px] mt-13 text-gray-400 pointer-events-none"
                dir="ltr"
                style={{ zIndex: 0 }}
              >
                Start typing your note here...
              </div>
            }
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={onChange} />
          <InitializeEditorPlugin initialContent={editorInstance} />
        </LexicalComposer>
      </div>
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading || permission === "read"}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : id ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default NoteTextarea;