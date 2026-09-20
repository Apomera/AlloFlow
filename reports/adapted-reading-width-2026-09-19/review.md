# Remembered reading width — September 19, 2026

Reading width now remembers Narrow, Medium, or Wide on this device when the reader reopens. The existing selector updates the preference; no extra controls are needed.

Only the selected width is stored. Invalid saved values use the default Wide layout. If browser storage is blocked, the selection still works for the current reader session. Changing width preserves passage content and does not stop narration.

Validation: 70 tests passed across reader interactions and accessibility checks, including reopening, damaged saved settings, blocked browser storage, and unchanged text/playback. Reader root/public modules and the canonical cache hash were verified. See tests.json and build-verification.json.

Changes are local, not deployed. This is a preference for the current browser/device, not an account-synchronized setting.
