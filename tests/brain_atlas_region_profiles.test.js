import { beforeEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const file = 'stem_lab/stem_tool_brainatlas.js';
const source = readFileSync(file, 'utf8');
const block = source.split('// BEGIN BRAIN ATLAS STRUCTURE PROFILES')[1]
  .split('// END BRAIN ATLAS STRUCTURE PROFILES')[0];
const { profiles, sources } = Function(block + ';return {profiles:BRAIN_ATLAS_REGION_PROFILES,sources:BRAIN_ATLAS_PROFILE_SOURCES};')();
const fields = ['functionText', 'connectionsText', 'clinicalText'];

// The 38 selectable anatomical regions in the four main diagram views.
// Keep this fixture independent of the authored catalog so missing profiles fail.
const regionsByView = {
  lateral: ['frontal', 'prefrontal', 'motor_cortex', 'parietal', 'temporal', 'occipital', 'cerebellum', 'brainstem', 'brocas', 'wernickes', 'insular', 'angular_gyrus', 'supramarginal'],
  medial: ['corpus_callosum', 'thalamus', 'hypothalamus', 'cingulate', 'hippocampus', 'amygdala', 'basal_ganglia', 'ventricles', 'pineal_brain', 'fornix', 'mammillary', 'septum_pell'],
  superior: ['longitudinal', 'central_sulcus', 'frontal_sup', 'parietal_sup', 'sma'],
  inferior: ['olfactory', 'optic_chiasm', 'temporal_inf', 'cerebellum_inf', 'medulla_inf', 'cn_nerves', 'pituitary_brain', 'circle_willis_brain'],
};
const regions = Object.entries(regionsByView).flatMap(([view, ids]) => ids.map(id => ({ view, id })));

function selectedDetail(view, id, detailMode) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('brainAtlas', {
    brainAtlas: { view, selectedRegion: id, atlasDisplayMode: 'diagram', detailMode },
  });
  return host.querySelector('#brainatlas-region-detail');
}

beforeEach(resetStemLab);

describe('brain atlas region-specific explanations', () => {
  it('covers all 38 main-view regions with distinct complete profiles and resolvable references', () => {
    expect(regions).toHaveLength(38);
    const ids = regions.map(region => region.id);
    expect(new Set(ids).size).toBe(38);
    expect(Object.keys(profiles).sort()).toEqual([...ids].sort());
    const explanations = new Set();

    for (const { id } of regions) {
      const profile = profiles[id];
      for (const field of fields) {
        expect(profile[field], id + ' ' + field).toBeTypeOf('string');
        expect(profile[field].length, id + ' ' + field).toBeGreaterThan(200);
        expect(profile[field], id + ' ' + field).not.toMatch(/Use neighboring structures|This is a named anatomical part|Its learning value comes from|\.{3}$|…$/);
      }
      explanations.add(fields.map(field => profile[field]).join('|'));
      expect(profile.sourceIds, id + ' references').toBeInstanceOf(Array);
      expect(profile.sourceIds.length, id + ' references').toBeGreaterThan(0);
      expect(new Set(profile.sourceIds).size, id + ' duplicate reference').toBe(profile.sourceIds.length);
      for (const sourceId of profile.sourceIds) {
        const reference = sources[sourceId];
        expect(reference, id + ' reference ' + sourceId).toBeTruthy();
        expect(reference.title.length, id + ' reference title').toBeGreaterThan(10);
        expect(new URL(reference.url).protocol, id + ' reference protocol').toBe('https:');
      }
    }
    expect(explanations.size).toBe(38);
  });

  it.each(regions)('renders the full $id profile in $view, closed in Plain and open in Advanced', ({ view, id }) => {
    loadTool(file, 'brainAtlas');
    const profile = profiles[id];

    for (const detailMode of ['plain', 'advanced']) {
      const detail = selectedDetail(view, id, detailMode);
      expect(detail, id + ' selected detail in ' + detailMode).not.toBeNull();
      const disclosures = detail.querySelectorAll('[data-brainatlas-region-profile]');
      expect(disclosures, id + ' profile count in ' + detailMode).toHaveLength(1);
      const disclosure = disclosures[0];
      expect(disclosure.tagName).toBe('DETAILS');
      expect(disclosure.getAttribute('data-brainatlas-region-profile')).toBe(id);
      expect(disclosure.open, id + ' disclosure in ' + detailMode).toBe(detailMode === 'advanced');
      expect(disclosure.querySelector('summary')).not.toBeNull();

      const renderedFields = [...disclosure.querySelectorAll('[data-brainatlas-region-profile-field]')];
      expect(renderedFields.map(node => node.getAttribute('data-brainatlas-region-profile-field')).sort()).toEqual([...fields].sort());
      for (const field of fields) {
        const node = renderedFields.find(element => element.getAttribute('data-brainatlas-region-profile-field') === field);
        // DOM text comparison verifies the complete prose, including punctuation
        // that React escapes in HTML; a summary or truncated card must fail.
        expect(node.textContent, id + ' ' + field + ' in ' + detailMode).toBe(profile[field]);
      }

      const referenceList = disclosure.querySelector('[data-brainatlas-profile-sources]');
      expect(referenceList, id + ' rendered references').not.toBeNull();
      expect(referenceList.getAttribute('data-brainatlas-profile-sources')).toBe('region:' + id);
      const links = [...referenceList.querySelectorAll('a')];
      expect(links.map(link => link.getAttribute('href'))).toEqual(profile.sourceIds.map(sourceId => sources[sourceId].url));
      expect(links.map(link => link.textContent)).toEqual(profile.sourceIds.map(sourceId => sources[sourceId].title));
      for (const link of links) {
        expect(link.target).toBe('_blank');
        expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      }
    }
  });
});
