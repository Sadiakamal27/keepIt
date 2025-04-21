
import { useState } from 'react';
import { Textarea } from "./ui/textarea"
import { Button } from "./ui/button"
import { useAuth } from "../contexts/AuthContext"

export function NoteInput() {
  const { user, addNote } = useAuth()
  const [content, setContent] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (content.trim() && user) {
      addNote(content)
      setContent("")
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <form onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here..."
          className="min-h-[150px]"
          required
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  )
}