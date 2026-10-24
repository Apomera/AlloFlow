import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Author the small permanent projection from a reviewed native baseline.
// Ordinary tests consume the JSON fixture and need no generated reports.
const [auditPath,baselineSourcePath]=process.argv.slice(2);
assert(auditPath&&baselineSourcePath,'Usage: node tests/helpers/dino_hadrosaur_native_preservation_fixture.mjs <native-baseline-audit.json> <baseline-source.js>');
const sourceHash=createHash('sha256').update(readFileSync(baselineSourcePath)).digest('hex');
assert.equal(sourceHash,'4831937ee7c95260084fc5dac0fae6b623ee1ba83f0ab1ee56ced1d27b7abae9');
const audit=JSON.parse(readFileSync(auditPath,'utf8'));
const bodyBaseline=JSON.parse(readFileSync(new URL('../fixtures/dinolab_hadrosaur_extremities_preserved.json',import.meta.url),'utf8'));
assert.equal(bodyBaseline.sourceHash,sourceHash);
const ids=['parasaurolophus','corythosaurus','lambeosaurus','olorotitan','edmontosaurus'];
assert.deepEqual(audit.map(row=>row.species),ids);
const species={};
for(const row of audit){
 assert.equal(row.parts.length,2);
 const first=row.parts[0].life;
 assert.deepEqual(first.body,bodyBaseline.species[row.species].anatomy);
 for(const part of row.parts){assert.deepEqual(part.life.body,first.body);assert.deepEqual(part.life.crest,first.crest);}
 species[row.species]={body:first.body,...(first.crest===undefined?{}:{crest:first.crest})};
}
writeFileSync(new URL('../fixtures/dinolab_hadrosaur_native_body_preserved.json',import.meta.url),JSON.stringify({sourceHash,species},null,2)+'\n');
console.log('Authored five-species native body/crest projection from immutable baseline483');
