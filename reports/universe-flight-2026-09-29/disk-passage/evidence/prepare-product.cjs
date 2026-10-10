const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const files=[['stem_lab/stem_tool_universe.js','baseline-ui.js','a744f3d2e32b5bec28864c8ee29468ec68178cd20d9bb08bcd8fa3d9eefc19a9'],['dev-tools/build_universe_flight_previews.cjs','baseline-preview-builder.cjs','43ded0bbe453ded9a65effb50c5cdd781ca0a137c87d9786881383a10af06b57'],['dev-tools/universe_flight_preview.cjs','baseline-preview-server.cjs',null]];
for(const [file,name,pin]of files){const bytes=fs.readFileSync(path.join(repo,file));if(pin)assert.equal(hash(bytes),pin);fs.writeFileSync(path.join(stage,name),bytes);}
assert.deepEqual(fs.readFileSync(path.join(repo,'stem_lab/stem_tool_universe.js')),fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_universe.js')));
function derive(basename,candidateName,changes){let text=fs.readFileSync(path.join(stage,basename),'utf8');const baseline=text;for(const [before,after]of changes){assert.equal(text.split(before).length,2,'Unique preimage: '+before);text=text.replace(before,after);}new vm.Script(text,{filename:candidateName});let inverse=text;for(const [before,after]of [...changes].reverse()){assert.equal(inverse.split(after).length,2);inverse=inverse.replace(after,before);}assert.equal(inverse,baseline);fs.writeFileSync(path.join(stage,candidateName),text);return{baseline:basename,candidate:candidateName,baselineHash:hash(baseline),candidateHash:hash(text),inverseExact:true,replacements:changes.map(([before,after])=>({before,after}))};}
const ui=derive('baseline-ui.js','candidate-ui.js',[
 ["      stellar:{depart:'Approaching the amber star'", "      disk:{approach:'Above the spiral arms',descent:'Descending into the stellar disk',crossing:'Crossing the star field',emerge:'Leaving the stellar disk',turn:'Turning toward the galaxy',reveal:'Revealing the whole spiral',complete:'Spiral panorama ready'},\n      stellar:{depart:'Approaching the amber star'"],
 ["    return event.routeId==='stellar'?", "    return event.routeId==='disk'?label('journey_disk_help','Travel is paused beyond the disk with the spiral in view. Look around, orbit the galaxy, or save this viewpoint.'):event.routeId==='stellar'?"],
 ["        ['group','Galaxy group flyby','Pass the spiral and golden elliptical, then reveal the group']", "        ['group','Galaxy group flyby','Pass the spiral and golden elliptical, then reveal the group'],\n        ['disk','Spiral disk passage','Descend through the star field, then emerge beyond the disk for a wide panorama']"],
 ["item[0]==='group'?label('flyby_group_duration','48 seconds at standard pace'):","item[0]==='group'?label('flyby_group_duration','48 seconds at standard pace'):item[0]==='disk'?label('flyby_disk_duration','44 seconds at standard pace'):"],
]);
const builder=derive('baseline-preview-builder.cjs','candidate-preview-builder.cjs',[
 ['function verify(){','function verify(allowPrevious){'],
 ['assert.equal(manifest.version,1);assert.equal(manifest.views.length,12);assert.equal(new Set(manifest.views.map(v=>v.file)).size,12);','assert.equal(manifest.version,1);assert.ok(allowPrevious?[12,15].includes(manifest.views.length):manifest.views.length===15);assert.equal(new Set(manifest.views.map(v=>v.file)).size,manifest.views.length);if(!allowPrevious)assert.equal(manifest.rendererHash,hash(source));'],
 ['(halo|nebula|group|stellar)-','(halo|nebula|group|stellar|disk)-'],
 ["if(fs.existsSync(path.join(folder,'manifest.json')))verify();", "if(fs.existsSync(path.join(folder,'manifest.json')))verify(true);"],
 ['// A contact sheet makes all twelve generated views easy to review together.','// A contact sheet makes all fifteen generated views easy to review together.'],
]);
// Names match the new route highlights and stay behind the existing local-only
// route allowlist. Existing preview URLs and assets remain available.
const server=derive('baseline-preview-server.cjs','candidate-preview-server.cjs',[
 ["'stellar-amber','stellar-blue','stellar-pale'", "'stellar-amber','stellar-blue','stellar-pale','disk-arms','disk-crossing','disk-panorama'"],
]);
const manifest={completed:true,files:[ui,builder,server]};fs.writeFileSync(path.join(stage,'product-patch-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.files.map(x=>({candidate:x.candidate,sha256:x.candidateHash,inverseExact:x.inverseExact}))));
