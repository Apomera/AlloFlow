import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';

const app = readFileSync('AlloFlowANTI.txt', 'utf8');
const sidebarSource = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const sidebarBuilder = readFileSync('_build_view_sidebar_panels_module.js', 'utf8');

function sourceBetweenIn(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start anchor: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end anchor: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

function sourceBetween(start, end) {
  return sourceBetweenIn(app, start, end);
}

const toggleToolBlock = sourceBetween(
  '  const toggleTool = (id) => {',
  '  // The full catalog remains available'
);
const catalogStateBlock = sourceBetween(
  "  const [toolCatalogGroup, setToolCatalogGroup] = useState('essentials');",
  "  const [workspacePane, setWorkspacePane] = useState('create');"
);
const catalogBridge = sourceBetweenIn(sidebarSource,
  '            {!guidedMode && (() => {\n              const ToolCatalogControls',
  '            {/* -- UniversalSettingsPanel'
);
const catalogMarkup = sourceBetweenIn(
  sidebarSource, 'function ToolCatalogControls(props) {',
  '// Types eligible for a differentiated set.'
);
const generatorView = sidebarSource.slice(sidebarSource.indexOf('function GeneratorActionsView('), sidebarSource.indexOf('function SourceInputShellView('));
const directToolStart = generatorView.indexOf("<div style={{display: isGuidedToolVisible('math')");
expect(directToolStart).toBeGreaterThanOrEqual(0);
const directToolMarkup = generatorView.slice(directToolStart);

describe('Create a resource catalog collapse contract', () => {
  // 2026-11-23: the panel starts collapsed. Open, it put about nine controls above the
  // first tool card; closed, it still names the filter and keeps Show all tools.
  it('starts collapsed while retaining independent query and filter state', () => {
    expect(catalogStateBlock).toContain("const [toolCatalogGroup, setToolCatalogGroup] = useState('essentials');");
    expect(catalogStateBlock).toContain("const [toolCatalogQuery, setToolCatalogQuery] = useState('');");
    expect(catalogStateBlock).toContain('const [isToolCatalogExpanded, setIsToolCatalogExpanded] = useState(false);');
    expect(catalogStateBlock).not.toContain('setIsToolCatalogExpanded] = useState(true)');
    expect(catalogStateBlock).toContain("const [selectedToolCatalogId, setSelectedToolCatalogId] = useState('');");
  });

  it('opens the panel for the app tour step that describes its filters and search', () => {
    const tourEffect = sourceBetween('      // The sidebar/expand side effects belong to the MAIN app tour only', '  const toastTimersRef = useRef(new Map());');
    expect(tourEffect).toContain("if (step.id === 'tour-tool-finder') setIsToolCatalogExpanded(true);");
    expect(app).toContain("{ id: 'tour-tool-finder', text: t('tour.tool_finder_text')");
  });

  it('auto-collapses only when a non-source tool is explicitly opened outside Guided Mode', () => {
    expect(toggleToolBlock).toContain('const isOpening = !expandedTools.includes(id);');
    expect(toggleToolBlock).toContain("if (isOpening && id !== 'source-input' && !guidedMode) {");
    expect(toggleToolBlock).toContain('setSelectedToolCatalogId(id);');
    expect(toggleToolBlock).toContain('setIsToolCatalogExpanded(false);');
    expect(toggleToolBlock.match(/setIsToolCatalogExpanded\(false\)/g)).toHaveLength(1);
    expect(toggleToolBlock).toContain("guidedMode ? Array.from(new Set([...prev, id])) : [id]");
  });

  it('hides rather than unmounts discovery controls, preserving query and filter state', () => {
    expect(catalogMarkup).toContain('<div id="tool-catalog-discovery-controls" hidden={!isExpanded}>');
    expect(catalogMarkup).not.toContain('{isExpanded && (');
    expect(catalogMarkup).toContain('value={query}');
    expect(catalogMarkup).toContain('onChange={(event) => onQueryChange(event.target.value)}');
    expect(catalogMarkup).toContain("aria-pressed={!query && group === id}");

    const selectionBlock = sourceBetween(
      '  const selectToolFromCatalog = (id) => {',
      '  const openToolCatalog = () => {'
    );
    const openBlock = sourceBetween(
      '  const openToolCatalog = () => {',
      '  const isToolCatalogItemVisible = (id) => {'
    );
    for (const block of [toggleToolBlock, selectionBlock, openBlock]) {
      expect(block).not.toContain('setToolCatalogQuery(');
      expect(block).not.toContain('setToolCatalogGroup(');
    }
  });

  it('keeps a persistent touch-sized disclosure button with complete ARIA wiring', () => {
    const buttonIndex = catalogMarkup.indexOf('aria-expanded={isExpanded}');
    const hiddenRegionIndex = catalogMarkup.indexOf('id="tool-catalog-discovery-controls"');
    expect(buttonIndex).toBeGreaterThanOrEqual(0);
    expect(hiddenRegionIndex).toBeGreaterThan(buttonIndex);
    expect(catalogMarkup).toContain('aria-controls="tool-catalog-discovery-controls"');
    expect(catalogMarkup).toContain('inline-flex min-h-11 shrink-0');
    // L9/N4 (2026-08-16): the labels are localized now. The contract is that the
    // disclosure keeps three distinct states (collapse / change / open), not that
    // they are English literals.
    expect(catalogMarkup).toContain("translate('sidebar.tool_finder_collapse') || 'Collapse'");
    expect(catalogMarkup).toContain("translate('sidebar.tool_finder_change') || 'Change tool'");
    expect(catalogMarkup).toContain("translate('sidebar.tool_finder_open') || 'Find a tool'");
    expect(catalogMarkup).toContain('focus-visible:ring-2 focus-visible:ring-indigo-500');
  });

  it('reopens through Change tool and focuses the retained search field', () => {
    const openBlock = sourceBetween(
      '  const openToolCatalog = () => {',
      '  const isToolCatalogItemVisible = (id) => {'
    );
    expect(openBlock).toContain('setIsToolCatalogExpanded(true);');
    expect(openBlock).toContain("requestAnimationFrame(() => document.getElementById('tool-catalog-search')?.focus());");
    expect(catalogMarkup).toContain('onClick={isExpanded ? onCollapse : onOpen}');
    expect(catalogMarkup).toContain('selectedLabel ?');
    expect(catalogBridge).toContain('onOpen: openToolCatalog');
  });

  it('records every direct catalog selection before launching its action', () => {
    expect(directToolMarkup).toContain("onClick={() => { selectToolFromCatalog('math'); setShowStemLab(true); setStemLabTab('explore'); }}");
    expect(directToolMarkup).toContain("onClick={() => { selectToolFromCatalog('directions'); setMbDirectionsDraft(p => p || {}); setShowDirectionsComposer(true); }}");
    expect(readFileSync('view_full_pack_run_source.jsx', 'utf8')).toContain("onClick={() => { selectToolFromCatalog('package-deliver'); return fullPackRun?.status === 'ready' ? handleApproveFullPack() : handlePlanFullPack(); }}");
    expect(directToolMarkup).toContain("onClick={() => { selectToolFromCatalog('alignment'); handleGenerate('alignment-report'); }}");
  });

  it('keeps catalog chrome and filtering out of Guided Mode', () => {
    expect(catalogBridge).toMatch(/^\s*\{!guidedMode && \(\(\) => \{/);
    expect(catalogStateBlock).toContain('if (guidedMode || !id) return;');
    // L9/N3 (2026-08-16): the app tour is exempt from catalog filtering too, or it
    // spotlights tool cards the default 'essentials' group has set to display:none.
    expect(catalogStateBlock).toContain('if (guidedMode || runTour) return true;');
    expect(catalogStateBlock).toContain("const hiddenToolCatalogSelector = (guidedMode || runTour || !hasToolCatalogControls) ? ''");
    expect(toggleToolBlock).toContain("if (isOpening && id !== 'source-input' && !guidedMode)");
  });

  it('fails open while the eager module is delayed and registers the extracted component', () => {
    expect(catalogBridge).toContain('data-testid="tool-catalog-controls-fallback"');
    expect(catalogBridge).toContain("t('sidebar.tool_finder_loading')");
    expect(catalogBridge).toContain('const _catalogShown = TOOL_CATALOG_GROUPS.all.filter(isToolCatalogItemVisible).length;');
    expect(catalogBridge).toContain('shownCount: _catalogShown');
    expect(sidebarBuilder).toContain("var ChevronUp = _lazyIcon('ChevronUp');");
    expect(sidebarBuilder).toContain('window.AlloModules.ToolCatalogControls =');
  });

  // L9/N4 (2026-08-16). Aaron's guardrail for making this panel dismissible: hiding it
  // must never leave a filter quietly narrowing the tool list out of sight. These are
  // the two halves of that guarantee, and they are the assertions worth keeping.
  it('offers Hide only when no filter is narrowing the list', () => {
    expect(catalogMarkup).toContain("const filterActive = !!String(query || '').trim() || (group && group !== 'all');");
    // The single action button flips meaning: clear the filter first, hide second.
    expect(catalogMarkup).toContain('onClick={filterActive ? clearFilter : onHide}');
    expect(catalogMarkup).toContain("const clearFilter = () => { onQueryChange(''); onGroupChange('all'); };");
  });

  it('states the active filter both inside the panel and from outside it', () => {
    // The note names the filter ("Recommended: showing 7 of 23 tools") in a neutral
    // style; a search says it is a search. Both still say how many are shown.
    expect(catalogMarkup).toContain("translate('sidebar.tool_finder_filtered_group')");
    expect(catalogMarkup).toContain("translate('sidebar.tool_finder_filtered_search')");
    expect(catalogMarkup).toContain(".replace('{filter}', groupLabel).replace('{shown}', String(shownCount)).replace('{total}', String(totalCount || shownCount))");
    expect(catalogMarkup).not.toContain('bg-amber-50 px-2 py-1.5 text-[11px] font-semibold leading-snug text-amber-900');
    expect(catalogBridge).toContain('isToolCatalogHidden');
    expect(catalogBridge).toContain("t('sidebar.tool_finder_hidden_filtered')");
    expect(catalogStateBlock).toContain('const [isToolCatalogHidden, setIsToolCatalogHidden] = useState(false);');
  });

  // L9/N4: the panel used to be `sticky top-0 z-20`, riding the scroll and spending the
  // top of a narrow column permanently. It is an ordinary block now.
  it('does not stick to the top of the sidebar column', () => {
    expect(catalogMarkup).not.toContain('sticky top-0');
    expect(catalogBridge).not.toContain('sticky top-0');
  });
});

// 2026-11-23. The shipped module is run, not read: the collapsed panel is the first
// thing a teacher sees now, so what it shows and what it still reaches is the contract.
describe('collapsed tool finder, as rendered by the shipped module', () => {
  const require = createRequire(import.meta.url);
  const React = require(resolve('desktop/web-app/node_modules/react'));
  const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
  const t = (key) => String(key || '').split('.').reduce((node, part) => node && node[part], english);
  let ToolCatalogControls;
  beforeAll(() => {
    window.React = React; window.AlloModules = {};
    vm.runInNewContext(readFileSync('view_sidebar_panels_module.js', 'utf8'), { window, console, FileReader: function () { return new globalThis.FileReader(); } });
    ToolCatalogControls = window.AlloModules.ToolCatalogControls;
  }, 60000);

  const walk = (node, visit, hidden = false) => {
    if (Array.isArray(node)) { node.forEach(child => walk(child, visit, hidden)); return; }
    if (node === null || node === undefined || typeof node === 'boolean') return;
    if (!React.isValidElement(node)) { visit({ text: String(node), hidden }); return; }
    const nowHidden = hidden || node.props.hidden === true;
    visit({ element: node, hidden: nowHidden });
    walk(node.props.children, visit, nowHidden);
  };
  const render = (overrides = {}) => {
    const props = {
      allEditorsExpanded: false, group: 'essentials', isExpanded: false, query: '', selectedLabel: '', shownCount: 7, totalCount: 23, t,
      onCollapse: vi.fn(), onGroupChange: vi.fn(), onOpen: vi.fn(), onQueryChange: vi.fn(), onToggleAll: vi.fn(), onHide: vi.fn(), ...overrides,
    };
    const seen = [];
    walk(ToolCatalogControls(props), entry => seen.push(entry));
    const textOf = (element) => { const parts = []; walk(element.props.children, entry => { if (entry.text) parts.push(entry.text); }); return parts.join(''); };
    const visible = seen.filter(entry => !entry.hidden);
    return {
      props, seen, textOf,
      visibleText: visible.filter(entry => entry.text).map(entry => entry.text).join(' '),
      visibleButtons: visible.filter(entry => entry.element && entry.element.type === 'button').map(entry => entry.element),
      hiddenButtons: seen.filter(entry => entry.hidden && entry.element && entry.element.type === 'button').map(entry => entry.element),
      section: seen.find(entry => entry.element && entry.element.props.id === 'tour-tool-finder'),
    };
  };

  it('shows two controls, names the filter and says how many tools it is showing', () => {
    const view = render();
    expect(view.section, 'the tour target must exist while collapsed').toBeTruthy();
    expect(view.visibleText).toContain('Recommended: showing 7 of 23 tools.');
    expect(view.visibleText).toContain('Open this to change or clear the filter.');
    expect(view.visibleText).not.toContain('Every tool is listed below.');
    expect(view.visibleButtons.map(view.textOf)).toEqual(['Find a tool', 'Show all tools']);
  });

  it('keeps every other control one press away behind the single disclosure', () => {
    const view = render();
    const [disclosure, showAll] = view.visibleButtons;
    expect(disclosure.props['aria-expanded']).toBe(false);
    expect(disclosure.props['aria-controls']).toBe('tool-catalog-discovery-controls');
    disclosure.props.onClick();
    expect(view.props.onOpen).toHaveBeenCalledTimes(1);
    showAll.props.onClick();
    expect(view.props.onQueryChange).toHaveBeenCalledWith('');
    expect(view.props.onGroupChange).toHaveBeenCalledWith('all');
    expect(view.props.onHide).not.toHaveBeenCalled();
    // Search, the five purpose filters and Expand all are still mounted, only hidden.
    const region = view.seen.find(entry => entry.element && entry.element.props.id === 'tool-catalog-discovery-controls').element;
    expect(region.props.hidden).toBe(true);
    expect(view.seen.some(entry => entry.hidden && entry.element && entry.element.props.id === 'tool-catalog-search')).toBe(true);
    expect(view.hiddenButtons.map(view.textOf)).toEqual(['Recommended', 'Make accessible', 'Engage', 'Assess & deliver', 'All tools', 'Expand All']);
    const open = render({ isExpanded: true });
    expect(open.hiddenButtons).toHaveLength(0);
    expect(open.visibleButtons.map(open.textOf)).toEqual(['Collapse', 'Show all tools', 'Recommended', 'Make accessible', 'Engage', 'Assess & deliver', 'All tools', 'Expand All']);
  });

  it('never claims every tool is listed while a filter is on, and offers Hide only once it is off', () => {
    const unfiltered = render({ group: 'all', shownCount: 23 });
    expect(unfiltered.visibleText).toContain('Every tool is listed below.');
    expect(unfiltered.visibleButtons.map(unfiltered.textOf)).toEqual(['Find a tool', 'Hide this panel']);
  });
});

// 2026-11-23. The collapsed finder said "Selected: Original with Supports" after a
// teacher opened the card titled "Text Adaptation": it used the Guided Mode step label
// (English only). It now reads the same string key as the card title.
describe('the finder names the selected tool the way its sidebar card does', () => {
  const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
  const t = (key) => { const value = String(key || '').split('.').reduce((node, part) => node && node[part], english); return typeof value === 'string' ? value : undefined; };
  const labelBlock = sourceBetween('  const toolCatalogCardNameKey = (id) => ({', '  const selectToolFromCatalog = (id) => {');
  const GUIDED_STEPS = [{ id: 'simplified', label: 'Original with Supports' }, { id: 'analysis', label: 'Analyze source material' }];
  const labelFor = (selectedToolCatalogId, modes = {}) => new Function(
    'isParentMode', 'isIndependentMode', 't', 'GUIDED_STEPS', 'selectedToolCatalogId',
    labelBlock + '\nreturn { key: toolCatalogCardNameKey(selectedToolCatalogId), label: selectedToolCatalogLabel };'
  )(!!modes.parent, !!modes.independent, modes.t || t, GUIDED_STEPS, selectedToolCatalogId);
  const allIds = new Function('return ' + sourceBetween("    all: ['glossary'", '\n  };').replace(/^\s*all:/, '').replace(/,\s*$/, ''))();
  const cardSources = sidebarSource + readFileSync('view_full_pack_run_source.jsx', 'utf8');

  it('uses the card title, not the Guided Mode step label', () => {
    expect(labelFor('simplified').label).toBe('Text Adaptation');
    expect(labelFor('image').label).toBe('Lesson Images');
    expect(labelFor('brainstorm').label).toBe('Activities');
    expect(labelFor('').label).toBe('');
  });

  it('follows the family and independent names the cards switch to', () => {
    expect(labelFor('glossary', { parent: true }).label).toBe('Word Helper');
    expect(labelFor('sentence-frames', { parent: true }).label).toBe('Writing Help');
    expect(labelFor('sentence-frames', { independent: true }).label).toBe('Writing Practice');
    expect(labelFor('lesson-plan', { independent: true }).label).toBe('Study Guide');
  });

  it('has a registered card key for every tool in the catalog', () => {
    expect(allIds).toHaveLength(23);
    for (const id of allIds) {
      for (const modes of [{}, { parent: true }, { independent: true }]) {
        const { key, label } = labelFor(id, modes);
        expect(key, id).toBeTruthy();
        expect(cardSources, `${id}: ${key} is not a key a card renders`).toContain(`'${key}'`);
        expect(label, `${id}: ${key}`).toBe(t(key));
        expect(typeof label, `${id}: ${key} is not registered`).toBe('string');
      }
    }
  });

  it('falls back to the old label only when no card name exists', () => {
    expect(labelFor('analysis').label).toBe('Analyze source material');
    expect(labelFor('ui-tool-something-new').label).toBe('Something New');
    expect(labelFor('simplified', { t: () => undefined }).label).toBe('Original with Supports');
  });
});
