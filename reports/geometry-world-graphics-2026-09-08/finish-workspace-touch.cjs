const fs=require('node:fs');
const p='stem_lab/stem_tool_geometryworld.js';
let s=fs.readFileSync(p,'utf8');
const a='.gw-root .gw-touch-look-panel{background:#112d2bf2;';
if(!s.includes(a))throw Error('Touch style anchor missing');
s=s.replace(a,'.gw-root .gw-touch-look-panel{top:128px!important;background:#112d2bf2;');
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
const t='tests/geometry_world_display_controls.test.js';
let tests=fs.readFileSync(t,'utf8');
const start=tests.indexOf("  it('offers explicit touch and desktop-style modes with a persistent fullscreen toggle'");
if(start<0)throw Error('Onboarding test missing');
tests=tests.slice(0,start)+tests.slice(start).replace('const view = mountTool({ _introShownOnce: true, worldActive: true });','// The device chooser is initial onboarding; an active world survives resizing.\n      const view = mountTool({ _introShownOnce: true, worldActive: false });');
const fd=fs.openSync(t,'r+');fs.writeFileSync(fd,tests);fs.ftruncateSync(fd,Buffer.byteLength(tests));fs.closeSync(fd);
console.log('Touch view controls cleared; fresh-session onboarding test updated.');
