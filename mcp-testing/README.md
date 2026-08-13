# MCP testing

A place to prove the connectors work on a given machine, and to keep the artifacts of real runs
where a human can open them.

Nothing here is wired into the deploy gates. It is a workbench, not a test suite — the automated
MCP regression tests live in `tests/mcp_*.test.js`.

## Is the connector working?

Run both from the **repo root**. Neither needs an API key or an MCP client.

```bash
# 1. Does the server start and register its tools?
node mcp-testing/tools/mcp_call.cjs list desktop/mcp/alloflow-remediation-mcp-stdio.cjs

# 2. Can this install actually remediate? (real pipeline, real browser, scripted model)
node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs remediation_selftest

# 3. What does this machine have? (key, Chromium, pipeline modules, vendor assets)
node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs remediation_capabilities
```

Step 1 failing means the server is broken. Step 1 passing while the tools are missing inside
Claude Code means a **registration** problem, not a server problem — see below. Step 2 failing
names the stage that broke.

`remediation_capabilities` reports `geminiKeyPresent` by checking that a key **exists**, never
that it works. A revoked key still reports `ready: true` and `fullAiPipelineReady: true`, and
every Gemini-backed tool then fails at call time with `API_AUTH_FAILED`. To test the key itself,
call `pdf_audit` on a small PDF and pass `--stderr`:

```bash
echo '{"file_path":"C:/absolute/path/to/small.pdf"}' > /tmp/args.json
node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs pdf_audit /tmp/args.json --stderr
```

A working key produces a score. A dead one returns `score: -1` in about ten seconds, and the
stderr telemetry says `API_AUTH_FAILED` outright.

## The tools are missing inside Claude Code

Almost always one of these, in order of likelihood:

1. **Claude Code was started from the wrong directory.** The root `.mcp.json` is *project-scoped*
   — it applies to the repo directory. Launching from a parent folder (your home directory, say)
   loads no project servers at all, and the tools are silently absent rather than erroring.
2. **The `.mcp.json` prompt was declined.** Project servers require a one-time approval per
   machine. Re-approve with `claude mcp reset-project-choices`.
3. **A stale user-scoped entry is shadowing it.** Older setups registered servers by hand in
   `~/.claude.json` with an absolute path pointing at one person's checkout. Check with
   `claude mcp list`.

## Registering on a new machine

Nothing to do — the root [`.mcp.json`](../.mcp.json) registers both connectors with paths relative
to the repo, so it works for any user on any OS after `npm install`. Approve the prompt on first
launch. For Claude Desktop, `.mcpb` bundles, and manual registration, see
[desktop/mcp/README_REMEDIATION.md](../desktop/mcp/README_REMEDIATION.md).

## `tools/mcp_call.cjs`

Drives any local stdio MCP server directly over JSON-RPC. Exits non-zero when a tool reports an
error, so it also works as a CI smoke gate.

```bash
node mcp-testing/tools/mcp_call.cjs list   <server.cjs>
node mcp-testing/tools/mcp_call.cjs schema <server.cjs> <tool> [tool...]
node mcp-testing/tools/mcp_call.cjs call   <server.cjs> <tool> [args.json] [--timeout ms] [--stderr]
```

`--stderr` echoes the server's telemetry. That is where throttle waits, auth failures, and OCR
progress appear — it is the difference between "slow" and "stuck".

## Reading-order sweep — `tools/order_sweep.cjs`, `tools/order_sweep_diff.cjs`

The gate for any change to the column splitter. Rounds 7 and 8 were both measured this way, but
the script was never kept and each round re-derived it; this is that harness made permanent.

```bash
node mcp-testing/tools/order_sweep.cjs <module.js> <out.json> [--only <name>] [--max-pages N]
node mcp-testing/tools/order_sweep_diff.cjs <before.json> <after.json> [--eps 0.005]
```

Get the "before" module from git (`git show HEAD:doc_pipeline_module.js > /tmp/before.js`), sweep
with it and with the working copy, then diff. Each page is scored by BIGRAM AGREEMENT between the
column-aware text layer and the content-stream text, which is extracted by walking the page's own
drawing operators and knows nothing about the splitter. Bigrams because a reading-order defect does
not change which words a page has, only which words end up adjacent.

**Read the scores as deltas, never as grades.** Content-stream order is the order the page was
DRAWN — usually reading order, not guaranteed to be — so a low absolute score can mean the referee
is wrong rather than the splitter. Three corpus documents return no content-stream text at all
(`nist-hb44-excerpt`, 23 pages of `nasa-artemis-plan`, `irs-f1040-1954-scan`); the diff reports
those on their own line rather than counting them as unchanged.

## Optional: `pdfjs-dist` for full-fidelity renders

`tools/render_pages.cjs` prefers a modern `pdfjs-dist` if it can resolve one, because Chromium's
OpenType Sanitizer rejects some of the embedded fonts the vendored pdf.js ships cmaps for, and the
rejected glyphs paint as tofu boxes. It is **not** declared in `package.json` and is not expected
to be: it is a diagnostic convenience, the tool falls back to the vendored pdf.js with a printed
warning, and adding it would put an npm install between a fresh clone and a working build.

```bash
npm i pdfjs-dist --no-save    # --no-save on purpose; it must not persist
```

Do not run a bare `npm i`/`npm ci` in this tree to get it — that drops `@babel/core`, which is only
a peer dependency here, and the next deploy aborts on "JSX compilation".

## Refinement effectiveness study

[`refinement-study/`](./refinement-study/) contains prospective experiment tooling for comparing
the canonical one-shot primary pass with the evidence-gated loop. It is plan-only by default and
never contacts a provider or reads an implicit key file while planning.

```bash
# Pinned six-document development calibration plan: 36 runs, zero execution
node mcp-testing/refinement-study/run.cjs mcp-testing/refinement-study/development-pilot.json

# See the runner safeguards and bounded execution syntax
node mcp-testing/refinement-study/run.cjs --help
```

The development manifest is procedure/integrity calibration evidence, not held-out effectiveness
evidence. Keep plans and allocation maps private from reviewers.

## `runs/`

One directory per real remediation, holding the inputs and every artifact produced, so the output
can be reviewed by a person rather than summarized. Each has a `NOTES.md` recording what was run,
what the verdict was, and what is still wrong.
