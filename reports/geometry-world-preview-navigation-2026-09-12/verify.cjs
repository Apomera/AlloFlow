const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process'),out=__dirname;
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const suites=new Map();for(const name of ['final-tests.json','zoom-tests.json'])for(const suite of read(name).testResults||[])suites.set(suite.name,suite);
const assertions=[...suites.values()].flatMap(s=>s.assertionResults||[]),failed=assertions.filter(a=>a.status!=='passed');if(failed.length||[...suites.values()].some(s=>s.status!=='passed'))throw Error('Unit tests are not all passing');
const browserChecks=new Map();for(const name of ['browser.json','lifecycle-browser.json','phone-browser.json']){const r=read(name);if(r.failure||r.errors.length||r.assertions.some(a=>!a.pass))throw Error('Browser verification failed: '+name);r.assertions.forEach(a=>browserChecks.set(a.name,a));}
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'],files=[];
for(const name of sources){const source='stem_lab/'+name,desktop='desktop/web-app/public/stem_lab/'+name,a=fs.readFileSync(source),b=fs.readFileSync(desktop);new vm.Script(a.toString());new vm.Script(b.toString());if(!a.equals(b))throw Error('Desktop source mismatch: '+name);files.push({source,desktop,sha256:crypto.createHash('sha256').update(a).digest('hex')});}
const diff=cp.spawnSync('git',['diff','--check','--',...files.flatMap(f=>[f.source,f.desktop])],{encoding:'utf8'});if(diff.status!==0)throw Error('Scoped whitespace check failed: '+diff.stdout+diff.stderr);
let changes='';for(const f of files){const d=cp.spawnSync('git',['diff','--no-index','--',path.join(out,path.basename(f.source)+'.before'),f.source],{encoding:'utf8',maxBuffer:10*1024*1024});if(d.status!==0&&d.status!==1)throw Error(d.stderr);changes+=d.stdout;}
fs.writeFileSync(path.join(out,'changes.diff'),changes);
const verification={scope:'Local Geometry World source in a minimal React/Three.js host; no deployment or physical printer validation.',unitTests:assertions.length,testFiles:suites.size,failedTests:0,pendingTests:0,browserChecks:browserChecks.size,browserErrors:0,sourceSyntax:'passed',desktopParity:'passed',scopedWhitespace:'passed',deployed:false,files};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(verification,null,2));
fs.writeFileSync(path.join(out,'REVIEW.md'),`# Geometry World preview navigation refinement

Proposed structures can now be inspected by dragging to orbit, pinching or scrolling to zoom, and choosing Angle, Front, Side, or Top. Fit model restores the complete view. Camera controls are collapsed by default to keep the review clear.

The camera fits the model into the space left by the review card, including after resize, orientation changes, expanded controls, and fullscreen. On phones, the redundant Build tools shortcut is hidden during review; Back to tools stays available in the card and restores the dock. Repeated zoom preserves the model's screen position and a stable clipping range.

Review gestures cannot place blocks, change material selection, capture the cursor, or trigger the world's Undo shortcuts. Back, Cancel, Escape, and Apply release camera ownership and restore the earlier pose. Lesson changes and tool unmount release listeners and pointer capture without moving the new scene to a stale camera position. Preview lighting follows the structure.

## Validation

- ${assertions.length} passing targeted tests across ${suites.size} files; zero failures or pending tests. The final zoom suites supersede their earlier run.
- ${browserChecks.size} distinct passing Chromium browser checks with no reported page errors. Mouse, keyboard, actual two-finger touch events, fullscreen, responsive framing, Apply, lesson loading, and actual React unmount were exercised.
- Canonical and desktop source copies match. JavaScript syntax and scoped git whitespace checks pass.
- The first UI run exceeded its default timeout; the complete targeted rerun passed with a longer timeout. The first browser script was corrected to reopen the starter tool after Cancel.

The browser checks use the current local source in a minimal React/Three.js host with software WebGL. The deployed Gemini Canvas app and a physical printer were not tested. These changes have not been committed or deployed.

## Screenshots and evidence

- [Desktop camera controls](02-angle-controls.jpg)
- [Phone preview with more model space](07-phone-full-width-review.jpg)
- [Expanded phone controls](08-phone-full-width-controls.jpg)
- [Short landscape layout](06-short-landscape-review.jpg)
- [Verification summary](verification.json)
- [Change diff for this pass](changes.diff)

Browser checks can be repeated with \`node reports/geometry-world-preview-navigation-2026-09-12/browser.cjs\`, \`lifecycle-browser.cjs\`, and \`phone-browser.cjs\` in the same report folder. Targeted unit results are in \`final-tests.json\` and \`zoom-tests.json\`.
`);
console.log(JSON.stringify(verification,null,2));
