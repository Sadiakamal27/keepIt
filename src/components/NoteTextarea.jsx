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
import ShareNote from "./ShareNote";


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

function NoteTextarea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, isLoading, updateNote, addNote } = useAppContext();
  const [title, setTitle] = useState("");
  const [editorInstance, setEditorInstance] = useState(null);
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
    if (id && !currentNote && !isLoading) {
      setIsFetching(true);
      const fetchNote = async () => {
        try {
          const response = await fetch(`http://localhost:5000/notes/${id}`, {
            headers: {
              "Content-Type": "application/json",
              "user-id": localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")).id
                : "",
            },
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
      setTitle("");
      setEditorInstance(""); 
    }
  }, [currentNote, id, isLoading, navigate]);

  const onChange = (editorState, editor) => {
    editorState.read(() => {
      const jsonState = JSON.stringify(editorState.toJSON());
      debouncedSetEditorInstance(jsonState); 
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Title cannot be empty!");
      return;
    }

    setIsSaving(true);
    try {
      let currentEditorState = editorInstance;

      if (!currentEditorState) {
        alert("Content cannot be empty!");
        return;
      }

      if (currentNote) {
        const success = await updateNote(currentNote.id, title, currentEditorState);
        if (!success) throw new Error("Failed to update note");
      } else {
        const success = await addNote({ title, content: currentEditorState });
        if (success) {
          setTitle("");
          setEditorInstance("");
          navigate("/");
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
      />
      
      <div className="lexical-editor-wrapper">
        <LexicalComposer initialConfig={editorConfig}>
          <ToolbarPlugin />
          <RichTextPlugin
            contentEditable={<ContentEditable ref={contentEditableRef} className="flex-1 min-h-[200px] editor-input" />}
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
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : currentNote ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default NoteTextarea;