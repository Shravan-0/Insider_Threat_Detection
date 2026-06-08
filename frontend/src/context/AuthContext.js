import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";
import { disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("inThreatUser");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("inThreatToken"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("inThreatToken")));

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        if (!active) return;
        setUser(response.user);
        localStorage.setItem("inThreatUser", JSON.stringify(response.user));
      } catch (error) {
        localStorage.removeItem("inThreatToken");
        localStorage.removeItem("inThreatUser");
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (payload) => {
    const response = await authApi.login(payload);
    localStorage.setItem("inThreatToken", response.token);
    localStorage.setItem("inThreatUser", JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem("inThreatToken");
    localStorage.removeItem("inThreatUser");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
