import React, { useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { getRiskLevel, RISK_CLASSES } from '../data/generateData';

function RiskBadge({ score }) {
  const level = getRiskLevel(score);
  const c = RISK_CLASSES[level];
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${c.text} ${c.badgeBg}`}
      style={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      {score}
    </span>
  );
}

function SortIcon({ field, sortConfig }) {
  if (sortConfig.key !== field) return <ChevronDown className="w-3 h-3 text-slate-600 ml-1" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-cyan-400 ml-1" />
    : <ChevronDown className="w-3 h-3 text-cyan-400 ml-1" />;
}

function SortTh({ label, field, sortConfig, onSort, className = '' }) {
  return (
    <th
      className={`py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sortConfig={sortConfig} />
      </span>
    </th>
  );
}

function AggregatedRow({ dept, employees }) {
  const emps = employees.filter(e => e.department === dept.name);
  const avg = fn => Math.round(emps.reduce((s, e) => s + e[fn], 0) / emps.length);
  const twoFAPct = Math.round(emps.filter(e => e.twoFAEnabled).length / emps.length * 100);

  return (
    <tr
      data-testid={`dept-row-${dept.name.toLowerCase()}`}
      className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
    >
      <td className="py-3 px-4 font-semibold text-slate-200">{dept.name}</td>
      <td className="py-3 px-4"><RiskBadge score={avg('riskScore')} /></td>
      <td className="py-3 px-4 text-slate-300" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {avg('phishingClickRate')}%
      </td>
      <td className="py-3 px-4">
        <span className={twoFAPct > 80 ? 'text-emerald-400' : twoFAPct > 60 ? 'text-amber-400' : 'text-red-400'}>
          {twoFAPct}% enabled
        </span>
      </td>
      <td className="py-3 px-4 text-slate-300" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {avg('passwordHygieneScore')}/100
      </td>
      <td className="py-3 px-4 text-slate-500 text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {emps.length} employees
      </td>
    </tr>
  );
}

export default function EmployeeTable({
  employees, departments, showIndividual, onToggleIndividual,
  searchQuery, onSearchChange, sortConfig, onSortChange,
}) {
  const handleSort = key => {
    onSortChange({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const sorted = useMemo(() => {
    let list = showIndividual
      ? employees.filter(e => {
          const q = searchQuery.toLowerCase();
          return e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
        })
      : employees;

    return [...list].sort((a, b) => {
      const m = sortConfig.direction === 'asc' ? 1 : -1;
      if (sortConfig.key === 'name') return m * a.name.localeCompare(b.name);
      return m * (a[sortConfig.key] - b[sortConfig.key]);
    });
  }, [employees, searchQuery, showIndividual, sortConfig]);

  return (
    <section data-testid="employee-table-section" className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden fade-in-up fade-in-up-5">
      {/* Toolbar */}
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Employee Risk Table</h2>
          <p className="text-sm text-slate-500 mt-1">
            {showIndividual
              ? 'Individual scores — handle with care'
              : 'Aggregated by department — privacy protected by default'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showIndividual && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                data-testid="employee-search"
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="pl-8 pr-4 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 w-48"
              />
            </div>
          )}
          <button
            data-testid="toggle-individual-btn"
            onClick={onToggleIndividual}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all whitespace-nowrap"
          >
            {showIndividual ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showIndividual ? 'Hide individual scores' : 'Show individual scores (admin only)'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="risk-table">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40">
              <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {showIndividual ? 'Employee' : 'Department'}
              </th>
              <SortTh label="Risk Score" field="riskScore" sortConfig={sortConfig} onSort={handleSort} />
              <SortTh label="Phishing Click Rate" field="phishingClickRate" sortConfig={sortConfig} onSort={handleSort} />
              <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">2FA</th>
              <SortTh label="Pwd Hygiene" field="passwordHygieneScore" sortConfig={sortConfig} onSort={handleSort} />
              <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Training</th>
            </tr>
          </thead>
          <tbody>
            {showIndividual
              ? sorted.map(emp => (
                  <tr
                    key={emp.id}
                    data-testid={`employee-row-${emp.id}`}
                    className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{emp.name}</div>
                          <div className="text-xs text-slate-500">{emp.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><RiskBadge score={emp.riskScore} /></td>
                    <td className="py-3 px-4 text-slate-300" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {emp.phishingClickRate}%
                    </td>
                    <td className="py-3 px-4">
                      {emp.twoFAEnabled
                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Enabled</span>
                        : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3.5 h-3.5" /> Disabled</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-300" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {emp.passwordHygieneScore}/100
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {emp.lastTrainingDate}
                    </td>
                  </tr>
                ))
              : departments.map(dept => (
                  <AggregatedRow key={dept.name} dept={dept} employees={employees} />
                ))}
          </tbody>
        </table>
      </div>

      {showIndividual && (
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/20">
          <span className="text-xs text-slate-600">
            {sorted.length} of {employees.length} employees shown
          </span>
        </div>
      )}
    </section>
  );
}
