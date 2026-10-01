import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from '@babel/parser';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { flushSync } = require(resolve('desktop/web-app/node_modules/react-dom'));
// Before integration, point this at the bounded candidate. After integration
// the default exercises exactly the current canonical JSX and pure compiler.
const sourcePath = process.env.RESEARCH_SIDEBAR_SOURCE || 'view_sidebar_panels_source.jsx';
const source = fs.readFileSync(sourcePath, 'utf8');
const outerNode = parse(source, { sourceType: 'script', plugins: ['jsx'] }).program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'SourceInputShellView');
const middleCalls = [], leafCalls = [];
let Outer, root, host;
beforeAll(() => {
  window.React = React;
  window.AlloModules = {};
  // Run the pure production compiler in Node's own realm: jsdom's Uint8Array
  // differs from TextEncoder's realm, which otherwise violates esbuild's guard.
  const compiled = execFileSync(process.execPath, ['-e', "const fs=require('fs');const build=require('./_build_view_sidebar_panels_module.js').buildSidebarPanelsModule;process.stdout.write(build(fs.readFileSync(process.argv[1],'utf8')));", sourcePath], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  vm.runInNewContext(compiled, { window, console });
  vm.runInNewContext(fs.readFileSync('view_misc_panels_module.js', 'utf8'), { window, console });
  Outer = window.AlloModules.SidebarPanels.SourceInputShellView;
  const Middle = window.AlloModules.SourceInputPanel;
  const Leaf = window.AlloModules.SourceGenPanel;
  // Capture the boundary props, then render both real production components.
  // This catches either destructuring loss or a missing forwarded prop.
  window.AlloModules.SourceInputPanel = props => { middleCalls.push(props); return React.createElement(Middle, props); };
  window.AlloModules.SourceGenPanel = props => { leafCalls.push(props); return React.createElement(Leaf, props); };
}, 60000);
afterEach(() => {
  if (root) flushSync(() => root.unmount());
  host?.remove(); root = host = null;
  delete window.AlloOwnSources;
  middleCalls.length = leafCalls.length = 0;
  vi.restoreAllMocks();
});
function fixture() {
  const props = {};
  for (const property of outerNode.body.body[0].declarations[0].id.properties) {
    const key = property.key.name;
    props[key] = /^[A-Z]/.test(key) ? () => null : /^(set|handle|toggle|start|capture|isGuided)/.test(key) ? vi.fn() : undefined;
  }
  return {
    ...props, expandedTools: ['source-input'], activeView: 'input', isGuidedToolVisible: () => true,
    fileInputRef: { current: null }, inputText: '', sourceTopic: 'Clouds', sourceLevel: '5th Grade', gradeLevel: '5th Grade',
    sourceLength: '250', sourceTone: 'Informative', sourceVocabulary: '', sourceCustomInstructions: '',
    aiStandardQuery: '', aiStandardRegion: '', standardInputValue: '', standardMode: 'manual',
    targetStandards: [], suggestedStandards: [], searchOptions: [], showSourceGen: true, showUrlInput: false,
    useOwnSources: true, documentsOnly: true, includeSourceCitations: false, selectedOwnSourceIds: ['a'],
    isGeneratingSource: true, generationStep: 'Researching selected passages',
    t: (key, values) => values && 'count' in values ? `${key}:${values.count}` : key,
  };
}
async function until(check) {
  const start = Date.now();
  while (!check() && Date.now() - start < 3000) await new Promise(resolve => setTimeout(resolve, 15));
  expect(!!check()).toBe(true);
}

it('forwards current research settings and stage through the outer input section to the real source panel', async () => {
  window.AlloOwnSources = {
    available: () => true, countSources: async () => 2, acceptAttribute: () => '.txt',
    listSources: async () => [{ id: 'a', title: 'Cloud notes', active: true }, { id: 'b', title: 'Water notes', active: true }],
    setSourceActive: vi.fn(),
  };
  const props = fixture();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = next => flushSync(() => root.render(React.createElement(Outer, next)));
  render(props);
  await until(() => host.textContent.includes('input.my_sources_included:1'));
  expect(host.querySelector('#documentsOnly').checked).toBe(true);
  expect(host.textContent).toContain('input.my_sources_included:1');
  const button = () => host.querySelector('[data-help-key="source_generate_button"]');
  expect(button().textContent).toBe(props.generationStep);
  expect(button().querySelector('[role="status"]').getAttribute('aria-live')).toBe('polite');
  for (const boundary of [middleCalls.at(-1), leafCalls.at(-1)]) {
    for (const key of ['selectedOwnSourceIds', 'setSelectedOwnSourceIds', 'documentsOnly', 'setDocumentsOnly', 'useOwnSources', 'setUseOwnSources', 'generationStep']) {
      expect(boundary[key], key).toBe(props[key]);
    }
  }
  const updated = { ...props, selectedOwnSourceIds: ['b'], documentsOnly: false, generationStep: 'Checking web evidence' };
  render(updated);
  expect(host.querySelector('#documentsOnly').checked).toBe(false);
  expect(button().textContent).toBe(updated.generationStep);
  expect(leafCalls.at(-1).selectedOwnSourceIds).toBe(updated.selectedOwnSourceIds);
  // Exercise setter callbacks through both real intermediate components.
  render({ ...updated, isGeneratingSource: false });
  flushSync(() => host.querySelector('#documentsOnly').click());
  expect(props.setDocumentsOnly).toHaveBeenLastCalledWith(true);
  expect(props.setIncludeSourceCitations).toHaveBeenLastCalledWith(false);
  const waterRow = [...host.querySelectorAll('li')].find(row => row.textContent.includes('Water notes'));
  flushSync(() => waterRow.querySelector('button').click());
  expect(props.setSelectedOwnSourceIds).toHaveBeenLastCalledWith([]);
  expect(window.AlloOwnSources.setSourceActive).not.toHaveBeenCalled();
});
