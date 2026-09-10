# Water Worlds: compare water across the landscape

The Differences view compares completed baseline replays at the same elapsed model minute. It is available after a pinned baseline has been replayed and that run has finished. Matching rainfall, initial water stores, and terrain are checked before enabling the view.

Learners can switch between surface water, soil water, and delayed subsurface water. Each cell displays current minus baseline water depth. Blue plus signs indicate more water, orange minus signs indicate less, and cells with differences below 0.05 mm remain neutral. The color scale stays fixed and saturates at ±10 mm; it does not rescale while inspecting time.

The selected-cell panel supplies baseline, current, and signed difference readings. A keyboard-scrollable table includes all 96 cells. The whole-valley difference is expressed in cubic metres, making it possible to connect local depth differences to total storage. Wording distinguishes storage changes from a score: additional soil water can represent retained rain and reduced capacity for another storm.

The view follows the existing inspection timeline. Starting another storm disables the controlled difference view and returns the scene to surface water. The saved display preference remains available for a later valid comparison. JSON and readable reports include final per-cell differences only when the completed run is a valid controlled comparison; inspecting an earlier minute does not change that exported evidence.

The solver equations are unchanged. New tests verify eligibility, synchronization, exact per-cell values, zero initial differences, volume aggregation, detached exports, and restored display preferences. Browser checks verify signed readings, the 96-cell table, timeline synchronization, immutable evidence, mobile layout, and light/dark accessibility. Expanding the comparison table also exposed a keyboard-scrollability issue; both data-table regions now receive keyboard focus with visible focus outlines.

Evidence is in `water-worlds-implementation/`, including `worlds-differences.png`, `worlds-differences-320.png`, accessibility results, and updated example reports.

Final validation: 106 tests across nine targeted suites passed. All 16 browser workflow groups passed, with no browser exceptions or axe violations in the tested states, including the expanded spatial table and dark comparison view. Desktop and 320px dark-mode screenshots were visually inspected.
