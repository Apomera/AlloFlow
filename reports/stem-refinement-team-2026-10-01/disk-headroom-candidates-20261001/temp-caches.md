# Temp cache metadata inventory

No deletions or cache modifications performed. Exact paths and per-file metadata are in temp-caches.json; the safe deletion recommendation set is empty.

- 228 codex-index-* directories: 171,789,116 native API stored bytes (163.83 MiB). Entry names suggest temporary Git indexes/locks. Ownership and index recovery value are unresolved; preserve pending coordinator clearance.
- playwright-transform-cache: 46,520,390 bytes (44.37 MiB), 1,086 files. Preserve because active pending Circuit runner PID 61048 may use the shared transform cache. Regeneration would require later transpilation; age does not establish safety.
- claude: only two top-level 51-byte pwd metadata files inventoried. Nested bash-edit-diff, C--Users-cabba, and econ_review_r3 were held without traversal because task/user content classification is unclear.
- No top-level .dmp files found. Browser profiles and unknown .tmp/user directories were excluded.

GetCompressedFileSizeW storage values do not include directory metadata and, for ordinary files, are not a guarantee of NTFS allocated-cluster totals. A second metadata comparison checks length/date stability, not open handles. No file contents, restricted sessions, or transcripts were read. The team process metadata snapshot was used; output retains only relevant IDs/names.
