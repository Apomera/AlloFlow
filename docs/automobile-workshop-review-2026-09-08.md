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

## Scope and remaining opportunities

This is an authored educational simulation. Service actions represent supervised procedures; it does not model wrench forces, hydraulic pressure, component collision, thread engagement, fluid dynamics or every repair operation. The work orders do not supply universal torque/fluid specifications or certify a real vehicle. Exhaust and tool stations currently support exploration rather than separate exhaust-repair or inventory-management jobs.

Useful next expansions would be a suspension inspection work order and broader alignment geometry, instructor-authored fault variants, more detailed transmission geometry, validated vehicle-specific reference data, localized workshop copy, and skill-specific assessments of the learner’s written reasoning. These were not added to the current change.

## Reference checks

- [Automotive Lift Institute: safe lift use](https://www.autolift.org/be-a-smart-auto-lift-user/) — basis for the simulated low-height stability check and load-holding-lock sequence; actual operation requires equipment-specific training.
- [Brembo: brake caliper replacement](https://asia.bremboparts.com/europe/en/support/car/car-fitting/instructions-for-replacing-the-brake-caliper-280503) — piston retraction raises the reservoir level; avoid overflow and damage to painted surfaces.
- [Three.js: cleanup](https://threejs.org/manual/en/cleanup.html) — checked against the existing host’s geometry, material and texture disposal behavior. The workshop uses that lifecycle.
