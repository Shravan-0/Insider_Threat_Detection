import React from "react";
import { Box } from "@mui/material";
import { ResponsiveContainer } from "recharts";

function ChartContainer({ height = 260, children }) {
  return (
    <Box sx={{ width: "100%", minWidth: 0, height, minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={height}>
        {children}
      </ResponsiveContainer>
    </Box>
  );
}

export default ChartContainer;
