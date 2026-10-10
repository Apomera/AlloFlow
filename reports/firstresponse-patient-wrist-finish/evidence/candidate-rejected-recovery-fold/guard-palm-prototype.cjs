const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');const work=__dirname,hash=x=>crypto.createHash('sha256').update(x).digest('hex'),source=fs.readFileSync(path.join(work,'candidate.js'),'utf8'),delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8'));
assert.equal(hash(source),'d4725c626419fa41febae7314032ba117a49484efe41061be5a2a5888b1fd384');
const old='              normal.lerp(fitted.normalize(), weight).normalize().multiply(wrist.scale).normalize();';
const next=`              fitted.normalize();
              var alignment = Math.max(0, Math.min(1, (normal.dot(fitted) - .15) / .30));
              weight *= alignment * alignment * (3 - 2 * alignment);
              if (weight <= 0) break;
              normal.lerp(fitted, weight).normalize().multiply(wrist.scale).normalize();`;
assert.equal(source.split(old).length,2);assert.equal(delta.edits[0].new.split(old).length,2);fs.mkdirSync(path.join(work,'palm-prototype-diagnostics'),{recursive:true});for(const name of ['candidate.js','delta.json','palm-prototype-scope.json'])fs.copyFileSync(path.join(work,name),path.join(work,'palm-prototype-diagnostics',name));const candidate=source.replace(old,next);new Function(candidate);delta.edits[0].new=delta.edits[0].new.replace(old,next);delta.afterSHA256=hash(candidate);fs.writeFileSync(path.join(work,'candidate.js'),candidate);fs.writeFileSync(path.join(work,'delta.json'),JSON.stringify(delta,null,2)+'\n');assert.equal(hash(fs.readFileSync(path.join(work,'candidate.js'))),delta.afterSHA256);console.log(JSON.stringify({candidateSHA256:delta.afterSHA256,bytes:Buffer.byteLength(candidate)}));
