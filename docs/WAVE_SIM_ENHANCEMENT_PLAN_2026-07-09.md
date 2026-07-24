# Wave Simulator — Deep Dive + Enhancement Plan (2026-07-09)

## STATUS @41fb9aabd (2026-07-09)

**DONE (committed, both copies synced, wave golden rebaselined):** all of Batch 0
(B0.1–B0.10; B0.11 `_tutWave` left in hub, superseded by in-tool tour) **plus** the
canvas-stutter fix (inline ref re-init on every render — same class as DNA/Ecosystem),
B1.1 pause/play/step (+Space, reduced-motion starts paused), B1.2 tour banner,
B1.3 drag persist + wall slider, B1.4 accordion, B1.5 reset-all, B1.6+B2.3 legends→HTML,
B2.2 accents, B2.4 scene-per-mode, B2.5 ripple ¼-res buffer, B3.1 beats preset +
dual-oscillator audio, B3.2 doppler audio pitch-bend, B3.5 investigate callout,
B3.6 myths panel, B3.7 quiz upgrades, B3.8 chip retitle, B4.2 canvas SR announcements,
B4.3 aria-valuetext, partial B4.5 (chip/slider sizes).

**OPEN:** B2.1 theme tokens (STEM lab is currently a light surface; do with a hub-wide
token audit), B3.3 measure mode (λ-ruler + stopwatch on pause), B3.4 predict-first
prompts (gradeLevel-banded), B4.1 full i18n extraction to `stem.wave.*` (`__alloT=ctx.t`),
B4.6 contrast pass, keyboard nudge for ripple-source drag (separation slider gives
functional parity today). **Browser smoke pending** (mount golden passed; draw loop,
audio, and drag paths need eyes-on). Pre-existing golden failures for flightSim/galaxy/
molecule/physics/spaceExplorer belong to other sessions — do not rebaseline them.

Source of truth: `stem_lab/stem_tool_wave.js` (3,740 lines, ~299 KB).
Deploy copy: `desktop/web-app/public/stem_lab/stem_tool_wave.js` (byte-identical as of 2026-07-03) — keep both in sync on every edit.
Golden coverage: `tests/stem_sim_tools_golden.test.js:147` (mount mode).

## What the tool is today

7 canvas modes (free / standing / ripple / reflection / longitudinal / doppler / spectrum) over an animated underwater scene; drag interactions (ripple sources, reflection wall); WebAudio "Play Sound"; quiz with corrective distractor feedback; Match Waveform / Match Equation XP games; AI tutor with 3 reading levels; 45-section reference library incl. two genuinely good inquiry widgets (Discover f·λ=v, Standing-wave hunt). Real DFT in spectrum mode; correct fixed/free-end reflection physics; misconception tracer particle in longitudinal mode. Strong foundation — the problems are correctness details, discoverability, and polish.

## BATCH 0 — Correctness (must land before visual work; several actively teach wrong physics)

- **B0.1 Superposition speed mismatch.** Main wave drawn at phase speed `tick*0.08` (L916) but superposition components use `tick*0.03` (L1048–1050). The purple "sum" visibly is NOT the sum of the drawn curves. Unify all three to one ω.
- **B0.2 Superposition ignores phase φ₂.** Drawn second wave includes `phase2Val` (L1015); the sum's `ts2` omits it (L1050). Moving the phase slider changes the pink curve but not the sum → teaches that phase doesn't matter. Add `+ phase2Val`.
- **B0.3 Superposition ignores damping** while both component curves apply it (L919/1018 vs sum loop). Apply same envelope.
- **B0.4 Interference label wrong.** `freq===freq2` labeled "Full/Partial Constructive" regardless of φ₂ (L1072–1074). With φ₂=π it's destructive. Compute from φ₂: |φ₂|<0.2→constructive, |φ₂−π|<0.2→destructive, else partial.
- **B0.5 Dead quest `compare_waves`** checks `waveMode === 'compare'` — no such mode exists (tabs: free/standing/ripple/reflection/longitudinal/doppler/spectrum). Quest can never complete. Re-point check to `d.showSecond === true` (superposition = the comparison feature) and relabel.
- **B0.6 State-key mismatch.** Init seeds `amp2/freq2` (L92) but UI + canvas use `amplitude2/frequency2` (L1843, 2029, 2039). Seeded keys are dead. Standardize on `amplitude2/frequency2`, drop dead seeds.
- **B0.7 `checkWaveMatch` defined twice** (L133 awards 10 XP, L1592 awards 15 XP; second shadows first). Delete one, keep single XP value.
- **B0.8 Play Sound is stale.** Oscillator freq/type set once at start (L1564–1566); button label shows live `d.frequency*100` while the tone doesn't change. Update `osc.frequency.value` / `osc.type` when sliders change while playing. Also stop storing `_audioCtx`/`_audioOsc` in toolData — Snapshot (`Object.assign({}, d)`) captures the live AudioContext reference; move to a module-local or canvas-attached ref.
- **B0.9 Reference-library chip className concat bug** (L2684): `'hover:bg- active:scale-[0.97]' + accent + 'transition-colors -50 hover:border-'…` emits garbage classes; inactive chips have broken hover styles. Rebuild string properly.
- **B0.10 Longitudinal amplitude scaling suspect.** `longAmp = amp * 15 * dpr` (L1179) → at A=50 that's 1500px displacement vs ~27px particle spacing; particles cross and jumble at default settings. Verify on-screen and clamp (e.g., map A 10–100 → 0.2–1.0 × spacing·2).
- **B0.11 Dead `_tutWave`.** Defined in `stem_lab_module.js:2547`, never consumed; in-tool overlay was removed (L1747). Either wire it (see B1.2) or delete.

## BATCH 1 — UX core

- **B1.1 Pause / play / step.** There is NO way to freeze the animation (also a WCAG 2.2.2 gap). Add Pause ⏸ / Play ▶ / Step ⏭ buttons next to Play Sound; paused canvas still redraws on param change (draw once). This unlocks measurement pedagogy (B3.3).
- **B1.2 Onboarding.** 3-step first-run coach marks (reuse `_tutWave` copy): sliders → mode tabs → second wave. Per-tool `_tutorialSeen` persistence already exists in hub (L1708 whitelist includes 'wave').
- **B1.3 Draggable handles: persist + keyboard.** Ripple source and wall positions live only on the canvas element (`canvasEl._drag`) — lost on mode switch/remount, unreachable by keyboard (WCAG 2.1.1). Mirror to toolData; add a Wall-position slider (reflection) and make dragging update the Source-Separation slider value (ripple) so slider ⇄ drag stay coherent; arrow-key nudge when canvas focused in those modes (reuse existing onKeyDown, mode-conditional).
- **B1.4 Reference library declutter.** 47 tiny chips in 7 rows is a wall. Collapse to 7 group headers (accordion, one open at a time), chips ≥24px tall, add a small text filter. Keep IDs stable (state persistence).
- **B1.5 Reset-all button** (params to defaults, keep XP/score).
- **B1.6 De-triplicate mode info.** Hero band + HUD chips + canvas-baked legend all restate the mode. Keep hero band + HUD; move canvas legends into the HTML overlay (see B2.3) and delete the black legend rectangles.

## BATCH 2 — Visual

- **B2.1 Theme tokens.** Tool is light-locked (`bg-white`, `text-slate-800` hardcoded). Adopt `--allo-stem-*` vars used by sibling tools (grep stem_tool_galaxy/solarsystem for the pattern) on panels, cards, reference sections.
- **B2.2 Mode-aware accent.** `WAVE_VIEW_META` defines per-mode accents but canvas strokes are hardcoded cyan. Pass accent via `canvasEl.dataset.accent`; use for main trace + HUD ring. Instant "you changed modes" feedback.
- **B2.3 Legends → HTML overlay.** All canvas-baked legend text (5–7px logical fonts, unlocalizable, invisible to SR) becomes absolutely-positioned HTML chips like the existing HUD (backdrop-blur cards). Localizable, readable, themeable, SR-visible.
- **B2.4 Scene-per-mode.** Underwater scene is meaningful in free/ripple/longitudinal, noise in standing/doppler/spectrum (analytic plots), and fully overwritten each frame in ripple (wasted work). Skip scene render in ripple (perf); dim to a simple dark gradient in standing/doppler/spectrum; medium particles should only oscillate in modes where they represent the medium (free/longitudinal) — in doppler/spectrum they currently wiggle to the free-wave equation, which is misleading.
- **B2.5 Ripple perf.** Per-pixel `createImageData` loop at hardcoded dpr=2 every frame is heavy for school Chromebooks. Render interference field into an offscreen canvas at ½ or ⅓ internal resolution, `drawImage` scaled up (smoothing on). Also replace hardcoded `dpr=2` with `Math.min(2, devicePixelRatio)` everywhere.
- **B2.6 Standing-wave node/antinode markers** — scale labels up (currently 6px logical), color via accent, add subtle pulse on antinodes (respect reduced-motion).

## BATCH 3 — Pedagogy

- **B3.1 Beats preset.** One-click "Beats" chip in free mode: sets f₁=4, f₂=4.5, both amps equal, and (if sound on) plays TWO oscillators so students HEAR the beat while seeing the envelope. Beat frequency |f₁−f₂| readout. The reference library already teaches beats in text; the sim should show it.
- **B3.2 Doppler audio + interactivity.** Play a tone whose pitch follows the shift as source passes the observer (WebAudio is already in the tool); let the observer be dragged; when slider ≥1.0 (extend cap from 0.95) show the Mach cone / sonic boom case (reference data exists at SHOCKWAVE_FACTS).
- **B3.3 Measure mode.** With pause (B1.1): a λ-ruler (drag between crests, snaps) and a period stopwatch (count frames between crest passes at a marked x). Ties the HUD numbers to something students DO — currently v=fλ is asserted, never measured in the main sim.
- **B3.4 Predict-first prompts.** On mode entry (once per session per mode), one-line prediction question with 2–3 chips ("If I double frequency, wavelength will: double / halve / stay same") answered before the controls unlock… lightweight, dismissible, grade-banded via `ctx.gradeLevel` (currently unused outside AI tutor).
- **B3.5 Promote inquiry widgets.** Discover-f·λ and Standing-wave-hunt are the best pedagogy in the tool and are buried as 2 of 47 chips. Add an "🔬 Investigate" callout card under the controls linking straight to them.
- **B3.6 Misconceptions panel** (house pattern from watercycle/physics/platetectonics): grade-banded myths — "waves carry matter", "bigger amplitude = faster wave", "sound travels in space", "cancelled waves are destroyed" — each with a "Show me" button that switches the sim to the disproving mode/params.
- **B3.7 Quiz upgrades.** Shuffle option order (correct answer is currently position-biased toward first slots); cycle without repeats until bank exhausted; show score as x/y attempted; per-question "Show me in the sim" that jumps to the demonstrating mode. Keep the excellent wrongFeedback.
- **B3.8 Reference-library content hygiene.** `optical_facts` ("Optical illusions") includes non-illusions (Doppler shift, sonic boom, phantom limb) — retitle to "Perception & wave phenomena" or move entries; phantom limb is off-topic for a wave tool (scientific-integrity memory: don't blur categories). Audio formats/bitrates section is tangential — fine to keep, but group under Reference not Sound & Music if trimming.

## BATCH 4 — Accessibility + i18n

- **B4.1 String extraction.** Whole tool is hardcoded English; the two existing `t('stem.wave.…')` keys don't exist in any pack (silent fallback). Extract UI strings to `stem.wave.*` following the STEM i18n pattern — **alias `__alloT = ctx.t`, NOT bare `t`** (free-t crash class; check_free_vars gate). Canvas text migration (B2.3) is a prerequisite for full coverage. Reference-library long-form content can be a later wave (57-lang pipeline).
- **B4.2 Keyboard parity** for all drag interactions (B1.3) + announce values on canvas keydown (arrows currently change amplitude/frequency silently for SR users; call canvasNarrate like the sliders do).
- **B4.3 aria-valuetext on the 4 main sliders** (amplitude/frequency/speed/medium-v) with derived values ("2 Hz — wavelength 171.5 m, period 0.50 s") matching the pattern already used on the equation inputs.
- **B4.4 Reduced motion = paused by default.** Currently `tick += 0.2` merely slows the animation. With prefers-reduced-motion: start paused on a representative frame, offer explicit Play. (Pairs with B1.1.)
- **B4.5 Target sizes ≥24×24** (reference chips, second-wave mini-sliders w-16, harmonic buttons are OK at 36px).
- **B4.6 Contrast pass** on canvas colors over the ocean gradient (grid 0.05 alpha is decorative-fine, but the amber λ annotation and dashed target sit near 3:1 boundary; verify against the darkest gradient stop).

## BATCH 5 — Verification + deploy hygiene

- Run `stem_sim_tools_golden` (mount) — do NOT `vitest -u` the whole suite (rebaseline trap).
- Add pure tests: DFT harmonic magnitudes (sine→[1,0,0…], square→odd 1/n), superposition sum equals component sum (post-B0.1–B0.3), Doppler f′ formulas, standing-hunt `isHarmonic` detection.
- Gates: `check_render_refs`, `check_free_vars`, `check_lang_json` (after B4.1).
- Sync BOTH copies (root `stem_lab/` + `desktop/web-app/public/stem_lab/`); pathspec-only commits (shared tree, concurrent sessions); deploy.sh in background with ≥600000ms timeout, never `| tail`.

## Suggested sequencing

1. Batch 0 in one commit (pure fixes, golden-safe) → smoke.
2. B1.1 + B1.6 + B2.3 together (pause + legend migration touch the same draw loop).
3. B2 visual pass → smoke on Chromebook-class hardware for ripple perf.
4. B3 pedagogy (each item independently shippable; B3.1/B3.2 first — highest wow-per-line).
5. B4 i18n last (strings stop moving).
