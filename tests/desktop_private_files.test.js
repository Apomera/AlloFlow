import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// The desktop runtime's config.json (LAN live-session PIN, provider settings) and the School Box
// schoolbox.env were written with default permissions, so on a shared macOS/Linux machine any
// other account could read them. They are now written owner-only (0600). Node applies `mode` only
// when it CREATES a file, so an existing file is also chmod-ed. Left over from PR #4.
const RUNTIME = readFileSync(resolve(process.cwd(), process.env.PRIVATE_FILES_RUNTIME || 'desktop/runtime/alloflow-desktop-runtime.cjs'), 'utf8');
const HELPER = sliceBetween(RUNTIME, 'function writePrivateFile(filePath, text) {', '\n}\n', { file: 'alloflow-desktop-runtime.cjs', includeEnd: true });

function run(existingFile) {
  const calls = [];
  const fs = {
    writeFileSync: (file, text, options) => calls.push(['write', file, options]),
    chmodSync: (file, mode) => { calls.push(['chmod', file, mode]); if (existingFile === 'chmod-throws') throw new Error('EPERM'); },
  };
  // eslint-disable-next-line no-new-func
  new Function('fs', HELPER + '\nwritePrivateFile("/data/config.json", "{}");')(fs);
  return calls;
}

describe('owner-only secret files', () => {
  it('creates the file 0600 and re-applies 0600 to a file that already existed', () => {
    const calls = run();
    expect(calls[0]).toEqual(['write', '/data/config.json', { encoding: 'utf8', mode: 0o600 }]);
    expect(calls[1]).toEqual(['chmod', '/data/config.json', 0o600]);
  });

  it('a filesystem that refuses chmod (Windows, some mounts) does not break saving', () => {
    expect(() => run('chmod-throws')).not.toThrow();
  });

  it('every config and School Box env write goes through it', () => {
    expect(RUNTIME, 'a config/env write bypasses the owner-only helper').not.toMatch(/writeFileSync\((configPath|paths\.envFile)/);
    expect((RUNTIME.match(/writePrivateFile\(configPath,/g) || []).length, 'readConfig and writeConfig').toBe(2);
    expect((RUNTIME.match(/writePrivateFile\(paths\.envFile,/g) || []).length).toBe(2);
    const copy = sliceBetween(RUNTIME, 'fs.copyFileSync(paths.envExampleFile, paths.envFile);', '} else {', { file: 'alloflow-desktop-runtime.cjs' });
    expect(copy, 'a copied env file keeps the example file\'s permissions').toContain('fs.chmodSync(paths.envFile, 0o600)');
  });
});
