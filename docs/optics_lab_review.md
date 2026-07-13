# Optics Lab — deep-dive review (2026-06-20)

> **Historical review snapshot, not current open-bug status (2026-07-09):** This June deep dive is preserved for its analysis of the tool at that time. Later STEM refinements and QA reports may have changed individual findings; verify against current source/mirrors/tests before treating an item as open.

Tool: `stem_lab/stem_tool_optics.js` (`opticsLab`, ~20,250 lines — a flagship "20K" tool).
Sub-tools: Reflection (mirrors), Refraction, Lenses, Interference, Diffraction, Polarization,
Quiz. Physics engine is a set of module-scoped functions (`thinLens`, `snell`, etc.).

## Headline

**The physics is excellent — but the tool had a flagship-grade latent crash.** Every formula
function is correct (geometric optics, refraction, TIR, diffraction, polarization), with proper
sign conventions and accurate refractive indices. The real find was a **throwlab-class
Rules-of-Hooks bug** that would crash Optics Lab on first open. Fixed, plus a screen-reader
enhancement for the lens/mirror sims.

## HIGH — Rules-of-Hooks crash on first open (FIXED)

The main render gated its body behind `if (!toolData.opticsLab) { setToolData(seed); return
<Initializing…> }` (line ~2635) — an early return **before** its hooks (`useRef` ~2676,
`useEffect` ~2677, and more below). So:
- render 1 (empty bucket) → returns Loading with **0 hooks**;
- render 2 (seeded) → runs **N hooks** → React throws *"Rendered more hooks than during the
  previous render"* on the Loading→ready transition.

The bucket is **not persisted** (the code comment says so), so it's empty on every reload →
the crash path fires on every first open. It was masked everywhere it's "tested": the SSR
golden rendered the Loading placeholder once (`lengthBucket: 1` — the real body had **never**
been render-tested), `check_stem_render` renders once, and the flagship e2e uses a mock React
that doesn't enforce hook rules.

*Fix* (same as the throwlab fix): seed defaults **without** early-returning — extract the
literal to `OPTICS_DEFAULTS`, `var d = labToolData.opticsLab || OPTICS_DEFAULTS`, and fall
through. The body reads state only via the local `d` (verified — no direct `toolData.opticsLab`
reads past the gate), so first paint matches render 2 and all hooks run every render. SSR now
renders the real ~21.6K-char body; the golden is re-baselined from the placeholder to the real
home view.

## What's verified correct (the physics engine)

- **`thinLens(d_o, f)`**: `d_i = f·d_o/(d_o−f)`, `m = −d_i/d_o`. Traced all four cases —
  converging lens (object beyond 2f → real/inverted/reduced; inside f → virtual/upright/
  magnified), diverging lens (always virtual/upright/reduced), concave & convex mirrors. Sign
  conventions sound and documented.
- **`snell`** (n₁sinθ₁ = n₂sinθ₂, with TIR detection), **`criticalAngle`** = arcsin(n₂/n₁) ✓.
- **Diffraction/interference**: single-slit sinc² envelope, double-slit envelope × cos²
  interference, fringe positions y = mλL/d ✓.
- **`malus`** = I₀cos²θ ✓. Refractive indices all accurate (water 1.333, diamond 2.417, …).
- A few sub-tools reimplement Snell/critical-angle inline (e.g. the wavelength-dependent
  Snell-inquiry widget) — all correct, justified by varying inputs. AI tutor is click-gated
  (grades a *submitted* written explanation) with a `_mounted` guard.

## Enhancement — slider a11y (DONE)

The tool is almost entirely slider-driven (91 range inputs) yet had **0 `aria-valuetext`** and a
live region used only for the quiz score — so screen-reader users heard raw numbers, not the
physics result. Added `aria-valuetext` to the lens and mirror sims' focal-length + object-
distance sliders, speaking the computed image (distance, magnification, real/virtual,
upright/inverted). Also enriched the mirror SVG `aria-label`, which previously omitted the image
result the lens label already included.

## Tests
`tests/optics_lab_science.test.js` (8): a regression guard that the tool renders its real body
(not the placeholder), the thin-lens/mirror physics across real/virtual cases, and the new
slider aria-valuetext.

## Follow-ups (not done)
- Extend `aria-valuetext` / live-region announcements to the refraction, diffraction, and
  polarization sims (same pattern, ~remaining high-traffic sliders).
- Optionally DRY the inline Snell/critical-angle reimplementations onto the engine functions.
