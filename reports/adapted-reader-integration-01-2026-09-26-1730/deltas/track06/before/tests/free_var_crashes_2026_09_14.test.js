// Three names the free-variable gate had flagged for months, treated as
// "pre-existing" and left alone until 2026-09-14. Two were real ReferenceErrors:
//  - view_renderers: the Venn editor's remove buttons render <X />, and the
//    build's icon scanner only aliased icons with 2+ letter names.
//  - content_engine: applyTextRevision (Apply on a Simplify/Custom revision)
//    called handleSimplifiedTextChange, which the host never put in the
//    engine's state bag.
//  - ui_modals: `targetAppId || appId` fell through to a host-only binding.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadAlloModule } from './setup.js';

const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8').replace(/\r\n/g, '\n');

describe('view_renderers aliases the single-letter X icon', () => {
  it('the built module declares X and the scanner accepts one-letter icon names', () => {
    expect(read('view_renderers_module.js')).toContain("var X = _lazyIcon('X');");
    expect(read('_build_view_renderers_module.js')).toContain('const jsxRe = /<\\s*([A-Z][A-Za-z0-9]*)\\b/g;');
    expect(read('desktop/web-app/public/view_renderers_module.js')).toBe(read('view_renderers_module.js'));
  });
  it('the free-variable gate is clean for the module', () => {
    const out = execFileSync(process.execPath, ['dev-tools/check_free_vars.cjs', 'view_renderers_module.js'], { cwd: process.cwd(), encoding: 'utf8' });
    expect(out).toContain('all clean');
  });
});

describe('content engine applies a text revision through the host handler', () => {
  it('writes the revised passage back via handleSimplifiedTextChange from the state bag', async () => {
    window.__alloUtils = { cleanJson: (x) => x };
    loadAlloModule('content_engine_module.js');
    const handleSimplifiedTextChange = vi.fn();
    const setRevisionData = vi.fn();
    const state = {
      generatedContent: { type: 'simplified', data: 'The cat sat on the mat. It was warm.' },
      revisionData: { type: 'simplify', original: 'It was warm.', result: 'It felt warm.' },
      leveledTextLanguage: 'English',
      handleSimplifiedTextChange, setRevisionData, setSelectionMenu: vi.fn(), addToast: vi.fn(),
    };
    window.getSelection = () => ({ removeAllRanges: () => {} });
    const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini: vi.fn(), addToast: vi.fn(), t: (k) => k });
    await engine.applyTextRevision();
    expect(handleSimplifiedTextChange).toHaveBeenCalledWith('The cat sat on the mat. It felt warm.');
    expect(setRevisionData).toHaveBeenCalledWith(null);
  });
  it('the host exposes the handler as a lazy getter (declared after the bag)', () => {
    const anti = read('AlloFlowANTI.txt');
    expect(anti).toContain('get handleSimplifiedTextChange() { return handleSimplifiedTextChange; },');
    expect(read('desktop/web-app/src/AlloFlowANTI.txt')).toBe(anti);
  });
  it('the free-variable gate is clean for the module', () => {
    const out = execFileSync(process.execPath, ['dev-tools/check_free_vars.cjs', 'content_engine_module.js'], { cwd: process.cwd(), encoding: 'utf8' });
    expect(out).toContain('all clean');
  });
});

describe('ui_modals no longer reaches a host-only appId', () => {
  it('uses only the targetAppId prop', () => {
    const src = read('ui_modals_source.jsx');
    expect(src).not.toContain('targetAppId || appId');
    expect(src.match(/const effectiveAppId = String\(targetAppId \|\| ''\)\.trim\(\);/g)?.length).toBe(2);
    const out = execFileSync(process.execPath, ['dev-tools/check_free_vars.cjs', 'ui_modals_module.js'], { cwd: process.cwd(), encoding: 'utf8' });
    expect(out).toContain('all clean');
  });
});
