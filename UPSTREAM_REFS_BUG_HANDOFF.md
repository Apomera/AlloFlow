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

**Gemini's response body is token-truncated while it's emitting an unsolicited inline bibliography trailer at the end.**

Specifically:
1. The prompt at [content_engine_source.jsx:840 and 848](content_engine_source.jsx#L840) says "Do NOT include any Sources, References, Works Cited, Bibliography sections." Gemini complies about 70% of the time; for short-text (single-call mode), compliance is much lower because the model "sees" the whole document task in one pass and instinctively appends a footer.
2. When Gemini DOES emit a footer, it often does so at the very end of its output-token budget. The final URL in the footer is the last thing being generated — if the budget runs out mid-URL, that URL is truncated on the wire.
3. Long-text (multi-chunk) mode **doesn't hit this** because each chunk is framed as "PART i of N of a text" — Gemini treats each call as a segment rewrite, not a complete-document task, and rarely emits a footer per section. The final bibliography is always built by the app from `generateBibliographyString(masterMetadata)` which uses structured URIs.

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

## Proposed fix for next session

**Two complementary changes** to `content_engine_source.jsx`, short-text path only. Do not touch the long-text path.

### Fix 1: Replace the line 910 strip with a looser but safer variant

The current regex's strict "newline after header" requirement is the bug. A better approach — strip from the header position to end-of-string **only when the header is followed by at least one reference-shaped entry** (numbered markdown link). Proposed:

```js
.replace(
  /(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i,
  ''
)
```

Breakdown of why this is safer than my reverted simplified-pipeline strip:
- `(?:\n|^)` — must be at line start or start of string
- Uses **specific** header variants only (no bare `Sources` or `References` that could false-match body content)
- `(?=\s*\d+\.\s*\[[^\]]+\]\()` — **lookahead gate**: only matches if followed by what actually looks like a numbered markdown link. This is the key safety mechanism — prevents the "legitimate paragraph starting with 'References' as a word" over-match that tanked my earlier attempt.
- Anchored to `$` (end of string) so it only strips trailing sections, not mid-doc ones.

### Fix 2: Strengthen the prompt instruction

Lines 840 and 848 already tell Gemini "Do NOT include any Sources…". Add a **negative example** to make the instruction more sticky:

```js
- Do NOT include any "Sources", "References", "Works Cited", "Bibliography", or similar sections. I will automatically append verified sources at the end.
- SPECIFICALLY FORBIDDEN: Do not write any line that starts with "Source Text References" or any numbered list of citations like "1. [Title](url)". These will be generated from my grounding metadata.
```

This won't make Gemini 100% compliant (nothing does), but raises compliance meaningfully and serves as a belt-and-suspenders with Fix 1.

## Files & line references for next session

- **[content_engine_source.jsx:328](content_engine_source.jsx#L328)** — `handleGenerateSource` entry point
- **[content_engine_source.jsx:358](content_engine_source.jsx#L358)** — `isShortText = numChunks <= 1` (targetWords ≤ 600)
- **[content_engine_source.jsx:840, 848](content_engine_source.jsx#L840)** — prompt text where the "don't emit refs" instruction lives (two places; both need the negative-example addition)
- **[content_engine_source.jsx:910](content_engine_source.jsx#L910)** — the broken strip regex to replace
- **[content_engine_source.jsx:921](content_engine_source.jsx#L921)** — `generateBibliographyString` call that already produces the correct app-owned refs (this part is fine; nothing to change here)

**Source-module sync:** `content_engine_source.jsx` compiles to `content_engine_module.js` (CDN file). Also mirror edits to `prismflow-deploy/src/content_engine_source.jsx` per the pre-commit drift guard at `check-source-pair-drift.js`.

## Verification plan for next session

1. Apply Fix 1 + Fix 2 above to the **canonical** source (`content_engine_source.jsx`) and mirror to the duplicate.
2. Recompile `content_engine_module.js` from source (the session convention is manual — there's no compile script; diff is just the IIFE + window export wrapper).
3. `node check-source-pair-drift.js` — confirm passes.
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
