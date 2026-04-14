---
description: Sync AlloFlowANTI.txt to App.jsx, build, and deploy to Firebase
---

// turbo-all

## Steps

> **⚠️ IMPORTANT — Hash-based CDN deployment:**
> The app loads `stem_lab_module.js`, `word_sounds_module.js`, and `behavior_lens_module.js` via jsDelivr CDN using **pinned commit hashes** (e.g. `@c1a9644`).
> The `build.js` script **automatically** handles hash detection and URL replacement.

> **⚠️ SERVICE WORKER — Do NOT change navigation strategy:**
> The SW uses **stale-while-revalidate** for navigation requests. This is critical for networks
> that block UDP traffic (QUIC). Changing to network-first WILL cause the site to hang for
> those users. The `sw.js` source in `public/` contains a `__BUILD_TS__` placeholder that
> gets stamped with a unique timestamp on each deploy.

> **⚠️ OneDrive TIMEOUT — Git operations are slow:**
> The repo is on OneDrive. `git commit` on the 2.5MB module files frequently exceeds
> command timeouts. The commit usually still succeeds — check with `git status --short`.

> **⚠️ COMMIT ORDER IS CRITICAL:**
> Module files MUST be committed and pushed to GitHub BEFORE running `build.js --mode=prod`.
> `build.js` captures `git rev-parse --short HEAD` — if the module changes aren't in that
> commit, the CDN will serve **stale code**. This caused a real incident on 2026-03-24.
> `build.js` now includes a safety guard that blocks prod builds with uncommitted module files.

1. **Compile source modules** (if any `*_source.jsx` files were edited):

For `doc_pipeline_source.jsx` → `doc_pipeline_module.js`:
```bash
{ echo '(function(){"use strict";'; echo 'if(window.AlloModules&&window.AlloModules.DocPipelineModule){console.log("[CDN] DocPipelineModule already loaded");return;}'; cat doc_pipeline_source.jsx; echo ''; echo 'window.AlloModules = window.AlloModules || {};'; echo 'window.AlloModules.createDocPipeline = createDocPipeline;'; echo 'window.AlloModules.DocPipelineModule = true;'; echo "console.log('[DocPipelineModule] Pipeline factory registered');"; echo '})();'; } > doc_pipeline_module.js && cp doc_pipeline_module.js prismflow-deploy/public/doc_pipeline_module.js && node -c doc_pipeline_module.js && echo "✓ doc_pipeline compiled"
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> **Source → Module mapping:**
> - `doc_pipeline_source.jsx` (root) → `doc_pipeline_module.js` (+ copy to `prismflow-deploy/public/`)
> - `prismflow-deploy/src/games_source.jsx` → `games_module.js`
> - `prismflow-deploy/src/adventure_source.jsx` → `adventure_module.js`
> - `prismflow-deploy/src/content_engine_source.jsx` → `content_engine_module.js`
> Each compiled module wraps the source in an IIFE with a duplicate-load guard.
> **Always run `node -c <module>.js` after compiling to verify syntax.**

1b. Copy updated module files to `prismflow-deploy/public/`:
```
Copy-Item -Path stem_lab\stem_lab_module.js -Destination prismflow-deploy\public\stem_lab_module.js -Force
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> Also copy other modules if changed: `word_sounds_module.js`, `behavior_lens_module.js`, `report_writer_module.js`, `ui_strings.js`.
> Also copy STEM plugin files if changed (from `stem_lab/`): `stem_tool_science.js`, `stem_tool_math.js`, `stem_tool_creative.js`, `stem_tool_coding.js`, `stem_tool_dna.js`, `stem_tool_geo.js`, `stem_tool_coordgrid.js`, `stem_tool_angles.js`, etc.

2. **Commit and push** all changes to GitHub (creates the hash that CDN URLs will reference):
```
git add -A; git commit -m "Deploy: sync files"; git push origin main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> **This step is MANDATORY.** The CDN serves files from this commit hash.
> If git commit times out due to OneDrive, the commit usually still succeeds — check with `git status --short`.

2b. **Verify clean working tree** — confirm all changes were committed:
```
git status --short
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> Output should be **empty** (no modified files). If you see `M  stem_lab/stem_lab_module.js` or similar,
> the commit failed silently — re-run `git add -A; git commit -m "Deploy: retry"; git push origin main`.
> **DO NOT proceed to build.js until this is clean.** Deploying with uncommitted module files = stale CDN.

3. **Verify the push succeeded** — confirm local HEAD matches origin/main:
```
git log --oneline -1 HEAD; git log --oneline -1 origin/main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> Both hashes should match. If they don't, re-run `git push origin main`.

4. Run the build script in **prod** mode (auto-detects the git hash and writes App.jsx):
```
node build.js --mode=prod
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> The script will:
> - Read `AlloFlowANTI.txt`
> - Run `git rev-parse --short HEAD` to get the latest hash
> - **Check for uncommitted module files** (blocks with an error if found)
> - Replace both `loadModule` CDN URLs and `pluginCdnBase` with the new hash
> - Write to `prismflow-deploy/src/App.jsx` and `prismflow-deploy/src/AlloFlowANTI.txt`
> - **Write updated hashes back to root `AlloFlowANTI.txt`** (keeps source of truth in sync)
> - Stamp `build/sw.js` with a unique timestamp (if build/ exists)

5. Build the production bundle:
```
npm run build
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

6. Stamp the service worker with a unique cache version (CRA overwrites `build/sw.js` from `public/`, so this must run AFTER the build):
```
node -e "const fs=require('fs');const ts=Date.now();const f='build/sw.js';let c=fs.readFileSync(f,'utf-8');c=c.replace('__BUILD_TS__',String(ts));fs.writeFileSync(f,c,'utf-8');console.log('SW stamped:',ts)"
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

7. Deploy to Firebase hosting:
```
npx firebase deploy --only hosting
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

8. Confirm deploy succeeded — check that the output shows `Deploy complete!` and the hosting URL.

9. **(Final commit)** Commit the `AlloFlowANTI.txt` hash update that `build.js` wrote back:
```
git add -A; git commit -m "Post-deploy: update CDN hash refs"; git push origin main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> This commit only updates the hash references in `AlloFlowANTI.txt`. It keeps the source file in sync with what was deployed. This is safe to defer if doing rapid iterations.

> **⚠️ CDN STALENESS WARNING:** If modules are NOT pushed to GitHub, jsDelivr will serve stale files.
> This caused a real incident on 2026-03-09 where BehaviorLens was outdated on the CDN.
> **Always push before running build.js** — matching hashes = CDN will serve fresh content.

> **Note:** No CDN cache purge is needed with hash-based URLs. Each new commit hash is a unique, never-cached URL.
> The fallback mechanism in `loadModule` will try `raw.githubusercontent.com` if the jsDelivr CDN fails.

## Dev Mode

To run locally with hot-reload of module files:
```
node build.js --mode=dev
cd prismflow-deploy; npm start
```
This replaces CDN URLs with `./stem_lab/stem_lab_module.js`, `./word_sounds_module.js`, and `./behavior_lens_module.js` so the dev server loads local copies.
