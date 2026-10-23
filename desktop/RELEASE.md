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
  tooling, and trailer. The web-app lockfile still includes critical advisories
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

Lowest-cost Windows signing path:

1. Apply to SignPath Foundation as an open-source project. This is an application/review process, but it may avoid the usual commercial code-signing certificate cost if AlloFlow is accepted.
2. If that does not fit, use Azure Artifact Signing. It is the preferred managed paid fallback because Microsoft manages the signing certificate lifecycle.
3. Use a traditional OV/EV certificate only if the managed options do not work for the project.

The `desktop-release` workflow expects these GitHub Actions secrets:

- `WINDOWS_CSC_LINK`: base64 certificate content or a secure URL for the Windows signing certificate
- `WINDOWS_CSC_KEY_PASSWORD`: Windows certificate password
- `MAC_CSC_LINK`: base64 certificate content or a secure URL for the Apple Developer ID certificate
- `MAC_CSC_KEY_PASSWORD`: Apple certificate password
- `APPLE_ID`: Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer team ID

Electron Builder reads those values through the standard `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables inside each job.

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
