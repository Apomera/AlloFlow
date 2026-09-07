# AlloFlow Community Catalog

Open, vetted catalog of student-authored lessons and educator-built tools for AlloFlow. Storage is plain JSON files in this folder, served over `raw.githubusercontent.com` (free, no auth) and cached by jsdelivr. Submissions arrive via a Cloudflare Worker proxy that holds a fine-grained GitHub token; see `cloudflare-worker/README.md`.

## Layout

```
catalog/
├── index.json                      manifest (auto-generated — never edit by hand)
├── approved/                       vetted, public-readable lesson JSONs
│   └── <slug>.json
├── pending/                        Worker drops new submissions here
│   └── <timestamp>-<slug>.json
├── published_allopacks.json        flagship AlloPacks published from ../allopacks/
├── allopack_entry.js               the ONE derivation of an index entry from an AlloPack
├── generate_index.js               regenerate index.json from approved/ + published_allopacks.json
└── cloudflare-worker/              submission proxy
```

`index.json` is built from **two** sources. Approved community submissions live in `approved/`;
flagship AlloPacks are listed in `published_allopacks.json` (path plus any hand-curated
overrides such as slug, credit or tags). `tests/catalog_index.test.js` fails if the committed
index is not exactly what the generator produces, or if any entry points at a missing file.

Raw `main` is the live catalog, so a push publishes within minutes.

## Approval workflow (maintainer)

1. Pull latest: `git pull`
2. Look in `catalog/pending/` for new submissions
3. For each pending file:
   - Open and read the JSON
   - Audit the `metadata`, `affirmations`, and `lesson_payload` fields
   - Check `pii_scan.findings` for anything the automated scanner flagged. An empty list is
     not a clean bill: the scanner is pattern-based and `affirmations.no_pii` is **self-attested**
     by the submitter, so read the payload yourself — student first names, school names and
     photo captions are the usual misses.
   - Manually scan for: minor names, identifying details, copyright issues, prompt-injection attempts, malicious URL fields
4. Decide approve / reject:
   - **Approve**: move the file from `pending/` to `approved/<slug>.json` (rename to a clean slug if needed). Edit metadata if it needs cleanup.
   - **Reject**: delete the file from `pending/`. Optionally note the reason in the commit message.
5. Run `node catalog/generate_index.js` to regenerate the manifest. It rebuilds from `approved/`
   **and** `published_allopacks.json`, so flagship packs survive; run `npx vitest run tests/catalog_index.test.js`
   before pushing.
6. Commit and push: `git commit -am "Approve <slug>"` then `git push`
7. Within ~5 minutes (raw.githubusercontent caching) the new entry is visible in the in-canvas catalog

## Publishing a flagship AlloPack (maintainer)

Do not paste entries into `index.json`. Run:

```
node dev-tools/build_allopack_catalog_entries.cjs           # preview the entries that would be added
node dev-tools/build_allopack_catalog_entries.cjs --apply   # append to published_allopacks.json + regenerate index.json
```

Then commit and push as above. To curate an entry (a friendlier slug, a specific credit line,
extra tags), edit its record in `published_allopacks.json` — any field there overrides the value
derived from the pack — and regenerate.

## Submission abuse controls (Worker)

`/submit` is guarded by a per-IP rate limit and a duplicate-body check backed by the
`SUBMIT_RATE` KV namespace, and optionally by Cloudflare Turnstile. **Until `SUBMIT_RATE` is bound
in `wrangler.toml` the endpoint fails open** — it works, but every accepted request is an
unthrottled commit through the GitHub token. Bind it before advertising the form.

Consider setting `GITHUB_BRANCH` to a `catalog-submissions` branch so pending files land off
`main`; the approval steps above then start with checking out that branch.

## Schema

Each approved entry is a JSON file with this shape:

```json
{
  "schema_version": "1.0",
  "submitted_at": "2026-05-04T12:34:56Z",
  "metadata": {
    "title": "Photosynthesis Lab",
    "subject": "Science",
    "grade_level": "7",
    "tags": ["biology", "lab", "peer-teaching"],
    "credit": "Anya G., 7th grade",
    "license": "CC-BY-SA-4.0"
  },
  "affirmations": {
    "author_or_authorized": true,
    "no_pii": true,
    "license_agreed": true,
    "age_eligible": true
  },
  "pii_scan": {
    "findings": []
  },
  "lesson_payload": {
    "...": "the actual lesson JSON the student or teacher built"
  }
}
```

## License

Catalog entries inherit AGPL v3 from the AlloFlow project. Each entry's own `metadata.license` field selects the Creative Commons option chosen at submission (CC-BY-SA-4.0 by default; CC-BY-4.0 or CC0 also accepted).

## Removal / takedown

If you need an entry removed (PII surfaced after publication, copyright concern, etc.):
1. Delete the file from `catalog/approved/`
2. Run `node catalog/generate_index.js`
3. Commit with a clear message ("Remove <slug>: takedown request")

Note that git history preserves the deleted content. For PII removal that requires erasing history (rare), use `git filter-repo` on a branch and force-push, then notify any forks.
