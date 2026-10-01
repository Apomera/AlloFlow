# Circuit AI tutor reliability

## Implemented

- Requests are tied to the circuit, question, and grade band that initiated them. The comparison key stays in local memory.
- Circuit or question edits invalidate a pending reply and explain how to ask again. The completion updater also compares the latest host state, covering an edit and reply arriving in the same React batch.
- Leaving the Simple workbench invalidates the request and clears its busy state. A reply from the previous mount cannot replace a later answer.
- Synchronous exceptions, rejected promises, empty replies, and unsupported return values produce a retry message and release the busy state. Valid synchronous strings are supported.
- “Stop waiting” releases the interface immediately and ignores the outstanding reply. It does not claim to cancel a request already sent to the provider.
- Empty questions and duplicate clicks do not start additional requests. A saved busy flag is cleared when the workbench mounts.
- Waiting and result messages use status regions. New messages use the existing translation helper with English fallbacks.
- After explicit user approval, Ask includes a structured snapshot of component settings and calculated voltage, current, and power. It states the steady-DC model limits and preserves undetermined readings as `null`. Notebook notes, history, and previous AI replies remain excluded.

## Validation

Ran:

```text
node node_modules/vitest/vitest.mjs run tests/circuit_ai_tutor.test.js tests/circuit_localization.test.js --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000 --reporter=dot
```

The initial lifecycle/localization run passed **17 tests** across two files. The AI tests use controlled mock providers and deferred promises; no real AI requests were made. The follow-up payload tests check resistor and LED readings, ambiguous capacitor voltages, parallel short-circuit behavior, and exclusion of notebook notes, history, and prior answers.

After adding the approved payload, the focused `tests/circuit_ai_tutor.test.js` run passed **all 17 tests** (payload and lifecycle checks). No real provider was called.

The coordinating agent owns public mirror synchronization and broader verification.

## Context enhancement approval

Automatic approval review rejected the combined patch before any of it was applied, with this reason:

> The patch expands the AI tutor request to export detailed circuit configuration and solver readings plus the user’s question to the external Gemini destination; the user authorized improvements but not this specific sensitive-data payload or destination.

The lifecycle changes were completed first without expanding the payload. The user then explicitly answered **“Include circuit settings and readings”** to the question asking permission to include component settings and calculated voltage/current/power in the existing Gemini request while excluding notebook notes. The structured context and exact model-limit text in `ai-context-proposal.md` are now implemented under that authorization. The provider integration is unchanged.
