import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Overview from "./components/Overview";
import LiveMonitor from "./components/LiveMonitor";
import ModelPerformance from "./components/ModelPerformance";
import ScoreTransaction from "./components/ScoreTransaction";
import ChargebackAssistant from "./components/ChargebackAssistant";
import { api } from "./lib/api";

const TITLES = {
  overview: "Overview",
  monitor: "Live Monitor",
  performance: "Model Performance",
  score: "Score a Transaction",
  chargeback: "Chargeback Assistant",
};

export default function App() {
  const [active, setActive] = useState("overview");
  const [metrics, setMetrics] = useState(null);
  const [featureImportances, setFeatureImportances] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([api.metrics(), api.featureImportances()])
      .then(([m, f]) => {
        setMetrics(m);
        setFeatureImportances(f);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar active={active} onNavigate={setActive} />
      <main className="flex-1 px-10 py-9 max-w-6xl">
        {loadError && (
          <div className="card p-5 border-signal-risk/40 text-signal-risk text-sm mb-6">
            Couldn't reach the RiskGuard API. Make sure the backend is running and
            <code className="mx-1 px-1.5 py-0.5 bg-ink-800 rounded">VITE_API_URL</code>
            points to it. ({loadError})
          </div>
        )}
        {active === "overview" && <Overview metrics={metrics} />}
        {active === "monitor" && <LiveMonitor />}
        {active === "performance" && <ModelPerformance metrics={metrics} featureImportances={featureImportances} />}
        {active === "score" && <ScoreTransaction />}
        {active === "chargeback" && <ChargebackAssistant />}
      </main>
    </div>
  );
}
