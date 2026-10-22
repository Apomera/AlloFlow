import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view:'robotic', rob_sect:'program' };
// Durable source-record expectations; the suite does not require a temporary baseline file.
const RECORDS = [
  {
    "id": "pendant",
    "method": "1. Teach pendant (point-by-point)",
    "desc": "Operator moves robot manually with joystick on teach pendant, recording waypoints. At each waypoint, they specify: position, weld start/stop, weld parameters (V, A, TS), motion type (joint vs linear). Most common for small batch + simpler parts.",
    "pro": "Intuitive for welders to learn",
    "con": "Slow for complex parts; requires robot to be available for programming time"
  },
  {
    "id": "offline",
    "method": "2. Offline programming (CAD-based)",
    "desc": "Using software like FANUC Roboguide, ABB RobotStudio, etc., programmer creates the weld path on a virtual model of the robot + part. Tested in simulation. Code uploaded to robot when ready.",
    "pro": "Programming happens in parallel with production; no robot downtime",
    "con": "Requires CAD model of part + accurate fixture; works only as well as the CAD"
  },
  {
    "id": "sensors",
    "method": "3. Path teach via vision/sensor",
    "desc": "Robot uses sensors (laser scanners, vision systems, touch probes) to find joint location + characteristics, then welds adaptively. Operator sets parameters but robot figures out path.",
    "pro": "Handles fit-up variation; doesn't need precise fixturing",
    "con": "Expensive (vision systems add $20-50K to cell); requires sensor calibration"
  }
];
const PRACTICAL = "Most production welding cells use a combination: offline programming for the bulk of the path + teach pendant fine-tuning at the actual robot + optional vision for parts with known fit-up variation. Welder/programmer/technician roles often combine all three skills.";
const IDS = ['pendant','offline','sensors'];
const GOOD = [{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true},{x:12,y:1,m:'J',w:false},{x:1,y:1,m:'J',w:false}];
let root,host;
const map = (node=host)=>node.querySelector('[data-robot-program-routes]');
const pick = id=>host.querySelector('[data-robot-program-route-pick="'+id+'"]');
const textButton = text=>[...host.querySelectorAll('button')].find(button=>button.textContent.trim()===text);
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();vi.restoreAllMocks();});
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function change(node,value){expect(node).toBeTruthy();await React.act(()=>Simulate.change(node,{target:{value:String(value)}}));}
async function topic(text){await click(textButton(text));}

describe('Robot programming information routes',()=>{
  it('preserves all three original records, practical paragraph and pendant cross-link',()=>{
    const node=render(),section=map(node);expect(section.dataset.robotProgramRoutes).toBe('pendant');
    expect([...section.querySelectorAll('[data-robot-program-route-reference]')].map(node=>({id:node.dataset.robotProgramRouteReference,method:node.querySelector('[data-robot-program-route-reference-method]').textContent,desc:node.querySelector('[data-robot-program-route-reference-desc]').textContent,pro:node.querySelector('[data-robot-program-route-reference-pro]').textContent,con:node.querySelector('[data-robot-program-route-reference-con]').textContent}))).toEqual(RECORDS);
    expect(node.textContent).toContain(PRACTICAL);expect(node.textContent).toContain('There are three main approaches, often combined:');expect(node.textContent).toContain('Try method 1 yourself: the teach-pendant challenge →');
    expect(section.querySelector('[data-robot-program-route-target-label]').textContent).toBe('Shared context: robot controller and program');expect(section.querySelector('svg').getAttribute('aria-label')).toContain('shared robot controller and program context');expect(section.querySelector('figcaption').textContent).toContain('information to the robot controller and program context');
    expect(section.querySelector('figure').nextElementSibling.dataset.robotProgramRouteReading).toBe('pendant');expect(section.querySelector('[data-robot-program-route-references] summary').textContent).toBe('Read all three original method notes');
  });

  it('maps all three native selections to exact descriptions and tradeoffs, their lane, and one shared target',async()=>{
    await mount();for(const record of RECORDS){await click(pick(record.id));const section=map(),reading=section.querySelector('[data-robot-program-route-reading]'),focus=section.querySelector('[data-robot-program-route-focus]');
      expect(section.dataset.robotProgramRoutes).toBe(record.id);expect(reading.dataset.robotProgramRouteReading).toBe(record.id);expect(reading.querySelector('h5').textContent).toBe(record.method);
      for(const field of ['desc','pro','con'])expect(reading.querySelector('[data-robot-program-route-'+field+']').textContent).toBe(record[field]);
      expect(focus.dataset.robotProgramRouteFocus).toBe(record.id);expect(focus.dataset.target).toBe('program');expect(section.querySelectorAll('[data-robot-program-route-target="program"]')).toHaveLength(1);
      const lane=section.querySelector('[data-robot-program-route-lane="'+record.id+'"]');expect(Number(focus.querySelector('rect').getAttribute('y'))+43).toBe(Number(lane.dataset.y));
      expect(section.querySelectorAll('[data-robot-program-route-pick][aria-pressed="true"]')).toHaveLength(1);expect(section.querySelector('[data-robot-program-route-label][data-highlighted="true"]').dataset.robotProgramRouteLabel).toBe(record.id);
      expect(section.querySelector('svg').getAttribute('aria-label')).toContain(record.method);
    }
  });

  it('keeps every node, connector, lane and shared program fixed across inspection',async()=>{
    await mount();const base=map().querySelector('[data-robot-program-route-base]').outerHTML;expect([...map().querySelectorAll('[data-robot-program-route-lane]')].map(node=>[node.dataset.robotProgramRouteLane,node.dataset.y])).toEqual([['pendant','60'],['offline','160'],['sensors','260']]);
    for(const id of IDS){await click(pick(id));expect(map().querySelector('[data-robot-program-route-base]').outerHTML).toBe(base);}
    const svg=map().querySelector('[data-robot-program-route-map]');expect(svg.querySelector('[data-robot-program-route-controller] rect').getAttribute('width')).toBe('65');expect(svg.querySelectorAll('[data-robot-program-route-controller] circle')).toHaveLength(3);expect(svg.getAttribute('viewBox')).toBe('0 0 720 320');expect(svg.querySelectorAll('text')).toHaveLength(3);expect(map().querySelectorAll('input,select,canvas,animate,animateTransform')).toHaveLength(0);expect(map().querySelectorAll('button')).toHaveLength(3);
    expect(map().textContent).toContain('relationships, not robot motion, timing or a sequence to operate the cell');expect(map().textContent).toContain('do not replace the operator’s programming decisions');expect(map().textContent).toContain('does not predict fit-up capability, precision, downtime or cost');
  });

  it('keeps inspection local without writing a program, arc state, grade, sensing value or other saved settings',async()=>{
    const extra={tech2_rob_prog:GOOD,tech2_rob_mode:'L',tech2_rob_arc:true,tech2_rob_shift:true,tech2_rob_track:true,tech2_rob_sort:{1:'manual'},rob4_job:4,rob4_lens:'fit',pipe2_stack:['root','hot']};const app=await mount(extra),snapshot=JSON.stringify(app.latest());
    for(const id of IDS)await click(pick(id));expect(JSON.stringify(app.latest())).toBe(snapshot);expect(app.writes).toHaveLength(0);
    await topic('👁 Vision + adaptive control');expect(map()).toBeNull();await change(host.querySelector('[data-robot-sensing-position]'),83);await click(host.querySelector('[data-robot-sensing-method="touch"]'));
    await topic('⌨ Programming');expect(map().dataset.robotProgramRoutes).toBe('sensors');await click(pick('offline'));await topic('👁 Vision + adaptive control');expect(host.querySelector('[data-robot-sensing]').dataset.position).toBe('83');expect(host.querySelector('[data-robot-sensing]').dataset.robotSensing).toBe('touch');expect(app.latest()).toMatchObject(extra);
  });

  it('preserves the paused pendant inspector and does not turn a programming lens into a run',async()=>{
    const app=await mount({rob_sect:'pendant',tech2_rob_prog:GOOD});await change(host.querySelector('[data-robot-inspect-select]'),1);await change(host.querySelector('[data-robot-inspect-progress]'),80);
    expect(host.querySelector('[data-robot-inspector]').dataset).toMatchObject({move:'2',progress:'0.8'});await topic('⌨ Programming');await click(pick('sensors'));await click(pick('offline'));await topic('🕹 Teach-pendant challenge');
    expect(app.latest().tech2_rob_prog).toEqual(GOOD);expect(host.querySelector('[data-robot-inspector]').dataset).toMatchObject({move:'2',progress:'0.8',robotInspector:'active'});expect(host.querySelector('[data-robot-inspect-issues]')).toBeNull();
  });

  it('preserves the original pendant button navigation without teaching or replacing points',async()=>{
    const app=await mount({tech2_rob_prog:GOOD});await click(pick('offline'));await topic('Try method 1 yourself: the teach-pendant challenge →');expect(app.latest().rob_sect).toBe('pendant');expect(app.latest().tech2_rob_prog).toEqual(GOOD);expect(map()).toBeNull();
  });

  it('preserves sorter reveal and first-pick-final scoring before and after route inspection',async()=>{
    const app=await mount({tech2_rob_sort:{}});await topic('⚖ Robot or manual?');const card=()=>host.querySelector('[data-rob-sort-card="0"]'),choices=()=>card().querySelectorAll('[role="radio"]');
    expect(host.textContent).toContain('Score 0 / 0');expect(card().textContent).not.toContain('High volume, identical joints');expect([...choices()].every(button=>!button.disabled)).toBe(true);
    await click(choices()[1]);expect(app.latest().tech2_rob_sort).toEqual({0:'manual'});expect(host.textContent).toContain('Score 0 / 1');expect(card().textContent).toContain('High volume, identical joints');
    await topic('⌨ Programming');await click(pick('pendant'));await click(pick('sensors'));await topic('⚖ Robot or manual?');expect([...choices()].every(button=>button.disabled)).toBe(true);await click(choices()[0]);expect(app.latest().tech2_rob_sort).toEqual({0:'manual'});expect(host.textContent).toContain('Score 0 / 1');
  });

  it('renders only in the programming topic and remains fixed for malformed saved robot data',()=>{
    for(const section of ['overview','brands','pendant','vision','cobots','sorter','careers','invalid'])expect(map(render({rob_sect:section}))).toBeNull();
    const section=map(render({tech2_rob_prog:[null,{},'bad'],tech2_rob_arc:{on:1},tech2_rob_sort:[1],rob4_job:Infinity}));expect(section.dataset.robotProgramRoutes).toBe('pendant');expect(section.querySelectorAll('[data-robot-program-route-lane]')).toHaveLength(3);expect(section.outerHTML).not.toContain('NaN');expect(section.outerHTML).not.toContain('[object Object]');
  });

  it('links to the exact three manufacturer resources without treating sources as operational controls',()=>{
    const section=map(render()),links=[...section.querySelectorAll('[data-robot-program-route-source]')];expect(links.map(link=>link.getAttribute('href'))).toEqual(['https://www.abb.com/global/en/areas/robotics/products/software/robotstudio-suite/robotstudio-desktop','https://new.abb.com/service/abb-university/united-states/robotics/course-descriptions','https://library.e.abb.com/public/3f0fc74aaade46db9e9fdf7f02366c92/3HAC095098%20AM%20Tracking%20with%20optical%20sensors-en.pdf']);links.forEach(link=>{expect(link.target).toBe('_blank');expect(link.rel).toBe('noopener noreferrer');});
  });

  it.each([false,true])('provides native44px controls, HTML readings, strong focus and explicit contrast (contrast=%s)',async contrast=>{
    await mount({},contrast);const section=map(),edge=contrast?'#ffff00':'#1e40af';expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(239, 246, 255)');
    for(const button of section.querySelectorAll('button')){expect(button.type).toBe('button');expect(button.style.minHeight).toBe('44px');expect(button.tabIndex).toBe(0);expect(button.getAttribute('aria-controls')).toBe('prog6-reading');button.focus();expect(document.activeElement).toBe(button);}
    expect(section.querySelector('[data-robot-program-route-reading]').getAttribute('aria-live')).toBe('polite');for(const field of ['desc','pro','con'])expect(section.querySelector('[data-robot-program-route-'+field+']').className).toContain('text-base');
    expect(section.querySelectorAll('[data-robot-program-route-label]')).toHaveLength(3);expect(section.querySelector('[data-robot-program-route-target-label]').tagName).toBe('P');expect(section.querySelector('summary').style.minHeight).toBe('44px');
    expect(section.querySelector('style').textContent).toContain('outline:3px solid '+edge+'!important');expect(section.querySelector('style').textContent).toContain('transition-property:none!important;animation:none!important');expect(section.querySelector('svg').style.width).toBe('100%');
  });
});
