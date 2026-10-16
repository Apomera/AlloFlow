'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source='stem_lab/stem_tool_flightsim.js',mirror='desktop/web-app/public/stem_lab/stem_tool_flightsim.js';
const sourceSha=sha(fs.readFileSync(path.join(root,source)));
const names=['precipitation','weather_rendering','weather_atmosphere','canvas_atmosphere','weather_atmosphere_integration','water_reflection','water_reflection_integration','celestial','celestial_integration','sky_life','sky_life_integration','atmosphere','cloud_orientation','cloud_field','cloud_field_integration','terrain_lighting','daylight_continuity','city_illumination','city_base_shading','city_layout','city_selection','city_facade_bounds','city_coverage','city_roads','city_worker','city_reveal','city_vector','city_provider','city_converter','city_online','city_start','city_planner','city_detail','city_geography','water_material','world_longitude','scenery_parallax','terrain_camera',
  'elevation_integration','elevation_material','cockpit_clearance','cockpit_disclosure','help_accessibility','keyboard_controls',
  'views_smoke','ui_strings_consistency','dynamic_key_sync','template_placeholders'].map(n=>'flightsim_'+n+'.test.js');
let previous=null;
if(process.argv.includes('--resume')) {
  try {previous=JSON.parse(fs.readFileSync(path.join(root,'skyschool-city-tests.json'),'utf8'));} catch {}
}
const report={sourceSha,complete:false,files:[],total:0};
for(const name of names) {
  if([source,mirror].some(f=>sha(fs.readFileSync(path.join(root,f)))!==sourceSha)) throw Error('Source changed during verification.');
  const unchanged=previous&&previous.sourceSha===sourceSha&&previous.files.find(item=>item.name===name&&item.exitCode===0&&item.count>0&&item.sha===sha(fs.readFileSync(path.join(root,'tests',name))));
  if(unchanged){report.files.push(unchanged);report.total+=unchanged.count;console.log(name+': prior pass verified against same source and test');continue;}
  const started=Date.now();
  const result=spawnSync(process.execPath,['--max-old-space-size=512','--max-semi-space-size=8','--single-threaded-gc',
    'node_modules/vitest/vitest.mjs','run','--pool=threads','tests/'+name,'--maxWorkers=1','--reporter=dot','--testTimeout=60000','--hookTimeout=60000'],
    {cwd:root,encoding:'utf8',timeout:600000,windowsHide:true,maxBuffer:3e6});
  const output=(result.stdout||'')+(result.stderr||'');
  const count=Number(/Tests\s+(\d+) passed/.exec(output)?.[1]||0);
  report.files.push({name,sha:sha(fs.readFileSync(path.join(root,'tests',name))),exitCode:result.status,count,durationMs:Date.now()-started,
    output:output.slice(-16000)});
  report.total+=count;
  fs.writeFileSync(path.join(root,'skyschool-city-tests.json'),JSON.stringify(report,null,2)+'\n');
  console.log(name+': '+result.status+' ('+count+' passed)');
  if(result.status!==0) {console.error(output);process.exitCode=1;break;}
}
report.complete=report.files.length===names.length&&report.files.every(f=>f.exitCode===0);
fs.writeFileSync(path.join(root,'skyschool-city-tests.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,suites:report.files.length,tests:report.total}));
