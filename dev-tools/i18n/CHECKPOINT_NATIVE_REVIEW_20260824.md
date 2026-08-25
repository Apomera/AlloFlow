# Checkpoint native-review handoff — 2026-08-24

The optional student checkpoint now has hand-authored wording in all 62 included
language packs. Six low-resource packs contain complete editing drafts rather than
confirmed native translations:

- `acholi`
- `chin_falam`
- `chin_hakha`
- `karen`
- `lingala`
- `marshallese`

The drafts are already present in both `lang/<slug>.js` and
`desktop/web-app/public/lang/<slug>.js`. Their source payloads are split between:

- `checkpoint_hand_translations_20260824_batch_c.json` (`acholi`, `lingala`)
- `checkpoint_hand_translations_20260824_batch_d.json` (the other four)

## Meaning that must survive editing

This is an optional, non-evaluative reflection panel for a student who has already
written something. It asks one question at a time. A student may defer a question,
mark it as unrelated, answer by speaking, choosing, pointing, or typing, and keep
their work open throughout.

In particular:

- `checkpoint.no_grade` must clearly say there is no grade and no timer.
- `checkpoint.speak` must say speech becomes text on this device. Do not imply that
  the audio is uploaded.
- `checkpoint.support_note` ends with a space because a dynamic list of existing
  accessibility supports follows it.
- `checkpoint.support_note2` follows that dynamic list and must begin with sentence
  punctuation. Only the answer helper is paused; the student's other supports stay
  available.
- `checkpoint.misfit` is a neutral student choice, not an error or refusal.
- `checkpoint.later` is a student-authored defer action: “I’ll come back to this.”

## English reference

| Key | English meaning |
| --- | --- |
| `offer` | Talk about your work |
| `offer_sub` | A couple of questions about what you wrote. You can skip them. |
| `working` | Getting a question ready... |
| `too_little` | Write a bit more first, then this can ask you about it. |
| `answer` | Answer |
| `answer_label` | Your answer |
| `later` | I’ll come back to this |
| `listening` | Listening; say your answer |
| `misfit` | This question doesn’t fit my work |
| `mode_audio` | Speak |
| `mode_choice` | Choose |
| `mode_point` | Point to it |
| `mode_text` | Type |
| `no_grade` | Not graded, no timer, work stays open |
| `point_help` | Select the relevant sentence, then press Answer |
| `speak` | Speak the answer; it becomes on-device text |
| `support_note` | Existing supports remain available |
| `support_note2` | Only the answer helper is paused |
| `title` | A quick check-in about the student’s work |

## Reapply and verify

The updater is dry-run by default and refuses to overwrite a different non-English
value. After a native edit, update the matching payload as the audit record, then run:

```text
node dev-tools/i18n/apply_checkpoint_translations_20260824.cjs <payload.json>
node dev-tools/i18n/apply_checkpoint_translations_20260824.cjs <payload.json> --apply
node dev-tools/i18n/audit_runtime_pack_coverage.cjs --namespace=checkpoint --quiet --gate
```

Do not record these six drafts as native-reviewed until a reviewer has confirmed
the wording. Preserve the emoji prefixes on the listening and response-mode labels.
