import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const MIRRORS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];
const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const PHASE31_FILES = [
  'adaptive_controller_module.js',
  'story_stage_module.js',
  'symbol_studio_module.js',
  'allohaven_module.js',
  'word_sounds_module.js',
];

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

describe('Phase 31: 4-way mirror parity & 3-host SRI / releaseId sync', () => {
  it('keeps all 5 Phase 31 deliverables syntax-valid, 4-way byte-identical, and synced in all 3 hosts', () => {
    const hashes = {};
    for (const file of PHASE31_FILES) {
      const buf = fs.readFileSync(path.join(ROOT, file));
      expect(() => new Function(buf.toString('utf8'))).not.toThrow();
      for (const mirror of MIRRORS.slice(1)) {
        const mBuf = fs.readFileSync(path.join(ROOT, mirror, file));
        expect(mBuf.equals(buf), `${file} mirror mismatch in ${mirror}`).toBe(true);
      }
      hashes[file] = {
        bytes: buf.length,
        integrity: 'sha384-' + createHash('sha384').update(buf).digest('base64'),
      };
    }

    const releaseIds = new Set();
    for (const host of HOST_FILES) {
      const src = fs.readFileSync(path.join(ROOT, host), 'utf8');
      const m = src.match(/const manifest = (\{[\s\S]*?\});\r?\n\s*Object\.keys\(manifest\.assets\)\.forEach/);
      expect(m, `manifest block in ${host}`).toBeTruthy();
      const manifest = JSON.parse(m[1]);
      for (const file of PHASE31_FILES) {
        expect(manifest.assets[file], `${file} in ${host}`).toEqual(hashes[file]);
      }
      const { releaseId, ...body } = manifest;
      const expectedReleaseId = createHash('sha256').update(canonical(body)).digest('hex');
      expect(releaseId).toBe(expectedReleaseId);
      releaseIds.add(releaseId);
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 31: Adaptive Controller hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'adaptive_controller_module.js'), 'utf8');
  const builderSrc = fs.readFileSync(path.join(ROOT, '_build_adaptive_controller_module.js'), 'utf8');

  it('uses execFileSync instead of shell execSync in builder', () => {
    expect(builderSrc).toContain('execFileSync');
    expect(builderSrc).not.toMatch(/\bexecSync\s*\(/);
  });

  it('handles textarea dictation without Illegal invocation, maps keys properly, suppresses QR bot, honors global mute, and cleans up RAF', () => {
    expect(src).toContain('HTMLTextAreaElement.prototype');
    expect(src).toContain('_gpadCodeToKey');
    expect(src).toContain('_gpadTapKey');
    expect(src).toContain('_gpadReleaseAllKeys');
    expect(src).toContain('window.__alloQrStudentMode');
    expect(src).toContain('__alloIsGlobalMuted');
    expect(src).toContain('cancelAnimationFrame');
  });
});

describe('Phase 31: Story Stage hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'story_stage_module.js'), 'utf8');

  it('fails closed on AI gates, blocks SVG data URIs, fences prompts, adds CSP to exports, and bounds narration fetch', () => {
    expect(src).toContain('__alloAiSecretsLocked');
    expect(src).toContain('__alloStudentAiDisabled');
    expect(src).toContain('__alloQrStudentMode');
    expect(src).toContain('safeStoryImgUrl');
    expect(src).toContain('_llFence');
    expect(src).toMatch(/script-src \\?'none\\?'/);
    expect(src).toContain('referrerpolicy="no-referrer"');
    expect(src).toContain('safeJsonParse');
    expect(src).toContain('recordingTimerRef');
  });
});

describe('Phase 31: Symbol Studio hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'symbol_studio_module.js'), 'utf8');

  it('enforces fail-closed AI gates, prototype-safe JSON parsing, prompt fencing, FERPA codename, SVG blocking, CSP exports, and speech cleanup', () => {
    expect(src).toContain('_ssUnsafeKey');
    expect(src).toContain('_ssSafeJsonParse');
    expect(src).toContain('_ssAiUsable');
    expect(src).toContain('_ssFence');
    expect(src).toContain('_ssSafeFileName');
    expect(src).toContain('gardenSpeechRef');
    expect(src).toContain('stopGardenSpeech');
    expect(src).toContain("referrerPolicy: 'no-referrer'");
    expect(src).toMatch(/script-src \\?'none\\?'/);
    expect(src).toContain('activeProfile.codename');
  });
});

describe('Phase 31: AlloHaven hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'allohaven_module.js'), 'utf8');

  it('enforces fail-closed AI gates, prototype-safe JSON, media URI sanitization, prompt fencing, functional saveCompanion, and mic cleanup', () => {
    expect(src).toContain('_havenUnsafeKey');
    expect(src).toContain('_havenSafeJsonParse');
    expect(src).toContain('_havenNormalizeRasterDataUrl');
    expect(src).toContain('_havenSanitizeMediaUri');
    expect(src).toContain('_havenFenceUntrusted');
    expect(src).toMatch(/default-src \\?'none\\?'/);
    expect(src).toContain('voiceMountedRef');
    expect(src).not.toContain('new RegExp(`\\\\[${key}\\\\]`');
  });
});

describe('Phase 31: Word Sounds hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'word_sounds_module.js'), 'utf8');

  it('fails closed on wsAiUsable & wsStudentDeviceVoiceOnly when AI is locked or QR student mode is off', () => {
    const start = src.indexOf('  function wsAiUsable(kind, fn) {');
    const end = src.indexOf('  function wsSpeakDeviceVoice(');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const slice = src.slice(start, end);
    const make = (win) => new Function('window', slice + '\nreturn { wsAiUsable, wsStudentDeviceVoiceOnly };')(win);

    const fn = () => {};
    const blockedFn = Object.assign(() => {}, { _alloQrBlocked: true });

    expect(make({}).wsAiUsable('text', fn)).toBe(true);
    expect(make({}).wsAiUsable('text', blockedFn)).toBe(false);
    expect(make({ __alloStudentAiDisabled: true }).wsAiUsable('text', fn)).toBe(false);
    expect(make({ __alloAiSecretsLocked: true }).wsAiUsable('text', fn)).toBe(false);
    expect(make({ __alloQrStudentMode: true }).wsAiUsable('text', fn)).toBe(false);
    expect(make({ __alloQrStudentMode: { aiPolicy: 'off' } }).wsAiUsable('text', fn)).toBe(false);
    expect(make({ __alloQrStudentMode: { aiDisabled: true } }).wsAiUsable('text', fn)).toBe(false);
    expect(make({ __alloQrStudentMode: { aiPolicy: 'on' } }).wsAiUsable('text', fn)).toBe(true);

    expect(make({ __alloAiSecretsLocked: true }).wsStudentDeviceVoiceOnly()).toBe(true);
    expect(make({ __alloQrStudentMode: true }).wsStudentDeviceVoiceOnly()).toBe(true);
    expect(make({ __alloQrStudentMode: { aiPolicy: 'off' } }).wsStudentDeviceVoiceOnly()).toBe(true);
    expect(make({}).wsStudentDeviceVoiceOnly()).toBe(false);
  });

  it('sanitizes print head <link> tags and blocks SVG data URIs in wsPrintImage', () => {
    const safeLinkIdx = src.indexOf('    const wsPrintSafeHeadLink = (head) => {');
    const docIdx = src.indexOf('    const wsPrintDocument = ');
    expect(safeLinkIdx).toBeGreaterThan(-1);
    const wsPrintSafeHeadLink = new Function(src.slice(safeLinkIdx, docIdx) + '\nreturn wsPrintSafeHeadLink;')();

    expect(wsPrintSafeHeadLink('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend">')).toContain('https://fonts.googleapis.com');
    expect(wsPrintSafeHeadLink('<link rel="stylesheet" href="https://example.com/a.css" onload="alert(1)">')).toBe('');
    expect(wsPrintSafeHeadLink('<link rel="preload" href="javascript:alert(1)">')).toBe('');
    expect(wsPrintSafeHeadLink('<link rel="stylesheet" href="http://insecure.example/a.css">')).toBe('');

    const imgIdx = src.indexOf('    const wsPrintImage = (entry, library, key) => {');
    const entriesIdx = src.indexOf('    const wsPrintEntries = ');
    const wsPrintImage = new Function(src.slice(imgIdx, entriesIdx) + '\nreturn wsPrintImage;')();

    expect(wsPrintImage({ image: 'data:image/svg+xml;base64,PHN2Zz4=' }, null, 'cat')).toBeNull();
    expect(wsPrintImage({ image: 'javascript:alert(1)' }, null, 'cat')).toBeNull();
    expect(wsPrintImage({ image: 'data:image/png;base64,iVBORw0KGgo=' }, null, 'cat')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(wsPrintImage({}, Object.prototype, 'toString')).toBeNull();
  });

  it('gates debug logs, enforces font host allowlist, caps audio blobs, fences prompts, and guards prototype pollution & div-by-zero', () => {
    expect(src).toContain('wsDebugEnabled');
    expect(src).not.toContain('console.log(\n          `[WS-DBG]');
    expect(src).toContain('https:\\/\\/fonts\\.gstatic\\.com\\/');
    expect(src).toContain('WS_MAX_AUDIO_BLOB_BYTES');
    expect(src).toContain('wsFencePromptText');
    expect(src).toContain('<UNTRUSTED_WORD>');
    expect(src).toContain('wsIsUnsafeKey');
    expect(src).toContain('wordSoundsSessionGoal > 0');
  });
});
