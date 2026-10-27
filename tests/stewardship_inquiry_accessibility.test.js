import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
function find(node, match) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, match); if (found) return found; } return null; }
  return match(node) ? node : find(node.props?.children, match);
}
async function mount(iq = {}, overrides = {}) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub');
  const store = newStore(), host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let tree, latest; const announceToSR = vi.fn();
  function Host() {
    const [data, setData] = React.useState({ stewardshipHub: { tutorialSeen: true, stewIQ: {
      investment: 50, timeHorizon: 10, communityBuyin: 5, interventionComplexity: 5,
      hypothesis: 'Keep my hypothesis.', stuckRevealed: false, understood: false, explanation: 'Keep my explanation.', log: [], ...iq
    } }, ecosystem: { conserve: { phase: 'playing', year: 2, residents: ['preserve'] } } });
    latest = data;
    tree = tool.render(makeCtx({ toolData: data, setToolData: setData, announceToSR, ...overrides }, store));
    return React.createElement('div', null, tree, React.createElement('button', { 'data-outside-inquiry': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  host.querySelector('[data-stewardship-inquiry]').open = true;
  return { host, state: () => latest, announceToSR,
    field: key => host.querySelector('[data-stewardship-inquiry-field="' + key + '"]'),
    param: key => host.querySelector('[data-stewardship-inquiry-param="' + key + '"]'),
    toggle: () => host.querySelector('[data-stewardship-inquiry-questions-toggle]'),
    questions: () => host.querySelector('[data-stewardship-inquiry-questions]'),
    checkbox: () => host.querySelector('[data-stewardship-inquiry-understood]'),
    change: (hook, value) => act(async () => find(tree, n => n.props?.['data-stewardship-inquiry-param'] === hook || n.props?.['data-stewardship-inquiry-field'] === hook).props.onChange({ target: { value } }))
  };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
const record = i => ({ t: '12:00:0' + i, inv: 50 + i, hor: 10 + i, comm: 5, ic: 4, odds: String(40 + i), state: 'Tenuous' });

describe('Stewardship investment inquiry accessibility', () => {
  it('connects native field and slider labels with values, units, and the hypothesis prompt', async () => {
    const t = await mount();
    for (const key of ['investment', 'timeHorizon', 'communityBuyin', 'interventionComplexity']) {
      const input = t.param(key); expect(input.labels).toHaveLength(1); expect(input.labels[0].htmlFor).toBe(input.id);
      expect(input.getAttribute('aria-valuetext')).toBeTruthy();
    }
    expect(t.param('investment').getAttribute('aria-valuetext')).toBe('50 thousand dollars');
    expect(t.param('timeHorizon').getAttribute('aria-valuetext')).toBe('10 years');
    expect(t.param('communityBuyin').getAttribute('aria-valuetext')).toBe('5 out of 10');
    for (const key of ['hypothesis', 'explanation']) {
      const field = t.field(key); expect(field.labels).toHaveLength(1); expect(field.labels[0].textContent).toBe('Stewardship campaign ' + key);
      expect(field.hasAttribute('aria-label')).toBe(false);
    }
    const prompt = document.getElementById(t.field('hypothesis').getAttribute('aria-describedby'));
    expect(prompt.textContent).toContain('MORE community buy-in');
    expect(t.host.contains(prompt)).toBe(true);
  });

  it('updates slider values and modeled output without erasing writing or other campaign data', async () => {
    const t = await mount(); const before = JSON.stringify(t.state().ecosystem);
    const outcome = () => t.host.querySelector('[data-stewardship-inquiry-outcome]');
    const first = outcome().textContent;
    await t.change('timeHorizon', '1'); expect(t.param('timeHorizon').getAttribute('aria-valuetext')).toBe('1 year');
    await t.change('investment', '300'); expect(t.param('investment').getAttribute('aria-valuetext')).toBe('300 thousand dollars');
    expect(t.state().stewardshipHub.stewIQ.investment).toBe(300); expect(outcome().textContent).not.toBe(first);
    expect(outcome().getAttribute('role')).toBe('status'); expect(outcome().getAttribute('aria-atomic')).toBe('true');
    const chart = t.host.querySelector('[aria-label^="Stewardship trajectory chart"]');
    expect(chart.getAttribute('aria-describedby')).toBe(outcome().id);
    expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my hypothesis.');
    expect(JSON.stringify(t.state().ecosystem)).toBe(before);
  });

  it('provides a named keyboard-scrollable native list of the latest five saved projects', async () => {
    const log = Array.from({ length: 7 }, (_, i) => record(i));
    const t = await mount({ log }); const region = t.host.querySelector('[data-stewardship-inquiry-log]');
    expect(region.getAttribute('role')).toBe('region'); expect(region.tabIndex).toBe(0);
    expect(document.getElementById(region.getAttribute('aria-labelledby')).textContent).toBe('Recent project log');
    expect(document.getElementById(region.getAttribute('aria-describedby')).textContent).toContain('latest 5 of 7');
    expect(region.querySelector('ol').getAttribute('role')).toBe('list');
    const items = [...region.querySelectorAll('li')]; expect(items).toHaveLength(5);
    expect(items[0].textContent).toContain('12:00:02'); expect(items[4].textContent).toContain('12:00:06');
    expect(items[0].textContent).toContain('community 5/10; intervention complexity 4/10');
    region.focus(); expect(document.activeElement).toBe(region);
    expect(t.state().stewardshipHub.stewIQ.log).toEqual(log);
  });

  it('logs the current project once, retains focus and writing, and announces its location', async () => {
    const t = await mount({ log: [record(0)] }); await t.change('communityBuyin', '8');
    const log = t.host.querySelector('[data-stewardship-inquiry-log-action]'); await activate(log);
    expect(document.activeElement).toBe(log); expect(t.state().stewardshipHub.stewIQ.log).toHaveLength(2);
    expect(t.state().stewardshipHub.stewIQ.log[1].comm).toBe(8);
    expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my hypothesis.');
    expect(t.announceToSR).toHaveBeenCalledWith('Project recorded in the recent project log.');
    expect(t.announceToSR).toHaveBeenCalledTimes(1);
  });

  it('keeps an operable disclosure and stable target when showing and hiding open questions', async () => {
    const t = await mount(); const button = t.toggle(), panel = t.questions();
    expect(button.getAttribute('aria-controls')).toBe(panel.id); expect(button.getAttribute('aria-expanded')).toBe('false'); expect(panel.hidden).toBe(true);
    await activate(button); expect(document.activeElement).toBe(button); expect(t.toggle()).toBe(button); expect(t.questions()).toBe(panel);
    expect(button.getAttribute('aria-expanded')).toBe('true'); expect(panel.hidden).toBe(false); expect(panel.querySelectorAll('li')).toHaveLength(4);
    expect(button.textContent).toBe('Hide open questions'); expect(t.state().stewardshipHub.stewIQ.stuckRevealed).toBe(true);
    await activate(button); expect(document.activeElement).toBe(button); expect(panel.hidden).toBe(true); expect(button.textContent).toContain('show open questions');
    expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my hypothesis.');
  });

  it('reveals the labelled explanation through its checkbox while preserving its saved text', async () => {
    const t = await mount(), box = t.checkbox(), field = t.field('explanation');
    const panel = document.getElementById(box.getAttribute('aria-controls')); expect(panel.hidden).toBe(true); expect(panel.contains(field)).toBe(true);
    await activate(box); expect(box.checked).toBe(true); expect(panel.hidden).toBe(false); expect(document.activeElement).toBe(box);
    await t.change('explanation', 'Community decisions change long-term outcomes.'); await activate(box);
    expect(panel.hidden).toBe(true); expect(t.field('explanation')).toBe(field);
    await activate(box); expect(field.value).toBe('Community decisions change long-term outcomes.');
  });

  it('keeps IDs and disclosure relationships inside each mounted instance', async () => {
    const a = await mount({ log: [record(0)] }), b = await mount({ log: [record(1)] });
    for (const field of ['hypothesis', 'explanation']) {
      expect(a.field(field).id).not.toBe(b.field(field).id);
      for (const t of [a, b]) expect(document.getElementById(t.field(field).labels[0].htmlFor)).toBe(t.field(field));
    }
    for (const key of ['investment', 'timeHorizon', 'communityBuyin', 'interventionComplexity']) expect(a.param(key).id).not.toBe(b.param(key).id);
    expect(a.toggle().getAttribute('aria-controls')).not.toBe(b.toggle().getAttribute('aria-controls'));
    await activate(b.toggle()); expect(b.questions().hidden).toBe(false); expect(a.questions().hidden).toBe(true);
    for (const t of [a, b]) {
      const log = t.host.querySelector('[data-stewardship-inquiry-log]');
      for (const attr of ['aria-labelledby', 'aria-describedby']) expect(t.host.contains(document.getElementById(log.getAttribute(attr)))).toBe(true);
    }
  });

  it('restores revealed help and a legacy saved project without moving focus or mutating the saved object', async () => {
    const origin = document.createElement('button'); document.body.appendChild(origin); origin.focus();
    const legacy = Object.freeze({ ecologicalComplex: 7, interventionComplexity: undefined, stuckRevealed: true, understood: true, log: Object.freeze([Object.freeze({ ...record(0), ic: undefined, ec: 7 })]) });
    const t = await mount(legacy); expect(document.activeElement).toBe(origin);
    expect(t.param('interventionComplexity').value).toBe('7'); expect(t.questions().hidden).toBe(false);
    expect(t.field('explanation').closest('[hidden]')).toBeNull();
    expect(t.state().stewardshipHub.stewIQ.interventionComplexity).toBeUndefined();
    expect(t.host.querySelector('[data-stewardship-inquiry-log]').textContent).toContain('intervention complexity 7/10');
    await activate(t.host.querySelector('[data-stewardship-inquiry-reset]'));
    expect(t.state().stewardshipHub.stewIQ.interventionComplexity).toBe(5);
    expect(t.state().stewardshipHub.stewIQ.log).toEqual(legacy.log); expect(t.state().stewardshipHub.stewIQ.explanation).toBe('Keep my explanation.');
    origin.remove();
  });

  it('uses translated visible field labels and disclosure names without hidden replacements', async () => {
    const translate = (key, fallback) => ({ 'stem.stewardship.hypothesis_input': 'Hypothèse de campagne', 'stem.stewardship.explanation_input': 'Explication de campagne', 'stem.stewardship.i_m_stuck_show_open_questions': 'Afficher les questions', 'stem.stewardship.hide_open_questions': 'Masquer les questions' }[key] || fallback);
    const t = await mount({}, { t: translate });
    expect(t.field('hypothesis').labels[0].textContent).toBe('Hypothèse de campagne');
    expect(t.field('explanation').labels[0].textContent).toBe('Explication de campagne');
    expect(t.toggle().textContent).toBe('Afficher les questions'); await activate(t.toggle()); expect(t.toggle().textContent).toBe('Masquer les questions');
    expect(t.toggle().hasAttribute('aria-label')).toBe(false);
  });
});
