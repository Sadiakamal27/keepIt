import { useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";
import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const handleFormat = useCallback(
    (format) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  return (
    <div className="flex gap-2 p-2 bg-gray-100 rounded-t-md">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFormat("bold")}
        className="p-1"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFormat("italic")}
        className="p-1"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFormat("underline")}
        className="p-1"
      >
        <Underline className="h-4 w-4" />
      </Button>

    </div>
  );
}

export default ToolbarPlugin;
