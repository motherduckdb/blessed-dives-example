import { useMemo } from "react";
import { useSQLQuery } from "@motherduck/react-sql-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const REQUIRED_DATABASES = [{ type: "share", path: "md:_share/eastlake/06fa503c-07d5-4097-b272-58f0cc0f1fdf", alias: "eastlake" }];

const N = (v: unknown): number => (v != null ? Number(v) : 0);

const BLUE = "#3366cc";
const GRAY = "#6a6a6a";
const LIGHT = "#e5e5e5";
const SANS = "'Inter', system-ui, -apple-system, sans-serif";

function Skeleton({ h = 200 }: { h?: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: LIGHT }} />;
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 600, color: "#1a1a1a" }}>{value}</div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: GRAY, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function EastlakeSales() {
  const kpiQ = useSQLQuery(`
    SELECT
      round(sum(od.unit_price * od.quantity * (1 - od.discount)), 0) as total_revenue,
      count(distinct o.order_id) as total_orders,
      round(sum(od.unit_price * od.quantity * (1 - od.discount)) / count(distinct o.order_id), 2) as avg_order_value,
      count(distinct o.ship_country::VARCHAR) as countries
    FROM "eastlake"."main"."orders" o
    JOIN "eastlake"."main"."order_details" od ON o.order_id = od.order_id::BIGINT
  `);

  const monthlyQ = useSQLQuery(`
    WITH months AS (
      SELECT unnest(generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
      )) as month
    )
    SELECT
      strftime(m.month, '%Y-%m') as month,
      strftime(m.month, '%b %Y') as label,
      coalesce(round(sum(od.unit_price * od.quantity * (1 - od.discount)) / 1e6, 2), 0) as revenue_m
    FROM months m
    LEFT JOIN "eastlake"."main"."orders" o
      ON date_trunc('month', o.order_date) = m.month
    LEFT JOIN "eastlake"."main"."order_details" od
      ON o.order_id = od.order_id::BIGINT
    GROUP BY 1, 2
    ORDER BY 1
  `);

  const categoryQ = useSQLQuery(`
    SELECT
      c.category_name,
      round(sum(od.unit_price * od.quantity * (1 - od.discount)) / 1e6, 1) as revenue_m
    FROM "eastlake"."main"."order_details" od
    JOIN "eastlake"."main"."products" p ON od.product_id::BIGINT = p.product_id
    JOIN "eastlake"."main"."categories" c ON p.category_id = c.category_id
    GROUP BY 1
    ORDER BY 2 DESC
  `);

  const kpi = kpiQ.data?.[0];
  const monthlyData = useMemo(
    () => (monthlyQ.data ?? []).map((r) => ({ month: r.label, revenue: N(r.revenue_m) })),
    [monthlyQ.data],
  );
  const categoryData = useMemo(
    () => (categoryQ.data ?? []).map((r) => ({ name: String(r.category_name), revenue: N(r.revenue_m) })),
    [categoryQ.data],
  );

  const fmt = (n: number) =>
    n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

  return (
    <div style={{ fontFamily: SANS, padding: "32px 40px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Eastlake Sales Overview 11</h1>
      <p style={{ fontSize: 13, color: GRAY, marginTop: 4, marginBottom: 28 }}>
        Northwind-style sample data from the public Eastlake share
      </p>

      {/* KPIs */}
      {kpiQ.isLoading ? (
        <div className="grid grid-cols-4 gap-6 mb-8"><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /></div>
      ) : kpi ? (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <KPI label="Total Revenue" value={fmt(N(kpi.total_revenue))} />
          <KPI label="Total Orders" value={N(kpi.total_orders).toLocaleString()} />
          <KPI label="Avg Order Value" value={fmt(N(kpi.avg_order_value))} />
          <KPI label="Countries" value={String(N(kpi.countries))} />
        </div>
      ) : null}

      {/* Monthly Revenue */}
      <div className="mb-8">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Monthly Revenue (last 12 months)</h2>
        {monthlyQ.isLoading ? <Skeleton h={240} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: GRAY }} tickLine={false} axisLine={{ stroke: LIGHT }} />
              <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: GRAY }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}M`, "Revenue"]} contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Revenue by Category */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Revenue by Category</h2>
        {categoryQ.isLoading ? <Skeleton h={240} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 100 }}>
              <XAxis type="number" tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: GRAY }} tickLine={false} axisLine={{ stroke: LIGHT }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#1a1a1a" }} tickLine={false} axisLine={false} width={96} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`, "Revenue"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill={BLUE} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

