// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; 
// (AuthContext, Zustand, Recoil 등으로 구현한 사용자 인증 훅)

/**
 * ProtectedRoute
 * - 특정 라우트를 보호하기 위한 HOC (High Order Component)
 * - 로그인 여부와 권한(role)을 검사하여 접근 가능 여부를 결정
 *
 * props:
 *   roles: 접근 가능한 역할 배열 (예: ['admin', 'manager'])
 */
const ProtectedRoute = ({ roles = [] }) => {
  const { isLoggedIn, userRole } = useAuth();

  // 1) 로그인 안 한 경우 → 로그인 페이지로 리다이렉트
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // 2) roles 조건이 있을 때, 현재 사용자 role이 없으면 → Unauthorized 페이지
  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3) 조건 통과 → 중첩 라우트(<Outlet />) 실행
  return <Outlet />;
};

export default ProtectedRoute;
