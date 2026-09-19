const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {JSDOM}=require('jsdom');
const React=require(path.resolve('desktop/web-app/node_modules/react'));
const server=require(path.resolve('desktop/web-app/node_modules/react-dom/server'));
const dom=new JSDOM('<!doctype html>');global.window=dom.window;global.document=dom.window.document;global.React=React;
function render(file,data){let cfg;window.StemLab={registerTool:(_id,value)=>cfg=value,ensureThree:()=>new Promise(()=>{})};global.StemLab=window.StemLab;new Function(fs.readFileSync(file,'utf8'))();return server.renderToStaticMarkup(cfg.render({React,toolData:{dinoLab:data},update(){},updateMulti(){},announceToSR(){}})).split('><').join('>\n<');}
(async()=>{
 const {baseData}=await import('../../tests/helpers/dino_lab_harness.js');
 const before=render(process.argv[2]||'reports/dinolab-3d-keratin/renderer-before.js',baseData('field3d'));
 const after=render('stem_lab/stem_tool_dinolab.js',baseData('field3d'));
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const result={beforeSHA256:hash(before),afterSHA256:hash(after),identical:before===after,baselineContainsFullscreenAttribute:before.includes('data-allo-fs-stage="dinolab-field"')};
 if(!result.identical||!result.baselineContainsFullscreenAttribute)throw Error('Unexpected field-station markup change');
 fs.writeFileSync('reports/dinolab-3d-keratin/markup-comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
