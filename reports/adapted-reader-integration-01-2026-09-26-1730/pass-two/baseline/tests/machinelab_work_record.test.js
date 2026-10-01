import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const rec = (o = {}) => ({ machineLab: Object.assign({ view: 'learn', manualTopic: 'record' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// The tool accumulates real evidence of thinking and had nowhere to show it: a
// student finishing a session had nothing to hand anyone.
describe('Machine Lab: work record', () => {
  it('is reachable as a Field Manual topic', () => {
    const html = renderTool('machineLab', { machineLab: { view: 'learn' } });
    expect(html).toContain('Your work');
  });

  it('says outright that it is a record and not a mark', () => {
    const html = renderTool('machineLab', rec());
    expect(html).toContain('not a mark');
    expect(html).toContain('nothing here is scored');
  });

  it('reads sensibly on a session where nothing has happened yet', () => {
    const html = renderTool('machineLab', rec());
    expect(html).toContain('Benches proven: 0/6');
    expect(html).toContain('none yet');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('counts the benches that were actually proven', () => {
    const html = renderTool('machineLab', rec({
      provenBenches: { lever: true, pulley: true, screw: true }
    }));
    expect(html).toContain('Benches proven: 3/6');
    expect(html).toContain('lever');
    expect(html).toContain('screw');
  });

  it('reports the furthest shot and the stone that threw it', () => {
    const html = renderTool('machineLab', rec({
      shotHistory: [
        { projMass: 5, range: 60, muzzleV: 60, eta: 0.2 },
        { projMass: 25, range: 142.4, muzzleV: 32, eta: 0.34 },
        { projMass: 200, range: 88, muzzleV: 14, eta: 0.8 }
      ]
    }));
    expect(html).toContain('Shots logged: 3');
    expect(html).toContain('furthest was 142.4 m with a 25 kg stone');
  });

  it('omits the siege line entirely until a siege happens', () => {
    expect(renderTool('machineLab', rec())).not.toContain('Siege:');
    const after = renderTool('machineLab', rec({
      shotsFired: 7, totalCrankWork: 310000, wallPreset: 'gatehouse'
    }));
    expect(after).toContain('Siege: gatehouse');
    expect(after).toContain('7 shots');
    expect(after).toContain('310 kJ');
  });

  it('derives whether the wall actually fell rather than trusting a flag', () => {
    const blocks = [];
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 6; r++) {
        blocks.push({
          id: c + ',' + r, col: c, row: r, x: c, y: r, z: 0,
          mat: 'limestone', absorbed: 0, state: c === 3 ? 'breached' : 'intact'
        });
      }
    }
    const held = renderTool('machineLab', rec({ shotsFired: 4, totalCrankWork: 1000 }));
    expect(held).toContain('wall held');

    const down = renderTool('machineLab', rec({
      shotsFired: 4, totalCrankWork: 1000, wallBlocks: blocks
    }));
    expect(down).toContain('breached');
  });

  it('includes the student’s own words when they wrote any', () => {
    const html = renderTool('machineLab', rec({
      iqHypothesis: 'The onager wins on light stones.',
      iqExplanation: 'Only one arm has to be accelerated.'
    }));
    expect(html).toContain('Hypothesis: The onager wins on light stones.');
    expect(html).toContain('Explanation: Only one arm has to be accelerated.');
  });

  it('leaves those lines out when they wrote nothing', () => {
    const html = renderTool('machineLab', rec());
    expect(html).not.toContain('Hypothesis:');
    expect(html).not.toContain('Explanation:');
  });

  it('can be read aloud, so the record is not sight-only either', () => {
    const html = renderTool('machineLab', rec(), {
      callTTS: () => Promise.resolve(null)
    });
    expect(html).toMatch(/aria-label="Read aloud"/);
  });

  it('records the reading level it was worked at', () => {
    const cfg = loadTool(FILE, 'machineLab');
    expect(String(cfg.render)).toContain("__alloT('stem.machinelab.rec_level'");
  });
});
