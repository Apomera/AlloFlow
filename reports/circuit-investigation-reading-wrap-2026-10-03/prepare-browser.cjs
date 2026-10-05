const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const expected=process.argv[2];assert.match(expected||'',/^[a-f0-9]{64}$/);
let code=fs.readFileSync(path.join(__dirname,'../circuit-investigation-reading-2026-10-03/browser-check.cjs'),'utf8');
assert.equal(crypto.createHash('sha256').update(code).digest('hex'),'24c13ac9dfbd4306f1b629d257637b2f590d6a12bbad5be58ef34a894487c71e');
const prior='e81cf1cb831d3754b208ed31d6467b14cb6fa140c5b6c299855ce671c5c12257';assert.equal(code.split(prior).length,2);code=code.replace(prior,expected);
const start=code.indexOf('    async function readingLayout('),end=code.indexOf("    await fixture(records,'gain'",start);assert.ok(start>0&&end>start);code=code.slice(0,start)+fs.readFileSync(path.join(__dirname,'reading-metrics.txt'),'utf8')+'\n'+code.slice(end);
code=code.replaceAll('investigation-reading','investigation-reading-wrap');
new Function(code);fs.writeFileSync(path.join(__dirname,'browser-check.cjs'),code);console.log(JSON.stringify({source:expected,script:crypto.createHash('sha256').update(code).digest('hex')}));
