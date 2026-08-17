You are **Lane X8** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md`, `WAVE3_PLAN.md`, and the header of
`tests/QUARANTINE.txt`, whose philosophy governs this lane: a permanently red gate gates
nothing, and most quarantined files are raw-source substring pins that drifted, not broken
code. Lane ID **X8**. You own `tests/**` repairs and `tests/QUARANTINE.txt`; source files
only where a test proves the SOURCE wrong (rare — argue it in the report first).

## Mission: pay down the test debt with attribution, not deletion

**1. Quarantine triage.** 14 files are quarantined. For each EXCEPT the two owner-tagged
2026-08-16 entries (`nuclearlab_axe_a11y`, `mcp_batch_audit_e2e` — their sessions fix those;
leave both): rerun it, diagnose, and land it in exactly one bucket:

- **Drifted pin** — the assertion greps for source text that legitimately changed. Repair the
  assertion to test the CURRENT intent (never just delete it), verify against
  `git show HEAD:<source>` that the behavior it guarded still exists, un-quarantine.
- **Genuinely broken code** — write it up precisely; fix only if small and clearly yours to
  fix; otherwise file it.
- **True flake** — keep quarantined, but tighten the reason line (the FLAKY entries with
  timeout causes are the model).

**2. The historic ~98-red backlog.** `npx vitest run` the full unit suite once
(`NODE_OPTIONS=--max-old-space-size=6144 --maxWorkers=1`; expect a long run) and produce the
honest ledger: every red file classified drifted-pin / broken / flake / heavy-timeout, with
this fleet's known reds attributed (several were fixed in passing this week — count them).
Repair the drifted-pin class in bulk where each repair is unambiguous; leave judgment calls
listed. Known specific items filed during the fleet, take them: the
`doc_pipeline_build_parity` missing per-test timeout (~28s build vs 5s default),
`view_header_reflow_a11y`'s stale literal (red at HEAD since before wave 1 — verify, then
re-anchor to current source), `header_nav_i18n`'s unregistered `header.voice_*` keys (add the
keys under the ui_strings lock, listed for X3, or correct the test's registry expectation —
whichever the current source says is right).

**3. The pattern fix.** The drifted-pin class exists because tests assert literal source
substrings. Where you repair one, prefer re-anchoring to behavior (lift-and-run via `new
Function`/vm, the fleet's established pattern) over a fresh substring that will drift again.
Do not convert wholesale — only the files you touch anyway.

Every un-quarantined file must pass twice consecutively before it leaves the list. Machine
notes in WAVE3_PLAN apply (OOM signature ≠ flake).

Report → `FLEET_2026-08-16/reports/X8_report.md`: the full ledger, repairs made,
un-quarantined list, and the remaining debt sized honestly.
