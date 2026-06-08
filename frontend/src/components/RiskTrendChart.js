import React from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import ChartContainer from "../components/ChartContainer";

function RiskTrendChart({ data, height = 260 }) {
  if (!data?.length) {
    return null;
  }

  return (
    <ChartContainer height={height}>
      <LineChart data={data}>
        <XAxis dataKey="name" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" domain={[0, 100]} />
        <Tooltip contentStyle={{ backgroundColor: "#222831", borderColor: "#334155", color: "#EEEEEE" }} />
        <Line type="monotone" dataKey="risk" stroke="#f87171" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="confidence" stroke="#00ADB5" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export default RiskTrendChart;
