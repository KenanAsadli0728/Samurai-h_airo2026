import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import DepartmentHeatmap from './components/DepartmentHeatmap';
import PhishingSimulator from './components/PhishingSimulator';
import EmployeeTable from './components/EmployeeTable';
import RiskTrendChart from './components/RiskTrendChart';
import DepartmentLeaderboard from './components/DepartmentLeaderboard';
import AutoTrainingPanel from './components/AutoTrainingPanel';
import Toast from './components/Toast';
import {
  generateEmployees,
  DEPARTMENT_DATA,
  RISK_TREND,
  TRAINING_MODULES,
} from './data/generateData';
import './App.css';

const CAMPAIGN_TARGETS = { emailsSent: 157, linksClicked: 23, incidentsReported: 4 };

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function App() {
  // Synthetic data — generated once, stays stable
  const [employees] = useState(() => generateEmployees());
  const [departments, setDepartments] = useState(DEPARTMENT_DATA);

  // UI state
  const [showIndividual, setShowIndividual] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'riskScore', direction: 'desc' });

  // Campaign state
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [campaignStats, setCampaignStats] = useState({ emailsSent: 0, linksClicked: 0, incidentsReported: 0 });

  // Toast
  const [toast, setToast] = useState({ message: '', visible: false });

  // Derived org score
  const orgRiskScore = useMemo(
    () => Math.round(departments.reduce((s, d) => s + d.score, 0) / departments.length),
    [departments]
  );

  const handleLaunchCampaign = () => {
    if (campaignRunning) return;
    setCampaignRunning(true);
    setCampaignStats({ emailsSent: 0, linksClicked: 0, incidentsReported: 0 });

    let step = 0;
    const totalSteps = 120; // 12 seconds @ 100 ms per tick

    const interval = setInterval(() => {
      step++;
      const progress = easeOut(step / totalSteps);

      setCampaignStats({
        emailsSent: Math.floor(CAMPAIGN_TARGETS.emailsSent * progress),
        linksClicked: Math.floor(CAMPAIGN_TARGETS.linksClicked * progress),
        incidentsReported: Math.floor(CAMPAIGN_TARGETS.incidentsReported * progress),
      });

      if (step >= totalSteps) {
        clearInterval(interval);
        // Finalize to exact targets
        setCampaignStats({ ...CAMPAIGN_TARGETS });
        setCampaignRunning(false);
        // Update Accounting's risk score
        setDepartments(prev =>
          prev.map(d =>
            d.name === 'Accounting'
              ? { ...d, score: Math.min(100, d.score + 9), reason: '40% clicked the last phishing test' }
              : d
          )
        );
        // Show toast
        setToast({ message: 'Accounting risk score increased — auto-training assigned.', visible: true });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        <Header orgRiskScore={orgRiskScore} campaignRunning={campaignRunning} />

        <DepartmentHeatmap departments={departments} />

        <PhishingSimulator
          onLaunch={handleLaunchCampaign}
          running={campaignRunning}
          stats={campaignStats}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RiskTrendChart data={RISK_TREND} />
          </div>
          <div>
            <DepartmentLeaderboard departments={departments} />
          </div>
        </div>

        <EmployeeTable
          employees={employees}
          departments={departments}
          showIndividual={showIndividual}
          onToggleIndividual={() => setShowIndividual(v => !v)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
        />

        <AutoTrainingPanel modules={TRAINING_MODULES} />

      </div>

      {/* Footer */}
      <footer data-testid="app-footer" className="text-center py-8 text-xs text-slate-500 border-t border-slate-900 mt-8 fade-in-up fade-in-up-7" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        HumanFirewall v1.0 &nbsp;·&nbsp; All data is synthetic &nbsp;·&nbsp; Privacy-by-design &nbsp;·&nbsp; AIIRO 2026
      </footer>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
