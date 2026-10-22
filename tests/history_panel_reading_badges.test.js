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
let HistoryPanel, host, root, contract;

beforeAll(() => {
  window.React = React;
  // Exercise canonical JSX without depending on, or rewriting, generated mirrors.
  const compiled = babel.transformSync(readFileSync('view_history_panel_source.jsx', 'utf8'), {
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
  new Function('window', readFileSync('instructional_context_module.js', 'utf8'))(window);
  contract = window.AlloModules.InstructionalContext;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  React.act(() => root.unmount());
  host.remove();
  window.History = nativeHistory;
});

function render(history) {
  const props = {
    history, getFilteredHistory: () => history, getDefaultTitle: type => type, getIconForType: () => null,
    sanitizeString: value => String(value || ''),
    t: key => key.split('.').reduce((value, part) => value?.[part], bank) || key,
    activeSidebarTab: 'history', activeStation: null, activeUnitId: 'all', units: [],
    editingId: null, movingItemId: null, newUnitName: '', isUnitModalOpen: false,
    isTeacherMode: true, isIndependentMode: false, isParentMode: false,
    isStorageDisabled: false, isCloudSyncEnabled: false, isHistoryMaximized: false,
    isSyncMode: false, pendingSync: false, projectFileInputRef: React.createRef(),
  };
  React.act(() => root.render(React.createElement(HistoryPanel, props)));
}

function row(title) {
  const heading = [...host.querySelectorAll('[data-history-resource-title]')].find(node => node.textContent === title);
  expect(heading, `resource row ${title}`).toBeDefined();
  return heading.closest('[role="listitem"]');
}

function readingFixture() {
  return [
    {
      id: 'source', type: 'analysis', title: 'Source passage', data: { originalText: 'Exact source passage.' },
      instructionalText: { form: 'original', role: 'primary', designationSource: 'educator' },
    },
    {
      id: 'adapted', type: 'simplified', title: 'Adapted passage', data: 'An adapted passage.',
      instructionalText: { form: 'adapted', role: 'supplemental', designationSource: 'educator' },
    },
    {
      ...contract.createSupportedReading('Exact source passage.', { id: 'supported', role: 'primary' }),
      title: 'Supported original passage',
    },
  ];
}

describe.each([true, false])('History reading badges with contract available: %s', available => {
  beforeEach(() => {
    if (!available) delete window.AlloModules.InstructionalContext;
  });

  it('does not label auxiliary resources as readings, including inherited and legacy text metadata', () => {
    const profile = { form: 'original', role: 'unspecified' };
    const metadata = [
      {},
      { instructionalText: profile },
      { config: { instructionalText: profile } },
      { textProfile: { form: 'adapted', role: 'supplemental' } },
      { config: { textProfile: { form: 'same-text-supported', role: 'primary' } } },
    ];
    const types = ['glossary', 'outline', 'image', 'note-taking', 'quiz', 'lesson-plan'];
    const history = types.flatMap(type => metadata.map((fields, index) => ({
      id: `${type}-${index}`, title: `${type} resource ${index}`, type, data: {}, ...fields,
    })));
    render(history);
    for (const item of history) {
      expect(row(item.title).textContent).not.toMatch(/Original text|Original with supports|Source text|Adapted text|Main reading|Supporting reading|Not designated/);
    }
  });

  it('retains reading form and role badges for source analysis, adaptation, and supported originals', () => {
    const history = readingFixture();
    render(history);
    expect(row('Source passage').textContent).toContain(`${available ? 'Source analysis' : 'Source text'} · Main reading`);
    expect(row('Adapted passage').textContent).toContain('Adapted text · Supporting reading');
    expect(row('Supported original passage').textContent).toContain('Original with supports · Main reading');
  });

  it('refreshes the source badge when its saved lesson role changes', () => {
    const source = readingFixture()[0];
    render([source]);
    expect(row(source.title).textContent).toContain('Main reading');
    render([{ ...source, instructionalText: { ...source.instructionalText, role: 'supplemental' } }]);
    expect(row(source.title).textContent).toContain('Supporting reading');
    expect(row(source.title).textContent).not.toContain('Main reading');
  });
});
