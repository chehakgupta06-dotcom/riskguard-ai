from __future__ import annotations

import io

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from . import live_feed
from .chargeback_responder import draft_response
from .risk_engine import get_engine
from .schemas import ChargebackResponseRequest, ScoreOut, TransactionIn

app = FastAPI(
    title="RiskGuard AI",
    description="Fraud & chargeback risk detection for Razorpay merchants — "
                "Track 02: AI Risk Manager submission.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _warm_up():
    get_engine()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/metrics")
def metrics():
    engine = get_engine()
    return engine.metrics


@app.get("/api/feature-importances")
def feature_importances():
    engine = get_engine()
    return engine.feature_importances


@app.post("/api/score", response_model=ScoreOut)
def score_transaction(txn: TransactionIn, threshold: float | None = Query(None, ge=0, le=1)):
    engine = get_engine()
    result = engine.score(txn.model_dump(), threshold=threshold)
    return result


@app.post("/api/batch-score")
async def batch_score(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file")
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    engine = get_engine()
    required_cols = set(TransactionIn.model_fields.keys())
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(400, f"CSV is missing required columns: {sorted(missing)}")

    results = []
    for _, row in df.iterrows():
        payload = row[list(required_cols)].to_dict()
        try:
            txn = TransactionIn(**payload)
        except Exception as e:
            results.append({"error": str(e), **payload})
            continue
        r = engine.score(txn.model_dump())
        results.append({**payload, **r})
    return {"n_scored": len(results), "results": results}


@app.get("/api/live-feed")
def get_live_feed(n: int = Query(8, ge=1, le=30)):
    return {"transactions": live_feed.next_batch(n)}


@app.get("/api/alerts")
def get_alerts():
    return {"alerts": live_feed.current_alerts()}


@app.post("/api/chargeback-response")
def chargeback_response(req: ChargebackResponseRequest):
    return draft_response(req.model_dump())


@app.get("/api/reset-feed")
def reset_feed():
    live_feed._CURSOR = 0
    live_feed._RECENT_WINDOW.clear()
    return {"status": "reset"}
