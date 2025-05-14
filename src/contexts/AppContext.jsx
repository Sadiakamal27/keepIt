import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPermission, setUserPermission] = useState("read");

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
      await fetchNotes(data.id);
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
    setUserPermission("read");
  };

  const fetchNotes = async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/notes", {
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
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

  const fetchNoteByToken = async (noteId, token) => {
  if (!noteId || !token) return null;
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch(`http://localhost:5000/notes/${noteId}/collaborate`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch note with token");
    }
    const data = await response.json();
    setUserPermission(data.permission || "read");
    return data;
  } catch (error) {
    console.error("Fetch note by token error:", error);
    setError(error.message);
    return null;
  } finally {
    setIsLoading(false);
  }
};

  const fetchUserPermission = async (noteId, token = null) => {
    if (!noteId) {
      setUserPermission("read");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (token) {
        response = await fetch(`http://localhost:5000/notes/${noteId}/permission`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        response = await fetch(`http://localhost:5000/notes/${noteId}/permission`, {
          headers: {
            "Content-Type": "application/json",
            "user-id": user?.id || "",
          },
        });
      }
      if (!response.ok) throw new Error("Failed to fetch permission");
      const { permission } = await response.json();
      setUserPermission(permission || "read");
    } catch (error) {
      console.error("Error fetching permission:", error);
      setUserPermission("read");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollaborators = async (noteId) => {
    if (!noteId || !user?.id) return [];
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/notes/${noteId}/collaborators`, {
        headers: {
          "Content-Type": "application/json",
          "user-id": user.id,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch collaborators");

      const data = await response.json();
      return data;
    } catch (error) {
      setError(error.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const addNote = async (noteData) => {
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
          "Content-Type": "application/json",
          "user-id": user.id,
        },
        body: JSON.stringify({
          title: noteData.title,
          content: noteData.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create note");
      }

      const createdNote = await response.json();
      setNotes((prev) => [...prev, createdNote]);
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateNote = async (id, title, content, token = null) => {
  setIsLoading(true);
  setError(null);

  try {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log("Updating note with token for ID:", id, "Headers:", headers);
    } else if (user?.id) {
      headers["user-id"] = user.id;
      console.log("Updating note with user ID:", user.id, "for ID:", id, "Headers:", headers);
    } else {
      throw new Error("No user or token provided");
    }

    const response = await fetch(`http://localhost:5000/notes/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Update note response error for ID:", id, "Error:", errorData);
      throw new Error(errorData.error || "Update failed");
    }

    if (user?.id) {
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, title, content } : note))
      );
    }
    console.log("Update note successful for ID:", id);
    return true;
  } catch (error) {
    console.error("Update note error for ID:", id, "Error:", error);
    setError(error.message);
    if (user?.id) {
      await fetchNotes(user.id);
    }
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
      setNotes((prev) => prev.filter((note) => note.id !== id));

      const response = await fetch(`http://localhost:5000/notes/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "user-id": user.id,
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

  useEffect(() => {
    if (user?.id) {
      fetchNotes(user.id);
    } else {
      setNotes([]);
    }
  }, [user?.id]);

  return (
    <AppContext.Provider
      value={{
        user,
        notes,
        isLoading,
        error,
        login,
        logout,
        signup,
        addNote,
        updateNote,
        deleteNote,
        fetchNoteByToken,
        fetchCollaborators,
        fetchUserPermission,
        userPermission,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};