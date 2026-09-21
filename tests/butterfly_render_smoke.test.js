import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';
let tool;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};tool=loadTool('stem_lab/stem_tool_butterfly.js','butterfly');});

// The pure-model tests never touch the JSX. This renders the real component so
// a ReferenceError or a bad element in the new panels cannot ship green.
function render(toolData){
  const ctx={React,toolData:toolData||{},isDark:false,isContrast:false,setToolData(){},updateMulti(){}};
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
}
describe('Butterfly panels render',()=>{
 it('renders a fresh session with both investigations and the claim panel',()=>{
   const html=render();
   expect(html).toContain('Follow a generation');
   expect(html).toContain('Which claim does your evidence support?');
   expect(html).toContain('Monarchs need nectar for adults and milkweed for caterpillars');
   // The static strip is generated from the same stage list as the track.
   expect(html).toContain('01 · Egg');expect(html).toContain('04 · Adult');
   expect(html).toContain('No generation started');
 });
 it('renders a restored session carrying lifecycle evidence',()=>{
   const html=render({butterfly:{version:3,observations:['milkweed','bergamot','lawn'],
     restoration:{design:'mixed',prediction:null,trials:[{design:'mixed',prediction:'both'}]},
     lifecycle:{patch:'milkweed',prediction:'complete',stage:'caterpillar',
       broods:[{patch:'bergamot',prediction:'complete',result:'stalls'}]}}});
   expect(html).toContain('Generation at: Common milkweed');
   expect(html).toContain('Generations you have followed · 1 recorded');
   expect(html).toContain('3 of 3 patches investigated');
 });
 it('renders every claim without throwing on an empty record set',()=>{
   for(const saved of [undefined,{butterfly:{version:3,observations:[],restoration:{},lifecycle:{}}}])
     expect(()=>render(saved)).not.toThrow();
 });
});
