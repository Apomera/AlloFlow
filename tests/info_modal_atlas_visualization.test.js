import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_info_modal_source.jsx', 'utf8');

describe('Info modal Atlas visualization', () => {
  it('pairs the generated directory with a five-hub visual overview', () => {
    expect(source).toContain('function AtlasLandscape({ hubs, onChooseHub })');
    expect(source).toContain('aria-labelledby="atlas-landscape-title"');
    expect(source).toContain('const ATLAS_HUB_VISUALS');
    expect(source).toContain('<AtlasLandscape hubs={ATLAS_HUBS} onChooseHub={chooseHub} />');
    expect(source).toContain('id="atlas-directory-title"');
  });

  it('uses native buttons to open and focus their matching directory hubs', () => {
    expect(source).toContain('aria-controls={atlasHubId(hub.hub)}');
    expect(source).toContain('onClick={() => onChooseHub(hub.hub)}');
    expect(source).toContain("setAtlasView('directory')");
    expect(source).toContain("target.querySelector('summary')?.focus()");
    expect(source).toContain("window.matchMedia?.('(prefers-reduced-motion: reduce)')");
  });

  it('keeps the visualization supplemental and exposes text equivalents', () => {
    expect(source).toContain('<p className="sr-only">{hub.hub} overview: {visual.route.join(\', \')}.</p>');
    expect(source).toContain('aria-hidden="true" className="flex items-center gap-1.5"');
    expect(source).toContain("aria-label={cat.name + ' catalog entries'}");
    expect(source).toContain('role="listitem"');
    expect(source).toContain('focus-visible:ring-indigo-600');
  });

  it('searches the generated catalog and announces result counts', () => {
    expect(source).toContain('function filterAtlasHubs(query)');
    expect(source).toContain("const [atlasQuery, setAtlasQuery] = React.useState('')");
    expect(source).toContain('type="search"');
    expect(source).toContain('aria-describedby="atlas-search-status"');
    expect(source).toContain('id="atlas-search-status" role="status" aria-live="polite"');
    expect(source).toContain("if (event.key === 'Escape' && atlasQuery)");
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('aria-label="Clear Atlas search"');
  });

  it('uses progressive disclosure for dense areas and opens filtered matches', () => {
    expect(source).toContain('function AtlasAreaCard({ cat, index, visual, forceOpen, query })');
    expect(source).toContain('const sampleTools = cat.tools.slice(0, 3)');
    expect(source).toContain('<details open={forceOpen || undefined}');
    expect(source).toContain('forceOpen={isFiltered}');
    expect(source).toContain("key={hub.hub + '-' + cat.name + '-' + areaIndex}");
    expect(source).not.toContain('role="button"');
  });

  it('separates overview and directory without losing direct navigation', () => {
    expect(source).toContain("const [atlasView, setAtlasView] = React.useState('overview')");
    expect(source).toContain('role="group" aria-label="Atlas view"');
    expect(source).toContain("aria-pressed={atlasView === 'overview'}");
    expect(source).toContain("aria-pressed={atlasView === 'directory'}");
    expect(source).toContain("atlasView === 'overview' ? (");
    expect(source).toContain('Browse and search the directory');
  });

  it('shows interactive cross-hub journeys and highlighted search matches', () => {
    expect(source).toContain('const ATLAS_JOURNEYS = [');
    expect(source).toContain('function AtlasJourneys({ onChooseHub })');
    expect(source).toContain("onClick={() => onChooseHub(stop)}");
    expect(source).toContain('function AtlasHighlight({ text, query })');
    expect(source).toContain('<mark className="rounded-sm bg-amber-200 px-0.5 text-inherit">');
    expect(source).toContain('<AtlasHighlight text={tool} query={query} />');
  });

  it('gives every area a curated, non-prescriptive focus map', () => {
    expect(source).toContain('function getAtlasAreaLens(areaName)');
    expect(source).toContain("['self-awareness', ['Notice', 'Name', 'Understand', 'Advocate']]");
    expect(source).toContain("['inquiry lanes', ['Question', 'Gather', 'Analyze', 'Share']]");
    expect(source).toContain("const areaLens = getAtlasAreaLens(cat.name)");
    expect(source).toContain('role="list" aria-label={cat.name + \' focus\'}');
    expect(source).toContain('areaLens.map((focus) =>');
  });

  it('can expand or collapse all currently visible directory hubs', () => {
    expect(source).toContain('const expandVisibleHubs = () =>');
    expect(source).toContain('const collapseVisibleHubs = () =>');
    expect(source).toContain('visibleHubs.forEach((hub) => next.add(hub.hub))');
    expect(source).toContain('visibleHubs.forEach((hub) => next.delete(hub.hub))');
    expect(source).toContain('role="group" aria-label="Atlas hub visibility"');
    expect(source.match(/aria-controls="atlas-directory-hubs"/g)).toHaveLength(2);
    expect(source).toContain('id="atlas-directory-hubs"');
  });

  it('launches hubs through the shared command palette bridge', () => {
    expect(source).toContain("launchLabel: 'Open STEM Lab', launchQuery: 'stem lab'");
    expect(source).toContain('function AtlasTab({ t, onRequestClose })');
    expect(source).toContain("window.CustomEvent('alloflow:open-command-palette'");
    expect(source).toContain("detail: { query: safeQuery, source: 'atlas' }");
    expect(source).toContain("if (typeof onRequestClose === 'function') onRequestClose()");
    expect(source).toContain('onLaunch={launchHub}');
    expect(source).toContain('<AtlasTab t={t} onRequestClose={handleSetShowInfoModalToFalse} />');
    expect(source).toContain("aria-label={visual.launchLabel + ' using the command palette'}");
  });


  it('labels registry-backed and curated index provenance', () => {
    expect(source.match(/"sourceKind": "registry"/g)).toHaveLength(3);
    expect(source.match(/"sourceKind": "curated"/g)).toHaveLength(1);
    expect(source.match(/"sourceKind": "mixed"/g)).toHaveLength(1);
    expect(source).toContain('function AtlasScopeNote({ hubs })');
    expect(source).toContain('id="atlas-scope-title"');
    expect(source).toContain("hub.sourceKind === 'registry'");
    expect(source).toContain("hub.sourceLabel || 'Curated product index'");
    expect(source).toContain('<AtlasScopeNote hubs={ATLAS_HUBS} />');
  });

  it('describes counts as searchable entries rather than unique tools', () => {
    expect(source).toContain('Counts represent searchable catalog entries—not necessarily unique tools.');
    expect(source).toContain('{totalEntries} entries / {totalAreas} areas');
    expect(source).toContain('{hub.total} entries');
    expect(source).toContain('{countText} entries');
    expect(source).toContain("' matching catalog entry'");
    expect(source).toContain('>Catalog directory</h5>');
    expect(source).not.toContain('A map of everything inside AlloFlow');
    expect(source).not.toContain('Atlas is the complete live directory');
  });

});
