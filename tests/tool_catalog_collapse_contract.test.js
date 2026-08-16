import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

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
const catalogBridge = sourceBetween(
  '            {!guidedMode && (() => {\n              const ToolCatalogControls',
  '            {/* -- UniversalSettingsPanel'
);
const catalogMarkup = sourceBetweenIn(
  sidebarSource, 'function ToolCatalogControls(props) {',
  '// Types eligible for a differentiated set.'
);
const directToolMarkup = sourceBetween(
  '            <div style={{display: isGuidedToolVisible(\'math\')',
  '          )}\n            {!isTeacherMode && !activeSessionCode'
);

describe('Create a resource catalog collapse contract', () => {
  it('starts expanded while retaining independent query and filter state', () => {
    expect(catalogStateBlock).toContain("const [toolCatalogGroup, setToolCatalogGroup] = useState('essentials');");
    expect(catalogStateBlock).toContain("const [toolCatalogQuery, setToolCatalogQuery] = useState('');");
    expect(catalogStateBlock).toContain('const [isToolCatalogExpanded, setIsToolCatalogExpanded] = useState(true);');
    expect(catalogStateBlock).toContain("const [selectedToolCatalogId, setSelectedToolCatalogId] = useState('');");
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
    expect(directToolMarkup).toContain("onClick={() => { selectToolFromCatalog('package-deliver'); return fullPackRun?.status === 'ready' ? handleApproveFullPack() : handlePlanFullPack(); }}");
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
    expect(catalogMarkup).toContain("translate('sidebar.tool_finder_filtered')");
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
