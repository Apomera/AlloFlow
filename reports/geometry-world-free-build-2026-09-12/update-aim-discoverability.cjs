const fs=require('node:fs'),file='tests/geometry_world_discoverability.test.js';
const original=fs.readFileSync(file,'utf8'),nl=original.includes('\r\n')?'\r\n':'\n';let source=original.replace(/\r\n/g,'\n');
const before=`    // yaw kept: still facing -z
    expect(after.z).toBeLessThan(0);
    expect(Math.abs(after.x)).toBeLessThan(0.05);`;
const after=`    // Still facing forward, with a small turn toward the center of the
    // clear ground cell instead of the ambiguous boundary at X=2 and Z=-1.
    const centeredDirection = new THREE.Vector3(0.5, -2, -2.5).normalize();
    expect(after.z).toBeLessThan(0);
    expect(after.dot(centeredDirection)).toBeCloseTo(1, 7);`;
if(source.split(before).length!==2)throw Error('Expected one legacy Aim yaw assertion');
source=source.replace(before,after);const output=Buffer.from(source.replace(/\n/g,nl)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,output,0,output.length,0);fs.ftruncateSync(fd,output.length);}finally{fs.closeSync(fd);}console.log('Updated Aim expectation to the safe ground-cell center.');
