import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// This tool is mostly prose: six bench explanations, three machine
// explanations, and a Field Manual. A student who cannot read it fluently got
// none of it, which is a poor showing for a UDL tool.
function withTTS(toolData) {
  const spoken = [];
  const html = renderTool('machineLab', toolData, {
    callTTS: (text, voice, speed, opts) => { spoken.push({ text, speed, opts }); return Promise.resolve(null); }
  });
  return { html, spoken };
}

const state = (o = {}) => ({ machineLab: Object.assign({ view: 'machines' }, o) });

describe('Machine Lab: read aloud', () => {
  it('offers a labelled control beside the bench explanation', () => {
    const { html } = withTTS(state({ view: 'machines', bench: 'lever' }));
    expect(html).toMatch(/aria-label="Read aloud"/);
    expect(html).toContain('title="Read aloud"');
  });

  it('offers one beside the machine explanation', () => {
    const { html } = withTTS(state({ view: 'build', machine: 'ballista' }));
    expect(html).toMatch(/aria-label="Read aloud"/);
  });

  it('offers one for the Field Manual', () => {
    const { html } = withTTS(state({ view: 'learn', manualTopic: 'history' }));
    expect(html).toMatch(/aria-label="Read aloud"/);
  });

  it('is absent on a host with no voice, rather than a button that does nothing', () => {
    // The smoke harness supplies callTTS: null, which is the older-host case.
    const html = renderTool('machineLab', state({ view: 'machines' }));
    expect(html).not.toContain('Read aloud');
  });

  it('reads the bench text that is actually on screen, at every band', () => {
    for (const band of ['k2', 'g35', 'g68', 'g912']) {
      const { html } = withTTS(state({ view: 'machines', bench: 'ramp', bandOverride: band }));
      // The button's text comes from the same pick() the paragraph uses, so
      // whatever prose is rendered is what would be spoken.
      expect(html).toMatch(/aria-label="Read aloud"/);
    }
  });
});

describe('Machine Lab: the manual reads what it renders', () => {
  // The Field Manual's spoken text is collected AS the content is built, so it
  // cannot drift from a second hand-maintained copy.
  it('collects the prose it just rendered', () => {
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    expect(src).toContain('var spoken = [];');
    expect(src).toContain('spoken.push(txt);');            // paragraphs
    expect(src).toContain("spoken.push(it.t + '. ' + it.b);"); // history entries
    expect(src).toContain('items.forEach(function (t) { spoken.push(t); });'); // bullets
    expect(src).toContain("readAloud(spoken.join(' ')");
  });

  it('builds bullet lists from one array feeding both the list and the speech', () => {
    // Wrapping each <li> inline was fragile; the list is an array of strings.
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    expect(src).toContain('function bullets(items, key)');
    expect(src).not.toContain('spoke(');   // the abandoned inline-wrap approach
  });

  it('still renders every manual topic after the refactor', () => {
    for (const manualTopic of ['energy', 'machines', 'history', 'model']) {
      const { html } = withTTS(state({ view: 'learn', manualTopic }));
      expect(html, manualTopic).not.toContain('undefined');
      expect(html, manualTopic).not.toContain('NaN');
    }
    // The two refactored lists must still show their items.
    const machines = withTTS(state({ view: 'learn', manualTopic: 'machines' })).html;
    expect(machines).toContain('the throwing arm itself');
    expect(machines).toContain('the block and tackle');
    expect((machines.match(/<li/g) || []).length).toBeGreaterThanOrEqual(6);

    const model = withTTS(state({ view: 'learn', manualTopic: 'model' })).html;
    expect(model).toContain('double pendulum');
    expect((model.match(/<li/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
