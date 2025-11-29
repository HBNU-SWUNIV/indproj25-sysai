// src/pages/Login/Login.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import "./login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setError("");

    // NOTE: 현재는 임시 세션 기반. 추후 API 로그인으로 교체 예정.
    login({ name, role });
    navigate("/home", { replace: true });
  };

  return (
    <div className="login-container">
      <div className="login-card" role="dialog" aria-labelledby="login-title">
        <h2 id="login-title">로그인이 필요합니다</h2>

        {/* 단일 로그인 폼 (테스트 버튼 제거) */}
        <form onSubmit={onSubmit} className="login-form">
          <label htmlFor="name" className="login-label">
            이름
          </label>
          <input
            id="name"
            type="text"
            className="login-input"
            placeholder="예) 홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            aria-required="true"
          />

          <label htmlFor="role" className="login-label">
            역할
          </label>
          <select
            id="role"
            className="login-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="역할 선택"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn btn-primary login-submit">
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
