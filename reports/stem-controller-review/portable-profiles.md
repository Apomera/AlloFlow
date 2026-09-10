# Portable controller profiles

Controls → **Save or transfer this setup** now exports a JSON profile containing the current tool’s controller mappings, activity/parking key overrides, calibration, and comfort settings. Files omit hardware identifiers and the current input method, so they can be applied to the controller selected on another device.

Import reads and validates the complete file before making changes. The user can expand **Review imported bindings**, apply the profile, or cancel. Import replaces only the current tool/selected-controller profile. Sensitivity and layout settings require an explicit checkbox; the existing input method, selected device, and other tool profiles are preserved.

Validation rejects wrong tools/versions, oversized files, unknown fields, reserved or duplicate keys, overlapping controller mappings, incomplete/invalid calibration, and out-of-range settings. Failed validation leaves saved configuration unchanged. Applying a valid profile releases inputs and requires controller neutral before activity resumes.

Controller selectors now use readable standard button/stick names and include numbered inputs for identification. Nonstandard devices retain neutral numbered labels. Select sizing and imported-binding review were verified at 320px without horizontal overflow.

Verification: 54 input/runtime/profile tests passed. Browser tests passed real file export/import, preview/cancel, opt-in comfort restoration, invalid-file rejection, mobile review, press-to-assign and Road Ready shoulder/gear actions. Shared Ratio Lab navigation browser checks also passed during this iteration. The source and active nested desktop mirror match; syntax and whitespace checks pass.

Screenshot: `profile-import-320.png`. Implementation tests: `tests/stem_controller_profiles.test.js`, `tests/e2e/stem-controller-profiles.spec.ts`. Physical hardware testing remains outstanding. Changes are local and undeployed.
