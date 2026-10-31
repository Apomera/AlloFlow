// "This tool builds from source material" notice (2026-10-28). Before it, a tool
// opened with no source showed a greyed-out Generate button and no reason, which
// read as a broken app. Checks the SHIPPED module: where the notice renders, what it
// does when pressed, and the host's Quick Start opener.
// ALLO_SIDEBAR_CANDIDATE / ALLO_ANTI_CANDIDATE point at mutated copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const MODULE = readFileSync(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js', 'utf8');
const ANTI = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
const SOURCE_TOOLS = ['glossary', 'simplified', 'outline', 'note-taking', 'anchor-chart', 'memory-aid',
  'applied-challenge', 'image', 'faq', 'sentence-frames', 'brainstorm', 'persona', 'timeline', 'concept-sort',
  'dbq', 'adventure', 'quiz', 'lesson-plan'];
// These start without a source: math from a typed topic, Word Sounds from word lists.
// The source check is not a tool card since the 2026-10-30 source redesign: it lives in the Source view.
const NO_SOURCE_NEEDED = ['math', 'ui-tool-wordsounds', 'source-input', 'analysis'];

// Slice a compiled declaration by matching its braces (the code carries no braces in strings).
function sliceBlock(text, start) {
  const at = text.indexOf(start);
  expect(at, 'missing ' + start).toBeGreaterThanOrEqual(0);
  // The body brace follows ") {" or "=> {"; parameter destructuring braces come before it.
  const body = /\)\s*\{|=>\s*\{/g; body.lastIndex = at;
  let depth = 0, i = body.exec(text).index;
  for (; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) break; }
  return text.slice(at, i + 1);
}

let SourceNeededNotice;
beforeAll(() => {
  window.React = React;
  SourceNeededNotice = new Function('React', sliceBlock(MODULE, 'function useAiTextAvailable(') + '\n'
    + sliceBlock(MODULE, 'function OtherWaysToStart(') + '\n'
    + sliceBlock(MODULE, 'function SourceNeededNotice(') + '\nreturn SourceNeededNotice;')(React);
});
const mounted = [];
afterEach(() => { mounted.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); delete window.__alloOpenQuickStart; vi.useRealTimers(); });
function render(element) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => root.render(element));
  mounted.push({ root, host });
  return host;
}
const t = key => ({ 'sidebar.needs_source': 'This tool builds from source material.', 'sidebar.needs_source_add': 'Add source material',
  'sidebar.needs_source_quick_start': 'Guided Quick Start' }[key] || '');

describe('where the notice renders', () => {
  it.each(SOURCE_TOOLS)('%s shows it only while there is no source, right after its header', id => {
    const header = MODULE.indexOf(`onClick: () => toggleTool("${id}")`);
    expect(header, id + ' header').toBeGreaterThanOrEqual(0);
    // Anchor Chart and Concept Sort pass extra topic-start props after these two.
    const notice = MODULE.indexOf(`expandedTools.includes("${id}") && !hasSourceOrAnalysis && /* @__PURE__ */ React.createElement(SourceNeededNotice, { t, onAddSource: openSourceInput`, header);
    const panel = MODULE.indexOf(`expandedTools.includes("${id}") && window.AlloModules`, header);
    expect(notice, id + ' notice').toBeGreaterThan(header);
    if (panel >= 0) expect(notice, id + ' notice sits before the panel').toBeLessThan(panel);
  });

  it('every tool header tells screen readers whether it is open', () => {
    const headers = [...MODULE.matchAll(/onClick: \(\) => toggleTool\("([\w-]+)"\)/g)];
    expect(headers.length).toBeGreaterThanOrEqual(20);
    const silent = headers.filter(m => {
      const props = MODULE.slice(MODULE.lastIndexOf('"button",', m.index), m.index);
      return !props.includes(`"aria-expanded": expandedTools.includes("${m[1]}")`);
    }).map(m => m[1]);
    expect(silent, 'headers without aria-expanded').toEqual([]);
  });

  it('tools that start without a source never show it', () => {
    for (const id of NO_SOURCE_NEEDED) expect(MODULE.includes(`expandedTools.includes("${id}") && !hasSourceOrAnalysis && /* @__PURE__ */ React.createElement(SourceNeededNotice`), id).toBe(false);
    expect((MODULE.match(/React\.createElement\(SourceNeededNotice, /g) || []).length).toBe(SOURCE_TOOLS.length);
  });
});

describe('what the notice does', () => {
  it('explains, and "Add source material" calls back', () => {
    const onAddSource = vi.fn();
    const host = render(React.createElement(SourceNeededNotice, { t, onAddSource }));
    expect(host.querySelector('[role="note"]').textContent).toContain('This tool builds from source material.');
    const add = host.querySelector('[data-help-key="sidebar_source_needed_add"]');
    expect(add.textContent).toBe('Add source material');
    act(() => add.click());
    expect(onAddSource).toHaveBeenCalledTimes(1);
  });

  it('offers Quick Start only when the host provides an opener, and calls it', () => {
    let host = render(React.createElement(SourceNeededNotice, { t, onAddSource: () => {} }));
    expect(host.querySelector('[data-help-key="sidebar_source_needed_quick_start"]'), 'no opener, no button').toBe(null);
    window.__alloOpenQuickStart = vi.fn();
    host = render(React.createElement(SourceNeededNotice, { t, onAddSource: () => {} }));
    const quick = host.querySelector('[data-help-key="sidebar_source_needed_quick_start"]');
    expect(quick.textContent).toBe('Guided Quick Start');
    act(() => quick.click());
    expect(window.__alloOpenQuickStart).toHaveBeenCalledTimes(1);
  });

  it('"Add source material" opens the source panel once and focuses its text box', () => {
    vi.useFakeTimers();
    const block = sliceBlock(MODULE, 'const openSourceInput = () =>');
    let expanded = ['glossary'];
    const setExpandedTools = update => { expanded = typeof update === 'function' ? update(expanded) : update; };
    const openSourceInput = new Function('setExpandedTools', 'document', 'window', block + '\nreturn openSourceInput;')(setExpandedTools, document, window);
    const panel = document.createElement('div'); panel.id = 'tour-input-panel';
    panel.innerHTML = '<button>Upload</button><textarea aria-label="Source text"></textarea>';
    panel.scrollIntoView = vi.fn();
    document.body.appendChild(panel);
    try {
      openSourceInput(); openSourceInput();
      expect(expanded).toEqual(['glossary', 'source-input']);
      vi.runAllTimers();
      expect(document.activeElement).toBe(panel.querySelector('textarea'));
      expect(panel.scrollIntoView).toHaveBeenCalled();
    } finally { panel.remove(); }
  });
});

describe('host wiring', () => {
  it('registers a Quick Start opener that reopens the wizard, and removes it on cleanup', () => {
    const line = ANTI.split('\n').find(l => l.includes('window.__alloOpenQuickStart ='));
    expect(line, 'opener registered').toBeTruthy();
    expect(line).toContain("safeRemoveItem('allo_wizard_completed')");
    expect(line).toContain('setShowWizard(true)');
    expect(ANTI).toMatch(/delete window\.__alloOpenQuickStart/);
  });
});
