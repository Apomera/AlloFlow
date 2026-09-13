# Geometry World: guide graphics and richer activities

This pass makes exploration easier to follow and improves the visual consistency of the guides. It also expands two existing lessons and corrects their geometry and arrival points. Changes are local in the canonical web modules and mirrored desktop modules; nothing was committed or deployed in this pass.

## Guide graphics and navigation

- Cream and sage nameplates separate a guide's name from its authored location. Question, completed-question, and ungraded discovery markers use drawn symbols. Ungraded guides no longer appear to have unanswered questions.
- A learner can choose **Track this activity** in the journal. It closes the journal and highlights the matching guide on the compass, world nameplate, and lesson route. Browsing another activity does not move that pin. **Stop tracking** clears it independently of notes and review marks.
- Tracking is stored in the existing per-lesson journal. Loading another world clears the engine target immediately; a saved matching lesson restores its own valid target.
- **L** announces the tracked guide's distance and relative direction. With no tracked activity, it retains nearby-character guidance. Visible shortcut help and screen-reader instructions describe both behaviors.
- The compass now derives its bearings from the camera's forward and right vectors. This corrects the previous yaw-sign error while preserving accurate off-screen arrows.
- Close guides show an **E / Talk** keycap on desktop and **Tap Talk** on coarse-pointer devices. High-contrast colors include readable subtitles. Guide text is not dimmed by scene tone mapping.
- Existing sprites and canvas textures are repainted only when their relevant state changes. Showcase keeps NPC objects hidden and avoids late sprite allocations. Normal lesson clearing retains texture disposal.
- The former **Free Build / Sandbox studio** shortcut is now **Open Free Build / Create in a sandbox**, making its navigation purpose clear during a lesson.

Tracking never teleports the learner. **Go to this activity** remains the explicit travel action. Activity notes and review marks remain self-review rather than automatic grading.

## Lesson depth and correctness

**Area & Surface Area** now has five activities: base area to volume, equal-volume comparisons, alternating layers, complete surface area, and a learner-built prism. The two 72-cube examples expose 108 and 114 square units respectively, supporting an actual surface-area comparison. An empty sand pad accommodates separate student designs.

**Composite Volume** now has four activities: a two-color T, a stepped pyramid, an open U, and a student-built 50-unit step. The T's stem previously contained 30 cubes while its assessment expected 20. Its revised geometry contains 48 blue plus 20 gold cubes, totaling 68. The U explanation counts shared corners once. The suggested student step fits on the pad and measures 50 occupied units inside a 60-unit bounding box.

Both presets retain their assessment counts and provide safe ground-level spawn, guide, and activity locations. The nine added activities supply challenges, hints, success criteria, and reflection prompts. See [preset validation](GUIDED-PRESET-VALIDATION.md) for model counts, measurement evidence, and screenshots.

## Validation

Final combined coverage: **1106 passing tests across all 61 current Geometry World test files**, with no remaining failed assertions. The initial full run found seven outdated test-fixture assertions. The final 98-test rerun verifies their corrections, the actual reduced-motion helper scope, texture quality, compass orientation, and shape controls. Original and rerun results are retained separately; the final inventory is recorded in [verification-summary.json](verification-summary.json).

**104 completed browser assertions passed**, with no runtime or console errors: 43 lesson/entry checks, seven guide-graphics checks, 45 desktop/responsive tracking checks, and nine native-touch checks. A combined tracking run timed out starting its second page; the isolated touch retry passed. An optional night-settings screenshot step also hit a harness selector timeout, so night appearance remains visually unverified.

Canonical and desktop modules are byte-identical, both parse successfully, and the targeted Git diff check is clean. Guide screenshots were inspected at ordinary, close, question-bearing, and high-contrast views; lesson overviews and small-screen journal captures were also inspected.

See [tracking QA](tracking-qa-notes.md), [guide visual QA](GUIDE-VISUAL-REVIEW.md), and [lesson QA](GUIDED-PRESET-VALIDATION.md) for detailed evidence.

The browser harness uses the local canonical modules with real React and Three r128/WebGL. It does not claim to verify Gemini Canvas deployment, a physical mobile device, or physical printing. No paid AI or TTS generation calls were made for this pass.

## Source and evidence

- `stem_lab/stem_tool_geometryworld.js` and `stem_lab/stem_tool_geometryworld_builder.js`
- Matching modules under `desktop/web-app/public/stem_lab/`
- `tests/geometry_world_activity_tracking.test.js`
- `tests/geometry_world_npc_visuals.test.js`
- `tests/geometry_world_guided_preset_correctness.test.js`
- Updated shortcut assertions in `tests/geometry_world_wayfinding.test.js`
- Updated production-helper fixtures in `tests/geometry_world_reduced_motion.test.js` and `tests/geometry_world_visual_pipeline.test.js`

The new tests read production source directly. Review fixtures and patch scripts are implementation evidence, not runtime or test dependencies. Existing richer generation controls, coastal scenery, construction budgets, editable import/export, and Print Lab behavior are preserved by the broader Geometry World regression suite.
