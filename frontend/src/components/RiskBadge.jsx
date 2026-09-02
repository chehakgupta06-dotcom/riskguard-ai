const BAND_STYLES = {
  low: "bg-signal-safe/15 text-signal-safe border-signal-safe/30",
  medium: "bg-signal-watch/15 text-signal-watch border-signal-watch/30",
  high: "bg-signal-risk/15 text-signal-risk border-signal-risk/30",
  critical: "bg-signal-critical/20 text-red-300 border-signal-critical/50",
};

const DECISION_STYLES = {
  approve: "text-signal-safe",
  review: "text-signal-watch",
  block: "text-signal-risk",
};

export function RiskBadge({ band }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-mono uppercase tracking-wider ${BAND_STYLES[band] || BAND_STYLES.medium}`}>
      {band}
    </span>
  );
}

export function DecisionTag({ decision }) {
  const icon = decision === "approve" ? "\u2713" : decision === "review" ? "\u25B3" : "\u2715";
  return (
    <span className={`font-mono text-sm font-semibold ${DECISION_STYLES[decision] || ""}`}>
      {icon} {decision}
    </span>
  );
}
