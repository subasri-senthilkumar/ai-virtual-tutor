import { createContext, useContext, useState, useEffect } from "react";
import { getToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ user_id: payload.user_id, username: payload.username });
      } catch {
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUser({ user_id: payload.user_id, username: payload.username });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
