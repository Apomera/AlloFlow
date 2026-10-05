# ATC deep visual design audit — October 4, 2026

Baseline captures use installed Chrome, the actual React host, and canonical source hash `1db40c565e3b779863031a7090bde31878365a0b587edec784f5d7e8547483ac`. The baseline runner captured welcome, pathway, expanded exercise preview, playing, controls, and a genuine completed exercise debrief at 1440, 390, and 320 pixels. It reported no runtime errors or horizontal overflow.

## Baseline findings

- Panel titles, status pills, secondary actions, and supporting text share a narrow visual range. Many equal border treatments make the playing view difficult to scan.
- The welcome illustration occupies almost half the desktop hero and shows fictional aircraft callsigns unrelated to the selected airport. Airport choices provide textual runway information without a corresponding shape preview.
- The pathway uses large step numbers, repeated same-shaped cards, and empty space between disclosure and launch. Each exercise would benefit from a small visual cue to its distinct skill.
- The playing sidebar stacks flight strips, command controls, separation watch, and runway board. At 1440 pixels the document is 2539 pixels high and leaves a long empty area below the radar in the left column.
- Flight-strip metadata and selected command controls are readable but use similar typography throughout. A clearer callsign/metric/supporting-detail hierarchy would improve scanning while retaining the evidence.
- The completed debrief is a full-width vertical stack. Reflection and decision evidence can share a desktop workspace, with reflection still first in document order and the phone layout.
- Phone radar prominence is already close to the established limit: crossing-priority radar begins at 834.89 pixels on a 390-pixel viewport and 942.39 pixels on a 320-pixel viewport. Visual additions above it must remain compact.

## Validation method

`browser-qa.cjs` checks actual user controls rather than fabricated visual states. It covers airport selection, native preview disclosure, genuine completed separation exercises, inline command entry, responsive geometry, touch heights, axe serious/critical violations including contrast, forced colors at 200 percent zoom, reduced motion, keyboard focus, and the phone radar limit.

## Final review

Final production source: `b7417987e07ff085d8ab90ed1030a19e7a153a6c637f2b6689f2d56ee42aaf64`.

- The airport briefing now has a deliberate title/action/metric hierarchy and an airport-specific schematic. Card content begins at the same vertical position and the selected airport has an explicit pressed state. The four diagrams retain their actual 1/2/2/4 runway configurations.
- The first design iteration still left too much space beneath the radar. The final desktop arrangement moves the operations boards into that area and lays out runway entries in columns where space allows. The 1440 px crossing console measures 2098 px tall, compared with 2539 px before this pass.
- Callsigns and numeric flight values use distinct monospace groups. Supporting route, fuel, and arrival text remains visible, with appropriate units. Instruction icons add scanning cues while the full text names remain.
- Phone controls remain at least 44 px tall. The crossing radar begins at 808.67 px on a 390 px viewport and 916.17 px on a 320 px viewport, both within the established 950 px limit. No checked view has horizontal overflow.
- The debrief puts outcome and measured objectives first, then the next action. Reflection and evidence share a desktop row and remain sequential on phones. Completion was obtained through the actual altitude instruction and six-second exercise, and the saved note was entered in the real reflection field.
- Computed aircraft-strip and command-button boundary contrast ranges from 3.54:1 to 7.68:1. Custom high contrast restores black surfaces and a visible yellow selected outline. Forced colors at 200% preserve all major views and exercise progress.
- The command-entry audit found a scrollable list whose disabled selection buttons left it without a keyboard focus target. The final list receives a labeled focusable region in that state; a real End-key check scrolls 46 px and cancel preserves both pause and instruction.
- Reduced motion leaves diagrams static and removes interface transitions while actual resumed aircraft continue moving.

The focused suite verifies 22 checks with zero browser runtime errors. Serious/critical axe findings are absent in its checked views. The final combined results explicitly retain the selectively rerun command-entry locator check and its unchanged-source provenance.
