# Handoff: CoasterLab "correct-answer payoff" animation (Ride & Solve)

**For:** ChatGPT (or any coding assistant) implementing one feature.
**Written by:** Claude, 2026-07-22. Repo is clean at commit `8a4b5fb7c`.

## The task (one feature)
When a student answers a **Ride & Solve math** question correctly, play a small payoff:
1. The bar/area-model diagram's answer placeholder **"?" flips to the real number** with a pop (scale + turns green).
2. A brief **spark burst** over the question card.

Both must respect reduced motion. This is the only change. Physics and AI questions have no math diagram, so they must be unaffected (the code below no-ops for them automatically).

## Files (IMPORTANT: two byte-identical copies)
- **Canonical:** `stem_lab/stem_tool_coasterlab.js`
- **CDN mirror (what the live app loads):** `desktop/web-app/public/stem_lab/stem_tool_coasterlab.js`

Make every edit in BOTH files, or edit the canonical file then copy it over the mirror:
```bash
cp stem_lab/stem_tool_coasterlab.js desktop/web-app/public/stem_lab/stem_tool_coasterlab.js
```
A test enforces they are byte-identical (`tests/coaster_lab_tool.test.js` → "root and mirror copies are byte-identical").

## CRITICAL traps
- **Do NOT regenerate from any prototype.** This repo file is now canonical (the old `C:\tmp\coaster-lab` generator is retired). Edit the file directly.
- **Unicode operator signs are real, not ASCII.** In this file the math signs are `−` (U+2212 MINUS), `×` (U+00D7), `÷` (U+00F7) — NOT `-`, `x`, `/`. There is a map `_MATH_OP_NAME` keyed by these exact glyphs. If your editor "helpfully" converts them, the op→name map silently breaks. Preserve them exactly. The card also uses `✓`/`✗`/emoji — preserve.
- **CLAB_CSS and CLAB_HTML are single giant string literals** (around lines 26–27). Edit them by exact substring anchor, don't reflow.
- **Shared working tree / concurrent sessions.** Other assistants commit to this repo simultaneously. Commit ONLY your files by explicit pathspec, never `git add -A`. NEVER `git commit --amend` or `git reset` here (HEAD may be another session's commit). If `.git/index.lock` exists, wait and retry — do not delete it.

## Where things are (search for these anchors)
- **The diagram generator** `_mathViz(op, a, b, ans)` lives inside the sentinel block `/* @clab-mathgen-start` … `/* @clab-mathgen-end */`. It returns an SVG string. It renders the answer as a plain `?` today.
- **The question card DOM handle:** the `rq` object has `rq.viz` = element `#clab-rqViz`, and `rq.box` = element `#clab-rideQ` (the overlay card; it is CSS `position:absolute`, so children position relative to it).
- **Answer handling:** `function submitRideAnswer(val, instant){ … }`. It captures `const q = ride.current;` at the top, computes `ok`, and has an `if(ok){ … } else { … }` block. It sets `ride.current = null;` AFTER — so use `q` (not `ride.current`) inside the block.
- **Reduced-motion global:** `REDUCED_MOTION` (already used by `function spawnFireworks(){ if(REDUCED_MOTION) return; … }`).
- **CSS anchor to append after:** the substring `.clab-root .clab-viz.on{display:block}` (this was added for the diagram; put the new rules right after it).

---

## EXACT EDITS

### Edit 1 — tag the answer placeholder in `_mathViz` so it can be revealed
Inside `_mathViz`, extend the `txt` helper with an optional `cls` param.

FIND:
```js
  const txt = (x, y, s, col, size, anchor) => '<text x="' + x + '" y="' + y + '" fill="' + (col || T) + '" font-size="' + (size || 11) + '" font-weight="700" font-family="Segoe UI,system-ui,sans-serif" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
```
REPLACE:
```js
  const txt = (x, y, s, col, size, anchor, cls) => '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + ' fill="' + (col || T) + '" font-size="' + (size || 11) + '" font-weight="700" font-family="Segoe UI,system-ui,sans-serif" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
```

Now mark the ONE answer-"?" in each of the four op branches with class `clab-ans`. There must be **exactly one** `clab-ans` per generated SVG.

- **× branch** — split `= ?` into a static `=` plus a classed `?`.
  FIND: `body += txt(gx + gw + 34, gy + gh / 2 + 5, '= ?', GREEN, 16);`
  REPLACE:
  ```js
  body += txt(gx + gw + 20, gy + gh / 2 + 5, '=', GREEN, 16);
  body += txt(gx + gw + 40, gy + gh / 2 + 5, '?', GREEN, 16, 'middle', 'clab-ans');
  ```
- **÷ branch** — FIND: `body += txt(bx + bw / (seg * 2), by + bh / 2 + 4, '?', GREEN, 12);`
  REPLACE: `body += txt(bx + bw / (seg * 2), by + bh / 2 + 4, '?', GREEN, 12, 'middle', 'clab-ans');`
- **− branch** — FIND: `body += txt(bx + remW / 2, by + bh / 2 + 4, '?', INK, 13);`
  REPLACE: `body += txt(bx + remW / 2, by + bh / 2 + 4, '?', INK, 13, 'middle', 'clab-ans');`
- **+ branch** — FIND: `body += txt(bx + bw / 2, by + bh + 22, '?', GREEN, 13);`
  REPLACE: `body += txt(bx + bw / 2, by + bh + 22, '?', GREEN, 13, 'middle', 'clab-ans');`

> The SVG still shows `?` initially (answer stays hidden until answered correctly). The existing "hides the answer" test keeps passing.

### Edit 2 — CSS (append into the CLAB_CSS string)
FIND the substring: `.clab-root .clab-viz.on{display:block}`
Append IMMEDIATELY AFTER it (still inside the same string literal, keep it one line — shown multi-line here only for readability; join with no stray characters):
```
.clab-root .clab-viz .clab-ans{transform-box:fill-box;transform-origin:center}.clab-root .clab-viz .clab-ans.reveal{fill:var(--good) !important;animation:clabAnsPop .55s ease-out}@keyframes clabAnsPop{0%{transform:scale(.5)}55%{transform:scale(1.45)}100%{transform:scale(1)}}.clab-root .clab-spark{position:absolute;width:7px;height:7px;border-radius:2px;pointer-events:none;opacity:0;animation:clabSpark .8s ease-out forwards}@keyframes clabSpark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3)}}@media (prefers-reduced-motion:reduce){.clab-root .clab-viz .clab-ans.reveal{animation:none}.clab-root .clab-spark{display:none}}
```
(`--good` is an existing CoasterLab token = green `#59c98d`.)

### Edit 3 — add the spark-burst function (engine module scope, e.g. just above `function submitRideAnswer`)
```js
function spawnAnswerBurst(){
  if(REDUCED_MOTION) return;
  const host = rq.box; if(!host) return;
  const colors = ['#f2a63c', '#59c98d', '#3f8fd2', '#c05fa0'];
  for(let i = 0; i < 12; i++){
    const p = document.createElement('span');
    p.className = 'clab-spark';
    const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 46;
    p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
    p.style.setProperty('--dy', (Math.sin(ang) * dist - 20).toFixed(1) + 'px');
    p.style.background = colors[i % colors.length];
    p.style.left = (42 + Math.random() * 16) + '%';
    p.style.top = '42%';
    host.appendChild(p);
    setTimeout(() => { try{ p.remove(); }catch(_e){} }, 850);
  }
}
```

### Edit 4 — reveal on correct, inside `submitRideAnswer`
FIND (the correct branch):
```js
    rq.feed.innerHTML = `<b class="ok">✓</b> ${q.explain}`;
    blip(1047, 0.16, 0.12);
```
REPLACE:
```js
    rq.feed.innerHTML = `<b class="ok">✓</b> ${q.explain}`;
    blip(1047, 0.16, 0.12);
    // payoff: flip the diagram's "?" to the real number, then a spark burst
    if(rq.viz && q.answer != null){
      const _ansEl = rq.viz.querySelector('.clab-ans');
      if(_ansEl){ _ansEl.textContent = q.answer.toLocaleString(); _ansEl.classList.add('reveal'); }
    }
    spawnAnswerBurst();
```
> `querySelector('.clab-ans')` returns null for physics questions (no diagram) and AI questions (no `clab-ans`), so this is a safe no-op for them. `spawnAnswerBurst` is itself reduced-motion guarded.

---

## Tests to add (`tests/coaster_lab_tool.test.js`)
In the describe block that eval-slices `_mathViz` (search `_mathViz` in the file; it is exposed via the slice `return { genElementMath, _bandCfg, _mathViz };`), add:

```js
it('the answer placeholder is a single revealable node, still hidden as "?"', () => {
  const { _mathViz } = loadGen(TOOL_PATHS[0]);
  for (const [op, a, b, ans] of [['+', 19, 7, 26], ['−', 24, 6, 18], ['×', 3, 8, 24], ['÷', 24, 3, 8]]) {
    const svg = _mathViz(op, a, b, ans);
    expect((svg.match(/class="clab-ans"/g) || []).length).toBe(1); // exactly one, for the reveal
    expect(svg).toContain('>?<'); // still shows "?", not the answer, before answering
  }
});

it.each(TOOL_PATHS)('%s: a correct answer reveals the number + a reduced-motion-guarded burst', (p) => {
  const src = readFileSync(resolve(process.cwd(), p), 'utf8');
  expect(src).toContain("_ansEl.classList.add('reveal')");
  expect(src).toContain('function spawnAnswerBurst(){');
  expect(src).toContain('if(REDUCED_MOTION) return;');
  expect(src).toContain('@keyframes clabAnsPop');
  expect(src).toContain('@keyframes clabSpark');
});
```
(`loadGen`, `TOOL_PATHS`, `readFileSync`, `resolve` are already defined in that file.)

## Verify (run all four; all must pass)
```bash
node -c stem_lab/stem_tool_coasterlab.js          # syntax
node -c desktop/web-app/public/stem_lab/stem_tool_coasterlab.js
diff -q stem_lab/stem_tool_coasterlab.js desktop/web-app/public/stem_lab/stem_tool_coasterlab.js   # must be identical
npx vitest run tests/coaster_lab_tool.test.js     # expect ~38 passing
node dev-tools/check_render_refs.cjs --quiet       # render gate, exit 0
```

## Commit (shared tree — pathspec, no amend)
```bash
git commit -m "feat(coasterLab): correct-answer payoff — reveal the diagram number + spark burst" -- \
  stem_lab/stem_tool_coasterlab.js \
  desktop/web-app/public/stem_lab/stem_tool_coasterlab.js \
  tests/coaster_lab_tool.test.js
```
If `.git/index.lock` exists, wait a few seconds and retry (a concurrent session is mid-commit). After committing, confirm your change is at HEAD:
```bash
git show HEAD:stem_lab/stem_tool_coasterlab.js | grep -c "spawnAnswerBurst"   # expect 2
```

## Context (why this is safe/simple)
- CoasterLab's Ride & Solve freezes the train at checkpoints and asks a question. Math questions (topics: addition/subtraction/multiplication/division/mixed) now carry a bar/area diagram (`_mathViz`) that shows the setup with a `?` where the answer goes. This task just animates that `?` to the answer on a correct response, plus a spark burst.
- It is entirely additive; no existing behavior changes. The tool is currently **undeployed** — after this, it and the prior rounds (crash fix, topic/grade, AI topic, grounded math, dynamism, diagrams) all go live on the next `deploy.sh` (run by the repo owner).
- Optional nicety (skip if unsure): none needed. Do not add new dependencies.
