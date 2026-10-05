'use strict';
// Root-only authoring tool. Never required by the permanent CPU test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function option(name){const arg=process.argv.find(value=>value.startsWith(name+'='));return arg?arg.slice(name.length+1):null;}
const sourcePath=path.resolve(option('--source')||path.join(__dirname,'pre-pass.source.cjs'));
const target=path.resolve(option('--target')||path.join(repo,'tests/fixtures/cephalopod_habitat_original.json'));
const original=fs.readFileSync(sourcePath,'utf8'),expected='22314e02f0487b3ac626f26450392da440b2ea04ed0e1118b1326d4898d51c7e';
assert.equal(sha(original),expected,'Fixture must derive from the exact saved pre-pass source');
const source=original.replace(/\r\n/g,'\n');
function region(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'Missing baseline region '+start);return source.slice(a,b);}
const protectedRegions=[
  ['plantFactoryAndFlex','      function shadeCLHuntPlantFlex(','      function createCLHuntMarineSnowGeometry('],
  ['grassSpawn','        var grass = [];','        // Terrain-conforming caustics:'],
  ['kelpSpawn','        var kelpStrands = [];','        // ─── Hydrothermal vent'],
  ['rockSpawn','        var rocks = [];','        // ─── Curved branching coral colonies'],
  ['coralFactoryAndSpawn','        // ─── Curved branching coral colonies','        // ─── Sea grass']
].map(([name,start,end])=>({name,sha256:sha(region(start,end))}));
const randomLines=source.split('\n').filter(line=>line.includes('Math.random'));
const grassRecycling=region('              // Grass\n','              // Crabs (alive');
assert.ok(grassRecycling.includes('grass[gri].mesh.position.x - octopus.position.x;'));
assert.ok(grassRecycling.includes('grass[gri].mesh.position.z - octopus.position.z;'));
assert.equal(grassRecycling.split('Math.random').length-1,1);
const fixture={version:1,baselineSourceSha256:expected,lineEndings:'normalized LF',protectedRegions,randomLines,randomLinesSha256:sha(JSON.stringify(randomLines)),grassRecyclingSource:grassRecycling,grassRecyclingSha256:sha(grassRecycling),contract:{grass:80,kelp:25,ownedSpawnDraws:525,originalGeometryAndFlex:true,originalRngCallSites:true,originalGrassRecycling:true}};
const content=JSON.stringify(fixture,null,2)+'\n';
assert.ok(Buffer.byteLength(content)<150000,'Permanent fixture unexpectedly large');
if(fs.existsSync(target))assert.equal(fs.readFileSync(target,'utf8'),content,'Existing original fixture differs; do not silently regenerate the oracle');
if(!process.argv.includes('--check')){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
process.stdout.write(JSON.stringify({mode:process.argv.includes('--check')?'check':'write',sourcePath,target,baselineSHA:expected,fixtureSHA:sha(content),bytes:Buffer.byteLength(content),randomLines:randomLines.length,protectedRegions:protectedRegions.length,originalGrassRecycling:true},null,2)+'\n');
