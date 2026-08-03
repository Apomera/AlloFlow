# Running the portable remediation from any harness

The workflow has exactly two moving parts, and neither is Claude-specific:

1. **A host model** that can read the source document (vision for scans) and
   write a `repair-plan.json` conforming to
   [references/repair-plan.schema.json](references/repair-plan.schema.json).
2. **The packaged scripts**, which need only Python 3.9+ and its standard
   library. Optional tiers degrade honestly when their tool is absent:
   tagged-PDF export needs a local Node + Playwright + Chromium; PDF/UA
   validation needs a local Java + veraPDF. `capabilities --json` reports
   exactly what the current machine can do — trust it, not this table.

| Capability | Requires | Without it |
| --- | --- | --- |
| Plan validation, semantic HTML, HTML audit, reports, receipts | Python 3 only | — |
| `audit-source`, `extract-images`, `extract-text`, `extract-office`, `batch-remediate` | Python 3 only | — |
| `verify-init` / `verify-check` (independent verification) | Python 3 + a second, fresh-context reader | rebuild rests on the author's self-report |
| Tagged PDF + PDF/UA finalization | Node + Playwright + Chromium | verdict `html_only_review_required` |
| veraPDF PDF/UA-1 validation | Java + veraPDF | verdict `pdf_generated_unverified_review_required` |

The two-model rule is the harness-portable form of the pipeline's independent
audit: any harness that can open a second clean session (a Claude Code
subagent, a new ChatGPT conversation, a different model entirely, or a human)
can be the verifier. The only requirement the script enforces is the
attestation: fresh context, direct reading, and a filled worksheet.

## Claude Code / Claude Desktop

Follow [SKILL.md](SKILL.md) directly; the skill loads it automatically when
the repo's skills are installed.

## ChatGPT (Code Interpreter / Advanced Data Analysis)

Upload the `scripts/` and `references/` directories together with the source
document, then paste SKILL.md's one-prompt workflow as the instruction. The
sandbox has Python but no Node, Java, or network, so expect
`html_only_review_required`: the deliverables are the accessible HTML, the
report, and the receipt. State plainly that the sandbox could not produce a
tagged PDF; do not print-to-PDF and call it accessible.

## Codex / Gemini CLI / other coding agents

Point the agent at this directory and instruct it to follow SKILL.md. The
scripts are the contract: an agent that cannot read the document must stop
rather than invent content, and plan validation will reject structurally
broken output regardless of which model wrote it.

## Any model, no agent harness at all

A person can drive the same loop by hand: ask any capable model for a repair
plan conforming to the schema (paste the schema and the `source-info` receipt
into the prompt), save it as `repair-plan.json`, and run the `remediate`
command from SKILL.md step 6 in a terminal.

## Ground rules that do not vary by harness

- The scripts never open a network connection; the network policy is `deny`
  on every host. Keep it that way — do not "helpfully" fetch fonts or CDNs.
- Output JSON is UTF-8 regardless of console codepage.
- The plan binds to the source by SHA-256; a renamed or re-exported copy will
  not validate.
- Every transcription-based rebuild requires human comparison against the
  source before distribution, on every harness, with no exceptions.
