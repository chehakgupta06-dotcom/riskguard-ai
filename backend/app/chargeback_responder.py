"""
RiskGuard AI — chargeback evidence response drafter.

This is a documentation helper, not an automated dispute-winning tool: it
assembles the evidence a merchant already has (order records, delivery proof,
communication logs) into a clear, factual draft response for the relevant
reason code, in the structure card networks/PGs typically expect. It never
fabricates evidence, never advises the merchant to claim something untrue,
and always tells the merchant which evidence is still missing. This keeps it
strictly a defensive, evidence-organizing tool.
"""
from __future__ import annotations

REASON_CODE_GUIDANCE = {
    "unauthorized_transaction": {
        "title": "Unauthorized Transaction",
        "evidence_needed": [
            "AVS/CVV match result at time of sale",
            "Device & geolocation match with prior legitimate orders from this customer",
            "3-D Secure / OTP authentication result",
            "Delivery address history for this customer",
        ],
    },
    "goods_not_received": {
        "title": "Goods / Services Not Received",
        "evidence_needed": [
            "Proof of shipment with tracking number",
            "Courier delivery confirmation (signature/photo/OTP)",
            "Order timeline vs. promised delivery window",
        ],
    },
    "goods_not_as_described": {
        "title": "Goods / Services Not as Described",
        "evidence_needed": [
            "Product listing/description shown to the customer at checkout",
            "Order confirmation matching the listing",
            "Any support tickets or return requests from the customer",
        ],
    },
    "duplicate_processing": {
        "title": "Duplicate Processing",
        "evidence_needed": [
            "Both transaction IDs and timestamps",
            "Proof that the two charges correspond to two distinct orders (if true)",
            "Refund record, if a duplicate was already reversed",
        ],
    },
    "credit_not_processed": {
        "title": "Credit Not Processed",
        "evidence_needed": [
            "Refund transaction ID and processing timestamp",
            "Refund policy shown to the customer",
            "Confirmation email/SMS sent to the customer about the refund",
        ],
    },
}


def draft_response(payload: dict) -> dict:
    reason = payload["reason_code"]
    guidance = REASON_CODE_GUIDANCE[reason]
    txn = payload["transaction"]

    have = []
    missing = []
    if payload.get("delivery_proof_available"):
        have.append("Delivery/shipment proof on file")
    else:
        missing.append("Delivery/shipment proof")
    if payload.get("customer_communication_available"):
        have.append("Customer communication log on file")
    else:
        missing.append("Customer communication log (support tickets, emails)")

    order_ref = payload.get("order_reference") or "N/A"

    draft = f"""Chargeback Response Draft — {guidance['title']}
Merchant: {payload.get('merchant_name', 'Merchant')}
Transaction ID: {payload['transaction_id']}
Order reference: {order_ref}
Amount: ₹{txn['amount']:.2f} | Category: {txn['merchant_category']} | Channel: {txn['device_type']}

Summary of facts on record:
- Account age at time of transaction: {txn['account_age_days']:.0f} days
- Distance from customer's usual billing city: {txn['geo_distance_km']:.0f} km
- Prior chargebacks (90d) for this identity: {txn['prior_chargebacks_90d']}
- Evidence currently attached: {', '.join(have) if have else 'none yet'}

Recommended evidence bundle for a "{guidance['title']}" dispute:
""" + "\n".join(f"  - {item}" for item in guidance["evidence_needed"]) + f"""

Still missing before this can be submitted:
""" + ("\n".join(f"  - {item}" for item in missing) if missing else "  - none — evidence bundle looks complete") + """

Note: This is a factual evidence draft assembled from records already on file.
It does not assert anything about the transaction that isn't backed by the
data above, and it must be reviewed by the merchant before submission — do
not submit claims that aren't supported by real evidence.
"""

    return {
        "reason_code": reason,
        "draft_text": draft.strip(),
        "evidence_present": have,
        "evidence_missing": missing,
        "ready_to_submit": len(missing) == 0,
    }
