# Agent Core media foundation - Phase 1B

Date: 2026-07-15

## Added

### Managed asset store

`agent_core_managed_asset_store_module.js` is an in-memory reference store for
future trusted runtime adapters. It:

- imports `Uint8Array`/`ArrayBuffer` image bytes into bounded memory;
- returns opaque `asset_*` handles and metadata without returning bytes;
- rejects paths, URLs, embedded data fields, credentials, and unsupported MIME
  types;
- enforces per-asset, total-byte, and asset-count limits;
- records semantic artifact/slot attachments without mutating artifacts;
- prevents removal of attached assets and zeroes bytes on removal;
- requires an explicit adapter-read purpose before returning a byte copy.

It performs no filesystem or network I/O and is not registered with MCP.

### Strict security facade

Future runtime adapters should use `agent_core_media_security_module.js`. The
facade adds:

- broader rejection of authorization, bearer, private-key, and credential
  fields;
- explicit rejection of prompts and model reasoning in media results;
- provider/model result-label validation;
- an injected `authorizeByteRead` callback that cannot be replaced by a caller
  self-asserting `{ approved: true }`.

The lower-level store remains a reference primitive; the strict facade is the
required integration boundary.

### Gemini regression fixtures

`test_data/agent_core/gemini_request_shapes.json` and
`tests/gemini_media_request_shapes.test.js` pin the existing Gemini behavior
without editing `ai_backend_module.js`:

- JSON-mode generation configuration;
- Google Search grounding tool shape;
- safety settings;
- API-key and keyless URL construction;
- Imagen generation endpoint and payload;
- image editing with both source and reference images.

These fixtures protect the current Gemini path when new provider adapters are
implemented later.

## Still disabled

No module added in this phase is loaded by the production application or MCP
server. There are still no agent-callable asset operations, provider calls,
paid operations, filesystem writes, or changes to Gemini routing.

## Verification

```bash
npx vitest run tests/agent_core_media_contracts.test.js tests/agent_core_managed_asset_store.test.js tests/agent_core_media_security.test.js tests/gemini_media_request_shapes.test.js tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/mcp_stdio_smoke.test.js
npm run verify:gemini
```

