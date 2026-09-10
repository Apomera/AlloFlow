# Bee drone: plant observation

Added paused close-ups for flowering shrubs, seed grasses and streamside reeds. Each view selects the nearest complete plant clump actually drawn at the current graphics quality, frames it for the available screen width, and provides an observation prompt. The ecology guide also links directly to each view and moves keyboard focus back to the scene.

Shrubs now use a shared five-petal blossom mesh with colored centers, replacing the small spherical blooms without increasing the seven foliage batch draw calls. Flight posts, updraft graphics and route aids hide during plant observation and regain their ordinary visibility when the learner returns to the flight camera. Captions identify the plant forms as illustrative, and explain that plants do not refuel the male drone.

Observation moves only the camera. It does not move the bee, regenerate plants, advance predators, change energy or scores, consume randomness, or add decision evidence. Resuming restores the normal flight view; WebGL context loss clears the observation UI and retains the existing 2D route-map option. The main source and desktop public mirror are synchronized.

## Verification

- 40 focused unit tests passed across plant observation, bird observation, habitat layout, inspection cameras and WebGL runtime.
- Three final real-WebGL browser tests passed: retained Eco ecology, desktop plant observation with quality changes and restoration, and mobile framing/accessibility/context-loss recovery.
- Browser checks verified that every selected plant's component instances are rendered, that scene objects are retained, that observation preserves flight evidence, and that flight markers regain their prior visibility.
- Keyboard operation, 320-pixel layout, light/dark scoped accessibility checks, forced-colors controls and route-map fallback passed.
- Source syntax, scoped whitespace checks and source/mirror parity passed.
- Visually reviewed the final desktop flowering shrub, mobile grass close-up and mobile dark controls, plus the earlier reed streamside view. Images are in `scratch/beehive-flight-deck/plant-observer-*.png` and `plant-controls-*.png`.

Final logs: `scratch/bee-plant-observer-unit.log` and `scratch/bee-plant-observer-final-browser.log`.
