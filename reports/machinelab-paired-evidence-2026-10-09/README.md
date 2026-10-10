# Machine Lab: recorded comparison evidence

The existing **Compare a change** panel now lets learners retain a before/after pair while continuing to experiment. Available at the existing grades 6–8 and 9–12 comparison levels, each of the six stations keeps one independent comparison record and an ungraded explanation of up to 1,200 characters.

The record copies every relevant setting, including load and load travel, and shows mechanical advantage, effort force, hand travel, work put in, and work delivered. Subsequent slider edits, changing stations, and clearing the live saved setup do not change it. Replacing a record explicitly starts a new explanation. Clearing a record preserves the live saved setup and records at other stations.

The explanation distinguishes one changed setting from several changes. Holding load and travel constant demonstrates the force/distance trade with equal ideal work; changing either identifies a different task, whose work may differ. Recorded settings show which variables were held constant. Invalid, incomplete, mismatched, and unchanged imported pairs are ignored.

## Validation

- Existing focused regressions: **248/248 passed** across views, accessibility, bench mathematics, and translation hygiene. Receipt: `regression-final.json`.
- JavaScript syntax and scoped whitespace checks pass. Source and desktop runtime mirror are synchronized.
- New paired-evidence behavior: **11/11 passed**. Covers independent snapshots, immutable results, accurate work with changed loads/travel, reflection persistence and limits, station isolation, clearing, malformed imports, and stale editor callbacks. Receipt: `paired-final.json`.
- Native Chromium with the real host and local THREE: **38 checks passed, no browser errors**, across all six stations, keyboard recording/clearing, station navigation, 320/390/1150-pixel layouts, dark/high-contrast themes, and system forced colors. Six screenshots captured; desktop, phone 320, dark 390, and forced colors 320 visually inspected. Receipt: `browser/results.json`.
- Final source/desktop SHA256: `78f0a4609569732b4d2021a925b71465a7686cff698d2cd05e96282ff8796f54`.

The first regression attempt executed no tests: the Windows sandbox rejected a Vitest temporary-cache rename. The successful rerun used a task-local temporary directory. A mapped-file lock interrupted a desktop copy; an atomic file replacement recovered it. These were environment failures, not failing product assertions; `regression.json` retains the initial diagnostic.

Browser startup initially used the sandbox's empty browser cache; setting `PLAYWRIGHT_BROWSERS_PATH` to the installed browser directory recovered it. The first interaction run reached the station-navigation check, where a broad test selector matched both the outer comparison and inner settings summaries; scoping it to the direct child summary fixed the harness. The complete final run passed.

Useful previews: [desktop](browser/lever-desktop.png), [320-pixel phone](browser/phone-320.png), [dark theme](browser/dark-390.png), [forced colors](browser/forced-colors-320.png).

This change uses the host's existing tool state. It does not add a separate storage service or change the machine physics or 3D mechanisms. No deployment was performed.
