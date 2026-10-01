import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
const model = state => window.__alloAstroPure.stellarSpectrumModel(state);
const render = state => new window.DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'stars', observingList: [], ...state } }), 'text/html');
const refs = [['ha',656.4614],['hb',486.2683],['hg',434.168],['hd',410.289]];

describe('Stellar spectrum physical model', () => {
  it.each(refs)('uses the SDSS vacuum rest wavelength for %s', (id,nm) => {
    const m=model({spectrumLine:id,dopplerKms:0});
    expect(m.selected.restNm).toBe(nm); expect(m.selected.observedNm).toBe(nm); expect(m.selected.deltaNm).toBe(0);
    expect(m.zoomObservedX).toBe(m.zoomRestX);
    if(id==='ha'||id==='hb')expect(m.selected.restNm).toBe(window.__alloAstroPure.cosmicRedshiftModel({redshiftLine:id,redshiftZ:0}).selected.restNm);
  });
  it.each([-300,-100,0,100,300])('recovers radial velocity from the wavelength ratio at %s km/s', velocity => {
    const m=model({dopplerKms:velocity});
    for(const row of m.rows) {
      const ratio=row.observedNm/row.restNm;
      const inferred=299792.458*(ratio*ratio-1)/(ratio*ratio+1);
      expect(inferred).toBeCloseTo(velocity,7);
      expect(Math.sign(row.deltaNm)).toBe(Math.sign(velocity));
      expect(row.observedX).toBeGreaterThan(24); expect(row.observedX).toBeLessThan(396);
    }
  });
  it('gives reciprocal wavelength factors for opposite radial motions', () => {
    const toward=model({dopplerKms:-300}), away=model({dopplerKms:300});
    expect(toward.factor*away.factor).toBeCloseTo(1,14);
    expect(toward.direction).toBe('toward'); expect(away.direction).toBe('away');
    expect(away.selected.observedNm).toBeCloseTo(657.118644873247,6);
    expect(toward.selected.observedNm).toBeCloseTo(655.804812497879,6);
  });
  it.each(refs)('preserves a fixed 2.5nm window and 148× displacement scale for %s', (id) => {
    for(const velocity of [-300,0,300]) {
      const m=model({spectrumLine:id,dopplerKms:velocity});
      expect(m.zoomMaxNm-m.zoomMinNm).toBe(2.5);
      expect(m.zoomRestX).toBe(210);
      expect(m.zoomObservedX).toBeGreaterThan(24); expect(m.zoomObservedX).toBeLessThan(396);
      expect(m.zoomObservedX-m.zoomRestX).toBeCloseTo((m.selected.observedX-m.selected.restX)*148,8);
      expect(m.zoomMagnification).toBe(148);
    }
  });
  it.each([null,[],false,{dopplerKms:Infinity,spectrumLine:{},spectrumType:{}},{dopplerKms:'NaN'},{dopplerKms:true},{dopplerKms:''}])('recovers malformed state with finite line geometry', state => {
    const m=model(state);
    expect(m.velocity).toBe(0); expect(m.mode).toBe('absorption'); expect(m.selected.id).toBe('ha');
    for(const row of m.rows)for(const v of [row.restNm,row.observedNm,row.restX,row.observedX])expect(Number.isFinite(v)).toBe(true);
  });
  it('bounds and snaps restored velocity without mutating saved data', () => {
    expect(model({dopplerKms:1e9}).velocity).toBe(300); expect(model({dopplerKms:-1e9}).velocity).toBe(-300);
    const state={dopplerKms:'46',spectrumLine:'hg',spectrumType:'emission'};
    expect(model(state).velocity).toBe(50); expect(state.dopplerKms).toBe('46');
  });
  it('distinguishes continuous spectra from spectra with lines while preserving settings', () => {
    const m=model({spectrumType:'continuous',dopplerKms:120,spectrumLine:'hb'});
    expect(m.hasLines).toBe(false); expect(m.velocity).toBe(120); expect(m.selected.id).toBe('hb');
    expect(model({spectrumType:'emission'}).hasLines).toBe(true);
  });
});

describe('Stellar spectrum rendered clarity', () => {
  it('connects the selected line, full spectrum, zoom and readouts', () => {
    const doc=render({spectrumType:'absorption',dopplerKms:300,spectrumLine:'ha'});
    expect(doc.querySelectorAll('[data-spectrum-line]')).toHaveLength(4);
    expect(doc.querySelector('#astronomy-spectrum-closeup').getAttribute('data-line')).toBe('ha');
    const profile=doc.querySelector('[data-spectrum-profile="observed"]');
    expect(Number(profile.getAttribute('data-wavelength-nm'))).toBeCloseTo(657.118644873247,6);
    expect(Number(profile.getAttribute('data-center-x'))).toBeGreaterThan(210);
    expect(doc.querySelector('#astronomy-spectrum-measurements').textContent).toContain('+0.6572 nm');
    const status=doc.querySelector('#astronomy-spectrum-status');
    expect(status.textContent).toContain('Moving away · redshift'); expect(status.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('#astronomy-spectrum-closeup-desc').textContent).toBe(status.textContent);
    const button=doc.querySelector('[role="group"][aria-label="Choose a hydrogen line"] [aria-pressed="true"]');
    expect(button.getAttribute('aria-label')).toBe('H-alpha');
    expect(doc.getElementById(button.getAttribute('aria-describedby')).textContent).toContain('Observed wavelength: 657.1186 nm');
  });
  it('keeps continuous mode honest about its missing measurement lines', () => {
    const doc=render({spectrumType:'continuous',dopplerKms:100});
    expect(doc.querySelectorAll('[data-spectrum-line]')).toHaveLength(0);
    expect(doc.querySelector('#astronomy-spectrum-closeup')).toBeNull();
    expect(doc.querySelector('#astronomy-spectrum-measurements')).toBeNull();
    expect(doc.querySelector('#astronomy-spectrum-velocity').disabled).toBe(true);
    expect(doc.querySelector('#astronomy-spectrum-status').textContent).toContain('no sharp lines to track');
    expect(doc.querySelector('#astronomy-spectrum-empty').textContent).toContain('Show absorption lines');
  });
  it('discloses scales, source wavelengths and teaching assumptions', () => {
    const doc=render({});
    expect(doc.querySelector('#astronomy-spectrum-zoom-help').textContent).toContain('magnifies displacement by 148×');
    expect(doc.querySelector('#astronomy-spectrum-lab').textContent).toContain('Reference wavelengths are in vacuum');
    expect(doc.querySelector('#astronomy-spectrum-lab').textContent).toContain('Velocities and line profiles are teaching examples');
    expect(doc.querySelector('a[href="https://classic.sdss.org/dr2/algorithms/speclinefits.php"]')).toBeTruthy();
    expect(doc.querySelector('a[href="https://sdss.org/dr20/tutorials/conversions/"]')).toBeTruthy();
  });
  it('renders bounded, finite restored state and announces the retained rest convention', () => {
    const doc=render({spectrumType:{},dopplerKms:{},spectrumLine:[]});
    expect(doc.querySelector('#astronomy-spectrum-lab').outerHTML).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
    expect(doc.querySelector('#astronomy-spectrum-velocity').getAttribute('aria-valuetext')).toBe('At rest: no Doppler shift');
    expect(doc.querySelectorAll('[data-spectrum-profile]')).toHaveLength(2);
  });
});
