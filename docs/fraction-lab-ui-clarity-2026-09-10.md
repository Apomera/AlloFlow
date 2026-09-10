# Fraction Lab UI clarity

Fraction Lab now starts with four common activities in each learner focus. **Show all activities** exposes the full list. All 31 activities and their nested resources remain available. Teacher mode keeps its five resource groups visible.

The selected activity stays visible when shortening the list or restoring saved work. Existing mode and activity IDs are unchanged. The disclosure only changes presentation state; operands, incomplete inputs, quiz state, and scores remain intact.

Labels now explain their destinations: CRA becomes **Build, draw & write**, Explorers becomes **Calculator & patterns**, and My Account becomes **Goals & progress**. Guidance is specific to each activity; unrelated screens no longer inherit the Build a fraction introduction. Scores appear after practice begins with a descriptive label. The optional learning path remains below the workspace beside the existing support tools.

Navigation has larger targets, wrapping labels, visible selection and keyboard focus, and explicit colors for all three themes. Number shortcuts 1–6 now switch both mode and activity. Editing fields and modified browser shortcuts are excluded.

## Verification

- 98 tests passed across seven focused suites, including six new interaction tests covering all activities, disclosure, saved state, keyboard navigation, guidance, and the learning path.
- Twelve browser states passed: Build, expanded activities, Operations, and Teacher in default, dark, and high-contrast themes. Each was checked at 1120, 375, and 320 px with no horizontal overflow.
- Automated accessibility checks found no violations in the changed navigation and guidance. Expanded text spacing and keyboard flows passed. Default desktop/phone and dark phone screenshots were visually inspected; high-contrast coverage was automated.
- Syntax, scoped whitespace, all 26 new English label/fallback pairs, and source/public byte parity passed. New translations were not authored.

These are local component checks using the actual tool and application styles. No deployment or commit was made. Other math tools were reviewed for context but not modified.

The local preview, screenshots, and browser results are in `scratch/fraction-ui-clarity-2026-09-10/`. Reproduce the captures with `node scratch/fraction-ui-clarity-2026-09-10/preview.cjs after` and the browser checks with `node scratch/fraction-ui-clarity-2026-09-10/verify-browser.cjs`.
