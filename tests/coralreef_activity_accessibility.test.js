import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let TX, oldScroll;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback);
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks();
});
const q = (t, selector) => t.host.querySelector(selector);
const recall = t => q(t, '[data-practice-recall]');
const card = t => q(t, '[data-practice-recall-card]');
const heading = t => q(t, '[data-practice-recall-count]');
const answer = t => q(t, '[data-practice-recall-answer]');
const status = t => q(t, '[data-practice-recall-announcement]');
const target = t => q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const description = el => document.getElementById(el.getAttribute('aria-describedby')).textContent;
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
async function change(el, value) { await React.act(async () => { el.focus(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function mount({ ids = ['clownfish', 'blue_tang', 'cleaner_shrimp'], reduceMotion = false, labels = {} } = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesFieldNotes: { clownfish: 'Keep my note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, reduceMotion, t: (key, fallback) => labels[key] || fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(q(t, '[data-start-practice]')); await change(q(t, '[data-practice-collection-select]'), 'saved'); await click(q(t, '[data-practice-start]'));
  return t;
}
async function finish(t) {
  while (q(t, '[data-marine-practice="active"]')) {
    await click(q(t, '[data-practice-choice="' + target(t) + '"]'));
    await click(q(t, '[data-practice-next]'));
  }
  await click(recall(t).querySelector('summary'));
}

describe('accessible practice and recall transitions', () => {
  it('leaves browser and assistive modified arrows untouched while plain arrows pan', async () => {
    const t = await mount({ ids: ['clownfish'] }); await click(q(t, '[data-practice-zoom="in"]'));
    const stage = q(t, '[data-practice-picture-stage]'), picture = q(t, '[data-practice-picture-view]'), before = JSON.stringify(t.data);
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const event = new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true });
      await React.act(async () => stage.dispatchEvent(event));
      expect(event.defaultPrevented, modifier + ' ' + key).toBe(false);
      expect(picture.dataset.practicePanX).toBe('0'); expect(picture.dataset.practicePanY).toBe('0');
    }
    const plain = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    await React.act(async () => stage.dispatchEvent(plain));
    expect(plain.defaultPrevented).toBe(true); expect(picture.dataset.practicePanX).toBe('8'); expect(JSON.stringify(t.data)).toBe(before);
  });

  it('announces reveal and hide through one persistent concise status outside interactive answer controls', async () => {
    const t = await mount({ ids: ['clownfish'] }); await finish(t);
    const before = JSON.stringify(t.data), live = status(t), reveal = q(t, '[data-practice-recall-reveal]');
    expect(live.textContent).toBe(''); expect(live.getAttribute('aria-live')).toBe('polite'); expect(live.getAttribute('aria-atomic')).toBe('true');
    await click(reveal);
    expect(status(t)).toBe(live); expect(live.textContent).toBe('Revealed ' + TX.clownfish.name + '. The identifying field marks are below.');
    expect(document.activeElement).toBe(reveal); expect(answer(t).getAttribute('role')).toBe('group');
    expect(document.getElementById(answer(t).getAttribute('aria-labelledby')).textContent).toBe(TX.clownfish.name);
    const check = q(t, '[data-practice-recall-rate="remembered"]'); expect(check.closest('[role="status"]')).toBeNull();
    await click(check); expect(document.activeElement).toBe(check); expect(live.textContent).not.toContain('remembered');
    await click(reveal); expect(answer(t).hidden).toBe(true); expect(status(t)).toBe(live);
    expect(live.textContent).toBe('Field marks hidden. Try recalling this organism again.'); expect(recall(t).textContent).not.toContain(TX.clownfish.name);
    expect(JSON.stringify(t.data)).toBe(before);
  });

  it.each(['picture', 'marks', 'name'])('focuses the current permitted %s cue after card navigation without leaking a hidden identity', async mode => {
    const t = await mount(); await finish(t); const before = JSON.stringify(t.data);
    await change(q(t, '[data-practice-recall-prompt-select]'), mode);
    const stableHeading = heading(t), first = card(t).dataset.practiceRecallCard;
    Element.prototype.scrollIntoView.mockClear(); await click(q(t, '[data-practice-recall-next]'));
    const next = card(t).dataset.practiceRecallCard;
    expect(next).not.toBe(first); expect(heading(t)).toBe(stableHeading); expect(document.activeElement).toBe(stableHeading);
    expect(stableHeading.tagName).toBe('H4'); expect(stableHeading.tabIndex).toBe(-1); expect(stableHeading.textContent).toBe('Card 2 of 3');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled(); expect(status(t).textContent).toBe(''); expect(answer(t).hidden).toBe(true);
    if (mode === 'name') expect(description(stableHeading)).toBe(TX[next].name);
    else {
      expect(recall(t).textContent).not.toContain(TX[next].name);
      expect(description(stableHeading)).toBe(mode === 'marks' ? q(t, '[data-practice-recall-clue-text]').textContent : 'Which organism is this? Recall one feature you would look for on a dive.');
    }
    await click(q(t, '[data-practice-recall-previous]')); expect(card(t).dataset.practiceRecallCard).toBe(first); expect(document.activeElement).toBe(stableHeading);
    const previous = q(t, '[data-practice-recall-previous]'); await click(previous); expect(document.activeElement).toBe(previous);
    expect(JSON.stringify(t.data)).toBe(before);
  });

  it('reveals the card context for mixed order and revisits while retaining checks and saved records', async () => {
    const t = await mount(); await finish(t); const first = card(t).dataset.practiceRecallCard, before = JSON.stringify(t.data);
    await click(q(t, '[data-practice-recall-reveal]')); await click(q(t, '[data-practice-recall-rate="practice"]'));
    await click(q(t, '[data-practice-recall-order-toggle]')); expect(document.activeElement).toBe(heading(t)); expect(answer(t).hidden).toBe(true);
    await click(q(t, '[data-practice-recall-revisit]')); expect(document.activeElement).toBe(heading(t)); expect(card(t).dataset.practiceRecallCard).toBe(first);
    await click(q(t, '[data-practice-recall-reveal]')); expect(q(t, '[data-practice-recall-rate="practice"]').getAttribute('aria-pressed')).toBe('true');
    expect(JSON.stringify(t.data)).toBe(before);
  });

  it('announces an intentional new field mark without moving focus or duplicating a live clue paragraph', async () => {
    const t = await mount(); await finish(t); const before = JSON.stringify(t.data);
    await change(q(t, '[data-practice-recall-prompt-select]'), 'marks');
    const another = q(t, '[data-practice-recall-another-clue]'), live = status(t), previous = q(t, '[data-practice-recall-clue-text]').textContent;
    await click(another); const clue = q(t, '[data-practice-recall-clue-text]');
    expect(clue.textContent).not.toBe(previous); expect(clue.getAttribute('aria-live')).toBeNull();
    expect(status(t)).toBe(live); expect(live.textContent).toBe(clue.textContent); expect(document.activeElement).toBe(another);
    expect(answer(t).hidden).toBe(true); expect(recall(t).textContent).not.toContain(TX[card(t).dataset.practiceRecallCard].name);
    await click(q(t, '[data-practice-recall-next]')); expect(status(t).textContent).toBe(''); expect(document.activeElement).toBe(heading(t));
    expect(JSON.stringify(t.data)).toBe(before);
  });

  it('does not move card focus during prompt selection, self-checks, disclosure toggles or profile return', async () => {
    const t = await mount({ ids: ['clownfish'] }); await finish(t); const cardFocus = vi.spyOn(heading(t), 'focus');
    const select = q(t, '[data-practice-recall-prompt-select]'); await change(select, 'name'); expect(document.activeElement).toBe(select);
    await click(q(t, '[data-practice-recall-reveal]')); const check = q(t, '[data-practice-recall-rate="remembered"]'); await click(check); expect(document.activeElement).toBe(check);
    await click(q(t, '[data-practice-recall-study]')); await click(q(t, '[data-close-profile]'));
    expect(answer(t).hidden).toBe(false); expect(q(t, '[data-practice-recall-rate="remembered"]').getAttribute('aria-pressed')).toBe('true');
    expect(status(t).textContent).toBe('');
    const summary = recall(t).querySelector('summary'); await click(summary); await click(summary); expect(document.activeElement).toBe(summary);
    expect(cardFocus).not.toHaveBeenCalled();
  });

  it('uses immediate scrolling for an intentional card transition when reduced motion is enabled', async () => {
    const t = await mount({ reduceMotion: true }); await finish(t); Element.prototype.scrollIntoView.mockClear();
    await click(q(t, '[data-practice-recall-next]'));
    expect(document.activeElement).toBe(heading(t)); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'auto' });
  });

  it('uses translated concise reveal feedback without leaking the answer before reveal', async () => {
    const t = await mount({ ids: ['clownfish'], labels: { 'stem.coralreef.dx_recall_answer_announced': 'Scheda: {name}. Leggi i dettagli.', 'stem.coralreef.dx_recall_answer_hidden': 'Dettagli nascosti.' } }); await finish(t);
    expect(status(t).textContent).toBe(''); await click(q(t, '[data-practice-recall-reveal]')); expect(status(t).textContent).toBe('Scheda: ' + TX.clownfish.name + '. Leggi i dettagli.');
    await click(q(t, '[data-practice-recall-reveal]')); expect(status(t).textContent).toBe('Dettagli nascosti.');
  });
});
