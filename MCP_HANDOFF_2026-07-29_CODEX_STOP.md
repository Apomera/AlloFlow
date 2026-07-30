# AlloFlow MCP — Codex stopping-point handoff

Date: 2026-07-29  
Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

## Executive decision

Keep **one canonical document-remediation engine** and allow its wrappers to
use different orchestration bounds.

- The ordinary AlloFlow app already has auto-continue. Its results-panel
  Auto-fix control defaults to three rounds.
- The app's recommended hands-off **Make Accessible** path is more thorough:
  it can run an eight-round continuation and resume that loop up to three
  times while measurable progress continues.
- The remote MCP uses the same audit, repair, verification, round-merge,
  regression, plateau, content-fidelity, and delivery policies.
- Remote `standard` performs no additional continuation rounds.
- Remote `thorough` adds one polish pass and at most two continuation rounds.

The remote limits are an intentional unattended compute/cost/failure-isolation
policy. They are not a second remediation algorithm. Do not extract the app's
UI ownership, watchdog, toast, autosave, Canvas-storm, or Stop-button behavior
into the headless engine; those are wrapper responsibilities.

## What is implemented

### Shared remediation and delivery

- `doc_pipeline_source.jsx` is the canonical remediation policy source.
- `misc_handlers_source.jsx::runAutoFixLoop` is the interactive app wrapper.
- `desktop/mcp/remediation_headless_driver.cjs` is the headless/local/remote
  wrapper.
- Both wrappers use the canonical loop policy and
  `finalizeRemediationRound`.
- Tagged-PDF delivery now fails closed when text or images were dropped,
  verification is incomplete, content fidelity fails, or the output is not
  bound to the exact audited HTML.
- Remote reports expose bounded structured evidence rather than document
  content or free-form internal logs.

### Uploaded-PDF safety

- The active-content scan is bounded, cycle-safe, and fail-closed.
- It covers catalog/page actions, annotations, name trees, associated files,
  multimedia, reachable nested Form XObjects, and structure-tree elements.
- Malformed, unresolved, too-deep, or too-large reachable graphs make the scan
  incomplete and prevent remote delivery.
- The canonical source, runtime module, and desktop public mirror are
  synchronized.

### Remote MCP service

Service root: `services/alloflow-remote-mcp`

- Stateless Streamable HTTP MCP gateway with asynchronous isolated jobs.
- OAuth, least-privilege per-tool scopes, top-level and mirrored MCP security
  schemes, and runtime `mcp/www_authenticate` challenges.
- Dynamic client registration accepts only explicit public PKCE clients with
  `token_endpoint_auth_method: "none"`.
- Live OAuth discovery advertises only `["none"]` and S256.
- Claude's exact callbacks remain supported. ChatGPT is optional and requires
  the exact app-managed callback in `CHATGPT_REDIRECT_URI`.
- ChatGPT compatibility is locally wire-tested only; no live ChatGPT account
  linking or tool-call acceptance has occurred.
- Request bodies are streamed through size bounds, and reconstructed requests
  retain cancellation signals.
- Runner staging rejects source symlinks/junction escapes.
- Upload attempts and institution/user workloads are bounded; failed or
  expired claims still consume admission budget.
- D1 migrations `0001`, `0002`, and `0003` are required.

## Verification at this checkpoint

All completed successfully:

- Shared-engine canaries: **6 files, 117 tests**
- Active-content corpus: **13/13**
- Pipeline integrity: **127/127 exports**
- Remote Worker suite: **12 files, 104 tests**
- Runner suite: **15/15**
- Remote preflight suite: **8 passed, 1 expected Windows symlink skip**
- TypeScript typecheck and generated-type checks
- Runner staging-manifest verification
- Wrangler dry-run build

The full remote command was:

```powershell
cd services/alloflow-remote-mcp
npm run check
npm run runner:test
```

No production deployment, commit, push, live OAuth acceptance, or real student
document processing was performed.

## Privacy and product boundary

“Stateless MCP” means there is no durable MCP session. It does **not** mean an
uploaded document was never transmitted or processed.

- A public/person-owned deployment should be limited to public, synthetic, or
  de-identified documents.
- Identifiable education records need an institution-controlled deployment,
  institutional agreement/review, named administrators, retention/deletion
  policy, billing ownership, IdP/access policy, incident response, and
  offboarding.
- Anthropic or OpenAI approval/listing would not by itself make AlloFlow's
  third-party processing FERPA compliant.
- Do not claim PDF/UA conformance until an independently licensed offline
  validator is packaged and its results are enforced.

## Known release blockers

1. The current Cloudflare account can support synthetic staging, but R2 is not
   activated and Containers require Workers Paid.
2. The account is person-owned, not demonstrably institution-owned.
3. The canonical browser runner still loads executable dependencies from
   `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, and `unpkg.com`. Before any real
   document pilot, vendor/hash-lock those assets and remove public CDN egress.
4. Provision dedicated staging-only KV, D1, R2, Workflow, Container, rate-limit
   binding, Worker, hostname, and path-scoped Cloudflare Access application.
5. Run real synthetic end-to-end acceptance separately in Claude and ChatGPT.
6. Complete institutional security/privacy/accessibility review before any
   identifiable records.

## Best next work

Do not add more remediation tools first. The highest-value next engineering
step is **vendor the runner's executable assets and prove a no-public-CDN
egress build**. After that:

1. Activate R2 and Workers Paid in a staging account.
2. Provision the isolated resources using
   `services/alloflow-remote-mcp/INSTITUTION_PILOT.md`.
3. Deploy synthetic-only staging.
4. Complete Claude OAuth/upload/standard/thorough/download/delete acceptance.
5. Configure the exact ChatGPT callback and repeat the synthetic acceptance.
6. Only then decide whether to submit to directories or begin an
   institution-owned pilot.

## Primary documents

- `services/alloflow-remote-mcp/README.md`
- `services/alloflow-remote-mcp/INSTITUTION_PILOT.md`
- `MCP_HANDOFF_2026-07-29.md`
- `MCP_REMOTE_CONTINUATION_2026-07-29.md`

## Workspace caution

The worktree was already very dirty and contains extensive user-owned changes.
The MCP work was intentionally not committed or deployed. Preserve unrelated
files and review scope carefully before staging anything.
