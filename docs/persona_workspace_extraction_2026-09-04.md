# Safe Persona workspace CDN extraction — 2026-09-04

The Persona selection workspace and teacher editor presentation now live in `view_persona_workspace_source.jsx`, compiled to `view_persona_workspace_module.js` and its desktop public mirror. AlloFlow loads the module only when the Persona workspace opens.

## Size and behavior

| Measure | Result |
|---|---:|
| Canonical AlloFlowANTI.txt reduction from this edit | 30,176 bytes |
| Reduction in each desktop shell copy | 30,218 bytes |
| New compiled CDN module | 23,877 bytes |
| New module gzip size | 5,099 bytes |
| Explicit host dependencies | 29 |

The new source is 32,890 bytes including the component signature. The extracted JSX is unchanged from the pre-edit block after newline normalization. The net shell reduction includes the new prop wiring, lazy loader, and fallback wrapper. The shared tree continued changing during the work, so these edit-specific savings should not be inferred from a whole-tree Git diff or a later total file size.

The host still owns Persona state, generation, conversation/session persistence, retention normalization and deletion, grounding-link validation, teacher editor actions, and the editor focus trap. The view receives the same values, callbacks, icons, ErrorBoundary, and editor ref explicitly. Selection, panel-size guards, busy-state locks, completed-quest protection, disclosures, and existing translation calls stay in the presentation.

A recoverable inline fallback uses the existing `_AlloRecoverableLazyView` implementation. It announces loading/failure, offers Retry and Back, and renders the latest host props after module registration. Back returns to the input workspace without deleting Persona state. The loader has no sticky started flag; the existing module registry handles deduplication and retry. The module itself also ignores duplicate registration.

The canonical CDN URL is content-pinned to `75c597c6b9` for the generated module in this snapshot. Desktop shell copies retain local `./view_persona_workspace_module.js` URLs. `build.js` has narrow MODULES and COMPILE_PAIRS entries; its compile wrapper is pure and uses the new focused builder. The compact distribution builder automatically discovers the lazy module. The theme generator already scans `view_*_source.jsx`, so the moved classes remain in its input set.

Recovery/storage dialogs were deliberately left inline because their availability matters when startup or storage is already failing. This extraction reduces initial shell parsing and defers the new module until use; it is not a measured whole-application speedup.

## Validation

- 74 focused tests passed across the new extraction suite, existing Persona interview/runtime/core/UI-resilience suites, and root-boundary integrity checks.
- Existing source-based presentation assertions were redirected to the new view file. Host persistence and behavior assertions remain on the host sources.
- New tests exercise explicit dependencies, selection and mode switching, panel guards, busy-state locks, teacher edit/save/Escape, completed quests, retention opt-out, source disclosure, failed loading/retry/back, latest props on registration, duplicate registration, and lazy-only wiring in all three shells.
- A fresh isolated Chromium fixture made zero module requests before opening Persona, one intentionally failed request, one successful retry, and zero additional requests on reopening. It verified character selection, teacher-save behavior, the two-character panel guard, retained selection on reopen, and no page errors.
- Desktop and 390 px mobile screenshots were visually reviewed. The mobile fixture has no document-level horizontal overflow; the existing cards remain horizontally scrollable inside their container. Existing layout was preserved.
- Focused builder freshness/public mirror equality, canonical URL pin, compact-builder discovery, source/App.jsx JSX smoke checks, and scoped whitespace checks passed.
- Registry verification found all 209 consumers valid, with no missing or suspect-null producers.

Browser fixtures use local scripts, placeholder icons, and a controlled module transport. They do not claim live CDN availability, full-app Core Web Vitals, or a complete application accessibility audit.

Evidence is saved under `scratch/persona-extraction/`: pre-edit snapshots, original JSX, focused test log, desktop/mobile screenshots, `browser-check.json`, and `final-checks.json`.

## Build and release

```powershell
node _build_view_persona_workspace_module.js
node _build_view_persona_workspace_module.js --check
```

Publish the new module before distributing the updated canonical Canvas source. Regenerate any compact release from the chosen final release state; the earlier compact snapshot was not rewritten during concurrent work.

An initial Windows write refusal left the canonical shell intact. The desktop copies changed concurrently, so the successful extraction used fresh contents and exact target checks rather than restoring snapshots. All other agents' edits were preserved. No broad application build, staging, commit, or deployment was performed.
