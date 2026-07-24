# Working on AlloFlow: setup and ground rules for Tyler

Written 2026-07-20, after landing your PR #3. Thank you again for that work.
It is live: the web pieces are deployed and the first flavored 0.2.8
installers (Desktop and Admin Server) are built from it.

## 1. Setup: clone the main repo, retire the fork workflow

You are being added as a collaborator on `Apomera/AlloFlow`, so you no longer
need to work from a fork. Clone the main repo directly:

```
git clone https://github.com/Apomera/AlloFlow.git
cd AlloFlow
```

Day-to-day:

```
git checkout main
git pull                        # always start from current main
git checkout -b feature/short-name
# ... work, commit ...
git push -u origin feature/short-name
```

Then open a PR from your branch. Aaron reviews and merges. Your commits keep
your authorship, so contributor credit happens automatically from here on.

Two rules that make this safe:

- **Never push directly to `main`.** Aaron and several automated Claude
  sessions push to main continuously from his machine, and they assume main
  only moves in ways they made themselves. Branches are yours; main is not.
- **Never force-push anything on the shared repo.** If a branch gets messy,
  open a fresh one.

Your old fork: keep it or delete it, but do not PR from it again. Its main
still contains `admin/` and `local-app/` (see section 3) and is permanently
diverged.

One config fix on your machines: set a git email that is linked to your
GitHub account, or GitHub cannot connect commits to your profile.
`hubby@Ramatra.local` and `tyler@alloflow.edu` are not linked
(and alloflow.edu is not a registered domain). Easiest:

```
git config --global user.email "255432487+phyersherman@users.noreply.github.com"
```

## 2. What landed from PR #3, and what changed in the landing

Everything functional landed, via selective integration rather than a merge:

- Local-AI PDF remediation, the `storageDB` fix, and LM Studio
  `response_format` compat: commit `c8bff5f59`. The storageDB bug was real on
  upstream main too. Good find.
- The `?mode=remediation` focused mode in the monolith: inside `f469acca2`.
- Scan Folder batch remediation and the focused-mode UI: `308c0f54f`.
- The whole edition system, guided first-run wizard, "Choose your experience"
  installer page, remediation IPC bridge, and the CI release fix: `d78d4974e`.
- Credit is recorded in `CONTRIBUTORS.md` (`467741fb0`).

One bug found while cutting installers, already fixed upstream in
`4a88cf62b`: the experience-choice `Var` declarations in
`desktop/build-resources/installer.nsh` were unconditional, but the Admin
Server flavor never defines `ALLO_EXPERIENCE_CHOICE`, so NSIS warning 6001
(unreferenced variable) failed the build. `package:admin:win` could never
have built. The Vars now live inside the `!ifdef`. Pull current main and you
have it.

Deliberately not imported, so you know these were choices:

- Your `.gitignore` removal of the `desktop/.local/` ignore. That directory
  can hold plaintext dev keys and must stay ignored.
- The `karaoke_audio_store` `?v=` pin bump. Those pins are stamped by
  upstream's deploy script; never edit them by hand.
- The 0.3.3 version bump. Upstream packaging is on the 0.2.x line.

## 3. Repo ground rules (the ones that bite)

- **`AlloFlowANTI.txt` at the repo root is the canonical app source.**
  `desktop/web-app/src/App.jsx` and `desktop/web-app/src/AlloFlowANTI.txt`
  are byte-copies of it. Edit the root file, then copy it over both siblings.
  Anything edited only in App.jsx is destroyed on the next deploy.
- **`view_*_module.js` files are hand-mirrored pairs.** Change the
  `*_source.jsx` and make the same change in the module, then byte-copy the
  module to `desktop/web-app/public/`. Same pattern for
  `doc_pipeline_source.jsx` / `doc_pipeline_module.js`,
  `ai_backend_module.js`, and `ui_strings.js`.
- **Do not reintroduce `admin/` or `local-app/`.** They are your pre-upstream
  standalone build. The edition system you wrote needs neither, and a second
  copy of the app source in-tree will drift and rot. If something in there is
  still valuable, port the specific piece, the way `?mode=remediation` was
  ported.
- **CDN module URLs carry `?v=` content-hash pins.** The deploy script
  restamps them. Hand-edited pins break caching across three hosts.
- **Gates before any PR** (from the repo root, then from `desktop/`):

  ```
  node dev-tools/check_free_vars.cjs
  node dev-tools/check_render_refs.cjs
  cd desktop
  npm run verify          # electron:check + contract + artifact verifier
  npm run runtime:smoke   # includes the security asserts
  ```

- **Desktop packaging**: `npm run package:desktop:win` and
  `npm run package:admin:win` from `desktop/`. Desktop outputs to
  `desktop/dist/`, Admin Server to `desktop/dist/admin/` with its own
  updater feed. The unflavored `package:win` build boots into the console
  and must never be shipped as the product.
- The desktop runtime carries security hardening (CSRF and DNS-rebinding
  guards on the private API, prototype-pollution filters, download URL and
  hash pinning). `runtime:smoke` asserts all of it; if your change makes the
  smoke fail, the smoke is right.

## 4. Good next targets, if you want them

- A packaged walkthrough of the Admin Server posture on a real second
  machine (LAN Share autostart, master plus per-user PINs, public-domain
  support). It has only ever run on your machine, pre-merge.
- The dictation unification backlog: about 13 surfaces still use raw
  `webkitSpeechRecognition`, which is dead in Electron and ships student
  audio to Google on the web. The plan is one shared adapter over
  `/api/asr/transcribe`.
- Extending local-AI PDF remediation to scanned PDFs via the existing OCR
  lane, so the fail-fast message becomes a fallback instead.

Welcome aboard properly. Branch, gate, PR.
