import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act;
const hosts = [];
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
afterEach(() => { while (hosts.length) { const host = hosts.pop(); act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); } });

function mount(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  let data;
  const onSave = vi.fn(), onDraft = vi.fn(), onSnapshot = vi.fn(), onGo = vi.fn();
  function Host() {
    const state = React.useState(initial); data = state[0];
    return React.createElement(window.AlloTectonicsExplain, { data, t: (_key, fallback) => fallback, onGo,
      onSave(rec) { onSave(rec); state[1](prev => ({ ...prev, ptCER: rec })); },
      onDraft(patch) { onDraft(patch); state[1](prev => ({ ...prev, ptCERDraft: { ...(prev.ptCERDraft || prev.ptCER || {}), ...patch } })); },
      onSnapshot });
  }
  act(() => ReactDOM.render(React.createElement(Host), host));
  return { host, state: () => data, onSave, onDraft, onSnapshot, onGo };
}
const click = node => act(() => node.click());
function write(app, field, value) {
  const node = app.host.querySelector(`[data-pt-cer="${field}"]`);
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const writing = {
  claim: 'The cold sinking plate carries earthquake sources deeper.',
  evidence: 'My model recorded convergent earthquakes at five hundred kilometers and divergent earthquakes at twenty kilometers.',
  reasoning: 'The contrasting depth patterns support a connection between the sinking slab and deep earthquakes.'
};
const sample = (mode, depths) => window.__alloPtDepthTrials.capture({ mode, qlog: depths.map(z => ({ z })), rate: 5, years: 60000 });

describe('Explanation evidence and deliberate revisions', () => {
  it('shows accessible counts and preserves the writing-length gate without calling it a science grade', () => {
    const app = mount(), save = () => app.host.querySelector('[data-pt-cer-save]');
    for (const [part, length] of [['claim', 5], ['evidence', 8], ['reasoning', 7]]) write(app, part, Array(length).fill('word').join(' '));
    expect(save().disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-cer-count="reasoning"]').textContent).toContain('7 words · minimum 8');
    expect(app.host.querySelector('[data-pt-cer="reasoning"]').getAttribute('aria-describedby')).toContain('pt-cer-count-reasoning');
    write(app, 'reasoning', Array(8).fill('word').join(' '));
    expect(save().disabled).toBe(false);
    expect(app.host.querySelector('[data-pt-cer-status]').textContent).toContain('Length requirement met');
    expect(app.host.querySelector('[data-pt-cer-review]').textContent).toContain('The length check counts words');
    expect(app.onSave).not.toHaveBeenCalled(); expect(app.onSnapshot).not.toHaveBeenCalled();
  });

  it('foregrounds the depth comparison, keeps other observations available, and prevents duplicate insertion', () => {
    const app = mount({ ptDepthTrials: { convergent: sample('convergent', [20, 510]), divergent: sample('divergent', [5, 25]) } });
    const depth = app.host.querySelector('[data-pt-evidence="depths"]');
    expect(depth.closest('details')).toBeNull();
    expect(app.host.querySelector('[data-pt-evidence="hawaii"]').closest('details')).toBe(app.host.querySelector('[data-pt-evidence-supplemental]'));
    const add = depth.querySelector('button'); click(add);
    expect(app.state().ptCERDraft.evidence).toContain('510 km'); expect(app.state().ptCERDraft.evidence).toContain('25 km');
    const draft = app.state().ptCERDraft.evidence;
    expect(add.disabled).toBe(true); click(add);
    expect(app.state().ptCERDraft.evidence).toBe(draft); expect(app.onDraft).toHaveBeenCalledTimes(1);
    write(app, 'evidence', ''); expect(add.disabled).toBe(false);
    expect(app.onSave).not.toHaveBeenCalled(); expect(app.onSnapshot).not.toHaveBeenCalled();
  });

  it('quotes the qualifying force observation even when a later record is incomplete or contradicts it', () => {
    const app = mount({ ptForce: { observations: [
      { a: 'cut', vBefore: 8, vAfter: 1.5 }, { a: 'cut', vBefore: 1, vAfter: 8 },
      { a: 'continent', vBefore: 7, vAfter: 2, mountainKm: 3 }, { a: 'continent', vBefore: 6, vAfter: 2 }
    ] } });
    expect(app.host.querySelector('[data-pt-evidence="cut"]').textContent).toContain('8.0 to 1.5 cm per year');
    expect(app.host.querySelector('[data-pt-evidence="continent"]').textContent).toContain('7.0 to 2.0 cm per year');
    expect(app.host.querySelector('[data-pt-evidence="continent"]').textContent).toContain('3.0 km');
  });

  it('quotes actual stress settings and a held outcome without inferring cause from one trial', () => {
    const app = mount({ boundaryHunt: { log: [{ bt: 'transform', f: 40, fr: 80, st: 'stable' }] } });
    const card = app.host.querySelector('[data-pt-evidence="stress"]');
    expect(card.dataset.ptEvidenceHave).toBe('true');
    expect(card.textContent).toContain('stress was 40% and friction was 80%');
    expect(card.textContent).toContain('held with no slip');
    expect(card.textContent).toContain('Compare trials with one changed input');
    click(card.querySelector('button'));
    expect(app.state().ptCERDraft.evidence).toContain('one recorded transform model trial');
    expect(app.onSave).not.toHaveBeenCalled();
  });

  it('does not offer a stress sentence when stored settings cannot support it', () => {
    const app = mount({ boundaryHunt: { log: [{ bt: 'convergent', st: 'thrust', f: Infinity, fr: 40 }] } });
    const card = app.host.querySelector('[data-pt-evidence="stress"]');
    expect(card.dataset.ptEvidenceHave).toBe('false');
    expect(card.querySelector('[data-pt-evidence-add]')).toBeNull();
  });

  it('keeps edits separate from the last submission and saves a revision only on an explicit click', () => {
    const submitted = { ...writing, savedAt: 100, band: '6-8' };
    const app = mount({ ptCER: submitted });
    const save = () => app.host.querySelector('[data-pt-cer-save]');
    expect(save().disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-cer-status]').textContent).toContain('Saved.');
    write(app, 'claim', 'My revised claim explains the two earthquake depth patterns.');
    expect(app.state().ptCER).toEqual(submitted);
    expect(app.host.querySelector('[data-pt-cer-saved-version]').textContent).toContain(writing.claim);
    expect(app.host.querySelector('[data-pt-cer-revision-note]').textContent).toContain('last saved version stays unchanged');
    expect(app.onSave).not.toHaveBeenCalled(); expect(app.onSnapshot).not.toHaveBeenCalled();
    write(app, 'claim', writing.claim);
    expect(save().disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-cer-status]').textContent).toContain('Saved.');
    write(app, 'claim', 'My revised claim explains the two earthquake depth patterns.');
    click(save());
    expect(app.onSave).toHaveBeenCalledTimes(1); expect(app.onSnapshot).toHaveBeenCalledTimes(1);
    expect(app.state().ptCER.claim).toContain('My revised claim');
    expect(submitted.claim).toBe(writing.claim);
    expect(save().disabled).toBe(true); click(save());
    expect(app.onSnapshot).toHaveBeenCalledTimes(1);
  });
});
