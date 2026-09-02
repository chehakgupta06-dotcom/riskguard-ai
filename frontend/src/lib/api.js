const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  metrics: () => request("/api/metrics"),
  featureImportances: () => request("/api/feature-importances"),
  score: (payload, threshold) =>
    request(`/api/score${threshold ? `?threshold=${threshold}` : ""}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  liveFeed: (n = 8) => request(`/api/live-feed?n=${n}`),
  alerts: () => request("/api/alerts"),
  chargebackResponse: (payload) =>
    request("/api/chargeback-response", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetFeed: () => request("/api/reset-feed"),
};

export { BASE_URL };
