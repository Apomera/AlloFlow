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

## `runs/`

One directory per real remediation, holding the inputs and every artifact produced, so the output
can be reviewed by a person rather than summarized. Each has a `NOTES.md` recording what was run,
what the verdict was, and what is still wrong.
