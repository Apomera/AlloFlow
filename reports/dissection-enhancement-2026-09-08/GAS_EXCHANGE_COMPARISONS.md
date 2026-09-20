# Gas exchange: visual explanation, accuracy, and focused comparisons

Date: September 19, 2026

## Result

The gas-exchange comparison now has four labeled concept diagrams and a consistent Medium / Surface / Ventilation profile. A new **Compare with** selector keeps the current specimen beside one chosen reference or restores the full set. This reduces the number of cards students need to read at once and applies to other comparison groups with more than two specimens.

## Accuracy changes

- Adult frog lungs are described as internally folded, with compartments called faveoli, alongside moist-skin gas exchange and buccal pumping. The previous smooth-sac/no-alveoli shorthand was removed.
- The fetal-pig lung card now explicitly separates placental exchange before birth from pulmonary exchange after birth. Its diagram shows the life-stage distinction and does not portray fetal air breathing.
- The perch gill card describes lamellae, countercurrent flow, and a maintained oxygen gradient. The unsupported fixed 80% extraction claim and the unqualified comparison with lung efficiency were removed.
- The crayfish card identifies scaphognathites (mouthpart gill bailers) as the drivers of water ventilation, instead of implying walking legs are the main pump. Water and hemolymph are distinguished.

## Visuals and learning flow

- Frog: a lung-wall fold concept with labeled air delivery; skin and microscopic barriers are explicitly omitted from the drawing.
- Fetal pig: before/after birth panels contrasting placental exchange with air reaching the lungs.
- Perch: labeled, opposite water and blood directions at an illustrative lamellar surface; the fluids remain separated.
- Crayfish: a feathery gill-surface concept with labeled water movement; hemolymph flow is not drawn.
- Every diagram has an accessible description and a visible limit caption. These are conceptual graphics, not anatomical reconstructions or histology.
- The comparison prompt asks for one similarity, one difference, and a distinction between observed evidence and reference knowledge.
- Focus selection is scoped to the current specimen and comparison group. Stale, same-specimen, or unavailable partners fall back to all references. Changing specimens or resetting clears the transient preference.
- Changing comparison focus does not change the active specimen/layer, observation credit, notes, confidence, or scores. The existing note-writing action retains and focuses the student's note.

## Sources checked

- [OpenStax: systems of gas exchange](https://openstax.org/books/biology/pages/39-1-systems-of-gas-exchange)
- [Primary morphology study: anuran lungs and skin](https://pubmed.ncbi.nlm.nih.gov/32651399/) — describes the folded/faveolar exchange architecture in the studied anurans; no species-specific microscopic measurement is transferred into the simulation.
- [Primary study: prenatal and neonatal pig lungs](https://pmc.ncbi.nlm.nih.gov/articles/PMC6162397/) — supports the prenatal/postnatal distinction.
- [Primary study: crayfish respiration and water oxygenation](https://pubmed.ncbi.nlm.nih.gov/17899/) — identifies scaphognathite beating and water convection.

Links are available in the gas-exchange panel. The graphics were authored as code; source artwork was not copied.

## Verification

- 146 focused reference-workbench tests passed, including new content, scope fallback, and assessment guards.
- Three targeted Chromium scenarios passed: existing comparison/note handoff, focused gas comparison, and narrow-phone gas comparison. After the final pig profile wording refinement, both gas-exchange scenarios passed again.
- The browser checks cover keyboard focus, unchanged notes/confidence/exploration, comparison-group fallback, SVG label bounds, no horizontal overflow at 320 pixels, and zero axe violations within the audited comparison panel (WCAG A/AA tags).
- Desktop and phone screenshots were visually reviewed, including perch and crayfish cards. Canonical and desktop module copies match; JavaScript syntax checks passed.
- The full 12-scenario run was stopped after two browser-context teardown timeouts on a heavily contended host. Targeted reruns used one worker, a 300-second test budget, and disabled video/trace recording. No full-suite pass is claimed for this revision.
- Automated Chromium and visual checks do not replace physical-device or assistive-technology testing. New explanatory copy is English; localization remains follow-up work.

## Artifacts

- [Focused tests](gas-comparison-focused.log)
- [Targeted browser tests](gas-comparison-targeted-browser.log)
- [Final wording/browser verification](gas-comparison-profile-browser.log)
- [Full-run teardown diagnostics](gas-comparison-browser-final.log)
- [Focused desktop comparison](gas-comparison-focused-desktop.png)
- [Focused phone comparison](gas-comparison-focused-mobile.png)
- [Perch diagram on phone](gas-perch-mobile.png)
- [Crayfish diagram on phone](gas-crayfish-mobile.png)
