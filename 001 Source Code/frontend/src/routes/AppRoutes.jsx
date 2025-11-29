// src/routes/AppRoutes.jsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DefaultLayout from "layouts/DefaultLayout";
import { routes } from './routeConfig';

/**
 * AppRoutes
 * - routeConfig를 기반으로 <Routes> 구조를 생성
 * - 공용 레이아웃(DefaultLayout) 아래에 보호된 라우트 적용
 */
const AppRoutes = () => {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>⏳ 페이지 로딩 중...</div>}>
      <Routes>
        {/* Public routes (로그인/Unauthorized) */}
        {routes.filter(r => r?.meta?.public).map(r => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}

        {/* 기본 레이아웃 적용 */}
        <Route element={<DefaultLayout />}>
          {/* 로그인 필요, 역할 제한 없는 라우트 */}
          <Route element={<ProtectedRoute />}>
            {routes
              .filter(r => !r?.meta?.public && !r?.meta?.roles)
              .map(r => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            {/* 기본 진입 → /home */}
            <Route index element={<Navigate to="/home" replace />} />
          </Route>

          {/* 역할 제한 라우트 (예: admin 전용) */}
          {routes
            .filter(r => r?.meta?.roles && !r?.meta?.public)
            .map(r => (
              <Route key={r.path} element={<ProtectedRoute roles={r.meta.roles} />}>
                <Route path={r.path} element={r.element} />
              </Route>
            ))}

          {/* 기타 잘못된 경로 → /home 리다이렉트 */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
