import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function region(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
const data=region('      var SIM_SPECIES = [','      // ─── Accessibility settings'),deep=region('      function isDeepSpecies(','      // ─── Achievement system'),helper=region('      // A single resolved setup','      function renderHuntSim()');
const translate=(_key,fallback)=>fallback,rules=new Function('__alloT',data+deep+helper+';return {setup:clHuntDiveSetup,start:clHuntStartState,species:SIM_SPECIES};')(translate);
const renderSource=region('      function renderHuntSim()','      // ─── 3D underwater octopus simulation');
function fixture(initial={}){
  let state={...initial};
  const h=(tag,props,...children)=>({tag,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==false&&v!==undefined)});
  const draw=new Function('d','setCL','h','__alloT',`
    var window={THREE:{},localStorage:{getItem:function(){return null;}}};
    function panelHeader(){return null;}function cardStyle(){return {};}function subheaderStyle(){return {};}function loadLeaderboard(){return {};}
    function loadAudioSettings(){return {volume:.5,muted:true};}function loadA11ySettings(){return {colorPalette:'default'};}
    var COLOR_PALETTES={default:{health:{high:'#fff'},stamina:'#fff',hunger:{mid:'#fff'},camo:{high:'#fff'},ink:'#fff'}};
    function clReadableInk(c){return c;}function awardXP(){}function clAnnounce(){}
  `+data+deep+helper+renderSource+';return renderHuntSim();');
  function nodes(node,out=[]){if(node&&typeof node==='object'){out.push(node);node.children.forEach(c=>nodes(c,out));}return out;}
  function render(){return nodes(draw(state,patch=>{state={...state,...(typeof patch==='function'?patch(state):patch)};},h,translate));}
  return {render,get state(){return state;},find(label){const node=render().find(n=>n.props['aria-label']===label);assert.ok(node,label);return node;},button(label){const node=render().find(n=>n.tag==='button'&&n.children.some(c=>typeof c==='string'&&c.startsWith(label)));assert.ok(node,label);return node;}};
}
describe('Cephalopod Hunter selected dive setup and replay',()=>{
  it('starts the displayed default reef mission as the common octopus',()=>{
    const f=fixture();assert.equal(f.find('Dive species').props.value,'commonOcto');assert.equal(f.find('Dive mode').props.value,'reefMission');f.button('Start reef mission · Common Octopus').props.onClick();assert.equal(f.state.huntSpeciesId,'commonOcto');assert.equal(f.state.huntMode,'reefMission');assert.equal(f.state.huntsAttempted,1);
  });
  it('honors an explicit species and field-study choice from the primary button',()=>{
    const f=fixture({huntsAttempted:5,huntSeed:6721});f.find('Dive species').props.onChange({target:{value:'coconutOcto'}});f.find('Dive mode').props.onChange({target:{value:'observe'}});f.button('Start field study · Coconut Octopus').props.onClick();assert.equal(f.state.huntSpeciesId,'coconutOcto');assert.equal(f.state.huntMode,'observe');assert.equal(f.state.huntSeed,6721);assert.equal(f.state.huntsAttempted,6);
  });
  it('keeps an existing species selected when the primary button is used',()=>{
    const f=fixture({huntSpeciesId:'giantPacific',huntMode:'free'});f.button('Start free exploration · Giant Pacific Octopus').props.onClick();assert.equal(f.state.huntSpeciesId,'giantPacific');assert.equal(f.state.huntMode,'free');
  });
  it('explains unavailable reef missions and launches compatible exploration',()=>{
    for(const id of ['humboldtSquid','vampireSquid','dumboOcto']){const f=fixture({huntMode:'reefMission'});f.find('Dive species').props.onChange({target:{value:id}});const menu=f.find('Dive mode');assert.equal(menu.props.value,'free');assert.equal(menu.children.find(n=>n.props.value==='reefMission').props.disabled,true);f.button('Start free exploration').props.onClick();assert.equal(f.state.huntSpeciesId,id);assert.equal(f.state.huntMode,'free');assert.equal(rules.setup({huntSpeciesId:id,huntMode:'observe'}).mode,'observe');}
  });
  it('preserves the species-card shortcut and applies the selected field-study mode',()=>{
    const f=fixture({huntMode:'observe'});const card=f.render().find(n=>n.tag==='button'&&n.props.key==='blueRinged');assert.ok(card);card.props.onClick();assert.equal(f.state.huntSpeciesId,'blueRinged');assert.equal(f.state.huntMode,'observe');
  });
  it('records the active mode and replays it with its species and seed after setup changes',()=>{
    const finish=region('        function finishRun(reason,show){','        canvasEl._clFinishRun=finishRun;');
    const save=new Function('diveSetup','species','initialSeed',`var gameNow=3210,gameState={finished:false,runStats:{},score:4,events:[],inkReserves:3},saved=null,window={localStorage:{setItem:function(_key,value){saved=JSON.parse(value);}}};function clearInput(){}function recordEvent(){}function updateLeaderboard(){}function setCL(){};`+finish+`;finishRun('surfaced',false);return saved;`);
    const summary=save(rules.setup({huntSpeciesId:'coconutOcto',huntMode:'observe'}),rules.species.find(s=>s.id==='coconutOcto'),811);
    assert.equal(summary.mode,'observe');const f=fixture({huntMode:'reefMission',huntSpeciesId:'giantPacific',huntSeed:777,huntLastRun:summary});f.button('Replay this world').props.onClick();assert.equal(f.state.huntMode,'observe');assert.equal(f.state.huntSpeciesId,'coconutOcto');assert.equal(f.state.huntSeed,811);
  });
  it('replays older summaries with the current selected mode and a visible explanation',()=>{
    const f=fixture({huntMode:'observe',huntLastRun:{species:'Common Octopus',speciesId:'commonOcto',seed:71,score:2,seconds:3,stats:{crabs:1,clams:0,fish:0}}});assert.ok(f.render().some(n=>n.children.some(c=>typeof c==='string'&&c.includes('older dive did not record its mode'))));f.button('Replay this world').props.onClick();assert.equal(f.state.huntMode,'observe');assert.equal(f.state.huntSpeciesId,'commonOcto');assert.equal(f.state.huntSeed,71);
  });
  it('normalizes invalid stored choices without losing a valid species',()=>{
    assert.equal(rules.setup({huntSpeciesId:'unknown',huntMode:'unknown'}).species.id,'commonOcto');assert.equal(rules.setup({huntSpeciesId:'giantPacific',huntMode:'unknown'}).species.id,'giantPacific');assert.equal(rules.setup({huntSpeciesId:'giantPacific',huntMode:'unknown'}).mode,'reefMission');
  });
  it('describes actual hunger/injury rules without promising naturalistic mechanics',()=>{
    assert.match(rules.setup({huntMode:'observe'}).description,/without health loss or hunger depletion/);assert.match(rules.setup({huntMode:'free'}).description,/hunger and injury active/);assert.match(rules.setup({huntMode:'reefMission'}).description,/HOME den/);assert.match(rules.setup({huntMode:'observe'}).description,/stamina/);
  });
});