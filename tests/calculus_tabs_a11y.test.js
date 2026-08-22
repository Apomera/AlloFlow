import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_calculus.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_calculus.js');

describe('Calculus Lab main tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives all six calculus sections roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': 'Calculus Tool sections'");
    expect(source).toContain("CALCULUS_TABS.map(function(item, tabIndex){");
    expect(source).toContain("['derivHunt','\\u2753 Inquiry']");
    expect(source).toContain("id:'calculus-tab-'+item[0]");
    expect(source).toContain("'aria-controls':'calculus-panel-'+item[0]");
    expect(source).toContain("tabIndex:tab===item[0]?0:-1");
    expect(source).toContain("onKeyDown:function(e){calculusTabKeyDown(e, tabIndex);}");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("% CALCULUS_TABS.length");
    expect(source).toContain("CALCULUS_TABS.length - 1");
  });

  it('links the active calculus hero to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'calculus-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'calculus-tab-' + tab");
    expect(source).toContain("tabIndex: 0");
  });

  it('keeps the derivative inquiry reachable and updates its nested state correctly', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("derivHunt:  { accent:");
    expect(source).toContain("tab === 'derivHunt' && (function()");
    expect(source).toContain("function setIQ(patch) { upd('derivHunt', Object.assign({}, iq, patch)); }");
    expect(source).not.toContain("upd({ derivHunt:");
  });

  it('uses normalized live values in the AI explanation prompt so zero coefficients stay zero', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("var fnStr = fa + 'x\\u00B2 + ' + fb + 'x + ' + fc;");
    expect(source).toContain("' on [' + xMin + ', ' + xMax2 + '] with n=' + nRects");
    expect(source).not.toContain("var fnStr = (d.a || 1)");
  });
});
