import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("bv_session_token");
    const storedUser = localStorage.getItem("bv_user");

    if (token && storedUser) {
      setSession({ access_token: token });
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    } else {
      setSession(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  const signOut = () => {
    localStorage.removeItem("bv_session_token");
    localStorage.removeItem("bv_user");
    setUser(null);
    setSession(null);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
