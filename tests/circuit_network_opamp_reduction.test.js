import {beforeEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const source=readFileSync('stem_lab/stem_tool_circuit.js','utf8');
const reductionCall='var reduced=circuitNetworkLinearOpAmps(matrix,rhs,parts,index,constraints,nodeCount,amps,profiles,dynamic&&dynamic.opampCache);if(reduced)return reduced;';
if(!source.includes(reductionCall))throw new Error('The differential reference must bypass the reduction explicitly.');
// Keep the established exhaustive algorithm as an independent comparison for
// the new reduction. Its full MNA candidate search remains the runtime fallback.
const referenceWindow={};
new Function('window','document','console',source.replace(reductionCall,'').replace('var fine=algebraicLinear?full:','var fine='))(
  referenceWindow,{getElementById:()=>true},{log(){}});
const reference=referenceWindow.StemLab;
let api;
const resistor=(id,a,b='0',value=1000)=>({id,type:'resistor',a,b,value});
const amp=(id,a,positive='A',negative=a,value=100000)=>({id,type:'opamp',a,b:'0',value,control:{positive,negative}});
const followers=(input=1)=>({components:[{id:1,type:'voltage',a:'A',b:'0',value:input},...['B','C','D','E'].map((node,i)=>amp(i+2,node))]});
const close=(actual,expected)=>{
  if(expected==null)expect(actual).toBeNull();
  else expect(Math.abs(actual-expected)).toBeLessThanOrEqual(1e-9*Math.max(1,Math.abs(expected)));
};
const equivalent=(actual,expected)=>{
  expect(actual.ok,actual.message).toBe(expected.ok);
  if(!expected.ok){expect(actual.message).toBe(expected.message);return;}
  actual.rows.forEach((row,i)=>{for(const key of ['voltage','current','power','energy','controlValue'])close(row[key],expected.rows[i][key]);});
  actual.nodes.forEach((node,i)=>close(node.voltage,expected.nodes[i].voltage));
  for(const node of actual.balances)if(node.current!=null)expect(Math.abs(node.current)).toBeLessThan(1e-8);
};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});

describe('linear op-amp network reduction',()=>{
  it.each([-10,-5,-1,0,1,5,10])('preserves all four independent followers at input %s',input=>{
    const d=followers(input),actual=api.solveNetworkCircuit(d);
    equivalent(actual,reference.solveNetworkCircuit(d));
    expect(actual.opampRegionsTried).toBe(12);
    for(const row of actual.rows.slice(1))expect(row.voltage).toBeCloseTo(Math.max(-5,Math.min(5,input*100000/100001)),9);
  });
  it('checks coupled feedback, dependent source currents, floating differences and invalid constraints against exhaustive MNA',()=>{
    const cases=[
      {components:[{id:1,type:'voltage',a:'A',b:'0',value:1},amp(2,'B','A','C',2),amp(3,'C','B','0',2),resistor(4,'B'),resistor(5,'C')]},
      {components:[amp(2,'B','C','0',2),amp(3,'C','B','0',2)]},
      {components:[{id:1,type:'voltage',a:'F',b:'G',value:.1},amp(2,'B','F','G',10),amp(3,'C','B','0',2),resistor(4,'B'),resistor(5,'C')]},
      {components:[amp(2,'B','F','G'),amp(3,'C','B','0',2)]},
      {components:[{id:1,type:'voltage',a:'A',b:'0',value:10},amp(2,'B'),amp(3,'C'),{id:4,type:'voltage',a:'B',b:'0',value:8}]},
      {components:[{id:1,type:'voltage',a:'A',b:'0',value:1},amp(2,'B'),amp(3,'C','D','0',2),resistor(4,'B'),resistor(5,'D'),{id:6,type:'cccs',a:'D',b:'0',value:2,control:{source:2}}]},
      {components:[{id:1,type:'voltage',a:'A',b:'0',value:1},amp(2,'B'),amp(3,'C','B','0',2),resistor(4,'B','D'),{id:5,type:'diode',a:'D',b:'0'}]},
      {components:[{id:1,type:'voltage',a:'A',b:'0',value:0},amp(2,'B','A','B',100),{...amp(3,'C','A','C',100),opamp:{lower:0,upper:5}}]}
    ];
    for(const d of cases)equivalent(api.solveNetworkCircuit(d),reference.solveNetworkCircuit(d));
    expect(api.solveNetworkCircuit(cases[1]).message).toContain('more than one operating point');
  });
  it('preserves both solutions and diagnostics across a deterministic set of two-to-four-amplifier feedback networks',()=>{
    for(let seed=0;seed<24;seed++){
      const nodes=['B','C','D','E'].slice(0,2+seed%3),d={components:[{id:1,type:'voltage',a:'A',b:'0',value:(seed%7-3)/4}]};
      nodes.forEach((node,i)=>{const positive=i===0?'A':nodes[(i+seed)%nodes.length],negative=seed%3===0?'0':nodes[(i+1)%nodes.length];d.components.push(amp(i+2,node,positive,negative,[1,2,10,1000][(i+seed)%4]),resistor(i+8,node,'0',1000+seed*100));});
      equivalent(api.solveNetworkCircuit(d),reference.solveNetworkCircuit(d));
    }
  });
  it('retains distinguishable input equilibria even when output limits are extremely close',()=>{
    const d={components:[{...amp(1,'B','D','0',1),opamp:{lower:0,upper:1e-8}},amp(2,'C','0','C',10),{id:3,type:'vcvs',a:'D',b:'0',value:100000,control:{positive:'B',negative:'0'}}]};
    const actual=api.solveNetworkCircuit(d);equivalent(actual,reference.solveNetworkCircuit(d));
    expect(actual.ok).toBe(false);expect(actual.message).toContain('more than one operating point');
  });
  it('invalidates transfer data when reactive step sizes, switch topology or controls change',()=>{
    const d={components:[{id:1,type:'voltage',a:'A',b:'0',value:1},{...amp(2,'B'),opamp:{timing:{enabled:true,gbw:1000,slew:1,initial:0}}},amp(4,'C','B','0',2),resistor(3,'B','D'),resistor(5,'C'),{id:6,type:'capacitor',a:'B',b:'0',value:1}, {id:7,type:'switch',a:'D',b:'0',closed:false},resistor(8,'D','0',2000)]};
    const opampCache={};
    for(const dt of [.0001,.0002,.0001])for(const closed of [false,true]){
      const dynamic={time:dt,dt,states:{2:0,6:0},switchStates:{7:closed},opampCache};
      equivalent(api.solveNetworkCircuit(d,dynamic),reference.solveNetworkCircuit(d,dynamic));
    }
    d.components[2].control={positive:'A',negative:'0'};
    const dynamic={time:.0001,dt:.0001,states:{2:0,6:0},opampCache};
    equivalent(api.solveNetworkCircuit(d,dynamic),reference.solveNetworkCircuit(d,dynamic));
  });
  it('keeps every algebraic transient timestamp and switch side while eliminating duplicate end-time equations',()=>{
    const d=followers(0);d.duration=.02;d.components[0].waveform={shape:'sine',amplitude:8,frequency:100};
    d.components.push(resistor(6,'B','F'),{id:7,type:'switch',a:'F',b:'0',closed:false,switching:{enabled:true,events:[{time:.01,closed:true}]}});
    const actual=api.circuitNetworkTransient(d),expected=reference.circuitNetworkTransient(d);
    expect(actual.ok,actual.message).toBe(true);expect(actual.frames).toHaveLength(expected.frames.length);
    actual.frames.forEach((frame,i)=>{expect(frame.time).toBe(expected.frames[i].time);expect(frame.side).toBe(expected.frames[i].side);equivalent(frame,expected.frames[i]);});
  });
});
