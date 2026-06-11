# AlloFlow I/O Matrix — the Information Transformation Engine

*AlloFlow's remediation pipeline is a hub-and-spoke transformation engine: any
modality in, a canonical semantic core in the middle (accessible HTML +
structured JSON — headings that are really headings, tables with real headers,
equations that carry their math, images that know what they depict), any
modality out. Accessibility is not bolted on: it is the property that makes
the transformation possible. This matrix is simultaneously the roadmap, the
test plan, and the pitch slide. Update it when an adapter or renderer ships.*

**Maturity grades** — ✅ verified by automated tests · 🟢 shipped, logic-tested,
Canvas-unverified · 🟡 partial / honest-scope-limited · ⬜ not built (candidate)
· ✋ deliberately declined (with reason)

## Inputs (adapters → the semantic core)

| Input | Path | Grade | Notes / evidence |
|---|---|---|---|
| Text-layer PDF | pdf.js deterministic extraction + struct-tree-aware rebuild | ✅ | tag-tree + parity + multipage goldens |
| Scanned PDF | dual-engine OCR (Tesseract + Gemini Vision, reconciled) | 🟢 | OCR sub-suites in tag-tree golden; Latin-script strongest |
| Word (.docx) | mammoth/jszip deterministic + embedded media w/ alt | ✅ | docx spec suite; no-OCR-rescue said honestly |
| PowerPoint (.pptx) | OOXML deterministic + per-slide media attribution | ✅ | pptx export golden (media sentinel) |
| Web page / HTML | URL fetch (often blocked → paste HTML) | 🟢 | fetch-blocked fallback disclosed in UI |
| Photo of a worksheet | Gemini Vision extraction (content path) | 🟢 | main-input path |
| **Audio recording** | **transcribe → ALLOTRANSCRIPT format → full pipeline** | ✅ | transcript golden 4/4; ≤15MB inline; >15MB via chunked modal (content path) |
| **Video recording** | same + visual descriptions in transcript | 🟢 | same adapter; Gemini multimodal |
| Voice dictation | MediaRecorder in Expert Workbench | 🟢 | editor-level input |
| Project file (.alloflow.json) | full session restore incl. run history + prefs | 🟢 | the Canvas-native persistence layer |

## The semantic core (what the middle guarantees)

- Real heading hierarchy, lists, tables with header associations (`/Headers` + `/IDTree` — pinned)
- Images classified by Vision (photo/chart/diagram/equation/map/decorative), deduplicated by perceptual hash, alt text human-reviewable one-by-one
- Equations carry spoken-math alt + LaTeX; charts carry AI-ESTIMATED-labeled data tables
- Content never silently dropped (word restoration + visible Recovery appendix)
- Integrity-guarded AI (text floors, fabrication detection, deterministic re-checks every pass)
- Scored by 2 independent rule engines (axe-core + IBM Equal Access, conservative blend) + multi-AI review

## Outputs (renderers ← the semantic core)

| Output | Path | Grade | Notes / evidence |
|---|---|---|---|
| Tagged PDF (original bytes) | client-side StructTreeRoot injection, per-leaf MCID linkage, font repair + subsetting, evidence-gated PDF/UA declaration | ✅ | 8+ goldens; veraPDF ISO clause-diff 7→0, recorded |
| Tagged PDF (generated layout) | typeset-then-tag for source-less inputs (Office, transcripts) | ✅ | typeset + transcript goldens: zero orphans, declaration EARNED |
| Word (.docx) | real heading styles, lists, hyperlinks, images w/ alt, **native editable equations (OMML)** | ✅ | docx spec suite + OMML CDN golden |
| PowerPoint (.pptx) | contrast-checked themes, alt-carrying media | ✅ | pptx golden |
| HTML | themed, MathML for equations | 🟢 | navigable math via temml |
| ePub | single-document, minimal | 🟡 | honest-scope |
| Braille-ready text | uncontracted Grade 1 ONLY — a starting point for transcription workflows | 🟡 | caveat in help string; not contracted braille/BRF |
| Markdown / NotebookLM | clean structure marks | 🟢 | clipboard fallback verified |
| Plain text | maximum compatibility | 🟢 | |
| **Audio (TTS)** | **resumable chunked job: pause / survive rate limits / stitch partial** | 🟢 | WAV PCM-correct concat; in-session progress only |
| Reports | teacher report, Adobe-style, JSON, tamper-evident signed | 🟢 | signed = honest 'not legal-grade' label |
| Interactive lessons / games | structured-JSON packages (plugin architecture, community catalog) | 🟢 | content-tools side of the engine |
| Print | via builder/export surfaces | 🟢 | |
| DAISY / contracted braille / large-print | — | ✋ | professional DSO toolchain territory; we feed it clean source instead |
| MathML inside PDF | — | ✋ | PDF/UA-2 story; AT support thin — Formula role + spoken alt instead |
| Live LMS/web remediation | — | ✋ | we fix copies, not live sites — said in UI |

## Reading the matrix

- **Every feature is one of three moves**: a new input adapter, a new output
  renderer, or a richer core. If a proposal is none of these, ask why it
  belongs in the engine.
- **The typeset-then-tag renderer proves the architecture**: a verified tagged
  PDF generated from pure semantics with no source bytes — the core is
  sufficient to reconstruct any output.
- **The ✋ rows are load-bearing honesty**: declining loudly is part of the
  product. Do not erode them quietly.
