
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
  try {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      alert( "Login failed due to invalid credentials");
    }

    const data = await response.json();
    if (data.email) {
      setUser({ email: data.email });
      localStorage.setItem("user", JSON.stringify({ email: data.email }));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
};

  const signup = async (email, password) => {
    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.email) {
        alert("Signup successful! Please login.");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Signup failed:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("user"); 
    setUser(null);
  };

 
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Add to your AuthContext state
const [notes, setNotes] = useState([])

// Add a simple function to handle notes
const addNote = (content) => {
  const newNote = {
    id: Date.now(),
    content,
    createdAt: new Date().toISOString(),
    userId: user?.email
  }
  setNotes(prev => [...prev, newNote])
}

  return (
    <AuthContext.Provider value={{ user, login, logout, signup , notes, addNote }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);