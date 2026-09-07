# Forces and Motion illustrated edition

Completed September 7, 2026. Grade 3. Local artifact; educator review and live publication remain pending.

The pack contains 24 distinct embedded images (10 glossary images and 14 lesson panels), preserves the original 10 resource IDs and activity types, and adds four native image resources. The downloadable JSON is about 0.57 MB. Artwork has no baked-in text; seven native editable labels and fourteen captions carry lesson language. Every image has a reviewed description, vision provenance, and a matching native image hash.

Output: allopacks/illustrated/forces_motion_grade3.allopack.json.
Source PNGs, optimized WebP files, exact accepted prompts, alt text, and image mappings: allopacks/media/forces_motion_grade3/.

## Content and visual review

Revised reading, glossary, chart, memory aids, sorting, frames, quiz, FAQ, and investigation directions. Balanced forces permit rest or constant speed in a straight line. A kick does not remain as a continuing force after contact. Friction opposes relative sliding and also provides grip; floor contact and air resistance can slow a rolling ball. Action and reaction act on different objects. Controlled investigations repeat releases without an extra push and use approximate predictions instead of guaranteed outcomes.

Three first-pass illustrations were replaced: an unwanted arrow could confuse friction direction; repeated trials showed extra balls; and a ramp comparison did not clearly show the intended height difference. Captions distinguish arrows representing motion from arrows representing force. The shoe caption describes grip without inferring the direction of force from a still image. The ramp comparison is a schematic setup, not measured experimental evidence.

Primary content references:

- [NASA: Newton laws of motion](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-laws-of-motion/)
- [NASA: Action and reaction](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-third-law-action-reaction/)
- [NGSS: Grade 3 forces and interactions](https://www.nextgenscience.org/topic-arrangement/3forces-and-interactions)

## Verification

317 focused tests passed across six illustrated-pack and catalog suites, including six new Forces and Motion checks. Tests cover native hashes and alt descriptions, 24 unique embedded assets, preserved resources, artifact-contract validation, JSON round trips, stale/decorative alt handling, and science/answer consistency.

The component integration harness passed CommunityCatalog load and actual Download JSON actions using local catalog responses, the production loadProjectFromJson bridge and MiscHandlers loader, offline reopen, preservation of resource values, decoding all 24 images, all 14 native panel alt attributes, and bounds for all seven mobile labels. Mobile screenshot preview was visually inspected.

Report and screenshots: scratch/forces_motion_grade3-qa/. This is production-component integration with local responses, not a live deployment, full signed-in teacher session, or teacher-edited Save Project test. AI visual/content review is complete; educator review is pending.

## Rebuild and publication

Run node dev-tools/build_forces_motion_illustrated.cjs and node dev-tools/qa_forces_motion_illustrated.cjs. The content refinements are in dev-tools/refine_forces_motion_content.cjs; focused tests are in tests/allopack_forces_motion_illustrated.test.js.

For live publication, follow docs/CLAUDE_HANDOFF_ILLUSTRATED_ALLOPACK_PUBLISH.md. Add only the intended illustrated pack through the published-pack manifest used by catalog/generate_index.js. Preserve source authorship and CC-BY-4.0 metadata. No catalog publication, commit, or push was performed in this task.
