# Perception Lab: reopen saved notebooks

Updated October 4, 2026. Changes are left uncommitted.

The observation notebook now offers **Import notebook**. Choose a previously exported Perception Lab JSON file, review its counts, then use **Add observations**. The preview shows new observations, observations already saved, and available spaces. Choosing or previewing a file does not change the notebook. Import and Undo preserve the current experiment, drawing drafts, expanded view, pinned comparison, and other tools.

## Preserve observations and studies

Imports add observations; they do not replace the existing notebook or evict older records. If the proposed additions exceed the newest-24 limit, the Add action stays disabled and the preview explains how much space is needed. Remove observations you no longer need, then preview the file again.

Identical saved observations are skipped by comparing their full drawing model, date, and experiment. Repeated studies are compared as whole groups, including trial numbers and actual starting positions. Each existing copy accounts for only one matching incoming copy, preserving the multiplicity of a valid export.

When a repeated study overlaps an existing identity but has different content or membership, all its incoming matches are copied together under a fresh group identity. Colliding observation identities are also remapped. Generated identities avoid names already used by both notebooks. Complete studies, partial studies, historical starting positions, notes, impressions, and each observation's reveal state are preserved. Hidden results remain hidden during preview and after import.

**Undo import** restores the previous notebook records while preserving the current drawing and pin, including changes made after import. It expires if the notebook changes, so it cannot erase later observations or overwrite a replacement notebook. A successful import supersedes deletion undo; no history of full notebooks is persisted.

## Validate before writing

The importer accepts version 1 of the existing `alloflow.perception.notebook` export schema, with one to 24 valid observations. Files are limited to 512 KiB. Malformed JSON, unsupported schemas, oversized files, duplicate record identities, and noncanonical drawing or repeat values reject the whole file before writing. Unknown extra fields are ignored and stripped. Valid partial or conflicting repeated groups from earlier exports remain individually reviewable rather than being silently repaired.

File reads and queued Add or Undo actions check their request, profile, lifetime, and notebook fingerprint. Cancel, unmount, profile changes, and notebook replacement invalidate outdated work. Starting a repeated study closes an open import preview; importing is disabled during an active or starting study. The Cancel action stays reachable while a queued Add waits for its parent update.

## Verification

Final validation passed 89 new import tests and all 241 existing Perception tests, for 330 unique current-source tests across eight files. Chromium passed 37 import groups, 25 guided-study groups, and 23 comparison groups (85 total), with no reported browser errors. All recorded WCAG-tagged axe stages had no violations; reflow, 44-pixel controls, five viewport widths, dark and high-contrast themes, Windows forced-color palettes, and 200% text passed. Phone, dark, and forced-dark panels were visually reviewed. All 305 Perception English entries, root/public files, discovery, and integration checks passed.

See [validation.json](validation.json) for final current-source counts, source hashes, syntax, translations, integration, browser evidence, and unstaged status. Preview layouts use labeled native file controls, keyboard focus, 44-pixel controls, existing theme colors, and a stacked phone layout.

Implementation: `stem_lab/stem_tool_perception.js` and its desktop mirror. New verification: `tests/perception_lab_notebook_import.test.js` and `dev-tools/perception_lab_import_qa.cjs`.

## Previews

- [Phone import preview](import-preview-panel-390.png)
- [Dark theme](import-dark-panel.png)
- [Windows dark forced colors](import-forced-dark-panel.png)
- [200% text](import-large-text.png)
