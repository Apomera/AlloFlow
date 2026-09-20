# Comparison evidence and writing refinement

Learners can keep useful reference properties beside the Claim, Evidence, and Reasoning fields. Kept properties belong to the organism pair, survive column swaps and property filtering, and return when that pair is selected again. Removing a reference does not remove written text. Downloaded reports include a clearly labeled kept-reference section as well as all seven properties and the learner's explanation.

The three writing fields now preserve spaces and line breaks during typing. Previously, the comparison model trimmed every value before redisplaying it, so entering a space at the end of a word could join that word to the next one. Reference-property normalization still treats harmless whitespace and capitalization differences as matching descriptions.

Each property has a keyboard-accessible Keep as evidence toggle. Review kept evidence moves focus to the collection heading. Removing a collected item returns focus to that stable heading. The collection uses two columns on wide panels and stacks on narrow screens.

## Checks and review

- Targeted tests cover draft whitespace and length limits, invalid and duplicate saved property keys, unordered pair identity, swapped evidence values, and filtered report exports.
- Browser checks exercise actual sequential typing in all three fields; keyboard selection and removal; preserved writing during filters, pair switches, and swaps; downloaded content; and 280px/640px/1200px layouts.
- Phone and desktop evidence screenshots were visually reviewed.
- Initial validation caught a timing-sensitive existing narrow-panel assertion. Its failure screenshot showed the correct stacked layout after the measurement. The assertion now waits for the container to reflow before checking geometry.
- A concurrent diagram edit briefly changed source-copy parity during the initial unit run. Its changes were preserved, and matching canonical/public content was copied to the other two active simulator locations before verification was repeated.

All 10 unit checks and 6 distinct browser scenarios pass. The initial browser run passed five scenarios; the remaining layout scenario passed on rerun after the timing fix. See `unit-final.log`, `browser.log`, `browser-final.log`, and `verification.json`. All four active simulator copies have matching SHA-256 hashes.

## Previews

- [Phone evidence collection](evidence-280.png)
- [Desktop evidence collection](evidence-1200.png)
- [Phone property marked as evidence](kept-row-280.png)
- [Desktop property marked as evidence](kept-row-1200.png)

No commit or deployment was performed.
