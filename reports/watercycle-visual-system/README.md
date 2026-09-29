# Water Cycle visual system review

## Result

The shared mode navigation and Explore surfaces passed 72 layout and interaction checks. The run covered Explore at 1280, 390, and 320 pixels in light, dark, and high-contrast themes; shared navigation in Storm Lab, Steward, and Water Worlds; pointer, Enter, and Space mode switching; visible keyboard focus; and exactly one selected mode. Every checked navigation button was at least 44 pixels tall, and no checked surface caused horizontal page overflow.

The initial 51 scoped axe audits found two failing scopes: Steward setup in high contrast at 1280 and 320 pixels. Its six component titles and Difficulty label used light foreground colors on white cards. The focused correction passed both follow-up audits in `../watercycle-mode-visual-polish/results-contrast.json`.

Visual inspection also caught a forced-colors issue that axe did not detect: white text backplates hid selected navigation/view labels and the investigation action. Those controls now preserve the user's system Highlight and HighlightText colors together, with system-colored focus outlines. The follow-up screenshot confirms the labels are readable; its navigation audit had zero violations and no browser JavaScript errors.

The mobile Condensation-label follow-up reserved space for wrapped canvas overlays. Its six placement checks passed, and separate light/dark screenshots verified all six process labels at a 320-pixel viewport with a 272-pixel canvas. The final combined host-surface and label regression run passed 19 tests; syntax and diff checks were clean.

All seven full-screen tests also passed in the final isolated run (`../watercycle-fullscreen-visual-check.json`). The cleanup hook now allows Playwright's own shutdown fallback to complete on Windows, avoiding the previous collision between two 30-second deadlines.

## Evidence

- `final/results.json`: 72 successful checks, 51 initial scoped audits, and no browser JavaScript errors.
- `final/explore-light-1280.png` and `final/explore-dark-1280.png`: desktop scene and shared UI.
- `final/explore-light-320.png` and `final/explore-dark-320.png`: narrow layout before the subsequent Condensation-label reservation correction.
- `final/navigation-keyboard-focus.png`: keyboard focus on a mode button.
- `forced-colors-followup/navigation-forced-colors.png`: corrected system-color selection labels.
- `forced-colors-followup/results.json`: targeted navigation audit. Its file-equality assertion ran before the final desktop copy completed; this is resolved by `forced-colors-followup/integrity-after-sync.json`.
- `../../scratch/explore-palette-review/overlay-fixed-phone320.png` and `../../scratch/explore-palette-review/overlay-fixed-phone320-dark.png`: the separate focused mobile-label follow-up.

At the conclusion of this first visual pass, source and desktop mirror shared SHA-256 `EBA769F57C4F6A33F42D42ECF03B9E338299E333D6C3A886FBF33945465149D1`. Later refinements are recorded in the Explore, pilot, and Water Worlds continuation reports.

The commit retains `final/explore-light-1280.png` and `forced-colors-followup/navigation-forced-colors.png` as representative captures. Other listed screenshots are local generated artifacts that the review scripts can reproduce.

The `baseline` folder is a partial capture made while parallel visual edits were already underway. Some captures timed out and its old Water Worlds selector was corrected afterward. It is not a pristine before-state or final validation evidence. The finished run uses fresh browser documents, paused Explore scenes, and animation-disabled screenshots to avoid stale headless compositor frames.

## Reproduce

```text
node dev-tools/watercycle_visual_system_qa.cjs
node dev-tools/watercycle_visual_system_qa.cjs --forced-only
node dev-tools/watercycle_visual_system_qa.cjs --serve
```

The preview defaults to `http://127.0.0.1:8770/?mode=explore`. Modes are `explore`, `storm`, `steward`, `worlds`, or `pilot`; themes are `light`, `dark`, or `contrast`. `WATER_VISUAL_PORT` overrides the port. Preview requests read the live source, while each regression run keeps the main script fixed for reproducible evidence.

Audits are scoped to the changed navigation and visual surfaces. They are not a claim that every legacy panel in the tool has received a new full-page accessibility review.
