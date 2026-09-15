const fs=require('node:fs'),assert=require('node:assert/strict');
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one anchor '+a.slice(0,100));return s.replace(a,b);}
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n',next=fn(raw.replace(/\r\n/g,'\n'));new Function(next);const data=Buffer.from(next.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}}
edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{
  s=once(s,'  function travelToActivity(engine,activity) {',`  function activityWaypointFor(guide,journal,npcs) {
    if(!guide || !journal || !journal.trackedId || !Array.isArray(npcs))return null;
    var activity=guide.activities.find(function(a){return a.id===journal.trackedId;});
    if(!activity || !activity.npcName || !npcs.some(function(n){return n && n.data && n.data.name===activity.npcName;}))return null;
    return {id:activity.id,lessonKey:guide.key,npcName:activity.npcName,title:activity.title,index:guide.activities.indexOf(activity),count:guide.activities.length};
  }
  function travelToActivity(engine,activity) {`);
  s=once(s,'    activityGuideModel:activityGuideModel,','    activityWaypointFor:activityWaypointFor,\n    activityGuideModel:activityGuideModel,');
  s=once(s,'  function renderLessonMap(h,overview) {','  function renderLessonMap(h,overview,trackedIndex) {');
  s=once(s,"'data-map-activity':s.index},h('circle'","'data-map-activity':s.index,'data-map-tracked':s.index===trackedIndex?'true':undefined},s.index===trackedIndex&&h('circle',{cx:s.point[0],cy:s.point[1],r:13,fill:'none',stroke:'#94702f',strokeWidth:2}),h('circle'");
  s=once(s,"      var activeActivity=guide && (guide.activities.find(function(a){return a.id===journal.selectedId;}) || guide.activities[0]);",`      var activeActivity=guide && (guide.activities.find(function(a){return a.id===journal.selectedId;}) || guide.activities[0]);
      var trackedWaypoint=activityWaypointFor(guide,journal,engine && engine.npcs);
      if(engine)engine._activityWaypoint=trackedWaypoint;`);
  s=once(s,'      function browseActivity(offset){',`      function trackActivity(){
        if(!guide || !activeActivity || !activityWaypointFor(guide,{trackedId:activeActivity.id},engine && engine.npcs))return;
        updateJournal({trackedId:activeActivity.id});closeGuide();
        announce(ctx,'Tracking '+activeActivity.title+'. Follow the highlighted guide on the compass. Press L for directions.','success');
      }
      function stopTrackingActivity(){
        updateJournal({trackedId:null});
        announce(ctx,'Activity tracking stopped. Your notes and review marks are unchanged.','info');
        window.requestAnimationFrame(function(){var button=document.querySelector('.gwe-activity-track');if(button)button.focus();});
      }
      function browseActivity(offset){`);
  s=once(s,"h('summary',null,'See the lesson route'),renderLessonMap(h,lessonOverviewModel(engine && engine._currentLesson)))", "h('summary',null,'See the lesson route'),renderLessonMap(h,lessonOverviewModel(engine && engine._currentLesson),trackedWaypoint?trackedWaypoint.index:null))");
  s=once(s,"          h('label',{htmlFor:'gwe-activity-select'},'Choose an activity'),",`          trackedWaypoint && h('div',{className:'gwe-activity-tracking-state',role:'status'},h('div',null,h('strong',null,'Tracking activity '+(trackedWaypoint.index+1)),h('span',null,trackedWaypoint.title)),h('button',{type:'button','aria-label':'Stop tracking activity',onClick:stopTrackingActivity},'Stop tracking')),
          h('label',{htmlFor:'gwe-activity-select'},'Choose an activity'),`);
  s=once(s,"            h('button',{type:'button',className:'gwe-activity-travel'",`            h('button',{type:'button',className:'gwe-activity-track','aria-label':'Track this activity','aria-pressed':!!(trackedWaypoint&&trackedWaypoint.id===activity.id),disabled:!!(trackedWaypoint&&trackedWaypoint.id===activity.id)||!activityWaypointFor(guide,{trackedId:activity.id},engine&&engine.npcs),onClick:trackActivity},trackedWaypoint&&trackedWaypoint.id===activity.id?'Tracking this activity':'Track this activity'),
            h('button',{type:'button',className:'gwe-activity-travel'`);
  s=once(s,"            activity.hint && h('details'", "            h('p',{className:'gwe-activity-track-help'},'Tracking highlights your guide while you explore. Go to this activity moves you there. Press L in the world for spoken directions.'),\n            activity.hint && h('details'");
  const css='.gwe-activity-tracking-state{display:flex;gap:12px;align-items:center;justify-content:space-between;margin:14px 0;padding:12px;border:1px solid #bba469;border-radius:12px;background:#f4ead1;color:#3e513b}.gwe-activity-tracking-state strong{display:block;font-size:11px;letter-spacing:.02em}.gwe-activity-tracking-state span{display:block;font-size:13px;line-height:1.5;margin-top:3px}.gwe-activity-tracking-state button{flex-shrink:0}.gwe-activity-guide .gwe-activity-track{background:#efe4c4;border-color:#aa9156;color:#394936;margin:0 7px 8px 0}.gwe-activity-guide .gwe-activity-track[aria-pressed=true]{background:#dbe7c9;color:#294c36;border-color:#92aa78;opacity:1}.gwe-activity-track:disabled{cursor:default;opacity:.6}.gwe-activity-track-help{font-size:12px;color:#536757;line-height:1.55;margin:4px 0 12px}.theme-contrast .gwe-activity-tracking-state,[data-stem-theme=contrast] .gwe-activity-tracking-state{background:#000;color:#fff;border:2px solid #ff0}.theme-contrast .gwe-activity-guide .gwe-activity-track,[data-stem-theme=contrast] .gwe-activity-guide .gwe-activity-track{background:#000;color:#0f0;border-color:#ff0}.theme-contrast .gwe-activity-track-help,[data-stem-theme=contrast] .gwe-activity-track-help{color:#fff}@media(max-width:420px){.gwe-activity-tracking-state{align-items:flex-start;flex-direction:column}.gwe-activity-tracking-state button{width:100%}.gwe-activity-guide .gwe-activity-track,.gwe-activity-guide .gwe-activity-travel{width:100%;margin:0 0 8px}}';
  s=once(s,'      ".gwe-home-backdrop',JSON.stringify(css)+',\n      ".gwe-home-backdrop');return s;
});
edit('stem_lab/stem_tool_geometryworld.js',s=>{
  s=once(s,"      : 'Every question here is answered. ';","      : list.some(function(e){return e.hasQuestion;}) ? 'Every question here is answered. ' : 'These guides offer exploration without scored questions. ';");
  s=once(s,'  function gwChatKey(lesson) {',`  function summarizeActivityWaypoint(entries,waypoint) {
    if(!waypoint || !waypoint.npcName)return '';
    var entry=(entries||[]).find(function(e){return e&&e.name===waypoint.npcName&&isFinite(e.distance)&&isFinite(e.bearingDeg);});
    if(!entry)return '';
    var steps=Math.max(1,Math.round(entry.distance));
    return 'Tracked activity: '+String(waypoint.title||waypoint.npcName).slice(0,180)+'. '+entry.name+' is '+steps+' step'+(steps===1?'':'s')+' '+describeBearing(entry.bearingDeg)+'.';
  }
  function gwChatKey(lesson) {`);
  s=once(s,'          announceToSR(summarizeNearbyNpcs(entries, 4));',"          var trackedText=summarizeActivityWaypoint(entries,engine._activityWaypoint);\n          if(trackedText)announceToSR(trackedText);else announceToSR(summarizeNearbyNpcs(entries, 4));");
  s=once(s,'          engine._currentLesson = lesson;', '          engine._currentLesson = lesson;\n          engine._activityWaypoint = null;');
  s=once(s,"npc.name + ' — ' + npc.prompt", "npc.name + ' — ' + npc.prompt + (engine._activityWaypoint && engine._activityWaypoint.npcName===npc.name?' · Tracked activity':'')");
  s=once(s,"Walk near a purple character and tap the \\uD83D\\uDDE3\\uFE0F button.","Move close to a guide, then tap Talk.");
  s=once(s,'Walk up to a purple character and press E to talk.','Move close to a guide and press E to talk. Escape frees your cursor.');
  s=once(s,'Point at the blue blocks and tap the \\uD83D\\uDCCF button.','Aim at a teaching model and tap Measure.');
  s=once(s,'Point at the blue blocks and press M to measure.','Aim at a teaching model and press M to measure.');
  s=once(s,'Point at a block and tap the \\uD83E\\uDDF1 button to place!','Aim at nearby ground or a block face, then tap Place.');
  s=once(s,'Right-click on any block face to place a new block!','Aim at nearby ground or a block face, then press B or right-click to place.');
  return s;
});
console.log('Explicit activity tracking, spoken directions, and clearer tutorial guidance integrated.');
