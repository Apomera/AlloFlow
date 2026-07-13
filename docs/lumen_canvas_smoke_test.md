# Lumen — real-Canvas smoke test

Run this in the **deployed Gemini Canvas surface** (and/or prismflow-911fe.web.app)
after the next deploy clears. SSR golden tests pin the render; this checks the
*live* surface — load, interaction, AI calls, exports, and the 2026-06-08
repositioning. Tick each box; note anything that doesn't match the expected result.

Lumen is `_pluginOnlyTools` + `ready:false` (out of the STEM Lab grid), so the
**Educator Hub 💡 Lumen card is the entry point**. ~10 minutes end to end.

---

## 0. Entry + de-drifted first impression
- [ ] Open **Educator Tools (Educator Hub) → 💡 Lumen**. It opens the STEM Lab on Lumen.
      - *If the card is missing:* the source→build pipeline dropped it — rebuild via
        `node _build_view_educator_hub_modal_module.js` (see project memory).
- [ ] Card copy reads the **general** pitch ("turn any dataset … into a defensible,
      honestly-marked finding"), **not** "progress-monitoring … for IEP teams".
- [ ] First paint of the empty canvas reads **`Measure (units)`** (neutral), **not** "WCPM (words/min)".
- [ ] The empty canvas is **calm**: the guided 3-step onboarding shows; the dark
      Evidence-Inquiry widget is **absent** (it's gated to ≥3 points + a disclosure).

## 1. Data in — all five paths
- [ ] **Type** 3+ points (x + Measure). At n≥3 a chart + plain-language finding appears; at n<3 a "not enough data" refusal card (no fake line).
- [ ] **Try a sample** → loads the **plant-growth** example (height/cm over weeks, before/after fertilizer) — not reading probes.
- [ ] **⎘ Paste data** → paste CSV/TSV/JSON text → column-mapper preview → Confirm binds.
- [ ] **⇪ Import file** → a `.csv` / `.json` / `.xlsx` / `.ods` → mapper → bind.
- [ ] **⚗ Practice data…** (a disclosure — the trio is no longer loose in the entry row) → opens the violet practice box: **Use sample data**, a **Scenario** picker with humanized labels ("Improving trend", "Flat / no change", …), **⚗ Generate practice data**, and (once synthetic data is loaded) **↻ Re-roll**. Generated data appears with the **violet synthetic banner**.

## 2. Editable variables (Setup row)
- [ ] Change **Measure / Unit / X-axis label** — the header, entry field, chart axes, finding sentence, and data-table relabel **live**.

## 3. The 9 chart types
- [ ] The audience + chart rows live behind **"▸ View options — Working · Trend"** (calm by default). Open it; switching to any non-default audience/chart keeps it **auto-open**, and the closed toggle always **names** the current state (state is never hidden).
- [ ] Cycle the **Chart:** switcher — trend, bar, dot, box, histogram, scatter, slope, multi-line, grouped-bar all render without error.
- [ ] Trend (default): per-point marks burn **● "Observed"** (not the L1 ◈); the trend *line* + uncertainty band are the L1 object.
- [ ] **Color-blind-safe series (multi-line / grouped-bar):** series are distinguished by **shape + dash + texture**, not hue alone — series 1's line is **dashed** with **square** points; grouped bars carry a **texture** (diagonal/dots/…); the legend shows the same shape/dash/texture. Squint or imagine greyscale: the series are still tellable apart.

## 4. Audience faces (now domain-general)
- [ ] **Audience:** shows **Working / Formal / Plain language** (hover tooltips name the general use: a decision/IEP/grant reviewer; a parent/student/public).
- [ ] **Plain language** keeps the **n and the interval** and says "a direction, not an exact number" — it never reads more confident than the data.

## 5. AI ladder (honesty floor)
- [ ] Default **L1** = **zero** AI calls (watch the network/AI Diagnostics — nothing fires until you raise the dial).
- [ ] L2/L3 fire only on demand; every AI output is lint/validate-gated and marked; the export footer prints the **max epistemic level**.

## 6. Synthetic-data guards
- [ ] With generated (or sample) data loaded: the **banner** + an in-SVG **"PRACTICE DATA"** watermark are present; per-point marks burn **◇ "Synthetic (practice)"**.
- [ ] Set Audience = **Formal** and export → **blocked** ("cannot be exported as a defensible formal document"); no sign-off clears it.
- [ ] Working/Plain export proceeds but is **watermarked** (HTML title/h1/footer; CSV `# SYNTHETIC` + `-SYNTHETIC` filename + per-row "Synthetic (practice)").

## 7. Exports + FERPA (real data)
- [ ] **Brief (HTML)** with the FERPA box **off** → finding-only (no per-row table; `-summary` filename). Tick **Include identifiable data** → a **confirm** dialog, then the full table + `-CONFIDENTIAL` filename.
- [ ] **Data (CSV)** off → aggregate `metric,value` only; on → confirm + identifiable rows (per-row reads **"Observed"**, not "Derived (math)") + `-CONFIDENTIAL`.

## 8. "Bring in an AlloFlow report" (the complement feature)
- [ ] Export a **single student's Fluency CSV** from the Teacher Dashboard, then **Import** it into Lumen → green **"📊 Recognized an AlloFlow fluency export — re-projecting honestly"** note; x auto-maps to **row order**, y to WCPM, y2 to Accuracy.
- [ ] Import the **RTI roster CSV** (`RTI_Report_CONFIDENTIAL`, has a Student/Name column) → **refused** with a rose note pointing back to the dashboard (never imports per-student records).

## 9. Evidence-Inquiry sandbox
- [ ] With ≥3 points, a **"🔬 Learn: should I trust a trend? sandbox"** toggle appears (default closed). Open it → it's clearly a **what-if sandbox** ("not your data", "What-if AI level (not your live dial)").

## 10. Benchmark workspace (ships empty by design)
- [ ] **▣ Open benchmark setup** → the curated-norm picker **refuses** honestly ("no verified … cell") because the norm spine ships empty (release blocker = human byte-transcription per `docs/lumen_norm_spine_worksheet.md`). No fabricated benchmark line ever draws.

## 11. Present mode + presentation export (the share layer — live-only behaviours)
The SSR golden pins the overlay's structure; these need the real surface
(DOM serialization, the Fullscreen API, the reveal animation, the download).
- [ ] In a trend/bar/dot/box/histogram/slope view with ≥3 points, the export row reads **"Present / export this view:"** with a **▶ Present** amber pill (it is **absent** in scatter / multi-series / grouped-bar, like the other exports).
- [ ] Click **▶ Present** → a clean **full-screen overlay** opens over the tool: 💡 Lumen wordmark, the measure, the **finding (large)**, the **◈ Derived (math)** provenance pill, and the chart — which **fades + rises in once** (band, line and points **together**, never the line first).
- [ ] With OS "reduce motion" on, the reveal **does not animate** (it just appears) — honesty + a11y.
- [ ] The overlay chart still carries the **uncertainty band** and the per-point provenance marks (and, on synthetic data, the violet **practice banner** + in-SVG **PRACTICE DATA** watermark).
- [ ] **⤢ Fullscreen** → the overlay goes true-fullscreen (projector-ready); Esc / browser-exit returns to the overlay.
- [ ] **Keyboard:** opening Present moves focus **into** the overlay (the Export button); **Tab / Shift+Tab stay trapped** among Export → Fullscreen → Exit (they don't fall back into the view behind); **Esc** closes it; on close, focus **returns to the ▶ Present** button. A screen reader announces it as a dialog and ignores the content behind.
- [ ] **✕ Exit** → returns to the **calm analysis view underneath**, unchanged (the overlay was additive).
- [ ] **⤓ Export presentation (HTML)** → downloads `lumen-presentation-<measure>-<audience>-summary.html`. Open it: a **full-page, presentation-styled** doc with the **finding**, the **inlined live chart** (band + provenance glyphs intact — it is the *exact* chart you saw, serialized), Methods, and a **max-epistemic-level footer**. **Print-to-PDF** looks clean (the `@media print` rules drop chrome).
- [ ] Tick **Include identifiable data (FERPA)** → Export presentation → a **confirm** dialog, then the file embeds the per-point table and the filename/footer say **CONFIDENTIAL**. Off → finding-only, **no per-row table**.
- [ ] **Synthetic/sample data** → Export presentation is **watermarked** (title/banner/footer say SYNTHETIC, `-PRACTICE-` in the filename); a **Formal** audience still **blocks** the export (sign-off cannot clear it).

## 12. 2026-07-12 wave — editing, focus subset, data-bound sign-off, export a11y
- [ ] **Phase input:** in the entry row, type points tagging **Phase (optional)** `before`, then change it to `after` and add more — a **dashed phase line** appears at the boundary; the finding names it. The tag *sticks* between adds.
- [ ] **Undo / remove / clear:** **↩ Undo last** removes the newest point; open the data table → each row has a **✕ Remove** (with a spoken label); **🗑 Clear all** asks to confirm first.
- [ ] **⧉ Copy finding** (in the finding card) → the pasted sentence *starts with the level word* and carries the interval + n (the provenance travels with the copy).
- [ ] **Focus subset (anti-cherry-pick):** open the data table and **uncheck** a few Focus boxes → an amber **"◐ Showing k of n"** chip appears (its only dismissal is **Show all**), the chart redraws over just the focused points, the finding says "**across these k of n probes**", and the **AI button is gated off** ("AI reads the full dataset"). Export the aggregate CSV → it contains a `shown_of,k/n` line. The identifiable CSV still exports **every** row.
- [ ] **Data-bound sign-off:** at L3 + Formal, generate an AI reading, **Own it** (✓ Signed off), then **add or remove one data point** → the sign-off reverts to "⚠ Sign off before a formal export" and a formal export **blocks** until re-owned. The AI reading itself also clears on any data edit.
- [ ] **Keyboard/SR spot-checks (axe-verified in CI; eyes-on here):** disclosure toggles announce expanded/collapsed; the data table reads as a real table (caption + column headers); no focus lands on anything invisible in Present mode.
- [ ] **Export documents:** view-source of a downloaded brief/presentation starts `<!doctype html><html lang="en">`; the brief is readable on a phone (viewport meta).
- [ ] **Benchmark empty-state:** under "Add external benchmark", a note explains the norm table **ships empty on purpose** until human-verified — no mystery refusal.

---

### Result
- [ ] All boxes ticked → Lumen is verified live.
- [ ] Note any mismatch here (surface, browser, repro steps) for follow-up.

*Pairs with the SSR golden suite (`npm test` → `tests/lumen_*`) which pins the
render structure; this doc covers what only the live surface can show.*
