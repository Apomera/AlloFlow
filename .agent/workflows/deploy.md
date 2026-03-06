---
description: Sync AlloFlowANTI.txt to App.jsx, build, and deploy to Firebase
---

// turbo-all

## Steps

> **⚠️ IMPORTANT — Hash-based CDN deployment:**
> The app loads `stem_lab_module.js` and `word_sounds_module.js` via jsDelivr CDN using **pinned commit hashes** (e.g. `@c1a9644`).
> The `build.js` script **automatically** handles hash detection and URL replacement.

1. Push the module files to GitHub:
```
git add ui_strings.js stem_lab_module.js word_sounds_module.js AlloFlowANTI.txt; git commit -m "Deploy: sync files"; git push origin main
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

3. Build the production bundle:
```
npm run build
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

4. Deploy to Firebase hosting:
```
npx firebase deploy --only hosting
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy`

5. Confirm deploy succeeded — check that the output shows `Deploy complete!` and the hosting URL.

6. Commit and push the updated `AlloFlowANTI.txt` (with new hash) so the repo stays in sync:
```
git add AlloFlowANTI.txt; git commit -m "Deploy: update CDN hash"; git push origin main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

> **Note:** No CDN cache purge is needed with hash-based URLs. Each new commit hash is a unique, never-cached URL.
> The fallback mechanism in `loadModule` will try `raw.githubusercontent.com` if the jsDelivr CDN fails.

## Dev Mode

To run locally with hot-reload of module files:
```
node build.js --mode=dev
cd prismflow-deploy && npm start
```
This replaces CDN URLs with `./stem_lab_module.js` and `./word_sounds_module.js` so the dev server loads local copies.
