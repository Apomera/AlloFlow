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
    // Carries the operation ticket so a superseded palette apply cannot score.
    expect(fn).toMatch(/await _reauditAndScore\(newHtml, null, operationTicket\)/);
    expect(fn).not.toMatch(/callGemini|callGeminiVision/); // deterministic — no AI dependency
  });
  it('applies onto the ORIGINAL pre-palette html (switching presets cannot stack)', () => {
    const fn = view.slice(view.indexOf('const _applyPalette = async'), view.indexOf('const _revertPalette = async'));
    // Reads the html the operation captured (sourceHtml) rather than whatever
    // pdfFixResult happens to hold when this line runs.
    expect(fn).toMatch(/const origin = _paletteSnapshotRef\.current \|\| sourceHtml/);
    // first apply snapshots the pre-palette state; sets _preCmdHtml so the generic revert covers it too
    expect(fn).toMatch(/if \(!_paletteSnapshotRef\.current\) _paletteSnapshotRef\.current = sourceHtml/);
    // Same shared commit helper as the revert — the pre-palette snapshot rides
    // along as _preCmdHtml so the generic undo covers a palette apply too.
    expect(fn).toMatch(/_commitHtmlPendingVerification\(operationTicket, newHtml, \{ _preCmdHtml: _snap \}\)/);
  });
  it('_revertPalette restores the snapshot, clears it, and re-audits', () => {
    // Anchored on the next declaration rather than a byte count: the ticket +
    // shared-commit rework grew this function past the old 600-char window, so
    // the slice was cutting before the assertions' targets and failing blind.
    const _revStart = view.indexOf('const _revertPalette = async');
    const fn = view.slice(_revStart, view.indexOf('const _axeTarget =', _revStart));
    expect(fn).toMatch(/const snap = _paletteSnapshotRef\.current/);
    // The revert commits through the shared _commitHtmlPendingVerification,
    // which performs the token-guarded swap and invalidates the stale audits —
    // so the snapshot html is no longer written as a bare accessibleHtml field.
    expect(fn).toMatch(/_commitHtmlPendingVerification\(operationTicket, snap/);
    expect(fn).toMatch(/_paletteSnapshotRef\.current = null/);
    expect(fn).toMatch(/await _reauditAndScore\(snap, null, operationTicket\)/);
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
