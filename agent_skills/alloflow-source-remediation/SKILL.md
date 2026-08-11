---
name: alloflow-source-remediation
description: Remediate the SOURCE CODE of web pages and apps for accessibility with an evidence trail - patch plans that must apply uniquely, before/after axe + keyboard-walk audits, and a behavior-preservation channel. Experimental sibling of alloflow-portable-remediation for HTML/template/component sources rather than documents.
---

# AlloFlow source remediation (experimental, 0.1.x)

The documents pathway rebuilds files; this pathway patches the code that
produces pages. The same evidence-first contract applies, translated:

| Documents pathway | This pathway |
| --- | --- |
| Repair plan (JSON rebuild) | Patch plan: scoped find/replace edits, each applying EXACTLY ONCE |
| SHA-256 source binding | Per-file SHA-256 binding in the plan |
| veraPDF before/after | axe-core + deterministic keyboard-walk/outline audits before and after |
| Text recall | Behavior preservation: rendered-text digest compare + the project's own test suite |
| Refusal classes | Vendored/minified code, and fixes that need a design decision, are refused |

Nothing here is a compliance claim. An axe pass is necessary-not-sufficient;
keyboard and reader behavior must be checked by a person, and the project's
own test suite must stay green after patching.

## Workflow

Resolve the installed directory containing this SKILL.md as `<skill-dir>`.

1. `node "<skill-dir>/scripts/audit_page.cjs" --html <page> --out before.json`
   for each representative page (a built page or a static file). The auditor
   runs axe-core locally, walks the page with the keyboard (Tab traversal,
   unreachable interactive elements, trap detection), and records the heading/
   landmark outline, unlabeled controls, images without alt, and a normalized
   rendered-text digest. All offline; http(s) requests are blocked and counted.
2. Read the audit AND the source. Author `patch-plan.json` conforming to
   [references/patch-plan.schema.json](references/patch-plan.schema.json):
   - every patch is a scoped `find`/`replace` on one file; `find` must occur
     exactly once in that file or validation fails (no pattern spray);
   - every patched file is bound by SHA-256 in `target.files`;
   - every patch carries a `rationale` naming what it fixes; set
     `changes_rendered_text: true` on any patch that adds or alters visible
     text (a missing label fixed by adding one changes the text digest, and
     that must be disclosed, not discovered);
   - REFUSE rather than patch: vendored or minified assets, generated
     bundles, and anything where the fix is a design decision (a color
     system without contrast headroom, a custom widget needing rework).
     Record refusals in `review_notes`.
3. `python "<skill-dir>/scripts/alloflow_source.py" validate-plan --plan P --root R`
4. `python "<skill-dir>/scripts/alloflow_source.py" apply --plan P --root R --out-dir COPY`
   - Apply NEVER edits in place: it copies the root (excluding `.git`,
     `node_modules`, and anything over the size cap) and patches the copy,
     writing `applied-manifest.json` with per-file before/after SHA-256.
5. Rebuild the copy if the project needs a build step, then re-audit the same
   pages from the copy: `audit_page.cjs --html <copy page> --out after.json`.
6. `python "<skill-dir>/scripts/alloflow_source.py" compare --before before.json --after after.json --plan P --out evidence.json`
   - Reports violations fixed and INTRODUCED (introducing any fails the
     verdict), keyboard-reachability delta, outline changes, and whether the
     rendered-text digest changed with or without disclosure.
7. Run the project's own test suite on the patched copy. A red suite is a
   stop, not a footnote.
8. Human review: a person (or a fresh-context model instance that did not
   author the patches) reads the evidence and the diff before anything
   merges. The stamped independent-verification loop from the documents
   pathway will be ported in a later version; until then say plainly that
   verification was human-manual.

## Honest limits

- axe automates roughly a third of WCAG; the keyboard walk adds reachability
  evidence, not usability judgement. Screen-reader behavior needs a person.
- The rendered-text digest catches content drift on static pages; dynamic
  apps need their own test suites as the behavior channel.
- Contrast fixes are only safe when the design system has headroom; when it
  does not, refuse and refer to a designer.
- This pathway edits copies and emits evidence; merging patched code is the
  project owner's decision, on their review process.
