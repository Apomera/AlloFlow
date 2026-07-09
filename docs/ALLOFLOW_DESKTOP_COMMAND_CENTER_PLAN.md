# AlloFlow Desktop Command Center Plan

Status: foundation note, 2026-07-03

## Decision

AlloFlow Desktop should become the standalone command center for local, personal, and future School Box deployments.

The long-term default should be an AlloFlow-owned local model runner, but the first foundation should keep LM Studio and Ollama as supported compatibility presets. That avoids forcing early users into one local-AI stack while still letting the product grow toward a bundled, one-click experience.

In plain terms:

- Canvas remains the easiest demo and current delivery path.
- Web deploy remains useful for hosted demos and cloud-key use.
- Desktop becomes the serious product shell: local files, user keys, local AI, sync controls, and School Box command center.
- School Box server/district mode can be embedded and managed by Desktop later, rather than becoming a totally separate product.

## Why Keep LM Studio And Ollama For Now

LM Studio and Ollama should be presets, not the product architecture.

They help immediately because many users already have one installed, and they reduce the amount AlloFlow must solve on day one: model download, GPU detection, quantization choices, memory limits, and local server reliability.

They should not be the final dependency. A polished desktop product should eventually offer:

- AlloFlow Built-in Engine: bundled local runner, one-click install, controlled UX.
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

Current and planned provider presets:

- Gemini: cloud default, user key or deploy key depending on environment
- LM Studio: OpenAI-compatible local API through base server `http://localhost:1234` (`/v1` is appended by the provider layer)
- Ollama: native API at `http://localhost:11434`
- LocalAI: OpenAI-compatible local/self-hosted API through base server `http://localhost:8080`
- AlloFlow Built-in Engine: future OpenAI-compatible local API through base server `http://localhost:32173`
- Custom Endpoint: advanced user/admin endpoint

Notes verified on 2026-07-03:

- LM Studio documents OpenAI-compatible endpoints including `/v1/models` and `/v1/chat/completions`, with examples using `http://localhost:1234/v1`.
- Ollama documents native local calls such as `http://localhost:11434/api/generate` and model listing through its local model API.

Official references:

- https://lmstudio.ai/docs/developer/openai-compat
- https://github.com/ollama/ollama/blob/main/docs/api.md

## Desktop As School Box Command Center

Desktop can eventually embed or supervise the School Box district/server version.

The useful split is not "desktop app versus server app." The better split is:

- Desktop Solo: one teacher or learner, local projects, local model or personal cloud keys.
- Desktop Host: teacher starts a local classroom server from the desktop app.
- School Box Server: managed school/district deployment, with Desktop acting as admin console and client.

Desktop should be able to:

- Start and stop the embedded host.
- Show server health and active sessions.
- Manage local model availability.
- Manage keys without exposing them to students.
- Export/import school data.
- Later connect to a district server when one exists.

## First Foundation Tasks

1. Add explicit provider presets for LM Studio and AlloFlow Built-in Engine.
2. Make the settings connection test use the selected provider immediately, not only the already-loaded provider.
3. Keep the AI provider abstraction backend-neutral.
4. Add a desktop runtime contract before choosing Electron/Tauri details.
5. Build School Box as a service that Desktop can host or connect to.

## Non-Goals For This Step

- Do not bundle a model runner yet.
- Do not pick final model files yet.
- Do not require Ollama or LM Studio.
- Do not split School Box into a separate product surface yet.

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
