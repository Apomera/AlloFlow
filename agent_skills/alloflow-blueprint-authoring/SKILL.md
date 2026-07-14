---
name: alloflow-blueprint-authoring
description: Author, revise, and validate AlloFlow lesson Blueprints (versioned schema 1.0). Use when a teacher asks for an AlloFlow lesson pack, differentiated resource plan, or AlloPack, or when preparing input for AlloFlow's Auto-Fill/Blueprint mode or the alloflow MCP tools.
---

# AlloFlow Blueprint authoring

AlloFlow is an open-source educational workflow app. Its unit of work is a
**Blueprint**: a reviewable plan describing which learning resources to
generate from a source text, for whom, and how. Teachers review and approve a
Blueprint before anything is generated — never present a Blueprint as if it
will run automatically.

## Blueprint schema (version 1.0)

```json
{
  "schemaVersion": "1.0",
  "blueprintId": "bp-water-cycle-g5",
  "audience": { "gradeLevel": "5th Grade", "language": "English", "interests": "soccer, space" },
  "standards": "NGSS 5-ESS2-1",
  "sourcePolicy": { "kind": "workspace-source" },
  "lessonDNA": {
    "essentialQuestion": "How does water move through Earth's systems?",
    "goldenThread": ["evaporation", "condensation", "precipitation"],
    "keyTerms": ["evaporation", "condensation", "precipitation", "collection", "runoff"]
  },
  "globalSettings": { "gradeLevel": "5th Grade", "tone": "Informative" },
  "plan": [
    { "tool": "analysis", "directive": "Analyze the source for key ideas and vocabulary." },
    { "tool": "glossary", "directive": "Tier 2/3 vocabulary from the golden thread." },
    { "tool": "quiz", "directive": "5 questions testing the essential question, DOK 2." },
    { "tool": "lesson-plan", "directive": "Teacher-facing synthesis referencing the resources above." }
  ],
  "configs": {
    "quizConfig": { "count": 5, "dok": "Level 2" },
    "outlineConfig": { "type": "Flow Chart" }
  },
  "review": { "state": "draft" }
}
```

## Valid tools (`plan[].tool`)

`analysis`, `simplified`, `glossary`, `outline`, `image`, `quiz`,
`sentence-frames`, `brainstorm`, `timeline`, `concept-sort`, `adventure`,
`faq`, `persona`, `dbq`, `note-taking`, `anchor-chart`, `math`,
`lesson-plan`, `gemini-bridge`, `alignment-report`.

Any other tool id fails validation (fail closed).

## Rules that validation enforces

1. **Ordering invariant:** `analysis` items first, `lesson-plan` last. The
   validator reorders silently, but author in that order anyway.
2. **Non-empty plan** with known tools only.
3. **No secrets, no paths:** field names matching key/token/secret/password
   anywhere, or absolute filesystem paths in values, are rejected.
4. **Draft state:** always author with `"review": { "state": "draft" }`.
   Only a human approval transition makes a Blueprint executable.
5. Unknown top-level fields are dropped with a warning — don't invent fields.

## Pedagogy conventions

- **lessonDNA is the spine.** One essential question phrased as a question
  students answer; 3–5 golden-thread concepts (short phrases); exactly ~5 key
  terms. Every directive should serve the golden thread.
- **Directives are specific**, one sentence, and name what the resource must
  cover ("Venn diagram comparing weathering and erosion"), not generic
  ("make an outline").
- Start with `analysis`; include `glossary` for content-heavy texts; pick
  `outline` type by content topology (comparative → Venn, procedural → Flow
  Chart); `quiz` tests the essential question; `persona` is excellent for
  history/literature/biography and often overlooked.
- Differentiation: use `simplified` with an explicit target reading level in
  the directive, and `sentence-frames` for ELL/structured-response support.
- 6–9 resources is a robust default pack; fewer for very short sources.

## Validating your work

If the `alloflow` MCP connector is available, call `blueprint_validate`
(and `capabilities` first to see what the deployment provides — an `image`
plan item requires the `imageGeneration` capability).

From a checkout without MCP:

```bash
node -e "const C=require('./agent_core_contracts_module.js');const bp=require('./bp.json');console.log(JSON.stringify(C.validateBlueprint(bp),null,2))"
```

A result is usable when `ok` is `true`; fix every `errors[].code` otherwise
(`unknown-tool`, `empty-plan`, `unsupported-version`, `secret-like-field`,
`unsafe-path-value`, `missing-blueprint-id` are the common ones).

## Handing off

Give the teacher the validated Blueprint JSON plus a two-sentence summary of
the pack and the essential question. Remind them it generates nothing until
they approve it in AlloFlow (Auto-Fill Blueprint review step or the Agent
Core approval transition).
