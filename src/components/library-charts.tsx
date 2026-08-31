"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatusDatum = {
  name: string;
  value: number;
  color: string;
};

const tooltipStyle = {
  background: "rgba(17, 19, 18, .96)",
  border: "1px solid #39403b",
  borderRadius: 6,
  boxShadow: "0 14px 35px rgba(0, 0, 0, .45)",
  color: "#f2f0e9",
  fontSize: 12,
};

export function LibraryStatusChart({ data }: { data: StatusDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = total ? data : [{ name: "Sin libros", value: 1, color: "#292d2b" }];
  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <div className="mono-donut" role="img" aria-label={data.map((item) => `${item.name}: ${item.value}`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: "#f2f0e9" }}
            formatter={(value) => [`${value} libros`, "Total"]}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="82%"
            paddingAngle={total ? 5 : 0}
            cornerRadius={8}
            stroke="#101212"
            strokeWidth={3}
            animationDuration={850}
            onMouseEnter={(_, index) => total && setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((item, index) => (
              <Cell
                key={item.name}
                fill={item.color}
                className={activeIndex === index ? "active" : ""}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="mono-donut-center">
        <strong>{active?.value ?? total}</strong>
        <small>{active?.name ?? "libros"}</small>
      </div>
    </div>
  );
}

export function RatingChart({ data }: { data: Array<{ rating: number; count: number }> }) {
  return (
    <div className="mono-bar-chart" role="img" aria-label={data.map((item) => `${item.rating} estrellas: ${item.count}`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, left: -14, bottom: 2 }}>
          <CartesianGrid horizontal={false} stroke="rgba(255, 255, 255, .055)" strokeDasharray="2 3" />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="rating"
            tickLine={false}
            axisLine={false}
            width={45}
            tick={{ fill: "#e9bb58", fontSize: 11, fontWeight: 700 }}
            tickFormatter={(value) => `${value} ★`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, .03)" }}
            contentStyle={tooltipStyle}
            labelFormatter={(value) => `${value} estrellas`}
            formatter={(value) => [`${value} libros`, "Valorados"]}
          />
          <Bar dataKey="count" fill="#e9bb58" radius={[0, 8, 8, 0]} barSize={12} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReadingYearsChart({ data }: { data: Array<{ year: number; count: number }> }) {
  return (
    <div className="mono-year-chart" role="img" aria-label={data.map((item) => `${item.year}: ${item.count} libros`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 8, left: -25, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, .055)" strokeDasharray="2 3" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#999b96", fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#696b67", fontSize: 10 }} />
          <Tooltip
            cursor={{ fill: "rgba(184, 243, 74, .035)" }}
            contentStyle={tooltipStyle}
            labelFormatter={(value) => `Año ${value}`}
            formatter={(value) => [`${value} libros`, "Terminados"]}
          />
          <Bar dataKey="count" fill="#b8f34a" radius={[8, 8, 2, 2]} maxBarSize={42} animationDuration={1000} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}