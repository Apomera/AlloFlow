import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function region(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
const data=region('      var SIM_SPECIES = [','      // ─── Accessibility settings'),deep=region('      function isDeepSpecies(','      // ─── Achievement system'),helper=region('      // A single resolved setup','      function renderHuntSim()'),guide=region('      function clHuntSpeciesStrategy(','      function initHuntSim3D(');
const translate=(_key,fallback)=>fallback,rules=new Function('__alloT',data+deep+helper+guide+';return {setup:clHuntDiveSetup,start:clHuntStartState,species:SIM_SPECIES,capabilities:clHuntCapabilities,guide:clHuntControlGuide,strategy:clHuntSpeciesStrategy};')(translate);
const renderSource=region('      function renderHuntSim()','      // ─── 3D underwater octopus simulation');
const leaderboard=region('      // ─── Persistent leaderboard helpers','      // ─── Three.js loader');
function nodes(node,out=[]){if(node&&typeof node==='object'){out.push(node);node.children.forEach(c=>nodes(c,out));}return out;}
function strings(node){return nodes(node).flatMap(n=>n.children.filter(c=>typeof c==='string'));}
function guideNode(f,kind){const node=f.render().find(n=>n.props['data-cl-dive-guide']===kind);assert.ok(node,'Selected dive '+kind);return node;}
function fixture(initial={}){
  let state={...initial};
  const h=(tag,props,...children)=>({tag,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==false&&v!==undefined)});
  const draw=new Function('d','setCL','h','__alloT',`
    var window={THREE:{},localStorage:{getItem:function(){return null;}}};
    function panelHeader(){return null;}function cardStyle(){return {};}function subheaderStyle(){return {};}
    function loadAudioSettings(){return {volume:.5,muted:true};}function loadA11ySettings(){return {colorPalette:'default'};}
    var COLOR_PALETTES={default:{health:{high:'#fff'},stamina:'#fff',hunger:{mid:'#fff'},camo:{high:'#fff'},ink:'#fff'}};
    function clReadableInk(c){return c;}function awardXP(){}function clAnnounce(){}
  `+data+deep+leaderboard+helper+guide+renderSource+';return renderHuntSim();');
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
  it('renders keyboard and touch guidance for all twelve species from the same groups used during a dive',()=>{
    assert.equal(rules.species.length,12);
    for(const species of rules.species){
      const f=fixture({huntSpeciesId:species.id}),controls=guideNode(f,'controls'),content=strings(controls).join(' ');
      const capabilities=rules.capabilities(species.id);
      assert.equal(capabilities.ink,!['nautilus','dumboOcto','vampireSquid'].includes(species.id),species.id+' ink availability');
      assert.equal(capabilities.diet,species.id==='vampireSquid'?'detritus':'prey',species.id+' feeding');
      const keyboard=rules.guide(capabilities,species,false),touch=rules.guide(capabilities,species,true);
      assert.deepEqual(nodes(controls).filter(n=>n.tag==='h3').map(n=>strings(n).join(' ')),['Move','Feed & interact','Defense','Camera & pause'],species.id);
      for(const groups of [keyboard,touch])for(const group of groups)for(const row of group.rows){
        assert.ok(content.includes(row.input),species.id+' input: '+row.input);
        assert.ok(content.includes(row.action),species.id+' action: '+row.action);
      }
      const strategy=strings(guideNode(f,'strategy')).join(' ');
      assert.ok(strategy.includes('Playing as '+species.name),species.id);
      assert.ok(strategy.includes(rules.strategy(species.id)),species.id+' strategy');
    }
  });
  it('replaces launch guidance immediately when the selected species changes',()=>{
    const f=fixture({huntSpeciesId:'commonOcto',huntMode:'observe'});
    assert.ok(strings(guideNode(f,'controls')).join(' ').includes('Release ink to break pursuit.'));
    for(const [id,input,absent] of [['vampireSquid','Flash','Display'],['mimicOcto','Mimic','Flash'],['cuttlefish','Display','Mimic'],['nautilus','No ink','Display']]){
      f.find('Dive species').props.onChange({target:{value:id}});
      const controlStrings=strings(guideNode(f,'controls'));
      assert.ok(controlStrings.some(text=>text.includes(input)),id+' controls');
      assert.equal(controlStrings.some(text=>text.includes(absent)),false,id+' stale controls');
      assert.ok(strings(guideNode(f,'strategy')).join(' ').includes(rules.strategy(id)),id+' strategy');
      assert.equal(f.find('Dive mode').props.value,'observe');
    }
  });
  it('teaches vampire squid Gather and Flash without offering ink or prey strikes',()=>{
    const f=fixture({huntSpeciesId:'vampireSquid',huntMode:'observe'}),controls=strings(guideNode(f,'controls')).join(' ');
    assert.match(controls,/Gather \/ hold/);assert.match(controls,/Hold E/);assert.match(controls,/Flash/);assert.match(controls,/Hold B/);assert.match(controls,/No ink/);assert.match(controls,/marine-snow meal/);
    assert.doesNotMatch(controls,/Release ink|selected prey|strike|nearby clam/i);
    assert.match(strings(guideNode(f,'strategy')).join(' '),/marine snow.*no ink.*Flash/);
  });
  it('explains the dumbo octopus fin boost without giving it the other species stamina warning',()=>{
    const f=fixture({huntSpeciesId:'dumboOcto'}),controls=strings(guideNode(f,'controls')).join(' ');
    assert.match(controls,/fin-powered burst/);assert.match(controls,/does not spend stamina on its boost/);assert.doesNotMatch(controls,/Watch stamina/);
    f.find('Dive species').props.onChange({target:{value:'commonOcto'}});
    const ordinary=strings(guideNode(f,'controls')).join(' ');
    assert.match(ordinary,/Watch stamina/);assert.doesNotMatch(ordinary,/does not spend stamina/);
  });
  it('distinguishes carried camouflage from placed shelter recovery in the coconut launch guidance',()=>{
    const f=fixture({huntSpeciesId:'coconutOcto'}),strategy=strings(guideNode(f,'strategy')).join(' '),diveRules=strings(guideNode(f,'rules')).join(' ');
    assert.match(strategy,/Carrying improves camouflage but does not count as being in a den/);
    assert.match(strategy,/placing creates a temporary recovery spot/);
    assert.match(diveRules,/Carrying a coconut, bottle or shell improves camouflage/);
    assert.match(diveRules,/does not count as being in a den/);assert.match(diveRules,/place it as a temporary recovery spot.*same depth/);
  });
  it('updates the rendered rules when changing between field study and a reef mission',()=>{
    const f=fixture({huntSpeciesId:'commonOcto',huntMode:'observe'});
    assert.match(strings(guideNode(f,'rules')).join(' '),/without health loss or hunger depletion/);
    f.find('Dive mode').props.onChange({target:{value:'reefMission'}});
    const missionRules=strings(guideNode(f,'rules')).join(' ');
    assert.match(missionRules,/HOME den/);assert.match(missionRules,/Hunger and injury are active/);assert.doesNotMatch(missionRules,/without health loss or hunger depletion/);
    f.find('Dive mode').props.onChange({target:{value:'observe'}});
    assert.match(strings(guideNode(f,'rules')).join(' '),/without health loss or hunger depletion/);
  });
});
