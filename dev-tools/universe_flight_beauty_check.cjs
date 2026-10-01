const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const repo=process.env.UNIVERSE_REPO||path.resolve(__dirname,'..');
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const phase=process.argv[2]||'refined';
assert.ok(['baseline','refined'].includes(phase),'Use baseline or refined');
const report=process.env.UNIVERSE_BEAUTY_REPORT||path.join(repo,'reports/universe-flight-2026-09-29');fs.mkdirSync(report,{recursive:true});
const output=path.join(report,'beauty-'+phase+'.json');
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');

function pngPixels(buffer){
  assert.equal(buffer.subarray(1,4).toString(),'PNG');
  let width,height,channels,offset=8;const parts=[];
  while(offset<buffer.length){
    const length=buffer.readUInt32BE(offset),type=buffer.subarray(offset+4,offset+8).toString(),data=buffer.subarray(offset+8,offset+8+length);offset+=length+12;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;assert.equal(data[12],0);}
    else if(type==='IDAT')parts.push(data);else if(type==='IEND')break;
  }
  const raw=zlib.inflateSync(Buffer.concat(parts)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){
    const filter=raw[y*(stride+1)],index=y*stride+x,a=x>=channels?pixels[index-channels]:0,b=y?pixels[index-stride]:0,c=y&&x>=channels?pixels[index-stride-channels]:0;
    assert.ok(filter<=4);const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
    pixels[index]=(raw[y*(stride+1)+1+x]+predictor)&255;
  }
  return {width,height,channels,pixels};
}
function stats(image,box=[0,0,1,1]){
  const x0=Math.floor(box[0]*image.width),y0=Math.floor(box[1]*image.height),x1=Math.ceil(box[2]*image.width),y1=Math.ceil(box[3]*image.height);
  let count=0,sum=0,sum2=0,red=0,blue=0,luminous=0,colored=0,clipped=0,edge=0,edgeCount=0,max=0;
  const rgb=(x,y)=>{const index=(y*image.width+x)*image.channels;return [image.pixels[index],image.pixels[index+1],image.pixels[index+2]];};
  for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
    const [r,g,b]=rgb(x,y),level=.2126*r+.7152*g+.0722*b;count++;sum+=level;sum2+=level*level;red+=r;blue+=b;max=Math.max(max,r,g,b);
    if(level>8)luminous++;if(Math.max(r,g,b)-Math.min(r,g,b)>8)colored++;if(Math.min(r,g,b)>=250)clipped++;
    if(x+2<x1){const [r2,g2,b2]=rgb(x+2,y);edge+=Math.abs(level-(.2126*r2+.7152*g2+.0722*b2));edgeCount++;}
    if(y+2<y1){const [r2,g2,b2]=rgb(x,y+2);edge+=Math.abs(level-(.2126*r2+.7152*g2+.0722*b2));edgeCount++;}
  }
  const mean=sum/count;return {pixelsSampled:count,mean,luminanceStd:Math.sqrt(Math.max(0,sum2/count-mean*mean)),adjacentContrast:edge/edgeCount,luminousFraction:luminous/count,colorFraction:colored/count,clippedWhiteFraction:clipped/count,meanRed:red/count,meanBlue:blue/count,max};
}
function difference(a,b){
  assert.equal(a.width,b.width);assert.equal(a.height,b.height);let count=0,changed=0,sum=0;
  for(let y=0;y<a.height;y+=2)for(let x=0;x<a.width;x+=2){const ai=(y*a.width+x)*a.channels,bi=(y*b.width+x)*b.channels;const d=(Math.abs(a.pixels[ai]-b.pixels[bi])+Math.abs(a.pixels[ai+1]-b.pixels[bi+1])+Math.abs(a.pixels[ai+2]-b.pixels[bi+2]))/3;count++;sum+=d;if(d>4)changed++;}
  return {changedFraction:changed/count,meanAbsolute:sum/count};
}

(async()=>{
  const result={phase,completed:false,sourceHash:digest(fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'))),checks:[],errors:[],captures:[],stability:[],graphics:[],lifecycle:[],comparison:[]};
  const save=()=>fs.writeFileSync(output,JSON.stringify(result,null,2));save();
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',error=>result.errors.push(String(error)));
    await page.addInitScript(()=>{
      window.__beautyGL=[];window.__beautyScenes=[];window.__beautyLayer='full';
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        const gl=getContext.call(this,type,...args);if(type!=='webgl'||!gl||gl.__beautyProbe)return gl;
        gl.__beautyProbe=true;const record={created:0,deleted:0,textures:[],uploads:[]};window.__beautyGL.push({gl,record});
        const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl),upload=gl.texImage2D.bind(gl),draw=gl.drawArrays.bind(gl);
        gl.createTexture=function(){const texture=create();record.created++;record.textures.push(texture);return texture;};
        gl.deleteTexture=function(texture){if(texture)record.deleted++;return remove(texture);};
        gl.texImage2D=function(...args){
          const data=args[8];if(args.length===9&&Number.isInteger(args[3])&&Number.isInteger(args[4])){
            const item={width:args[3],height:args[4],format:args[6],type:args[7]};
            if(data&&args[6]===gl.RGBA&&data.BYTES_PER_ELEMENT===1){let zero=0,partial=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)zero++;else if(data[i]===255)opaque++;else partial++;}const count=data.length/4;item.alpha={transparentFraction:zero/count,partialFraction:partial/count,opaqueFraction:opaque/count,corners:[data[3],data[(args[3]-1)*4+3],data[((args[4]-1)*args[3])*4+3],data[data.length-1]]};}
            record.uploads.push(item);
          }return upload(...args);
        };
        gl.drawArrays=function(mode,...args){if(window.__beautyLayer==='surface'&&mode===gl.POINTS)return;if(window.__beautyLayer==='population'&&mode===gl.TRIANGLES)return;return draw(mode,...args);};return gl;
      };
      let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const telemetry=options.onTelemetry,status=options.onStatus;const scene=create.call(this,canvas,Object.assign({},options,{onTelemetry(info){window.__beautyInfo=info;if(telemetry)telemetry(info);},onStatus(info){window.__beautyStatus=info;if(status)status(info);}}));window.__beautyScene=scene;window.__beautyScenes.push(scene);return scene;};api=value;}});
    });
    await page.goto('file:///'+path.join(repo,'reports/universe-flight-2026-09-29/preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>window.__beautyScene&&window.__beautyStatus?.state==='ready');
    await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const views=[
      {name:'cloud-origin',region:'neighborhood',position:[0,0,0],aim:[0,0,34],fov:75},
      {name:'cloud-near',region:'neighborhood',position:[13,-7,24],aim:[9,-2,34],fov:75},
      {name:'galaxy-portrait',region:'galaxy',position:[0,0,-95000],aim:[0,0,0],fov:65},
      {name:'galaxy-arrival',region:'galaxy',position:[0,5442,-17135],aim:[0,0,0],fov:65},
      {name:'cosmic-field',region:'cosmic',position:[0,0,-2200000],aim:[0,0,0],fov:60},
      {name:'cosmic-primary',region:'cosmic',position:[0,0,-650000],aim:[0,0,0],fov:50},
      {name:'cosmic-companion',region:'cosmic',position:[-480000,190000,900000],aim:[-480000,190000,1300000],fov:45},
      {name:'cosmic-distant',region:'cosmic',position:[2100000,-800000,3800000],aim:[2100000,-800000,4200000],fov:45},
      {name:'cosmic-golden',region:'cosmic',position:[800000,550000,450000],aim:[800000,550000,850000],fov:45}
    ];
    async function pose(view,{quality='auto',exposure=1,mode='explore',beta=.9,compareRest=false,layer='full'}={}){
      await page.evaluate(({view,quality,exposure,mode,beta,compareRest,layer})=>{const scene=window.__beautyScene,saved=scene.snapshot(),delta=view.aim.map((value,index)=>value-view.position[index]);Object.assign(saved.settings,{region:view.region,mode,fov:view.fov,quality,exposure,beta,compareRest});Object.assign(saved.state,{position:view.position,yaw:Math.atan2(delta[0],delta[2]),pitch:Math.asin(delta[1]/Math.hypot(...delta)),distanceLy:0,universeYears:0,travelerYears:0});saved.targetId=null;if(!scene.restore(saved))throw new Error('Beauty viewpoint rejected: '+view.name);scene.set({running:false});window.__beautyLayer=layer;},{view,quality,exposure,mode,beta,compareRest,layer});await nextDraw();
    }
    async function capture(name){
      const capture=await page.evaluate(()=>window.__beautyScene.capture());assert.ok(capture?.dataUrl.startsWith('data:image/png;base64,'));const buffer=Buffer.from(capture.dataUrl.split(',')[1],'base64'),image=pngPixels(buffer),full=stats(image),center=stats(image,[.35,.30,.65,.70]);
      assert.ok(full.max>32&&full.luminousFraction>.0001,'The actual '+name+' rendering contains visible structure');fs.writeFileSync(path.join(report,phase+'-'+name+'.png'),buffer);
      const errors=await page.evaluate(()=>window.__beautyGL.map(({gl})=>gl.getError()));assert.ok(errors.every(value=>value===0),'Live rendering has no WebGL errors');result.graphics.push({name,errors});result.captures.push({name,width:image.width,height:image.height,pixelHash:digest(image.pixels),snapshot:capture.snapshot,full,center});save();return image;
    }
    for(const view of views){
      await pose(view);const first=await capture(view.name);
      if(view.name==='cloud-origin'||view.name==='cloud-near'||view.name==='galaxy-arrival'){
        const frozen=await page.evaluate(()=>window.__beautyScene.snapshot());await page.waitForTimeout(180);const second=await page.evaluate(()=>window.__beautyScene.capture());const image=pngPixels(Buffer.from(second.dataUrl.split(',')[1],'base64'));assert.deepEqual(image.pixels,first.pixels,'Paused '+view.name+' contains stable texture detail across separate frames');assert.deepEqual(second.snapshot,frozen,'Paused visual capture preserves the camera and clocks');result.stability.push({name:view.name,identicalPixels:true});
      }
      result.checks.push(view.name+' renders a visible paused world-space view');
    }
    for(const name of ['cosmic-companion','cosmic-distant'])for(const layer of ['surface','population']){const view=views.find(view=>view.name===name);await pose(view,{layer});await capture(name+'-'+layer);result.checks.push(name+' '+layer+' retains visible geometry in the same viewpoint');}
    for(const name of ['cloud-near','galaxy-arrival'])for(const quality of ['auto','low']){const view=views.find(view=>view.name===name);await pose(view,{quality,exposure:2});await capture(name+'-'+quality+'-exposure2');result.checks.push(name+' '+quality+' renders the high-exposure stress view');}
    await pose(views[0],{mode:'relativity',beta:.99});await capture('light-chase-shifted');const physical=await page.evaluate(()=>window.__beautyScene.snapshot());await pose(views[0],{mode:'relativity',beta:.99,compareRest:true});await capture('light-chase-unshifted');const unshifted=await page.evaluate(()=>window.__beautyScene.snapshot());assert.deepEqual(unshifted.state,physical.state,'Sky comparison keeps position, orientation, and clocks unchanged');assert.equal(unshifted.settings.fov,physical.settings.fov);assert.equal(unshifted.settings.beta,physical.settings.beta);result.checks.push('photometric and spectrum display preserve the physical camera state');
    result.math=await page.evaluate(()=>{const m=UniverseFlight.math;return {gamma:m.gamma(.99),doppler:m.doppler(.5,.9),aberrate:m.aberrate([.4,-.2,.7],.99),spectrum:m.viewSpectrum(.99,.3,-.2,550),clock:m.lightClock(.99,1)};});assert.ok(Math.abs(result.math.gamma-1/Math.sqrt(1-.99*.99))<1e-12);result.checks.push('relativity and spectrum mathematics remain numerically valid');
    const textures=await page.evaluate(()=>window.__beautyGL.map(({gl,record})=>({created:record.created,deleted:record.deleted,live:record.textures.filter(texture=>gl.isTexture(texture)).length,uploads:record.uploads})));
    for(const context of textures)for(const upload of context.uploads){assert.ok(upload.width>0&&upload.height>0&&(upload.width&(upload.width-1))===0&&(upload.height&(upload.height-1))===0,'The actual shared rendering texture uses power-of-two dimensions');if(upload.alpha){assert.ok(upload.alpha.transparentFraction>0&&upload.alpha.partialFraction>0,'Emission texture combines transparent space and soft partial coverage');}}
    result.lifecycle.push({stage:'before-dispose',contexts:textures});result.checks.push('shared power-of-two emission texture uploads have transparent and feathered coverage');
    await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.getByRole('button',{name:'Close flight explorer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.uf-stage'));
    const released=await page.evaluate(()=>window.__beautyGL.map(({gl,record})=>({created:record.created,deleted:record.deleted,live:record.textures.filter(texture=>gl.isTexture(texture)).length})));assert.ok(released.every(context=>context.live===0&&context.created===context.deleted),'Closing the explorer releases every actual GPU texture');result.lifecycle.push({stage:'disposed',contexts:released});
    await page.getByRole('button',{name:'Open 3D flight',exact:true}).click();await page.waitForFunction(()=>window.__beautyScenes.length===2&&window.__beautyStatus?.state==='ready');await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await pose(views[0]);const reopened=await capture('reopened-cloud-origin'),original=pngPixels(fs.readFileSync(path.join(report,phase+'-cloud-origin.png')));assert.deepEqual(reopened.pixels,original.pixels,'Reopening deterministically reproduces the original clouds');result.checks.push('textures dispose and rebuild without changing paused cloud detail');
    if(phase==='refined'){
      const baseline=JSON.parse(fs.readFileSync(path.join(report,'beauty-baseline.json'),'utf8'));assert.equal(baseline.completed,true);assert.deepEqual(result.math,baseline.math,'The visual pass leaves numerical relativity, spectrum, and clock results unchanged');
      for(const item of result.captures){const prior=baseline.captures.find(capture=>capture.name===item.name);if(!prior)continue;const oldImage=pngPixels(fs.readFileSync(path.join(report,'baseline-'+item.name+'.png'))),newImage=pngPixels(fs.readFileSync(path.join(report,'refined-'+item.name+'.png')));result.comparison.push({name:item.name,difference:difference(oldImage,newImage),clippedWhiteBefore:prior.full.clippedWhiteFraction,clippedWhiteAfter:item.full.clippedWhiteFraction,centerContrastBefore:prior.center.adjacentContrast,centerContrastAfter:item.center.adjacentContrast,centerLuminanceStdBefore:prior.center.luminanceStd,centerLuminanceStdAfter:item.center.luminanceStd});}
      for(const name of ['galaxy-arrival-auto-exposure2','galaxy-arrival-low-exposure2']){const item=result.comparison.find(item=>item.name===name);assert.ok(item.clippedWhiteAfter<=item.clippedWhiteBefore+.002,'Bright-core refinement retains at least the baseline highlight headroom');}
      result.checks.push('refinement preserves bright-core highlight headroom at balanced and low resolution');
    }
    assert.deepEqual(result.errors,[]);result.completed=true;save();console.log('Beauty '+phase+' checks passed: '+result.checks.length+' groups, '+result.captures.length+' actual PNG captures, '+result.stability.length+' stable paused views.');
  }catch(error){result.failure=String(error);save();throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
