# AlloFlow Desktop

This is the current everyday local-first AlloFlow path. It runs as a native Electron shell, serves the bundled app locally, manages local AI pieces, and can produce Windows desktop artifacts.

## Desktop vs School Box

AlloFlow Desktop is the recommended path for a teacher laptop or personal workstation. It does not require Docker for the bundled app, the command center, local keys, the built-in AI engine, offline speech-to-text, Kokoro voice support, or same-room LAN classroom sessions.

School Box is the optional server/appliance path. The Docker stack is kept for school-owned boxes, district/server experiments, air-gapped deployments, and heavier infrastructure tests that need services such as PocketBase, Ollama, Piper, SearXNG, or Flux. If you are only running AlloFlow Desktop, Docker Desktop can be absent or stopped.

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
- A shipped AlloFlow Built-in Engine that downloads and manages a private llama.cpp server when the user opts in
- A first School Box Server command center that prepares, starts, stops, and checks the optional Docker stack when Docker is installed
- School Box Server next-action guidance and setup-guide steps, including a clear split between the optional Docker Server Host mode and the future District Server command-center mode

Run checks:

```powershell
npm.cmd run desktop:check
npm.cmd run desktop:smoke
```

Run the command center:

```powershell
npm.cmd run desktop
```

Then open:

```text
http://127.0.0.1:32170
```

Production notes:

- Packaged Electron builds use OS-backed encrypted storage for saved provider keys. Non-Electron local runtime checks keep a plaintext fallback only so development commands can still run.
- The runtime binds to `127.0.0.1` by default.
- The app manager only stops the process Desktop started; it does not stop an already-running external `localhost:3000` server.
- Desktop LAN classroom sessions use the Desktop runtime and LAN Share listener. They do not require the Docker School Box stack.
- School Box Server management looks for `ALLOFLOW_SCHOOLBOX_ROOT`, then packaged `resources/schoolbox`, then the project checkout's `docker-compose.yml`. Packaged builds include the first Docker-ready School Box resource layout, but model/images still download through Docker on first start.
- School Box `Docker Server Host` mode is optional infrastructure. `District Server` is visible as the future command-center target, but it does not start local services yet.

Native shell:

```powershell
Set-Location desktop
npm.cmd run verify:release
npm.cmd run start
```

The native shell and packaging scripts live in `desktop/package.json` and require the `desktop/node_modules` dependencies.

Electron stays on the patched 39.8.5+ line for now because Electron 43's installer hit a Windows ARM64 native extraction issue in this workspace. Re-test Windows ARM64 packaging before the next major upgrade.

The packaging commands use the version-controlled build-resources/icon.ico. Regenerate it only when allobot.svg changes:

    Set-Location desktop
    npx playwright install chromium
    npm.cmd run icon:build

Build the bundled desktop web app:

```powershell
Set-Location desktop
npm.cmd run web:build
```

Package desktop artifacts:

```powershell
Set-Location desktop
npm.cmd run package:win
npm.cmd run package:win-arm64
npm.cmd run package:win-x64
npm.cmd run package:mac
npm.cmd run package:mac-arm64
npm.cmd run package:mac-x64
npm.cmd run verify:artifacts:win
# On macOS: npm run verify:artifacts:mac
```

Artifacts are written to `desktop/dist/`. Windows ARM64 is supported by the local Electron runtime in this workspace. Mac artifacts should be produced on macOS or in a macOS CI runner before signing/notarization.

Signing and updates:

- Windows signing is handled by electron-builder when a code-signing certificate is provided through secure CI/user environment variables such as `CSC_LINK` and `CSC_KEY_PASSWORD`.
- macOS signing/notarization should run on macOS with Apple Developer ID credentials available to electron-builder/electron-notarize.
- Auto-updates use `electron-updater`. Packaged builds read the GitHub release feed configured in `desktop/electron-builder.json`; development builds show updates as not configured.
- Release publishing should be done from CI with a GitHub token available to electron-builder, using signed Windows NSIS installers and signed/notarized macOS zip artifacts. The zip artifact is required for macOS auto-update metadata.
- Use the combined `package:win` command from the `desktop/` folder for release candidates so x64 and ARM64 installers are produced in the same build pass. Running the single-architecture package commands is fine for local testing, but it can leave `latest.yml` pointing only at the architecture built last.
- Use the `desktop-release` workflow's `beta` channel input for prerelease update testing. CI rewrites the package version to a prerelease version for that channel.
- The full signing/update checklist lives in `desktop/RELEASE.md`.
