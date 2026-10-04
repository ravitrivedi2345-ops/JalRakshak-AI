import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type IndexDatum = { month: string; ndvi: number; ndwi: number };

export default function DemoIndexChart({ data }: { data: IndexDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#e9eee7" strokeDasharray="3 4" />
        <XAxis dataKey="month" tick={{ fill: "#718074", fontSize: 13 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 0.8]} tick={{ fill: "#718074", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value, name) => [typeof value === "number" ? value.toFixed(2) : String(value), name]} />
        <Area type="monotone" dataKey="ndvi" name="DEMO NDVI" stroke="#3d9161" fill="#3d9161" fillOpacity={0.15} strokeWidth={2.5} />
        <Area type="monotone" dataKey="ndwi" name="DEMO NDWI" stroke="#438eaa" fill="#438eaa" fillOpacity={0.1} strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
