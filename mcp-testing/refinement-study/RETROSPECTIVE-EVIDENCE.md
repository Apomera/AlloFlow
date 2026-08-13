# Retrospective evidence index

This is useful engineering and pilot evidence. It is **not** a controlled estimate
of the MCP auto-refinement loop's effectiveness.

## Exact-artifact verification reports

Eight committed final reports record 2,499 verified checklist attestations across
eight document targets:

| Target | Verified/items | Final report |
| --- | ---: | --- |
| UDHR English | 57/57 | `mcp-testing/corpus/round-01/runs/udhr-english/verification-report.json` |
| UDHR Spanish | 58/58 | `mcp-testing/corpus/round-02/runs/udhr-spanish/verification-report.json` |
| USCIS civics | 228/228 | `mcp-testing/corpus/round-03/runs/uscis-civics/verification-report.json` |
| FDA PREA letter | 35/35 | `mcp-testing/corpus/round-04/runs/fda-nexium/verification-report.json` |
| USGS/mineral-deposit guide | 388/388 | `mcp-testing/corpus/round-12/runs/usgs-mineral-deposit/verification-report.json` |
| High Impact Reports | 51/51 | `mcp-testing/runs/2026-08-03_high-impact-reports_portable/v3-verified/verification-report.json` |
| IRS 1040 instructions | 1,663/1,663 | `mcp-testing/runs/2026-08-09_i1040-126pp-ua1-pass_portable/verification-report-v2.json` |
| ED parent guide | 19/19 | `mcp-testing/runs/2026-08-10_ed-parent-guide-idea_portable/verification-report-v2.json` |

These are nested, heterogeneous checklist items—not 2,499 independent samples.
The IRS document alone contributes 66.5% of them. The proper denominator for a
document-level statement is eight targets.

The reports are still informative because the verification step was capable of
rejecting output. Earlier reports found 19 discrepancies among 1,664 IRS items and
5 among 16 parent-guide items:

- `mcp-testing/runs/2026-08-09_i1040-126pp-ua1-pass_portable/verification-report.json`
- `mcp-testing/runs/2026-08-10_ed-parent-guide-idea_portable/verification-report.json`

Corrected artifacts were then rebound and rechecked. That supports the claim that
verification influenced these artifacts; it does not identify the causal effect of
automatic loop continuation.

## Other committed engineering evidence

- `tests/e2e/mcp_auto_continue_golden.spec.ts` exercises the real MCP/browser loop
  with a scripted model, including accepted improvement and regression reversion.
  It establishes controller behavior, not real-model quality.
- `tests/mcp_driver_scripted_e2e.test.js` exercises the real browser pipeline and
  stagnation path against loopback Gemini. It deliberately does not claim score
  improvement.
- `mcp-testing/CROSS-VALIDATION-2026-08-04.md` records 5/5 agreement with a second
  veraPDF route and zero axe/IBM failures on five outputs. This corroborates those
  outputs but is not a randomized condition comparison.
- `mcp-testing/corpus/round-10/ROUND-10.md` reports a 1,068-page reading-order sweep,
  including both gains and regressions. It also proves that the current corpus was
  exposed during engine development.

## Why a prospective study is still needed

The historical runs mostly use the portable/agentic workflow rather than randomized
live MCP `auto_continue`; documents and prompts informed development; there is no
one-shot matched condition, randomized order, repeated stochastic execution,
blinded specialist panel, or prospectively held-out corpus. Fresh-context model
verification is not the same as an independent human expert or assistive-technology
user. The new protocol preserves this evidence while preventing it from being
overinterpreted.
