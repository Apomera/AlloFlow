# Fleet Operating Rules — read this in full before your first edit

You are one lane of an eleven-agent fleet working on AlloFlow. Ten lanes work in parallel in
**one shared working tree**. Aaron will not babysit you; he will say "continue" and nothing
else. Everything you need is here or in your lane prompt.

**Repo:** `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
**Branch:** `main`, already checked out and correct. Do not switch or create branches.

---

## 1. Orientation

Read `ORIENTATION.md` first (2 minutes) — it sets who Aaron is and the working register.
Skim `FEATURE_INVENTORY.md` for your area only. Do not read `REFLECTIVE_JOURNAL.md` unless
your lane needs it; it is long.

---

## 2. Architecture you must not violate

- `AlloFlowANTI.txt` (55,094 lines) is the canonical React monolith. `build.js` compiles it
  to `desktop/web-app/src/App.jsx`. **Never edit `App.jsx`.**
- `*_source.jsx` compiles to `*_module.js` via `_build_<name>_module.js` at repo root.
  **Always edit the source. Never edit the compiled module** — the next build wipes it, and
  `dev-tools/check_source_freshness.cjs` will flag you. After editing a source, run its
  builder: `node _build_<name>_module.js`.
- Some modules have **no** source pair and therefore *are* the source. Check before assuming:
  if `<name>_source.jsx` does not exist, edit `<name>_module.js` directly. Known plain-JS
  modules: `video_studio_module.js`, `math_fluency_module.js`, `student_analytics_module.js`,
  `export_handlers_module.js`, `kokoro_tts_loader.js`, `piper_tts_loader.js`, `agent_core_*`.
- Three sources are duplicated into `desktop/web-app/src/` and must stay byte-identical:
  `games_source.jsx`, `adventure_source.jsx`, `content_engine_source.jsx`. If you edit one,
  copy it across and run `node dev-tools/check_source_pair_drift.js`.
- `lang/*.js` packs key against `ui_strings.js` and `help_strings.js`. Every `lang/` change
  mirrors to `desktop/web-app/public/lang/`. Regenerate the manifest afterwards:
  `node dev-tools/update_lang_manifest.cjs`.

---

## 3. Shared-tree safety — the rules that actually matter

Ten agents edit these files at once. The Edit tool rewrites the entire file, so a concurrent
edit to the same file **silently destroys** the other agent's work. Git cannot help: nothing
is committed, so there is nothing to merge.

**You must never:** `git add`, `git commit`, `git push`, `git stash`, `git reset`,
`git checkout <branch>`, `git rebase`, or run `deploy.sh` / `deploy.ps1` /
`build.js --mode=prod`. Aaron batches commits and deploys himself. Leaving files staged
breaks every other session in this tree.

**Stay in your lane.** Edit only files in your ownership list. If you need a change outside
it, append one bullet to `FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` in the form
`- [L<yours> -> L<theirs>] file — what and why`. Do not make the edit yourself.

**Off-limits to everyone:** `view_pdf_audit_source.jsx`, `view_pdf_audit_module.js`,
`desktop/web-app/public/view_pdf_audit_module.js`. Another session is actively editing them,
and they are **already staged in the index**. Do not touch them, and do not unstage them.
There are also ~49 untracked files in the tree from other sessions. Ignore them; never clean
them up. If a git command of yours would touch the index at all, you are doing something this
fleet forbids.

### The hot-file lock

Four files are shared across lanes and are lock-protected:

`AlloFlowANTI.txt` · `ui_strings.js` · `view_sidebar_panels_source.jsx` · `generate_dispatcher_source.jsx`

Before **any** edit to one of them:

```bash
node dev-tools/fleet_lock.cjs acquire <file> --lane=L<N> --wait
```

Then **re-Read the file** — another lane may have changed it while you waited, and your
cached copy is stale. Make your edits promptly. Then:

```bash
node dev-tools/fleet_lock.cjs release <file> --lane=L<N>
```

Hold a lock for a single burst of edits only, never across investigation or a test run. Check
`node dev-tools/fleet_lock.cjs status` if you are unsure. On these four files use **Edit only,
never Write** — a whole-file Write clobbers other lanes even under lock discipline.

---

## 4. Verification before you call anything done

- `node --check` every JS file you touched, including the built module. Note that worker code
  inside template literals is invisible to `node --check`.
- `npm run verify:gate` — the repo's aggregate gate. If it fails on something you did not
  touch, that is another session's drift: report it, do not "fix" it, and do not bypass it.
- Targeted tests only: `npx vitest run <path>`. About 98 tests were already failing before
  this fleet started, so a red test is not automatically yours. Never run `vitest -u` broadly;
  if you must update a snapshot, the path goes **first**: `npx vitest run <path> -u`.
- Anything visual: actually render it and look. Do not claim a contrast, layout, or
  dark-mode fix from reading CSS. Screenshot or Playwright, or say plainly that you did not
  verify it visually.
- Grep caveats that have burned prior sessions: greps on `ctx.t(` miss the aliased form, and
  a nested dotted-key grep in `ui_strings.js` proves nothing about coverage.

---

## 5. Editorial rules

- No em dashes or en dashes in user-facing text.
- No contested science stated as fact.
- Help strings target a 3rd to 4th grade reading level.
- Brand names are do-not-translate.

---

## 6. Your deliverable

Write `FLEET_2026-08-16/reports/L<N>_report.md` **incrementally as you go**, so a crash loses
little. For every issue ID in your scope:

- **Found:** what is actually true, with `file:line`.
- **Changed:** what you edited, with `file:line`. "No change needed" is a valid outcome, but
  say why.
- **Verified:** the exact command or observation. If you could not verify, say so plainly.
- **For Aaron:** decisions you made on his behalf, and anything you deliberately left.

Where Aaron's notes describe a product judgment rather than a defect, **make the call, build
it, and record the tradeoff.** Do not stall waiting for input. If a change would be genuinely
irreversible or crosses into another lane's design, write it up instead of doing it.

Investigate before you fix. Several items in these prompts are Aaron's suspicions from a
testing session, not confirmed defects. Confirming that something already works correctly is
a real and useful result.
