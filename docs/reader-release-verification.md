# Verify the local reader before integration or release

Run from the repository:

```powershell
node dev-tools/check_reader_release.cjs
```

This command reads the canonical reader inputs, compiles them in memory with the same compiler used by the builder, compares both generated files, parses the three host files for the reader loader URL, then rechecks all captured files and HEAD. It writes no files, executes no application code, installs nothing and makes no network requests. It can also be invoked by absolute path from another directory.

The check catches a stale build even if both generated mirrors and their hash pins agree. A mirror comparison alone cannot detect that case. Loader URLs in comments or quoted examples do not count as loader calls; dynamic, missing, duplicate or incorrectly pinned reader loaders fail the check. A file or HEAD change during verification also fails rather than certifying a mixed snapshot.

For an exact inspected baseline and machine-readable evidence:

```powershell
$readerBaseline = git --no-optional-locks rev-parse HEAD
node dev-tools/check_reader_release.cjs --expect-head $readerBaseline --json
```

`--json` prints a report to standard output. Redirecting it to a file is an explicit report write performed by the shell. The report includes full file hashes, compiler versions, start/end HEAD, expected compiled hash, host pin locations and failure codes. Exit code 0 means the scoped local checks passed, 1 means an inconsistency was found, and 2 means invalid command usage or an unexpected command error. A dirty working tree is allowed and identified by file hashes; HEAD is not a substitute for those hashes.

The narrower builder check is also non-writing:

```powershell
node _build_view_simplified_module.js --check
```

It compares only the two generated files with the canonical inputs compiled in memory. Use the full verifier for pins and snapshot stability. Running the builder without `--check`, or requiring its entry point from another build script, retains the existing write behavior. Verification code imports only `dev-tools/lib/reader_compiler.cjs`, which is pure and never writes files.

## Inputs and ownership

| Input | Output or check |
| --- | --- |
| `reader_place_store.js`, `reader_support_drafts.js`, `view_simplified_source.jsx` | Same ordered compiler input for both building and verification |
| `dev-tools/lib/reader_compiler.cjs` | Babel JSX transform and exact CDN wrapper |
| `view_simplified_module.js`, `desktop/web-app/public/view_simplified_module.js` | Exact bytes of the compiled reader |
| `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx` | Exact host parity and one `ViewSimplifiedModule` loader per host, using the generated reader SHA-256 prefix |

Treat the builder and pure compiler as one change when staging or handing off. After a source change, the integrator builds the reader, updates only its host pin, runs the relevant runtime tests, and runs this check again. The command deliberately does not repair another owner's active files.

## Limits and later deployment verification

This check does not validate the complete app shell, other module families, language catalogs, browser behavior or deployed bytes. A passing result is a local snapshot; any subsequent edit invalidates it. Use the repository mirror checker and focused runtime tests as separate gates.

For an authorized deployment, freeze the actual release manifest, including compiled app-shell assets and module/catalog hashes. Compare the exact URLs emitted by the served shell to that manifest, including cache behavior, then repeat the affected user journeys using those bytes. A matching Git commit or URL query pin alone does not prove that the server returned the intended artifact.

### Compare the published host text and reader bytes

Capture the successful local verifier output before deployment. Save UTF-8 JSON; the following shell command writes only the named evidence file. Stop if the verifier returns a nonzero exit code or `ok: false`.

```powershell
node dev-tools/check_reader_release.cjs --expect-head $readerBaseline --json |
    Set-Content -Encoding utf8 reports/reader-release-baseline.json
```

After the separately authorized deployment, run:

```powershell
node dev-tools/check_deployed_reader.cjs `
    --manifest reports/reader-release-baseline.json `
    --host-url https://alloflow-cdn.pages.dev/AlloFlowANTI.txt --json
```

This separate command makes at most four HTTPS GET requests: the exact host-text URL and its reader module URL, first ordinarily and then with `Cache-Control: no-cache` and `Pragma: no-cache`. It does not add a cache-busting query, execute fetched JavaScript, operate the app, read current Git state, write files or deploy. Requests may appear in the server's access logs and trigger cache revalidation. Each request has a 15-second deadline; decoded bodies are bounded to 16 MiB for the host and 8 MiB for the reader.

The supplied manifest must be a successful, internally consistent local check. Both served host responses must match its full host SHA-256 and byte count. The tool parses actual `ViewSimplifiedModule` loader calls, requires the single baseline URL and fetches that exact URL. Both module responses must match the full recorded module hash and byte count. Missing/dynamic/duplicate/stale loaders, redirects, unavailable responses, HTML fallbacks, stale cached bytes and a manifest edited during the check fail. Unexpected module URLs are reported without being followed.

JSON evidence records the manifest hash, its source HEAD, observed response hashes, exact URLs, times, status and available cache headers. Exit codes are 0 for a scoped match, 1 for a failed comparison or invalid baseline, and 2 for invalid CLI usage or an unreadable report. It does not reinterpret an old manifest using today's checkout; use the exact manifest captured for the release being checked. Treat manifests as operator-supplied evidence, not signed attestations.

A pass covers the published host text and reader from one network vantage point at that time. The compiled `/app/` shell, existing Canvas pastes, installed desktop packages, service-worker/browser caches and other assets still require separate byte checks and browser journeys. Do not describe this command alone as a verified complete release. A mismatch against newer, undeployed local work is expected evidence of different versions, not proof that production is broken.

Focused tool tests (write normal test caches/reports, use an in-memory fixture filesystem for faults):

```powershell
node node_modules/vitest/vitest.mjs run tests/reader_release_verification.test.js tests/deployed_reader_verification.test.js --maxWorkers=1
```
