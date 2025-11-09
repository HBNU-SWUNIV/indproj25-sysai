// FMDS_2.0/frontend/src/hooks/useAuth.js
import React, { createContext, useContext, useState } from "react";

/**
 * 단순 세션 기반 Auth (토큰 제거)
 * localStorage("auth")에 { name, role } 저장
 */
const AuthContext = createContext({
  isLoggedIn: false,
  user: null,       // { name, role }
  userRole: null,   // 호환용 (ProtectedRoute에서 사용)
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const stored = localStorage.getItem("auth");
  let initialUser = null;
  try {
    initialUser = stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem("auth");
  }

  const [user, setUser] = useState(initialUser);
  const isLoggedIn = !!user;
  const userRole = user?.role ?? null;

  const login = ({ name, role }) => {
    const info = { name: (name || "User").trim(), role: role || "user" };
    localStorage.setItem("auth", JSON.stringify(info));
    setUser(info);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
