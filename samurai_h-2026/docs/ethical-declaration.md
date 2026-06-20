# Ethical Declaration

## HumanFirewall — Ethical Principles & Privacy Commitment

**Team:** samurai_h-2026  
**Competition:** AIIRO 2026 Hackathon  
**Date:** February 2026

---

## 1. All Data is Synthetic

Every employee name, department assignment, risk score, and behavioral signal shown in this demonstration is **100% synthetically generated** using a deterministic seeded random number generator (`mulberry32`, seed: 2026).

- No real employee data has been used, collected, stored, or transmitted at any point during development or demonstration.
- The 60 synthetic employee profiles were algorithmically generated with no resemblance to real individuals intended or implied.
- The synthetic data is generated client-side in the user's browser and never leaves the device.

## 2. Privacy-by-Design

HumanFirewall implements **privacy-by-design** principles at the architectural level, not as an afterthought:

| Privacy Principle | Implementation |
|-------------------|----------------|
| **Data minimization** | Individual scores are hidden by default; only department aggregates shown |
| **Access control** | Individual view requires an explicit "admin only" toggle — signals elevated permission needed |
| **No persistence** | Zero data saved to database, cookie, localStorage, or any storage medium |
| **No network requests** | Dashboard makes zero API calls; all computation runs locally in the browser |
| **Anonymization by default** | Aggregated views cannot be used to identify individuals |

## 3. This is a Coaching Tool, Not Surveillance

HumanFirewall is explicitly designed as a **coaching and positive-reinforcement platform**:

- The leaderboard ranks departments by **improvement over time**, not absolute scores — rewarding progress, not shaming those who are behind
- UI micro-copy uses exclusively positive, coaching language (e.g., "Nudging your team toward better habits — not punishing them")
- No alerts, push notifications, or individual-facing score disclosures are implemented or planned without explicit employee consent and HR oversight
- Risk scores are intended to trigger *training assignments*, never disciplinary action

## 4. Intended Use in Production

If this prototype were deployed in a real organization, the following safeguards are **strongly recommended**:

### Employee Consent & Transparency
- Inform all employees that simulated phishing campaigns will occur, the purpose (training, not entrapment), and how data is used
- Publish an internal security awareness policy document accessible to all staff

### Data Governance
- Ensure individual risk scores are accessible only to HR and Security roles with a documented, justified business need
- Implement role-based access control (RBAC) on all individual-level views
- Apply data retention limits — behavioral scores should not persist beyond a defined period (e.g., 12 months)

### Legal Compliance
- Conduct a DPIA (Data Protection Impact Assessment) before deployment in any EU jurisdiction
- Comply with GDPR Article 22 (automated decision-making) if scores influence employment decisions
- Comply with CCPA, PDPA, or equivalent applicable data protection law

### Prohibitions
- The platform must **not** be used as grounds for disciplinary action or termination
- Individual scores must **not** be shared with direct line managers without HR oversight
- Phishing simulations must **not** exploit emotionally sensitive topics (health crises, bereavement, financial distress)

## 5. Declaration

We, team samurai_h-2026, declare to the best of our knowledge:

- [x] No real employee names, emails, or identifiers were used
- [x] No organizational data was scraped, purchased, or obtained from any third party
- [x] The 60 synthetic employees were generated algorithmically with no resemblance to real individuals intended
- [x] The phishing simulation is purely demonstrative and does not send real emails
- [x] The platform makes no network requests and stores no data
- [x] All design decisions were made with the explicit goal of coaching, not surveillance

---

*This declaration was written in good faith by the samurai_h-2026 team for the AIIRO 2026 hackathon. We are committed to responsible AI development and human-centered security design.*
