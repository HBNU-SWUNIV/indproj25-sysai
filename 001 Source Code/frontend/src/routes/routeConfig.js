// frontend\src\pages\User\User.jsx
import React from "react";

// 페이지 컴포넌트 (코드 스플리팅을 위해 React.lazy 사용)
const Home         = React.lazy(() => import("../pages/Home/Home"));
const Dashboard    = React.lazy(() => import("../pages/Dashboard/Dashboard"));
const Data         = React.lazy(() => import("../pages/Data/Data"));
const Plugin       = React.lazy(() => import("../pages/Plugin/Plugin"));
const Setting      = React.lazy(() => import("../pages/Setting/Setting"));
const Patient      = React.lazy(() => import("../pages/Patient/patient"));
const User         = React.lazy(() => import("../pages/User/User"));
const Login        = React.lazy(() => import("../pages/Login/Login"));
const Unauthorized = React.lazy(() => import("../pages/Unauthorized/Unauthorized"));

/**
 * routes 배열
 * - meta.public = true → 로그인 여부 상관없이 접근 가능
 * - meta.roles  = ['admin'] → 해당 role만 접근 가능
 * - meta가 없는 경우 → 로그인한 사용자라면 접근 가능
 */
export const routes = [
  { path: "/login",        element: <Login />,        meta: { public: true } },
  { path: "/unauthorized", element: <Unauthorized />, meta: { public: true } },

  { path: "/home",      element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/data",      element: <Data /> },
  { path: "/plugin",    element: <Plugin /> },
  { path: "/setting",   element: <Setting /> },

  // 관리자 전용 페이지
  { path: "/user",        element: <User />,    meta: { roles: ["admin"] } },
  { path: "/patient",     element: <Patient />, meta: { roles: ["admin"] } },
];
