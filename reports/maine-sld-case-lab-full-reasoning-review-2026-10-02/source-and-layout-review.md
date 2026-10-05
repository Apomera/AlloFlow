# Independent source and layout review

The final participant reasoning review is accepted for the bounded source changes and six representative layouts described below. Review completed on October 3, 2026; the report directory retains the October 2 pass start date. This review made no product edits and launched no additional browser session.

Final source SHA256: `ef37ab74b6188e1346f3e7447dd08e190ec15a1e1b781530b3c0c5d10f715a46`. Final module SHA256: `d69ff0908089f9d47dc0a572d676eadbbd846a8cfd5ea170637bd651720eb0f7` (177,749 bytes).

## Source acceptance

The initially collapsed native disclosure shows only participants' own Q1–Q7 responses and notes. It keeps Q8, Q9 and evidence requests prominent and adds no recommended answers, correctness rating or completion requirement. Nonblank notes are displayed verbatim, including line breaks and literal markup. Whitespace-only notes receive an empty-state message. The UI-only `reviewResponseLabel` trims the narrative-status decision for Q5/Q6 without changing the shared response-label helper used by print.

The ten own-review edit actions capture the originating case, question and disclosure state after ordinary navigation clears transient state. The return action restores that case and disclosure, then scrolls and focuses the originating edit control. Explicit selected-evidence edit/return routes preserve this context. Ordinary case/step navigation and confirmed reset/restore clear it; canceled confirmations retain it. Comparison and guide revision routes keep their existing behavior. Nearby return actions are available beside the originating question or evidence-request field.

The field-focus polish centers the actual select or textarea before focusing it with `preventScroll`. Independent rereading verified the final narrow-layout delta against the archived prior source: exactly one combined media rule was split so the general grid retains `1fr` while the reasoning grid uses `minmax(0,1fr)`. No other source bytes changed in that correction. No stack/select constraints or overflow hiding were added.

Case, core, builder, schema, guide and print preservation is recorded in [the frozen activity checks](frozen-activity.json). This source review adds no new legal or assessment-accuracy claim.

## Layout acceptance

Three final own-review captures are byte-identical to previously inspected and accepted captures; the capture identity record confirms this. The changed evidence-detour capture and two final Q5 keyboard captures were inspected directly after the correction.

| Final capture | Observed result |
| --- | --- |
| [Marisol literal note, 320px dark](browser-validation/final-browser/full-review-marisol-literal-320-dark.png) | Long participant text and literal markup wrap readably; line breaks remain visible. The viewport is intentionally scrolled into the note, so the card's top and lower content extend beyond the vertical viewport. This is not horizontal clipping. |
| [Marisol expanded review, 1366px light](browser-validation/final-browser/full-review-marisol-expanded-1366-light.png) | Q8/Q9, evidence requests and the optional earlier-question review remain distinct. Two-column cards have clear spacing; the native disclosure summary shows focus. Lower rows continue below the viewport without overlap. |
| [Returned review controls, 1366px light](browser-validation/final-browser/full-review-returned-controls-1366-light.png) | Revised participant notes remain legible in their own cards. Q8/Q9 and gap entries are prominent; the expanded earlier-review summary shows focus. This image alone does not prove focus on a returned edit button. |
| [Evidence-detour return, 390px light](browser-validation/final-browser/full-review-evidence-detour-return-390-light.png) | The retained review-return banner, form introduction and question map fit the narrow viewport with clear spacing and wrapped text. |
| [Nearby Q5 return, 320px dark](browser-validation/final-keyboard-captures/final-q5-inline-return-keyboard-320-dark.png) | The corrected card and textarea fit inside the viewport. The selected-evidence action wraps onto two lines, the nearby return action sits below it, and its keyboard focus outline is visible without overlap. |
| [Returned Q5 edit focus, 320px dark](browser-validation/final-keyboard-captures/final-q5-returned-edit-keyboard-320-dark.png) | The original Q5 edit button is visible with a keyboard focus outline. Q5's revised narrative remains readable, the earlier disclosure is open, and the blank Q6 row consistently shows narrative/reasoning not yet recorded. |

## Narrow-layout defect and resolution

The [original supplemental inline capture](browser-validation/supplemental-original-captures/supplemental-q5-inline-return-320-dark.png) exposed actual horizontal clipping, distinct from intentional vertical scrolling. The original reasoning track/card measured 383px, and the 320px main region had 398px scroll width; Q5 focus shifted it horizontally. The original crop is retained as evidence, not accepted as the final layout.

The measured track-only correction resolves it. [Final keyboard capture metadata](browser-validation/final-keyboard-captures/capture-evidence.json) records main client/scroll widths of 320px with `scrollLeft:0`, a Q5 card from x15 to x305, and a textarea from x33 to x287. It confirms the browser loaded the exact final module. The focused controls are `review-return-q5` and then `edit-q5`, both with a visible 3px outline; the returned disclosure is open. These metadata checks agree with the final pixels.

The earlier pointer-modality supplemental images corroborated active controls through metadata but did not display a focus outline. The final keyboard captures provide the missing visible-focus evidence.

## Review limits

This is independent source and representative layout acceptance, not a new full-suite run or legal/content audit. Functional keyboard, state, reset/restore, isolation and host results are documented separately in [browser validation](browser-validation/README.md), including the earlier host cleanup failures and the final normal-tracing host run. No failure history is replaced by this layout acceptance. The six representative captures support readability, wrapping, adjacent return controls and the corrected narrow focus path; they do not claim every possible viewport or state was visually inspected.
