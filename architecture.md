# AlloFlow Architecture Notes

## UTF-8 Encoding & CDN Caching — STEM Lab Module  
*Added: 2026-02-27*

### Problem Summary

STEM Lab upgrades (Galaxy Explorer, Music Synthesizer, Canvas2D patches) appeared to be
missing from the running app and from diagnostic tool output. Investigation revealed
**two distinct issues**:

1. **jsDelivr CDN caching** — the CDN was serving a stale version of `stem_lab_module.js`  
2. **Mixed encoding causing false negatives** in diagnostic tools (ripgrep, git diff, Python)  

The code itself was fully committed and present. No data loss occurred.

---

### Encoding Characteristics of `stem_lab_module.js`

| Property | Value | Impact |
|---|---|---|
| BOM | None | ✅ No issues |
| Line endings | **Mixed** (CRLF + LF) | ⚠️ Causes tool failures |
| Non-ASCII chars | ~1,663 literal | ⚠️ ripgrep skips these lines |
| Unicode escapes | ~951 `\uXXXX` | ✅ JS-level, no file issue |
| File size | ~551 KB / ~7,853 lines | Approaches tool buffer limits |

### Why Tools Give False Negatives

1. **ripgrep (`grep_search`)**: With mixed line endings and non-ASCII bytes (emoji like 🪨, ⚗️),
   ripgrep may classify portions of the file as binary and skip matches entirely.
   A search for `galaxy` returned zero results even though it appears multiple times.

2. **Python one-liners**: Windows PowerShell mangles single quotes, backslashes, and Unicode
   in inline `-c` commands. Scripts must be written to `.py` files and executed via `python script.py`.

3. **`git diff`**: When `.gitattributes` normalizes line endings, `git diff` may show no changes
   even if the working tree file has different byte content than the index. Conversely, it may
   show phantom whitespace-only diffs.

4. **Terminal output truncation**: Large file analysis in PowerShell/terminal truncates output
   at buffer boundaries, cutting off audit results mid-line.

### Reliable Tooling

| Tool | Reliability | Notes |
|---|---|---|
| PowerShell `Select-String` | ✅ High | Handles UTF-8 with emoji correctly |
| Python scripts (file-based) | ✅ High | Use `encoding='utf-8', errors='replace'` |
| `view_file` (IDE) | ✅ High | Direct file reading |
| ripgrep / `grep_search` | ❌ Unreliable | Skips lines with non-ASCII bytes |
| Python `-c` one-liners | ❌ Unreliable | Shell escaping issues on Windows |
| `git diff --stat` | ⚠️ Conditional | May hide encoding-only differences |

### Recommendation

For any future diagnostics on large JS files with emoji:
- **Always use Python script files**, never one-liners
- **Use `Select-String`** instead of ripgrep for search
- **Never trust a negative result** from ripgrep on these files
- **Write output to files** instead of relying on terminal display (buffer truncation)

---

### jsDelivr CDN Caching

The STEM Lab module is loaded at runtime via:
```
https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/stem_lab_module.js
```

jsDelivr caches `@main` (branch) references **indefinitely** until explicitly purged.
Pushing new commits to GitHub does NOT automatically refresh the CDN.

**Purge URL**: `https://purge.jsdelivr.net/gh/Apomera/AlloFlow@main/stem_lab_module.js`

This must be called after every push. The `/deploy` workflow should include this step.

### Current STEM Lab Tool Inventory (Verified 2026-02-27)

All tools below have **both** a registry entry AND a working IIFE:

| Category | Tool ID | Line | Status |
|---|---|---|---|
| Math Fundamentals | `volume` | ~690 | ✅ |
| Math Fundamentals | `numberline` | ~2127 | ✅ |
| Math Fundamentals | `areamodel` | ~2450 | ✅ |
| Math Fundamentals | `fractionViz` | ~2794 | ✅ |
| Math Fundamentals | `base10` | ~2888 | ✅ |
| Advanced Math | `coordinate` | ~3020 | ✅ |
| Advanced Math | `protractor` | ~3289 | ✅ |
| Advanced Math | `multtable` | ~3425 | ✅ |
| Advanced Math | `funcGrapher` | ~3574 | ✅ |
| Life & Earth Science | `cell` | ~4574 | ✅ |
| Life & Earth Science | `solarSystem` | ~4842 | ✅ |
| Life & Earth Science | `galaxy` | ~5773 | ✅ |
| Life & Earth Science | `rocks` | ~6015 | ✅ |
| Life & Earth Science | `waterCycle` | ~6242 | ✅ |
| Life & Earth Science | `ecosystem` | ~6542 | ✅ |
| Physics & Chemistry | `wave` | ~3742 | ✅ |
| Physics & Chemistry | `circuit` | ~3892 | ✅ |
| Physics & Chemistry | `chemBalance` | ~4142 | ✅ |
| Physics & Chemistry | `physics` | ~3984 | ✅ |
| Physics & Chemistry | `dataPlot` | ~4342 | ✅ |
| Arts & Music | `musicSynth` | ~7451 | ✅ |
