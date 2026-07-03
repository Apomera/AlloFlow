# AlloFlow Desktop

This is the first buildable desktop foundation. It does not package a native app yet.

It provides:

- A local Desktop Runtime Bridge at `http://127.0.0.1:32170`
- A command-center UI served by that bridge
- Provider status checks for AlloFlow Local Engine, LM Studio, Ollama, LocalAI, Gemini, and custom endpoints
- Redacted local config endpoints for user keys and provider settings
- Stub endpoints for the future AlloFlow Built-in Engine and embedded School Box host

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

- Secrets currently live in the local desktop config file and are redacted from API responses. Before production packaging, move them into the OS keychain.
- The runtime binds to `127.0.0.1` by default.
- Electron or Tauri can wrap this runtime and command center later without changing the API contract.

