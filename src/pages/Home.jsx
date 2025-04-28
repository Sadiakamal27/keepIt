import { useAppContext } from "../contexts/AppContext"
import { Sidebar } from "../components/Sidebar"
import NoteTextarea from "../components/NoteTextarea"

function Home() {
  const { user } = useAppContext()

  return (
    <div className="flex h-[calc(100vh-64px)] w-full"> 
    <Sidebar />
    
    <div className="flex-1 p-6 overflow-y-auto">
      {user && (
        <p className="mt-2">Logged in as: <strong>{user.email}</strong></p>
      )}
<NoteTextarea />

    </div>
  </div>
  )
}

export default Home
