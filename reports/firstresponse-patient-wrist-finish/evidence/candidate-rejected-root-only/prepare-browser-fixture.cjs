const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const work=__dirname,old=path.join(work,'../firstresponse-support-fit-work'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baselineSHA=sha(fs.readFileSync(path.join(repo,'stem_lab/stem_tool_firstresponse.js')));
function replace(source,a,b){if(source.split(a).length!==2)throw Error('Expected one replacement: '+a.slice(0,120));return source.replace(a,b);}
for(const name of ['face-capture-png.cjs','face-mount-window.cjs','playwright-face.config.cjs']){
 const dst=path.join(work,name);if(fs.existsSync(dst))throw Error('Refusing existing '+name);fs.copyFileSync(path.join(old,name),dst);
}
let source=fs.readFileSync(path.join(old,'firstresponse-face-preview.spec.ts'),'utf8');
source=replace(source,"require('./support-frame-contract.cjs')","require('./patient-wrist-contract.cjs')");
source=replace(source,"const baselineSHA='164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0';",`const baselineSHA='${baselineSHA}';`);
source=replace(source,"function exactUserData(o){var data=JSON.parse(JSON.stringify(o.userData));if(o.name==='fr-patient-right-hand'&&data.inspection)delete data.inspection.faceFrame;return data;}","function exactUserData(o){return JSON.parse(JSON.stringify(o.userData));}");
source=replace(source,"var exactScene=[],noseMaterial=null,headMaterial=model.getObjectByName('fr-manikin-head').material;",`var exactScene=[],wristBuffers=[],noseMaterial=null,headMaterial=model.getObjectByName('fr-manikin-head').material;
      function wristGeometry(o){
        var descriptor=exactGeometry(o.geometry);
        if(o.name!=='fr-patient-left-wrist'&&o.name!=='fr-patient-right-wrist')return descriptor;
        var a=o.geometry.attributes.normal,minLength=Infinity,maxLength=0;
        if(!a||a.itemSize!==3||a.count!==o.geometry.attributes.position.count)throw Error('Missing wrist normal '+o.name);
        for(var i=0;i<a.count;i++){var x=a.getX(i),y=a.getY(i),z=a.getZ(i),length=Math.sqrt(x*x+y*y+z*z);if(!isFinite(length)||Math.abs(length-1)>1e-5)throw Error('Invalid wrist unit normal '+o.name);minLength=Math.min(minLength,length);maxLength=Math.max(maxLength,length);}
        wristBuffers.push({name:o.name,normal:JSON.parse(JSON.stringify(descriptor.attributes.normal)),minLength:minLength,maxLength:maxLength,finiteUnitNormals:true});
        descriptor.attributes.normal.buffer={hash:'[allowed patient wrist normal]',bytes:a.array.byteLength};
        return descriptor;
      }`);
source=replace(source,'geometry:o.geometry?exactGeometry(o.geometry):null','geometry:o.geometry?wristGeometry(o):null');
source=replace(source,"var original=JSON.parse(JSON.stringify(hand.userData.inspection));delete original.faceFrame;","var original=JSON.parse(JSON.stringify(hand.userData.inspection));");
source=replace(source,"return {supportInspection:supportInspection,contact:contact,preservedScene:digest(exactScene)","return {wristBuffers:wristBuffers.sort(function(a,b){return a.name.localeCompare(b.name);}),wristProjection:projected(hand.getObjectByName('fr-patient-right-wrist')),supportInspection:supportInspection,contact:contact,preservedScene:digest(exactScene)");
source=replace(source,'const s=observed.stage,b=observed.canvas,p=value.faceProjection;','const s=observed.stage,b=observed.canvas,p=value.wristProjection;');
source=replace(source,"file=prefix+'-face.png'","file=prefix+'-wrist.png'");
source=replace(source,"test('support frame '+view.id+' preview at native view'","test('patient wrist finish '+view.id+' preview at native view'");
source=replace(source,"if(variant==='baseline')reference=value;else {validateNativePair(reference,value,view.id);validateCandidateFraming(value,view.id);}","validateCandidateFraming(value,view.id);if(variant==='baseline')reference=value;else validateNativePair(reference,value,view.id);");
source=replace(source,'expect(repeat.preservedScene).toEqual(value.preservedScene);','expect(repeat.preservedScene).toEqual(value.preservedScene);expect(repeat.wristBuffers).toEqual(value.wristBuffers);expect(repeat.supportInspection).toEqual(value.supportInspection);');
source=replace(source,"if(view.contrast)expect(disposal.filter((item:any)=>item.name==='fr-patient-nose-skin').map((item:any)=>item.disposeCount)).toEqual([1]);","if(view.contrast){expect(disposal.filter((item:any)=>item.name==='fr-patient-nose-skin').map((item:any)=>item.disposeCount)).toEqual([1]);expect(disposal.filter((item:any)=>item.name==='fr-patient-arm-skin').map((item:any)=>item.disposeCount)).toEqual([1]);}");
if(fs.existsSync(path.join(work,'firstresponse-face-preview.spec.ts')))throw Error('Fixture already exists');fs.writeFileSync(path.join(work,'firstresponse-face-preview.spec.ts'),source);
let runner=fs.readFileSync(path.join(old,'run-face-browser.cjs'),'utf8');
runner=replace(runner,"baselineSHA='164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0'",`baselineSHA='${baselineSHA}'`);
runner=replace(runner,"path.join(work,'support-frame-contract.cjs')","path.join(work,'patient-wrist-contract.cjs')");
runner=replace(runner,"if(id==='adult-wide'&&JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Wide face comparison framing changed '+id);","if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Wrist comparison framing changed '+id);");
runner=replace(runner,"images.filter(p=>p.endsWith('-face.png')).length!==expectedEvidence","images.filter(p=>p.endsWith('-wrist.png')).length!==expectedEvidence");
runner=runner.replaceAll('Missing face crops','Missing wrist crops').replaceAll('Face crop is not same captured frame','Wrist crop is not same captured frame');
runner=replace(runner,"if(id==='adult-wide'&&changedPixels!==0)throw Error('Wide stage pixels changed');if(id!=='adult-wide'&&changedPixels===0)throw Error('Narrow framing had no visible effect');pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height});",`if(!pair[0].contrast&&changedPixels===0)throw Error('Wrist shading had no visible effect '+id);
    const wristA=PNG.sync.read(fs.readFileSync(path.join(report,id+'-baseline-wrist.png'))),wristB=PNG.sync.read(fs.readFileSync(path.join(report,id+'-candidate-wrist.png')));if(wristA.width!==wristB.width||wristA.height!==wristB.height)throw Error('Wrist crop size changed '+id);let wristChangedPixels=0;for(let i=0;i<wristA.data.length;i+=4)if(!wristA.data.subarray(i,i+4).equals(wristB.data.subarray(i,i+4)))wristChangedPixels++;if(!pair[0].contrast&&wristChangedPixels===0)throw Error('Wrist detail had no visible effect '+id);
    pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height,wristChangedPixels,wristTotalPixels:wristA.width*wristA.height});`);
if(fs.existsSync(path.join(work,'run-face-browser.cjs')))throw Error('Runner already exists');fs.writeFileSync(path.join(work,'run-face-browser.cjs'),runner);
console.log(JSON.stringify({prepared:true,baselineSHA,sharedFilesWritten:0}));
