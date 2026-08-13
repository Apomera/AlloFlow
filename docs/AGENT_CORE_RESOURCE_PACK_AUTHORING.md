# Agent Core resource-pack authoring

The repository now has a provider-neutral headless AlloPack boundary:

- `agent_core_resource_pack_module.js` composes agent-authored history into the AlloPack v0.1 envelope, validates renderer-critical shapes, checks privacy/secret/path/size safeguards, produces a teacher-review preview, and serializes a `.allopack.json` payload.
- `desktop/mcp/alloflow-mcp-stdio.cjs` exposes `resource_pack_generate`, `resource_pack_validate`, `resource_pack_preview`, and `resource_pack_export`.
- `agent_skills/alloflow-resource-pack-authoring/SKILL.md` teaches an agent how to plan and author the supported resource shapes.

## Provider boundary

The MCP connector is intentionally provider-neutral. The calling agent may use an approved model in its own context to draft content, then submit the generated `history` to `resource_pack_generate`. The connector does not read Gemini keys, call a model, upload source text, publish content, or write arbitrary paths. This prevents an MCP install from creating undeclared classroom-data egress.

A future institution-owned adapter may inject a provider into `AgentCoreResourcePack.generate(request, provider)`, but that adapter must define its own data-location, key-storage, consent, quota, and audit policy. The provider must return structured JSON; the core service remains the validator and artifact boundary.

## Safe workflow

1. The agent gathers a topic, learning goal, source permission, grade level, and resource plan.
2. The agent drafts only the resources with a clear instructional job.
3. The agent calls `resource_pack_generate` with `confirmNoStudentPii: true` and `confirmSourcePermission: true`.
4. The MCP returns a completed local job; the agent reads it with `job_get_result`.
5. The agent calls `resource_pack_preview` and presents the teacher-review checklist.
6. After explicit teacher approval, the agent calls `resource_pack_export` to obtain the JSON payload.

Export is not publication. A teacher or district system must still decide where the pack is stored, shared, imported, or submitted to a catalog.
