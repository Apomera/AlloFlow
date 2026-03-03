---
description: Sync AlloFlowANTI.txt to App.jsx, build, and deploy to Firebase
---

// turbo-all

## Steps

1. Copy the root `AlloFlowANTI.txt` to the deploy directory as `App.jsx`:
```
Copy-Item -Path "AlloFlowANTI.txt" -Destination "prismflow-deploy\src\App.jsx" -Force
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

2. Also update the deploy `AlloFlowANTI.txt` backup:
```
Copy-Item -Path "AlloFlowANTI.txt" -Destination "prismflow-deploy\src\AlloFlowANTI.txt" -Force
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

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

6. Push GitHub-hosted files (`ui_strings.js`, `stem_lab_module.js`) to `main` so the live app picks them up:
```
git add ui_strings.js stem_lab_module.js AlloFlowANTI.txt; git commit -m "Deploy: sync files"; git push origin main
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

7. Purge jsDelivr CDN cache so the live app picks up the new files immediately:
```
Invoke-WebRequest -Uri "https://purge.jsdelivr.net/gh/Apomera/AlloFlow@main/stem_lab_module.js" -UseBasicParsing | Select-Object -ExpandProperty Content; Invoke-WebRequest -Uri "https://purge.jsdelivr.net/gh/Apomera/AlloFlow@main/word_sounds_module.js" -UseBasicParsing | Select-Object -ExpandProperty Content; Invoke-WebRequest -Uri "https://purge.jsdelivr.net/gh/Apomera/AlloFlow@main/ui_strings.js" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Working directory: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

8. Confirm the purge responses show `"status": "finished"` for all files.

> **Note:** The local branch is `main` tracking `origin/main`. The app fetches `ui_strings.js`, `stem_lab_module.js`, and `word_sounds_module.js` from the `main` branch on GitHub via jsDelivr CDN at runtime. jsDelivr caches `@main` refs indefinitely — step 7 is required to bust the cache after every push.

> **⚠️ CAUTION — CDN URLs MUST use `@main`, never pinned commit hashes:**
> The `loadModule()` calls in `AlloFlowANTI.txt` reference files like:
> `https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/stem_lab_module.js`
>
> If anyone changes `@main` to a pinned commit hash (e.g. `@47c3bab`), the CDN purge in step 7 will **silently stop working** — purge only clears `@main` refs, not pinned hashes. This causes a recurring "stale cache" bug where edits to `.js` files never appear in production.
>
> **Rule:** Always use `@main` in CDN URLs. If you see a pinned hash, fix it back to `@main`.
