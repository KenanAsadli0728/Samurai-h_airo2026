import React from 'react';
import { Shield, Activity, Wifi } from 'lucide-react';
import { getRiskLevel, RISK_CLASSES } from '../data/generateData';

export default function Header({ orgRiskScore, campaignRunning }) {
  const level = getRiskLevel(orgRiskScore);
  const classes = RISK_CLASSES[level];
  const levelLabel = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' }[level];

  return (
    <header data-testid="header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-800 fade-in-up">
      {/* Wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            HumanFirewall
          </h1>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Human Risk Management Platform
          </p>
        </div>
      </div>

      {/* Right side: campaign status + org score */}
      <div className="flex items-center gap-5">
        {campaignRunning ? (
          <div
            data-testid="campaign-status-active"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 pulse-glow"
          >
            <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Campaign in progress
            </span>
          </div>
        ) : (
          <div
            data-testid="campaign-status-idle"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700"
          >
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              No active campaign
            </span>
          </div>
        )}

        {/* Org Risk Score */}
        <div data-testid="org-risk-score" className="text-right">
          <div
            className={`text-5xl font-bold tracking-tighter ${classes.text}`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {orgRiskScore}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-xs text-slate-500">Org Risk Score</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-semibold ${classes.bg} ${classes.text}`}
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
              data-testid="risk-level-badge"
            >
              {levelLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
