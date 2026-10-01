import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function render(toolData){
  const ctx={React,toolData:toolData||{},isDark:false,isContrast:false,setToolData(){},updateMulti(){}};
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
}

describe('Butterfly glossary',()=>{
 it('defines every entry and says how this lab uses it',()=>{
   expect(BF.glossary.length).toBeGreaterThanOrEqual(10);
   for(const g of BF.glossary){
     expect(typeof g.term).toBe('string');
     expect(g.term.length).toBeGreaterThan(2);
     // A definition that only restates the term teaches nothing.
     expect(g.definition.length).toBeGreaterThan(40);
     expect(g.definition.toLowerCase()).not.toBe(g.term.toLowerCase());
     // The "here" line is what stops the glossary drifting from the activities.
     expect(g.here.length).toBeGreaterThan(20);
   }
   const terms=BF.glossary.map(g=>g.term);
   expect(new Set(terms).size).toBe(terms.length);
 });

 it('covers the technical words the lab actually puts on screen',()=>{
   const html=render();
   // If the copy uses a word this hard, the glossary has to carry it.
   for(const word of ['host plant','nectar','chrysalis','metamorphosis','restoration'])
     expect(html.toLowerCase()).toContain(word);
   const blob=BF.glossary.map(g=>g.term.toLowerCase()).join(' | ');
   for(const needed of ['host plant','nectar plant','chrysalis','metamorphosis','habitat restoration','instar'])
     expect(blob).toContain(needed);
 });

 it('does not contradict what the activities teach',()=>{
   const find=n=>BF.glossaryTerm(n);
   // Caterpillars eat only milkweed; nectar is adult food. Both models agree.
   expect(find('Host plant').definition.toLowerCase()).toContain('milkweed');
   expect(find('Nectar plant').definition.toLowerCase()).toContain('adult');
   expect(find('Nectar plant').definition.toLowerCase()).toContain('not');
   // Milkweed is BOTH, which is why it is the one patch that carries a generation.
   expect(find('Milkweed').definition.toLowerCase()).toContain('nectar');
   // The chrysalis entry must name the standing-plant dependency the season
   // model turns on, or the two would teach different things.
   expect(find('Chrysalis / pupa').definition.toLowerCase()).toContain('does not feed');
   expect(find('Chrysalis / pupa').here.toLowerCase()).toContain('standing');
   const s=BF.freshState();
   const plot=(BF.applyPlan(s,'mixed','both'),BF.habitats(s)[3]);
   expect(BF.seasonOutcome(plot,'mid').blocked).toBe('chrysalis');
 });

 it('renders as a definition list that is closed by default',()=>{
   const html=render();
   expect(html).toContain('bf-glossary');
   expect(html).toContain('words used in this lab');
   expect(html).toContain('data-gloss-term="Host plant"');
   // A <details> with no open attribute stays collapsed, so the glossary
   // never pushes the investigations off the screen.
   expect(html).not.toMatch(/<details[^>]*class="[^"]*bf-glossary[^"]*"[^>]*open/);
   for(const g of BF.glossary)expect(html).toContain('data-gloss-term="'+g.term+'"');
 });

 it('states no survival rate or population claim',()=>{
   const all=BF.glossary.map(g=>g.definition+' '+g.here).join(' ');
   expect(all).not.toMatch(/\d+\s*%/);
   expect(all).not.toMatch(/\b\d+\s*(butterflies|monarchs|eggs)\b/i);
 });
});
