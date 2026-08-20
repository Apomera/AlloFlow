import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('desktop LAN live-session identity', () => {
  it('provides a backend-free teacher or student identity before Firebase auth', () => {
    const source = read('AlloFlowANTI.txt');
    expect(source).toContain('function _alloLanBridgeUser()');
    expect(source).toContain("isStudent ? 'student-' : 'teacher-'");

    const authStart = source.indexOf('async function _alloEnsureAuthenticatedUser()');
    const authEnd = source.indexOf('\n}\n\nlet appCheck', authStart);
    const auth = source.slice(authStart, authEnd);
    expect(auth.indexOf('const lanUser = _alloLanBridgeUser();')).toBeGreaterThan(-1);
    expect(auth.indexOf('const lanUser = _alloLanBridgeUser();')).toBeLessThan(auth.indexOf('signInAnonymously(auth)'));
    expect(auth).toContain('if (lanUser) return lanUser;');
  });

  it('keeps the canonical LAN adapter snippet in sync', () => {
    expect(read('desktop/app-adapter/lan_session_adapter.snippet.js')).toContain('function _alloLanBridgeUser()');
  });

  it('packages every lazy AlloHaven arcade mode into desktop builds', () => {
    const build = read('build.js');
    for (const file of [
      'arcade_mode_sage_launcher.js',
      'arcade_mode_boss_encounter.js',
      'arcade_mode_realm_builder.js',
      'arcade_mode_concept_atlas.js',
      'arcade_mode_modelun.js',
      'arcade_mode_concept_pictionary.js',
    ]) expect(build).toContain(`'${file}'`);
  });
});
