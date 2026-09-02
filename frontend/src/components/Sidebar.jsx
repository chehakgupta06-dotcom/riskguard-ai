const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "monitor", label: "Live Monitor" },
  { id: "performance", label: "Model Performance" },
  { id: "score", label: "Score a Transaction" },
  { id: "chargeback", label: "Chargeback Assistant" },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="w-64 shrink-0 border-r border-ink-600/60 flex flex-col h-screen sticky top-0">
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-glow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 6v6c0 5.2 3.8 9.9 9 11 5.2-1.1 9-5.8 9-11V6l-9-4z" fill="#0A0906" />
            </svg>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight text-cream-50">RiskGuard</span>
        </div>
        <p className="text-[11px] text-cream-300/70 mt-1.5 pl-[42px]">AI Risk Manager · Razorpay Track 02</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
              active === item.id
                ? "bg-ember-500/12 text-ember-400 font-medium"
                : "text-cream-200/80 hover:bg-ink-800/80 hover:text-cream-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-ink-600/60">
        <p className="text-[11px] leading-relaxed text-cream-300/60">
          Strictly defense-only. No offense-capable logic. All data on this
          screen is synthetic.
        </p>
      </div>
    </aside>
  );
}
