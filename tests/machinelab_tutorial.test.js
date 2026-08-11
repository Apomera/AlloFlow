import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const state = (o = {}) => ({ machineLab: Object.assign({ view: 'machines' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// Six views is a lot to land on cold. The host owns the overlay, the step
// counter and the seen-once flag; the tool only supplies steps.
describe('Machine Lab: first-run tutorial', () => {
  function capture(overrides = {}) {
    const calls = [];
    const html = renderTool('machineLab', state(), Object.assign({
      renderTutorial: (toolId, steps) => { calls.push({ toolId, steps }); return null; }
    }, overrides));
    return { calls, html };
  }

  it('asks the host to render a tutorial under its own tool id', () => {
    const { calls } = capture();
    expect(calls).toHaveLength(1);
    expect(calls[0].toolId).toBe('machineLab');
  });

  it('supplies steps in the shape the host reads', () => {
    // The host reads s.text, s.top, s.left and steps.length.
    const { calls } = capture();
    const steps = calls[0].steps;
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    for (const s of steps) {
      expect(typeof s.text).toBe('string');
      expect(s.text.length).toBeGreaterThan(20);
      expect(s.text).not.toContain('undefined');
      expect(typeof s.top).toBe('string');
      expect(typeof s.left).toBe('string');
    }
  });

  it('walks the tool’s actual spine, in order', () => {
    const text = capture().calls[0].steps.map((s) => s.text).join(' | ').toLowerCase();
    expect(text).toContain('machine shop');
    expect(text).toContain('build');
    expect(text).toContain('ledger');
    expect(text).toContain('test range');
    expect(text).toContain('target wall');
  });

  it('teaches the two things the tool is easiest to get wrong on', () => {
    const text = capture().calls[0].steps.map((s) => s.text).join(' ');
    // The fastest shot is not the furthest, and walls need direct fire.
    expect(text).toContain('the fastest shot is not the furthest');
    expect(text).toContain('direct fire');
  });

  it('opens at the right reading level', () => {
    const grab = (band) => {
      const calls = [];
      renderTool('machineLab', { machineLab: { view: 'machines', bandOverride: band } }, {
        renderTutorial: (id, steps) => { calls.push(steps); return null; }
      });
      return calls[0][0].text;
    };
    expect(grab('k2')).toContain('push less hard');
    expect(grab('g912')).toContain('composed into a real engine');
    expect(grab('k2')).not.toBe(grab('g912'));
  });

  it('renders whatever the host hands back', () => {
    const html = renderTool('machineLab', state(), {
      renderTutorial: () => ({ type: 'div', key: 'tut', props: { children: 'STEP ONE' }, $$typeof: Symbol.for('react.element') })
    });
    expect(html).toContain('STEP ONE');
  });

  it('works on a host too old to offer tutorials', () => {
    // ctx.renderTutorial is absent in the smoke harness and in older hosts.
    const html = renderTool('machineLab', state());
    expect(html).toContain('Machine Lab');
    expect(html).not.toContain('undefined');
  });
});
