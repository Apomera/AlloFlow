  var ACTIVITY_SNAPSHOT_LIMIT = 1500;
  var ACTIVITY_JOURNAL_BLOCK_LIMIT = 6000;
  function normalizeActivityBuildGoal(value) {
    var api=window.StemLab && window.StemLab.geometryWorldLessonChecks;
    return api && api.normalizeBuildGoal ? api.normalizeBuildGoal(value) : null;
  }
  function activityBuildFacts(blocks) {
    if(!Array.isArray(blocks) || !blocks.length || blocks.length>ACTIVITY_SNAPSHOT_LIMIT)return null;
    var volumes={cube:1,halfA:.5,halfB:.5,quarter:.25},seen=Object.create(null),footprint=Object.create(null);
    var minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity,volume=0,partial=false;
    for(var i=0;i<blocks.length;i++){
      var b=blocks[i];
      if(!b || ![b.x,b.y,b.z].every(function(n){return typeof n==='number' && isFinite(n) && Math.round(n)===n && Math.abs(n)<=1500;}) || !Object.prototype.hasOwnProperty.call(volumes,b.shape) || seen[keyFor(b)])return null;
      seen[keyFor(b)]=true;footprint[b.x+','+b.z]=true;volume+=volumes[b.shape];partial=partial || b.shape!=='cube';
      minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);minZ=Math.min(minZ,b.z);
      maxX=Math.max(maxX,b.x+1);maxZ=Math.max(maxZ,b.z+1);maxY=Math.max(maxY,b.y+(b.shape==='halfB'||b.shape==='quarter'?.5:1));
    }
    // Every supported shape has a complete square X/Z base, including wedges.
    // Count the union of these projected cells, not the enclosing rectangle.
    return {blockCount:blocks.length,occupiedVolume:volume,footprintArea:Object.keys(footprint).length,width:maxX-minX,depth:maxZ-minZ,height:maxY-minY,unitCubesOnly:!partial};
  }
  function activityGoalDescription(goal) {
    goal=normalizeActivityBuildGoal(goal);if(!goal)return '';
    var labels={blockCount:'blocks',occupiedVolume:'cubic units of occupied volume',footprintArea:'square units of footprint',width:'units wide (X)',depth:'units deep (Z)',height:'units high'};
    return (goal.comparator==='gte'?'At least ':goal.comparator==='lte'?'At most ':'Exactly ')+goal.target+' '+labels[goal.metric]+(goal.unitCubesOnly?' using full cubes':'');
  }
  function evaluateActivityBuildGoal(goal,blocks) {
    goal=normalizeActivityBuildGoal(goal);var facts=activityBuildFacts(blocks);
    if(!goal)return {status:'unavailable',message:'This is an open-ended design task. Use the success criteria and your explanation to review it.'};
    if(!facts)return {status:'unavailable',message:'Select a complete student build before checking. No result was recorded.'};
    var actual=facts[goal.metric],matched=goal.comparator==='eq'?Math.abs(actual-goal.target)<1e-8:goal.comparator==='gte'?actual>=goal.target:actual<=goal.target;
    if(goal.unitCubesOnly && !facts.unitCubesOnly)matched=false;
    var units={blockCount:'blocks',occupiedVolume:'cubic units',footprintArea:'square units',width:'units wide',depth:'units deep',height:'units high'};
    return {status:matched?'met':'revise',actual:actual,goal:goal,facts:facts,message:'Selected build: '+actual+' '+units[goal.metric]+'. Goal: '+activityGoalDescription(goal)+'. '+(goal.unitCubesOnly&&!facts.unitCubesOnly?'This task asks for full cubes; the selection includes fractional pieces.':matched?'This numeric target is met.':'Keep revising this measurement.')+' Review the other design criteria yourself.'};
  }
  function captureActivityBuild(engine,now) {
    var selected=engine && engine._builderSelection;
    if(!selected || !Array.isArray(selected.blocks) || !selected.blocks.length)return {ok:false,error:'Select your activity build first. Aim at your own blocks and choose Select aimed build.'};
    var refreshed=selectionMeasurement(engine);
    if(!refreshed)return {ok:false,error:'The selected build is missing or cannot be measured completely. Select your activity build again.'};
    selected=engine._builderSelection;
    if(selected.blocks.length>ACTIVITY_SNAPSHOT_LIMIT)return {ok:false,error:'Snapshots support complete selections up to '+ACTIVITY_SNAPSHOT_LIMIT+' blocks. Select a smaller activity build.'};
    var blocks=[],seen=Object.create(null);
    for(var i=0;i<selected.blocks.length;i++){
      var p=selected.blocks[i],mesh=engine.blocks && engine.blocks[keyFor(p)],u=mesh && mesh.userData;
      if(!u || !isStudentBlock(u) || u._lessonBlock)return {ok:false,error:'The selection changed or contains protected lesson blocks. Select your student build again.'};
      if(seen[keyFor(p)])continue;seen[keyFor(p)]=true;
      if(BLOCK_SHAPES.every(function(shape){return shape.id!==(u.shape || 'cube');}))return {ok:false,error:'The selection contains an unsupported shape and cannot be checked exactly.'};
      blocks.push({x:p.x,y:p.y,z:p.z,type:validBlockType(u.blockType,false),shape:u.shape || 'cube',rotation:normalizedRotation(u.rotation)});
    }
    blocks.sort(compareBlocks);var facts=activityBuildFacts(blocks);
    if(!facts)return {ok:false,error:'The complete selection could not be checked. Select your activity build again.'};
    return {ok:true,snapshot:{capturedAt:typeof now==='string'?now:new Date().toISOString(),blocks:blocks,facts:facts}};
  }
  function updateActivityEvidence(all,lessonKey,activityId,patch) {
    var next=Object.assign({},all || {}),journal=Object.assign({},next[lessonKey] || {}),evidence=Object.assign({},journal.evidence || {});
    evidence[activityId]=Object.assign({},evidence[activityId] || {},patch);journal.evidence=evidence;next[lessonKey]=journal;
    var keys=Object.keys(next).filter(function(key){return key!==lessonKey;});while(Object.keys(next).length>30)delete next[keys.shift()];
    var total=0;
    Object.keys(next).forEach(function(key){var entries=next[key] && next[key].evidence || {};Object.keys(entries).forEach(function(id){['before','after'].forEach(function(stage){var snapshot=entries[id] && entries[id][stage];if(snapshot && Array.isArray(snapshot.blocks))total+=snapshot.blocks.length;});});});
    if(total>ACTIVITY_JOURNAL_BLOCK_LIMIT)return {ok:false,error:'The local journal holds up to '+ACTIVITY_JOURNAL_BLOCK_LIMIT+' saved blocks. Download your portfolio, then clear older snapshots before saving another.'};
    return {ok:true,value:next};
  }
  function activityEscape(value) { return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function activitySnapshotSvg(snapshot) {
    var blocks=snapshot && snapshot.blocks;if(!activityBuildFacts(blocks))return '';
    var palette={stone:'#9aa99d',wood:'#ad8860',diamond:'#6bbcc6',gold:'#d8b45e',sand:'#dfcba0',glass:'#b6d4cb',water:'#7bb5c7',brick:'#bb8570',ice:'#c4dedb',lava:'#d58c61',torch:'#deb670'};
    var projected=[],minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    function point(x,y,z){var p=[(x-z)*.866,(x+z)*.5-y];minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);return p;}
    blocks.slice().sort(function(a,b){return (a.x+a.z)-(b.x+b.z)||a.y-b.y;}).forEach(function(b){
      var height=b.shape==='halfB'||b.shape==='quarter'?.5:1;
      var faces=b.shape==='halfA'?[[[0,0,0],[1,1,0],[1,1,1],[0,0,1]],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]],[[0,0,1],[1,0,1],[1,1,1]]]:b.shape==='quarter'?[[[0,0,0],[.5,.5,0],[.5,.5,1],[0,0,1]],[[.5,.5,0],[1,0,0],[1,0,1],[.5,.5,1]],[[0,0,1],[1,0,1],[.5,.5,1]]]:[[[0,height,0],[1,height,0],[1,height,1],[0,height,1]],[[1,0,0],[1,0,1],[1,height,1],[1,height,0]],[[0,0,1],[1,0,1],[1,height,1],[0,height,1]]];
      faces.forEach(function(face,index){projected.push({color:Object.prototype.hasOwnProperty.call(palette,b.type)?palette[b.type]:palette.stone,shade:index,points:face.map(function(v){var x=v[0]-.5,z=v[2]-.5;for(var r=0;r<normalizedRotation(b.rotation);r++){var old=x;x=z;z=-old;}return point(b.x+x+.5,b.y+v[1],b.z+z+.5);})});});
    });
    var pad=.8,width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[minX-pad,minY-pad,width+pad*2,height+pad*2].join(' ')+'" role="img" aria-label="Saved geometry snapshot"><rect x="'+(minX-pad)+'" y="'+(minY-pad)+'" width="'+(width+pad*2)+'" height="'+(height+pad*2)+'" fill="#edf0df"/>'+projected.map(function(face){var points=face.points.map(function(p){return p.map(function(n){return Math.round(n*1000)/1000;}).join(',');}).join(' ');return '<polygon points="'+points+'" fill="'+face.color+'" stroke="#435d4e" stroke-width=".018"/>'+(face.shade?'<polygon points="'+points+'" fill="#17382c" opacity="'+(face.shade===1?.18:.08)+'"/>':'');}).join('')+'</svg>';
  }
  function cleanActivitySnapshot(snapshot) {
    if(!snapshot || !activityBuildFacts(snapshot.blocks))return null;
    var blocks=snapshot.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z,type:validBlockType(b.type,false),shape:b.shape,rotation:normalizedRotation(b.rotation)};});
    return {capturedAt:String(snapshot.capturedAt || '').slice(0,80),blocks:blocks,facts:activityBuildFacts(blocks)};
  }
  function cleanActivityCheck(check) {
    if(!check || ['met','revise'].indexOf(check.status)<0 || typeof check.actual!=='number' || !isFinite(check.actual))return null;
    return {status:check.status,actual:check.actual,goal:normalizeActivityBuildGoal(check.goal),checkedAt:String(check.checkedAt || '').slice(0,80),message:String(check.message || '').slice(0,2000)};
  }
  function activityJournalExport(guide,journal) {
    journal=journal || {};return {schema:'alloflow-geometry-journal/2',lesson:guide.title,lessonKey:guide.key,scope:'Explicitly selected student geometry. Numeric checks are advisory and do not grade design quality.',activities:guide.activities.map(function(a){var evidence=(journal.evidence || {})[a.id] || {};return {id:a.id,title:a.title,challenge:a.challenge,buildGoal:a.buildGoal || null,successCriteria:a.successCriteria,reflection:(journal.notes || {})[a.id] || '',reviewed:!!(journal.reviewed || {})[a.id],before:cleanActivitySnapshot(evidence.before),after:cleanActivitySnapshot(evidence.after),check:cleanActivityCheck(evidence.check)};})};
  }
  function activityPortfolioHtml(guide,journal) {
    var exportData=activityJournalExport(guide,journal);
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+activityEscape(guide.title)+' — Learning portfolio</title><style>body{margin:0;background:#edf0e6;color:#213c33;font:16px/1.6 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:32px 20px}article{background:#fffef6;padding:24px;border:1px solid #b9c9af;border-radius:18px;margin:24px 0}h1,h2,h3{line-height:1.2}p{white-space:pre-wrap;overflow-wrap:anywhere}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}svg{width:100%;max-height:360px;border-radius:12px}figcaption,.muted{font-size:14px;color:#526b51}.check{padding:12px;border-left:3px solid #6a875a;background:#edf0df}@media(max-width:560px){.pair{grid-template-columns:1fr}}@media print{body{background:white}article{break-inside:avoid}}</style><main><p class="muted">GEOMETRY WORLD · LEARNING PORTFOLIO</p><h1>'+activityEscape(guide.title)+'</h1><p>'+activityEscape(exportData.scope)+'</p>'+exportData.activities.map(function(a){var images=['before','after'].map(function(stage){var snapshot=a[stage];return '<figure><h3>'+ (stage==='before'?'Before':'After')+'</h3>'+(snapshot?activitySnapshotSvg(snapshot)+'<figcaption>'+activityEscape(snapshot.capturedAt)+' · '+snapshot.facts.blockCount+' blocks · '+snapshot.facts.occupiedVolume+' cubic units</figcaption>':'<p class="muted">No snapshot saved.</p>')+'</figure>';}).join('');return '<article><h2>'+activityEscape(a.title)+'</h2><p>'+activityEscape(a.challenge)+'</p>'+(a.buildGoal?'<p><strong>Numeric target:</strong> '+activityEscape(activityGoalDescription(a.buildGoal))+'</p>':'')+'<div class="pair">'+images+'</div>'+(a.check?'<p class="check">Saved check · '+activityEscape(a.check.checkedAt)+'<br>'+activityEscape(a.check.message)+'</p>':'')+'<h3>My reflection</h3><p>'+activityEscape(a.reflection || 'No reflection recorded yet.')+'</p><p class="muted">'+(a.reviewed?'Learner marked this activity reviewed.':'Not marked reviewed.')+'</p></article>';}).join('')+'<p class="muted">This file works offline. The separate JSON journal preserves full block geometry for each saved snapshot.</p></main></html>';
  }

