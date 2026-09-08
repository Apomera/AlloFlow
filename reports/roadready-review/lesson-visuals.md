# Road Ready: lesson selection and pre-drive visuals

The lesson picker now groups all 14 scenarios into foundations, maneuvers, and changing conditions. Cards use readable difficulty labels, posted-limit signs, larger descriptions, a specific practice goal, and minimum practice time. Goals and times come from the existing mission definitions.

The vehicle selector has larger controls, a visible selected state, and `aria-pressed` for assistive technology. Vehicle science sits in an expandable section, keeping the driving choice prominent. The briefing repeats the selected vehicle and provides a Change vehicle action, a Choose / Prepare / Practice indicator, practice distance, conditions, and time. At narrow phone widths, the vehicle action occupies its own row.

Existing scenario IDs, start actions, Ride-Along eligibility, rule guidance, mission completion, and vehicle physics are preserved. The canonical tool and its active desktop mirror contain identical bytes. Changes remain local; this pass did not commit or deploy.

## Verification

- 201 existing tests passed across Road Ready view smoke checks, driving refinements, and rules.
- Chromium checked all 14 lesson cards, selecting a different vehicle, returning to selection from the briefing, keyboard activation, and opening Residential Street and Highway Merge briefings.
- No horizontal overflow at 390 px or 320 px; desktop, narrow-phone, and light-theme screenshots captured. Desktop selection and desktop/320 px briefings were visually inspected; the final phone spacing adjustment was rechecked in Chromium.
- JavaScript syntax, scoped `git diff --check`, and active mirror parity verified.

## Screenshots

- [Desktop lesson picker](lessons-desktop.png)
- [Desktop briefing](briefing-refined-desktop.png)
- [390 px briefing](briefing-refined-390.png)
- [320 px briefing](briefing-refined-320.png)
- [320 px lesson picker](lessons-mobile-320.png)
- [Light-theme 320 px briefing](briefing-refined-light-320.png)
