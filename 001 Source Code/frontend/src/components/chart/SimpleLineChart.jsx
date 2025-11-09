import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const SERIES = ["#A6B6FF", "#4BB1A7", "#F7B267", "#FF9AA2"];

export default function DynamicLineChart({ data, width, height }) {
  if (!data || data.length === 0) return <p>데이터가 없습니다.</p>;
  const keys = Object.keys(data[0]).filter((k) => k !== "name");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 24, right: 24, bottom: 28, left: 16 }}  // ⬅ 대칭 마진 + 레전드 공간
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend verticalAlign="bottom" align="center" height={24} />
        {keys.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={SERIES[idx % SERIES.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
