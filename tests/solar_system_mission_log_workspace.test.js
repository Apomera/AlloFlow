import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DEPLOY_LABEL = 'Deploy rover or probe on selected planet';
const KINDS = ['deployment', 'observation', 'export', 'scan', 'photo', 'traverse', 'milestone', 'other'];
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
const records = count => Array.from({ length: count }, (_, index) => ({ text: 'Activity ' + index, time: 'saved-' + index, kind: 'observation', world: 'Mars' }));

function retainedTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-mission-log'] || node.props['aria-label'] === DEPLOY_LABEL) { retained.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, retained);
}

// Exercise production controls and ref callbacks with persistent React refs.
// Commit only the log and real deployment control; unrelated 3D effects stay off.
function renderLog(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, showLog: true, missionLog: [], journalEntries: [], ...seed } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), toast = vi.fn();
  let callbacks, cursor, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, useEffect() {}, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-log-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref }); return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); cursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, awardXP: award, addToast: toast, React: callbackReact }, store);
      const set = ctx.setToolData; ctx.setToolData = updater => { writes++; set(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => retainedTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.logTestCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get root() { return document.querySelector('[data-solar-mission-log]'); },
    get toggle() { return document.querySelector('[data-log-toggle]'); },
    get content() { return document.getElementById('solar-mission-log-content'); },
    get search() { return document.getElementById('solar-mission-log-search'); },
    get kind() { return document.getElementById('solar-mission-log-kind'); },
    get order() { return document.getElementById('solar-mission-log-order'); },
    get clear() { return document.querySelector('[data-log-clear]'); },
    get more() { return document.querySelector('[data-log-more]'); },
    get export() { return document.querySelector('[data-log-export]'); },
    get list() { return document.querySelector('[data-log-list]'); },
    get status() { return document.querySelector('[data-log-status]'); },
    get heading() { return document.getElementById('solar-mission-log-results-title'); },
    get deploy() { return document.querySelector('button[aria-label="' + DEPLOY_LABEL + '"]'); },
    entries() { return [...document.querySelectorAll('li[data-log-entry]')]; },
    texts() { return this.entries().map(node => node.querySelector('[data-log-text]').textContent); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    hook: config.questHooks.find(hook => hook.id === 'deploy_rover'),
    props, event, click, change, commit, render, award, toast,
  };
}

function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }
function captureDownload() {
  const blobs = [], links = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options?.type; } });
  vi.stubGlobal('URL', Object.assign(class extends URL {}, {
    createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:solar-mission-log-test'; }), revokeObjectURL: vi.fn(),
  }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { links.push({ href: this.href, download: this.download }); });
  return { blobs, links, text() { expect(blobs).toHaveLength(1); return blobs[0].parts.join('').replace(/^\uFEFF/, ''); } };
}
function csvRows(csv) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (char === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

describe('Solar System Mission Log workspace', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T15:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('provides labeled native controls and a persistent disclosure target without render writes', () => {
    const env = renderLog(); expect(env.root).toBeTruthy(); expect(env.toggle.type).toBe('button');
    expect(env.toggle.getAttribute('aria-expanded')).toBe('true'); expect(env.toggle.getAttribute('aria-controls')).toBe('solar-mission-log-content');
    expect(env.content.hidden).toBe(false); expect(env.heading.tagName).toBe('H5'); expect(env.heading.tabIndex).toBe(-1);
    for (const control of [env.search, env.kind, env.order]) expect(control.labels.length).toBeGreaterThan(0);
    expect(env.kind.tagName).toBe('SELECT'); expect(env.order.tagName).toBe('SELECT'); expect(env.entries()).toHaveLength(0);
    expect(env.status.textContent).toBe('Showing 0 of 0 matching activities'); expect(env.export.disabled).toBe(true);
    env.render(); expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled();
    env.click(env.toggle); expect(env.content.hidden).toBe(true); expect(env.toggle.getAttribute('aria-expanded')).toBe('false');
    env.click(env.toggle); expect(env.content.hidden).toBe(false); expect(env.state.showLog).toBe(true);
  });

  it('projects readable legacy entries without changing raw records or inventing calendar dates', () => {
    const raw = ['Plain legacy note', { text: 'Original text', time: '11:04 PM', extra: { keep: true } },
      { title: 'Cloud layers', detail: 'A second line', time: 'last night' }, { title: 'Title only' },
      { text: 'Known observation', kind: 'observation', world: 'Mars', timestamp: Date.now(), time: 'legacy clock' },
      null, false, 7, {}, { text: {} }, { title: [], detail: {} }, { text: '   ' }];
    const original = structuredClone(raw), env = renderLog({ missionLog: raw });
    expect(env.texts()).toEqual(['Plain legacy note', 'Original text', 'Cloud layers\nA second line', 'Title only', 'Known observation']);
    expect(env.list.tagName).toMatch(/^(UL|OL)$/); expect(env.status.textContent).toBe('Showing 5 of 5 matching activities');
    const entries = env.entries(), time = entries[1].querySelector('time[data-log-time]');
    expect(time.textContent).toBe('11:04 PM'); expect(time.hasAttribute('datetime')).toBe(false);
    expect(entries[2].querySelector('time[data-log-time]').textContent).toBe('last night');
    expect(entries[4].querySelector('time[data-log-time]').getAttribute('datetime')).toBe('2026-10-09T15:16:17.123Z');
    expect(entries[0].querySelector('[data-log-kind]').textContent).toBe('Other activity');
    expect(entries[4].querySelector('[data-log-world]').textContent).toBe('Mars');
    env.render(); expect(env.state.missionLog).toBe(raw); expect(raw).toEqual(original); expect(env.writes).toBe(0);
  });

  it('safely displays malformed saved collections and preferences without repairing them during render', () => {
    for (const missionLog of [null, false, 5, 'legacy', { length: 3 }]) {
      const env = renderLog({ missionLog, missionLogQuery: {}, missionLogKind: 'constructor', missionLogOrder: 'sideways', missionLogLimit: -5 });
      expect(env.entries()).toHaveLength(0); expect(env.search.value).toBe(''); expect(env.kind.value).toBe('all'); expect(env.order.value).toBe('newest');
      expect(env.state.missionLog).toBe(missionLog); expect(env.state.missionLogKind).toBe('constructor'); expect(env.writes).toBe(0);
      expect(env.hook.check(env.state)).toBe(false);
    }
  });

  it('matches every normalized search word across details, activity label, and world', () => {
    const raw = [
      { text: 'Ｆｒｏｓｔ detected in crater', kind: 'observation', world: 'Ｍａｒｓ' },
      { text: 'Frost seen in clouds', kind: 'photo', world: 'Mars' },
      { text: 'Crater photographed', kind: 'observation', world: 'Venus' },
    ];
    const env = renderLog({ missionLog: raw }); env.change(env.search, '  MARS   observation frost  ');
    expect(env.texts()).toEqual(['Ｆｒｏｓｔ detected in crater']); expect(env.status.textContent).toBe('Showing 1 of 1 matching activities');
    expect(env.state.missionLogQuery).toBe('  MARS   observation frost  '); expect(env.state.missionLog).toBe(raw);
    env.change(env.search, 'frost crater missing'); expect(env.entries()).toHaveLength(0); expect(env.export.disabled).toBe(true);
    expect(env.award).not.toHaveBeenCalled();
  });

  it('filters validated activity kinds and treats untyped or unknown legacy activity as Other', () => {
    const raw = [...KINDS.map(kind => ({ text: kind + ' details', kind, world: 'Earth' })), 'Untyped legacy',
      { text: 'Unknown activity', kind: 'constructor' }, { text: 'Deployment mentioned in prose' }];
    const env = renderLog({ missionLog: raw, missionLogLimit: 20 });
    expect([...env.kind.options].map(option => option.value)).toEqual(['all', ...KINDS]);
    for (const kind of KINDS.filter(kind => kind !== 'other')) {
      env.change(env.kind, kind); expect(env.texts()).toEqual([kind + ' details']); expect(env.state.missionLogKind).toBe(kind);
    }
    env.change(env.kind, 'other'); expect(env.texts()).toEqual(['other details', 'Untyped legacy', 'Unknown activity', 'Deployment mentioned in prose']);
    expect(env.state.missionLog).toBe(raw);
  });

  it('orders by saved position instead of sorting ambiguous clock strings or timestamps', () => {
    const raw = [{ text: 'First saved', time: '01:00', timestamp: 1 }, { text: 'Second saved', time: '23:59', timestamp: Date.now() },
      { text: 'Third saved', time: 'yesterday' }];
    const env = renderLog({ missionLog: raw }); expect(env.texts()).toEqual(['First saved', 'Second saved', 'Third saved']);
    env.change(env.order, 'oldest'); expect(env.texts()).toEqual(['Third saved', 'Second saved', 'First saved']); expect(env.state.missionLogOrder).toBe('oldest');
    const restored = renderLog(env.state); expect(restored.texts()).toEqual(['Third saved', 'Second saved', 'First saved']);
    expect(restored.state.missionLog).toBe(raw); expect(restored.writes).toBe(0);
  });

  it('reveals five more rows, focuses the first new committed entry once, and restores the saved limit', () => {
    const env = renderLog({ missionLog: records(17) }); expect(env.entries()).toHaveLength(5); expect(env.state.missionLogLimit).toBeUndefined();
    env.click(env.more); expect(env.entries()).toHaveLength(10); expect(env.state.missionLogLimit).toBe(10);
    const first = env.entries()[5], focus = focusSpy(first), parent = first.parentNode;
    expect(first.tabIndex).toBe(-1); expect(first.dataset.logEntry).toBe('5'); env.commit(env.search); env.commit(env.heading);
    env.commit(first, null); first.remove(); env.commit(first); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(first); env.commit(first); env.commit(first); expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(first);
    expect(first.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    env.click(env.more); expect(env.entries()).toHaveLength(15); env.click(env.more); expect(env.entries()).toHaveLength(17);
    expect(env.state.missionLogLimit).toBe(20); expect(env.status.textContent).toBe('Showing 17 of 17 matching activities');
    expect(env.more === null || env.more.disabled).toBe(true);
    const finalTarget = env.entries()[15], finalFocus = focusSpy(finalTarget); env.commit(finalTarget); env.commit(finalTarget); expect(finalFocus).toHaveBeenCalledOnce();
    const restored = renderLog(env.state); expect(restored.entries()).toHaveLength(17); expect(restored.writes).toBe(0);
    const restoredFocus = focusSpy(restored.entries()[15]); restored.commit(restored.entries()[15]); expect(restoredFocus).not.toHaveBeenCalled();
  });

  it('resets paging for search, kind, and order changes while clear preserves the selected order', () => {
    const raw = records(16), env = renderLog({ missionLog: raw, missionLogLimit: 15 });
    env.change(env.search, 'Activity'); expect(env.state.missionLogLimit).toBe(5); env.click(env.more);
    env.change(env.kind, 'observation'); expect(env.state.missionLogLimit).toBe(5); env.click(env.more);
    env.change(env.order, 'oldest'); expect(env.state.missionLogLimit).toBe(5); env.click(env.more);
    env.click(env.clear); expect(env.search.value).toBe(''); expect(env.kind.value).toBe('all'); expect(env.order.value).toBe('oldest');
    expect(env.state.missionLogQuery).toBe(''); expect(env.state.missionLogKind).toBe('all'); expect(env.state.missionLogLimit).toBe(5);
    expect(env.texts()).toEqual(['Activity 15', 'Activity 14', 'Activity 13', 'Activity 12', 'Activity 11']); expect(env.state.missionLog).toBe(raw);
    const focus = focusSpy(env.heading); env.commit(env.heading); env.commit(env.heading); expect(focus).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(env.heading); expect(env.award).not.toHaveBeenCalled();
  });

  it('does not re-arm stale Show more focus after a filter change', () => {
    const env = renderLog({ missionLog: records(12) });
    const staleMore = env.props(env.more).onClick;
    env.change(env.order, 'oldest'); const before = env.state;
    staleMore(); env.render(); expect(env.state).toBe(before); expect(env.entries()).toHaveLength(5);
    for (const row of env.entries()) { const focus = focusSpy(row); env.commit(row); expect(focus).not.toHaveBeenCalled(); }
  });

  it('focuses search only after an opening request commits to a connected input', () => {
    const env = renderLog({ showLog: false }); env.click(env.toggle);
    const search = env.search, parent = search.parentNode, ref = env.props(search).ref, focus = focusSpy(search);
    env.commit(search, null); search.remove(); ref(search); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(search); ref(search); ref(search); expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(search);
    env.click(env.toggle); env.click(env.toggle); const old = env.search, oldRef = env.props(old).ref, oldFocus = focusSpy(old);
    env.props(env.toggle).onClick(env.event(env.toggle)); oldRef(old); expect(oldFocus).not.toHaveBeenCalled();
  });

  it('does not focus on restore or let a disconnected or collapsed result consume clear focus', () => {
    const env = renderLog({ missionLog: records(3), missionLogQuery: 'Activity', missionLogKind: 'observation' });
    const initialFocus = focusSpy(env.search); env.commit(env.search); expect(initialFocus).not.toHaveBeenCalled();
    env.click(env.clear); const heading = env.heading, parent = heading.parentNode, ref = env.props(heading).ref, focus = focusSpy(heading);
    env.commit(heading, null); heading.remove(); ref(heading); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(heading); ref(heading); ref(heading); expect(focus).toHaveBeenCalledOnce();
    env.change(env.search, 'Activity'); env.click(env.clear); const next = env.heading, nextRef = env.props(next).ref, nextFocus = focusSpy(next);
    env.props(env.toggle).onClick(env.event(env.toggle)); nextRef(next); expect(nextFocus).not.toHaveBeenCalled();
    for (const change of ['search', 'kind', 'order', 'hide']) {
      const paged = renderLog({ missionLog: records(12) }); paged.click(paged.more);
      const row = paged.entries()[5], rowRef = paged.props(row).ref, rowFocus = focusSpy(row);
      if (change === 'hide') paged.props(paged.toggle).onClick(paged.event(paged.toggle));
      else paged.props(paged[change]).onChange(paged.event(paged[change], { search: 'Activity', kind: 'observation', order: 'oldest' }[change]));
      rowRef(row); expect(rowFocus).not.toHaveBeenCalled();
    }
  });

  it('appends rapid real deployments against current state with unique metadata and preserved concurrent work', () => {
    const env = renderLog({ viewTab: 'surface' }), deploy = env.props(env.deploy).onClick;
    const latest = { text: 'Arrived between render and click', time: '12:45' }, journal = [{ observation: 'Concurrent notes' }];
    env.patch({ missionLog: [latest], journalEntries: journal, missionLogQuery: 'saved filter', compare1: 'Mars' });
    deploy(); deploy();
    expect(env.state.missionLog).toHaveLength(3); expect(env.state.missionLog[2]).toBe(latest);
    const [second, first] = env.state.missionLog;
    for (const entry of [first, second]) {
      expect(entry.text).toContain('Deployed'); expect(entry.text).toContain('Earth'); expect(entry.time).toEqual(expect.any(String));
      expect(entry.timestamp).toBe(Date.now()); expect(entry.id).toEqual(expect.any(String)); expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.kind).toBe('deployment'); expect(entry.world).toBe('Earth');
    }
    expect(second.id).not.toBe(first.id); expect(env.state.solarVehicleDeployed).toBe(true); expect(env.state.journalEntries).toBe(journal);
    expect(env.state.missionLogQuery).toBe('saved filter'); expect(env.state.compare1).toBe('Mars');
    env.patch({ viewTab: 'overview', missionLogQuery: '' }); env.render();
    expect(env.entries()[0].querySelector('time[data-log-time]').getAttribute('datetime')).toBe('2026-10-09T15:16:17.123Z');
  });

  it('caps real appends at twenty while keeping legacy values verbatim within the retained window', () => {
    const legacy = ['Raw string', null, { title: 'Unmigrated', detail: 'Keep me', extra: [1, 2] }, ...records(20)];
    const env = renderLog({ viewTab: 'surface', missionLog: legacy }), deploy = env.props(env.deploy).onClick;
    deploy(); expect(env.state.missionLog).toHaveLength(20); expect(env.state.missionLog.slice(1)).toEqual(legacy.slice(0, 19));
    expect(env.state.missionLog[3]).toBe(legacy[2]); expect(legacy).toHaveLength(23);
    deploy(); expect(env.state.missionLog).toHaveLength(20); expect(env.state.missionLog.slice(2)).toEqual(legacy.slice(0, 18));
    expect(env.state.missionLog[0].kind).toBe('deployment'); expect(env.state.missionLog[1].kind).toBe('deployment');
  });

  it('recognizes deployment evidence without mistaking arbitrary logs or malformed records for a quest completion', () => {
    const env = renderLog();
    for (const missionLog of [[], ['Observed Mars'], [{ text: 'Exported notes', kind: 'export' }], [{ text: 'Please deploy a rover on Mars' }],
      [{ text: 'Observation: Deployed rover on Mars' }], [{ kind: 'deployment' }], [{ text: ' ', kind: 'deployment' }], [{ text: {}, kind: 'deployment' }]]) {
      expect(env.hook.check({ missionLog })).toBe(false); expect(env.hook.progress({ missionLog })).toBe('Not yet');
    }
    for (const entry of [{ text: 'Vehicle started', kind: 'deployment' }, '🚀 Deployed rover on Mars',
      { text: '🚀 Deployed atmospheric probe on Jupiter' }, { text: '🚀 Deployed deep-sea submersible on Earth' }, { text: 'Deployed rover on Mars' }]) {
      expect(env.hook.check({ missionLog: [entry] })).toBe(true); expect(env.hook.progress({ missionLog: [entry] })).toBe('Done');
    }
    for (const marker of [1, 'true', {}, false]) expect(env.hook.check({ solarVehicleDeployed: marker, missionLog: [] })).toBe(false);
    expect(env.hook.check({ solarVehicleDeployed: true, missionLog: [] })).toBe(true);
  });

  it('retains the earned deployment quest when newer non-deployment history replaces its visible evidence', () => {
    const env = renderLog({ viewTab: 'surface' }); env.props(env.deploy).onClick(); expect(env.state.solarVehicleDeployed).toBe(true);
    const subsequent = records(20); env.patch({ missionLog: subsequent, viewTab: 'overview' }); env.render();
    expect(env.hook.check(env.state)).toBe(true); expect(env.hook.progress(env.state)).toBe('Done');
    env.change(env.search, 'Activity'); env.click(env.toggle); env.click(env.toggle);
    expect(env.state.solarVehicleDeployed).toBe(true); expect(env.state.missionLog).toBe(subsequent);
    const restored = renderLog(env.state); expect(restored.hook.check(restored.state)).toBe(true); expect(restored.writes).toBe(0);
  });

  it('exports all filtered matches in selected order even when only five are displayed without changing saved work', () => {
    const raw = [...records(7), { text: 'Excluded activity', kind: 'photo', world: 'Venus' }];
    const env = renderLog({ missionLog: raw, missionLogQuery: 'Mars', missionLogKind: 'observation', missionLogOrder: 'oldest' });
    expect(env.entries()).toHaveLength(5); expect(env.status.textContent).toBe('Showing 5 of 7 matching activities');
    const download = captureDownload(), state = env.state, writes = env.writes; env.props(env.export).onClick(env.event(env.export));
    const rows = csvRows(download.text()); expect(rows[0]).toEqual(['Time', 'Activity', 'World', 'Details']); expect(rows).toHaveLength(8);
    expect(rows.slice(1).map(row => row[3])).toEqual(['Activity 6', 'Activity 5', 'Activity 4', 'Activity 3', 'Activity 2', 'Activity 1', 'Activity 0']);
    expect(rows.slice(1).every(row => row[1] === 'Observation' && row[2] === 'Mars')).toBe(true);
    expect(download.links).toHaveLength(1); expect(download.links[0].download).toMatch(/\.csv$/); expect(download.blobs[0].type).toContain('text/csv');
    expect(env.state).toBe(state); expect(env.writes).toBe(writes); expect(env.state.missionLog).toBe(raw); expect(env.award).not.toHaveBeenCalled();
  });

  it('escapes CSV quotes and line breaks, guards formula cells, and uses ISO time only when a timestamp is available', () => {
    const raw = [{ text: 'A "quoted", observation\nwith another line', kind: 'observation', world: 'Mars', time: 'local clock', timestamp: Date.now() },
      { text: '=HYPERLINK("https://example.invalid")', kind: 'other', world: '+SUM(1,2)', time: '@clock' },
      { title: '-Dangerous title', detail: 'Second line', kind: 'scan', world: 'Earth', time: '23:50 legacy' },
      { text: '\t=1+1', kind: 'other', world: 'Earth', time: 'saved clock' }];
    const env = renderLog({ missionLog: raw }), download = captureDownload(), state = env.state;
    env.props(env.export).onClick(env.event(env.export)); const csv = download.text(), rows = csvRows(csv);
    expect(rows[1]).toEqual(['2026-10-09T15:16:17.123Z', 'Observation', 'Mars', 'A "quoted", observation\nwith another line']);
    expect(csv).toContain('""quoted""'); expect(rows[2]).toEqual(["'@clock", 'Other activity', "'+SUM(1,2)", '\'=HYPERLINK("https://example.invalid")']);
    expect(rows[3]).toEqual(['23:50 legacy', 'Scan', 'Earth', "'-Dangerous title\nSecond line"]);
    expect(rows[4][3].startsWith("'")).toBe(true); expect(rows[4][3]).toContain('=1+1');
    expect(env.state).toBe(state); expect(env.state.missionLog).toBe(raw); expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled();
  });
});
