import { useState, useMemo } from "react";
import { useSQLQuery } from "@motherduck/react-sql-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export const REQUIRED_DATABASES = [{ type: "own", path: "stocks_dev" }];

const N = (v: unknown): number => (v != null ? Number(v) : 0);

const PALETTE = ["#0777b3", "#bd4e35", "#2d7a00", "#e18727", "#638CAD", "#adadad", "#8b5cf6", "#ec4899"];

export default function StockPerformance() {
  const [selected, setSelected] = useState<string | null>(null);

  const returnsQ = useSQLQuery(`
    WITH first_last AS (
      SELECT Symbol,
        first("Close" ORDER BY "Date") as first_close,
        last("Close" ORDER BY "Date") as last_close
      FROM "stocks_dev"."main"."stock_history"
      GROUP BY Symbol
    )
    SELECT fl.Symbol as symbol, ci.shortName as name, ci.sector,
      round((fl.last_close - fl.first_close) / fl.first_close * 100, 1) as return_pct
    FROM first_last fl
    JOIN "stocks_dev"."main"."company_info" ci ON fl.Symbol = ci.symbol
    ORDER BY return_pct DESC
  `);

  const priceQ = useSQLQuery(`
    SELECT strftime("Date", '%Y-%m-%d') as date,
      Symbol as symbol,
      round("Close", 2) as close
    FROM "stocks_dev"."main"."stock_history"
    ${selected ? `WHERE Symbol = '${selected}'` : ""}
    ORDER BY "Date"
  `);

  const returnsData = useMemo(
    () => (Array.isArray(returnsQ.data) ? returnsQ.data : []).map((r) => ({
      symbol: String(r.symbol),
      name: String(r.name),
      sector: String(r.sector),
      return_pct: N(r.return_pct),
    })),
    [returnsQ.data],
  );

  const symbols = useMemo(() => returnsData.map((r) => r.symbol), [returnsData]);

  const priceData = useMemo(() => {
    const rows = Array.isArray(priceQ.data) ? priceQ.data : [];
    if (selected) {
      return rows.map((r) => ({ date: String(r.date), close: N(r.close) }));
    }
    const byDate = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const d = String(r.date);
      if (!byDate.has(d)) byDate.set(d, { date: d });
      byDate.get(d)![String(r.symbol)] = N(r.close);
    }
    return Array.from(byDate.values());
  }, [priceQ.data, selected]);

  const bestStock = returnsData[0];
  const worstStock = returnsData[returnsData.length - 1];

  return (
    <div className="p-6" style={{ background: "#f8f8f8", margin: "0 auto" }}>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: "#231f20" }}>
          Stock Performance
        </h1>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-sm underline"
            style={{ color: "#0777b3" }}
          >
            Show all stocks
          </button>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: "#6a6a6a" }}>
        {selected
          ? `${returnsData.find((r) => r.symbol === selected)?.name ?? selected} — daily close`
          : "8 stocks tracked, Sep 2023 – Sep 2024"}
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-8 mb-8">
        <div>
          {returnsQ.isLoading ? (
            <div className="h-12 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-5xl font-bold" style={{ color: "#231f20" }}>
              {returnsData.length}
            </p>
          )}
          <p className="text-sm mt-2" style={{ color: "#6a6a6a" }}>Stocks Tracked</p>
        </div>
        <div>
          {returnsQ.isLoading ? (
            <div className="h-12 w-24 bg-gray-200 animate-pulse rounded" />
          ) : bestStock ? (
            <p className="text-5xl font-bold" style={{ color: "#2d7a00" }}>
              +{bestStock.return_pct}%
            </p>
          ) : null}
          <p className="text-sm mt-2" style={{ color: "#6a6a6a" }}>
            Best — {bestStock?.symbol}
          </p>
        </div>
        <div>
          {returnsQ.isLoading ? (
            <div className="h-12 w-24 bg-gray-200 animate-pulse rounded" />
          ) : worstStock ? (
            <p className="text-5xl font-bold" style={{ color: worstStock.return_pct < 0 ? "#bc1200" : "#2d7a00" }}>
              {worstStock.return_pct > 0 ? "+" : ""}{worstStock.return_pct}%
            </p>
          ) : null}
          <p className="text-sm mt-2" style={{ color: "#6a6a6a" }}>
            Worst — {worstStock?.symbol}
          </p>
        </div>
        <div>
          {returnsQ.isLoading ? (
            <div className="h-12 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-5xl font-bold" style={{ color: "#231f20" }}>
              {returnsData.length > 0
                ? `${(returnsData.reduce((a, r) => a + r.return_pct, 0) / returnsData.length).toFixed(1)}%`
                : "—"}
            </p>
          )}
          <p className="text-sm mt-2" style={{ color: "#6a6a6a" }}>Avg Return</p>
        </div>
      </div>

      {/* Price Chart */}
      <h2 className="text-base font-semibold mb-3" style={{ color: "#231f20" }}>
        {selected ? `${selected} Price History` : "Daily Close Prices"}
      </h2>
      {priceQ.isLoading ? (
        <div className="bg-gray-100 animate-pulse rounded" style={{ height: 260 }} />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={priceData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
              interval="preserveStartEnd"
              stroke="#ccc"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
              width={54}
              stroke="#ccc"
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: number) => [`$${v.toFixed(2)}`, selected ? "Close" : undefined]}
              labelFormatter={(l) => String(l)}
            />
            {selected ? (
              <Line type="linear" dataKey="close" stroke="#0777b3" strokeWidth={2} dot={false} />
            ) : (
              symbols.map((sym, i) => (
                <Line
                  key={sym}
                  type="linear"
                  dataKey={sym}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Returns Bar Chart */}
      <h2 className="text-base font-semibold mt-6 mb-3" style={{ color: "#231f20" }}>
        Total Return by Stock
      </h2>
      {returnsQ.isLoading ? (
        <div className="bg-gray-100 animate-pulse rounded" style={{ height: 200 }} />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={returnsData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <XAxis dataKey="symbol" tick={{ fontSize: 11 }} stroke="#ccc" />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={48} stroke="#ccc" />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Return"]}
            />
            <Bar
              dataKey="return_pct"
              radius={[4, 4, 0, 0]}
              barSize={36}
              onClick={(d) => setSelected(d.symbol)}
              cursor="pointer"
            >
              {returnsData.map((entry) => (
                <rect
                  key={entry.symbol}
                  fill={entry.return_pct >= 0 ? "#0777b3" : "#bc1200"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <p className="text-xs mt-1" style={{ color: "#6a6a6a" }}>Click a bar to view that stock's price history</p>
    </div>
  );
}
