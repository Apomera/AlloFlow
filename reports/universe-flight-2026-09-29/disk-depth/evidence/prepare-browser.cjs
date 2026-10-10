'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const vista=JSON.parse(fs.readFileSync(__dirname+'/vista.json'));
const bytes=fs.readFileSync(repo+'/dev-tools/universe_flight_bulge_vista_check.cjs');let text=bytes.toString();
const replacements=[
 ["const repo = path.resolve(__dirname, '..');","const repo = '"+repo+"';"],
 ['UNIVERSE_BULGE_VISTA_REPORT','UNIVERSE_DISK_VISTA_REPORT'],
 ["path.join(repo, 'reports/universe-flight-2026-09-29/rounded-bulges')","path.join(repo, 'reports/universe-flight-2026-09-29/disk-depth')"],
 ['UNIVERSE_BULGE_VISTA_URL','UNIVERSE_DISK_VISTA_URL'],['?enhanced=52#','?enhanced=57#'],
 ["const expected = { title: 'Spiral galaxy side view', position: [152240.00209557445, -34043.82120061562, 0], targetId: 'galactic-center', fov: 50 };",'const expected = '+JSON.stringify(vista.vista)+';'],
 ["const previous = ['Spiral portrait', 'Above the arms', 'Across the disk', 'Halo star cluster'];","const previous = ['Island universe', 'The companion', 'Golden elliptical', 'The wider web', 'Barred spiral overlook'];"],
 ['__bulgeVista','__diskVista'],
 ["pose.settings.region, 'galaxy'","pose.settings.region, 'cosmic'"],['156000','450000'],
 ["selectOption('galaxy')","selectOption('cosmic')"],
 ["list.getByRole('button').count(), 5","list.getByRole('button').count(), 6"],
 ['names[4].includes(expected.title)','names[5].includes(expected.title)'],
 ['options.slice(1, 5)','options.slice(1, 6)'],["options[5], { value: '4'","options[6], { value: '5'"],
 ["control.selectOption('4')","control.selectOption('5')"],
 ['all four existing indices','all five existing indices'],['side view','disk profile'],
 ["const pending = [];","const pending = []; result.sourceReadErrors=[]; result.loaderRetries=[];"],
 ['response.body().then(body => result.served.push({ path: pathname, hash: hash(body) }))','response.body().then(body => result.served.push({ path: pathname, hash: hash(body) })).catch(error => result.sourceReadErrors.push(String(error)))'],
 ["await page.waitForFunction(() => window.__diskVistaStatus?.state === 'ready' && window.__diskVistaScene);","await page.waitForFunction(() => typeof window.UniverseFlight?.create === 'function');\n    const retry=page.getByRole('button',{name:'Retry 3D view',exact:true});\n    if(await retry.isVisible()){await retry.click();result.loaderRetries.push('Initial loader timed out before the API became available');save();}\n    await page.waitForFunction(() => window.__diskVistaStatus?.state === 'ready' && window.__diskVistaScene);"],
 ["assert.deepEqual(result.errors, [], 'No page errors occur');","assert.deepEqual(result.errors, [], 'No page errors occur'); assert.deepEqual(result.sourceReadErrors,[],'Source response reads succeed');"],
 ["await Promise.all(pending);","await page.setViewportSize({width:568,height:320});\n    await normal('landscape-reduced-motion'); await fullscreen('landscape-fullscreen-reduced-motion');\n    check('The short landscape menus preserve the paused profile and canvas focus');\n    await page.setViewportSize({width:1280,height:850});\n    await page.emulateMedia({forcedColors:'active'});\n    await normal('system-colors'); await fullscreen('system-colors-fullscreen');\n    check('System colors preserve reachable scenic controls and a paused viewport');\n    await page.emulateMedia({forcedColors:'none'});\n    await page.addStyleTag({content:'[data-universe-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;} [data-universe-tool] p{margin-bottom:2em!important;}'});\n    await normal('text-spacing'); await fullscreen('text-spacing-fullscreen');\n    check('Increased text spacing keeps the profile control and fullscreen menu reachable');\n    await Promise.all(pending);"]
];
for(const [before,after]of replacements){assert.ok(text.includes(before),'Missing replacement '+before);text=text.split(before).join(after);}
new vm.Script(text,{filename:'browser-check.cjs'});fs.writeFileSync(__dirname+'/browser-check.cjs',text);
fs.writeFileSync(__dirname+'/browser-derivation.json',JSON.stringify({completed:true,baselineHarness: 'dev-tools/universe_flight_bulge_vista_check.cjs',baselineHash:hash(bytes),harnessHash:hash(Buffer.from(text)),replacements},null,2)+'\n');
console.log(JSON.stringify({completed:true,harnessHash:hash(Buffer.from(text)),expected:vista.vista}));
