const fs=require('node:fs'),path=require('node:path');
const target='stem_lab/stem_tool_geometryworld.js';
const raw=fs.readFileSync(target,'utf8'),crlf=raw.includes('\r\n');let source=raw.replace(/\r\n/g,'\n');
function replace(before,after){const n=source.split(before).length-1;if(n!==1)throw Error('Unexpected anchor count '+n+' '+before.slice(0,80));source=source.replace(before,after);}
if(source.includes('function buildCoastalLandscape('))throw Error('Coastal patch already present');
replace('  SAMPLE_LESSONS.geometryHarbor = {','  SAMPLE_LESSONS.geometryHarbor = {\n    "landscapeTheme": "coastal",');
const helper=fs.readFileSync(path.join(__dirname,'coastal-landscape.js'),'utf8').replace(/\r\n/g,'\n').split('\n').map(line=>'          '+line).join('\n');
replace('          engine.disposeLandscape = disposeLandscape;',helper+'\n          engine.disposeLandscape = disposeLandscape;');
replace("            var nextKey = [x0, x1, z0, z1, baseY, saver ? 'saver' : 'detail'].join(':');", "            var coastal = !!(engine._currentLesson && engine._currentLesson.landscapeTheme === 'coastal');\n            var nextKey = [x0, x1, z0, z1, baseY, saver ? 'saver' : 'detail', coastal ? 'coastal' : 'meadow'].join(':');");
replace('            disposeLandscape(); landscapeKey = nextKey;',
`            disposeLandscape(); landscapeKey = nextKey;
            if (coastal) {
              var coast = buildCoastalLandscape(x0, x1, z0, z1, baseY, saver);
              coast.visible = previousVisibility;
              if (studio) { studio.hidden.push([coast, previousVisibility]); coast.visible = false; }
              engine._landscape = coast; engine.scene.add(coast); return;
            }`);
const output=crlf?source.replace(/\n/g,'\r\n'):source;
const destination=process.argv.includes('--apply')?target:path.join(__dirname,'coastal-core-candidate.js');
if(fs.existsSync(destination)){const fd=fs.openSync(destination,'r+');try{fs.writeSync(fd,output,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(output));}finally{fs.closeSync(fd);}}else fs.writeFileSync(destination,output);
console.log(JSON.stringify({destination,theme:'coastal',productionChanged:process.argv.includes('--apply')}));
