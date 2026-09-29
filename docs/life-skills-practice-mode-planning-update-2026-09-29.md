# Practice Mode: make, try and revise a plan

The outing now has an optional plan board above the room. Learners can choose up to 12 actions, arrange them with Move up / Move down buttons, check the sequence and try it through the existing room or action controls.

## What the learner can do

- Add a few actions or plan the whole outing. Planning does not advance the clock or execute an action.
- Check prerequisites such as filling before packing, preparing essentials before leaving and putting tasks before departure.
- Estimate preparation and arrival times when the planned sequence includes a feasible departure.
- Follow a next-step shortcut beside the room controls. It opens the appropriate station and focuses the action; the learner chooses whether to take it.
- See planned actions marked with the actual journal step when they happen, including actions taken through the 3D controls.
- Recheck after a forecast or bus update. A previously checked plan updates with the current facts, and the room shortcut flags steps that need review.

The board starts collapsed. Plan checks are requested by the learner. Steps can be removed or reordered with buttons, and every interaction works without dragging or using 3D. The completion summary identifies use of the plan board and its check separately from requested clues.

## Timing and educational boundaries

The preview uses the same preparation and travel rules as the outing, applied to a temporary state. It does not dispatch journal commands, record observations, request model output or reveal future authored events. Before the forecast update, the interface labels the estimate as conditional and asks the learner to recheck when information changes.

For example, an initial plan may estimate arrival on the bus at 09:30. After the actual delayed-bus event, the check identifies a route problem. Revising the plan to walk can produce a 09:24 arrival when preparation ends at 09:06. Completing the actions still requires responding to the actual forecast and departure checks.

Planning is an editable support tool. Its current order is not a historical assessment of executive function, and its check is not counted as a clue request or a competence score. Learners may act outside their plan, change the order or continue without it. The board describes the actions they took and prompts discussion when the plan changes.

## Persistence

Plans use a separate `alloflow-life-outing-plan:v1:` key and do not change the run's journal format or rules version. Each step stores an ID, action and the journal revision at which it was added. Completion is derived from distinct matching journal events after that point; importing a file cannot mark a step complete without a matching action.

Backups include the plan alongside the reflection and optional decision comparison. Older backups without a plan remain accepted. Plan records are validated for action availability in the mission version, unique IDs, revision bounds and the 12-step limit. Unreadable local plans are left intact while the outing remains playable. A file read that finishes after a plan edit cannot replace the new work.

A decision retry keeps plan entries added by its starting point and recalculates their completion from the retained journal prefix. Entries added later are omitted. This retains the current order of eligible entries; it does not reconstruct historical edits to the board. A fresh outing starts with an empty board.

## Verification

**50 tests passed** across the engine, planning and page-interaction suites. New checks cover ordering, known-information estimates, weather and bus changes, distinct event matching, version 1 route compatibility, malformed plans, backups, reload, retries, focus, blocked storage and stale file reads.

Live Chromium checks covered the rendered 3D page, an incorrect water sequence and its correction, a full plan's estimate, actual actions updating progress, and the delayed bus making the plan require review. The 390-pixel phone and 1280-pixel desktop layouts had no horizontal overflow. The phone's axe scan reported zero automated WCAG 2 A/AA or WCAG 2.1 AA violations. The canvas caption and decorative glyphs still need manual contrast review; these checks do not replace testing with learners or assistive technology.

Source and desktop public assets match. No external generation was used in development.
