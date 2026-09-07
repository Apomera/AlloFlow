# School Store, reinforcement, Sculpt, and Print Lab refinements

The existing workflow is now easier to demonstrate: describe an object, create editable parts, revise them in Sculpt, return to Print Lab at the same physical scale, compare material use, and prepare the existing private staff-review handoff.

## Changes

- **Private savings goals:** the device preference is scoped to the student, school, and academic year. A different signed-in student no longer inherits the previous student's selected prize. The old unowned preference is discarded rather than assigned to an account. Goals remain optional and never change the point ledger.
- **Safer recognition worksheets:** CSV exports neutralize formula-like codenames, group labels, and reason text. Quoting a CSV cell alone does not prevent spreadsheet formula interpretation. The roster grouping map also accepts unusual group keys without colliding with JavaScript object properties. See [OWASP's CSV injection guidance](https://owasp.org/www-community/attacks/CSV_Injection).
- **Description to editable model:** Print Lab now offers example descriptions and a direct **Edit this model in Sculpt 3D** action for any primitive recipe. Sculpt retains manual part controls and Undo. Description fields can receive the device's keyboard dictation; users review the recognized text before selecting Create or Refine. There is no new in-app microphone recorder. AI responses still require the configured provider and may take time.
- **Resilient generation:** a delayed Sculpt response cannot replace a newer manual model or write after the editor closes. Synchronous provider failures recover without leaving the control busy. The previous model remains in Undo after a successful generation.
- **Continuous print context:** the local Print Lab → Sculpt → Print Lab path carries physical scale and AI disclosure. New AI generation also persists its disclosure when Print Lab is reopened. A revision still requires fresh preflight and slicer evidence; earlier manufacturing approval does not travel with the changed design.
- **Honest estimates:** the older material calculation uses an assumed 22% shell fraction. Its result is now described as a rough scenario, not an upper bound on actual filament use. The method identifier explicitly records that assumption.
- **Strength and material savings:** the Materials tab includes review guidance and a two-run slicer comparison. For example, 20 g → 14 g displays **6 g less / 30%**, while 100 min → 120 min displays **20 min more / 20%**. Missing, zero, negative, non-finite, and excessive inputs do not produce a comparison. The scratch values do not modify quotes, points, evidence, or jobs.

## Administrator demonstration

Run `npm run demo:school-store`, then open [the local school demo](http://127.0.0.1:8767/). The new **Try design and material planning** link opens [the design walkthrough](http://127.0.0.1:8767/design).

1. Enter a description such as “A small turtle with a broad flat base.” Select **Create editable recipe**. The demo prominently explains that its fictional AI response always produces the same turtle. It makes no call to an AI service.
2. Set **Millimeters per model unit** to 8. Select **Edit this model in Sculpt 3D**, add or reshape a part, and use the Sculpt **Print Lab** button to return.
3. Run **Preflight**. Verify that the scale remains 8 and that the new model is being checked. In **Submit**, review the AI disclosure.
4. Open **Materials**. Read the strength review prompts, then compare fictional slicer results of 20 g / 100 min and 14 g / 120 min. Point out that saving material may increase print time.
5. Return to the store demo and follow the [existing administrator walkthrough](school_store_admin_walkthrough.md) for recognition, a private model submission, staff quote, point reservation, checkout, fulfillment, and refund.

The demo uses actual editing, preflight, export, and store logic with fictional records and a fictional AI response. It does not send mail, spend real points, call Google, or control a printer.

## What Print Lab can say about strength

Mesh topology, printer-bed fit, and physical scale can reveal preparation problems. They do not establish load capacity. Strength also depends on material, layer direction, walls, joints, bonding, print settings, and the conditions of use. The new panel makes those review decisions visible.

Review perimeters and top/bottom thickness alongside infill. A lower-infill candidate should be compared and tested for its actual use. [Prusa's perimeter guidance](https://help.prusa3d.com/article/layers-and-perimeters_1748) and [infill guidance](https://help.prusa3d.com/article/infill_42) explain why infill percentage alone is an incomplete strength measure.

Orientation, fewer overhangs, appropriate dimensions, and small prototypes are useful experiments. A uniform reduction to 80% of each dimension makes geometric volume 51.2% of the original; that does not promise a matching filament saving, because walls, supports, purge, and joint requirements differ. Consult [Prusa's modeling and orientation guidance](https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135), then compare outputs from the school's actual slicer.

There is no finite-element analysis, automatic topology optimization, guaranteed wall-thickness measurement, boolean union, automatic hollowing, or structural certification in this change. A functional or load-bearing object needs a qualified reviewer to define loads and acceptance tests. Display pieces are a practical starting point for the administrator demonstration.

## Refinement opportunities after the pilot

The existing reinforcement design already separates earned growth from spendable points, recognizes asking for support and individual progress, and keeps recognition history private. Preserve those properties. Useful next pilot questions are whether students can find a personally meaningful goal, whether no-cost privileges belong in the catalog, and whether staff can recognize effort consistently without comparing students publicly.

The strongest next manufacturing integration would be a reviewed slicer adapter that compares orientations, support use, walls, and infill for exact model revisions. It should return material/time estimates and inspectable layer previews before staff approves a quote. Automatic hollowing or strength optimization should wait for a geometry engine and an agreed printer/material validation set.

The classroom recognition worksheet still requires a teacher to match codenames to managed identities and award points in the portal. It is not an automatic token-to-school-point conversion. Device dictation privacy and any real AI provider remain governed by the school's configured services.

## Validation

**587 checks passed across 24 test files**, plus the two complete browser walkthroughs. Machine-readable results and screenshots are in `reports/school-store-refinements-2026-09-07/`. The final summary records the latest result for each test file rather than counting repeated tests twice. Browser checks cover both the complete store lifecycle and the description → Sculpt edit → scaled preflight → material comparison path, including a 390-pixel viewport.

Live managed-account deployment, the configured AI service, and actual slicer/printer acceptance remain separate checks. No district deployment was performed.
