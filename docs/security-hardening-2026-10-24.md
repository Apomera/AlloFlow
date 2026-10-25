# AlloFlow security hardening review

October 24, 2026. No deployment or release has been performed; the current Cloudflare site is unchanged. The [independent backup plan](independent-backup-plan.md) remains deferred. An approved source snapshot is on the isolated `codex/mcp-platform-validation-20261024` branch for real Linux/macOS validation.

## Completed hardening

The Gemini Bridge attachment label treats uploaded filenames as text, preventing HTML injection. Both distributed modules were regenerated, and actual callback regressions cover malicious filenames and ordinary attachment/removal behavior.

The secret scanner checks nested first-party application sources, recognizes fine-grained GitHub tokens and encrypted private keys, fully redacts values, and fails on incomplete coverage. Credential-shaped values are no longer suppressed by words such as `mock` or `example`. Private environment files, vendor code, builds and arbitrary artifacts remain outside this bounded source scan.

The desktop MCP runtime now uses compatibility-tested Puppeteer 25.16.0 and Conf 10.2.0. These remove the old Zod 3, FTP and Ajv 7 dependency paths. The direct Ajv override was rejected during testing because it broke configuration error handling; the configuration-store upgrade preserves defaults, persistence, formats and invalid-value rejection.

The unpatched upstream `extract-zip` implementation is removed. All its imports resolve to the explicit first-party `@alloflow/disabled-extract-zip` package, which rejects before I/O. Supported EPUB processing uses the bounded extractor and passes an expanded directory to Ace. Browser installation uses Playwright. This is a disabled fallback, not an upstream ZIP patch. The two old ZIP advisory exceptions were removed.

The remediation runtime now requires **Node 22.12 or newer**. Runtime capability checks, bundle metadata and host guidance reflect this requirement. The standalone Agent Core connector has separate requirements.

## EPUB browser containment

The Ace worker removes upstream sandbox-disabling flags and uses a pipe for browser control. It never retries without Chromium's sandbox. Pages enforce offline mode, service-worker bypass, restrictive document CSP and realpath containment of local files. Active document scripts, event handlers, external connections, frames, workers and objects are blocked. Trusted audit code runs through CDP with its timers intact.

Actual Chromium tests verified zero HTTP or WebSocket requests to the synthetic test server, blocked malicious scripts and outside-file content, denied directory-junction escapes, and working trusted timers and passive raster images. A stable explicit CDP offline command avoids a Puppeteer/installed-Chromium protocol mismatch found during testing. Ace processes documents serially.

## Release checks

The packaged dependency gate rejects registry errors, failed processes, malformed or incomplete audit schemas, contradictory counts and unresolved advisory chains. Its Windows command uses fixed arguments with the target directory supplied as `cwd`, preventing directory names from becoming shell commands.

Before executing extracted code, the artifact verifier checks first-party source hashes, the entry point and launch configuration, the Node requirement, and runtime dependency settings. It checks both the source ZIP replacement and its installed copy. The runtime lock is included as `runtime-dependencies.lock.json` because the official packer excludes the conventional lockfile filename.

Full distribution verification runs configuration compatibility, the disabled ZIP fallback, browser startup, a real Ace audit and malicious-content browser probes against the extracted artifact. Dependency paths must resolve within that artifact. The builder installs without lifecycle scripts and uses `--install-links` to materialize normal files. CI includes the new audit, containment and source-integrity regressions.

The cross-platform follow-up also found and fixed a cache binding gap: packaged EPUB verification now fingerprints the shipped `runtime-dependencies.lock.json`. A regression reproduces the stale identity before the fix and requires dependency-lock changes to invalidate it. The runtime harness now executes the selected bundled EPUBCheck and veraPDF JARs on synthetic documents. Both real Java checks passed locally and against the same CI package on Windows x64, Linux x64, macOS ARM64 and macOS Intel. EPUBCheck must accept the valid EPUB with zero errors/fatals; veraPDF must report the deliberately noncompliant PDF with completed checks and matching input SHA/byte binding. Host JAR overrides cannot substitute for the selected package's validators.

## Validation results

| Check | Result |
| --- | --- |
| Complete dependency audit across ten maintained scopes | Zero findings at every reported severity; all scopes complete |
| Actual MCPB staging dependency audit at the low threshold | Zero findings and zero accepted advisories |
| Native test runner | 13 suites passed |
| Focused MCP security gate | 224 Vitest tests across 16 suites passed; native gate checks passed |
| EPUB/archive/packaging regressions | 54 tests passed |
| Final runtime compatibility | Four tests passed, including a real Ace EPUB audit with zero findings |
| Real Chromium containment probes | Seven tests passed with zero skips |
| Final packaging and workflow regressions | 12 tests passed |
| Remote MCP service check | 159 tests across 20 suites, generated types, typecheck, lifecycle, staging and dry-run bundle passed |
| Remote runner check | 48 tests passed; 71 staged dependencies verified |
| Remote preflight | 46 passed; one Windows file-symlink privilege test skipped |
| Trailer | ESLint and TypeScript passed without warnings; rendered/inspected a 1920 by 1080 still and a 60-frame, two-second H264 clip |
| Exact MCPB artifact | Official format validation, source-byte checks, extracted runtime/browser tests, protocol and HTTP authentication probes passed; 41 tools and 59 vendor hashes verified |

One source-integrity unit test also skipped creation of a file symlink because Windows lacks that privilege. Real directory-junction containment tests passed. The native gate normally leaves its real-browser probe off; full distribution verification explicitly enables and passes that probe.

Initial validation ran on Windows ARM64 with supported x64 browser/Worker binaries under emulation. The exact official Worker and Remotion native archives were checked against lockfile integrity. The unavailable Windows sandbox launcher and an initial host-memory failure were resolved for local validation without changing deployment settings or weakening tests.

The [cross-platform follow-up run](https://github.com/Apomera/AlloFlow/actions/runs/40113933090) uses source commit `642ddda600135e21d3f120cd43af1a790bd2ab6a`. **All seven jobs passed.** Linux x64 (Node 24.21.0), macOS ARM64 (Node 24.20.0), and macOS Intel (Node 24.19.0) each passed all **24 native security tests, with zero skips**: 72 passed overall. These include actual file/directory symlink escape tests, Chromium containment, source-integrity checks, dependency-audit failure handling, and remote staging-path protection. The previously skipped file-symlink cases executed successfully on every non-Windows platform. [Linux evidence](../tmp/mcp-platform-validation/linux-native/), [Apple Silicon evidence](../tmp/mcp-platform-validation/macos-arm64-native/), and [Intel Mac evidence](../tmp/mcp-platform-validation/macos-x64-native/) are retained locally.

The Windows x64 CI job (Node 24.22.1) built and fully verified one MCPB candidate. That exact archive then passed extracted-artifact verification on all three non-Windows platforms, with the same SHA-256 checked on every host. Verification includes the six real runtime checks (configuration, disabled ZIP fallback, Chromium, Ace, EPUBCheck and veraPDF), malicious-content browser probes, first-party source bytes, 59 vendor hashes, stdio/HTTP protocol and HTTP authentication. Chromium sandboxing remained enabled. The packaged dependency audit has zero findings at every severity and zero accepted advisories. The workflow has read-only repository permissions and no release/deployment steps; Cloudflare's build check reports skipped.

The native matrix starts independently of Windows packaging, and CI fails if any selected native test is skipped. Six workflow contract tests and seven focused EPUB validation regressions also passed locally. The [final evidence receipt](../tmp/mcp-platform-validation/verification-receipt.json) cross-checks all seven job conclusions, the three zero-skip TAP reports, package hashes, source commit, and unchanged security-owned source files. These results apply to this isolated source snapshot; unrelated concurrent application changes were not folded into it.

## Local artifact and evidence

- Current CI candidate: [alloflow-remediation.mcpb](../tmp/mcp-platform-validation/ci-candidate/alloflow-remediation.mcpb), manifest version 0.11.3, 67,844,442 bytes. This is the same Windows-built archive verified on Linux and both Mac architectures; it has not been released.
- SHA-256: `20915f7744195e06fac1ab5a63a47c68f9750d487dd74c88711b88e23e8597ea`.
- [Final verification receipt](../tmp/mcp-platform-validation/verification-receipt.json), [checksums](../tmp/mcp-platform-validation/ci-candidate/SHA256SUMS.txt), [Windows build](../tmp/mcp-platform-validation/windows-ci/build.log), [CI packaged audit](../tmp/mcp-platform-validation/windows-ci/dependency-audit.log), [Linux artifact verification](../tmp/mcp-platform-validation/linux-artifact/exact-artifact.log), [Apple Silicon artifact verification](../tmp/mcp-platform-validation/macos-arm64-artifact/exact-artifact.log), and [Intel Mac artifact verification](../tmp/mcp-platform-validation/macos-x64-artifact/exact-artifact.log).
- A separate local frozen build also passed full verification and the packaged audit: 67,844,451 bytes, SHA-256 `4de272ff20bfd5bc3a43b7448a6bce3bd5e4a66c4964bfa2fc17cd2d11524cd1`. Its [local receipt](../tmp/mcp-platform-validation/local-verification-receipt.json), [build log](../tmp/mcp-platform-validation/frozen-candidate-build.log), and [audit](../tmp/mcp-platform-validation/frozen-packaged-audit.log) remain available.
- The earlier pre-follow-up candidate had SHA-256 `da6c424eec93d6719abe76e17b3b1631bce27dc1c867086ae61a01b5d37ddb0d`; it is superseded. A subsequent shared-workspace build was correctly rejected when another chat changed `doc_pipeline_module.js` during packaging. That rejected artifact was moved out of the distribution directory to ignored evidence. Builds now use the frozen approved source snapshot so unrelated concurrent changes cannot alter the candidate.
- [Complete dependency audit](../tmp/mcp-security-final-20261024/dependency-audit.json), [build verification](../tmp/mcp-security-final-20261024/build.log), and [packaged audit](../tmp/mcp-security-final-20261024/packaged-audit.log).
- [Remote check receipt](../tmp/remote-mcp-validation-20261024/service-check-final.json) and [runner log](../tmp/remote-mcp-validation-20261024/runner-check.log).
- [Trailer still](../tmp/trailer-security-validation-20261024/feature-frame-1100.png) and [rendered clip](../tmp/trailer-security-validation-20261024/feature-transition-1000-1059.mp4).

These local artifacts and logs are ignored build evidence. Use the normal reviewed release/version process before publishing; do not replace an existing published artifact with different bytes under the same version. A clean audit establishes the reported dependency state, not absence of all application vulnerabilities.
