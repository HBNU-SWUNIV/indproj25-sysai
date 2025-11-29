// frontend/src/components/plugin/PluginRenderer.jsx
import React, { useRef } from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import * as Recharts from "recharts";

function PluginRenderer({ code, data, options, width, height }) {
  // 이전 데이터 기억
  const prevDataRef = useRef(null);
  const keyRef = useRef(0);

  // 실제 데이터가 바뀌었는지 비교 (깊은 비교)
  const dataString = JSON.stringify(data);
  if (prevDataRef.current !== dataString) {
    keyRef.current += 1; // 진짜로 바뀌었을 때만 key 증가
    prevDataRef.current = dataString;
  }
  console.log("플러그인렌더러러러러ㅓㄹ");

  return (
    <div style={{ width, height }}>
      <LiveProvider
        key={keyRef.current} // ✅ 실제 변화가 있을 때만 다시 렌더링
        code={code}
        noInline={true}
        scope={{ React, Recharts, data, options, width, height }}
      >
        <LivePreview />
        <LiveError />
      </LiveProvider>
    </div>
  );
}

export default PluginRenderer;
