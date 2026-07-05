# AlloFlow Desktop

This is the first buildable desktop foundation. It can run as a native Electron shell and can produce Windows desktop artifacts.

It provides:

- A local Desktop Runtime Bridge at `http://127.0.0.1:32170`
- A command-center UI served by that bridge
- A first-run API key prompt when the selected cloud provider needs a key
- A bundled-app route at `http://127.0.0.1:32170/app/` once `desktop/app-build` exists
- Managed start/status/stop controls for the local AlloFlow web app
- Provider status checks for AlloFlow Local Engine, LM Studio, Ollama, LocalAI, Gemini, and custom endpoints
- A desktop Voice Engine panel that can preload the bundled Kokoro loader and cache the default local voice model
- Native update status/check/download/install controls for packaged release builds
- Stable and prerelease beta update-channel controls
- A redacted Copy Diagnostics action for support/debugging
- Redacted local config endpoints for user keys and provider settings
- OS-backed encryption for saved provider keys in packaged Electron builds
- Stub endpoints for the future AlloFlow Built-in Engine
- A first School Box command center that prepares, starts, stops, and checks the existing Docker stack when Docker is installed
- School Box next-action guidance and setup-guide steps, including a clear split between today's local Desktop Host mode and the future District Server command-center mode

Run checks:

```powershell
npm run desktop:check
npm run desktop:smoke
```

Run the command center:

```powershell
npm run desktop
```

Then open:

```text
http://127.0.0.1:32170
```

Production notes:

- Packaged Electron builds use OS-backed encrypted storage for saved provider keys. Non-Electron local runtime checks keep a plaintext fallback only so development commands can still run.
- The runtime binds to `127.0.0.1` by default.
- The app manager only stops the process Desktop started; it does not stop an already-running external `localhost:3000` server.
- School Box management looks for `ALLOFLOW_SCHOOLBOX_ROOT`, then packaged `resources/schoolbox`, then the project checkout's `docker-compose.yml`. Packaged builds include the first Docker-ready School Box resource layout, but the model/images still download through Docker on first start.
- School Box `Desktop Host` mode is the current working path. `District Server` is visible as the future command-center target, but it does not start local services yet.

Native shell:

```powershell
npm run desktop:electron:check
npm run desktop:native
```

`desktop:native` requires the `electron` dev dependency.

Electron is currently pinned to the 37.x line because Electron 43's installer hit a Windows ARM64 native extraction issue in this workspace.

Build the bundled desktop web app:

```powershell
npm run desktop:web:build
```

Package desktop artifacts:

```powershell
npm run desktop:package:win
npm run desktop:package:win-arm64
npm run desktop:package:win-x64
npm run desktop:package:mac
npm run desktop:package:mac-arm64
npm run desktop:package:mac-x64
npm run desktop:verify:artifacts
```

Artifacts are written to `desktop/dist/`. Windows ARM64 is supported by the local Electron runtime in this workspace. Mac artifacts should be produced on macOS or in a macOS CI runner before signing/notarization.

Signing and updates:

- Windows signing is handled by electron-builder when a code-signing certificate is provided through secure CI/user environment variables such as `CSC_LINK` and `CSC_KEY_PASSWORD`.
- macOS signing/notarization should run on macOS with Apple Developer ID credentials available to electron-builder/electron-notarize.
- Auto-updates use `electron-updater`. Packaged builds read the GitHub release feed configured in `electron-builder.desktop.json`; development builds show updates as not configured.
- Release publishing should be done from CI with a GitHub token available to electron-builder, using signed Windows NSIS installers and signed/notarized macOS zip artifacts. The zip artifact is required for macOS auto-update metadata.
- Use the combined `desktop:package:win` command for release candidates so x64 and ARM64 installers are produced in the same build pass. Running the single-architecture package commands is fine for local testing, but it can leave `latest.yml` pointing only at the architecture built last.
- Use the `desktop-release` workflow's `beta` channel input for prerelease update testing. CI rewrites the package version to a prerelease version for that channel.
- The full signing/update checklist lives in `desktop/RELEASE.md`.
