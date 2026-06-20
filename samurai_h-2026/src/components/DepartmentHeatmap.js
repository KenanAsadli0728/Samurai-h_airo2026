import React from 'react';
import { Server, Calculator, Users, TrendingUp, Settings } from 'lucide-react';
import { getRiskLevel, RISK_CLASSES } from '../data/generateData';

const DEPT_ICONS = {
  IT: Server,
  Accounting: Calculator,
  HR: Users,
  Sales: TrendingUp,
  Operations: Settings,
};

export default function DepartmentHeatmap({ departments }) {
  return (
    <section data-testid="department-heatmap">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-200">Department Risk Overview</h2>
        <span className="text-xs text-slate-600" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          5 departments
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {departments.map((dept, i) => {
          const level = getRiskLevel(dept.score);
          const classes = RISK_CLASSES[level];
          const Icon = DEPT_ICONS[dept.name];

          return (
            <div
              key={dept.name}
              data-testid={`dept-card-${dept.name.toLowerCase()}`}
              className={`rounded-xl p-5 border ${classes.bg} ${classes.border} transition-all duration-200 hover:scale-[1.02] cursor-default fade-in-up fade-in-up-${i + 1}`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${classes.text}`} />
                <span
                  className={`text-2xl font-bold ${classes.text}`}
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  data-testid={`dept-score-${dept.name.toLowerCase()}`}
                >
                  {dept.score}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200">{dept.name}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{dept.reason}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
