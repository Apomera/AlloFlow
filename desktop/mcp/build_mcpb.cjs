#!/usr/bin/env node
/**
 * Build the AlloFlow PDF Remediation connector as an MCPB bundle
 * (the one-click installable format for Claude Desktop; a .mcpb is a zip
 * with a manifest.json at its root).
 *
 *   node desktop/mcp/build_mcpb.cjs [--lean] [--allow-unvalidated]
 *
 * Output: desktop/dist/mcpb/alloflow-remediation.mcpb  (dir is gitignored)
 *
 * Bundle layout:
 *   manifest.json            — MCPB manifest; user_config prompts for the
 *                              Gemini API key (stored by the client, injected
 *                              as GEMINI_API_KEY; never in the bundle)
 *   PRIVACY.md               — data-flow disclosure (directory requirement)
 *   server/                  — the stdio server + headless driver (verbatim)
 *   assets/                  — the 3 pipeline modules + verapdf/ (the driver
 *                              resolves these via ALLOFLOW_MCP_ASSETS_DIR)
 *   skills/                  - canonical remediation workflow for clients that support skill import
 *   node_modules/ + package.json — playwright, unless --lean
 *
 * Two host-machine requirements survive packaging (disclosed in the manifest
 * description and checked by remediation_capabilities at runtime):
 *   - Node.js 18+ on PATH (MCPB node servers use the host node)
 *   - Chromium via `npx playwright install chromium` (a browser download
 *     cannot ride a bundle)
 * --lean also omits node_modules (~50MB): then the host machine must be able
 * to `require('playwright')` (e.g. the AlloFlow repo checkout) — fine for
 * personal installs, wrong for distribution.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MCP_DIR = __dirname;
const REPO_ROOT = path.resolve(MCP_DIR, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'desktop', 'dist', 'mcpb');
const STAGING = path.join(OUT_DIR, 'staging');
const BUNDLE = path.join(OUT_DIR, 'alloflow-remediation.mcpb');
const LEAN = process.argv.includes('--lean');
const ALLOW_UNVALIDATED = process.argv.includes('--allow-unvalidated');
const MCPB_CLI_VERSION = '2.1.2';

// zip_writer.cjs is required by the driver at load time — omitting it makes the packaged server
// fail to start, not merely lose a feature.
const SERVER_FILES = ['alloflow-remediation-mcp-stdio.cjs', 'remediation_headless_driver.cjs', 'zip_writer.cjs', 'README_REMEDIATION.md'];
// The driver resolves this beside itself and verifies every byte against vendor/manifest.json.
// Omitting it produces a bundle that starts but fails as soon as a browser-backed tool runs.
const SERVER_DIRS = ['vendor'];
// view_pdf_audit_module.js carries the accessible Office (DOCX/ODT) export. It is a VIEW module
// that needs React at load time, so the driver loads it ON DEMAND with React from a CDN rather
// than at pipeline boot — but it has to be IN the bundle or export_accessible_office cannot work
// on a packaged install. Adding it was the 2026-07-28 capability-inventory finding: the connector
// reached 11% of the pipeline, partly because capabilities lived in modules it never shipped.
const ASSET_FILES = ['verification_policy_module.js', 'doc_builder_renderer_module.js', 'view_pdf_validator_module.js', 'doc_pipeline_module.js', 'view_pdf_audit_module.js'];
const ASSET_DIRS = ['verapdf'];
const SKILL_DIRS = ['alloflow-pdf-remediation'];

function log(m) { process.stderr.write('[build-mcpb] ' + m + '\n'); }

function copyRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function buildManifest() {
  // Tool metadata mirrors the server's registry (names + one-line summaries). Parity with the
  // real registry is PINNED by tests/mcp_remediation_stdio_smoke.test.js — this list silently
  // omitted remediation_setup until 2026-07-28, so the installed bundle advertised a tool set
  // the server did not have.
  const tools = [
    { name: 'remediation_capabilities', description: 'Report whether this machine can run PDF remediation (key, Chromium, assets). Read-only.' },
    { name: 'remediation_selftest', description: 'Prove the install can actually remediate: real pipeline, scripted local model, no API key or quota.' },
    { name: 'generate_resource_pack', description: "Generate the normal app's student/teacher resource-pack HTML from app-shaped JSON. No API key." },
    { name: 'remediation_setup', description: 'One-time Chromium download via Playwright. Idempotent; needs no API key.' },
    { name: 'pdf_audit', description: 'Accessibility audit of a local PDF/DOCX/PPTX: score, issues, scanned detection, language.' },
    { name: 'pdf_validate_ua', description: 'Independent PDF/UA-1 (ISO 14289-1) validation via veraPDF. Needs no API key.' },
    { name: 'pdf_remediate', description: 'Full remediation (synchronous): accessible HTML + tagged PDF + honesty-checked verdict.' },
    { name: 'pdf_remediate_start', description: 'Start a remediation as a background job; returns a job id immediately.' },
    { name: 'pdf_batch_audit_start', description: 'Background job auditing a whole folder into one triage scoreboard (JSON + CSV). The cheap pass before remediating.' },
    { name: 'pdf_batch_remediate_start', description: 'Background job remediating every PDF in a folder, continuing past per-file failures.' },
    { name: 'pdf_remediate_from_scoreboard_start', description: 'Remediate only the documents a triage scoreboard flagged (default: the needs-work band).' },
    { name: 'export_accessible_office', description: 'Convert accessible HTML into an accessible Word (.docx) or OpenDocument (.odt) file. No API key.' },
    { name: 'export_alt_format', description: 'Convert accessible HTML into an ePub 3 ebook, a DAISY 3 talking-book package, or an uncontracted Braille BRF file. No API key, packages offline.' },
    { name: 'fix_contrast', description: 'Deterministic WCAG colour-contrast repair on accessible HTML. No API key.' },
    { name: 'generate_conformance_report', description: "AlloFlow's own Accessibility Conformance Report as HTML, from an axe audit and an optional veraPDF verdict. No API key." },
    { name: 'transcribe_media', description: 'Transcribe local audio/video into an accessible transcript (speech, visual, dual or synthesis). Needs an API key.' },
    { name: 'translate_accessible_html', description: 'Translate accessible HTML into another language, preserving structure and protecting embedded images. Needs an API key.' },
    { name: 'describe_images', description: 'Vision pass that writes alt text for images in accessible HTML, classifying equations, charts and decorative chrome. Needs an API key.' },
    { name: 'audit_two_engines', description: 'Audit HTML with axe-core AND IBM Equal Access and report where they disagree. No API key.' },
    { name: 'check_document_structure', description: 'Heading-hierarchy check (skipped levels) plus plain-text extraction. No API key.' },
    { name: 'redact_document', description: 'Remove named PII strings from accessible HTML and verify nothing survived. No API key.' },
    { name: 'extract_document_text', description: 'Deterministic text extraction from DOCX, PPTX, XLSX or PDF. No API key.' },
    { name: 'detect_form_fields', description: 'Find fillable blanks in accessible HTML and flag unlabelled ones. No API key.' },
    { name: 'apply_form_fields', description: 'Convert accepted blanks into labelled form inputs. No API key.' },
    { name: 'simplify_accessible_html', description: 'Rewrite accessible HTML in plain language, preserving structure. Needs an API key.' },
    { name: 'remediation_job_status', description: 'Job state plus recent pipeline telemetry lines. Read-only.' },
    { name: 'remediation_job_result', description: 'The completed job\'s summary (per-file for batches). Read-only.' },
    { name: 'remediation_job_cancel', description: 'Cancel a queued job or kill the running one.' },
  ];
  return {
    $schema: 'https://raw.githubusercontent.com/modelcontextprotocol/mcpb/main/schemas/mcpb-manifest-v0.4.schema.json',
    manifest_version: '0.4',
    name: 'alloflow-remediation',
    display_name: 'AlloFlow PDF Remediation',
    version: '0.3.0',
    description: 'Remediate PDFs (and DOCX/PPTX) for accessibility with AlloFlow\'s honesty-gated pipeline: audit, accessible-HTML rebuild, AI fix passes, tagged-PDF export, and independent PDF/UA-1 validation.',
    long_description: 'Runs the real AlloFlow remediation pipeline headlessly on your machine. Requires Node.js 18+ and a one-time Chromium download. AI-dependent tools require a Google Gemini API key and send the selected document to Gemini under your key; deterministic tools remain available without a key. A bundled remediation skill teaches supporting clients the safe sequence, privacy tiers, and honesty-reporting rules. Long runs use durable local job records and progress polling. See PRIVACY.md before processing student records. Results preserve AlloFlow\'s honesty surfaces: distribution verdict, sourced scores, fidelity notes, and a tagged PDF that only claims PDF/UA when it earned it.',
    author: { name: 'Aaron Pomeranz', url: 'https://github.com/Apomera' },
    homepage: 'https://apomera.github.io/AlloFlow/',
    documentation: 'https://github.com/Apomera/AlloFlow/blob/main/desktop/mcp/README_REMEDIATION.md',
    support: 'https://github.com/Apomera/AlloFlow/issues',
    repository: { type: 'git', url: 'https://github.com/Apomera/AlloFlow.git' },
    privacy_policies: ['https://github.com/Apomera/AlloFlow/blob/main/desktop/mcp/PRIVACY.md'],
    server: {
      type: 'node',
      entry_point: 'server/alloflow-remediation-mcp-stdio.cjs',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/alloflow-remediation-mcp-stdio.cjs'],
        env: {
          GEMINI_API_KEY: '${user_config.gemini_api_key}',
          ALLOFLOW_MCP_ASSETS_DIR: '${__dirname}/assets',
          ALLOFLOW_MCP_SKILLS_DIR: '${__dirname}/skills',
          ALLOFLOW_MCP_NO_KEY_FILES: '1',
        },
      },
    },
    user_config: {
      gemini_api_key: {
        type: 'string',
        title: 'Gemini API key',
        description: 'From aistudio.google.com ("Get API key"; the free tier works). Documents you remediate are sent to the Gemini API under this key.',
        sensitive: true,
        required: false,
      },
    },
    compatibility: { claude_desktop: '>=1.0.0', platforms: ['win32', 'darwin', 'linux'], runtimes: { node: '>=18' } },
    tools,
    keywords: ['accessibility', 'pdf', 'remediation', 'wcag', 'pdf-ua', 'education'],
    license: 'AGPL-3.0-or-later',
  };
}

function stageBundle(stagingDir) {
  const dest = path.resolve(stagingDir || STAGING);
  // Preflight: every input must exist before we stage anything.
  const missing = []
    .concat(SERVER_FILES.filter((f) => !fs.existsSync(path.join(MCP_DIR, f))))
    .concat(SERVER_DIRS.filter((d) => !fs.existsSync(path.join(MCP_DIR, d))))
    .concat(ASSET_FILES.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f))))
    .concat(ASSET_DIRS.filter((d) => !fs.existsSync(path.join(REPO_ROOT, d))))
    .concat(SKILL_DIRS.filter((d) => !fs.existsSync(path.join(REPO_ROOT, 'agent_skills', d, 'SKILL.md'))).map((d) => 'agent_skills/' + d + '/SKILL.md'))
    .concat(!fs.existsSync(path.join(MCP_DIR, 'PRIVACY.md')) ? ['PRIVACY.md'] : [])
    .concat(!fs.existsSync(path.join(REPO_ROOT, 'LICENSE')) ? ['LICENSE'] : []);
  if (missing.length) throw new Error('MISSING bundle inputs: ' + missing.join(', '));

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.join(dest, 'server'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'skills'), { recursive: true });

  for (const f of SERVER_FILES) copyRecursive(path.join(MCP_DIR, f), path.join(dest, 'server', f));
  for (const d of SERVER_DIRS) copyRecursive(path.join(MCP_DIR, d), path.join(dest, 'server', d));
  for (const f of ASSET_FILES) copyRecursive(path.join(REPO_ROOT, f), path.join(dest, 'assets', f));
  for (const d of ASSET_DIRS) copyRecursive(path.join(REPO_ROOT, d), path.join(dest, 'assets', d));
  for (const d of SKILL_DIRS) copyRecursive(path.join(REPO_ROOT, 'agent_skills', d), path.join(dest, 'skills', d));
  copyRecursive(path.join(MCP_DIR, 'PRIVACY.md'), path.join(dest, 'PRIVACY.md'));
  copyRecursive(path.join(REPO_ROOT, 'LICENSE'), path.join(dest, 'LICENSE'));
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(buildManifest(), null, 2), 'utf8');
  return dest;
}

function main() {
  stageBundle(STAGING);

  if (!LEAN) {
    log('installing playwright into the bundle (use --lean to skip; ~50MB)…');
    fs.writeFileSync(path.join(STAGING, 'package.json'), JSON.stringify({
      name: 'alloflow-remediation-mcpb', private: true, version: '0.3.0',
      dependencies: { playwright: '1.60.0' },
    }, null, 2), 'utf8');
    execSync('npm install --omit=dev --no-audit --no-fund', { cwd: STAGING, stdio: ['ignore', 'inherit', 'inherit'] });
  } else {
    log('--lean: skipping node_modules; the host must be able to require(\'playwright\')');
  }

  // Pack. A .mcpb IS a zip with manifest.json at the root. Prefer the official
  // pinned CLI because it validates the manifest. Validation failures are release
  // failures, not evidence that the CLI is unavailable. A plain ZIP is available
  // only through an explicit development-only escape hatch.
  fs.rmSync(BUNDLE, { force: true });
  let packed = false;
  try {
    execSync('npx --yes @anthropic-ai/mcpb@' + MCPB_CLI_VERSION + ' pack "' + STAGING + '" "' + BUNDLE + '"', { stdio: ['ignore', 'inherit', 'inherit'] });
    packed = fs.existsSync(BUNDLE);
  } catch (error) {
    if (!ALLOW_UNVALIDATED) {
      log('ERROR: official MCPB validation/pack failed. No bundle was emitted.');
      log('Fix the manifest or toolchain failure; use --allow-unvalidated only for a local diagnostic ZIP that must not be distributed.');
      throw error;
    }
    log('--allow-unvalidated: official MCPB validation/pack failed; creating a diagnostic ZIP only');
  }
  if (!packed) {
    if (!ALLOW_UNVALIDATED) {
      throw new Error('Official MCPB CLI exited without producing the expected bundle.');
    }
    const zipTmp = BUNDLE + '.zip';
    fs.rmSync(zipTmp, { force: true });
    execSync('powershell -NoProfile -Command "Compress-Archive -Path \'' + STAGING + '\\*\' -DestinationPath \'' + zipTmp + '\' -Force"', { stdio: ['ignore', 'inherit', 'inherit'] });
    fs.renameSync(zipTmp, BUNDLE);
  }
  const mb = (fs.statSync(BUNDLE).size / 1024 / 1024).toFixed(1);
  log((packed ? 'VALIDATED' : 'UNVALIDATED DIAGNOSTIC') + ' → ' + BUNDLE + ' (' + mb + ' MB)');
  log('extracting and boot-checking the emitted artifact...');
  execSync('node "' + path.join(MCP_DIR, 'verify_mcpb_artifact.cjs') + '" "' + BUNDLE + '" --require-playwright', { stdio: ['ignore', 'inherit', 'inherit'] });
  log('Install: Claude Desktop → Settings → Extensions → drag the .mcpb in; the Gemini API key field is optional and can be left blank for no-account tools.');
  log('First run on a fresh machine: ask Claude to run `remediation_setup` (one-time ~200MB Chromium download).');
  log('Claude Desktop provides the Node runtime for type:node MCPB extensions; other hosts need Node 18+ on PATH.');
}

// Guarded so the manifest can be imported and checked against the live tool registry without
// building a bundle as a side effect (tests/mcp_remediation_stdio_smoke.test.js pins that parity).
// Same require.main pattern as remediation_headless_driver.cjs's direct CLI.
module.exports = { buildManifest, stageBundle };
if (require.main === module) main();
