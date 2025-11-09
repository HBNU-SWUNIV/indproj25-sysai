// FMDS_2.0/frontend/src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css';

/** 라우트 변경 시 스크롤 상단으로 이동 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // 레이아웃 콘텐츠 영역 스크롤 우선
    const content = document.querySelector('.layout-content');
    if (content) content.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // 혹시 모를 바디 스크롤도 함께 초기화
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppRoutes />
    </Router>
  );
}

export default App;
