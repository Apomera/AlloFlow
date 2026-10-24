# Word Sounds refinements

October 21, 2026. This change addresses all nine findings in the [October 18 review](word-sounds-review-2026-10-18.md), starting with the three highest priorities.

## Sound identity and prepared content

The shared sound resolver now retains pronunciation notation provenance. Explicit IPA objects such as `{ipa: 'i', grapheme: 'y'}` compare with the dictionary's `ee`, while bare app tokens retain their existing meanings. Sound Sort, rhyme filtering, printable analysis, and setup recompilation use the same identity. Separate string-label adapters let isolation and AAC accept pronunciation objects without treating grapheme spellings as sounds or throwing string-method errors. Printed IPA and aligned graphemes remain separate.

Ordinary advancement and queue refill now use the same prepared-item initializer as the first item and fixed forms. Later isolation positions, blending choices, and orthography choices remain those authored in the pack. Single-word practice can repeat safely. A pending lesson transition retains ownership of its feedback interval rather than being invalidated by an intervening item advance.

Assessment setup retains source occurrences, order, exact prepared questions, and row-based or configuration-only item IDs. Returning through setup preserves repeated targets and complete forms with more than ten distinct words. Selecting a subset keeps the original identities of its retained occurrences. Ordinary practice continues to select unique vocabulary.

## Probe results and lesson progression

A completed probe has one result snapshot. Timing stops at the final response, including a short form that exhausts its authored items before its configured goal. Results, difficulty bands, CSV exports, and completion callbacks read the snapshot. Waiting, backgrounding, rerendering, or a later host score update cannot alter completed measurements. Closing or pressing Escape during final feedback banks the completed snapshot once; closing a partial probe does not bank a completed result.

Each probe clock initializes interruption tracking from the document's current visibility. Repeated hidden events do not overwrite an interval's start, and hidden time stops accumulating at completion. New sessions reset timing, interruption evidence, and completed-result ownership.

Sequence changes update React state and its synchronous reference together. Manual Next Activity followed by automatic completion advances through the intended lesson rather than restarting an earlier activity.

## Prepared media and count approvals

Prepared pictures are reconciled by asset revision and resource identity. Updated assets take precedence immediately, and pending generated images cannot overwrite a newer picture or a different resource. Unmounting cancels the owning request. Decoding and sentence matching share this image ownership behavior.

Printable syllable-count analysis fingerprints supported data-URI string clips through the same audio-source input used for descriptor clips. An unchanged reviewed clip remains approved; replacing or attaching audio requires the appropriate fresh count review.

## Measured zero and unavailable evidence

Analytics carries a nullable accuracy and an explicit graded-attempt count. A real 0% result remains visible, exportable, and eligible for the same configured review rules as other measured low scores. Missing data and coach-until-correct practice do not become measured zeros. Legacy response and aggregate-score formats remain supported, and a saved zero-evidence count prevents a stale aggregate from restoring a nonexistent result.

The distinction persists through saved project summaries, live progress sync, profiles, growth, trajectories, correlations, research CSV, and learner reports. Unavailable values use blank or N/A presentation; genuine zero remains numeric evidence.

## Verification

All **1,670 tests across 135 Word Sounds and related analytics files are verified passing**, with no failed or skipped tests. The initial complete run passed 1,667 tests and found five outdated source-structure assertions. Those checks now follow the common initializer, updated setup boundary, and completed-probe close path. The affected files and the expanded mounted lifecycle suite passed all 69 tests in a four-file rerun. Original and rerun results are retained, and application hashes match the versions captured before the complete run.

The Chromium audio-recovery check passed. Four embedded core copies are current; seven JavaScript modules, six JSX host/source files, and all seven public module mirrors passed verification. Setup, preview, progress helpers, and the host were rebuilt locally.

Regression coverage includes mixed dictionary and G2P sounds, object-based isolation and AAC, repeated-form setup round trips and subsets, prepared boards through ordinary advance and refill, image replacements and obsolete image requests, manual-to-automatic lesson transitions, frozen result exports, initially hidden tabs, short forms, final-feedback exits, and measured-zero propagation through reporting and live sync.

The complete unit run, browser result, final source hashes, syntax checks, and public mirror parity are recorded in [verification.json](../reports/word-sounds-fixes-2026-10-21/verification.json). Raw unit results and runner logs are in [the verification directory](../reports/word-sounds-fixes-2026-10-21/). The Chromium recovery check uses mocked media APIs and verifies browser playback recovery behavior. These changes are local to the workspace.
