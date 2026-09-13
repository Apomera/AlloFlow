# Guided preset validation

The two corrected presets passed 18 production-reading unit tests and 43 real-browser checks (35 lesson/measurement/activity checks, followed by 8 final mode-consistency checks). Both browser runs used real React and Three/WebGL in the local host harness. No page or console errors occurred.

Every run entered each preset through the native Home → Learn → lesson selector → Start this lesson flow. No test opened a sandbox and then replaced its engine lesson. The final pass confirmed that the selected lesson ID, live world title and `data-geometry-mode="lesson"` agreed, with no sandbox dock present.

The former “Free Build / Sandbox studio” control was a navigation button, but its wording could be mistaken for a current-mode label. Its final text is “Open Free Build / Create in a sandbox.” Opening its options dialog leaves the current lesson and geometry intact; cancelling retains lesson mode. Both final captures show the clarified action wording and integrated guide/compass graphics.

## Verified results

- Area loads 625 independent ground cells and 244 protected teaching blocks. Its three measured models contain 72, 72 and 100 cubes, with full exposed surface areas of 108, 114 and 130 square units. The striped model contains 50 sand and 50 wood cubes.
- Composite loads 775 independent ground cells and 188 protected teaching blocks. The T contains 68 cubes (48 blue, 20 gold), the pyramid 56 and the U 64. Their bounding volumes are 168, 108 and 144 respectively.
- All nine optional activity travel points arrive at their exact authored ground coordinates with clear body space. Travel and journal review preserve construction and quiz scores.
- The hinted composite student step was actually built in the isolated browser test world and measured as 50 occupied cubic units in a 60-unit bounding box. The protected T remained 68.
- Original assessment counts remain three NPC quizzes/eight steps for Area and four quizzes/ten steps for Composite.

## Evidence

- `guided-preset-tests.json`: 18 unit tests passed.
- `guided-presets-browser.json`: 35 real-browser checks passed; includes exact live measurements and travel coordinates.
- `guided-presets-final.json`: 8 final native-flow mode checks passed; includes hashes of the integrated canonical files.
- `area-surface-final.png`: final overview, inspected visually.
- `composite-volume-final.png`: final two-color T, stepped pyramid and U view, inspected visually.
- `areaSurface-build-activity.png` and `compositeVolume-build-activity.png`: learner build guidance and self-review UI.

The rendered ground, colored models, shorter gold stem, alternating layers, connecting path and empty build pad were visually inspected. These checks concern the local canonical app; they do not assert that a separate shared Gemini Canvas deployment has updated.
