// src/pages/Setting/Setting.jsx
import React, { useState } from "react";
import "./setting.css";

export default function Setting() {
  const [emailNotify, setEmailNotify] = useState(true);

  return (
    <div className="setting">
      <h2>환경 설정</h2>
      <p>여기에서 시스템 환경, 사용자 계정, 알림, 데이터 설정 등을 변경할 수 있습니다.</p>

      <section className="setting-section">
        <h3>계정 설정</h3>
        <button type="button" onClick={() => alert("비밀번호 변경 기능 준비중")}>
          비밀번호 변경
        </button>
      </section>

      <section className="setting-section">
        <h3>알림 설정</h3>
        <label>
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
          />
          이메일 알림 받기
        </label>
      </section>

      <section className="setting-section">
        <h3>시스템 설정</h3>
        <button type="button" onClick={() => alert("데이터 초기화 기능 준비중")}>
          데이터 초기화
        </button>
      </section>
    </div>
  );
}
