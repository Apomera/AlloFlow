# Installing veraPDF for AlloFlow Demo / Validation Workflow

[veraPDF](https://verapdf.org/) is the open-source, ISO-grade PDF/UA-1 validator. The AlloFlow CLI wrapper at `dev-tools/demo/verapdf_check.cjs` runs it against any exported tagged PDF and produces a structured conformance report — the kind of artifact UMaine's accessibility team or any institutional reviewer would produce themselves.

This file documents the one-time install for Aaron's local demo workflow. **Canvas users do NOT need this** — Canvas-mode users get an equivalent (lighter-weight) check via the in-app `view_pdf_validator_module.js` that runs on every export automatically. veraPDF is for dev/demo artifacts + independent third-party verification.

---

## Prerequisites

veraPDF is a Java application. You need:

- **Java 11 or later** (Adoptium Temurin recommended, free and open-source)

Check what you have:

```bash
java -version
```

If "java: command not found" or a version below 11, install from <https://adoptium.net/>.

---

## Install veraPDF (Windows)

1. Download the veraPDF GUI installer from <https://verapdf.org/software/>
2. Run the installer (default install path: `C:\Program Files\veraPDF`)
3. Add veraPDF to PATH (optional but recommended):
   - Add `C:\Program Files\veraPDF` to your `PATH` environment variable, OR
   - Set the `VERAPDF_PATH` environment variable to the full path of `verapdf.bat`:

     ```powershell
     $env:VERAPDF_PATH = "C:/Program Files/veraPDF/verapdf.bat"
     ```

4. Verify the install:

   ```bash
   verapdf --version
   ```

   Or, if you used `VERAPDF_PATH`:

   ```bash
   node dev-tools/demo/verapdf_check.cjs --help
   ```

## Install veraPDF (macOS / Linux)

1. Download the veraPDF GUI installer from <https://verapdf.org/software/>
2. Extract to a stable location (e.g., `/opt/verapdf` or `$HOME/veraPDF`)
3. Make the launcher executable: `chmod +x /opt/verapdf/verapdf`
4. Add to `PATH` or export `VERAPDF_PATH`:

   ```bash
   export VERAPDF_PATH="/opt/verapdf/verapdf"
   ```

5. Verify: `verapdf --version`

---

## Smoke test against a known PDF

After install:

```bash
# Validate a single PDF against PDF/UA-1
node dev-tools/demo/verapdf_check.cjs "path/to/exported.pdf"

# JSON output (pipes into the demo summary template)
node dev-tools/demo/verapdf_check.cjs --json "path/to/exported.pdf" > verapdf-report.json
```

Expected output for an AlloFlow-remediated PDF (post-Slice 1+2 tag-tree unify):

```
══════════════════════════════════════════════════════════════════════
  veraPDF — exported.pdf
══════════════════════════════════════════════════════════════════════
  Profile:       PDF/UA-1
  Compliant:     ✓ YES (or ✗ NO + clause-grouped failures)
  Rules passed:  N
  Rules failed:  M
══════════════════════════════════════════════════════════════════════
```

---

## What the AlloFlow CLI wrapper adds

The wrapper at `dev-tools/demo/verapdf_check.cjs`:

- Auto-locates the veraPDF binary across common install paths + `VERAPDF_PATH`
- Runs against PDF/UA-1 by default (the relevant profile for AlloFlow's tagging work)
- Parses veraPDF's verbose JSON MRR (machine-readable report) output and produces a compact human + JSON summary
- Clusters failures by ISO 14289-1 clause for readability
- Exits 0 on conformance, 1 on validation failures, 2 on tooling errors (suitable for CI integration)

---

## Using both validators together in the demo flow

The recommended demo workflow uses both AlloFlow's pure-Node validator AND veraPDF:

```bash
# 1. AlloFlow's pure-Node structural check (always available, no install)
node dev-tools/demo/exported_pdf_validator.cjs path/to/exported.pdf

# 2. veraPDF's ISO-grade PDF/UA-1 check (independent third-party validator)
node dev-tools/demo/verapdf_check.cjs path/to/exported.pdf
```

For a batch:

```bash
node dev-tools/demo/exported_pdf_validator.cjs --json --batch demo-pdfs/ > internal-validation.json
for f in demo-pdfs/*.pdf; do
  node dev-tools/demo/verapdf_check.cjs --json "$f" >> verapdf-results.json
done
```

The two validators are complementary:

- **AlloFlow internal validator** — fast, browser-compatible (the in-app version is identical and runs on every Canvas export). Catches the most common WCAG-relevant PDF structure issues. **Aaron's pre-flight check.**
- **veraPDF** — ISO 14289-1 conformance reference. **The "independent third-party" verification artifact** Garry or Paul Cochrane's team can re-run themselves.

If both pass, the export is in good shape. If only one fails, the difference points at which specific clause/check needs attention.

---

## Troubleshooting

**"java: command not found"** → install Java 11+ (see Prerequisites above)

**"veraPDF not found" from the wrapper** → set `VERAPDF_PATH` to the full executable path, or add veraPDF's install dir to PATH

**"Failed to parse veraPDF JSON output"** → likely a veraPDF version mismatch (the wrapper expects JSON MRR format, which veraPDF 1.20+ produces by default). Run `verapdf --version` and confirm 1.20 or later.

**Wrapper returns "no jobs in output"** → the PDF couldn't be loaded by veraPDF at all. Inspect the file with Acrobat first; if it opens there but veraPDF can't load it, the file may be encrypted or malformed.
