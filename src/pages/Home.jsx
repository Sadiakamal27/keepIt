import { useAuth } from "../contexts/AuthContext"
import { Sidebar } from "../components/Sidebar"
import { NoteInput } from "../components/NoteInput"


function Home() {
  const { user } = useAuth()

  return (
    <div className="flex h-[calc(100vh-64px)] w-full"> 
    <Sidebar />
    
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl">Welcome to KeepIt!</h1>
      {user && (
        <p className="mt-2">Logged in as: <strong>{user.email}</strong></p>
      )}

<NoteInput />
    </div>
  </div>
  )
}

export default Home
