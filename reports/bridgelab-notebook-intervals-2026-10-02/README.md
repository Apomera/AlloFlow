# Bridge Lab energy investigations in the notebook and labelled 2D view

October 2, 2026. Changes remain uncommitted at the user's request.

## Student workflow

Open **Energy between moments**, choose a question or pin a manual moment, and write in the **Earthquake notebook**. The notebook now shows the current experiment's energy evidence beside its prediction and observation fields. Writing pauses replay and driving. The scene writing drafts remain separate.

**Save earthquake trial** retains the exact pin when interval inspection is open. The trial continues to store its existing physical inputs, frame time and student writing. Interval context is independent of a 3D pose, so saving works from the labelled 2D view and after graphics loss. Trials saved without interval inspection keep their existing compact format.

Restoring a notebook investigation restores the pin, frame, interval disclosure and writing. It pauses motion and selects the current experiment, clearing an active A/B scene selection so recovery to 3D shows the restored response. Restoration keeps the student's chosen view and separate scene writing drafts.

## Saved evidence and print

Saved notebook trials now show their interval, matching guided question and numeric energy table. Printed reports include the same evidence and preserve three decimal places for inspected times when an interval was saved. Values are recalculated from the saved inputs and exact endpoints; changing the current pin does not change saved evidence. A fresh report can derive the evidence before the live earthquake model is enabled.

Optional inspection metadata contains only a supported version and numeric pin within 0–24 s. Unsupported versions and malformed pins are ignored without discarding valid notes or physical inputs. Restoring a legacy trial resets stale interval state. Cached numbers and question labels are never trusted. Valid 3D scene display settings retain precedence for existing scene observations.

## Model scope

The illustrative elastic vibration mode, synthetic ground packet and static solver are unchanged. Evidence uses the recorded relative modal energy history, interpolated together at each endpoint, in J/kg of modal mass. Chronological interval ordering supports backwards inspection. Small nonzero signed work remains readable and zero-input investigations remain finite. These readings do not estimate bridge damage or earthquake safety; scene motion remains magnified 10×.

## Verification

- 288 checks across all 16 Bridge Lab unit suites, including the strict metadata check and five new notebook workflows.
- 21 focused real-WebGL workflows covering 2D notebook save/restore/print, graphics loss and recovery, ordinary earthquake trials, scene writing, guided questions, interval evidence and focus controls.
- Parsed source, matching source/public mirrors and 1,162 matching English fallback values in both registries.
- Desktop, 320 px phone, print and fallback captures inspected for readable table values and horizontal overflow.
- Scoped whitespace and unstaged-change checks; no staging or committing.

Run the recorded-results verifier with: node reports/bridgelab-notebook-intervals-2026-10-02/verify.cjs.

## Captured views

- [Desktop labelled 2D notebook evidence](bridge-1000-2d-notebook-evidence.png)
- [Phone labelled 2D notebook evidence](bridge-320-2d-notebook-evidence.png)
- [Desktop printed notebook evidence](bridge-1000-2d-notebook-print.png)
- [Phone printed notebook evidence](bridge-320-2d-notebook-print.png)
- [Graphics fallback notebook](bridge-844-graphics-fallback-notebook.png)
