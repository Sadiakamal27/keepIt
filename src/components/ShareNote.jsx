import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, ClipboardCopy } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

function ShareNote({ noteId }) {
  const { user } = useAppContext();
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [permission, setPermission] = useState("read"); 

  useEffect(() => {
    if (noteId) {
      console.log("noteId received:", noteId);
      setIsReady(true);
    }
  }, [noteId]);

  const noteLink = isReady
    ? `${window.location.origin}/note/${noteId}`
    : `${window.location.origin}/`;

  const handleCopyLink = async () => {
    if (!isReady) {
      alert("Note is not ready to be shared yet");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/notes/${noteId}/share-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": user.id,
        },
        body: JSON.stringify({ permission }), 
      });
      if (!response.ok) throw new Error("Failed to generate share token");
      const { token } = await response.json();
      const shareLink = `${noteLink}?token=${token}`;
      navigator.clipboard.writeText(shareLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch (error) {
      console.error("Error generating share token:", error);
      alert("Failed to generate share link");
    }
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="text-white bg-amber-600 hover:bg-amber-700"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-80 p-6 space-y-3 bg-white z-50 rounded-md shadow-lg border border-gray-200"
          side="bottom"
          align="end"
        >
          <div className="flex gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="read">Read Only</option>
              <option value="full">Full Access</option>
            </select>
          </div>

          <Button
            variant="ghost"
            className="w-full flex items-center gap-2 text-white hover:bg-gray-100"
            onClick={handleCopyLink}
            disabled={!isReady}
          >
            <ClipboardCopy className="h-4 w-4" />
            {copied ? "Link Copied!" : isReady ? "Copy Note Link" : "Loading note..."}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ShareNote;