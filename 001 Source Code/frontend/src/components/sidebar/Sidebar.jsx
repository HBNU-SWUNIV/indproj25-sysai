import React from "react";
import { NavLink } from "react-router-dom";
import "./sidebar.css";

// Material UI Icons
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import DashboardIcon from "@mui/icons-material/BarChart";
import GroupIcon from "@mui/icons-material/Group";
import DataIcon from "@mui/icons-material/Dataset";
import AddBoxIcon from "@mui/icons-material/AddBox";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

import { useAuth } from "hooks/useAuth";

/**
 * Sidebar
 * - 좌측 사이드바 메뉴
 * - 현재 로그인된 사용자의 role에 따라 메뉴 노출 여부 결정
 */
export default function Sidebar() {
  const { userRole } = useAuth(); // 예: 'admin' 또는 'user'

  // 메뉴 정의
  const menu = [
    { to: "/home",      label: "Home",      icon: <HomeWorkIcon className="sidebarIcon" /> },
    { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="sidebarIcon" /> },
    { to: "/data",      label: "Data",      icon: <DataIcon className="sidebarIcon" /> },
    { to: "/plugin",    label: "Plugin",    icon: <AddBoxIcon className="sidebarIcon" /> },

    // 관리자 전용 메뉴 (User를 Patient 위로 배치)
    { to: "/user",    label: "User",    icon: <PersonOutlineIcon className="sidebarIcon" />, roles: ["admin"] },
    { to: "/patient", label: "Patient", icon: <GroupIcon className="sidebarIcon" />,        roles: ["admin"] },

    { to: "/setting",   label: "Setting",   icon: <SettingsIcon className="sidebarIcon" /> },
  ];

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebarWrapper">
        <div className="sidebarMenu">
          <h3 className="sidebarTitle">Dashboard</h3>
          <ul className="sidebarList">
            {menu
              // roles가 없거나, 현재 userRole이 포함된 경우만 노출
              .filter((item) => !item.roles || item.roles.includes(userRole))
              .map(({ to, label, icon }) => (
                <li key={to} className="sidebarListItem">
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) =>
                      `sidebarLink ${isActive ? "active" : ""}`
                    }
                    aria-label={label}
                  >
                    {icon}
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
