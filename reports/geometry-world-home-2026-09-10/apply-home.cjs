const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');const dir=__dirname;
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];fs.mkdirSync(path.join(dir,'before-source'),{recursive:true});for(const n of names){const target=path.join(dir,'before-source',n);if(!fs.existsSync(target))fs.copyFileSync('stem_lab/'+n,target);}
function source(name){const original=fs.readFileSync('stem_lab/'+name,'utf8');return {name,crlf:original.includes('\r\n'),text:original.replaceAll('\r\n','\n')};}
function replace(s,from,to){if(s.text.split(from).length!==2)throw Error('Expected one anchor in '+s.name+': '+from.slice(0,90));s.text=s.text.replace(from,to);}
const c=source(names[0]),b=source(names[1]);
replace(c,"      var showLessonIntro = d.showLessonIntro || false;","      var showLessonIntro = d.showLessonIntro || false;\n      var showGeometryHome = !!d.showGeometryHome;");
replace(c,"      // ── Auto-show lesson intro on first load ──",`      function openGeometryHome() {
        if(engine && engine._showcaseExporting)return;
        if(engine && engine.endShowcase && engine._showcase)engine.endShowcase();
        try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
        upd({showGeometryHome:true,geometryHomePage:'start',_geometryHomeInitial:false,_introShownOnce:true,showLessonIntro:false,showSandboxLauncher:false,showGameSettings:false,showPredictionPanel:false,objectivesOpen:false,showNpcDialog:false,showHelp:false,showReflection:false,showMyLessons:false,showLessonEditor:false,showCreatorPanel:false,creatorMode:false,showGrowthNudge:false,showTeacherView:false,showPeerWorlds:false});
      }

      // ── Show the mode chooser on the first visit; standalone core keeps its intro. ──`);
replace(c,"      if (threeReady && !worldActive && !showLessonIntro && !d._introShownOnce) {\n        setTimeout(function() { upd({ showLessonIntro: true, _introShownOnce: true }); }, 0);\n      }",`      React.useEffect(function(){
        if(!threeReady || worldActive || showLessonIntro || d._introShownOnce || window.__alloGeometryWorldPendingBuild)return;
        if(window.StemLab && window.StemLab.geometryWorldBuilderPure)upd({showGeometryHome:true,geometryHomePage:'start',_geometryHomeInitial:true,_introShownOnce:true});
        else upd({showLessonIntro:true,_introShownOnce:true});
      },[threeReady,worldActive,showLessonIntro,d._introShownOnce]);`);
replace(c,"          showLessonIntro: showLessonIntro, showReflection: showReflection,","          showGeometryHome: showGeometryHome, showLessonIntro: showLessonIntro, showReflection: showReflection,");
replace(c,"      var OPEN_MODALS = [","      var OPEN_MODALS = [\n        { flag: showGeometryHome, key: 'showGeometryHome', label: 'Geometry World home', emoji: '◇' },");
replace(c,"        engine._answeredRef = answeredNpcs;",`        engine.openGeometryHome = openGeometryHome;
        engine.geometryHomeLessons = Object.keys(SAMPLE_LESSONS).map(function(id){var l=SAMPLE_LESSONS[id];return {id:id,title:l.title,description:l.description,objectives:l.objectives || []};}).concat(getMyLessons().map(function(l){return {id:l._id,title:l.title || 'Saved lesson',description:l.description || '',objectives:l.objectives || []};}));
        engine.startHomeLesson = function(id){
          if(!engine.geometryHomeLessons.some(function(l){return l.id===id;}))return false;
          loadLessonByKey(id);
          upd({activeLesson:id,showGeometryHome:false,_geometryHomeInitial:false,showLessonIntro:false,creatorMode:false,showGameSettings:false,builderPanel:'build',hudPreset:'learning',hudPanel:'',sandboxDockCollapsed:false});
          focusWorldSurface();return true;
        };
        engine._answeredRef = answeredNpcs;`);
replace(c,"          if(engine._showcase){if(ev.code==='Escape'", "          if(engine._modalState && engine._modalState.showGeometryHome){if(ev.code==='Escape' && engine.closeGeometryHome){ev.preventDefault();engine.closeGeometryHome();}return;}\n          if(engine._showcase){if(ev.code==='Escape'");
replace(c,"          if(engine._showcase)return false;\n          if (engine.isLocked", "          if(engine._showcase || (engine._modalState && engine._modalState.showGeometryHome))return false;\n          if (engine.isLocked");
replace(c,"return !['showGameSettings','showNpcDialog'","return !['showGeometryHome','showGameSettings','showNpcDialog'");
replace(c,"if (engine._entryAnim && !engine.isInputActive())", "if (engine._entryAnim && !engine.isInputActive() && !(engine._modalState && engine._modalState.showGeometryHome))");
replace(c,"if (engine._viewPresetAnim && !engine._guidedTour)","if (engine._viewPresetAnim && !engine._guidedTour && !(engine._modalState && engine._modalState.showGeometryHome))");
replace(c,"el('h2', { id: 'gw-title', className: 'gw-title' }, 'Geometry World')","el('h2', { id: 'gw-title', className: 'gw-title' }, window.StemLab.geometryWorldBuilderPure ? el('button',{type:'button',className:'gw-home-brand-button','aria-label':'Geometry World home','aria-haspopup':'dialog',onClick:openGeometryHome},'Geometry World') : 'Geometry World')");
replace(c,"el('div', { className: 'gw-fullscreen-quickbar', role: 'group', 'aria-label': __alloT('stem.geometryworld.a11y_fullscreen_game_tools', 'Fullscreen game tools') },","el('div', { className: 'gw-fullscreen-quickbar', role: 'group', 'aria-label': __alloT('stem.geometryworld.a11y_fullscreen_game_tools', 'Fullscreen game tools') },\n          window.StemLab.geometryWorldBuilderPure && el('button',{type:'button',className:'gw-compact-action gw-focusable','aria-label':'Geometry World home','aria-haspopup':'dialog',onClick:openGeometryHome},'Home'),");
const ui=fs.readFileSync(path.join(dir,'home-ui.txt'),'utf8').replaceAll('\r\n','\n');
replace(b,"      var _hasStudentBuild = React.useState(null)",ui+"\n      var _hasStudentBuild = React.useState(null)");
replace(b,"      var additions = [];","      var additions = [];\n      if(engine)engine.closeGeometryHome=closeHome;\n      if(homeOpen)additions.push(renderHome());\n      if(data.toolbarCollapsed && base.props['data-fullscreen']!=='true' && !homeOpen)additions.push(h('button',{key:'gwe-home-shortcut',type:'button',className:'gwe-home-shortcut','aria-label':'Geometry World home','aria-haspopup':'dialog',onClick:function(){if(engine && engine.openGeometryHome)engine.openGeometryHome();}},'World home'));");
replace(b,"if (isSandbox && data.worldActive) additions.push(h('input', {key:'gwe-editable-file'","if ((isSandbox && data.worldActive) || homeOpen) additions.push(h('input', {key:'gwe-editable-file'");
replace(b,"if (!isSandbox && !launcherOpen) additions.push", "if (!isSandbox && !launcherOpen && !homeOpen) additions.push");
replace(b,"      var children = React.Children.toArray(base.props.children).concat(additions);","      var children = React.Children.toArray(base.props.children).concat(additions).map(function(child){\n        if(!React.isValidElement(child) || child.type==='style' || child.type==='input' || child.props.className==='gwe-home-backdrop')return child;\n        return React.cloneElement(child,{inert:homeOpen?'':undefined,'aria-hidden':homeOpen?'true':child.props['aria-hidden']});\n      });");
// Only completed starts/imports dismiss Home. Choosing or cancelling a file keeps it open.
replace(b,"      showSandboxLauncher: false, creatorMode: false, tutorialDismissed: true,","      showGeometryHome:false,_geometryHomeInitial:false,showSandboxLauncher: false, creatorMode: false, tutorialDismissed: true,");
replace(b,"builderPanel:'build', showcaseActive:false, showcaseSaving:false, actionFeedback:''","builderPanel:'build', showGeometryHome:false,_geometryHomeInitial:false, showcaseActive:false, showcaseSaving:false, actionFeedback:''");
replace(b,"patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: '', builderPanel:'build', builderPrintContext:","patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showGeometryHome:false,_geometryHomeInitial:false, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: '', builderPanel:'build', builderPrintContext:");
const css=fs.readFileSync(path.join(dir,'home.css'),'utf8').trim();
replace(b,'      ".gwe-recovery{padding:12px;', '      '+JSON.stringify(css)+',\n      ".gwe-recovery{padding:12px;');
for(const s of [c,b]){new vm.Script(s.text,{filename:s.name});const final=s.crlf?s.text.replaceAll('\n','\r\n'):s.text;for(const base of ['stem_lab','desktop/web-app/public/stem_lab']){const file=path.join(base,s.name),fd=fs.openSync(file,'r+');fs.writeFileSync(fd,final);fs.ftruncateSync(fd,Buffer.byteLength(final));fs.closeSync(fd);}console.log(s.name,crypto.createHash('sha256').update(final).digest('hex'));}
