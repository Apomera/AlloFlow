const {createRequire}=require('node:module'),crypto=require('node:crypto');
const load=createRequire('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/package.json');
const {PNG}=load('playwright-core/lib/utilsBundle');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function cropPng(buffer,clip,expectedSize){
  const source=PNG.sync.read(buffer);
  if(expectedSize&&(source.width!==expectedSize.width||source.height!==expectedSize.height))throw Error('Screenshot CSS pixel dimensions differ from observed clip');
  const {x,y,width,height}=clip;
  if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||width<1||height<1||x+width>source.width||y+height>source.height)throw Error('Invalid arm crop');
  const target=new PNG({width,height});PNG.bitblt(source,target,x,y,width,height,0,0);
  const output=PNG.sync.write(target),decoded=PNG.sync.read(output);
  for(let row=0;row<height;row++){
    const sourceStart=((y+row)*source.width+x)*4,targetStart=row*width*4;
    if(!source.data.subarray(sourceStart,sourceStart+width*4).equals(decoded.data.subarray(targetStart,targetStart+width*4)))throw Error('Arm crop pixels changed');
  }
  return {buffer:output,proof:{sameCapturedFrame:true,sourceSHA256:sha(buffer),cropSHA256:sha(output),sourceSize:{width:source.width,height:source.height},clip,pixelsVerified:width*height}};
}
module.exports={cropPng};
