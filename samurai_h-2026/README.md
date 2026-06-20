# HumanFirewall

**Team:** samurai_h-2026  
**Competition:** AIIRO 2026  
**Category:** Cybersecurity / Human Risk Management

---

## What is HumanFirewall?

HumanFirewall is a Human Risk Management (HRM) platform that turns raw cybersecurity behavior data into actionable coaching insights. Rather than blocking threats at the network layer, HumanFirewall addresses the #1 attack vector: **your people**.

## The Problem

90% of successful cyberattacks start with a human mistake — a clicked phishing link, a reused password, a 2FA prompt accepted without thinking. Most organizations have:

- No visibility into which employees or departments are highest risk  
- Reactive security training (only triggered *after* an incident)  
- Individual naming-and-shaming that breeds resentment, not resilience  

## The Solution

HumanFirewall is a coaching platform, not a surveillance tool. It provides:

| Feature | What it does |
|---------|-------------|
| Org Risk Score | Single 0–100 score for the entire organization, color-coded green/amber/red |
| Department Heatmap | Risk cards for IT, Accounting, HR, Sales, Operations with one-line reasons |
| Phishing Campaign Simulator | Live drill with animated counters — emails sent, links clicked, incidents reported |
| Employee Risk Table | Privacy-first: aggregated by department by default; individual view is admin-gated |
| Risk Trend Chart | 8-week line chart showing improvement over time |
| Most-Improved Leaderboard | Ranks by *improvement*, not just raw score — positive, gamified framing |
| Auto-Training Panel | Training modules auto-assigned based on weak signals, with teal progress bars |

## Setup Instructions

### Prerequisites

- Node.js 18+  
- Yarn 1.x (`npm install -g yarn`)

### Install & Run

```bash
# Clone or unzip the submission, then:
cd samurai_h-2026
yarn install
yarn start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** All 60 employee records are synthetically generated in the browser on load — no server, no database, no real employee data.

## Project Structure

```
samurai_h-2026/
├── src/                     React app source
│   ├── components/          7 dashboard sections
│   ├── data/generateData.js Seeded synthetic data generator
│   ├── App.js               Main layout + state management
│   └── index.css            Tailwind + custom animations
├── docs/                    Architecture + ethical docs
├── data/sample-data.csv     60 synthetic employee records
├── demo/demo-video-link.txt Demo video link
└── presentation/            Pitch deck
```

## Tech Stack

- **React 18** — component-based UI, all state in-memory  
- **Tailwind CSS** — dark SOC aesthetic, strict color system  
- **Recharts** — lightweight risk trend line chart  
- **Lucide React** — icon set  
- **100% client-side** — zero API calls, zero persistence

## Design Philosophy

> "A coaching tool, not a surveillance tool."

- **Privacy-by-design:** aggregated department views by default
- **Positive framing:** leaderboard ranks by improvement, not shame  
- **Monospace numerics:** scores rendered in JetBrains Mono for SOC feel  
- **Coaching micro-copy:** never punitive language anywhere in the UI

## License

MIT — see LICENSE
