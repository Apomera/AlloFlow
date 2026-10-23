# AlloFlow Desktop Release Notes

This file tracks the release path for signed installers, auto-updates, and cross-platform desktop builds.

## Release validation — 2026-10-23

Validation branch: `codex/security-release-validation-20261023`. The release
candidate is isolated from unrelated work in the main checkout. No production
deployment, release tag, or public release was created.

- [Linux Worker/runner validation](https://github.com/Apomera/AlloFlow/actions/runs/39965515837)
  passed on `41729858e0546489384239817dc0adf20ebb1f61`: 159 Worker tests,
  47 deployment/preflight tests, 48 runner tests, 294 shared remediation tests,
  two browser canaries, and the Linux container build. Later candidate changes
  affect desktop validation only.
- [macOS beta validation](https://github.com/Apomera/AlloFlow/actions/runs/39975251008/job/120488042960)
  passed on `66f744543712fc528c64acfaead6ffcab3af43c8`: runtime/UI checks,
  x64 and ARM64 DMG/ZIP builds, packaged layouts, and hashes for every entry
  in `beta-mac.yml`. The validation artifacts uploaded successfully.
- The Windows job in that run passed runtime/UI checks, both packaged layouts,
  the combined and architecture-specific installer hashes, and installation.
  Its uninstall test caught a leftover custom desktop shortcut. The fix uses
  the registered shortcut path and preserves the existing keep-shortcuts
  behavior during updates. [Windows revalidation](https://github.com/Apomera/AlloFlow/actions/runs/39978415906)
  passed on `57f54f34e675ca2d99e12d350c51d48e2837e176`: runtime/UI tests,
  both packaged layouts, every installer hash, rejection of the ARM64-only
  installer on x64 Windows, and clean installation/uninstallation including
  shortcut removal. This follow-up changes only Windows installer cleanup
  and manual workflow platform selection; the macOS application is unchanged.
- [Repository-wide verification](https://github.com/Apomera/AlloFlow/actions/runs/39965490196)
  failed. Comparison with the [main-branch baseline](https://github.com/Apomera/AlloFlow/actions/runs/39911869942)
  found 112 shared failing test files. Six additional candidate failures were
  timeouts in unchanged tests and source; an isolated recheck passed 63 tests
  and still timed out in four. The static gate also reports 14 unregistered
  Raptor Hunt translation keys. These gates were not weakened or waived.
- The updated desktop dependency scope and remote Worker scope passed their
  audit gates with no findings. The full repository audit remains failing in
  other scopes, including the web app, local MCP runtime, accessibility audit
  tooling, and trailer. At that validation snapshot, the web-app lockfile included critical advisories
  for [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) and
  [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). An audit
  finding alone does not establish exploitability or a compromised machine.

The validation fixes cover clean-checkout PDF/media fixtures, Windows long
  paths, web compiler memory, beta metadata selection, macOS artifact hash
coverage, and desktop startup with slow Docker probes. Optional Docker
version checks now run asynchronously, share concurrent work, and cache status
for 15 seconds; server actions force a fresh check. The local Electron UI smoke
passed with deliberately delayed Docker responses, and a release regression
test covers concurrency, failure, cache expiration, and action refresh.

Public release remains blocked by the repository-wide failures and outstanding
dependency review. Signing credentials were absent from the validation jobs;
configure the secrets below and validate signed Windows and notarized macOS
artifacts before publication. Unsigned beta builds do not validate signing,
notarization, physical ARM64 installation, or live auto-update delivery.

## Security follow-up — 2026-10-23

The follow-up is separated into [repository safeguards](https://github.com/Apomera/AlloFlow/pull/13),
[desktop/web dependencies](https://github.com/Apomera/AlloFlow/pull/14), and
[local speech input validation](https://github.com/Apomera/AlloFlow/pull/15).
MCP code, dependency manifests, generated types, and dedicated workflows are
excluded while that development is active.

Electron 43.8.3 is now installed in the local desktop dependency tree and passed
the release runtime, security-boundary, and Electron UI checks. Compatible web
dependency patches, including patched gRPC and Underscore versions, are also
installed. The complete lockfile audits report zero desktop findings. The web
app's subsequent loader, serialization and development-server updates reduce
its earlier 15 high findings to zero high or critical findings (31 moderate and
9 low remain in the complete lockfile audit).
Scoped overrides update SVGR to 8.1.0 and resolve-url-loader to 5.0.0, and
serialize-javascript to 7.0.5; React Scripts stays at 5.0.1. Node 20.19 or newer is
required by the complete toolchain, including the existing SWC CLI. Real SVG URL/component imports, accessible
titles and refs, CSS source-map asset resolution, and the production minifier
worker pass compatibility tests. The application compiles in production mode
without recopying its unchanged static payload; postbuild packaging is not part
of that compilation check.

The development server now uses webpack-dev-server 5.2.7, webpack-dev-middleware
7.4.6, and selfsigned 5.5.0, removing the vulnerable node-forge certificate chain.
A small launcher adapts CRA's compiler and proxy helpers to the current server
API. It defaults to loopback, validates browser origins and preview hostnames,
and keeps the public-path boundary intact. Real HTTP/WebSocket tests cover
source maps, hostile origins, traversal attempts, SPA routing, hot reload,
proxy forwarding, generated/custom HTTPS certificates, and clean React launcher
startup/shutdown. A headless Edge check also preserved React component state
across Fast Refresh with no page errors. See [web development settings](web-app/DEVELOPMENT.md) for
explicit LAN access, trusted reverse proxies and HTTPS configuration. No forced
React Scripts downgrade or audit suppression was used.

A follow-up removal/compatibility review compared the security PR with its base.
No tracked files were deleted, and application source/assets and production
build/postbuild commands were unchanged. Three custom-preview regressions were
reproduced and repaired: setupProxy again receives an Express app with settings
and locals; error-overlay source requests run before catch-all custom proxies;
and explicitly trusted origins can complete JSON/Authorization preflights.
The regression tests fail against the previous launcher and pass after the
repairs. A real Edge browser confirmed trusted requests and rejected an untrusted
origin before the API handler ran.

Removed dependencies have replacement behavior: node-forge certificate creation
is covered by generated/custom HTTPS tests; flask-cors was unused by the speech
server, whose explicit CORS hooks retain local/trusted-origin support. Removing
downloaded Python tokenizer code is covered by the prior three-tokenizer check.
LAN binding and larger-workload limits are intentional opt-in/validation changes,
documented in the web development and Docker guides. Full container builds and
GPU/NPU inference remain outside this validation; endpoint tests use synthetic
provider results and do not establish hardware/model compatibility.

Trailer dependencies now use matching Remotion 4.0.538 packages and ESLint 9.39.5,
with compatible transitive patches. Its complete lockfile audit has zero findings,
down from 1 critical, 15 high, 2 moderate, and 2 low. The production bundle,
TypeScript check, and a rendered frame passed in an isolated installation. The
existing two lint errors and one warning reproduce with the old dependency set;
this update does not claim a clean lint run. After isolated validation, both local
build-tool installations were refreshed with npm ci and lifecycle scripts disabled.
Other checkouts should use npm ci when adopting the updated locks.

The additional Security safeguards workflow checks pinned action commits,
read-only default tokens, checkout credential cleanup, and signing-secret scope.
It audits changed desktop, trailer, policy-parser and web-app dependencies at
high severity. The existing full audit still
reports all maintained scopes and remains failing on outstanding findings.
Scheduled and manual safeguard runs audit all four scopes regardless of file
changes. The required check also tests development-server boundaries and
compatibility plus the updated loaders/minifier, builds and
type-checks the trailer, and compiles the web application; lint and the large
unchanged public asset payload are outside that production compilation check.
Dependabot alerts and security updates are enabled, with automatic MCP updates
explicitly paused. The passing Security safeguards check is required on `main`;
the existing administrator bypass and other protection settings are preserved.
The first CodeQL Actions and Python analyses completed; its initial
JavaScript/TypeScript analysis is still running at this record's snapshot.
Successful analysis does not mean all findings are fixed.

The speech-server patch validates Piper catalog model IDs before filesystem or
process use and rejects control characters before browser-origin validation.
Twenty local tests cover request rejection, voice fallback, language selection,
and allowed origins. CodeQL alert closure requires a rescan.

[Fresh Windows validation](https://github.com/Apomera/AlloFlow/actions/runs/39989121261)
passed on `59e4851ec6563925562cbcb81ae98808c20ae551` with the patched web lockfile:
web build, runtime and Electron UI checks, x64/ARM64 packaging, artifact hashes,
ARM64-only rejection on x64 Windows, and clean install/uninstall. Validation
artifacts uploaded successfully. Subsequent integration commits bring in the
separately tested repository safeguards and speech-server fixes plus this record;
they do not change the tested desktop or web dependency versions.

## Build Artifacts

**Ship the flavored desktop edition.** `package:desktop:*` bakes `alloEdition: desktop`, which is what gives users the guided first-run AI wizard, the full-screen app boot (console behind the ⚙ gear / Exit Full Screen), and the installer's "Choose your experience" page including Document remediation. The unflavored `package:win` build keeps pure upstream behavior (boots into the command center console) and must NOT be shipped as AlloFlow Desktop.

```powershell
Set-Location desktop
npm.cmd run web:build
npm.cmd run verify:release
npm.cmd run package:desktop:win
npm.cmd run verify:artifacts:win
```

macOS artifacts should be built on macOS or in the `desktop-release` GitHub workflow:

```bash
cd desktop
npm run web:build
npm run verify:release
npm run package:desktop:mac
npm run verify:artifacts:mac
```

The separate architecture scripts are useful for local testing:

```powershell
Set-Location desktop
npm.cmd run package:desktop:win-x64
# unflavored upstream-parity builds (dev only, not for release):
npm.cmd run package:win-arm64
npm.cmd run package:win-x64
```

Desktop artifacts (flavored and unflavored alike) are written to `desktop/dist/`; the Admin Server flavor goes to `desktop/dist/admin/`.

The development-only `package:win` wrapper stages builds outside synchronized folders to prevent OneDrive or antivirus file locks from truncating a large NSIS executable. For release validation, use the `desktop-release` workflow: it runs `package:desktop:win` on a clean runner, verifies both packaged architectures and installer hashes, then runs `verify:installer:win`. That test first requires the ARM64-only installer to reject x64 Windows with exit code 2, then installs and uninstalls the combined setup. It refuses to run if it detects an existing AlloFlow installation.

The combined `AlloFlow-Desktop-<version>-setup.exe` is the recommended Windows download because it contains both x64 and ARM64 payloads. Keep the architecture-specific installers for updates and troubleshooting. Publish `WINDOWS-INSTALL.md` and `SHA256SUMS-windows.txt` beside the installers.

## Signing

Do not commit certificates, passwords, provisioning files, API keys, or Apple credentials.

Signing enrollment is outstanding: the maintainer has neither a Windows signing
service/certificate nor an Apple Developer membership as of 2026-10-23.

Windows enrollment options:

1. [Apply to SignPath Foundation](https://signpath.org/apply) as an open-source project. Free signing is subject to [their conditions and approval](https://signpath.org/terms.html), including project reputation, open-source components, MFA, a published signing policy, and release approval. AlloFlow's AGPL license alone does not guarantee acceptance.
2. If that does not fit, review [Azure Artifact Signing enrollment and identity validation](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart).
3. Use a traditional OV/EV certificate only if the managed options do not work for the project.

For macOS, the maintainer must [enroll in the Apple Developer Program](https://developer.apple.com/programs/enroll/) and obtain a Developer ID Application certificate for signing and notarization. Apple lists US$99 per membership year, with regional pricing and possible fee waivers for qualifying institutions. Identity verification, legal agreements, and any purchase must be completed by the account holder.

The current `desktop-release` workflow supports the certificate-based path and expects these GitHub Actions secrets:

- `WINDOWS_CSC_LINK`: base64 certificate content or a secure URL for the Windows signing certificate
- `WINDOWS_CSC_KEY_PASSWORD`: Windows certificate password
- `MAC_CSC_LINK`: base64 certificate content or a secure URL for the Apple Developer ID certificate
- `MAC_CSC_KEY_PASSWORD`: Apple certificate password
- `APPLE_ID`: Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer team ID

Electron Builder receives those values only in signing/package steps for tagged
releases. They are not exposed to dependency installation, web builds, or tests.
Manual validation runs remain unsigned and cannot publish a release. A managed
service such as SignPath or Azure needs its own signing integration after approval;
do not assume it supplies an exportable PFX for `WINDOWS_CSC_LINK`. Credentials
belong in GitHub Actions secrets, never source control or chat.

## Updates

AlloFlow Desktop uses `electron-updater`.

- Development builds report updates as unavailable unless `ALLOFLOW_UPDATE_FEED_URL` is set.
- Packaged builds check the release feed configured in `desktop/electron-builder.json`.
- The updater does not auto-download or auto-install. The user chooses Check, Download, and Install.
- The desktop Settings tab reports the installed version, available version, update channel, platform, CPU architecture, and feed.
- The Settings tab can switch between the stable `latest` channel and the prerelease `beta` channel.
Windows NSIS packages intentionally use ZIP/`nsisunz` extraction because the default `Nsis7z` plugin silently produced an empty install on tested Windows ARM hardware. `differentialPackage` is disabled with this mode, so update downloads can be larger; successful installation takes priority over the embedded differential-package optimization.

- Manual GitHub release workflow runs can choose `beta`; CI rewrites the package version to a prerelease version and the edition builder explicitly selects the matching publisher channel. This generates `beta.yml` and `beta-mac.yml` separately from stable metadata. Manual runs build validation artifacts with `--publish never`; only tagged runs can create a draft release, after signing checks pass.

For production releases, publish Windows x64 and ARM64 artifacts together so update metadata is generated as a set. Building one architecture after the other can leave `latest.yml` pointing only at the most recent installer.

## Secrets

Packaged Electron builds configure the desktop runtime to use Electron `safeStorage`, which encrypts saved provider keys with OS-backed user storage. Existing plaintext `secrets.*.value` entries are migrated to encrypted records on the next desktop launch when OS storage is available.

Development runtime without Electron falls back to plaintext only so local checks can still run. Production desktop builds should verify that Settings diagnostics report encrypted secret storage before release.

## Suggested Release Flow

1. Land and verify the desktop changes.
2. Tag a release with a desktop tag such as `desktop-v0.2.8`.
3. Let `.github/workflows/desktop-release.yml` build Windows and macOS artifacts.
4. Confirm the draft GitHub release contains the combined Windows installer, Windows x64, Windows ARM64, `WINDOWS-INSTALL.md`, `SHA256SUMS-windows.txt`, macOS x64, macOS ARM64, macOS blockmaps, and update metadata. Windows blockmaps are intentionally absent while ZIP/nsisunz full-download mode is enabled.
5. Install on a Windows x64 machine, this Windows ARM64 machine, and a macOS machine before publishing the draft.
