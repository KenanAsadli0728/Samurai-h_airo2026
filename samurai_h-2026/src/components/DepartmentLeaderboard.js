import React from 'react';
import { Trophy, ArrowDown } from 'lucide-react';
import { getRiskLevel, RISK_CLASSES } from '../data/generateData';

const MEDALS = [
  { color: '#FFD700', label: '1st' },
  { color: '#C0C0C0', label: '2nd' },
  { color: '#CD7F32', label: '3rd' },
  { color: '#64748b', label: '4th' },
  { color: '#475569', label: '5th' },
];

export default function DepartmentLeaderboard({ departments }) {
  const ranked = [...departments]
    .map(d => ({ ...d, improvement: d.previousScore - d.score }))
    .sort((a, b) => b.improvement - a.improvement);

  return (
    <div data-testid="department-leaderboard" className="rounded-xl bg-slate-900 border border-slate-800 p-6 h-full flex flex-col fade-in-up fade-in-up-4">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-amber-400" />
        <div>
          <h2 className="text-base font-semibold text-slate-200">Most Improved</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ranked by risk reduction — celebrate progress</p>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {ranked.map((dept, i) => {
          const level = getRiskLevel(dept.score);
          const classes = RISK_CLASSES[level];
          const medal = MEDALS[i];

          return (
            <div
              key={dept.name}
              data-testid={`leaderboard-row-${dept.name.toLowerCase()}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 hover:bg-slate-800/70 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: `${medal.color}18`, color: medal.color }}
              >
                {medal.label}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-200">{dept.name}</div>
                <div className="text-xs text-slate-600 truncate">{dept.previousScore} → {dept.score}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  <ArrowDown className="w-3 h-3" />
                  {dept.improvement}
                </div>
                <div className={`text-xs ${classes.text}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  score {dept.score}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-700 mt-4 text-center">
        Every point down is a win for the whole team
      </p>
    </div>
  );
}
