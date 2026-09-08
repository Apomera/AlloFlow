const fs=require('node:fs');
const p='stem_lab/stem_tool_geometryworld.js';
let s=fs.readFileSync(p,'utf8');
const a='      if (isMobile && !d._mobileDismissed) {';
if(!s.includes(a))throw Error('Mobile guard missing');
s=s.replace(a,`      // A narrower window must never replace an active creation with onboarding.
      // The viewport ref owns the engine: removing it here would discard blocks
      // and undo history when a desktop window crosses the mobile breakpoint.
      if (isMobile && !d._mobileDismissed && !worldActive) {`);
s=s.replace('opacity: 0.22, side: THREE.DoubleSide });','opacity: 0.06, side: THREE.FrontSide, depthWrite: false });');
s=s.replace('g.material.opacity = hidden ? 0.07 : 0.22;', 'g.material.opacity = hidden ? 0.015 : 0.06;');
s=s.replace('color: 0xfbbf24, transparent: true, opacity: 0.4 });','color: 0xfbbf24, transparent: true, opacity: 0.28 });');
new Function(s);
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
const t='tests/geometry_world_engine_lifecycle.test.js';
let test=fs.readFileSync(t,'utf8');
const anchor="  it('DOES tear the engine down on a real unmount', () => {";
if(!test.includes(anchor))throw Error('Lifecycle test anchor missing');
test=test.replace(anchor,`  it('preserves an active creation when a desktop session narrows before mobile onboarding', () => {
    const width = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const touch = Object.getOwnPropertyDescriptor(window, 'ontouchstart');
    Object.defineProperty(window, 'innerWidth', {configurable:true, value:1280});
    Object.defineProperty(window, 'ontouchstart', {configurable:true, value:null});
    const fake = makeFakeEngine();
    fake.blocks['2,1,3'] = {userData:{gridPos:{x:2,y:1,z:3},blockType:'wood'}};
    fake._undoStack.push({action:'place',x:2,y:1,z:3});
    const originalBlocks = fake.blocks, originalHistory = fake._undoStack, originalCamera = fake.camera;
    window[ENGINE_KEY] = fake;
    const m = mountTool(cfg, {_introShownOnce:true, worldActive:true});
    const surface = m.container.querySelector('#geoworld-fs-wrap');
    try {
      expect(m.bucket()._mobileDismissed).toBeUndefined();
      for (const next of [390,320,1280]) {
        Object.defineProperty(window, 'innerWidth', {configurable:true, value:next});
        m.rerender();
        expect(window[ENGINE_KEY]).toBe(fake);
        expect(m.container.querySelector('#geoworld-fs-wrap')).toBe(surface);
        expect(m.container.querySelector('#gw-mobile-title')).toBeNull();
        expect(fake.blocks).toBe(originalBlocks);
        expect(fake._undoStack).toBe(originalHistory);
        expect(fake.camera).toBe(originalCamera);
        expect(Object.keys(fake.blocks)).toEqual(['2,1,3']);
        expect(fake._calls.clearWorld).toBe(0);
        expect(fake._calls.rendererDisposed).toBe(0);
      }
    } finally {
      m.unmount();
      if(width)Object.defineProperty(window,'innerWidth',width);else delete window.innerWidth;
      if(touch)Object.defineProperty(window,'ontouchstart',touch);else delete window.ontouchstart;
    }
  }, 20000);

`+anchor);
const fd=fs.openSync(t,'r+');fs.writeFileSync(fd,test);fs.ftruncateSync(fd,Buffer.byteLength(test));fs.closeSync(fd);
console.log('Active workspace survives mobile breakpoint; selection tint softened.');
