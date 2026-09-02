import { useState } from "react";
import { api } from "../lib/api";
import { RiskBadge, DecisionTag } from "./RiskBadge";

const CATEGORIES = ["electronics", "fashion", "grocery", "travel", "gaming", "subscription", "food_delivery", "home_goods", "jewellery", "pharmacy"];
const DEVICES = ["mobile_app", "mobile_web", "desktop_web", "pos"];

const PRESETS = {
  suspicious: {
    amount: 24500, merchant_category: "electronics", device_type: "mobile_web",
    geo_distance_km: 620, account_age_days: 4, hour_of_day: 2,
    velocity_1h: 3, velocity_24h: 9, billing_shipping_mismatch: true,
    new_payment_method: true, cvv_retries: 2, prior_chargebacks_90d: 0,
    device_fp_identity_count: 4, device_fp_txn_count: 11,
  },
  ordinary: {
    amount: 850, merchant_category: "grocery", device_type: "mobile_app",
    geo_distance_km: 3, account_age_days: 640, hour_of_day: 13,
    velocity_1h: 0, velocity_24h: 1, billing_shipping_mismatch: false,
    new_payment_method: false, cvv_retries: 0, prior_chargebacks_90d: 0,
    device_fp_identity_count: 1, device_fp_txn_count: 22,
  },
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs text-cream-300/70 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm text-cream-100 focus:outline-none focus:border-ember-500 transition-colors";

export default function ScoreTransaction() {
  const [form, setForm] = useState(PRESETS.suspicious);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const loadPreset = (key) => {
    setForm(PRESETS[key]);
    setResult(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.score(form);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-eyebrow">Manual scoring</p>
          <h2 className="font-display text-2xl font-semibold text-cream-50 mt-1">Score a Transaction</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadPreset("suspicious")} className="text-xs px-3 py-1.5 rounded-full border border-signal-risk/40 text-signal-risk hover:bg-signal-risk/10 transition-colors">Load suspicious example</button>
          <button onClick={() => loadPreset("ordinary")} className="text-xs px-3 py-1.5 rounded-full border border-signal-safe/40 text-signal-safe hover:bg-signal-safe/10 transition-colors">Load ordinary example</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)">
              <input type="number" className={inputCls} value={form.amount} onChange={(e) => update("amount", +e.target.value)} required min={1} />
            </Field>
            <Field label="Merchant category">
              <select className={inputCls} value={form.merchant_category} onChange={(e) => update("merchant_category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Field label="Device type">
              <select className={inputCls} value={form.device_type} onChange={(e) => update("device_type", e.target.value)}>
                {DEVICES.map((d) => <option key={d} value={d}>{d.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Field label="Geo distance from home city (km)">
              <input type="number" className={inputCls} value={form.geo_distance_km} onChange={(e) => update("geo_distance_km", +e.target.value)} min={0} />
            </Field>
            <Field label="Account age (days)">
              <input type="number" className={inputCls} value={form.account_age_days} onChange={(e) => update("account_age_days", +e.target.value)} min={0} />
            </Field>
            <Field label="Hour of day (0–23)">
              <input type="number" className={inputCls} value={form.hour_of_day} onChange={(e) => update("hour_of_day", +e.target.value)} min={0} max={23} />
            </Field>
            <Field label="Velocity — last 1h">
              <input type="number" className={inputCls} value={form.velocity_1h} onChange={(e) => update("velocity_1h", +e.target.value)} min={0} />
            </Field>
            <Field label="Velocity — last 24h">
              <input type="number" className={inputCls} value={form.velocity_24h} onChange={(e) => update("velocity_24h", +e.target.value)} min={0} />
            </Field>
            <Field label="CVV retries">
              <input type="number" className={inputCls} value={form.cvv_retries} onChange={(e) => update("cvv_retries", +e.target.value)} min={0} />
            </Field>
            <Field label="Prior chargebacks (90d)">
              <input type="number" className={inputCls} value={form.prior_chargebacks_90d} onChange={(e) => update("prior_chargebacks_90d", +e.target.value)} min={0} />
            </Field>
            <Field label="Identities on this device">
              <input type="number" className={inputCls} value={form.device_fp_identity_count} onChange={(e) => update("device_fp_identity_count", +e.target.value)} min={1} />
            </Field>
            <Field label="Transactions from this device">
              <input type="number" className={inputCls} value={form.device_fp_txn_count} onChange={(e) => update("device_fp_txn_count", +e.target.value)} min={1} />
            </Field>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-cream-200/80">
              <input type="checkbox" checked={form.billing_shipping_mismatch} onChange={(e) => update("billing_shipping_mismatch", e.target.checked)} className="accent-ember-500" />
              Billing/shipping mismatch
            </label>
            <label className="flex items-center gap-2 text-sm text-cream-200/80">
              <input type="checkbox" checked={form.new_payment_method} onChange={(e) => update("new_payment_method", e.target.checked)} className="accent-ember-500" />
              New payment method
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-ink-950 font-medium rounded-lg py-2.5 mt-2 transition-colors">
            {loading ? "Scoring…" : "Score this transaction"}
          </button>
          {error && <p className="text-signal-risk text-sm">{error}</p>}
        </form>

        <div className="card p-6 flex flex-col">
          <p className="label-eyebrow mb-4">Result</p>
          {!result && (
            <div className="flex-1 flex items-center justify-center text-cream-300/40 text-sm">
              Submit a transaction to see the risk assessment
            </div>
          )}
          {result && (
            <div className="space-y-5">
              <div className="flex items-end gap-4">
                <p className="font-mono text-5xl font-semibold text-cream-50">{(result.risk_score * 100).toFixed(1)}<span className="text-2xl text-cream-300/50">%</span></p>
                <div className="flex flex-col gap-2 mb-1.5">
                  <RiskBadge band={result.risk_band} />
                  <DecisionTag decision={result.decision} />
                </div>
              </div>
              <p className="text-xs text-cream-300/60">
                Decision threshold: {result.threshold_used} (cost-optimal, from held-out evaluation)
              </p>

              <div>
                <p className="text-xs uppercase tracking-wider text-cream-300/60 mb-3">Top contributing factors</p>
                <div className="space-y-2.5">
                  {result.top_factors.map((f) => (
                    <div key={f.feature} className="flex items-center justify-between bg-ink-800/60 rounded-lg px-3.5 py-2.5">
                      <div>
                        <p className="text-sm text-cream-100">{f.label}</p>
                        <p className="text-xs text-cream-300/50">{f.value}</p>
                      </div>
                      <span className="font-mono text-xs text-ember-400">{f.contribution.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-cream-300/40 pt-2 border-t border-ink-700">
                {result.model_version}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
