import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, frame, commands, renderer, wallTime, errors, updateData;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});
const pwm = () => api.WAYPOINTS.find(wp => wp.code === 'PWM');
const runway = () => api.getFlightRunway(pwm());
const heightForAngle = (angle, distanceFt) => Math.tan(angle * Math.PI / 180) * distanceFt;
function pose(model, end = model.ends[0], distance = 6076.12, cross = 0, angle = 3) {
  const location = api.getFlightRunwayPosition(model, cross, end.thresholdAlongFt - end.sign * distance,
    5 + heightForAngle(angle, distance + 1000));
  return { ...location, heading: end.headingDeg, onGround: false, fieldElev: model.airport.alt, speed: 140, vsi: -5 };
}
const corners = model => [
  { crossFt: -model.widthFt / 2, alongFt: -model.lengthFt / 2, heightFt: 2 },
  { crossFt: model.widthFt / 2, alongFt: -model.lengthFt / 2, heightFt: 2 },
  { crossFt: model.widthFt / 2, alongFt: model.lengthFt / 2, heightFt: 2 },
  { crossFt: -model.widthFt / 2, alongFt: model.lengthFt / 2, heightFt: 2 },
];

describe('SkySchool procedural training runway model', () => {
  it('keeps the existing deterministic airport axis and two reciprocal ends', () => {
    const model = runway();
    expect(model).toMatchObject({ headingDeg: 30, lengthFt: 8000, widthFt: 150 });
    expect(model.ends.map(end => [end.headingDeg, end.designator, end.thresholdAlongFt, end.papiAlongFt]))
      .toEqual([[30, '03', -4000, -3000], [210, '21', 4000, 3000]]);
    for (const airport of api.WAYPOINTS) {
      const rw = api.getFlightRunway(airport);
      expect(rw.ends[0].headingDeg).toBeGreaterThanOrEqual(0); expect(rw.ends[0].headingDeg).toBeLessThan(180);
      expect((rw.ends[1].headingDeg - rw.ends[0].headingDeg + 360) % 360).toBe(180);
      expect(Number(rw.ends[0].designator)).toBeGreaterThanOrEqual(1);
      expect(Number(rw.ends[1].designator)).toBeLessThanOrEqual(36);
    }
  });
  it.each([0, 43, 75, -75])('round-trips runway positions at latitude %s', lat => {
    const model = api.getFlightRunway({ ...pwm(), lat, lon: 179.999 });
    const location = api.getFlightRunwayPosition(model, 65, -4200, 300);
    const approach = api.getFlightRunwayApproach({ ...location, heading: model.headingDeg }, model.airport);
    expect(approach.alongFt).toBeCloseTo(-4200, 6); expect(approach.crossFt).toBeCloseTo(65, 6);
    expect(location.altitude).toBe(model.airport.alt + 300);
    expect(location.lon).toBeGreaterThanOrEqual(-180); expect(location.lon).toBeLessThan(180);
  });
  it('keeps length and width in feet independently of the airport elevation', () => {
    const model = runway();
    const a = api.getFlightRunwayPoint(model, -75, -4000, 2), b = api.getFlightRunwayPoint(model, 75, -4000, 2);
    const c = api.getFlightRunwayPoint(model, -75, 4000, 2);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(150, 10);
    expect(Math.hypot(a.x - c.x, a.z - c.z)).toBeCloseTo(8000, 10);
    expect(a.y).toBe(pwm().alt + 2);
    expect(model.forward.x * model.right.x + model.forward.z * model.right.z).toBeCloseTo(0, 12);
  });
  it('selects only existing ends into the wind without changing the runway axis', () => {
    const model = runway(), saved = JSON.stringify(model);
    for (const wind of [0, -1, NaN, undefined]) expect(api.selectFlightRunwayEnd(model, { wind, windDir: 210 })).toBe(model.ends[0]);
    expect(api.selectFlightRunwayEnd(model, { wind: 12, windDir: 30 })).toBe(model.ends[0]);
    expect(api.selectFlightRunwayEnd(model, { wind: 12, windDir: 210 })).toBe(model.ends[1]);
    expect(api.selectFlightRunwayEnd(model, { wind: 12, windDir: 120 })).toBe(model.ends[0]);
    expect(api.selectFlightRunwayEnd(model, { wind: 12, windDir: -150 })).toBe(model.ends[1]);
    expect(JSON.stringify(model)).toBe(saved);
  });
  it('gives a north-facing strip designator36 instead of00', () => {
    const airport = api.WAYPOINTS.find(wp => api.getFlightRunway(wp).headingDeg === 0);
    expect(airport).toBeTruthy(); expect(api.getFlightRunway(airport).ends.map(end => end.designator)).toEqual(['36', '18']);
  });
  it('rejects missing or invalid geometry inputs', () => {
    expect(api.getFlightRunway(null)).toBeNull(); expect(api.getFlightRunway({ lat: 0, lon: 0, alt: NaN })).toBeNull();
    expect(api.selectFlightRunwayEnd(null, {})).toBeNull(); expect(api.getFlightRunwayPoint(runway(), Infinity, 0)).toBeNull();
    expect(api.getFlightRunwayPosition(null, 0, 0)).toBeNull(); expect(api.getFlightRunwayApproach({ ...pose(runway()), heading: NaN }, pwm())).toBeNull();
  });
});

describe('SkySchool modeled PAPI approach geometry', () => {
  it.each([0, 1])('uses the physical PAPI station on reciprocal end %i', index => {
    const model = runway(), end = model.ends[index], state = pose(model, end, 1.5 * 6076.12);
    const approach = api.getFlightRunwayApproach(state, model.airport);
    expect(approach.end.sign).toBe(end.sign); expect(approach.available).toBe(true);
    expect(approach.distanceFt).toBeCloseTo(1.5 * 6076.12, 6);
    expect(approach.papiDistanceFt).toBeCloseTo(1.5 * 6076.12 + 1000, 6);
    expect(approach.papi.angleDeg).toBeCloseTo(3, 8); expect(approach.papi.redCount).toBe(2);
    expect(approach.courseDeviationDeg).toBeCloseTo(0, 8); expect(approach.headingErrorDeg).toBe(0);
  });
  it('retains the beam for a small lateral displacement just after the threshold', () => {
    const model = runway(), state = pose(model, model.ends[0], -400, 5);
    const approach = api.getFlightRunwayApproach(state, model.airport);
    expect(approach.available).toBe(true); expect(approach.courseDeviationDeg).toBeCloseTo(-Math.atan2(5,600)*180/Math.PI, 8);
  });
  it('hides PAPI beyond its conservative distance and lateral beam sector', () => {
    const model = runway(), end = model.ends[0];
    expect(api.getFlightRunwayApproach(pose(model,end,3.4*6076.12-1),pwm()).available).toBe(true);
    expect(api.getFlightRunwayApproach(pose(model,end,3.4*6076.12+1),pwm()).available).toBe(false);
    const distance = 6076.12, offset = Math.tan(10.1*Math.PI/180)*(distance+1000);
    expect(api.getFlightRunwayApproach(pose(model,end,distance,offset),pwm()).available).toBe(false);
  });
  it('hides beams behind the aircraft and after passing the PAPI station', () => {
    const model = runway(), state = pose(model);
    expect(api.getFlightRunwayApproach({ ...state, heading: state.heading+180 },pwm()).available).toBe(false);
    expect(api.getFlightRunwayApproach(pose(model,model.ends[0],-1100),pwm()).available).toBe(false);
    expect(api.getFlightRunwayApproach({ ...state, heading: state.heading+90 },pwm()).available).toBe(false);
  });
  it('uses the correct centerline correction sign on both ends', () => {
    const model = runway();
    for (const end of model.ends) {
      const rightOfTrack = pose(model,end,6076.12,end.sign*100);
      expect(api.getFlightRunwayApproach(rightOfTrack,pwm()).courseDeviationDeg).toBeLessThan(0);
    }
  });
});

describe('SkySchool finite camera runway projection', () => {
  it.each([0, 1])('matches independent Three projection of fixed world vertices for end%i', index => {
    const model = runway(), state = pose(model,model.ends[index]), view = api.getFlightViewBasis(state.heading, -3, 20);
    view.originLat = state.lat; view.offset = { x: 7, y: 6, z: -4 };
    const camera = new Three.PerspectiveCamera(60,1280/720,10,300000);
    camera.position.set(view.offset.x,state.altitude+view.offset.y,view.offset.z);
    camera.quaternion.setFromEuler(new Three.Euler(-3*Math.PI/180,-state.heading*Math.PI/180,-20*Math.PI/180,'YXZ')); camera.updateMatrixWorld(true);
    const longitude = ((model.airport.lon-state.lon)%360+540)%360-180;
    const centre = new Three.Vector3(longitude*364800*Math.cos(state.lat*Math.PI/180),0,-(model.airport.lat-state.lat)*364800);
    for (const corner of corners(model)) {
      const local = api.getFlightRunwayPoint(model,corner.crossFt,corner.alongFt,corner.heightFt);
      const expected = new Three.Vector3(local.x,local.y,local.z).add(centre).project(camera);
      const actual = api.projectFlightRunwayPoint(state,model,corner,view,1280,720);
      expect(actual.x).toBeCloseTo((expected.x+1)*640,7); expect(actual.y).toBeCloseTo((1-expected.y)*360,7);
    }
  });
  it.each([[320,763],[1280,720]])('near-clips the grounded strip inside a %i×%i viewport', (width,height) => {
    const model = runway(), position = api.getFlightRunwayPosition(model,0,-3850);
    const state = { ...position,heading:model.headingDeg }, view = api.getFlightViewBasis(state.heading,0,0);
    view.offset = { x: 0,y: 6,z: 0 };
    const polygon = api.projectFlightRunwayPolygon(state,model,corners(model),view,width,height);
    expect(polygon.length).toBeGreaterThanOrEqual(3);
    expect(polygon.some(point=>point.y>height/2)).toBe(true);
    for (const point of polygon) { expect(Number.isFinite(point.x)&&Number.isFinite(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(-1e-7); expect(point.x).toBeLessThanOrEqual(width+1e-7);
      expect(point.y).toBeGreaterThanOrEqual(-1e-7); expect(point.y).toBeLessThanOrEqual(height+1e-7); }
  });
  it('uses the original focal length when painting a padded banked Canvas', () => {
    const model = runway(), state = pose(model), point = corners(model)[0], view = api.getFlightViewBasis(state.heading,-3,0);
    view.offset = { x:0,y:6,z:0 }; view.focalLength = 720/(2*Math.tan(Math.PI/6));
    const normal = api.projectFlightRunwayPoint(state,model,point,view,1280,720);
    const padded = api.projectFlightRunwayPoint(state,model,point,view,1600,1200);
    expect(padded.x-normal.x).toBeCloseTo(160,9); expect(padded.y-normal.y).toBeCloseTo(240,9);
  });
  it('does not pull a runway behind the camera back into view', () => {
    const model = runway(), state = pose(model); state.heading = (state.heading+180)%360;
    const view = api.getFlightViewBasis(state.heading,0,0); view.offset = { x:0,y:6,z:0 };
    expect(api.projectFlightRunwayPolygon(state,model,corners(model),view,320,763)).toEqual([]);
    expect(api.projectFlightRunwayPoint(state,model,corners(model)[0],view,320,763)).toBeNull();
  });
  it.each([[Infinity,763],[320,Infinity],[NaN,763],[320,NaN],[0,763],[320,-1]])('rejects invalid viewport %s×%s', (width,height) => {
    const model = runway(), state = pose(model), view = api.getFlightViewBasis(state.heading,0,0);
    expect(api.projectFlightRunwayPoint(state,model,corners(model)[0],view,width,height)).toBeNull();
    expect(api.projectFlightRunwayPolygon(state,model,corners(model),view,width,height)).toEqual([]);
  });
  it('rejects missing camera axes and malformed vertices without drawing a path', () => {
    const model = runway(), state = pose(model), view = api.getFlightViewBasis(state.heading,0,0);
    expect(api.projectFlightRunwayPolygon(state,model,corners(model),{},320,763)).toEqual([]);
    expect(api.projectFlightRunwayPoint(state,model,{ crossFt:NaN,alongFt:0 },view,320,763)).toBeNull();
  });
});

async function mountFlight(webgl = false, details = false, width = 320, height = 763) {
  commands = []; wallTime = 1000; frame = null;
  const context = new Proxy({ measureText:text=>({width:String(text).length*6}),
    createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}) }, {
    get:(target,property)=>property in target?target[property]:(...args)=>commands.push({method:property,args,fill:context.fillStyle}),
    set:(target,property,value)=>{target[property]=value;return true;}
  });
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
  vi.spyOn(performance,'now').mockImplementation(()=>wallTime);
  errors = vi.spyOn(console,'error').mockImplementation(()=>{}); vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.stubGlobal('AlloPostFXEnabled',false);
  vi.stubGlobal('requestAnimationFrame',callback=>{if(callback.name==='loop')frame=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
  renderer = { domElement:{},shadowMap:{},capabilities:{getMaxAnisotropy:()=>1},setSize(){},setPixelRatio(){},dispose(){},
    getContext:()=>({isContextLost:()=>false}),render:vi.fn((scene,camera)=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}) };
  if(webgl) window.THREE = {...Three,WebGLRenderer:function(){return renderer;}};
  host = document.createElement('div');document.body.appendChild(host);root = ReactDOMClient.createRoot(host);
  function App(){const[data,setData]=React.useState({flightSim:{view:'menu',flightDetails:details,thirdPerson:false,railCollapsed:true,
    takeoffTutorialDismissed:true,landingTutorialDismissed:true}});
    updateData = setData;
    return tool.render(makeCtx({toolData:data,setToolData:setData,
      update:(id,key,value)=>setData(old=>({...old,[id]:{...old[id],[key]:value}})),
      updateMulti:(id,patch)=>setData(old=>({...old,[id]:{...old[id],...patch}}))}));}
  await React.act(async()=>root.render(React.createElement(App)));
  await React.act(async()=>window.__testHooks.flightSim.startFlightChallenge('first_flight'));
  for(const canvas of host.querySelectorAll('canvas')){Object.defineProperty(canvas,'clientWidth',{value:width,configurable:true});Object.defineProperty(canvas,'clientHeight',{value:height,configurable:true});}
  return window.__testHooks.flightSim;
}
async function draw(){commands.length=0;wallTime+=16;expect(frame).toBeTypeOf('function');await React.act(async()=>frame());}

describe('SkySchool production runway integration',()=>{
  it.each([false,true])('starts a ground trainer on the physical threshold with rendererWebGL=%s',async webgl=>{
    const hooks=await mountFlight(webgl),model=runway(),state=hooks.flightRef.current;
    const coordinate=api.getFlightRunwayApproach(state,pwm());
    expect(state).toMatchObject({heading:model.headingDeg,onGround:true,altitude:pwm().alt,speed:0});
    expect(coordinate.alongFt).toBeCloseTo(-3850,6);expect(coordinate.crossFt).toBeCloseTo(0,6);
    await draw();expect(errors).not.toHaveBeenCalled();
    if(webgl){const scene=renderer.render.mock.calls.at(-1)[0],group=scene.children.find(item=>item.userData.runwayModel?.airport.code==='PWM');
      expect(group.rotation.y).toBeCloseTo(-model.headingDeg*Math.PI/180,12);
      const surface=group.children.find(item=>item.geometry?.parameters?.depth===8000);
      expect(surface.geometry.parameters.width).toBe(150);
      expect(group.children.filter(item=>item.geometry?.parameters?.width===4).every(item=>item.material.color.getHex()===0xffffff)).toBe(true);
      expect(group.children.filter(item=>item.geometry?.parameters?.width===4).every(item=>item.material.fog && !item.material.isMeshBasicMaterial)).toBe(true);
      const held=group.position.clone(),rotation=group.rotation.y;hooks.flightRef.current.heading+=60;await draw();
      expect(group.position.toArray()).toEqual(held.toArray());expect(group.rotation.y).toBe(rotation);
    }else expect(commands.some(command=>command.method==='fill'&&command.fill==='#30343b')).toBe(true);
  });
  it('omits the fallback runway when the fixed strip is behind the camera',async()=>{
    const hooks=await mountFlight(false),model=runway();Object.assign(hooks.flightRef.current,pose(model),{heading:(model.headingDeg+180)%360});
    Object.assign(hooks.controlsRef.current,{throttle:0,pitch:0,bank:0});await draw();
    expect(commands.some(command=>command.method==='fill'&&command.fill==='#30343b')).toBe(false);expect(errors).not.toHaveBeenCalled();
  });
  it('offers only modeled reciprocal runways in training ATIS and preserves calm zero-degree wind',async()=>{
    const hooks=await mountFlight(false,true),model=runway();
    Object.assign(hooks.getWeatherRef().current,{wind:0,windDir:0});await draw();
    let texts=commands.filter(command=>command.method==='fillText').map(command=>String(command.args[0]));
    expect(texts.some(text=>text.includes('PWM TRAINING ATIS'))).toBe(true);expect(texts).toContain('WIND 000° @ 0KT');expect(texts).toContain('TRAINING RWY: 03');
    Object.assign(hooks.getWeatherRef().current,{wind:12,windDir:210});await draw();
    texts=commands.filter(command=>command.method==='fillText').map(command=>String(command.args[0]));expect(texts).toContain('TRAINING RWY: 21');
    expect(errors).not.toHaveBeenCalled();
  });
  it.each([{width:320,ap:false,visible:false},{width:1280,ap:true,visible:false},{width:1280,ap:false,visible:true}])(
    'gives compact layout and autopilot priority over approach banners at width$width /AP$ap',async({width,ap,visible})=>{
      const hooks=await mountFlight(false,false,width,720),model=runway();
      Object.assign(hooks.flightRef.current,pose(model),{vsi:-500/60});Object.assign(hooks.controlsRef.current,{throttle:0.4,pitch:0,bank:0});
      await React.act(async()=>updateData(old=>({...old,flightSim:{...old.flightSim,autopilot:ap?{hdg:true,tgtHdg:model.headingDeg,alt:false,spd:false}:{hdg:false,alt:false,spd:false}}})));
      await draw();const texts=commands.filter(command=>command.method==='fillText').map(command=>String(command.args[0]));
      expect(texts.some(text=>text.startsWith('APP STABLE')||text.startsWith('APP CHECK'))).toBe(visible);
      expect(errors).not.toHaveBeenCalled();
    });
  it.each([{cross:0,stable:true},{cross:700,stable:false}])(
    'requires the modeled centerline for stable approach at lateral offset$cross ft',async({cross,stable})=>{
      const hooks=await mountFlight(false,false,1280,720),model=runway();
      Object.assign(hooks.flightRef.current,pose(model,model.ends[0],1.5*6076.12,cross),{speed:110,vsi:-500/60});
      Object.assign(hooks.controlsRef.current,{throttle:0.4,pitch:0,bank:0});
      await draw();
      const approach=api.getFlightRunwayApproach(hooks.flightRef.current,pwm());
      expect(approach.available).toBe(true);
      const telemetry=hooks.getTelemetry();
      expect(telemetry.approachActive).toBe(true);
      expect(telemetry.approachStable).toBe(stable);
      const banner=commands.filter(command=>command.method==='fillText').map(command=>String(command.args[0]))
        .find(text=>text.startsWith('APP STABLE')||text.startsWith('APP CHECK'));
      expect(banner).toBeTruthy();
      if(stable){expect(telemetry.approachReasons).not.toContain('ALIGN');expect(banner).toMatch(/^APP STABLE/);}
      else{expect(Math.abs(approach.courseDeviationDeg)).toBeGreaterThan(2.5);
        expect(telemetry.approachReasons).toContain('ALIGN');expect(banner).toMatch(/^APP CHECK.*ALIGN/);}
      expect(errors).not.toHaveBeenCalled();
    });
  it('starts each airport tour leg on a modeled final instead of aiming at the airport center from the east',async()=>{
    const hooks=await mountFlight(false);
    await React.act(async()=>hooks.startFlightChallenge('world_tour','kden'));
    const airport=api.WAYPOINTS.find(item=>item.id==='kden'),model=api.getFlightRunway(airport),approach=api.getFlightRunwayApproach(hooks.flightRef.current,airport);
    expect(hooks.flightRef.current).toMatchObject({onGround:false,heading:model.ends[0].headingDeg,altitude:airport.alt+1800});
    expect(approach.distanceFt).toBeCloseTo(8*6076.12,6);expect(approach.crossFt).toBeCloseTo(0,6);
  });
});
