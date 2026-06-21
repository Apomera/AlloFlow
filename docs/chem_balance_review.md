# Equation Balancer (chemBalance) — deep-dive review (2026-06-21)

Tool: `stem_lab/stem_tool_chembalance.js` (`chemBalance`, ~20,560 lines — a flagship "20K" tool).
Tabs: Balance (interactive coefficient practice), Reaction Types, Stoichiometry (molar-mass +
gram/mole converter), Molecular (ball-and-stick), Lab Safety (GHS), plus a periodic table.

## Headline

**The chemistry is correct — all 12 balance presets, the balance-checker logic, the molar-mass
parser, and the molecular-geometry data check out.** The one real defect was the formula parser
silently dropping the hydrate-dot multiplier (every hydrate's molar mass came out badly wrong);
now fixed and locked with tests.

## What's verified correct

- **Balance practice = a checker, not a solver.** The student sets coefficients; the tool sums
  `perMol[compound]·coeff[compound]` per side and reports balanced when every element's left
  count equals its right count. Logic is correct, and it sensibly **accepts any atom-conserving
  multiple** (e.g. 4,2,4 for water) while nudging toward lowest whole numbers — a thoughtful fix
  noted in-code.
- **All 12 balance presets** (`:126`–137) checked by hand — every `atoms` array matches its
  formulas and every `target` coefficient set balances: water 2,1,2; iron-oxide 4,3,2; methane
  1,2,1,2; photosynthesis 6,6,1,6; thermite 2,1,1,2; ethanol 1,3,2,3; glucose 1,6,6,6; etc.
- **`parseFormula`** (`:216`): stack-based, handles nested parentheses (Ca(OH)₂ → Ca 1, O 2, H 2),
  Unicode subscripts, and multi-letter symbols. Atomic masses in `ELEMENTS` are accurate
  (H 1.008, O 15.999, Cu 63.546, …).
- **Molecular-geometry data** (`:256`+): water bent 104.5° polar, CO₂ linear 180° nonpolar, CH₄
  tetrahedral 109.5°, NH₃ trigonal-pyramidal 107° polar, HCl linear polar — all standard VSEPR.

## Fix applied — hydrate molar mass

`parseFormula` skipped any unrecognised character, so the hydrate dot **and** its multiplier
digit were both dropped: `CuSO₄·5H₂O` parsed as `CuSO₄·H₂O` (one water) → **177.622 g/mol**
instead of the correct **249.682**. Hydrates are a standard AP-Chem topic and the molar-mass tab
takes arbitrary user input, so this was reachable. Added a hydrate-dot branch that reads the
multiplier, parses the remainder, and folds it in ×count — handling both `·` (U+00B7) and `.`
separators, and chained dots via recursion. Blast radius is just the molar-mass calculator
(parseFormula's only caller).

## Tests
`tests/chem_balance_science.test.js` (5): renders the Stoichiometry tab and pins molar masses —
H₂O 18.015, NaCl 58.443, **Ca(OH)₂ 74.092** (nested parens), and **CuSO₄·5H₂O 249.682** (the
hydrate fix, both `·` and `.` forms) — locking the parser students depend on.

## Notes / not done
- The hydrate fix assumes an integer multiplier directly after the dot (the standard notation).
- A render-level lock for the balance presets (set each `target`, assert "Balanced!") would add
  defence-in-depth for future equation additions, but the 12 current presets are verified by hand.
