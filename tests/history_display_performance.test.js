import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('view_history_panel_source.jsx', 'utf8');
const start = source.indexOf('// HISTORY_DISPLAY_FORMAT_START'), end = source.indexOf('// HISTORY_DISPLAY_FORMAT_END', start);
if (start < 0 || end < 0) throw Error('History display helpers missing');
const block = source.slice(start, end);
function display(getDefaultTitle = type => type, intl = Intl) {
  return Function('getDefaultTitle', 'Intl', block + '\nreturn { getSafeRowDate, formatHistoryDate, getResourceTypeLabel };')(getDefaultTitle, intl);
}
const options = { month: 'short', day: 'numeric', year: 'numeric' };
afterEach(() => vi.restoreAllMocks());
describe('history display formatting', () => {
  it.each(['en-US', 'fr-FR', 'ar-EG', 'ja-JP'])('matches native date labels in %s while constructing one formatter', locale => {
    const make = vi.fn(function(_, opts) { return new Intl.DateTimeFormat(locale, opts); });
    const helpers = display(undefined, { DateTimeFormat: make });
    for (const stamp of ['2026-09-01T00:05:00Z', '2000-02-29T23:59:00Z', '2025-12-31T22:00:00Z']) {
      const date = helpers.getSafeRowDate(stamp);
      expect(helpers.formatHistoryDate(date)).toBe(date.toLocaleDateString(locale, options));
    }
    expect(make).toHaveBeenCalledTimes(1);
  });
  it('does not allocate a formatter until a valid date is displayed', () => {
    const make = vi.fn(function(_, opts) { return new Intl.DateTimeFormat(undefined, opts); });
    const helpers = display(undefined, { DateTimeFormat: make });
    for (const value of [null, undefined, {}, '', 'not a date', Infinity, new Date(NaN)]) expect(helpers.getSafeRowDate(value)).toBeNull();
    expect(make).not.toHaveBeenCalled();
    expect(helpers.getSafeRowDate(0).getTime()).toBe(0);
  });
  it('retains the native fallback when Intl.DateTimeFormat is unavailable', () => {
    const date = new Date('2026-09-01T12:00:00Z');
    expect(display(undefined, undefined).formatHistoryDate(date)).toBe(date.toLocaleDateString(undefined, options));
    expect(display(undefined, {}).formatHistoryDate(date)).toBe(date.toLocaleDateString(undefined, options));
  });
  it('resolves a label once per distinct type and refreshes it in the next render', () => {
    let language = 'English'; const title = vi.fn(type => language + ' ' + type);
    const first = display(title);
    for (let i = 0; i < 100; i++) expect(first.getResourceTypeLabel('quiz')).toBe('English quiz');
    expect(first.getResourceTypeLabel('math')).toBe('English math'); expect(title).toHaveBeenCalledTimes(2);
    language = 'French'; const next = display(title);
    expect(next.getResourceTypeLabel('quiz')).toBe('French quiz'); expect(title).toHaveBeenCalledTimes(3);
  });
  it('preserves sanitized labels and fallback behavior for a failed title provider', () => {
    const title = vi.fn(() => { throw Error('provider not ready'); });
    const helpers = display(title);
    expect(helpers.getResourceTypeLabel('word_sounds')).toBe('Word Sounds');
    expect(helpers.getResourceTypeLabel('word_sounds')).toBe('Word Sounds'); expect(title).toHaveBeenCalledOnce();
    expect(display(() => ' \u0000Quiz\nTitle ').getResourceTypeLabel('quiz')).toBe('Quiz Title');
  });
});

describe('actual history panel rendering', () => {
  it('preserves distinct row titles and dates while a stable title provider changes language', () => {
    window.React = React; window.History = () => null; window.AlloModules = {};
    Function(readFileSync('view_history_panel_module.js', 'utf8'))();
    const Panel = window.AlloModules.HistoryPanel.HistoryPanel;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let language = 'English';
    const title = vi.fn((type, item) => item ? language + ' row ' + item.id : language + ' type ' + type);
    const history = Array.from({ length: 8 }, (_, i) => ({ id: String(i), type: 'quiz', timestamp: i === 7 ? 'invalid date' : '2026-09-01T12:00:00Z' }));
    const props = { history, units: [], activeUnitId: 'all', activeSidebarTab: 'history', isTeacherMode: true, editingId: null, movingItemId: null,
      projectFileInputRef: { current: null }, getFilteredHistory: () => history, getDefaultTitle: title, getIconForType: () => null, sanitizeString: value => value, t: key => key };
    try {
      act(() => root.render(React.createElement(Panel, props)));
      expect(host.querySelectorAll('[role="listitem"]')).toHaveLength(8);
      expect(host.querySelectorAll('time')).toHaveLength(7);
      history.forEach(item => expect(host.textContent).toContain('English row ' + item.id));
      expect(title.mock.calls.filter(args => args[1] === undefined)).toHaveLength(1);
      expect(title.mock.calls.filter(args => args[1] !== undefined)).toHaveLength(8);
      language = 'French'; title.mockClear();
      act(() => root.render(React.createElement(Panel, { ...props, pendingSync: true })));
      history.forEach(item => expect(host.textContent).toContain('French row ' + item.id));
      expect(title.mock.calls.filter(args => args[1] === undefined)).toHaveLength(1);
    } finally { act(() => root.unmount()); host.remove(); }
  });
});
