import React from "react";
import clsx from "clsx";

/**
 * 전체 페이지 공통 content 래퍼
 * - 상단바 아래에서 시작
 * - 배경은 투명 처리(바디의 --bg가 비치고, 카드가 --surface로 떠보이게)
 */
export default function Content({ children, className }) {
  return <main className={clsx("layout-content", className)}>{children}</main>;
}
