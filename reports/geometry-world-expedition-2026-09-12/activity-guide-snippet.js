  // Optional expedition data; old lessons retain their familiar objectives.
  function activityGuideModel(lesson) {
    if (!lesson || !Array.isArray(lesson.activities)) return null;
    var activities=lesson.activities.slice(0,12).filter(function(a){return a && typeof a==='object' && typeof a.title==='string';}).map(function(a,i){
      function text(v){return typeof v==='string'?v.slice(0,2000):Array.isArray(v)?v.filter(function(s){return typeof s==='string';}).join(' ').slice(0,2000):'';}
      return {id:String(a.id || 'activity-'+i).slice(0,80)+'-'+i,title:text(a.title),challenge:text(a.challenge),hint:text(a.hint),successCriteria:text(a.successCriteria),reflection:text(a.reflection),npcName:text(a.npcName),position:Array.isArray(a.position)&&a.position.length===3&&a.position.every(function(n){return typeof n==='number'&&isFinite(n);})?a.position:null};
    });
    if(!activities.length)return null;
    var signature=JSON.stringify([lesson.title,lesson.structures,activities]),hash=2166136261;
    for(var i=0;i<signature.length;i++)hash=Math.imul(hash^signature.charCodeAt(i),16777619);
    return {key:'lesson-'+(hash>>>0).toString(36),title:lesson.title || 'Activity guide',activities:activities};
  }
  function travelToActivity(engine,activity) {
    if(!engine || !engine.camera || !activity)return false;
    var npc=(engine.npcs || []).find(function(n){return n.data && n.data.name===activity.npcName;});
    var target=npc && npc.data.position,point=activity.position || (target && [target[0]-2,target[1]+2.6,target[2]-2]);
    if(!point)return false;
    var lesson=engine._currentLesson || {},g=lesson.ground;
    if(!g || !point.every(function(n){return typeof n==='number'&&isFinite(n);}))return false;
    var x=point[0],z=point[2],y=Math.max(Number(g.y)+2.6,point[1]);
    if(x<g.xMin+.3 || x>g.xMax+.7 || z<g.zMin+.3 || z>g.zMax+.7 || y>128)return false;
    // Find a clear body column. A stored waypoint must not place the learner in a wall.
    function blocked(eyeY){return [[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]].some(function(o){for(var h=Math.floor(eyeY-1.6);h<=Math.floor(eyeY+.2);h++)if(engine.blocks[Math.floor(x+o[0])+','+h+','+Math.floor(z+o[1])])return true;return false;});}
    while(y<=128 && blocked(y))y+=1;
    if(y>128)return false;
    if(engine.stopGuidedTour && engine._guidedTour)engine.stopGuidedTour(false);
    if(engine.releaseInput)engine.releaseInput();
    engine._entryAnim=null;engine._viewPresetAnim=null;
    if(engine.velocity)engine.velocity.set(0,0,0);
    engine.camera.position.set(x,y,z);
    if(target)engine.camera.lookAt(target[0]+.5,target[1]+1.5,target[2]+.5);
    if(engine.euler)engine.euler.setFromQuaternion(engine.camera.quaternion);
    engine.camera.updateMatrixWorld(true);
    return true;
  }
