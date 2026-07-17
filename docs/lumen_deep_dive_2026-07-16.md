# Lumen deep dive and improvement roadmap

Reviewed: 2026-07-16  
Scope: Lumen Study Sources, Lumen evidence core, quantitative Lumen, web discovery, hosted/desktop import boundaries, and current NotebookLM comparison.

## Executive assessment

Lumen's strongest differentiator is not generic chat. It is its evidence contract: local passage retrieval, stable evidence IDs, exact-excerpt validation for every displayed claim, refusal when support is insufficient, source-version staleness, privacy-minimized audit events, and a separate quantitative workspace with unusually explicit uncertainty and benchmark safeguards.

The largest product gap was source acquisition. That gap is now materially smaller: Lumen can search the web, present up to ten human-reviewable candidates, import selected full pages, and make only the retrieved snapshots eligible for answers. The hosted and desktop paths now share an SSRF-resistant importer that validates and pins public DNS answers at every redirect.

Lumen is not yet a broad notebook platform. Source control is now materially stronger; its next useful gains come from more source types, refresh/compare workflows, cross-source analysis, and teacher-facing research tools. Agentic Deep Research should come later and should not be a default learner feature.

## Current architecture

```text
source acquisition
  current AlloFlow source | paste | web discovery
        ↓
normalized source snapshot + hash + version
        ↓
local deterministic passage chunking and lexical ranking
        ↓
selected passages only → configured AI
        ↓
structured claims with evidence IDs + exact excerpts
        ↓
local validation → cited display or explicit refusal
```

This boundary is sound. Search metadata never enters the evidence graph. Page text is treated as untrusted data, and commands embedded in a source are explicitly demoted in the synthesis prompt. Source updates replace their passages and stale dependent claims/notes.

## What was built in this work

- Provider-neutral web search with normalized, de-duplicated public candidates.
- Human review and multi-select import; snippets remain labeled previews only.
- First-party Firebase `sourceFetchProxy`, authenticated with Firebase ID token and App Check.
- Equivalent private-loopback desktop route for the bundled app.
- Byte-identical cloud/desktop fetch safety core with public-DNS pinning, redirect revalidation, private/reserved range refusal, standard-port restriction, 12-second timeout, 2 MiB response limit, four-redirect ceiling, and text-only extraction.
- Safe fallback behavior: a legacy importer can run only when the first-party route is unavailable, never after a first-party safety rejection.
- Final publisher URL and server fetch time preserved in source provenance.
- Persistent active-source switches and manual labels with a retrieval-affecting label filter.
- Defensive prompt exclusion for inactive or label-excluded sources.
- Exact stored-passage viewer with surrounding context, version, line/character position, import date, and hash.
- Version-1 migration plus active/label preservation across source refresh.
- Deployment, packaging, privacy, accessibility, and release-security contracts plus regression coverage.

## Comparison with current NotebookLM

Google's current Fast Research flow searches the web or accessible Drive content, presents relevant results with descriptions, and lets users select one or more sources. NotebookLM also offers an adult-only Deep Research mode that can browse many sites and produce a multi-page report. Its supported inputs now include web pages, Drive documents, Office files, PDFs, EPUB, images, audio, YouTube transcripts, and pasted text. Sources can be selected for chat, automatically labeled once a notebook has enough sources, and opened from citations in context.

Official references:

- [NotebookLM Discover Sources announcement](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-discover-sources/)
- [NotebookLM source discovery, supported types, limits, labels, and Deep Research](https://support.google.com/notebooklm/answer/16215270?hl=en)
- [NotebookLM grounded chat and citation behavior](https://support.google.com/notebooklm/answer/16179559?hl=en)

| Capability | Lumen now | NotebookLM comparison | Assessment |
| --- | --- | --- | --- |
| Fast web discovery | Search → review → multi-select → full-page import, up to ten candidates | Mature Fast Research with relevance descriptions | Core parity achieved; result explanation quality can improve |
| Evidence boundary | Exact support excerpt required for every displayed claim; snippets excluded | Grounded source chat with inline citations | Lumen is stricter and more testable |
| Source retrieval | Deterministic local lexical ranking | Managed retrieval across notebook sources | Lumen is private and portable; ranking quality will fall on large/semantic collections |
| Source controls | Persistent include/exclude switches, labels, and retrieval label filter | Include/exclude sources; labels and categories | Core control parity achieved; automatic suggestions remain optional |
| Source formats | Current AlloFlow text, paste, and public HTML/text pages | Broad document, media, Drive, URL, and transcript support | Largest remaining parity gap |
| Citation navigation | Opens a focused stored snapshot passage with context, version, positions, hash, and original URL | Citation previews and jumps into source context | Exact local passage inspection is now implemented |
| Research automation | Human-selected fast search only | Deep Research plus report/source import | Deliberately deferred; teacher-only design needed |
| Artifacts | Saved grounded study notes plus mature quantitative charts/exports | Briefings, study guides, audio, mind maps, quizzes, slides, and more | High-value expansion area after source controls |
| Refresh/sync | Re-import versions and stales dependents; no one-click refresh | Some sources can sync or become inaccessible with origin changes | Lumen has the better staleness model but needs refresh UX |

## Prioritized roadmap

### Completed P1 — source control and citation context

1. **Active-source selection:** shipped with persistent state, active counts, retrieval enforcement, and prompt-level defense.
2. **Labels and filtering:** shipped with normalized manual labels and a saved label scope that affects both retrieval and the source list.
3. **Source viewer:** shipped with exact stored passage context, line/character location, source version, import date, hash, keyboard focus, and original-link access.

### Remaining P1 — refresh and import reliability

1. **Refresh and compare.** Add a refresh button for web sources. Show changed/unchanged, preserve the prior hash/version, and expose which saved notes became stale.
2. **Import reliability.** Add cancel, retry-per-result, bounded parallel imports, robots/site-error explanations, and a visible “first-party/legacy/manual” import-path label.

### P1 — broaden source types without weakening provenance

1. Reuse AlloFlow's existing local extractors to add PDF, DOCX, PPTX, TXT, Markdown, CSV, and EPUB files to Study Sources.
2. Add URL-PDF support through a distinct byte-limited download/extraction path; do not pass binary formats through the HTML reader.
3. Add public YouTube transcript import only when captions are available, preserving video URL and time ranges.
4. Add audio transcription through the existing local desktop ASR path where available, explicitly labeling transcript confidence and keeping audio on-device.
5. Treat images as evidence only after OCR/description provenance is explicit; never silently promote generated descriptions to source text.

### P2 — improve multi-source reasoning

1. **Coverage view:** map the user's question to sources that support, contradict, or do not address each sub-question.
2. **Contradiction view:** surface incompatible exact excerpts side by side without asking the model to resolve them invisibly.
3. **Source diversity:** warn when all imported results share a publisher/domain or when primary sources are absent. Avoid opaque “credibility scores.”
4. **Hybrid local retrieval:** add BM25 and optional on-device embeddings behind the existing stable evidence IDs; retain deterministic lexical fallback.
5. **Question decomposition:** let the user approve sub-questions before retrieval. Keep every resulting claim bound to exact excerpts.

### P2 — useful grounded artifacts

- Briefing and study guides whose sections each retain evidence IDs.
- Flashcards and quizzes with answer/rationale citations and stale-source invalidation.
- Timeline and concept-map views derived from validated claims.
- Compare/contrast tables that show source coverage per row.
- Teacher export with a source manifest, source versions, fetch dates, and unresolved contradiction notes.

### P3 — connected and agentic research

1. Drive/SharePoint/OneDrive connectors with least-privilege file selection, explicit tenant ownership, and revocation behavior.
2. Collaborative projects with tenant isolation, roles, retention policy, and conflict-safe source versioning.
3. Teacher-only bounded Deep Research: visible plan, domain/step/time budget, live cancel, complete visit log, human source selection, and no automatic promotion of reports into evidence.

NotebookLM currently marks Deep Research as over-18 only. Lumen serves educational settings, so an agentic mode should remain unavailable to learners until age, district policy, identity, logging, and supervision controls are designed and tested.

## Recommended next implementation slice

Build **local document import for PDF, TXT, Markdown, DOCX, PPTX, CSV, and EPUB** through AlloFlow's existing extraction paths. This is now the largest practical NotebookLM parity gap and can reuse the active-source, label, version, and exact-passage controls already in place.

Acceptance should require:

- extraction stays local whenever the existing AlloFlow parser supports it;
- every passage retains file name, format, page/slide/sheet or section locator, source version, and hash;
- unsupported/encrypted files fail honestly without partial evidence promotion;
- active state and labels behave identically across pasted, web, and file sources;
- citations open the exact stored extracted passage without rereading the original file;
- keyboard and screen-reader users can add, label, filter, and inspect file sources;
- no document content reaches an AI until local retrieval selects passages for a user question.
