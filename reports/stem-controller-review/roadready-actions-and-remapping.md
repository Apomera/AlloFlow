# Road Ready controller actions and press-to-assign

- Right-stick left/right now holds the corresponding shoulder check. The view temporarily uses the cockpit while looking, then returns to the selected camera on release. Pause, navigation and disconnect clear controller look input without overwriting keyboard or touch holds.
- D-pad down selects Reverse consistently. Park uses its separate Back/View action; shifting still requires the existing seatbelt/mirror startup sequence and a complete stop.
- Controls now offers **Press to assign** for each controller action. It waits for the initiating button to release, detects a button or moved axis, identifies conflicting assignments, and saves valid mappings. Escape or the Cancel button stops capture without closing settings. Device/profile changes and disconnects cancel capture.
- Signed axis conflicts are checked against full-axis bindings. Axis-pedal assignments prompt users to save released/fully pressed calibration positions. Existing saved wheel/pedal profiles that already use axis 2 keep that assignment; the new shoulder defaults are left unassigned in those profiles.
- Driving settings show current shoulder-check and gear bindings. Parking hints now include Park and Pause. Nonstandard sources use readable Button/Axis labels.

Validation: 150 targeted unit/runtime and Road Ready view tests passed. Browser scenarios exercise actual remapping, conflict recovery, saving, Escape cancellation, shoulder-check release/disconnect, repeated Reverse selection and separate Park selection. Related Road Ready input and shared Ratio Lab navigation regressions were also exercised. Test sources are `tests/stem_controller_learning.test.js` and `tests/e2e/roadready-controller-actions.spec.ts`.

Physical wheels, pedals and adaptive controllers still need hardware testing. These changes are local and have not been deployed.
