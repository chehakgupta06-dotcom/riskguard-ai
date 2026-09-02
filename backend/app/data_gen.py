"""
RiskGuard AI — synthetic transaction generator.

Generates a realistic e-commerce/payments transaction dataset with engineered
fraud & chargeback signal, for training and evaluating the risk model.

This is 100% synthetic data. No real cardholder, merchant or PII data is used
anywhere in this project. The generator encodes well-known, publicly discussed
fraud heuristics (velocity, geo-mismatch, device reuse across identities, odd
hours, new-account + high-value combos, mismatched billing/shipping) purely so
a defensive classifier has honest signal to learn from — nothing here is an
attack tool, and none of it is offense-capable.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

RNG_SEED = 42

MERCHANT_CATEGORIES = [
    "electronics", "fashion", "grocery", "travel", "gaming",
    "subscription", "food_delivery", "home_goods", "jewellery", "pharmacy",
]

DEVICE_TYPES = ["mobile_app", "mobile_web", "desktop_web", "pos"]

CITIES = [
    ("Mumbai", 19.076, 72.8777), ("Delhi", 28.7041, 77.1025),
    ("Bengaluru", 12.9716, 77.5946), ("Hyderabad", 17.385, 78.4867),
    ("Chennai", 13.0827, 80.2707), ("Pune", 18.5204, 73.8567),
    ("Kolkata", 22.5726, 88.3639), ("Ahmedabad", 23.0225, 72.5714),
    ("Jaipur", 26.9124, 75.7873), ("Lucknow", 26.8467, 80.9462),
]


def _haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * 6371 * np.arcsin(np.sqrt(a))


def generate_dataset(n_rows: int = 32000, seed: int = RNG_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []

    # Simulate a population of "identities" (customer + device fingerprints)
    n_identities = n_rows // 6
    identity_ids = np.arange(n_identities)
    account_age_days = rng.exponential(scale=220, size=n_identities).clip(0, 2500)
    home_city_idx = rng.integers(0, len(CITIES), size=n_identities)
    base_device = rng.integers(0, 10_000_000, size=n_identities)

    # A small ring of identities that share devices (abuse-ring pattern)
    ring_size = max(20, n_identities // 80)
    ring_identity_ids = rng.choice(identity_ids, size=ring_size, replace=False)
    shared_device_pool = rng.integers(0, 10_000_000, size=max(3, ring_size // 8))

    start_ts = pd.Timestamp("2026-05-01")

    for i in range(n_rows):
        ident = rng.integers(0, n_identities)
        is_ring_member = ident in ring_identity_ids
        city_idx = home_city_idx[ident]
        city_name, home_lat, home_lon = CITIES[city_idx]

        # Most transactions happen from home city; some travel
        travels = rng.random() < 0.08
        if travels:
            other_idx = rng.integers(0, len(CITIES))
            txn_city, txn_lat, txn_lon = CITIES[other_idx]
        else:
            txn_city, txn_lat, txn_lon = city_name, home_lat, home_lon
        geo_distance_km = _haversine_km(home_lat, home_lon, txn_lat, txn_lon)
        geo_distance_km += rng.normal(0, 2)
        geo_distance_km = max(0, geo_distance_km)

        acct_age = account_age_days[ident]
        category = rng.choice(MERCHANT_CATEGORIES)
        device_type = rng.choice(DEVICE_TYPES, p=[0.5, 0.25, 0.2, 0.05])

        if is_ring_member and rng.random() < 0.7:
            device_fp = int(rng.choice(shared_device_pool))
        else:
            device_fp = int(base_device[ident])

        hour = int(rng.normal(14, 5)) % 24
        is_odd_hour = hour < 5 or hour > 23

        # amount: category dependent, log-normal
        cat_mean = {
            "electronics": 8500, "fashion": 2200, "grocery": 900,
            "travel": 14000, "gaming": 1500, "subscription": 499,
            "food_delivery": 550, "home_goods": 3200, "jewellery": 22000,
            "pharmacy": 700,
        }[category]
        amount = max(50, rng.lognormal(mean=np.log(cat_mean), sigma=0.6))

        # velocity: number of txns by this identity in the last hour (simulated)
        velocity_1h = rng.poisson(0.3 if not is_ring_member else 1.4)
        velocity_24h = velocity_1h + rng.poisson(1.2 if not is_ring_member else 5)

        billing_shipping_mismatch = int(rng.random() < (0.05 if not travels else 0.35))
        new_payment_method = int(rng.random() < (0.15 if acct_age < 30 else 0.03))
        cvv_retries = rng.poisson(0.1 if not is_ring_member else 0.6)
        prior_chargebacks_90d = rng.poisson(0.02 if not is_ring_member else 0.35)

        # ---- latent fraud risk score (ground truth generator, not visible to model) ----
        risk = (
            2.0 * (geo_distance_km > 500)
            + 1.3 * is_odd_hour
            + 1.1 * (velocity_1h >= 3)
            + 1.5 * (velocity_24h >= 8)
            + 1.7 * billing_shipping_mismatch
            + 1.3 * new_payment_method
            + 2.2 * (cvv_retries >= 2)
            + 2.6 * (prior_chargebacks_90d >= 1)
            + 2.8 * is_ring_member
            + 2.0 * (amount > cat_mean * 4)
            + 0.9 * (acct_age < 3)
            - 0.6 * (acct_age > 365)
        )
        risk += rng.normal(0, 0.4)  # noise so the problem isn't trivially separable (keeps it a real ML task, not a lookup table)
        fraud_prob = 1 / (1 + np.exp(-(risk - 4.2)))
        is_fraud = int(rng.random() < fraud_prob)

        # chargeback follows fraud with high probability, plus a small
        # independent "genuine dispute" rate (friendly fraud / real dissatisfaction)
        if is_fraud:
            is_chargeback = int(rng.random() < 0.82)
        else:
            is_chargeback = int(rng.random() < 0.015)

        rows.append(dict(
            transaction_id=f"txn_{i:07d}",
            identity_id=int(ident),
            timestamp=start_ts + pd.Timedelta(days=int(rng.integers(0, 90)), hours=hour,
                                               minutes=int(rng.integers(0, 60))),
            amount=round(float(amount), 2),
            merchant_category=category,
            device_type=device_type,
            device_fingerprint=device_fp,
            home_city=city_name,
            txn_city=txn_city,
            geo_distance_km=round(float(geo_distance_km), 1),
            account_age_days=round(float(acct_age), 1),
            hour_of_day=hour,
            is_odd_hour=int(is_odd_hour),
            velocity_1h=int(velocity_1h),
            velocity_24h=int(velocity_24h),
            billing_shipping_mismatch=billing_shipping_mismatch,
            new_payment_method=new_payment_method,
            cvv_retries=int(cvv_retries),
            prior_chargebacks_90d=int(prior_chargebacks_90d),
            is_fraud=is_fraud,
            is_chargeback=is_chargeback,
        ))

    df = pd.DataFrame(rows)

    # ---- post-hoc engineered features (what a real risk engine could compute) ----
    # Device fingerprint reuse: how many distinct identities and how many
    # transactions have shared this device — this is the signal that actually
    # exposes the abuse-ring pattern, rather than a directly-labeled flag.
    fp_identity_counts = df.groupby("device_fingerprint")["identity_id"].transform("nunique")
    fp_txn_counts = df.groupby("device_fingerprint")["transaction_id"].transform("count")
    df["device_fp_identity_count"] = fp_identity_counts
    df["device_fp_txn_count"] = fp_txn_counts

    cat_avg = df.groupby("merchant_category")["amount"].transform("mean")
    df["amount_to_category_avg_ratio"] = (df["amount"] / cat_avg).round(3)

    return df


if __name__ == "__main__":
    import os

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    OUT_PATH = os.path.join(BASE_DIR, "data", "transactions.csv")
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    df = generate_dataset()
    df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(df)} rows to {OUT_PATH}")
    print(df[["is_fraud", "is_chargeback"]].mean())
