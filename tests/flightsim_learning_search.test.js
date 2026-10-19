import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest;
const search = () => host.querySelector('input[type="search"]');
const article = () => host.querySelector('.skyschool-learn-content');
const cards = () => [...host.querySelectorAll('.skyschool-learn-card')];
const fixture = () => [
  { id: 'forces', label: 'Four forces', data: [
    { title: 'Critical angle', detail: 'Angle of attack changes lift.', examples: ['Steady flight', { observation: 'A stall is about angle.' }] },
    { title: 'Horizon', detail: 'Keep the horizon in view.' },
  ] },
  { id: 'cities', label: 'World cities', data: ['São Paulo, Brazil', { name: 'Tokyo', population: 14000 }] },
];

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(seed = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'learn', learnTopic: 'forces', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: update,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function query(value) {
  await act(async () => {
    search().focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search(), value);
    search().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('SkySchool learning card search', () => {
  it('finds nested card content and filters unrelated cards from the result', () => {
    const result = api.searchFlightLearningTopics(fixture(), 'angle attack');
    expect(result.cardCount).toBe(1);
    expect(result.topics.map(topic => topic.id)).toEqual(['forces']);
    expect(result.topics[0].data[0].title).toBe('Critical angle');
    expect(api.searchFlightLearningTopics(fixture(), 'stall observation').cardCount).toBe(0);
    expect(api.searchFlightLearningTopics(fixture(), 'stall angle').cardCount).toBe(1);
  });
  it('requires all search terms within one card and its topic', () => {
    expect(api.searchFlightLearningTopics(fixture(), 'stall horizon').cardCount).toBe(0);
    expect(api.searchFlightLearningTopics(fixture(), 'forces horizon').cardCount).toBe(1);
    expect(api.searchFlightLearningTopics(fixture(), 'forces').cardCount).toBe(2);
  });
  it('normalizes accents, punctuation and case without discarding non-Latin text', () => {
    expect(api.searchFlightLearningTopics(fixture(), 'SÃO—PAULO').cardCount).toBe(1);
    expect(api.searchFlightLearningTopics(fixture(), 'sao paulo').cardCount).toBe(1);
    expect(api.normalizeFlightLearningSearch('  机翼 · الرفع ')).toBe('机翼 الرفع');
    expect(api.searchFlightLearningTopics([{ id: 'cn', label: '中国', data: ['机翼产生升力'] }], '机翼').cardCount).toBe(1);
  });
  it('searches numbers and string entries as well as object values', () => {
    expect(api.searchFlightLearningTopics(fixture(), '14000').topics[0].data[0].name).toBe('Tokyo');
    expect(api.searchFlightLearningTopics(fixture(), 'brazil').topics[0].data[0]).toContain('São Paulo');
  });
  it('preserves every original card and order when clearing a query, without mutating data', () => {
    const topics = fixture(), saved = JSON.stringify(topics);
    api.searchFlightLearningTopics(topics, 'angle');
    const result = api.searchFlightLearningTopics(topics, '   ');
    expect(result.searching).toBe(false); expect(result.cardCount).toBe(4);
    expect(result.topics[0].data).toEqual(topics[0].data);
    expect(JSON.stringify(topics)).toBe(saved);
  });
  it('treats regexp syntax as text and bounds saved queries', () => {
    expect(() => api.searchFlightLearningTopics(fixture(), '[(((.*+?')).not.toThrow();
    expect(api.searchFlightLearningTopics(fixture(), 'x'.repeat(200) + ' angle').cardCount).toBe(0);
  });
  it('shows matching production cards even when their topic label has no matching words', async () => {
    await mount(); await query('angle of attack');
    expect(document.activeElement).toBe(search());
    expect(cards().length).toBeGreaterThan(0);
    expect(cards().every(card => /angle/i.test(card.textContent) && /attack/i.test(card.textContent))).toBe(true);
    const active = host.querySelector('nav[aria-label="Learn topics"] [aria-current="page"]');
    expect(active).toBeTruthy();
    expect(article().getAttribute('data-learn-topic')).toBeTruthy();
    expect(host.querySelector('[data-learn-result-count]').textContent).toContain('Search results:');
    expect(latest.learnTopic).toBe('forces');
  });
  it('shows an honest empty state and clears back to the selected topic with search focus', async () => {
    await mount(); const original = article().getAttribute('data-learn-topic');
    article().scrollTop = 500;
    await query('not-a-real-aeronautics-term-987654321');
    expect(cards()).toHaveLength(0);
    expect(article().textContent).toContain('No matching learning cards');
    expect(article().textContent).toContain('Try another term or clear the search');
    expect(article().scrollTop).toBe(0);
    expect(host.querySelector('nav [aria-current="page"]')).toBeNull();
    expect(document.activeElement).toBe(search());
    await act(async () => host.querySelector('[data-learn-clear-search]').click());
    expect(search().value).toBe(''); expect(document.activeElement).toBe(search());
    expect(article().getAttribute('data-learn-topic')).toBe(original);
    expect(cards().length).toBeGreaterThan(0);
  });
  it('keeps user-provided query text escaped', async () => {
    await mount(); await query('<img src=x onerror=alert(1)>987654321');
    expect(article().querySelector('img')).toBeNull();
    expect(article().textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
