import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const rotation = source.split('// BEGIN GALAXY ROTATION MODEL')[1].split('// END GALAXY ROTATION MODEL')[0];
const investigation = source.split('// BEGIN GALAXY ROTATION INVESTIGATION')[1].split('// END GALAXY ROTATION INVESTIGATION')[0];
const model = new Function(rotation + investigation + ';return {samples:galaxyRotationSamples,save:galaxyRotationSaveSample,trend:galaxyRotationSampleTrend,csv:galaxyRotationInvestigationCSV,note:galaxyRotationInvestigationNote,measure:orbitalMeasurementForModel};')();
const samples = (...radii) => radii.map(radiusKpc => ({ radiusKpc }));

describe('Galaxy rotation investigation model', () => {
  it.each([null, {}, 'bad', 14])('rejects a malformed collection %j', value => {
    expect(model.samples(value)).toEqual([]);
    expect(model.trend(value, 'flat')).toBeNull();
  });
  it('sanitizes, rounds, deduplicates and sorts inputs while discarding stored predictions', () => {
    const original = [{radiusKpc:12,speed:-8}, null, {radiusKpc:'6'}, {radiusKpc:6.01}, {radiusKpc:6.04}, {radiusKpc:0}, {radiusKpc:16}, {radiusKpc:NaN}, {radiusKpc:Infinity}, {radiusKpc:.6}];
    const before = original.map(x => x && {...x});
    expect(model.samples(original)).toEqual(samples(.6, 6, 12));
    expect(original).toEqual(before);
  });
  it('keeps at most eight valid unique entries without manufacturing boundary measurements', () => {
    expect(model.samples(samples(15,14,13,12,11,10,9,8,7))).toEqual(samples(8,9,10,11,12,13,14,15));
    expect(model.samples(samples(.59, 15.01))).toEqual([]);
  });
  it.each([NaN, Infinity, null, '8.2', -1, 0, 16])('does not save an invalid radius %j', radius => {
    expect(model.save(samples(6), radius)).toEqual({ samples: samples(6), result:'invalid' });
  });
  it('adds rounded radii and reports duplicates and capacity without overwriting existing points', () => {
    expect(model.save(samples(12), 6.04)).toEqual({samples:samples(6,12),result:'saved'});
    expect(model.save(samples(6), 6.049)).toEqual({samples:samples(6),result:'duplicate'});
    const full = samples(1,2,3,4,5,6,7,8);
    expect(model.save(full, 9)).toEqual({samples:full,result:'full'});
    expect(model.save(full, 8)).toEqual({samples:full,result:'duplicate'});
  });
  it.each([[], samples(6)])('requires two distinct radii to form a trend', value => {
    expect(model.trend(value, 'flat')).toBeNull();
  });
  it.each([
    ['flat',1,2], ['keplerian',Math.SQRT1_2,1], ['rigid',2,8]
  ])('compares equal outer locations for %s', (name,speedRatio,massRatio) => {
    const trend = model.trend(samples(12,6,8.2), name);
    expect(trend.innerRadius).toBe(6);expect(trend.outerRadius).toBe(12);
    expect(trend.radiusRatio).toBe(2);expect(trend.speedRatio).toBeCloseTo(speedRatio,12);
    expect(trend.massRatio).toBeCloseTo(massRatio,12);expect(trend.region).toBe('outer');
  });
  it('classifies core boundaries and computes crossing-core ratios from actual values', () => {
    expect(model.trend(samples(1.2,2.4),'flat')).toMatchObject({region:'core',radiusRatio:2,speedRatio:2,massRatio:8});
    const crossing = model.trend(samples(1.2,6),'flat');
    expect(crossing.region).toBe('crossing');expect(crossing.massRatio).toBeCloseTo(20,12);
    expect(model.trend(samples(2.4,6),'keplerian').region).toBe('outer');
    expect(model.trend(samples(6,12),'unknown').model).toBe('flat');
  });
  it('bounds notes and preserves ordinary punctuation and line breaks', () => {
    expect(model.note({})).toBe('');expect(model.note('x'.repeat(700))).toHaveLength(600);
    expect(model.note('I notice…\n"Mass"')).toBe('I notice…\n"Mass"');
  });
  it('exports sorted radii for every model using freshly rebuilt values, units and assumptions', () => {
    const csv = model.csv([{radiusKpc:12,speed:999}, {radiusKpc:6}], 'My evidence');
    expect(csv.startsWith('\ufeff"data_kind"')).toBe(true);
    const rows = csv.slice(1).trim().split('\r\n');expect(rows).toHaveLength(7);
    expect(rows[1]).toContain('"keplerian","6.0"');expect(rows[4]).toContain('"keplerian","12.0"');
    expect(rows[2]).toContain('"220.000000"');
    expect(rows[2]).toContain('"'+model.measure('flat',6).enclosedMassSolar.toFixed(3)+'"');
    expect(rows[1]).toContain('"teaching_model"');expect(rows[1]).toContain('not observed data');
    expect(csv).not.toContain('999');
  });
  it.each(['=HYPERLINK("bad")', '+1', '-1', '@SUM(1)', ' \t=1'])('makes formula-like notes literal spreadsheet cells: %s', note => {
    expect(model.csv(samples(6),note)).toContain('"\''+note.replaceAll('"','""')+'"');
  });
  it('quotes commas, quotes and multiline notes without creating extra CSV cells', () => {
    const csv = model.csv(samples(6), 'Inner, outer\n"same speed"');
    expect(csv).toContain('"Inner, outer\n""same speed"""');
    expect(model.csv(null, '')).toContain('"radius_kpc"');
  });
});

describe('Galaxy rotation investigation rendering', () => {
  beforeEach(() => { resetStemLab(); window._galaxyHasLoadedOnce=true; loadTool('stem_lab/stem_tool_galaxy.js','galaxy'); });
  function render(data={}) { const root=document.createElement('div');root.innerHTML=renderTool('galaxy',{galaxy:{simMode:'galaxy',galaxyControlPanel:'motion',...data}});return root; }
  it('offers collection and a bounded labeled note before the first measurement', () => {
    const root=render();expect(root.querySelector('[data-galaxy-rotation-save]').disabled).toBe(false);
    expect(root.querySelector('[data-galaxy-rotation-download]').disabled).toBe(true);
    expect(root.querySelector('[data-galaxy-rotation-trend]')).toBeNull();
    expect(root.querySelector('[data-galaxy-rotation-investigation]').textContent).toContain('6 and 12 kpc');
    const note=root.querySelector('#galaxy-rotation-investigation-note');expect(note.maxLength).toBe(600);
    expect(root.querySelector('label[for="'+note.id+'"]').textContent).toContain('Evidence note');
    expect(root.querySelector('#galaxy-rotation-probe-radius').dir).toBe('ltr');
  });
  it.each(['flat','keplerian','rigid'])('rebuilds saved cards and chart marks under the active %s model', name => {
    const root=render({rotMode:name,rotationSamples:samples(12,6),rotationInvestigationNote:'I see mass change.'});
    const cards=[...root.querySelectorAll('[data-galaxy-rotation-sample]')];expect(cards).toHaveLength(2);
    expect(cards.map(c=>Number(c.dataset.galaxyRotationSample))).toEqual([6,12]);
    for(const card of cards) {
      const radius=Number(card.dataset.galaxyRotationSample),orbit=model.measure(name,radius);
      expect(Number(card.dataset.speed)).toBeCloseTo(orbit.speed,10);expect(Number(card.dataset.mass)).toBeCloseTo(orbit.enclosedMassSolar,2);
      expect(card.textContent).toContain(Math.round(orbit.periodMyr)+' Myr');
      const mark=root.querySelector('[data-galaxy-rotation-saved-point="'+radius+'"]');
      expect(mark.dataset.model).toBe(name);expect(Number(mark.dataset.speed)).toBeCloseTo(orbit.speed,10);
      expect(mark.querySelector('title').textContent).toContain(radius.toFixed(1)+' kpc');
    }
    const trend=root.querySelector('[data-galaxy-rotation-trend]');expect(Number(trend.dataset.massRatio)).toBeCloseTo(model.trend(samples(6,12),name).massRatio,10);
    expect(root.querySelector('#galaxy-rotation-investigation-note').value).toBe('I see mass change.');
    expect(root.querySelector('[data-galaxy-rotation-download]').disabled).toBe(false);
  });
  it('explains core and crossing-core comparisons without claiming outer-law ratios', () => {
    expect(render({rotationSamples:samples(1.2,2.4)}).querySelector('[data-galaxy-rotation-trend-explanation]').textContent).toContain('inside the core');
    expect(render({rotationSamples:samples(1.2,6)}).querySelector('[data-galaxy-rotation-trend-explanation]').textContent).toContain('cross the core');
    expect(render({rotationSamples:samples(1.2,6),rotMode:'rigid'}).querySelector('[data-galaxy-rotation-trend-explanation]').textContent).toContain('radius cubed');
  });
  it('disables duplicate and full collection while keeping download and revisit available', () => {
    const duplicate=render({rotationSamples:samples(6),rotationProbeRadius:6});
    expect(duplicate.querySelector('[data-galaxy-rotation-save]').disabled).toBe(true);
    expect(duplicate.querySelector('[data-galaxy-rotation-revisit]').getAttribute('aria-pressed')).toBe('true');
    expect(duplicate.querySelector('#galaxy-rotation-save-help').textContent).toContain('already saved');
    const full=render({rotationSamples:samples(1,2,3,4,5,6,7,8),rotationProbeRadius:12});
    expect(full.querySelector('[data-galaxy-rotation-save]').disabled).toBe(true);
    expect(full.querySelector('#galaxy-rotation-save-help').textContent).toContain('make room');
    expect(full.querySelectorAll('[data-galaxy-rotation-remove]')).toHaveLength(8);
  });
  it('discards malformed saved data and escapes persisted evidence text', () => {
    const root=render({rotationSamples:[null,{radiusKpc:'bad'},{radiusKpc:Infinity},{radiusKpc:6}],rotationInvestigationNote:'<img src=x onerror=alert(1)>'});
    expect(root.querySelectorAll('[data-galaxy-rotation-sample]')).toHaveLength(1);
    expect(root.textContent).not.toMatch(/NaN|Infinity/);
    expect(root.querySelector('#galaxy-rotation-investigation-note img')).toBeNull();
    expect(root.querySelector('#galaxy-rotation-investigation-note').value).toContain('<img');
  });
  it.each(['elliptical','irregular'])('retains the correct science scope for %s', galaxyType => {
    const root=render({galaxyType,rotationSamples:samples(6,12)});
    expect(root.querySelector('[data-galaxy-rotation-investigation]')).toBeNull();
    expect(root.querySelector('[data-galaxy-rotation-save]')).toBeNull();
  });
});
