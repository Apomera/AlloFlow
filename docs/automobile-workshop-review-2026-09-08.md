# Automobile STEM tool: workshop review and refinements

Date: 2026-09-08. Scope: Auto Repair Shop, its shared 3D viewer, and the desktop public mirrors. Changes are local; no deployment or installer build was requested.

## What the review found

The existing tool already covers ownership, maintenance, diagnostics, repair procedures, buying a used car, career pathways, an engine-bay tour, seven diagnostic cases, and a staged roadside tire change. Those activities have substantial accessible HTML content and a shared Three.js viewer with context cleanup, picking, keyboard controls and reduced-motion support.

The largest experiential gap was between these activities: the learner could inspect an engine or a wheel corner, but could not follow a work order around a complete vehicle in a shop. The existing scene camera also prohibited looking upward, making an underbody view impossible. Selection effects suitable for isolated engine parts enlarged lift hardware and made solid panels translucent when applied to a whole vehicle.

A content review also found an incorrect brake-fluid explanation in the brake walkthrough and quiz: it said to open the reservoir to avoid bursting a seal and allow fluid to overflow into a rag. Both passages now teach level monitoring, preventing overflow and contamination, protecting painted surfaces, and following the vehicle-specific procedure.

## Implemented

Open **Auto Repair Shop → Full mechanic workshop (3D)**.

- Complete stylized sedan with cabin, opening hood, engine, battery, wheels, front brakes, suspension, sump, filter, exhaust, catalyst, muffler and brake lines.
- Service desk, tool cabinet, pegboard, wheel rack, used-oil drum, floor drainage, bay markings, shop signs and lighting.
- Seven selectable stations with equivalent HTML buttons and descriptions: service desk, lift, engine/electrical, wheels/brakes, oil/filter, underbody/exhaust and tool bench.
- A staged two-post lift: equipment/contact-point setup, low lift, stability check, working height and mechanical locks. Underbody operations and the upward inspection camera require the locked state.
- Four ordered work orders: front brake service, oil/filter service, slow-crank diagnosis, and front toe alignment. Every action checks the selected station, equipment, task prerequisites and required calculation before it advances.
- Visible service changes: the front wheel moves to the rack; both front pad sets change from worn to serviced; used oil appears in the collection pan; the filter changes; the sump records drained/refilled states; terminal corrosion disappears after the connection service.
- STEM calculations use explicitly fictional service-sheet values: lining loss, remaining fluid volume and voltage-drop excess. Accepted calculations are retained in the downloadable work-order record.
- Verification and a written customer handoff are required before work-order completion. Each job preserves its own progress in tool state. The existing host controls persistence of that state.
- Links into the detailed engine tour, diagnostic cases and tire-change activity include a return-to-workshop path.
- Keyboard camera controls, station labels, touch-sized controls, responsive layout, light/dark/contrast palettes, reduced-motion behavior and a usable HTML path if WebGL fails.
- The shared viewer accepts an optional bounded `minPitch`. Its existing 0.12-radian minimum remains the default. Only the new workshop opts into an upward view, with a camera-height floor so students cannot orbit beneath the shop floor. Opaque materials and physical lift geometry retain their appearance and scale during station selection.

## Initial workshop validation

The final unit/HTML regression run passed **591 tests across 40 files**, covering every automobile suite plus the shared first-response 3D contracts. An initial run alongside WebGL exceeded one existing used-car test’s five-second timeout; it passed in isolation, and the final broad run passed with a 15-second timeout. Syntax checks and scoped `git diff --check` passed. Both public mirrors are byte-identical.

Browser tests use the local working tree, real Three.js and Chromium WebGL, not the deployed website. **Seven browser checks passed**: three existing engine-bay checks and four workshop checks covering complete brake/oil/electrical jobs, tool and measurement errors, lift and reassembly states, verification, download, return navigation, per-job progress, reduced motion, mobile overflow, physical label anchors and the upward underbody camera. The final label/camera changes also passed a focused **144-test** regression rerun. The four evidence screenshots were refreshed and visually inspected.

Reproduce the regression run in PowerShell:

```powershell
$arTests = (Get-ChildItem tests/autorepair_*.test.js).FullName
npx.cmd vitest run @arTests tests/firstresponse_body_3d.test.js --maxWorkers=1 --testTimeout=15000
```

Run workshop browser coverage with `npx.cmd playwright test tests/e2e/autorepair-full-workshop.spec.ts --workers=1 --retries=0`.

Evidence images:

- [Whole shop](../reports/automobile-workshop/full-shop.png)
- [Brake inspection](../reports/automobile-workshop/brake-inspection.png)
- [Underbody inspection](../reports/automobile-workshop/underbody.png)
- [Mobile layout](../reports/automobile-workshop/mobile.png)

## Follow-up: operational equipment

The second pass closes a gap between choosing a tool and using it. Instrument tasks now require captured evidence as well as the correct calculation. All values remain authored for the fictional training sedan.

- **DC voltmeter:** choose DC voltage mode, battery posts or the positive post-to-clamp joint, and no load or starter load. The physical meter and probe leads update with those choices. Battery voltage alone and a zero-drop no-load reading cannot complete the connection diagnosis. A fresh loaded connection measurement is required after service: 1.60 V before and 0.08 V after. This models the diagnostic distinction described by [Fluke's automotive electrical troubleshooting guidance](https://www.fluke.com/en/learn/blog/automotive/electrical-automotive-troubleshooting).
- **Pad gauge:** distinguish friction lining from the backing plate, then capture the lining measurement. The physical gauge displays the selected measurement; measuring the backing plate does not satisfy the task.
- **Measured oil jug:** add 100 or 500 mL, remove 100 mL, and capture the 4.6 L service fill. The physical fluid volume, graduations and readout track the same state. Quantity changes invalidate the prior reading; capacity is bounded at 5 L.
- **Wheel reassembly:** seat the wheel and start the fasteners before checking all five in the authored 1 → 3 → 5 → 2 → 4 pattern. Click the actual 3D fasteners or use the equivalent keyboard-accessible diagram. Adjacent, repeated and premature checks are rejected. The wheel visibly returns before the sequence is finished, while lowering remains blocked until reassembly is recorded.
- **Evidence and navigation:** captures belong to the current task, instrument setup and service state. Captured values and the completed tightening sequence are retained in the downloadable history. Equipment close-ups scroll into view; a return button brings the learner back to the work order. Dedicated instrument display textures keep physical readings legible.

This adds interactive equipment selection and measurement to the authored service workflow. Tightening checks still represent completion of the specified procedure; they do not calculate applied torque or simulate thread engagement.

Follow-up validation: **469 tests across all 39 automobile test files passed** (including 22 workshop state/render tests). **All seven workshop browser tests passed** in Chromium with real Three.js/WebGL, covering the complete jobs, mobile/reduced-motion behavior, physical fastener ray picking, invalid and stale measurements, fresh post-service readings, jug quantity and scene values. The full browser run took 4.3 minutes; the automobile regression took 89.68 seconds. Evidence includes six new instrument screenshots and refreshed workshop views. The instrument close-ups and mobile controls were visually reviewed, including a full-width crop of the mobile controls. Syntax and scoped diff checks passed; the automobile public mirror is byte-identical. No deployment or installer build was performed.

Additional evidence images:

- [Voltmeter before service](../reports/automobile-workshop/voltmeter-before.png)
- [Voltmeter after service](../reports/automobile-workshop/voltmeter-after.png)
- [Measured oil jug](../reports/automobile-workshop/measured-oil.png)
- [Lining gauge](../reports/automobile-workshop/lining-gauge.png)
- [Wheel fastener interaction](../reports/automobile-workshop/wheel-torque.png)
- [Instrument controls on mobile](../reports/automobile-workshop/instruments-mobile.png)

## Follow-up: front toe alignment work order

The fourth job adds a complete alignment exercise: intake, loaded-bay preparation, initial measurements, independent front toe adjustment, a fresh final measurement and a written handoff. It uses a fictional sedan with a straight rear thrust line and authored passing tyre, joint, camber and caster inspections. It does not infer alignment from wear alone.

The learner confirms tyre/joint inspection, level loaded support with free plates and compensated targets, and steering centre. Measurements and adjustments require the vehicle on its tyres, the correct station and equipment, and the preceding task. The two-post lift arms are stowed during this job.

Initial angles are left +0.30° and right +0.10°; total toe is their +0.40° sum. The fictional targets are +0.10° ±0.02° per front wheel, +0.20° ±0.02° total, and at most 0.02° left/right difference. Each side changes independently by 0.01° or 0.05°. Integer hundredths preserve exact increments. A passing total with a toe-in/toe-out imbalance is rejected. These are authored acceptance rules, not universal alignment specifications.

The 3D scene includes turning front wheels and brake assemblies, checkerboard targets, turn/slip plates, exposed adjustment collars, floor reference guides and a live console. Target plates and collars select the same side as the accessible controls. An optional chassis view hides the body and engine to expose the wheel/steering comparison, then restores the full car; hidden components are excluded from picking. Wheel yaw and guides use an explicitly labeled **24× visual magnification**; the display values retain their actual model angles. The adjustment buttons represent angle changes, not wrench-turn instructions or physical tie-rod travel.

Changing an angle invalidates the captured result. Switching sides keeps the same valid reading because no measured angle changed. The service and final verification steps require both individual values, total and balance to pass. The report preserves the baseline and corrected left/right/total readings. Job progress, selected side and adjustments survive switching work orders. Existing brake/oil/electrical capture keys keep their prior format so valid saved evidence from before this enhancement still works.

Reference checks: [MOOG's alignment overview](https://www.moogparts.com/en-eu/archives/blog/why-what-how-wheel-alignment.html) distinguishes toe, camber, caster and thrust and emphasizes manufacturer specifications; [MOOG's tie-rod alignment guidance](https://www.moogparts.com/technical/bulletins/tech-tips/Why-an-Alignment-is-Needed-After-an-Outer-Tie-Rod-Replacement.html) supports measuring alignment following steering-linkage work. [Hunter's alignment equipment overview](https://www.hunter.com/alignment-machines/standard-alignment/) informed the use of targets and live alignment displays. The simulation does not reproduce either manufacturer's equipment or full service procedure.

Alignment validation: **481 tests across all 39 automobile suites passed**, including 34 workshop state/render tests and a persisted pre-alignment reading compatibility case. **All nine workshop browser tests passed** in Chromium with real Three.js/WebGL, covering all four jobs, actual target picking, matched wheel/brake assembly yaw, chassis hide/restore, incorrect individual angles despite a passing total, stale captures, final verification and mobile saved progress. The full browser run took 3.4 minutes; the final unit regression took 124.06 seconds. The alignment overview, before/after chassis views and mobile controls were visually inspected. Syntax, scoped diff hygiene and source/public parity checks passed. No deployment or installer build was performed.

Alignment evidence:

- [Vehicle and alignment console](../reports/automobile-workshop/alignment-before.png)
- [Chassis before adjustment](../reports/automobile-workshop/alignment-chassis-before.png)
- [Chassis and readings after adjustment](../reports/automobile-workshop/alignment-after.png)
- [Mobile alignment controls](../reports/automobile-workshop/alignment-mobile.png)

## Follow-up: direct 3D workshop controls

This pass turns the scene into an operational surface. The hood opens or closes when clicked. A tray on the tool bench presents three labeled equipment cases for the current task; selecting a case changes the tool in hand. The choices include the required equipment without highlighting it as the answer. Focus controls bring the tray or current service equipment into view.

Blue NEXT controls on the service desk, lift, vehicle stations and alignment console run the current task through the existing station, equipment, access, arithmetic, evidence and handoff rules. The front wheel, drain pan, filter, front caliper and faulty battery connection also operate their corresponding service task when that task is current. Wheel seating and the existing five-fastener reassembly checks remain separate.

Physical instrument interactions include clicking a meter/gauge/jug display to capture a reading, turning the meter dial between DC volts and resistance, switching probe contacts and simulated starter load, moving the pad gauge between lining and backing plate, adding/removing measured oil, and incrementing the selected toe angle from console controls. Alignment preparation checks are also available on the console. The physical controls use the same dispatcher as the equivalent buttons beside the viewer.

The nearby control panel shows equipment in hand, feedback, the current actions and any required calculation or release notes. Learners can stay near the 3D view while completing the work; the detailed work order remains synchronized. The HTML path works without WebGL and supports keyboard operation. Orbit drags retain the viewer's existing movement threshold and do not trigger an action.

Control identifiers include the work order and task step. A stale click cannot operate a subsequent task or equip a case from an earlier tray. Tool selection alone never completes a task. Changing measurement setup still invalidates old evidence, and direct clicks cannot bypass the service sequence or required verification. Scene rebuilding depends on task/tool/physical changes, while typing calculations and notes preserves the scene.

Direct-control validation: **491 tests across all 39 automobile suites passed**, including 44 workshop state/render tests. **All 12 workshop browser tests passed** in Chromium with real Three.js/WebGL. The three new browser checks exercise actual hood, tool-case, meter dial/display, probe/load, terminal, lift, jug and alignment-control clicks; a drag over the lift control does not activate it. Keyboard Enter operates the equivalent mobile action, calculations stay synchronized, and mobile layout does not overflow horizontally. The final browser run took 6.7 minutes; the automobile regression took 94.60 seconds. Physical control close-ups, tool labels and the mobile action panel were visually reviewed. Syntax, scoped diff hygiene and source/public parity passed. No deployment or installer build was performed.

Direct-control evidence:

- [Physical tool tray](../reports/automobile-workshop/direct-tool-tray.png)
- [Meter controls](../reports/automobile-workshop/direct-meter-controls.png)
- [Lift controls](../reports/automobile-workshop/direct-lift-controls.png)
- [Keyboard controls on mobile](../reports/automobile-workshop/direct-controls-mobile.png)

## Follow-up: operational lift stop and recovery

The lift's red mushroom button now latches a saved stop state. Every lift movement command (initial rise, working-height rise, settling on locks and lowering) checks that state through both the 3D controls and the task card. Pressing stop preserves the current height, mechanical support state, tool, work history and instrument evidence. It does not substitute for mechanical locks or bypass any access requirements.

The physical panel shows STOP/READY, a red/green status lamp and a depressed stop button when latched. While stopped, CLEAR? and RESET controls appear. The learner records a simulated clear-bay check before resetting; reopening the check or pressing stop again removes that confirmation. Resetting only releases the command interlock: it does not move the vehicle or complete a task. A new command still needs the correct equipment, prerequisites and reassembly state.

A dedicated HTML panel exposes the same actions, stop status and vehicle position with keyboard support, including without WebGL. Focus lift panel brings the physical controls into view from any station. Stop state survives serialized work-order progress; older records default to a released stop. This remains an authored, discrete control exercise, not a hydraulic model, fault-detection system or operating procedure for a real lift.

Validation: **504 tests across all 39 automobile suites passed**, including 57 workshop state/render tests. **All 13 workshop browser tests passed** in Chromium with real Three.js/WebGL, including physical stop/check/reset picking, blocked commands through both interaction paths, no movement on reset, station switching and mobile keyboard recovery. The browser run took 6.8 minutes; the broader regression took 82.06 seconds. Desktop controls, the mobile recovery panel and the complete mobile action panel were visually inspected. Syntax, scoped diff hygiene and source/public parity passed. No deployment or installer build was performed.

- [Latched stop and physical recovery controls](../reports/automobile-workshop/lift-stop-latched.png)
- [Mobile stop and reset panel](../reports/automobile-workshop/lift-stop-mobile.png)

## Follow-up: interactive brake parts explorer

An exposed front brake now has a SPREAD control and a parts explorer beside the viewer. With the vehicle supported on its mechanical locks and the wheel removed, learners can separate the rotor, representative friction pad and caliper, adjust the amount from 0–100%, and select each physical part or its label to read its role. The selected part is highlighted. JOIN returns the geometry to its assembled positions.

Spacing is an explanatory view setting, not a simulated removal procedure or a real travel dimension. The simplified brake shows one representative pad; the description explains that a complete brake has pads on both rotor faces. Pad information follows the authored service state (2 mm before service, 8 mm afterward), while the gauge, calculation and task evidence remain required for completing the work order.

In the separated view, clicking the caliper inspects it. Returning to the assembled view restores its existing service action. Opening the explorer, changing spacing or selecting parts never completes a service task or alters a captured measurement. Wheel seating closes the explorer and restores the assembled geometry; the fastener sequence still must be completed. Saved view settings are normalized and bounded, and older records start with the assembled view.

The native range input supports keyboard adjustment. Equivalent part buttons, descriptions and spacing controls remain available without WebGL. A dedicated focus control frames the components from an oblique angle so their separation can be seen.

Validation: **513 tests across all 39 automobile suites passed**, including 66 workshop state/render tests. **All 14 workshop browser tests passed** in Chromium with real Three.js/WebGL, including physical component picking, exact separation positions, native keyboard slider changes, restored caliper service clicks and automatic closure on wheel seating. The final browser run took 8.7 minutes; the automobile regression took 86.08 seconds. Desktop and mobile explorer screenshots were visually reviewed. Syntax, scoped diff hygiene and source/public parity passed. An initial browser run reached wheel seating but timed out during context teardown; the passing final run disabled video and trace recording through a temporary config while retaining the full assertions and evidence screenshots. That config was removed afterward. No deployment or installer build was performed.

- [Separated brake components](../reports/automobile-workshop/brake-explorer-3d.png)
- [Mobile brake explorer](../reports/automobile-workshop/brake-explorer-mobile.png)

## Follow-up: detailed brake inspection and close-ups

The exposed front brake rotor now shows separate friction faces, ventilation vanes, a raised hub and five studs. Detailed geometry is built only for that accessible inspection corner; hidden wheels and other jobs retain the lightweight assembly. The caliper has a visible bridge, guide pins and piston housing instead of a solid block. The representative pad separates its steel backing, retaining ears and friction lining; the displayed lining changes with the authored 2 mm/8 mm service state. Lining depth is visually enlarged sixfold, explicitly explained in the pad description. These shapes remain schematic and do not establish real component dimensions or repair procedures.

Every subcomponent retains its parent interaction. The open caliper has an invisible selection volume inside its housing so clicks through its central window still select the assembly. Exploded-view descriptions, service clicking after JOIN, and the existing alignment transforms continue to use the same named component groups.

The gauge and its placement control now translate with the pad as visual separation changes. Capturing the lining and backing-plate values still uses the existing evidence rules; repositioning invalidates a capture. Returning to the assembled view restores both the pad and equipment positions.

A selected-part close-up control frames the rotor, pad or caliper at its current assembled or separated position. The workshop opts in to a closer zoom limit through the shared viewer's optional minDistance setting; other viewers retain the 2.6 default and the existing orbit convention. Physical control labels are narrower to reduce overlap.

Validation: **516 tests across all 39 automobile suites passed**, including 69 workshop model/render tests. **All 15 workshop WebGL browser tests passed**, plus three existing engine-bay, tyre-workflow and focus/return browser checks for the shared viewer. The final workshop run took 8.2 minutes, the three shared-viewer checks took 19.8 seconds, and the automobile regression took 86.06 seconds. Physical component picking, tracked gauge capture, invalid backing-plate evidence, camera centering/proximity and keyboard/mobile close-up access passed. Rotor and pad close-up screenshots were visually reviewed. Both source/public pairs match; syntax and scoped diff checks passed. The final browser runs disabled video/trace recording using a temporary config that was removed afterward. No deployment or installer build was performed.

- [Pad and gauge close-up](../reports/automobile-workshop/brake-pad-closeup.png)
- [Rotor and hub close-up](../reports/automobile-workshop/brake-rotor-closeup.png)

## Live task guide and contextual navigation

The direct 3D controls now include the current task, a live readiness message and an expandable checklist. The guide and task completion share one readiness model covering station, selected tool, vehicle prerequisites, lift stop, arithmetic, instrument evidence and customer handoff. Existing completion feedback keeps its previous priority. The guide prioritizes resolving the lift stop and vehicle setup, selecting equipment before travel, and capturing observations before arithmetic.

The contextual button moves to the relevant tool tray, service controls, lift clear/reset controls, equipment action, calculation field or handoff field. Navigation does not choose a tool, reset the lift, capture evidence, perform a task or supply an arithmetic answer. Keyboard focus follows the destination; the equivalent controls remain available without WebGL. Alignment preparation and fastener checks include live counts. A completed order links back to its record.

Readiness responds to changes in instrument setup and retains valid evidence during camera movement and brake exploration. The new display uses the existing scene state; typing calculations or handoff notes does not rebuild the 3D geometry.

Validation: **527 tests across all 39 automobile suites passed**, including 80 workshop model/render tests. **Eight targeted WebGL browser checks passed**: the two new guide flows, direct 3D meter/tool interaction, full brake service, oil service, electrical evidence, physical wheel fasteners and the complete alignment job. The browser batches took 1.0 and 3.7 minutes; unit regression took 129.69 seconds. Desktop and 390-pixel phone guide screenshots were visually reviewed. Keyboard focus, navigation without task execution, stale evidence, completed-order review and mobile overflow checks passed. Syntax, source/public parity and scoped diff checks passed. Temporary browser recording overrides were removed after testing. No deployment or installer build was performed.

- [Ready task checklist](../reports/automobile-workshop/task-guide-ready.png)
- [Mobile task guide](../reports/automobile-workshop/task-guide-mobile.png)

## Instrument coaching and fine oil measurement

The direct workshop controls now show an instrument status card with current setup, capture status and a specific next step. Meter coaching distinguishes DC-voltage mode, battery-post versus positive-joint placement, and simulated starter load. Gauge coaching explains backing-plate versus friction-lining placement. The task guide focuses the relevant setting control instead of repeatedly directing the learner to capture an invalid reading.

The oil jug has an additional physical +100 mL button, shared with its keyboard control. Coaching chooses coarse fill, fine fill or removal based on the current amount. These controls only change the measured jug: transfer remains a separate task with the existing service, evidence and arithmetic gates. Capacity and access checks remain enforced.

Alignment coaching distinguishes preparation, adjustment and fresh measurement. It focuses the adjustment panel when angles require correction; out-of-range verification explains the measurement-only step. Wheel coaching follows seating and the authored cross-hub sequence. Instrument suggestions are withheld when station, tool or vehicle access prerequisites are missing.

Captured values appear alongside setup. Invalid captures are identified as needing correction; changed setup removes the current capture, while camera movement and brake exploration preserve valid evidence. Coaching is derived from existing state and does not operate equipment, advance work, or populate the learner’s answer.

Validation: **539 tests across all 39 automobile suites passed**, including 92 workshop tests. **Six targeted WebGL browser tests passed**: existing direct meter/hood/tool actions, direct jug/alignment controls, both task-guide flows, meter coaching and physical fine-fill/alignment coaching. The browser run took 1.5 minutes; full automobile regression took 156.13 seconds. Physical +100 mL picking, keyboard focus without automatic operation, invalidation of changed captures, alignment-panel focus and phone overflow checks passed. Meter/phone status cards and the physical jug control were visually reviewed. Source/public parity, syntax and scoped diff checks passed. Temporary browser recording overrides were removed. No deployment or installer build was performed.

- [Meter setup and evidence card](../reports/automobile-workshop/instrument-coach-meter.png)
- [Phone instrument feedback](../reports/automobile-workshop/instrument-coach-mobile.png)
- [Physical 100 mL jug control](../reports/automobile-workshop/jug-fine-control.png)

## Direct battery contact placement

Electrical diagnosis now offers a battery-contact close-up. The battery has a separate positive clamp collar, contact lug, bolt and cable. During meter use with the hood open, labeled negative-post and positive-clamp targets place the black probe explicitly; the red probe stays on the positive post. Target rings indicate the current selection, and the existing lead geometry moves to that selected contact. Contact geometry and spacing remain schematic.

The physical post, clamp, target labels and matching keyboard controls share the existing task-scoped instrument dispatcher. Selecting a different contact invalidates the captured reading; selecting the same contact preserves it. Clicking the connected black probe also preserves its current contact. Tool, hood and task gates remain enforced. The existing PROBES toggle remains available on the instrument cart.

The close-up changes the camera without taking a reading or completing a task. The instrument status card explains the contact choice and offers the close-up button; explicit contact buttons expose their selected state to assistive technology. Positive clamp geometry also participates in the authored connection-service action.

Validation: **95 workshop model/render tests passed**, and **four targeted WebGL browser tests passed** in 2.7 minutes: existing voltage evidence, direct hood/tool/meter interactions, instrument coaching and the new physical battery-contact flow. The latter verifies physical clamp/negative-post clicks, lead endpoints, idempotent selection, invalidation when moving contacts, and keyboard/mobile use. Desktop and phone close-ups were visually reviewed. An initial label click hit the raised hood; moving the negative-post label into clear space resolved the actual raycast obstruction. Source/public parity, syntax and scoped diff checks passed. Temporary browser recording overrides and test instrumentation were removed.

Full-regression limitation: two broad automobile runs were interrupted after existing screen tests exceeded timing limits. Nine used-car, learning-path, cold-weather, EV and career checks passed unchanged in isolation (19.94 seconds for the batch). Two tyre checks also passed in isolation; the remaining tyre-type test timed out at the 15-second limit, then completed its assertions in 8.924 seconds on a rerun configured with a 60-second deadline. These 12 isolated successes do not constitute a clean completed full-suite run. No test source or assertions were relaxed, and no unrelated screen implementation was changed. No deployment or installer build was performed.

- [Positive clamp selected](../reports/automobile-workshop/battery-joint-contact.png)
- [Negative post selected](../reports/automobile-workshop/battery-post-contact.png)
- [Phone battery close-up](../reports/automobile-workshop/battery-contacts-mobile.png)

## Optional 3D control inspection mode

The viewport now offers Operate and Inspect modes. Operate remains the default. In Inspect mode, a 3D click identifies the selected station, tool or control and explains its action. A keyboard-accessible chooser exposes the same catalogue. Use selected control invokes the existing dispatcher, preserving equipment, evidence and vehicle-access requirements. Dismissing a preview leaves the work order untouched, and keyboard focus returns to the chooser after use or dismissal.

Preview selection is separate from the saved work order. Descriptions are derived from the current authored catalogue; no simulated instrument operation is run to generate a preview. Each selection is bound to the current normalized workshop state. A changed job, task, setting, tool, access condition, calculation or other work-order state expires it, removing the Use action until a current control is inspected again.

The physical red lift stop remains immediate in both click modes. That exception is stated beside the mode controls. Labeled controls in the work panels continue to operate directly. Dragging the 3D view still orbits and does not select a preview. The shared viewer was not modified.

Validation: **104 workshop model/render tests passed** (39.13 seconds), including preview purity, stale-state rejection, current-catalogue descriptions, available fastener targets and the no-WebGL chooser. **Five targeted WebGL workflows passed**: existing direct electrical, lift and jug/alignment controls plus both new inspection flows. These verify actual canvas previewing without state changes, explicit use, expiry after setup changes, keyboard focus, phone overflow, immediate physical stopping and drag-versus-click behavior. The first browser batch passed four workflows; the electrical case timed out waiting for screenshot stability, then passed unchanged on its focused rerun (59 seconds). Desktop and phone preview screenshots were visually reviewed. Syntax, source/public parity and scoped diff checks passed. Validation was limited to the affected workshop paths; the previously documented broad-suite timing limitation is not represented as resolved. Temporary browser recording overrides were removed. No deployment or installer build was performed.

- [Desktop control preview](../reports/automobile-workshop/control-inspector-desktop.png)
- [Phone control preview](../reports/automobile-workshop/control-inspector-mobile.png)

## Moving wrench and numbered wheel controls

During wheel reassembly, the physical wrench now seats its socket on the next fastener in the authored 1 → 3 → 5 → 2 → 4 sequence. Clicking the handle checks that fastener through the existing service dispatcher. Each accepted check moves the wrench; five accepted checks park it beside the wheel. Clicking the parked wrench selects the brake station without repeating a check or completing the work-order step.

Five numbered physical targets expose the same choices as the accessible diagram. A cyan ring marks the next fastener, checked fasteners turn green, and a display below the tyre reports the next number and recorded count. The diagram announces the current step with aria-current. The wheel equipment camera gives a closer frontal view, and the brake station label moves above the controls during reassembly so it does not cover fastener 1. Inspect mode previews the wrench's current fastener before explicit use.

This remains a sequence exercise: clicks represent checks against the fictional job's service sheet, without modeling applied torque, wrench force or thread engagement. Existing prerequisites, out-of-order and repeat rejection, and explicit work-order completion remain in force. No shared viewer changes.

Validation: **104 workshop model/render tests passed** (4.88 seconds). **Three distinct WebGL workflows passed** across focused runs: physical fasteners with the accessible diagram, full brake service through handoff, and the new moving-wrench desktop/phone workflow. The latter verifies socket relocation, numbered target picking, wrong/repeated choice rejection, Inspect preview plus explicit use, a non-operating progress display, all five checks, a parked wrench that does not advance the job, and explicit reassembly completion. The initial phone test retained the harness’s fixed desktop width; its setup was corrected and horizontal overflow is now asserted. Visual review also identified and resolved overlap between the progress display, NEXT button and top fastener number. Desktop and phone screenshots were reviewed. Source/public SHA-256 parity, syntax and scoped whitespace checks passed. The shared viewer is unchanged; the broader automobile suite was not rerun. Temporary browser configuration was removed. No deployment or installer build was performed.

- [Desktop moving wrench](../reports/automobile-workshop/moving-torque-wrench-desktop.png)
- [Phone moving wrench](../reports/automobile-workshop/moving-torque-wrench-mobile.png)

## Activity finder across the automobile tool

The menu now offers a Find an activity shortcut and a search form above the activity library. Search combines words across visible activity/category names and descriptions plus authored topic aliases. Learners can find oil-change practice, battery diagnostics, repair costs, tools, careers and the four 3D activities without first knowing their menu titles. Tire/tyre spelling, capitalization, accents and punctuation are normalized; terms are matched as literal text. Suggested topic buttons start common searches.

Matching categories initially expand. Search-specific collapse choices are separate from the normal category preferences, so clearing restores the original library arrangement. Enter focuses the first result and reopens matching sections; Escape and Clear reset the search and keep focus in the field. Empty results offer recovery guidance. Search stays available on return from another activity; module progress, primary resume actions and quick-start shortcuts remain intact. The new controls use the existing theme palette and wrap for phone screens.

Validation: **125 tests passed across four affected suites** (finder, menu, menu bay and workshop; 119.87 seconds). The first run hit five existing render/hook deadlines; the rerun used local 60-second test/hook limits without relaxing functional assertions. **Three browser workflows passed**, then all three passed again after the font and selected-topic outline polish (final run 2.2 minutes). They verify real typing, focus retention, Enter/Escape/Clear behavior, category restoration, activity navigation and return, unchanged workshop progress, aliases, empty results, phone overflow, and dark/high-contrast rendering. An initial browser setup incorrectly expected a canvas on the menu; the tests now use the harness’s existing non-canvas mode. Four screenshots were reviewed, with final desktop and contrast visuals rechecked after polish. Syntax, source/public parity and scoped whitespace checks passed. Temporary browser configuration was removed. The broader automobile suite was not run; no deployment or installer build was performed.

- [Desktop activity finder](../reports/automobile-workshop/activity-finder-desktop.png)
- [Phone activity finder](../reports/automobile-workshop/activity-finder-mobile.png)
- [Dark phone finder](../reports/automobile-workshop/activity-finder-dark.png)
- [High-contrast phone finder](../reports/automobile-workshop/activity-finder-contrast.png)

## Recorded voltage evidence and reasoning lesson

The slow-crank job now has a visual evidence panel connecting the initial loaded joint test, connection service and repeat test. Before/after bars share one scale and a dashed 0.2 V case-limit marker. Text equivalents identify each value and the measurement conditions. Values appear only when the learner completes the corresponding measurement task; a live capture alone does not populate the completed-record comparison, and the service action cannot reveal the verification result early.

Completed instrument tasks now retain a numeric snapshot and a copy of their setup alongside the existing service-history prose. The electrical comparison accepts only finite, nonnegative volt readings taken with DC volts, joint probes and starter load, with the service record between the two tests. An expected repair conclusion requires an initial value at or above the case limit and a repeat value strictly below it. Existing text-only records remain intact and display an explicit missing-snapshot label. Later changes to live meter settings do not rewrite the historical comparison.

An optional reasoning check opens after the recorded comparison supports the expected improvement. Learners distinguish repeat loaded-test evidence from visual cleanup and resting battery voltage, receive specific feedback and can revise their choice. The exercise does not advance, block or grade the repair work order. Its choice persists with that job and is included with the comparison in the downloaded work order. The lesson uses the existing authored case values and does not certify the rest of the starting system.

Validation: **122 workshop model/render tests passed** in the final run (15.68 seconds), including snapshot provenance, setup independence, missing legacy data, incompatible units/settings, ordered service evidence, the strict limit boundary, optional reasoning, export text, theme rendering and finite chart geometry for exceptionally large saved values. **Two distinct WebGL workflows passed**: the existing physical-voltmeter flow and the new complete evidence lesson. The lesson verifies pending values until task completion, before/after capture, reasoning retries, unchanged history/progress, actual report download contents, per-job persistence, high-contrast phone layout, no overflow and final customer handoff. It passed again after the contrast chart correction (1.5 minutes). Visual review caught a track color that resembled a filled bar; contrast mode now uses empty outlined tracks and a marker with a contrasting outline. The desktop lesson, final contrast lesson and refreshed physical-meter screenshots were reviewed. Syntax, source/public parity and scoped whitespace checks passed. The shared viewer and broader automobile modules were unchanged; no broad full-tool regression run, deployment or installer build was performed. Temporary browser configuration was removed.

- [Desktop voltage evidence](../reports/automobile-workshop/voltage-evidence-desktop.png)
- [High-contrast phone evidence](../reports/automobile-workshop/voltage-evidence-mobile.png)

## Live alignment geometry lesson

The alignment console now connects the existing tie-rod controls to a live top-down wheel diagram. Solid wheels show the current left/right angles, with the same explicitly labeled 24× visual exaggeration as the 3D vehicle. An optional dashed target overlay shows +0.10° on each side; dotted lines retain a straight reference. The selected side is labeled during adjustment, and all angles remain available as text.

Three independent checks show each wheel's permitted range, signed addition for total toe, and the absolute left/right difference. Live feedback explains why opposite-signed angles can produce an acceptable total while individual angles and balance fail. It also covers pairs whose individual angles pass but whose total or balance does not. Passing geometry prompts a fresh measurement instead of claiming that the result is already recorded. The overlay is a separate UI preference and does not change the work order, 3D geometry, capture, history or progress. Actual tie-rod adjustment still invalidates the captured reading. Existing authored ranges and service gates are unchanged.

Validation: **132 workshop model/render tests passed** in the final run (5.02 seconds), including ten new cases covering independent tolerance checks, signed cancellation, absolute difference, wheel direction, theme rendering, fallback labels and an initially hidden overlay. **Three distinct WebGL browser workflows passed** (1.5 minutes): the existing complete alignment job, the misleading-total mobile workflow and the new diagram workflow. The new workflow passed again after label/copy polish (17.4 seconds), checking keyboard activation, unchanged state and evidence on overlay toggles, live adjustment/3D wheel agreement, capture invalidation, job switching and reflow at 390 px and 320 px. Final desktop light, high-contrast phone and narrow dark-phone screenshots were visually reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Shared viewer unchanged; no broad full-tool suite, deployment or installer build.

- [Desktop diagram with a misleading total](../reports/automobile-workshop/toe-diagram-desktop.png)
- [High-contrast phone diagram](../reports/automobile-workshop/toe-diagram-mobile.png)
- [Narrow dark-phone diagram](../reports/automobile-workshop/toe-diagram-dark.png)

## Graduated oil jug lesson

The oil refill console now shows a calibrated jug with a proportional oil level, 100 mL divisions, capacity labels and a dashed 4600 mL target. Learners can switch the scale between litres and millilitres while the amount stays unchanged. Under-target, at-target and over-target feedback describes the next measurement action. An optional quantity explanation shows target minus current, decimal litre conversion, the number of 100 mL changes and the equivalence between one 500 mL addition and five 100 mL additions. It distinguishes preparing oil in the jug from completing the checked refill task. Working is initially hidden and uses the current quantity instead of a fixed initial answer.

The 3D jug now has fine 100 mL graduations and a cyan target marker at the same authored quantity. An empty jug has no oil mesh, correcting the previous minimum visible layer. Existing physical +100, +500 and −100 controls, measurement capture and task gates remain in use. Unit/help preferences do not alter the work order or captured evidence; actual quantity changes still require a fresh capture. This extends the existing authored 4.6 L case and does not introduce vehicle-specific service specifications.

Validation: **145 workshop model/render tests passed** (3.59 seconds), including thirteen new cases for proportional levels at empty/initial/target/over/full quantities, both unit scales, three themes, non-WebGL text, optional working, correction direction and normalized saved-value bounds. **Four real-WebGL workflows passed** (56.2 seconds): existing direct-jug/alignment controls and fine-fill coaching, the new unit/measurement lesson, and empty/full jug geometry. The new flows verify keyboard unit selection, unchanged state/capture for view preferences, four 100 mL additions followed by a physical 100 mL addition, fine-mark count and target/fill height agreement, overfill correction, stale evidence invalidation, job persistence, 390/320 px reflow and refill task completion. Capacity rejects an extra addition and a full jug produces invalid fill evidence. Desktop light, contrast phone, narrow dark-phone and physical 3D screenshots were visually reviewed. Syntax, byte parity and scoped whitespace checks passed. Shared viewer unchanged; no broad full-tool suite, deployment or installer build. Existing modified regression screenshots were preserved outside this commit.

- [Graduated jug with quantity working](../reports/automobile-workshop/jug-lesson-desktop.png)
- [High-contrast phone jug](../reports/automobile-workshop/jug-lesson-contrast.png)
- [Narrow dark-phone jug](../reports/automobile-workshop/jug-lesson-dark.png)
- [Fine graduations and target in 3D](../reports/automobile-workshop/jug-graduations-3d.png)

## Brake layer measurement lesson

The brake measurement console now includes a labeled pad cross-section whose bracket follows the selected gauge surface. Explicit steel-backing and friction-lining controls use the same guarded actions as the 3D workshop. In the spread view, the exposed pad layer meshes are separately selectable and the selected measurement surface is highlighted. Layer placement also selects the pad in the parts explorer so the close-up control follows the measurement target. Selecting the same layer preserves captured evidence; changing layers clears it. Tool, lift and wheel-access gates remain enforced, and stale action tokens cannot operate a later task.

A numeric limit comparison appears only for a current valid lining capture. Before capture, the lesson explicitly distinguishes the schematic from recorded evidence. A steel reading explains why the model's 5 mm backing plate cannot establish lining wear and prompts a new lining capture. A captured 2 mm lining is compared visually and in text with this case's 3 mm replacement limit. An above-limit capture does not claim that the whole brake repair is verified. Existing task calculations, service history, inspection mode and repair gates remain unchanged. The lesson uses authored model dimensions, not universal vehicle service specifications.

Validation: **157 workshop model/render tests passed** in the final run (22.73 seconds), including twelve new cases for explicit placement, same-layer capture retention, changed-layer invalidation, equipment/access interlocks, stale actions, inspection preview, pending/wrong-layer states, theme/fallback rendering and above-limit interpretation. **Three distinct real-WebGL workflows passed** (1.3 minutes): existing brake separation/service and detailed geometry/close-up regressions, plus the new lesson. The new lesson passed again after the explorer-selection refinement (1.7 minutes including setup/teardown). It checks a physical steel-layer click, both mesh bindings, keyboard lining placement, pending and captured states, same-layer evidence preservation, job switching, 390/320 px reflow, three themes and progression to service. Desktop invalid/valid readings, high-contrast phone, narrow dark-phone and selected 3D pad screenshots were reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Shared viewer unchanged; no broad full-tool suite, deployment or installer build. Existing modified regression images were preserved outside this commit.

- [Why a steel reading cannot establish lining wear](../reports/automobile-workshop/brake-layer-wrong.png)
- [Captured lining and case limit](../reports/automobile-workshop/brake-layer-desktop.png)
- [High-contrast phone lesson](../reports/automobile-workshop/brake-layer-contrast.png)
- [Narrow dark-phone lesson](../reports/automobile-workshop/brake-layer-dark.png)
- [Selected pad in the 3D explorer](../reports/automobile-workshop/brake-layer-3d.png)

## Evidence-based customer handoff guide

An optional writing guide now groups the current job's supporting records into Finding, Service and Verification. Each group has a job-specific prompt, an explicit count of available task records and expandable completed record text. Missing and partial records stay visible as missing; completion flags, live captures and records ahead of the current task do not become evidence. Existing text-only records are retained without inventing numeric snapshots. Canonical task names identify the records, and record text is rendered as escaped text.

The guide starts collapsed. Each writing shortcut selects a relevant prompt, focuses the existing customer handoff field and places the caret at the end without changing the draft. The prompt is linked to the field for assistive technology. Prompts and counts are writing support rather than a grade or an extra completion gate. The learner's own explanation remains per-job, and the existing report download exports those exact words. The guide covers all four work orders, including the oil job's multi-step drain/filter/refill service record.

Validation: **169 workshop model/render tests passed** (12.71 seconds), including twelve new cases for all job mappings, completed-record provenance, partial oil service, older records, malformed/unknown data, canonical labels, source-state purity, collapsed presentation, theme/accessibility linkage and escaped record text. **Three real-WebGL workflows passed** (4.6 minutes): the complete brake-service/handoff flow, the existing voltage-evidence/report flow and the new handoff guide journey. The new journey checks keyboard navigation, caret position, unchanged draft/state before writing, pending live captures until task completion, recorded before/after readings, untouched history, per-job notes, job-specific prompts, 390/320 px reflow, three themes, guide collapse and actual final report contents. Pending/completed desktop, high-contrast phone and narrow dark-phone screenshots were visually reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Shared viewer unchanged; no broad full-tool suite, deployment or installer build. Existing modified regression screenshots were preserved outside this commit.

- [Partially completed record guide](../reports/automobile-workshop/handoff-guide-pending.png)
- [Completed evidence and writing prompts](../reports/automobile-workshop/handoff-guide-desktop.png)
- [High-contrast phone guide](../reports/automobile-workshop/handoff-guide-contrast.png)
- [Narrow dark-phone guide](../reports/automobile-workshop/handoff-guide-dark.png)

## Workshop practice board

A collapsible practice board now shows all four service jobs with their learning focus, current saved task count, next step and start/resume/review controls. The active job is labeled and outlined. The completed-work-order count updates after release; completion requires the final task position together with explicit verification and release flags. A saved record at the final position without those confirmations is marked for review. Progress describes the saved attempt rather than proficiency.

The board and existing job dropdown now share one selection path. The active state takes precedence over a stale saved copy, and switching stores that current state before restoring the selected job. Captured readings, tool choices, adjustments, answers and notes survive round trips. Selecting the current job preserves its state and camera. Record keys are checked against their stored job ID so a mismatched save cannot open the wrong vehicle job; older records without a job ID can still use their keyed job. Board buttons return keyboard focus to the work-order chooser after selection, and the normal dropdown stays available with the board collapsed.

Validation: **182 workshop model/render tests passed** (25.16 seconds), including thirteen new cases for all job statuses, strict completion flags, next-task labels, active-state precedence, input purity, measurement/draft round trips, same-job selection, unknown targets, legacy/mismatched saves and three-theme accessible rendering. **Three real-WebGL workflows passed** (1.4 minutes): the new practice-board journey and existing alignment/handoff persistence regressions. The new journey preserves a captured brake reading, answer and draft through board/dropdown switching, resumes a partly filled oil jug, completes the oil service and handoff, updates the completion count, starts alignment, and returns to the completed oil job. Keyboard focus, unchanged same-job state, 390/320 px reflow and board collapse are checked. Desktop light, high-contrast phone and narrow dark-phone screenshots were visually reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Shared viewer unchanged; no broad full-tool suite, deployment or installer build. Existing modified regression screenshots were preserved outside this commit.

- [Desktop practice board](../reports/automobile-workshop/practice-board-desktop.png)
- [High-contrast phone board](../reports/automobile-workshop/practice-board-contrast.png)
- [Narrow dark-phone board](../reports/automobile-workshop/practice-board-dark.png)

## Live wheel cross-hub path

Wheel reassembly now shows the move from the last accepted fastener to the next target. The 2D diagram draws completed moves as solid lines and the next move as a dashed arrow. A numbered sequence strip labels each check as Checked, Next or Waiting, and a text instruction identifies the current cross-hub move. The 3D wheel has a matching cyan direction arrow between the same fastener positions, complementing the moving wrench, numbered targets and next-fastener ring. The arrow is a visual aid, not an operating control.

The diagram and button centres now use the same regular five-point geometry. Its square aspect ratio scales with the available width, correcting the previous fixed-height layout on narrow screens. Guidance remains inactive until the wheel is seated, ignores rejected/repeated clicks and has no return-to-first move after five accepted checks. Finishing the sequence still requires the explicit reassembly task. Invalid saved sequences receive a review message instead of an invented next move. The authored order, access requirements and existing torque-check abstraction remain unchanged.

Validation: **194 workshop model/render tests passed** in the final run (5.05 seconds), including twelve new cases for seating, every accepted sequence position, rejected/repeated inputs, malformed saved orders, circular geometry, themes, text equivalents and final-arrow removal. Initial new-test failures were fixture argument expansion and equivalent CSS aspect-ratio serialization; corrected the tests and reran the full workshop suite. **Three real-WebGL workflows passed** (2.0 minutes): the full brake-service/handoff regression, moving-wrench/inspection regression and new live-path journey. The new journey checks keyboard and physical-wrench actions, 2D/3D next-target agreement, rejected inputs, per-job persistence, final path removal, explicit task completion, 390/320 px reflow and square-diagram/button containment. Desktop light, high-contrast phone, narrow dark-phone and 3D screenshots were visually reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Shared viewer unchanged; no broad full-tool suite, deployment or installer build. Existing modified regression screenshots were preserved outside this commit.

- [Live direction arrow in the 3D wheel](../reports/automobile-workshop/wheel-path-3d.png)
- [Desktop path and sequence strip](../reports/automobile-workshop/wheel-path-desktop.png)
- [High-contrast phone sequence](../reports/automobile-workshop/wheel-path-contrast.png)
- [Narrow dark-phone sequence](../reports/automobile-workshop/wheel-path-dark.png)

## Scope and remaining opportunities

This is an authored educational simulation. Service actions represent supervised procedures; it does not model wrench forces, hydraulic pressure, component collision, thread engagement, fluid dynamics or every repair operation. The work orders do not supply universal torque/fluid specifications or certify a real vehicle. Exhaust and tool stations currently support exploration rather than separate exhaust-repair or inventory-management jobs.

Useful next expansions would be a suspension inspection work order and broader alignment geometry, instructor-authored fault variants, more detailed transmission geometry, validated vehicle-specific reference data, localized workshop copy, and skill-specific assessments of the learner’s written reasoning. These were not added to the current change.

## Reference checks

- [Automotive Lift Institute: safe lift use](https://www.autolift.org/be-a-smart-auto-lift-user/) — basis for the simulated low-height stability check and load-holding-lock sequence; actual operation requires equipment-specific training.
- [Brembo: brake caliper replacement](https://asia.bremboparts.com/europe/en/support/car/car-fitting/instructions-for-replacing-the-brake-caliper-280503) — piston retraction raises the reservoir level; avoid overflow and damage to painted surfaces.
- [Three.js: cleanup](https://threejs.org/manual/en/cleanup.html) — checked against the existing host’s geometry, material and texture disposal behavior. The workshop uses that lifecycle.
