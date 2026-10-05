# Bounded repository cache inventory

Metadata snapshot: 2026-10-01 16:21:15 UTC. No files were removed, recreated, opened for content inspection, or followed through reparse points. Scope excludes source/build mirrors, general node_modules, Temp, user caches, and global Codex state.

| Exact candidate set | Files | Logical bytes | Stored bytes | Oldest / newest file write UTC | Classification |
| --- | ---: | ---: | ---: | --- | --- |
| node_modules/.cache/wrangler (two metadata files) | 2 | 205 | 205 | Jul 26 / Aug 9 | Conditional, no meaningful headroom |
| node_modules/.vite/vitest | 1 | 4,586 | 4,096 | Oct 1 16:19:44 / same | Protected active runner output |
| desktop/web-app/node_modules/.cache/.eslintcache | 1 | 182,536 | 65,536 | Sep 20 14:53:26 / same | Conditional regenerable cache |
| desktop/web-app/node_modules/.vite/deps (two metadata files) | 2 | 169 | 169 | Aug 31 23:46:31 / same | Conditional regenerable cache |
| test-results/.last-run.json | 1 | 45 | 45 | Oct 1 15:22:21 / same | Protected test evidence/current output |
| playwright-report (HTML, viewer assets and evidence attachments) | 23 | 3,331,688 | 3,331,688 | Jul 26 / Oct 1 04:47:01 | Protected evidence |
| coverage | — | — | — | Absent | No candidate |

[Complete metadata inventory](repo-caches.json) records all 30 exact file paths, lengths, file attributes, timestamps, and per-file stored-byte measurements. There were **0 reparse points**, **0 enumeration/stored-size access failures**, and **0 tracked files** in these roots according to read-only `git ls-files`. Untracked status does not establish that test evidence is disposable.

Stored bytes were obtained with the read-only Windows **GetCompressedFileSizeW** API for each regular file, separately from logical lengths. This measures compressed/sparse file storage as reported by Windows; it is not a promise of deletion headroom. It excludes directory/MFT metadata and hard-link accounting, and small resident files may report their logical length rather than a independently reclaimable allocation.

The **largest verified regenerable candidate is exactly `desktop/web-app/node_modules/.cache/.eslintcache`: 65,536 stored bytes (64 KiB)**. Next lint can reconstruct it by rechecking files; no package reinstall is required. Its inactivity has not been established, so it remains conditional rather than an approved cleanup set. No candidate is verified safe for immediate deletion in this inventory.

Wrangler's two metadata files are regenerable tool/project cache metadata, but total only 205 reported stored bytes and require owner confirmation before any action. Vite's dependency metadata totals 169 bytes; a later dev start can re-evaluate/prebundle dependencies. Prior Babel-loader/default-development caches remain absent; they were not recreated, re-inventoried as candidates, or broadened.

Vitest's result cache was updated at 16:19:44 UTC. **PID 61048, Circuit runner**, remains its assumed active owner by explicit coordinator instruction. Browser slots remain held by the coordinator. The supplied process metadata snapshot yielded no direct command-line reference to these exact roots/tool runners; absent, relative, or unavailable command lines cannot prove inactivity. Reports retain process IDs/names only, without command lines.

Playwright report data includes a trace ZIP, video, screenshot, and Markdown attachment. Their contents were not inspected. The report and last-run metadata remain protected as uncommitted/user evidence or potentially active output; viewer assets are also retained so the report stays reviewable. A generic whole-cache or whole-report deletion is not recommended.

For scale, the parent's recorded free space at 16:13 UTC was 7,382,450,176 bytes. Even the 64 KiB conditional ESLint candidate provides negligible relief. Broader headroom attribution belongs to the coordinator's separate Temp/user-cache inventory.