import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js','utf8'));
function walk(node, attr, value, out=[]) {
  if (Array.isArray(node)) node.forEach(n=>walk(n,attr,value,out));
  else if(node && typeof node==='object' && node.props) {
    if(node.props[attr]!==undefined && (value===undefined || node.props[attr]===value)) out.push(node);
    walk(node.props.children,attr,value,out);
  }
  return out;
}
function session(mode='rocks', extra={}) {
  let data={rocks:{mode,...extra},rockCycle:{selectedType:'igneous'}};
  const tree=()=>window.StemLab._registry.rocks.render(makeCtx({toolData:data,setToolData:fn=>{data=typeof fn==='function'?fn(data):fn;},t:(key,fb)=>key.split('.').reduce((o,k)=>o&&o[k],strings)||fb}));
  const all=(attr,value)=>walk(tree(),attr,value);
  const find=(attr,value)=>all(attr,value)[0];
  return {all,find,get state(){return data.rocks;},get data(){return data;},
    search:value=>find('data-rk-catalogue-search',mode).props.onChange({target:{value}}),
    sort:value=>find('data-rk-catalogue-sort',mode).props.onChange({target:{value}}),
    ids:()=>all(mode==='rocks'?'data-rk-grid-tile':'data-rk-mineral-tile').map(n=>n.props[mode==='rocks'?'data-rk-grid-tile':'data-rk-mineral-tile'])};
}
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_rocks.js','rocks');vi.useFakeTimers();});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});

describe('searchable specimen catalogues',()=>{
  it('starts with all 24 rocks and all 23 minerals in catalogue order',()=>{
    expect(session().ids()).toHaveLength(24);
    expect(session('minerals').ids()).toHaveLength(23);
    expect(session().ids().slice(0,2)).toEqual(['granite','basalt']);
  });
  it('matches multiple words, case, accents, and whitespace without regular expressions',()=>{
    const s=session();s.search('  GRÁNITE coarse  ');expect(s.ids()).toEqual(['granite','diorite','gabbro']);
    s.search('granite nonexistentword');expect(s.ids()).toEqual([]);
    s.search('[');expect(s.ids()).toEqual([]);
  });
  it('searches mineral formulae with ordinary digits',()=>{
    const s=session('minerals');s.search('SiO2');expect(s.ids()).toContain('quartz');
  });
  it('combines family and text filters and resets them without erasing learning work',()=>{
    const s=session('rocks',{selectedType:'sedimentary',selectedRock:'granite',quizScore:4,compare:{notes:{'rocks:basalt:granite':'My evidence'}}});
    s.search('granite');expect(s.ids()).toEqual([]);
    expect(s.find('data-rk-catalogue-empty','rocks')).toBeTruthy();
    expect(s.find('data-rk-catalogue-selected','rocks')).toBeTruthy();
    s.find('data-rk-catalogue-reset','rocks').props.onClick();
    expect(s.ids()).toHaveLength(24);expect(s.state.selectedRock).toBe('granite');
    expect(s.state.quizScore).toBe(4);expect(s.state.compare.notes['rocks:basalt:granite']).toBe('My evidence');
    expect(s.data.rockCycle.selectedType).toBe('igneous');
  });
  it('sorts names and mineral measurements using their numeric reference values',()=>{
    const r=session();r.sort('name');expect(r.ids()[0]).toBe('andesite');
    const m=session('minerals');m.sort('hardness');expect(m.ids()[0]).toBe('talc');expect(m.ids().at(-1)).toBe('diamond');
    m.sort('density');expect(m.ids()[0]).toBe('sulfur');expect(m.ids().at(-1)).toBe('galena');
  });
  it('preserves each catalogue query independently',()=>{
    const s=session('rocks',{catalogue:{minerals:{query:'quartz',sort:'hardness'}}});
    s.search('basalt');expect(s.state.catalogue.minerals).toEqual({query:'quartz',sort:'hardness'});
  });
  it('restores invalid search/sort data safely and bounds input',()=>{
    const s=session('rocks',{catalogue:{rocks:{query:42,sort:'invalid'}},selectedType:'invalid'});
    expect(s.ids()).toHaveLength(24);expect(s.find('data-rk-catalogue-search','rocks').props.value).toBe('');
    s.search('a'.repeat(200));expect(s.state.catalogue.rocks.query).toHaveLength(160);
  });
  it('clears search with Escape without changing selection or sort',()=>{
    const s=session('rocks',{selectedRock:'basalt'});s.search('granite');s.sort('name');
    const preventDefault=vi.fn();s.find('data-rk-catalogue-search','rocks').props.onKeyDown({key:'Escape',preventDefault});
    expect(preventDefault).toHaveBeenCalled();expect(s.ids()).toHaveLength(24);
    expect(s.state.selectedRock).toBe('basalt');expect(s.state.catalogue.rocks.sort).toBe('name');
  });
  it('associates visible labels and help, exposes result status and a back path',()=>{
    const s=session('rocks',{selectedRock:'granite'}), search=s.find('data-rk-catalogue-search','rocks');
    expect(s.find('htmlFor',search.props.id)).toBeTruthy();
    expect(s.find('id',search.props['aria-describedby'])).toBeTruthy();
    expect(s.find('data-rk-catalogue-count','rocks').props).toMatchObject({role:'status','aria-live':'polite','aria-atomic':true});
    expect(s.find('data-rk-back-to-catalogue','rocks')).toBeTruthy();
    expect(s.find('id','rk-rock-tile-granite')).toBeTruthy();
  });
});
