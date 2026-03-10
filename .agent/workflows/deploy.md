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

1. Push the module files to GitHub:
```
git add ui_strings.js stem_lab_module.js word_sounds_module.js behavior_lens_module.js report_writer_module.js AlloFlowANTI.txt; git commit -m "Deploy: sync files"; git push origin main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

2. Run the build script in **prod** mode (auto-detects the git hash and writes App.jsx):
```
node build.js --mode=prod
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> The script will:
> - Read `AlloFlowANTI.txt`
> - Run `git rev-parse --short HEAD` to get the latest hash
> - Replace both `loadModule` CDN URLs with the new hash
> - Write to `prismflow-deploy/src/App.jsx` and `prismflow-deploy/src/AlloFlowANTI.txt`
> - Stamp `build/sw.js` with a unique timestamp (if build/ exists)

3. Build the production bundle:
```
npm run build
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

4. Stamp the service worker with a unique cache version (CRA overwrites `build/sw.js` from `public/`, so this must run AFTER the build):
```
node -e "const fs=require('fs');const ts=Date.now();const f='build/sw.js';let c=fs.readFileSync(f,'utf-8');c=c.replace('__BUILD_TS__',String(ts));fs.writeFileSync(f,c,'utf-8');console.log('SW stamped:',ts)"
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

5. Deploy to Firebase hosting:
```
npx firebase deploy --only hosting
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

6. Confirm deploy succeeded — check that the output shows `Deploy complete!` and the hosting URL.

7. Commit and push the updated `AlloFlowANTI.txt` (with new hash) so the repo stays in sync:
```
git add AlloFlowANTI.txt; git commit -m "Deploy: update CDN hash"; git push origin main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

8. **Verify the push succeeded** — confirm local HEAD matches origin/main:
```
git log --oneline -1 HEAD; git log --oneline -1 origin/main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> Both hashes should match. If they don't, `git push origin main` was skipped or failed.

> **⚠️ CDN STALENESS WARNING:** If modules are NOT pushed to GitHub, jsDelivr will serve stale files.
> This caused a real incident on 2026-03-09 where BehaviorLens was outdated on the CDN.
> **Always verify step 8** — matching hashes = CDN will serve fresh content.

> **Note:** No CDN cache purge is needed with hash-based URLs. Each new commit hash is a unique, never-cached URL.
> The fallback mechanism in `loadModule` will try `raw.githubusercontent.com` if the jsDelivr CDN fails.

## Dev Mode

To run locally with hot-reload of module files:
```
node build.js --mode=dev
cd prismflow-deploy && npm start
```
This replaces CDN URLs with `./stem_lab_module.js`, `./word_sounds_module.js`, and `./behavior_lens_module.js` so the dev server loads local copies.
