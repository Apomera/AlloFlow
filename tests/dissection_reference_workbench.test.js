
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const file = 'stem_lab/stem_tool_dissection.js';
const source = readFileSync(file, 'utf8');
const definitions = source.slice(source.indexOf('var SPECIMENS ='), source.indexOf('var specimen = d.specimen'));
const specimens = new Function(definitions + '; return SPECIMENS;')();
const groups = JSON.parse(source.match(/var DISSECTION_COMPARISON_GROUPS = ([\s\S]*?);\n/)[1]);
function render(specimen, selectedOrgan, extra = {}) {
  const layer = specimens[specimen].layers.find(layer => (specimens[specimen].organs[layer.id] || []).some(org => org.id === selectedOrgan));
  const host = document.createElement('div');
  host.innerHTML = renderTool('dissection', { dissection: {
    specimen, _dissLoadedSpec: specimen, activeLayer: layer?.id || 'organs',
    selectedOrgan, anatomicalView: 'internal', ...extra,
  } });
  return host;
}
beforeEach(() => { resetStemLab(); loadTool(file, 'dissection'); });

describe('dissection reference workbench', () => {
  it('resolves every comparison member uniquely, with no duplicate membership', () => {
    const membership = new Set();
    for (const group of groups) {
      expect(Object.keys(group.members).length).toBeGreaterThan(1);
      for (const [key, id] of Object.entries(group.members)) {
        const hits = Object.values(specimens[key].organs).flat().filter(org => org.id === id);
        expect(hits.length, key + ':' + id).toBe(1);
        expect(membership.has(key + ':' + id)).toBe(false);
        membership.add(key + ':' + id);
      }
    }
  });
  it.each(groups.map(g => [g.id, Object.keys(g.members)[0], Object.values(g.members)[0], Object.keys(g.members).length]))(
    'renders the complete %s comparison with explicit membership', (id, specimen, organ, count) => {
      const panel = render(specimen, organ, { compareMode: true }).querySelector('#diss-comparison-panel');
      expect(panel.dataset.comparisonGroup).toBe(id);
      expect(panel.querySelectorAll('[data-comparison-specimen]')).toHaveLength(count);
      expect(panel.querySelectorAll('[data-current="true"]')).toHaveLength(1);
      for (const card of panel.querySelectorAll('[data-comparison-specimen]')) {
        const key = card.dataset.comparisonSpecimen;
        const group = groups.find(g => g.id === id);
        const expected = Object.values(specimens[key].organs).flat().find(o => o.id === group.members[key]);
        expect(card.querySelector('p').textContent).toBe(expected.fn);
      }
      expect(panel.textContent).toContain('does not mark other specimens as observed');
    });
  it.each([
    ['frog', 'tympanum'], ['frog', 'nictitating'], ['perch', 'swim_bladder'],
    ['sheepHeart', 'mitral'], ['sheepEye', 'optic_nerve'],
  ])('does not invent a name-based match for %s / %s', (specimen, organ) => {
    const panel = render(specimen, organ, { compareMode: true }).querySelector('#diss-comparison-panel');
    expect(panel.dataset.comparisonGroup).toBe('unmapped');
    expect(panel.querySelectorAll('article')).toHaveLength(0);
    expect(panel.textContent).toContain('Similar names alone do not establish');
  });
  it('keeps large and small intestine comparisons separate', () => {
    const panel = render('frog', 'lg_intestine', { compareMode: true }).querySelector('#diss-comparison-panel');
    expect(panel.textContent).toContain('Spiral Colon');
    expect(panel.textContent).not.toContain('Small Intestine');
  });
  it.each([
    ['frog','heart','frog'], ['earthworm','aortic_arches','worm'], ['pig','heart_p','pig'],
    ['perch','swim_bladder','fish'], ['crayfish','heart_c','crayfish'],
    ['sheepEye','lens','eye'], ['sheepHeart','mitral','heart'],
  ])('provides scoped reference context for %s', (specimen, organ, shape) => {
    const host = render(specimen, organ);
    const card = host.querySelector('[data-specimen-reference]');
    expect(card.dataset.specimenReference).toBe(shape);
    expect(card.textContent).toContain('schematic learning model');
    expect(card.querySelector('a').href).toMatch(/^https:\/\//);
    expect(card.querySelector('a').rel).toContain('noopener');
    expect(host.querySelector('[data-selection-reference]').nextElementSibling).toBe(host.querySelector('[data-dissection-evidence]'));
    expect(host.querySelector('[data-selection-reference]').textContent).not.toMatch(/250-350g|1\.4-1\.5kg|Mesoderm|Myocardial infarction/);
  });
  it('keeps a relationship in a hidden layer noninteractive', () => {
    const host = render('sheepEye', 'lens');
    const connections = host.querySelector('[data-reference-relationships]');
    expect(connections.textContent).toContain('Crystalline Lens');
    expect(connections.querySelectorAll('button')).toHaveLength(0);
    expect(connections.textContent).toContain('reveal or change view');
  });
  it('offers notes only for already inspected incomplete records', () => {
    const state = { exploredOrgans: { 'frog|heart': true, 'frog|lungs': true }, organNotes: { 'frog|heart': 'Visible between the lungs.' }, organConfidence: { 'frog|heart': 2 } };
    const host = render('frog', 'heart', state);
    expect(host.querySelector('[data-note-handoff]').textContent).toContain('Note and confidence recorded');
    expect([...host.querySelectorAll('[data-note-handoff] button')].map(button => button.textContent)).toContain('Continue notes: Lungs');
    expect(render('frog', 'heart').querySelector('[data-note-handoff] button')).toBeNull();
  });
  it('shows the actual missing evidence component in the directory', () => {
    const host = render('frog', null, { exploredOrgans: { 'frog|heart': true, 'frog|lungs': true }, organNotes: { 'frog|heart': 'A chambered structure.' } });
    expect(host.querySelector('[data-structure-record="heart"]').textContent).toBe('Add a confidence rating');
    expect(host.querySelector('[data-structure-record="lungs"]').textContent).toBe('Add an evidence note');
    expect(host.querySelector('[data-structure-record="stomach"]').textContent).toBe('Not yet inspected');
  });
  it('corrects pumping and buoyancy concepts at the shared data source', () => {
    const organs = key => Object.values(specimens[key].organs).flat();
    expect(organs('frog').find(o => o.id === 'heart').fn).not.toContain('90%');
    expect(organs('crayfish').find(o => o.id === 'heart_c').fn).toContain('through arteries');
    expect(organs('perch').find(o => o.id === 'swim_bladder').fn).toContain('regulates buoyancy');
    expect(organs('earthworm').find(o => o.id === 'aortic_arches').name).toBe('Aortic Arches (5 pairs)');
    expect(organs('pig').find(o => o.id === 'heart_p').fn).toContain('fetal shunts');
  });
});



describe('dissection structure discovery', () => {
  it('finds a structure in another layer without unlocking it', () => {
    const host = render('frog', null, { activeLayer: 'skin', organSearch: 'heart' });
    const result = host.querySelector('[data-layer-search-result="heart"]');
    expect(result.dataset.layerAccess).toBe('locked');
    expect(result.querySelector('button')).toBeNull();
    expect(result.textContent).toContain('Muscle');
    expect(host.querySelector('[data-other-layer-results]').open).toBe(true);
    expect(host.querySelector('#diss-directory-count').textContent).toContain('reference matches in other layers');
  });
  it('offers a layer jump only after the preceding layer is completed', () => {
    const host = render('frog', null, { activeLayer: 'skin', organSearch: 'heart', revealedLayers: { skin: true, muscle: true } });
    const result = host.querySelector('[data-layer-search-result="heart"]');
    expect(result.dataset.layerAccess).toBe('available');
    expect(result.querySelector('button').textContent).toBe('Open layer: Organs');
  });
  it('matches punctuation and word order without requiring an exact phrase', () => {
    const host = render('frog', null, { organSearch: '  CHAMBER — 3 HEART ' });
    expect(host.querySelectorAll('#diss-directory-results > button')).toHaveLength(1);
    expect(host.querySelector('#diss-organ-heart')).not.toBeNull();
  });
  it('distinguishes a filtered empty list from a missing structure', () => {
    const host = render('frog', null, { organSearch: 'stomach', directoryFilter: 'recorded' });
    expect(host.querySelector('.diss-directory-empty').textContent).toContain('No structures match this progress filter');
    expect(host.querySelector('[data-directory-filter="all"] span').textContent).toBe('3');
    expect(host.querySelector('[data-directory-filter="recorded"]').getAttribute('aria-pressed')).toBe('true');
  });
  it.each([
    ['unviewed', ['stomach', 'liver']],
    ['needs-record', ['lungs']],
    ['recorded', ['heart']],
  ])('applies %s filters to specimen-owned progress', (directoryFilter, expectedIds) => {
    const host = render('frog', null, {
      directoryFilter,
      exploredOrgans: { 'frog|heart': true, 'frog|lungs': true },
      organNotes: { 'frog|heart': 'Between the lungs.', 'pig|stomach': 'Other specimen only.' },
      organConfidence: { 'frog|heart': 2, 'pig|stomach': 3 },
    });
    for (const id of expectedIds) expect(host.querySelector('#diss-organ-' + id)).not.toBeNull();
    if (directoryFilter !== 'unviewed') expect(host.querySelector('#diss-organ-stomach')).toBeNull();
    expect(host.querySelector('[data-dissection-directory]').textContent).toContain('not verified mastery');
  });
  it('does not leak the discovery directory into an assessment', () => {
    const host = render('frog', null, { quizMode: true, organSearch: 'heart' });
    expect(host.querySelector('[data-dissection-directory]')).toBeNull();
    expect(host.querySelector('[data-other-layer-results]')).toBeNull();
    expect(host.querySelector('.diss-mission-shortcuts').textContent).toContain('Go to assessment');
    expect(host.querySelector('.diss-mission-shortcuts').textContent).not.toContain('Structures and notes');
  });
  it('does not treat punctuation-only input as every-specimen search', () => {
    const host = render('frog', null, { activeLayer: 'skin', organSearch: '--- ???' });
    expect(host.querySelector('[data-other-layer-results]')).toBeNull();
    expect(host.querySelectorAll('#diss-directory-results > button')).toHaveLength(4);
  });
});


describe('flashcard recall practice', () => {
  const scope = 'frog|organs';
  function card(practice = {}, extra = {}) {
    return render('frog', null, { flashcardMode: true, _flashcardPractice: { scope, ...practice }, ...extra }).querySelector('#diss-flashcard-panel');
  }
  it('starts with a recall prompt and no answer or rating controls exposed', () => {
    const panel = card();
    expect(panel.querySelector('#diss-flashcard-prompt').textContent).toBe('Heart (3-chamber)');
    expect(panel.querySelector('#diss-flashcard-answer').hidden).toBe(true);
    expect(panel.querySelector('#diss-flashcard-answer > p').textContent).toBe('');
    expect(panel.querySelector('textarea').getAttribute('aria-describedby')).toBe('diss-flashcard-task');
    expect(panel.textContent).toContain('separate from observed evidence');
    expect(panel.querySelector('[data-recall-stat="unrated"] dd').textContent).toBe('12');
  });
  it('reveals the complete reference function, with no unscoped clinical advice', () => {
    const panel = card({ revealed: true, drafts: { heart: 'A pump.' } });
    expect(panel.querySelector('#diss-flashcard-answer').hidden).toBe(false);
    expect(panel.querySelector('#diss-flashcard-answer > p').textContent).toBe(specimens.frog.organs.organs[0].fn);
    expect(panel.querySelector('textarea').value).toBe('A pump.');
    expect(panel.textContent).not.toContain(specimens.frog.organs.organs[0].clinical);
  });
  it.each([-1, 999, 0.5, '2', null])('recovers safely from an invalid card index %s', index => {
    const panel = card({ index });
    expect(panel.querySelector('[data-flashcard-counter]').textContent).toBe('1 / 12');
    expect(panel.querySelector('[data-flashcard-id]').dataset.flashcardId).toBe('heart');
  });
  it.each(['pig|organs', 'frog|skin'])('does not carry draft, answer, or self-ratings from %s', otherScope => {
    const panel = card({ scope: otherScope, index: 2, revealed: true, complete: true, ratings: { heart: 'recalled' }, drafts: { heart: 'Old answer' } });
    expect(panel.querySelector('[data-flashcard-id]').dataset.flashcardId).toBe('heart');
    expect(panel.querySelector('#diss-flashcard-answer').hidden).toBe(true);
    expect(panel.querySelector('textarea').value).toBe('');
    expect(panel.querySelector('[data-recall-stat="recalled"] dd').textContent).toBe('0');
  });
  it('uses a fixed review queue so re-rating one card cannot skip its neighbor', () => {
    const panel = card({ reviewIds: ['heart', 'lungs'], index: 1, ratings: { heart: 'recalled', lungs: 'again' } });
    expect(panel.querySelector('[data-flashcard-counter]').textContent).toBe('2 / 2');
    expect(panel.querySelector('[data-flashcard-id]').dataset.flashcardId).toBe('lungs');
  });
  it('deduplicates review cards and ignores stale IDs and invalid self-ratings', () => {
    const panel = card({ reviewIds: ['absent', 'lungs', 'lungs'], ratings: { heart: 'mastered', lungs: 'again', absent: 'recalled' } });
    expect(panel.querySelector('[data-flashcard-counter]').textContent).toBe('1 / 1');
    expect(panel.querySelector('[data-recall-stat="recalled"] dd').textContent).toBe('0');
    expect(panel.querySelector('[data-recall-stat="again"] dd').textContent).toBe('1');
  });
  it('reports incomplete practice honestly and offers focused follow-up rounds', () => {
    const panel = card({ complete: true, ratings: { heart: 'again', lungs: 'recalled' } });
    expect(panel.querySelector('#diss-flashcard-summary').textContent).toBe('Round complete');
    expect(panel.textContent).toContain('not a mastery score');
    expect(panel.textContent).toContain('Review marked cards (1)');
    expect(panel.textContent).toContain('Try unrated cards (10)');
    expect(panel.querySelector('[data-flashcard-id]')).toBeNull();
  });
  it('provides an empty-layer exit without an invalid card counter', () => {
    const panel = card({}, { activeLayer: 'missing' });
    expect(panel.querySelector('#diss-flashcard-summary').textContent).toBe('No structures in this layer');
    expect(panel.querySelector('[data-flashcard-counter]')).toBeNull();
    expect(panel.textContent).toContain('Return to specimen');
  });
});


describe('spatial view guide', () => {
  it.each([
    ['frog', 'heart', 'vertical', 'ANTERIOR', 'POSTERIOR'],
    ['earthworm', 'aortic_arches', 'vertical', 'ANTERIOR', 'POSTERIOR'],
    ['pig', 'heart_p', 'horizontal', 'CRANIAL', 'CAUDAL'],
    ['perch', 'heart_f', 'horizontal', 'ANTERIOR', 'POSTERIOR'],
    ['crayfish', 'heart_c', 'horizontal', 'ANTERIOR', 'POSTERIOR'],
    ['sheepEye', 'lens', 'horizontal', 'CORNEA', 'OPTIC NERVE'],
    ['sheepHeart', 'lv', 'vertical', 'BASE', 'APEX'],
  ])('uses the existing specimen axis for %s', (specimen, organ, axis, first, last) => {
    const panel = render(specimen, organ).querySelector('[data-spatial-guide]');
    const graphic = panel.querySelector('svg');
    expect(graphic.dataset.orientationAxis).toBe(axis);
    expect(graphic.getAttribute('aria-label')).toContain(first);
    expect(graphic.getAttribute('aria-label')).toContain(last);
    expect(panel.querySelector('[data-spatial-axis-text]').textContent).toContain(first + ' at ' + (axis === 'vertical' ? 'top' : 'left'));
    expect(panel.textContent).toContain('schematic 2D study views');
    expect(panel.textContent).toContain('does not cut tissue');
  });
  it.each(['dorsal', 'ventral', 'lateral', 'internal'])('identifies %s as the active direct-view choice', view => {
    const panel = render('frog', null, { anatomicalView: view }).querySelector('[data-spatial-guide]');
    expect(panel.querySelectorAll('[data-spatial-view]')).toHaveLength(4);
    expect(panel.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(panel.querySelector('[aria-pressed="true"]').dataset.spatialView).toBe(view);
  });
  it('describes horizontal ventral mirroring in both text and the drawing', () => {
    const panel = render('pig', 'heart_p', { anatomicalView: 'ventral' }).querySelector('[data-spatial-guide]');
    expect(panel.querySelector('svg').dataset.axisMirrored).toBe('true');
    expect(panel.querySelector('[data-spatial-axis-text]').textContent).toBe('CRANIAL at right; CAUDAL at left.');
    expect(Number(panel.querySelector('circle').getAttribute('cx'))).toBeGreaterThan(160);
  });
  it.each([{ quizMode: true }, { practicalMode: true }])('does not supply a navigation or reference bypass in an assessment: %o', state => {
    expect(render('frog', 'heart', state).querySelector('[data-spatial-guide]')).toBeNull();
  });
  it.each([['sheepEye', 'lens'], ['sheepHeart', 'lv']])('scopes isolated-organ presets for %s', (specimen, organ) => {
    const panel = render(specimen, organ).querySelector('[data-spatial-guide]');
    expect(panel.textContent).toContain('not a validated rotation of a scanned organ');
    expect(panel.textContent).not.toContain('Belly side');
  });
  it('calls the sequence overlay a layer map rather than an anatomical section', () => {
    const host = render('frog', null, { crossSectionMode: true, workspaceMode: 'advanced', toolbarViewOpen: true });
    expect(host.querySelector('[data-spatial-guide]').textContent).toContain('not tissue thickness or a true anatomical cross-section');
    expect(source).toContain("ctx.fillText('Layer map'");
    expect(source).not.toContain("ctx.fillText('Layer cross-section'");
  });
});


describe('optional 3D eye reference study', () => {
  it('keeps the renderer opt-in for the sheep-eye activity', () => {
    const host = render('sheepEye', null, { toolbarStudyOpen: true });
    expect(host.querySelector('#diss-eye-study-toggle')).not.toBeNull();
    expect(host.querySelector('[data-eye-canvas]')).toBeNull();
  });
  it.each(['frog', 'pig', 'sheepHeart'])('does not present the eye pilot as a %s model', specimen => {
    const host = render(specimen, null, { toolbarStudyOpen: true, eyeStudyMode: true });
    expect(host.querySelector('#diss-eye-study-toggle')).toBeNull();
    expect(host.querySelector('[data-eye-study]')).toBeNull();
  });
  it.each([{ quizMode: true }, { practicalMode: true }, { flashcardMode: true }, { compareMode: true }])('isolates the eye study from other activities: %o', extra => {
    expect(render('sheepEye', null, { eyeStudyMode: true, ...extra }).querySelector('[data-eye-study]')).toBeNull();
  });
  it('maps six reference selections to real sheep-eye structure IDs', () => {
    const panel = render('sheepEye', null, { eyeStudyMode: true }).querySelector('[data-eye-study]');
    const ids = Object.values(specimens.sheepEye.organs).flat().map(o => o.id);
    expect(panel.querySelectorAll('[data-eye-part]')).toHaveLength(6);
    for (const button of panel.querySelectorAll('[data-eye-part]')) expect(ids).toContain(button.dataset.eyePart);
    expect(panel.querySelector('[data-eye-part="lens"]').getAttribute('aria-pressed')).toBe('true');
    expect(panel.textContent).toContain('not a scan or a validated specimen reconstruction');
    expect(panel.textContent).toContain('Neural signals travel from the retina through the optic nerve');
    expect(panel.textContent).toContain('not a dissection instruction');
    expect(panel.querySelectorAll('a[target="_blank"][rel="noopener noreferrer"]')).toHaveLength(2);
  });
  it('provides the complete textual spatial description while 3D loads', () => {
    const panel = render('sheepEye', null, { eyeStudyMode: true }).querySelector('[data-eye-study]');
    expect(panel.dataset.eyeStatus).toBe('loading');
    expect(panel.textContent).toContain('aqueous-filled space');
    expect(panel.textContent).toContain('vitreous-filled space');
    expect(panel.textContent).toContain('tapetum lucidum');
    expect(panel.textContent).toContain('eye is not hollow');
    expect(panel.querySelector('[data-eye-canvas]').getAttribute('tabindex')).toBe('-1');
  });
});


describe('3D evidence handoff', () => {
  it('routes an uninspected locked structure to the directory, not an evidence note', () => {
    const panel = render('sheepEye', null, { activeLayer: 'skin', eyeStudyMode: true }).querySelector('[data-eye-handoff]');
    expect(panel.textContent).toContain('This layer is still locked');
    expect(panel.textContent).toContain('Not yet inspected in 2D');
    expect(panel.textContent).toContain('Find in 2D: Crystalline Lens');
    expect(panel.textContent).not.toContain('Review my evidence note');
  });
  it('offers note review only for an inspected structure in an available layer', () => {
    const panel = render('sheepEye', 'lens', { eyeStudyMode: true,
      exploredOrgans: { 'sheepEye|lens': true }, organNotes: { 'sheepEye|lens': 'Curved and translucent.' }, organConfidence: { 'sheepEye|lens': 2 }
    }).querySelector('[data-eye-handoff]');
    expect(panel.textContent).toContain('Review my evidence note');
    expect(panel.querySelector('[data-eye-record-status]').textContent).toBe('Note and confidence recorded');
  });
  it('does not bypass a layer lock using an old observation', () => {
    const panel = render('sheepEye', null, { activeLayer: 'skin', eyeStudyMode: true,
      exploredOrgans: { 'sheepEye|lens': true }
    }).querySelector('[data-eye-handoff]');
    expect(panel.textContent).toContain('Previously inspected in 2D');
    expect(panel.textContent).toContain('This layer is still locked');
    expect(panel.textContent).not.toContain('Review my evidence note');
  });
  it.each([['cornea', 'cornea'], ['missing', 'lens'], [null, 'lens']])('restores only a modeled return selection: %s', (saved, expected) => {
    const panel = render('sheepEye', null, { eyeStudyMode: true, _eyeStudyReturnPart: saved }).querySelector('[data-eye-study]');
    expect(panel.querySelector('[data-eye-part="' + expected + '"]').getAttribute('aria-pressed')).toBe('true');
  });
  it.each([[{}, true], [{ practicalMode: true }, false], [{ quizMode: true }, false], [{ _eyeStudyReturnPart: 'lens' }, false]])('scopes the return link to the matching note outside assessment: %o', (extra, visible) => {
    const host = render('sheepEye', 'cornea', { _eyeStudyReturnPart: 'cornea', exploredOrgans: { 'sheepEye|cornea': true }, ...extra });
    expect(host.textContent.includes('Return to 3D study: Cornea')).toBe(visible);
  });
});

describe('specimen-wide observation review', () => {
  const entries = { 'sheepEye|cornea': true, 'sheepEye|lens': true, 'frog|heart': true, 'sheepEye|missing': true };
  const notes = { 'sheepEye|lens': 'A curved translucent structure.', 'sheepEye|retina': 'Uninspected draft.' };
  function review(extra = {}) { return render('sheepEye', null, { activeLayer: 'skin', exploredOrgans: entries, organNotes: notes, organConfidence: { 'sheepEye|lens': 1 }, ...extra }).querySelector('[data-observation-review]'); }
  it('includes only inspected structures of the current specimen, across layers', () => {
    const panel = review();
    expect([...panel.querySelectorAll('[data-observation-entry]')].map(el => el.dataset.observationEntry)).toEqual(['cornea','lens']);
    expect(panel.textContent).not.toContain('Uninspected draft');
    expect(panel.querySelector('[data-observation-review-count]').textContent).toBe('2 of 2 inspected structures shown.');
    expect(panel.textContent).toContain('not accuracy scores');
  });
  it('shows a locked saved note without offering a navigation bypass', () => {
    const item = review().querySelector('[data-observation-entry="lens"]');
    expect(item.querySelector('[data-observation-locked]')).not.toBeNull();
    expect(item.querySelector('.diss-observation-review__note').textContent).toBe(notes['sheepEye|lens']);
    expect(item.querySelector('button')).toBeNull();
  });
  it('offers cross-layer note review when the layer is already available', () => {
    expect(review({ revealedLayers: { skin: true } }).querySelector('[data-observation-entry="lens"] button').textContent).toBe('Review note: Crystalline Lens');
  });
  it('filters missing records independently of low confidence', () => {
    const panel = review({ _observationReviewFilter: 'unfinished' });
    expect(panel.querySelectorAll('[data-observation-entry]')).toHaveLength(1);
    expect(panel.querySelector('[data-observation-entry]').dataset.observationEntry).toBe('cornea');
    expect(panel.querySelector('[data-observation-filter="unfinished"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('identifies low confidence without treating it as missing documentation', () => {
    const panel = review({ _observationReviewFilter: 'uncertain' });
    expect(panel.querySelectorAll('[data-observation-entry]')).toHaveLength(1);
    expect(panel.textContent).toContain('Note and confidence recorded');
    expect(panel.textContent).toContain('What feature or relationship');
  });
  it.each([0,4,-1,'invalid'])('treats invalid confidence %s as unrecorded', confidence => {
    const panel = review({ _observationReviewFilter: 'unfinished', organConfidence: { 'sheepEye|lens': confidence } });
    expect(panel.querySelectorAll('[data-observation-entry]')).toHaveLength(2);
    expect(panel.querySelector('[data-observation-entry="lens"]').textContent).toContain('Add a confidence rating');
  });
  it('explains empty and filtered-empty states', () => {
    expect(review({ exploredOrgans: {} }).textContent).toContain('Inspect a visible structure');
    expect(review({ _observationReviewFilter: 'uncertain', organConfidence: {} }).textContent).toContain('No observations match this filter');
    expect(review({ _observationReviewFilter: 'stale' }).querySelectorAll('[data-observation-entry]')).toHaveLength(2);
  });
  it.each([{ quizMode: true },{ practicalMode: true },{ flashcardMode: true },{ compareMode: true },{ eyeStudyMode: true }])('hides saved evidence during other activities: %o', extra => {
    expect(review(extra)).toBeNull();
  });
});

describe('observation summary preview', () => {
  const note = '  I observed a curved face.\nSecond line: α <not a tag> & details.  ';
  function summary(extra = {}) { return render('sheepEye', null, { activeLayer: 'skin',
    exploredOrgans: { 'sheepEye|cornea': true, 'sheepEye|lens': true, 'frog|heart': true, 'sheepEye|missing': true },
    organNotes: { 'sheepEye|lens': note, 'sheepEye|retina': 'Uninspected draft', 'frog|heart': 'Other specimen' },
    organConfidence: { 'sheepEye|lens': 1 }, ...extra }); }
  it('preserves student note text and keeps reference functions out of the export', () => {
    const field = summary().querySelector('#diss-observation-summary');
    expect(field.readOnly).toBe(true);
    expect(field.value).toContain(note);
    expect(field.value).not.toContain(specimens.sheepEye.organs.organs.find(org => org.id === 'lens').fn);
    expect(field.value).not.toContain('Uninspected draft');
    expect(field.value).not.toContain('Other specimen');
    expect(field.value).toContain('Scope: All inspected · 2 of 2 inspected structures');
    expect(field.value).toContain('Review prompts (not recorded evidence)');
  });
  it('labels missing evidence and a locked layer honestly', () => {
    const text = summary().querySelector('#diss-observation-summary').value;
    expect(text).toContain('[No evidence note recorded]');
    expect(text).toContain('Confidence: Not recorded');
    expect(text).toContain('Currently locked; saved note only');
    expect(text).toContain('does not verify identification accuracy or mastery');
  });
  it.each([['uncertain', 'Low confidence', 'Crystalline Lens', '1. Cornea'], ['unfinished', 'Needs notes', 'Cornea', 'Crystalline Lens']])('exports only the %s filter', (filter, label, included, absent) => {
    const text = summary({ _observationReviewFilter: filter }).querySelector('#diss-observation-summary').value;
    expect(text).toContain('Scope: ' + label + ' · 1 of 2 inspected structures');
    expect(text).toContain(included);
    expect(text).not.toContain(absent);
  });
  it.each([{ exploredOrgans: {} }, { _observationReviewFilter: 'uncertain', organConfidence: {} }, { quizMode: true }, { practicalMode: true }])('does not offer empty or assessment exports: %o', extra => {
    expect(summary(extra).querySelector('[data-observation-export]')).toBeNull();
  });
});

describe('observation search', () => {
  function search(query, extra = {}) { return render('sheepEye', null, { activeLayer: 'skin', _observationReviewSearch: query,
    exploredOrgans: { 'sheepEye|cornea': true, 'sheepEye|lens': true, 'frog|heart': true },
    organNotes: { 'sheepEye|lens': 'Café: two curved faces. Behind the iris.', 'sheepEye|retina': 'Uninspected secret', 'frog|heart': 'Foreign secret' },
    organConfidence: { 'sheepEye|lens': 1 }, ...extra }).querySelector('[data-observation-review]'); }
  it.each(['LENS curved', 'INTERNAL iris', 'cafe faces', 'café—FACES'])('matches all normalized words across names, layers and notes: %s', query => {
    const panel = search(query);
    expect(panel.querySelectorAll('[data-observation-entry]')).toHaveLength(1);
    expect(panel.querySelector('[data-observation-entry]').dataset.observationEntry).toBe('lens');
    expect(panel.querySelector('[data-observation-note-match]')).not.toBeNull();
    expect(panel.querySelector('[data-observation-filter="all"]').textContent).toBe('All inspected (1)');
    expect(panel.querySelector('[data-observation-filter="unfinished"]').textContent).toBe('Needs notes (0)');
  });
  it('keeps search independent from the 2D reference directory', () => {
    const panel = search('cornea', { organSearch: 'unrelated' });
    expect(panel.querySelector('[data-observation-entry]').dataset.observationEntry).toBe('cornea');
    expect(panel.querySelector('[data-observation-note-match]')).toBeNull();
  });
  it.each(['secret', 'curved cornea', 'notpresent'])('excludes uninspected drafts, other specimens and partial multiword matches: %s', query => {
    const panel = search(query);
    expect(panel.querySelectorAll('[data-observation-entry]')).toHaveLength(0);
    expect(panel.querySelector('[data-observation-export]')).toBeNull();
    expect(panel.querySelector('[data-observation-review-empty]').textContent).toContain('Clear the search or choose another filter');
  });
  it('intersects search with review filters and accurately labels export scope', () => {
    const panel = search('  curved faces  ', { _observationReviewFilter: 'uncertain' });
    const text = panel.querySelector('#diss-observation-summary').value;
    expect(text).toContain('Scope: Low confidence · 1 of 2');
    expect(text).toContain('Search: "curved faces" (structure names, layers, and student notes)');
    expect(text).not.toContain('1. Cornea');
    expect(panel.querySelector('[data-observation-entry="lens"] button')).toBeNull();
    expect(search('curved', { _observationReviewFilter: 'unfinished' }).querySelector('[data-observation-export]')).toBeNull();
  });
  it.each(['??? ---', '', null, 42])('treats empty or invalid query %s safely', query => {
    const panel = search(query);
    expect(panel.querySelectorAll('[data-observation-entry]')).toHaveLength(2);
    expect(panel.querySelector('#diss-observation-summary').value).not.toContain('Search:');
  });
});

describe('circulatory pump comparison diagrams', () => {
  function panel(extra = {}) { return render('frog', 'heart', { compareMode: true, ...extra }).querySelector('#diss-comparison-panel'); }
  it.each([['frog',2,1],['pig',2,2],['perch',1,1]])('draws the stated main chamber count for %s', (specimen, atria, ventricles) => {
    const figure = panel().querySelector('[data-pump-diagram="' + specimen + '"]');
    expect(figure.querySelectorAll('[data-pump-unit="atrium"]')).toHaveLength(atria);
    expect(figure.querySelectorAll('[data-pump-unit="ventricle"]')).toHaveLength(ventricles);
    expect(figure.querySelector('svg').getAttribute('role')).toBe('img');
    expect(figure.querySelector('svg').getAttribute('aria-label').length).toBeGreaterThan(60);
    expect(figure.querySelector('figcaption').textContent.length).toBeGreaterThan(30);
  });
  it('shows five paired vessel symbols rather than five vertebrate hearts', () => {
    const figure = panel().querySelector('[data-pump-diagram="earthworm"]');
    expect(figure.querySelectorAll('[data-pump-pair]')).toHaveLength(5);
    expect(figure.querySelectorAll('[data-pump-pair] path')).toHaveLength(10);
    expect(figure.querySelectorAll('[data-pump-unit="ventricle"]')).toHaveLength(0);
    expect(figure.querySelector('svg').getAttribute('aria-label')).toContain('five pairs');
  });
  it('distinguishes the crayfish outward-flow route from chamber diagrams', () => {
    const figure = panel().querySelector('[data-pump-diagram="crayfish"]');
    expect(figure.querySelectorAll('[data-pump-unit]')).toHaveLength(3);
    expect(figure.querySelector('[data-pump-unit="sinuses"]').getAttribute('stroke-dasharray')).toBe('5 4');
    expect(figure.querySelector('figcaption').textContent).toContain('Gills and the return route are omitted');
  });
  it('names fetal omissions and makes color and shape limits explicit', () => {
    const host = panel();
    expect(host.querySelector('[data-pump-diagram="pig"] figcaption').textContent).toContain('Fetal shunts and placental circulation are not drawn');
    expect(host.querySelector('[data-comparison-visual-key]').textContent).toContain('not oxygen levels');
    expect(host.querySelector('.diss-comparison-sources').querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(4);
  });
  it('does not attach pump diagrams to other comparison groups', () => {
    expect(render('frog','lungs',{ compareMode: true }).querySelector('[data-pump-diagram]')).toBeNull();
  });
  it.each([{ quizMode: true }, { practicalMode: true }])('hides comparison references if an assessment retains a stale compare flag: %o', extra => {
    expect(panel(extra)).toBeNull();
  });
});
