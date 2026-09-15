'use strict';
const fs=require('node:fs'),file='reports/geometry-world-free-build-2026-09-12/write-final-browser-review.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace('measures278','measures 278').replace('measures64','measures 64').replace('selected44','selected 44').replace('measures${','measures ${').replace('contrast${','contrast ${').replace('At1440','At 1440').replace('including390','including 390');
const old='Earlier baseline runner failures included a fixture aimed through an arch opening and an animation-completion assumption.';
if(!s.includes(old))throw Error('Missing audit history text');s=s.replace(old,'The initial native-entry wait exposed a confirmed production interaction defect: keyboard focus interrupted the arrival animation. A later miss through the arch opening was a harness fixture error.');
s=s.replace('intermittent Aim targets on grid boundaries','intermittent Aim targets on grid boundaries and a stale camera matrix');
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
