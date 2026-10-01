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

## Follow the water transfer

The scene guide now puts the current process above a pair of water cards. Each card separates its store from its physical state, with one arrow between the starting and destination cards. This reading order stays the same on phones. A separate heat panel identifies absorption or release; transfers with no required phase change have a quieter treatment. Paused guidance asks learners to trace the water and explains the keyboard resume action.

The 3D lens reports the renderer's actual camera mode. Dragging or using camera adjustment controls enters **Free orbit**; **Follow droplet** or the F key restores **Follow camera**. Pausing the parcel preserves the camera mode. Camera status updates on input and initialization, with detached renderer updates canceled during cleanup.

On phones, the 3D camera dock and route choices sit below the scene. The model keeps at least 380px of height, and its controls keep their large targets. The scene and controls remain in the same fullscreen view; the model grows when space allows, and the view scrolls when the controls need more space.

See [handoff guide review](../reports/watercycle-handoff-guide/README.md) for phone and desktop captures, water-state checks, camera controls, and accessibility verification.

## Show movement and storage in process figures

The comparison cards place **Before** and **After** above larger illustrations, with the physical-state description below. Precipitation shows cloud particles followed by falling liquid and solid particles. Collection shows incoming water followed by a store containing liquid and ice. The accompanying phase and energy descriptions retain their existing scope, including separate freezing and melting processes.

Standalone 3D previews derive their orientation lens from the selected process. An inactive parcel's remembered position no longer labels a different preview. Active scene captions, the camera dock, and view status share the existing human journey names, including **Plant uptake**, **River runoff**, and **Aquifer flow**.

See [process figure review](../reports/watercycle-process-diagrams/README.md) for matched captures, comparison interactions, scene-context checks, and accessibility verification.

## Inspect teaching signals by place

The signal chart now gives its three cues persistent identities: a solid line with circles for energy, a dashed line with squares for surface flow, and a dotted line with diamonds for storage. Phone labels have room to stay readable, and forced colors use system text and strokes.

**Inspect a place** lets learners read the existing scores at Surface, Air, Cloud, Land, or Return. The readout and folded table use the same values as the plotted lines. Following the stage focus tracks the selected process or journey; a replay is explicitly labeled **Replay focus**. Manual inspection keeps a separate stage marker and preserves the learner's conditions, paused parcel, writing, and evidence. Standalone Infiltration correctly focuses Land.

The chart explains that its horizontal categories are places, rather than elapsed time or a required droplet route. Each 0–100 cue is an independent illustration to compare with itself as conditions change. The scores do not form a water or energy balance. Existing score calculations are unchanged.

See [signal inspection review](../reports/watercycle-signal-inspection/README.md) for matched captures, exact-value checks, native controls, and contrast verification.

## Give dashboard comparisons room to breathe

The dashboard groups its plot, place inspection, storage cues, and exact-value table into separate cards. Wide panels put the storage cues beside the plot and give the inspection row and table the full width below. Narrow panels use the same plot → inspection → stores → table order as the document, so the visual and keyboard reading order agree.

Layout and graph text respond to the panel's actual width, including a narrow embedded tool on a large screen. The storage bars have a visible group heading, and the table has space for its column labels. Native selection and disclosure controls retain their large targets and visible keyboard focus.

Forced colors use system strokes for the axes, grid guides, and stage marker, including when dark mode is also active. Line patterns and marker shapes continue to distinguish the three teaching cues.

The header identifies **Current condition cues**. The scope note explains that replay changes the focus while scores use current conditions. The existing independent teaching scores and all learner evidence remain unchanged.

See [dashboard layout review](../reports/watercycle-dashboard-layout/README.md) for matched captures, measured layout changes, interaction checks, and accessibility verification.

## Explain weather and ground inputs

Climate Lab separates the model's reference sunlight and wind from the learner's saved comparison baseline. The native ranges show endpoint values, linked explanations, a thin track, and a clear thumb within a 44px target. The evaporation meter exposes the exact current teaching index as text inside the existing live response. Wind retains its transport role in the model.

Land-surface pathways shows rainfall and starting soil wetness on explicit 0–100 teaching scales. Brief definitions explain permeability, slope, and land cover beside their choices. Selected labels keep their checkmark on the same line, including on phones. **Reset climate** and **Reset land** identify each action's existing scope. A selected preset explains that it sets weather and land inputs together.

The two Land result cards pair exact scores with fixed illustrations: runoff moves over the ground surface, while infiltration enters soil pore spaces. Their arrows show direction. The separate indices are not measured water amounts or complementary shares, and infiltration alone does not establish aquifer recharge. The existing driver, interpretation, comparison prompt, and scope note remain beside the readings.

Both labs arrange their controls using the panel's actual width. Narrow embedded panels stack the climate controls and response; wider panels use columns. Forced colors give the soil guides, direction arrows, and expanded/collapsed cues explicit system colors. The labs remain foldable.

The final review passed 137 tests, 771 browser checks, and 18 scoped accessibility audits. Exact source comparisons also confirm that 15 calculation and state blocks are unchanged. Browser interactions preserve the paused parcel, saved baseline, comparison writing, and observation evidence. Source and desktop public runtime copies match.

See [Conditions clarity review](../reports/watercycle-conditions-clarity/README.md) for matched captures, measurements, interaction coverage, and the saved verification command.

## Read a comparison step by step

Scenario Compare names its baseline actions directly: **Restore baseline**, **Save current as baseline**, and **Clear baseline**. Nearby help explains each action and confirms that saved observations remain in the notebook. The comparison method shows whether inputs match, one input changed, several changed, or the baseline is incomplete. The isolation control links its restoration hint for assistive technology.

The three reading cards show full Baseline and Current labels, exact signed changes, and the meaning of **Current minus baseline**. Solid baseline bars with circle markers and patterned current bars with square markers keep both readings distinguishable. Each teaching index is compared with itself; the independent indices do not form a water budget. An incomplete legacy baseline explicitly identifies the use of display defaults for missing inputs.

The normalized **Pathway mix** sits in a native disclosure, with a separate explanation of its relative journey-branch shares. Core readings remain visible when it is folded. Comparison and claim layouts respond to their actual panel widths, including narrow embedded tools on large screens. Dark and forced-color text uses the verified contrast and system-color overrides.

Claim choices use their full wording. Choosing a claim focuses the revealed feedback heading; **Choose again** returns to that claim's button. **Save observation** returns focus to feedback after the button becomes Saved. Restore and the existing isolation action focus the updated comparison method, while Clear returns to the persistent baseline button. These handoffs keep the keyboard destination visible as controls disappear or become disabled.

The final review passed 129 distinct tests, 788 browser checks, and 16 scoped accessibility audits. Twenty-four existing calculation and state anchors remain unchanged, as do the full comparison derivation ranges. Browser actions preserve the paused parcel, prior saved evidence, and learner writing. Source and desktop public runtime copies match.

See [comparison clarity review](../reports/watercycle-comparison-clarity/README.md) for before-and-after captures, focus evidence, scope notes, and the saved verification command.

## Read saved evidence in the notebook

Each observation has a named heading, a description of its recorded input changes, and three readable **Saved changes** rows. Positive and negative values retain their signs; zero remains a recorded zero. Missing or nonfinite changes say **Not recorded**, and an older record without a claim result says **Claim check not recorded**. These displays use the stored evidence.

The native **Explain this observation** disclosure groups the saved claim, evidence summary, recorded input changes, **Saved baseline / Saved scenario** table, relative pathway mix, and three writing prompts. Land changes use index points, and the table retains the independent 0–100 scales. Guidance distinguishes these readings from water volumes and explains that changing current controls leaves recorded evidence unchanged.

**Replay settings** identifies its scope and loads the observation's saved condition settings into the current workspace. Keyboard focus moves to the comparison method, or to **Set baseline** when the record has no saved baseline. Partial records explain the use of model defaults for missing settings. Remove, Clear trail, and Undo retain their notebook focus handoffs and existing history behavior.

Cards respond to the notebook's available width. Narrow embedded tools use one column, and an expanded explanation leaves neighboring cards at their natural height. Readings, table labels, writing prompts, and disclosure cues have explicit readable sizes and system colors.

The final review passed 80 distinct tests, 653 browser checks and 18 scoped accessibility audits. Thirty-four calculation and state anchors and the full comparison and signal derivation ranges remain unchanged. Native flows preserve recorded evidence, learner writing and the paused parcel. Source and public runtime copies match, and the local preview serves the tested version.

See [notebook clarity review](../reports/watercycle-notebook-clarity/README.md) for matched captures, legacy-record checks, preservation evidence, and the saved verification command.
