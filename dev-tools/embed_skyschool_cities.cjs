'use strict';
// Embed the redistributable offline district into SkySchool's geography data file
// (stem_data_skyschool_geo.js, loaded before the simulator); no map API needed.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['stem_lab/stem_data_skyschool_geo.js', 'desktop/web-app/public/stem_lab/stem_data_skyschool_geo.js'].map(p=>path.join(root,p));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const before = files.map(file=>fs.readFileSync(file,'utf8'));
if(before[0]!==before[1]) throw new Error('Geography data copies differ; reconcile before embedding.');
const pack = JSON.parse(fs.readFileSync(path.join(root,'vendor/skyschool-cities/portland.json'),'utf8'));
const pattern = /^  var FLIGHT_CITY_DISTRICTS = .*;$/m;
if(!pattern.test(before[0])) throw new Error('Expected city data marker is missing.');
const next = before[0].replace(pattern,()=> '  var FLIGHT_CITY_DISTRICTS = '+JSON.stringify([pack])+';');
new vm.Script(next);
if(process.argv.includes('--check')) {
  if(next!==before[0]) throw new Error('Embedded city pack differs from source.');
} else if(next!==before[0]) {
  for(let i=0;i<files.length;i++) {
    if(fs.readFileSync(files[i],'utf8')!==before[i]) throw new Error('Source changed during embed.');
    const stage=files[i]+'.city-stage';
    fs.writeFileSync(stage,next);
    fs.renameSync(stage,files[i]);
  }
}
console.log(JSON.stringify({status:'verified',sourceSha:sha(next),packSha:sha(JSON.stringify(pack)+'\n'),buildings:pack.buildings.length,roads:pack.roads.length}));
