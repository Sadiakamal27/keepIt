import { useAuth } from "../contexts/AuthContext"

function Home() {
  const { user } = useAuth()

  return (
    <div className="p-6">
      <h1 className="text-2xl">Welcome to KeepIt!</h1>
      {user ? (
        <p className="mt-2">Logged in as: <strong>{user.email}</strong></p>
      ) : (
        <p className="mt-2">Please login to create or view notes.</p>
      )}
    </div>
  )
}

export default Home
