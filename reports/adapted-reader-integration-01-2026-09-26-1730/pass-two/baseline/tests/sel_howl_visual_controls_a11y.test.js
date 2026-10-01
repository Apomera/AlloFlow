import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_howl.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_howl.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('HOWL visual and control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides a text alternative for the optional sketch canvas', () => {
    const text = source();
    expect(text).toContain("h('canvas', {");
    expect(text).toContain("role: 'img'");
    expect(text).toContain("'aria-label': 'Optional freehand sketch evidence for ' + props.hwName + '. A text evidence field is also available.'");
  });

  it('summarizes the actual data represented by both SVG charts', () => {
    const text = source();
    expect(text).toContain("return h2.name + ': level ' + (ratings[h2.id] || 0) + ' of 4'");
    expect(text).toContain("role: 'img', 'aria-label': 'HOWL radar chart. ' + radarSummary");
    expect(text).toContain("role: 'img', 'aria-label': 'Crew climate gauge for '");
    expect(text).toContain("avg.toFixed(1) + ' out of 10 from ' + filtered.length + ' anonymous scores'");
  });

  it('names dynamic text, range, and date controls and exposes range value text', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Micro-action text'");
    expect(text).toContain("'aria-valuetext': cgMyScore + ' out of 10'");
    expect(text).toContain("'aria-label': 'Maximum opener duration'");
    expect(text).toContain("'aria-valuetext': orDur === 0 ? 'Any duration' : orDur + ' minutes'");
    expect(text).toContain("'aria-label': 'Quarter start date'");
  });
});
