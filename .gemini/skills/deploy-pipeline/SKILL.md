---
name: deploy-pipeline
description: Full production deployment pipeline for AlloFlow — push, build, stamp, deploy, verify
---

# Deploy Pipeline Skill

## Canonical path: `./deploy.sh`

The supported, one-shot deploy is the repo-root script:

```bash
./deploy.sh "commit message"
```

It runs a 10-step pipeline: a **pre-flight render gate** (Step 0.6 — runs
`check_render_refs`, `check_keyless_map`, `check_stem_render`, `check_sel_render`,
`check_module_render`, `check_aria_handler`; the same blockers as
`npm run verify:gate`), then commit → push → `build.js --mode=prod --force` →
mirror link files → `npm run build` (desktop/web-app) → stamp SW →
`firebase deploy` → Codeberg mirror → **post-deploy verification** against
an explicitly configured district Firebase project and the Cloudflare CDN
(`alloflow-cdn.pages.dev`).

Run `npm run verify:gate` yourself first if you want to catch render-crash
regressions before committing. The manual steps below are the fallback.

## Quick Reference (manual fallback)

```bash
# Full deploy from scratch (from repo root):
git push origin main
node build.js --mode=prod
cd desktop/web-app
npm run build
node -e "const fs=require('fs');const ts=Date.now();const f='build/sw.js';let c=fs.readFileSync(f,'utf-8');c=c.replace('__BUILD_TS__',String(ts));fs.writeFileSync(f,c,'utf-8');console.log('SW stamped:',ts)"
npx firebase deploy --only hosting
```

## Step-by-Step with Verification

### 1. Push source to GitHub
```bash
git add -A
git commit -m "description"
git push origin main
```
**Verify:** `git log --oneline -1` shows your commit on `origin/main`

### 2. Run build.js
```bash
node build.js --mode=prod
```
**What it does:**
- Auto-detects latest git hash
- Reads `AlloFlowANTI.txt` (the source of truth)
- Writes `desktop/web-app/src/App.jsx`, rewriting `pluginCdnBase` + module URLs
  to the hashless Cloudflare base (`alloflow-cdn.pages.dev/<file>`) and stamping
  a `?v=<short-hash>` cache-buster
- Logs the hash for verification

**Verify:** Output shows `Auto-detected git hash: {HASH}` matching your latest commit

### 3. Production build
```bash
cd desktop/web-app
npm run build
```
**Verify:** Exit code 0, no compilation errors

### 4. Stamp service worker
```bash
node -e "const fs=require('fs');const ts=Date.now();const f='build/sw.js';let c=fs.readFileSync(f,'utf-8');c=c.replace('__BUILD_TS__',String(ts));fs.writeFileSync(f,c,'utf-8');console.log('SW stamped:',ts)"
```
**Why:** Forces client browsers to invalidate their SW cache and fetch new assets.

### 5. Deploy to Firebase
```bash
npx firebase deploy --only hosting
```
**Verify:** Output shows `✓ Deploy complete!` with hosting URL

### 6. Post-deploy verification
- **Hard refresh** (Ctrl+Shift+R) the live site
- Check console for: `[AlloFlow] UI_STRINGS loaded: X top-level keys`
- Check console for `[CDN] <Name>` logs and confirm `window.AlloModules.<Name>`
  is defined for the modules you touched
- Verify the `?v=<short-hash>` on CDN URLs matches your push (deploy.sh Step 10
  does this automatically)

## Error Recovery

| Error | Fix |
|-------|-----|
| `build.js` can't find `AlloFlowANTI.txt` | Run from repo root |
| `npm run build` fails with compilation error | Fix the error in `AlloFlowANTI.txt`, re-run build.js |
| Firebase deploy fails with auth error | Run `npx firebase login` |
| SW stamp fails (`__BUILD_TS__` not found) | The build already ran once — rebuild first |
| CDN shows stale content after deploy | Cloudflare Pages rebuilds async (~1-2 min) on push to `main`; hard-refresh and confirm the `?v=` hash matches HEAD |

## Important Notes
- **Source of truth**: `AlloFlowANTI.txt` → everything flows from this
- **Never edit** `desktop/web-app/src/App.jsx` directly — it's generated
- **CDN modules** (stem_lab, word_sounds, etc.) are served hashless from
  Cloudflare Pages (`alloflow-cdn.pages.dev`); pushing to `main` triggers a
  Cloudflare rebuild (~1-2 min). A `?v=<short-hash>` query param busts caches.
- **GitHub Pages** (website) updates automatically on push to `main`
