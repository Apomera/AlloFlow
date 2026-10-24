import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
async function type(el, value) {
  expect(el).toBeTruthy(); el.focus();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const button = (t, text) => [...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const reflection = t => t.host.querySelector('[data-practice-reflection-input]');
const target = t => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const records = t => JSON.stringify({ notes: t.data.speciesFieldNotes, bookmarks: t.data.speciesBookmarks, log: t.data.speciesLog });
async function mount(ids = ['clownfish']) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesFieldNotes: { clownfish: 'Persistent profile note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; update = setState; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; }, async patch(values) { await React.act(async () => update(before => ({ ...before, coralReef: { ...before.coralReef, ...values } }))); } };
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]'));
  return t;
}
async function openReflection(t) { await click(t.host.querySelector('[data-practice-written-reflection] summary')); return reflection(t); }

describe('optional after-answer identification reflection', () => {
  it('is absent before answering, bounds escaped writing, and keeps it out of grades and saved field records', async () => {
    const t = await mount(), before = records(t);
    expect(reflection(t)).toBeNull();
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    const input = await openReflection(t), draft = '<img src=x onerror=alert(1)>\n' + 'blue '.repeat(60);
    expect(input.labels[0].textContent).toBe('A detail to remember');
    expect(input.maxLength).toBe(240);
    expect(document.getElementById(input.getAttribute('aria-describedby').split(' ')[1]).textContent).toContain('not graded or added to your profile Field notes');
    await type(input, draft);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe(draft.slice(0, 240));
    expect(t.host.querySelector('.cr-dxp-note-count').textContent).toBe('240 of 240 characters');
    await click(t.host.querySelector('[data-practice-next]'));
    const review = t.host.querySelector('[data-practice-review-reflection="clownfish"]');
    expect(review.textContent).toBe(draft.slice(0, 240)); expect(review.querySelector('img')).toBeNull();
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, skipped: 0, hinted: 0 });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/reflection|onerror|blue/);
    expect(records(t)).toBe(before);
  });

  it('keeps the first observation and new reflection separate through a wrong-guess comparison and profile return', async () => {
    const t = await mount(), first = 'I notice a short body.', later = '  Next time I will count the white bands.\nLook for the dark edges.  ';
    await type(t.host.querySelector('[data-practice-observation-input]'), first);
    const wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== 'clownfish');
    await click(wrong); await openReflection(t); await type(reflection(t), later);
    await click(t.host.querySelector('[data-practice-compare-toggle]'));
    await click(t.host.querySelector('[data-practice-detail="2"]'));
    expect(reflection(t).value).toBe(later);
    await t.patch({ guideSpeciesId: 'blue_tang' });
    await click(t.host.querySelector('[data-close-profile]'));
    expect(reflection(t).value).toBe(later);
    expect(t.host.querySelector('[data-practice-observation-feedback]').textContent).toBe(first);
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-review-observation="clownfish"]').textContent).toBe(first);
    expect(t.host.querySelector('[data-practice-review-reflection="clownfish"]').textContent).toBe(later);
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 0, skipped: 0, hinted: 0 });
  });

  it('keeps each reflection with its organism and preserves the first round through focused retries without pre-filling answers', async () => {
    const t = await mount(['clownfish', 'blue_tang']), before = records(t), original = [];
    for (let n = 0; n < 2; n++) {
      const id = target(t), text = `Remember ${id}'s shape.`; original.push({ id, text });
      expect(reflection(t)).toBeNull();
      await click(t.host.querySelector('[data-practice-skip]'));
      await openReflection(t); expect(reflection(t).value).toBe('');
      await type(reflection(t), text);
      await click(t.host.querySelector('[data-practice-next]'));
    }
    for (const { id, text } of original) expect(t.host.querySelector(`[data-practice-review-reflection="${id}"]`).textContent).toBe(text);
    await click(t.host.querySelector('[data-practice-second-look]'));
    for (let n = 0; n < 2; n++) {
      const id = target(t);
      await click(t.host.querySelector(`[data-practice-choice="${id}"]`));
      await openReflection(t); expect(reflection(t).value).toBe('');
      if (n === 0) await type(reflection(t), 'I recognized the outline this time.');
      await click(t.host.querySelector('[data-practice-next]'));
    }
    expect(t.host.querySelectorAll('[data-practice-review-reflection]')).toHaveLength(1);
    for (const { id, text } of original) expect(t.host.querySelector(`[data-practice-earlier-reflection="${id}"]`).textContent).toBe(text);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, correct: 2, answered: 2, last: { total: 2, correct: 2, hinted: 0 } });
    expect(records(t)).toBe(before);
  });

  it('allows clearing a draft and omits empty reflections from reviews and fresh practice sessions', async () => {
    const t = await mount();
    await click(t.host.querySelector('[data-practice-skip]'));
    await openReflection(t); await type(reflection(t), 'A temporary thought'); await type(reflection(t), '   ');
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-review-reflection]')).toBeNull();
    await click(button(t, 'Back to the field guide'));
    await click(t.host.querySelector('[data-start-practice]'));
    await click(t.host.querySelector('[data-practice-start]'));
    await click(t.host.querySelector('[data-practice-skip]'));
    await openReflection(t); expect(reflection(t).value).toBe('');
  });
});
