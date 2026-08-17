// cmd value-staleness checker — negative controls (X4, wave 3, 2026-08-17).
//
// The repo's convention (dark_mode_contrast_gate pattern): a gate's green is
// believed only after a planted defect is shown to turn it red. Both checks
// here run the REAL tool against a synthetic lang dir via its --lang-dir seam.
//
// Also pins the staleness namespace gate's guarded list: 'guided' and 'hints'
// joined 2026-08-17 (verified stale-free at addition). Delisting a namespace
// is the failure mode this pin exists for.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const TOOL = resolve(root, 'dev-tools/i18n/check_cmd_value_staleness.cjs');

function runTool(args) {
  try {
    const stdout = execFileSync('node', [TOOL, ...args], { encoding: 'utf8' });
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status, stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
  }
}

function makeLangDir(extraIdentical) {
  const dir = mkdtempSync(join(tmpdir(), 'cmdstale-'));
  const en = JSON.parse(readFileSync(resolve(root, 'dev-tools/i18n/cmd_keys_en.json'), 'utf8'));
  // A translated pack: every cmd value differs from English...
  const pack = {};
  for (const [key, value] of Object.entries(en)) {
    const parts = key.split('.');
    let node = pack;
    for (const p of parts.slice(0, -1)) node = (node[p] = node[p] || {});
    node[parts[parts.length - 1]] = extraIdentical && key === extraIdentical ? value : 'xx-' + value;
  }
  writeFileSync(join(dir, 'spanish.js'), JSON.stringify(pack, null, 2));
  return dir;
}

describe('planted-defect negative controls', () => {
  it('a fully-translated pack reports zero and passes the gate', () => {
    const dir = makeLangDir(null);
    const base = join(dir, '_baseline.json');
    let r = runTool(['--lang-dir', dir, '--baseline', base, '--out-dir', join(dir, '_out'), '--write-baseline']);
    expect(r.status).toBe(0);
    r = runTool(['--lang-dir', dir, '--baseline', base, '--out-dir', join(dir, '_out'), '--gate', '--quiet']);
    expect(r.status, r.stdout + (r.stderr || '')).toBe(0);
    expect(r.stdout).toContain('0 cmd/palette value(s) identical');
  });

  it('ONE planted English-identical value beyond the baseline turns the gate red', () => {
    const clean = makeLangDir(null);
    const base = join(clean, '_baseline.json');
    let r = runTool(['--lang-dir', clean, '--baseline', base, '--out-dir', join(clean, '_out'), '--write-baseline']);
    expect(r.status).toBe(0);
    const planted = makeLangDir('cmd.open_history');
    r = runTool(['--lang-dir', planted, '--baseline', base, '--out-dir', join(planted, '_out'), '--gate', '--quiet']);
    expect(r.status, 'gate must exit 1 on growth').toBe(1);
    expect(r.stderr || r.stdout).toContain('GREW');
  });

  it('the palette.ctx.* passthrough convention is allowed without listing', () => {
    const src = readFileSync(TOOL, 'utf8');
    expect(src).toContain("key.startsWith('palette.ctx.')");
  });
});

describe('the guarded staleness namespaces hold', () => {
  it('guided and hints are in GUARDED and the contract comment travels with the list', () => {
    const checker = readFileSync(resolve(root, 'dev-tools/i18n/check_lang_staleness.cjs'), 'utf8');
    const m = checker.match(/const GUARDED = \[([^\]]+)\]/);
    expect(m).toBeTruthy();
    for (const ns of ['sidebar', 'tools', 'glossary', 'visuals', 'universal', 'launch_pad', 'storage', 'alignment_graph', 'guided', 'hints']) {
      expect(m[1], ns + ' must stay guarded').toContain(`'${ns}'`);
    }
  });
  it('verify:gate actually runs the guarded staleness gate', () => {
    const pkg = readFileSync(resolve(root, 'package.json'), 'utf8');
    expect(pkg).toContain('check_lang_staleness.cjs --quiet --gate-guarded --ratchet');
  });
});
