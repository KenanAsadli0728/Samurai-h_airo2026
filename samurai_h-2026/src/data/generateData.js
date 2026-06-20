// Seeded RNG — ensures deterministic synthetic data every load
function mulberry32(seed) {
  return function () {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randomDate(rng, daysBack) {
  const d = new Date(2025, 1, 20); // anchor to Feb 20 2025
  d.setDate(d.getDate() - Math.floor(rng() * daysBack));
  return d.toISOString().split('T')[0];
}

const DEPT_PROFILES = {
  IT:         { avgRisk: 32, spread: 14, clickAvg: 8,  clickSpread: 6,  twoFARate: 0.92, pwdBase: 83 },
  Accounting: { avgRisk: 68, spread: 13, clickAvg: 40, clickSpread: 14, twoFARate: 0.60, pwdBase: 56 },
  HR:         { avgRisk: 52, spread: 13, clickAvg: 28, clickSpread: 11, twoFARate: 0.73, pwdBase: 67 },
  Sales:      { avgRisk: 61, spread: 13, clickAvg: 35, clickSpread: 12, twoFARate: 0.65, pwdBase: 62 },
  Operations: { avgRisk: 48, spread: 13, clickAvg: 22, clickSpread: 9,  twoFARate: 0.78, pwdBase: 71 },
};

const NAMES = {
  IT: [
    ['Alex', 'Chen'], ['Jordan', 'Wu'], ['Sam', 'Park'], ['Riley', 'Kim'],
    ['Casey', 'Nguyen'], ['Drew', 'Lee'], ['Morgan', 'Patel'], ['Avery', 'Zhang'],
    ['Quinn', 'Foster'], ['Blake', 'Morrison'], ['Harper', 'Singh'], ['Sage', 'Williams'],
  ],
  Accounting: [
    ['Diana', 'Torres'], ['Marcus', 'Johnson'], ['Priya', 'Sharma'], ['Kevin', 'Brown'],
    ['Laura', 'Davis'], ['Michael', 'Wilson'], ['Sandra', 'Garcia'], ['Robert', 'Martinez'],
    ['Jennifer', 'Anderson'], ['William', 'Thompson'], ['Patricia', 'Jackson'], ['James', 'White'],
  ],
  HR: [
    ['Emma', 'Rodriguez'], ['Noah', 'Martinez'], ['Olivia', 'Harris'], ['Liam', 'Clark'],
    ['Sophia', 'Lewis'], ['Mason', 'Scott'], ['Isabella', 'Young'], ['Ethan', 'Hall'],
    ['Mia', 'Allen'], ['Lucas', 'Wright'], ['Charlotte', 'King'], ['Aiden', 'Lopez'],
  ],
  Sales: [
    ['Ryan', 'Mitchell'], ['Jessica', 'Turner'], ['Brandon', 'Hill'], ['Ashley', 'Adams'],
    ['Tyler', 'Nelson'], ['Amber', 'Carter'], ['Justin', 'Phillips'], ['Megan', 'Evans'],
    ['Derek', 'Collins'], ['Brittney', 'Stewart'], ['Aaron', 'Morris'], ['Heather', 'Rogers'],
  ],
  Operations: [
    ['Victor', 'Gonzalez'], ['Maria', 'Perez'], ['John', 'Robinson'], ['Linda', 'Walker'],
    ['Frank', 'Jackson'], ['Patricia', 'White'], ['George', 'Harris'], ['Barbara', 'Martin'],
    ['Edward', 'Thompson'], ['Susan', 'Taylor'], ['Paul', 'Moore'], ['Janet', 'Anderson'],
  ],
};

const DEPARTMENTS_ORDER = ['IT', 'Accounting', 'HR', 'Sales', 'Operations'];

export function generateEmployees() {
  const rng = mulberry32(2026);
  const employees = [];
  let id = 1;

  for (const dept of DEPARTMENTS_ORDER) {
    const p = DEPT_PROFILES[dept];
    for (const [firstName, lastName] of NAMES[dept]) {
      const riskScore = clamp(Math.round(p.avgRisk + (rng() - 0.5) * 2 * p.spread), 10, 95);
      const phishingClickRate = clamp(Math.round(p.clickAvg + (rng() - 0.5) * 2 * p.clickSpread), 0, 80);
      const twoFAEnabled = rng() < p.twoFARate;
      const passwordHygieneScore = clamp(Math.round(p.pwdBase + (rng() - 0.5) * 20), 20, 99);
      const lastTrainingDate = randomDate(rng, 180);

      employees.push({
        id: id++,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        department: dept,
        riskScore,
        phishingClickRate,
        twoFAEnabled,
        passwordHygieneScore,
        lastTrainingDate,
      });
    }
  }
  return employees;
}

export function getRiskLevel(score) {
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

export const RISK_CLASSES = {
  low: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badgeBg: 'bg-emerald-500/20',
    hex: '#34d399',
  },
  medium: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badgeBg: 'bg-amber-500/20',
    hex: '#fbbf24',
  },
  high: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    badgeBg: 'bg-red-500/20',
    hex: '#f87171',
  },
};

export const DEPARTMENT_DATA = [
  { name: 'IT',         score: 32, previousScore: 42, reason: '8% phishing click rate — top-performing team' },
  { name: 'Accounting', score: 68, previousScore: 74, reason: '40% clicked the last phishing test' },
  { name: 'HR',         score: 52, previousScore: 64, reason: '28% clicked simulated phishing links' },
  { name: 'Sales',      score: 61, previousScore: 70, reason: '35% click rate, 65% 2FA adoption' },
  { name: 'Operations', score: 48, previousScore: 62, reason: '22% click rate, improving with training' },
];

export const RISK_TREND = [
  { week: 'Wk 1', score: 65 },
  { week: 'Wk 2', score: 63 },
  { week: 'Wk 3', score: 64 },
  { week: 'Wk 4', score: 60 },
  { week: 'Wk 5', score: 58 },
  { week: 'Wk 6', score: 55 },
  { week: 'Wk 7', score: 53 },
  { week: 'Wk 8', score: 51 },
];

export const TRAINING_MODULES = [
  {
    id: 1,
    name: 'Phishing Awareness Training',
    description: 'Spot social engineering tactics before they land',
    assignedTo: 'Accounting',
    enrolled: 12,
    completed: 9,
    progress: 75,
    dueDate: '2025-02-28',
    status: 'in-progress',
  },
  {
    id: 2,
    name: 'Strong Password Fundamentals',
    description: 'Building habits that keep credentials safe',
    assignedTo: 'All Departments',
    enrolled: 60,
    completed: 27,
    progress: 45,
    dueDate: '2025-02-25',
    status: 'in-progress',
  },
  {
    id: 3,
    name: '2FA Setup & Best Practices',
    description: 'Two-factor is your best line of defense',
    assignedTo: 'Accounting, Sales',
    enrolled: 24,
    completed: 15,
    progress: 62,
    dueDate: '2025-03-05',
    status: 'in-progress',
  },
  {
    id: 4,
    name: 'Social Engineering Defense',
    description: 'Recognize and report suspicious requests',
    assignedTo: 'HR, Sales',
    enrolled: 24,
    completed: 8,
    progress: 33,
    dueDate: '2025-03-10',
    status: 'pending',
  },
  {
    id: 5,
    name: 'Data Classification & Handling',
    description: 'Keep sensitive data in the right hands',
    assignedTo: 'All Departments',
    enrolled: 60,
    completed: 34,
    progress: 56,
    dueDate: '2025-03-15',
    status: 'in-progress',
  },
];
