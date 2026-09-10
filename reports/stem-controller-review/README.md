# STEM input and controller review

## Implemented follow-up

The shared STEM host now provides a **Controls** panel with explicit automatic, keyboard/mouse, controller, and on-screen modes. Saved settings include per-tool keyboard/controller bindings, a one-hand keyboard preset, controller selection, deadzone, Road Ready steering sensitivity/inversion, axis-pedal calibration, and a reset action. The live device display helps identify nonstandard axes and buttons.

Road Ready parking now consumes analog steering and pedals, with Drive/Reverse selection only while stopped. Choosing keyboard/controller hides movement buttons; Pause, settings, parking completion and unbound shoulder checks remain available. On-screen controls return after disconnect, and users can keep them visible or enlarge them. Driving layouts update even while paused. Parking hints show saved bindings.

The shared adapter emits one correctly named press/release per action, releases held inputs on interruptions, waits for neutral on reconnection, protects editable fields, and does not also emulate keys for native Road Ready. Sampling stops while idle, hidden, blurred, or outside an active tool.

Coverage: current regression suites are `tests/stem_input_controls.test.js`, `tests/stem_input_performance.test.js`, `tests/roadready_controller_parking.test.js`, and `tests/e2e/roadready-input-settings.spec.ts`. Road Ready parking, rules, view and driving regression suites supplement them. Browser captures are alongside this report. Physical wheel/adaptive-device testing and tool-specific action maps for every STEM activity remain future work; the generic adapter still depends on each tool’s keyboard/pointer support. Touch visibility tagging currently covers Road Ready, not arbitrary educational buttons in other tools. Changes are local and have not been deployed.

## Original audit (before implementation)

Reviewed all 149 `stem_tool_*.js` module files in `stem_lab`, the shared STEM host, Road Ready's native driving and parking inputs, and Raptor Hunt's custom keyboard settings. This is a source inventory plus execution of the actual shared gamepad adapter in jsdom using simulated input. It is not a physical Xbox/PlayStation/wheel/accessibility-device compatibility certification, or an end-to-end test of every tool. The following findings describe the original pre-implementation state.

`controller-audit.json` contains the complete module inventory and reproduced event traces. Its keyboard/pointer flags identify source signals, not guaranteed device support. `reproduce-adapter.cjs` is retained as the historical reproduction for the original adapter; use the current tests above to verify the replacement.

## Original behavior

| Area | Existing behavior | Customization |
| --- | --- | --- |
| Shared STEM host | Converts a standard gamepad's sticks/buttons into synthetic keyboard/mouse events. Left stick is WASD; right stick is arrows. The mapping is largely oriented around building/exploration tools. Stick movement becomes digital on/off beyond a fixed 0.2 deadzone. | No shared controller remapping, controller selector, calibration, saved hardware profiles or sensitivity UI found. |
| Road Ready 3D driving | Direct analog steering and trigger input; face buttons for horn/camera/signals, D-pad for gears/signals, Start for pause, shoulders for lighting. Has pause/neutral rearming and analog-input clearing on disconnect. Uses the first available controller. Keyboard and touch driving controls also exist. | Fixed mappings; no user-facing gamepad or keyboard remapper found. Steering threshold is fixed at 0.1. Ride-Along is an existing assistance option on supported courses, separate from manual evaluations. |
| Road Ready parking | WASD/arrows and hold-to-operate touch buttons. Parking motion reads keyboard-style flags; it does not consume the native driving analog values. | No parking-specific controller profile. The host bridge can feed movement keys, but mappings and trigger behavior do not match the driving mode. |
| Raptor Hunt | Classic, arrows, left-hand-mouse/IJKL, simple and custom keyboard profiles, with per-action rebinding, missing-binding warnings, and a contextual key guide. Settings are written into tool data. | Yes, custom keyboard mappings. This is not a shared hardware/gamepad configuration editor. |
| GeoSandbox | Separate WebXR controller input, including right-stick shape adjustments and haptics. | Specialized XR behavior, not a general controller profile system. |
| Other scanned modules | No other direct `getGamepads()` readers found. Controller behavior depends on whether the shared synthesized inputs match the particular tool's keyboard/pointer handling. | No other custom-keyboard-profile implementation found by the scan. Tool-specific comfort settings exist, such as Moon Mission's reduced look sensitivity. |

Relevant source anchors: `stem_lab/stem_lab_module.js:3333`, `stem_lab/stem_tool_roadready.js:6024`, `stem_lab/stem_tool_roadready.js:9303`, `stem_lab/stem_tool_raptorhunt.js:573`, and `stem_lab/stem_tool_raptorhunt.js:10848`.

## Confirmed adapter defects

1. **Button release is lost.** `_gpBtnPressed` updates the previous-state record before `_gpBtnReleased` reads it. A simulated A press/release produced a keydown with no keyup.
2. **Keyboard key values are incorrect.** The adapter sends Space with `key: 'space'`; handlers such as parking expect `key: ' '`. Shift and digit conversions also use code-like names instead of the appropriate key values. See the [W3C keyboard key definitions](https://www.w3.org/TR/uievents-key/).
3. **Focused controls cause duplicate events.** It dispatches to the document and then to the focused element, whose event bubbles back to the document. One stick movement produced two KeyD keydowns in the reproduction.
4. **Disconnect does not release held input.** The adapter switches polling off without emitting keyups or clearing its axis/button state. The simulated disconnect after a held stick produced no release.

Additional source findings: the adapter has no active-tool ownership or teardown mechanism. Road Ready also polls the same device directly. For example, B is camera in Road Ready's native mapping, but the host synthesizes Escape; Road Ready's keyboard handler uses Escape to leave the drive. This conflicting route is established in code, though it was not tested with physical hardware. The generic help panel's broad support claims therefore exceed what this review can substantiate.

## Recommended improvements, in order

1. **Make the shared input foundation dependable.** Fix the reproduced event issues. Give exactly one active tool ownership of a controller, release inputs on blur/disconnect/tool changes, and require neutral before resuming motion. Preserve keyboard focus in forms and modal dialogs. A native tool must not also receive the generic emulation of the same gamepad input.
2. **Add one Controls panel across STEM.** Show the connected device and live input activity. Offer keyboard/gamepad/touch tabs, recommended tool-specific defaults, per-action rebinding, conflict detection, reset-to-default, and saved profiles with per-tool overrides. Include controller selection, stick deadzone, sensitivity, axis inversion and trigger calibration. Keep a visible pause/stop action available.
3. **Unify Road Ready driving and parking.** Use the same steering and pedal actions in both modes, retaining analog precision in parking. Provide clear Drive/Reverse/Park selection and a compact beginner layout containing only the controls needed for the current lesson; put secondary controls behind More controls. Preserve the learning rules and stopped-before-shifting checks.
4. **Reduce physical and cognitive effort.** Provide large scalable controls, left/right layout options, a one-hand preset, contextual prompts that reflect the user's actual bindings, and safe hold/toggle choices for noncritical actions. Keep braking and pause prominent. A short stationary practice screen should let learners test steering/pedals before starting a lesson.
5. **Roll out by interaction type.** Validate driving, flight/exploration, building, and point-and-click tools separately. Extend Raptor Hunt's successful preset/rebinding pattern through shared action definitions rather than applying the same keys to every activity.

The browser Gamepad API exposes analog axes and buttons and can represent wheels/pedals as well as gamepads, but hardware layouts require recognition or calibration; see the [W3C Gamepad specification](https://www.w3.org/TR/gamepad/). Wheel and adaptive-controller profiles should be validated with the intended devices before being advertised.

Suggested acceptance checks: exactly one press/release per action, no stuck input after disconnect or switching tools, no simultaneous generic/native processing, consistent saved bindings and help labels, keyboard-only settings navigation, and successful analog parking/driving with standard, remapped and nonstandard test layouts.
