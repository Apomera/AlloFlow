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
