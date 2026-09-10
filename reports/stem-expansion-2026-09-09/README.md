# Native STEM learning refinements

Implemented Algebra Solver, OpenBIM Companion, Taxonomy Explorer, Graphing Calculator, and Function Grapher improvements. Sim Shelf, Circuit Shelf, and Molecule Shelf were excluded.

## What changed

- **Algebra Solver:** exact local solving for linear equations in x, including rational coefficients, brackets, identities, and contradictions. A next-equation checker compares solution sets and rejects information-destroying transformations. Local practice supplies 108 level/variant combinations with exact grading. Solving and practice feed the existing achievements. AI answers are distinguished from exact local results: substitution checks establish neither the validity of every explanatory step nor completeness of the root list. Verification is retained with history and cleared when the input changes.
- **OpenBIM:** a dimensioned rectangular design study checks both area and geometric fit against explicit classroom targets. Students inspect planned storeys/spaces, record reasoning, save a comparison baseline, and compare revised AlloFlow recipes by dimensions, inventory, spatial plan, and linked proxy geometry. Study dimensions and reasoning survive recipe export/import; imported approval is cleared.
- **Taxonomy Explorer:** a branching observation key for six teaching examples includes an uncertain path. Students can also write their own unclassified field observations, revisit earlier entries, preserve revision reasoning, and export the journal as Markdown. The journal retains the most recent 60 observations in project state.
- **Graphing Calculator:** zero and intersection searches now collect strict residual evidence, detect touching-root candidates, reject poles/jumps, and avoid enumerating hundreds of isolated candidates when every sampled value is zero. Results disclose the interval, grid size, search method, residual threshold, and numerical limitations. Changing functions, parameters, or x bounds invalidates the analysis and its markers.
- **Function Grapher:** a prediction-first improper-integral activity compares 1/√x, 1/x, and 1/x² over [ε, 1]. Students record cutoff trials, compare antiderivative limits, and explain convergence versus divergence. The last 18 trials and reflection stay in project state. Root feedback now includes touching the x-axis.

## Verification

- 195 distinct regression tests passed across 11 suites. The final focused run replaces the earlier versions of the changed test suites; see verification.json.
- 15 real-browser workflows passed: five tools in light, dark, and high-contrast themes. Desktop and phone screenshots are included. At 320 pixels, all final checked pages fit the viewport; the new panels had no detected WCAG A/AA violations.
- Browser checks exercised local solving and step checking; OpenBIM baseline/dimension changes; taxonomy journaling, revisions and export; touching-root and intersection analysis; and cutoff-trial/limit reasoning.
- The browser pass found and corrected an algebra step-label overflow and integral-table dark-mode contrast/keyboard-scrolling defects. The final algebra achievement integration is additionally covered by the focused interaction tests.
- All five source files parse, and the five desktop-served copies are byte-identical. Source hashes are recorded in verification.json.

## Boundaries

- Exact local algebra currently covers linear equations in x. Other solve modes retain their AI workflows; live provider responses were not exercised in this pass.
- The OpenBIM preview is an explicit design study, not a native IFC editor or a reconstructed spatial layout. Its dimensions do not create IFC geometry. Native IFC authoring still continues in Bonsai.
- Photo ID remains disabled pending the existing expert-review requirement. Teaching-key outputs do not identify wild organisms.
- Numerical graph candidates are evidence within a finite search window, not a proof of completeness or continuity.
- New controls and explanations use English copy. Localized versions were not produced in this pass.
- Project state must be saved through AlloFlow to retain journals/studies across sessions. No deployment or commit was performed.

## Evidence

- [Combined verification](verification.json)
- [Final focused tests](final-focused-results.json)
- [Browser results](browser-results.json)
- [Browser workflow runner](browser-qa.cjs)
- [Algebra phone](algebracas-light-phone.png)
- [OpenBIM phone](openbim-light-phone.png)
- [Taxonomy phone](organismid-light-phone.png)
- [Graph analysis phone](graphcalc-light-phone.png)
- [Improper integrals phone](funcgrapher-light-phone.png)
