// The privacy-logging gate reads every shipped module that has no scanned source of its own.
//
// WHY (2026-11-16): dev-tools/check_pii_logging.cjs skipped every *_module.js in
// a folder and every root module named by a build script, on the idea that
// their sources were scanned instead. For modules built from other inputs, or
// kept by hand, nothing was scanned: the SEL hub, Word Sounds, Escape Room,
// Reading Library. The gate passed because it did not look. Six sites in Word
// Sounds logged the word being spoken; they now log its length.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const gate = (...args) => execFileSync(process.execPath, ['dev-tools/check_pii_logging.cjs', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

describe('privacy-logging gate coverage', () => {
  const files = new Set(JSON.parse(gate('--list-files')));

  it('reads the modules it used to skip', () => {
    for (const f of ['sel_hub/sel_hub_module.js', 'word_sounds_module.js', 'escape_room_module.js', 'reading_library_module.js']) {
      if (existsSync(resolve(ROOT, f))) expect([...files], f).toContain(f);
    }
  });

  it('still skips a built module whose own source it reads', () => {
    expect(files.has('view_confirm_dialog_source.jsx')).toBe(true);
    expect(files.has('view_confirm_dialog_module.js')).toBe(false);
  });

  it('passes, and its own self-test passes', () => {
    expect(gate('--selftest')).toMatch(/bad shapes caught/);
    expect(gate('--quiet')).toBe('');
  });

  it('Word Sounds logs the length of a word that failed to speak, not the word', () => {
    const src = readFileSync(resolve(ROOT, 'word_sounds_module.js'), 'utf8');
    expect(src).not.toMatch(/warnLog\("TTS attempt 1 failed for word:", text/);
    expect(src).toContain('warnLog("TTS attempt 1 failed for a word", "(" + String(text || "").length + " characters)"');
  });
});
