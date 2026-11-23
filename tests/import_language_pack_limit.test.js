import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function extractImportLanguagePack(filePath) {
  const src = fs.readFileSync(path.join(ROOT, filePath), 'utf8');
  const start = src.indexOf('const importLanguagePack = useCallback((file) => {');
  if (start < 0) throw new Error(`importLanguagePack not found in ${filePath}`);
  const end = src.indexOf('}, []);', start);
  if (end < 0) throw new Error(`importLanguagePack closing not found in ${filePath}`);
  const body = src.slice(start + 'const importLanguagePack = useCallback('.length, end + 1);
  return body;
}

function makeHarness(filePath = 'AlloFlowANTI.txt') {
  const fnSrc = extractImportLanguagePack(filePath);
  const toasts = [];
  const alerts = [];
  const setLanguagePack = vi.fn();
  const setStatusMessage = vi.fn();
  const setIsTranslating = vi.fn();
  const warnLog = vi.fn();
  const translationRunRef = { current: { generation: 0, identity: '', controller: null } };
  const sanitizeLanguagePack = (x) => x;
  const t = (k) => k;
  const windowObj = { AlloFlowUX: { toast: (msg, lvl) => toasts.push({ msg, lvl }) } };

  class FakeFileReader {
    readAsText(file) {
      this.onload({ target: { result: file._content } });
    }
  }

  const factory = new Function(
    'window', 'alert', 'FileReader', 'translationRunRef',
    'sanitizeLanguagePack', 'setLanguagePack', 'setStatusMessage', 'setIsTranslating', 't', 'warnLog',
    `return (${fnSrc});`
  );
  const importLanguagePack = factory(
    windowObj, (m) => alerts.push(m), FakeFileReader, translationRunRef,
    sanitizeLanguagePack, setLanguagePack, setStatusMessage, setIsTranslating, t, warnLog
  );
  return { importLanguagePack, toasts, alerts, setLanguagePack, setStatusMessage, setIsTranslating };
}

describe('importLanguagePack size cap and structural guards', () => {
  it('accepts a realistic 15 MB exported pack (formerly rejected by 2 MB cap) and strips __proto__', () => {
    const h = makeHarness('AlloFlowANTI.txt');
    const payload = '{"common":{"ok":"Sí"},"__proto__":{"polluted":true}}';
    h.importLanguagePack({ size: 15 * 1024 * 1024, _content: payload });
    expect(h.toasts).toEqual([]);
    expect(h.setLanguagePack).toHaveBeenCalledTimes(1);
    const loaded = h.setLanguagePack.mock.calls[0][0];
    expect(loaded.common.ok).toBe('Sí');
    expect(({}).polluted).toBeUndefined();
  });

  it('rejects files over 32 MB before parsing', () => {
    const h = makeHarness('AlloFlowANTI.txt');
    h.importLanguagePack({ size: 33 * 1024 * 1024, _content: '{}' });
    expect(h.setLanguagePack).not.toHaveBeenCalled();
    expect(h.toasts.length).toBe(1);
    expect(h.toasts[0].msg).toContain('32 MB');
  });

  it('rejects top-level arrays and overly deep (>12) nested objects', () => {
    const h = makeHarness('AlloFlowANTI.txt');
    h.importLanguagePack({ size: 128, _content: '["not","an","object"]' });
    expect(h.setLanguagePack).not.toHaveBeenCalled();
    expect(h.toasts.at(-1).msg).toBe('language_selector.alert_invalid_json');

    let deep = '{"a":"leaf"}';
    for (let i = 0; i < 15; i++) deep = `{"n":${deep}}`;
    h.importLanguagePack({ size: deep.length, _content: deep });
    expect(h.setLanguagePack).not.toHaveBeenCalled();
    expect(h.toasts.at(-1).msg).toBe('language_selector.alert_invalid_json');
  });

  it('keeps AlloFlowANTI.txt and desktop/web-app/src/App.jsx importLanguagePack identical', () => {
    expect(extractImportLanguagePack('AlloFlowANTI.txt')).toBe(
      extractImportLanguagePack('desktop/web-app/src/App.jsx')
    );
  });
});
