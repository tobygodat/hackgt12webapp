import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ChartLineBand({ data, color = "#6CA0FF" }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="monthIndex" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="p90" stroke="none" fillOpacity={0} />
          <Area type="monotone" dataKey="p10" stroke="none" fillOpacity={0} />
          <Area type="monotone" dataKey="p50" stroke={color} fill="url(#band)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}