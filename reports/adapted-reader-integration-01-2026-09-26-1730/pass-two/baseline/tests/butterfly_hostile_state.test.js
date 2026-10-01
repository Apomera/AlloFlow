import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});

// Renders the tool the way the host does and returns the markup, so a crash
// or a corrupted value surfaces as a failure rather than a blank panel.
function render(toolData){
  const ctx={React,toolData:toolData===undefined?{}:toolData,isDark:false,isContrast:false,setToolData(){},updateMulti(){}};
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
}
// A saved session is attacker-controlled in practice: it round-trips through
// localStorage, a URL or a shared file. Anything can come back.
const HOSTILE=[
  ['undefined toolData',undefined],
  ['empty object',{}],
  ['butterfly null',{butterfly:null}],
  ['butterfly is a string',{butterfly:'a string'}],
  ['butterfly is an array',{butterfly:[]}],
  ['butterfly is a number',{butterfly:42}],
  ['version is a string',{butterfly:{version:'abc'}}],
  ['observations is a string',{butterfly:{observations:'milkweed'}}],
  ['observations hold junk',{butterfly:{observations:[{},null,42,'__proto__','nowhere']}}],
  ['restoration fields wrong types',{butterfly:{restoration:{design:{},prediction:[],trials:'no'}}}],
  ['trial carries prototype keys',{butterfly:{restoration:{trials:[{design:'constructor',prediction:'toString'}]}}}],
  ['broods is an object',{butterfly:{lifecycle:{broods:{}}}}],
  ['stage set with a bogus patch',{butterfly:{lifecycle:{stage:'chrysalis',patch:'nowhere'}}}],
  ['run missing its prediction',{butterfly:{season:{runs:[{patch:'restoration',mowing:'never',result:'complete'}]}}}],
  ['season fields junk',{butterfly:{season:{mowing:'__proto__',runs:null}}}],
  ['NaN position and energy',{butterfly:{x:NaN,z:NaN,energy:NaN}}],
  ['Infinity position, negative energy',{butterfly:{x:Infinity,z:-Infinity,energy:-5}}],
  ['energy is a string',{butterfly:{energy:'100'}}],
  ['landed and paused are strings',{butterfly:{landed:'yes',paused:'no'}}],
  ['5000 observations',{butterfly:{observations:new Array(5000).fill('milkweed')}}],
  ['500 broods',{butterfly:{lifecycle:{broods:new Array(500).fill({patch:'milkweed',prediction:'complete',result:'complete'})}}}]
];

describe('Butterfly hostile persisted state',()=>{
 it.each(HOSTILE)('renders without crashing: %s',(_label,data)=>{
   expect(()=>render(data)).not.toThrow();
 });

 it.each(HOSTILE)('renders no corrupted value: %s',(_label,data)=>{
   const html=render(data);
   // These are how a bad persisted value actually reaches the screen in this
   // codebase: a coerced object, a propagated NaN, a leaked undefined.
   expect(html).not.toContain('[object Object]');
   expect(html).not.toContain('NaN');
   expect(html).not.toContain('>undefined<');
   expect(html).not.toContain('Infinity');
   expect(html.length).toBeGreaterThan(500);
 });

 it('survives deeply nested junk without blowing the stack',()=>{
   const deep={butterfly:{}};let cur=deep.butterfly;
   for(let i=0;i<500;i++){cur.n={};cur=cur.n;}
   expect(()=>render(deep)).not.toThrow();
 });

 it('never writes a prototype-polluting key through a saved session',()=>{
   const before=Object.prototype.polluted;
   render({butterfly:JSON.parse('{"__proto__":{"polluted":"yes"},"observations":["milkweed"]}')});
   expect(Object.prototype.polluted).toBe(before);
   const s=BF.freshState(JSON.parse('{"__proto__":{"polluted2":"yes"}}'));
   expect(Object.prototype.polluted2).toBeUndefined();
   expect(Object.getPrototypeOf(s)).toBe(Object.prototype);
 });

 it('clamps a hostile save back into a state the model can use',()=>{
   const s=BF.freshState({x:NaN,z:Infinity,energy:-40,landed:'yes',observations:['milkweed','nowhere',null],
     restoration:{design:'not-a-design',prediction:'not-a-prediction',trials:'no'}});
   expect(Number.isFinite(s.x)).toBe(true);
   expect(Number.isFinite(s.z)).toBe(true);
   expect(Number.isFinite(s.energy)).toBe(true);
   expect(s.energy).toBeGreaterThanOrEqual(0);
   // Only real patch ids survive, so nothing downstream looks up a ghost.
   expect(s.observations.every(o=>['milkweed','bergamot','lawn'].includes(o))).toBe(true);
   expect(Array.isArray(s.restoration.trials)).toBe(true);
   // A bogus design must not leave the plot describing a planting that cannot exist.
   const plot=BF.habitats(s)[3];
   expect(typeof plot.name).toBe('string');
   expect(typeof plot.nectar).toBe('boolean');
   expect(typeof plot.host).toBe('boolean');
 });

 it('keeps the field report and claim panel honest on a hostile save',()=>{
   const s=BF.freshState({observations:['nowhere',null,{}],
     lifecycle:{broods:[{patch:'nowhere',prediction:'complete',result:'complete'}]},
     season:{runs:[{patch:'nowhere',mowing:'never',prediction:'complete',result:'complete'}]}});
   const text=BF.fieldReport(s);
   expect(text).not.toContain('nowhere');
   expect(text).not.toContain('undefined');
   expect(text).not.toContain('[object Object]');
   // Records that name a patch the model does not have cannot count as evidence.
   for(const c of BF.claims)expect(()=>BF.judgeClaim(s,c.id)).not.toThrow();
 });
});
