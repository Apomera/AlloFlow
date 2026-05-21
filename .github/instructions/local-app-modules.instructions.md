---
name: local-app-modules
description: "Rules for editing the AlloFlow local app source. Use when: editing any AI call logic, image generation, content engine, bilingual renderer, or any file under local-app/"
applyTo: ["local-app/**", "local-app/src/LocalApp.jsx"]
---

# ⛔ NEVER edit local-app/src/LocalApp.jsx directly

`local-app/src/LocalApp.jsx` is **auto-assembled** by `local_build.js` from the module files in `local-app/modules/local/`. Every build run **overwrites** LocalApp.jsx completely — any direct edits are silently lost.

## Always edit the module files instead

| What you want to change | Edit this file |
|------------------------|---------------|
| `callOllama` stub / AI provider routing | `local-app/modules/local/section_pre-core.js` |
| `callGemini`, `callGeminiVision`, `callImagen`, TTS | `local-app/modules/local/section_bilingual-renderer.js` |
| Image generation flow (fillInTheBlank, noText, creativeMode) | `local-app/modules/local/section_escape-room-engine.js` |
| Any other feature | `local-app/modules/local/section_<name>.js` matching the SECTION_ORDER in `local_build.js` |

## How to find the right module

```powershell
# Search all modules for the function/string you want to change:
Select-String -Path "C:\Users\Tyler\AlloFlow\local-app\modules\local\*.js" -Pattern "yourFunctionName" | Select-Object Path, LineNumber
```

## Build order (after editing modules)

1. `node local_build.js` — assembles LocalApp.jsx + compiles app.js
2. `cd admin && npm run dist` — builds the installer

The assembled `local-app/src/LocalApp.jsx` is only useful for **reading** line numbers from browser error stack traces — not for editing.
