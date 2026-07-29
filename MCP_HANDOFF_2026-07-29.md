# MCP Connector — Handoff, July 29, 2026

**Written for:** the next Claude Code session picking up the AlloFlow remediation MCP connector.
**Author:** Claude (Opus 5, 1M context)
**State at handoff:** 27 tools, deployed and pushed at `@ef3fe3c91`. All 25 deploy gates green.

Read this before `agent_skills/document-accessibility/SKILL.md`. The skill tells an agent how to
*use* the connector. This tells you how to *change* it, and which of the ways it can bite you have
already bitten someone.

---

## 1. What this thing is, in one paragraph

`desktop/mcp/alloflow-remediation-mcp-stdio.cjs` is a stdio JSON-RPC MCP server. It drives
`desktop/mcp/remediation_headless_driver.cjs`, which boots the real AlloFlow pipeline modules in
headless Chromium and calls them. Nothing is reimplemented: the connector is a transport onto the
same bytes the app ships. That is the whole design premise, and it is the thing to protect. If you
ever find yourself writing remediation logic *in the connector*, stop — the logic belongs in the
pipeline, and the connector should reach it.

---

## 2. Where things are

| File | Role |
| --- | --- |
| `desktop/mcp/alloflow-remediation-mcp-stdio.cjs` | Tool registry, schemas, arg validation, jobs, output paths |
| `desktop/mcp/remediation_headless_driver.cjs` | Chromium, module boot, AI bridge, every capability call |
| `desktop/mcp/zip_writer.cjs` | Zero-dep ZIP (ePub/DAISY). Required at driver load — omitting it breaks startup, not just a feature |
| `desktop/mcp/build_mcpb.cjs` | `.mcpb` bundle: `SERVER_FILES` + `ASSET_FILES` + a manifest tool list |
| `agent_skills/document-accessibility/SKILL.md` | What an agent reads to use it |
| `dev-tools/mcp_capability_inventory.cjs` | Measures connector coverage vs the pipeline |
| `dev-tools/agent_remediate.cjs` | The no-key, agent-does-the-reading path |
| `tests/mcp_*.test.js` | Five suites, ~97 tests |

Three lists must stay in sync or something breaks silently:

1. `TOOLS` in the server (the registry)
2. `OUTPUT_SCHEMAS` in the server — **startup throws** if a tool has no schema, by design
3. the manifest tool list in `build_mcpb.cjs` — a **test** enforces parity

That third one is not theoretical. On July 29 I added `export_alt_format` to the registry and forgot
the manifest; the parity test caught it before commit. Trust that test.

---

## 3. Current coverage

Run `node dev-tools/mcp_capability_inventory.cjs` — do not trust this section over the tool.

At handoff: **27 tools · 30 of 117 pipeline functions · 13 of 16 capability areas.**
**Ten tools need no API key at all.**

Remaining gaps the inventory reports:

- **Resource / pack HTML generation** (`generateFullPackHTML`, `generateResourceHTML`) — a real gap,
  and the most straightforward next tool.
- **Preview + expert commands** (`getPdfPreviewHtml`, `updatePdfPreview`, `processExpertCommand`) —
  real, but stateful; think before wiring it.
- **"Batch a folder"** — reported as a gap and **arguably mislabeled**. The connector *does* batch;
  it loops its own audit rather than calling `runPdfBatchRemediation`. Decide whether to wire the
  pipeline function or teach the inventory that this capability is met another way. Do not "fix" it
  by adding a redundant tool.

---

## 4. Traps that have already cost a session

**The connector was once completely unable to remediate**, and a quarantined test hid it. The driver
never stamped a document-ownership epoch, so every run threw `DocumentOwnershipError`. Fixed by
publishing `__alloPdfDocumentEpoch` per run. Lesson: when an MCP test goes red, diagnose it. Do not
quarantine it. `tests/QUARANTINE.txt` should never gain an `mcp_*` entry.

**Reading the code is not enough — run it.** Every capability I added, testing contradicted what the
source appeared to say:

- `sanitizeStyleForWCAG` returns `{html, fixCount}`, not a string. Chaining it naively writes
  `"[object Object]"` into a document.
- The DOCX extractor returns `fullText`, not `text`. My first version reported success with zero
  characters.
- axe puts unresolvable contrast in `incomplete`, not `violations`. Counting only violations reports
  zero problems on unreadable text.
- The view module dies without React, so "just add it to the bundle list" ships something broken.
- My own capability inventory under-reported coverage by 7 functions (it missed aliased calls inside
  `page.evaluate`) and separately reported stale bundle state (it read `MODULE_FILES`, the boot list,
  instead of `ASSET_FILES`, what ships).

Five bugs, none visible from reading, all would have shipped.

**Correct your instruments in both directions.** Twice my measuring tool was wrong about work that
*was* done. Over-reporting and under-reporting are the same class of error.

**Do not add parallelism to batch runs.** `_geminiEffectiveMax` resets per run
(`doc_pipeline_source.jsx:4616`). Concurrency does not buy throughput here; it buys throttling.
Recommend fewer files, not faster.

**Windows/encoding.** Write non-ASCII as `\uXXXX` escapes in source. During this work, typing literal
private-use sentinels into `view_pdf_audit_source.jsx` silently produced empty strings. Verify with a
NUL/U+FFFD count after any scripted write.

---

## 5. What changed on July 29 (the alt-format work)

Commit `81bfb839e`, deployed at `@ef3fe3c91`.

ePub 3, DAISY 3 and Braille generation lived **inside `PdfAuditView` as download handlers**, so the
only way to produce them was to render React and click. Extracted to module scope in
`view_pdf_audit_source.jsx` as pure `HTML in → { path: contents } out` builders, published as
`window.AlloModules.AltFormatExports`, and the handlers now only zip and download.

New tool: **`export_alt_format`** (epub | daisy | brf). Model-free.

Things to know before touching it:

- **`view_pdf_audit_source.jsx` is the source; `view_pdf_audit_module.js` is generated.** Edit the
  source, then `node _build_view_pdf_audit_module.js`. The build script also writes the
  `desktop/web-app/public/` mirror and holds the `window.AlloModules.*` publish block — a new export
  must be added *there*, not in the source.
- **`mimetype` must be the first ZIP entry, STORED, no extra field.** `zip_writer.cjs` handles this
  and a test asserts the literal bytes at offset 38. Break it and you produce a file that opens
  nowhere while every layer above reports success.
- **DAISY deliberately reports `selfChecked: false` and omits `valid`.** There is no DAISY validator
  here. Do not "improve" this by returning `valid: true` off an empty error list — a check that never
  ran is not a pass. A test asserts `valid` is `undefined`.
- Braille is **Grade 1 / uncontracted only.** Contracted UEB needs the liblouis plugin, which is in
  the app and not in the connector.

---

## 6. Suggested next steps, in the order I would do them

1. **Publish the `.mcpb`.** It builds (`node desktop/mcp/build_mcpb.cjs`) but **no artifact is
   checked in and none is distributed**. This is the single largest gap between "exists" and "gets
   used" — every capability below matters less than this one.
2. **`generate_resource_pack`** — the last non-UI capability gap. Follow the `export_alt_format`
   shape: driver function → tool → outputSchema → manifest entry → tests.
3. **Decide the batch question** in §3 rather than leaving the inventory reporting a gap nobody
   intends to close.
4. **epubcheck** if ePub becomes load-bearing. The current self-check is structural only. A CheerpJ
   spike is risky — EPUB is a ZIP needing reverse seeks, unlike veraPDF's linear scan.
5. **A second remediation reference run** on a document that is *not* App E. Every honest claim
   currently rests on a sample of one.

---

## 7. Claims you may make, and claims you may not

This matters more than the feature list. The project's credibility is the asset.

**Supported by artifacts in this repo:**
- Two independent engines disagree on the same file: axe **100**, IBM Equal Access **92**. Nobody
  selling remediation shows you that.
- veraPDF caught **four real structural failures** that axe scored 100 on.
- axe reported **zero** contrast findings — violations *and* incomplete — on text at ~1.6:1.
- The reference run: 8 scanned pages, ~7 minutes, **no API key**, 94.7% Tesseract agreement,
  veraPDF 5 failures → 1 (the by-design PDF/UA declaration).

**Not supported yet:**
- That the $5–25/page remediation market is overcharging. That needs a sample larger than one
  document and a human conformance review nobody has done.
- That any output is "WCAG compliant." Automated checks cover only machine-decidable criteria.
  Whether a heading level is *right*, a reading order *logical*, or alt text *meaningful* needs a
  person.
- That the MCP improved remediation *quality*. It did not. It made the pipeline **reachable**. Keep
  those separate when describing it.

---

## 8. Repo hygiene (shared tree)

Many agents work in this one checkout, often uncommitted for a full day.

- **Pathspec commits only:** `git commit -m "..." -- <paths>`. `-m` comes *before* `--`.
- **Never** amend, reset, stash, or `git add -A`.
- **Chain add + commit.** A new file left staged gets swept into another session's broad commit.
- A hook-blocked commit leaves files **staged** — `git restore --staged` before retrying.
- `deploy.sh "message"` broad-adds `desktop/web-app/public/` and `app/`. **Commit your work first**
  or it lands under a "Post-deploy: update CDN hash refs" message.
- After deploying, always run `node dev-tools/check_cdn_live.cjs`. deploy.sh has historically exited
  0 without pushing to origin.

---

*Last verified: July 29, 2026, against `@ef3fe3c91`. If the inventory tool and this document
disagree, the tool is right.*
