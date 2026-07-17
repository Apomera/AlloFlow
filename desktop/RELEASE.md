# AlloFlow Desktop Release Notes

This file tracks the release path for signed installers, auto-updates, and cross-platform desktop builds.

## Build Artifacts

Use the combined architecture scripts for release candidates:

```powershell
Set-Location desktop
npm.cmd run verify:release
npm.cmd run package:win
npm.cmd run verify:artifacts:win
```

macOS artifacts should be built on macOS or in the `desktop-release` GitHub workflow:

```bash
cd desktop
npm run verify:release
npm run package:mac
npm run verify:artifacts:mac
```

The separate architecture scripts are useful for local testing:

```powershell
Set-Location desktop
npm.cmd run package:win-arm64
npm.cmd run package:win-x64
```

Release artifacts are written to `desktop/dist/`.

Local `package:win` builds are staged outside synchronized folders to prevent OneDrive or antivirus file locks from truncating a large NSIS executable. The wrapper verifies both packaged architectures, binds each updater entry to its exact SHA-512, and validates the exact SHA-256 manifest before publishing files into `desktop/dist/`. CI uses `package:win:ci` on its clean, non-synchronized runner, then runs `verify:installer:win`: it first requires the ARM64-only installer to reject x64 Windows with exit code 2, then installs and uninstalls the combined setup. The smoke test refuses to run if it detects an existing AlloFlow installation.

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

- Manual GitHub release workflow runs can choose `beta`; CI rewrites the package version to a prerelease version so beta metadata is generated separately from stable metadata.

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
