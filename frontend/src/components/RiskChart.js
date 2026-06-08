import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import ChartContainer from "./ChartContainer";

const COLORS = ["#f87171", "#facc15", "#4ade80"];

function RiskChart({ data = [] }) {
  if (!data.length) {
    return null;
  }

  return (
    <ChartContainer height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ChartContainer>
  );
}

export default RiskChart;
