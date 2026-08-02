# Extended Reading Sources: Rights and Import Policy

Last audited: 2026-07-25

This catalog expansion stores discovery metadata and short AlloFlow-authored
source cards. It does not mirror the linked books, chapters, images, or media.
Every source added by `import_extended_catalog_sources.js` is explicitly
`link-only`, has mirroring disabled, and is excluded from AI/extract-to-text
workflows.

| Source | Catalog treatment | Rights rationale |
| --- | --- | --- |
| Open Textbook Library | One title card per record from the official bulk CSV | OTL catalog records are CC0. Each linked textbook retains its title-level license. |
| Wikibooks | 50 featured-book cards pinned to exact revisions | Wikibooks text is generally CC BY-SA 4.0/GFDL; media can have separate terms. No book text or media is copied. |
| Core Knowledge Foundation | Four collection cards | Curriculum is generally CC BY-NC-SA 4.0, but third-party images and media are excluded from that grant. Resource-level review is required before mirroring. |
| Pressbooks Directory | Directory card | Licenses vary by title. |
| Standard Ebooks | Library card | Editions are public-domain/CC0, but the official bulk feeds require project access. |
| Book Dash | One library hub plus every public language edition as an attributed discovery record | Books are CC BY 4.0. Edition records retain the official cover, language, creators, book URL, and source-file URL; complete illustrated designs remain at Book Dash. |
| OAPEN Library | Library card | Catalog metadata is CC0; book licenses vary. |
| Directory of Open Access Books | Directory card | Book licenses vary by title. |
| MIT OpenCourseWare | Collection card | Most materials are CC BY-NC-SA, with marked third-party and all-rights-reserved exceptions. |
| NCBI Bookshelf | Collection card | Rights and third-party components vary by title and page. |

## Promotion to local mirroring

A title or collection may move beyond link-only discovery only after a
per-title audit records:

1. the exact work, edition, source URL, and revision or retrieval date;
2. the license URL and all attribution requirements;
3. whether adaptation, noncommercial use, and share-alike conditions apply;
4. any third-party images, figures, excerpts, audio, or other excluded assets;
5. the approved local operations (display, accessibility transformation,
   text extraction, download, or AI use).

Ambiguous rights default to link-only. Noncommercial status does not itself
create permission to copy or adapt a work.

## Provider contact

Contact is recommended before requesting bulk access, using a non-public feed,
or proposing a larger mirror. Contact is not required merely to link to public
records or to use CC0 metadata. Any provider response should be recorded beside
the relevant audit before import behavior changes.
## Catalog maintenance audit

Run `npm run audit:reading` before publishing a catalog change. The local audit
checks both generated indexes, every referenced book file, source and license
URLs, index/book drift, mirrored-text presence, and the distinction between
link-only permissions and actual local mirror provenance. Use
`node dev-tools/audit_reading_catalog.cjs --json` for CI or
`--report reading_library/catalog_health.json` for a saved machine-readable
snapshot. It never fetches provider URLs; network reachability should be tested
separately when a source is refreshed.
## Reading sets

Teacher reading sets use the `allo-reading-set@1` contract. A set stores an
ordered list of catalog slugs plus title, source, attribution, language, level,
license, and audio metadata. It deliberately does not include page text,
images, audio, or AI-generated adaptations. Saving a set to lesson resources
or downloading its JSON therefore preserves each title's source-level rights
review; opening a title still follows that title's own usage policy.