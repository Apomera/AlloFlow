import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Circuit Lab SVG alternatives', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
  });

  it('describes each prediction schematic without revealing the answer', () => {
    const html = renderTool('circuit', {
      circuit: { workspaceTab: 'reference', expSection: 'poebulb' },
    });

    expect(html).toContain(
      'aria-label="One bulb, 1.5 V battery. 1.5 volt battery with bulb 1, 5 ohms in a single-load closed circuit."',
    );
    expect(html).toContain(
      'aria-label="Two bulbs in SERIES, same battery. 1.5 volt battery with bulb 1, 5 ohms; bulb 2, 5 ohms in series."',
    );
    expect(html).toContain(
      'aria-label="Swap one bulb for a 1 Ω resistor (in series with a 10 Ω bulb). 1.5 volt battery with bulb 1, 10 ohms; resistor 2, 1 ohm in series."',
    );
  });

  it('describes the current point and trend in the Ohm inquiry graph', () => {
    const html = renderTool('circuit', {
      circuit: {
        workspaceTab: 'reference',
        expSection: 'ohmInquiry',
        ohmInquiry: {
          voltage: 12,
          resistance: 4,
          hypothesis: '',
          stuckRevealed: false,
          understood: false,
          explanation: '',
          log: [],
        },
      },
    });

    expect(html).toContain('role="img"');
    expect(html).toContain(
      'aria-label="Ohm inquiry current-versus-resistance graph at 12 volts. Current decreases as resistance increases. Current point: 4 ohms, 3.000 amps, 36.000 watts; dissipation state: Dangerous."',
    );
  });

  it('names each SVG and exposes the interactive schematic as a group', () => {
    const ast = createRequire(import.meta.url)('acorn').parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
    const stack = [ast], declarations = [];
    while (stack.length) {
      const node = stack.pop();
      if (node.type === 'CallExpression' && node.callee.name === 'h' && node.arguments[0]?.value === 'svg') declarations.push(node.arguments[1]);
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) child.forEach(value => { if (value?.type) stack.push(value); });
        else if (child?.type) stack.push(child);
      }
    }
    let informativeCount = 0;
    for (const declaration of declarations) {
      expect(declaration.type).toBe('ObjectExpression');
      const property = key => declaration.properties.find(entry => (entry.key?.name || entry.key?.value) === key)?.value;
      const hidden = property('aria-hidden')?.value;
      if (hidden === true || hidden === 'true') {
        expect([false, 'false']).toContain(property('focusable')?.value);
        expect(property('tabIndex')).toBeUndefined();
        expect(property('tabindex')).toBeUndefined();
        expect(property('role')).toBeUndefined();
        continue;
      }
      informativeCount++;
      const label = property('aria-label');
      expect(label).toBeDefined();
      if (label.type === 'Literal') expect(label.value.trim()).not.toBe('');
      const interactive = source.slice(label.start, label.end).includes("'Interactive ' + mode");
      expect(property('role')?.value).toBe(interactive ? 'group' : 'img');
    }
    expect(informativeCount).toBeGreaterThanOrEqual(20);
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
