import React from 'react';
import { Send, MousePointer, Flag, Zap } from 'lucide-react';

const TARGETS = { emailsSent: 157, linksClicked: 23, incidentsReported: 4 };

function StatCounter({ value, max, label, icon: Icon, color, bgColor, barColor }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div data-testid={`counter-${label.replace(/\s+/g, '-').toLowerCase()}`} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div
        className={`text-4xl font-bold tracking-tighter ${color}`}
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        {value.toLocaleString()}
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-600">of {max}</span>
          <span className={`${color}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{pct}%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PhishingSimulator({ onLaunch, running, stats }) {
  const done = stats.emailsSent >= TARGETS.emailsSent && !running;

  return (
    <section data-testid="phishing-simulator" className="rounded-xl bg-slate-900 border border-slate-800 p-6 fade-in-up fade-in-up-3">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Phishing Campaign Simulator</h2>
          <p className="text-sm text-slate-500 mt-1">
            {running
              ? 'Campaign running — watching how employees respond in real time...'
              : done
              ? 'Simulation complete. Auto-training assigned to at-risk employees.'
              : "Send a realistic simulated phishing email to your team — see who bites."}
          </p>
        </div>
        <button
          data-testid="launch-campaign-btn"
          onClick={onLaunch}
          disabled={running}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0
            ${running
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 shadow-lg shadow-cyan-500/20'
            }`}
        >
          <Zap className="w-4 h-4" />
          {running ? 'Campaign Running...' : 'Launch Simulated Phishing Campaign'}
        </button>
      </div>

      {/* Counter grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 border-t border-slate-800">
        <StatCounter
          value={stats.emailsSent}
          max={TARGETS.emailsSent}
          label="Emails Sent"
          icon={Send}
          color="text-cyan-400"
          barColor="bg-cyan-500"
        />
        <StatCounter
          value={stats.linksClicked}
          max={TARGETS.linksClicked}
          label="Links Clicked"
          icon={MousePointer}
          color="text-amber-400"
          barColor="bg-amber-500"
        />
        <StatCounter
          value={stats.incidentsReported}
          max={TARGETS.incidentsReported}
          label="Incidents Reported"
          icon={Flag}
          color="text-emerald-400"
          barColor="bg-emerald-500"
        />
      </div>
    </section>
  );
}
