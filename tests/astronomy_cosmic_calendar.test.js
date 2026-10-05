import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model, position;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js','astronomy'); model=window.__alloAstroPure.cosmicCalendarModel; position=window.__alloAstroPure.cosmicCalendarPosition; });
const doc=saved=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'galaxies',observingList:[],...saved}}),'text/html');
const total=13.8e9, seconds=31536000;

describe('Cosmic Calendar linear conversion',()=>{
 it.each([0,12,12000,315000,538800000,4600000000,13800000000])('converts %s years before the present with independent scale arithmetic',age=>{
  const p=position(age);expect(p.beforeEndSeconds).toBeCloseTo(age*seconds/total,9);
  expect(p.elapsedYears).toBe(total-age);expect(p.elapsedSeconds).toBeCloseTo(seconds-p.beforeEndSeconds,8);
  expect(p.yearFraction).toBeCloseTo(1-age/total,12);
 });
 it('maps the two exact boundaries without a missing final second',()=>{
  expect(position(total).date).toBe('January 1, 12:00 AM');expect(position(total).yearFraction).toBe(0);
  const p=position(0);expect(p.atEnd).toBe(true);expect(p.date).toBe('Year end · next January 1, 12:00 AM');expect(p.yearFraction).toBe(1);expect(p.beforeEndSeconds).toBe(0);
 });
 it('uses calendar month lengths, placing a 4.6-Gyr Solar System in September',()=>{
  const p=position(4.6e9);expect(p.month).toBe(8);expect(p.day).toBe(1);expect(p.date).toBe('September 1, 8:00:00.00 AM');
  for(const [elapsedDay,month,day]of [[31,1,1],[59,2,1],[90,3,1],[181,6,1],[273,9,1],[364,11,31]]) {
   const q=position(total*(1-elapsedDay/365));expect(q.month).toBe(month);expect(q.day).toBe(day);
  }
 });
 it('places neutral hydrogen 14.47 cosmic minutes after the beginning',()=>{
  const p=model({selectedCC:'cmb'}).selected.position;expect(p.elapsedYears).toBe(380000);
  expect(p.elapsedSeconds/60).toBeCloseTo(380000*31536000/13800000000/60,7);expect(p.date).toBe('January 1, 12:14:28.38 AM');
 });
 it('keeps very short remaining intervals positive with a valid final-day display',()=>{
  const p=position(1e-8);expect(p.beforeEndSeconds).toBeGreaterThan(0);expect(p.atEnd).toBe(false);
  expect(p.date).toBe('December 31, 11:59:59.99 PM');
 });
 it('computes the 12-year lifetime without cancellation',()=>{
  const p=model({}).lifetime;expect(p.beforeEndSeconds).toBeCloseTo(0.027422608695652176,15);
  expect(model({}).realYearsPerSecond).toBeCloseTo(437.5951293759513,10);
 });
});

describe('Published milestone age meaning',()=>{
 it('retains chronological events and legacy saved identifiers',()=>{
  const m=model({});expect(m.events).toHaveLength(12);
  expect(m.events.map(e=>e.id)).toEqual(['jan1','cmb','jan10','mar15','aug28','sep1','nov15','dec5','dec25','dec31','agriculture','now']);
  for(let i=1;i<m.events.length;i++)expect(m.events[i].position.elapsedSeconds).toBeGreaterThan(m.events[i-1].position.elapsedSeconds);
 });
 it.each([['dec5',538800000,538200000,539400000],['dec31',315000,281000,349000]])('retains central age and quoted uncertainty for %s',(id,central,low,high)=>{
  const e=model({selectedCC:id}).selected;expect(e.kind).toBe('uncertainty');expect(e.lookbackYears).toBe(central);
  expect(e.range.early.lookbackYears).toBe(high);expect(e.range.late.lookbackYears).toBe(low);
  expect(e.range.early.yearFraction).toBeLessThan(e.position.yearFraction);expect(e.range.late.yearFraction).toBeGreaterThan(e.position.yearFraction);
 });
 it('treats Milky Way disk formation as an extended phase',()=>{
  const e=model({selectedCC:'mar15'}).selected;expect(e.kind).toBe('phase');expect(e.lookbackYears).toBe(11e9);
  expect(e.range.early.lookbackYears).toBe(13e9);expect(e.range.late.lookbackYears).toBe(8e9);
 });
 it('provides primary institutional or research sources for every milestone',()=>{
  for(const e of model({}).events) {
   expect(new URL(e.href).protocol).toBe('https:');expect(['science.nasa.gov','www.nature.com','stratigraphy.org','pubs.usgs.gov','humanorigins.si.edu']).toContain(new URL(e.href).hostname);
   expect(e.source).toBeTruthy();expect(e.basis).toBeTruthy();if(e.kind==='approximate')expect(e.range).toBe(null);
  }
 });
 it('returns fresh event and range objects without corrupting reference data',()=>{
  const a=model({selectedCC:'dec31'});a.selected.range.early.lookbackYears=0;a.selected.position.date='forged';a.events[0].href='forged';
  const b=model({selectedCC:'dec31'});expect(b.selected.range.early.lookbackYears).toBe(349000);expect(b.selected.position.date).not.toBe('forged');expect(b.events[0].href).toContain('science.nasa.gov');
 });
});

describe('Calendar saved-state and zoom resilience',()=>{
 it.each([null,[],false,'bad',{selectedCC:{bad:true},ccZoom:[],ccLifetimeYears:true},{selectedCC:'unknown',ccZoom:'unknown',ccLifetimeYears:''}])('recovers malformed controls %j',saved=>{
  const m=model(saved);expect(m.selectedId).toBe('jan1');expect(m.zoom).toBe('minute');expect(m.lifetimeYears).toBe(12);
 });
 it.each([[-300,0],[200,100],['12.8',13],[Infinity,12],['bad',12],[{},12]])('clamps, snaps or rejects a restored lifetime %j',(raw,expected)=>{
  expect(model({ccLifetimeYears:raw}).lifetimeYears).toBe(expected);
 });
 it.each([['hour',3600,['dec31','agriculture','now']],['minute',60,['agriculture','now']],['second',1,['now']]])('keeps %s zoom positions on the correct common scale',(zoom,width,ids)=>{
  const m=model({selectedCC:'agriculture',ccZoom:zoom});expect(m.windowSeconds).toBe(width);expect(m.events.filter(e=>e.visible).map(e=>e.id)).toEqual(ids);
  for(const e of m.events)expect(e.zoomFraction).toBe(e.visible?1-e.position.beforeEndSeconds/width:null);
  expect(m.lifetimeZoomFraction).toBe(1-m.lifetime.beforeEndSeconds/width);
  expect(m.selected.visible).toBe(zoom!=='second');
 });
 it('leaves independent state untouched',()=>{
  const saved={selectedCC:'agriculture',ccZoom:'hour',ccLifetimeYears:80,hrHunt:{hypothesis:'Keep this'},rotationGalaxy:'NGC6503'};
  const before=JSON.stringify(saved);model(saved);expect(JSON.stringify(saved)).toBe(before);
 });
});

describe('Calendar rendering links science and controls',()=>{
 it('shows computed readouts, accessible zooms and clearly names an invisible selection',()=>{
  const m=model({selectedCC:'dec31',ccZoom:'second'}),document=doc({selectedCC:'dec31',ccZoom:'second'});
  const root=document.querySelector('#astronomy-calendar-lab');expect(root).toBeTruthy();
  for(const node of root.querySelectorAll('[data-calendar-metric]'))expect(Number(node.dataset.value)).toBe(m.selected.position[node.dataset.calendarMetric]);
  expect(root.querySelector('[data-calendar-date]').textContent).toBe(m.selected.position.date);
  expect(root.querySelector('#astronomy-cc-zoom-status').dataset.selectedVisible).toBe('false');
  expect(root.querySelector('#astronomy-cc-zoom-status').textContent).toContain('earlier than this zoom window');
  expect(root.querySelector('[data-calendar-row=\"dec31\"]')).toBe(null);
  expect(root.querySelector('#astronomy-calendar-zoom').getAttribute('role')).toBe('group');
 });
 it('renders the selected interval and source with the right age classification',()=>{
  const document=doc({selectedCC:'dec31',ccZoom:'hour'}),root=document.querySelector('#astronomy-calendar-lab');
  expect(root.querySelector('[data-calendar-basis]').dataset.calendarBasis).toBe('uncertainty');
  expect(root.querySelector('#astronomy-cc-zoom-dec31').getAttribute('aria-pressed')).toBe('true');
  expect(root.querySelector('#astronomy-cc-zoom-dec31 [data-calendar-range]').dataset.calendarRange).toBe('uncertainty');
  expect(root.querySelector('#astronomy-cc-panel a').href).toBe('https://www.nature.com/articles/nature22335');
 });
 it('keeps new English labels identical across both registries',()=>{
  const delta=JSON.parse(readFileSync('reports/sky-lab-cosmic-calendar-2026-10-01/english-labels.json','utf8'));
  for(const p of['ui_strings.js','desktop/web-app/public/ui_strings.js']){
   const a=JSON.parse(readFileSync(p,'utf8')).stem.astronomy;
   for(const[k,v]of Object.entries(delta))expect(a[k],p+' '+k).toBe(v);
  }
 });
 it('removes inaccurate fixed dates and unsupported origin claims from the rendered calendar',()=>{
  const root=doc({selectedCC:'nov15'}).querySelector('#astronomy-calendar-lab');
  expect(root.textContent).not.toMatch(/Great Filter|August 28|11:59:59 PM|~ 5 minutes/);
  expect(root.textContent).toContain('Earlier origins remain a separate question');
 });
});
