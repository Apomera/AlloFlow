# Contributors

AlloFlow is maintained by Aaron Pomeranz ([@Apomera](https://github.com/Apomera)).

## Contributors

- **[@phyersherman](https://github.com/phyersherman)** — AlloFlow Desktop flavored editions
  (Desktop / Admin Server from one codebase via `desktop/scripts/build-edition.cjs`),
  guided first-run AI setup wizard, the installer's "Choose your experience" page
  (Document remediation as an install-time choice), local-AI PDF remediation
  (pdf.js text-layer reroute so audits run on LM Studio / Ollama / LocalAI / the
  built-in engine), the `storageDB` batch-resume fix, and LM Studio
  `response_format` compatibility. Landed from PR #3 via selective integration
  (commits `c8bff5f59`, `308c0f54f`, `d78d4974e`, plus the `?mode=remediation`
  portion of `f469acca2`).
- **[@phyersherman](https://github.com/phyersherman)**, 2026-09 to 2026-10:
  Google Classroom linked sync with teacher-held keys, teacher-private labels,
  the in-app roster handoff and its confirmation card, and the OAuth
  verification guide; daily check-in cards (Tier 2 CICO); the School Rewards
  Tier 1 acknowledgment report with MTSS Triage export, Spanish claim-code
  messages and award-from-file; the Behavior Lens Token Board's Store row; and
  the onboarding redesign (role-first Launch Pad, Guided paths, Family first
  steps, quick groups), integrated selectively from the `onboarding-redesign`
  branch (`8edfaa9b6`, `955d6d030`, `d9a9c957f`).
