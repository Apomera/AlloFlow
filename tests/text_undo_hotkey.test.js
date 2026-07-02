// Text undo/redo hotkey rewire (2026-07-02). Ctrl/Cmd+Z used to be consumed
// exclusively by ANNOTATION undo (and only outside text fields), so undoing a
// text change — the thing users actually reach for — did nothing. Pins:
//   1. The global text undo/redo system exists in AlloFlowANTI.txt and owns
//      Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z (with IME + native-undo carve-outs).
//   2. The old annotation-only Ctrl+Z binding is gone; annotation undo remains
//      reachable via its button and as the empty-history fallback.
//   3. The three tracked textareas carry data-allo-textundo in BOTH the source
//      and compiled module of each view pair.
//   4. handleFormatText gained h3/numlist, and the icon registry now actually
//      contains Bold/Italic/Highlighter (the toolbar icons were invisible
//      because window.AlloIcons never included them).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const anti = read('AlloFlowANTI.txt');

describe('global text undo/redo system (AlloFlowANTI.txt)', () => {
  it('records input/analysis/simplified domains through one recorder', () => {
    expect(anti).toContain('const _recordTextChange = (domain, id, prev, next)');
    expect(anti).toContain("_recordTextChange('input', '', h.prevInput, inputText);");
    expect(anti).toContain("_recordTextChange('analysis', generatedContent.id,");
    expect(anti).toContain("_recordTextChange('simplified', generatedContent.id,");
  });
  it('binds Ctrl/Cmd+Z undo and Ctrl+Y / Ctrl+Shift+Z redo with IME + native-undo carve-outs', () => {
    expect(anti).toContain("const isUndo = k === 'z' && !e.shiftKey;");
    expect(anti).toContain("const isRedo = (k === 'z' && e.shiftKey) || k === 'y';");
    expect(anti).toContain('if (e.isComposing) return;');
    expect(anti).toContain('if (inField && !tracked) return;');
    expect(anti).toContain("el.closest('[data-allo-textundo]')");
  });
  it('the old annotation-only Ctrl+Z binding is gone, but the button + fallback remain', () => {
    expect(anti).not.toContain('// redo is reserved');
    expect(anti).toContain('if (annotationUndoStackRef.current.length > 0) { handleAnnotationUndo(); return true; }');
    expect(anti).toContain('data-allo-undo-btn="true"');
  });
  it('undo/redo announce themselves (toast + SR) and cap retained history', () => {
    expect(anti).toContain("t('toasts.text_undone', { domain: label })");
    expect(anti).toContain("t('toasts.nothing_redo_yet')");
    expect(anti).toContain('h.undo.length > 60 || (total > 8000000');
  });
  it('the annotation tooltip no longer advertises Ctrl/Cmd+Z', () => {
    expect(anti).not.toContain("available) — Ctrl/Cmd+Z");
  });
});

describe('tracked textareas carry data-allo-textundo (source + compiled module)', () => {
  const pairs = [
    ['view_sidebar_panels_source.jsx', 'view_sidebar_panels_module.js', 'input'],
    ['view_analysis_source.jsx', 'view_analysis_module.js', 'analysis'],
    ['view_simplified_source.jsx', 'view_simplified_module.js', 'simplified'],
  ];
  for (const [srcFile, modFile, scope] of pairs) {
    it(`${scope}: ${srcFile} + ${modFile}`, () => {
      expect(read(srcFile)).toContain(`data-allo-textundo="${scope}"`);
      expect(read(modFile)).toContain(`"data-allo-textundo": "${scope}"`);
    });
  }
});

describe('toolbar formats + icon registry', () => {
  it('handleFormatText supports h3 and numlist', () => {
    const eh = read('export_handlers_module.js');
    expect(eh).toContain("case 'h3':");
    expect(eh).toContain("case 'numlist':");
  });
  it('window.AlloIcons finally includes Bold/Italic/Highlighter (both registry copies)', () => {
    const hits = anti.match(/Bold, Italic, Highlighter\n\s*\};/g) || [];
    expect(hits.length).toBe(2);
  });
  it('both editors expose H3 + numbered-list buttons in source and module', () => {
    for (const f of ['view_analysis_source.jsx', 'view_simplified_source.jsx', 'view_analysis_module.js', 'view_simplified_module.js']) {
      const s = read(f);
      expect(s, f).toContain("handleFormatText('h3'");
      expect(s, f).toContain("handleFormatText('numlist'");
      expect(s, f).toContain("_lazyIcon('ListOrdered')");
    }
  });
});
