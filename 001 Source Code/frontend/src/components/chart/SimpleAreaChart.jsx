import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// 라인/면 기본 색상 팔레트
const SERIES = ["#8CA6FF", "#4BB1A7", "#F7B267", "#A6B6FF", "#B3CDAD"];

export default function DynamicAreaChart({ data, width, height }) {
  if (!data || data.length === 0) return <p>데이터가 없습니다.</p>;

  const keys = Object.keys(data[0]).filter((k) => k !== "name");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 24, right: 24, bottom: 24, left: 16 }}  // ⬅ 대칭 마진
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend verticalAlign="bottom" align="center" height={24} />
        {keys.map((key, idx) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={SERIES[idx % SERIES.length]}
            fill={SERIES[idx % SERIES.length]}
            fillOpacity={0.25}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
