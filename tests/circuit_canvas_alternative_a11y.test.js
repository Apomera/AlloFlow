import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Circuit Lab short-circuit canvas alternative', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
  });

  it('hides the particle-only canvas while preserving equivalent warning content', () => {
    const html = renderTool('circuit', {
      _circuit: {
        mode: 'parallel',
        voltage: 9,
        components: [
          { type: 'resistor', id: 1, value: 100 },
          { type: 'ammeter', id: 2, value: 0 },
        ],
      },
    });

    expect(html).toContain('<canvas aria-hidden="true"');
    expect(html).toContain('Warning: short circuit.');
    expect(html).toContain('role="alert"');
    expect(html).toContain('SHORT CIRCUIT DETECTED');
    expect(html).toContain('Total resistance is below 1Ω');
  });

  it('documents the particle overlay as decorative next to its declaration', () => {
    expect(source).toContain(
      "isShort && h('canvas', {\n                'aria-hidden': 'true',",
    );
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
