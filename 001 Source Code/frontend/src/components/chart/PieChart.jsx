import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 다크/라이트 모두 잘 보이는 톤
const COLORS = ["#A4B465", "#C2D381", "#F0BB78", "#FFE99A", "#EAE0C6", "#7F915C"];
// const COLORS = ["#F7B267", "#B3CDAD", "#A6B6FF", "#FF9AA2"];
export default function DynamicPieChart({ data, width, height }) {
  if (!data || data.length === 0) return <p>데이터가 없습니다.</p>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="75%" // 컨테이너 기준, 항상 중앙 안정
          // paddingAngle={1.5}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip/>
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
