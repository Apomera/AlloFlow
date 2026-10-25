# Agent Core resource-pack authoring

The repository now has a provider-neutral headless AlloPack boundary:

- `agent_core_resource_pack_module.js` composes agent-authored history into the AlloPack v0.1 envelope, validates renderer-critical shapes, checks privacy/secret/path/size safeguards, produces a teacher-review preview, and serializes a `.allopack.json` payload.
- `desktop/mcp/alloflow-mcp-stdio.cjs` exposes `resource_pack_capabilities`, `resource_pack_generate`, `resource_pack_validate`, `resource_pack_preview`, `resource_pack_export`, and `resource_pack_attach_image`.
- `agent_skills/alloflow-resource-pack-authoring/SKILL.md` teaches an agent how to plan and author the supported resource shapes.

## Provider boundary

The MCP connector is intentionally provider-neutral. The calling agent may use an approved model in its own context to draft content, then submit the generated `history` to `resource_pack_generate`. The agent or its host may also generate images and supply reviewed image bytes. The connector does not read Gemini keys, call a model, fetch images, upload source text, publish content, or write arbitrary paths. This prevents an MCP install from creating undeclared classroom-data egress.

A future institution-owned adapter may inject a provider into `AgentCoreResourcePack.generate(request, provider)`, but that adapter must define its own data-location, key-storage, consent, quota, and audit policy. The provider must return structured JSON; the core service remains the validator and artifact boundary.

## Choose the profile and preserve existing packs

The default `text` profile retains the original bounded authoring subset:
`directions`, `simplified`, `glossary`, `outline`, `quiz`, `sentence-frames`, `faq`,
`concept-sort`, `timeline`, `math`, `note-taking`, and `anchor-chart`. It rejects
embedded image payloads. This is a restriction of that profile, not of AlloFlow's
AlloPack importer.

The explicit `illustrated` profile supports embedded images and additionally
accepts authored `image`, `memory-aid`, and `applied-challenge` resources. Its
15-type still-image subset remains available for backward compatibility.

The explicit `native` profile extends that subset to the platform's native
resource catalog and saved renderer formats. It adds source analysis, activity
starters, structured discussion and jigsaw kits, adventures, persona interviews,
document-based inquiry, teacher lesson plans, standards alignment reports,
educator UDL advice, Word Sounds records, and Gemini Bridge prompt steps. The
current inventory is 25 types: every one of the 22 catalog entries, plus
`directions`, `udl-advice`, and `word-sounds`. It also supports all six notebook templates:
`cornell-notes`, `lab-report`, `reading-response`, `double-entry`, `guided-notes`,
and `q-and-a`, plus bounded animation and saved image-view state.

Discover the current type list, per-type native contracts and examples,
attachment slots, size limits, and remaining boundaries before authoring:

```js
const formats = await callTool('resource_pack_capabilities', { profile: 'native' });
// Inspect formats.resourceTypes, formats.contracts, formats.limits,
// formats.attachmentSlots, and formats.limitations.
```

Discovery defaults to `native`; the other resource-pack tools still default to
`text`. Use the selected profile consistently for generation, validation,
attachments, preview, and export. A format being supported means the MCP can
validate and preserve authored data. It does not mean the MCP can run a
simulation, start a persona conversation, generate audio/video, or provide an AI
backend. Gemini Bridge stores prompts for the external app-building workflow;
it is not a slot for executable simulation code. Adventure scenes can be
prepared and preserved, but continued play uses the runtime provider rather
than an authored offline branching graph. Specialized studio submissions and
standalone audio/video files are not resource-authoring formats. STEAM tools
launch in the application; a math resource is not a 3D-model payload. Check the
separate `capabilities` tool for deployment providers.

The `illustrated` profile supports still images. It rejects animation frames and
nonempty saved image-view `data.annotations`, including image override, caption
override, and drawing maps. Those runtime states are outside this first supported
subset. Use `native` to validate supported animation and annotations, including
image and caption overrides and bounded drawing maps. Do not strip an existing
pack's unsupported saved state to claim a lossless export; report the
compatibility error and retain the original pack for review.

For a **new draft**, set `request.profile: "native"` (or `"illustrated"` for the
original still-image subset) on
`resource_pack_generate`. Generation assembles a new AlloPack envelope from the
request and authored history; it is not a round-trip import operation.

For an **existing pack**, pass its complete parsed JSON to
`resource_pack_validate`, `resource_pack_preview`, and `resource_pack_export`
with top-level `profile: "native"` when using the full catalog. These operations preserve the accepted
pack's native fields, including pack-level metadata, resource metadata, image
credits, accessibility fields, and lesson configuration. Do not compose a fresh
pack from only its history to work around an error: that can lose information
outside the history. Unsupported types and malformed fields need correction or
an explicit compatibility change, not silent removal.

```js
// Examples of arguments to an MCP client's tool-call function.
await callTool('resource_pack_validate', { pack, profile: 'native' });
await callTool('resource_pack_preview', { pack, profile: 'native' });
await callTool('resource_pack_export', { pack, profile: 'native' });
```

## Authoring and review workflow

### Guidance beside blank note fields

Cornell note-taking cues support optional `guidance` (plain text, at most 1000
characters). The renderer shows it beside the paired response field and links it
as the field's accessible description. It stays visible while a learner writes.
It is an instruction, not learner work: keep the matching `notes[i].text` blank
in an uncompleted draft. Existing cues without guidance continue to work.

```json
{
  "templateType": "cornell-notes",
  "cues": [{ "id": "cue-1", "text": "Check a reason", "guidance": "Point to a case fact and explain how it supports your recommendation." }],
  "notes": [{ "id": "note-1", "text": "" }]
}
```

Use guidance to bring existing task instructions to the response location, not
to supply answers or introduce another task. Keep it brief and source-aligned.
For first/final comparisons, give the same criteria and needed supports at both
attempts. Keep earlier responses intact. Preview narrow screens and keyboard
navigation, and check that each field is described by its own guidance.

### Feedback after checking a concept sort

Concept-sort cards support optional `explanation` (plain text, at most 1500
characters). After **Check**, a placed card offers a **Why?** disclosure for the
authored explanation, whether the placement was correct or incorrect. The
explanation is absent from the activity before checking and hidden again when
resetting or retrying. It works without a model call, including when student AI
features are disabled. Cards without this field keep their existing behavior.

Explain the link between the card's evidence and its category, including any
important limit. Do not merely repeat the category label or infer mastery from
a corrected placement. Keep answers out of card content and image descriptions.

```json
{
  "id": "record-1",
  "content": "A proposal receives a question about its reason. No shared plan is recorded.",
  "categoryId": "reply-recorded",
  "explanation": "The question addresses the proposal's reason. This excerpt records a reply; it does not record an agreed shared plan."
}
```

### Steps

1. The agent gathers a topic, learning goal, source permission, grade level, and resource plan.
2. The agent drafts only the resources with a clear instructional job.
3. The agent calls `resource_pack_capabilities` for the intended profile and follows the per-type contracts. For a new draft, the agent calls `resource_pack_generate` with `confirmNoStudentPii: true` and `confirmSourcePermission: true` in `request.privacy`, and `request.profile: "native"` for the full native catalog. `"illustrated"` remains available for the original still-image subset. For an existing pack, the agent starts by validating the complete pack with its selected profile.
4. For generation, the MCP returns a completed local job; the agent reads it with `job_get_result`. Validation, attachment, preview, and export return their results directly.
5. The agent attaches any reviewed images, validates the resulting complete pack, then calls `resource_pack_preview` and presents the teacher-review checklist. The preview is a structured content and validation summary, not a browser rendering.
6. When the teacher requests an export, the agent calls `resource_pack_export` with the same profile to obtain the JSON payload. Existing authorization to create the pack includes preparing its reviewable export; no extra approval is required for that preparation.
7. Import the export in AlloFlow and inspect the actual student and teacher views, including image meaning, captions, alt text, reading order, activities, and answer visibility. Tool validation does not replace this rendering and teaching review.

Export is not publication. A teacher or district system must still decide where the pack is stored, shared, imported, or submitted to a catalog.

## Attach an image

`resource_pack_attach_image` takes a complete pack and returns
`{ ok: true, value: updatedPack, ... }` on success. It does not mutate the input,
fetch a URL, read an image file, generate an image, or write an export. The calling
agent or host must obtain the image data through its own authorized tools. The
MCP records the same redacted local audit metadata as its other draft operations.

```js
await callTool('resource_pack_attach_image', {
  pack,
  profile: 'illustrated',
  attachment: {
    resourceId: 'reading-space-glossary',
    slot: 'glossary',
    index: 0,
    dataUrl: reviewedImageDataUrl,
    alt: 'Three students compare a table area and a quiet reading corner.',
    decorative: false,
    altSource: 'vision'
  }
});
```

`resourceId` identifies the resource already present in the pack. `index` is
zero-based. A target must
exist and match the resource shape; the operation does not invent rows or panels.
Retain the returned complete `value` for the next call.

| Slot | Resource type | Target selected by `index` | Profiles |
|---|---|---|---|
| `glossary` | `glossary` | `data[index]` | illustrated, native |
| `panel` | `image` | `data.visualPlan.panels[index]` | illustrated, native |
| `anchor` | `anchor-chart` | `data.sections[index]` | illustrated, native |
| `sort` | `concept-sort` | `data.items[index]` | illustrated, native |
| `single` | `image` | `data.imageUrl`; index must be 0 | native |
| `timeline` | `timeline` | `data.items[index]` | native |
| `frame` | `image` | `data.visualPlan.panels[panelIndex].frames[index]` | native |
| `override` | `image` | Saved image override for existing panel `index` | native |
| `memory` | `memory-aid` | `data.cards[index].visualImage` | native |
| `challenge` | `applied-challenge` | `data.visual.image`; index must be 0 | native |

The attachment tool writes the native image, alt, hash, source, and decorative
fields for that slot. It leaves the target's other fields intact. The validator
also accepts native single-image `image` resources and images on `timeline`
entries (`data.items[].image`) in the illustrated profile. Native adds attachment
support for them. Frame and override attachments retain the renderer's string
image fields and associate accessibility metadata with the owning panel.

A frame replacement also requires `playbackDataUrl`, a re-encoded GIF containing
the revised sequence. The MCP updates the selected still frame and playback
together; it does not encode the GIF. Inspect both playback and frame stepping
in the renderer. A description for hidden artwork must not replace the
description of the currently displayed override or first frame.

A native animation panel supplies GIF playback in `imageUrl`, 2–60 embedded
still-image strings in `frames`, a `motionPrompt`, and one `motionSteps` string
for each transition after the first frame. The GIF and still frames must agree
in frame count and canvas size. Optional `fps` is 2–24. This preserves the
renderer’s pause, reduced-motion, and frame-stepping controls. Validation checks
containers and dimensions; it does not prove the encoded frames depict the
same content, so the actual playback must still be reviewed.

Memory-aid and applied-challenge visuals retain their native review gates.
Replacing artwork invalidates a prior visual approval; attachment is not
educator approval. Complete the resource's illustration review in the application
before describing the cue or challenge illustration as ready for learners.

Supported image data URLs contain base64 PNG, JPEG, or WebP; native also accepts
bounded GIF. SVG, remote image URLs, local file paths, and arbitrary data URLs
are not accepted image payloads. Resize
or compress images in the host before attaching when necessary. This tool
performs bounded format and dimension checks; it does not judge scientific or
instructional accuracy.

Alt text describes the image's relevant information in the activity. Use an
empty string only for an explicitly decorative image (`decorative: true`).
`altSource` records `vision`, `author`, or `planning`; its default is `planning`.
Use `author` for a human-written description, or `vision` for a description based
on inspection of the actual image. Keep unverified descriptions as `planning`.
Neither generation prompts
nor planned captions prove what the rendered image contains. The tool calculates
the hash associating alt metadata with the image. Validation requires a current
hash for informative glossary, sort, panel, and timeline images; it checks an anchor or
single-image hash when supplied. Preserve credits, licenses, captions, and
existing accessibility metadata as part of the complete pack. A hash confirms
which image the description belongs to, not whether that description is accurate.

Illustrated- and native-profile limits:

| Limit | Maximum |
|---|---:|
| Compact serialized pack | 2,000,000 characters |
| Non-image pack text | 500,000 characters |
| Non-image text in one resource | 120,000 characters |
| Decoded bytes per image | 1,000,000 bytes |
| Decoded bytes across image placements | 1,500,000 bytes |
| Width or height | 4,096 pixels |
| Pixels per image | 16,777,216 |
| Image placements | 256 |
| Alt text | 250 characters |
| Native animation frames | 60 |
| Native annotation entries | 256 |
| Native drawing points | 4,096 |

Both profiles allow at most 24 resources. Native allows nested renderer data up
to depth 16; the older profiles retain depth 8. Limits bound a draft, not the
number of types in the capability inventory. Split larger teaching units into
coherent packs instead of removing accessibility or provenance fields.

Repeated placements count toward the aggregate media budget. If validation
fails, report its code and location and make a targeted correction. Do not remove
metadata, mark an informative image decorative, or strip images merely to make
the default text profile pass.

Illustrated and native exports use compact JSON to stay within the serialized size budget;
text-profile exports retain their existing formatted JSON output.
