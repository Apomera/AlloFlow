
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
const model = (state, target = {sizeArcmin:65,id:'orion-nebula'}) => window.__alloAstroPure.eyepieceFieldModel(state,target);
const render = state => new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'observe',observingList:[],...state}}),'text/html');

describe('Eyepiece angular geometry',()=>{
  it.each([[20,32.5,4],[10,65,2]])('reproduces the real 130EQ with a %s mm eyepiece',(ep,power,pupil)=>{
    const m=model({eyApertureMm:130,eyFocalMm:650,eyEpFlMm:ep});
    expect(m.magnification).toBe(power);expect(m.exitPupilMm).toBe(pupil);expect(m.focalRatio).toBe(5);
    expect(m.isReferenceInstrument).toBe(true);expect(m.fieldArcmin).toBeCloseTo(3600/power,12);
  });
  it('keeps aperture independent of focal length and angular target scale',()=>{
    const a=model({eyApertureMm:100}),b=model({eyApertureMm:200});
    expect(a.focalMm).toBe(b.focalMm);expect(a.magnification).toBe(b.magnification);
    expect(a.targetRadiusPx).toBe(b.targetRadiusPx);expect(b.exitPupilMm).toBe(a.exitPupilMm*2);
    expect(b.dawesArcsec).toBe(a.dawesArcsec/2);
  });
  it('doubles magnification and image radius when eyepiece focal length halves',()=>{
    const a=model({eyEpFlMm:20}),b=model({eyEpFlMm:10});
    expect(b.magnification).toBe(a.magnification*2);expect(b.fieldArcmin).toBe(a.fieldArcmin/2);
    expect(b.targetRadiusPx).toBe(a.targetRadiusPx*2);expect(b.exitPupilMm).toBe(a.exitPupilMm/2);
  });
  it('widens the field without changing magnification when apparent field increases',()=>{
    const a=model({eyEpField:50}),b=model({eyEpField:100});
    expect(a.magnification).toBe(b.magnification);expect(b.fieldArcmin).toBe(a.fieldArcmin*2);
    expect(b.targetRadiusPx).toBe(a.targetRadiusPx/2);
  });
  it('lets the Moon exceed the field rather than shrinking it',()=>{
    const m=model({eyFocalMm:1200,eyEpFlMm:4,eyEpField:60},{id:'moon',sizeArcmin:30});
    expect(m.fieldArcmin).toBe(12);expect(m.targetRadiusPx).toBe(575);expect(m.fits).toBe(false);
  });
  it('retains subpixel planet sizes rather than enlarging them',()=>{
    const m=model({eyFocalMm:200,eyEpFlMm:40,eyEpField:100},{id:'mars',sizeArcmin:.2});
    expect(m.fieldArcmin).toBe(1200);expect(m.targetRadiusPx).toBeCloseTo(.038333333333,12);
  });
  it('checks the stated angular extent against the actual circular diameter',()=>{
    const a=model({eyFocalMm:1200,eyEpFlMm:25},{sizeArcmin:75}),b=model({eyFocalMm:1200,eyEpFlMm:25},{sizeArcmin:75.1});
    expect(a.fieldArcmin).toBe(75);expect(a.fits).toBe(true);expect(b.fits).toBe(false);
  });
  it.each([['saturn',.7,2.26],['jupiter',.8,2.8],['ring-nebula',1.4,1]])('includes the declared visual footprint of %s',(id,size,scale)=>{
    const m=model({}, {id,sizeArcmin:size});expect(m.footprintArcmin).toBeCloseTo(size*scale,12);
    expect(m.footprintScale).toBe(scale);
  });
  it('converts a seeing FWHM in arcseconds to the Gaussian sigma on the same angular scale',()=>{
    const m=model({eySeeing:5});
    expect(m.seeingSigmaPx*2.355/460*m.fieldArcmin*60).toBeCloseTo(5,12);
    expect(model({eySeeing:10}).seeingSigmaPx).toBeCloseTo(m.seeingSigmaPx*2,12);
    expect(model({eySeeing:5,eyEpFlMm:12}).seeingSigmaPx/m.seeingSigmaPx).toBeCloseTo(25/12,12);
  });
  it('changes qualitative contrast without changing optics or a binary detection decision',()=>{
    const a=model({eyBortle:1}),b=model({eyBortle:9});
    expect(a.diffuseOpacity).toBeGreaterThan(b.diffuseOpacity);expect(b.diffuseOpacity).toBeGreaterThan(0);
    expect(a.fieldArcmin).toBe(b.fieldArcmin);expect(a.targetRadiusPx).toBe(b.targetRadiusPx);
    expect(b).not.toHaveProperty('targetVisible');expect(b).not.toHaveProperty('limitingMagnitude');
  });
});

describe('Eyepiece saved state and clear rendering',()=>{
  it.each([null,[],false,{eyApertureMm:{},eyFocalMm:Infinity,eyEpFlMm:[],eyEpField:true,eySeeing:'NaN',eyBortle:''}])('restores finite defaults from malformed state',state=>{
    const m=model(state);
    expect([m.apertureMm,m.focalMm,m.eyepieceMm,m.apparentFieldDeg,m.seeingArcsec,m.bortle]).toEqual([150,1200,25,60,2.5,4]);
  });
  it('snaps restored values to keyboard steps without mutating saved data',()=>{
    const saved={eyApertureMm:'133',eyFocalMm:671,eyEpFlMm:12.2,eyEpField:62,eySeeing:3.26,eyBortle:6.2};
    const m=model(saved);expect([m.apertureMm,m.focalMm,m.eyepieceMm,m.apparentFieldDeg,m.seeingArcsec,m.bortle]).toEqual([130,650,12,60,3.5,6]);
    expect(saved.eyFocalMm).toBe(671);
  });
  it.each([-1e9,1e9])('bounds extreme saved values at %s',value=>{
    const m=model({eyApertureMm:value,eyFocalMm:value,eyEpFlMm:value,eyEpField:value,eySeeing:value,eyBortle:value});
    expect([m.apertureMm,m.focalMm,m.eyepieceMm,m.apparentFieldDeg,m.seeingArcsec,m.bortle]).toEqual(value<0?[50,200,4,40,.5,1]:[400,4000,40,100,10,9]);
    for(const value of Object.values(m))if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);
  });
  it('restores an invalid target and labels calculations and sketch limits',()=>{
    const doc=render({eyepieceTarget:{forged:true}}),lab=doc.querySelector('#astronomy-eyepiece-lab');
    expect(lab.querySelector('button[aria-pressed="true"]').textContent).toBe('Orion Nebula (M42)');
    expect(lab.textContent).toContain('does not predict what you can detect tonight');
    expect(lab.textContent).toContain('contrast effect here is qualitative');expect(lab.textContent).not.toContain('Target too dim');
    expect(lab.querySelector('#astr-ey-fl').value).toBe('1200');expect(lab.querySelector('#astr-ey-see').value).toBe('2.5');
    expect(lab.querySelector('#astronomy-eyepiece-status').getAttribute('aria-live')).toBe('polite');
  });
  it('clips the actual geometry while keeping captions outside the circle',()=>{
    const doc=render({eyepieceTarget:'moon',eyEpFlMm:4}),svg=doc.querySelector('#astronomy-eyepiece-field');
    expect(svg.getAttribute('data-target-radius')).toBe('575');expect(svg.getAttribute('data-fits')).toBe('false');
    expect(svg.querySelector('clipPath circle').getAttribute('r')).toBe('230');
    expect(svg.querySelector('g[clip-path]').getAttribute('clip-path')).toBe('url(#astronomy-eyepiece-clip)');
    expect(svg.querySelectorAll('text').length).toBe(0);
    expect(doc.querySelector('#astronomy-eyepiece-lab figcaption').textContent).toContain('cropped');
    expect(doc.querySelector('#astronomy-eyepiece-status').textContent).toContain('Cropped by the field edge');
  });
  it('connects real instrument and Moon references with explicit assumed apparent field',()=>{
    const lab=render({eyepieceTarget:'moon'}).querySelector('#astronomy-eyepiece-lab');
    expect(lab.textContent).toContain('30 arcmin');expect(lab.textContent).toContain('not a manufacturer specification');
    expect(lab.querySelector('a[href="https://www.celestron.com/products/astromaster-130eq-telescope"]')).toBeTruthy();
    expect(lab.querySelector('a[href="https://imagine.gsfc.nasa.gov/educators/programs/fermi/classroom/agn_guide.html"]')).toBeTruthy();
  });
  it('uses fixed angular offsets for the example stars',()=>{
    const a=render({eyEpFlMm:20}),b=render({eyEpFlMm:10});
    const sa=a.querySelector('[data-example-star="0"]'),sb=b.querySelector('[data-example-star="0"]');
    expect(Number(sb.getAttribute('cx'))-240).toBeCloseTo((Number(sa.getAttribute('cx'))-240)*2,10);
  });

  it('keeps quick eyepiece choices beside the field and reports changing magnification',()=>{
    const lab=render({eyEpFlMm:10}).querySelector('#astronomy-eyepiece-lab');
    const group=lab.querySelector('[role="group"][aria-label="Compare eyepieces"]');
    expect(group.querySelector('span').textContent).toBe('Compare eyepieces');
    expect([...group.querySelectorAll('button')].map(b=>b.textContent)).toEqual(['40 mm','25 mm','10 mm']);
    expect(group.querySelector('button[aria-pressed="true"]').textContent).toBe('10 mm');
    expect(lab.querySelector('#astronomy-eyepiece-status').textContent).toContain('120×');
  });
  it.each([['double-cluster','cluster-pair'],['whirlpool','spiral-pair']])('gives %s a distinct schematic shape',(id,shape)=>{
    const svg=render({eyepieceTarget:id}).querySelector('#astronomy-eyepiece-field');
    expect(svg.querySelector('[data-target-shape="'+shape+'"]')).toBeTruthy();
    if(id==='double-cluster')expect(svg.querySelectorAll('[data-cluster-center]').length).toBe(2);
  });

  it.each(['moon','saturn','jupiter','venus','mars','orion-nebula','andromeda','pleiades','ring-nebula','hercules-cluster','double-cluster','whirlpool'])('renders finite %s geometry at the widest and narrowest fields',id=>{
    for(const state of [{eyFocalMm:200,eyEpFlMm:40,eyEpField:100},{eyFocalMm:4000,eyEpFlMm:4,eyEpField:40,eySeeing:10,eyBortle:9}]) {
      const doc=render({eyepieceTarget:id,...state}),svg=doc.querySelector('#astronomy-eyepiece-field');
      expect(svg.outerHTML).not.toMatch(/NaN|Infinity|undefined/);
      for(const element of svg.querySelectorAll('[r],[rx],[ry]'))for(const attr of ['r','rx','ry'])if(element.hasAttribute(attr))expect(Number(element.getAttribute(attr))).toBeGreaterThanOrEqual(0);
    }
  });
});
