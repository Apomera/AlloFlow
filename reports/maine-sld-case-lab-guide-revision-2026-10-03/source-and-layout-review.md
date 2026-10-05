# Independent source and layout review

Reviewed 2026-10-03 (local task date; UTC evidence extends into 2026-10-04). Scope: the reviewed-guide revision cycle, whitespace narrative status, and the focused writer in a short landscape viewport. Product and test source were read only during this independent review. No commit was made.

**Accepted for this scope.** The final source returns participants to the exact guide question they were reviewing, retains their own writing through the explicit evidence detour, and avoids presenting whitespace-only Q5/Q6 notes as a recorded narrative. Actual final captures show the focused Taylor Q9 writer and adjacent return control completely inside the main content region at 844 × 390. No unresolved finding remains in the inspected source or pixels.

## Exact reviewed identity

| Artifact | SHA-256 |
| --- | --- |
| Final JSX, 90,124 bytes | `46d1ce09304d70d98b60a4a7a758969b3c5f3eef99a6c5b522113a06e9397437` |
| Final module, 189,988 bytes; all four installed copies | `018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc` |
| Canonical 35-scenario browser specification | `7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4` |
| Before-pass source | `6c59be34f6c400164b12093f8c5b54380c97212c3356f0e61cdf36891488f741` |
| Archived pre-correction guide candidate | `d96b8d5a34e9b689b691792ff6e47f63e3be16c856f38f383303988bee78c5e7` |

The previous 33-test prefix remains byte-exact at 155,187 bytes / `32341725cd74244a0f50c9fb149b500bea68fcc179f5de41ba4d862e499014b8`. The final tested-spec copy is byte-identical to the canonical specification. The original landscape assertions, including the adjacent-return scroll/focus fixture, were retained.

## Source findings and preservation

- `maine_sld_practice_source.jsx:102–119`: guide origin reuses transient participant-return context; the guide question is not added to worksheet state or the saved/exported schema. Return routes to the originating case and debrief, then restores focus to that guide question's existing revise button.
- `maine_sld_practice_source.jsx:71–91,158`: ordinary navigation clears the return context; an explicit selected-finding detour retains the origin. Deferred return focus distinguishes guide and participant-review controls. Confirmed reset/restore clear transient context; canceled confirmation retains current work.
- `maine_sld_practice_source.jsx:73–84,262`: the writer visibility helper runs from a deferred textarea focus event only for the matching guide-origin question, active writer, current case, and existing adjacent action. It minimally adjusts the main region with a 7 px margin. When the writer plus return action cannot fit, it prioritizes the writer; an oversized writer uses nearest scrolling. It does not call focus or selection APIs, and is not triggered on every change/keystroke.
- `maine_sld_practice_source.jsx:275,295`: guide cards use the existing trimmed review-response label and suppress a whitespace-only note paragraph. Meaningful original text retains its whitespace and is rendered literally. Revise buttons preserve their existing accessible names and describe the reviewed case through `aria-describedby`; the return controls name the question and case.

I independently removed the exact new helper and single onFocus wiring from the final bytes; the result equals the archived d96 candidate byte for byte. I also recomputed that the entire component stylesheet prefix, literal class-name sequence, print function, and shared `responseLabel` definition are byte-identical to the before-pass source. Core/data/builder equal their before-pass files:

| Preserved file | SHA-256 |
| --- | --- |
| Core | `ef7dbb4373d9783dea76a891fcaebe085dafce7ef7a5a8339d060ae0d260c926` |
| Case data | `706f0932f427886c2972ec7633ddbfea31e8535e40cbccccbf5bf35530a56b2e` |
| Builder | `333019e7d0a1e5a8774f33b2022778183b089d7206efaa4193def039274949f4` |

## Actual validation and resolved finding

`module-five-02` passed **5/5** selected scenarios in 49.9 seconds using the original canonical specification and unchanged synchronous stylesheet setup: one worker, no automatic retries, and unchanged 120-second test timeouts. The report has no unexpected, skipped, or flaky results. This is targeted validation, not a claim that all 35 available scenarios were run. The five targets cover existing guide question focus, the participant-review/evidence cycle, save recovery, all nine guide revision returns across all five cases, and blank-narrative/context cleanup. The four recorded axe states each have an empty violations array; that is scoped automated evidence, not a complete accessibility audit.

Separately, final `host-only-03` passed **1/1** actual-source-application scenario (15.1 seconds in the body; 16.7 seconds total), covering the public case deep link and configured educator access on Leadership return. Its recorded module, source, canonical spec, setup method, worker/retry/timeout settings, and tested-spec bytes match the final candidate. I read its result/identity/log and byte-verified those copies against the producer and its archived tested spec against the canonical file. These are six distinct selected passing scenarios across two final invocations, not one six-test invocation. The separate integration evidence records served-app and preview snapshot identities.

The earlier `module-five-01` result was 4 passed / 1 failed on the archived 0ceb module / d96 source. The failure screenshot showed a clipped writer after the fixture centered the adjacent return action. `natural-editor-probe-02` then reproduced a real writer clipping issue without manual return scrolling or writer refocus: after note fill, the writer bottom was 370.3125 while the main bottom was 343, a 27.3125 px clip. The 180.5 px writer/return span fit the 212 px main region. This evidence and the old source/module are retained under browser-validation and layout-review-correction; they are not represented as accepted final layout.

The corrected `natural-editor-probe-03` shows writer bounds 155.3125–250.3125 and return bounds 293.3125–335.8125 inside main bounds 131–343, leaving 7.1875 px below the return control. The 95 px writer, focus outline, character counter, consult control, and adjacent return are visibly complete. Appending ten characters preserves active writer focus, advances the caret from 144 to 154, and keeps main scrollTop 4915 unchanged. The original fixture also passes on the final candidate.

Probe 03 is a separate capture-only geometry check. It serves the independently guarded final source/module while reusing exact CSS `b104c6faca4db538b15c97b19fb5176ffa02308a82f3a3c5e3df8d0c3537b163` and HTML `078937f26696db4b8fa0648f503db50f64a93d400418021b95f9c731c2d17b24` extracted from the earlier module01 failure trace (`e5b6dcc67cf24955159914db82019a94c93c21411dedd299be2577648e5f21d0`). That trace did not retain the JavaScript response body; the current module is bound by separate source/module guards rather than a recovered trace JS body. This probe performs no suite, axe run, or new stylesheet compilation. It supplements the separate final original-setup five-test run and does not replace it.

## Actual images inspected

I opened and visually inspected each image below and independently confirmed its report copy is byte-identical to the local producer. The Q9 narrow capture shows exact returned keyboard focus; the Q8 desktop capture shows the revised literal participant text beside the guide; separate Q5/Q6 narrow light captures say “Narrative not yet recorded” without empty note blocks.

| Capture | Viewed state | SHA-256 |
| --- | --- | --- |
| [guide-revision-returned-marisol-q9-320-dark.png](browser-validation/module-five-02/browser/guide-revision-returned-marisol-q9-320-dark.png) | Exact Q9 return, 320 px dark | `175d756327bb73c31c9985d967b3d556d4762ca6a994c761d13330d03ff419d4` |
| [guide-revision-writing-taylor-q9-844x390-dark.png](browser-validation/module-five-02/browser/guide-revision-writing-taylor-q9-844x390-dark.png) | Focused writer and adjacent return, 844 × 390 dark | `93849d5856a5b902456ee1fadb4b58b0569ade45097a1d09ee75766b12df4d45` |
| [guide-revision-returned-marisol-q8-1366-light.png](browser-validation/module-five-02/browser/guide-revision-returned-marisol-q8-1366-light.png) | Returned Q8, 1366 px light | `de6eea8c0334133e46ffd04ac6b9ca5b04c4d56020dd7590643c62b436d3085b` |
| [guide-revision-blank-q5-marisol-320-light.png](browser-validation/module-five-02/browser/guide-revision-blank-q5-marisol-320-light.png) | Whitespace-only Q5, 320 px light | `24babd8bbef642985e42aef15017e3cb0ed77c7be04947e1c7c502914308a20f` |
| [guide-revision-blank-q6-marisol-320-light.png](browser-validation/module-five-02/browser/guide-revision-blank-q6-marisol-320-light.png) | Whitespace-only Q6, 320 px light | `b617713e0d3e921f7aac329d673a9956a8a4a11cd603f685364ea49b32d3c0e9` |
| [taylor-q9-natural-source-focus-844x390-dark.png](browser-validation/natural-editor-probe-03/taylor-q9-natural-source-focus-844x390-dark.png) | Natural initial select focus, 844 × 390 dark | `f8007b63c56e67f1736d4698dd0cb3578849c18b557e2cb49cd9de9529fd8560` |
| [taylor-q9-natural-after-fill-844x390-dark.png](browser-validation/natural-editor-probe-03/taylor-q9-natural-after-fill-844x390-dark.png) | Natural writer focus after fill, 844 × 390 dark | `64351efe05b0fde8d252a93044c55f30c51ad4d5b74124233da8f3c3033af4b9` |
| [taylor-q9-natural-after-keyboard-844x390-dark.png](browser-validation/natural-editor-probe-03/taylor-q9-natural-after-keyboard-844x390-dark.png) | Natural keyboard append, 844 × 390 dark | `a4cd04e83a0a3f94584f08cf92ee7c723b0eb1ff671884c6a91507d9ce050ebb` |

The earlier module01 failure image and both natural-probe02 failure images were also inspected during diagnosis. The initial-select-focus image remains unchanged in appearance because that control intentionally keeps the existing guide-edit focus behavior; the correction runs when the participant focuses the matching writer.

This review does not re-audit MUSER, evaluation legality, or case content. It confirms preservation of the existing legal/case data and print paths and reviews the participant interaction/layout changes above. Actual-host integration validation and served-app identity are owned by the separate integration evidence.
