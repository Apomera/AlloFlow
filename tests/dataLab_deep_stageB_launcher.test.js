// Data Lab stage B (2026-11-03 pm): launcher side.
//   - desktop app: pop-ups open in the OS browser, so the tile explains that,
//     opens the browser, and offers "Copy the Data Lab link"; data from other
//     tools stays in the inbox with "Copy this data as a table";
//   - teacher class survey (question + columns), shown to students and sent
//     to the pop-up; malformed surveys are dropped;
//   - verified graphs recorded once, with XP once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ORIGIN = window.location.origin;
let root = null;
let api = null;

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
  api = window.StemLab.dataLab;
  document.body.innerHTML = '<div id="root"></div>';
  document.documentElement.lang = 'en';
  delete window.__alloDataLabInbox;
  delete window._isDesktopBundledApp;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  if (api) api._reset();
  delete window._isDesktopBundledApp;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(extra) {
  const out = { latest: null, sr: [], xp: [] };
  function App(props) {
    const [state, setState] = React.useState(props.seed || {});
    out.latest = state;
    return window.StemLab._registry.dataLab.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      announceToSR: (m) => out.sr.push(m),
      awardXP: (...args) => out.xp.push(args),
    }, extra || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App, { seed: extra && extra.seed })));
  return out;
}
const button = (re) => Array.from(document.querySelectorAll('button')).find((b) => re.test(b.textContent));
function fakePopup() {
  const posted = [];
  return { closed: false, focus() {}, postMessage: (d) => posted.push(d), close() { this.closed = true; }, location: { href: 'about:blank' }, posted };
}
async function send(win, data, origin = ORIGIN) {
  await React.act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, source: win, origin }));
    await new Promise((r) => setTimeout(r, 5));
  });
}
async function openWith(win) {
  vi.spyOn(window, 'open').mockReturnValue(win);
  await React.act(() => button(/Open Data Lab/).click());
  await send(win, { type: 'allodatalab-hello' });
}
async function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}

describe('desktop app', () => {
  it('explains that the Data Lab opens in the web browser, and does not call it "blocked"', async () => {
    window._isDesktopBundledApp = true;
    const m = await mount({ theme: 'light' });
    expect(document.body.textContent).toContain('In the desktop app, the Data Lab opens in your web browser');
    const open = vi.spyOn(window, 'open').mockReturnValue(null); // the shell opens it externally and returns no window
    await React.act(() => button(/Open Data Lab in my web browser/).click());
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toContain('data_lab/data_lab.html?v=2&theme=light&lang=en');
    expect(open.mock.calls[0][1]).toBe('_blank');
    expect(document.body.textContent).toContain('The Data Lab was sent to your web browser');
    expect(document.body.textContent).not.toContain('Pop-up blocked');
    expect(m.latest._dataLab.opened).toBe(true);
    expect(api._bridgeState().listening).toBe(false);
  });

  it('copies the public Data Lab link, or shows it in a box when copying fails', async () => {
    window._isDesktopBundledApp = true;
    document.documentElement.lang = 'es';
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { clipboard: { writeText } }));
    const m = await mount({});
    await React.act(async () => { button(/Copy the Data Lab link/).click(); await new Promise((r) => setTimeout(r, 5)); });
    expect(writeText).toHaveBeenCalledWith('https://alloflow-cdn.pages.dev/data_lab/data_lab.html?v=2&theme=dark&lang=es');
    expect(document.body.textContent).toContain('Link copied');
    expect(m.sr.join(' ')).toContain('Link copied');
    writeText.mockRejectedValue(new Error('denied'));
    await React.act(async () => { button(/Copy the Data Lab link/).click(); await new Promise((r) => setTimeout(r, 5)); });
    const box = document.getElementById('datalab-copy-link');
    expect(box.value).toBe('https://alloflow-cdn.pages.dev/data_lab/data_lab.html?v=2&theme=dark&lang=es');
    expect(document.querySelector('label[for="datalab-copy-link"]').textContent).toContain('Copy this link');
  });

  it('keeps data from another tool in the inbox and offers it as a table to paste', async () => {
    window._isDesktopBundledApp = true;
    const open = vi.spyOn(window, 'open');
    const res = window.StemLab.openInDataLab({ title: 'Skate run', source: 'Skate Lab', attributes: [{ name: 'time', unit: 's' }, 'note'], rows: [[0, 'start, slow'], [1.5, 'top']] });
    expect(res).toEqual({ ok: false, error: 'desktop-app', truncated: false });
    expect(open).not.toHaveBeenCalled();
    expect(window.__alloDataLabInbox.length).toBe(1);
    await mount({});
    expect(document.body.textContent).toContain('Data from Skate Lab is waiting: Skate run.');
    expect(button(/^Open it in CODAP$/)).toBeUndefined();
    await React.act(async () => { button(/Copy this data as a table/).click(); await new Promise((r) => setTimeout(r, 5)); });
    expect(document.getElementById('datalab-copy-inbox').value).toBe('time (s),note\n0,"start, slow"\n1.5,top');
    expect(api._datasetToCsv({ attributes: [{ name: 'a' }], rows: [['say "hi"']] })).toBe('a\n"say ""hi"""');
  });

  it('leaves the web path unchanged', async () => {
    await mount({});
    expect(document.body.textContent).not.toContain('Using the AlloFlow desktop app');
    const win = fakePopup();
    vi.spyOn(window, 'open').mockReturnValue(win);
    expect(window.StemLab.openInDataLab({ title: 'x', attributes: ['a'], rows: [[1]] })).toMatchObject({ ok: true, status: 'opening' });
  });
});

describe('teacher class survey', () => {
  it('sanitizes saved surveys', () => {
    expect(api._validSurvey(null)).toBeNull();
    expect(api._validSurvey({ question: '', columns: [{ name: 'a', type: 'number' }] })).toBeNull();
    expect(api._validSurvey({ question: 'Q?', columns: [{ name: 'x', type: 'evil' }] })).toBeNull();
    expect(api._validSurvey({ question: 'Q?', columns: [
      { name: 'Pets [count].', type: 'number' }, { name: 'pets count', type: 'text' },
      { name: 'Colour', type: 'choice', choices: ['Red', 'red', '', 'Blue'] }, { name: 'One', type: 'choice', choices: ['only'] },
      { name: 'e', type: 'text' }, { name: 'f', type: 'text' },
    ] })).toEqual({ question: 'Q?', columns: [{ name: 'Pets count', type: 'number' }, { name: 'Colour', type: 'choice', choices: ['Red', 'Blue'] }] });
  });

  it('lets a teacher share a survey that students see and the pop-up receives; stopping clears it', async () => {
    const m = await mount({ isTeacherMode: true });
    await setValue(document.getElementById('datalab-sv-q'), 'How do you feel about mornings?');
    await setValue(document.getElementById('datalab-sv-name-0'), 'Mornings are');
    await setValue(document.getElementById('datalab-sv-choices-0'), 'Great');
    await React.act(() => button(/^Share the survey$/).click());
    expect(document.body.textContent).toContain('A list needs at least two different choices');
    expect(m.latest._dataLab && m.latest._dataLab.survey).toBeUndefined();
    await setValue(document.getElementById('datalab-sv-choices-0'), 'Great\nOkay\nHard');
    await React.act(() => button(/^Add another column$/).click());
    await setValue(document.getElementById('datalab-sv-name-1'), 'Hours of sleep');
    await React.act(() => button(/^Share the survey$/).click());
    expect(m.latest._dataLab.survey).toEqual({ question: 'How do you feel about mornings?', columns: [{ name: 'Mornings are', type: 'choice', choices: ['Great', 'Okay', 'Hard'] }, { name: 'Hours of sleep', type: 'number' }] });
    expect(document.body.textContent).toContain('Survey shared');

    await React.act(() => root.unmount());
    root = null;
    const s = await mount({ seed: m.latest });
    expect(document.body.textContent).toContain('Class survey');
    expect(document.body.textContent).toContain('How do you feel about mornings?');
    expect(document.getElementById('datalab-sv-q')).toBeNull();
    const win = fakePopup();
    await openWith(win);
    const ready = win.posted.find((d) => d.type === 'allodatalab-ready');
    expect(ready.survey).toEqual({ question: 'How do you feel about mornings?' });
    const sv = ready.catalog.find((d) => d.id === 'classSurvey');
    expect(sv.attributes.map((a) => [a.name, a.type, a.entry.type])).toEqual([['Mornings are', 'categorical', 'choice'], ['Hours of sleep', 'numeric', 'number']]);
    expect(sv.investigations.map((i) => i.id)).toEqual(['survey_custom_common', 'survey_custom_typical']);
    expect(sv.investigations[0].question).toBe('What is the most common answer to “Mornings are” in our class?');
    // A survey investigation counts as a known id for progress.
    await send(win, { type: 'allodatalab-progress', event: 'investigation-done', investigationId: 'survey_custom_typical', passed: true });
    expect(s.latest._dataLab.completedInvestigations).toEqual(['survey_custom_typical']);
    await React.act(() => root.unmount());
    root = null;
    api._reset();

    const t = await mount({ isTeacherMode: true, seed: s.latest });
    await React.act(() => button(/^Stop the survey$/).click());
    expect(t.latest._dataLab.survey).toBeUndefined();
  });
});

describe('verified graphs from the pop-up', () => {
  it('records each investigation once, awards 5 XP once, and ignores unknown or unpassed reports', async () => {
    const m = await mount({ isTeacherMode: true });
    const win = fakePopup();
    await openWith(win);
    await send(win, { type: 'allodatalab-progress', event: 'graph-made', investigationId: 'planets_cold', passed: true });
    await send(win, { type: 'allodatalab-progress', event: 'graph-made', investigationId: 'planets_cold', passed: true });
    await send(win, { type: 'allodatalab-progress', event: 'graph-made', investigationId: 'made_up', passed: true });
    await send(win, { type: 'allodatalab-progress', event: 'graph-made', investigationId: 'faithful_wait' });
    await send(win, { type: 'allodatalab-progress', event: 'graph-made', investigationId: 'house_seats', passed: true }, 'https://evil.example');
    expect(m.latest._dataLab.graphsMade).toEqual(['planets_cold']);
    expect(m.xp.map((x) => [x[0], x[1]])).toEqual([['datalab_graph_planets_cold', 5]]);
    expect(m.latest._dataLab.completedInvestigations).toBeUndefined();
    expect(document.body.textContent).toContain('Graphs checked through CODAP: 1.');
  });

  it('does not re-award a graph already saved in the slice', async () => {
    const m = await mount({ seed: { _dataLab: { graphsMade: ['co2_rising'] } } });
    const win = fakePopup();
    await openWith(win);
    await send(win, { type: 'allodatalab-progress', event: 'graph-made', investigationId: 'co2_rising', passed: true });
    expect(m.xp.length).toBe(0);
    expect(m.latest._dataLab.graphsMade).toEqual(['co2_rising']);
  });
});

describe('clean mounts', () => {
  it('mounts without console errors on the web and the desktop app, with and without a survey', async () => {
    const err = vi.spyOn(console, 'error');
    const survey = { question: 'Pets?', columns: [{ name: 'Pets', type: 'number' }] };
    const seeds = [{}, { _dataLab: { survey, graphsMade: ['planets_cold'] } }, { _dataLab: { survey: 'junk', graphsMade: 'junk' } }];
    window.__alloDataLabInbox = [{ title: 'Log', attributes: ['a'], rows: [[1]] }];
    for (const desktop of [false, true]) {
      if (desktop) window._isDesktopBundledApp = true; else delete window._isDesktopBundledApp;
      for (const isTeacherMode of [false, true]) {
        for (const theme of ['dark', 'light', 'contrast']) {
          for (const seed of seeds) {
            await mount({ isTeacherMode, theme, isDark: theme !== 'light', seed });
            expect(document.body.textContent).toContain('Data Lab');
            await React.act(() => root.unmount());
            root = null;
          }
        }
      }
    }
    expect(err).not.toHaveBeenCalled();
  });
});
