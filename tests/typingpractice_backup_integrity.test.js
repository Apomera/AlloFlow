import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

const validate = Function(
  'KEYBOARD_LAYOUTS',
  'MAX_PASSAGE_LIBRARY',
  'MAX_CUSTOM_LIBRARY',
  'return (' + extractFunction('typingPracticeValidateBackupState') + ')'
)({ 'qwerty-us': { label: 'US QWERTY' } }, 12, 5);

describe('Typing Practice backup integrity', () => {
  it('summarizes valid backup collections for a confirmation preview', () => {
    expect(validate({
      sessions: [{ date: '2026-01-01T00:00:00.000Z' }],
      aiPassageLibrary: [{ text: 'A passage' }],
      customDrillLibrary: [{ id: 'custom-1' }],
      visualGallery: [{ base64: 'data:image/png;base64,abc' }],
      keyboardLayout: 'qwerty-us'
    })).toEqual({ sessions: 1, passages: 1, customDrills: 1, visualImages: 1 });
  });

  it('rejects malformed collections and unsupported sizes before restore', () => {
    expect(() => validate({ sessions: 'not-an-array' })).toThrow('Sessions must be an array.');
    expect(() => validate({ sessions: ['not-a-record'] })).toThrow('Sessions contains an invalid entry.');
    expect(() => validate({ sessions: Array.from({ length: 201 }, () => ({})) })).toThrow('Sessions exceeds the supported limit');
    expect(() => validate({ customDrillLibrary: Array.from({ length: 6 }, () => ({})) })).toThrow('Custom drills exceeds the supported limit');
    expect(() => validate({ personalBest: [] })).toThrow('personalBest must be an object.');
    expect(() => validate({ keyboardLayout: 'unknown-layout' })).toThrow('Unknown keyboard layout.');
  });

  it('enforces a raw-file safety limit and previews restored content', () => {
    expect(source).toContain('MAX_BACKUP_FILE_CHARS = 5000000');
    expect(source).toContain('rawBackup.length > MAX_BACKUP_FILE_CHARS');
    expect(source).toContain('var restorePreview =');
    expect(source).toContain("backupSummary.passages + ' saved passages, '");
    expect(source).toContain("backupSummary.customDrills + ' custom drills, and '");
    expect(source).toContain("backupSummary.visualImages + ' visual images. Keyboard layout:");
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });
});
