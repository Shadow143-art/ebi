import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthHeader } from "../api/client";
import { disconnectSocket } from "../realtime/socket";

const AuthContext = createContext(null);
const STORAGE_KEY = "tracker-auth";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setBooting(false);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed.token && parsed.user) {
        setToken(parsed.token);
        setUser(parsed.user);
        setAuthHeader(parsed.token);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setBooting(false);
    }
  }, []);

  const persist = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthHeader(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
  };

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    persist(data.token, data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persist(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    disconnectSocket();
    setToken("");
    setUser(null);
    setAuthHeader("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = (nextUser) => {
    const merged = { ...user, ...nextUser };
    setUser(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: merged }));
  };

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: Boolean(token)
    }),
    [token, user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
