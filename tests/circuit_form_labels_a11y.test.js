import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Circuit Lab form labels', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
  });

  it('names the AI tutor question field independently of its placeholder', () => {
    const html = renderTool('circuit', { _circuit: { showAI: true } });
    expect(html).toContain('id="circuit-ai-question"');
    expect(html).toContain('aria-label="Question for the AI Circuit Tutor"');
  });

  it('associates visible labels with both Ohm inquiry text areas', () => {
    const html = renderTool('circuit', {
      circuit: {
        workspaceTab: 'reference',
        expSection: 'ohmInquiry',
        ohmInquiry: {
          voltage: 9,
          resistance: 100,
          hypothesis: '',
          stuckRevealed: false,
          understood: true,
          explanation: '',
          log: [],
        },
      },
    });

    expect(html).toContain('for="circuit-ohm-hypothesis"');
    expect(html).toContain('id="circuit-ohm-hypothesis"');
    expect(html).toContain('for="circuit-ohm-explanation"');
    expect(html).toContain('id="circuit-ohm-explanation"');
    expect(html).toContain('Explain the dissipation state in your own words');
  });

  it('retains accessible names on every other form control', () => {
    expect(source).toContain("'aria-label': __alloT('stem.circuit.aria_voltage_slider', 'Voltage slider')");
    expect(source).toContain("'aria-label': compLabel + ' resistance in ohms'");
    expect(source).toContain("'aria-label': compLabel + ' capacitance in microfarads'");
    expect(source).toContain("type: 'range', 'aria-label': 'Voltage'");
    expect(source).toContain("type: 'range', 'aria-label': 'Resistance'");
    expect(source).toContain("h('label', { style: { display: 'flex', alignItems: 'center'");
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
