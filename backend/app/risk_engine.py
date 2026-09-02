"""
RiskGuard AI — risk scoring engine.

Loads the trained pipeline + honest evaluation metrics produced by train.py,
and exposes a scoring function that returns a calibrated-ish risk score plus
a short, human-readable local explanation.

Explanation method: this uses the model's *global* feature importances
(from the trained GradientBoostingClassifier) combined with how unusual this
transaction's values are relative to the training distribution, to rank the
factors that most plausibly drove this particular score. It is a transparent,
cheap approximation — not a Shapley-value explanation — and is documented as
such in the README and in the API response's `model_version` note, so nobody
mistakes it for something it isn't.
"""
from __future__ import annotations

import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH = os.path.join(BASE_DIR, "data", "transactions.csv")

MODEL_VERSION = "riskguard-gbm-v1 (approximate local explanations, not SHAP)"

FEATURE_LABELS = {
    "amount": "Transaction amount",
    "amount_to_category_avg_ratio": "Amount vs. category average",
    "geo_distance_km": "Distance from home billing city",
    "account_age_days": "Account age",
    "hour_of_day": "Hour of day",
    "is_odd_hour": "Odd-hour transaction",
    "velocity_1h": "Transactions in last hour",
    "velocity_24h": "Transactions in last 24h",
    "billing_shipping_mismatch": "Billing/shipping mismatch",
    "new_payment_method": "New payment method",
    "cvv_retries": "CVV entry retries",
    "prior_chargebacks_90d": "Prior chargebacks (90d)",
    "device_fp_identity_count": "Identities sharing this device",
    "device_fp_txn_count": "Transactions from this device",
}

NUMERIC_FEATURES = [
    "amount", "amount_to_category_avg_ratio", "geo_distance_km", "account_age_days",
    "hour_of_day", "is_odd_hour", "velocity_1h", "velocity_24h",
    "billing_shipping_mismatch", "new_payment_method", "cvv_retries",
    "prior_chargebacks_90d", "device_fp_identity_count", "device_fp_txn_count",
]
CATEGORICAL_FEATURES = ["merchant_category", "device_type"]


class RiskEngine:
    def __init__(self):
        self.pipeline = joblib.load(os.path.join(MODEL_DIR, "risk_model.joblib"))
        with open(os.path.join(MODEL_DIR, "metrics.json")) as f:
            self.metrics = json.load(f)
        with open(os.path.join(MODEL_DIR, "feature_importances.json")) as f:
            self.feature_importances = json.load(f)
        self._imp_lookup = {d["feature"]: d["importance"] for d in self.feature_importances}

        train_df = pd.read_csv(DATA_PATH)
        self._train_mean = train_df[NUMERIC_FEATURES].mean()
        self._train_std = train_df[NUMERIC_FEATURES].std().replace(0, 1)

        self.default_threshold = self.metrics["best_threshold_by_cost"]["threshold"]

    # ---- decisioning ----
    def risk_band(self, score: float) -> str:
        if score < 0.02:
            return "low"
        if score < 0.06:
            return "medium"
        if score < 0.2:
            return "high"
        return "critical"

    def decision(self, score: float, threshold: float) -> str:
        if score >= threshold * 3:
            return "block"
        if score >= threshold:
            return "review"
        return "approve"

    def _to_frame(self, payload: dict[str, Any]) -> pd.DataFrame:
        row = {
            "amount": payload["amount"],
            "geo_distance_km": payload["geo_distance_km"],
            "account_age_days": payload["account_age_days"],
            "hour_of_day": payload["hour_of_day"],
            "is_odd_hour": int(payload["hour_of_day"] < 5 or payload["hour_of_day"] > 23),
            "velocity_1h": payload["velocity_1h"],
            "velocity_24h": payload["velocity_24h"],
            "billing_shipping_mismatch": int(payload["billing_shipping_mismatch"]),
            "new_payment_method": int(payload["new_payment_method"]),
            "cvv_retries": payload["cvv_retries"],
            "prior_chargebacks_90d": payload["prior_chargebacks_90d"],
            "device_fp_identity_count": payload["device_fp_identity_count"],
            "device_fp_txn_count": payload["device_fp_txn_count"],
            "merchant_category": payload["merchant_category"],
            "device_type": payload["device_type"],
        }
        # category-relative amount ratio, approximated with a fixed category
        # average table mirrored from the generator (documented assumption)
        cat_avg = {
            "electronics": 8500, "fashion": 2200, "grocery": 900, "travel": 14000,
            "gaming": 1500, "subscription": 499, "food_delivery": 550,
            "home_goods": 3200, "jewellery": 22000, "pharmacy": 700,
        }[payload["merchant_category"]]
        row["amount_to_category_avg_ratio"] = round(row["amount"] / cat_avg, 3)
        return pd.DataFrame([row])

    def score(self, payload: dict[str, Any], threshold: float | None = None) -> dict[str, Any]:
        threshold = threshold or self.default_threshold
        df = self._to_frame(payload)
        prob = float(self.pipeline.predict_proba(df)[0, 1])

        # local explanation: rank numeric features by importance * |z-score|
        contributions = []
        for feat in NUMERIC_FEATURES:
            val = df.iloc[0][feat]
            z = (val - self._train_mean[feat]) / self._train_std[feat]
            weight = self._imp_lookup.get(feat, 0.0)
            contributions.append((feat, float(weight * abs(z)), val, float(z)))
        contributions.sort(key=lambda t: -t[1])

        top_factors = []
        for feat, contrib, val, z in contributions[:4]:
            direction = "elevated" if z > 0 else "typical/low"
            top_factors.append({
                "feature": feat,
                "label": FEATURE_LABELS.get(feat, feat),
                "value": f"{val:g} ({direction})",
                "contribution": round(contrib, 4),
            })

        return {
            "risk_score": round(prob, 4),
            "risk_band": self.risk_band(prob),
            "decision": self.decision(prob, threshold),
            "threshold_used": round(threshold, 4),
            "top_factors": top_factors,
            "model_version": MODEL_VERSION,
        }


_engine: RiskEngine | None = None


def get_engine() -> RiskEngine:
    global _engine
    if _engine is None:
        _engine = RiskEngine()
    return _engine
