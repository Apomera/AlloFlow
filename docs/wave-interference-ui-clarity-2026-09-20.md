# Wave Lab interference clarity — September 20, 2026

Second-wave controls now use full visible labels for amplitude, frequency, and phase, with labels linked to their sliders. Frequency displays Hz, phase displays multiples of pi in radians, and a linked explanation describes phase as a shift within the wave cycle. Sliders have 44-pixel minimum heights, and the control group wraps into readable rows on narrow screens.

The live measurement label now matches Wave speed in medium. Canvas keyboard guidance and speed announcements explicitly refer to Animation speed. Existing ranges, wave calculations, audio synchronization, presets, and state behavior are preserved.

## Verification

- 21 relevant tests passed. Updated the existing live-measurement assertion to expect the clarified label.
- Component browser checks passed in default, dark, and high-contrast themes at 1120, 375, and 320 pixels (nine viewport/theme combinations).
- Verified all three second-wave sliders, label associations, phase explanation, keyboard adjustment, and retained values after hiding/reopening the second wave.
- Verified the Beats preset still sets frequencies to 4 and 4.5 Hz, both amplitudes to 45, phase to zero, and enables the second wave.
- Rechecked that animation speed preserves physical measurements and physical wave speed changes wavelength correctly.
- Checked target heights and layout overflow, including increased text spacing. Visually inspected the phone-width controls. No browser runtime errors occurred.
- Source/public mirrors match, catalog JSON and JavaScript syntax are valid, and scoped whitespace checks passed.

Evidence: scratch/wave-interference-ui-2026-09-20/. The browser harness uses mocked host context with real React, tool modules, and application styles; this is not a full deployed-app audit. Changes remain local; no deployment was made.
