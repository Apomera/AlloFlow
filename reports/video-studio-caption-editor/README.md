# Caption editor refinements

- Multiline, resizable caption text fields.
- Visible labels and stacked caption controls on narrow screens.
- Timing validation rejects empty, negative, nonfinite, reversed, and beyond-video values without overwriting saved timings. Inline feedback identifies unsaved changes.
- Go to caption pauses the preview and seeks to the saved caption start.

Validation: all 223 Video Studio regression tests passed (regression.log). Chromium verified multiline editing, invalid start/end rejection, correction, seeking, mobile width, and no page errors (verify-browser.cjs). Visually inspected mobile.png.

Source and desktop public mirror are synchronized. Local changes only.
