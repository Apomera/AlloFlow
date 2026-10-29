import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
});
afterEach(async () => {
  while (mounted.length) {
    const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove();
  }
});
const q = (t, selector) => t.host.querySelector(selector);
const named = (t, text) => [...t.host.querySelectorAll('button')].find(button => button.textContent.trim() === text);
const learnerWork = t => JSON.stringify([t.data.speciesBookmarks, t.data.speciesFieldNotes, t.data.speciesLog, t.data.speciesPractice]);
async function click(element) {
  expect(element, 'control exists').toBeTruthy();
  await React.act(async () => { element.focus(); element.click(); await new Promise(resolve => setTimeout(resolve, 35)); });
}
async function select(element, value) {
  await React.act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function mount() {
  let data = { coralReef: {
    section: 'guide', guideFilter: 'saved', guideGroupFilter: 'fish',
    speciesBookmarks: { clownfish: true }, speciesFieldNotes: { clownfish: 'Three pale bands.' },
    speciesLog: { green_turtle: { firstSeen: 1 } }
  } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    return cfg.render({ React, toolData: state, setToolData: setState, reduceMotion: true, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}

describe('practice profiles avoid observation exits that discard the current learning visit', () => {
  it('keeps an unfinished pair-practice answer while studying its profile and portrait', async () => {
    const t = await mount(), before = learnerWork(t);
    await click(q(t, '[data-guide-open-connections]'));
    await click(q(t, '[data-connection-compare="clownfish-anemone"]'));
    await click(q(t, '[data-practice-comparison-pair]'));
    await click(q(t, '[data-practice-start]'));
    await click(q(t, '[data-practice-skip]'));
    const feedback = q(t, '[data-practice-feedback]').textContent;
    const choices = [...t.host.querySelectorAll('[data-practice-choice]')].map(button => button.dataset.practiceChoice);
    await click(named(t, 'Study profile'));
    expect(q(t, '[data-close-profile]').textContent).toBe('Back to practice');
    expect(q(t, '[data-observe-species]')).toBeNull();
    await click(q(t, '[data-open-study]'));
    expect(q(t, '[data-species-study]')).toBeTruthy();
    expect(q(t, '[data-study-observe]')).toBeNull();
    await click(q(t, '[data-close-study]'));
    await click(q(t, '[data-close-profile]'));
    expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback);
    expect([...t.host.querySelectorAll('[data-practice-choice]')].map(button => button.dataset.practiceChoice)).toEqual(choices);
    expect(learnerWork(t)).toBe(before);
  });

  it('retains a chosen field study and its preparation controls through a profile visit', async () => {
    const t = await mount(), before = learnerWork(t);
    await click(q(t, '[data-start-practice]'));
    const scope = q(t, '[data-practice-collection-select]');
    const studyId = scope.querySelector('optgroup option').value;
    await select(scope, studyId);
    await click(q(t, '[data-study-cover-names]'));
    const profileButton = q(t, '[data-practice-study-profile]'), id = profileButton.dataset.practiceStudyProfile;
    await click(profileButton);
    expect(q(t, '[data-observe-species]')).toBeNull();
    await click(q(t, '[data-open-study]'));
    expect(q(t, '[data-species-study]')).toBeTruthy();
    expect(q(t, '[data-study-observe]')).toBeNull();
    await click(q(t, '[data-close-study]'));
    await click(q(t, '[data-close-profile]'));
    expect(q(t, '[data-marine-practice="setup"]')).toBeTruthy();
    expect(q(t, '[data-practice-collection-select]').value).toBe(studyId);
    expect(q(t, '[data-study-cover-names]').checked).toBe(true);
    expect(document.activeElement).toBe(q(t, '[data-practice-study-profile="' + id + '"]'));
    expect(learnerWork(t)).toBe(before);
  });
});
