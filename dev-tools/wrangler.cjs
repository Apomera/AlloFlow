#!/usr/bin/env node
/*
 * wrangler.cjs — run the real wrangler CLI on this Windows-ARM64 machine.
 *
 * Native Node here is win32-arm64, and wrangler imports `workerd` at load time,
 * which publishes no arm64 build — so `npx wrangler` dies with
 * `Unsupported platform: win32 arm64 LE` before it does anything.
 *
 * The workaround (found 2026-07-26, documented in
 * docs/CLAUDE_HANDOFF_CLOUDFLARE_WRANGLER_2026-07-26.md) is to run the official
 * Windows **x64** Node build under Windows' x64 emulation and install wrangler
 * with that runtime. It works for Pages, Workers, KV, and secrets alike.
 *
 * This wrapper finds that toolchain, verifies it, and forwards every argument
 * to wrangler unchanged, so anything in Cloudflare's docs works verbatim:
 *
 *   node dev-tools/wrangler.cjs whoami
 *   node dev-tools/wrangler.cjs kv namespace create SEARCH_RATE
 *   node dev-tools/wrangler.cjs secret put SERPER_API_KEY --name alloflow-catalog-submit
 *   node dev-tools/wrangler.cjs deploy --cwd catalog/cloudflare-worker
 *
 * `--cwd <dir>` (consumed here, not passed on) runs wrangler from that
 * directory so it picks up the right wrangler.toml.
 *
 * If the C:\tmp toolchain has been cleaned away, this prints the exact
 * recreation commands rather than guessing or silently falling back.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const NODE_CANDIDATES = [
  'C:\\tmp\\alloflow-node22-x64\\node-v22.16.0-win-x64\\node.exe',
  'C:\\tmp\\node-v24.11.1-win-x64\\node.exe',
];

const WRANGLER_CANDIDATES = [
  'C:\\tmp\\alloflow-wrangler-x64\\node_modules\\wrangler\\bin\\wrangler.js',
  'C:\\tmp\\wrangler-cli-x64\\node_modules\\wrangler\\bin\\wrangler.js',
];

const SETUP_HELP = `
The x64 Node + wrangler toolchain is missing from C:\\tmp (temporary storage).
Recreate it in PowerShell — this is the documented procedure from
docs/CLAUDE_HANDOFF_CLOUDFLARE_WRANGLER_2026-07-26.md:

  $NodeZip  = 'C:\\tmp\\node-v22.16.0-win-x64.zip'
  $NodeRoot = 'C:\\tmp\\alloflow-node22-x64'
  Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.16.0/node-v22.16.0-win-x64.zip' -OutFile $NodeZip
  (Get-FileHash -LiteralPath $NodeZip -Algorithm SHA256).Hash
  # must equal 21C2D9735C80B8F86DAB19305AA6A9F6F59BBC808F68DE3EEF09D5832E3BFBBD
  Expand-Archive -LiteralPath $NodeZip -DestinationPath $NodeRoot -Force

  $Node = Join-Path $NodeRoot 'node-v22.16.0-win-x64\\node.exe'
  $Npm  = Join-Path $NodeRoot 'node-v22.16.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js'
  New-Item -ItemType Directory -Path 'C:\\tmp\\alloflow-wrangler-x64' -Force | Out-Null
  & $Node $Npm install --prefix 'C:\\tmp\\alloflow-wrangler-x64' wrangler@4.114.0
`;

function findFirst(candidates, label) {
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    process.stderr.write(`ERROR: no x64 ${label} found. Looked in:\n`);
    candidates.forEach((c) => process.stderr.write(`  ${c}\n`));
    process.stderr.write(SETUP_HELP);
    process.exit(1);
  }
  return hit;
}

function main() {
  const nodeExe = findFirst(NODE_CANDIDATES, 'Node');
  const wranglerJs = findFirst(WRANGLER_CANDIDATES, 'wrangler');

  const args = process.argv.slice(2);

  // Consume our own --cwd so wrangler never sees it.
  let cwd = process.cwd();
  const cwdIndex = args.indexOf('--cwd');
  if (cwdIndex >= 0) {
    const dir = args[cwdIndex + 1];
    if (!dir) { process.stderr.write('ERROR: --cwd needs a directory\n'); process.exit(2); }
    cwd = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(cwd)) { process.stderr.write(`ERROR: --cwd not found: ${cwd}\n`); process.exit(2); }
    args.splice(cwdIndex, 2);
  }

  if (!args.length) {
    process.stdout.write('Usage: node dev-tools/wrangler.cjs [--cwd <dir>] <wrangler args...>\n\n');
    process.stdout.write(`  x64 node : ${nodeExe}\n  wrangler : ${wranglerJs}\n`);
    process.exit(0);
  }

  // Confirm the emulated runtime really is x64 before doing anything real —
  // an arm64 node here would fail deep inside wrangler with a confusing error.
  const probe = spawnSync(nodeExe, ['-p', 'process.arch'], { encoding: 'utf8' });
  const arch = String(probe.stdout || '').trim();
  if (arch !== 'x64') {
    process.stderr.write(`ERROR: ${nodeExe} reports arch "${arch}", expected x64.\n`);
    process.stderr.write(SETUP_HELP);
    process.exit(1);
  }

  const result = spawnSync(nodeExe, [wranglerJs, ...args], { cwd, stdio: 'inherit' });
  process.exit(result.status === null ? 1 : result.status);
}

main();
