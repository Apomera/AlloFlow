#!/usr/bin/env node
/**
 * Build the AlloFlow PDF Remediation connector as an MCPB bundle
 * (the one-click installable format for Claude Desktop; a .mcpb is a zip
 * with a manifest.json at its root).
 *
 *   node desktop/mcp/build_mcpb.cjs [--lean]
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

const SERVER_FILES = ['alloflow-remediation-mcp-stdio.cjs', 'remediation_headless_driver.cjs', 'README_REMEDIATION.md'];
const ASSET_FILES = ['verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js'];
const ASSET_DIRS = ['verapdf'];

function log(m) { process.stderr.write('[build-mcpb] ' + m + '\n'); }

function copyRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function buildManifest() {
  // Tool metadata mirrors the server's registry (names + one-line summaries).
  const tools = [
    { name: 'remediation_capabilities', description: 'Report whether this machine can run PDF remediation (key, Chromium, assets). Read-only.' },
    { name: 'pdf_audit', description: 'Accessibility audit of a local PDF/DOCX/PPTX: score, issues, scanned detection, language.' },
    { name: 'pdf_validate_ua', description: 'Independent PDF/UA-1 (ISO 14289-1) validation via veraPDF. Needs no API key.' },
    { name: 'pdf_remediate', description: 'Full remediation (synchronous): accessible HTML + tagged PDF + honesty-checked verdict.' },
    { name: 'pdf_remediate_start', description: 'Start a remediation as a background job; returns a job id immediately.' },
    { name: 'pdf_batch_remediate_start', description: 'Background job remediating every PDF in a folder, continuing past per-file failures.' },
    { name: 'remediation_job_status', description: 'Job state plus recent pipeline telemetry lines. Read-only.' },
    { name: 'remediation_job_result', description: 'The completed job\'s summary (per-file for batches). Read-only.' },
    { name: 'remediation_job_cancel', description: 'Cancel a queued job or kill the running one.' },
  ];
  return {
    manifest_version: '0.2',
    name: 'alloflow-remediation',
    display_name: 'AlloFlow PDF Remediation',
    version: '0.3.0',
    description: 'Remediate PDFs (and DOCX/PPTX) for accessibility with AlloFlow\'s honesty-gated pipeline: audit, accessible-HTML rebuild, AI fix passes, tagged-PDF export, and independent PDF/UA-1 validation.',
    long_description: 'Runs the real AlloFlow remediation pipeline headlessly on your machine. Requires Node.js 18+, a one-time `npx playwright install chromium`, network access, and a Google Gemini API key (documents are sent to the Gemini API under YOUR key - see PRIVACY.md). Long runs are exposed as background jobs with progress polling. Results carry AlloFlow\'s honesty surfaces verbatim: distribution verdict, before/after scores with source, fidelity notes, and a tagged PDF that only claims PDF/UA when it earned it.',
    author: { name: 'Aaron Pomeranz' },
    server: {
      type: 'node',
      entry_point: 'server/alloflow-remediation-mcp-stdio.cjs',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/alloflow-remediation-mcp-stdio.cjs'],
        env: {
          GEMINI_API_KEY: '${user_config.gemini_api_key}',
          ALLOFLOW_MCP_ASSETS_DIR: '${__dirname}/assets',
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
        required: true,
      },
    },
    compatibility: { platforms: ['win32', 'darwin', 'linux'], runtimes: { node: '>=18' } },
    tools,
    keywords: ['accessibility', 'pdf', 'remediation', 'wcag', 'pdf-ua', 'education'],
    license: 'UNLICENSED',
  };
}

function main() {
  // Preflight: every input must exist before we stage anything.
  const missing = []
    .concat(SERVER_FILES.filter((f) => !fs.existsSync(path.join(MCP_DIR, f))))
    .concat(ASSET_FILES.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f))))
    .concat(ASSET_DIRS.filter((d) => !fs.existsSync(path.join(REPO_ROOT, d))));
  if (missing.length) { log('MISSING inputs: ' + missing.join(', ')); process.exit(1); }

  fs.rmSync(STAGING, { recursive: true, force: true });
  fs.mkdirSync(path.join(STAGING, 'server'), { recursive: true });
  fs.mkdirSync(path.join(STAGING, 'assets'), { recursive: true });

  for (const f of SERVER_FILES) copyRecursive(path.join(MCP_DIR, f), path.join(STAGING, 'server', f));
  for (const f of ASSET_FILES) copyRecursive(path.join(REPO_ROOT, f), path.join(STAGING, 'assets', f));
  for (const d of ASSET_DIRS) copyRecursive(path.join(REPO_ROOT, d), path.join(STAGING, 'assets', d));
  copyRecursive(path.join(MCP_DIR, 'PRIVACY.md'), path.join(STAGING, 'PRIVACY.md'));
  fs.writeFileSync(path.join(STAGING, 'manifest.json'), JSON.stringify(buildManifest(), null, 2), 'utf8');

  if (!LEAN) {
    log('installing playwright into the bundle (use --lean to skip; ~50MB)…');
    fs.writeFileSync(path.join(STAGING, 'package.json'), JSON.stringify({
      name: 'alloflow-remediation-mcpb', private: true, version: '0.3.0',
      dependencies: { playwright: '^1.60.0' },
    }, null, 2), 'utf8');
    execSync('npm install --omit=dev --no-audit --no-fund', { cwd: STAGING, stdio: ['ignore', 'inherit', 'inherit'] });
  } else {
    log('--lean: skipping node_modules; the host must be able to require(\'playwright\')');
  }

  // Pack. A .mcpb IS a zip with manifest.json at the root. Prefer the official
  // CLI (validates the manifest); fall back to PowerShell's Compress-Archive.
  fs.rmSync(BUNDLE, { force: true });
  let packed = false;
  try {
    execSync('npx --yes @anthropic-ai/mcpb pack "' + STAGING + '" "' + BUNDLE + '"', { stdio: ['ignore', 'inherit', 'inherit'] });
    packed = fs.existsSync(BUNDLE);
  } catch (_) { log('official mcpb CLI unavailable — falling back to zip'); }
  if (!packed) {
    const zipTmp = BUNDLE + '.zip';
    fs.rmSync(zipTmp, { force: true });
    execSync('powershell -NoProfile -Command "Compress-Archive -Path \'' + STAGING + '\\*\' -DestinationPath \'' + zipTmp + '\' -Force"', { stdio: ['ignore', 'inherit', 'inherit'] });
    fs.renameSync(zipTmp, BUNDLE);
  }
  const mb = (fs.statSync(BUNDLE).size / 1024 / 1024).toFixed(1);
  log('OK → ' + BUNDLE + ' (' + mb + ' MB)');
  log('Install: Claude Desktop → Settings → Extensions → drag the .mcpb in; it will prompt for the Gemini API key.');
  log('Host still needs: Node 18+ on PATH, and `npx playwright install chromium` once.');
}

main();
