# The Human Risk Problem in Cybersecurity

## Background

Despite billions spent on firewalls, endpoint detection, and SIEM platforms, one attack vector consistently bypasses technical controls: **human error**.

The Verizon Data Breach Investigations Report consistently finds that over 74% of breaches involve a human element — phishing clicks, credential sharing, accidental misconfiguration. The threat is not just external adversaries; it is the gap between security policy and actual human behavior inside organizations.

## Current Pain Points

### 1. No Behavioral Visibility

Most organizations measure *compliance* (did the employee complete the training?) but not *behavior* (does the employee click phishing links?). These are fundamentally different metrics, and conflating them creates dangerous blind spots in the security posture.

### 2. Reactive Training

Security training is typically triggered after a breach or as an annual checkbox exercise. By the time training is assigned post-incident, the risky behavior has already caused damage. Organizations need *proactive* behavioral signals.

### 3. Punitive Culture

Naming and shaming individuals who click a phishing test or use a weak password creates a culture of fear and silence. Employees learn to hide mistakes rather than report them. This is the opposite of the psychological safety needed for a security-aware organization.

### 4. Aggregation Gap

Security leaders need *departmental* and *behavioral* insights, not just raw individual access logs. Most SIEM/DLP tools produce either overwhelming individual-level data or oversimplified summary statistics that hide the nuance.

## How HumanFirewall Addresses These Problems

| Problem | HumanFirewall Solution |
|---------|------------------------|
| No behavioral visibility | Automated phishing simulations + 5-signal risk scoring per employee |
| Reactive training | Weak-signal detection triggers auto-assignment of targeted modules |
| Punitive culture | Privacy-by-default; leaderboard ranks by *improvement*; no individual notifications |
| Aggregation gap | Department heatmap with individual drill-down gated behind admin toggle |

## Key Risk Signals Tracked

HumanFirewall monitors five behavioral signals per employee:

1. **Phishing simulation click rate** — did the employee click the simulated link?
2. **Two-factor authentication status** — is 2FA enabled on all critical accounts?
3. **Password hygiene score** — derived from credential strength assessment
4. **Time since last security training** — recency matters for retention
5. **Incident reporting rate** — a *positive* signal: are employees speaking up?

## Target Users

| Role | Primary Use |
|------|-------------|
| CISO / Security Manager | Real-time org risk overview, trend monitoring |
| HR Business Partner | Department-level coaching without individual surveillance |
| IT Administrator | 2FA adoption and credential hygiene dashboards |
| Department Manager | Gamified improvement leaderboard, team training progress |

## Impact

A platform like HumanFirewall enables organizations to shift from a reactive, compliance-checkbox security culture to a **proactive, coaching-led security culture** — where every employee is treated as a potential last line of defense, not a security liability.

---

*Document prepared for AIIRO 2026 hackathon submission by team samurai_h-2026.*
