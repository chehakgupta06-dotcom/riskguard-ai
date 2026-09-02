import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { RiskBadge, DecisionTag } from "./RiskBadge";

export default function LiveMonitor() {
  const [feed, setFeed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const poll = async () => {
    try {
      const [feedRes, alertsRes] = await Promise.all([api.liveFeed(6), api.alerts()]);
      setFeed((prev) => [...feedRes.transactions.reverse(), ...prev].slice(0, 40));
      setAlerts(alertsRes.alerts);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    poll();
    if (running) {
      intervalRef.current = setInterval(poll, 2500);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleReset = async () => {
    await api.resetFeed();
    setFeed([]);
    setAlerts([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-eyebrow">Simulated real-time stream</p>
          <h2 className="font-display text-2xl font-semibold text-cream-50 mt-1">Live Monitor</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-4 py-2 rounded-lg border border-ink-600 text-sm text-cream-100 hover:bg-ink-800 transition-colors"
          >
            {running ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-ink-600 text-sm text-cream-300/70 hover:bg-ink-800 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-signal-risk/40 text-signal-risk text-sm">
          Couldn't reach the API at the configured URL — check VITE_API_URL. ({error})
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="card border-signal-critical/40 bg-signal-critical/5 p-4 flex items-start gap-3">
              <span className="text-signal-risk text-lg leading-none mt-0.5">&#9888;</span>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-signal-risk">{a.type.replace("_", " ")} · {a.severity}</p>
                <p className="text-sm text-cream-100 mt-1">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-600/60 text-left text-cream-300/60 text-xs uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Transaction</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">City</th>
              <th className="px-5 py-3 font-medium">Risk score</th>
              <th className="px-5 py-3 font-medium">Band</th>
              <th className="px-5 py-3 font-medium">Decision</th>
              <th className="px-5 py-3 font-medium">Top factor</th>
            </tr>
          </thead>
          <tbody>
            {feed.map((t) => (
              <tr key={t.transaction_id + t.timestamp} className="border-b border-ink-700/60 hover:bg-ink-800/40 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-cream-300/70">{t.transaction_id}</td>
                <td className="px-5 py-3 font-mono">₹{t.amount.toLocaleString("en-IN")}</td>
                <td className="px-5 py-3 capitalize text-cream-200/80">{t.merchant_category.replace("_", " ")}</td>
                <td className="px-5 py-3 text-cream-200/80">{t.txn_city}</td>
                <td className="px-5 py-3 font-mono">{(t.risk_score * 100).toFixed(1)}%</td>
                <td className="px-5 py-3"><RiskBadge band={t.risk_band} /></td>
                <td className="px-5 py-3"><DecisionTag decision={t.decision} /></td>
                <td className="px-5 py-3 text-xs text-cream-300/60">{t.top_factors[0]?.label}</td>
              </tr>
            ))}
            {feed.length === 0 && !error && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-cream-300/50">Waiting for the first batch…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
