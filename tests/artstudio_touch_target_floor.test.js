import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

/**
 * WCAG 2.5.8 (Target Size, Minimum) asks for 24x24 CSS pixels. Two families of
 * control in this tool sat under that on a 375px phone, measured in a real
 * browser on 2026-09-21:
 *
 *   - the full-width disclosure headers ("Learn About Symmetry", "The Science
 *     of Op Art", ...) were text-xs with NO vertical padding, so they rendered
 *     16px tall in seven labs;
 *   - the px-2 py-1 / text-[0.625rem] mini buttons in the symmetry panel came
 *     out at 23px — one pixel short.
 *
 * Both are cheap to reintroduce by copying a neighbouring className, so this
 * pins the shape rather than the pixel: a full-width disclosure header must
 * carry vertical padding, and a mini button must carry a 24px floor. The
 * browser measurement lives in the layout sweep; this is the fast guard that
 * runs on every change.
 */
const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');

describe('Art Studio touch-target floor', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');

  it('gives every full-width disclosure header vertical padding', () => {
    // The headers share this opening; without a py-* they collapse to the
    // line-height of text-xs, which is 16px.
    const headers = source.match(/w-full flex items-center justify-between[^"]*text-xs[^"]*/g) || [];
    expect(headers.length, 'expected the disclosure headers to still exist').toBeGreaterThan(0);
    const unpadded = headers.filter((cls) => !/\bpy-\d/.test(cls) && !/\bmin-h-\[/.test(cls));
    expect(unpadded, 'disclosure headers with no vertical padding').toEqual([]);
  });

  it('keeps a 24px floor on the small symmetry buttons', () => {
    const minis = source.match(/rounded px-2 py-1[^"]*text-\[0\.625rem\][^"]*/g) || [];
    expect(minis.length, 'expected the mini buttons to still exist').toBeGreaterThan(0);
    const short = minis.filter((cls) => !/\bmin-h-\[(2[4-9]|[3-9]\d)px\]/.test(cls));
    expect(short, 'mini buttons without a >=24px floor').toEqual([]);
  });

  it('keeps a 44px target on the harmony understanding checkbox', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js','artStudio');
    const rendered = document.createElement('div');
    rendered.innerHTML = renderTool('artStudio',{artStudio:{tab:'harmonyHunt',studioHome:false,studioStarted:true}});
    const checkbox = rendered.querySelector('#hh-und');
    expect(checkbox, 'the harmony checkbox should still exist').toBeTruthy();
    expect(Number.parseFloat(checkbox.style.width)).toBeGreaterThanOrEqual(44);
    expect(Number.parseFloat(checkbox.style.height)).toBeGreaterThanOrEqual(44);
  });
});
