# Be the Water: movement choices

The navigation bar now exposes Tap steps alongside Guide my movement. The default remains held keyboard or on-screen controls. Tap steps turns each activation into a bounded 0.35-second steering input; repeated keydown events do not add steps. Native pointer, keyboard, and synthesized button clicks all use that bounded input. Paused activations are not queued.

Flight options now explains the movement choices and offers Standard or Gentle manual steering. Gentle scales manual thrust and horizontal steering to 45 percent. It does not scale the simulation clock, wind, gravity, or automatic guidance. Manual steps temporarily override guidance using the existing assistance gate.

The scene toolbar has a Look panel with left, right, up, and down camera buttons. These work while paused. Done or Escape closes the panel and returns focus to its toggle. The control deck labels tap mode explicitly. On narrow phones, the navigation row stays compact and all six toolbar actions remain visible.

Pending steps clear on pause, input-style changes, canvas/window focus loss, reset, scenario changes, checkpoint restoration, and page hiding. Camera movement requests are also cleared with general input cleanup. Both application copies are synchronized.

Validation:

- 129 tests passed across pilot experience, physics kernel, and navigation suites; results are in `pilot-movement-regressions.json`.
- `watercycle_pilot_movement_qa.cjs` measured a normal liquid step near 4.2 world units and a gentle step near 1.89, checked no repeat while holding a key, paused-click rejection, pause/blur cancellation, synthesized-click activation, camera buttons while paused, Escape/focus return, and desktop/390px/320px accessibility.
- `watercycle_pilot_controls_qa.cjs` passed compact scene placement, all five mobile modes, original controls and options, preference updates, map closing, and focus return.
- Phone navigation and the in-scene camera panel were visually reviewed in Chromium with SwiftShader. This does not benchmark hardware GPU performance.

The physics kernel is unchanged; these are new ways of controlling the existing educational parcel simulation.
