# Diagram and inspector navigation

The selected structure now has a clear caption and a **Read structure** action directly below the diagram. The inspector provides **Back to diagram** alongside **Browse structures**, with explicit keyboard focus and scrolling to the destination.

Canvas keyboard controls now support Home/End to select the first/last structure and Enter/Space to open the explanation. Arrow navigation remains available. Visible guidance is linked to the canvas for assistive technology, and both the canvas and inspector have visible focus outlines.

Tapping empty diagram space preserves the selected structure. **Clear selection** explicitly clears the selection and returns focus to the canvas while retaining exploration, mastery, and recall scores. The empty inspector's membrane action now focuses the explanation it opens.

Validation suite: `playwright.config.cjs` covers animal/plant/bacterial navigation at 1200/320/390px, existing interior recovery, motion preferences, and diagram controls. The new checks cover wraparound navigation, Enter/Space focus transfer, returning to the diagram, empty-space taps, clear-selection history retention, 44px caption controls, and no horizontal overflow.

Validation completed: 9 distinct browser scenarios passed, including all three diagram-navigation checks rerun after the boundary fix. All 26 unit checks passed for hit bounds, existing interior behavior, and illustration geometry. Source syntax, whitespace, and mirror equality checks passed.

The new bounds check fixes an existing issue where the canvas exterior was treated as a membrane/wall target. It retains a small edge tolerance and checks explicit surface structures first.

Visuals: [phone plant diagram](diagram-plant-320.png), [desktop animal diagram](diagram-animal-1200.png), [bacterial diagram](diagram-bacterium-390.png).

Changes remain local. Source and desktop modules are synchronized.
