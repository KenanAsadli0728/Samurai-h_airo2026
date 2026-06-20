import React from 'react';
import { BookOpen, Users, Clock } from 'lucide-react';

function ProgressBar({ progress }) {
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-teal-500 transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function AutoTrainingPanel({ modules }) {
  return (
    <section data-testid="auto-training-panel" className="rounded-xl bg-slate-900 border border-slate-800 p-6 fade-in-up fade-in-up-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-200">Auto-Assigned Training</h2>
            <p className="text-sm text-slate-500 mt-1">
              Nudging your team toward better habits — not punishing them
            </p>
          </div>
        </div>
        <span
          className="text-xs text-teal-400 px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {modules.filter(m => m.status === 'in-progress').length} active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(mod => (
          <div
            key={mod.id}
            data-testid={`training-module-${mod.id}`}
            className="p-4 rounded-lg bg-slate-800/40 border border-slate-800 hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-200 leading-snug">{mod.name}</h3>
              <span
                className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold ${
                  mod.status === 'in-progress'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-slate-700 text-slate-500 border border-slate-700'
                }`}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {mod.status === 'in-progress' ? 'Active' : 'Pending'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">{mod.description}</p>

            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500">{mod.completed}/{mod.enrolled} completed</span>
                <span className="text-teal-400 font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {mod.progress}%
                </span>
              </div>
              <ProgressBar progress={mod.progress} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Users className="w-3 h-3" />
                <span>{mod.assignedTo}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="w-3 h-3" />
                <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{mod.dueDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
