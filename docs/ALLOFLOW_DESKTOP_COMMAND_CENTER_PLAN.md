# AlloFlow Desktop Command Center Plan

Status: foundation note, 2026-07-03; refreshed 2026-07-09 after the Desktop 0.2.7 local stack work.

## Decision

AlloFlow Desktop is the standalone command center for local, personal, and future School Box deployments.

The long-term default is now the AlloFlow-owned local model runner. Desktop 0.2.x ships an opt-in AlloFlow Built-in Engine that downloads and manages a private llama.cpp server. LM Studio and Ollama should remain supported compatibility presets, not required dependencies.

In plain terms:

- Canvas remains the easiest demo and current delivery path.
- Web deploy remains useful for hosted demos and cloud-key use.
- Desktop is the serious product shell: local files, user keys, local AI, same-room LAN sessions, sync controls, and optional School Box Server command center.
- School Box server/district mode can be embedded and managed by Desktop later, rather than becoming a totally separate product.

## Why Keep LM Studio And Ollama

LM Studio and Ollama should remain presets, not the product architecture.

They help because many users already have one installed, and they give advanced users a familiar local-AI path. They also remain useful fallbacks while the built-in engine grows through more model choices, GPU detection, quantization choices, memory limits, and local server reliability work.

They should not be required for the ordinary teacher path. The desktop product should offer:

- AlloFlow Built-in Engine: managed local runner, one-click install/start, controlled UX.
- LM Studio: OpenAI-compatible local server preset for users who already like it.
- Ollama: native local API preset for users who already use it.
- Custom Endpoint: escape hatch for schools, districts, labs, or hosted inference.

This is not redundant if the UI frames them as modes:

- Recommended: AlloFlow Built-in Engine.
- Advanced: LM Studio or Ollama.
- Admin: Custom endpoint or School Box server.

## Runtime Shape

Desktop should own a small runtime contract that the app can call without caring where the work happens.

Core services:

- AI text and chat
- Vision and document/image understanding
- Text-to-speech
- Local storage and project files
- Optional cloud/user-key providers
- Optional sync to School Box
- Health checks and diagnostics

The browser app should call one local bridge instead of directly knowing every desktop detail.

Suggested local services:

- AlloFlow Desktop shell: Electron or Tauri app window
- AlloFlow Runtime Bridge: localhost API for app features
- AlloFlow Local Engine: optional bundled model runner
- School Box Host: optional embedded server mode for classroom, school, or district hosting

## Provider Presets

Current provider presets:

- AlloFlow Built-in Engine: managed OpenAI-compatible local API at `http://127.0.0.1:32173` when Desktop starts it
- Gemini: cloud default, user key or deploy key depending on environment
- LM Studio: OpenAI-compatible local API through base server `http://localhost:1234` (`/v1` is appended by the provider layer)
- Ollama: native API at `http://localhost:11434`
- LocalAI: OpenAI-compatible local/self-hosted API through base server `http://localhost:8080`
- Custom Endpoint: advanced user/admin endpoint

Notes verified on 2026-07-03:

- LM Studio documents OpenAI-compatible endpoints including `/v1/models` and `/v1/chat/completions`, with examples using `http://localhost:1234/v1`.
- Ollama documents native local calls such as `http://localhost:11434/api/generate` and model listing through its local model API.

Official references:

- https://lmstudio.ai/docs/developer/openai-compat
- https://github.com/ollama/ollama/blob/main/docs/api.md

## Desktop As School Box Command Center

Desktop can supervise both the everyday local classroom mode and the optional School Box district/server version.

The useful split is not "desktop app versus server app." The better split is now:

- Desktop Solo: one teacher or learner, local projects, local model or personal cloud keys.
- Desktop LAN / Local Network: teacher starts a student-safe LAN Share from the desktop app. This does not require Docker.
- Optional Docker Server Host: school-owned appliance/server experiments that need the Docker School Box stack.
- District Server: future managed school/district deployment, with Desktop acting as admin console and client.

Desktop should be able to:

- Start and stop Desktop LAN sharing.
- Prepare, start, and stop the optional Docker School Box server when Docker is installed.
- Show server health and active sessions.
- Manage local model availability.
- Manage keys without exposing them to students.
- Export/import school data.
- Later connect to a district server when one exists.

## Foundation Status As Of 2026-07-09

Shipped foundation:

1. Explicit provider presets for AlloFlow Built-in Engine, LM Studio, Ollama, LocalAI, Gemini, and custom endpoints.
2. Settings and command-center status checks that report the selected provider and local engine state.
3. Backend-neutral AI provider abstraction.
4. Desktop Runtime Bridge contract and smoke coverage.
5. Opt-in managed llama.cpp engine.
6. Desktop LAN classroom mode with QR/join link/PIN diagnostics and a student-safe public listener.
7. Optional Docker School Box Server controls that are no longer presented as required for ordinary Desktop use.

Remaining work:

- Package a fresh installer whenever source/app-build changes need to reach the installed desktop app.
- Continue model selection, license review, and hardware guidance for the built-in engine.
- Keep Ollama and LM Studio optional rather than required.
- Build the remote District Server mode deliberately, with school-owned keys, retention, logging, and access controls.
- Decide whether WebRTC signaling should move onto the LAN bridge in a later version.

## Parked Idea: Document Intelligence Pack

Status: idea captured 2026-07-09; do not build yet.

Docling looks promising as an optional local helper for advanced document import,
but it should not be treated as a browser/CDN-only dependency. The likely product
shape is an AlloFlow Desktop or School Box "Document Intelligence Pack" that runs
on the user's own compute and exposes a local helper endpoint to the Canvas/app
popup flow. AlloFlow would keep its existing remediation pipeline as the source
of truth; Docling would only act as a stronger extraction/front-door layer for
messy PDFs, Office files, EPUBs, scanned materials, tables, figures, and reading
order metadata.

Preferred constraints if revisited:

- Optional pack, not part of the default Canvas payload.
- Local-first: desktop, School Box, or district-hosted; no Aaron-owned document
  processing cloud by default.
- CPU-first with GPU awareness; keep the existing browser pipeline as fallback.
- Treat output as provenance-rich input to `fixAndVerifyPdf`, not as a
  replacement for deterministic WCAG fixes, surgical tools, tagged-PDF export, or
  veraPDF validation.
- Spike only when we have real "ugly document" test cases where import fidelity,
  table recovery, or reading order are current blockers.
