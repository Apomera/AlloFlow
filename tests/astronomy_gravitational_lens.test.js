import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
const model = state => window.__alloAstroPure.gravitationalLensModel(state);
const render = state => new window.DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'galaxies', observingList: [], ...state } }), 'text/html');

// Independent polar integration of point-source flux over the source disk.
function integratedFlux(mass, offset) {
  let flux=0;
  for(let r=0;r<64;r++)for(let a=0;a<128;a++) {
    const t=(r+.5)/64, phi=(a+.5)/128*2*Math.PI;
    const u=Math.hypot(offset/5.1+.18*t*Math.cos(phi),.18*t*Math.sin(phi))/Math.sqrt(mass);
    flux+=2*t*(u*u+2)/(u*Math.sqrt(u*u+4));
  }
  return flux/8192;
}

describe('Finite-source gravitational lens physics',()=>{
  it('uses the published Cosmic Horseshoe angular reference with a declared teaching source',()=>{
    const m=model({});expect(m.referenceRadiusArcsec).toBe(5.1);expect(m.einsteinRadiusArcsec).toBe(5.1);
    expect(m.sourceRadiusArcsec).toBeCloseTo(.918,12);expect(m.boundsArcsec).toEqual([-20.4,20.4]);
  });
  it.each([.2,.5,1,2,4])('scales Einstein radius as the square root of mass at %s×',mass=>{
    expect(model({lensMassRatio:mass}).einsteinRadiusArcsec/5.1).toBeCloseTo(Math.sqrt(mass),12);
  });
  it.each([.2,1,4])('matches the analytic centered finite-source flux at %s×',mass=>{
    const m=model({lensMassRatio:mass});
    expect(m.magnification).toBeCloseTo(Math.sqrt(.18*.18+4*mass)/.18,10);
    expect(m.appearance).toBe('ring');expect(m.centerImages).toEqual([]);
  });
  it.each([[.2,5],[1,5],[4,5],[.2,10],[1,10],[4,10]])('agrees with independent disk integration at mass %s, offset %s', (mass,offset)=>{
    expect(model({lensMassRatio:mass,lensSourceArcsec:offset}).magnification).toBeCloseTo(integratedFlux(mass,offset),4);
  });
  it.each([-10,-5,-1,1,5,10])('solves the lens equation for both image centers at %s arcsec',offset=>{
    const m=model({lensMassRatio:1.7,lensSourceArcsec:offset}), [outer,inner]=m.centerImages;
    expect(outer.arcsec+inner.arcsec).toBeCloseTo(offset,10);
    expect(outer.arcsec*inner.arcsec).toBeCloseTo(-(m.einsteinRadiusArcsec**2),10);
    for(const image of m.centerImages)expect(image.arcsec-m.einsteinRadiusArcsec**2/image.arcsec).toBeCloseTo(offset,10);
    expect(Math.sign(outer.arcsec)).toBe(Math.sign(offset));expect(Math.sign(inner.arcsec)).toBe(-Math.sign(offset));
    expect(Math.abs(outer.arcsec)).toBeGreaterThan(m.einsteinRadiusArcsec);expect(Math.abs(inner.arcsec)).toBeLessThan(m.einsteinRadiusArcsec);
  });
  it('maps every boundary point back to the same source and keeps all control extremes in frame',()=>{
    for(const mass of [.2,1,4])for(const offset of [-10,-1,-.75,0,.75,1,10]) {
      const m=model({lensMassRatio:mass,lensSourceArcsec:offset});
      expect(m.magnification).toBeGreaterThan(1);expect(Number.isFinite(m.magnification)).toBe(true);
      for(const point of [...m.outer,...m.inner]) {
        const radius2=point.x**2+point.y**2;
        expect(point.x*(1-mass/radius2)).toBeCloseTo(point.bx,10);
        expect(point.y*(1-mass/radius2)).toBeCloseTo(point.by,10);
        expect(Math.abs(point.x)).toBeLessThan(4);expect(Math.abs(point.y)).toBeLessThan(4);
      }
      expect(m.outerPath+' '+m.innerPath).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
  it('mirrors geometry and preserves flux when the source crosses left to right',()=>{
    const a=model({lensSourceArcsec:-5}),b=model({lensSourceArcsec:5});
    expect(a.magnification).toBeCloseTo(b.magnification,10);
    for(let i=0;i<2;i++)expect(a.centerImages[i].arcsec).toBeCloseTo(-b.centerImages[i].arcsec,12);
    expect(a.centerImages[0].arcsec).not.toBe(-a.centerImages[1].arcsec);
  });
  it('moves continuously through the finite-source ring transition',()=>{
    expect(model({lensSourceArcsec:0}).appearance).toBe('ring');
    expect(model({lensSourceArcsec:.5}).appearance).toBe('distorted-ring');
    expect(model({lensSourceArcsec:1}).appearance).toBe('images');
    for(let offset=0;offset<=10;offset+=.25)expect(model({lensSourceArcsec:offset}).magnification).toBeGreaterThan(1);
  });
});

describe('Lens state and rendered clarity',()=>{
  it.each([null,[],false,{lensMassRatio:{},lensSourceArcsec:Infinity},{lensMassRatio:'',lensSourceArcsec:true},{lensMassRatio:'NaN',lensSourceArcsec:[] }])('restores finite defaults from malformed state',state=>{
    const m=model(state);expect(m.massRatio).toBe(1);expect(m.sourceArcsec).toBe(0);expect(Number.isFinite(m.magnification)).toBe(true);
  });
  it('migrates legacy controls and gives current settings priority without mutating saved state',()=>{
    expect(model({lensMass:100,lensOffset:40}).massRatio).toBe(2);expect(model({lensMass:100,lensOffset:40}).sourceArcsec).toBe(5);
    const saved={lensMass:200,lensOffset:80,lensMassRatio:1.07,lensSourceArcsec:-.61};
    const m=model(saved);expect(m.massRatio).toBe(1.1);expect(m.sourceArcsec).toBe(-.5);expect(saved.lensMassRatio).toBe(1.07);
  });
  it('bounds extreme restored values and removes negative zero',()=>{
    expect(model({lensMassRatio:999,lensSourceArcsec:-999}).massRatio).toBe(4);
    expect(model({lensMassRatio:999,lensSourceArcsec:-999}).sourceArcsec).toBe(-10);
    expect(model({lensMassRatio:-999,lensSourceArcsec:999}).massRatio).toBe(.2);
    expect(Object.is(model({lensSourceArcsec:-.01}).sourceArcsec,-0)).toBe(false);
  });
  it('connects both scales, selected parameters and measured references',()=>{
    const doc=render({lensSourceArcsec:5}),lab=doc.querySelector('#astronomy-lens-lab');
    for(const id of ['astronomy-lens-diagram','astronomy-lens-source-diagram']) {
      const svg=doc.getElementById(id);expect(svg.getAttribute('data-source-arcsec')).toBe('5');expect(svg.getAttribute('viewBox')).toBe('0 0 360 378');
    }
    expect(lab.textContent).toContain('10.2 arcseconds');expect(lab.textContent).toContain('Mass ratios, source size and alignments are teaching choices');
    expect(lab.textContent).toContain('surface brightness stays constant');
    expect(doc.querySelector('#astronomy-lens-measurements').textContent).toContain('Outer image offset+8.18 arcsec');
    expect(doc.querySelector('#astronomy-lens-measurements').textContent).toContain('Inner image offset-3.18 arcsec');
    expect(doc.querySelector('[data-lens-images]').getAttribute('fill-rule')).toBe('evenodd');
    expect(doc.querySelector('a[href="https://arxiv.org/pdf/0706.2326"]')).toBeTruthy();
    expect(doc.querySelector('#astronomy-lens-status').getAttribute('aria-live')).toBe('polite');
  });
});
