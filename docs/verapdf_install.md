# Installing veraPDF for AlloFlow Demo / Validation Workflow

[veraPDF](https://verapdf.org/) is the open-source, ISO-grade PDF/UA-1 validator. The AlloFlow CLI wrapper at `dev-tools/demo/verapdf_check.cjs` runs it against any exported tagged PDF and produces a structured conformance report — the kind of artifact UMaine's accessibility team or any institutional reviewer would produce themselves.

This file documents the one-time install for Aaron's local demo workflow and reviewer-facing QA. Most Canvas users do not need to install veraPDF: AlloFlow includes in-app structural PDF/UA self-checks, and some builds can also expose an optional browser-based veraPDF companion window. The local CLI workflow remains the reproducible path for independent third-party verification because an institutional reviewer can rerun it on the exact exported file.

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

---

## Fast path (2026-06-09): downloads already staged + automated diff harness

A portable Temurin 21 JRE zip and the veraPDF installer zip are already
downloaded at `C:\Users\cabba\.alloflow-tools\`. To finish (no admin needed):

```powershell
cd $env:USERPROFILE\.alloflow-tools
Expand-Archive jre21.zip -DestinationPath . -Force          # → jdk-21.x.x-jre\
Expand-Archive verapdf-installer.zip -DestinationPath . -Force
# Run the installer with the portable Java (GUI appears; install to $env:USERPROFILE\veraPDF):
& (Get-ChildItem jdk-21*\bin\java.exe).FullName -jar (Get-ChildItem verapdf-greenfield*\verapdf-izpack*.jar).FullName
```

`$env:USERPROFILE\veraPDF\verapdf.bat` is auto-detected by the tooling
(no PATH edit needed). veraPDF needs Java on PATH at RUN time, so either add
the portable JRE's `bin` to PATH, or set it per-session:
`$env:PATH = "$env:USERPROFILE\.alloflow-tools\jdk-21.0.9+10-jre\bin;$env:PATH"`
(adjust the version folder name).

### What you get once it's installed

The tag-tree golden master now **saves its real source+tagged PDF pairs** to
`tests/e2e/artifacts/` on every run, and `dev-tools/verapdf_diff.cjs` runs
ISO-grade PDF/UA-1 validation on both sides of each pair and reports, per
ISO 14289-1 rule:

- **fixed by tagging** — failing in the source, passing in our output
- **INTRODUCED by tagging** — the regression class (`--gate` exits 1)
- **inherited from source** — fails in both (e.g. source font embedding —
  honest scope: tagging can't fix these)

```bash
npx playwright test tests/e2e/pdf_tag_tree_golden.spec.ts   # regenerate artifacts
node dev-tools/verapdf_diff.cjs                              # human clause diff
node dev-tools/verapdf_diff.cjs --json                       # machine-readable
```

It is also wired into `verify_all` (informational; skips cleanly when
veraPDF or artifacts are absent).
