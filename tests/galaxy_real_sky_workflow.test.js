import { beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const GALAXY_PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];

const REAL_SKY_SHARE_STRINGS = {
  real_sky_copy_view_link: 'Copy current view link',
  real_sky_copy_view_link_aria: 'Copy current view link for {target} in {survey}',
  real_sky_view_link_copied: 'Current atlas view link copied to the clipboard.',
  real_sky_view_link_copy_failed: 'Current atlas view link could not be copied. Open in Aladin and copy the browser address instead.',
  real_sky_view_link_copy_buffer_aria: 'Temporary atlas view link copy field',
};

const REAL_SKY_CAPACITY_STRINGS = {
  real_sky_notebook_capacity: '{count} of {limit} observations saved',
  real_sky_notebook_full: 'Evidence notebook full ({count} of {limit}). Download the report or remove an observation before saving another. Your draft will stay here.',
};

const REAL_SKY_SAVED_VIEW_STRINGS = {
  real_sky_observation_copy_view_link: 'Copy view link',
  real_sky_observation_copy_view_link_aria: 'Copy atlas view link for {target} in {survey}',
  real_sky_observation_view_link_copied: 'Atlas view link copied to the clipboard.',
  real_sky_observation_view_link_copy_failed: 'Atlas view link could not be copied. Open this observation in the atlas and try Copy current view link.',
  real_sky_report_view_link: 'Atlas view link',
};

function buttonOpeningTag(html, label) {
  const labelAt = html.indexOf(label);
  const buttonAt = html.lastIndexOf('<button', labelAt);
  return html.slice(buttonAt, html.indexOf('>', buttonAt) + 1);
}

function renderedDom(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

describe('Galaxy Real Sky evidence workflow contracts', () => {
  it.each(GALAXY_PATHS)('%s keeps search, comparison, and notebook state bounded', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('data-galaxy-real-sky-workbench');
    expect(source).toContain('data-galaxy-real-sky-comparison');
    expect(source).toContain('data-galaxy-real-sky-notebook');
    expect(source).toContain('type: "search"');
    expect(source).toContain('filteredRealSkyTargets');
    expect(source).toContain('selectRealSkySurvey');
    expect(source).toContain('toggleRealSkySurveyComparison');
    expect(source).toContain('data-galaxy-real-sky-survey-toggle');
    expect(source).toContain('data-galaxy-real-sky-survey-id');
    expect(source).toContain('data-galaxy-real-sky-comparison-card');
    expect(source).toContain('data-galaxy-real-sky-previous-survey');
    expect(source).toContain('data-galaxy-real-sky-current-survey');
    expect(source).toContain('realSkyAladinIsCurrent');
    expect(source).toContain('el.isConnected && el._galaxyAladin === aladin && el._galaxyAladinSignature === signature');
    expect(source).toContain('if (!realSkyAladinIsCurrent()) return;');
    expect(source).toContain('saveRealSkyObservation');
    expect(source).toContain('REAL_SKY_OBSERVATION_LIMIT = 8');
    expect(source).toContain('realSkyNotebookFull');
    expect(source).toContain('slice(0, REAL_SKY_OBSERVATION_LIMIT)');
    const capacityGuardAt = source.indexOf('if (realSkyNotebookFull) {');
    const liveViewCaptureAt = source.indexOf('resolveRealSkyLiveShareUrl()', capacityGuardAt);
    const observationMutationAt = source.indexOf('patchGalaxy({ realSkyObservations: [nextEntry].concat(realSkyObservations)');
    expect(capacityGuardAt).toBeGreaterThan(-1);
    expect(liveViewCaptureAt).toBeGreaterThan(capacityGuardAt);
    expect(observationMutationAt).toBeGreaterThan(liveViewCaptureAt);
    expect(source).not.toMatch(/concat\(realSkyObservations\)\.slice\s*\(/);
    expect(source).toContain('data-galaxy-real-sky-save-observation');
    expect(source).toContain('data-galaxy-real-sky-notebook-capacity');
    expect(source).toContain('data-galaxy-real-sky-notebook-full');
    expect(source).toContain('galaxy-real-sky-notebook-full');
    expect(source).toContain('REAL_SKY_RECIPES');
    expect(source).toContain('startRealSkyRecipe');
    expect(source).toContain('advanceRealSkyRecipe');
    expect(source).toContain('data-galaxy-real-sky-recipes');
    expect(source).toContain('buildRealSkyObservationReport');
    expect(source).toContain('downloadRealSkyObservationReport');
    expect(source).toContain('copyRealSkyObservationReport');
    expect(source).toContain('openRealSkyObservation');
    expect(source).toContain('resolveRealSkyObservationComparisonSurvey');
    expect(source).toContain('comparisonSurveyId');
    expect(source).toContain('beginRealSkyObservationEdit');
    expect(source).toContain('saveRealSkyObservationEdit');
    expect(source).toContain('cancelRealSkyObservationEdit');
    expect(source).toContain('removeRealSkyObservation');
    expect(source).toContain('undoRealSkyObservationRemoval');
    expect(source).toContain('realSkyRemovedObservation');
    expect(source).toContain('REAL_SKY_NOTE_MIN_LENGTH = 12');
    expect(source).toContain('REAL_SKY_NOTE_MAX_LENGTH = 600');
    expect(source).toContain('data-galaxy-real-sky-observation-id');
    expect(source).toContain('data-galaxy-real-sky-observation-editor');
    expect(source).toContain('data-galaxy-real-sky-observation-edit-button');
    expect(source).toContain('data-galaxy-real-sky-observation-remove-button');
    expect(source).toContain('data-galaxy-real-sky-observation-undo');
    expect(source).toContain('data-galaxy-real-sky-observation-undo-button');
    expect(source).toContain('data-galaxy-real-sky-copy-report');
    expect(source).toContain('data-galaxy-real-sky-clipboard-helper');
    expect(source).toContain('resolveRealSkyShareUrl');
    expect(source).toContain('fallbackCopyRealSkyText');
    expect(source).toContain('copyRealSkyText');
    expect(source).toContain('copyRealSkyViewLink');
    expect(source).toContain('getShareURL');
    expect(source).toContain('_galaxyAladinSignature');
    expect(source).toContain('encodeURIComponent(survey.id)');
    expect(source).toContain('data-galaxy-real-sky-copy-view-link');
    expect(source).toContain('data-galaxy-real-sky-external-link');
    expect(source).toContain('REAL_SKY_VIEW_URL_MAX_LENGTH = 4096');
    expect(source).toContain('buildRealSkyAladinUrl');
    expect(source).toContain('normalizeRealSkyAladinUrl');
    expect(source).toContain('resolveRealSkyLiveShareUrl');
    expect(source).toContain('resolveRealSkyObservationViewUrl');
    expect(source).toContain('copyRealSkyObservationViewLink');
    expect(source).toContain('data-galaxy-real-sky-observation-copy-view-link');
    expect(source).toContain('viewUrl');
    Object.keys(REAL_SKY_SHARE_STRINGS).forEach((key) => {
      expect(source).toContain('stem.galaxy.' + key);
    });
    Object.keys(REAL_SKY_CAPACITY_STRINGS).forEach((key) => {
      expect(source).toContain('stem.galaxy.' + key);
    });
    Object.keys(REAL_SKY_SAVED_VIEW_STRINGS).forEach((key) => {
      expect(source).toContain('stem.galaxy.' + key);
    });
    expect(source).toContain('maxLength: REAL_SKY_NOTE_MAX_LENGTH');
    expect(source).toContain('autoFocus: true');
    expect(source).toContain('stem.galaxy.real_sky_observation_edit_aria');
    expect(source).toContain('data-galaxy-real-sky-active-observation');
    expect(source).toContain('data-galaxy-real-sky-observation-comparison');
    expect(source).toContain('data-galaxy-real-sky-observation-open-button');
    expect(source).toContain('stem.galaxy.real_sky_observation_comparison');
    expect(source).toContain('stem.galaxy.real_sky_observation_open_comparison_aria');
    expect(source).toContain('stem.galaxy.real_sky_observation_opened_comparison');
    expect(source).toContain("text/plain;charset=utf-8");
    expect(source).toContain('sm:grid-cols-[1fr_auto_1fr]');
    expect(source).toContain('min-h-[44px] self-center');
  });

  it.each(GALAXY_PATHS)('%s keeps strict embedded saved-viewport restore guards', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('parseRealSkyObservationExactView');
    expect(source).toContain('applyRealSkyAladinCoordinates');
    expect(source).toContain('applyRealSkyObservationRestore');
    expect(source).toContain('realSkyPendingViewRef');
    expect(source).toMatch(/searchParams\.getAll\(['"]target['"]\)/);
    expect(source).toMatch(/searchParams\.getAll\(['"]fov['"]\)/);
    expect(source).toMatch(/searchParams\.getAll\(['"]survey['"]\)/);
    expect(source).toContain('data-galaxy-real-sky-observation-open-button');
    expect(source).toContain('gotoRaDec');
    expect(source).toMatch(/setFo[Vv]/);
    const openAt = source.indexOf('var openRealSkyObservation');
    const reportAt = source.indexOf('var buildRealSkyObservationReport', openAt);
    expect(openAt).toBeGreaterThan(-1);
    expect(reportAt).toBeGreaterThan(openAt);
    expect(source.slice(openAt, reportAt)).toContain('parseRealSkyObservationExactView');
  });

  it('keeps an exact same-metadata viewport actionable while its legacy preset is current', () => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool(GALAXY_PATHS[0], 'galaxy');
    const exactViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/2MASS/color',
        realSkyCatalog: 'none',
        realSkyObservations: [{
          id: 'obs-render-exact-restore',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          catalogId: 'none',
          note: 'The panned viewport remains distinct from the deterministic preset.',
          viewUrl: exactViewUrl,
        }, {
          id: 'obs-render-legacy-current',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          catalogId: 'none',
          note: 'The legacy row matches the current deterministic preset.',
        }],
      },
    }));

    const exactRow = dom.querySelector('[data-galaxy-real-sky-observation-id="obs-render-exact-restore"]');
    const legacyRow = dom.querySelector('[data-galaxy-real-sky-observation-id="obs-render-legacy-current"]');
    const exactButton = exactRow.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    const legacyButton = legacyRow.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(exactRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('false');
    expect(exactButton.disabled).toBe(false);
    expect(exactButton.getAttribute('aria-current')).toBeNull();
    expect(exactButton.className).toContain('min-h-[44px]');
    expect(legacyRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    expect(legacyButton.disabled).toBe(true);
    expect(legacyButton.getAttribute('aria-current')).toBe('true');
  });

  it('keeps saved-view restoration inside the existing Galaxy localization namespace', () => {
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_galaxy_en.json', 'utf8'));
    expect(Object.keys(catalog)).toHaveLength(628);
    [
      'real_sky_observation_open',
      'real_sky_observation_open_aria',
      'real_sky_observation_open_comparison_aria',
      'real_sky_observation_current_aria',
      'real_sky_observation_opened',
      'real_sky_observation_opened_comparison',
      'real_sky_observation_open_unavailable',
    ].forEach((key) => expect(Object.prototype.hasOwnProperty.call(catalog, key)).toBe(true));
  });
  it('keeps the canonical and desktop Galaxy sources byte-identical', () => {
    expect(sha256(readFileSync(GALAXY_PATHS[1], 'utf8'))).toBe(sha256(readFileSync(GALAXY_PATHS[0], 'utf8')));
  });

  it('keeps all 63 locale packs and both UI registries mirrored with every saved-view key', async () => {
    const localeFiles = readdirSync('lang').filter((file) => file.endsWith('.js')).sort();
    expect(localeFiles).toHaveLength(63);
    const localePairs = await Promise.all(localeFiles.map(async (file) => {
      const [canonical, deployed] = await Promise.all([
        readFile('lang/' + file, 'utf8'),
        readFile('desktop/web-app/public/lang/' + file, 'utf8'),
      ]);
      return { canonical, deployed };
    }));
    localePairs.forEach(({ canonical, deployed }) => {
      expect(sha256(deployed)).toBe(sha256(canonical));
      expect(canonical).not.toContain(',\\n{');
      Object.keys(REAL_SKY_SAVED_VIEW_STRINGS).forEach((key) => {
        expect(canonical.split('"' + key + '"')).toHaveLength(2);
      });
    });

    const [canonicalUi, deployedUi] = await Promise.all([
      readFile('ui_strings.js', 'utf8'),
      readFile('desktop/web-app/public/ui_strings.js', 'utf8'),
    ]);
    expect(sha256(deployedUi)).toBe(sha256(canonicalUi));
    expect(canonicalUi).not.toContain(',\\n{');
    Object.keys(REAL_SKY_SAVED_VIEW_STRINGS).forEach((key) => {
      expect(canonicalUi.split('"' + key + '"')).toHaveLength(2);
    });
  }, 30000);

  it('keeps current-view link strings exact and placeholder-safe in the Galaxy catalog', () => {
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_galaxy_en.json', 'utf8'));
    const actual = Object.fromEntries(Object.keys(REAL_SKY_SHARE_STRINGS).map((key) => [key, catalog[key]]));
    expect(actual).toEqual(REAL_SKY_SHARE_STRINGS);

    const placeholders = (value) => Array.from(value.matchAll(/\{([^}]+)\}/g), (match) => match[1]).sort();
    expect(placeholders(actual.real_sky_copy_view_link_aria)).toEqual(['survey', 'target']);
    Object.entries(actual).forEach(([key, value]) => {
      if (key !== 'real_sky_copy_view_link_aria') expect(placeholders(value)).toEqual([]);
    });
  });

  it('keeps saved-view strings exact, unique, and placeholder-safe in the Galaxy catalog', () => {
    const rawCatalog = readFileSync('dev-tools/i18n/stem_galaxy_en.json', 'utf8');
    const catalog = JSON.parse(rawCatalog);
    Object.keys(REAL_SKY_SAVED_VIEW_STRINGS).forEach((key) => {
      expect(rawCatalog.split('"' + key + '"')).toHaveLength(2);
    });
    const actual = Object.fromEntries(Object.keys(REAL_SKY_SAVED_VIEW_STRINGS).map((key) => [key, catalog[key]]));
    expect(actual).toEqual(REAL_SKY_SAVED_VIEW_STRINGS);

    const placeholders = (value) => Array.from(value.matchAll(/\{([^}]+)\}/g), (match) => match[1]).sort();
    expect(placeholders(actual.real_sky_observation_copy_view_link_aria)).toEqual(['survey', 'target']);
    Object.entries(actual).forEach(([key, value]) => {
      if (key !== 'real_sky_observation_copy_view_link_aria') expect(placeholders(value)).toEqual([]);
    });
  });

  it('keeps notebook-capacity strings exact and placeholder-safe in the Galaxy catalog', () => {
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_galaxy_en.json', 'utf8'));
    const actual = Object.fromEntries(Object.keys(REAL_SKY_CAPACITY_STRINGS).map((key) => [key, catalog[key]]));
    expect(actual).toEqual(REAL_SKY_CAPACITY_STRINGS);

    const placeholders = (value) => Array.from(value.matchAll(/\{([^}]+)\}/g), (match) => match[1]).sort();
    expect(placeholders(actual.real_sky_notebook_capacity)).toEqual(['count', 'limit']);
    expect(placeholders(actual.real_sky_notebook_full)).toEqual(['count', 'limit']);
  });
});

describe('Galaxy Real Sky evidence workflow rendering', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool(GALAXY_PATHS[0], 'galaxy');
  });

  it('filters the target inventory without changing the active atlas target', () => {
    const html = renderTool('galaxy', {
      galaxy: { simMode: 'realSky', realSkyTargetQuery: 'M87' },
    });

    expect(html).toContain('type="search"');
    expect(html).toContain('value="M87"');
    expect(html).toContain('1 of 12 targets');
    expect(html).toContain('M87 Virgo A');
    expect(html).not.toContain('M51 Whirlpool Galaxy');
    // Filtering the selector must not silently move the live atlas.
    expect(html).toContain('Andromeda Galaxy (M31)');
  });

  it('shows an explicit empty state for a search with no matches', () => {
    const html = renderTool('galaxy', {
      galaxy: { simMode: 'realSky', realSkyTargetQuery: 'not-a-real-target' },
    });

    expect(html).toContain('0 of 12 targets');
    expect(html).toContain('No atlas targets match this search.');
  });

  it('compares the previous and current wavelength with a reversible accessible control', () => {
    const html = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/2MASS/color',
        previousRealSkySurvey: 'P/DSS2/color',
        realSkySurveyHistory: ['P/DSS2/color', 'P/2MASS/color'],
      },
    });

    const dom = renderedDom(html);
    const comparison = dom.querySelector('[data-galaxy-real-sky-comparison="true"]');
    const toggle = dom.querySelector('[data-galaxy-real-sky-survey-toggle="true"]');
    const optical = dom.querySelector('[data-galaxy-real-sky-survey-id="P/DSS2/color"]');
    const nearInfrared = dom.querySelector('[data-galaxy-real-sky-survey-id="P/2MASS/color"]');
    const previous = dom.querySelector('[data-galaxy-real-sky-comparison-card="previous"]');
    const current = dom.querySelector('[data-galaxy-real-sky-comparison-card="current"]');
    const liveStatus = comparison.querySelector('[role="status"]');

    expect(comparison.getAttribute('role')).toBeNull();
    expect(liveStatus).not.toBeNull();
    expect(liveStatus.className).toContain('sr-only');
    expect(liveStatus.getAttribute('aria-live')).toBe('polite');
    expect(liveStatus.getAttribute('aria-atomic')).toBe('true');
    expect(liveStatus.textContent).toContain('Now viewing Near infrared; comparison view is Optical.');
    expect(comparison.getAttribute('data-galaxy-real-sky-previous-survey')).toBe('P/DSS2/color');
    expect(comparison.getAttribute('data-galaxy-real-sky-current-survey')).toBe('P/2MASS/color');
    expect(html).toContain('Previous view');
    expect(html).toContain('Current view');
    expect(html).toContain('2 of 3 surveys explored');
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toContain('Optical');
    expect(toggle.getAttribute('aria-label')).toBe('Switch atlas from Near infrared to Optical');
    expect(optical.getAttribute('aria-pressed')).toBe('false');
    expect(nearInfrared.getAttribute('aria-pressed')).toBe('true');
    expect(previous.textContent).toContain('Optical');
    expect(current.textContent).toContain('Near infrared');
  });

  it('renders the reversed comparison direction and selected survey markers', () => {
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/DSS2/color',
        previousRealSkySurvey: 'P/2MASS/color',
        realSkySurveyHistory: ['P/DSS2/color', 'P/2MASS/color'],
      },
    }));

    const comparison = dom.querySelector('[data-galaxy-real-sky-comparison="true"]');
    const toggle = dom.querySelector('[data-galaxy-real-sky-survey-toggle="true"]');
    expect(comparison.getAttribute('data-galaxy-real-sky-previous-survey')).toBe('P/2MASS/color');
    expect(comparison.getAttribute('data-galaxy-real-sky-current-survey')).toBe('P/DSS2/color');
    expect(toggle.textContent).toContain('Near infrared');
    expect(toggle.getAttribute('aria-label')).toBe('Switch atlas from Optical to Near infrared');
    expect(dom.querySelector('[data-galaxy-real-sky-survey-id="P/DSS2/color"]').getAttribute('aria-pressed')).toBe('true');
    expect(dom.querySelector('[data-galaxy-real-sky-survey-id="P/2MASS/color"]').getAttribute('aria-pressed')).toBe('false');
    expect(dom.querySelector('[data-galaxy-real-sky-comparison-card="previous"]').textContent).toContain('Near infrared');
    expect(dom.querySelector('[data-galaxy-real-sky-comparison-card="current"]').textContent).toContain('Optical');
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'not-a-survey'],
    ['same as current', 'P/2MASS/color'],
  ])('hides comparison controls when the previous survey is %s', (_case, previousSurvey) => {
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkySurvey: 'P/2MASS/color',
        previousRealSkySurvey: previousSurvey,
      },
    }));

    expect(dom.querySelector('[data-galaxy-real-sky-comparison="true"]')).toBeNull();
    expect(dom.querySelector('[data-galaxy-real-sky-survey-toggle="true"]')).toBeNull();
  });

  it('requires a substantive note before an observation can be saved', () => {
    const empty = renderTool('galaxy', { galaxy: { simMode: 'realSky' } });
    expect(buttonOpeningTag(empty, 'Save observation')).toMatch(/\sdisabled(?:=|>)/);

    const ready = renderTool('galaxy', {
      galaxy: { simMode: 'realSky', realSkyEvidenceNote: 'The dust lane fades in infrared.' },
    });
    expect(buttonOpeningTag(ready, 'Save observation')).not.toMatch(/\sdisabled(?:=|>)/);
  });

  it('exposes a localized, accessible capacity state without silently enabling a ninth save', () => {
    const entries = Array.from({ length: 8 }, (_, index) => ({
      id: 'obs-capacity-' + index,
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Capacity evidence observation number ' + index + '.',
    }));
    const fullDom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyEvidenceNote: 'This valid draft must wait until a notebook slot is free.',
        realSkyObservations: entries,
      },
    }));
    const fullSave = fullDom.querySelector('[data-galaxy-real-sky-save-observation="true"]');
    const fullNotice = fullDom.querySelector('[data-galaxy-real-sky-notebook-full="true"]');
    const fullCapacity = fullDom.querySelector('[data-galaxy-real-sky-notebook-capacity="true"]');

    expect(fullSave).not.toBeNull();
    expect(fullSave.disabled).toBe(true);
    expect(fullNotice).not.toBeNull();
    expect(fullNotice.id).toBe('galaxy-real-sky-notebook-full');
    expect(fullNotice.getAttribute('role')).toBe('status');
    expect(fullNotice.textContent).toBe(
      'Evidence notebook full (8 of 8). Download the report or remove an observation before saving another. Your draft will stay here.',
    );
    expect(fullSave.getAttribute('aria-describedby').split(/\s+/)).toEqual(expect.arrayContaining([
      'galaxy-real-sky-note-help',
      'galaxy-real-sky-notebook-full',
    ]));
    expect(fullCapacity.getAttribute('aria-label')).toBe('8 of 8 observations saved');

    const availableDom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyEvidenceNote: 'This valid draft can use the remaining notebook slot.',
        realSkyObservations: entries.slice(0, 7),
      },
    }));
    const availableSave = availableDom.querySelector('[data-galaxy-real-sky-save-observation="true"]');
    const availableCapacity = availableDom.querySelector('[data-galaxy-real-sky-notebook-capacity="true"]');

    expect(availableSave).not.toBeNull();
    expect(availableSave.disabled).toBe(false);
    expect(availableDom.querySelector('[data-galaxy-real-sky-notebook-full="true"]')).toBeNull();
    expect(availableCapacity.getAttribute('aria-label')).toBe('7 of 8 observations saved');
  });

  it('renders saved evidence with its target, survey, catalog, and remove control', () => {
    const html = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyObservations: [{
          id: 'obs-1',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          comparisonSurveyId: 'P/DSS2/color',
          catalogId: 'none',
          note: 'Infrared reveals stars behind the dark dust lane.',
        }],
      },
    });

    const dom = renderedDom(html);
    const row = dom.querySelector('[data-galaxy-real-sky-observation-id="obs-1"]');
    const comparison = row.querySelector('[data-galaxy-real-sky-observation-comparison="true"]');
    const openButton = row.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(html).toContain('data-galaxy-real-sky-observation="m104"');
    expect(html).toContain('M104 Sombrero Galaxy');
    expect(comparison).not.toBeNull();
    expect(comparison.textContent).toBe('Wavelength comparison: Optical \u2192 Near infrared \u00B7 Clean survey');
    expect(openButton.getAttribute('aria-label')).toBe('Open saved wavelength comparison for M104 Sombrero Galaxy: Optical to Near infrared');
    expect(html).toContain('Infrared reveals stars behind the dark dust lane.');
    expect(html).toContain('aria-label="Remove observation for M104 Sombrero Galaxy"');
    expect(openButton.disabled).toBe(false);
    expect(html).toContain('data-galaxy-real-sky-active-observation="false"');
    expect(html).toContain('1/8');
  });

  it('renders neutral saved-view copy actions for exact, legacy, and unsafe entries only when resolvable', () => {
    const exactViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyObservations: [{
          id: 'obs-view-exact',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          catalogId: 'none',
          note: 'The exact panned infrared view isolates the dust lane.',
          viewUrl: exactViewUrl,
        }, {
          id: 'obs-view-legacy',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          catalogId: 'none',
          note: 'This legacy entry can reconstruct its atlas link.',
        }, {
          id: 'obs-view-unsafe',
          targetKey: 'm42',
          surveyId: 'P/DSS2/color',
          catalogId: 'simbad',
          note: 'An unsafe restored link must never reach the learner.',
          viewUrl: 'javascript:alert(1)',
        }, {
          id: 'obs-view-unresolvable',
          targetKey: 'not-a-target',
          surveyId: 'P/not-a-survey',
          catalogId: 'none',
          note: 'No trusted atlas destination can be reconstructed.',
        }],
      },
    }));

    ['obs-view-exact', 'obs-view-legacy', 'obs-view-unsafe'].forEach((id) => {
      const button = dom.querySelector('[data-galaxy-real-sky-observation-id="' + id + '"] [data-galaxy-real-sky-observation-copy-view-link="true"]');
      expect(button).not.toBeNull();
      expect(button.textContent).toBe('Copy view link');
      expect(button.className).toContain('min-h-[44px]');
    });
    expect(
      dom.querySelector('[data-galaxy-real-sky-observation-id="obs-view-exact"] [data-galaxy-real-sky-observation-copy-view-link="true"]')
        .getAttribute('aria-label'),
    ).toBe('Copy atlas view link for M104 Sombrero Galaxy in Near infrared');
    expect(
      dom.querySelector('[data-galaxy-real-sky-observation-id="obs-view-unsafe"] [data-galaxy-real-sky-observation-copy-view-link="true"]')
        .getAttribute('aria-label'),
    ).toBe('Copy atlas view link for M42 Orion Nebula in Optical');
    expect(
      dom.querySelector('[data-galaxy-real-sky-observation-id="obs-view-unresolvable"] [data-galaxy-real-sky-observation-copy-view-link="true"]'),
    ).toBeNull();
  });

  it.each([
    ['missing', undefined],
    ['unknown', 'P/not-a-real-survey'],
    ['same as current', 'P/2MASS/color'],
    ['empty', ''],
    ['non-string', 42],
  ])('degrades a %s saved comparison id to a legacy single-survey entry', (_case, comparisonSurveyId) => {
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyObservations: [{
          id: 'obs-legacy-comparison',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          comparisonSurveyId,
          catalogId: 'none',
          note: 'Infrared reveals stars behind the dark dust lane.',
        }],
      },
    }));

    const row = dom.querySelector('[data-galaxy-real-sky-observation-id="obs-legacy-comparison"]');
    expect(row.querySelector('[data-galaxy-real-sky-observation-comparison="true"]')).toBeNull();
    expect(row.textContent).toContain('Near infrared \u00B7 Clean survey');
    const openButton = row.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(openButton).not.toBeNull();
    expect(openButton.getAttribute('aria-label')).toBe('Open saved observation for M104 Sombrero Galaxy in the atlas');
    expect(openButton.disabled).toBe(false);
  });

  it('bounds the new-observation composer while edit behavior remains transient', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'realSky' } });
    const composeTextareaTag = html.match(/<textarea[^>]*id="galaxy-real-sky-evidence-note"[^>]*>/)?.[0];

    expect(composeTextareaTag).toContain('maxLength="600"');
    expect(html).not.toContain('data-galaxy-real-sky-observation-editor="true"');
  });

  it('renders an accessible Edit note control and truncates oversized restored notes', () => {
    const oversizedNote = 'Z'.repeat(650);
    const html = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyObservations: [{
          id: 'obs-bounded',
          targetKey: 'm42',
          surveyId: 'P/DSS2/color',
          catalogId: 'simbad',
          note: oversizedNote,
        }],
      },
    });

    expect(html).toContain('data-galaxy-real-sky-observation-id="obs-bounded"');
    expect(html).toContain('data-galaxy-real-sky-observation-edit-button="true"');
    expect(html).toContain('aria-label="Edit observation note for M42 Orion Nebula"');
    expect(html).toContain('Edit note');
    expect(html).toContain('Z'.repeat(600));
    expect(html).not.toContain('Z'.repeat(601));
  });

  it('caps restored notebook data at eight valid observations', () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
      id: 'obs-' + index,
      targetKey: 'm31',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: 'Observation number ' + index + ' has enough evidence.',
    }));
    entries.splice(2, 0, null);

    const html = renderTool('galaxy', {
      galaxy: { simMode: 'realSky', realSkyObservations: entries },
    });

    expect(html).toContain('8/8');
    expect(html).toContain('Observation number 7 has enough evidence.');
    expect(html).not.toContain('Observation number 8 has enough evidence.');
  });

  it('offers three guided wavelength investigations', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'realSky' } });

    expect(html).toContain('data-galaxy-real-sky-recipes="true"');
    expect(html).toContain('data-galaxy-real-sky-recipe="dust-lane"');
    expect(html).toContain('data-galaxy-real-sky-recipe="stellar-nursery"');
    expect(html).toContain('data-galaxy-real-sky-recipe="warm-dust"');
    expect(html).toContain('See through a dust lane');
    expect(html).toContain('Reveal hidden young stars');
    expect(html).toContain('Trace warm star-forming dust');
    expect(html).toContain('Optical → Near infrared');
    expect(html).toContain('Optical → Mid infrared');
  });

  it('renders the first and comparison stages of an active recipe', () => {
    const first = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyRecipe: 'dust-lane',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/DSS2/color',
        realSkySurveyHistory: ['P/DSS2/color'],
      },
    });

    expect(first).toContain('data-galaxy-real-sky-recipe-guide="dust-lane"');
    expect(first).toContain('M104 · See through a dust lane');
    expect(first).toContain('Step 1 of 2');
    expect(first).toContain('View next wavelength');

    const compare = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyRecipe: 'dust-lane',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/2MASS/color',
        previousRealSkySurvey: 'P/DSS2/color',
        realSkySurveyHistory: ['P/DSS2/color', 'P/2MASS/color'],
      },
    });

    expect(compare).toContain('Step 2 of 2');
    expect(compare).toContain('data-galaxy-real-sky-comparison="true"');
    expect(compare).toContain('Compare the previous and current views.');

    const reversed = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyRecipe: 'dust-lane',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/DSS2/color',
        previousRealSkySurvey: 'P/2MASS/color',
        realSkySurveyHistory: ['P/DSS2/color', 'P/2MASS/color'],
      },
    });

    expect(reversed).toContain('data-galaxy-real-sky-recipe-guide="dust-lane"');
    expect(reversed).toContain('Step 2 of 2');
    expect(reversed).toContain('data-galaxy-real-sky-comparison="true"');
    expect(reversed).toContain('Compare the previous and current views.');
    expect(reversed).not.toContain('View next wavelength');
  });

  it('enables the accessible report only when saved evidence exists', () => {
    const empty = renderTool('galaxy', { galaxy: { simMode: 'realSky' } });
    expect(empty).toContain('accessible plain-text report');
    expect(buttonOpeningTag(empty, 'Download report')).toMatch(/\sdisabled(?:=|>)/);
    expect(buttonOpeningTag(empty, 'Copy report')).toMatch(/\sdisabled(?:=|>)/);

    const ready = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyObservations: [{
          id: 'obs-report',
          targetKey: 'm42',
          surveyId: 'P/2MASS/color',
          catalogId: 'simbad',
          note: 'Infrared reveals embedded stars behind dusty gas.',
        }],
      },
    });
    expect(buttonOpeningTag(ready, 'Download report')).not.toMatch(/\sdisabled(?:=|>)/);
    expect(buttonOpeningTag(ready, 'Copy report')).not.toMatch(/\sdisabled(?:=|>)/);
    expect(ready).toContain('data-galaxy-real-sky-download-report="true"');
    expect(ready).toContain('data-galaxy-real-sky-copy-report="true"');
    expect(buttonOpeningTag(ready, 'Copy report')).toContain('aria-describedby="galaxy-real-sky-report-help"');
    expect(ready).toContain('aria-describedby="galaxy-real-sky-report-help"');
  });

  it('marks a matching notebook entry as the current atlas view', () => {
    const html = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/2MASS/color',
        realSkyCatalog: 'none',
        realSkyObservations: [{
          id: 'obs-current',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          catalogId: 'none',
          note: 'Infrared reveals stars behind the dark dust lane.',
        }],
      },
    });

    expect(html).toContain('data-galaxy-real-sky-active-observation="true"');
    const currentButton = buttonOpeningTag(html, 'Current atlas view for M104 Sombrero Galaxy');
    expect(currentButton).toMatch(/\sdisabled(?:=|>)/);
    expect(currentButton).toContain('aria-current="true"');
    expect(html).toContain('✓ Current view');
  });

  it('marks only the exact oriented saved comparison as the current atlas state', () => {
    const observations = [{
      id: 'obs-pair-exact',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/DSS2/color',
      catalogId: 'none',
      note: 'The optical and infrared views reveal different dust structure.',
    }, {
      id: 'obs-pair-other',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/allWISE/color',
      catalogId: 'none',
      note: 'A different comparison uses the mid infrared survey.',
    }, {
      id: 'obs-pair-legacy',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'This older entry saved only one survey view.',
    }];
    const renderState = (overrides) => renderedDom(renderTool('galaxy', {
      galaxy: Object.assign({
        simMode: 'realSky',
        realSkyTarget: 'm104',
        realSkySurvey: 'P/2MASS/color',
        realSkyCatalog: 'none',
        realSkyObservations: observations,
      }, overrides),
    }));
    const active = (dom, id) => dom.querySelector('[data-galaxy-real-sky-observation-id="' + id + '"]')
      .getAttribute('data-galaxy-real-sky-active-observation');

    const exact = renderState({ previousRealSkySurvey: 'P/DSS2/color' });
    expect(active(exact, 'obs-pair-exact')).toBe('true');
    expect(active(exact, 'obs-pair-other')).toBe('false');
    expect(active(exact, 'obs-pair-legacy')).toBe('false');
    const exactButton = exact.querySelector('[data-galaxy-real-sky-observation-id="obs-pair-exact"] [data-galaxy-real-sky-observation-open-button="true"]');
    expect(exactButton.disabled).toBe(true);
    expect(exactButton.getAttribute('aria-current')).toBe('true');

    const legacy = renderState({ previousRealSkySurvey: '' });
    expect(active(legacy, 'obs-pair-exact')).toBe('false');
    expect(active(legacy, 'obs-pair-other')).toBe('false');
    expect(active(legacy, 'obs-pair-legacy')).toBe('true');

    const reversed = renderState({
      realSkySurvey: 'P/DSS2/color',
      previousRealSkySurvey: 'P/2MASS/color',
    });
    expect(active(reversed, 'obs-pair-exact')).toBe('false');
    expect(active(reversed, 'obs-pair-legacy')).toBe('false');
  });

  it('announces terminal recovery options without hiding saved-work continuity', () => {
    const html = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyStatus: 'error',
        realSkyMessage: 'Survey service timed out.',
      },
    });
    const dom = renderedDom(html);
    const atlas = dom.querySelector('#galaxy-real-sky-aladin');
    const recovery = dom.querySelector('#galaxy-real-sky-status');
    const message = dom.querySelector('#galaxy-real-sky-status-message');
    const hint = dom.querySelector('#galaxy-real-sky-recovery-hint');
    const retry = dom.querySelector('[data-galaxy-real-sky-retry="true"]');
    const reload = dom.querySelector('[data-galaxy-real-sky-reload="true"]');
    const reloadHint = dom.querySelector('#galaxy-real-sky-reload-hint');
    const preview = dom.querySelector('[data-galaxy-real-sky-static-preview="true"]');
    const previewImage = preview && preview.querySelector('img');
    const external = dom.querySelector('[data-galaxy-real-sky-external-link="recovery"]');

    expect(recovery.textContent).toContain('Real-sky atlas unavailable');
    expect(recovery.textContent).toContain('Your selected target and saved notes are safe.');
    expect(message.textContent).toBe('Survey service timed out.');
    expect(recovery.getAttribute('role')).toBe('alert');
    expect(recovery.getAttribute('aria-live')).toBe('assertive');
    expect(recovery.getAttribute('aria-atomic')).toBe('true');
    expect(atlas.getAttribute('aria-busy')).toBe('false');
    expect(atlas.getAttribute('aria-describedby').split(' ')).toEqual([
      'galaxy-real-sky-status-title',
      'galaxy-real-sky-status-message',
      'galaxy-real-sky-recovery-hint',
      'galaxy-real-sky-caption',
    ]);
    expect(recovery.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(retry.textContent).toContain('Retry atlas');
    expect(retry.getAttribute('aria-controls')).toBe('galaxy-real-sky-aladin');
    expect(retry.getAttribute('aria-describedby')).toBe(hint.id);
    expect(retry.className).toContain('min-h-[44px]');
    expect(retry.className).toContain('focus-visible:ring-2');
    expect(reload.textContent).toContain('Retry atlas');
    expect(reload.getAttribute('aria-controls')).toBe('galaxy-real-sky-aladin');
    expect(reload.getAttribute('aria-describedby')).toBe(reloadHint.id);
    expect(reload.getAttribute('aria-disabled')).toBe('false');
    expect(reload.className).toContain('min-h-[44px]');
    expect(reload.className).toContain('focus-visible:ring-2');
    expect(reloadHint.textContent).toContain('Your selected target and saved notes are safe.');
    expect(preview).not.toBeNull();
    expect(preview.querySelector('figcaption').textContent).toBe('M31 · Optical');
    expect(previewImage.getAttribute('src')).toBe(
      'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=960&height=640&projection=TAN&fov=4.2&ra=10.6847&dec=41.2692&coordsys=icrs&format=jpg',
    );
    expect(previewImage.getAttribute('alt')).toBe('Andromeda Galaxy · Optical');
    expect(previewImage.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(previewImage.getAttribute('crossorigin')).toBe('anonymous');
    expect(previewImage.getAttribute('decoding')).toBe('async');
    expect(previewImage.getAttribute('loading')).toBe('eager');
    expect(external.textContent).toContain('Open external atlas');
    expect(external.getAttribute('aria-controls')).toBe('galaxy-real-sky-aladin');
    expect(external.getAttribute('aria-describedby')).toBe(hint.id);
    expect(external.className).toContain('focus-visible:ring-2');
  });

  it('keeps the atlas busy only while its connection is in progress', () => {
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyStatus: 'loading',
        realSkyMessage: 'Loading Aladin Lite real-sky atlas...',
      },
    }));
    const atlas = dom.querySelector('#galaxy-real-sky-aladin');
    const status = dom.querySelector('#galaxy-real-sky-status');
    const reload = dom.querySelector('[data-galaxy-real-sky-reload="true"]');

    expect(atlas.getAttribute('aria-busy')).toBe('true');
    expect(atlas.getAttribute('aria-describedby')).toBe(
      'galaxy-real-sky-status-title galaxy-real-sky-status-message galaxy-real-sky-caption',
    );
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(reload).not.toBeNull();
    expect(reload.getAttribute('aria-disabled')).toBe('true');
    expect(reload.className).toContain('cursor-wait');
    expect(dom.querySelector('[data-galaxy-real-sky-retry="true"]')).toBeNull();
    expect(dom.querySelector('[data-galaxy-real-sky-static-preview="true"]')).toBeNull();
    expect(dom.querySelector('#galaxy-real-sky-recovery-hint')).toBeNull();
  });

  it('keeps in-place recovery available after the atlas reports ready', () => {
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyStatus: 'ready',
        realSkyMessage: 'Andromeda Galaxy loaded from real sky survey data.',
      },
    }));
    const atlas = dom.querySelector('#galaxy-real-sky-aladin');
    const reload = dom.querySelector('[data-galaxy-real-sky-reload="true"]');

    expect(atlas.getAttribute('aria-busy')).toBe('false');
    expect(atlas.getAttribute('aria-describedby')).toBe('galaxy-real-sky-caption');
    expect(dom.querySelector('[data-galaxy-live-survey-badge="true"]')).not.toBeNull();
    expect(reload.textContent).toContain('Retry atlas');
    expect(reload.getAttribute('aria-disabled')).toBe('false');
    expect(reload.getAttribute('aria-controls')).toBe(atlas.id);
    expect(reload.getAttribute('aria-describedby')).toBe('galaxy-real-sky-reload-hint');
    expect(dom.querySelector('[data-galaxy-real-sky-static-preview="true"]')).toBeNull();
  });

  it.each([
    ['P/DSS2/color', 'CDS%2FP%2FDSS2%2Fcolor'],
    ['P/2MASS/color', 'CDS%2FP%2F2MASS%2Fcolor'],
    ['P/allWISE/color', 'CDS%2FP%2FallWISE%2Fcolor'],
  ])('builds a bounded static recovery image for %s', (surveyId, encodedHipsId) => {
    const dom = renderedDom(renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyTarget: 'm104',
        realSkySurvey: surveyId,
        realSkyStatus: 'error',
      },
    }));
    const image = dom.querySelector('[data-galaxy-real-sky-static-preview="true"] img');
    const expected = 'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=' + encodedHipsId
      + '&width=960&height=640&projection=TAN&fov=0.9&ra=189.9976&dec=-11.6231&coordsys=icrs&format=jpg';

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe(expected);
    expect(image.getAttribute('src')).not.toContain('realSkyEvidenceNote');
    expect(image.getAttribute('src').length).toBeLessThan(260);
  });

  it('renders exact survey-aware external links and a copy action before the atlas is ready', () => {
    const html = renderTool('galaxy', {
      galaxy: {
        simMode: 'realSky',
        realSkyTarget: 'stephan',
        realSkySurvey: 'P/allWISE/color',
        realSkyStatus: 'error',
        realSkyMessage: 'Survey service timed out.',
      },
    });
    const dom = renderedDom(html);
    const expectedUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=Stephan%20Quintet&fov=0.45&survey=P%2FallWISE%2Fcolor';
    const headerLink = dom.querySelector('[data-galaxy-real-sky-external-link="header"]');
    const recoveryLink = dom.querySelector('[data-galaxy-real-sky-external-link="recovery"]');
    const copyButton = dom.querySelector('[data-galaxy-real-sky-copy-view-link="true"]');

    [headerLink, recoveryLink].forEach((link) => {
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe(expectedUrl);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noreferrer');
    });
    expect(copyButton).not.toBeNull();
    expect(copyButton.tagName).toBe('BUTTON');
    expect(copyButton.getAttribute('type')).toBe('button');
    expect(copyButton.disabled).toBe(false);
    expect(copyButton.className).toContain('min-h-[44px]');
    expect(copyButton.textContent).toContain('Copy current view link');
    expect(copyButton.getAttribute('aria-label')).toBe("Copy current view link for Stephan's Quintet in Mid infrared");
  });
});
