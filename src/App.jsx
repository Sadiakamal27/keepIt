import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import { useAppContext } from "./contexts/AppContext";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import CollaborateNoteView from "./pages/CollaborateNoteView";

export default function App({noteId}) {
  const { user } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={!user ? <Signup /> : <Navigate to="/" replace />}
          />
          <Route
            element={user ? <Layout /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/"
            element={user ? <Home /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/notes/:id"
            element={user ? <Home /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/new"
            element={user ? <Home /> : <Navigate to="/login" replace />}
          />

          
          
          <Route
            path="/note/:noteId"
            element= {<CollaborateNoteView /> 
            }
          />
        </Routes>
      </main>
    </div>
  );
}
