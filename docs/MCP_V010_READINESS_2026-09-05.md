# MCP remediation connector v0.10.0: readiness pass (2026-09-05)

Continuation of `CLAUDE_HANDOFF_MCP_READINESS_2026-09-04.md`. Everything below is local and
**uncommitted**. Nothing was published, installed into a real Claude client, or sent to colleagues.
The right sharing claim remains **supervised pilot**, not certified compliance.

## Installer

- `desktop/dist/mcpb/alloflow-remediation.mcpb`, v0.10.0, 71,032,266 bytes,
  SHA-256 `3d61efd617320c79252bc16b42bc860ef0b2f75db352e8d88aed094449538556`, built 2026-09-05 04:10 UTC.
- 41 tools, 1 skill, 1 prompt, 59 hashed vendor files. Package grew from 27.4 MB (v0.9) to 67.7 MB
  because it now carries EPUBCheck 5.3.0 and the locked Playwright 1.60.0 + Ace 1.4.6 runtime.
- `npm ci` accepted the staging package name (`alloflow-remediation-mcpb`) against the lock's root
  name (`alloflow-mcp-runtime`); no alignment was needed.
- Isolated verification passed: `verify_mcpb_artifact.cjs --require-playwright` with `NODE_PATH`
  unset, a fresh `ALLOFLOW_MCP_STATE_DIR` and a task-specific `PLAYWRIGHT_BROWSERS_PATH`, extracted
  into a temp directory. This ran on the development machine; it is not a separate-machine test.

## Verification evidence

| Step | Result | Evidence |
| --- | --- | --- |
| Keyless workflow + PDF delivery gate (protocol) | 8/8 | `scratch/mcp-v010-keyless-rerun-claude.json` |
| Fresh text-only EPUB (rebuilt helpers) | EPUBCheck 0/0/0, Ace 0 failures | `scratch/mcp-v010-fresh-epub/EVIDENCE.md` |
| Fresh read-along EPUB (rebuilt helpers) | EPUBCheck 0/0/0, Ace 0 failures (direct runs on the same bytes) | same |
| audit_two_engines, real browser | per-engine checks present; bad fixture flagged by both engines | `scratch/mcp-v010-audit-html/EVIDENCE.md` |
| audit_html without a key | refuses up front; AI-degraded path not exercisable without a key | same |
| Release CI suite (`verify:mcpb-ci`) | 39/39 after the fixes below | `scratch/mcp-v010-release-ci-*.json` |
| Narration/core regression (14 files) | 143/143 after isolated reruns | `scratch/mcp-v010-regression-claude.json`, `-smoke-rerun-` |
| Capability parity gate | PASS | run of `dev-tools/mcp_capability_inventory.cjs --assert-parity` |
| Bundled skill | `quick_validate.py` passes | |

## Defects found and fixed in this pass

1. `remediation_epub_validation.cjs`: a scratch-cleanup EPERM in `finally` turned a finished
   validation into a tool failure; cleanup now retries and logs. Missing Ace report now carries
   Ace's exit code and output. Validator budget 180 s to 600 s per check, overridable with
   `ALLOFLOW_MCP_EPUB_VALIDATION_TIMEOUT_MS`. Timeouts stay `unavailable`, never a pass.
2. `audit_two_engines` dropped the `checks`, `engineErrors` and `scope` the driver computed even
   though its schema declared them. Passed through now; new `tests/mcp_audit_two_engines_contract.test.js`.
3. `audit_html` tool description still said two engines while the code ran three. Corrected.
4. `build_mcpb.cjs` manifest said Node >=18 while the runtime requires >=20. Corrected.
5. `remediation_headless_driver.cjs` pinned the 35 MB EPUBCheck bytes in memory for the life of the
   server; JAR entries are now hashed but not retained (Java reads them from disk).
6. Stale tests: `desktop_mcp_durable_jobs` mirrored an old engine-file list; `mcp_verifier_packaging_hardening`
   hardcoded 12 vendor files; `desktop_mcp_runtime_build_drift` and the packaging test needed budgets
   that cover hashing a freshly copied 35 MB vendor tree.

## Documentation

README_REMEDIATION.md, MCPB_RELEASE.md, PRIVACY.md and the bundled SKILL.md now describe the
document-wide scope, Node 20 and Java requirements, three-engine `audit_html`, independent EPUB
evidence, review statuses and their limits. New `desktop/mcp/PILOT_GUIDE.md` for colleagues.

## Environment notes that matter for anyone reading the timings

The host is a Snapdragon laptop running x64-emulated Java. During this pass a concurrent Codex
session held 47 node processes and free memory fell to 20 MB. Under that load EPUBCheck took
35 minutes and a first `remediation_capabilities` call took 35 seconds. Every timeout reported here
was rerun in isolation before being accepted; none was a hang.

## Still open before sharing

- Manual screen-reader, keyboard, reading-order and content-fidelity review of real outputs.
- `audit_html` with a Gemini key present and a failing AI engine (only unit-tested).
- Install the .mcpb in a Claude Desktop that is not this development machine.
- Decide whether `desktop/mcp/vendor/epubcheck/` (34.5 MB, 47 files) belongs in git or is fetched
  at build time; it is currently untracked.
- Commit. Every change in this pass is uncommitted.
