import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const CURRENT='allo.cephalopodlab.leaderboard.v2',LEGACY='allo.cephalopodlab.leaderboard.v1';
function region(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
const speciesSource=region('      var SIM_SPECIES = [','      // ─── Accessibility settings');
const leaderboardSource=region('      // ─── Persistent leaderboard helpers','      // ─── Three.js loader');
const setupSource=region('      // A single resolved setup','      function renderHuntSim()');
const deepSource=region('      function isDeepSpecies(','      // ─── Achievement system');
const guideSource=region('      function clHuntSpeciesStrategy(','      function initHuntSim3D(');
const renderSource=region('      function renderHuntSim()','      // ─── 3D underwater octopus simulation');
const translate=(_key,fallback)=>fallback;
const empty=()=>({version:2,byMode:{}});
const modes=()=>({version:2,byMode:{reefMission:{},free:{},observe:{}}});
const record=(score,time=1000,camo=.5,dives=1,catches=1)=>({bestScore:score,bestSurvivalMs:time,bestCamoEff:camo,totalDives:dives,totalCatches:catches});
function fixture(seed={}){
  const store=seed instanceof Map?seed:new Map(Object.entries(seed)),writes=[];
  const localStorage={getItem(key){return store.get(key)??null;},setItem(key,value){writes.push(key);store.set(key,String(value));}};
  const window={THREE:{},localStorage};
  const api=new Function('window','__alloT',speciesSource+leaderboardSource+`;return {
    load:loadLeaderboard,legacy:loadLegacyLeaderboard,record:clHuntLeaderboardRecord,legacyRecord:clHuntLegacyRecord,
    update:updateLeaderboard,progress:clHuntChallengeProgress
  };`)(window,translate);
  return {api,store,writes,window};
}
function nodes(node,out=[]){if(node&&typeof node==='object'){out.push(node);node.children.forEach(c=>nodes(c,out));}return out;}
function text(node){return typeof node==='string'||typeof node==='number'?String(node):node&&typeof node==='object'?node.children.map(text).join(' '):'';}
function launch(f,initial){
  let state={_threeLoaded:true,...initial};
  const h=(tag,props,...children)=>({tag,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==false&&v!==undefined)});
  const draw=new Function('window','d','setCL','h','__alloT',`
    function panelHeader(){return null;}function cardStyle(){return {};}function subheaderStyle(){return {};}
    function loadAudioSettings(){return {volume:.5,muted:true};}function loadA11ySettings(){return {colorPalette:'default'};}
    var COLOR_PALETTES={default:{health:{high:'#fff'},stamina:'#fff',hunger:{mid:'#fff'},camo:{high:'#fff'},ink:'#fff'}};
    function clReadableInk(c){return c;}function awardXP(){}function clAnnounce(){}
  `+speciesSource+deepSource+leaderboardSource+setupSource+guideSource+renderSource+';return renderHuntSim();');
  const render=()=>nodes(draw(f.window,state,patch=>{state={...state,...(typeof patch==='function'?patch(state):patch)};},h,translate));
  return {render,mode(value){const select=render().find(n=>n.props['aria-label']==='Dive mode');assert.ok(select);select.props.onChange({target:{value}});},best(species,mode){const node=render().find(n=>n.props['data-cl-best-species']===species&&n.props['data-cl-best-mode']===mode);assert.ok(node,species+' '+mode+' record');return node;}};
}

describe('Cephalopod Hunter records by species and dive mode',()=>{
  it('awards survival milestones only with hunger and injury enabled, while observation still earns camouflage and exploration badges',()=>{
    const milestones=region('            // Camo + squeeze + survival milestone achievements','            // Landmark-near achievement');
    const awards=new Function('observation','elapsed',`var gameState={camoEff:.95,isSqueezing:true,startTime:0,dayTime:.5},now=elapsed,earned=[];function unlockAchievement(id){earned.push(id);}`+milestones+';return earned;');
    assert.deepEqual(awards(true,900000),['firstCamo90','firstSqueeze']);
    assert.deepEqual(awards(false,900000),['firstCamo90','firstSqueeze','survived1Min','survived5Min','nightSurvived']);
    assert.deepEqual(awards(false,60000),['firstCamo90','firstSqueeze','nightSurvived']);
  });
  it('keeps each mode independent, includes marine snow meals, and never rewrites legacy history',()=>{
    const legacyText='{\n  "commonOcto": '+JSON.stringify(record(999,999000,.95,8,20))+'\n}\n';
    const f=fixture({[LEGACY]:legacyText});
    assert.deepEqual(f.api.load(),empty());
    const free=f.api.update('commonOcto',{crabs:1,fish:2,clams:3,marineSnow:4,maxCamoEff:.6},4,3000,'free');
    assert.equal(free.newBest,true);
    f.api.update('commonOcto',{marineSnow:1,maxCamoEff:.99},400,900000,'observe');
    f.api.update('commonOcto',{crabs:1,maxCamoEff:.4},2,1000,'reefMission');
    const lower=f.api.update('commonOcto',{clams:1,maxCamoEff:.7},3,4000,'free');
    assert.equal(lower.newBest,false);
    const book=f.api.load();
    assert.deepEqual(f.api.record(book,'commonOcto','free'),record(4,4000,.7,2,11));
    assert.deepEqual(f.api.record(book,'commonOcto','observe'),record(400,900000,.99,1,1));
    assert.deepEqual(f.api.record(book,'commonOcto','reefMission'),record(2,1000,.4,1,1));
    assert.equal(f.store.get(LEGACY),legacyText);
    assert.ok(f.writes.length>0);assert.ok(f.writes.every(key=>key===CURRENT));
    for(const mode of Object.values(JSON.parse(f.store.get(CURRENT)).byMode))for(const saved of Object.values(mode))assert.equal(Object.hasOwn(saved,'newBest'),false);
    const reloaded=fixture(f.store);
    assert.deepEqual(reloaded.api.load(),book);
    assert.equal(reloaded.api.legacyRecord(reloaded.api.legacy(),'commonOcto').bestScore,999);
    assert.equal(reloaded.api.update('commonOcto',{fish:1},4,1000,'free').newBest,false);
    assert.equal(reloaded.api.update('commonOcto',{fish:1},5,1000,'free').newBest,true);
    assert.equal(reloaded.api.record(reloaded.api.load(),'commonOcto','observe').bestScore,400);
  });

  it('rejects unknown species or modes instead of silently assigning a record',()=>{
    const f=fixture();
    for(const species of [undefined,null,'','unknown','__proto__','constructor'])assert.equal(f.api.update(species,{},12,1000,'free'),null);
    for(const mode of [undefined,null,'','unknown','__proto__','constructor'])assert.equal(f.api.update('commonOcto',{},12,1000,mode),null);
    assert.equal(f.writes.length,0);assert.deepEqual(f.api.load(),empty());
    assert.equal(f.api.record(f.api.load(),'commonOcto','free'),null);
    assert.equal(f.api.legacyRecord({},'commonOcto'),null);
  });

  it('handles malformed or inaccessible browser storage without losing the ability to finish a valid run',()=>{
    for(const raw of ['not JSON','null','[]','"wrong shape"']){
      const f=fixture({[CURRENT]:raw,[LEGACY]:raw});
      assert.deepEqual(f.api.load(),empty());
      assert.equal(f.api.legacyRecord(f.api.legacy(),'commonOcto'),null);
      assert.doesNotThrow(()=>f.api.update('vampireSquid',{marineSnow:2},4,1500,'observe'));
      assert.equal(f.api.record(f.api.load(),'vampireSquid','observe').totalCatches,2);
    }
    const f=fixture();f.window.localStorage.getItem=()=>{throw Error('Storage unavailable');};f.window.localStorage.setItem=()=>{throw Error('Storage unavailable');};
    assert.deepEqual(f.api.load(),empty());assert.equal(f.api.legacyRecord(f.api.legacy(),'commonOcto'),null);
    assert.doesNotThrow(()=>f.api.update('commonOcto',{crabs:1},2,1000,'free'));
    const malformed=modes();malformed.byMode.free.commonOcto={bestScore:'invalid',bestSurvivalMs:-3,bestCamoEff:null,totalDives:1,totalCatches:-10};
    assert.doesNotThrow(()=>f.api.record(malformed,'commonOcto','free'));
    const normalized=f.api.record(malformed,'commonOcto','free');
    if(normalized)for(const value of Object.values(normalized))assert.ok(Number.isFinite(value)&&value>=0);
  });

  it('counts known species once and excludes field study and unknown legacy modes from survival challenges',()=>{
    const f=fixture(),book=modes();
    book.byMode.free.commonOcto=record(4,372000,.7,2);
    book.byMode.reefMission.commonOcto=record(8,141000,.75,1);
    book.byMode.observe.commonOcto=record(400,9999999,.94,4);
    book.byMode.observe.vampireSquid=record(8,9999999,.8,1);
    book.byMode.free.unknown=record(999,9999999,1,99);
    const legacy={commonOcto:record(1000,9999999,.96,5),cuttlefish:record(10,9999999,.85,2),unknown:record(10,9999999,1,1)};
    assert.deepEqual(f.api.progress(book,legacy),{bestMs:372000,bestCamo:.96,played:3,legacyPlayed:2});
    const studyOnly=modes();studyOnly.byMode.observe.vampireSquid=record(10,9999999,.8,1);
    assert.deepEqual(f.api.progress(studyOnly,{cuttlefish:record(1,9999999,.9,1)}),{bestMs:0,bestCamo:.9,played:2,legacyPlayed:1});
  });

  it('records one completed run in its actual mode even when cleanup finishes it again',()=>{
    const f=fixture(),finish=region('        function finishRun(reason,show){','        canvasEl._clFinishRun=finishRun;');
    const run=new Function('window','__alloT',speciesSource+leaderboardSource+`
      var gameNow=7000,gameState={finished:false,runStats:{crabs:1,fish:0,clams:0,marineSnow:0},score:2,events:[],inkReserves:3},species=SIM_SPECIES[0],diveSetup={mode:'observe'},initialSeed=2741;
      function clearInput(){}function recordEvent(kind,text){gameState.events.push({kind:kind,text:text});}function setCL(){}
    `+finish+`;finishRun('surfaced',false);finishRun('left',false);return gameState.leaderboardRec;`);
    const result=run(f.window,translate),book=f.api.load();
    assert.equal(result.newBest,true);assert.equal(f.api.record(book,'commonOcto','observe').totalDives,1);
    assert.equal(f.api.record(book,'commonOcto','free'),null);assert.equal(f.api.record(book,'commonOcto','reefMission'),null);
    const summary=JSON.parse(f.store.get('allo.cephalopodlab.lastRun.v2'));
    assert.equal(summary.mode,'observe');assert.equal(summary.events.filter(event=>event.kind==='Finish').length,1);
  });

  it('closes transient dive views before game over, focuses the debrief, and saves only once through repeated ending and cleanup',()=>{
    const finish=region('        function finishRun(reason,show){','        canvasEl._clFinishRun=finishRun;');
    const run=new Function('window','__alloT','inspectionActive',speciesSource+leaderboardSource+`
      var gameNow=7000,gameState={finished:false,gameOver:false,runStats:{crabs:1,fish:0,clams:0,marineSnow:0},score:2,events:[],inkReserves:3},species=SIM_SPECIES[0],diveSetup={mode:'observe'},initialSeed=2741;
      var inspection={active:inspectionActive},mobileToolsPanel={hidden:false},settingsPanel={hidden:false},closed=[],rendered=[],focused=0,announcements=[],patches=[],cleared=0;
      function closeMobileTools(returnFocus){closed.push({view:'tools',gameOver:gameState.gameOver,finished:gameState.finished,returnFocus:returnFocus});if(!gameState.gameOver)mobileToolsPanel.hidden=true;}
      function closeSettings(){closed.push({view:'settings',gameOver:gameState.gameOver,finished:gameState.finished});if(!gameState.gameOver)settingsPanel.hidden=true;}
      function toggleInspection(){closed.push({view:'inspection',gameOver:gameState.gameOver,finished:gameState.finished});if(!gameState.gameOver)inspection.active=false;}
      function clearInput(){cleared++;}function recordEvent(kind,text){gameState.events.push({kind:kind,text:text});}function setCL(patch){patches.push(patch);}
      function renderStatsOverlay(){rendered.push({gameOver:gameState.gameOver,finished:gameState.finished,toolsClosed:mobileToolsPanel.hidden,settingsClosed:settingsPanel.hidden,inspectionClosed:!inspection.active});}
      var statsOverlay={scrollTop:420,querySelector:function(selector){if(selector!=='#cl-dive-results-title')throw Error('Expected the debrief title');return {focus:function(){if(statsOverlay.scrollTop!==0)throw Error('Debrief must start at its title');focused++;}};}};
      function clAnnounce(message){announcements.push({message:message,focused:focused});}
    `+finish+`;finishRun('surfaced',true);finishRun('surfaced',true);finishRun('left',false);return {closed:closed,rendered:rendered,focused:focused,announcements:announcements,patches:patches,cleared:cleared,scrollTop:statsOverlay.scrollTop};`);
    for(const inspectionActive of [false,true]){
      const f=fixture(),result=run(f.window,translate,inspectionActive);
      assert.deepEqual(result.closed.map(entry=>entry.view),inspectionActive?['tools','settings','inspection']:['tools','settings']);
      for(const entry of result.closed){assert.equal(entry.gameOver,false);assert.equal(entry.finished,false);}
      assert.equal(result.closed[0].returnFocus,false);
      assert.deepEqual(result.rendered,[{gameOver:true,finished:true,toolsClosed:true,settingsClosed:true,inspectionClosed:true}]);
      assert.equal(result.focused,1);assert.equal(result.scrollTop,0);assert.equal(result.cleared,1);assert.equal(result.patches.length,1);
      assert.equal(result.announcements.length,1);assert.equal(result.announcements[0].focused,1);assert.match(result.announcements[0].message,/Dive ended.*Review your results/);
      assert.deepEqual(f.writes,[CURRENT,'allo.cephalopodlab.lastRun.v2']);
      assert.equal(f.api.record(f.api.load(),'commonOcto','observe').totalDives,1);
      const summary=JSON.parse(f.store.get('allo.cephalopodlab.lastRun.v2'));
      assert.equal(summary.reason,'surfaced');assert.equal(summary.mode,'observe');assert.equal(summary.events.filter(event=>event.kind==='Finish').length,1);
      assert.deepEqual(result.patches[0].huntLastRun,summary);
    }
  });

  it('renders each launch card for its effective mode and keeps older unclassified records separate',()=>{
    const book=modes();book.byMode.observe.commonOcto=record(9875);book.byMode.free.commonOcto=record(41);book.byMode.reefMission.commonOcto=record(17);
    book.byMode.free.humboldtSquid=record(33);book.byMode.observe.humboldtSquid=record(7654);
    const f=fixture({[CURRENT]:JSON.stringify(book),[LEGACY]:JSON.stringify({commonOcto:record(8888)})}),view=launch(f,{huntSpeciesId:'commonOcto',huntMode:'observe'});
    assert.match(text(view.best('commonOcto','observe')),/9875/);assert.doesNotMatch(text(view.best('commonOcto','observe')),/8888|surviv/i);
    assert.match(text(view.best('commonOcto','observe')),/Field study records/);assert.match(text(view.best('commonOcto','observe')),/longest study/);
    let older=view.render().find(n=>n.props['data-cl-legacy-best']==='commonOcto');assert.ok(older);assert.match(text(older),/8888/);
    view.mode('reefMission');
    assert.match(text(view.best('commonOcto','reefMission')),/17/);assert.doesNotMatch(text(view.best('commonOcto','reefMission')),/9875|8888/);
    assert.match(text(view.best('humboldtSquid','free')),/33/);assert.doesNotMatch(text(view.best('humboldtSquid','free')),/7654/);
    view.mode('free');assert.match(text(view.best('commonOcto','free')),/41/);assert.match(text(view.best('commonOcto','free')),/Free exploration records/);
    older=view.render().find(n=>n.props['data-cl-legacy-best']==='commonOcto');assert.ok(older);assert.match(text(older),/8888/);
  });

  it('describes field-study debriefs as observations and modeled costs instead of survival achievements',()=>{
    const overlaySource=region('        function renderStatsOverlay()','        // ─── Game state');
    const draw=new Function('statsOverlay','mode','score','__alloT',speciesSource+deepSource+setupSource+`
      var species=SIM_SPECIES.find(function(sp){return sp.id==='vampireSquid';}),diveSetup=clHuntDiveSetup({huntSpeciesId:species.id,huntMode:mode}),observation=mode==='observe',capabilities=clHuntCapabilities(species.id);
      var gameNow=12000,gameState={startTime:0,missionComplete:false,score:score,leaderboardRec:{newBest:true},runStats:{crabs:0,fish:0,clams:0,marineSnow:2,maxStationaryMs:3000,maxCamoEff:.8,longestSqueezeMs:0,mimicTimeMs:0,deepestY:0,pressureDamage:1,jetMs:0,caloriesBurned:4,densVisited:0,inkUsed:0,bites:0}};
      var DEPTH_ZONES=[{name:'Test depth'}];function formatDepthM(){return 0;}function depthZoneFor(){return 0;}function pressureAtmFor(){return 1;}function setCL(){}function clAnnounce(){}
    `+overlaySource+';renderStatsOverlay();');
    for(const score of [0,3,8,15,25]){
      const overlay=document.createElement('div');draw(overlay,'observe',score,translate);
      assert.match(overlay.textContent,/Field study recorded/);assert.match(overlay.textContent,/Field study · 12s elapsed/);
      assert.match(overlay.textContent,/New best score · Field study/);assert.match(overlay.textContent,/Marine snow/);
      assert.match(overlay.textContent,/Modeled energy use/);assert.match(overlay.textContent,/Modeled pressure loss/);
      assert.doesNotMatch(overlay.textContent,/survived|Forager|Surviving|Capable Hunter|Reef Master|Apex Cephalopod|Energy spent|Lost to pressure/);
    }
    const free=document.createElement('div');draw(free,'free',3,translate);
    assert.match(free.textContent,/Surviving/);assert.match(free.textContent,/New best score · Free exploration/);
    assert.match(free.textContent,/Energy spent/);assert.doesNotMatch(free.textContent,/Field study recorded|Modeled energy use/);
  });
});
