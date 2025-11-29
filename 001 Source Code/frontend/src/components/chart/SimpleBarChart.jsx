import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Rectangle, ResponsiveContainer
} from "recharts";

const SERIES = ["#F7B267", "#B3CDAD", "#A6B6FF", "#FF9AA2"];

export default function DynamicBarChart({ data, width, height }) {
  if (!data || data.length === 0) return <p>데이터가 없습니다.</p>;
  const dataKeys = Object.keys(data[0]).filter((k) => k !== "name");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 24, right: 24, bottom: 28, left: 16 }}  // ⬅ 대칭에 가깝게
        barCategoryGap={18}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend verticalAlign="bottom" align="center" height={24} />
        {dataKeys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            fill={SERIES[idx % SERIES.length]}
            radius={[3, 3, 0, 0]}
            activeBar={<Rectangle opacity={0.7} stroke="#676767" />}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
