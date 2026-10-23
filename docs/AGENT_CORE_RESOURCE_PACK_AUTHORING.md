# Agent Core resource-pack authoring

The repository now has a provider-neutral headless AlloPack boundary:

- `agent_core_resource_pack_module.js` composes agent-authored history into the AlloPack v0.1 envelope, validates renderer-critical shapes, checks privacy/secret/path/size safeguards, produces a teacher-review preview, and serializes a `.allopack.json` payload.
- `desktop/mcp/alloflow-mcp-stdio.cjs` exposes `resource_pack_generate`, `resource_pack_validate`, `resource_pack_preview`, `resource_pack_export`, and `resource_pack_attach_image`.
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
accepts authored `image`, `memory-aid`, and `applied-challenge` resources. These
15 types are the supported MCP subset; the app supports additional native types.
Use the selected profile consistently for validation, attachments, preview, and
export.

This initial profile supports still images. It rejects animation frames and
nonempty saved image-view `data.annotations`, including image override, caption
override, and drawing maps. Those runtime states are outside this first supported
subset. Attach reviewed artwork directly to the native panel fields and edit
native panel captions and labels. Do not strip an existing pack's unsupported
saved state to claim a lossless export; report the compatibility error and retain
the original pack for review.

For a **new draft**, set `request.profile: "illustrated"` on
`resource_pack_generate`. Generation assembles a new AlloPack envelope from the
request and authored history; it is not a round-trip import operation.

For an **existing pack**, pass its complete parsed JSON to
`resource_pack_validate`, `resource_pack_preview`, and `resource_pack_export`
with top-level `profile: "illustrated"`. These operations preserve the accepted
pack's native fields, including pack-level metadata, resource metadata, image
credits, accessibility fields, and lesson configuration. Do not compose a fresh
pack from only its history to work around an error: that can lose information
outside the history. Unsupported types and malformed fields need correction or
an explicit compatibility change, not silent removal.

```js
// Examples of arguments to an MCP client's tool-call function.
await callTool('resource_pack_validate', { pack, profile: 'illustrated' });
await callTool('resource_pack_preview', { pack, profile: 'illustrated' });
await callTool('resource_pack_export', { pack, profile: 'illustrated' });
```

## Authoring and review workflow

1. The agent gathers a topic, learning goal, source permission, grade level, and resource plan.
2. The agent drafts only the resources with a clear instructional job.
3. For a new draft, the agent calls `resource_pack_generate` with `confirmNoStudentPii: true` and `confirmSourcePermission: true` in `request.privacy`, and `request.profile: "illustrated"` when images or the additional resource types are needed. For an existing pack, the agent starts by validating the complete pack with its selected profile.
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

`resourceId` identifies the resource already present in the pack. `slot` is
`glossary`, `panel`, `anchor`, or `sort`, and `index` is zero-based. A target must
exist and match the resource shape; the operation does not invent rows or panels.
Retain the returned complete `value` for the next call.

| Slot | Resource type | Target selected by `index` |
|---|---|---|
| `glossary` | `glossary` | `data[index]` |
| `panel` | `image` | `data.visualPlan.panels[index]` |
| `anchor` | `anchor-chart` | `data.sections[index]` |
| `sort` | `concept-sort` | `data.items[index]` |

The attachment tool writes the native image, alt, hash, source, and decorative
fields for that slot. It leaves the target's other fields intact. The validator
also accepts native single-image `image` resources and images on `timeline`
entries (`data.items[].image`); the attachment tool's initial four slots target
the rows and panels listed above.

Supported image data URLs contain base64 PNG, JPEG, or WebP. SVG, GIF, remote
image URLs, local file paths, and arbitrary data URLs are not accepted. Resize
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

Illustrated-profile limits:

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

Repeated placements count toward the aggregate media budget. If validation
fails, report its code and location and make a targeted correction. Do not remove
metadata, mark an informative image decorative, or strip images merely to make
the default text profile pass.

Illustrated exports use compact JSON to stay within the serialized size budget;
text-profile exports retain their existing formatted JSON output.
