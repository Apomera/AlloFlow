# Read-only reader release verification

Completed locally by track01 after the user asked to keep enhancing. The improvement is a reusable integration check, with no reader, persistence-helper, host, catalog or generated-runtime edits by this continuation. No install, application server, commit, push, deployment or messages to other sessions were performed.

## Baseline and findings

The first inspected HEAD was `286e09850`. Other owners then committed Moon Mission (`e6e137b8e`) and the released track07 integration (`c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`). The builder/verifier files were not changed by those commits. Reader source/output/hosts changed under their owners during development; they were read again as one stable snapshot for actual verification. `baseline.json` is historical and must not be mistaken for the final files. `final-check.json` records the final local snapshot.

| Priority / classification | Evidence | Resolution |
| --- | --- | --- |
| P2 source gap, reproduced with fault injection | `tests/reader_release_verification.test.js:41` | Equal root/public modules and correct matching host pins can all describe an old build. Compile the three current canonical inputs in memory and compare both generated outputs to that exact result. Current checkout passed; no stale production reader is alleged. |
| P2 verification gap | `dev-tools/check_reader_release.cjs:15`, `:63` | Parse host code for the actual `ViewSimplifiedModule` loader syntax. Ignore comment/string examples, reject missing/duplicate calls and dynamic or incorrect URLs. Existing current hosts already satisfy this contract. |
| P2 mixed-snapshot risk, reproduced with fault injection | `dev-tools/check_reader_release.cjs:67`, `:75` | Re-read every captured file and HEAD after compilation/parsing. Fail when another writer changes an input, removes a file or moves HEAD during the check. This cannot prevent later edits; the report identifies one snapshot. |
| Existing side-effect boundary | `_build_view_simplified_module.js:14`; `dev-tools/lib/reader_compiler.cjs:6` | Add a non-writing `--check` mode. Move the unchanged compiler/wrapper to a pure shared helper, so verification never imports a writing build entry point. Default CLI and require-driven build behavior remain intact. |

The final checked reader SHA-256 was `8427e01f26b053270933ed76f3e16279d12274fd24d2371db88eaff0f6513966`; both outputs and all three host references matched. This is local source/output consistency, not evidence of deployed bytes or a clean entire repository.

## Source-to-output map and ownership

`reader_place_store.js` + `reader_support_drafts.js` + `view_simplified_source.jsx` → pure `dev-tools/lib/reader_compiler.cjs` → reader module/root-public pair. The default builder writes that pair; its `--check` mode only compares. The full verifier additionally reads the canonical host and both desktop source mirrors, validates the reader pin and captures/rechecks fingerprints.

Track01 owns only this tool delta: `_build_view_simplified_module.js`, `dev-tools/lib/reader_compiler.cjs`, `dev-tools/check_reader_release.cjs`, `tests/reader_release_verification.test.js`, `docs/reader-release-verification.md`, this report directory, and its shared work-log row. Reader/host/runtime ownership remains released. Stage or transfer the builder and its new compiler helper together; omitting the helper would break the builder. Other uncommitted files are not part of this handoff.

## Validation actually performed

- **20/20 focused tests passed** (`tool-final-tests.json`). In-memory fault cases cover stale source despite agreeing mirrors/pins, same-size public drift, missing outputs, misleading comments/text examples, dynamic/stale URLs, duplicate loaders, host divergence, syntax failure, changing/deleted inputs, HEAD drift and invalid CLI arguments.
- The old builder was run with filesystem writes intercepted in memory, against the same captured inputs as the new pure compiler. Output bytes matched exactly (`compiler-compatibility.json`). Application code was never evaluated. This is an output-compatibility check, not a runtime test.
- Both real commands passed when launched from the system temporary directory (`cli-checks.json`). All eight reader/helper/output/host file hashes **and modification times** were unchanged across the two commands.
- Default and require-driven build writes, temporary-file cleanup, non-writing failure and non-writing help were exercised with an in-memory filesystem. The production writer was not run against the workspace.
- Final JavaScript syntax and scoped Git whitespace checks passed. LF line endings were verified for all five tooling/test/doc files. No existing runtime tests were claimed as rerun; this change emits identical runtime bytes.

## Commands and integration queue

Read-only checks:

```powershell
node dev-tools/check_reader_release.cjs
node dev-tools/check_reader_release.cjs --json --expect-head c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8
node _build_view_simplified_module.js --check
```

The full command produces JSON on stdout only when requested. Redirecting stdout creates a report file through the shell; the verifier itself does not write. The builder without `--check` and the broader `dev-tools/build_adapted_reader.cjs` still have build side effects. See `docs/reader-release-verification.md` for the exact scope and exit codes.

1. Review and transfer this builder/compiler/verifier/test/doc set together. No runtime rebuild is required solely for the compiler extraction; exact output compatibility was verified.
2. After subsequent owner integrations, run affected runtime tests, then this consistency check and the broader mirror/catalog gates. Do not fix concurrent owner files merely to make a snapshot pass.
3. Under separate deployment authorization, freeze the actual shell/module/catalog manifest and compare the exact served URLs and response hashes against it. Repeat affected application journeys with the deployed bytes. Neither this check, HEAD nor a URL query pin proves deployment.

Remaining limits are explicit: this tool does not certify app-shell freshness, other module families, catalogs, browser behavior, performance, actual assistive technology or deployment. No new user-facing behavior was changed in this continuation.
