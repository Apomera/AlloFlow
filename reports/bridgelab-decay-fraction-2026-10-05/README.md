# Bridge Lab: compare the fraction of starting energy remaining

The damping guide offers **Compare the fraction remaining** inside its existing energy figure. From 16 s onward, students can compare how much of each trial's starting energy remains, alongside the paired energy amounts in J/kg.

## Reading the comparison

For each trial, the remaining fraction is **E(t) / E(16 s)**. E(t) is the recorded kinetic plus elastic energy per kg of modal mass, using deck motion relative to the ground. A and B each use their own starting amount. Equal percentages therefore do not imply equal energy amounts.

- The percentage view opens through a native keyboard-accessible disclosure. The main J/kg budgets remain visible above it.
- Defined fractions share one percentage axis, beginning at zero and reaching at least 100%. The dashed line marks 100% of each trial's own starting energy.
- Finite ratios remain unclamped, including values above one; the shared axis expands when needed. The energy budget above separately reports the numerical balance residual.
- Exactly zero starting energy produces an undefined fraction. That trial displays an explanation and no percentage, fraction bar or 100% marker.
- Tiny positive starting energy retains its ratio. Scientific notation preserves small amounts and percentages. **Small on this scale** identifies a short nonzero fraction bar without enlarging or suppressing its geometry.
- At 16 s, a positive starting amount gives 100%. At 24 s, the observation ends; vibration and stored energy can remain. This is an energy percentage, while displacement and velocity vary through each cycle.

Percentages are calculated from unrounded recorded energies. The numerator and denominator are each shown with J/kg units and six significant digits for nonzero amounts. Dividing those rounded amounts can give a slightly different result. A true zero quotient stays exactly zero, and a zero denominator stays explicitly undefined.

The energy budget bars share a J/kg scale. The optional fraction view uses its own percentage scale.

## Recorded evidence and print

The view uses the guide pair's own inputs and shared inspection time. Recorded evidence reconstructs its original pair independently of live settings, notebook reference selection, scene selection and separately pinned intervals. The pair's original comparison conditions remain visible.

Printed reports include the percentage comparison as a static section with the same readings. The feature adds no saved fields, changes to modal physics or integration, animations, or 3D resources. It remains part of the illustrative earthquake model, separate from static bridge member forces and safety checks.

## Final validation

**Final verification passed on the current files.**

- **261 unit checks:** 192 immersive interaction checks, 65 seismic model checks and four inertia checks, including ten new decay-fraction checks.
- **17 Chromium browser workflows in one fresh passing run:** three decay-fraction workflows, three energy-budget workflows, four guided-damping workflows, four claim-interval workflows and three energy-question workflows. Coverage includes keyboard operation, phone layouts, tiny and zero amounts, original recorded context, print reconstruction, and graphics loss/recovery.
- **144 numerical configurations and 576 primary paired windows**, plus 16 mixed-pair windows and 288 amplitude-comparison windows. The sweep checks recorded ratios, undefined zero baselines, finite geometry, order reversal, unchanged inputs, amplitude invariance, and synthetic values above one. It also checks five valid synthetic cases and rejects 24 malformed or overflowing inputs.
- Identical source copies, valid syntax, matching English text for **1,325 literal keys**, scoped whitespace checks, and **12 new feature captures**.

Browser and interaction checks independently parse the visible J/kg amounts and require their quotient to agree with the raw fraction within a relative tolerance of **2e-5**. This checks that the displayed amounts support the percentage a student reads. True zero stays exact; a zero denominator must produce the undefined explanation.

The complete unit run passed using forked worker processes and a 4 GB Node heap. Earlier browser attempts encountered shutdown timeouts. One phone attempt had timings consistent with a long host scheduling pause. The final browser config disables video and stores artifacts outside OneDrive, with the same Chromium settings, assertions and test limits. A successful three-workflow recovery was followed by the complete 17-workflow passing run. Earlier raw reports remain available as browser-final-attempt.json, browser-video-off-attempt.json and browser-guide-energy-recovery.json.

Final results are recorded in unit-results.json, browser-final-clean.json, browser-results.json, model-invariants.json and source-verification.json. The strict verifier requires the published browser report to match the fresh raw complete report exactly, checks the 17 expected identities and clean retry-zero results, and binds the reported validation config by path, hash and modification time. Relevant Bridge source and test files must predate each final run. The browser harness uses fallback strings contained in the Bridge code; current English registries are checked separately for all 1,325 literal fallback entries. Input, config and report hashes are rechecked before writing verification output. Numerical results must match the current source hash.

From the project root:

```text
node reports/bridgelab-decay-fraction-2026-10-05/verify-decay-fractions.cjs
node reports/bridgelab-decay-fraction-2026-10-05/verify.cjs
```

[Desktop comparison](decay-fraction-1000-fractional.png) · [Phone comparison](decay-fraction-320-fractional.png) · [Printed evidence](decay-fraction-1000-print.png) · [Graphics fallback](decay-fraction-844-fallback.png)

No staging or commits. Changes remain uncommitted.
