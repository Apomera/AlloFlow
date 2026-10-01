# Galaxy Explorer: connected investigations

## What changed

### Galaxy and Star Life

- A selected spectral class now links directly to Star Life and Metallicity. The links carry an explicitly labeled illustrative mass, using the same OBAFGKM examples as the existing classification controls.
- Star Life has Previous and Next stage buttons beside the animated scene. The controls follow the selected mass's lifecycle branch and disable at its endpoints. The current stage and position in the path are announced in a status region.
- Cosmic time-lapse uses native button activation, so Enter, Space, and pointer clicks operate the same control. Its timer stops when another mode replaces the galaxy view.

### Metallicity

- Logged combinations can be restored, carrying their metallicity, mass, and age back into the controls while preserving the log, hypothesis, and explanation.
- Population names are readable labels. Existing recorded classifications are preserved; records without a recognized classification use their metallicity to resolve a label.
- Desktop tables keep the Restore column visible. Phones use cards with the population, all three measurements, and a full-width Restore button.
- An investigation can open Star Life at the current mass and return to its saved chemistry work.
- Malformed saved slider values receive usable defaults, numeric values stay within each control's limits, and malformed log rows cannot crash the panel.

### Quiz

- Visiting Quiz resumes its current question, answer feedback, score, or completed result. Clicking its active mode button also preserves progress.
- The built-in bank is immediately available. Restart resets progress within the current bank; Load new questions is an explicit action when the host provides the generation service.
- Loading retains the current bank and progress. Keep current quiz cancels the request. Failure, invalid data, and a 25-second deadline return to the existing quiz with a clear status message.
- Replies from cancelled, replaced, timed-out, or unmounted requests cannot overwrite current work. Switching modes cancels an active request. A persisted loading flag cannot leave a reopened quiz stuck on a spinner.

## Verification

- 435 passing checks across the full Galaxy suite, covering scenes, lifecycle, morphology, selection, accessibility, Real Sky, physics, optics, and the connected workflows.
- Browser checks exercise star-to-life, star-to-chemistry, and chemistry-to-life links with mass and note preservation.
- All five stellar mass branches reach their expected endpoints; the displayed stage stays linked to the animated canvas state.
- Chemistry Restore is exercised on desktop and phone layouts, including saved notes and logs.
- Quiz checks cover resuming answers and results, restarting, cancellation, invalid responses, stale and duplicate replies, deadlines, thrown and rejected service calls, unmounting, and restored loading flags. Service replies and failures are simulated.
- Desktop and phone screenshots reviewed at 1440, 390, and 320 px, plus a right-to-left Star Life layout. Controls and Restore actions stay within the visible viewport.
- Source and desktop mirror match. Seventeen new labels and two revised loading messages match both Galaxy registries and the flat English catalog.
- Regression expectations now use native click activation and current shortcut syntax. Galaxy translation checks compare its namespace, so unrelated tool strings do not determine Galaxy's results.

This pass connects the existing astronomy models to navigation and saved-work controls. Real Sky's notebook, viewport, recovery, and sharing regressions are included in the suite.

Changes remain uncommitted.

## Try it

Open the [local preview](http://127.0.0.1:53693/). Select a star to use the new investigation links. In Star Life, step through the path beside the scene. In Metallicity, log two combinations and restore one. In Quiz, answer a question, visit another mode, then return to resume.

## Evidence

- [Full Galaxy suite](galaxy-tests.json)
- [Browser workflow checks](browser-results.json)
- [Validation summary](validation-summary.json)
- [Selected star links](selected-star-1440.png)
- [Phone star links](star-link-320.png)
- [Phone stage controls](star-stages-320.png)
- [Phone chemistry log](chemistry-320.png)
- [Phone quiz](quiz-320.png)
- [Right-to-left stage controls](star-stages-rtl-320.png)
