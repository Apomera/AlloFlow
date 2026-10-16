/* Re-embed the committed offline elevation payloads; no network required. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'vendor/skyschool-elevation', name), 'utf8'));
const elevation = read('elevation-grid.json'), lake = read('lake-levels.json');
if (elevation.format !== 'skyschool-elevation-row-delta-v1' || elevation.units !== 'meters' || elevation.verticalDatum !== 'EGM2008' || !elevation.grids.length) throw Error('Unsupported elevation package');
if (lake.format !== 'skyschool-lake-levels-v1' || lake.units !== 'meters' || lake.width !== 36000 || lake.height !== 18000 || lake.resolutionDegrees !== .01) throw Error('Unsupported lake package');
for (const grid of elevation.grids) {
  if (!grid.id || !Number.isInteger(grid.width) || !Number.isInteger(grid.height) || grid.width < 2 || grid.height < 2 || grid.rows.length !== grid.height || !(grid.step > 0) || !Number.isFinite(grid.lat0) || !Number.isFinite(grid.lon0)) throw Error('Invalid grid registration');
}
const gridPayload = { format: elevation.format, units: elevation.units, verticalDatum: elevation.verticalDatum,
  grids: elevation.grids.map(g => ({id:g.id,lat0:g.lat0,lon0:g.lon0,step:g.step,width:g.width,height:g.height,rows:g.rows})) };
const lakePayload = {format:lake.format,resolutionDegrees:lake.resolutionDegrees,width:lake.width,height:lake.height,units:lake.units,levelsMeters:lake.levelsMeters,rows:lake.rows};
const files = ['stem_lab/stem_tool_flightsim.js','desktop/web-app/public/stem_lab/stem_tool_flightsim.js'].map(file => path.join(root,file));
const originals = files.map(file => fs.readFileSync(file,'utf8'));
if (originals[0] !== originals[1]) throw Error('Source and desktop copy differ; reconcile before embedding');
let source = originals[0];
for (const [name,payload] of [['FLIGHT_ELEVATION_DATA',gridPayload],['FLIGHT_LAKE_LEVEL_DATA',lakePayload]]) {
  const prefix = '  var '+name+' = ', start = source.indexOf(prefix);
  if (start < 0 || source.indexOf(prefix,start+1) >= 0) throw Error('Missing or duplicate '+name);
  const end = source.indexOf('\n',start);
  if (end < 0 || !source.slice(start,end).trimEnd().endsWith(';')) throw Error('Invalid embedded data boundary');
  source = source.slice(0,start)+prefix+JSON.stringify(payload)+';'+source.slice(end);
}
new vm.Script(source,{filename:files[0]});
if (process.argv.includes('--check')) {
  if (source !== originals[0]) throw Error('Embedded elevation differs from committed packages');
  console.log('Embedded elevation packages match both source copies.');
} else {
  for (const [i,file] of files.entries()) if (source !== originals[i]) {
    if (fs.readFileSync(file,'utf8') !== originals[i]) throw Error('Source changed during embedding');
    const stage = file+'.elevation-stage'; fs.writeFileSync(stage,source); fs.renameSync(stage,file);
  }
  console.log('Offline elevation embedded in both source copies.');
}
