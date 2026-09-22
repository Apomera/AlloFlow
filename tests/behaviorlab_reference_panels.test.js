import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');

// MEASUREMENT_METHODS (8 entries) and ABA_ETHICS (6) were written, translated
// and then never rendered — dead data carrying the content this audience most
// needs. Measurement is HOW YOU COLLECT the data the rest of the tool teaches
// you to read, and partial vs whole interval vs momentary time sampling is the
// thing a school team most often gets wrong on a BIP.
describe('Behavior Lab reference panels', () => {
  it('leaves no declared-but-unrendered reference array', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    // A declaration plus at least one read. One occurrence = dead data.
    for (const name of ['MEASUREMENT_METHODS', 'ABA_ETHICS']) {
      const uses = (src.match(new RegExp(name, 'g')) || []).length;
      expect(uses, `${name} is declared but never rendered`).toBeGreaterThan(1);
    }
  });

  it('renders every measurement method once opened', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'running', blShowMeasurement: true,
    });

    for (const name of ['Frequency/Rate', 'Duration', 'Latency',
      'Inter-Response Time (IRT)', 'Magnitude/Intensity',
      'Partial Interval Recording', 'Whole Interval Recording',
      'Momentary Time Sampling']) {
      expect(html, `measurement method missing: ${name}`).toContain(name);
    }
  });

  it('expands a measurement method to its definition and example', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'running', blShowMeasurement: true, blMeasurementIdx: 0,
    });

    expect(html).toContain('Rate = count / time');
    expect(html).toContain('0.4 per minute');
    expect(html).toContain('aria-expanded="true"');
  });

  it('renders the practice standards, including the two a trainee crosses first', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'running', blShowEthics: true,
    });

    expect(html).toContain('Least Restrictive');
    expect(html).toContain('Competence');
    // It must not read as a qualification: the scope boundary is the point.
    expect(html).toContain('supervised professional work');
  });

  it('keeps both panels collapsed by default', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', { blLevel: 1, blPhase: 'running' });

    // Headers present, bodies not — the intro digest is unchanged in substance.
    expect(html).toContain('Measurement methods (8)');
    expect(html).toContain('Practice standards (6)');
    expect(html).not.toContain('Momentary Time Sampling');
    expect(html).not.toContain('Least Restrictive');
  });
});
