---
name: alloflow-resource-pack-authoring
description: Author, illustrate, validate, and export AlloPack drafts through the AlloFlow Agent Core and MCP, preserving existing pack metadata for classroom review.
---

# AlloFlow resource-pack authoring

Use this skill when a teacher, curriculum designer, or school leader wants a coherent AlloFlow resource pack produced by an agent.

## Safety boundary

The agent may draft instructional content and generate images in its approved model context, but the MCP connector remains the artifact boundary. It does not silently call Gemini, read API keys, fetch images, upload source text, publish a pack, or write arbitrary filesystem paths. Model calls and image generation are the agent host's responsibility and must follow the institution's data policy.

Never include student names, IDs, email addresses, health information, disability labels, accommodation details, behavior records, or grouping rationale in a pack. Ask for fictional or de-identified source material when the request is ambiguous.

## Authoring workflow

1. Use the supplied topic, grade level, language, learning goal, source permission, and resource plan. Ask only for missing information that materially affects the work.
2. Keep the source and learning goal as the common intellectual center. Do not lower the goal merely to make a resource easier to read.
3. Draft only the requested resources. A useful first pack usually includes directions, one access support, one practice or organization support, and one evidence-of-learning item.
4. Return structured AlloPack history entries, not prose about the entries.
5. Call `resource_pack_capabilities` with `profile: "native"` to discover resource types, contracts, examples, notebook templates, image slots, and limits. For a new draft, call `resource_pack_generate` with generated `history`, explicit privacy attestations, and `request.profile: "native"` for the full native catalog. The connector assembles and validates the agent's draft; it does not perform hidden model calls. For an existing pack, validate its complete parsed JSON instead of generating a new envelope from its history.
6. Attach any reviewed images, validate the complete pack, and call `resource_pack_preview` with the same profile. Report the teacher-review checklist and unresolved image review needs.
7. Revise if validation reports a renderer-shape or privacy error.
8. Export the `.allopack.json` payload when requested or as part of an already authorized pack deliverable. Import it in AlloFlow for actual rendering and interaction review before describing it as classroom-ready. Publication and student distribution require the user's authorization.

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

The default `text` profile validates these renderer-critical types: `directions`, `simplified`, `glossary`, `outline`, `quiz`, `sentence-frames`, `faq`, `concept-sort`, `timeline`, `math`, `note-taking`, and `anchor-chart`. It retains the original restriction on embedded images.

The explicit `illustrated` profile supports embedded images and adds `image`, `memory-aid`, and `applied-challenge`, preserving the original 15-type subset.

The explicit `native` profile covers the full supported native catalog, including
analysis, discussion/jigsaw activities, adventures, persona interviews,
document-based inquiry, teacher lesson plans, alignment reports, educator UDL
advice, Word Sounds records, and Gemini Bridge prompt steps. It also supports all six notebook templates, animation and
saved image-view state. Use `resource_pack_capabilities` for exact per-type
contracts and examples; do not guess shapes from the resource title.

Format support does not provide an AI backend or execute an artifact. The MCP
does not start persona conversations, run simulations, or generate audio/video.
Gemini Bridge contains prompt steps for the external app-building workflow, not
executable app code. Adventure scenes require a runtime provider for continued
play. Specialized studio submissions and standalone audio/video files are not
resource-authoring contracts; STEAM tools launch in the application.

The illustrated still-image profile rejects animation frames and nonempty saved
image-view annotations or overrides. Use native panel image, caption, and label
fields for clean authored resources, or choose native for supported saved state.
Preserve an existing pack's original saved state when reporting a compatibility
error; do not remove it to force export.

Important shape rules:

- Every item has a unique `id`, a `type`, a bounded `title`, `data`, and a display-string `meta`.
- `directions.data` is markdown or `{body, objectives}`.
- `simplified.data` is markdown.
- `glossary.data` contains `{term, def, tier}` rows.
- `quiz.data` contains questions and reflections. MCQ `correctAnswer` must exactly equal one option.
- `concept-sort` items must reference an existing category.
- Cornell `note-taking` cue and note arrays must have matching lengths. Native also supports `lab-report`, `reading-response`, `double-entry`, `guided-notes`, and `q-and-a`; use each template's contract.
- Use illustrated or native and `resource_pack_attach_image` for embedded images; do not force illustrated content through the text-only profile.

## Existing packs and illustrated exports

Pass `{ pack, profile: "native" }` (or `"illustrated"` for that subset) to `resource_pack_validate`,
`resource_pack_preview`, and `resource_pack_export`. The complete accepted pack
and its metadata survive export, including fields outside `history`. Generation
composes a new envelope and is not an import round trip. Never drop credits,
lesson configuration, resource fields, or accessibility metadata to make a pack
fit the generation request.

The preview is a structured review summary, including aggregate media statistics.
It is not a rendered student view. Check the exported pack in the
actual AlloFlow renderer for layout, learning activities, and teacher-only content.

## Image attachments

Generate or obtain images using the calling host's authorized tools, inspect the
result, then attach self-contained base64 PNG, JPEG, or WebP data URLs:

```js
resource_pack_attach_image({
  pack,
  profile: 'illustrated',
  attachment: {
    resourceId: 'glossary-water-cycle',
    slot: 'glossary',
    index: 0,
    dataUrl: reviewedImageDataUrl,
    alt: 'Two views of the same pavement show a puddle becoming smaller.',
    altSource: 'vision'
  }
});
```

This example represents tool arguments, not a built-in JavaScript function.
Illustrated slots are `glossary`, `panel`, `anchor`, or `sort`. Native adds
`single` (index 0), `timeline`, `frame` (with `panelIndex`), `override` (panel
index), `memory` (card index), and `challenge` (index 0); the zero-based target
must already exist. Replacing a frame also requires a re-encoded GIF in
`playbackDataUrl` so both playback and frame stepping show the revised sequence.
Memory and challenge attachments retain native illustration review gates and
invalidate an earlier approval when the artwork changes. The tool returns
`{ ok, errors, warnings, value }`; on success,
use the full updated `value` for subsequent calls. The input pack is unchanged.
It does not generate images, fetch URLs, or read or write image files. The MCP
records its usual redacted local audit metadata.

Supply alt text of at most 250 characters that reflects the image's instructional
meaning. Use `decorative: true` with empty alt text only for a decorative image.
`altSource` can be `vision` for actual-image inspection, `author` for a
human-written description, or `planning` for an unverified draft; it defaults to
`planning`.
Do not label a description as reviewed solely because it matches the generation
prompt. The tool associates alt metadata with the current image using hashes;
retain them and review alt text again when changing the image.

Native also accepts bounded GIF; illustrated remains PNG/JPEG/WebP only.
SVG, remote URLs, and file paths are not accepted image payloads. The profile
bounds image bytes, dimensions, placement count, text, and total serialized size.
For exact limits and complete workflow details, read
[the authoring reference](../../docs/AGENT_CORE_RESOURCE_PACK_AUTHORING.md).

## Teacher review language

Always call generated content a draft until a teacher checks:

- source fidelity and citations;
- the learning goal and cognitive demand;
- answer keys, translations, calculations, and examples;
- accessibility, reading order, alt text, keyboard use, and response options;
- the student preview and teacher-only boundaries.

If validation fails, explain the error code and revise the artifact. Do not bypass the validator by dropping fields or changing the type to an unsupported generic value.
