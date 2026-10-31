// Resources remember the source version they were made from (2026-10-30 source
// redesign). Once the source in use moves on, the history list marks the older
// ones, in text and in the open button's accessible name.
// ALLO_HISTORY_SOURCE points at a mutated copy for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const bank = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const nativeHistory = window.History;
let HistoryPanel, host, root;

beforeAll(() => {
  window.React = React;
  const compiled = babel.transformSync(readFileSync(process.env.ALLO_HISTORY_SOURCE || 'view_history_panel_source.jsx', 'utf8'), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  }).code;
  HistoryPanel = new Function('window', 'React', `${compiled}\nreturn HistoryPanel;`)(window, React);
});

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  window.History = () => null;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  React.act(() => root.unmount());
  host.remove();
  window.History = nativeHistory;
});

function render(history, sourceRecord) {
  const props = {
    history, getFilteredHistory: () => history, getDefaultTitle: type => type, getIconForType: () => null,
    sanitizeString: value => String(value || ''),
    t: key => key.split('.').reduce((value, part) => value?.[part], bank) || key,
    activeSidebarTab: 'history', activeStation: null, activeUnitId: 'all', units: [],
    editingId: null, movingItemId: null, newUnitName: '', isUnitModalOpen: false,
    isTeacherMode: true, isIndependentMode: false, isParentMode: false,
    isStorageDisabled: false, isCloudSyncEnabled: false, isHistoryMaximized: false,
    isSyncMode: false, pendingSync: false, projectFileInputRef: React.createRef(), sourceRecord,
  };
  React.act(() => root.render(React.createElement(HistoryPanel, props)));
}

function row(title) {
  const heading = [...host.querySelectorAll('[data-history-resource-title]')].find(node => node.textContent === title);
  expect(heading, `resource row ${title}`).toBeDefined();
  return heading.closest('[role="listitem"]');
}
const openButton = (title) => row(title).querySelector('button[aria-label*="' + title + '"]');
const items = [
  { id: 'q1', type: 'quiz', title: 'Garden quiz', sourceVersion: 1 },
  { id: 'g2', type: 'glossary', title: 'Garden words', sourceVersion: 2 },
  { id: 'old', type: 'faq', title: 'Saved before versions' },
];

describe('history marks resources made from an older source version', () => {
  it('marks only the older ones, in text and in the accessible name', () => {
    render(items, { inUse: { text: 'Garden text v2', version: 2 } });
    expect(row('Garden quiz').querySelector('[data-history-source-version]').textContent).toBe('From source version 1');
    expect(openButton('Garden quiz').getAttribute('aria-label')).toBe('Open: Garden quiz. From source version 1');
    expect(row('Garden words').querySelector('[data-history-source-version]')).toBeNull();
    expect(openButton('Garden words').getAttribute('aria-label')).toBe('Open: Garden words');
    expect(row('Saved before versions').querySelector('[data-history-source-version]')).toBeNull();
  });

  it('marks nothing while no source is in use', () => {
    render(items, null);
    expect(host.querySelector('[data-history-source-version]')).toBeNull();
  });

  it('has its label in ui_strings', () => {
    expect(bank.history.from_source_version).toBe('From source version {version}');
    expect(typeof bank.history.from_source_version_hint).toBe('string');
  });
});
