import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const PanView = require('../stem_lab/kitchen_studio/kitchen_studio_pan_view.js');
const mounted = [];
const keys = ['enabled','enableRotate','enableZoom','enablePan','enableDamping','dampingFactor','autoRotate','minDistance','maxDistance','minPolarAngle','maxPolarAngle','minAzimuthAngle','maxAzimuthAngle'];

function fixture(aspect = 16 / 9, extra = {}) {
  document.body.innerHTML = `<canvas id="canvas"></canvas><section id="studioPanView" hidden>
    <button id="studioPanOpen" aria-expanded="false">Pan</button><button id="studioDialOpen" aria-expanded="false">Dial</button>
    <div id="studioPanPanel" hidden><div id="studioPanPerspective"><label id="studioPanAngleLabel" for="studioPanAngle">Angle</label><input id="studioPanAngle" type="range" min="0" max="100" value="65"></div>
    <p id="studioDialHelp" hidden>Turn the real dial.</p><button id="studioDialReturn" hidden>Whole pan</button>
    <p id="studioPanReadout" role="status"></p><button id="studioPanClose">Return</button></div></section>`;
  const camera = new THREE.PerspectiveCamera(42, aspect, .23, 345);
  camera.position.set(7, 8, 9); camera.zoom = 1.3; camera.updateProjectionMatrix();
  const controls = { target: new THREE.Vector3(.4, 1.3, -.2), enabled:true,enableRotate:true,enableZoom:true,enablePan:true,enableDamping:true,dampingFactor:.13,autoRotate:false,minDistance:.9,maxDistance:21,minPolarAngle:.15,maxPolarAngle:1.4,minAzimuthAngle:-.7,maxAzimuthAngle:.8,
    update:vi.fn(() => {camera.lookAt(controls.target);camera.updateMatrixWorld(true);}) };
  controls.update();
  const target = new THREE.Vector3(-.29,1.54,-.42), points=[];
  for(const y of [-.12,.075]) for(let i=0;i<16;i++) points.push(new THREE.Vector3(target.x+Math.sin(i*Math.PI/8)*.31,target.y+y,target.z-Math.cos(i*Math.PI/8)*.31));
  const getDialFrame=vi.fn(() => ({target,points}));
  const host={THREE,camera,controls,canvas:document.getElementById('canvas'),getDialFrame,cancel:vi.fn(),draw:vi.fn(),onViewChange:vi.fn(),onModeChange:vi.fn(),...extra.host};
  const view=(extra.api||PanView).mount(host);mounted.push(view);
  const values=Object.freeze({heat:'medium',dry:true,spread:true,brown:2,seconds:60});
  view.update({active:true,visible:true,values,historical:false,revision:'attempt:0'});
  const $=id=>document.getElementById(id);
  return {host,view,camera,controls,target,points,values,canvas:host.canvas,opener:$('studioPanOpen'),dial:$('studioDialOpen'),panel:$('studioPanPanel'),angle:$('studioPanAngle'),perspective:$('studioPanPerspective'),help:$('studioDialHelp'),back:$('studioDialReturn'),closer:$('studioPanClose'),readout:$('studioPanReadout')};
}
function snapshot(f){return {position:f.camera.position.toArray(),quaternion:f.camera.quaternion.toArray(),zoom:f.camera.zoom,target:f.controls.target.toArray(),flags:Object.fromEntries(keys.map(key=>[key,f.controls[key]]))};}
function setAngle(f,value){f.angle.value=String(value);f.angle.dispatchEvent(new Event('input',{bubbles:true}));}
function fits(f){f.camera.updateMatrixWorld(true);for(const point of f.points){const p=point.clone().project(f.camera);expect(Math.abs(p.x)).toBeLessThanOrEqual(.860001);expect(Math.abs(p.y)).toBeLessThanOrEqual(.860001);expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1);}}
function rimFraction(f){const width=f.camera.aspect*420,height=420,projected=[];for(let i=0;i<32;i++){const a=i*Math.PI/16,p=new THREE.Vector3(f.target.x+Math.sin(a)*.136,f.target.y,f.target.z-Math.cos(a)*.136).project(f.camera);projected.push({x:p.x*width/2,y:p.y*height/2});}return Math.min(Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)),Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)))/Math.min(width,height);}
function enlarged(f){fits(f);expect(rimFraction(f)).toBeGreaterThan(.28);}
function escape(consumed=false){const e=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});if(consumed)e.preventDefault();document.dispatchEvent(e);return e;}

afterEach(()=>{mounted.splice(0).forEach(v=>v.dispose());vi.restoreAllMocks();document.body.innerHTML='';});

describe('Actual burner dial working view',()=>{
  it('opens the dial through its native button and exposes only its corresponding panel controls',()=>{
    const f=fixture();f.dial.click();expect(f.view.isOpen()).toBe(true);expect(f.view.isDialFocused()).toBe(true);expect(f.canvas.dataset.panInspection).toBe('true');expect(f.canvas.dataset.panViewMode).toBe('dial');expect(f.panel.hidden).toBe(false);expect(f.perspective.hidden).toBe(true);expect(f.help.hidden).toBe(false);expect(f.back.hidden).toBe(false);expect(f.dial.getAttribute('aria-expanded')).toBe('true');expect(f.opener.getAttribute('aria-expanded')).toBe('false');expect(f.host.onViewChange.mock.calls).toEqual([[true]]);expect(f.host.onModeChange).not.toHaveBeenCalled();
  });
  it.each([16/9,1,320/500,360/600,2.4])('fits the actual ring and substantially enlarges its short axis at aspect %s',aspect=>{
    const f=fixture(aspect);f.view.open();const panRim=rimFraction(f);f.view.open('dial');enlarged(f);expect(rimFraction(f)).toBeGreaterThan(panRim*2.5);expect(f.camera.zoom).toBeGreaterThan(0);expect(f.camera.zoom).toBeLessThanOrEqual(5.5);
  });
  it('centres the camera on the supplied real dial without moving any framing vectors',()=>{
    const f=fixture(),target=f.target.toArray(),points=f.points.map(p=>p.toArray());f.view.open('dial');expect(f.controls.target.toArray()).toEqual(target);expect(f.target.toArray()).toEqual(target);expect(f.points.map(p=>p.toArray())).toEqual(points);expect(f.values).toEqual({heat:'medium',dry:true,spread:true,brown:2,seconds:60});
  });
  it('cancels before taking its one original camera snapshot',()=>{
    const f=fixture();let returnFrame;f.host.cancel.mockImplementationOnce(()=>{f.camera.position.set(-4,5,6);f.controls.target.set(.1,.2,.3);f.controls.update();returnFrame=snapshot(f);});f.view.open('dial');f.view.close();expect(snapshot(f)).toEqual(returnFrame);
  });
  it('switches pan to dial and back without reentering inspection or replacing the return camera',()=>{
    const f=fixture(),original=snapshot(f);f.view.open();setAngle(f,21);const pan=snapshot(f);f.host.cancel.mockClear();f.view.open('dial');expect(f.host.cancel).toHaveBeenCalledTimes(1);f.back.click();expect(document.activeElement).toBe(f.opener);expect(snapshot(f)).toEqual(pan);expect(f.angle.value).toBe('21');expect(f.view.isDialFocused()).toBe(false);expect(f.canvas.dataset.panViewMode).toBe('pan');expect(f.host.onViewChange.mock.calls).toEqual([[true]]);expect(f.host.onModeChange.mock.calls).toEqual([['dial'],['pan']]);f.view.close();expect(snapshot(f)).toEqual(original);expect(f.host.onViewChange.mock.calls).toEqual([[true],[false]]);
  });
  it('makes the new mode observable before the mode callback runs',()=>{
    const f=fixture(),seen=[];f.host.onModeChange.mockImplementation(mode=>seen.push([mode,f.view.isDialFocused()]));f.view.open();f.view.open('dial');f.view.open('pan');expect(seen).toEqual([['dial',true],['pan',false]]);
  });
  it('keeps repeated API opens in the current mode inert',()=>{
    const f=fixture();f.view.open('dial');const before=snapshot(f),cancel=f.host.cancel.mock.calls.length,draw=f.host.draw.mock.calls.length;f.view.open('dial');expect(snapshot(f)).toEqual(before);expect(f.host.cancel).toHaveBeenCalledTimes(cancel);expect(f.host.draw).toHaveBeenCalledTimes(draw);
  });
  it('toggles each opener in its own mode and switches when the other opener is used',()=>{
    const f=fixture(),original=snapshot(f);f.dial.click();f.opener.click();expect(f.view.isOpen()).toBe(true);expect(f.view.isDialFocused()).toBe(false);f.opener.click();expect(f.view.isOpen()).toBe(false);expect(snapshot(f)).toEqual(original);f.dial.click();f.dial.click();expect(f.view.isOpen()).toBe(false);expect(snapshot(f)).toEqual(original);
  });
  it('ignores hidden perspective input in dial mode, preserving the stored pan angle',()=>{
    const f=fixture();f.view.open();setAngle(f,37);f.view.open('dial');const dial=snapshot(f);f.host.cancel.mockClear();setAngle(f,99);expect(snapshot(f)).toEqual(dial);expect(f.host.cancel).not.toHaveBeenCalled();f.view.open('pan');expect(f.angle.value).toBe('37');
  });
  it.each([{active:false},{visible:false}])('cannot open a hidden or inactive dial %j',next=>{
    const f=fixture(),before=snapshot(f);f.view.update(next);f.view.open('dial');f.dial.click();expect(f.view.isOpen()).toBe(false);expect(f.dial.disabled).toBe(true);expect(snapshot(f)).toEqual(before);
  });
  it.each([{active:false},{visible:false}])('closes either mode and restores the original camera when %j',next=>{
    const f=fixture(),before=snapshot(f);f.view.open();f.view.open('dial');f.view.update(next);expect(f.panel.hidden).toBe(true);expect(f.canvas.dataset.panViewMode).toBe('');expect(snapshot(f)).toEqual(before);
  });
  it('refreshes dial evidence on revision changes without reframing or changing time',()=>{
    const f=fixture();f.view.open('dial');const frame=snapshot(f);f.host.cancel.mockClear();f.host.draw.mockClear();const values=Object.freeze({heat:'high',seconds:90});f.view.update({values,revision:'attempt:1'});expect(f.host.cancel).toHaveBeenCalledTimes(1);expect(f.host.draw).not.toHaveBeenCalled();expect(snapshot(f)).toEqual(frame);expect(f.readout.textContent).toContain('high');expect(f.readout.textContent).toContain('90 simulated seconds');expect(values).toEqual({heat:'high',seconds:90});f.host.cancel.mockClear();f.view.update({revision:'attempt:1'});expect(f.host.cancel).not.toHaveBeenCalled();
  });
  it('keeps recorded and completed dial settings inspectable and explicitly read-only',()=>{
    const f=fixture();f.view.update({historical:true,locked:true,values:Object.freeze({heat:null,seconds:120})});f.dial.click();expect(f.view.isDialFocused()).toBe(true);expect(f.dial.disabled).toBe(false);expect(f.readout.textContent).toMatch(/^Recorded burner: off/);expect(f.readout.textContent).toContain('120 simulated seconds');expect(f.readout.textContent).toContain('Return to a live attempt');expect(f.help.textContent).toContain('Recorded burner settings');f.view.update({historical:false,locked:false,plated:true});expect(f.readout.textContent).toMatch(/^Recorded burner:/);f.view.update({plated:false});expect(f.help.textContent).toBe('Turn the real dial.');
  });
  it('does not reframe the dial on plating changes, then fits the raised pan on return',()=>{
    const f=fixture(320/500);f.view.open('dial');const dial=snapshot(f);f.host.cancel.mockClear();f.host.draw.mockClear();f.view.update({plating:true});expect(f.host.cancel).toHaveBeenCalledTimes(1);expect(f.host.draw).not.toHaveBeenCalled();expect(snapshot(f)).toEqual(dial);f.view.open('pan');for(const x of [-.36,1.04])for(const y of [1.48,2.31])for(const z of [-.70,.30]){const p=new THREE.Vector3(x,y,z).project(f.camera);expect(Math.abs(p.x)).toBeLessThanOrEqual(.860001);expect(Math.abs(p.y)).toBeLessThanOrEqual(.800001);}
  });
  it('cancels and refits the current dial after resize but preserves the original return frame',()=>{
    const f=fixture(),original=snapshot(f);f.view.open();f.view.open('dial');f.camera.aspect=320/500;f.camera.updateProjectionMatrix();f.host.cancel.mockClear();f.view.resize();expect(f.host.cancel).toHaveBeenCalledTimes(1);enlarged(f);expect(f.view.isDialFocused()).toBe(true);f.view.close();expect(snapshot(f)).toEqual(original);expect(f.camera.aspect).toBe(320/500);
  });
  it('leaves the first consumed Escape to a held tool, then closes on the next Escape and focuses the dial opener',()=>{
    const f=fixture();f.view.open('dial');f.back.focus();escape(true);expect(f.view.isDialFocused()).toBe(true);expect(document.activeElement).toBe(f.back);const e=escape();expect(e.defaultPrevented).toBe(true);expect(f.view.isOpen()).toBe(false);expect(document.activeElement).toBe(f.dial);
  });
  it.each(['pan','dial'])('returns focus to the visible close-mode opener for %s',mode=>{
    const f=fixture();f.view.open(mode);f.closer.click();expect(document.activeElement).toBe(mode==='dial'?f.dial:f.opener);expect(f.view.isOpen()).toBe(false);
  });
  it.each(['visibilitychange','pagehide'])('restores the original camera when exiting through %s',type=>{
    const f=fixture(),before=snapshot(f);f.view.open('dial');if(type==='visibilitychange'){vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event(type));}else window.dispatchEvent(new Event(type));expect(snapshot(f)).toEqual(before);expect(f.view.isOpen()).toBe(false);
  });
  it('detaches new element and page behavior on idempotent disposal',()=>{
    const f=fixture(),before=snapshot(f);f.view.open('dial');f.view.dispose();expect(snapshot(f)).toEqual(before);f.host.cancel.mockClear();f.host.draw.mockClear();f.host.onViewChange.mockClear();f.host.onModeChange.mockClear();f.dial.click();f.opener.click();f.back.click();f.closer.click();escape();window.dispatchEvent(new Event('pagehide'));f.view.open('dial');f.view.update({active:true});f.view.resize();f.view.dispose();expect(snapshot(f)).toEqual(before);expect(f.host.cancel).not.toHaveBeenCalled();expect(f.host.draw).not.toHaveBeenCalled();expect(f.host.onViewChange).not.toHaveBeenCalled();expect(f.host.onModeChange).not.toHaveBeenCalled();
  });
  it('does not offer a dial mode without its real framing provider while preserving ordinary pan access',()=>{
    const f=fixture(1,{host:{getDialFrame:null}}),before=snapshot(f);expect(f.dial.disabled).toBe(true);f.view.open('dial');expect(snapshot(f)).toEqual(before);expect(f.view.isOpen()).toBe(false);f.view.open();expect(f.view.isOpen()).toBe(true);expect(f.view.isDialFocused()).toBe(false);
  });
  it.each([null,{target:new THREE.Vector3(NaN,0,0),points:[new THREE.Vector3()]},{target:new THREE.Vector3(),points:[]},{target:new THREE.Vector3(),points:[{x:0,y:0,z:0}]}])('rejects invalid framing without losing the current camera %j',data=>{
    const f=fixture(),before=snapshot(f);f.host.getDialFrame.mockReturnValue(data);f.view.open('dial');expect(snapshot(f)).toEqual(before);expect(f.view.isOpen()).toBe(false);expect(f.host.cancel).not.toHaveBeenCalled();
  });
  it('restores safely if a visible dial loses its framing provider on resize',()=>{
    const f=fixture(),before=snapshot(f);f.view.open('dial');f.host.getDialFrame.mockReturnValue(null);f.view.resize();expect(snapshot(f)).toEqual(before);expect(f.view.isOpen()).toBe(false);
  });
  it('keeps ordinary pan evidence and perspective controls unchanged after switching back',()=>{
    const f=fixture();f.view.open('dial');f.back.click();expect(f.perspective.hidden).toBe(false);expect(f.help.hidden).toBe(true);expect(f.back.hidden).toBe(true);expect(f.readout.textContent).toMatch(/^Pan: Beginning to brown/);expect(f.readout.textContent).toContain('Dry surface');expect(f.readout.textContent).toContain('space between mushrooms');expect(f.readout.textContent).toContain('Burner medium');
  });
  it('the enlargement oracle rejects an actual in-memory unzoomed dial mutation',()=>{
    const source=readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_pan_view.js'),'utf8');
    const normal='camera.zoom=Math.min(5.5,.86/Math.max(dialX,.0001),.86/Math.max(dialY,.0001));';expect(source.split(normal)).toHaveLength(2);const context={module:{exports:{}},globalThis:{}};vm.runInNewContext(source.replace(normal,'camera.zoom=1;'),context);const f=fixture(16/9,{api:context.module.exports});f.view.open('dial');expect(()=>enlarged(f)).toThrow();
  });
});
