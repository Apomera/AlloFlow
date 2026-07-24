# Handoff: Export-format hardening (Round 2) — for correctness review

**Author:** Claude (Fable), session 2026-07-13
**Audience:** ChatGPT (or any reviewer) doing an independent correctness pass
**Status:** 5 commits landed on `main`, **local / undeployed**. Nothing pushed, nothing deployed to CDN yet.

You have **no shared context** with me, so this document is self-contained. Please read adversarially — the goal is to catch anything I got wrong before Aaron deploys. I have flagged the spots I am least sure about and the things I could **not** verify.

---

## 0. Context you need first

AlloFlow is a privacy-first education/accessibility tool. It exports a lesson or a remediated PDF into many formats. There are **two separate export surfaces** that historically drifted apart (this "lane divergence" caused half the bugs):

- **Document Builder lane:** `view_export_preview_source.jsx` + `export_handlers_module.js` + `export_source.jsx`
- **PDF-remediation lane:** `view_pdf_audit_source.jsx`

### Build / mirror architecture (important, non-obvious)

- The `view_*_source.jsx` files are **Babel-compiled** into `view_*_module.js` (JSX → `React.createElement`, comments stripped, non-ASCII written as `\uXXXX` escape text). This is done by an **external watcher that was NOT running** during my session, so **I hand-mirrored every edit** from source → `_module.js` → `desktop/web-app/public/*_module.js`. **A key review task is confirming the hand-mirrored module matches the source semantically** (see §2).
- `export_handlers_module.js` and `liblouis_braille_loader.js` are **hand-written** (no `.jsx` source). They are edited directly and copied to `desktop/web-app/public/`.
- The `desktop/web-app/public/` copies are what the CDN serves. Root + public copies must stay byte-identical for the module files.

### How to see exactly what changed

Each commit is self-contained. The most reliable review path:

```
git show 8df47084e   # popup XSS + language
git show 5c28fee18   # braille
git show 790cc34de   # ePub validity
git show 452ad4e1b   # audio gap disclosure
git show dc48145ef   # office details-fusion + ODT language
```

Run the tests:

```
npx vitest run tests/export_hardening_r2.test.js tests/braille_grade1.test.js tests/export_odt_daisy.test.js tests/epub_self_check.test.js
```

I also ran `node dev-tools/check_render_refs.cjs` and `node dev-tools/check_free_vars.cjs` (both clean) — these catch runtime `ReferenceError`s that `node --check`/Babel miss in this codebase.

---

## 1. What each commit does + what to verify

### `8df47084e` — plain-language summary popup (findings #1 XSS, #2 wrong lang)
**File:** `view_pdf_audit_source.jsx` (+ module + mirror). Look for `_escSum` / `_summaryHtml` (the popup handler builds a document and calls `win.document.write`).

- **Was:** raw Gemini `summary`, the uploaded `pendingPdfFile.name`, and a free-text language name were interpolated into `window.open(...).document.write(...)` with **no escaping** (same-origin window → script executes). The `<html lang>` came from `lang.substring(0,2)` of the language **name** (Spanish→`sp`, Dari→`da`=Danish, Haitian Creole→`ha`=Hausa).
- **Now:** `_escSum` escapes `& < > "`; the summary is escaped **before** the plain-text→HTML transform; `<ul>/<p>` blocks are built instead of the old orphan `<li>`; the lang code is resolved via `languageToTTSCode(lang)` with an absent-beats-wrong guard (no `lang` attr if unresolved); RTL is derived from the resolved code via the same regex the export spec uses at ~line 501 of the file.

**Check for correctness:**
1. Is the escaping **complete for every sink**? The summary lands in an HTML **body** context; the filename in body text; the lang code in an **attribute** (`lang="..."`) and in CSS (`direction:${dir}`). Confirm nothing user-controlled still reaches an unescaped attribute or a `<script>`/`<style>`/URL context. `dir` is a computed `'rtl'|'ltr'` (safe); `gradeLabel`/`level` come from `<select>` (safe). **Is `_langCode` safe to drop into `lang="..."`?** It's `languageToTTSCode`'s output (a short subtag). I assumed it can't contain a quote — please confirm `languageToTTSCode` (in `module_scope_extras_source.jsx`) can only return `[a-z-]`.
2. Does the `<ul>/<p>` block builder handle a summary that mixes bullet and non-bullet lines in one paragraph sensibly? (I treat a block as a list only if every non-empty line starts with `- `.)

### `5c28fee18` — Grade-1 braille correctness + lane unification (findings #3/#4/#5) — **HIGHEST-RISK, please scrutinize**
**Files:** new canonical converter in `liblouis_braille_loader.js` (function `toGrade1BRF`, `module.exports` + `window.AlloBraille.toGrade1BRF`); both lanes wired to prefer it (`view_pdf_audit_source.jsx`, `view_export_preview_source.jsx`) with a corrected inline `_toBRF` fallback; remediation lane also gained a DOMParser-based text extraction. Unit tests in `tests/braille_grade1.test.js`.

This ships **Braille-ASCII (BRF)** to real embossers and braille notetakers for blind students, so domain correctness matters more than code cleanliness.

**Claims I am asserting — please verify against a braille standard (BANA / NABCC / Braille-ASCII table):**
1. **Number sign** `#` before a digit run; digits `1..9,0` → `A..I,J`. (Braille-ASCII `#` = dots 3-4-5-6; `A`=dot1=digit1.)
2. **Letter sign** `;` (dots 5-6) inserted when a letter **a–j** follows a number with no space, so `"1a"` → `#A;A` and reads "1" then "a" (not "11"). I apply it **only** to a–j (the digit-ambiguous letters), not k–z. **Is "only a–j" correct, or should the letter sign apply to any letter following a numeral?**
3. **Capitals:** one capital sign `,` (dot 6) **per** capital letter (`"AB"`→`,A,B`). I deliberately did **not** implement the double-capital word indicator (`,,`) — is per-letter acceptable, or does a real transcription expect `,,` for all-caps runs?
4. **Smart punctuation** normalized before conversion: curly quotes→`'`/`"`, en/em dash→`-`, ellipsis→`...`, nbsp→space, guillemets→`"`, bullet→`*`. Straight quote `"` maps to Braille-ASCII `7`. **Is `7` for a double-quote correct, or does it collide with the opening-paren cell?** (I know EBAE distinguishes open/close quotes; I flattened them — acceptable for Grade 1?)
5. **NFD accent folding:** `é`→`e`, `ñ`→`n` via `normalize('NFD')` + strip combining marks, so accented Latin text isn't dropped.
6. **Un-representable characters** (CJK, Arabic, emoji) are **counted** (`dropped`) and the caller warns; they are not silently lost but they ARE dropped from output. Is counting-and-warning the right behavior, or should such a document fall through to UEB / be refused?
7. **Word-aware wrap at 40 cells** (no mid-word breaks); a single token longer than 40 hard-splits.

**Architecture check:** both lanes now `window.__alloLoadPlugin('liblouis_braille_loader.js')`, then prefer `window.AlloBraille.toGrade1BRF` (loaded), else the inline `_toBRF` fallback (which I also corrected for the letter-sign + NFD). UEB Grade 2 via liblouis is still preferred over Grade 1 when available. **Please confirm the fallback path is genuinely correct** (i.e. if the plugin fails to load, the inline converter still produces valid BRF), since that is the offline path a blind student depends on.

**What I could NOT verify:** real embosser/notetaker output, and the liblouis UEB path (the loader's own comment says it was "NOT yet browser-smoke-tested"). The Grade-1 converter has behavioral unit tests but has **not** been checked against a physical braille display or a transcriptionist.

### `790cc34de` — ePub validity (findings #7 invalid XHTML, #8 namespace)
**Files:** `view_export_preview_source.jsx` (builder ePub), `view_pdf_audit_source.jsx` (remediation ePub + read-along SMIL). Both mirrored.

- **#7:** builder ePub now serializes `content.xhtml` via `new XMLSerializer().serializeToString(_clone)` (well-formed XML, void elements self-closed) instead of a regex patch that left `<meta>/<input>/<col>` unclosed.
- **#8:** both lanes previously restored the root XHTML namespace only when the serialized string contained **no** `xmlns` at all — which any inline MathML/SVG `xmlns` defeated, leaving the root `<html>` in no namespace. Now: strip the xhtml `xmlns` everywhere, then **always** re-add it to the root: `if (!/^<html\b[^>]*\sxmlns=/i.test(xhtml)) xhtml = xhtml.replace(/^<html\b/i, '<html xmlns="...xhtml"')`.
- Bonus: remediation `nav.xhtml` labels are now escaped and capture full heading text; the read-along Media Overlay `<seq>` got its required `epub:textref="content.xhtml"` (epubcheck RSC-005).

**Check for correctness:**
1. **The big gap: I validated with jsdom well-formedness only, NOT with epubcheck or a real reader.** `tests/export_hardening_r2.test.js` proves the output re-parses as XML and the root carries the namespace even with MathML — but jsdom-well-formed ≠ epubcheck-conformant. **Please run the generated `.epub` through epubcheck** (or reason about it): is stripping *all* xhtml `xmlns` then re-adding only to root safe when the body contains a `<math xmlns="...MathML">` (which keeps its own namespace)? My assumption: children inherit the root xhtml namespace and MathML keeps its explicit one — confirm XMLSerializer output actually declares namespaces where needed.
2. Does `XMLSerializer` on the builder's cloned `<html>` element correctly emit `<style>` content (CSS with `<`/`&`)? If the builder content has a `<style>` block, could that break XML parsing? (There is a try/catch fallback to the old regex form.)
3. The `<seq epub:textref="content.xhtml">` — is textref-to-the-whole-content-doc valid, or does each `<par>` also need per-fragment textref? (The `<par>`s already have `<text src="content.xhtml#...">`.)

### `452ad4e1b` — audio gap disclosure (finding #12)
**File:** `export_handlers_module.js` (hand-written; + mirror). Functions `_alloBuildAudioDownloadAssets`, `_alloInsertAudioDownloads`, and the caller.

- Failed TTS chunks were silently absent from the concatenated file and a success toast still fired. Now: count missing sections per variant, track fully-failed variants, annotate the on-page download card ("N of M sections are missing"), and toast an honest warning instead of clean success. Partial inline karaoke also now toasts.

**Check for correctness:** the counting — `_missing = plan.chunks.length - blobs.length`. Is a "chunk" always one section, so the count is meaningful to a teacher? Does `anyPartial`/`failedVariants` propagate to exactly the right toast branch? This is disclosure-only (no data change), so low blast radius, but confirm no false-positive warnings on the happy path.

### `dc48145ef` — office/DAISY AI-panel fusion + ODT language (finding #9 + a MED)
**File:** `view_pdf_audit_source.jsx` — the **shared** `_htmlToDocxSpec` block walk (feeds DOCX, ODT, **and** DTBook/DAISY) and the `_dlOdt` handler. Mirrored.

- **#9:** the walk had no `<details>` case, so AI companion panels fell to a catch-all that fuses every text leaf into one run — a chart-data table (`<summary>` + a data `<table>`) came out with cell values glued digit-to-digit ("Q1Q2Q3...101520"). Now: a `DETAILS` handler **drops** the redundant `allo-math-source` "show source" panel entirely (the equation is rendered in the body; matches what the audio lane does), and **walks the content** of any other panel as real blocks so the data table stays a table.
  - **Subtle thing worth double-checking:** MathML is a **foreign element**, so its DOM `tagName` is lowercase `"math"`, not `"MATH"`. My skip check uppercases (`(_dn.tagName || '').toUpperCase()`). If you review only the source, confirm that normalization is present in **both** the source and the compiled module.
- **ODT language:** the ODT declared **no** document language, so a Spanish handout opened in the reader's locale (wrong screen-reader voice + spell-check). Now the default text style is tagged `fo:language`/`fo:country` (WCAG 3.1.1) and `dc:language` is added to `meta.xml`.

**Check for correctness:**
1. `tests/export_hardening_r2.test.js` runtime-extracts `_htmlToDocxSpec` + `_htmlToDtbookXml` and asserts the chart table survives and the math panel is dropped — **please confirm the walk cannot double-emit** (I pass `{ childNodes: filteredArray }` back into `walk`, which recurses). Is there any input shape where a nested table or a chart-data table inside another block gets emitted twice or dropped?
2. Is dropping `allo-math-source` from **office** exports the right product call? It removes the "show source" LaTeX/MathML panel. The equation itself should still be present elsewhere in the document — verify that assumption holds (i.e., the source panel is genuinely redundant, not the only representation).
3. **ODF validity:** I inject `fo:language="xx" fo:country="none"` into the default `<style:text-properties>` via string replace on `_ODT_STYLES_XML`, and split the lang code on `-`/`_`. Is `fo:country="none"` valid ODF when there's no country subtag? Does a language like `es-MX` map correctly (`fo:language="es" fo:country="MX"`)? Would opening in LibreOffice show the right language?

---

## 2. Hand-mirror equivalence — a discrete task worth doing

Because the compiler watcher was off, I translated each source edit into the compiled module by hand. For each changed function, the module should be the **same JS logic** as the source, only reformatted (double quotes, `\uXXXX` escapes, no comments). Suggested spot-checks:

```
# braille canonical is identical root vs public mirror:
diff liblouis_braille_loader.js desktop/web-app/public/liblouis_braille_loader.js   # expect no diff

# each view module == its public mirror:
diff view_pdf_audit_module.js      desktop/web-app/public/view_pdf_audit_module.js
diff view_export_preview_module.js desktop/web-app/public/view_export_preview_module.js
diff export_handlers_module.js     desktop/web-app/public/export_handlers_module.js
```

(All expected to be identical; the tests assert some of these.) The higher-value check is **semantic**: read the DETAILS handler, the ePub xmlns guard, the popup escaping, and the braille flow in the `_module.js` and confirm they do the same thing as the `_source.jsx`. `node --check` passed on every module, but that only proves syntax, not that my hand-translation preserved behavior.

---

## 3. What I did NOT verify (honest gaps)

- **No real-browser / Canvas smoke.** Everything is node + jsdom + unit tests. The compiled modules were only `node --check`ed, not run in a browser.
- **No epubcheck**, no DAISY validator, no physical embosser, no screen-reader (NVDA/VoiceOver) pass. The braille and ePub fixes are the ones most in need of real-tool/human validation.
- **The liblouis UEB path** remains browser-un-smoke-tested (pre-existing; the loader says so itself). My change only added the Grade-1 sibling and didn't touch UEB.

---

## 4. Remaining work (NOT done — for Aaron / next session)

- **#6 DAISY has no SMIL layer (HIGH, needs a decision):** the `.zip` (dtbook + NCX + OPF, no SMIL) is not a conformant Z39.86 fileset, so strict DAISY readers may refuse the file the toast says to "open in a DAISY reader." Decision pending: build a minimal SMIL layer vs. relabel the export honestly.
- **#10 PPTX (HIGH):** neither surface emits real title **placeholders** (`defineSlideMaster`), yet the success toast/tooltip claim "real slide titles" and "tables with header rows." PowerPoint's own accessibility checker flags every slide. Needs placeholders + honest wording.
- **#11 (MED):** the Builder slides **preview** renders resource types that `handleExportSlides` silently drops (faq, brainstorm, sentence-frames).
- **Office MEDs:** row-header (`th scope="row"`) semantics lost in DOCX/ODT/PPTX; per-span `lang` stripped from office runs; DOCX image height not rescaled when width is clamped + view-PPTX forces 3.2×2.4in; nested tables double-emit; `<p><img></p>` vanishes; `del`/`mark`/`code` flattened; PPTX RTL absent both surfaces.
- **Consistency MEDs:** translated + plain-language HTML ship **without** the reader app the English original gets; plain-language tagged PDF hardcodes `lang:'en'`; the exported reader's read-aloud never sets `utterance.lang`; audio resume re-segments the MAIN doc (loses a translated job); mixed mp3/wav in one job can corrupt output; remediation `.md`/`.txt` fuse table cells and don't decode entities.

Full file:line punchlist lives in the memory note `project_export_format_review.md` (my working notes) and the original 5-agent audit outputs.

---

## 5. TL;DR for the reviewer

If you only have time for three things:
1. **Braille** (`5c28fee18` / `tests/braille_grade1.test.js`): verify the Braille-ASCII mappings, the letter-sign rule (a–j only), and per-letter vs double capital against an actual standard. This ships to blind students.
2. **ePub** (`790cc34de`): run epubcheck on a generated `.epub` (especially one containing a MathML equation) — I only proved jsdom well-formedness.
3. **Hand-mirror equivalence** (§2): confirm the compiled `_module.js` edits match the `_source.jsx` logic, since the watcher was off and I translated by hand.
