// frontend/src/components/ThemeToggle.jsx
import React from "react";
import { useTheme } from "hooks/useTheme";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

/**
 * ThemeToggle
 * - Topbar의 다른 아이콘들과 톤을 맞추기 위해
 *   .topbarIconContainer + .themeToggle 클래스를 사용
 * - 아이콘 색은 CSS에서 var(--text)를 상속받아 다크 모드에서 흰색으로 보임
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="topbarIconContainer themeToggle"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={theme === "light" ? "다크 모드" : "라이트 모드"}
      type="button"
    >
      {/* 다크/라이트 전환 아이콘 */}
      {theme === "light" ? (
        <DarkModeIcon fontSize="small" />
      ) : (
        <LightModeIcon fontSize="small" />
      )}
    </button>
  );
}
