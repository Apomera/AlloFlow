import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');});
const part=(type,id=1)=>({type,id,value:100,closed:true,ledColor:'#ef4444'});
function diagram(mode,components,extra={}){
  const host=document.createElement('div');
  host.innerHTML=renderTool('circuit',{_circuit:{mode,components,voltage:9,pauseMotion:true,...extra}});
  return host.querySelector('svg[aria-label^="Interactive "]');
}
const xy=(x,y)=>[Number(x),Number(y)];
const pointKey=p=>p.join(',');
const line=element=>[xy(element.getAttribute('x1'),element.getAttribute('y1')),xy(element.getAttribute('x2'),element.getAttribute('y2'))];
const between=(value,a,b)=>value>=Math.min(a,b)-1e-8&&value<=Math.max(a,b)+1e-8;
const onLine=(p,[a,b])=>Math.abs((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))<1e-7&&between(p[0],a[0],b[0])&&between(p[1],a[1],b[1]);
function terminals(mode,parts){
  return parts.map((p,index)=>{
    if(mode==='series'){
      const x=80+index*Math.min(70,280/parts.length);
      const top=p.type==='led'?65:['ammeter','voltmeter'].includes(p.type)?60:p.type==='bulb'?62:55;
      const bottom=['resistor','capacitor'].includes(p.type)?100:p.type==='switch'?95:['ammeter','voltmeter'].includes(p.type)?90:p.type==='led'?85:92;
      return [[x,top],[x,bottom]];
    }
    const y=40+index*40;
    const left=p.type==='led'?(p.reversed?213:215):['ammeter','voltmeter','bulb'].includes(p.type)?210:200;
    const right=p.type==='led'?(p.reversed?225:227):['ammeter','voltmeter','bulb'].includes(p.type)?230:240;
    return [[left,y],[right,y]];
  });
}

// Derive a graph from actual drawn wires, splitting their crossings and overlaps.
// Each component is an edge between its symbol terminals. Removing that edge
// must break a series loop; keeping any one edge must close a parallel branch.
function hasDrawnPath(svg,componentEdges){
  const wires=[...svg.querySelectorAll('[data-circuit-wires] line,[data-circuit-battery-lead],[data-circuit-branch-lead]')].map(line);
  const points=wires.flat().concat(componentEdges.flat());
  for(const [a,b] of wires)for(const [c,d] of wires){
    if(a[0]===b[0]&&c[1]===d[1]){const p=[a[0],c[1]];if(onLine(p,[a,b])&&onLine(p,[c,d]))points.push(p);}
  }
  const nodes=[...new Map(points.map(p=>[pointKey(p),p])).values()],graph=new Map();
  const join=(a,b)=>{const x=pointKey(a),y=pointKey(b);if(!graph.has(x))graph.set(x,new Set());if(!graph.has(y))graph.set(y,new Set());graph.get(x).add(y);graph.get(y).add(x);};
  for(const segment of wires){
    const along=nodes.filter(p=>onLine(p,segment)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    along.slice(1).forEach((p,index)=>join(along[index],p));
  }
  componentEdges.forEach(([a,b])=>join(a,b));
  const seen=new Set(),pending=['35,40'];
  while(pending.length){const key=pending.pop();if(key==='35,100')return true;if(seen.has(key))continue;seen.add(key);pending.push(...graph.get(key)||[]);}
  return false;
}

describe('Simple schematic drawn topology',()=>{
  it.each([1,2,3,4,5,6,7,8])('draws every one of %s series parts in the only source-return path',count=>{
    const parts=Array.from({length:count},(_,i)=>part('resistor',i+1)),svg=diagram('series',parts),edges=terminals('series',parts);
    expect(hasDrawnPath(svg,edges)).toBe(true);
    edges.forEach((_,index)=>expect(hasDrawnPath(svg,edges.filter((__,i)=>i!==index))).toBe(false));
  });
  it.each([1,2,3,4,5,6,7,8])('connects all %s parallel branches to both supply rails',count=>{
    const parts=Array.from({length:count},(_,i)=>part('resistor',i+1)),svg=diagram('parallel',parts),edges=terminals('parallel',parts);
    expect(hasDrawnPath(svg,[])).toBe(false);
    edges.forEach(edge=>expect(hasDrawnPath(svg,[edge])).toBe(true));
  });
  it.each(['series','parallel'])('shows a disconnected empty %s layout',mode=>{
    expect(hasDrawnPath(diagram(mode,[]),[])).toBe(false);
  });
  it('gives eight parallel branches readable separation without shrinking the symbols',()=>{
    const svg=diagram('parallel',Array.from({length:8},(_,i)=>part('bulb',i+1)));
    expect(svg.getAttribute('viewBox')).toBe('0 0 440 390');
    const centers=[...svg.querySelectorAll('[data-circuit-schematic-part]')].map(group=>{
      const body=[...group.querySelectorAll('circle')].find(circle=>Number(circle.getAttribute('r'))===10);
      return Number(body.getAttribute('cy'));
    });
    expect(centers).toEqual([40,80,120,160,200,240,280,320]);
  });
  it('keeps the seeded bulb and switch in series, including when the switch opens',()=>{
    const parts=[part('bulb'),part('switch',2)],edges=terminals('series',parts);
    expect(hasDrawnPath(diagram('series',parts),edges)).toBe(true);
    const svg=diagram('series',[parts[0],{...parts[1],closed:false}]);
    expect(hasDrawnPath(svg,[edges[0]])).toBe(false);
    expect(svg.querySelector('[data-circuit-schematic-part="2"] [role="button"]').getAttribute('aria-pressed')).toBe('false');
  });
  it.each(['series','parallel'])('retains the same connections while showing a short in %s',mode=>{
    const parts=[part('switch')],svg=diagram(mode,parts);
    expect(hasDrawnPath(svg,terminals(mode,parts))).toBe(true);
    expect(svg.querySelector('[data-circuit-wires] line').getAttribute('stroke')).toBe('#fb7185');
  });
});

describe('Simple schematic symbol leads and motion',()=>{
  it.each(['series','parallel'])('describes small nonzero current accurately in %s',mode=>{
    const svg=diagram(mode,[{...part('resistor'),value:10000}],{voltage:0.5});
    expect(svg.getAttribute('aria-label')).toContain('current 50.0 µA');
    expect(svg.getAttribute('aria-label')).toContain('Current is flowing');
    expect(svg.getAttribute('aria-label')).not.toContain('No current is flowing');
    if(mode==='parallel')expect(svg.textContent).toContain('50.0 µA');
  });
  it('keeps parallel current labels precise enough to compare the branches',()=>{
    const svg=diagram('parallel',[{...part('resistor',1),value:200},{...part('resistor',2),value:10000}]);
    expect(svg.textContent).toContain('45.00 mA');
    expect(svg.textContent).toContain('900 µA');
  });
  it.each(['resistor','bulb','led','ammeter','voltmeter','capacitor','switch'])('connects the series %s body at its terminal positions',type=>{
    const parts=[part(type)],svg=diagram('series',parts),[top,bottom]=terminals('series',parts)[0];
    const wires=[...svg.querySelectorAll('[data-circuit-wires] line')].map(line);
    expect(wires.some(([a,b])=>pointKey(a)==='80,20'&&pointKey(b)===pointKey(top))).toBe(true);
    expect(wires.some(([a,b])=>pointKey(a)===pointKey(bottom)&&pointKey(b)==='80,140')).toBe(true);
    if(['bulb','ammeter','voltmeter'].includes(type)){
      const body=[...svg.querySelectorAll('[data-circuit-schematic-part] circle')].find(c=>Number(c.getAttribute('r'))===15);
      expect(Number(body.getAttribute('cy'))-15).toBe(top[1]);expect(Number(body.getAttribute('cy'))+15).toBe(bottom[1]);
    }
  });
  it.each(['resistor','bulb','led','ammeter','voltmeter','capacitor','switch'])('joins the parallel %s terminals to the rails',type=>{
    const parts=[part(type)],svg=diagram('parallel',parts),[left,right]=terminals('parallel',parts)[0];
    const leads=[...svg.querySelectorAll('[data-circuit-branch-lead]')].map(line);
    expect(leads).toEqual([[[180,40],left],[right,[260,40]]]);
  });
  it('keeps the reversed LED connected after its symbol rotates',()=>{
    const parts=[{...part('led'),reversed:true}],svg=diagram('parallel',parts);
    expect([...svg.querySelectorAll('[data-circuit-branch-lead]')].map(line)).toEqual([[[180,40],[213,40]],[[225,40],[260,40]]]);
  });
  it.each(['series','parallel'])('connects both capacitor plates without a wire through the dielectric in %s',mode=>{
    const svg=diagram(mode,[part('capacitor')]);
    const leads=[...svg.querySelectorAll('[data-circuit-capacitor-lead]')].map(line);
    expect(leads).toEqual(mode==='series'?[[[80,55],[80,72]],[[80,80],[80,100]]]:[[[200,40],[216,40]],[[224,40],[240,40]]]);
  });
  it('keeps series switch leads attached while the contact visibly opens',()=>{
    for(const closed of [true,false]){
      const svg=diagram('series',[{...part('switch'),closed}]);
      expect([...svg.querySelectorAll('[data-circuit-switch-lead]')].map(line)).toEqual([[[80,55],[80,68]],[[80,86],[80,95]]]);
      const arm=svg.querySelector('[data-circuit-switch-arm]');
      expect(line(arm)).toEqual(closed?[[80,68],[80,86]]:[[80,68],[90,80]]);
    }
  });
  it.each(['series','parallel'])('aligns current particles with the separate return rail in %s',mode=>{
    const svg=diagram(mode,Array.from({length:3},(_,i)=>({...part('resistor',i+1),value:mode==='series'?3:9})),{tick:0});
    const dots=[...svg.querySelectorAll('circle[fill="#06b6d4"]')];
    expect(dots.some(dot=>Number(dot.getAttribute('cy'))===170)).toBe(true);
    const arrow=svg.querySelector('[data-circuit-current-direction]');
    expect(arrow.getAttribute('points')).toBe('66,12 59,8 59,16');
    const clip=svg.querySelector('#circuit-signal-feed rect');
    expect(clip.getAttribute('x')).toBe('35');expect(clip.getAttribute('width')).toBe(mode==='series'?'45':'145');
    expect(svg.querySelector('[clip-path="url(#circuit-signal-feed)"] .circ-signal-pulse')).not.toBeNull();
  });
});
