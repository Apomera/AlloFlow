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

> **Note:** The local branch is `main` tracking `origin/main`. The app fetches `ui_strings.js` and `stem_lab_module.js` from the `main` branch on GitHub at runtime.
