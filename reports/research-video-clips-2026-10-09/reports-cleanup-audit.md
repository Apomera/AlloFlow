# Read-Only Reports Cleanup Audit

Measured 2026-10-09 at 19:57 EDT. No existing report, screenshot, archive, source file, or cache was deleted or modified during this audit.

## Scope And Findings

The `reports` directory currently contains 95,104 files totaling 13,646,302,648 logical bytes (12.71 GiB). These are file lengths, not allocated physical disk usage or guaranteed reclaimable space. OneDrive online-only files, compression, and allocation can make those differ. This is a live shared directory, so totals can change while other agents run.

| Type | Files | Bytes |
| --- | ---: | ---: |
| PNG screenshots | 31,734 | 4,875,189,053 |
| JavaScript snapshots and tools | 6,892 | 2,106,380,475 |
| JSON receipts and data | 26,044 | 1,654,461,911 |
| ZIP files | 524 | 1,178,136,706 |
| Gzip files | 307 | 852,801,440 |

Names, age, and a subsequent successful test are not enough to establish that a report is obsolete. Reports include unique before-images of uncommitted work, archived source candidates, and failure evidence used to explain the final validation outcome.

## Narrow Cleanup Candidates

The accompanying [candidate manifest](reports-cleanup-candidates.json) records **14 individual PNG files totaling 6,573,387 bytes (6.27 MiB)**. Each is a non-final Machine Lab capture with a same-named, SHA-256-identical counterpart in `pass5-final` or `pass6-final`. The manifest names the retained counterpart and exact digest. This is a review shortlist, not a deletion authorization or script.

- `reports/machinelab-visual-upgrade/pass5-light`: nine duplicate PNGs, 2,897,950 bytes. Keep the two differing `trebuchet-release*.png` files.
- `reports/machinelab-visual-upgrade/pass6-light`: five duplicate PNGs, 3,675,437 bytes. Keep the six differing wall/rear screenshots.
- `pass5-review.md` lines 19-23 link to the final captures; `pass6-review.md` lines 18-24 do likewise. The corresponding final copies and all reviews, test receipts, source snapshots, scripts, and summaries must remain.

Do not remove either directory wholesale. Some images differ despite nearly identical filenames. Before deleting any listed file, recheck its digest and retained counterpart, ensure its owner has finished, and check references to the old pathname. The current manifest preserves a mapping to the retained content, but deletion can still break historical links that have not been updated.

The initial hash inventory did not prefilter OneDrive recall attributes and may have hydrated files. Physical free space decreased during the concurrent work; this audit does not establish attribution. No further broad hashing is recommended under the current space constraint. Future audits must inspect `Offline`, `RecallOnOpen`, and `RecallOnDataAccess` attributes first and skip online-only content, using metadata only. The small candidate manifest was subsequently rechecked against its local PNGs; all 14 recorded digests matched.

## Larger Deduplication Opportunity

A read-only SHA-256 comparison of PNGs with matching sizes found these duplicate-content upper bounds. The byte count assumes retaining one copy of each distinct image, regardless of how many test contexts refer to it; it is **not** an approved reclaim estimate. No exhaustive reference or active-owner analysis was performed for these larger sets.

| Directory | Identical-content groups | Duplicate bytes beyond one copy |
| --- | ---: | ---: |
| `reports/universe-flight-2026-09-29` | 386 | 213,504,131 |
| `reports/machinelab-visual-upgrade` | 508 | 76,592,752 |
| `reports/artstudio-workspace` | 227 | 69,300,031 |
| Total | 1,121 | 359,396,914 |

The narrow shortlist is already included in this larger total. Several matching captures intentionally document different steps, modes, or retries. For example, identical Art Studio screenshots occur in both retained `previous-*` snapshots and final reports; those are not automatically obsolete. Preserve final named evidence and readable audit trails when considering consolidation.

## Protected Large Files

| Path | Bytes | Reason To Keep |
| --- | ---: | --- |
| `reports/tyler-merge-audit-2026-09-28/integration-final-files.tar.gz` | 384,538,696 | `IMPLEMENTATION.md` lines 31 and 52-57 identify a portable archive of an uncommitted integration candidate, with 222 entries verified against recorded SHA-256 hashes. A manifest alone does not replace these bytes. |
| `reports/tyler-merge-audit-2026-09-28/integration-preimages` | 172,598,729 | Canonical preimages and reconciliation history, not generated download cache. |
| `reports/maine-sld-case-lab-extended-practice-2026-10-02/browser-validation/print-followup/attempt-1-timeout/artifacts/trace.zip` | 30,821,919 | Final `print-followup/README.md` explicitly retains this trace to document a timeout after functional assertions passed. Later success does not duplicate the failed-run evidence. |
| `reports/maine-sld-case-lab-practice-navigation-2026-10-02/browser-validation/attempt-1-host-timeout/artifacts/trace.zip` | 22,583,962 | Final root README explicitly preserves both failure archives and distinguishes their outcomes from the successful isolated rerun. |

Across all ZIP/GZ/7Z files, 48 SHA-256-identical groups contain 164,266,000 duplicate bytes beyond one copy. The largest groups are `locale-before` and `catalogs-before` recovery snapshots. They are protected backups in this pass, not cleanup candidates. Exact duplication may eventually permit carefully documented consolidation, but deleting them now could break restoration scripts or remove per-path recovery guarantees.

The largest report directory, `reports/cephalopod-hunter-enhancement` (1,632,118,504 bytes at inventory time), belongs to active neighboring work and was excluded from cleanup evaluation. Current research reports and all active ownership areas were also excluded.

## Recommended Order

1. Prefer independently verified rebuildable output or download caches for immediate multi-GB relief; they are outside this report-only audit and were not deleted here.
2. With explicit approval, begin with the 14 exact duplicate non-final PNGs in the manifest, preserving all retained files and references.
3. Review older screenshot sets with their owners for larger consolidation. Do not delete arbitrary `before`, `previous`, `failed`, ZIP, GZ, or date-based groups.
4. Keep this audit and the manifest if any future cleanup occurs, and record the actual removed files and newly measured free space separately.
