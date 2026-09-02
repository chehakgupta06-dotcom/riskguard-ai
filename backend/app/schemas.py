from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class TransactionIn(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in INR")
    merchant_category: Literal[
        "electronics", "fashion", "grocery", "travel", "gaming",
        "subscription", "food_delivery", "home_goods", "jewellery", "pharmacy",
    ]
    device_type: Literal["mobile_app", "mobile_web", "desktop_web", "pos"]
    geo_distance_km: float = Field(0, ge=0, description="Distance between billing home city and transaction city")
    account_age_days: float = Field(..., ge=0)
    hour_of_day: int = Field(..., ge=0, le=23)
    velocity_1h: int = Field(0, ge=0, description="Transactions by this customer in the last hour")
    velocity_24h: int = Field(0, ge=0, description="Transactions by this customer in the last 24 hours")
    billing_shipping_mismatch: bool = False
    new_payment_method: bool = False
    cvv_retries: int = Field(0, ge=0)
    prior_chargebacks_90d: int = Field(0, ge=0)
    device_fp_identity_count: int = Field(1, ge=1, description="Distinct customer identities seen on this device fingerprint")
    device_fp_txn_count: int = Field(1, ge=1, description="Total transactions seen on this device fingerprint")

    class Config:
        json_schema_extra = {
            "example": {
                "amount": 24500,
                "merchant_category": "electronics",
                "device_type": "mobile_web",
                "geo_distance_km": 620,
                "account_age_days": 4,
                "hour_of_day": 2,
                "velocity_1h": 3,
                "velocity_24h": 9,
                "billing_shipping_mismatch": True,
                "new_payment_method": True,
                "cvv_retries": 2,
                "prior_chargebacks_90d": 0,
                "device_fp_identity_count": 4,
                "device_fp_txn_count": 11,
            }
        }


class RiskFactor(BaseModel):
    feature: str
    label: str
    value: str
    contribution: float


class ScoreOut(BaseModel):
    model_config = {"protected_namespaces": ()}

    risk_score: float
    risk_band: Literal["low", "medium", "high", "critical"]
    decision: Literal["approve", "review", "block"]
    threshold_used: float
    top_factors: list[RiskFactor]
    model_version: str


class ChargebackResponseRequest(BaseModel):
    transaction_id: str
    reason_code: Literal[
        "unauthorized_transaction", "goods_not_received", "goods_not_as_described",
        "duplicate_processing", "credit_not_processed",
    ]
    transaction: TransactionIn
    merchant_name: str = "Merchant"
    order_reference: Optional[str] = None
    delivery_proof_available: bool = False
    customer_communication_available: bool = False
