// K-2 students see only their level's activities (2026-11-06): the More row offered integers, decimal zoom and fractions to
// a first grader. Their teacher still sees everything, and "Change level" stays as the way up. NUMBERLINE_SRC runs another copy.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.NUMBERLINE_SRC || 'stem_lab/stem_tool_numberline.js';
const K2 = { gradeBand: 'k2', gradeLevel: '1st Grade' };
const THIRD = { gradeBand: 'g35', gradeLevel: '3rd Grade' };
const CORE = ['challenges', 'skipcount', 'measure', 'explore'];

let root, host;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'numberline');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  if (host) host.remove();
});
async function mount(seed, ctxExtra) {
  const tool = window.StemLab._registry.numberline;
  function Host() {
    const [toolData, setToolData] = React.useState({ _numberline: seed });
    return tool.render(makeCtx({ toolData, setToolData, ...ctxExtra }));
  }
  await React.act(async () => root.render(React.createElement(Host)));
}
const tabIds = () => [...host.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('numberline-tab-', ''));

describe('K-2 Number Line tab bar', () => {
  it('a K-2 student sees four activities and no More row', async () => {
    await mount({ tab: 'challenges' }, { ...K2, isTeacherMode: false });
    expect(tabIds()).toEqual(CORE);
    expect(host.querySelector('[data-nl-tab-group="more"]')).toBeNull();
    expect(host.textContent).not.toContain('More activities');
  });

  it('the workspace overview offers no hidden activity either', async () => {
    await mount({ tab: 'challenges' }, { ...K2, isTeacherMode: false });
    const details = host.querySelector('details[aria-label="Number Line workspace"]');
    expect(details).not.toBeNull();
    await React.act(async () => { details.open = true; details.dispatchEvent(new window.Event('toggle', { bubbles: false })); });
    expect(host.textContent).toContain('Set the range, add markers');
    expect(host.textContent).not.toContain('Temperatures, elevations and money owed');
    expect(host.textContent).not.toContain('Zoom from tenths to thousandths');
  });

  it('a K-2 teacher still sees all nine', async () => {
    await mount({ tab: 'challenges' }, { ...K2, isTeacherMode: true });
    expect(tabIds()).toHaveLength(9);
    expect(host.querySelector('[data-nl-tab-group="more"]')).not.toBeNull();
  });

  it('a third grader still sees all nine', async () => {
    await mount({ tab: 'challenges' }, { ...THIRD, isTeacherMode: false });
    expect(tabIds()).toHaveLength(9);
  });

  it('a K-2 student who chose a higher level gets that level\'s tabs back', async () => {
    await mount({ tab: 'challenges', ppBand: 'b45' }, { ...K2, isTeacherMode: false });
    expect(tabIds()).toHaveLength(9);
  });

  it('a saved or preset tab from the hidden group still opens, with its own button', async () => {
    await mount({ tab: 'fracdec' }, { ...K2, isTeacherMode: false });
    expect(tabIds()).toEqual([...CORE, 'fracdec']);
    const panel = host.querySelector('[role="tabpanel"]');
    expect(document.getElementById(panel.getAttribute('aria-labelledby'))).not.toBeNull();
    expect(host.querySelector('#numberline-tab-fracdec').getAttribute('aria-selected')).toBe('true');
  });

  it('arrow keys wrap inside the tabs that are shown', async () => {
    await mount({ tab: 'explore' }, { ...K2, isTeacherMode: false });
    const explore = host.querySelector('#numberline-tab-explore');
    await React.act(async () => explore.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(host.querySelector('#numberline-tab-challenges').getAttribute('aria-selected')).toBe('true');
  });
});
