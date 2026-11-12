import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane robust: what Road Ready prints and exports.
// The on-screen logbook already says simulator time does not count toward Maine's 70 hours of
// supervised driving. Three exports said the opposite:
//   - Export Journal: "This log can be used as supporting evidence for Maine's 70-hour supervised
//     driving requirement when paired with a parent/guardian signature."
//   - Export Full Logbook: "Total supervised hours: N"
//   - Print log: "I confirm that I supervised the practice sessions listed above." (simulator sessions)
// Source for the rule: Maine BMV, license age restrictions
// (https://www.maine.gov/sos/bmv/driver-licenses-and-ids/): under 21, 70 hours of practice driving
// including 10 at night, with a supervising driver who is at least 20 and licensed for two years.
// Also: the print line read `j.score`, which nothing writes, so every session printed "score –";
// and the logbook file name used the UTC date (tomorrow's date in the evening).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const SRC = readFileSync(TOOL, 'utf8');
let H, React, ReactDOMClient;
beforeAll(async () => {
  H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = H);
});

let mounted = [];
let files = [];
let prevSelHub;
async function mount(roadReady) {
  H.resetStemLab();
  const config = H.loadTool(TOOL, 'roadReady');
  const state = { toolData: { roadReady } };
  const toasts = [];
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = H.makeCtx({
      toolData,
      addToast: (msg) => { toasts.push(String(msg)); },
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state, toasts };
  mounted.push(m);
  return m;
}
// Capture downloads: the tool builds a Blob, points an <a download> at it and clicks it.
function captureDownloads() {
  files = [];
  let lastText = null;
  vi.stubGlobal('Blob', class { constructor(parts) { lastText = parts.join(''); } });
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:x';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:rb30');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () { files.push({ name: this.download, text: lastText }); });
}
afterEach(async () => {
  for (const m of mounted) { try { await React.act(async () => { m.root.unmount(); }); } catch (e) {} m.host.remove(); }
  mounted = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (prevSelHub === undefined) delete window.SelHub; else window.SelHub = prevSelHub;
  prevSelHub = undefined;
});
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

const LOGBOOK = [
  { scenario: 'Residential', vehicle: 'Sedan', conditions: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 }, startedAt: Date.UTC(2026, 2, 1, 15), endedAt: Date.UTC(2026, 2, 1, 15, 10), durationSec: 600, entries: [], safetyScore: 91, efficiencyScore: 84, qualifyingSession: true },
  { scenario: 'Highway', vehicle: 'SUV', conditions: { weather: 'rain', time: 'night', traffic: 'heavy', speedLimit: 65 }, startedAt: Date.UTC(2026, 2, 2, 15), endedAt: Date.UTC(2026, 2, 2, 15, 20), durationSec: 1200, entries: [], safetyScore: 67, efficiencyScore: 72.4, qualifyingSession: true },
  { scenario: 'Old drive', vehicle: 'Sedan', durationSec: 60 }, // an older entry with no scores
];
const WRONG = ['supporting evidence', 'Total supervised hours', 'I confirm that I supervised', 'when paired with a parent/guardian signature'];
const expectSimOnly = (text, label) => {
  expect(text, label).toContain('SIMULATOR practice sessions');
  expect(text, label).toContain('do NOT count toward Maine\'s 70 hours of supervised driving');
  expect(text, label).toContain('real driving on the road with a licensed supervising driver who is at least 20 years old');
  expect(text, label).toContain('10 of them at night');
  expect(text, label).toContain('not the Maine BMV\'s own "Road Ready" app');
  expect(text, label).toContain('The Parent\'s Supervised Driving Program');
  WRONG.forEach((w) => expect(text, label + ': ' + w).not.toContain(w));
};

describe('exports say simulator time is not supervised driving (rb30)', () => {
  it('the source no longer holds any of the three contradicting sentences', () => {
    WRONG.forEach((w) => expect(SRC, w).not.toContain(w));
    expect(SRC).not.toContain("typeof j.score === 'number'");
  });

  it('Print log: real scores on every line, a signature that certifies nothing false, the note', async () => {
    prevSelHub = window.SelHub;
    const printed = [];
    window.SelHub = { printDoc: (doc) => { printed.push(doc); } };
    const m = await mount({ view: 'logbook', tourCompleted: true, logbook: LOGBOOK });
    const btn = [...m.host.querySelectorAll('button')].find((b) => /Print log for parent/.test(b.textContent));
    expect(btn, 'print button').toBeTruthy();
    await React.act(async () => { btn.click(); });
    expect(printed).toHaveLength(1);
    const doc = printed[0];
    const lines = doc.sections[0].items;
    expect(lines).toHaveLength(3);
    // newest first: the old drive, then Highway, then Residential
    expect(lines[1]).toContain('Highway');
    expect(lines[1]).toContain('safety 67 · eco 72');
    expect(lines[2]).toContain('Residential');
    expect(lines[2]).toContain('safety 91 · eco 84');
    expect(lines[0]).toContain('safety – · eco –');
    lines.forEach((l) => expect(l).not.toMatch(/ score /));
    const all = JSON.stringify(doc);
    expectSimOnly(doc.sections.map((s) => (s.paragraphs || []).join('\n')).join('\n'), 'print');
    expect(all).toContain('I have seen this simulator practice log. It is not a record of supervised driving.');
    expect(doc.subtitle).toContain('This is NOT a record of supervised driving');
  });

  it('Export Full Logbook: "simulator hours", the note, real scores, and a local-date file name', async () => {
    // 11:30 pm in Maine on 10 March = 03:30 UTC on 11 March.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-11T03:30:00Z'));
    captureDownloads();
    const m = await mount({ view: 'logbook', tourCompleted: true, logbook: LOGBOOK });
    const btn = [...m.host.querySelectorAll('button')].find((b) => /Export Full Logbook/.test(b.textContent));
    await React.act(async () => { btn.click(); });
    expect(files).toHaveLength(1);
    const { name, text } = files[0];
    const d = new Date();
    const local = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    expect(name).toBe('roadready_logbook_' + local + '.md');
    if (new Date().getTimezoneOffset() > 210) expect(name, 'evening west of UTC: not tomorrow').toBe('roadready_logbook_2026-03-10.md');
    expect(text).toContain('Total simulator hours: 0.5');
    expectSimOnly(text, 'full logbook');
    expect(text).toContain('**Scores:** safety 91 · eco 84');
    expect(text).toContain('**Scores:** safety 67 · eco 72');
    expect(text).toContain('**Scores:** safety – · eco –');
    expect(text).toContain('this is a simulator log, not a driving-hours log');
    expect(text).not.toMatch(/^Parent\/Guardian signature:/m);
  });

  it('Export Journal: the note instead of "supporting evidence"', async () => {
    captureDownloads();
    const lastJournal = { scenario: 'Residential', vehicle: 'Sedan', conditions: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 }, startedAt: Date.UTC(2026, 2, 1, 15), durationSec: 125, entries: [{ t: 65, icon: 'i', text: 'Full stop at the sign' }] };
    const m = await mount({ view: 'menu', tourCompleted: true, lastJournal });
    const btn = [...m.host.querySelectorAll('button')].find((b) => /Export Journal/.test(b.textContent));
    expect(btn.disabled).toBe(false);
    await React.act(async () => { btn.click(); });
    expect(files).toHaveLength(1);
    const { name, text } = files[0];
    expect(name).toMatch(/^roadready_journal_\d{4}-\d{2}-\d{2}\.md$/);
    expect(text).toContain('**Duration:** 2m 5s');
    expect(text).toContain('`01:05` i Full stop at the sign');
    expectSimOnly(text, 'journal');
    expect(text).toContain('this is a simulator log, not a driving-hours log');
  });

  it('the on-screen logbook still says the same thing (unchanged)', async () => {
    const m = await mount({ view: 'logbook', tourCompleted: true, logbook: LOGBOOK });
    expect(m.host.textContent).toContain('Simulator time does not count toward that.');
    expect(m.host.textContent).toContain('3 sessions · 0.5 hours in the simulator');
  });
});
