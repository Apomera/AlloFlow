# STEM Lang-Pack Squad — Coordination & Instructions (2026-07-17)

Mission: hand-translate `stem.<tool>.*` UI keys into the 63 language packs (`lang/<slug>.js`).
Coordinator: the session that wrote this doc (Lane A) — it consolidates memory at the end. Aaron assigns lanes when spawning agents.

## HARD RULES (non-negotiable)

1. **YOU (the model) are the translator.** Never delegate translation to Gemini/runtime AI, never machine-translate. Real students read this.
2. **`karen` is HELD** — Aaron's decision (2026-07-15): do NOT translate the karen pack for any tool. Leave it on English fallback for a native S'gaw Karen reviewer. Skip it silently in every lane.
3. **One lane = one exclusive set of `lang/<slug>.js` files at a time.** The apply script rewrites the whole pack file; two simultaneous writers to the same slug lose one side's write. Never touch a slug outside your lane while another lane is active.
4. **Pathspec commits ONLY.** Never `git add -A`, never bare `git commit -a`, never amend/reset/stash on this shared tree. Commit exactly your 3 files per pack (the pipe script does this). If a pre-commit hook fails, `git restore --staged <your files>` IMMEDIATELY (staged files get swept by concurrent sessions).
5. **`.git/index.lock` present → wait and retry** (the pipe retries 10×). Only remove the lock manually if `ps -W | grep git.exe` shows no git processes.
6. **Disk is tight** (C: ~96%). Don't create large temp files; write HT modules to your own session scratchpad.
7. **Don't edit shared docs/memory mid-flight** (this file, `project_stem_translation.md`). Your progress is your git log: `git log --oneline | grep "i18n(<tool>)"`. Lane A consolidates memory at the end.

## LANE ASSIGNMENTS (disjoint — no slug overlap while active)

Repo: `C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated` (cwd resets between shell calls — `cd` in every command).

| Lane | Tool | Packs (slugs) | Status |
|------|------|---------------|--------|
| **A** (coordinator, active) | typingpractice (333 keys) | SE-Asian remainder: hmong, thai, khmer, lao, burmese + minority 5: acholi, maay_maay, marshallese, chin_falam, chin_hakha | 32/62 done, in progress |
| **B** | typingpractice | South-Asian 10: hindi, marathi, nepali, bengali, gujarati, punjabi, tamil, telugu, kannada, malayalam | open |
| **C** | typingpractice | African 10: swahili, hausa, igbo, yoruba, somali, lingala, kinyarwanda, kirundi, amharic, tigrinya | open |
| **D** | music (425 keys) | ALL 62 (family order: Romance → European → RTL → East-Asian → SE-Asian → South-Asian → African → minority) | needs extraction first |
| **E** | manipulatives (707 keys) | ALL 62 (family order: African → South-Asian → SE-Asian → East-Asian → RTL → European → Romance → minority) **← reversed on purpose** | needs extraction first |
| **F** (optional, big) | solarsystem (1825 keys) | ALL 62 (family order: East-Asian → RTL → Romance → European → SE-Asian → South-Asian → African → minority) | needs extraction first |

Cross-lane collision note: Lanes B/C/D/E/F all eventually touch the same slug files for DIFFERENT tools. The staggered family orders make same-slug-same-moment writes unlikely; the **self-heal check** (below) makes any residual clobber recoverable. If you ever see your tool's key count drop in a pack you already committed, just re-run the pipe for that pack — apply is non-clobber and your handtl JSON is committed.

## WORKFLOW PER TOOL (Lanes D/E/F first steps)

```sh
cd /c/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated
node dev-tools/i18n/extract_stem_tool_en.cjs <tool>     # writes dev-tools/i18n/stem_<tool>_en.json
# inspect: node -e "const o=require('./dev-tools/i18n/stem_<tool>_en.json');console.log(Object.keys(o).length)"
git add dev-tools/i18n/stem_<tool>_en.json
git commit -m "i18n(<tool>): extract N-key English manifest" -- dev-tools/i18n/stem_<tool>_en.json
```
If the extractor returns 0 keys, the tool isn't i18n-wrapped yet — STOP and report; don't wrap source yourself unless assigned.

## WORKFLOW PER PACK (all lanes)

1. **Read the full manifest**: `dev-tools/i18n/stem_<tool>_en.json` (dump key = value, all of it).
2. **Write an HT module** to your scratchpad, e.g. `ht_<tool>_<slug>.js`:
   ```js
   module.exports = { CORR: {}, HT: {
     some_key: "translation",
     "20_35_words_quick_focus": "…",   // quote keys that start with a digit!
     // …EVERY key from the manifest, same order…
   }};
   ```
   Translate every key. Keep-verbatim (see table below). `node -c` it.
3. **Run the pipe** (validates count, applies, audits, commits by pathspec with lock-retry):
   ```sh
   sh dev-tools/i18n/stem_pack_pipe.sh <tool> <slug> <iso> "<Lang Name>" "<AI note>" /path/to/ht_<tool>_<slug>.js ['<contam-regex>']
   ```
   Default contam regex flags Arabic/Hebrew/CJK/Hangul/Thai/Devanagari/�. For packs written in one of those scripts, pass an override that EXCLUDES the pack's own script (see `git log` examples from typingpractice ar/he/ja/ko commits).
4. **Check output**: `OK all N keys`, `contam: none`, `check_lang_json ... valid JSON`, `COMMITTED <slug>`. Any MISSING/EXTRA → fix the HT module, rerun.
5. Reference translations: committed `dev-tools/i18n/handtl_typingpractice_*.json` and `handtl_funcgrapher_*.json` show the established register per language.

## END-OF-LANE SELF-HEAL (required)

```sh
cd /c/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated
node -e "
const fs=require('fs');const N=Object.keys(require('./dev-tools/i18n/stem_<tool>_en.json')).length;
for(const s of ['<your>','<slugs>']){const j=JSON.parse(fs.readFileSync('lang/'+s+'.js','utf8'));
const n=j.stem&&j.stem['<tool>']?Object.keys(j.stem['<tool>']).length:0;
console.log(n===N?'OK':'CLOBBERED — re-run pipe for',s,n+'/'+N);}"
```
Re-run the pipe for any CLOBBERED slug (idempotent).

## TRANSLATION STANDARDS

**Always keep verbatim:** math/formula strings (`y = 2x+1`, `f(x)`, `2π/b`), decorative keys with no Latin letters (`str` = `"❦ ⚙"`), product names (AlloFlow, Minecraft), citations & CCSS codes, `WPM IEP FERPA CSV PNG PDF JSON ASCII Pareto Ctrl Esc Tab Enter`, home-row key letters `a, s, d, f · j, k, l, ;`, keyboard shortcut letters, emoji.

**"AI" localization (established across tools — follow exactly):**
de→KI · pl→SI · ru→ИИ · uk→ШІ · el→ΤΝ · tr→YZ (Yapay Zekâ) · es/fr/it/ro/pt/ht/la→IA · ar→الذكاء الاصطناعي · he→בינה מלאכותית · fa/dari→هوش مصنوعی · ur→مصنوعی ذہانت · ps→مصنوعي ځيرکتيا · zh-CN→人工智能 · zh-TW→人工智慧 · **keep "AI"**: nl, eo, ja, ko, vi, id, tl, hmong, th, km, lo, my, all Indic, all African, all minority packs.

**Register by language tier:**
- Full native translation: all Romance/European/RTL/East-Asian, vi, id, th, km, lo, my, all Indic, sw, am, ti.
- **Code-switch** (English tech/clinical terms kept — authentic classroom register, NOT laziness): tl, hmong, ha, ig, yo, so, ln (French loans), rw, rn, acholi, maay_maay, marshallese, chin_falam, chin_hakha. UI verbs/shell in the native language; terms like drill/keyboard/font/backup MAY stay English.
- Higher verbatim-EN counts in code-switch packs are expected and correct.

**Distinctness requirements (don't clone):** tigrinya ≠ amharic (different languages). maay_maay ≠ somali (qeyb not jajab, etc.). kirundi may derive from kinyarwanda with Rundi swaps (canke/Rondera/Raba/umunyeshure/cane) — note it in the commit. chin_hakha may derive from chin_falam with Hakha swaps (hmaan, a cunglei/tanglei nambat, aa lawnmi) — note it. Derived variants (es-ES from es-419, pt-PT/pt-AO from pt-BR, fr-CA from fr, dari from farsi) are fine WITH documented locale swaps in the commit message.
**zh-TW:** hand-write, or convert your zh-CN via the curated S2T map in `dev-tools/i18n/s2t_reference.cjs` + TW term swaps (人工智慧); verify 0 residual simplified chars.

**Script hygiene:** Brahmic packs (th/km/lo/my, Indic) — scan for sibling-script bleed (Thai chars in Lao, etc.). Ge'ez (am/ti) — scan for non-Ge'ez foreign scripts + English-prose leaks. Latin packs — scan for stray Cyrillic/Arabic/CJK fat-fingers. The pipe's contam regex handles the common cases; add sibling-block checks for Brahmic/Indic yourself.

## KNOWN TRAPS

- `bash` cwd resets to `~` between calls → `cd` into the repo in EVERY command.
- handtl JSON is nested `{slug:{keys}}` — unwrap `o[Object.keys(o)[0]]` in derivation scripts.
- Build derived packs (kirundi, chin_hakha, dari, pt variants) AFTER the source pack's handtl exists.
- Keys starting with digits must be quoted in the HT module or `node -c` fails.
- Pre-commit hooks (pipeline-integrity, source-pair drift, Lumen sweep) may fail on OTHER sessions' in-flight edits — your commit gets rejected. Unstage your files, wait ~1 min, retry. NEVER `--no-verify`.
- A concurrent `git add -A` session may sweep your uncommitted work into their commit — content survives, label is lost. Minimize the window: run the pipe (which commits) immediately after writing each HT module.
- `vitest -u` rebaselines the whole suite; don't run it.
- Out of scope: 8 tools (cell, circuit, ecosystem, galaxy, inequality, physics, rocks, wave) are NOT i18n-wrapped — they need source wrapping first, separate assignment. dinolab→anatomy etc. are DONE (57/63 or 62/63); see `project_stem_translation.md` for the census.

## COMPLETION REPORT (per lane)

When your lane is done: run the self-heal check, then post a summary in your final message to Aaron — tool, packs done with commit hashes, verbatim-EN notes, anything flagged for native review. Lane A merges everything into project memory.
