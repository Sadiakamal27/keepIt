import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

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

  useEffect(() => {
    const newSocket = io("http://localhost:5000", { autoConnect: false });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && user?.id) {
      socket.connect();
      socket.on("connect", () => {
        console.log("Connected to WebSocket server");
      });

      socket.on("noteUpdate", ({ id, title, content, updated_at }) => {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === id ? { ...note, title, content, updated_at } : note
          )
        );
      });

      socket.on("joinSuccess", ({ noteId }) => {
        console.log(`Successfully joined note: ${noteId}`);
      });

      socket.on("joinError", ({ message }) => {
        setError(message);
      });

      socket.on("updateError", ({ message }) => {
        setError(message);
      });

      return () => {
        socket.off("connect");
        socket.off("noteUpdate");
        socket.off("joinSuccess");
        socket.off("joinError");
        socket.off("updateError");
      };
    } else if (socket) {
      socket.disconnect();
    }
  }, [socket, user?.id]);

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
    if (socket) {
      socket.disconnect();
    }
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

  const fetchNoteByToken = async (noteId, collaborationToken) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/notes/collaborate/${noteId}`, {
        headers: {
          "Content-Type": "application/json",
          "collaboration-token": collaborationToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch note");
      }

      const note = await response.json();
      setNotes([note]);
      if (socket) {
        socket.connect();
        socket.emit("joinNote", { noteId, collaborationToken });
      }
      return note;
    } catch (error) {
      setError(error.message);
      return null;
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

  const updateNote = async (id, title, content, collaborationToken = null) => {
    if (!user?.id && !collaborationToken) return false;
    setIsLoading(true);
    setError(null);

    try {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, title, content } : note
        )
      );

      if (socket) {
        socket.emit("noteUpdate", {
          noteId: id,
          title,
          content,
          userId: user?.id,
          collaborationToken,
        });
      }

      const headers = {
        "Content-Type": "application/json",
      };
      if (user?.id) {
        headers["user-id"] = user.id;
      }
      if (collaborationToken) {
        headers["collaboration-token"] = collaborationToken;
      }

      const response = await fetch(`http://localhost:5000/notes/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) throw new Error("Update failed");
      return true;
    } catch (error) {
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

  const generateCollaborationToken = async (noteId) => {
    if (!user?.id) {
      setError("You must be logged in to share notes");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/notes/${noteId}/collaborate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": user.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate collaboration token");
      }

      const { token } = await response.json();
      if (socket) {
        socket.emit("joinNote", { noteId, userId: user.id });
      }
      return token;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollaborators = async (noteId) => {
    if (!user?.id) return [];
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

  const joinNoteRoom = (noteId, collaborationToken = null) => {
    if (socket) {
      socket.emit("joinNote", {
        noteId,
        userId: user?.id,
        collaborationToken,
      });
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
        generateCollaborationToken,
        fetchCollaborators,
        fetchNoteByToken,
        joinNoteRoom,
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