  function lessonOverviewModel(lesson) {
    if (!lesson || typeof lesson !== 'object') return null;
    var activities=Array.isArray(lesson.activities)?lesson.activities.filter(function(a){return a&&typeof a.title==='string';}).slice(0,12):[];
    var npcs=Array.isArray(lesson.npcs)?lesson.npcs.filter(function(n){return n&&typeof n==='object';}).slice(0,20):[];
    var questionCount=npcs.reduce(function(total,n){return total+(n.question?1+(Array.isArray(n.question.followUp)?n.question.followUp.slice(0,3).length:0):0);},0);
    var minutes=lesson.estimatedMinutes;
    if(typeof minutes==='number')minutes=isFinite(minutes)&&minutes>0&&minutes<=300?String(Math.round(minutes)):'';
    minutes=typeof minutes==='string'?minutes.trim():'';
    if(!/^\d{1,3}(?:\s*[–-]\s*\d{1,3})?(?:\s*min(?:utes)?)?$/i.test(minutes))minutes='';
    if(minutes)minutes=minutes.replace(/\s*min(?:utes)?$/i,'')+' min';
    var g=lesson.ground;
    var validGround=g&&['xMin','xMax','zMin','zMax'].every(function(k){return typeof g[k]==='number'&&isFinite(g[k])&&Math.abs(g[k])<=2048;})&&g.xMax>=g.xMin&&g.zMax>=g.zMin;
    var model={activityCount:activities.length,questionCount:questionCount,minutes:minutes,depth:lesson.depth==='quick'?'Quick':lesson.depth==='guided'?'Guided':lesson.depth==='expedition'?'Expedition':'',coastal:lesson.landscapeTheme==='coastal',map:null};
    if(!validGround)return model;
    var width=g.xMax-g.xMin+1,depth=g.zMax-g.zMin+1,scale=Math.min(288/width,160/depth),ox=(320-width*scale)/2,oz=(200-depth*scale)/2;
    function inside(x,z){return isFinite(x)&&isFinite(z)&&x>=g.xMin&&x<=g.xMax+1&&z>=g.zMin&&z<=g.zMax+1;}
    function project(x,z){return [ox+(x-g.xMin)*scale,oz+(z-g.zMin)*scale];}
    var footprints=(Array.isArray(lesson.structures)?lesson.structures:[]).slice(0,180).filter(function(s){return s&&s.type==='fill'&&['x1','x2','y1','y2','z1','z2'].every(function(k){return typeof s[k]==='number'&&isFinite(s[k]);})&&s.x2>=s.x1&&s.z2>=s.z1&&inside(s.x1,s.z1)&&inside(s.x2+1,s.z2+1);}).map(function(s,i){var p=project(s.x1,s.z1);return {id:i,x:p[0],y:p[1],width:(s.x2-s.x1+1)*scale,height:(s.z2-s.z1+1)*scale,block:s.block,ground:s.y1===s.y2&&s.y1===(g.y||0)};});
    var stops=(activities.length?activities:npcs.map(function(n){return {title:n.name,position:n.position};})).map(function(a,i){var p=a.position;return Array.isArray(p)&&p.length===3&&p.every(function(v){return typeof v==='number'&&isFinite(v);})&&inside(p[0],p[2])?{index:i,title:String(a.title||'Guide').slice(0,120),point:project(p[0],p[2])}:null;}).filter(Boolean);
    model.map={x:ox,y:oz,width:width*scale,height:depth*scale,footprints:footprints,stops:stops,activities:activities.length>0};return model;
  }

  function renderLessonMap(h,overview) {
    if(!overview||!overview.map)return null;
    var map=overview.map,colors={diamond:'#65c7d2',gold:'#e2ba65',wood:'#a68562',sand:'#e7d3a3',stone:'#a8b5ac',glass:'#bfd9cf',brick:'#b88773',grass:'#91aa75',water:'#73baca',ice:'#b6e0e3',torch:'#e3b65c'};
    return h('figure',{className:'gwe-lesson-map','data-coastal':overview.coastal?'true':'false'},
      h('svg',{viewBox:'0 0 320 200',role:'img','aria-label':map.activities?'Lesson route with numbered activity stops and structure footprints':'Lesson overview with guide locations and structure footprints',preserveAspectRatio:'xMidYMid meet'},
        h('title',null,map.activities?'Explore the lesson route':'Preview the world'),
        h('desc',null,'Overhead view. '+map.stops.length+(map.activities?' numbered stops follow the activity guide; dotted lines show their order.':' guide locations are marked.')+' The top of this map is north.'),
        h('rect',{x:0,y:0,width:320,height:200,rx:16,fill:overview.coastal?'#d3e9e4':'#e5ebdc'}),
        h('rect',{x:map.x,y:map.y,width:map.width,height:map.height,rx:3,fill:'#b6c69a',stroke:'#65816a',strokeWidth:1}),
        map.footprints.map(function(f){return h('rect',{key:'structure-'+f.id,'data-map-structure':f.id,x:f.x,y:f.y,width:f.width,height:f.height,fill:Object.prototype.hasOwnProperty.call(colors,f.block)?colors[f.block]:'#a0aca2',stroke:f.ground?'none':'#425e554f',strokeWidth:.7});}),
        map.activities&&map.stops.length>1&&h('polyline',{points:map.stops.map(function(s){return s.point.join(',');}).join(' '),fill:'none',stroke:'#365d49',strokeWidth:1.4,strokeDasharray:'3 4',opacity:.75}),
        map.stops.map(function(s){return h('g',{key:'stop-'+s.index,'data-map-activity':s.index},h('circle',{cx:s.point[0],cy:s.point[1],r:map.activities?9:4,fill:'#254c3a',stroke:'#fbfaef',strokeWidth:2}),map.activities&&h('text',{x:s.point[0],y:s.point[1]+.4,textAnchor:'middle',dominantBaseline:'central',fill:'#fffef2',fontSize:10,fontFamily:'system-ui,sans-serif',fontWeight:800},s.index+1));}),
        h('text',{x:307,y:16,textAnchor:'end',fill:'#355348',fontSize:9,fontFamily:'system-ui,sans-serif',fontWeight:800},'N ↑')
      ),h('figcaption',null,map.activities?'Activity locations · '+map.stops.length+' stops':'Guide locations and building areas')
    );
  }

  function renderLessonFacts(h,overview) {
    if(!overview)return null;
    var facts=[];if(overview.activityCount)facts.push(overview.activityCount+' activities');if(overview.minutes)facts.push(overview.minutes);if(overview.depth)facts.push(overview.depth);
    facts.push(overview.questionCount?overview.questionCount+' question steps':'Self-paced exploration');
    return h('ul',{className:'gwe-lesson-facts','aria-label':'Lesson at a glance',role:'list'},facts.map(function(f){return h('li',{key:f},f);}));
  }
