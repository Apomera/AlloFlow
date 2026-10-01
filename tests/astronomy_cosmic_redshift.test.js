import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
const model = state => window.__alloAstroPure.cosmicRedshiftModel(state);
const render = state => new window.DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'galaxies', observingList: [], ...state } }), 'text/html');

// Independent reference fixtures: SDSS DR20 vacuum conversion table (Å / 10).
const lines = [['lya',121.567],['hb',486.2683],['oiii',500.8239],['ha',656.4614]];
describe('Cosmological redshift wavelength model', () => {
  it.each(lines)('retains the vacuum wavelength for %s', (id, nm) => {
    const m = model({ redshiftLine:id, redshiftZ:0 });
    expect(m.selected.restNm).toBe(nm);
    expect(m.selected.observedNm).toBe(nm);
    expect(m.selected.observedX).toBe(m.selected.restX);
  });
  it.each([0,1,3,10.603,14.1793,15])('stretches every line by the same physical ratio at z=%s', z => {
    const m=model({redshiftZ:z});
    expect(m.stretch).toBe(1+z);
    for(const [id, nm] of lines) {
      const row=m.rows.find(r=>r.id===id);
      expect(row.observedNm).toBeCloseTo(nm*(1+z),10);
      expect(row.observedNm/row.restNm-1).toBeCloseTo(z,10);
      for(const x of [row.restX,row.observedX]) { expect(x).toBeGreaterThanOrEqual(24); expect(x).toBeLessThanOrEqual(396); }
    }
  });
  it('keeps a fixed log scale so equal wavelength ratios have equal spacing', () => {
    const m=model({redshiftZ:3});
    expect(m.x(100)).toBe(24);
    expect(m.x(12000)).toBe(396);
    expect(m.x(200)-m.x(100)).toBeCloseTo(m.x(400)-m.x(200),12);
    expect(m.rows[0].observedX-m.rows[0].restX).toBeCloseTo(m.rows[3].observedX-m.rows[3].restX,12);
  });
  it('classifies the approximate UV, visible and infrared bands at their boundaries', () => {
    const m=model({redshiftZ:0});
    expect([m.band(379.999),m.band(380),m.band(750),m.band(750.001)]).toEqual(['uv','visible','visible','infrared']);
    expect(model({redshiftLine:'ha',redshiftZ:1}).selected.band).toBe('infrared');
    expect(model({redshiftLine:'lya',redshiftZ:3}).selected.band).toBe('visible');
  });
  it.each([null,[],false,{redshiftZ:Infinity,redshiftLine:{}},{redshiftZ:'NaN'},{redshiftZ:true},{redshiftZ:''}])('recovers malformed restoration with finite positions', state => {
    const m=model(state);
    expect(m.z).toBe(1); expect(m.selected.id).toBe('ha'); expect(m.reference).toBeNull();
    for(const row of m.rows) for(const v of [row.restX,row.observedX,row.observedNm]) expect(Number.isFinite(v)).toBe(true);
  });
  it('bounds and normalizes numeric state without mutating it', () => {
    expect(model({redshiftZ:-100}).z).toBe(0);
    expect(model({redshiftZ:1e9}).z).toBe(15);
    const state={redshiftZ:'1.23456',redshiftLine:'hb'};
    expect(model(state).z).toBe(1.2346);
    expect(state).toEqual({redshiftZ:'1.23456',redshiftLine:'hb'});
  });
  it('restores a measured example and retains JADES measurement precision and uncertainty', () => {
    const m=model({redshiftReference:'jades14'});
    expect(m.z).toBe(14.1793);
    expect(m.reference).toMatchObject({z:14.1793,uncertainty:0.0007,year:2025});
    expect(model({redshiftReference:'gnz11'}).z).toBe(10.603);
    expect(model({redshiftReference:'gnz11',redshiftZ:2}).reference).toBeNull();
    expect(model({redshiftReference:'jades14',redshiftZ:Infinity}).reference).toBeNull();
  });
});

describe('Cosmic redshift rendered clarity', () => {
  it('connects reference lines, measurement cards and accessible chart descriptions', () => {
    const doc=render({redshiftZ:1,redshiftLine:'ha'});
    const group=doc.querySelector('[role="group"][aria-label="Choose a spectral line"]');
    expect(group.querySelectorAll('button')).toHaveLength(4);
    expect(group.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(group.querySelector('[aria-pressed="true"]').getAttribute('aria-label')).toBe('H-alpha');
    expect(doc.getElementById(group.querySelector('[aria-pressed="true"]').getAttribute('aria-describedby')).textContent).toContain('Infrared');
    const status=doc.querySelector('#astronomy-redshift-status');
    expect(status.textContent).toContain('656.461 nm → 1,312.923 nm');
    expect(status.textContent).toContain('Wavelength stretch: 2×');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('#astronomy-redshift-chart-desc').textContent).toBe(status.textContent);
    expect(doc.querySelector('#astronomy-redshift-measurements').textContent).toContain('1.3129 μm');
  });
  it('labels data sources, uncertainty and the teaching scope of measured presets', () => {
    const doc=render({redshiftReference:'jades14',redshiftZ:14.1793,redshiftLine:'lya'});
    expect(doc.querySelector('#astronomy-redshift-reference').textContent).toContain('14.1793 ± 0.0007');
    expect(doc.querySelector('a[href="https://arxiv.org/abs/2409.20549"]')).toBeTruthy();
    expect(doc.querySelector('a[href="https://sdss.org/dr20/tutorials/conversions/"]')).toBeTruthy();
    expect(doc.querySelector('#astronomy-redshift-lab').textContent).toContain('Actual galaxy spectra have different line strengths');
    expect(doc.querySelector('#astronomy-redshift-lab').textContent).toContain('distance and travel time require a cosmological model');
    expect(doc.querySelector('#astronomy-redshift-chart-help').textContent).toContain('equal steps represent equal ratios');
    expect(doc.querySelector('#astronomy-redshift-z').getAttribute('step')).toBe('0.0001');
  });
  it('keeps all rest and observed markers finite after invalid restored state', () => {
    const doc=render({redshiftZ:{forged:true},redshiftLine:[],redshiftReference:{forged:true}});
    expect(doc.querySelectorAll('[data-redshift-line]')).toHaveLength(8);
    expect(doc.querySelector('#astronomy-redshift-lab').outerHTML).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
    expect(doc.querySelector('#astronomy-redshift-reference').textContent).toContain('Teaching setting');
  });
  it('opens the lab from the stellar Doppler explanation and qualifies the low-redshift distance formula', () => {
    const doc=new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'stars',observingList:[]}}),'text/html');
    expect([...doc.querySelectorAll('button')].some(b=>b.textContent==='Open cosmic redshift lab')).toBe(true);
    expect(render({}).body.textContent).toContain('At small cosmological redshift, distance ≈ cz/H₀');
  });
});
