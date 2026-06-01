# STEM Lab Tool Spec: Voxel Archaeology (accessibility-first)

**Status:** Design spec, not built. Authored 2026-05-31. Intended to be handed to a student (CS capstone) or built directly.
**Working id:** `stem_tool_archaeology` (file: `stem_lab/stem_tool_archaeology.js`)

---

## 1. One-line concept

A layer-by-layer excavation tool: students dig down through a voxel grid of soil strata, uncover artifacts in context, record what they find, and reason about *relative dating* and *site interpretation* from partial evidence. It teaches archaeology as evidence-based science with real excavation ethics, not treasure hunting.

## 2. Why it fits AlloFlow

- **Distinct in the suite.** No existing STEM tool covers archaeology/excavation. Differentiate from the three nearest neighbors during build: `stem_tool_rocks` (geology), `stem_tool_platetectonics` (geophysics), `stem_tool_raptorhunt` (paleontology). Archaeology = human artifacts + inference + ethics, not geology or fossils.
- **Genuine cross-curricular STEM/STEAM:** earth science (stratigraphy), the scientific method (inference from incomplete data), history/anthropology, and dating science.
- **Student-buildable and contained.** A self-contained ~new tool that cannot break any other tool. Ideal CS capstone; the accessibility requirement forces good engineering.

## 3. Learning objectives

A student finishing a dig should be able to:
1. Apply the **law of superposition** (deeper strata are older) to order finds in time.
2. **Infer from partial evidence** — you sample and record, you do not excavate everything.
3. Use a **systematic method** (grid, one layer at a time, record before removing).
4. Explain why **context matters more than the object** — where/in what layer something is found tells you more than the artifact itself, and removing things from context destroys information (the ethics + the science).
5. Distinguish **relative dating** (stratigraphy) from **absolute dating** (radiocarbon, dendrochronology) at a grade-appropriate level.

## 4. THE core design decision: accessibility-first interaction (do not skip)

AlloFlow's brand is accessibility, so this tool must be fully usable by keyboard-only, screen-reader, low-vision, and motor-impaired students. A free-flying 3D voxel camera would make it the *least* accessible tool in the suite. The accessible design is also the more pedagogically accurate one, so build it this way:

- **Excavate one horizontal layer at a time, shown as a 2D grid** (the "plan view"), navigated with arrow keys and activated with Enter/Space. This mirrors how real excavation is recorded as plan drawings.
- **A stratigraphic cross-section side view** showing the layers and depth (a second representation of the same data).
- **A text excavation log** that records each action and find (third representation).
- **Optional 3D view as progressive enhancement only.** The 2D plan + cross-section is the canonical, required path; 3D, if added, lazy-loads and is never the only way to do anything.

This satisfies UDL multiple-means-of-representation by design (plan + cross-section + log + audio), not as an afterthought.

## 5. Data model

- **Grid:** `cells[x][y][z]` (z = depth). Keep MVP small (e.g. 6x6 plan, 5 strata deep) for performance and cognitive load.
- **Stratum:** ordered layers `0..n` (0 = surface, n = deepest = oldest), each with a material (topsoil, clay, ash, bedrock), a color from theme variables (never color-only; pair with a label/pattern), and an approximate period.
- **Artifact:** `{ id, type, trueStratum, label, description, fragile }`. True age is derived from the stratum it sits in.
- **Excavation state:** which cells have been excavated to which depth; what has been recorded; whether context was preserved (recorded-before-removed) vs. "grabbed."

## 6. Core loop

1. Choose a grid cell, excavate the topmost un-removed layer there.
2. If an artifact is exposed, the student must **record it** (note its layer, position, condition) *before* removing it. Recording-first preserves context; grabbing-first loses it.
3. Build a **site interpretation**: order finds by stratum, propose relative ages, optionally apply an absolute-dating mini-step.
4. **Feedback** rewards systematic excavation and context preservation, and gently penalizes destroying context (e.g., an artifact removed without recording loses its dating information). Teach the superposition check explicitly: did the student order finds correctly by depth?

## 7. Accessibility requirements (acceptance gate)

- Fully **keyboard operable**: arrow keys move the grid cursor, Enter/Space excavate/record, a documented key map, visible focus ring.
- **Screen-reader support**: each cell announces its position, current depth, material, and any exposed artifact via ARIA live regions; the canvas has a text-equivalent.
- **No color-only encoding**: strata and states use labels/patterns plus color; all text meets WCAG 2.1 AA contrast using the shared `var(--allo-stem-*)` theme variables.
- **Reduced motion**: honor the shared reduced-motion CSS (already injected by the STEM Lab); no essential animation.
- **Mute + haptics**: respect the global mute; use the shared audio/haptic helpers; never rely on sound alone to convey state.
- **Target sizes** large enough for motor accessibility; works on touch and pointer.

## 8. Content accuracy + ethics (non-negotiable for AlloFlow)

- Frame it as **context-over-loot**: the tool's reward structure must teach that careful recording beats grabbing the shiny object. This is what makes it real archaeology and distinguishes it from an Indiana Jones game.
- **Accurate dating science**: stratigraphy is *relative*; radiocarbon and dendrochronology are *absolute*. No pseudo-archaeology (no "ancient aliens," no fabricated methods).
- **Cultural sensitivity**: artifacts represent real human cultures; include a light, age-appropriate note on provenance, preservation, and that real finds are documented and often repatriated, not kept as trophies.
- **Source-check the content** with a reliable archaeology/anthropology reference, since none of the project's current advisors are archaeologists.

## 9. Technical conventions (match the existing tools)

- Self-contained module at `stem_lab/stem_tool_archaeology.js`, no separate build step (direct `.js`, like the other tools).
- Register with the STEM Lab the same way the existing `stem_tool_*.js` do (study `stem_tool_rocks.js` or `stem_tool_platetectonics.js` as exemplars for registration, mount/teardown, and structure).
- Honor: `var(--allo-stem-*)` theme variables (light/dark/high-contrast), the shared reduced-motion CSS, the global mute, `window._alloHaptic`, and the shared Web Audio pattern.
- **No PII**, no network calls, no external CDN beyond what the suite already loads. Runs inside Gemini Canvas with zero setup like the rest.
- If a 3D view is added later, lazy-load its dependency and keep the 2D plan/cross-section as the canonical, always-available path.

## 10. Scope / phasing

- **MVP:** one dig site, a 6x6 plan x 5 strata, 3 to 5 artifacts, plan view + cross-section + log, record-before-remove mechanic, a superposition-ordering check, full keyboard + screen-reader support.
- **Later:** multiple sites/difficulty levels, an absolute-dating mini-tool, a "publish your site report" export (ties to the platform's literacy/recording theme), richer artifact sets.

## 11. Acceptance criteria (testable)

1. A keyboard-only user can complete a full dig (excavate, record, interpret) with no mouse.
2. A screen reader announces cell position, depth, material, and exposed artifacts.
3. All text and strata pass WCAG 2.1 AA contrast in light, dark, and high-contrast themes.
4. The tool demonstrably teaches superposition (a check confirms the student can order finds by depth) and rewards context preservation over grabbing.
5. Reduced-motion and mute are honored; nothing essential is conveyed by motion or sound alone.
6. No console errors on mount/teardown; passes the suite's existing render/CDN checks.

## 12. Student framing (if handed off)

This is a strong CS capstone: a bounded voxel-grid engine, a clean data model, and a real accessibility challenge that makes it a portfolio piece. Suggested first deliverable: the 2D plan-view grid with keyboard navigation and the data model, before any rendering polish. Test against the acceptance criteria above. Domain content (the archaeology accuracy and ethics) should be reviewed by someone with a history/anthropology background, not assumed.
