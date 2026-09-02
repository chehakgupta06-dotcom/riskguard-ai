"""
RiskGuard AI — simulated live transaction feed.

For the demo, this replays held-out synthetic transactions through the live
scoring path (as if they were arriving in real time) and layers on a simple
rolling-window abuse-ring / fraud-spike detector: if several transactions in
the current window share a device fingerprint across multiple identities, or
a single identity's velocity spikes, that's surfaced as an alert.

Nothing here calls any external service — it's a self-contained simulation
so the dashboard has something honest and reproducible to show.
"""
from __future__ import annotations

import random
import time
from collections import deque

import pandas as pd

from .data_gen import generate_dataset
from .risk_engine import get_engine

_SIM_DF: pd.DataFrame | None = None
_CURSOR = 0
_RECENT_WINDOW: deque = deque(maxlen=60)


def _load_sim_data() -> pd.DataFrame:
    global _SIM_DF
    if _SIM_DF is None:
        _SIM_DF = generate_dataset(n_rows=4000, seed=7).sample(frac=1, random_state=int(time.time()) % 1000).reset_index(drop=True)
    return _SIM_DF


def _row_to_payload(row: pd.Series) -> dict:
    return {
        "amount": float(row.amount),
        "merchant_category": row.merchant_category,
        "device_type": row.device_type,
        "geo_distance_km": float(row.geo_distance_km),
        "account_age_days": float(row.account_age_days),
        "hour_of_day": int(row.hour_of_day),
        "velocity_1h": int(row.velocity_1h),
        "velocity_24h": int(row.velocity_24h),
        "billing_shipping_mismatch": bool(row.billing_shipping_mismatch),
        "new_payment_method": bool(row.new_payment_method),
        "cvv_retries": int(row.cvv_retries),
        "prior_chargebacks_90d": int(row.prior_chargebacks_90d),
        "device_fp_identity_count": int(row.device_fp_identity_count),
        "device_fp_txn_count": int(row.device_fp_txn_count),
    }


def next_batch(n: int = 8) -> list[dict]:
    global _CURSOR
    df = _load_sim_data()
    engine = get_engine()
    out = []
    for _ in range(n):
        row = df.iloc[_CURSOR % len(df)]
        _CURSOR += 1
        payload = _row_to_payload(row)
        result = engine.score(payload)
        item = {
            "transaction_id": row.transaction_id,
            "timestamp": pd.Timestamp.now().isoformat(),
            "identity_id": int(row.identity_id),
            "device_fingerprint": int(row.device_fingerprint),
            "amount": payload["amount"],
            "merchant_category": payload["merchant_category"],
            "device_type": payload["device_type"],
            "txn_city": row.txn_city,
            **result,
            "ground_truth_chargeback": bool(row.is_chargeback),  # shown ONLY in the demo feed for evaluation transparency
        }
        out.append(item)
        _RECENT_WINDOW.append(item)
    return out


def current_alerts() -> list[dict]:
    """Abuse-ring / fraud-spike heuristics over the recent rolling window."""
    alerts = []
    if not _RECENT_WINDOW:
        return alerts

    by_device: dict[int, list[dict]] = {}
    by_identity: dict[int, list[dict]] = {}
    for item in _RECENT_WINDOW:
        by_device.setdefault(item["device_fingerprint"], []).append(item)
        by_identity.setdefault(item["identity_id"], []).append(item)

    for fp, items in by_device.items():
        distinct_identities = {i["identity_id"] for i in items}
        if len(distinct_identities) >= 3 and len(items) >= 4:
            alerts.append({
                "type": "abuse_ring",
                "severity": "high",
                "message": f"Device fingerprint {fp} used by {len(distinct_identities)} different identities "
                           f"across {len(items)} transactions in the current window.",
                "transaction_ids": [i["transaction_id"] for i in items][-6:],
            })

    for ident, items in by_identity.items():
        if len(items) >= 5:
            alerts.append({
                "type": "velocity_spike",
                "severity": "medium",
                "message": f"Identity {ident} generated {len(items)} transactions in the current window "
                           f"— above normal velocity.",
                "transaction_ids": [i["transaction_id"] for i in items][-6:],
            })

    high_risk_cluster = [i for i in _RECENT_WINDOW if i["risk_score"] >= 0.15]
    if len(high_risk_cluster) >= 4:
        alerts.append({
            "type": "fraud_spike",
            "severity": "critical",
            "message": f"{len(high_risk_cluster)} high-risk transactions detected in the current window "
                       f"— above the normal baseline rate.",
            "transaction_ids": [i["transaction_id"] for i in high_risk_cluster][-6:],
        })

    return alerts
