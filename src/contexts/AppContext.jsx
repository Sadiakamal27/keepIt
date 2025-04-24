import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Combined state
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Auth functions
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();
      const userData = { email: data.email, id: data.id };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      await fetchNotes(data.id); // Fetch notes after login
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Signup failed");
      }

      const data = await response.json();
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setNotes([]);
  };

  // Notes functions
  const fetchNotes = async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/notes?user=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch notes");
      
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addNote = async (noteData) => {
    // Check if user is logged in
    if (!user?.id) {
      setError("You must be logged in to add notes");
      return false;
    }
  
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("http://localhost:5000/notes", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          title: noteData.title || 
                noteData.content.split('\n')[0]?.substring(0, 50) || 
                "Untitled",
          content: noteData.content
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create note");
      }
      
      // Get the new note from server and add to state
      const createdNote = await response.json();
      setNotes(prev => [...prev, createdNote]);
      
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateNote = async (id, content) => {
    if (!user?.id) return false;
    setIsLoading(true);
    setError(null);
    
    try {

      setNotes(prev => prev.map(note => 
        note.id === id ? {...note, content} : note
      ));

      const response = await fetch(`http://localhost:5000/notes/${id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) throw new Error("Update failed");
      return true;
    } catch (error) {

      setError(error.message);
      await fetchNotes(user.id); // Refetch to ensure consistency
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id) => {
    if (!user?.id) return false;
    setIsLoading(true);
    setError(null);
    
    try {
      
      setNotes(prev => prev.filter(note => note.id !== id));

      const response = await fetch(`http://localhost:5000/notes/${id}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
      });
      
      if (!response.ok) throw new Error("Delete failed");
      return true;
    } catch (error) {
      setError(error.message);
      await fetchNotes(user.id); 
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch notes when user changes
  useEffect(() => {
    if (user?.id) {
      fetchNotes(user.id);
    } else {
      setNotes([]);
    }
  }, [user?.id]);

  return (
    <AppContext.Provider value={{
      user,
      notes,
      isLoading,
      error,
      login,
      logout,
      signup,
      addNote,
      updateNote,
      deleteNote
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};