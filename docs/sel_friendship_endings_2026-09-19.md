# Friendship Workshop: when friendships change

The Endings tab now provides contextual practice rather than selectable reassurance statements. The old activity implied that an ending should feel grateful or graceful and offered little help with uncertainty or daily routines. The revised activity allows mixed feelings, an undecided future and boundaries without requiring a final conversation, forgiveness or reconnection. Its contextual help card uses the same framing.

## Learning design

Three fictional contexts each have elementary, middle and high-school setups: everyday contact changes after a move, someone explicitly asks for space, and closeness feels uncertain without a stated boundary. Each offers two possible approaches, explains their usefulness and limits, and supplies words to adapt or think privately. The approaches may work together; exploring them is not a scored choice.

The examples distinguish access and scheduling from assumptions about caring. They distinguish unclear contact from a clear no-contact request. A friendly greeting does not automatically revoke a boundary. An invitation is conditional on welcome contact and is not a reason to keep asking after silence. Shared class work can be planned with adult support without requiring renewed personal contact. New daily support does not need to replace the friendship or erase missing someone.

Changed circumstances invite reconsideration: a contact plan proves impractical, a greeting follows a request for space, or an invitation receives no answer. A separate own-example context supports transfer. Four optional notes cover the change and uncertainty, contact or space, daily support, and what to reconsider. A read-only preview contains only the current context's notes and identifies them as possibilities rather than a final decision. Reading and reflecting without writing remain valid participation.

## Pedagogical source and limits

[CASEL's SEL framework](https://casel.org/what-is-sel/), reviewed September 19, 2026, describes relationship skills, help-seeking, considering consequences, and explicit practice responsive to developmental stage and context. Those broad principles inform the comparison and reflection structure. The scenarios and suggested words are authored learning materials, not a validated assessment of friendship or a prediction of another person's intentions. The activity does not diagnose distress, classify a relationship or impose an emotional recovery timeline.

## State, accessibility and verification

Selections persist in `endingSelections[band]`; optional notes persist in `endingDrafts[band:context]`. New records are guarded against malformed containers and values, and unknown draft fields remain intact. Existing `endingIdx`, repair, coach, journal and digital-activity data are preserved without conversion. New notes are not monitored and do not request help. This activity makes no provider calls and awards no completion points.

Native labeled selects, disclosures and textareas support keyboard navigation. Inputs use 16px text; selects and disclosure summaries have 44px targets. Explicit light, dark and high-contrast palettes use the tool's existing theme mapper for dark text. Scoped browser tests cover every grade/context combination, independence and remounting, old records, malformed data, keyboard interaction and three 320px themes. Actual-hub coverage exercises return and reopen. Results are recorded in `reports/sel-friendship-endings/validation.json` after validation finishes. Canonical and public copies must remain byte-identical. No push, deployment or packaged build is included.

Final validation: 62 selected checks passed on the first run, all 72 tools rendered, three scoped axe scans found no violations and nine phone layouts were reviewed. Source/public parity, syntax and scoped whitespace passed. Detailed counts and raw normalized logs are in `reports/sel-friendship-endings`. No push, deployment or packaged build.
