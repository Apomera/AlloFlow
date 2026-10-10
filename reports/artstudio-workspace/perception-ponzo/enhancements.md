# Perception Lab: Ponzo perspective expansion

Ponzo perspective is the seventh experiment in Perception Lab. Two horizontal orange bars retain equal widths while learners adjust converging perspective rails or the upper bar's vertical position. The experiment works in the main and focused workspaces, surroundings comparisons, inquiry controls, notebook, and native exports.

## Drawing and controls

- Both bars have width 240 and height 12 drawing units, with identical horizontal endpoints at 280 and 520. The lower bar stays at y 350; the upper bar moves from y 150 to 260 (default 175).
- Rail convergence ranges from 0% to 100% (default 90%). At 0%, rails are parallel. Larger values narrow their upper opening. The opening is 600−4.6×convergence drawing units; the most converged opening is 140 units.
- Complete painted rail strokes remain clear of the bar rectangle corners throughout the control range. A review caught and corrected a small overlap in an earlier candidate.
- Removing the surroundings removes only the two rails. Revealing measurements adds aligned endpoint guides and 240-unit labels.
- The controls and explanations describe drawn values and observations without promising a particular perceptual response.

## Learning workflow

Learners can record Upper, Lower, Same, or Unsure; save or pin the drawing; reopen observations; and import or export notebooks using the existing schema. **Try one change** supports rail convergence, upper bar position, and surroundings. Its fixed starting view, chosen-setting navigation, both restore actions, and printable inquiry report work with the new experiment. The report preserves both SVG drawings, full literal notes, settings, and measurement-guide differences. Native SVG and 2400×1440 PNG exports are also available.

Experiment cards now use an adaptive desktop grid, and both experiment selectors include all seven choices. English/runtime catalogs contain 504 matching strings, including 17 new Ponzo strings. Source and desktop copies match. The existing three matching activities retain their behavior.

## Verification

- **34 Chromium check groups passed**, with no runtime errors, axe violations, external report resource requests, or horizontal overflow in the tested views.
- Covered 10 viewport/font combinations, 30 native chosen-control visibility checks, four report layouts, and four themes; tested controls, surroundings, guide geometry, inquiry restores, save/pin/notebook filtering, focused browsing wrap, and native downloads.
- Reviewed desktop, phone and short focused windows at 200% text, dark/forced-dark views, the native PNG, standalone HTML report, and print preview.
- **43 standalone engine checks passed** for malformed/clamped values, exact target geometry, rail stroke clearance across 20 control combinations, guide/context invariants, inquiry restores, immutable report plans, and notebook import/JSON/deduplication. These use Node built-in assertions without Vitest workers.
- **72 legacy scene/model combinations passed** against the previous source; all original six experiment metadata objects and matching definitions remain identical.
- Compilation, source/desktop SHA256 parity, and 504-key catalog parity passed.
- **Unit suite execution remains blocked by the host:** Vitest forks and threads workers timed out before responding. No unit assertions ran. The new 65-case suite and updated seven-experiment/navigation suites are saved; runner diagnostics are included. These cases cover normalization, exact geometry, full rail stroke clearance, notebook/import, inquiry restores, focus, and exports. Browser and standalone engine checks above ran successfully; they do not substitute for the blocked unit suites.

Source/desktop SHA256: `67f0099c534e98ea6f1a916d8966b61ac19980bcdcaa21d7f30b37f30ec4c5f8`.

## Scientific basis

The classical Ponzo arrangement places equal horizontal targets between converging lines. Its apparent-size effects depend on context and viewing conditions; the implementation therefore asks for observations and preserves measured geometry. See [Yildiz et al., PLOS ONE (2019)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0223583) and [Michael Bach's size-constancy demonstration](https://michaelbach.de/ot/sze-sizeConstancy/), which is linked from the experiment.

## Previews and evidence

- [Desktop experiment](browser/ponzo-convergence-90.png)
- [Phone focused drawing at 200% text](browser/focused-drawing-390-32.png)
- [Short focused window at 200% text](browser/focused-drawing-760-32.png)
- [Standalone inquiry report](browser/report-1440-16.png)
- [Verification metadata](verification.json)
- [Legacy/source/catalog validation](validation.json)
- [Standalone engine checks](engine-checks.json) and [runner](verify-ponzo-pure.cjs)

All changes remain unstaged and uncommitted.
