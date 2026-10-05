import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
});
const api = () => window.__MicrobiologyCore.resistance;
const pair = () => ({ aId: 4, bId: 9 });
function book() {
  const first = { day: 0, sensitive: 68, resistant: 12 };
  return { selectedId: 9, nextId: 20, metadata: { keep: true }, unknownImport: [null, 'Keep'], records: [
    { id: 4, evidence: { dose: 60, duration: 3, initRes: 15, prediction: 'increase', notes: 'Long original notes ' + 'a'.repeat(1800),
      history: [first, { day: 1, sensitive: 12, resistant: 12 }, { day: 2, sensitive: 0, resistant: 20 }, { day: 3, sensitive: 0, resistant: 30 }], metadata: { keep: true } },
      reviewNote: 'Long later reflection ' + 'r'.repeat(1400), metadata: { record: 'A' } },
    { id: 9, evidence: { dose: 30, duration: 8, initRes: 15, prediction: 'similar', notes: 'B original notes',
      history: [{ ...first }, { day: 1, sensitive: 10, resistant: 5 }, { day: 2, sensitive: 2, resistant: 1 }] }, reviewNote: 'B reflection', metadata: { record: 'B' } }
  ] };
}
function frozen(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}
const points = [
  { day: 0, a: { sensitive: 68, resistant: 12, totalAlive: 80, sharePct: 15 }, b: { sensitive: 68, resistant: 12, totalAlive: 80, sharePct: 15 } },
  { day: 1, a: { sensitive: 12, resistant: 12, totalAlive: 24, sharePct: 50 }, b: { sensitive: 10, resistant: 5, totalAlive: 15, sharePct: 33 } },
  { day: 2, a: { sensitive: 0, resistant: 20, totalAlive: 20, sharePct: 100 }, b: { sensitive: 2, resistant: 1, totalAlive: 3, sharePct: 33 } }
];

describe('Resistance paired history uses only observed shared evidence', () => {
  it('returns the whole observed common prefix without extending the shorter snapshot', () => {
    expect(api().comparisonHistory(book(), pair())).toEqual({ latestSharedRound: 2, points });
  });

  it('reverses the two history series when A and B are exchanged', () => {
    expect(api().comparisonHistory(book(), { aId: 9, bId: 4 })).toEqual({ latestSharedRound: 2,
      points: points.map(point => ({ day: point.day, a: point.b, b: point.a })) });
  });

  it('freezes the history, each observation, and each series count', () => {
    const result = api().comparisonHistory(book(), pair());
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.points)).toBe(true);
    for (const point of result.points) {
      expect(Object.isFrozen(point)).toBe(true); expect(Object.isFrozen(point.a)).toBe(true); expect(Object.isFrozen(point.b)).toBe(true);
    }
  });

  it('stops at a malformed history gap without inventing missing observations', () => {
    const notebook = book(); notebook.records[1].evidence.history[2].day = 4;
    expect(api().comparisonHistory(notebook, pair())).toEqual({ latestSharedRound: 1, points: points.slice(0, 2) });
  });

  it('bounds an oversized imported history to the model limit', () => {
    const notebook = book();
    for (const record of notebook.records) {
      record.evidence.duration = 30;
      record.evidence.history = Array.from({ length: 80 }, (_, day) => ({ day, sensitive: 68, resistant: 12 }));
    }
    const result = api().comparisonHistory(notebook, pair());
    expect(result.latestSharedRound).toBe(30); expect(result.points).toHaveLength(31);
    expect(result.points.map(point => point.day)).toEqual(Array.from({ length: 31 }, (_, day) => day));
  });

  it('keeps extinction count zero and its resistant share undefined', () => {
    const notebook = book(); notebook.records[1].evidence.history[2] = { day: 2, sensitive: 0, resistant: 0 };
    const result = api().comparisonHistory(notebook, pair());
    expect(result.latestSharedRound).toBe(2); expect(result.points[1]).toEqual(points[1]);
    expect(result.points[2].b).toEqual({ sensitive: 0, resistant: 0, totalAlive: 0, sharePct: null });
  });

  it('does not revive a population after an extinct imported observation', () => {
    const notebook = book(); notebook.records[1].evidence.history[1] = { day: 1, sensitive: 0, resistant: 0 };
    const result = api().comparisonHistory(notebook, pair());
    expect(result.latestSharedRound).toBe(1); expect(result.points.map(point => point.day)).toEqual([0, 1]);
    expect(result.points[1].b.sharePct).toBe(null);
  });

  it('reads frozen raw annotations and metadata without mutation or random draws', () => {
    const notebook = frozen(book()), preferences = frozen({ ...pair(), round: 0, metadata: { keep: true } });
    const before = JSON.stringify({ notebook, preferences }), random = vi.spyOn(Math, 'random');
    expect(api().comparisonHistory(notebook, preferences)).toEqual({ latestSharedRound: 2, points });
    expect(JSON.stringify({ notebook, preferences })).toBe(before); expect(random).not.toHaveBeenCalled();
  });

  it.each([{ aId: 4, bId: 4 }, { aId: null, bId: 9 }, { aId: 4, bId: 31 }, { aId: 4, bId: '9' }, {}])('requires two distinct retained original identities: %j', preferences => {
    expect(api().comparisonHistory(book(), preferences)).toBe(null);
  });

  it('does not treat a round-zero draft as a saved comparison history', () => {
    const notebook = book(); notebook.records[1].evidence.history = [notebook.records[1].evidence.history[0]];
    expect(api().comparisonHistory(notebook, pair())).toBe(null);
    expect(api().comparisonHistory(null, pair())).toBe(null);
  });
});

function seed(round = null) {
  const notebook = book();
  return { tab: 'resistance', earnedXP: 41, rootMetadata: { keep: true }, growthLab: { hypothesis: 'Other investigation' },
    resistanceNotebook: notebook, resistanceComparison: { ...pair(), round, metadata: { keep: true } },
    resistanceInvestigation: window.__MicrobiologyCore.normalizeResistanceInvestigation({ dose: 0, duration: 3, initRes: 15,
      prediction: 'similar', notes: 'Current culture notes', history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 68, resistant: 12 }] }) };
}
function mount(value = seed()) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: value, otherTool: { notes: 'Another tool' } });
    view.state = data; view.change = setData;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
const node = selector => mounted.container.querySelector(selector);
const all = selector => [...mounted.container.querySelectorAll(selector)];
const chart = kind => node('#micro-resistance-history-' + kind);
const plot = kind => node('#micro-resistance-history-' + kind + '-plot');
const readout = kind => node(`[data-resistance-history-readout="${kind}"]`);
function openComparison() {
  const details = node('#micro-resistance-comparison'); expect(details).toBeTruthy();
  if (!details.open) act(() => details.querySelector('summary').click());
  return details;
}
function chooseRound(round) {
  const select = node('#micro-resistance-compare-round'); expect(select).toBeTruthy();
  act(() => { select.value = round === null ? '' : String(round); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
const markerRounds = (kind, series) => [...plot(kind).querySelectorAll(`[data-resistance-history-marker="${series}"]`)].map(marker => Number(marker.getAttribute('data-round')));

describe('Resistance history plots and accessible observed counts', { timeout: 60000 }, () => {
  it('uses fixed zero-based count and percentage scales over the shared observed rounds', () => {
    mount(); openComparison();
    for (const [kind, max] of [['count', '80'], ['share', '100']]) {
      const svg = chart(kind); expect(svg).toBeTruthy(); expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.getAttribute('data-min')).toBe('0'); expect(svg.getAttribute('data-max')).toBe(max);
      expect(svg.getAttribute('data-last-round')).toBe('2');
      expect(svg.getAttribute('viewBox')).toBe('0 0 100 100'); expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
      expect(markerRounds(kind, 'a')).toEqual([0, 1, 2]); expect(markerRounds(kind, 'b')).toEqual([0, 1, 2]);
      expect(svg.querySelector('text')).toBe(null);
      expect(readout(kind).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
      const axes = node('#micro-resistance-history-' + kind + '-axes');
      expect([...axes.querySelectorAll('[data-resistance-history-y-label]')].map(label => Number(label.getAttribute('data-resistance-history-y-label'))))
        .toEqual([Number(max), Number(max) * .75, Number(max) * .5, Number(max) * .25, 0]);
      expect([...axes.querySelectorAll('[data-resistance-history-x-label]')].map(label => Number(label.getAttribute('data-resistance-history-x-label')))).toEqual([0, 1, 2]);
    }
    expect(chart('count').closest('figure').textContent).toMatch(/0\s*(?:–|-|to)\s*80/);
    expect(chart('share').closest('figure').textContent).toMatch(/0\s*(?:–|-|to)\s*100%/);
  });

  it('distinguishes A and B with solid circles and dashed diamonds in addition to their labels', () => {
    mount(); openComparison();
    for (const kind of ['count', 'share']) {
      const svg = chart(kind), a = svg.querySelector('[data-resistance-series="a"]'), b = svg.querySelector('[data-resistance-series="b"]');
      expect(a).toBeTruthy(); expect(b).toBeTruthy();
      expect([null, '', 'none', '0']).toContain(a.getAttribute('stroke-dasharray'));
      expect(b.getAttribute('stroke-dasharray')).toMatch(/[1-9]/);
      const aMarkers = [...plot(kind).querySelectorAll('[data-resistance-history-marker="a"]')], bMarkers = [...plot(kind).querySelectorAll('[data-resistance-history-marker="b"]')];
      expect(aMarkers).toHaveLength(3); expect(bMarkers).toHaveLength(3);
      expect(aMarkers.every(marker => marker.namespaceURI === 'http://www.w3.org/1999/xhtml' && getComputedStyle(marker).borderRadius === '50%')).toBe(true);
      expect(bMarkers.every(marker => marker.namespaceURI === 'http://www.w3.org/1999/xhtml' && /rotate\(45deg\)/.test(getComputedStyle(marker).transform))).toBe(true);
      expect(svg.closest('#micro-resistance-history').textContent).toContain('A · Evidence 4'); expect(svg.closest('#micro-resistance-history').textContent).toContain('B · Evidence 9');
    }
  });

  it.each(['count', 'share'])('gives the %s SVG a linked title and description and keeps selected numeric evidence in HTML', kind => {
    mount(); openComparison(); const svg = chart(kind), title = svg.querySelector('title'), description = svg.querySelector('desc');
    expect(svg.getAttribute('role')).toBe('img'); expect(title.textContent.trim()).not.toBe(''); expect(description.textContent.trim()).not.toBe('');
    expect(title.id).not.toBe(''); expect(description.id).not.toBe('');
    const linked = [svg.getAttribute('aria-labelledby'), svg.getAttribute('aria-describedby')].filter(Boolean).join(' ').split(/\s+/);
    expect(linked).toContain(title.id); expect(linked).toContain(description.id);
    expect(svg.contains(readout(kind))).toBe(false); expect(readout(kind).getAttribute('data-round')).toBe('2');
  });

  it.each([
    { round: 0, expected: 0, counts: [12, 12], shares: [15, 15] },
    { round: 1, expected: 1, counts: [12, 5], shares: [50, 33] },
    { round: 2, expected: 2, counts: [20, 1], shares: [100, 33] },
    { round: null, expected: 2, counts: [20, 1], shares: [100, 33] }
  ])('highlights and reads out selected round $round without changing the observed history', selected => {
    mount(seed(1)); openComparison(); chooseRound(selected.round);
    for (const kind of ['count', 'share']) {
      const svg = chart(kind);
      expect(markerRounds(kind, 'a')).toEqual([0, 1, 2]); expect(markerRounds(kind, 'b')).toEqual([0, 1, 2]);
      for (const series of ['a', 'b']) {
        const marker = plot(kind).querySelector(`[data-resistance-selected-marker="${series}"]`);
        expect(marker).toBeTruthy(); expect(marker.getAttribute('data-round')).toBe(String(selected.expected));
        expect(marker.hasAttribute('data-resistance-history-marker')).toBe(false);
      }
      expect(svg.querySelector('[data-resistance-history-guide]')).toBeTruthy();
      expect(readout(kind).getAttribute('data-round')).toBe(String(selected.expected));
      const values = node('#micro-resistance-history-' + kind + '-values'), expected = kind === 'count' ? selected.counts : selected.shares;
      expect(values.tagName.toLowerCase()).toBe('dl'); expect(values.querySelectorAll('dt')).toHaveLength(3);
      for (const [index, series] of ['a', 'b'].entries()) {
        const reading = values.querySelector(`[data-resistance-history-reading="${series}"]`);
        expect(Number(reading.getAttribute('data-value'))).toBe(expected[index]);
        expect(reading.textContent).toContain(kind === 'count' ? `${expected[index]} cells` : `${expected[index]}%`);
      }
      const difference = values.querySelector('[data-resistance-history-reading="difference"]');
      expect(Number(difference.getAttribute('data-value'))).toBe(expected[1] - expected[0]);
    }
    expect(readout('count').textContent).toMatch(new RegExp('A\\b.*\\b' + selected.counts[0] + '\\b.*B\\b.*\\b' + selected.counts[1] + '\\b', 's'));
    expect(readout('share').textContent).toContain(selected.shares[0] + '%'); expect(readout('share').textContent).toContain(selected.shares[1] + '%');
    expect(node('#micro-resistance-comparison-table caption').textContent).toContain(String(selected.expected));
  });

  it('provides all shared observed values in a five-column table within a disclosure', () => {
    mount(); openComparison(); const table = node('#micro-resistance-history-table');
    expect(table.closest('details')).toBeTruthy(); expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows.map(row => row.getAttribute('data-round'))).toEqual(['0', '1', '2']);
    expect(rows.map(row => [...row.children].map(cell => cell.textContent))).toEqual([
      ['0', '12', '12', '15%', '15%'], ['1', '12', '5', '50%', '33%'], ['2', '20', '1', '100%', '33%']
    ]);
    expect(table.querySelector('tbody tr[data-round="3"]')).toBe(null);
  });

  it('plots an extinct resistant count at zero but omits its undefined share marker and connecting segment', () => {
    const value = seed(); value.resistanceNotebook.records[1].evidence.history[2] = { day: 2, sensitive: 0, resistant: 0 };
    mount(value); openComparison();
    expect(markerRounds('count', 'b')).toEqual([0, 1, 2]); expect(markerRounds('share', 'b')).toEqual([0, 1]);
    expect(plot('share').querySelector('[data-resistance-selected-marker="b"]')).toBe(null);
    const path = chart('share').querySelector('[data-resistance-series="b"]').getAttribute('d');
    expect((path.match(/[Ll]/g) || [])).toHaveLength(1);
    expect(readout('count').textContent).toMatch(/B\b.*\b0\b/s); expect(readout('share').textContent).toMatch(/B\b.*Undefined/s);
    for (const series of ['b', 'difference']) {
      const reading = node('#micro-resistance-history-share-values').querySelector(`[data-resistance-history-reading="${series}"]`);
      expect(reading.getAttribute('data-value')).toBe('undefined'); expect(reading.textContent).toBe('Undefined');
    }
    expect([...node('#micro-resistance-history-table tbody tr[data-round="2"]').children].map(cell => cell.textContent))
      .toEqual(['2', '20', '0', '100%', 'Undefined']);
  });

  it('keeps an earlier living share visible when an extinct endpoint is saved', () => {
    const value = seed(); value.resistanceNotebook.records[1].evidence.history[2] = { day: 2, sensitive: 0, resistant: 0 };
    mount(value); openComparison(); chooseRound(1);
    expect(readout('share').textContent).toContain('50%'); expect(readout('share').textContent).toContain('33%');
    expect(plot('share').querySelector('[data-resistance-selected-marker="b"]').getAttribute('data-round')).toBe('1');
    expect(node('#micro-resistance-comparison').textContent).toContain('Ended with no survivors');
  });

  it.each([{ aId: 4, bId: 4 }, { aId: null, bId: 9 }, { aId: 4, bId: 31 }])('shows no paired history plots for unavailable comparison %j', preferences => {
    const value = seed(); value.resistanceComparison = preferences; mount(value); openComparison();
    expect(chart('count')).toBe(null); expect(chart('share')).toBe(null); expect(node('#micro-resistance-history-table')).toBe(null);
    expect(node('#micro-resistance-comparison-unavailable')).toBeTruthy();
  });

  it('restores the selected observation and complete history after JSON reload', () => {
    mount(seed(0)); openComparison(); const saved = JSON.parse(JSON.stringify(mounted.state.microbiology));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(saved); openComparison();
    expect(node('#micro-resistance-compare-round').value).toBe('0'); expect(readout('share').getAttribute('data-round')).toBe('0');
    expect(markerRounds('count', 'a')).toEqual([0, 1, 2]); expect(markerRounds('share', 'b')).toEqual([0, 1, 2]);
    expect(mounted.state.microbiology.resistanceNotebook).toBe(saved.resistanceNotebook);
    expect(mounted.state.microbiology.resistanceComparison).toBe(saved.resistanceComparison); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('renders and updates the selected guide without altering frozen raw records, live notes, random draws, or XP', () => {
    const value = frozen(seed()), random = vi.spyOn(Math, 'random'); mount(value); openComparison(); const before = mounted.state;
    chooseRound(1); const latest = mounted.state;
    expect(latest.microbiology.resistanceNotebook).toBe(before.microbiology.resistanceNotebook);
    expect(latest.microbiology.resistanceInvestigation).toBe(before.microbiology.resistanceInvestigation);
    expect(latest.microbiology.rootMetadata).toBe(before.microbiology.rootMetadata); expect(latest.otherTool).toBe(before.otherTool);
    expect(latest.microbiology.resistanceNotebook.records[0].evidence.notes.length).toBeGreaterThan(1800);
    expect(latest.microbiology.resistanceNotebook.records[0].reviewNote.length).toBeGreaterThan(1400);
    expect(node('#micro-resistance-notes').value).toBe('Current culture notes'); expect(random).not.toHaveBeenCalled();
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('states that history lines show observed model evidence rather than identifying a setting as the cause', () => {
    mount(); const details = openComparison();
    expect(details.textContent).toContain('observed'); expect(details.textContent).toContain('random teaching model');
    expect(details.textContent).toContain('does not establish which setting caused it');
  });

  it('plots a genuine zero resistant share when living sensitive cells remain', () => {
    const value = seed();
    for (const record of value.resistanceNotebook.records) {
      record.evidence.initRes = 0; record.evidence.history = [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 60, resistant: 0 }];
    }
    mount(value); openComparison();
    expect(markerRounds('share', 'a')).toEqual([0, 1]); expect(markerRounds('share', 'b')).toEqual([0, 1]);
    expect(readout('share').textContent).toContain('0%'); expect(readout('share').textContent).not.toContain('Undefined');
    expect([...node('#micro-resistance-history-table tbody tr[data-round="1"]').children].map(cell => cell.textContent))
      .toEqual(['1', '0', '0', '0%', '0%']);
  });
});
