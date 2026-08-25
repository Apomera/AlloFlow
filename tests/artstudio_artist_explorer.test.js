import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');

beforeEach(() => resetStemLab());

describe('Art Studio Artist & Traditions Explorer', () => {
  it('provides broad, measurable regional and media coverage', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const explorer = window.ArtStudioArtistExplorer;
    const profiles = Array.from(explorer.profiles);

    expect(explorer.version).toBe(2);
    expect(profiles).toHaveLength(28);
    expect(new Set(profiles.map((profile) => profile.region))).toEqual(new Set([
      'Africa', 'Asia', 'Europe', 'Latin America & Caribbean',
      'Middle East & North Africa', 'North America', 'Oceania',
    ]));
    expect(new Set(profiles.map((profile) => profile.medium)).size).toBeGreaterThanOrEqual(7);
    expect(profiles.filter((profile) => profile.region !== 'Europe' && profile.region !== 'North America')).toHaveLength(20);
    expect(profiles.every((profile) => profile.overview && profile.lookFor && profile.context && profile.tryThis && profile.respect)).toBe(true);
    expect(profiles.every((profile) => Array.isArray(profile.labs) && profile.labs.length === 3)).toBe(true);
    expect(profiles.every((profile) => explorer.sourceUrl(profile).startsWith('https://'))).toBe(true);
    expect(typeof explorer.ensureSourcebook).toBe('function');
  });

  it('builds a bounded comparison without collapsing distinct context', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const comparison = window.ArtStudioArtistExplorer.compare([
      'hokusai', 'alma-thomas', 'hokusai', 'emily-kame-kngwarreye', 'lisa-reihana', 'missing',
    ]);

    expect(Array.from(comparison.profiles).map((profile) => profile.id)).toEqual([
      'hokusai', 'alma-thomas', 'emily-kame-kngwarreye',
    ]);
    expect(comparison.profiles).toHaveLength(3);
    expect(comparison.prompts).toHaveLength(3);
    expect(comparison.prompts.join(' ')).toContain('different histories');
    expect(comparison.prompts.join(' ')).toContain('without copying identity');
  });

  it('delegates artwork discovery to Sourcebook and excludes every denied or malformed result', async () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    let receivedOptions;
    const allowed = { id: 'allowed', title: 'Allowed image', imageUrl: 'https://images.example/allowed.jpg', sourceUrl: 'https://museum.example/allowed', rightsType: 'pd' };
    const denied = { id: 'denied', title: 'Denied image', imageUrl: 'https://images.example/denied.jpg', sourceUrl: 'https://museum.example/denied', rightsType: 'unknown' };
    const api = {
      version: 10,
      searchOpen: async (_query, options) => {
        receivedOptions = options;
        return [allowed, denied, { id: 'unsafe', title: 'Unsafe URL', imageUrl: 'http://images.example/unsafe.jpg', sourceUrl: 'https://museum.example/unsafe' }, allowed];
      },
      allowsRightsScope: (item, scope) => scope === 'pd' && item.rightsType === 'pd',
    };

    const profile = window.ArtStudioArtistExplorer.profiles[0];
    const results = await window.ArtStudioArtistExplorer.searchWorks(profile, api, { rightsScope: 'pd' });

    expect(receivedOptions).toMatchObject({ provider: 'All', kind: 'Visual assets', rightsScope: 'pd' });
    expect(Array.from(results).map((item) => item.id)).toEqual(['allowed']);
    expect(window.ArtStudioArtistExplorer.sourcebookQuery(profile)).toContain('museum open access');
  });

  it('filters by region, era, medium, and natural-language profile text', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const { filter } = window.ArtStudioArtistExplorer;

    expect(Array.from(filter({ region: 'Oceania' })).map((profile) => profile.id)).toEqual([
      'emily-kame-kngwarreye', 'lisa-reihana', 'yuki-kihara', 'fiona-foley',
    ]);
    expect(Array.from(filter({ era: 'Early modern' })).map((profile) => profile.id)).toEqual([
      'hokusai', 'artemisia-gentileschi',
    ]);
    expect(Array.from(filter({ medium: 'Printmaking' })).map((profile) => profile.id)).toEqual([
      'hokusai', 'kathe-kollwitz', 'laila-shawa',
    ]);
    expect(Array.from(filter({ query: 'public-school art teacher' })).map((profile) => profile.id)).toEqual(['alma-thomas']);
    expect(Array.from(filter({ query: 'colonial representation' })).map((profile) => profile.id)).toContain('lisa-reihana');
  });

  it('renders accessible filters, selectable profiles, context, and Studio handoffs', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: { tab: 'artistExplorer', artistProfileId: 'emily-kame-kngwarreye' },
    });

    expect(html).toContain('data-artstudio-artist-explorer="true"');
    expect(html).toContain('A wider map of artistic intelligence');
    expect(html).toContain('28 profiles');
    expect(html).toContain('aria-label="Search artist profiles"');
    expect(html).toContain('aria-label="Filter artists by region"');
    expect(html).toContain('role="list" aria-label="Artist and tradition profiles"');
    expect(html).toContain('aria-label="Selected artist study details"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('max-h-[72vh] overflow-y-auto');
    expect(html).toContain('Emily Kam Kngwarray');
    expect(html).toContain('Context matters');
    expect(html).toContain('Learn with respect');
    expect(html).toContain('Open Watercolor');
    expect(html).toContain('Find reusable collection images');
    expect(html).toContain('no result appears unless its item-level rights pass the selected allowlist');
    expect(html).toContain('Sourcebook’s verified provider service will load on demand');
    expect(html).toContain('Load Sourcebook &amp; find images');
    expect(html).toContain('Explore museum collection records');
    expect(html).toContain('this tab does not grant reuse permission');
  });

  it('renders a side-by-side inquiry workspace for selected profiles', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'artistExplorer',
        artistCompareIds: ['hokusai', 'alma-thomas'],
      },
    });

    expect(html).toContain('data-artist-comparison="true"');
    expect(html).toContain('Compare artistic decisions');
    expect(html).toContain('Hokusai');
    expect(html).toContain('Alma Thomas');
    expect(html).toContain('What appears similar at first');
    expect(html).toContain('Shared Studio labs');
  });

  it('normalizes legacy parent-view tab values so group, tab, and panel stay aligned', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', { artStudio: { tab: 'explore' } });
    const host = document.createElement('div');
    host.innerHTML = html;

    const groupBar = host.querySelector('[role="group"][aria-label="Art Studio tool groups"]');
    const activeGroup = groupBar.querySelector('[aria-pressed="true"]');
    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');

    expect(activeGroup.textContent).toContain('Paint & color');
    expect(activeTab.id).toBe('artstudio-tab-colorWheel');
    expect(activeTab.getAttribute('aria-controls')).toBe('artstudio-panel-colorWheel');
    expect(host.querySelector('#artstudio-panel-colorWheel')).not.toBeNull();
  });

  it('frames living and culturally specific practices as inquiry rather than style imitation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('they are not image-generation style presets');
    expect(source).toContain('carry the question—not a copied signature style');
    expect(source).toContain('Kusama is a living artist');
    expect(source).toContain('Pueblo designs are not a pattern pack');
    expect(source).toContain('Do not copy Anmatyerr marks or claim their meanings');
    expect(source).toContain('Kihara is a living artist');
  });

  it('keeps the deploy mirror byte-identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
