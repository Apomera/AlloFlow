'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),slug='rules_and_fairness_grade1',folder=path.join(root,'allopacks/media',slug);
const planned=JSON.parse(fs.readFileSync(path.join(root,'dev-tools/root_rules_assets_20261004.json')));
const captions={
 'rf-img-rules':['simplified','A shared plan begins with everyone having a voice. The adult joins the circle at child height.'],
 'rf-img-safe':['anchor-chart','Holding the rail and stopping at the curb are calm habits that help keep bodies safe.'],
 'rf-img-fair':['anchor-chart','Waiting for a turn can be calm and included. Everyone gets a chance.'],
 'rf-img-two-doors':['memory-aid','Does a rule help keep people safe, make things fair, or do both? Imagine placing a rule by an archway.'],
 'rf-img-who-helps':['memory-aid','Look closely: one child has to stretch farther. Could moving the fruit bowl help everyone reach?'],
 'rf-img-asking':['faq','A child can ask about a plan and explain why it might need to change. Listening is part of deciding together.']
};
const assets=planned.map(a=>{const saved=JSON.parse(fs.readFileSync(path.join(folder,a.id+'.generation.json')));return {...saved,provider:'Built-in image generation',status:'visual-review-pending',...(captions[a.id]?{afterType:captions[a.id][0],caption:captions[a.id][1],labels:a.id==='rf-img-two-doors'?[{text:'Safe',position:'center',anchorX:28,anchorY:7},{text:'Fair',position:'center',anchorX:73,anchorY:7}]:[]}:{} )};});
const m={slug,version:1,revision:'2026-10-04',style:'Bright, simple child-friendly illustrations with inclusive groups',provider:'Built-in image generation',textPolicy:'Text-free raster artwork; captions and labels stay in native editable fields',note:'Visual review completed when asset status is visual-review-passed; educator review pending.',nativeMappings:{glossary:Object.fromEntries(planned.slice(0,10).map(a=>[a.title,a.id])),anchor:{0:'rf-term-safe',1:'rf-term-turn',2:'rf-img-who-helps',3:'rf-term-vote'},sort:{rf1:'rf-term-safe',rf2:'rf-img-safe',rf3:'rf-sort-walk',rf4:'rf-sort-wash',rf5:'rf-term-turn',rf6:'rf-term-share',rf7:'rf-sort-listen',rf8:'rf-img-fair'}},assets};
fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(m,null,2)+'\n');console.log(assets.length);
