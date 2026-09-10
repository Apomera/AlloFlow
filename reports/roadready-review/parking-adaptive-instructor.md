# Parking instructor: corrections and visibility

- A valid stopped parking position advances to the final check even when reached through corrections rather than every demonstration cue. The learner must still explicitly secure the car.
- Final-step advice updates when alignment or clearance becomes invalid, then clears after correction. Contact feedback retains priority, and reset restores the opening instruction.
- The instructor now appears directly after the scene on phones, followed by controls and measurements. Updated instructions are announced politely to assistive technology.

Validation: four focused unit tests passed, including the complete maneuver at 30/60/120 FPS with immediate and delayed reactions. Five browser scenarios passed across the run: guide discovery/reset, adaptive corrections, pause/scoring, contact recovery, and the full guided maneuver. Reviewed the 320-pixel screenshot with no horizontal overflow. Syntax, whitespace, and canonical/desktop parity checks passed.

The original full-maneuver browser driver twice missed steering cues while the environment was slow. It now observes rendered instructions inside the browser and sends bubbling keyboard events through the real input handlers, avoiding protocol delays between cues and steering. The final run followed all cues, secured the car at 100/100 with zero contacts, and reported no browser errors. Initial unit-launch approval timeouts were resolved by the later focused run.

Screenshot: `parking-adaptive-coach-320.png`. Changes remain local and undeployed.
