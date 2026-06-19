# veraPDF-in-the-browser via CheerpJ — feasibility spike (2026-06-19)

**Question:** can veraPDF (the reference open-source ISO 14289-1 / PDF/UA validator, written
in Java) run **entirely in the browser** via CheerpJ (a WASM JVM), so AlloFlow can give an
**independent** PDF/UA verdict on the user's actual exported PDF — no server, no data egress?

## Verdict: feasible, proven end-to-end — not yet production-ready

| Finding | Result |
|---|---|
| CheerpJ WASM JVM boots in a standard browser | ✅ ~1s init, ~9 MB, no COOP/COEP needed |
| veraPDF 1.30.2 runs under CheerpJ | ✅ (`org.verapdf.apps:cli:1.30.2`, a 16 MB fat jar) |
| Validates a PDF + returns the full ISO 14289-1 report | ✅ correct verdicts + rule-level JSON |
| `__syscall_dup2` crash on report output (CheerpJ 3.0) | ✅ **fixed by CheerpJ 3.1** (`/3.1/cj3loader.js`) |
| Warm small docs (library reuse, not CLI `main`) | ✅ **~300 ms** (vs ~14s cold = 40-50×) |
| Warm **big** docs (1 MB / 6 pg real PDF) | ❌ still >6 min — interpreter-bound; size-gate |
| First/cold validation reliability | ⚠️ intermittently stalls — needs a watchdog/retry |
| Canvas sandboxed-iframe boot | ❔ **untested** — the remaining deployment gate |

## Files

- **`verapdf_validator.html`** — the deliverable: a self-contained companion-window component.
  Boots + warms up on load, then validates picked / `postMessage`'d PDF bytes and returns a
  grouped rule-level report. Emits `{type:'verapdf-ready'}`; accepts
  `{type:'verapdf-validate', bytes}`; returns `{type:'verapdf-result', result}`. Set `JAR_URL`
  to the CDN path of the jar (a CheerpJ `/app/...` FS path, **not** a relative web URL).
- `cheerpj_verapdf_spike.html` — manual 2-stage harness (Stage 1 boot test, Stage 2 veraPDF run).
- `run_cheerpj_spike.cjs` — headless Stage-1 boot runner (Playwright).
- `run_verapdf_stage2.cjs` — headless veraPDF runner (serves `C:\tmp` with HTTP Range support).
- `stage2.html` / `stage2_lib.html` / `stage2_warmbig.html` — CLI run / warm library-reuse proof / warm+big test.
- `test_validator.cjs` — headless test of `verapdf_validator.html`.
- `generate_sample_pdf.cjs` (valid minimal PDF) / `generate_big_pdf.cjs` (multi-page; **buggy** — veraPDF flags it "encrypted", use real downloaded PDFs for timing).

## Reproduce

1. Download the jar to `C:\tmp\verapdf-cli.jar`:
   `curl -o C:/tmp/verapdf-cli.jar https://repo1.maven.org/maven2/org/verapdf/apps/cli/1.30.2/cli-1.30.2.jar`
2. Put a test PDF at `C:\tmp\sample.pdf` (or `node generate_sample_pdf.cjs`).
3. `NODE_PATH=<repo>/node_modules node run_verapdf_stage2.cjs` (needs the repo's Playwright/Chromium).

The jar (~16 MB) and sample PDFs are intentionally **not** committed.

## How it works (the load-bearing API)

```
cheerpjInit()
lib = cheerpjRunLibrary('/app/verapdf-cli.jar')          // /app FS path, not a web URL
lib.org.verapdf.gf.foundry.VeraGreenfieldFoundryProvider.initialise()
foundry = lib.org.verapdf.pdfa.Foundries.defaultInstance()
ua1 = lib.org.verapdf.pdfa.flavours.PDFAFlavour.fromString('ua1')
// per-doc (warm = ~300ms for small docs):
cheerpOSAddStringFile('/str/input.pdf', uint8Bytes)       // cheerpjAddStringFile is deprecated
parser = foundry.createParser(new FileInputStream('/str/input.pdf'), ua1)
validator = foundry.createValidator(ua1, false)
result = validator.validate(parser)                       // .isCompliant(), .getTestAssertions()
```

## Next steps (for the AlloFlow integration)

1. Host `cli-1.30.2.jar` + this page on AlloFlow's CDN; set `JAR_URL`; service-worker cache the ~25 MB.
2. **Canvas-gate test:** open `verapdf_validator.html` from a Canvas-launched companion window — confirm CheerpJ boots there.
3. Wire in: a **pre-remediation opt-in toggle** (default OFF; *"downloads ~25 MB once, runs privately — nothing uploaded"*) that starts the background warm-up during remediation, validates the export, and shows *"Independently validated by veraPDF: N/M rules pass."* Size-gate big docs (background + progress, or a self-hosted veraPDF service). Add a cold-run watchdog (timeout → reload window → retry).
