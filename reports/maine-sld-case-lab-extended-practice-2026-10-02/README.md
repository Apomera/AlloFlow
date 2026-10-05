# Maine SLD Case Lab: extended practice

October 2, 2026. The local activity now contains five fictional cases, including two new extended-practice profiles. Work remains uncommitted as explicitly requested.

## Added cases

**Marisol, Grade 4: multilingual access and evidence gaps.** Participants examine Spanish/English language and literacy history, family-described strengths and reading concerns, incomplete instruction/access records and an English-only assessment summary whose suitability is not established. No standardized score table is supplied. The activity directs participants to the available observations and to an evidence plan rather than inventing scores or treating multilingual status or reading difficulty in two languages as an eligibility answer. The reviewed guide keeps identification and instructional need unresolved and supports timely appropriate evaluation alongside current supports.

**Taylor, Grade 5: progress and the instruction it requires.** Participants distinguish successful supported content work from inadequate independent basic reading and fluency. Four generic simulated age-based achievement standard scores illustrate a stipulated comprehensive reevaluation. The guide's Q9a discussion rests on the full record's finding that disability-related teaching adaptations remain necessary and that general education interventions/accommodations alone have not adequately met the need. Grades, score values, intensity, setting and improvement do not independently produce that conclusion.

Both profiles contain strengths, family perspectives, realistic tasks, explicit assumptions, their own evidence/score guidance, Q1–Q9 discussion responses and a reviewed debrief. Participants retain their own response choices and reasoning; no finding selection is automatically graded and no real eligibility determination is produced.

## Activity refinements

- A collapsible case library appears in the case record and debrief, with accessible title-based controls for every case and an indication of the current case.
- Score guidance and evidence directions now match the active case. Marisol has an intentional information-request view, rather than an empty search error or Alex's testing facts. Taylor's generic results remain distinct from Alex's named WISC-V/WIAT-4 fixture.
- Multilingual evaluation planning is applied directly to Marisol. The original Alex case remains English-dominant; its existing transfer guidance is preserved.
- Family communication is available for every case using the existing worksheet field. Optional prompts help participants state an evidence request, identify its source and explain the uncertainty it could clarify.
- Download and restore messages reflect five cases. The new activity explicitly accepts prior 1.0.0 worksheets and unexpired sessions, preserving the recorded three cases and adding blank Marisol/Taylor work. Unknown versions, invalid fields, oversized text and expired/future/corrupt sessions remain subject to the existing protections.

## Content and legal review

The original three case objects, all 52 Alex score rows, academic areas, form directions, knowledge checks, multilingual guidance and original source entries are preserved as equal structured data. The new data version is 1.1.0; worksheet format/schema and response fields remain unchanged. Compatibility is limited to the explicitly documented earlier version 1.0.0.

The new case content was reviewed against the [current Maine SLD form](https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/Supervision%20and%20Monitoring%20-%20Specific%20Learner%20Disability%20Checklist%20-%208.13.2026.pdf), [current MUSER Chapter 101](https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/071c101-2026-129-AMD-EMR.docx), [Maine DOE multilingual guidance/resources](https://www.maine.gov/doe/learning/multilinguallearner/resources/MLdisabilities) and relevant IDEA evaluation and instruction provisions. The cases are original fictional scenarios, not copies of the DOE guide's examples.

The multilingual guide supports linguistically appropriate evaluation and family participation; language proficiency is not a required waiting threshold, and ESOL/special-education services may both be needed. These principles inform Marisol's case, which does not establish a disability or a language-only explanation. See the [content review with precise source references](content-review/README.md). Taylor's instructional dependence is an explicit fictional full-record premise, not a numerical rule attributed to MUSER.

## Verification

The five-case implementation passed **22/22 Chromium scenarios** and **15/15 core tests**, with unchanged limits and zero automatic retries. **46 scoped axe scans** found zero violations. Coverage includes old worksheet/session preservation, all five cases' independent notes, export/reset/restore, participant-only printing, new case guidance, case navigation and actual source-app entry/gate/Hub paths.

Final visual PDF review found two orphaned headings. A separate print-only follow-up added keep-with-next rules for H2/H3 headings; data, core and builder remained byte-identical to the full-suite candidate. **Both affected browser scenarios passed again on the final module and exact host snapshot.** Every final printed page was rendered and visually accepted. The full-suite and follow-up hashes/results remain separate so the verification scope is explicit.

The follow-up app test completed every app-navigation assertion but stalled during `Page.close()` cleanup. Its raw result and trace are retained separately. Only that scenario was rerun in a fresh Playwright process with the same assertions, 120-second limit and zero automatic retries.

The desktop, dark-mode and phone case layouts, evidence planning, neutral debrief and family prompts were independently reviewed. The final source diff was independently confirmed to affect print CSS only. Four module copies, three host sources and served preview bytes match the final snapshots.

The preview pin refresh encountered a disk-full error. Both completed host writes were verified intact; the third host remained intact at the preceding pin. After removing 201 byte-identical scratch copies whose retained reports were verified, only this task's empty before-snapshot was repaired and the guarded third pin finished. Final source and HTTP checks passed. See [final verification](final-verification.json), [full-suite results](browser-validation/TESTING.md) and [print follow-up](browser-validation/print-followup/README.md).

Automated accessibility results describe scoped checks, not a comprehensive assistive-technology audit. PDF captures are validation artifacts generated from fictional participant work, not completed student records.

## Preview and release state

- [All five cases](http://127.0.0.1:65061/app/?tool=maine-sld-practice)
- [Marisol](http://127.0.0.1:65061/app/?tool=maine-sld-practice&case=marisol)
- [Taylor](http://127.0.0.1:65061/app/?tool=maine-sld-practice&case=taylor)

Module SHA256: `879c289b65b47014fb07be571c9e55c51c3df31653d109bb29f21d7ec2e9e48c` (164,286 bytes); loader pin `879c289b`. All four module copies match. Only the Maine pin is refreshed in the canonical host and its two source mirrors, preserving unrelated current bytes. Exact App.jsx source snapshot SHA256: `7d97b8fb3d93340890f1f2d81c6e47d820a58d3892ba346a4b3e4db96d8c205d`.

The isolated preview uses an exact source snapshot compiled without source transformations. Prior helpers and reports remain available. Public case routes are configured in the code for a future release; this pass does not publish the new profiles.

No staging, commit, push, deployment, full application build or installer build was performed. Other agents' shared changes were preserved.

## Evidence

- [Content preservation](content-preservation.json)
- [Frozen activity hashes](frozen-activity.json) and [baseline](baseline.json)
- [Reviewed new cases and primary sources](content-review/README.md)
- [Browser and unit validation](browser-validation/TESTING.md)
- [Validation summary](browser-validation/validation-summary.json)
- [Host integration](integration/README.md)

The preceding [deep learning enhancement report](../maine-sld-case-lab-deep-enhancement-2026-10-02/README.md) is retained as a historical record of its own tested snapshot.
