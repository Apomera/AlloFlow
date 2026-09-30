# Water Cycle visual design

This pass brings the surrounding interface closer to the recent experiment and decision panels.

## Navigation and Explore

- A consistent set of decorative line icons identifies the five modes. Text labels and accessible names remain the primary navigation cues.
- The selected mode has a filled background and an underline. Keyboard focus remains distinct from selection.
- On narrow screens, the five choices use two columns with the last choice spanning the row. Labels can wrap without being clipped.
- Explore uses pale paper surfaces, dark teal text, and forest accents. The map has a quieter frame so its water paths and labels remain prominent.
- View switches, stage panels, learning drawers, and section navigation share spacing, borders, and control shapes.
- Dark, high-contrast, forced-color, and reduced-motion settings retain explicit treatments. The decorative animation badge is hidden for reduced motion.

## Landscape

The 2D material palette uses softer greens, muted earth, teal water, and cooler distant land. Geometry, process paths, scientific labels, climate responses, and model calculations remain intact. On narrow screens, label placement searches enough of the canvas to clear the wrapped corner overlays.

## Storm Lab and Steward

Storm Lab uses larger labels, clearer control groups, and the paper/teal palette of its experiment workspace. Steward uses forest tones and consistent cards around its campaign choices, score displays, and decision previews.

The changes use local CSS, SVG icons, and the existing canvas drawing code. No external font or image service is required.

## Review

The browser review scripts capture representative desktop and narrow layouts, exercise navigation and focus, and inspect accessible contrast. Results and screenshots are stored alongside each script's report output. Functional regressions cover the existing scientific views and controls.

Verification from the first visual pass:

- 72 layout and interaction checks passed across desktop and 390px/320px layouts, including keyboard mode switching and visible focus.
- 51 scoped accessibility audits covered shared navigation, Explore controls, and additional high-contrast surfaces. Two Steward findings were corrected and passed targeted follow-up audits at 1280px and 320px.
- Storm Lab and Steward passed 18 light/dark browser audits, plus the two high-contrast follow-ups, with no horizontal overflow or browser errors.
- Forced-color selection was reviewed visually and corrected with system colors; the follow-up navigation audit passed. The corrected 320px map was also reviewed in light and dark themes.
- All 19 final host-surface and label-placement regression tests passed. The existing terrain, readable-ink, and 2D process/visual checks also passed during the visual work.
- All seven full-screen tests passed on the final isolated run. The teardown deadline now allows Playwright's built-in shutdown fallback to finish on Windows; the original 30-second deadline expired just as that fallback began.
- JavaScript syntax and whitespace checks passed. The source and desktop public runtime copies have identical SHA-256 hashes.

See [shared visual review](../reports/watercycle-visual-system/README.md) and [Storm Lab/Steward review](../reports/watercycle-mode-visual-polish/README.md) for screenshots and scope. The preview can be served with `node dev-tools/watercycle_visual_system_qa.cjs --serve` at `http://127.0.0.1:8770/`.

The continuation extends the palette into Be the Water, Water Worlds, and Explore's experiment workspace. Climate values and explanations are larger, ground choices have clearer selected states, and prediction choices use generous targets. Baseline and current comparison bars occupy separate rows so both remain visible. The climate readout describes the selected scenario instead of diagnosing fog, snow, or rainbows from inputs that do not establish those conditions.

The pilot's route cards and notebook use quieter surfaces, larger evidence text, and controls that wrap on phones. Water Worlds groups its scene lenses, adds decorative icons, shows a check on selected ground cover, and arranges readings as rows on the smallest screens. See [Explore follow-up](../reports/watercycle-learning-polish/README.md), [pilot review](../reports/watercycle-pilot-visual-finish/README.md), and [Water Worlds review](../reports/watercycle-worlds-visual-finish/README.md).

## Explain and test the evidence

Explore now shows which inputs differ from the baseline and identifies comparisons with one changed input or several. For a preset with several changes, learners can choose one input and **Keep only this change**. The other seven inputs return to their baseline values, while saved observations remain available. The resulting comparison stays visible and receives keyboard focus.

The evidence notebook identifies a comparison by both its baseline and current inputs. The same current temperature against two different baselines can therefore produce two separate records. Saving stops at four observations instead of replacing the oldest one. Learners can remove entries, undo multiple removals in their original order, or download their notebook. A new save ends the pending undo history.

Each record keeps its inputs, signed changes, model readings, and original claim labels. **Explain this observation** adds writing about the explanation, supporting evidence, and the next test. Changing the live controls does not rewrite these saved values or move the writing to another comparison. Older records retain their original evidence; missing inputs and readings are identified rather than filled in.

Claim checks use each reading independently. A decrease can support **Evaporation changes**, and a crossing below zero supports the explicitly named temperature claim. Several effects can be supported together. Runoff and infiltration use independent teaching indices; their scores are not percentages of a measured water budget.

Water Worlds adds **Account for this change** to a pair of saved observations. For the same ground cell and storm setup, learners choose surface water, soil water, or delayed storage and inspect the modeled inputs and outputs between the earlier and later moment. The account balances water before, water entering, water leaving, and water after. It reconstructs the existing solver from saved conditions, so later changes to the live valley do not change the account. Different places or storm setups explain why one local account cannot establish the cause of their difference.

The account includes process prompts and a disclosure explaining numerical reconstruction and rounding. The solver equations are unchanged. See [Water Worlds accounting review](../reports/water-worlds-observation-budget/README.md) for model tests, browser checks, and representative captures.

See [Explore evidence review](../reports/watercycle-explore-notebook/README.md) for notebook, claim, fair-test, and keyboard verification.

## Compare processes

An optional **Compare processes** disclosure adds relational reasoning beside the process story. Learners choose two named processes independently of the live scene, then consider which requires a physical state change or absorbs latent heat to make vapor. Suggested pairs connect evaporation with transpiration, condensation with precipitation, and infiltration with collection.

The comparison uses readable state diagrams, source and destination descriptions, and process drivers. Checking a choice reveals latent-heat evidence and a description of each process. Feedback stays separate from the live scene summary. It does not award points or change the active journey, stage progress, climate, or scenario evidence.

Writing is retained for each ordered process pair, so changing questions or exploring another pair preserves the explanation. A changed pair, question, or answer clears old feedback. Malformed restored comparisons also clear stale answers while retaining valid writing.

The cards explain the scope of each named process. Condensation is presented as vapor becoming liquid droplets, with direct vapor-to-ice identified as deposition. Precipitation does not require a state change during the fall; infiltration into soil does not guarantee aquifer recharge. These descriptions use the existing matter and energy traces and make no water-volume or timing calculation.

See [process comparison review](../reports/watercycle-process-compare/README.md) for behavioral, browser, and visual verification.

## Plan the next experiment

The existing next-investigation panel now connects a chosen input to the readings that can show its modeled effect. Learners can select sunlight, temperature, rainfall intensity, soil saturation, soil permeability, slope, or land cover. Sunlight and temperature point to the evaporation index; land inputs point to runoff tendency and infiltration opportunity. Wind remains available for observing scene transport, while this quantitative bridge uses inputs that affect the saved comparison readings.

The action names its input and destination. It switches to the conditions workspace, opens the appropriate lab, and focuses the chosen slider or selected categorical option. **Change the weather** uses the same handoff to reach Sunlight from any Explore section. Reduced motion uses an immediate scroll. Navigation preserves the live inputs, paused journey, saved evidence, and process-comparison writing.

The next-test panel distinguishes missing, incomplete, unchanged, one-input, and several-input baselines. An absent baseline is explicitly saved by the action. Existing baselines remain intact. A comparison with several changed inputs points to the existing **Keep only this change** action. Guidance asks learners to compare signed readings and explains that rounding or model limits can leave a small change invisible. It makes no claim about measured water volume, groundwater recharge, cloud formation, or independent plant water use.

See [next-experiment review](../reports/watercycle-next-experiment/README.md) for navigation, preservation, accessibility, and visual checks.

## Read the simulation clearly

The 2D evidence captions now wrap at a readable size, stay within the canvas, and clear the process title and weather controls. Rounded, opaque backings give the text a consistent ground. A displaced caption uses a plain leader to its process; arrowheads continue to indicate movement or heat transfer. Process labels reserve space after the evidence captions have been placed.

The existing canvas guide explains the parcel marker, direction arrows, and heat cues. It names latent heat absorption or release and describes transfers with no required phase change. Vapor guidance follows the current physical-state trace, and the guide explains that markers are enlarged and the scene is not to scale. Root uptake shows liquid movement into xylem; its evidence path does not extend into a leaf-to-vapor step.

Restored paused maps paint an initial frame and stay paused. Control changes repaint the scene without advancing a paused parcel. Returning to a visible tab paints the paused view, and switching from a paused map to the 3D journey restarts its state driver. Both views retain their existing keyboard and journey controls.

See [diagram clarity review](../reports/watercycle-diagram-clarity/README.md) for matched phone captures, rendered-label checks, guide interpretation, and playback verification.
