import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source=readFileSync('stem_lab/stem_tool_galaxy.js','utf8');
const kernel=source.split('// BEGIN GALAXY ROTATION MODEL')[1].split('// END GALAXY ROTATION MODEL')[0];
const cpu=source.slice(source.indexOf('function evaluateGalaxyStarPosition('),source.indexOf('function generateStars('));
const model=new Function(kernel+cpu+';return {speed:galaxyRotationSpeed,measure:orbitalMeasurementForModel,probe:galaxyRotationProbeRadius,rate:galaxyRotationAngularRate,shader:galaxyRotationShader,position:evaluateGalaxyStarPosition};')();

describe('Galaxy rotation model and mass inference',()=>{
  it.each(['flat','keplerian','rigid'])('has finite continuous behavior at the center for %s',mode=>{
    const zero=model.measure(mode,0),near=model.measure(mode,1e-8);
    expect(zero.speed).toBe(0);expect(zero.enclosedMassSolar).toBe(0);
    expect(Number.isFinite(zero.periodMyr)).toBe(true);
    expect(near.periodMyr).toBeCloseTo(zero.periodMyr,8);
  });
  it.each(['flat','keplerian'])('is continuous across the 2.4 kpc core for %s',mode=>{
    expect(model.speed(mode,2.4)).toBe(220);
    expect(model.speed(mode,2.4-1e-8)).toBeCloseTo(220,5);
    expect(model.speed(mode,2.4+1e-8)).toBeCloseTo(220,5);
  });
  it('has equal compact and flat mass inside the core, then a fixed compact mass',()=>{
    for(const radius of [.6,1,2.4]) expect(model.measure('flat',radius).enclosedMassSolar).toBe(model.measure('keplerian',radius).enclosedMassSolar);
    const core=model.measure('keplerian',2.4);
    for(const radius of [3,8.2,15]) expect(model.measure('keplerian',radius).enclosedMassSolar/core.enclosedMassSolar).toBeCloseTo(1,10);
  });
  it('makes the outer flat mass linear in radius and the rigid mass cubic',()=>{
    expect(model.measure('flat',12).enclosedMassSolar/model.measure('flat',6).enclosedMassSolar).toBeCloseTo(2,10);
    expect(model.measure('rigid',12).enclosedMassSolar/model.measure('rigid',6).enclosedMassSolar).toBeCloseTo(8,10);
    expect(model.speed('rigid',15)).toBeGreaterThan(400);
    expect(model.speed('rigid',15)/model.speed('rigid',7.5)).toBe(2);
  });
  it('uses physical conversions for an 8.2 kpc, 220 km/s teaching orbit',()=>{
    const orbit=model.measure('flat',8.2);
    expect(orbit.periodMyr).toBeCloseTo(228.99087,3);
    expect(orbit.enclosedMassSolar).toBeCloseTo(48400*8.2/4.30091e-6,2);
  });
  it.each([[0,'rigid'],[1,'keplerian'],[2,'flat']])('keeps animation speed and measured speed proportional in model %s', (index,name)=>{
    for(const radius of [.6,2.4,8.2,15]) {
      const norm=radius/15,rate=model.rate(index,norm),star={x:norm,y:.02,z:0,phase:.4};
      const position=model.position(star,9,index,'spiral',true);
      expect(position.angularRate).toBeCloseTo(rate,10);
      expect(position.x).toBeCloseTo(norm*Math.cos(rate*9),10);
      expect(position.z).toBeCloseTo(norm*Math.sin(rate*9),10);
      expect(rate*norm/model.speed(name,radius)).toBeCloseTo(.03/220,10);
    }
  });
  it('keeps rigid angular speed constant and handles motion off',()=>{
    expect(model.rate(0,.1)).toBeCloseTo(model.rate(0,1),10);
    expect(model.position({x:.3,y:.2,z:.4},20,2,'spiral',false)).toEqual({x:.3,y:.2,z:.4,angularRate:0});
    expect(model.rate(1,0)).toBeCloseTo(model.rate(1,.05),10);
  });
  it('builds shader coefficients from the same core, scale and speed reference',()=>{
    expect(model.shader()).toContain('0.160000000000');
    expect(model.shader()).toContain('0.546666666667');
    expect(model.shader()).toContain('0.030000000000');
    expect(source).toContain('float omega = galaxyDiskOmega(uRotMode, rr);');
  });
  it.each([null,undefined,'8.2',NaN,Infinity,{},[]])('uses a finite probe fallback for %j',value=>{
    expect(model.probe(value,12)).toBe(12);
    expect(model.probe(value,NaN)).toBe(8.2);
  });
  it('bounds the probe while retaining exact selected-star radii',()=>{
    expect(model.probe(-4)).toBe(.6);expect(model.probe(40)).toBe(15);
    expect(model.probe(null,3.456)).toBe(3.456);
  });
});

describe('Galaxy rotation probe rendering',()=>{
  beforeEach(()=>{resetStemLab();window._galaxyHasLoadedOnce=true;loadTool('stem_lab/stem_tool_galaxy.js','galaxy');});
  function render(data={}){const root=document.createElement('div');root.innerHTML=renderTool('galaxy',{galaxy:{simMode:'galaxy',galaxyControlPanel:'motion',...data}});return root;}
  it('opens an accessible quantitative comparison without selecting a star',()=>{
    const root=render(),input=root.querySelector('#galaxy-rotation-probe-radius');
    expect(Number(input.value)).toBe(8.2);expect(input.min).toBe('0.6');expect(input.max).toBe('15');
    expect(root.querySelector('label[for="galaxy-rotation-probe-radius"]').textContent).toContain('8.2 kpc');
    expect(root.querySelectorAll('[data-galaxy-rotation-row]')).toHaveLength(3);
    expect(root.querySelector('[data-galaxy-rotation-mass]').textContent).toContain('not measured data');
    expect(root.querySelector('[data-galaxy-rotation-chart]').getAttribute('aria-label')).toContain('220 km/s');
  });
  it('aligns curve points and table values at one radius for every model',()=>{
    const root=render({rotationProbeRadius:12,rotMode:'rigid'});
    for(const name of ['keplerian','flat','rigid']) {
      const point=root.querySelector('[data-galaxy-rotation-point="'+name+'"]'),row=root.querySelector('[data-galaxy-rotation-row="'+name+'"]'),speed=model.speed(name,12);
      expect(Number(point.dataset.radius)).toBe(12);expect(Number(point.dataset.speed)).toBeCloseTo(speed,10);
      expect(Number(point.getAttribute('cx'))).toBeCloseTo(38+12/15*270,8);
      expect(Number(point.getAttribute('cy'))).toBeCloseTo(172-speed/440*147,8);
      expect(row.textContent).toContain(Math.round(speed)+' km/s');
      expect(row.hasAttribute('aria-current')).toBe(name==='rigid');
    }
    expect(Number(root.querySelector('[data-galaxy-rotation-mass-ratio]').dataset.galaxyRotationMassRatio)).toBeCloseTo(5,10);
  });
  it('follows a selected star by default and supports a separate fixed probe',()=>{
    const selection={selectedStar:'G',selectedStarMeasurement:{radiusNorm:.4}};
    const follow=render(selection),fixed=render({...selection,rotationProbeRadius:12});
    expect(Number(follow.querySelector('#galaxy-rotation-probe-radius').value)).toBe(6);
    expect(follow.querySelector('[data-galaxy-rotation-follow]').getAttribute('aria-pressed')).toBe('true');
    expect(fixed.querySelector('[data-galaxy-rotation-follow]').getAttribute('aria-pressed')).toBe('false');
    expect(fixed.querySelector('[data-galaxy-measurement]').textContent).toContain('6.0 kpc');
    expect(fixed.querySelector('[data-galaxy-rotation-probe-status]').textContent).toContain('stays at this radius');
  });
  it.each(['elliptical','irregular'])('avoids circular speed and mass claims for %s',galaxyType=>{
    const root=render({galaxyType,selectedStar:'G',selectedStarMeasurement:{radiusNorm:.4}});
    expect(root.querySelector('[data-galaxy-rotation-probe]')).toBeNull();
    expect(root.querySelector('[data-galaxy-rotation-measurement]')).toBeNull();
    expect(root.querySelector('[data-galaxy-measurement]')).toBeNull();
    expect(root.querySelector('[data-galaxy-'+galaxyType+'-kinematics]')).not.toBeNull();
  });
  it.each([NaN,Infinity,-.3,'bad'])('does not display malformed selected-star radius %j',radiusNorm=>{
    const root=render({selectedStar:'G',selectedStarMeasurement:{radiusNorm},rotationProbeRadius:NaN,rotMode:'bad'});
    expect(root.querySelector('[data-galaxy-measurement]')).toBeNull();
    expect(root.querySelector('[data-galaxy-rotation-follow]')).toBeNull();
    expect(root.textContent).not.toMatch(/NaN|Infinity/);
    expect(root.querySelector('[data-galaxy-rotation-row="flat"]').getAttribute('aria-current')).toBe('true');
  });
});
