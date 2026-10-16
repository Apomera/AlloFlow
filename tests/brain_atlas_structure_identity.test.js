import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');

function helperRange(first, next) {
  const start = source.indexOf('function ' + first + '(');
  const end = source.indexOf('function ' + next + '(', start);
  if (start < 0 || end <= start) throw new Error('Missing Brain Atlas helper range: ' + first + ' → ' + next);
  return source.slice(start, end);
}

const helpers = [
  helperRange('brainAtlasProfileKey', 'brainAtlasStructureProfile'),
  helperRange('brainAtlasHumanize3DName', 'brainAtlas3DRecommendedView'),
  helperRange('brainAtlasMap3DRegion', 'brainAtlas3DColor'),
].join('\n');
const { canonical, humanize, family, pronunciation, mapRegion } = new Function(helpers + `
  return {
    canonical: brainAtlasProfileKey,
    humanize: brainAtlasHumanize3DName,
    family: brainAtlas3DFamilyInfo,
    pronunciation: brainAtlas3DPronunciation,
    mapRegion: brainAtlasMap3DRegion
  };
`)();

const poolStart = source.indexOf('var BRAIN_3D_CHALLENGE_POOL = [');
const poolEnd = source.indexOf('var brain3DChallenge = ', poolStart);
if (poolStart < 0 || poolEnd <= poolStart) throw new Error('Missing Brain Atlas challenge catalog');
const { challenges, challengeMatches } = new Function(
  source.slice(poolStart, poolEnd)
  + helperRange('brainAtlas3DChallengeMatches', 'brainAtlas3DChallengeRepresentative')
  + ';return {challenges:BRAIN_3D_CHALLENGE_POOL,challengeMatches:brainAtlas3DChallengeMatches};'
)();

const variants = name => [name, name + '_L', name + '_R.001'];
const thalamicNames = [
  'Allen_ventral_posterior_lateral_nucleus',
  'Allen_ventral_posterior_medial_nucleus',
  'Allen_dorsal_lateral_geniculate_nucleus',
  'Allen_medial_geniculate_nuclei',
  'Allen_midline_nuclear_complex',
];

describe('Brain Atlas structure identity', () => {
  it.each([
    ['Allen_ventral_posterior_lateral_nucleus_L', 'Allen_ventral_posterior_lateral_nucleus'],
    ['Allen_ventral_posterior_medial_nucleus_R.001', 'Allen_ventral_posterior_medial_nucleus'],
    ['Allen_dorsal_lateral_geniculate_nucleus_L.002', 'Allen_dorsal_lateral_geniculate_nucleus'],
    ['Allen_frontal_agranular_insular_cortex_area_Fl', 'Allen_frontal_agranular_insular_cortex_area_Fl'],
    ['Allen_temporal_agranular_insular_cortex_area_Tl', 'Allen_temporal_agranular_insular_cortex_area_Tl'],
    ['VH_M_optic_chiasm', 'VH_M_optic_chiasm'],
  ])('normalizes only mesh suffixes for %s', (name, expected) => {
    expect(canonical(name)).toBe(expected);
  });

  it.each(thalamicNames)('recognizes %s as thalamic without requiring thalamus in its name', name => {
    for (const key of variants(name)) {
      expect(family(key).label, key).toBe('Relay and integration');
      expect(mapRegion(key, 'medial'), key).toBe('thalamus');
    }
  });

  it.each([
    ['Allen_subthalamic_nucleus', 'basal_ganglia'],
    ['Allen_mammillothalamic_tract', null],
    ['Allen_septal_nuclei', null],
    ['Allen_mammillary_region_of_HTH', 'mammillary'],
    ['Allen_supraoptic_region_of_HTH', 'hypothalamus'],
    ['Allen_preoptic_region_of_HTH', 'hypothalamus'],
    ['Allen_tuberal_region_of_HTH', 'hypothalamus'],
    ['Allen_anterior_parahippocampal_gyrus', null],
    ['Allen_posterior_parahippocampal_gyrus', null],
    ['Allen_ingulo_parahippocampal_isthmus', null],
    ['Allen_head_of_hippocampus', 'hippocampus'],
    ['Allen_body_of_hippocampus', 'hippocampus'],
    ['Allen_tail_of_hippocampus', 'hippocampus'],
  ])('maps %s to an anatomically appropriate medial card', (name, expected) => {
    for (const key of variants(name)) expect(mapRegion(key, 'medial'), key).toBe(expected);
  });

  it('retains cortical counterparts for parahippocampal gyri instead of calling them hippocampus', () => {
    for (const name of ['Allen_anterior_parahippocampal_gyrus_L', 'Allen_posterior_parahippocampal_gyrus_R.001']) {
      expect(mapRegion(name, 'lateral')).toBe('temporal');
      expect(mapRegion(name, 'inferior')).toBe('temporal_inf');
    }
  });

  it('classifies CSF spaces before the brainstem tissue named in their location', () => {
    for (const name of ['Allen_central_canal_of_medulla_oblongata', 'Allen_cerebral_aqueduct', 'Allen_fourth_ventricle']) {
      expect(family(name).label, name).toBe('CSF spaces');
    }
    expect(family('Allen_tegmentum_of_medulla_oblongata').label).toBe('Brainstem');
    expect(family('Allen_subthalamic_nucleus_L').label).toBe('Basal ganglia');
    expect(family('Allen_mammillothalamic_tract_R').label).toBe('White-matter pathway');
  });

  it.each([
    ['Allen_thalamus_L', 'THAL-uh-mus'],
    ['Allen_hypothalamus_R.001', 'hy-poh-THAL-uh-mus'],
    ['Allen_corpus_callosum', 'KOR-pus kuh-LOH-sum'],
  ])('keeps pronunciation for an exact known label: %s', (name, expected) => {
    expect(pronunciation(name)).toBe(expected);
  });

  it.each([
    'Allen_anterior_parahippocampal_gyrus_L',
    'Allen_posterior_parahippocampal_gyrus_R',
    'Allen_amygdalohippocampal_area_L',
    'Allen_head_of_hippocampus_L',
    'Allen_body_of_hippocampus_R.001',
    'Allen_mammillothalamic_tract_L',
    'Allen_anterior_nuclear_complex_of_thalamus_R',
  ])('uses the full-name audio fallback rather than a shortened pronunciation for %s', name => {
    expect(pronunciation(name)).toBe('');
  });

  it('never labels the subthalamic nucleus pronunciation as thalamus', () => {
    for (const name of variants('Allen_subthalamic_nucleus')) {
      const hint = pronunciation(name);
      expect(hint).not.toBe('THAL-uh-mus');
      if (hint) {
        expect(hint).toMatch(/sub/i);
        expect(hint.trim().split(/\s+/).length).toBeGreaterThan(1);
      }
    }
  });

  it.each([
    'Allen_central_nuclear_group_L',
    'Allen_lateral_nucleus_R.001',
    'Allen_medial_nucleus_L',
    'Allen_anterior_cortical_nucleus_L',
    'Allen_posterior_cortical_nucleus_R',
  ])('identifies the amygdala in otherwise ambiguous model labels: %s', name => {
    expect(humanize(name)).toMatch(/amygdala/i);
    expect(family(name).label).toBe('Emotion and salience');
  });

  it('rejects non-thalamic selections whose names contain thalam in the thalamus challenge', () => {
    const challenge = challenges.find(item => item.id === 'thalamus');
    expect(challenge).toBeTruthy();
    for (const name of ['Allen_hypothalamus', 'Allen_subthalamic_nucleus', 'Allen_mammillothalamic_tract']) {
      for (const key of variants(name)) expect(challengeMatches(challenge, key), key).toBe(false);
    }
    for (const name of ['Allen_thalamus', ...thalamicNames]) {
      expect(challengeMatches(challenge, name + '_L'), name).toBe(true);
    }
  });

  it('rejects a medullary CSF space while accepting neural tissue in the brainstem challenge', () => {
    const challenge = challenges.find(item => item.id === 'brainstem');
    expect(challenge).toBeTruthy();
    for (const key of variants('Allen_central_canal_of_medulla_oblongata')) {
      expect(challengeMatches(challenge, key), key).toBe(false);
    }
    expect(challengeMatches(challenge, 'Allen_fourth_ventricle')).toBe(false);
    for (const name of ['Allen_basilar_part_of_pons', 'Allen_pontine_tegmentum', 'Allen_tegmentum_of_medulla_oblongata', 'Allen_midbrain_tegmentum']) {
      expect(challengeMatches(challenge, name), name).toBe(true);
    }
  });
});
