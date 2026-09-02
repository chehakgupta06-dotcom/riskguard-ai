import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function ConfusionCell({ label, value, tone }) {
  const toneMap = {
    good: "bg-signal-safe/12 border-signal-safe/30 text-signal-safe",
    bad: "bg-signal-risk/12 border-signal-risk/30 text-signal-risk",
  };
  return (
    <div className={`rounded-xl border p-5 text-center ${toneMap[tone]}`}>
      <p className="font-mono text-3xl font-semibold">{value}</p>
      <p className="text-xs mt-1 text-cream-300/70">{label}</p>
    </div>
  );
}

export default function ModelPerformance({ metrics, featureImportances }) {
  if (!metrics) return null;

  const rocData = metrics.roc_curve.fpr.map((f, i) => ({ fpr: f, tpr: metrics.roc_curve.tpr[i] }));
  const prData = metrics.pr_curve.recall.map((r, i) => ({ recall: r, precision: metrics.pr_curve.precision[i] }));
  const best = metrics.best_threshold_by_cost;
  const topFeatures = (featureImportances || []).slice(0, 8);
  const maxImp = topFeatures[0]?.importance || 1;

  return (
    <div className="space-y-8">
      <div>
        <p className="label-eyebrow">Held-out evaluation</p>
        <h2 className="font-display text-2xl font-semibold text-cream-50 mt-1">Model Performance</h2>
        <p className="text-sm text-cream-300/70 mt-2 max-w-2xl">
          Trained on the earliest 75% of transactions by time, evaluated on the most
          recent 25% — a temporal split, not a random shuffle, so nothing from the
          test period leaks into training. {metrics.n_train.toLocaleString()} train /{" "}
          {metrics.n_test.toLocaleString()} test transactions.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <ConfusionCell label="True positives (caught)" value={best.tp} tone="good" />
        <ConfusionCell label="False negatives (missed)" value={best.fn} tone="bad" />
        <ConfusionCell label="False positives (over-flagged)" value={best.fp} tone="bad" />
        <ConfusionCell label="True negatives (correctly cleared)" value={best.tn} tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <p className="label-eyebrow mb-1">ROC curve</p>
          <p className="font-mono text-sm text-cream-300/70 mb-4">AUC = {metrics.roc_auc.toFixed(3)}</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rocData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#221E17" />
              <XAxis dataKey="fpr" tick={{ fill: "#D2C4A4", fontSize: 10 }} axisLine={{ stroke: "#2E2820" }} tickLine={false} label={{ value: "False positive rate", position: "insideBottom", offset: -2, fill: "#D2C4A4", fontSize: 10 }} />
              <YAxis tick={{ fill: "#D2C4A4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#171410", border: "1px solid #2E2820", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="tpr" stroke="#C97A3D" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <p className="label-eyebrow mb-1">Precision–recall curve</p>
          <p className="font-mono text-sm text-cream-300/70 mb-4">PR-AUC = {metrics.pr_auc.toFixed(3)}</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={prData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#221E17" />
              <XAxis dataKey="recall" tick={{ fill: "#D2C4A4", fontSize: 10 }} axisLine={{ stroke: "#2E2820" }} tickLine={false} label={{ value: "Recall", position: "insideBottom", offset: -2, fill: "#D2C4A4", fontSize: 10 }} />
              <YAxis tick={{ fill: "#D2C4A4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#171410", border: "1px solid #2E2820", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="precision" stroke="#7FA98C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <p className="label-eyebrow mb-4">Global feature importance</p>
        <div className="space-y-2.5">
          {topFeatures.map((f) => (
            <div key={f.feature} className="flex items-center gap-3">
              <span className="text-xs text-cream-200/80 w-52 shrink-0 truncate">{f.feature}</span>
              <div className="flex-1 h-2 rounded-full bg-ink-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ember-600 to-ember-400 rounded-full"
                  style={{ width: `${(f.importance / maxImp) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-cream-300/60 w-14 text-right">{f.importance.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 text-sm text-cream-300/70 leading-relaxed">
        <p className="label-eyebrow mb-2">Cost assumptions (declared, not hidden)</p>
        Average realized loss per missed chargeback: ₹{metrics.cost_assumptions.avg_chargeback_loss_inr.toLocaleString("en-IN")}.
        Average friction cost per wrongly-flagged genuine transaction: ₹{metrics.cost_assumptions.avg_false_positive_cost_inr.toLocaleString("en-IN")}.
        These are stated estimates for the demo, not measured from a live merchant — swap them for real
        numbers and the "cheapest threshold" recalculates automatically.
      </div>
    </div>
  );
}
