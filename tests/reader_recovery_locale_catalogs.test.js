import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { validatePayload, placeholders, lookup, parseArgs, run } = require('../dev-tools/i18n/apply_reader_contract_locales.cjs');
const payload = JSON.parse(readFileSync('translations/reader-recovery-locales.json', 'utf8'));
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const temps = [];
afterEach(() => { for (const dir of temps.splice(0)) { if (!dir.startsWith(resolve(tmpdir()) + sep + 'reader-recovery-locales-')) throw Error('Unexpected temporary path'); rmSync(dir, { recursive: true, force: true }); } });
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'reader-recovery-locales-')); temps.push(root);
  function write(file, data) { const target = join(root, file); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, JSON.stringify(data, null, 2) + '\n'); }
  mkdirSync(join(root, 'dev-tools/i18n'), { recursive: true });
  copyFileSync('dev-tools/i18n/apply_reader_contract_locales.cjs', join(root, 'dev-tools/i18n/apply_reader_contract_locales.cjs'));
  write('translations/reader-recovery-locales.json', payload);
  const copy = { simplified: Object.fromEntries(Object.entries(payload.english).map(([key, value]) => [key.slice(11), value])) };
  write('ui_strings.js', copy); write('desktop/web-app/public/ui_strings.js', copy);
  const files = Object.keys(payload.locales).flatMap(locale => ['lang', 'desktop/web-app/public/lang'].map(prefix => prefix + '/' + locale + '.js'));
  for (const file of files) write(file, { common: { unrelated: 'Keep ' + file }, simplified: { future_key: 'Another owner' } });
  return { root, files, write, copy, read: file => readFileSync(join(root, file), 'utf8'), exec: (...args) => spawnSync(process.execPath, ['dev-tools/i18n/apply_reader_contract_locales.cjs', ...args], { cwd: root, encoding: 'utf8' }) };
}
describe('scoped recovery catalog gate', () => {
  it('freezes 34 current messages across five locales independently of the first batch', () => { expect(validatePayload(payload, english, 34)).toHaveLength(34); expect(run(false, 'recovery')).toMatchObject({ keys: 34, changedFiles: 0 }); });
  it('refuses changed English, missing placeholders, raw keys and incomplete locale coverage', () => {
    const copy = structuredClone(english); copy.simplified.place_save_failed = 'Different wording';
    expect(() => validatePayload(payload, copy, 34)).toThrow(/English copy changed/);
    const broken = structuredClone(payload); broken.locales.arabic['simplified.place_bookmark_temporary'] = 'موضع مؤقت';
    expect(() => validatePayload(broken, english, 34)).toThrow(/Placeholder mismatch/);
    broken.locales.arabic['simplified.place_bookmark_temporary'] = 'simplified.place_bookmark_temporary';
    expect(() => validatePayload(broken, english, 34)).toThrow(/Missing translation/);
    delete broken.locales.arabic['simplified.place_bookmark_temporary'];
    expect(() => validatePayload(broken, english, 34)).toThrow(/Key coverage differs/);
  });
  it('keeps the original check default and rejects ambiguous CLI modes', () => {
    expect(parseArgs([])).toEqual({ apply: false, batch: 'contract' });
    expect(parseArgs(['--check', '--batch=recovery'])).toEqual({ apply: false, batch: 'recovery' });
    expect(() => parseArgs(['--check', '--apply'])).toThrow();
    expect(() => parseArgs(['--batch=all', '--batch=recovery'])).toThrow();
    expect(() => parseArgs(['--batch=unknown'])).toThrow();
  });
  for (const [locale, values] of Object.entries(payload.locales)) it(locale + ': meaningful mirrored recovery messages and exact placeholder sets', () => {
    for (const prefix of ['lang', 'desktop/web-app/public/lang']) {
      const pack = JSON.parse(readFileSync(prefix + '/' + locale + '.js', 'utf8'));
      for (const [key, value] of Object.entries(values)) { expect(lookup(pack, key)).toBe(value); expect(value).not.toBe(payload.english[key]); expect(placeholders(value)).toEqual(placeholders(payload.english[key])); }
    }
  });
  it('check is read-only; apply preserves unrelated values and is idempotent', () => {
    const f = sandbox(), before = f.files.map(f.read);
    expect(f.exec('--check', '--batch=recovery').status).not.toBe(0);
    expect(f.files.map(f.read)).toEqual(before);
    expect(f.exec('--apply', '--batch=recovery').status).toBe(0);
    const applied = f.files.map(f.read);
    for (const [i, file] of f.files.entries()) { const pack = JSON.parse(applied[i]); expect(pack.common.unrelated).toBe('Keep ' + file); expect(pack.simplified.future_key).toBe('Another owner'); expect(Object.keys(pack.simplified)).toHaveLength(35); }
    expect(f.exec('--apply', '--batch=recovery').status).toBe(0);
    expect(f.exec('--check', '--batch=recovery').status).toBe(0);
    expect(f.files.map(f.read)).toEqual(applied);
  });
  it.each(['copy', 'mirror', 'ownership'])('rejects %s conflicts before changing any locale', kind => {
    const f = sandbox();
    if (kind === 'ownership') f.write(f.files.at(-1), { simplified: { place_retry: 'Competing translation' } });
    else { f.copy.simplified.place_retry = 'New English copy'; f.write(kind === 'copy' ? 'ui_strings.js' : 'desktop/web-app/public/ui_strings.js', f.copy); }
    const before = f.files.map(f.read), result = f.exec('--apply', '--batch=recovery');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/English copy changed|English mirror copy changed|Existing translation differs/);
    expect(f.files.map(f.read)).toEqual(before);
  });
});
