# Bridge Lab predictions and investigation evidence

October 2, 2026. Changes remain uncommitted at the user's request.

## Student workflow

Open **Record an observation** in scene tools. **Scene prediction** keeps a student's prediction separate from their observation and from the main earthquake notebook drafts. Writing pauses replay and driving. Saving keeps both pieces of writing with the inspected moment, bridge setup, camera and comparison; revisiting restores both. Successful saves clear the scene drafts. Older observations without predictions restore an empty prediction field.

With **Energy between moments** enabled, **Evidence for your explanation** places the interval's measured values beside the writing controls. It shows energy stored at the start and end, net input work, damping loss, and changes in kinetic, elastic and total stored energy. A/B columns use identical earlier and later times. Selecting a different response changes which column is emphasized while preserving the comparison values and student writing.

Nonzero values below 0.001 J/kg use scientific notation. Negative work keeps its sign. Backwards inspection is ordered chronologically; zero input remains finite and displays zero transfers. Labels and table row/column headers accompany the colors. The sticky scene heading covers its upper padding so scrolled writing stays hidden behind the header.

## Saved and printed evidence

The same table appears with saved observations and in the earthquake evidence report. Saved tables are derived from validated inputs, the recorded pin and frame, and a valid comparison. They also render in a fresh report before the live model is enabled. Imported cached table values are ignored. A comparison inconsistent with the captured response is discarded while the valid selected experiment remains available.

The existing record format already supports prediction text; no new cached answers or physics histories are stored. Both writing fields remain bounded to 2,000 characters and render as text. Existing unsupported records are preserved by the surrounding notebook workflow.

## Model scope

The illustrative elastic mode, synthetic shaking and static bridge solver are unchanged. Evidence uses the recorded relative modal energy history, interpolated together at each endpoint, in J/kg of modal mass. A/B shares time endpoints; the saved input labels show the experiment settings. These readings do not estimate damage or earthquake safety. Scene motion remains magnified 10×.

## Verification

- 282 checks across all 16 Bridge Lab unit suites, including six new writing/evidence workflows.
- 16 focused real-WebGL workflows covering the new writing controls, guided questions, interval evidence, fullscreen, phone layouts, reduced motion, saved restoration and printed reports.
- Parsed source, matching public mirror and 1,161 English fallback values in both registries.
- Desktop, phone and printed captures inspected for readable values and unclipped table content. A final scene/browser run verifies the sticky-header visual correction.
- Scoped whitespace checks; no staging or committing.

Run the recorded-results verifier with: node reports/bridgelab-investigation-writing-2026-10-02/verify.cjs.

## Captured views

- [Desktop evidence beside writing](bridge-1000-writing-evidence.png)
- [Phone evidence beside writing](bridge-320-writing-evidence.png)
- [Desktop printed evidence](bridge-1000-printed-evidence.png)
- [Phone printed evidence](bridge-320-printed-evidence.png)
- [Signed work with reduced motion](bridge-844-signed-writing-evidence.png)
