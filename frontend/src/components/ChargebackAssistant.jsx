import { useState } from "react";
import { api } from "../lib/api";

const REASON_CODES = [
  { value: "unauthorized_transaction", label: "Unauthorized transaction" },
  { value: "goods_not_received", label: "Goods / services not received" },
  { value: "goods_not_as_described", label: "Goods / services not as described" },
  { value: "duplicate_processing", label: "Duplicate processing" },
  { value: "credit_not_processed", label: "Credit not processed" },
];

const inputCls = "w-full bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm text-cream-100 focus:outline-none focus:border-ember-500 transition-colors";

export default function ChargebackAssistant() {
  const [form, setForm] = useState({
    transaction_id: "txn_0004821",
    reason_code: "goods_not_received",
    merchant_name: "Aster Home & Living",
    order_reference: "ORD-22190",
    delivery_proof_available: false,
    customer_communication_available: true,
    amount: 3299,
    merchant_category: "home_goods",
    device_type: "mobile_app",
    account_age_days: 210,
    geo_distance_km: 5,
    prior_chargebacks_90d: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        transaction_id: form.transaction_id,
        reason_code: form.reason_code,
        merchant_name: form.merchant_name,
        order_reference: form.order_reference,
        delivery_proof_available: form.delivery_proof_available,
        customer_communication_available: form.customer_communication_available,
        transaction: {
          amount: form.amount,
          merchant_category: form.merchant_category,
          device_type: form.device_type,
          geo_distance_km: form.geo_distance_km,
          account_age_days: form.account_age_days,
          hour_of_day: 12,
          velocity_1h: 0,
          velocity_24h: 1,
          billing_shipping_mismatch: false,
          new_payment_method: false,
          cvv_retries: 0,
          prior_chargebacks_90d: form.prior_chargebacks_90d,
          device_fp_identity_count: 1,
          device_fp_txn_count: 5,
        },
      };
      const res = await api.chargebackResponse(payload);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">Evidence-only, defense-first</p>
        <h2 className="font-display text-2xl font-semibold text-cream-50 mt-1">Chargeback Assistant</h2>
        <p className="text-sm text-cream-300/70 mt-2 max-w-2xl">
          Assembles the evidence a merchant already has into a factual draft response.
          It never invents evidence and always tells you what's still missing before submission.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block col-span-2">
              <span className="text-xs text-cream-300/70 block mb-1.5">Reason code</span>
              <select className={inputCls} value={form.reason_code} onChange={(e) => update("reason_code", e.target.value)}>
                {REASON_CODES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-cream-300/70 block mb-1.5">Transaction ID</span>
              <input className={inputCls} value={form.transaction_id} onChange={(e) => update("transaction_id", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-cream-300/70 block mb-1.5">Order reference</span>
              <input className={inputCls} value={form.order_reference} onChange={(e) => update("order_reference", e.target.value)} />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-cream-300/70 block mb-1.5">Merchant name</span>
              <input className={inputCls} value={form.merchant_name} onChange={(e) => update("merchant_name", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-cream-300/70 block mb-1.5">Amount (₹)</span>
              <input type="number" className={inputCls} value={form.amount} onChange={(e) => update("amount", +e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-cream-300/70 block mb-1.5">Account age (days)</span>
              <input type="number" className={inputCls} value={form.account_age_days} onChange={(e) => update("account_age_days", +e.target.value)} />
            </label>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-cream-200/80">
              <input type="checkbox" checked={form.delivery_proof_available} onChange={(e) => update("delivery_proof_available", e.target.checked)} className="accent-ember-500" />
              Delivery / shipment proof on file
            </label>
            <label className="flex items-center gap-2 text-sm text-cream-200/80">
              <input type="checkbox" checked={form.customer_communication_available} onChange={(e) => update("customer_communication_available", e.target.checked)} className="accent-ember-500" />
              Customer communication log on file
            </label>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-ink-950 font-medium rounded-lg py-2.5 transition-colors">
            {loading ? "Drafting…" : "Draft evidence response"}
          </button>
          {error && <p className="text-signal-risk text-sm">{error}</p>}
        </form>

        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="label-eyebrow">Draft</p>
            {result && (
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${result.ready_to_submit ? "border-signal-safe/40 text-signal-safe" : "border-signal-watch/40 text-signal-watch"}`}>
                {result.ready_to_submit ? "Ready to submit" : "Evidence incomplete"}
              </span>
            )}
          </div>
          {!result && (
            <div className="flex-1 flex items-center justify-center text-cream-300/40 text-sm">
              Fill in the details and draft a response
            </div>
          )}
          {result && (
            <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-cream-100 bg-ink-800/60 rounded-xl p-4 font-body flex-1 overflow-auto">
              {result.draft_text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
