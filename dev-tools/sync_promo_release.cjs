#!/usr/bin/env node
'use strict';
// Keep crawler-visible HTML and offline launch fallbacks aligned with release.json.
// Historical changelog entries, VPATs, and manuals retain their original versions.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
if (!/^\d+\.\d+(?:\.\d+)?$/.test(release.version)) throw new Error('Invalid release version');
const check = process.argv.includes('--check');
const files = ['index.html','about.html','features.html','tools.html','remediation.html','ways-to-use.html','for-districts.html','students.html','library.html','calculator.html','accessibility_demo.html','whitepaper.html','feedback.html','manuals.html','launch.html'];
let drift = 0;
for (const file of files) {
    const absolute = path.join(root,file);
    const before = fs.readFileSync(absolute,'utf8');
    let after = before.replace(/("softwareVersion":\s*")[^"]+("|$)/g, (_,a,b)=>a+release.version+b)
        .replace(/(<span data-release-version>)v[^<]+/g, (_,a)=>a+'v'+release.version);
    if (file === 'about.html') {
        after = after.replace(/(Current release<\/th><td>Version )[\d.]+/g, (_,a)=>a+release.version)
            .replace(/(current maintained release is version )[\d.]+(?=\.)/g, (_,a)=>a+release.version);
    }
    if (file === 'launch.html') {
        after = after.replace(/(const FALLBACK_VERSION = ")[^"]+/, (_,a)=>a+release.version)
            .replace(/(id="version-label">)v[^<]+/, (_,a)=>a+'v'+release.version);
    }
    if (after !== before) {drift++; console.log(file+': '+(check?'release drift':'updated')); if(!check) fs.writeFileSync(absolute,after);}
}
console.log('Promotion release '+release.version+': '+(drift?drift+' file(s) '+(check?'need updates':'updated'):'current'));
if(check && drift)process.exitCode=1;
