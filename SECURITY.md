# Security Policy

AlloFlow is built with the fundamental belief that student privacy is a non-negotiable human right. We prioritize robust architecture to ensure the software remains radically helpful without turning children into data products.

## Supported Versions

| Version / channel | Supported |
| ------- | ------------------ |
| Current `main` branch and latest local Desktop package work | :white_check_mark: |
| Older local snapshots or pre-Desktop builds | Best effort only |

## Architecture & Data Safety (FERPA-Aligned Design)

AlloFlow is designed to support school-controlled, FERPA-aligned deployments. The everyday local-first path is **AlloFlow Desktop**, which can keep the bundled app, local settings, local engine options, and same-room LAN classroom sessions on the teacher machine without Docker. The **School Box Server** Docker stack remains optional infrastructure for schools that need a server/appliance path. Compliance still depends on district policy, contracts, access controls, retention, consent, and actual use.

### 1. Zero-PII Cloud Policy
Even when using a cloud-hosted version of AlloFlow, ordinary saves use browser storage or downloaded project files rather than developer-owned student-profile databases. Live-session and optional sync behavior depends on the selected backend and deployment mode; those paths should stay data-minimized, short-lived, and school-controlled wherever possible.

### 2. The Fact-Chunk Pipeline
For highly sensitive tools like the **Report Writer Wizard** and **BehaviorLens**, the AI engine routes through an immutable "Fact-Chunk" pipeline. This pipeline scrubs incoming text of potential PII (names, specific locations) *before* passing it to the inference engine, drastically reducing the risk of data leakage or hallucinated test scores.

### 3. TeacherGate Authentication
Modules that process grading rubrics, answer keys, or Clinical ABA data are strictly locked behind `TeacherGate`. This prevents students from inadvertently (or purposefully) accessing sensitive pedagogical or disciplinary documentation intended for professionals.

## Reporting a Vulnerability

If you discover a vulnerability—especially one that could bypass `TeacherGate`, expose local-storage JSON payloads across origins, or leak PII via an improperly handled AI inference prompt—please report it immediately.

### How to Report:
1. Contact the primary maintainer directly.
2. Please include a clear description of the vulnerability and exactly how to reproduce it (e.g., "The STEM Lab module loader allows arbitrary XSS injection via the CDN hash parameterization").
3. DO NOT open a public GitHub Issue for critical security flaws until the patch has been tested and merged.

We will acknowledge receipt of your vulnerability report within 48 hours and strive to issue a patch to the main branch within 5 business days.

*Thank you for helping keep our schools and students safe.*
