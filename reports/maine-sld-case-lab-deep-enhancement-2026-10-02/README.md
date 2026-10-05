# Maine SLD Case Lab: deeper participant learning flow

October 2, 2026. This local refinement helps participants connect their selected findings to the Maine form, revise their reasoning without losing their place, and compare their own responses across the two Alex premises.

## Learning and usability changes

- **Evidence reference during reasoning and debrief.** A collapsible reference shows the current case's selected findings, the participant's chosen roles and written notes, assessment/source, score scale and comparison basis. It uses participant work only. Each question can open this reference; editing a finding focuses its existing note and offers a return to the exact question or debrief. Focusing another question updates the return context.
- **Question navigation before Q1–Q9.** The question map now precedes the form cards, so it remains useful when the layout stacks on phones. Buttons focus the corresponding response field, carry full question names for assistive technology, and describe only whether a note has been recorded. These labels neither rate the evidence nor determine a form pathway.
- **Optional evidence thinking prompts.** A native disclosure invites participants to distinguish directly reported information from inference, consider another source or explanation, and identify information that could change an interpretation. Participants keep their reasoning in existing worksheet fields; the prompts do not fill answers or judge adequacy.
- **Comparison of participants' Alex responses.** Before or after revealing the separate guide, participants can compare their own Q8/Q9 positions and written reasoning for Alex and the changed-premise variation. The comparison repeats the existing case premises, leaves missing responses explicitly unrecorded, and supports direct editing of either case. Jordan retains its own case flow.

## Preserved content and behavior

All 52 simulated Alex score results, three fictional cases, reviewed source guidance, multilingual considerations and form directions are retained. `maine_sld_case_data.json` and `maine_sld_practice_core.js` match the saved baseline byte-for-byte. The worksheet schema, session policy, downloaded worksheet fields and participant-only printing remain intact. The comparison and reference do not reveal the facilitator key or produce an eligibility verdict.

Transient reference and return controls are cleared on case changes, reset and worksheet restoration. They are navigation aids and are not added to worksheet exports. Each case's participant work remains separate.

## Verification

The stable final run passed **19 of 19 Chromium scenarios**, with one worker, zero automatic retries and the unchanged 120-second test limit. All **36 activity-scoped axe scans had zero violations**: 30 across the five steps at desktop/phone widths and three themes; four constrained layouts; and two expanded reference/comparison states.

The three new scenarios verify early question navigation, exact question/debrief return after finding edits, retention of existing notes, clearing transient return controls on case change/reset/restore, literal participant text, blank and recorded comparison states, targeted editing across separate cases, and understanding-check explanation prerequisites, revision, case separation and session persistence. Existing coverage retains all scores, safe import/export, keyboard tools, reviewed debrief, participant-only print and actual source-app access paths.

Seven representative desktop and phone captures were independently inspected, including the top navigator at 320 pixels, expanded evidence references, the exact-return banner and the open two-premise comparison. Text and controls fit their containers, with longer content continuing through the intended activity scroll. No blocking layout concern was found. Root also visually inspected the desktop form entry, phone navigator/reference and desktop comparison.

The evidence/navigation scenario took about 108 seconds within the unchanged limit. No timeout inflation, automatic retry, source mutation or repeated passing run was used. The reviewed data/core remain byte-exact, so their previous focused unit checks were not unnecessarily repeated.

Independent source review accepted the new learning flow without identifying a content, judgment, answer-key, schema or data-exposure concern. The reviewed case premises are displayed from existing case text; this pass adds no new legal interpretation. Automated accessibility results describe scoped checks, not a comprehensive assistive-technology audit.

## Local integration and release status

- Activity SHA256: `4d5cba967c685e08fe7513ae7dd5e84b715edfea7e3c1a5443017ad6c310f2bf` (136,029 bytes); loader pin `4d5cba96`.
- All four module copies match. Only the Maine loader pin was refreshed in the canonical host and its two desktop source mirrors; immediate before/after verification preserves all other current bytes.
- Exact App.jsx source preview SHA256: `aa349c6e414acaaeaa0cbe3df25a4c8241f5a12506bff8f3714b3c1bcd62dbbd`. Its isolated browser bundle is compiled without source transformations, and served module/bundle hashes are verified.
- [Open the updated local preview](http://127.0.0.1:65060/app/?tool=maine-sld-practice). Existing preview helpers and earlier reports were preserved.
- Configured public case links remain available for the next release. This pass does not publish the new behavior.

Work is saved locally and left uncommitted. No staging, commit, push, deployment, full application build or installer build was performed. Other agents' shared changes were preserved.

## Evidence

- [Frozen activity hashes and preservation checks](frozen-activity.json)
- [Baseline hashes](baseline.json) and `before/` source copies
- [Host integration and source preview](integration/README.md)
- [Browser validation](browser-validation/TESTING.md)
- [Validation summary](browser-validation/validation-summary.json)

The preceding [usability refinement report](../maine-sld-case-lab-refinement-2026-10-02/README.md) remains a historical record of its tested snapshot.
