const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one anchor: '+a.slice(0,100));return s.replace(a,b);}
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n',next=fn(raw.replace(/\r\n/g,'\n'));new Function(next);const data=Buffer.from(next.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}}
edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{
  s=once(s,'  function activityGuideModel(lesson) {',fs.readFileSync(path.join(__dirname,'lesson-overview.js'),'utf8')+'\n  function activityGuideModel(lesson) {');
  s=once(s,'    activityGuideModel:activityGuideModel,','    lessonOverviewModel:lessonOverviewModel,\n    activityGuideModel:activityGuideModel,');
  s=once(s,'      function renderHome(){',`      function renderLessonPreview(lesson){
        var overview=lessonOverviewModel(lesson);
        return h('article',{className:'gwe-home-preview gwe-home-preview--route'},
          h('div',{className:'gwe-home-lesson-copy'},h('h2',null,lesson.title),h('p',null,lesson.description),renderLessonFacts(h,overview),
            lesson.objectives && h('ul',{className:'gwe-home-goals'},lesson.objectives.slice(0,3).map(function(o,i){return h('li',{key:i},o);}))),
          renderLessonMap(h,overview));
      }
      function renderHome(){`);
  const preview="lesson && h('article',{className:'gwe-home-preview'},h('span',{className:'gwe-home-detail-art'},homeArt(homePage)),h('div',null,h('h2',null,lesson.title),h('p',null,lesson.description),lesson.objectives && h('ul',null,lesson.objectives.slice(0,3).map(function(o,i){return h('li',{key:i},o);}))))";
  s=once(s,preview,'lesson && renderLessonPreview(lesson)');
  s=once(s,'      function closeGuide(){patchGeometryState(ctx,{objectivesOpen:false});}',`      function closeGuide(){patchGeometryState(ctx,{objectivesOpen:false});}
      function browseActivity(offset){
        if(!guide || !activeActivity)return;
        var index=guide.activities.indexOf(activeActivity)+offset;
        if(index<0 || index>=guide.activities.length)return;
        updateJournal({selectedId:guide.activities[index].id});
        window.requestAnimationFrame(function(){var title=document.getElementById('gwe-active-activity-title');if(title)title.focus();});
      }`);
  s=once(s,'        var activity=activeActivity,notes=journal.notes || {},reviewed=journal.reviewed || {};','        var activity=activeActivity,notes=journal.notes || {},reviewed=journal.reviewed || {},activityIndex=guide.activities.indexOf(activity);');
  s=once(s,"          h('label',{htmlFor:'gwe-activity-select'},'Choose an activity'),", "          h('details',{className:'gwe-activity-route'},h('summary',null,'See the lesson route'),renderLessonMap(h,lessonOverviewModel(engine && engine._currentLesson))),\n          h('label',{htmlFor:'gwe-activity-select'},'Choose an activity'),");
  s=once(s,"h('article',{key:activity.id,className:'gwe-activity-card'},h('h3',null,activity.title),", "h('article',{key:activity.id,className:'gwe-activity-card'},h('p',{className:'gwe-activity-position'},'ACTIVITY '+(activityIndex+1)+' OF '+guide.activities.length),h('h3',{id:'gwe-active-activity-title',tabIndex:-1},activity.title),");
  s=once(s,"          h('footer',null,h('button',{type:'button',onClick:function(){downloadBlob(new Blob([JSON.stringify({schema:'alloflow-geometry-journal/1'", `          h('nav',{className:'gwe-activity-pager','aria-label':'Activity navigation'},
            h('button',{type:'button','aria-label':'Previous activity',disabled:activityIndex===0,onClick:function(){browseActivity(-1);}},'← Previous'),
            h('span',{role:'status','aria-live':'polite'},(activityIndex+1)+' / '+guide.activities.length),
            h('button',{type:'button','aria-label':'Next activity',disabled:activityIndex===guide.activities.length-1,onClick:function(){browseActivity(1);}},'Next →')),
          h('footer',null,h('button',{type:'button',onClick:function(){downloadBlob(new Blob([JSON.stringify({schema:'alloflow-geometry-journal/1'`);
  const css='.gwe-home-preview.gwe-home-preview--route{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(180px,.85fr);align-items:center;gap:24px;background:linear-gradient(135deg,#edf1df,#e0eadb);padding:24px}.gwe-home-lesson-copy{min-width:0}.gwe-home .gwe-lesson-facts{display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none;margin:14px 0}.gwe-home .gwe-lesson-facts li{padding:5px 9px;border:1px solid #92a78777;border-radius:999px;background:#fffdf187;color:#36543e;font-size:11px;font-weight:650;line-height:1.4}.gwe-lesson-map{margin:0;min-width:0}.gwe-lesson-map svg{width:100%;height:auto;display:block;border:1px solid #92a78777;border-radius:16px;box-sizing:border-box}.gwe-lesson-map figcaption{text-align:center;font-size:11px;line-height:1.5;color:#47654f;margin-top:8px}.gwe-home .gwe-home-goals{font-size:12px;padding-left:18px;margin-top:12px}.gwe-activity-route{margin:14px 0}.gwe-activity-route .gwe-lesson-map{max-width:380px;margin:12px auto}.gwe-activity-position{font-size:10px;letter-spacing:.09em;font-weight:800;color:#587357;margin:0 0 8px}.gwe-activity-pager{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:14px;align-items:center;margin:0 0 18px}.gwe-activity-pager>span{font-size:12px;font-variant-numeric:tabular-nums;color:#4d654f}.gwe-activity-pager button:disabled{opacity:.45;cursor:default}.gwe-activity-pager button:last-child{background:#254c3a;color:#fffef3}.theme-contrast .gwe-lesson-facts li,[data-stem-theme=contrast] .gwe-lesson-facts li{background:#000!important;color:#fff!important;border-color:#0ff!important}.theme-contrast .gwe-lesson-map figcaption,[data-stem-theme=contrast] .gwe-lesson-map figcaption{color:#fff}.theme-contrast .gwe-lesson-map svg,[data-stem-theme=contrast] .gwe-lesson-map svg{border:2px solid #0ff}.theme-contrast .gwe-activity-pager>span,[data-stem-theme=contrast] .gwe-activity-pager>span{color:#fff}@media(max-width:600px){.gwe-home-preview.gwe-home-preview--route{grid-template-columns:1fr;padding:18px;gap:18px}.gwe-home-preview--route .gwe-lesson-map{width:100%;max-width:340px;justify-self:center}}@media(max-width:360px){.gwe-activity-pager{gap:8px}.gwe-activity-pager button{padding:10px 8px;font-size:12px}}';
  s=once(s,'      ".gwe-home-backdrop',JSON.stringify(css)+',\n      ".gwe-home-backdrop');
  return s;
});
edit('stem_lab/stem_tool_geometryworld.js',s=>{
  const pattern=/return \{id:(id|l\._id),title:(l\.title(?: \|\| 'Saved lesson')?),description:(l\.description(?: \|\| '')?),objectives:l\.objectives \|\| \[\]\};/g;
  let count=0;s=s.replace(pattern,(_,id,title,description)=>{count++;return 'return {id:'+id+',title:'+title+',description:'+description+',objectives:l.objectives || [],ground:l.ground,structures:l.structures || [],activities:l.activities || [],npcs:l.npcs || [],estimatedMinutes:l.estimatedMinutes,depth:l.depth,landscapeTheme:l.landscapeTheme};';});assert.equal(count,2,'Expected both Home metadata mappings');return s;
});
console.log('Lesson route previews and deliberate Previous/Next activity navigation integrated.');
