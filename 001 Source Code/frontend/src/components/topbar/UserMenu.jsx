// src/components/topbar/UserMenu.jsx
import React from "react";
import { useAuth } from "hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "./userMenu.css";

/**
 * UserMenu
 * - 사용자 메뉴 (설정/로그아웃/관리자 전용)
 * - props:
 *   onLogout: 로그아웃 핸들러
 */
export default function UserMenu({ onLogout }) {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div id="user-menu" className="popup userMenu">
      <div className="menuList">
        <li onClick={() => navigate("/setting")} className="menuItem">
          설정
        </li>
        {/* 관리자 전용 메뉴 노출 */}
        {userRole === "admin" && (
          <li className="menuItem adminOnly">관리자 전용 메뉴</li>
        )}
        <div className="menuDivider" />
        <button className="menuItem danger" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
