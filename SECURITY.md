# Security Policy

AlloFlow is built with the fundamental belief that student privacy is a non-negotiable human right. We prioritize robust architecture to ensure the software remains radically helpful without turning children into data products.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | :white_check_mark: |
| v0.9.x  | :x:                |

## Architecture & Data Safety (FERPA Compliance)

The AlloFlow **"School Box" deployment model** guarantees intrinsic FERPA/COPPA compliance by physically severing the application from external, cloud-based LLMs.

### 1. Zero-PII Cloud Policy
Even when using the standard cloud-hosted version of AlloFlow, the application does not utilize a backend database (like SQL or MongoDB) to store student profiles. All saving mechanisms utilize encrypted LZ-String payloads stored entirely in the teacher's local browser `localStorage` or downloaded locally as JSON objects via the FileSystem API.

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
