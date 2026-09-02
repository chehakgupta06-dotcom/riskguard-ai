# RiskGuard AI

**Razorpay AI-Native Builder Program — Track 02: AI Risk Manager**
*"Stop the merchant losing money to fraud, returns and chargebacks."*

RiskGuard AI is a real-time fraud & chargeback risk detector for e-commerce
merchants. It scores every transaction, explains the score in plain terms,
catches device-sharing abuse rings before they scale, and drafts the
chargeback evidence response a merchant needs to fight an illegitimate
dispute — all measured against a held-out test set with honest metrics,
false-positive cost included.

It covers three of the four example directions in the brief in one coherent
product: **fraud-spike detector**, **chargeback evidence responder**, and a
lightweight **abuse-ring sentinel**.

> All data in this project — transactions, customers, devices — is
> synthetically generated. No real cardholder or merchant data is used
> anywhere. The system is strictly defense-only: it detects and documents
> risk, and contains no offense-capable logic of any kind.

---

## Why this track, and why this shape

Track 01 (Agentic Commerce) needs live Razorpay test-mode API access to be
demonstrated honestly. Track 02 lets the whole loop — data generation,
model training, honest evaluation, real-time serving, and a merchant-facing
UI — be reproduced by anyone who clones this repo, with no external
credentials and no dependency on a third party being up. That reproducibility
is itself part of the "build quality" bar: `git clone`, run two scripts,
and the numbers on the dashboard are numbers you generated yourself.

## What it actually does

| Capability | Where |
|---|---|
| Real-time risk scoring with plain-language top factors | `POST /api/score`, **Score a Transaction** tab |
| Batch scoring of a CSV of transactions | `POST /api/batch-score` |
| Simulated live transaction stream | `GET /api/live-feed`, **Live Monitor** tab |
| Abuse-ring / fraud-spike alerting over a rolling window | `GET /api/alerts`, **Live Monitor** tab |
| Chargeback evidence response drafting | `POST /api/chargeback-response`, **Chargeback Assistant** tab |
| Honest held-out evaluation: ROC/PR curves, confusion matrix, cost-optimal threshold | `GET /api/metrics`, **Model Performance** tab |

## Architecture

```
                      ┌─────────────────────────┐
                      │   data_gen.py            │
                      │   synthetic transactions │
                      └────────────┬─────────────┘
                                   │ transactions.csv
                                   ▼
                      ┌─────────────────────────┐
                      │   train.py               │
                      │   GradientBoosting model │
                      │   time-based held-out    │
                      │   split + cost sweep     │
                      └────────────┬─────────────┘
                                   │ risk_model.joblib
                                   │ metrics.json
                                   ▼
 ┌───────────┐        ┌─────────────────────────┐        ┌──────────────┐
 │  React UI │◄──────►│   FastAPI backend        │        │  merchant's  │
 │  (Vite +  │  REST  │   risk_engine.py         │        │  own records │
 │  Tailwind │        │   live_feed.py           │        │  (evidence)  │
 │  Recharts)│        │   chargeback_responder.py│◄───────┤              │
 └───────────┘        └─────────────────────────┘        └──────────────┘
```

- **`backend/app/data_gen.py`** — generates a synthetic population of
  customer "identities" and devices, including a small ring of identities
  that deliberately share devices (the abuse-ring pattern), then simulates
  transactions with realistic fraud/chargeback signal (velocity, geo
  mismatch, new-account risk, CVV retries, prior chargebacks) plus noise, so
  the classification problem is realistic rather than trivially separable.
- **`backend/app/train.py`** — trains a `GradientBoostingClassifier` on a
  **time-based split** (train on the earliest 75% of days, test on the most
  recent 25%) so nothing from the test window leaks into training. Evaluates
  ROC-AUC, PR-AUC, and — the brief's explicit bar — a **cost-aware threshold
  sweep** using declared per-unit costs for a missed chargeback vs. a wrongly
  flagged genuine transaction, and picks the threshold that minimizes total
  modeled cost rather than defaulting to 0.5.
- **`backend/app/risk_engine.py`** — loads the trained pipeline and produces
  a score plus an approximate local explanation (global feature importance
  weighted by how unusual this transaction's values are). This is explicitly
  documented as an approximation, not a Shapley-value explanation — the API
  and UI both say so, rather than implying more rigor than it has.
- **`backend/app/live_feed.py`** — replays held-out synthetic transactions
  through the scoring path as if arriving in real time, and runs a rolling
  window abuse-ring / velocity-spike detector over them.
- **`backend/app/chargeback_responder.py`** — a rule-based, evidence-only
  drafting tool. It never fabricates evidence and always reports what's
  still missing before a dispute response would be submission-ready.
- **`frontend/`** — a Vite + React + Tailwind dashboard with five views:
  Overview, Live Monitor, Model Performance, Score a Transaction, and
  Chargeback Assistant.

## Honest numbers (from the included model)

On a held-out test set (most recent 25% of transactions by time, never seen
in training):

- **ROC-AUC ≈ 0.75**, **PR-AUC ≈ 0.26** at a ~5% base rate (a ~5x lift over
  random guessing on this task)
- At the cost-optimal threshold: **~63% recall at ~15% precision**
- Modeled savings vs. a "never flag anything" baseline: **≈ ₹9.8L** on the
  test window alone, using the declared cost assumptions in `train.py`

These numbers are deliberately not inflated. A model that hits 0.99 ROC-AUC
on a fraud problem this noisy is almost always leaking the label into the
features, not learning something real — see **"What broke, and what I did
about it"** below.

### What broke, and what I did about it

The first version of the synthetic data generator had two problems: (1) the
strongest latent risk signal — "this device is shared by a ring of
identities" — was baked into the label but never exposed as a feature the
model could actually see, and (2) the injected noise was large enough
relative to the signal that even a well-tuned model capped out at ROC-AUC
≈ 0.60, barely better than chance. Rather than quietly shipping a weak model,
I added `device_fp_identity_count` / `device_fp_txn_count` as engineered
features (computed the way a real risk engine would — counting identities
per device fingerprint) and re-tuned the signal-to-noise ratio in the
generator until the problem was realistically hard but learnable. ROC-AUC
went from 0.60 → 0.75 and PR-AUC roughly doubled. The honest-metrics bar in
the brief is exactly why this was worth fixing instead of leaving in.

## Running it locally

### Option A — Docker Compose (recommended, one command)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend docs (Swagger UI): http://localhost:8000/docs

### Option B — manually

**Backend**

```bash
cd backend
pip install -r requirements.txt
python app/data_gen.py   # generates backend/data/transactions.csv
python app/train.py      # trains the model, writes backend/models/*
uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a separate terminal)

```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:8000
npm run dev
```

Visit http://localhost:5173.

## Deploying it

- **Backend** — any container host works (Render, Railway, Fly.io, an EC2
  box). Build with `backend/Dockerfile`; it generates data and trains the
  model at image build time, so the container is ready to serve as soon as
  it starts. Expose port 8000.
- **Frontend** — build with `frontend/Dockerfile` (serves via nginx), or
  deploy the static `dist/` output from `npm run build` to Vercel/Netlify.
  Either way, set `VITE_API_URL` to your deployed backend's URL at build
  time.

## API reference

Full interactive docs are auto-generated by FastAPI at `/docs` once the
backend is running (Swagger UI) and `/redoc` (ReDoc).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/metrics` | Held-out evaluation report |
| GET | `/api/feature-importances` | Global feature importances |
| POST | `/api/score` | Score a single transaction |
| POST | `/api/batch-score` | Score a CSV of transactions |
| GET | `/api/live-feed?n=8` | Next batch of simulated live transactions |
| GET | `/api/alerts` | Current abuse-ring / fraud-spike alerts |
| POST | `/api/chargeback-response` | Draft a chargeback evidence response |
| GET | `/api/reset-feed` | Reset the live feed simulation |

## Project structure

```
riskguard-ai/
├── backend/
│   ├── app/
│   │   ├── data_gen.py            # synthetic transaction generator
│   │   ├── train.py                # training + honest evaluation
│   │   ├── risk_engine.py          # scoring + local explanations
│   │   ├── live_feed.py            # live simulation + alerting
│   │   ├── chargeback_responder.py # evidence-only response drafting
│   │   ├── schemas.py              # pydantic request/response models
│   │   └── main.py                 # FastAPI app
│   ├── data/                       # generated at build/run time
│   ├── models/                     # generated at build/run time
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/             # Overview, LiveMonitor, ModelPerformance,
│   │   │                           # ScoreTransaction, ChargebackAssistant, Sidebar
│   │   ├── lib/api.js               # API client
│   │   └── App.jsx
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── DEMO_SCRIPT.md                  # talking points for the walkthrough video
```

## Honest limitations

- The dataset is synthetic. The generator encodes well-known, publicly
  discussed fraud heuristics so the model has honest signal to learn from,
  but it is not trained on real transaction data and its absolute numbers
  shouldn't be read as "this is what accuracy looks like in production."
- The per-transaction explanation is a transparent heuristic (importance ×
  deviation from the training mean), not a Shapley-value explanation. It's
  labeled as such everywhere it appears.
- The chargeback cost assumptions (₹4,500 per missed chargeback, ₹180 per
  false positive) are stated, editable constants for the demo, not measured
  from a real merchant's books.
