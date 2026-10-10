const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth');
for(const file of [path.join(report,'README.md'),path.join(repo,'reports/universe-flight-2026-09-29/README.md')]){
 const old=fs.readFileSync(file,'utf8'),next=old.replaceAll('56 focused assertions','56 focused tests').replaceAll('56 distinct assertions','56 focused tests');
 fs.writeFileSync(file,next);
}
const files=['stem_lab/universe_flight_scene.js','stem_lab/stem_tool_universe.js','desktop/web-app/public/stem_lab/universe_flight_scene.js','desktop/web-app/public/stem_lab/stem_tool_universe.js','tests/helpers/universe_galaxy_surfaces.js','tests/universe_flight_bulges.test.js','tests/universe_flight_cloud_surfaces.test.js','tests/universe_flight_barred_detail.test.js','tests/universe_flight_spiral_detail.test.js','tests/universe_flight_two_arm_detail.test.js','reports/universe-flight-2026-09-29/README.md'];
const result=spawnSync('git',['diff','--check','--',...files],{cwd:repo,windowsHide:true,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
console.log(JSON.stringify({completed:true,focusedTests:56,scopedDiffCheck:true}));
