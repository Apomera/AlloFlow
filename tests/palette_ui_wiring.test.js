// Palette UI wiring (S2 slice-4, 2026-06-23): the audit view's "Document colours" picker applies a vetted,
// contrast-GUARANTEED palette to the remediated document — deterministic + AI-free (throttle-immune) — with
// a one-click revert and a re-audit after each change. The picker UX is JSX, so this pins the WIRING: the
// handlers apply onto the ORIGINAL (no stacking), snapshot for revert, re-audit via the shared mini-audit,
// and the picker renders the presets + revert + the guaranteed-contrast badge.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('palette state + handlers', () => {
  it('declares the revert snapshot ref + applied-palette + busy state', () => {
    expect(view).toMatch(/const _paletteSnapshotRef = useRef\(null\)/);
    expect(view).toMatch(/const \[_appliedPalette, setAppliedPalette\] = useState\(null\)/);
    expect(view).toMatch(/const \[_paletteBusy, setPaletteBusy\] = useState\(false\)/);
  });
  it('_applyPalette uses the deterministic clamp+apply tools and re-audits (no AI)', () => {
    const fn = view.slice(view.indexOf('const _applyPalette = async'), view.indexOf('const _revertPalette = async'));
    expect(fn).toMatch(/_docPipeline\.applyPaletteToHtml\(origin, preset\.tokens\)/);
    expect(fn).toMatch(/_docPipeline\.buildPaletteCss\(preset\.tokens\)/);
    expect(fn).toMatch(/await _reauditAndScore\(newHtml, null\)/);
    expect(fn).not.toMatch(/callGemini|callGeminiVision/); // deterministic — no AI dependency
  });
  it('applies onto the ORIGINAL pre-palette html (switching presets cannot stack)', () => {
    const fn = view.slice(view.indexOf('const _applyPalette = async'), view.indexOf('const _revertPalette = async'));
    expect(fn).toMatch(/const origin = _paletteSnapshotRef\.current \|\| pdfFixResult\.accessibleHtml/);
    // first apply snapshots the pre-palette state; sets _preCmdHtml so the generic revert covers it too
    expect(fn).toMatch(/if \(!_paletteSnapshotRef\.current\) _paletteSnapshotRef\.current = pdfFixResult\.accessibleHtml/);
    expect(fn).toMatch(/accessibleHtml: newHtml, _preCmdHtml: _snap/);
  });
  it('_revertPalette restores the snapshot, clears it, and re-audits', () => {
    const fn = view.slice(view.indexOf('const _revertPalette = async'), view.indexOf('const _revertPalette = async') + 600);
    expect(fn).toMatch(/const snap = _paletteSnapshotRef\.current/);
    expect(fn).toMatch(/accessibleHtml: snap/);
    expect(fn).toMatch(/_paletteSnapshotRef\.current = null/);
    expect(fn).toMatch(/await _reauditAndScore\(snap, null\)/);
  });
});

describe('palette picker UI', () => {
  it('renders the preset chips from _docPipeline.palettePresets, gated on a result', () => {
    expect(view).toMatch(/Array\.isArray\(_docPipeline\.palettePresets\)[\s\S]{0,80}pdfFixResult && pdfFixResult\.accessibleHtml/);
    expect(view).toMatch(/_docPipeline\.palettePresets\.map\(\(preset\) =>/);
    expect(view).toMatch(/onClick=\{\(\) => _applyPalette\(preset\)\}/);
  });
  it('shows the guaranteed-contrast badge with the worst ratio + a revert button', () => {
    expect(view).toMatch(/typeof _appliedPalette\.worst === 'number'/);
    expect(view).toMatch(/pdf_audit\.palette\.badge/);
    expect(view).toMatch(/onClick=\{_revertPalette\}/);
  });
  it('keeps a non-AI honesty note (deterministic; AI palettes later)', () => {
    expect(view).toMatch(/pdf_audit\.palette\.note/);
  });
});
