const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');const stage=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let source=fs.readFileSync(path.join(stage,'native-check.cjs'),'utf8');assert.equal(sha(source),'4e023c8bdb4a16dc233148451fce3effde81f66087e5264962951f260f67ffa5');const changes=[];
function replace(before,after){assert.equal(source.split(before).length,2,before);source=source.replace(before,after);changes.push({before,after});}
replace("report=path.join(stage,'native-report')","report=path.join(stage,'native-final-report')");
replace("fov:route.id==='halo'?62:route.id==='group'?48:route.id==='stellar'?52:60","fov:route.fov");
replace("assert.equal(freeLook.flyby.autoLook,false);","const freeLookRoute=await page.evaluate(()=>__telemetry.flyby);assert.equal(freeLookRoute.autoLook,false);");
replace('freeLookRetainsPositionAndCounters:true,snapshot,freeLook','freeLookRetainsPositionAndCounters:true,snapshot,freeLook,freeLookRoute');
replace('a.snapshot.flyby.elapsedSeconds-b.snapshot.flyby.elapsedSeconds','a.telemetry.flyby.elapsedSeconds-b.telemetry.flyby.elapsedSeconds');
replace('c.snapshot.flyby.elapsedSeconds','c.telemetry.flyby.elapsedSeconds');
fs.writeFileSync(path.join(stage,'native-final-check.cjs'),source);fs.writeFileSync(path.join(stage,'native-final-driver-provenance.json'),JSON.stringify({baseDriverSha256:'4e023c8bdb4a16dc233148451fce3effde81f66087e5264962951f260f67ffa5',driverSha256:sha(source),originalFailure:'TypeError: Cannot read properties of undefined (reading autoLook)',changes},null,2)+'\n');console.log(sha(source));
