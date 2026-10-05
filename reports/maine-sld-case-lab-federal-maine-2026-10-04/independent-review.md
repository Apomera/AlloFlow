# Independent source, legal wording and layout review

Accepted without findings on October 4, 2026. This verdict applies to source `0ace7842ded217dfc67d240f357acdfbca59a493ae0e7aef709e0dd006b846df`, all four runtime copies of module `fec6407e57d7227198cd13620d3c9c52a9df40eba32c2de52e11fb2e66dcb0d9`, and browser specification `2807144531c423401b691b10ad1c7e1cd6bfb7a6151ea68927a90d7ee4187e28`. The reviewer changed no product, host, or test files.

## Source preservation

All 15 independently executed source checks passed in [independent-source-check.json](independent-source-check.json). Removing the new jurisdiction helper and its two call sites reconstructs the exact prior source bytes. The core, case data, eligibility branches, stylesheet prefix and print function are preserved. Exactly four runtime module basenames match the frozen candidate at 199,134 bytes each. The original builder is restored byte-for-byte to SHA-256 `333019e7d0a1e5a8774f33b2022778183b089d7206efaa4193def039274949f4`; the existing correction receipt preserves the earlier packaging selection error. The new disclosure contains informational links, with new-tab announcements, and no participant input or state mutation.

## Legal wording

The new wording appropriately distinguishes IDEA's federal framework from Maine's implementation. The federal section describes varied assessment and parent information, avoids a single-test eligibility rule, and notes culturally and linguistically appropriate evaluation. These are supported by [34 CFR 300.304](https://sites.ed.gov/idea/regs/b/d/300.304). The state-method paragraph accurately says state criteria must permit an intervention-response process, must not require severe IQ–achievement discrepancy, and must be followed by public agencies. It does not present one national form or require one strengths-and-weaknesses method in every state. See [34 CFR 300.307](https://sites.ed.gov/idea/regs/b/d/300.307).

The summary of inadequate achievement, progress or a relevant pattern, instruction and primary-cause factors is supported by [34 CFR 300.309](https://sites.ed.gov/idea/regs/b/d/300.309). Its special-education-and-related-services sentence tracks the regulation and asks the team to consider need; it does not introduce a separate requirement for an unrelated service or state that a related-service-only need suffices. See [34 CFR 300.8(a)](https://sites.ed.gov/idea/regs/b/a/300.8/a).

Current MUSER VII.2.L supports the Maine-specific pattern of strengths and weaknesses considered with intervention-response, classroom, achievement and psychological-processing data. VII.3 excludes SLD from the separate adverse-effect determination procedure. The product preserves the distinction between that procedure and the continuing need to evaluate educational and instructional needs. The outside-Maine section correctly asks users to adapt criteria and documentation, and prevents automatic transfer of Maine's question numbers and branches. It is a focused jurisdiction note, not a claim that the existing fictional cases or every MUSER provision have been reaudited.

The reviewer directly retrieved the [current SOS education-rules index](https://www.maine.gov/sos/rulemaking/agency-rules/department-education-and-state-board-education-rules) and [DOE emergency-rule notice](https://www1.maine.gov/doe/about/laws/rulechanges), confirmed the current Chapter 101 link, and read the previously downloaded current DOCX/extracted cited provisions. DOCX SHA-256 is `fc4fe5c2b95167c8fcb3fbd910c9313477ca5890fc1ecb21f00b9a584fcb5c07`. Federal verification used current U.S. Department of Education search-index text after direct page retrieval returned 403; a new direct eCFR verification is not claimed. The broader source audit is [legal-source-review.md](legal-source-review.md).

## Actual rendered layout

The reviewer directly viewed all four final PNGs at original resolution. Expanded disclosure text and links wrap within the case-source card and form sidebar; the focused summary has a clear visible outline. The 320-pixel dark layout keeps the new prose within the card, and the 844 × 390 landscape layout retains readable body text with the fixed footer. The desktop reasoning capture shows the informational sidebar alongside participant form controls. No change is requested for the visible regions. These viewport captures show the top of a scrolling disclosure; they do not simultaneously display every paragraph. Complete wording and link destinations were checked in source and in the scoped DOM assertions.

| Actual image | Dimensions | SHA-256 |
| --- | --- | --- |
| jurisdiction-case-1366-light.png | 1366 × 900 | `0cabf6395616c05cd4e81fbfd644a46ed27b6eccb609872c87f1fdd0e94fd567` |
| jurisdiction-case-320x740-dark.png | 320 × 740 | `8eff705b45b8d18488d7ac8cab7c30d069a4cbfb50dfa08ad90be940764c3eb6` |
| jurisdiction-case-844x390-dark.png | 844 × 390 | `1034de6d2523f86f3aca3aa236b8426cadea5a4cf455f6cfa42859ffdfe9f8e3` |
| jurisdiction-reasoning-1366-light.png | 1366 × 900 | `bc524cf67dc9fdf3089c4775d9ab80426ed0a3a74ed45cf375a7c268d22aacf9` |

Both scoped module checks passed on the first invocation, exit code 0. The new test checks keyboard disclosure operation, six correct source links, no input controls, case switching and unchanged literal participant worksheet content. The retained check covers all 52 score rows and existing worksheet persistence. Two actual active-panel axe records contain zero violations. See [independent-review.json](independent-review.json) and the [module result](browser-validation/module-focused-01/result.json).

The prior 37-test specification is an exact byte prefix of the current 38-scenario specification. The complete 38-scenario matrix was not rerun. This review does not claim a fresh print audit, browser-wide accessibility clearance, or a completed actual-host entry check; the latter remains the integration/validation owners' evidence.
