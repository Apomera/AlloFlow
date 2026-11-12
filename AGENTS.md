# Working together on AlloFlow

Follow the user's request, CLAUDE.md's technical guidance and .agent/workflows/alloflow-scope.md. This user-approved policy replaces the former coordination experiment.

- Proceed with ordinary local implementation, testing, internal review and parallel subagents within the requested task. Coordinator approval or a bypass word is unnecessary.
- Machine load: at most 3 background agents/subagents at once per session; ask the user before starting a 4th. Each agent runs at most one heavy job at a time (browser/Playwright sweep, full test suite, vitest over 2 workers). Many sessions share this laptop: if it is busy, wait, defer heavy runs (e.g. overnight) or ask.
- Routine coordination messages with relevant chats in this project are authorized. Do not extend this to unrelated chats, external messages or new unrequested work.
- Preserve other sessions' uncommitted changes. Re-read current files and relevant diffs before writing; apply narrow edits and preserve unrelated bytes.
- Coordinate actual active overlapping writes directly. Use a brief handoff for a genuinely shared write, pause only the affected operation, and continue independent work in parallel.
- Treat the ledger, queues and old claims as optional status/history. Routine work requires no registration, admission, FIFO turn, checkpoint, role cap or global pause/UNKNOWN clearance. Verify current activity before treating an old claim as a blocker.
- Keep sources, generated modules, mirrors, loader pins and cache metadata coherent when affected. Review generated output so it does not overwrite another session's work.
- Keep concise task notes and validation results. Shared Work Log updates are best effort; no pre-edit row or logging queue is required.
- Validate in proportion to the change and reuse existing checks. Add custom gates or mutation machinery only when the risk warrants it; verify the app's actual loading path when delivery behavior changes.
- Preserve the shared Git index. Staging, commits, pushes, merges, deployments and destructive Git operations require explicit user authorization; never discard or sweep in another session's work. Account/permission changes, paid/model setup and access to real student data or protected sessions also require authorization. Workflow/turbo flags do not grant it.
- Stay within requested work. Internal delegation above is allowed; this policy does not start unrequested background projects or autonomous dispatch.

## Transition from the old protocol

This policy takes precedence over older coordination text in CLAUDE.md, AGENT_HANDOFF.md, cached task instructions and the legacy .git/alloflow-coordination protocol. Keep historical records, queues and transaction evidence intact; do not mass-release claims or delete Git/transaction locks. Protect actual ongoing writers and use direct handoffs, without waiting for legacy queue admission.

Legacy task helpers may still assert ledger ownership. Adapt task-owned coordination guards or use another safe path under this policy, retaining current-input, patch-preservation and integrity checks. Do not bypass real filesystem/access restrictions or publication approvals, or modify shared coordinator code merely to force admission.
