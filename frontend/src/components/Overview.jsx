import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from "../lib/api";

function StatCard({ eyebrow, value, sub, accent }) {
  return (
    <div className="card p-6">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className={`font-display text-4xl font-semibold mt-3 ${accent || "text-cream-50"}`}>{value}</p>
      {sub && <p className="text-sm text-cream-300/70 mt-2">{sub}</p>}
    </div>
  );
}

export default function Overview({ metrics }) {
  if (!metrics) return null;

  const sweep = metrics.cost_sweep;
  const chartData = sweep
    .filter((_, i) => i % 3 === 0)
    .map((r) => ({ threshold: r.threshold, cost: r.total_cost_inr }));
  const bestT = metrics.best_threshold_by_cost.threshold;

  const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-600/60 p-10 noise-grain">
        <div className="relative z-10 max-w-2xl">
          <p className="label-eyebrow mb-3">Track 02 · AI Risk Manager</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.08] text-cream-50">
            Every rupee a merchant loses to fraud started as a{" "}
            <span className="text-ember-400">pattern someone missed.</span>
          </h1>
          <p className="text-cream-200/80 mt-5 text-[15px] leading-relaxed max-w-xl">
            RiskGuard scores every transaction in real time, explains why it's risky in
            plain terms, catches device-sharing rings before they scale, and drafts the
            chargeback evidence response — all measured honestly against a held-out
            test set, false-positive cost included.
          </p>
        </div>
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-ember-500/10 blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          eyebrow="PR-AUC (held-out)"
          value={metrics.pr_auc.toFixed(3)}
          sub={`vs. ${(metrics.test_positive_rate).toFixed(3)} base rate — ${(metrics.pr_auc / metrics.test_positive_rate).toFixed(1)}x lift`}
        />
        <StatCard
          eyebrow="ROC-AUC (held-out)"
          value={metrics.roc_auc.toFixed(3)}
          sub={`${metrics.n_test.toLocaleString()} test transactions, never seen in training`}
        />
        <StatCard
          eyebrow="Recall at best threshold"
          value={`${(metrics.best_threshold_by_cost.recall * 100).toFixed(0)}%`}
          sub={`of realized chargebacks caught, at ${(metrics.best_threshold_by_cost.precision * 100).toFixed(1)}% precision`}
        />
        <StatCard
          eyebrow="Modeled savings vs. never flagging"
          value={inr(metrics.model_savings_vs_never_flag_inr)}
          sub="on the held-out test window alone"
          accent="text-ember-400"
        />
      </div>

      {/* Cost curve — the signature element: this is the actual decision the merchant is making */}
      <div className="card p-7">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="label-eyebrow">Cost-aware threshold sweep</p>
            <h3 className="font-display text-xl font-medium text-cream-50 mt-1">
              Where to draw the line, in rupees
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-cream-300/60">Cheapest operating point</p>
            <p className="font-mono text-ember-400 font-semibold">threshold = {bestT}</p>
          </div>
        </div>
        <p className="text-sm text-cream-300/70 mb-5 max-w-2xl">
          Every point on this curve is a real trade-off: flag more and you pay in false-positive
          friction (₹{metrics.cost_assumptions.avg_false_positive_cost_inr} per wrongly blocked
          genuine transaction); flag less and you pay in missed chargebacks
          (₹{metrics.cost_assumptions.avg_chargeback_loss_inr} each). The model doesn't pick a
          threshold by accident — it's the minimum of this curve.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C97A3D" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C97A3D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#221E17" vertical={false} />
            <XAxis dataKey="threshold" tick={{ fill: "#D2C4A4", fontSize: 11 }} axisLine={{ stroke: "#2E2820" }} tickLine={false} />
            <YAxis
              tick={{ fill: "#D2C4A4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ background: "#171410", border: "1px solid #2E2820", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#E6DCC8" }}
              formatter={(v) => [inr(v), "Total cost"]}
              labelFormatter={(l) => `Threshold ${l}`}
            />
            <ReferenceLine x={bestT} stroke="#C97A3D" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="cost" stroke="#C97A3D" strokeWidth={2} fill="url(#costFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
