# Enlarged comparison diagrams

The five circulation diagrams and four gas-exchange diagrams now offer an **Enlarge diagram** action. The reader keeps the schematic, its plain-language description, and its model limits together.

## Reading and navigation

- **Fit diagram** initially shows the full schematic within the available width and height. This keeps features such as both countercurrent-flow arrows visible together.
- Zoom in/out provides 100–300% relative drawing size. A focusable scroll region supports touch scrolling and keyboard arrow panning at larger sizes.
- The responsive dialog keeps Close diagram in a sticky header. Escape closes it, Tab and Shift+Tab wrap within its controls, and closing returns focus to the original card without scrolling away.
- Reopening begins at the fitted view. Native opening failure produces an announced text description. Removing the comparison panel also removes the modal, allowing the surrounding lab to be used again.
- Zoom and dialog state remain local to the reader. They do not alter specimen zoom, notes, confidence, observed structures, or assessment scores.
- Existing SVG artwork and scientific descriptions are reused. The reader explicitly distinguishes drawing enlargement from specimen measurements and observation credit.

## Verification

- 149 reference-workbench tests passed, including nine named reader entry points, unchanged schematic counts, and no reader for unmapped comparisons.
- Five targeted Chromium scenarios cover zoom limits, both directions of focus wrapping, Escape/Close focus return, the entire diagram fitting its viewport, phone panning, modal removal, unavailable-native-dialog fallback, and the existing comparison-to-note handoff.
- At 320 pixels, the dialog stays within the viewport; only the intended diagram region scrolls horizontally. The reader's axe audit found no WCAG A/AA violations in the checked scope.
- Desktop and phone screenshots were visually reviewed. Visual QA caught and corrected a default-fit issue that initially hid the bottom flow arrow. Browser QA caught and corrected focus wrapping from the scroll region.
- JavaScript syntax, canonical/desktop byte parity, and scoped whitespace checks passed.

New interface text uses translation keys with English fallbacks. Physical-device and screen-reader user testing remain follow-up work. This pass does not change anatomical claims or provide measured specimen magnification.

## Artifacts

- [Reference-workbench regression results](diagram-reader-focused.log)
- [Final browser results](diagram-reader-fit-browser.log)
- [Desktop reader](diagram-reader-desktop.png)
- [Phone enlarged diagram](diagram-reader-mobile.png)
- [Phone explanation and model limits](diagram-reader-mobile-text.png)
