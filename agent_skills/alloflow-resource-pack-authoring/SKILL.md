---
name: alloflow-resource-pack-authoring
description: Author, review, validate, preview, and export teacher-ready AlloPacks through the AlloFlow Agent Core and MCP without opening the AlloFlow UI.
---

# AlloFlow resource-pack authoring

Use this skill when a teacher, curriculum designer, or school leader wants a coherent AlloFlow resource pack produced by an agent.

## Safety boundary

The agent may draft instructional content in its approved model context, but the MCP connector must remain the artifact boundary. It does not silently call Gemini, read API keys, upload source text, publish a pack, or write arbitrary filesystem paths. A provider-specific model call is the agent host's responsibility and must follow the institution's data policy.

Never include student names, IDs, email addresses, health information, disability labels, accommodation details, behavior records, or grouping rationale in a pack. Ask for fictional or de-identified source material when the request is ambiguous.

## Authoring workflow

1. Ask for the topic, grade level, language, learning goal, source permission, and the resource types that have a clear instructional job.
2. Keep the source and learning goal as the common intellectual center. Do not lower the goal merely to make a resource easier to read.
3. Draft only the requested resources. A useful first pack usually includes directions, one access support, one practice or organization support, and one evidence-of-learning item.
4. Return structured AlloPack history entries, not prose about the entries.
5. Call `resource_pack_generate` with the generated `history` and explicit privacy attestations. This tool is named for the generation workflow, but the connector is intentionally provider-neutral: it assembles and validates the agent's draft; it does not perform hidden model calls.
6. Call `resource_pack_preview` and report the teacher-review checklist.
7. Revise if validation reports a renderer-shape or privacy error.
8. Export only after the teacher asks for the `.allopack.json` payload. Publication and student distribution remain human decisions.

## Required request fields

```json
{
  "requestId": "pack-water-cycle-1",
  "title": "Water cycle resource pack",
  "sourceTopic": "Water cycle",
  "gradeLevel": "6th Grade",
  "language": "en",
  "standards": "NGSS MS-ESS2-4 (water cycles and weather)",
  "learningGoal": "Explain how water changes state in a repeating cycle.",
  "privacy": {
    "confirmNoStudentPii": true,
    "confirmSourcePermission": true
  },
  "history": []
}
```

## Supported resource shapes

The current service validates these renderer-critical types: `directions`, `simplified`, `glossary`, `outline`, `quiz`, `sentence-frames`, `faq`, `concept-sort`, `timeline`, `math`, `note-taking`, and `anchor-chart`.

Important shape rules:

- Every item has a unique `id`, a `type`, a bounded `title`, `data`, and a display-string `meta`.
- `directions.data` is markdown or `{body, objectives}`.
- `simplified.data` is markdown.
- `glossary.data` contains `{term, def, tier}` rows.
- `quiz.data` contains questions and reflections. MCQ `correctAnswer` must exactly equal one option.
- `concept-sort` items must reference an existing category.
- `note-taking` cue and note arrays must have matching lengths.
- Do not embed `data:image/...` bytes; use image slots or approved asset handles in a later media workflow.

## Teacher review language

Always call generated content a draft until a teacher checks:

- source fidelity and citations;
- the learning goal and cognitive demand;
- answer keys, translations, calculations, and examples;
- accessibility, reading order, alt text, keyboard use, and response options;
- the student preview and teacher-only boundaries.

If validation fails, explain the error code and revise the artifact. Do not bypass the validator by dropping fields or changing the type to an unsupported generic value.
