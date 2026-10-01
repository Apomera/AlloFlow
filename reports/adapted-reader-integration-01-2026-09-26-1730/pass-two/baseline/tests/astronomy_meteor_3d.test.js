import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let sky;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});
function render(state) {
  return renderTool('astronomy', { astronomy: { tab: 'meteors', observingList: [], ...state } });
}
function vector(a, b) { return { x: b.x-a.x, y: b.y-a.y, z: b.z-a.z }; }
function normalize(p) { const n = Math.hypot(p.x,p.y,p.z); return {x:p.x/n,y:p.y/n,z:p.z/n}; }
function dot(a,b) { return a.x*b.x+a.y*b.y+a.z*b.z; }

describe('Shared meteor geometry', () => {
  it('moves all meteors parallel to one another and away from the apparent radiant', () => {
    for (const altitude of [5, 35, 60, 90]) {
      const radiant = sky.meteorDirection(0, altitude);
      for (let index=0;index<15;index++) {
        const early = sky.meteorTrack(index, 0, altitude, .2, 59);
        const late = sky.meteorTrack(index, 0, altitude, .8, 59);
        const velocity = normalize(vector(early.head,late.head));
        expect(dot(velocity,radiant)).toBeCloseTo(-1, 10);
        expect(dot(normalize(late.head),radiant)).toBeLessThan(dot(normalize(early.head),radiant));
      }
    }
  });

  it('keeps the bright head ahead of the trail and makes faster showers travel farther', () => {
    const radiant = sky.meteorDirection(0,60);
    const sample = sky.meteorTrack(3,0,60,.5,59);
    expect(dot(normalize(vector(sample.tail,sample.head)),radiant)).toBeCloseTo(-1, 10);
    const distance = speed => {
      const p=sky.meteorTrack(3,0,60,0,speed).head, q=sky.meteorTrack(3,0,60,1,speed).head;
      return Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
    };
    expect(distance(71)).toBeGreaterThan(distance(33));
  });

  it('is reproducible across views, with distinct stepped samples', () => {
    expect(sky.meteorTrack(2,0,60,.5,59)).toEqual(sky.meteorTrack(2,0,60,.5,59));
    expect(sky.meteorTrack(2,1,60,.5,59)).not.toEqual(sky.meteorTrack(2,0,60,.5,59));
    for (const altitude of [5,60,90]) {
      const radiant = sky.meteorProject(sky.meteorDirection(0,altitude));
      expect(radiant.x).toBeCloseTo(300);
      expect(radiant.y).toBeCloseTo(350-altitude/90*280);
    }
  });

  it('preserves every star and connection in all 15 existing recognition patterns', () => {
    expect(Object.keys(sky.constellationPatterns)).toHaveLength(15);
    for (const [id,pattern] of Object.entries(sky.constellationPatterns)) {
      const guide=sky.meteorGuide(id,60);
      expect(guide.stars.map(s=>s.id)).toEqual(pattern.stars.map(s=>s[0]));
      expect(guide.segments).toHaveLength(pattern.lines.reduce((sum,line)=>sum+line.length-1,0));
      guide.stars.forEach(star=>{
        expect(Math.hypot(star.position.x,star.position.y,star.position.z)).toBeCloseTo(490);
        expect(sky.meteorProject(star.position).alt).toBeGreaterThan(0);
      });
      const doc=new DOMParser().parseFromString(render({simMeteorView:'2d',simMeteorPattern:id}),'text/html');
      const figure=doc.querySelector('[data-meteor-constellation="'+id+'"]');
      expect(figure.querySelectorAll('[data-guide-star]')).toHaveLength(pattern.stars.length);
      expect(figure.querySelectorAll('line')).toHaveLength(guide.segments.length);
    }
  });
});

describe('Meteor view controls and resilience', () => {
  it('opens the dedicated tab in 3D with accessible camera and comparison controls', () => {
    const doc=new DOMParser().parseFromString(render(),'text/html');
    expect(doc.getElementById('astronomy-meteor-3d').getAttribute('tabindex')).toBe('0');
    expect(doc.querySelector('[aria-label="Meteor sky view"]')).toBeTruthy();
    expect(doc.querySelectorAll('[aria-label="Constellation guide"] option')).toHaveLength(15);
    expect(doc.querySelector('[aria-label="Sky camera controls"]')).toBeTruthy();
    expect(doc.body.textContent).toContain('not placed at their true distances');
    expect(doc.body.textContent).toContain('not a live forecast');
  });

  it('normalizes malformed 3D state without corrupting labels or geometry', () => {
    const html=render({simMeteorPattern:'__proto__',simRadiantAlt:null,simZhr:true,simBortleSim:'invalid',simMeteorFrame:Infinity});
    expect(html.includes('Cassiopeia recognition guide')).toBe(true);
    expect(html.includes('at 60 degrees')).toBe(true);
    expect(html.includes('39 meteors per hour')).toBe(true);
    expect(html.includes('NaN')).toBe(false);
  });

  it('does not create animation timers during server rendering', () => {
    const interval=vi.spyOn(globalThis,'setInterval');
    const timeout=vi.spyOn(globalThis,'setTimeout');
    render({simMeteorPlaying:true,simMeteorView:'2d'});
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    interval.mockRestore();timeout.mockRestore();
  });

  it('preserves the 2D view and zero-trail conditions', () => {
    const html=render({simMeteorView:'2d',simZhr:5,simBortleSim:9,simRadiantAlt:5});
    expect(html.includes('Illustrative 10-minute sample shows 0 meteors')).toBe(true);
    expect(html.includes('id="astronomy-meteor-3d"')).toBe(false);
  });
});
