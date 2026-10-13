# Independent review

The force_speed_review agent independently read the production diff and focused/native-browser fixtures against frozen source `301b7f605d71623e58af46454d15bea56b4710ed643191523b69593815ff714f`. No blockers were found; the reviewer made no edits and ran no heavy checks.

- `P/v` recovers effort `load/(MA × efficiency)` and load force. Ramp output correctly uses vertical rise rate.
- Power already accounts for efficiency; new calculations do not apply it twice.
- Valid geometry, positive force/movement, and duration bounds keep values finite and positive. Full precision is retained internally.
- Same-unit quantities share zero-based scales. Text labels, named figures, semantic metric lists and forced-color patterns support visual interpretation.
- New v4 record kinds retain existing validation and snapshot behavior; v1–v3 remain compatible.
- Focused fixtures derive geometry independently and cover mixed-side power/speed errors, repeated efficiency, MA below one, hints, units, rounding, stale callbacks, snapshots and version coexistence.
- Native harness uses established bootstrap, 0.0001 percentage-point CSSOM tolerance plus 0.1 px actual geometry checks, saved-details navigation and all six stations.

Final visual inspection is recorded in the browser process evidence.
