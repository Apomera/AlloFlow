import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.ART_STUDIO_LEARNING_SOURCE || 'stem_lab/stem_tool_artstudio.js';

beforeEach(() => {
  resetStemLab();
  loadTool(toolPath, 'artStudio');
});

describe('Art Studio learning content and translation boundaries', () => {
  it('gives every profile an explicit artist or institutional source', () => {
    const explorer = window.ArtStudioArtistExplorer;
    const profiles = Array.from(explorer.profiles);
    expect(profiles).toHaveLength(28);
    profiles.forEach(profile => {
      expect(profile.sourceUrl, profile.name).toMatch(/^https:\/\//);
      expect(explorer.sourceUrl(profile), profile.name).toBe(profile.sourceUrl);
      expect(profile.sourceUrl).not.toContain('si.edu/search?');
    });
    const kusama = profiles.find(profile => profile.id === 'yayoi-kusama');
    expect(kusama.life).toBe('1929–2026');
    expect(kusama.respect).not.toContain('living artist');
  });

  it('explains interpolation and Julia sets without the previous misconceptions', () => {
    const gradient = renderTool('artStudio', { artStudio: { tab: 'gradient', showGradInfo: true } });
    expect(gradient).toContain('halfway between pure red and pure blue is purple, not gray');
    expect(gradient).toContain('Neither HSL nor RGB is perceptually uniform');
    expect(gradient).not.toContain('passes through muddy grays');
    const fractal = renderTool('artStudio', { artStudio: { tab: 'fractal', showFractalInfo: true } });
    expect(fractal).toContain('Cantor Julia sets');
    expect(fractal).toContain('The Fatou set is the complement of the Julia set');
  });

  it('routes starting paths and coach prompts through the supplied translator', () => {
    const translated = new Map([
      ['Paint something', 'PAINT_START_TRANSLATED'],
      ['Paint & color', 'PAINT_GROUP_TRANSLATED'],
      ['One useful next move', 'COACH_TITLE_TRANSLATED'],
      ['Place one wet wash beside one dry-brush mark using the same pigment.', 'COACH_PROMPT_TRANSLATED'],
    ]);
    const t = (_key, fallback) => translated.get(fallback) || fallback;
    const home = renderTool('artStudio', { artStudio: { tab: 'watercolor', studioHome: true } }, { t });
    expect(home).toContain('PAINT_START_TRANSLATED');
    const lab = renderTool('artStudio', { artStudio: { tab: 'watercolor', studioHome: false, showTour: true } }, { t });
    expect(lab).toContain('PAINT_GROUP_TRANSLATED');
    expect(lab).toContain('COACH_TITLE_TRANSLATED');
    expect(lab).toContain('COACH_PROMPT_TRANSLATED');
  });

  it('translates profile prose and category labels without changing filter values or source metadata', () => {
    const t = (key, fallback) => fallback === 'A wider map of artistic intelligence' ? 'EXPLORER_TITLE_TRANSLATED' : ({
      'stem.artstudio.learning_artist_hokusai_overview': 'HOKUSAI_OVERVIEW_TRANSLATED',
      'stem.artstudio.learning_artist_hokusai_context': 'HOKUSAI_CONTEXT_TRANSLATED',
      'stem.artstudio.learning_category_asia': 'ASIA_TRANSLATED',
    })[key] || fallback;
    const html = renderTool('artStudio', { artStudio: { tab: 'artistExplorer', artistProfileId: 'hokusai', artistRegion: 'Asia' } }, { t });
    expect(html).toContain('EXPLORER_TITLE_TRANSLATED');
    expect(html).toContain('HOKUSAI_OVERVIEW_TRANSLATED');
    expect(html).toContain('HOKUSAI_CONTEXT_TRANSLATED');
    expect(html).toContain('value="Asia" selected="">ASIA_TRANSLATED');
    expect(html).toContain('href="https://www.metmuseum.org/art/collection/search/55286"');
    const profile = Array.from(window.ArtStudioArtistExplorer.profiles).find(item => item.id === 'hokusai');
    expect(profile.region).toBe('Asia');
    expect(profile.overview).not.toBe('HOKUSAI_OVERVIEW_TRANSLATED');
  });

  it('finds translated profile text as well as the original artist name', () => {
    const t = (key, fallback) => key === 'stem.artstudio.learning_artist_hokusai_context' ? 'UNIQUE_LOCALIZED_INQUIRY' : fallback;
    const html = renderTool('artStudio', { artStudio: { tab: 'artistExplorer', artistQuery: 'unique_localized_inquiry' } }, { t });
    expect(html).toContain('1 matching profile');
    expect(html).toContain('Katsushika Hokusai');
    expect(html).not.toContain('No profiles match these filters');
  });

  it('formats translated thread progress with evaluated numbers and stable step IDs', () => {
    const t = (_key, fallback) => fallback === 'Step {value1} of {value2}' ? 'TOTAL {value2}; STEP {value1}' : fallback;
    const html = renderTool('artStudio', { artStudio: { tab: 'pixel', studioHome: false, studioThreadId: 'tiny-night-world', studioThreadStep: 1, studioThreadRunId: 'learning-test-run' } }, { t });
    expect(html).toContain('TOTAL 3; STEP 2');
    expect(html).toContain('data-artstudio-thread="tiny-night-world"');
    expect(html).not.toContain('STEP 11');
  });

  it('registers dynamic artist-copy keys and corrected science keys in both English catalogs', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'ui_strings.js'), 'utf8')).stem.artstudio;
    const extraction = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dev-tools/i18n/stem_artstudio_en.json'), 'utf8'));
    const keys = ['gradient_interpolation_explained', 'julia_parameter_connection_explained', 'learning_category_asia', 'learning_artist_hokusai_overview'];
    keys.forEach(key => {
      expect(typeof registry[key], key).toBe('string');
      expect(extraction[key], key).toBe(registry[key]);
    });
  });
});

