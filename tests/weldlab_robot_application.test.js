import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripRobotReference } from './helpers/weldlab_robot_reference_restore.js';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const require=createRequire(resolve('desktop/web-app/package.json'));
const {Simulate}=require('react-dom/test-utils');
const BASE={view:'robotic',rob_sect:'cobots'};
const ITEMS=[
{id:'arm',mark:'1',title:'Robot arm',detail:'The arm and its control system are components of the application. The application risk assessment determines the safety functions and settings that are needed.'},
{id:'tool',mark:'2',title:'Tool / end effector',detail:'The tool attached to the arm can introduce its own hazards. Here it is a welding torch. Its shape, contact points and use belong in the application assessment.'},
{id:'workpiece',mark:'3',title:'Workpiece + fixture',detail:'The workpiece, fixture and surrounding equipment also belong in the assessment. Their edges and possible contact points matter alongside the robot arm.'},
{id:'process',mark:'4',title:'Welding process',detail:'Welding adds hazards such as fume, hazardous light, heat and hot surfaces. Robot safety functions do not remove the need to assess these process hazards.'}
];
const BRANDS=[
['Universal Robots (UR)','Danish company; UR5e + UR10e + UR16e are popular for welding. PolyScope interface — easiest cobot programming on market. Major adoption in small fab shops.'],
['ABB GoFa',"ABB's cobot line. CRB 15000. Good integration with ABB welding systems."],
['FANUC CRX',"FANUC's cobot line. CRX-10iA + CRX-25iA. Easier programming than FANUC industrial."],
['YuMi (ABB)','Dual-arm cobot for assembly + delicate work. Less commonly used for welding but emerging.']
];
const ORIGINAL_INTRO='Collaborative robots ("cobots") are lighter, slower, force-limited robots designed to work alongside humans without safety cages. Easier to program (often by guiding the arm with your hand to teach positions). Used widely for low-volume welding in small shops that couldn\'t afford traditional robot cells.';
const NEW_INTRO='Collaborative robots ("cobots") offer safety functions for collaborative applications; the complete application needs a risk assessment to determine its safeguards. Easier to program (often by guiding the arm with your hand to teach positions). Used widely for low-volume welding in small shops that couldn\'t afford traditional robot cells.';
const OLD_CALLOUT='Traditional welding robots: ~$200K turn-key cell, weeks of programming, safety cage, requires dedicated programmer. Cobots: ~$50K turn-key, hours of programming, no cage needed, programmed by existing welder. Small shops can now afford automation that was previously out of reach. Result: more shops automating, but cobots typically supplement (not replace) skilled manual welders.';
const NEW_CALLOUT='Application cost and setup effort depend on tooling, integration, training and safeguarding. Experienced welders still help teach and check the welding process.';
const ASSESSMENT='Assess the complete application during setup and teaching, normal operation, and troubleshooting or maintenance. The assessment considers the arm, tool, workpiece, process and surroundings together.';
const ARM='M204 256 L220 184 L292 116 L378 142',TORCH='M378 142 L408 172 L432 196',NOZZLE='421,188 432,180 451,204 440,214',TIP='M445 209 L455 219';
const STOCK=[[388,246,108,12],[466,218,10,28]],FIXTURE=[[398,258,16,6],[470,258,16,6],[492,236,10,28],[482,236,20,6]],TABLE=[[338,264,180,14],[350,278,12,40],[496,278,12,40]];
const GOOD=[{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true},{x:12,y:1,m:'J',w:false},{x:1,y:1,m:'J',w:false}];
let root,host;
const lens=(node=host)=>node.querySelector('[data-rob-app]');
const textButton=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
const coords=node=>['x','y','width','height'].map(a=>Number(node.getAttribute(a)));
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();vi.restoreAllMocks();});
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function pick(id){await click(lens().querySelector('[data-rob-app-pick="'+id+'"]'));}
async function topic(text){await click(textButton(text));}
async function change(node,value){expect(node).toBeTruthy();await React.act(()=>Simulate.change(node,{target:{value:String(value)}}));}

describe('Robot application scope',()=>{
  it('uses only the authorized intro and planning-callout corrections and preserves all four authored brand records',()=>{
    const node=render(),section=lens(node);expect(section.previousElementSibling.textContent).toBe(NEW_INTRO);const cards=[...section.nextElementSibling.children];expect(cards.map(card=>[card.firstElementChild.textContent,card.querySelector('p').textContent])).toEqual(BRANDS);const callout=section.nextElementSibling.nextElementSibling;expect(callout.firstElementChild.textContent).toBe('Plan the complete application');expect(callout.querySelector('p').textContent).toBe(NEW_CALLOUT);expect(node.textContent).not.toContain('without safety cages');expect(node.textContent).not.toContain('no cage needed');expect(node.textContent).not.toContain('$200K');expect(node.textContent).not.toContain('$50K');expect(NEW_INTRO.slice(NEW_INTRO.indexOf(' Easier to program'))).toBe(ORIGINAL_INTRO.slice(ORIGINAL_INTRO.indexOf(' Easier to program')));
  });

  it('maps four manual choices to their complete definitions and an early full-size reading',async()=>{
    await mount();for(const item of ITEMS){await pick(item.id);const section=lens(),reading=section.querySelector('[data-rob-app-reading]');expect(section.dataset.robApp).toBe(item.id);expect(reading.dataset.robAppReading).toBe(item.id);expect(reading.querySelector('h5').textContent).toBe(item.mark+' · '+item.title);expect(reading.querySelector('[data-rob-app-detail]').textContent).toBe(item.detail);expect(section.querySelector('[data-rob-app-focus]').dataset.robAppFocus).toBe(item.id);expect(section.querySelector('figure').nextElementSibling).toBe(reading);expect(section.querySelectorAll('[data-rob-app-pick][aria-pressed="true"]')).toHaveLength(1);expect(section.querySelector('[data-rob-app-assessment]').textContent).toBe(ASSESSMENT);}
  });

  it('constructs the actual arm-to-tool attachment, separate stock/fixture/table, and a clearly separate process-reference panel',()=>{
    const section=lens(render()),part=id=>section.querySelector('[data-rob-app-part="'+id+'"]'),obj=id=>section.querySelector('[data-rob-app-object="'+id+'"]');expect([...section.querySelectorAll('[data-rob-app-part]')].map(n=>n.dataset.robAppPart)).toEqual(['arm','tool','workpiece','process']);expect(obj('arm-links').getAttribute('d')).toBe(ARM);expect([...part('arm').querySelectorAll('circle')].map(n=>['cx','cy','r'].map(a=>Number(n.getAttribute(a))))).toEqual([[204,256,11],[220,184,11],[292,116,11],[378,142,11]]);expect(obj('torch-neck').getAttribute('d')).toBe(TORCH);expect(obj('nozzle').getAttribute('points')).toBe(NOZZLE);expect(obj('torch-tip').getAttribute('d')).toBe(TIP);expect(TORCH.startsWith('M378 142')).toBe(true);
    for(const [stem,expected] of [['stock',STOCK],['fixture',FIXTURE],['table',TABLE]])expect(expected.map((_,i)=>coords(obj(stem+'-'+i)))).toEqual(expected);expect(coords(obj('controller'))).toEqual([64,242,80,76]);expect(coords(obj('pedestal'))).toEqual([174,254,60,64]);expect(coords(obj('process-reference'))).toEqual([544,58,132,220]);expect(['fume-symbol','light-symbol','heat-symbol'].every(id=>part('process').contains(obj(id)))).toBe(true);expect(part('process').querySelectorAll('g')).toHaveLength(3);
    // Actual torch tip ends at (455,219); nearest upright stock begins x466: a real11px gap.
    expect(Number(obj('stock-1').getAttribute('x'))-455).toBe(11);expect(219).toBeGreaterThanOrEqual(Number(obj('stock-1').getAttribute('y')));expect(219).toBeLessThan(Number(obj('stock-1').getAttribute('y'))+Number(obj('stock-1').getAttribute('height')));
  });

  it('keeps all base coordinates and objects invariant and aligns emphasis to actual component geometry',async()=>{
    await mount();const base=lens().querySelector('[data-rob-app-base]').outerHTML;for(const item of ITEMS){await pick(item.id);const section=lens(),focus=section.querySelector('[data-rob-app-focus]');expect(section.querySelector('[data-rob-app-base]').outerHTML).toBe(base);expect(section.querySelector('svg').getAttribute('viewBox')).toBe('0 0 720 360');if(item.id==='arm'){expect([...focus.querySelectorAll('path')].map(n=>n.getAttribute('d'))).toEqual([ARM,ARM]);expect(coords(focus.querySelector('rect'))).toEqual([64,242,80,76]);}if(item.id==='tool'){expect([...focus.querySelectorAll('path')].map(n=>n.getAttribute('d'))).toEqual([TORCH,TORCH,TIP,TIP]);expect(focus.querySelector('polygon').getAttribute('points')).toBe(NOZZLE);}if(item.id==='workpiece')expect([...focus.querySelectorAll('rect')].map(coords)).toEqual([...STOCK,...FIXTURE,...TABLE]);if(item.id==='process')expect(coords(focus.querySelector('rect'))).toEqual([544,58,132,220]);expect(section.querySelectorAll('[hidden],[opacity="0"]')).toHaveLength(0);}
  });

  it('writes no program, arc, track, grade, job-evidence or other saved state and does not bind the scene to saved arc state',async()=>{
    const extra={tech2_rob_prog:GOOD,tech2_rob_mode:'L',tech2_rob_arc:true,tech2_rob_shift:true,tech2_rob_track:true,tech2_rob_sort:{1:'manual'},rob4_job:4,rob4_lens:'fit',pipe2_stack:['root','hot']};const app=await mount(extra),saved=JSON.stringify(app.latest());for(const item of ITEMS)await pick(item.id);expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(0);expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('keeps the fixed reference independent of saved welding-arc state',()=>{const on=render({tech2_rob_arc:true}),off=render({tech2_rob_arc:false});expect(lens(on).querySelector('[data-rob-app-base]').outerHTML).toBe(lens(off).querySelector('[data-rob-app-base]').outerHTML);});

  it('preserves paused pendant inspection and its unrevealed run verdict through application focus',async()=>{
    const app=await mount({rob_sect:'pendant',tech2_rob_prog:GOOD});await change(host.querySelector('[data-robot-inspect-select]'),1);await change(host.querySelector('[data-robot-inspect-progress]'),80);expect(host.querySelector('[data-robot-inspector]').dataset).toMatchObject({move:'2',progress:'0.8',robotInspector:'active'});expect(host.querySelector('[data-robot-inspect-issues]')).toBeNull();await topic('🤝 Collaborative cobots');for(const item of ITEMS)await pick(item.id);await topic('🕹 Teach-pendant challenge');expect(app.latest().tech2_rob_prog).toEqual(GOOD);expect(host.querySelector('[data-robot-inspector]').dataset).toMatchObject({move:'2',progress:'0.8',robotInspector:'active'});expect(host.querySelector('[data-robot-inspect-issues]')).toBeNull();expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('preserves sorter predict-first reveal and first-pick-final scoring after inspecting application parts',async()=>{
    const app=await mount({tech2_rob_sort:{}});for(const item of ITEMS)await pick(item.id);expect(app.latest().tech2_rob_sort).toEqual({});await topic('⚖ Robot or manual?');const card=()=>host.querySelector('[data-rob-sort-card="0"]'),choices=()=>card().querySelectorAll('[role="radio"]');expect(host.textContent).toContain('Score 0 / 0');expect(card().textContent).not.toContain('High volume, identical joints');expect([...choices()].every(n=>!n.disabled)).toBe(true);await click(choices()[1]);expect(app.latest().tech2_rob_sort).toEqual({0:'manual'});expect(host.textContent).toContain('Score 0 / 1');expect(card().textContent).toContain('High volume, identical joints');await topic('🤝 Collaborative cobots');await pick('tool');await pick('process');await topic('⚖ Robot or manual?');expect([...choices()].every(n=>n.disabled)).toBe(true);await click(choices()[0]);expect(app.latest().tech2_rob_sort).toEqual({0:'manual'});expect(host.textContent).toContain('Score 0 / 1');
  });

  it('names assessment topics without adding a safe-zone, operational controls or a model of risk or welding state',()=>{
    const section=lens(render());expect(section.querySelector('[data-rob-app-scope]').textContent).toBe('Outlines identify the selected components; application safeguarding follows the risk assessment.');expect(section.querySelector('figcaption').textContent).toBe('1 · Arm and controls. 2 · Torch. 3 · Workpiece and fixture. 4 · Welding-hazard reference: fume, hazardous light, heat.');expect(section.querySelector('[data-rob-app-assessment]').textContent).toBe(ASSESSMENT);expect(section.querySelector('input,select,canvas,animate,animateMotion,animateTransform,marker,filter')).toBeNull();expect(section.querySelectorAll('button')).toHaveLength(4);expect(section.querySelector('svg [marker-start],svg [marker-end]')).toBeNull();expect(section.querySelector('[data-safe-zone],[data-risk-score],[data-arc]')).toBeNull();expect(section.querySelector('svg').getAttribute('aria-label')).toContain('separate welding-hazard reference panel');expect([...section.querySelectorAll('[data-rob-app-source]')].map(n=>n.href)).toEqual(['https://www.osha.gov/otm/section-4-safety-hazards/chapter-4','https://www.universal-robots.com/manuals/EN/HTML/SW10_15/Content/prod-usr-man/complianceUR30/H_g5_sections/safety_g5/risk_assessment.htm']);
  });

  it('appears only in the cobots topic and ignores pseudo saved application focus',()=>{
    for(const rob_sect of ['overview','brands','program','pendant','vision','sorter','careers','invalid'])expect(lens(render({rob_sect}))).toBeNull();expect(lens(render({rob10_focus:'process',rob10_part:{bad:1}})).dataset.robApp).toBe('arm');
  });

  it.each([false,true])('provides native44px targets, complete HTML readings and explicit focus/contrast without geometry transitions, contrast=%s',async contrast=>{
    await mount({},contrast);const section=lens(),edge=contrast?'#ffff00':'#075985';expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(240, 249, 255)');for(const node of section.querySelectorAll('button,a')){expect(node.style.minHeight).toBe('44px');expect(node.tabIndex).toBe(0);node.focus();expect(document.activeElement).toBe(node);}for(const node of section.querySelectorAll('button')){expect(node.type).toBe('button');expect(node.getAttribute('aria-controls')).toBe('rob10-reading');}for(const node of section.querySelectorAll('a')){expect(node.target).toBe('_blank');expect(node.rel).toBe('noopener noreferrer');}const reading=section.querySelector('[data-rob-app-reading]');expect(reading.getAttribute('aria-live')).toBe('polite');expect(reading.getAttribute('aria-atomic')).toBe('true');expect(reading.querySelector('p').className).toContain('text-base');expect(section.querySelector('style').textContent).toContain('outline:3px solid '+edge+'!important');expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');const svg=section.querySelector('svg');expect(svg.style.width).toBe('100%');expect(svg.style.height).toBe('auto');expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('restores the complete baseline robotics function after removing only the local explorer and three authorized copy exceptions',()=>{
    const source=stripRobotReference(stripWeldlabWcagFixes(readFileSync(SRC,'utf8')));let robot=source.slice(source.indexOf('function RoboticAutomated('),source.indexOf('function InspectionCWIPrep('));
    // Strip only the later additive time ledger before the unchanged historical restoration.
    if(robot.includes('        function renderRobTimeLedger() {')){
      const ledgerHook="        var robBudgetState = useState({ view: 'sequence', move: 0 });\n",ledgerCall='            renderRobTimeLedger(),\n';
      expect(robot.split(ledgerHook)).toHaveLength(2);expect(robot.split(ledgerCall)).toHaveLength(2);
      const ledgerAt=robot.indexOf('        function renderRobTimeLedger() {'),pendantAt=robot.indexOf('        function renderPendant() {',ledgerAt);
      expect(pendantAt).toBeGreaterThan(ledgerAt);robot=robot.slice(0,ledgerAt)+robot.slice(pendantAt);robot=robot.replace(ledgerHook,'').replace(ledgerCall,'');
    }
    const helperAt=robot.indexOf('        function renderApplicationScope() {'),contentAt=robot.indexOf('        var content;',helperAt);expect(helperAt).toBeGreaterThan(0);expect(contentAt).toBeGreaterThan(helperAt);robot=robot.slice(0,helperAt)+robot.slice(contentAt);robot=robot.replace("        var robApplicationState = useState('arm');\n",'').replace('            renderApplicationScope(),\n','');
    const escape=value=>value.replaceAll("'","\\'");const correctedIntro="__alloT('stem.weldlab.rob10_cobot_intro_r2', '"+escape(NEW_INTRO)+"')",oldIntro="__alloT('stem.weldlab.collaborative_robots_cobots_are_lighte', '"+escape(ORIGINAL_INTRO)+"')";expect(robot).toContain(correctedIntro);robot=robot.replace(correctedIntro,oldIntro);const correctedTitle="__alloT('stem.weldlab.rob10_plan_title_r2', 'Plan the complete application')",oldTitle="__alloT('stem.weldlab.why_cobots_are_democratizing_automatio', '💡 Why cobots are democratizing automation')";expect(robot).toContain(correctedTitle);robot=robot.replace(correctedTitle,oldTitle);const correctedBody="__alloT('stem.weldlab.rob10_plan_body_r2', '"+NEW_CALLOUT+"')",oldBody="__alloT('stem.weldlab.traditional_welding_robots_200k_turn_k', '"+OLD_CALLOUT+"')";expect(robot).toContain(correctedBody);robot=robot.replace(correctedBody,oldBody);expect(createHash('sha256').update(robot).digest('hex')).toBe('fd3894d6d92f7916503ffd55a08ba214f8857cb1052eb6bfc1ba4c58d1096b63');
  });
});
