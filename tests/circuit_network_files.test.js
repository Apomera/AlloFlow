import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const {act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let api;
const p=(id,type,a='A',b='0',value=1000,extra={})=>({id,type,a,b,value,...extra});
const base=()=>({analysis:'dc',duration:.2,integration:'backward-euler',selected:2,probeRed:'A',probeBlack:'0',components:[p(1,'voltage','A','0',5),p(2,'resistor')]});
const encode=state=>JSON.stringify(api.circuitNetworkDesignDocument(state));
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});

describe('versioned Connected design files',()=>{
  it('round-trips every supported component family and configurable model field without saving notebook or run data',()=>{
    const state={analysis:'time',duration:.125,integration:'trapezoidal',selected:10,probeRed:'G',probeBlack:'F',reflection:'private explanation',undo:[base()],frames:[{private:true}],components:[
      p(1,'voltage','A','0',-2,{waveform:{shape:'pulse',amplitude:7,frequency:31,phase:270,duty:17,edge:3}}),
      p(2,'current','0','B',-.003,{waveform:{shape:'triangle',amplitude:.021,frequency:5,phase:33,duty:61,edge:8}}),
      p(3,'resistor','A','B',321),p(4,'capacitor','B','0',.123,{initial:-3}),p(5,'inductor','B','C',765,{initial:-.03}),
      p(6,'wire','C','D',0),p(7,'switch','D','0',0,{closed:false,switching:{enabled:true,events:[{id:8,time:.02,closed:true},{id:3,time:.08,closed:false}]}}),
      p(8,'diode','C','0',0,{diode:{model:'zener',seriesResistance:4.567,breakdownVoltage:7.5,breakdownResistance:44}}),
      p(9,'bjt','D','0',0,{bjt:{polarity:'pnp',base:'E',betaForward:321,betaReverse:7,saturationCurrent:2e-13}}),
      p(10,'opamp','F','0',20000,{control:{positive:'E',negative:'F'},opamp:{lower:-3,upper:8,timing:{enabled:true,gbw:23000,slew:.025,initial:-2}}}),
      p(11,'vcvs','E','0',-3,{control:{positive:'A',negative:'B'}}),p(12,'vccs','0','E',-.02,{control:{positive:'B',negative:'C'}}),
      p(13,'cccs','0','G',4,{control:{source:1}}),p(14,'ccvs','G','0',-234,{control:{source:10}}),
      p(15,'diode','E','0',0,{diode:{model:'schottky',seriesResistance:1.234}}),p(16,'diode','F','0',0,{diode:{model:'silicon'}})
    ]};
    const saved=encode(state),read=api.parseCircuitNetworkDesign(saved);
    expect(api.circuitNetworkDesign(read)).toEqual(api.circuitNetworkDesign(state));
    expect(read).toMatchObject({analysis:'time',duration:.125,integration:'trapezoidal',selected:10,probeRed:'G',probeBlack:'F'});
    expect(saved).not.toMatch(/private explanation|frames|undo|reflection/);
    expect(JSON.parse(saved).version).toBe(1);
  });
  it('preserves RC behavior and disabled op-amp timing settings',()=>{
    const state={...base(),analysis:'time',components:[...base().components.slice(0,1),p(2,'resistor','A','B',1000),p(3,'capacitor','B','0',100,{initial:0}),p(4,'opamp','C','0',1000,{control:{positive:'B',negative:'C'},opamp:{timing:{enabled:false,gbw:123,slew:.02,initial:3}}})]};
    const read=api.parseCircuitNetworkDesign(encode(state));
    const before=api.circuitNetworkTransient(state),after=api.circuitNetworkTransient(read);
    expect(after.ok,after.message).toBe(true);expect(after.frames.length).toBe(before.frames.length);
    after.frames.forEach((frame,i)=>expect(frame.rows.map(r=>[r.voltage,r.current])).toEqual(before.frames[i].rows.map(r=>[r.voltage,r.current])));
    expect(read.components[3].opamp.timing).toMatchObject({enabled:false,gbw:123,slew:.02,initial:3});
  });
  it('allows empty, floating, inconsistent and incomplete but structurally valid designs',()=>{
    for(const components of [[],[p(1,'resistor','F','G')],[p(1,'voltage','A','0',5),p(2,'wire','A','0',0)],[p(1,'opamp','B','0',1000,{control:{positive:'F',negative:'G'}})]]){
      const read=api.parseCircuitNetworkDesign(encode({...base(),components}));expect(api.circuitNetworkDesign(read)).toEqual(api.circuitNetworkDesign({components}));
    }
  });
  it.each([
    doc=>{doc.version=2;},doc=>{doc.version='1';},doc=>{doc.format='circuit-design-v1';},doc=>{doc.notebook={};},
    doc=>{doc.design.duration=0;},doc=>{doc.design.integration='rk4';},doc=>{doc.design.analysis='ac';},doc=>{doc.design.extra=true;},
    doc=>{doc.design.components[1].id=1;},doc=>{doc.design.components[1].id=1.5;},doc=>{doc.design.components[1].a='H';},doc=>{doc.design.components[1].type='script';},
    doc=>{doc.design.components[1].value='1000';},doc=>{doc.design.components[1].value=0;},doc=>{doc.design.components[1].value=Infinity;},doc=>{doc.design.components[1].waveform={};},
    doc=>{doc.design.components[0].waveform.edge=30;},doc=>{doc.design.components[0].waveform.shape='square';},doc=>{delete doc.design.components[0].waveform.frequency;},
    doc=>{doc.design.components.push(p(3,'cccs','C','0',2,{control:{source:99}}));},doc=>{doc.design.components.push(p(3,'ccvs','C','0',2,{control:{source:2}}));},
    doc=>{doc.design.components=Array.from({length:17},(_,i)=>p(i+1,'resistor'));},
    doc=>{doc.view=null;},doc=>{doc.view.selected=90;},doc=>{doc.view.probeRed='unknown';},doc=>{doc.view.time=1;}
  ])('rejects invalid structure or values before any normalization %#',mutate=>{
    const doc=JSON.parse(encode(base()));mutate(doc);expect(()=>api.parseCircuitNetworkDesign(JSON.stringify(doc))).toThrow();
  });
  it('rejects invalid nested transistor, diode, switch, and amplifier parameters',()=>{
    const cases=[
      p(3,'bjt','B','0',0,{bjt:{polarity:'pnp',base:'H',betaForward:100,betaReverse:1,saturationCurrent:1e-14}}),
      p(3,'diode','B','0',0,{diode:{model:'silicon',seriesResistance:.0001}}),
      p(3,'diode','B','0',0,{diode:{model:'silicon',seriesResistance:0,saturationCurrent:1e-6}}),
      p(3,'switch','B','0',0,{closed:false,switching:{enabled:true,events:[{id:1,time:.1,closed:true},{id:1,time:.2,closed:false}]}}),
      p(3,'switch','B','0',0,{closed:'false',switching:{enabled:false,events:[]}}),
      p(3,'opamp','B','0',100,{control:{positive:'A',negative:'0'},opamp:{lower:5,upper:-5}}),
      p(3,'opamp','B','0',100,{control:{positive:'A',negative:'0'},opamp:{lower:-5,upper:5,timing:{enabled:true,gbw:1,slew:1,initial:0}}})
    ];
    for(const part of cases){const doc=JSON.parse(encode(base()));doc.design.components.push(part);expect(()=>api.parseCircuitNetworkDesign(JSON.stringify(doc))).toThrow();}
  });
  it('rejects oversized content, arbitrary keys, malformed JSON, and excess amplifier count',()=>{
    for(const text of ['null','{',' '.repeat(65537),'',encode(base()).replace('"version":1','"__proto__":{},"version":1')])expect(()=>api.parseCircuitNetworkDesign(text)).toThrow();
    expect(()=>encode({...base(),components:Array.from({length:5},(_,i)=>p(i+1,'opamp','B','0',100,{control:{positive:'A',negative:'0'}}))})).toThrow(/four op-amps/);
  });
});

describe('Connected file preview and undo workflow',()=>{
  let host,root,config,latest;
  beforeEach(()=>{
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:0})},{get:(obj,key)=>obj[key]||(()=>{})}));
    config=window.StemLab._registry.circuit;host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
  });
  afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
  async function mount(extra={}){
    function Harness(){const [toolData,setToolData]=React.useState({_circuit:{networkWorkbench:true,pauseMotion:true},_circuitNetwork:{...base(),view:'flat',reflection:'Keep this explanation',time:.12,timeSide:'before',boardReference:{key:'old'},...extra},_circuitMixed:{prediction:'Keep another study'}});latest=toolData;return config.render(makeCtx({toolData,setToolData}));}
    await act(async()=>root.render(React.createElement(Harness)));
  }
  const input=()=>host.querySelector('.circuit-network-root input[type=file]');
  const preview=()=>host.querySelector('[aria-label="Connected design preview"]');
  const button=name=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===name);
  async function select(file){await act(async()=>{Object.defineProperty(input(),'files',{configurable:true,value:file?[file]:[]});input().dispatchEvent(new Event('change',{bubbles:true}));});}
  const file=state=>({size:encode(state).length,text:()=>Promise.resolve(encode(state))});
  async function click(name){await act(async()=>button(name).click());}

  it('previews without mutation, loads one complete edit, and undoes/redoes analysis and probes while preserving notes',async()=>{
    await mount({loadedExample:'bridge',scopeSource:1});const before=latest;
    const imported={analysis:'time',duration:.02,integration:'trapezoidal',selected:11,probeRed:'F',probeBlack:'G',components:[p(11,'resistor','F','G',2000)]};
    await select(file(imported));expect(preview()).not.toBeNull();expect(latest).toBe(before);
    await click('Load design');expect(preview()).toBeNull();expect(document.activeElement).toBe(input());
    expect(latest._circuitNetwork).toMatchObject({...imported,time:0,timeSide:null,boardReference:null,scopeSource:0,reflection:'Keep this explanation',loadedExample:'custom-design'});
    expect(latest._circuitNetwork.undo).toHaveLength(1);expect(latest._circuitMixed).toBe(before._circuitMixed);
    await click('Undo network edit');
    for(const key of ['analysis','duration','integration','selected','probeRed','probeBlack','loadedExample','scopeSource'])expect(latest._circuitNetwork[key]).toEqual(before._circuitNetwork[key]);
    expect(api.circuitNetworkDesign(latest._circuitNetwork)).toEqual(api.circuitNetworkDesign(before._circuitNetwork));
    await click('Redo network edit');expect(latest._circuitNetwork).toMatchObject({analysis:'time',duration:.02,integration:'trapezoidal',selected:11,probeRed:'F',probeBlack:'G'});
  });
  it('loads changed analysis settings as one undoable edit even when the netlist is identical',async()=>{
    await mount();const imported={...base(),analysis:'time',duration:.75,integration:'trapezoidal',probeRed:'0',probeBlack:'A'};
    await select(file(imported));await click('Load design');expect(latest._circuitNetwork.undo).toHaveLength(1);await click('Undo network edit');expect(latest._circuitNetwork).toMatchObject({analysis:'dc',duration:.2,integration:'backward-euler',probeRed:'A',probeBlack:'0'});
  });
  it('ignores a slow earlier read after a second file is previewed, and cancels pending reads',async()=>{
    await mount();const before=latest;let finish;
    await select({size:50,text:()=>new Promise(resolve=>{finish=resolve;})});
    await select(file({...base(),components:[p(25,'resistor','C','0',220)]}));
    await act(async()=>finish(encode(base())));expect(preview().textContent).toContain('R25');expect(latest).toBe(before);
    await click('Cancel import');expect(preview()).toBeNull();expect(document.activeElement).toBe(input());
    await select({size:50,text:()=>new Promise(resolve=>{finish=resolve;})});await click('Cancel import');
    await act(async()=>finish(encode(base())));expect(preview()).toBeNull();expect(latest).toBe(before);
  });
  it('clears an earlier preview on invalid input and rejects oversized files before reading',async()=>{
    await mount();const before=latest;await select(file(base()));expect(preview()).not.toBeNull();
    await select({size:20,text:()=>Promise.resolve('{"version":2}')});expect(preview()).toBeNull();expect(host.querySelector('.circuit-file-tools [role=alert]')).not.toBeNull();expect(latest).toBe(before);
    const read=vi.fn();await select({size:65537,text:read});expect(read).not.toHaveBeenCalled();expect(latest).toBe(before);
  });
  it('reports read rejection and ignores completion after the workbench unmounts',async()=>{
    await mount();await select({size:20,text:()=>Promise.reject(new Error('disk'))});expect(host.querySelector('.circuit-file-tools [role=alert]').textContent).toContain('could not be read');
    let finish;await select({size:20,text:()=>new Promise(resolve=>{finish=resolve;})});await act(async()=>root.render(null));await act(async()=>finish(encode(base())));expect(host.textContent).toBe('');
  });
  it('keeps narrow pulses from the live duty control within the portable edge bounds',async()=>{
    await mount({selected:1,components:[p(1,'voltage','A','0',0,{waveform:{shape:'pulse',amplitude:5,frequency:10,duty:50,edge:2}}),p(2,'resistor')]});
    const duty=host.querySelector('input[aria-label="Pulse width (% of period) exact value"]');expect(duty).not.toBeNull();
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(duty,'1');duty.dispatchEvent(new Event('input',{bubbles:true}));});
    await act(async()=>duty.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    expect(latest._circuitNetwork.components[0].waveform).toMatchObject({duty:1,edge:.5});
    expect(api.parseCircuitNetworkDesign(encode(latest._circuitNetwork)).components[0].waveform).toMatchObject({duty:1,edge:.5});
  });
});
