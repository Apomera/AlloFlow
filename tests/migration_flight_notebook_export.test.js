import { Blob as NodeBlob, Buffer as NodeBuffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
let blobs;
let downloads;
let revoke;
const NativeURL = globalThis.URL;

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  if (node.props) walk(node.props.children, predicate, matches);
  return matches;
}

function notebook(seed = {}) {
  let state = { tab: 'flight3d', flightWind: -4, ...seed };
  let tree;
  const announce = vi.fn();
  const ctx = makeCtx({
    announceToSR: announce,
    update: (toolId, key, value) => { state = { ...state, [key]: value }; },
    updateMulti: (toolId, patch) => { state = { ...state, ...patch }; }
  });
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(View));
  }
  function find(predicate) { return walk(tree, predicate)[0]; }
  function action(name) { return find(node => node.props?.['data-experiment-action'] === name); }
  function edit(label, value) {
    find(node => node.type === 'textarea' && node.props['aria-label'] === label).props.onChange({ target: { value } });
    draw();
  }
  function record(wind) {
    state = { ...state, flightWind: wind };
    draw(); action('record').props.onClick(); draw();
  }
  function complete() {
    const steps = find(node => node.type === 'ol' && node.props['aria-label'] === 'Flight investigation steps');
    return walk(steps, node => node.type === 'li')[2].props['data-complete'];
  }
  draw();
  return { draw, find, action, edit, record, complete, announce, get state() { return state; }, set(patch) { state = { ...state, ...patch }; draw(); } };
}

function capture(ui, prediction = 'A tailwind will increase ground speed.') {
  ui.edit('Flight investigation prediction', prediction);
  ui.action('baseline').props.onClick(); ui.draw();
}

function parseCsv(content) {
  const text = content.replace(/^\uFEFF/, '');
  const rows = [];
  let cells = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
    else if ((char === '\r' || char === '\n') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      cells.push(cell); rows.push(cells); cells = []; cell = '';
    } else cell += char;
  }
  cells.push(cell); rows.push(cells);
  const [headers, ...values] = rows;
  return values.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
}

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  blobs = []; downloads = []; revoke = vi.fn();
  class DownloadURL extends NativeURL {
    static createObjectURL(blob) { blobs.push(blob); return 'blob:flight-notebook-' + blobs.length; }
    static revokeObjectURL(url) { revoke(url); }
  }
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('URL', DownloadURL);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    downloads.push({ filename: this.download, url: this.getAttribute('href'), attached: this.isConnected });
  });
  tool = loadTool(process.env.MIGRATION_LEARNING_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('Migration flight notebook exports and completion', () => {
  it('downloads rectangular UTF-8 CSV with raw condition values and both captured snapshots', async () => {
    const ui = notebook();
    capture(ui, 'Initial prediction');
    ui.record(8);
    ui.set({ flightSpecies: 'snow_goose' });
    ui.action('record').props.onClick(); ui.draw();
    ui.edit('Flight investigation prediction', '=1+1,"bird"\nNext line');
    ui.edit('Flight investigation evidence notes', '@SUM(1,2)\r\nA "quoted" line');
    ui.edit('Flight investigation explanation', '\t=2+2');
    const before = JSON.stringify(ui.state);
    ui.action('export-csv').props.onClick();
    expect(downloads).toEqual([{ filename: 'migration-flight-investigation.csv', url: 'blob:flight-notebook-1', attached: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blobs[0].type).toBe('text/csv;charset=utf-8');
    // Decode the bytes directly: Blob.text() follows UTF-8 decoding and can
    // consume the BOM, even when the generated download contains it correctly.
    const content = NodeBuffer.from(await blobs[0].arrayBuffer()).toString('utf8');
    expect(content.charCodeAt(0)).toBe(0xfeff);
    const rows = parseCsv(content);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ Snapshot: 'Current baseline', 'Species ID': 'canada_goose', 'Wind (m/s)': '-4', 'Ground speed (mph)': '31', 'Modeled drafting credit (%)': '22' });
    expect(rows[1]).toMatchObject({ Trial: '1', Snapshot: 'Baseline', 'Wind (m/s)': '-4', Comparison: 'Controlled comparison' });
    expect(rows[2]).toMatchObject({ Trial: '1', Snapshot: 'Trial', 'Wind (m/s)': '8', 'Ground speed (mph)': '58', 'Prediction when recorded': 'Initial prediction' });
    expect(rows[4]).toMatchObject({ Trial: '2', 'Species ID': 'snow_goose', Comparison: 'Other conditions changed' });
    expect(rows.every(row => Object.values(row).every(value => value !== undefined))).toBe(true);
    expect(rows[2]['Current prediction']).toBe('\'=1+1,"bird"\nNext line');
    expect(rows[2]['Evidence I noticed']).toBe('\'@SUM(1,2)\r\nA "quoted" line');
    expect(rows[2].Explanation).toBe('\'\t=2+2');
    expect(rows[2]['Model note']).toContain('species airspeed stays fixed');
    expect(JSON.stringify(ui.state)).toBe(before);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:flight-notebook-1');
  });

  it.each(['=1+1', '+SUM(A1)', '-SUM(A1)', '@SUM(A1)', '\t=1', '\r=1', '  =1'])('neutralizes a spreadsheet formula-like learner cell: %j', async text => {
    const ui = notebook();
    ui.edit('Flight investigation prediction', text);
    ui.action('export-csv').props.onClick();
    const row = parseCsv(await blobs[0].text())[0];
    expect(row['Current prediction']).toBe("'" + text);
    expect(row.Snapshot).toBe('Notes only');
  });

  it('escapes learner HTML and preserves notes and units in a standalone notebook', async () => {
    const ui = notebook();
    capture(ui, '<img src=x onerror="alert(1)">');
    ui.record(0);
    ui.edit('Flight investigation evidence notes', '<script>attack()</script>\nWing & wind');
    ui.edit('Flight investigation explanation', 'I revised my "prediction".');
    ui.action('export-html').props.onClick();
    expect(downloads[0].filename).toBe('migration-flight-investigation.html');
    expect(blobs[0].type).toBe('text/html;charset=utf-8');
    const html = await blobs[0].text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('script,img')).toHaveLength(0);
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(doc.body.textContent).toContain('<img src=x onerror="alert(1)">');
    expect(doc.body.textContent).toContain('<script>attack()</script>\nWing & wind');
    expect(doc.body.textContent).toContain('Ground speed (mph)');
    expect(doc.body.textContent).toContain('Wind (m/s)');
    expect(doc.body.textContent).toContain('Real flights also vary with gusts');
  });

  it('reports download failures and removes its temporary anchor', () => {
    const ui = notebook();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('Unavailable download'); });
    ui.action('export-csv').props.onClick();
    expect(ui.announce).toHaveBeenLastCalledWith('Download was blocked by this browser.');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('requires a recorded trial, evidence, and an explanation before marking record and explain complete', () => {
    const ui = notebook();
    capture(ui);
    ui.record(0);
    expect(ui.complete()).toBe('false');
    ui.edit('Flight investigation evidence notes', 'Wind changed from -4 to zero.');
    expect(ui.complete()).toBe('false');
    ui.edit('Flight investigation explanation', '  ');
    expect(ui.complete()).toBe('false');
    ui.edit('Flight investigation explanation', 'The fixed airspeed model adds wind to ground speed.');
    expect(ui.complete()).toBe('true');
    ui.edit('Flight investigation evidence notes', '  ');
    expect(ui.complete()).toBe('false');
  });

  it('restores focus to the next remaining remove control and then to Record when the final row is removed', () => {
    const ui = notebook();
    capture(ui);
    ui.record(0); ui.record(3); ui.record(5);
    document.body.innerHTML = ui.draw();
    const remove = ui.find(node => node.props?.['aria-label'] === 'Remove trial 2');
    remove.props.onClick();
    document.body.innerHTML = ui.draw();
    vi.runOnlyPendingTimers();
    expect(document.activeElement.getAttribute('aria-label')).toBe('Remove trial 2');
    expect(ui.state.flightInvestigation.trials.map(row => row.snapshot.wind)).toEqual([0, 5]);
    ui.find(node => node.props?.['aria-label'] === 'Remove trial 2').props.onClick();
    document.body.innerHTML = ui.draw(); vi.runOnlyPendingTimers();
    expect(document.activeElement.getAttribute('aria-label')).toBe('Remove trial 1');
    ui.find(node => node.props?.['aria-label'] === 'Remove trial 1').props.onClick();
    document.body.innerHTML = ui.draw(); vi.runOnlyPendingTimers();
    expect(document.activeElement.getAttribute('data-experiment-action')).toBe('record');
  });
});
