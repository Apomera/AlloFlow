# Practice Mode: object interaction and travel planning

This update builds on the first outing mission with more direct interaction and a situation that requires checking a travel plan again.

## What changed

- **Inspect objects.** Select the bottle, clothing, card, weather note, coat, hat, bag, or door in the 3D room. The inspector shows the object's current state and the actions relevant to it. Matching object buttons provide the same information and choices through keyboard controls.
- **Follow objects into the bag.** Packed items can be selected from the inventory. Their details reflect their current location and condition.
- **See what is interactive.** Objects highlight on hover and selection, and the caption identifies the object. A closer camera view follows the selected station; the whole-room view is one button away. Camera and inspection controls do not advance the practice clock.
- **Track arrival time.** The travel card shows the selected route, expected arrival, and minutes before or after the outing starts. A comparison lists the available routes. Selecting the card opens the travel choices.
- **Respond to a bus delay.** The new “Rain and a bus delay” situation changes the early bus's arrival from 09:30 to 09:45 during preparation. A previously feasible bus plan becomes late. The learner can change to the walking route or an arranged ride. Choosing a ride is a valid planning strategy; it does not lower the recorded evidence.
- **Choose the situation.** Practice settings now offer changing weather, warm weather, or rain with a bus delay. The debrief also provides a shortcut to the delay situation.
- **Review consequences.** A short history shows the latest four decisions and their original consequences. Change notices now sit next to the action controls, including on phones.

Inspection is separate from acting. Looking at a bottle or opening a bag does not fill, pack, or complete it, and does not spend practice time. The action buttons in the room and the structured interface still dispatch to the same engine. These additions make no model calls.

## Saved-practice compatibility

New practices use mission rules version 2 while retaining the existing save format. Version 1 practices remain readable and continue under their original rules. The new arranged ride and delayed-bus situation belong to version 2. A replay or newly configured practice receives its own save; saving cannot silently replace the rules version of an existing run.

## Verification

**26 focused tests passed** across the engine and page-interaction suites. The added checks cover:

- A bus plan becoming late and recovery through either walking or an arranged ride.
- Version 1 replay and protection against overwriting it with a different rules version.
- Object inspection through both scene events and keyboard controls without journal changes.
- Packed-object inspection, current arrival information, recent consequences, and new-situation selection.

The two tests that each create two complete standalone page instances now allow 15 seconds for setup and interaction on Windows. Their assertions remain unchanged.

Manual Chromium verification included actual raycaster selection of the bottle, the closer camera, and a full work-context outing: the selected bus arrival changed to 09:45, departure was blocked until the plan was corrected, and the arranged ride produced an arrival of 09:27. Repeated inspection kept the renderer's texture count stable at seven in the checked scene.

At an emulated 390-pixel phone width, the object inspector had no horizontal overflow. The checked page reported zero automated axe violations for WCAG 2 A/AA and WCAG 2.1 AA. Contrast review remains manual for decorative glyphs and the caption over the canvas; the rendered layout was inspected. These checks do not substitute for testing with learners and assistive technologies.

## Main files

- [Simulation rules and object descriptions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/engine.js)
- [Interaction and scene controls](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/outing.js)
- [Page structure](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/life_skills_outing.html)
- [Responsive styling](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/outing.css)
- [Engine tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/life_skills_outing_engine.test.js)
- [Interaction tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/life_skills_outing_ui.test.js)

The matching public assets are updated for the local desktop preview. The next useful product check is a short learner session: can the learner find an object, distinguish inspection from action, explain the changed arrival, and choose an appropriate response without unnecessary navigation?
