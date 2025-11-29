import React from "react";
import { Outlet } from "react-router-dom";

// 절대 경로 import (jsconfig.json 기준)
import Topbar from "components/topbar/Topbar";
import Sidebar from "components/sidebar/Sidebar";
import Content from "components/layout/Content";

import "./defaultLayout.css";

/**
 * 레이아웃 구성:
 * Topbar(상단) + Sidebar(좌측) + Content(우측 메인)
 */
export default function DefaultLayout() {
  return (
    <div className="default-layout">
      <Topbar />
      <div className="layout-body">
        <Sidebar />
        <Content className="layout-content">
          <Outlet />
        </Content>
      </div>
    </div>
  );
}
