# turbo-all

The **turbo-all** deploy workflow lives here:

👉 [`.agent/workflows/deploy.md`](.agent/workflows/deploy.md)

(`.agent/` is a dot-prefixed hidden directory, which is why this shortcut exists — so `turbo-all` is discoverable from a plain `ls` of the repo root.)

## What it does

Syncs `AlloFlowANTI.txt` → `prismflow-deploy/src/App.jsx`, builds the React bundle, stamps the service worker, and deploys to Firebase Hosting.

## Quick reference (see deploy.md for full detail)

1. Compile any edited `*_source.jsx` files → corresponding `*_module.js`.
1b. Copy updated module files to `prismflow-deploy/public/`.
2. `git add -A; git commit -m "Deploy: sync files"; git push origin main` — **mandatory** before step 4 (CDN serves from this commit hash).
2b. Verify `git status --short` is empty.
3. Verify `HEAD` matches `origin/main`.
4. `node build.js --mode=prod` (root directory).
5. `npm run build` in `prismflow-deploy/`.
6. Stamp `build/sw.js` with a unique timestamp (node one-liner in deploy.md).
7. `npx firebase deploy --only hosting` in `prismflow-deploy/`.
8. Confirm "Deploy complete!" in output.
9. Commit the post-build `AlloFlowANTI.txt` hash update that `build.js` wrote back.

## Dev mode

To run locally without deploying:
```
node build.js --mode=dev
cd prismflow-deploy && npm start
```
