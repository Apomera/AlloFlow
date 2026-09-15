const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
function change(file, replacements) {
  const absolute = path.join(root, file), original = fs.readFileSync(absolute, 'utf8');
  const crlf = original.includes('\r\n');
  let source = original.replace(/\r\n/g, '\n');
  for (const [before, after] of replacements) {
    if (!source.includes(before)) throw new Error('Missing replacement in ' + file + ': ' + before.slice(0,100));
    source = source.replace(before, after);
  }
  const backup = path.join(__dirname, 'before-source', path.basename(file));
  fs.mkdirSync(path.dirname(backup), {recursive:true});
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, original);
  const fd = fs.openSync(absolute, 'r+');
  try { const bytes = Buffer.from(crlf ? source.replace(/\n/g, '\r\n') : source); fs.writeSync(fd, bytes); fs.ftruncateSync(fd, bytes.length); } finally { fs.closeSync(fd); }
}
change('stem_lab/stem_tool_geometryworld.js', [
  ['var homePresentedRef = React.useRef(false);', `// Capture explicit returns before the builder effect consumes their marker.
      // ReturnProject alone is a saved backup, not a request to bypass Home.
      var homePresentedRef = React.useRef(!!window.__alloGeometryWorldPendingBuild);
      var homeBuilderReady = !!(window.StemLab && window.StemLab.geometryWorldBuilderPure);`],
  ['if(window.__alloGeometryWorldPendingBuild || window.__alloGeometryWorldReturnProject)return;', 'if(window.__alloGeometryWorldPendingBuild){homePresentedRef.current=true;return;}'],
  ["if(window.StemLab && window.StemLab.geometryWorldBuilderPure){\n          homePresentedRef.current=true;", "if(homeBuilderReady){\n          homePresentedRef.current=true;"],
  ["          if(showGeometryHome)return;\n          upd({showGeometryHome:true,geometryHomePage:'start',_geometryHomeInitial:!worldActive,_introShownOnce:true,showLessonIntro:false});", "          openGeometryHome();\n          upd('_geometryHomeInitial',!worldActive || (showGeometryHome && !!d._geometryHomeInitial));"],
  ["          homePresentedRef.current=true;\n          upd({showLessonIntro:true,_introShownOnce:true});", "          // A fallback intro must not consume the enhanced chooser's entry gate.\n          upd({showLessonIntro:true,_introShownOnce:true});"],
  ['},[threeReady,worldActive,showLessonIntro,showGeometryHome,d._introShownOnce]);','},[threeReady,worldActive,showLessonIntro,showGeometryHome,d._introShownOnce,homeBuilderReady]);']
]);
change('stem_lab/stem_tool_geometryworld_builder.js', [
  ["{ worldActive:true, showLessonIntro:false, actionFeedback:'',", "{ worldActive:true, showGeometryHome:false, _geometryHomeInitial:false, showLessonIntro:false, actionFeedback:'',"],
  ["var homePage = data.geometryHomePage || 'start';", "var homePage = ['start','learn','build','explore','create','open'].indexOf(data.geometryHomePage)>=0 ? data.geometryHomePage : 'start';"],
  ['var homeRef = React.useRef(null);', "var homeRef = React.useRef(null);\n      var homePreviousPageRef = React.useRef('start');"],
  ["if(homeRef.current){homeRef.current.scrollTop=0;homeRef.current.focus();}", "if(homeRef.current){\n          homeRef.current.scrollTop=0;\n          var previous=homePreviousPageRef.current;\n          var target=homePage==='start' && previous!=='start' ? homeRef.current.querySelector('[data-path=\"'+previous+'\"]') : null;\n          (target || homeRef.current).focus();\n        }\n        homePreviousPageRef.current=homePage;"],
  ["var chosen=homePage==='explore'?'geometryGarden':data.geometryHomeLesson || 'volumeExplorer';\n        var lesson=lessons.filter(function(l){return l.id===chosen;})[0] || lessons[0];", "var chosen=homePage==='explore'?'geometryGarden':data.geometryHomeLesson || 'volumeExplorer';\n        var availableLessons=lessons.filter(function(l){return homePage==='explore' ? l.id==='geometryGarden' : l.id!=='geometryGarden';});\n        var lesson=availableLessons.filter(function(l){return l.id===chosen;})[0] || availableLessons[0];"],
  ['Follow your curiosity. Choose a starting point and see where it takes you.', 'Choose a mode below. Return here anytime with the Geometry World Home button.'],
  ["h('div',{className:'gwe-home-grid'},[", "h('nav',{className:'gwe-home-grid','aria-label':'Geometry World modes'},["],
  ["lessons.filter(function(l){return l.id!=='geometryGarden';}).map(function(l)", "availableLessons.map(function(l)"]
]);
for (const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js']) {
  const source=fs.readFileSync(path.join(root,'stem_lab',name));
  const mirror=path.join(root,'desktop/web-app/public/stem_lab',name);
  const fd=fs.openSync(mirror,'r+');
  try {fs.writeSync(fd,source);fs.ftruncateSync(fd,source.length);} finally {fs.closeSync(fd);}
}
console.log('Entry fixes applied; canonical and desktop mirrors synchronized.');
