import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const a=source.indexOf('      function clHuntSpeciesStrategy('),b=source.indexOf('      function initHuntSim3D(',a);
assert.ok(a>=0&&b>a);const helper=source.slice(a,b),guide=new Function(helper+';return clHuntControlGuide;')(),windows=[];
const common={name:'Common octopus'},caps={ink:true,diet:'prey'},rows=groups=>groups.flatMap(group=>group.rows);
function fixture(paused=false){
  const dom=new JSDOM('<!doctype html><body><div id="stage"><canvas tabindex="0"></canvas><div class="cl-hunt-settings" hidden><div class="content"></div></div></div></body>');windows.push(dom.window);
  const document=dom.window.document,stage=document.getElementById('stage'),panel=stage.querySelector('.cl-hunt-settings'),content=stage.querySelector('.content'),canvas=stage.querySelector('canvas');
  const start=source.indexOf("        var guideTitle=document.createElement('h2');"),end=source.indexOf('        function setting(label,key)',start);assert.ok(start>=0&&end>start);
  const open=source.match(/        function openSettings\(\)\{[^\n]*\}/)[0],close=source.match(/        function closeSettings\(\)\{[^\n]*\}/)[0],key=source.match(/        settingsPanel\.onkeydown=function\(e\)\{[^\n]*\};/)[0];
  return new Function('document','stage','settingsPanel','settingsContent','canvasEl','species','capabilities','paused',helper+`
    var speciesId=species.id||'commonOcto',uiStyle={textContent:''},gameState={paused:paused,gameOver:false},settingsWasPaused=false,pauseCalls=[],diveSetup={mode:'observe',label:'Field study',description:'Explore without health loss or hunger depletion. Prey, predators, stamina and species abilities still behave under the same simplified game rules.'};
    function clearInput(){}function setPaused(value){gameState.paused=value;pauseCalls.push(value);}
    `+source.slice(start,end)+`
    for(var i=0;i<2;i++){var input=document.createElement('input');input.type='checkbox';settingsContent.appendChild(input);}
    var actions=document.createElement('div');settingsPanel.appendChild(actions);['Return to dive','End run'].forEach(function(text){var button=document.createElement('button');button.textContent=text;actions.appendChild(button);});
    `+open+'\n'+close+'\n'+key+`
    return {document,stage,settingsPanel,canvasEl,guideTitle,guideIntro,help,gameState,open:openSettings,close:closeSettings,update:updateHuntHelp,pauseCalls};
  `)(document,stage,panel,content,canvas,common,caps,paused);
}
function key(f,value,shift=false){const event=new f.document.defaultView.KeyboardEvent('keydown',{key:value,shiftKey:shift,bubbles:true,cancelable:true});f.document.activeElement.dispatchEvent(event);return event;}
afterEach(()=>{for(const window of windows.splice(0))window.close();});
describe('Species-aware dive controls guide',()=>{
  it('groups movement, feeding, defense and camera controls with meaningful instructions',()=>{
    const groups=guide(caps,common,false),all=new Map(rows(groups).map(row=>[row.input,row.action]));
    assert.deepEqual(groups.map(group=>group.title),['Move','Feed & interact','Defense','Camera & pause']);
    assert.ok(all.has('W / S or ↑ / ↓'));assert.ok(all.has('A / D or ← / →'));assert.match(all.get('Space + forward'),/together/);
    assert.match(all.get('E'),/Hold to open a nearby clam/);assert.match(all.get('G'),/pearl.*shelter.*drop/);assert.match(all.get('V'),/Follow, Side, Tactical and Hunt/);assert.match(all.get('F'),/arrow keys orbit/);assert.ok(all.has('?'));
  });
  it('omits unavailable ink and exposes each special ability with the correct keyboard or touch action',()=>{
    for(const species of [{name:'Nautilus',specialAbility:'shellDefense'},{name:'Dumbo octopus'},{name:'Vampire squid',specialAbility:'burglarAlarm'}])for(const touch of [false,true]){
      const all=rows(guide({ink:false,diet:species.specialAbility==='burglarAlarm'?'detritus':'prey'},species,touch));assert.equal(all.some(row=>row.input==='I'||row.input==='Ink'),false);assert.ok(all.some(row=>row.input==='No ink'));
    }
    for(const [ability,keyName,button]of [['mimicry','Hold M','Mimic'],['passingCloud','Hold H','Display'],['burglarAlarm','Hold B','Flash']]){
      assert.ok(rows(guide(caps,{specialAbility:ability},false)).some(row=>row.input===keyName));assert.ok(rows(guide(caps,{specialAbility:ability},true)).some(row=>row.input===button));assert.equal(rows(guide(caps,common,false)).some(row=>row.input===keyName),false);
    }
  });
  it('describes marine snow and cancellable one-tap foraging for vampire squid without prey strike guidance',()=>{
    for(const touch of [false,true]){const food=guide({ink:false,diet:'detritus'},{specialAbility:'burglarAlarm'},touch)[1];assert.equal(food.rows.length,3);assert.match(food.rows[0].action,/marine snow.*staying still/);assert.match(food.rows[1].action,/marine-snow meal.*tap again to stop.*Moving, pausing, damage or leaving reach cancels/);assert.equal(food.rows.some(row=>/strike|clam|selected prey/i.test(row.action)),false);}
  });
  it('renders semantic cards once per input mode and preserves heading focus while changing to touch guidance',()=>{
    const f=fixture();assert.equal(f.help.querySelectorAll('section').length,4);assert.equal(f.help.querySelectorAll('h3').length,4);assert.equal(f.help.querySelectorAll('dt').length,f.help.querySelectorAll('dd').length);
    const first=f.help.firstChild;f.update();assert.equal(f.help.firstChild,first);f.open();f.stage.classList.add('cl-hunt-touch-enabled');f.update();assert.notEqual(f.help.firstChild,first);assert.ok([...f.help.querySelectorAll('dt')].some(node=>node.textContent==='Forward / Back'));assert.ok([...f.help.querySelectorAll('dt')].some(node=>node.textContent==='Tools → View'));
    const mobile=f.help.firstChild;f.update();assert.equal(f.help.firstChild,mobile);assert.equal(f.document.activeElement,f.guideTitle);
  });
  it('focuses the heading and resumes a running dive with Escape without corrupting pause state on repeated open/close',()=>{
    const f=fixture();f.open();assert.equal(f.document.activeElement,f.guideTitle);assert.equal(f.gameState.paused,true);assert.equal(f.settingsPanel.hidden,false);assert.match(f.guideIntro.textContent,/Common octopus.*Dive paused while/);f.open();assert.deepEqual(f.pauseCalls,[true]);
    assert.equal(key(f,'Escape').defaultPrevented,true);assert.equal(f.settingsPanel.hidden,true);assert.equal(f.gameState.paused,false);assert.equal(f.document.activeElement,f.canvasEl);const calls=f.pauseCalls.length;f.close();assert.equal(f.pauseCalls.length,calls);
  });
  it('keeps an already paused dive paused and does not open after a run ends',()=>{
    const f=fixture(true);f.open();assert.match(f.guideIntro.textContent,/already paused.*stay paused/);f.close();assert.equal(f.gameState.paused,true);f.gameState.gameOver=true;const calls=f.pauseCalls.length;f.open();assert.equal(f.settingsPanel.hidden,true);assert.equal(f.pauseCalls.length,calls);
  });
  it('wraps Shift+Tab from heading or first enabled control and Tab from last, excluding disabled controls',()=>{
    const f=fixture();f.open();const inputs=f.settingsPanel.querySelectorAll('input'),buttons=f.settingsPanel.querySelectorAll('button'),first=inputs[0],last=buttons[buttons.length-1];assert.equal(key(f,'Tab',true).defaultPrevented,true);assert.equal(f.document.activeElement,last);assert.equal(key(f,'Tab').defaultPrevented,true);assert.equal(f.document.activeElement,first);assert.equal(key(f,'Tab',true).defaultPrevented,true);assert.equal(f.document.activeElement,last);first.disabled=true;assert.equal(key(f,'Tab').defaultPrevented,true);assert.equal(f.document.activeElement,inputs[1]);
  });
});
