// src/components/topbar/Topbar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./topbar.css";

// MUI Icons
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import ThemeToggle from "components/ThemeToggle";

// ⬇️ 로고 이미지
import LogoFmds from "assets/logo.svg";

// 별도 메뉴 컴포넌트
import NotificationMenu from "./NotificationMenu";
import UserMenu from "./UserMenu";

/**
 * Topbar
 * - 로고, 알림, 다크모드, 사용자 메뉴를 포함하는 상단 네비게이션 바
 */
export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 상태 관리: 알림/사용자 메뉴 열림 여부
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // 임시 알림 데이터 (추후 WebSocket 연동 예정)
  const [notifs, setNotifs] = useState([
    { id: 1, text: "101호 환자 낙상 감지 🚨", ts: "2분 전", unread: true },
    { id: 2, text: "202호 환자 심박수 이상 ⚠️", ts: "10분 전", unread: true },
    { id: 3, text: "시스템 점검 예정 23:00 ~ 24:00", ts: "어제", unread: false },
  ]);

  // 읽지 않은 알림 개수
  const unreadCount = useMemo(
    () => notifs.filter((n) => n.unread).length,
    [notifs]
  );

  // 외부 클릭/ESC 키 입력 시 패널 닫기
  const rightRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (!rightRef.current) return;
      if (!rightRef.current.contains(e.target)) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 모든 알림 읽음 처리
  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));

  // 사용자 이름 → 이니셜 생성
  const initials = useMemo(() => {
    const name = (user?.name || "User").trim();
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] || "U";
    const last = parts[1]?.[0] || "";
    return (first + last).toUpperCase();
  }, [user]);

  // 로그아웃 처리
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true, state: { from: location } });
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbarWrapper">
        {/* 좌측 로고 */}
        <div className="topLeft">
          <Link to="/home" className="brandLogo" aria-label="Go to Home">
            <img src={LogoFmds} alt="FMDS" className="logoImg" />
          </Link>
        </div>

        {/* 우측 영역 */}
        <div className="topRight" ref={rightRef}>
          {/* 알림 아이콘 */}
          <button
            className="topbarIconContainer"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-controls="notif-panel"
            onClick={(e) => {
              e.stopPropagation();
              setNotifOpen((v) => !v);
              setUserOpen(false);
            }}
          >
            <NotificationsNoneIcon />
            {unreadCount > 0 && <span className="topIconBadge">{unreadCount}</span>}
          </button>

          {/* 알림 패널 */}
          {notifOpen && (
            <NotificationMenu
              notifications={notifs}
              onMarkAllRead={markAllRead}
            />
          )}

          {/* 설정 아이콘 */}
          <Link
            to="/setting"
            className="topbarIconContainer"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon />
          </Link>

          {/* 다크모드 토글 */}
          <ThemeToggle />

          {/* 사용자 아바타 버튼 */}
          <button
            className="topbarIconContainer avatarBtn"
            aria-label="User menu"
            aria-expanded={userOpen}
            aria-controls="user-menu"
            onClick={(e) => {
              e.stopPropagation();
              setUserOpen((v) => !v);
              setNotifOpen(false);
            }}
            title={user?.name || "User"}
          >
            {initials}
          </button>

          {/* 사용자 드롭다운 */}
          {userOpen && (
            <UserMenu onLogout={handleLogout} />
          )}
        </div>
      </div>
    </header>
  );
}
