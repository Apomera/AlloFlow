import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_volume.js');
const publicPath = resolve(process.cwd(), 'prismflow-deploy/public/stem_lab/stem_tool_volume.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Volume Lab accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('associates visible slider labels and names inquiry fields', () => {
    const text = source();
    expect(text).toContain("htmlFor: 'volume-net-fold'");
    expect(text).toContain("id: 'volume-net-fold'");
    expect(text).toContain("htmlFor: 'volume-dimension-' + dim");
    expect(text).toContain("id: 'volume-dimension-' + dim");
    expect(text).toContain("htmlFor: 'volume-visible-layers'");
    expect(text).toContain("id: 'volume-visible-layers'");
    expect(text).toContain("htmlFor: 'volume-cross-section-layer'");
    expect(text).toContain("id: 'volume-cross-section-layer'");
    expect(text).toContain("'aria-label': 'Volume prediction hypothesis'");
    expect(text).toContain("'aria-label': 'Explain how each dimension contributes to total volume'");
  });

  it('respects reduced motion for transient indicators', () => {
    const text = source();
    expect(text).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(text).toContain("(reducedMotion ? '' : ' animate-pulse')");
    expect(text).toContain("(reducedMotion ? '' : ' animate-spin')");
  });

  it('lets learners pause the continuous formula animation and exposes its content as text', () => {
    const text = source();
    expect(text).toContain("onClick: function() { upd({ formulasPaused: !formulasPaused }); }");
    expect(text).toContain("formulasPaused ? '▶ Resume' : '⏸ Pause'");
    expect(text).toContain("cvEl._volPaused = formulasPaused || reducedMotion");
    expect(text).toContain("if (!cvEl._volPaused) cvEl._volTime += frameDelta");
    expect(text).toContain("id: 'volume-formulas-description', className: 'sr-only'");
    expect(text).toContain("'aria-describedby': 'volume-formulas-description'");
  });

  it('uses a focus-managed alert dialog before deleting saved work', () => {
    const text = source();
    expect(text).not.toMatch(/\bconfirm\s*\(/);
    expect(text).toContain("role: 'alertdialog', 'aria-modal': 'true'");
    expect(text).toContain("requestDeleteSaved(name)");
    expect(text).toContain("if (e.key === 'Escape')");
    expect(text).toContain("id: 'volume-delete-cancel'");
    expect(text).toContain("id: 'volume-delete-confirm'");
    expect(text).toContain("id: 'volume-saved-toggle'");
  });

  it('keeps persistent interface text at ten pixels or larger', () => {
    const text = source();
    expect(text).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(text).not.toMatch(/fontSize:\s*(?:[0-9](?:\.[0-9]+)?)\b/);
    expect(text).toContain('text-[10px] font-bold uppercase');
  });

  it('marks the detached export-only canvas as absent from the accessibility tree', () => {
    const text = source();
    expect(text).toContain('Export-only detached canvas; it is never inserted into the accessibility tree.');
    expect(text).toContain("canvas.setAttribute('role', 'presentation')");
    expect(text).toContain("canvas.setAttribute('aria-hidden', 'true')");
  });
});
