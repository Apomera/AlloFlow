# Anatomy tool: UI, UX, and visual review

September 27, 2026

## Assessment

The tool has a broad learning sequence: explore a structure, read its function, locate it in another representation, practise recall, and revisit saved notes. Its main design problem is the amount of navigation around that sequence. Several past improvements now overlap, and the model often appears well below the first screen.

This pass fixes the clearest navigation and rendering defects. The next design effort should simplify the desktop header and standardize the presentation of learning panels. Adding more modes would increase the navigation burden.

## Changes implemented

| Finding | Change | Evidence |
| --- | --- | --- |
| Phone Explore displayed two body-system selectors and two independent More controls buttons. The study disclosure also hid the search field. | Explore now owns one system/level group and one disclosure. Search stays visible when extra settings are closed. Quiz, Cards, and Homeostasis retain their study controls. | Browser tests exercise both disclosure states, searching for Femur, changing level, and switching between Cards and Explore. |
| First-visit instructions and the full zoom/pan block pushed the body down the page. | Instructions expand on demand; the tour and Just explore actions remain visible. The 2D control disclosure shows the zoom percentage and opens with the keyboard. Larger text mode opens the camera controls automatically. | Phone model container moves from 714 to 566 CSS px from the page top. The diagram begins at 807 px in a 390 × 844 viewport. |
| The active skeletal layer was painted at 50% opacity with a pale outline, making bone boundaries hard to distinguish. | Skeletal mode now uses 95% opacity and a darker outline. Other systems retain the quieter skeletal context. | Before/after atlas captures. Geometry and teaching pins are unchanged. |
| The clinical heart was visibly cropped even though the viewer reported a successful load. Imported organs were scaled using height alone. | Clinical organs now fit using their bounding sphere and the camera's narrower field of view. The whole-body pedestal is hidden in Clinical Atlas. | Actual rendered heart and kidney bounds fit inside the viewport. Heart rotation and Reset were checked. |
| The small 2D fullscreen target was difficult to use on phones. | Its mobile hit area is at least 44 × 44 px. | Responsive styles and phone capture. |

The desktop and canonical runtime sources have matching SHA-256 hashes. New controls reuse existing translated labels.

## Measured layout changes

These measurements use the local anatomy module with the app's compiled stylesheet, without the full application shell. The initial Explore state is a fresh grade-5 profile. They describe this sampled state, not every possible lesson.

| Measurement | Before | After |
| --- | ---: | ---: |
| Desktop model-container top, 1440 × 1000 | 814 px | 728 px |
| Phone model-container top, 390 × 844 | 714 px | 566 px |
| Phone body-system selectors visible in Explore | 2 | 1 |
| Phone search visible with settings closed | No | Yes |

The figure is easier to reach, but the first phone screen still shows only the top of the diagram. A larger layout redesign could bring more of the figure into view.

## Review across activities

| Area | What works | Next refinement |
| --- | --- | --- |
| Explore | Search across systems, a readable structure directory, previous/next browsing, and explicit return-to-atlas actions. | Merge the mission, context, and mode-description bands into a shorter header. Retain the system selector and clear selected-structure context. |
| Tour and Pathways | Short guided sequences and named steps give learners a route through a large tool. | Make the current objective, diagram, and next action a single visual group. Keep secondary discovery cards below the active lesson. |
| Quiz, Cards, and Spotter | Cards distinguish hidden answers from revealed content; quiz choices are large; Spotter offers untimed practice. | Make typography and action hierarchy consistent. During a question, visually subordinate the fact card and unrelated extension actions. |
| Connections | Named topics explain relationships between systems. | Reduce the long initial list: show compact topic rows or group topics by the current system, preserving access to all topics. |
| Homeostasis | The prediction task gives the learner a reason to manipulate the model. | Give the feedback experiment the main visual area; the generic body diagram adds little to the initial temperature task. |
| AI tutor | The initial state explains how to choose a structure and offers starting questions. | Validate a complete tutor conversation separately, including the unavailable-service path and references. This review did not call a live AI provider. |
| Imaging | The slice, orientation aids, and BodyScope explanation connect multiple representations. | At small sizes, prioritize labels for the selected structure and use a nearby text list for secondary labels. The sampled chest view places many labels close together. |
| Procedure | The seven-step sequence and scan-plan action establish the task order. | Keep the current step and objective visible while configuring a case. A complete simulation needs a separate task-level review; this pass inspected its initial screen. |
| 3D views | Surface has useful lighting, regions, and camera presets. Model descriptions distinguish the representations. | Blueprint is visibly a wireframe mannequin with locator spheres. Future internal anatomy should use validated meshes with registered landmarks so labels stay attached to the correct geometry. |

## Priorities for the next iteration

1. **One compact desktop header.** Keep activity, system, learning level, and search together. Put progress and optional extensions behind clear disclosures. Target the model and first learning action within a 1280 × 800 viewport after onboarding is dismissed. Verify keyboard focus and enlarged text before replacing the current layout.
2. **Consistent reading size and hierarchy.** Many helper labels and explanations still use 10–12 px text. Establish a small set of text sizes, increase core reading copy, and reserve the strongest filled button for the next action. Check long translations and RTL layouts as part of that work.
3. **More informative anatomy visuals.** Prioritize a few accurate internal structures and useful cutaways over additional decorative detail. Each asset needs clear provenance, a matching structure identifier, and checked landmarks. Keep the Surface model's purpose visible; its mesh is an external-body reference.
4. **A clear activity finish.** Bring the learner's next step close to completion feedback: retry missed structures, review the relevant card, or return to the current system. Evaluate this through a short explore → locate → recall task with learners.
5. **Consolidated layout rules.** The anatomy module contains successive CSS overrides for the same headers, controls, and breakpoints. The mobile duplication fixed here demonstrates the risk. Extract and consolidate those rules with the new browser tests protecting default Explore and study states.

These are proposed next steps, not implemented features.

## Verification

- **121 unit checks passed** across UI polish, view/model controls, compact settings, canvas lifecycle, muted layers, structure browsing, clinical atlas integration, heart content, clinical substructures, and 3D presentation.
- **Three browser scenarios passed:** the new phone-entry workflow; Blueprint → bundled Surface → clinical heart/kidney → 2D; and the existing explorer navigation/focus scenario. The final clinical scenario includes geometric framing assertions.
- All eleven initial activity screens were rendered and visually reviewed. The render audit reported zero page errors and no horizontal overflow in its sampled states.
- Additional responsive checks passed at 320, 390, 768, and 1280 px.
- Scoped Axe scans of changed navigation/camera controls and existing detail navigation reported zero violations in light, dark, and high-contrast themes. These are scoped automated results, not a complete accessibility certification.
- JavaScript syntax, scoped whitespace checks, and source/mirror parity passed.

The checks use local Chromium and real WebGL rendering. They do not establish real-phone GPU performance, complete screen-reader behavior, full localization quality, clinical accuracy, live AI response quality, or deployed-build parity. No production deployment was made.

For subsequent accessibility work, keep the surrounding controls usable at the [W3C reflow target of 320 CSS px](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). The 44 px touch target used here is an ergonomic choice; [WCAG 2.2's minimum target criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24 px with specified exceptions. Expand/collapse controls should retain keyboard operation and exposed state, as described in the [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).

## Files and evidence

- [Canonical anatomy module](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js)
- [Browser regression](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/anatomy-entry-clarity.spec.ts)
- [Before audit](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/before-audit.json) and [after audit](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/after-audit.json)
- [Phone before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/before-phone.png) and [phone after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/after-phone.png)
- [Phone first screen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/phone-first-screen.png)
- [Surface region view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/surface-region.png)
- [Clinical heart](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/clinical-heart.png) and [clinical kidney](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/clinical-kidney.png)
- [Entry validation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/entry-validation.json), [clinical framing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/clinical-framing.json), and [unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-ux-review-2026-09-27/unit-results.json)
