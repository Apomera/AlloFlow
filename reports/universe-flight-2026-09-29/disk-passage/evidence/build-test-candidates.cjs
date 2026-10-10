const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',input=path.join(repo,'tests/universe_flight_navigation.test.js');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),before=fs.readFileSync(input,'utf8');
assert.equal(fs.existsSync(path.join(stage,'baseline-navigation.test.js')),false);fs.writeFileSync(path.join(stage,'baseline-navigation.test.js'),before);
const metadata=JSON.parse(fs.readFileSync(path.join(stage,'source-audit.json'))).route.metadata;
const replacements=[
 {before:"import { readFileSync } from 'node:fs';\n",after:"import { readFileSync } from 'node:fs';\n\nconst DISK_METADATA = "+JSON.stringify(metadata,null,2)+";\n"},
 {before:'    expect(routes).toHaveLength(1);\n    expect(routes).toEqual(flight.flybys().filter(item => item.region === \'galaxy\'));',after:'    expect(routes).toHaveLength(2);\n    expect(routes[1]).toEqual(DISK_METADATA);\n    expect(routes).toEqual(flight.flybys().filter(item => item.region === \'galaxy\'));'},
 {before:'    expect(catalog).toHaveLength(4);\n    expect(new Set(catalog.map(item => item.id)).size).toBe(4);',after:'    expect(catalog).toHaveLength(5);\n    expect(new Set(catalog.map(item => item.id)).size).toBe(5);'},
 {before:'    expect(galaxy).toMatchObject([haloMetadata]);',after:'    expect(galaxy).toMatchObject([haloMetadata, DISK_METADATA]);'},
 {before:"    expect(flight.flybys('galaxy')).toMatchObject([haloMetadata]);",after:"    expect(flight.flybys('galaxy')).toMatchObject([haloMetadata, DISK_METADATA]);"},
 {before:"    expect(flight.flybys().map(route => route.id)).toEqual(['halo', 'nebula', 'group', 'stellar']);",after:"    expect(flight.flybys().map(route => route.id)).toEqual(['halo', 'nebula', 'group', 'stellar', 'disk']);"},
 {before:"      ['amber', 'blue', 'pale'],\n    ]);",after:"      ['amber', 'blue', 'pale'], ['arms', 'crossing', 'panorama'],\n    ]);"},
 {before:"      ['amber-star', 'blue-star', 'pale-star'],\n    ]);",after:"      ['amber-star', 'blue-star', 'pale-star'],\n      ['inner-arm', 'inner-arm', 'galactic-center'],\n    ]);"},
];
let after=before;
for(const item of replacements){assert.equal(after.split(item.before).length,2,'Unique scoped test anchor');after=after.replace(item.before,item.after);}
let inverse=after;for(const item of replacements.slice().reverse())inverse=inverse.replace(item.after,item.before);assert.equal(inverse,before);
fs.writeFileSync(path.join(stage,'candidate-navigation.test.js'),after);
const record={completed:true,driverHash:sha(fs.readFileSync(__filename)),target:'tests/universe_flight_navigation.test.js',baselineSha256:sha(before),candidateSha256:sha(after),inverseExact:true,replacements};
fs.writeFileSync(path.join(stage,'test-patch-manifest.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({completed:true,baselineSha256:record.baselineSha256,candidateSha256:record.candidateSha256,replacements:replacements.length,inverseExact:true}));
