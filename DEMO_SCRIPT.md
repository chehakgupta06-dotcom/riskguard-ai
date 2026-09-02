# Demo Video Script (~5 minutes)

Structure the video around the four things they said they judge:
**problem taste, build quality, AI judgment, failure recovery.** Don't
narrate a feature tour — narrate a decision tour.

---

## 0:00–0:40 — The problem, in one line

> "Razorpay's brief says AI-enabled fraud is hitting Indian BFSI while
> returns and chargebacks quietly eat margin. I picked the version of that
> problem with a real dollar figure attached: for every transaction a
> merchant approves, there's a cost if it's fraudulent, and a *different*
> cost if you wrongly block a genuine customer. Most fraud demos show you
> a score. I wanted to show the trade-off underneath the score."

Show the **Overview** tab. Point at the cost curve — say out loud that the
threshold isn't a guess, it's the minimum of a real cost function.

## 0:40–1:30 — Architecture, fast

Screen-share the README architecture diagram or just narrate over the repo
tree for 20 seconds: synthetic data generator → time-split training with a
cost-aware threshold sweep → FastAPI serving layer → React dashboard. Say
explicitly: *"train on the earliest 75% of days, test on the most recent
25% — nothing from the future leaks into training."* This single sentence
is doing a lot of "build quality" work — say it clearly.

## 1:30–2:30 — Score a live transaction

Go to **Score a Transaction**. Load the "suspicious example" preset, submit
it, and narrate the response as it renders: risk score, band, decision, and
the top four contributing factors. Then load the "ordinary example" and
show it clears at a low score. The point: the model isn't just flagging
everything, and it isn't a black box — say what the "approximate
explanation, not SHAP" label actually means and why you didn't oversell it.

## 2:30–3:15 — Live Monitor and the abuse-ring alert

Switch to **Live Monitor**, let it run for ~15 seconds so a few transactions
stream in. If an abuse-ring or fraud-spike alert fires, narrate what
triggered it (multiple identities sharing one device fingerprint in a short
window) — this is the "abuse-ring sentinel" direction from the brief, and
it's worth 15 seconds of screen time on its own.

## 3:15–4:00 — Chargeback Assistant

Switch to **Chargeback Assistant**. Fill in a "goods not received" dispute,
toggle "delivery proof available" on and off once each, and show the draft
changing to say what's still missing. Say explicitly: *"this never invents
evidence — it only organizes what's on record, and it tells you when you're
not ready to submit."* This is the moment to say the word "defense-only"
out loud, since the brief disqualifies anything offense-capable.

## 4:00–4:40 — Model Performance and the honest-metrics bar

Switch to **Model Performance**. Show the ROC/PR curves and the confusion
matrix at the chosen threshold. Say the actual numbers out loud — ROC-AUC
≈ 0.75, PR-AUC ≈ 0.26 at a ~5% base rate — and say why you're not chasing a
higher number: *"a fraud model claiming 0.99 AUC on a problem this noisy is
usually leaking the label, not learning something real."*

## 4:40–5:00 — Failure recovery, in your own words

This is the highest-leverage 20 seconds of the video. Tell the true story
briefly: *"my first pass at the generator baked the strongest risk signal —
shared devices across a ring of identities — into the label, but never
exposed it as a feature. The model capped out around 0.60 AUC. I noticed it
because the honest-metrics bar in the brief made a weak number visible
instead of something to paper over, added the device-reuse features a real
risk engine would compute, retuned the signal-to-noise ratio, and AUC went
to 0.75."* Then stop talking and let the last shot be the Overview tab.

---

## Things to *say out loud* at least once, verbatim-ish

- "Time-based split, not a random shuffle — no leakage from the future."
- "This is an approximate local explanation, not a Shapley value — I didn't
  want to oversell it."
- "Strictly defense-only — it documents evidence, it never fabricates it."
- "The threshold isn't a guess, it's the minimum of a real cost curve."

## Things to avoid

- Don't claim the synthetic data "is" real fraud data — say synthetic, every
  time it comes up.
- Don't let the AUC numbers go by without saying what they mean relative to
  the base rate (a 5% base-rate problem is not the same difficulty as a
  50/50 problem — say the lift, not just the raw number).
- Don't spend more than 20 seconds on any one screen before saying why it
  matters — the reviewers said they read the work, not the resume; give
  them reasoning, not a click-through.

## Recording checklist

1. Run `docker compose up --build` (or start backend + frontend manually)
   fresh, so the model in the demo is reproducible from the repo as-is.
2. Reset the live feed (`GET /api/reset-feed` or the Reset button) right
   before recording, so the alert you show is one that fires live, not a
   pre-seeded one.
3. Record in a resolution where the Recharts labels are legible (1080p
   minimum).
4. Keep the terminal/README architecture diagram ready in a second tab for
   the 0:40 section — don't fumble finding it live.
