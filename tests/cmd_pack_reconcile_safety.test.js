import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
const english = { 'cmd.existing': 'Existing', 'cmd.new': 'New {name}' };
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'allo-cmd-reconcile-'));
  roots.push(root);
  const write = (file, value) => {
    const target = join(root, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  };
  write('allo_commands_source.jsx', "t('cmd.existing', 'Existing'); t('cmd.new', 'New {name}');");
  write('dev-tools/i18n/cmd_keys_en.json', english);
  for (const file of ['extract_cmd_keys.cjs', 'reconcile_cmd_pack_coverage.cjs']) {
    copyFileSync(resolve('dev-tools/i18n', file), join(root, 'dev-tools/i18n', file));
  }
  const pair = (slug, pack) => {
    for (const dir of ['lang', 'desktop/web-app/public/lang']) write(`${dir}/${slug}.js`, pack);
  };
  pair('a', { cmd: { existing: 'Reviewed A' } });
  pair('b', { cmd: { existing: 'Reviewed B' } });
  const read = file => readFileSync(join(root, file), 'utf8');
  const run = (...args) => spawnSync(process.execPath, [join(root, 'dev-tools/i18n/reconcile_cmd_pack_coverage.cjs'), ...args], { encoding: 'utf8', timeout: 30000, windowsHide: true });
  return { root, write, read, pair, run };
}

describe('command pack reconciliation preflight', () => {
  it('dry runs without mutation and preserves reviewed strings while adding catalog values or explicit English fallbacks', () => {
    const f = fixture(), before = f.read('lang/a.js');
    f.write('dev-tools/i18n/cmd_translations/a.json', { 'cmd.new': 'Nouveau {name}' });
    expect(f.run().status).toBe(0);
    expect(f.read('lang/a.js')).toBe(before);
    const result = f.run('--apply');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(f.read('lang/a.js')).cmd).toEqual({ existing: 'Reviewed A', new: 'Nouveau {name}' });
    expect(JSON.parse(f.read('lang/b.js')).cmd).toEqual({ existing: 'Reviewed B', new: 'New {name}' });
    for (const slug of ['a', 'b']) expect(f.read(`lang/${slug}.js`)).toBe(f.read(`desktop/web-app/public/lang/${slug}.js`));
    expect(result.stdout).toContain('English fallbacks used: 1');
    expect(f.run('--gate').status).toBe(0);
  }, 60000);

  it.each(['stale manifest', 'later mirror drift', 'later invalid value', 'later invalid namespace'])('rejects %s before changing either pack', problem => {
    const f = fixture();
    if (problem === 'stale manifest') f.write('dev-tools/i18n/cmd_keys_en.json', { 'cmd.existing': 'Existing' });
    if (problem === 'later mirror drift') f.write('desktop/web-app/public/lang/b.js', { cmd: { existing: 'Separate edit' } });
    if (problem === 'later invalid value') f.pair('b', { cmd: { existing: 42 } });
    if (problem === 'later invalid namespace') f.pair('b', { cmd: 'invalid' });
    const files = ['lang/a.js', 'lang/b.js', 'desktop/web-app/public/lang/a.js', 'desktop/web-app/public/lang/b.js'];
    const before = files.map(f.read);
    const result = f.run('--apply');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('nothing written');
    expect(files.map(f.read)).toEqual(before);
  }, 60000);
});
