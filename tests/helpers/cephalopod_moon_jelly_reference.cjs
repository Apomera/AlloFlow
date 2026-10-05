'use strict';
const assert=require('node:assert/strict');
// Standalone permanent CI helper. Reverse only the approved dome update, not construction or other motion.
const before=String.raw`          for(var vertex=0;vertex<p.length;vertex+=3){var bx=base[vertex],by=base[vertex+1],bz=base[vertex+2],length=Math.sqrt(bx*bx+by*by+bz*bz);if(length<0.001)continue;var rimWeight=Math.max(0,by/0.5),amount=(1-rimWeight*0.4)*(pulse-0.5)*0.18;p[vertex]=bx+(bx/length)*amount;p[vertex+1]=by+(by/length)*amount;p[vertex+2]=bz+(bz/length)*amount;}`;
const after=String.raw`          for(var vertex=0;vertex<p.length;vertex+=3){
            var bx=base[vertex],by=base[vertex+1],bz=base[vertex+2],length=Math.sqrt(bx*bx+by*by+bz*bz);if(length<0.001)continue;
            var rimWeight=Math.max(0,by/0.5),amount=(1-rimWeight*0.4)*(pulse-0.5)*0.18;
            // Flex the dome axially while keeping the original radial lip and its attached anatomy exact.
            var domeWeight=by>0?Math.min(1,by/0.25):0;
            p[vertex]=bx+(bx/length)*amount;
            p[vertex+1]=by+(by/length)*amount-(pulse-0.5)*0.14*domeWeight*domeWeight;
            p[vertex+2]=bz+(bz/length)*amount;
          }`;
function reverseMoonJellyDomeFinish(source){
  assert.equal(typeof source,'string','Moon-jelly reference requires actual runtime text');
  const normalized=source.replace(/\r\n/g,'\n');
  assert.equal(normalized.split(after).length,2,'Exact final moon-jelly dome update must occur once');
  const reference=normalized.replace(after,before);
  assert.equal(reference.split(before).length,2,'Original moon-jelly update must occur once after reversal');
  assert.equal(reference.replace(before,after),normalized,'Moon-jelly reversal must round-trip all source bytes');
  return reference;
}
module.exports={referenceSourceSha256:'f2ef9cbc4c1a9899703bad86da73d2553704bb3953428cdac1b47098a8af3450',before,after,reverseMoonJellyDomeFinish};
