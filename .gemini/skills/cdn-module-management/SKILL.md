---
name: cdn-module-management
description: Safe editing and deployment of the CDN-loaded JavaScript feature modules (stem_lab, word_sounds, behavior_lens, report_writer, and ~250 others)
---

# CDN Module Management Skill

## Context
AlloFlow loads its heavy feature modules via CDN at runtime instead of bundling
them into the React build. They run as standalone scripts that register
themselves on `window.AlloModules`. There are now **~250 such modules** at the
repo root (`*_module.js`) plus the `stem_lab/` and `sel_hub/` plugin trees. The
four largest/clinical ones are the canonical examples:

| Module | File | Registers as |
|--------|------|--------------|
| STEM Lab host | `stem_lab/stem_lab_module.js` | `window.AlloModules.StemLab` |
| Word Sounds | `word_sounds_module.js` | `window.AlloModules.WordSoundsModal` |
| BehaviorLens | `behavior_lens_module.js` | `window.AlloModules.BehaviorLens` |
| Report Writer | `report_writer_module.js` | `window.AlloModules.ReportWriter` |

(There is no `window.__*_MODULE__` global — that pattern was removed. Every
module registers on `window.AlloModules.<Name>`.)

## CDN URL Format
The runtime CDN is **Cloudflare Pages**, served **hashless**:
```
https://alloflow-cdn.pages.dev/{filename}
```
`build.js --mode=prod` rewrites `pluginCdnBase` (and every module URL) to this
base automatically — **do not hand-edit CDN URLs in `AlloFlowANTI.txt`.**
(jsDelivr was abandoned in 2026 because it started returning GitHub 429s; any
`cdn.jsdelivr.net/gh/...@{hash}` strings left in `build.js`'s MODULES table are
legacy and unused.)

## Safe Editing Workflow

### 1. Edit the module file directly (at repo root)
The `Edit`/`Write` tools handle these files directly (most are 1–3 MB). For
large scripted/bulk edits a Python or Node script is optional, but not required.
Always validate syntax after editing:
```bash
node -c stem_lab/stem_lab_module.js   # or node --check
```

### 2. Commit (deploy.sh handles the rest)
The canonical deploy is a single command from the repo root:
```bash
./deploy.sh "fix: description of module change"
```
This commits, pushes to `main`, runs `build.js --mode=prod --force` (which
rewrites CDN URLs + mirrors module files into `desktop/web-app/public/`),
builds the React shell, stamps the service worker, deploys to Firebase, and
runs post-deploy verification against Firebase + the Cloudflare CDN.

If you must run steps manually, the order is: commit → push → `node build.js
--mode=prod` → `npm run build` (in `desktop/web-app/`) → stamp SW → `firebase
deploy`. Commit before build so the `?v=<short-hash>` cache-buster is correct.

## Cache Invalidation
- Cloudflare Pages rebuilds and invalidates on every push to `main`
  (asynchronous, ~1–2 min).
- A `?v=<short-commit-hash>` query param (`pluginCdnVersion`) is stamped at
  build time as an extra cache-buster; `deploy.sh` Step 10 asserts the live
  value matches HEAD.
- Browser service worker may cache modules — `deploy.sh` stamps `sw.js` with a
  fresh `__BUILD_TS__` to force an update.

## Common Gotchas
- **Never edit `desktop/web-app/public/*.js` directly** — `build.js` overwrites
  the mirror from the committed root copies on every prod build.
- **Module registration**: each module must assign `window.AlloModules.<Name> =
  ...` (a component or `{ render, ... }`) at the end of its IIFE.
- **Verify a load**: check that `window.AlloModules.<Name>` is defined in the
  console, and look for the module's `[CDN] <Name> ...` log lines.
