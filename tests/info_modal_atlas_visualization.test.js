import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_info_modal_source.jsx', 'utf8');

describe('Info modal Atlas visualization', () => {
  it('pairs the generated directory with a five-hub visual overview', () => {
    expect(source).toContain('function AtlasLandscape({ hubs, onChooseHub, t })');
    expect(source).toContain('aria-labelledby="atlas-landscape-title"');
    expect(source).toContain('const ATLAS_HUB_VISUALS');
    expect(source).toContain('<AtlasLandscape hubs={ATLAS_HUBS} onChooseHub={chooseHub} t={t} />');
    expect(source).toContain('id="atlas-directory-title"');
    for (const id of ['documents', 'steam', 'sel', 'research', 'studios']) {
      expect(source).toContain(`"id": "${id}"`);
    }
  });

  it('uses native buttons to open and focus their matching directory hubs', () => {
    // Overview cards switch views before the directory exists, so aria-controls
    // would point at missing nodes until activation. The direct click/focus path
    // communicates the relationship without an invalid ID reference.
    expect(source).not.toContain('aria-controls={atlasHubId(hub.hub)}');
    expect(source).toContain('onClick={() => onChooseHub(hub.hub)}');
    expect(source).toContain("setAtlasView('directory')");
    expect(source).toContain("target.querySelector('summary')?.focus()");
    expect(source).toContain("window.matchMedia?.('(prefers-reduced-motion: reduce)')");
  });

  it('keeps the visualization supplemental and exposes text equivalents', () => {
    expect(source).toContain("{fmtInfo(t('about.atlas_route_sr') || '{hub} overview: {steps}.', { hub: visual.name, steps: visual.route.join(', ') })}");
    expect(source).toContain('aria-hidden="true" className="grid grid-cols-1 gap-1.5 sm:flex sm:items-center"');
    expect(source).toContain("aria-label={fmtInfo(t('about.atlas_area_entries_aria') || '{area} catalog entries', { area: area.name })}");
    expect(source).toContain('role="listitem"');
    expect(source).toContain('focus-visible:ring-indigo-600');
  });

  it('searches the generated catalog in the reader language and in English, and announces result counts', () => {
    expect(source).toContain('function filterAtlasHubs(query, t)');
    expect(source).toContain('has(tool) || has(atlasToolLabel(cat, i, t))');
    expect(source).toContain("const [atlasQuery, setAtlasQuery] = React.useState('')");
    expect(source).toContain('type="search"');
    expect(source).toContain('aria-describedby="atlas-search-status"');
    expect(source).toContain('id="atlas-search-status" role="status" aria-live="polite"');
    expect(source).toContain("if (event.key === 'Escape' && atlasQuery)");
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain("aria-label={t('about.atlas_search_clear_aria') || 'Clear Atlas search'}");
  });

  it('shows catalog names through their own translation keys', () => {
    expect(source).toContain('function atlasToolLabel(cat, index, t)');
    expect(source).toContain('"toolKeys": [');
    expect(source).toContain('"nameKey": "stem.tools_menu.math_fundamentals"');
    expect(source).toContain('"nameKey": "sel.hub.category_info.self-awareness.label"');
    expect(source).toContain('"about.atlas_docs.text_adaptation"');
  });

  it('uses progressive disclosure for dense areas and opens filtered matches', () => {
    expect(source).toContain('function AtlasAreaCard({ cat, index, visual, forceOpen, query, t })');
    expect(source).toContain("{labels.slice(0, 3).join(' / ')}");
    expect(source).toContain('<details open={forceOpen || undefined}');
    expect(source).toContain('forceOpen={isFiltered}');
    expect(source).toContain("key={hub.hub + '-' + cat.name + '-' + areaIndex}");
    expect(source).not.toContain('role="button"');
  });

  it('separates overview and directory without losing direct navigation', () => {
    expect(source).toContain("const [atlasView, setAtlasView] = React.useState('overview')");
    expect(source).toContain("role=\"group\" aria-label={t('about.atlas_view_aria') || 'Atlas view'}");
    expect(source).toContain("aria-pressed={atlasView === 'overview'}");
    expect(source).toContain("aria-pressed={atlasView === 'directory'}");
    expect(source).toContain("atlasView === 'overview' ? (");
    expect(source).toContain('Browse and search the directory');
  });

  it('shows interactive cross-hub journeys and highlighted search matches', () => {
    expect(source).toContain('const ATLAS_JOURNEYS = [');
    expect(source).toContain('function AtlasJourneys({ onChooseHub, t })');
    expect(source).toContain('onClick={() => onChooseHub(hub.hub)}');
    expect(source).toContain('function AtlasHighlight({ text, query })');
    expect(source).toContain('<mark className="rounded-sm bg-amber-200 px-0.5 text-inherit">');
    expect(source).toContain('<AtlasHighlight text={label} query={query} />');
  });

  it('gives every area a curated, non-prescriptive focus map keyed by its stable id', () => {
    expect(source).toContain('const ATLAS_AREA_TEXT = {');
    expect(source).toContain("selfawareness: ['Notice emotions, strengths, identity, and personal needs.', 'Notice | Name | Understand | Advocate']");
    expect(source).toContain("inquiry_lanes: ['Choose a research pathway shaped for the question and discipline.', 'Question | Gather | Analyze | Share']");
    expect(source).toContain('const area = atlasAreaText(cat, t)');
    expect(source).toContain("role=\"list\" aria-label={fmtInfo(t('about.atlas_area_focus_aria') || '{area} focus', { area: area.name })}");
    expect(source).toContain('area.lens.map((focus, i) =>');
    // Every generated area has its own words: no area falls back to the generic line.
    const hubsStart = source.indexOf('const ATLAS_HUBS = ');
    const hubs = JSON.parse(source.slice(hubsStart + 'const ATLAS_HUBS = '.length, source.indexOf(';\nconst ATLAS_STEAM_DIRECT_LINKS', hubsStart)));
    const textStart = source.indexOf('const ATLAS_AREA_TEXT = {');
    const textBlock = source.slice(textStart, source.indexOf('\n};', textStart));
    for (const hub of hubs) {
      for (const cat of hub.categories) {
        const slug = String(cat.id).replace(/^_cat_/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
        expect(textBlock, `area ${hub.id}/${cat.id} has no description`).toContain(`\n  ${slug}: [`);
      }
    }
  });

  it('can expand or collapse all currently visible directory hubs', () => {
    expect(source).toContain('const expandVisibleHubs = () =>');
    expect(source).toContain('const collapseVisibleHubs = () =>');
    expect(source).toContain('visibleHubs.forEach((hub) => next.add(hub.hub))');
    expect(source).toContain('visibleHubs.forEach((hub) => next.delete(hub.hub))');
    expect(source).toContain("role=\"group\" aria-label={t('about.atlas_visibility_aria') || 'Atlas hub visibility'}");
    expect(source.match(/aria-controls="atlas-directory-hubs"/g)).toHaveLength(2);
    expect(source).toContain('id="atlas-directory-hubs"');
  });

  it('launches hubs through the shared command palette bridge, and only offers learners what they can open', () => {
    expect(source).toContain("launchLabel: 'Find STEAM Lab', launchQuery: 'stem lab'");
    expect(source).toContain("launchLabel: 'Find Educator Hub', launchQuery: 'educator hub', teacherOnly: true");
    expect(source).toContain('function AtlasTab({ t, onRequestClose, canLaunchTeacherTools })');
    expect(source).toContain('(!visual.teacherOnly || canLaunchTeacherTools)');
    expect(source).toContain("window.CustomEvent('alloflow:open-command-palette'");
    expect(source).toContain("detail: { query: safeQuery, source: 'atlas' }");
    expect(source).toContain("if (typeof onRequestClose === 'function') onRequestClose()");
    expect(source).toContain('onLaunch={launchHub}');
    expect(source).toContain('<AtlasTab t={t} onRequestClose={handleSetShowInfoModalToFalse} canLaunchTeacherTools={isTeacherView} />');
    expect(source).toContain("aria-label={fmtInfo(t('about.atlas_launch_aria') || '{label} in the command palette', { label: visual.launchLabel })}");
  });

  it('keeps catalog provenance in the data and says it plainly in the footer', () => {
    expect(source.match(/"sourceKind": "registry"/g)).toHaveLength(3);
    expect(source.match(/"sourceKind": "curated"/g)).toHaveLength(1);
    expect(source.match(/"sourceKind": "mixed"/g)).toHaveLength(1);
    expect(source).toContain('STEAM Lab, SEL Hub, and Research Hub are read from the app’s own catalogs; the other hubs are hand-picked.');
    // Internal process wording and the hosting vendor stay out of the teacher-facing text.
    expect(source).not.toContain('function AtlasScopeNote');
    expect(source).not.toContain('Registry-backed');
    expect(source).not.toMatch(/Cloudflare (link|direct|directory)/);
  });

  it('describes counts as catalog entries rather than unique tools', () => {
    expect(source).toContain('Counts are entries in each catalog, and a few tools appear in more than one hub.');
    expect(source).toContain("'{count} entries / {areas} areas'");
    expect(source).toContain("'{count} entries'");
    expect(source).toContain("'{entries} matching catalog entries across {areas} areas.'");
    expect(source).toContain("{t('about.atlas_directory_title') || 'Catalog directory'}</h5>");
    expect(source).not.toContain('A map of everything inside AlloFlow');
    expect(source).not.toContain('Atlas is the complete live directory');
  });

  it('keeps expanded hubs readable and reflowable with text spacing at 320px', () => {
    expect(source).toContain('grid grid-cols-[auto_minmax(0,1fr)_auto] items-start sm:flex sm:items-center');
    expect(source).toContain('col-start-2 col-span-2 row-start-2 mt-2 justify-self-start max-w-full');
    expect(source).toContain('whitespace-normal break-words sm:mt-0 sm:shrink-0 sm:whitespace-nowrap');
    expect(source).toContain('hidden sm:block h-px min-w-2 flex-1 bg-slate-300');
    expect(source).toContain('min-w-0 sm:flex-1 whitespace-normal break-words');
    expect(source).toContain('id="atlas-directory-title" className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600"');
    expect(source).toContain('text-[10px] text-slate-600 leading-relaxed pt-1 border-t');
    expect(source).toContain('text-[9px] font-black uppercase tracking-wider text-slate-600 block mb-1');
    expect(source).toContain("font-black uppercase tracking-wider text-slate-600\">{t('about.atlas_examples') || 'Examples:'}");
    expect(source).toContain('text-[9px] font-black uppercase tracking-wider text-slate-600 mb-2');
    expect(source).toContain("accent: 'bg-sky-700'");
    expect(source).toContain("accent: 'bg-amber-700'");
    expect(source).not.toContain("accent: 'bg-sky-600'");
    expect(source).not.toContain("accent: 'bg-amber-600'");
  });

});
