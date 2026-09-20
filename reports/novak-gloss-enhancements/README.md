# Contextual reading-gloss evaluation

The production generator now asks for short meanings that fit the surrounding lines, speakers, and stage directions. It distinguishes comprehension-critical `priority: essential` proposals from `helpful` enrichment, preserves ambiguity and paradox, and avoids invented literary detail. Generated annotations always have `origin: generated` and `pinned: false`; an AI response cannot impersonate teacher curation. The host applies the shared merge helper when saving refreshed suggestions.

## Macbeth acceptance material

`macbeth-act1-scene1.fixture.json` contains the complete opening scene extracted exactly from the local public-domain Project Gutenberg book. It includes all 553 characters and 33 lines, from the ACT I heading through [Exeunt.], including verse, speaker labels, and stage directions. Its source offsets and SHA-256 are recorded.

This edition spells the familiar **Graymalkin**. A separate, clearly labeled spelling stress test changes only that name to **Grimalkin**; it is not represented as another source edition. The canonical fixture remains unchanged.

The four acceptance targets are:

| Occurrence | Meaning to check |
| --- | --- |
| heath | Open, uncultivated ground; not a hearth or a health reference. |
| hurlyburly’s | Noisy confusion or turmoil, in the battle context. |
| Anon | Soon/right away, in the witch’s response; not anonymous. |
| Graymalkin / Grimalkin | The witch’s cat-like familiar or spirit companion; not another witch. |

The stored reference phrases are evaluator examples, not supplied to the model. The production prompt and source occurrence IDs are captured independently.

## Actual evaluation status

**Live model quality remains unverified.** The bounded live command was attempted through the existing `dev-tools/run_text_complexity_live_pilot.cjs` provider adapter. Its documented Gemini, OpenAI, and Claude environment configurations all reported `missing-credential`. No explicitly configured local backend was available to this adapter. The run made **zero logical model calls and zero HTTP attempts**.

See `live-evaluation.json`: every case remains `not-run`, with human review pending. Browser storage, keychains, configuration files, and network endpoints were not searched for credentials. An app connection, if configured separately, is not proven available by this CLI result.

## Reproduce

Run the mechanical tests:

```powershell
node node_modules/vitest/vitest.mjs run tests/novak_gloss_quality.test.js tests/novak_generation_preservation.test.js --pool=threads --maxWorkers=1
```

Capture production prompts without model calls:

```powershell
node reports/novak-gloss-enhancements/evaluate.cjs
```

With an already configured provider in the adapter’s documented environment, run up to three sequential calls (canonical scene at grades 5 and 8, plus the Grimalkin spelling variant at grade 8):

```powershell
node reports/novak-gloss-enhancements/evaluate.cjs --execute
```

The adapter also accepts its existing `--backend`, `--model`, and `--base-url` arguments for an explicitly configured provider. Credentials remain in the provider adapter and are never printed. The evaluator saves only public-domain prompts, returned gloss proposals, and non-secret evaluation metadata in this directory.

## What the checks establish

Automated checks verify source immutability, fixture-byte equality, exact UTF-16 anchors, all verse/speaker lines, validated generated metadata, and complete processing coverage. Separate meaning-pattern checks flag missing target terms and obvious wrong senses.

Passing these checks does **not** certify literary accuracy, reading-level fit, or usefulness. Test-double responses establish wiring and invariants only. Any received model output still requires a human to review contextual meaning, concision, ambiguity, and priority using the included rubric. The small fixture cannot establish performance across literature, languages, or classrooms.
