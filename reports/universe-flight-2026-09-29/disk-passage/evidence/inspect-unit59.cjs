const fs = require('node:fs'), path = require('node:path');
const stage = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const result = JSON.parse(fs.readFileSync(path.join(stage, 'focused-unit/results.json')));
console.log(JSON.stringify(result.testResults.flatMap(file => file.assertionResults.filter(test => test.status === 'failed').map(test => ({file:file.name,test:test.fullName,duration:test.duration,failure:test.failureMessages}))),null,2));
for(const file of ['node-renderer-setup.mjs','node-renderer.config.mjs','focused-unit/stdout.txt']) console.log('\nFILE '+file+'\n'+fs.readFileSync(path.join(stage,file),'utf8'));
const lines = fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'),'utf8').split(/\r?\n/);
for(let i=2338;i<2407;i++) console.log(`${i+1}: ${lines[i]}`);
const testLines = fs.readFileSync(path.join(repo,'tests/universe_flight_navigation.test.js'),'utf8').split(/\r?\n/); for(let i=0;i<138;i++) console.log(`${i+1}: ${testLines[i]}`);
