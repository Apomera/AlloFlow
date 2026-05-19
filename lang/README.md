# Language Packs

This directory holds pre-built UI translation packs that AlloFlow serves to
users when they pick a non-English language. Each pack is a JSON object
matching the shape of `ui_strings.js` + the `help_mode.*` keys from
`help_strings.js`.

## How the runtime picks a pack

When a user selects a language, the runtime in `AlloFlowANTI.txt` (the
`AvailableLanguagesView` block, line ~1243) does this in order:

1. **Fuzzy match the user's input** via `window.AlloLangMatcher.match(input)`.
   The matcher knows endonyms ("Soomaali" → Somali), misspellings ("spanis" →
   Spanish), and locale variants ("Spanish for Mexico" → Spanish (Latin
   America)). It returns the canonical slug + a confidence score.

2. **Try Cloudflare** at `https://alloflow-cdn.pages.dev/lang/<slug>.js`.
   This is the primary CDN. Packs in `prismflow-deploy/public/lang/` auto-sync
   here on every deploy.

3. **Fall back to GitHub raw** at
   `https://raw.githubusercontent.com/.../lang/<slug>.js` if Cloudflare is
   slow or down.

4. **Fall back to live generation** via `translateChunk` (Gemini Flash with
   DNT masking + domain glossary). This is what happens for every language
   that doesn't have a pre-built pack — the UI still translates, it just
   costs an API call per chunk and isn't shared across users.

Pre-built packs are not required for a language to work — they just make a
language faster, cheaper per-user, and consistent across users.

## Building a single pack

```bash
# Set your Gemini API key once per shell:
#   PowerShell:    $env:GEMINI_API_KEY = "AIza..."
#   bash:          export GEMINI_API_KEY=AIza...

npm run build:lang -- --lang="Spanish (Latin America)"
npm run build:lang -- --lang="Haitian Creole" --resume   # skip cached chunks
npm run build:lang -- --lang="French" --model="gemini-3-pro"
```

The script mirrors the runtime `translateChunk` pipeline byte-for-byte:

- 200 keys per chunk, 3 chunks in parallel
- DNT (do-not-translate) masking around brand names, `{placeholders}`, units,
  URLs, hex colors, version tags
- Domain-glossary preamble from `translation_glossary.js`
- Placeholder-drift validation at the end
- Writes to `lang/<slug>.js` and mirrors to `prismflow-deploy/public/lang/`

Expect 30 to 90 seconds per language on Flash, 2 to 5 minutes on Pro.

## Building all priority packs

```bash
# All 17 priority packs (tiers 1+2+3):
npm run build:lang:priority

# Just tier 1 (4 packs: Spanish, Haitian Creole, Somali, Arabic):
npm run build:lang:tier1

# Just tier 2 (5 more: Portuguese Brazil, French, Vietnamese, Chinese Simp, Russian):
npm run build:lang:tier2

# Resume an interrupted batch (skips packs already ≥95% complete):
npm run build:lang:resume

# Run a custom list:
node dev-tools/build_priority_packs.cjs --langs="Korean,Tagalog,Japanese"

# Use Pro tier (higher quality, slower, more expensive):
node dev-tools/build_priority_packs.cjs --tier=1 --model="gemini-3-pro"

# Dry-run (no API calls — just verify the pipeline shape):
node dev-tools/build_priority_packs.cjs --tier=1 --dry-run
```

The script regenerates `manifest.json` after every successful pack so a
partial-batch crash still leaves the runtime in a consistent state.

## Priority tiers (PPS context)

These reflect actual Portland Public Schools family-language populations and
Maine ELL data — not a generic "top 100 languages" list.

**Tier 1** — largest PPS family-language populations + critical refugee
communities:

- Spanish (Latin America)
- Haitian Creole
- Somali
- Arabic

**Tier 2** — significant PPS populations + Maine-statewide ELL languages:

- Portuguese (Brazil)
- French
- Vietnamese
- Chinese (Simplified)
- Russian

**Tier 3** — long-tail coverage:

- Tagalog
- Korean
- Japanese
- Ukrainian
- Lingala
- Kinyarwanda
- Swahili
- Amharic

Languages not on this list still work — they just go through live runtime
generation rather than a cached pack. To add a new tier or language,
edit the `TIERS` constant at the top of
`dev-tools/build_priority_packs.cjs`.

## Adding strings when a feature ships

When you add new UI strings to `ui_strings.js`:

1. Add the strings to the appropriate section. (Section map: see
   `UI_STRINGS_TAXONOMY.md`.)
2. Document any `{placeholders}` in a comment on the source line.
3. Re-run the priority-pack builder with `--resume`:

   ```bash
   npm run build:lang:resume
   ```

   This adds the new keys to every existing pack without re-translating
   anything already done. Existing translations are preserved verbatim;
   only the new keys hit the API.

4. Commit and deploy as usual. Cloudflare auto-serves the updated packs.

## What gets translated and what doesn't

The DNT (do-not-translate) list lives in `translation_glossary.js`:

- All brand names: AlloFlow, AlloBot, AlloHaven, StoryForge, LitLab, PoetTree,
  SEL Hub, STEM Lab, Word Sounds Studio, etc.
- All acronyms: UDL, SEL, RTI, IEP, FERPA, FAPE, LRE, MTSS, ELL, ASD, ADHD,
  CASEL, CCSS, etc.
- All `{placeholders}` and `${expressions}`
- All units (5MB, 24°C, 60fps) and version tags (v1, v2.3)
- All URLs and hex colors

Domain-glossary entries in the same file pin specific K-12 special-education
terminology so it stays consistent across all chunks of one pack and across
all packs. Example: "scaffolding" maps to a consistent locale equivalent
rather than getting re-translated differently in each chunk.

## Troubleshooting

**Pack landed in `lang/` but Cloudflare still serves the old one**: the
Cloudflare mirror updates from `prismflow-deploy/public/lang/` on deploy. Run
`bash deploy.sh "lang: ..."` to push.

**Placeholder drift warning during build**: rare, but if `{placeholders}`
were dropped or duplicated, the script flags the count. Rerun with
`--verbose` to see the first 3 affected keys, then either fix the source
text or rerun the chunk with `--resume`.

**Coverage below 90%**: usually transient — rate-limited chunks failed.
Rerun with `--resume` to retry just those chunks.

**Manifest out of sync with packs**: run `npm run build:lang:manifest`.
