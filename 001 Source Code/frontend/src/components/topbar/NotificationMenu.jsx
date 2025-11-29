// src/components/topbar/NotificationMenu.jsx
import React from "react";
import "./notificationMenu.css";

/**
 * NotificationMenu
 * - 알림 패널 UI 컴포넌트
 * - props:
 *   notifications: 알림 배열 [{ id, text, ts, unread }]
 *   onMarkAllRead: 모두 읽음 처리 핸들러
 */
export default function NotificationMenu({ notifications = [], onMarkAllRead }) {
  return (
    <div id="notif-panel" className="popup" style={{ right: 88 }}>
      <div className="notifHeader">
        <span>알림</span>
        <button className="menuItem" onClick={onMarkAllRead}>
          모두 읽음 처리
        </button>
      </div>
      <div className="notifList" role="list">
        {notifications.length === 0 && (
          <div className="notifEmpty">알림이 없습니다.</div>
        )}
        {notifications.map((n) => (
          <div key={n.id} className="notifItem" role="listitem">
            <div>
              <div>{n.text}</div>
              <div className="notifMeta">{n.ts}</div>
            </div>
            {n.unread && <span className="notifUnreadDot" />}
          </div>
        ))}
      </div>
    </div>
  );
}
