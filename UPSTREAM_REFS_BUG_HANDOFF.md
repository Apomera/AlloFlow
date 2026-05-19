# Upstream bug handoff: Generate Source short-text references truncation

**Status:** Read-only analysis. No code changes made this pass. Documenting for next session.

## Symptom (user-visible)

When the "Generate Source" feature produces a SHORT text (targetWords ≤ 600, so `isShortText === true` on content_engine_source.jsx:358), the `### Source Text References` block at the end of the generated text sometimes appears **truncated mid-URL** — e.g. `…[The water cycle (article) | Ecology](https://www.khanacademy` with no closing `)` and no subsequent entries. Long-text generation (>600 words, multi-chunk path) does not show this symptom.

## What the code actually does for short text

File: [content_engine_source.jsx:870-925](content_engine_source.jsx#L870)

1. Single Gemini call with grounding enabled (`useSearchForThisCall = effIncludeCitations`).
2. Response has two parts: `result.text` (narrative body with `⁽¹⁾`, `⁽²⁾` inline citation markers Gemini injects) and `result.groundingMetadata.groundingChunks` (structured array of `{web: {title, uri}}`).
3. `processGrounding(cleanedRawText, metadata, 'Links Only', false, false)` at line 900 — wraps inline `⁽N⁾` markers with `[⁽N⁾](url)` using metadata. **Critical parameter:** last arg `false` = `includeBibliography`, so this call does NOT append a refs footer yet.
4. Deterministic cleanup chain at lines 904-915 (moves citations after punctuation, strips stray orphan brackets, etc.).
5. **Line 910 — the broken strip:**
   ```js
   .replace(
     /\n*(?:#{1,4}\s*)?(?:Sources?|References?|Works?\s*Cited|Bibliography)\s*[\n\r]+(?:(?:\d+\.\s+|\*\s+|-\s+)?.+[\n\r]+)*(?=\n*(?:#{1,4}\s|\Z|$))/gi,
     '\n'
   )
   ```
   This is supposed to strip any references section Gemini emits inline (in defiance of the prompt at line 840/848 telling it not to). **It requires `[\n\r]+` immediately after the header word**, which fails when Gemini emits the refs as a flat one-line trailer (all entries separated by spaces, not newlines). In that case Gemini's refs survive this cleanup.
6. `renumberCitations` + `restoreCanonicalCitationUrls` — rewrite inline `[⁽N⁾](url)` markers using canonical URLs from chunks.
7. `generateBibliographyString(tempMeta, 'Links Only', "Source Text References")` at line 921 — appends the app's own `\n\n### Source Text References\n\n1. [title](url)\n\n…` block built from **structured chunk.web.uri data** (which is never truncated because it's API metadata, not LLM output).

## The actual root cause

**Important clarification:** BOTH paths already call `generateBibliographyString` from structured `chunk.web.uri` metadata, and that call is never token-truncatable. Short-text at [content_engine_source.jsx:921](content_engine_source.jsx#L921) appends an app-owned clean `### Source Text References` block exactly like long-text at line 671. The bibliography-generation step is NOT the bug and already works identically in both paths.

**The bug is Gemini's behavior in single-call mode combined with a strip regex that fails on its output format.**

Specifically:
1. The prompt at [content_engine_source.jsx:840 and 848](content_engine_source.jsx#L840) says "Do NOT include any Sources, References, Works Cited, Bibliography sections." Compliance is reasonable for multi-chunk (each call is framed as "PART i of N of a text," so Gemini treats it as a segment rewrite and rarely emits a footer per section). Compliance drops significantly for **single-call short-text mode** because Gemini sees the whole-document task in one pass and instinctively appends its own inline bibliography.
2. When Gemini DOES emit a footer, it often does so at the very end of its output-token budget. The final URL is the last thing being generated — if the budget runs out mid-URL, that URL is truncated on the wire.
3. The short-text path tries to strip Gemini's unsolicited trailer at line 910 BEFORE the app's own bibliography is appended at line 921. **But the strip regex fails for flat one-line trailers** (see next section). So Gemini's truncated trailer survives, and the final text contains TWO refs blocks:
   - Gemini's inline one (possibly truncated mid-URL)
   - The app's clean `### Source Text References` from `generateBibliographyString` (always complete)
4. At render time, `splitReferencesFromBody` peels the SECOND one (the one with `###` prefix) into `SourceReferencesPanel`. The first one stays inline in the body where the markdown renderer partially renders the truncated entry. **That's what the user sees** — Gemini's garbage inline, sometimes alongside and sometimes instead of the clean panel (depending on whether `splitReferencesFromBody` matches).

**Why long-text avoids it:** Gemini rarely emits a footer per chunk (the "PART i of N" framing works), so the line 910 strip rarely has anything to catch — it's a no-op in practice for long-text. Same structured-data bibliography step, same broken strip regex — but Gemini's more compliant behavior means the broken strip never fires, and the only refs in the final output are the clean ones from `generateBibliographyString`.

## Why the line 910 strip fails to catch it

Walkthrough with a concrete example. Imagine Gemini's truncated response ends:
```
…gathering in a big, still puddle at the bottom. ⁽⁸⁾
Source Text References 1. [Dream - Wikipedia](https://en.wikipedia.org/wiki/Dream) 2. [Water cycle](https://www.khanacademy
```

(The header and all entries are on ONE line, separated only by spaces.)

The regex at line 910 requires:
- `\n*` — preceding newlines (matches)
- `(?:#{1,4}\s*)?` — optional hashes (matches empty)
- `(?:Sources?|References?|Works?\s*Cited|Bibliography)` — header word (matches "Source")
- `\s*[\n\r]+` — **REQUIRED whitespace + newline AFTER header** — FAILS here (text continues with " Text References…" on the same line)

The regex engine tries the alternatives at each position, but none can satisfy `\s*[\n\r]+` because the entire refs block has no newlines inside it. So the whole Gemini-emitted trailer survives.

Then line 921 appends the app's own clean `### Source Text References\n\n1. [title](url)\n\n…` block *below* Gemini's truncated inline one. Final text has BOTH:
- Gemini's truncated inline trailer (part of "body")
- App's clean structured bibliography (as a proper section)

At render time, `splitReferencesFromBody` peels the SECOND one (the one with `###` prefix) into `SourceReferencesPanel`, leaving Gemini's truncated one inline in the body where it renders as partial markdown. That's the visible symptom.

## Proposed fix for next session — FULL UNIFICATION (recommended)

**Goal (user-framed):** make short-text use the exact same logic as multi-chunk — remove the branch entirely, always run the looping path, skip the outline call when `numChunks === 1`.

This is the same strategy we applied to the simplified pipeline earlier this session, which worked cleanly. The result for Generate Source would be: a single code path that can never drift between short and long text, with Gemini's "PART i of N" framing applied to EVERY call, structurally preventing the unsolicited-trailer behavior that currently only afflicts the single-call branch.

### Why this is the right move (not the regex patch)

The regex-patch approach treats a symptom. The unification approach removes the divergence that causes the symptom. Long-text doesn't have this bug specifically because Gemini treats its "PART i of N" calls as segment rewrites — that's a structural property we can extend to short-text for free by just using the same prompt framing.

After unification, both paths end with exactly one `### Source Text References` block from `generateBibliographyString(masterMetadata)` built from structured chunk.web.uri data. The format is identical by construction; Gemini cannot inject a different format because every call is framed as a segment rewrite.

### Complications to handle during the refactor

1. **Outline-generation step** — multi-chunk starts by calling Gemini to generate section titles ([content_engine_source.jsx:444-461](content_engine_source.jsx#L444)). For `numChunks === 1`, an outline call would just ask Gemini for one title (silly + extra API cost). **Fix:** gate the outline call on `numChunks > 1`. Use a synthetic "Part 1" title or `effTopic` itself for the single-chunk case.

2. **Short-text has custom prompt logic not in multi-chunk** — dialogue mode, narrative mode, `complexityGuard` reading-level compensation, DOK level, vocabulary tuning, custom instructions. The per-section prompt in multi-chunk doesn't include these. **Fix:** port these into the per-section prompt so short-text doesn't lose its current quality controls.

3. **Short-text retry-for-citations logic** ([content_engine_source.jsx:1024-1059](content_engine_source.jsx#L1024)) — if the first call returns 0 citations, it retries once. Multi-chunk has no equivalent. **Fix:** keep it as a post-loop check gated on `chunks.length === 1`, matching the pattern we used for `repairGeneratedText` in the simplified unification.

4. **Dialogue mode** (lines 707-762) generates a JSON dialogue script, not an article. Completely different output type. **Decision:** do NOT unify dialogue mode — keep it on its own branch. Unify only standard/narrative/informational modes.

### Smaller fallback if full unification is too big

If the next session wants a smaller change, the two-step patch (prompt framing + regex fix) below is a valid interim. But full unification is the better engineering move for the same reasons the simplified unification was worth doing.

---

## Fallback (smaller) — patch only, keep the branch

If not doing full unification, the two-step patch is:

### Fix 1 (PRIMARY) — Re-frame the short-text prompt as a segment, not a document

Multi-chunk is reliable because each call's prompt is framed as:
> "Write the section '${sectionTitle}' for an educational article about '${effTopic}'. You are writing section ${i + 1} of ${sections.length}..."

That "you are writing section i of N" framing is the structural signal that tells Gemini "this is a sub-task, not a complete document." Gemini respects the framing and rarely emits a bibliography.

The short-text prompt at [content_engine_source.jsx:764+](content_engine_source.jsx#L764) has no equivalent framing — it just says "Topic: X. Write an educational article." Gemini treats it as a complete-document task and appends its own refs.

**Fix:** add parallel framing to the short-text prompt. Even "You are writing a single-segment educational passage" is enough to shift Gemini's mental model. Example addition near the top of the prompt body:

```js
const prompt = `
  You are writing an educational passage about "${effTopic}".
  This is a self-contained segment rewrite. The citation list will be
  generated automatically and appended by the system — do not write one.
  Target reader level: ${effGrade}
  ...
`;
```

The specific phrasing matters less than the structural signal. Key words that work: "segment," "passage," "excerpt," "section." Key words to avoid: "complete article," "full document," "finished text" (these invite the bibliography reflex).

**Verification:** after applying, regenerate short text ~5 times. Count how often Gemini emits its own inline `Source Text References` trailer. Before the fix: frequent. After the fix: should be rare (<20%).

### Fix 2 (SAFETY NET) — Replace the line 910 strip with a safer variant

Even with better prompt framing, Gemini will occasionally slip in a trailer. The current strip regex at line 910 requires `[\n\r]+` after the header word, which fails when Gemini emits the refs as a flat one-line trailer. Fix it to match any trailer that starts with a reference header AND is followed by a numbered markdown link (lookahead gate):

```js
.replace(
  /(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i,
  ''
)
```

Breakdown of why this is safer than my earlier reverted simplified-pipeline strip:
- `(?:\n|^)` — must be at line start or start of string
- Uses **specific** header variants only (no bare `Sources` or `References` that could false-match body content like "Sources of freshwater include…")
- `(?=\s*\d+\.\s*\[[^\]]+\]\()` — **lookahead gate**: only strips when followed by what actually looks like a numbered markdown link. This was the missing safety mechanism in the earlier simplified strip.
- Anchored to `$` (end of string) so it only strips trailing sections, not mid-doc ones.

### Why the two fixes complement each other

- Fix 1 reduces the *frequency* of Gemini emitting a trailer (addresses the behavioral root cause).
- Fix 2 ensures that when Gemini *does* slip one in, the app removes it cleanly (addresses the surface bug).
- Together, the visible output format from single-call matches multi-chunk: body text → exactly one app-built `### Source Text References` panel. No inline Gemini junk.

## Files & line references for next session

- **[content_engine_source.jsx:328](content_engine_source.jsx#L328)** — `handleGenerateSource` entry point
- **[content_engine_source.jsx:358](content_engine_source.jsx#L358)** — `isShortText = numChunks <= 1` (targetWords ≤ 600)
- **[content_engine_source.jsx:840, 848](content_engine_source.jsx#L840)** — prompt text where the "don't emit refs" instruction lives (two places; both need the negative-example addition)
- **[content_engine_source.jsx:910](content_engine_source.jsx#L910)** — the broken strip regex to replace
- **[content_engine_source.jsx:921](content_engine_source.jsx#L921)** — `generateBibliographyString` call that already produces the correct app-owned refs (this part is fine; nothing to change here)

**Source-module sync:** `content_engine_source.jsx` compiles to `content_engine_module.js` (CDN file). Also mirror edits to `prismflow-deploy/src/content_engine_source.jsx` per the pre-commit drift guard at `dev-tools/check_source_pair_drift.js`.

## Verification plan for next session

1. Apply Fix 1 + Fix 2 above to the **canonical** source (`content_engine_source.jsx`) and mirror to the duplicate.
2. Recompile `content_engine_module.js` from source (the session convention is manual — there's no compile script; diff is just the IIFE + window export wrapper).
3. `node dev-tools/check_source_pair_drift.js` — confirm passes.
4. Full turbo-all deploy.
5. In live app, use Generate Source with a short target (~200 words, citations enabled). Repeat ~5 times (Gemini is nondeterministic; the bug is intermittent).
6. Confirm each run either (a) has no inline refs trailer in the input field or (b) has only the app's clean `### Source Text References` block with complete URLs.

## Why not fix this now

User is at 1% quota and this is a multi-step change involving:
- Prompt tuning (needs empirical testing across several generations to confirm Gemini compliance improves)
- Regex changes to a shared strip path
- Source/module pair sync + drift check
- Full deploy cycle

Safer to land in a dedicated session with time to re-test. Everything needed to execute is in this doc.

## Simplified-pipeline changes already in place

These stay in the codebase, already deployed:
- **Unified chunked + non-chunked simplified path** ([AlloFlowANTI.txt:~27381](AlloFlowANTI.txt)) — fixed latent `config: {}` bug; single code path going forward.
- **`extractedReferences` normalization at extraction** ([AlloFlowANTI.txt:~27367](AlloFlowANTI.txt)) — defensive idempotent normalization so the downstream renderer's header-detection regex matches regardless of flat/multi-line input.
- **Reverted:** the aggressive trailer-strip in the simplified loop that was over-matching legitimate content.

These changes did NOT target the upstream bug (which is in Generate Source, not simplified), but they are independently valuable and have no negative impact on simplified output.
