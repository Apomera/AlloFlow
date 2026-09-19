# Friendship Workshop: care with room for limits

The Keeping tab now explores sustainable care rather than presenting a short list of universal friendship duties. Its old framing emphasized regular contact, repeated a fixed relationship-capacity claim, and told younger learners to keep secrets without distinguishing safety concerns. The revised activity considers different capacities, accessible shared time and support that one person can realistically offer. The contextual help card follows that framing.

## Learning design

Three fictional contexts have elementary, middle and high-school setups and model language: different amounts of contact, making shared activities accessible, and caring without becoming someone's only support. Each explains how a possible plan could help, identifies its limits, and introduces a changed circumstance for reconsideration. A separate own-example context supports transfer.

The examples distinguish contact frequency from caring, shared planning from one person's responsibility, and ordinary privacy from keeping someone unsafe. They do not require equal message counts, disclosure of private access needs, enduring discomfort to prove friendship or constant availability. Four optional planning notes cover needs and capacity, a small act of care, limits/support and what to reconsider. The read-only preview explicitly says it is a possible plan rather than an agreement made by someone else.

## Journal improvements

The existing journal remains separate from contextual planning and is explicitly shared across this tool's examples and grade levels. All existing `friendNotes` and the unfinished `newNote` remain available. Reflections can be positive, difficult, mixed or fictional; gratitude is not required. The launch panel calls them saved notes rather than promising privacy.

Button and Enter now call the same save function. Both trim whitespace, ignore blank submissions, clear the saved draft and show a polite visible confirmation. Neither awards points for writing; the previous Enter-only reward is removed without changing earlier awards. Enter during IME composition does not save prematurely. Ten readable entries appear first, with a disclosure exposing all older readable entries. Malformed historical records stay in the stored array but are not rendered as text; dates are guarded and note text is rendered as text rather than HTML.

## Sources and limits

[CASEL's SEL framework](https://casel.org/what-is-sel/) informs the broad emphasis on communication, help-seeking and considering context. [Childline: Helping a friend](https://www.childline.org.uk/info-advice/friends-relationships-sex/friends/helping-friend/), checked September 19, 2026, supports involving trusted adults when a friend may be unsafe rather than promising secrecy or managing alone. These sources inform the approach; the examples are authored teaching materials, not a validated relationship assessment or clinical advice. This activity does not monitor notes or request help on a learner's behalf.

## State and verification

Selections use `keepingSelections[band]`; planning uses `keepingDrafts[band:context]`. Guards recover malformed new values while preserving unknown draft properties. Existing Starting, Repair, Endings, coach, journal and digital records are retained. New practice creates no provider request, relationship score or completion claim.

Native labels, disclosures, selects and text fields support keyboard operation, with 44px targets, 16px input text and light/dark/high-contrast palettes. Focused browser coverage includes all grade/context combinations, independent planning and shared journal drafts, historical data, blank saves, button/Enter parity, older entries, literal text rendering and composition input. Additional checks cover actual-hub reopening, adjacent activities, theme contracts and source/public parity. Results and screenshots are recorded in `reports/sel-friendship-keeping`. No push, deployment or packaged build is included.

Final validation: 67 selected checks passed. Sixteen focused browser cases passed initially; a separate control-test worker failed to start, and its five checks passed unchanged on retry. Adjacent regressions, real-hub flows and theme checks passed. All 72 tools rendered, three scoped axe scans found no violations and nine phone layouts were reviewed. Source/public parity, syntax and scoped whitespace passed. Counts and normalized logs are in `reports/sel-friendship-keeping`. No push, deployment or packaged build.
