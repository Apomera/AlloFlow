# Titration Lab — deep-dive review (2026-06-20)

Tool: `stem_lab/stem_tool_titration.js` (`titrationLab`, ~3,170 lines). SVG/DOM-based
(no `<canvas>`). Tabs: Titrate · Challenge · Incidents · Equipment · Molarity, behind a
mandatory safety walkthrough gate.

## Headline

**This is one of the strongest STEM tools on scientific correctness.** The pH engine is
genuinely right across every acid/base strength combination, the indicator data is
accurate, and the pedagogy (buffer region, half-equivalence = pKa, endpoint-vs-equivalence,
indicator-mismatch detection) is sophisticated and honest. The AI tutor is correctly
click-gated (no auto-`callGemini`).

The real gaps are **accessibility of the dynamic feedback** (a blind student can operate the
slider but cannot perceive the pH/color/endpoint result) and **two preset-specific
correctness bugs** (`Veq` for redox + back-titration). Two more are minor scientific artifacts.

## What's verified correct (the science)

`calcPH(vol)` — checked branch by branch:

- **Strong–strong** (HCl+NaOH): initial `−log10(Ca)` = 1.0 ✓; excess-H⁺ before equiv ✓;
  pH 7 at equiv ✓; excess-OH⁻ after ✓.
- **Weak acid–strong base** (acetic+NaOH, Ka 1.8e-5): initial `−log10√(KaCa)` = 2.87 ✓;
  Henderson–Hasselbalch `pKa + log10(base/excess)` in the buffer region (pH = pKa at
  half-equiv ✓); equivalence via conjugate-base hydrolysis `14 + log10√((Kw/Ka)·C)` = **8.72 ✓**
  (textbook).
- **Strong acid–weak base** (HCl+NH₃, Kb 1.8e-5): equivalence `−log10√((Kw/Kb)·C)` = **5.28 ✓**;
  post-equiv base-buffer H–H ✓.
- **Weak–weak** (acetic+NH₃): equivalence `7 + ½(pKa − pKb)` = 7 ✓ (algebraically identical to
  `½(pKa + pKw − pKb)`).
- **Polyprotic** (H₃PO₄, Ka 7.5e-3/6.2e-8/4.8e-13 ✓): amphiprotic midpoints `½(pKa1+pKa2)` = 4.67
  and `½(pKa2+pKa3)` = 9.77 ✓.

Data: indicator transition ranges all match real values (phenolphthalein 8.2–10, methyl orange
3.1–4.4, bromothymol blue 6.0–7.6); Ka/Kb/pKa correct; GHS hazard data accurate; quiz answers
scientifically sound (esp. the phenolphthalein/equivalence and half-equivalence=pKa items).

Strong pedagogy worth preserving: the mandatory safety walkthrough + incident simulator, the
buffer-region band, the ½Vₑ→pH=pKa marker, the **endpoint-vs-equivalence** analysis with
titration-error in mL, and the **indicator-mismatch** flag (does the chosen indicator's band
actually straddle the equivalence pH?).

---

## Findings (prioritized)

### HIGH — the dynamic sim is invisible to screen-reader users
The pH, flask color, and endpoint status update only as visual elements; there is no
non-visual channel. Three concrete causes, fix together:

1. **Dead live region.** `allo-live-titration` (aria-live=polite, role=status) is *created*
   (`:575`) but **never written to** — no code populates it on volume change. The WCAG-4.1.3
   scaffolding is there but unused.
2. **Volume slider has no `aria-valuetext`** (`:1802`). A screen reader announces raw numbers
   ("5.1, 5.2"), not "5.1 mL — pH 4.8 — before endpoint."
3. **The SVG titration curve has no `role="img"`/`aria-label`/`<title>`/`<desc>`** (`:2043`).
   The central data visualization is unlabeled.

*Fix:* add `aria-valuetext` to the slider (`"${vol} mL, pH ${pH}, ${indicatorStatus}"`), write
that same string into `#allo-live-titration` (debounced) on volume change, and give the `<svg>`
`role="img"` + an `aria-label` summarizing shape/equivalence. Highest impact for the least code.

### MEDIUM — `Veq` is wrong for the redox and back-titration presets
`Veq = concAcid·volAcid / concBase` (`:338`) is the acid–base equivalence formula and is correct
for the 5 acid–base presets. But:
- **Redox** (Fe²⁺/KMnO₄, 5:1 stoichiometry): real equivalence is **5 mL**, `Veq` says **25**.
- **Back-titration** (0.003 mol excess HCl): real equivalence is **30 mL**, `Veq` says **50**.

`calcPH` handles both correctly (its redox branch inflects at 5 mL, back-titration neutral at
30 mL), but `Veq` drives the chart's equivalence vertical line (`:2162`), marker (`:2212`),
pHₑ label (`:2221`), the `Vₑ` x-axis tick (`:2136`), `pastEquivalence`, and the nearEquiv/overshot
tips — so for these two presets the equivalence marker sits at the wrong volume, disconnected
from where the curve actually changes.
*Fix:* compute `Veq` per preset (redox: `Veq/5`; back-titration: `excessAcidMoles/concBase·1000`).

### MEDIUM — a global text-contrast override mis-scoped into the a11y CSS
`:21` injects `…@media(prefers-reduced-motion){…}}.text-slate-200{color:#64748b!important}` — the
`.text-slate-200` rule is **outside** the media query, so it applies **always**, recoloring many
small labels (`text-[11px]`) to slate-500 (#64748b) on the dark glass backgrounds (~3.3:1,
**below WCAG AA 4.5:1**). Almost certainly an accidental leak from a contrast/merge edit.
*Fix:* delete the stray rule (slate-200 #e2e8f0 already passes), or move it inside an intended
scope with an AA-safe color.

### LOW — weak-acid curves dip ~0.2 pH at the very start (non-monotonic)
Henderson–Hasselbalch is applied from the first drop (the "use weak-acid-alone" guard threshold
`molesBase < 1e-7` at `:435` is far below the acid's self-dissociation, ~3e-5 mol). So acetic+NaOH
goes 2.87 (v=0) → ~2.65 (v=0.2) → rising — a small downward hook before the curve climbs.
*Fix:* raise the threshold, or return `max(H–H, weak-acid-alone)` near v≈0.

### LOW — polyprotic 3rd-equivalence concentration term
`:402` uses `CaP/(totalVP*1000)` (≈0.001 M) for the phosphate concentration where it should be
`molesAcidP/totalVP` (≈0.025 M) — making the 3rd-equivalence pH ~0.7 too low. Narrow band, and
H₃PO₄'s 3rd equivalence is essentially unobservable in water anyway, so very low impact.

### COSMETIC — molarity calculator variable naming
The dilution math is correct (V₁=C₂V₂/C₁ verified: 0.1M×10mL/1.0M = 1.0 mL stock; ratio 1:10;
water-to-add; moles — all right). But the internal `molarityCalcV1` plays the role of **V₂**
(final volume) in the displayed `V₁ = C₂×V₂/C₁` formula. Readability only; no user-facing error.

---

## Suggested order of work
1. The HIGH a11y bundle (slider `aria-valuetext` + populate the live region + label the SVG) — one
   focused change, makes the core sim usable non-visually.
2. `Veq`-per-preset (MEDIUM) — removes a visible wrong-marker for 2 of 7 presets.
3. Delete the stray contrast override (MEDIUM) — one-line AA fix.
4. Optionally seed correctness unit tests for `calcPH` (the engine is good — lock it): pin the
   verified equivalence pH values (8.72 / 5.28 / 7.00 / amphiprotic midpoints) so a future edit
   can't silently break the chemistry. This is exactly the logic-level coverage the Tier-D audit
   flagged as missing.
