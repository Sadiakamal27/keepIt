import emailjs from "@emailjs/browser";
import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, ClipboardCopy } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

function ShareNote({ noteId }) {
  const { user, fetchCollaborators } = useAppContext();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [newCollaboratorPermission, setNewCollaboratorPermission] = useState("read");

  useEffect(() => {
    if (noteId) {
      console.log("noteId received:", noteId);
      setIsReady(true);
    }
  }, [noteId]);

  const noteLink = isReady 
    ? `${window.location.origin}/note/${noteId}`
    : `${window.location.origin}/`;

  const handleSendEmail = async () => {
    if (!email || !isReady) return;

    const templateParams = {
      to_email: email,
      from_user: user?.name || "Anonymous",
      note_link: noteLink,
    };

    emailjs
      .send(
        "service_fvx31bp",
        "template_5zt7ynp",
        templateParams,
        "aPzRYp5ZFlVQVUprQ"
      )
      .then(
        () => {
          alert("Invitation sent!");
          setEmail("");
        },
        (error) => {
          console.error("Email error:", error);
          alert("Failed to send invitation.");
        }
      );
  };

  const handleCopyLink = () => {
    if (!isReady) {
      alert("Note is not ready to be shared yet");
      return;
    }
    navigator.clipboard.writeText(noteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleManageAccess = async () => {
    if (!noteId) return;
    
    try {
      const collaborators = await fetchCollaborators(noteId);
      setCollaborators(collaborators);
      setShowAccessManager(!showAccessManager); // Toggle visibility
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
  };
  
  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail || !noteId) return;
  
    try {
      const response = await fetch(`http://localhost:5000/notes/${noteId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": user.id,
        },
        body: JSON.stringify({
          email: newCollaboratorEmail,
          permission: newCollaboratorPermission,
        }),
      });
  
      if (!response.ok) throw new Error("Failed to add collaborator");
  
      const updatedCollaborators = await fetchCollaborators(noteId);
      setCollaborators(updatedCollaborators);
      setNewCollaboratorEmail("");
      alert("Collaborator added successfully");
    } catch (error) {
      console.error("Error adding collaborator:", error);
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
          <div>
            <Label htmlFor="email" className="mb-2 block font-medium">Email Address</Label>
            <Input
              id="email"
              type="email"
              className="border-amber-950 w-full"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSendEmail} 
            disabled={!isReady}
            className="w-full"
          >
            Send Invite
          </Button>

          <Button
            variant="ghost"
            className="w-full flex items-center  gap-2 text-white hover:bg-gray-100"
            onClick={handleCopyLink}
            disabled={!isReady}
          >
            <ClipboardCopy className="  h-4 w-4" />
            {copied ? "Link Copied!" : isReady ? "Copy Note Link" : "Loading note..."}
          </Button>

          <hr className="my-2" />

          <Button
            variant="secondary"
            className="w-full text-white hover:bg-gray-100"
            onClick={handleManageAccess}
          >
            { showAccessManager ? "Hide Access Manager" : "Manage Access"}
          </Button>

          {showAccessManager && (
            <div className="mt-4 space-y-3">
              <h3 className="font-medium">Add Collaborator</h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Collaborator email"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  className="flex-1"
                />
                <select 
                  value={newCollaboratorPermission}
                  onChange={(e) => setNewCollaboratorPermission(e.target.value)}
                  className="w-[120px] p-2 border rounded-md text-sm"
                >
                  <option value="read">Read</option>
                  <option value="write">Write</option>
                  <option value="full">Full</option>
                </select>
                <Button 
                  onClick={handleAddCollaborator}
                  className="whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Current Collaborators:</h4>
                <ul className="space-y-2">
                  {collaborators.length > 0 ? (
                    collaborators.map((collab, index) => (
                      <li key={index} className="flex justify-between items-center text-sm">
                        <span>{collab.email}</span>
                        <span className="text-gray-500 capitalize">
                          {collab.permission}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">No collaborators yet</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ShareNote;