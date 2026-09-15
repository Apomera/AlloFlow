      var _activityNotice=React.useState(''),activityNotice=_activityNotice[0],setActivityNotice=_activityNotice[1];
      var activeEvidence=((journal.evidence || {})[activeActivity && activeActivity.id]) || {};
      var beforePreview=React.useMemo(function(){return activitySnapshotSvg(activeEvidence.before);},[activeEvidence.before]);
      var afterPreview=React.useMemo(function(){return activitySnapshotSvg(activeEvidence.after);},[activeEvidence.after]);
      React.useEffect(function(){setActivityNotice('');},[guide && guide.key,activeActivity && activeActivity.id,engine && engine._currentLesson]);
      function currentActivityEngine(){
        var live=window[ENGINE_KEY],liveGuide=activityGuideModel(live && live._currentLesson);
        return live===engine && liveGuide && guide && liveGuide.key===guide.key && data.worldActive && !homeOpen ? live : null;
      }
      function saveActivityEvidence(patch){
        if(!guide || !activeActivity || !currentActivityEngine())return false;
        var result=updateActivityEvidence(data.lessonActivityProgress,guide.key,activeActivity.id,patch);
        if(!result.ok){setActivityNotice(result.error);return false;}
        patchGeometryState(ctx,{lessonActivityProgress:result.value});return true;
      }
      function captureActivityStage(stage){
        var live=currentActivityEngine();if(!live)return;
        var capture=captureActivityBuild(live);
        if(!capture.ok){setActivityNotice(capture.error);return;}
        var patch={};patch[stage]=capture.snapshot;
        if(saveActivityEvidence(patch))setActivityNotice((stage==='before'?'Before':'After')+' snapshot saved: '+capture.snapshot.facts.blockCount+' selected blocks. No world blocks were changed.');
      }
      function checkActivityBuild(){
        var live=currentActivityEngine();if(!live)return;
        var capture=captureActivityBuild(live);
        if(!capture.ok){setActivityNotice(capture.error);return;}
        var result=evaluateActivityBuildGoal(activeActivity.buildGoal,capture.snapshot.blocks);
        if(result.status==='unavailable'){setActivityNotice(result.message);return;}
        result.checkedAt=capture.snapshot.capturedAt;
        if(saveActivityEvidence({check:result}))setActivityNotice(result.message);
      }
      function selectActivityBuild(){
        var live=currentActivityEngine();if(!live)return;
        var selected=aimedStudentMeasurement(ctx,false);
        if(!selected || selected.engine!==live){setActivityNotice('Return to the world and aim at your own activity build, then reopen Activities and select it. Protected teaching models are not checked.');return;}
        live._builderSelection={blocks:selected.measurement.blocks.slice()};
        patchGeometryState(ctx,{measureResult:selected.measurement});
        setActivityNotice('Selected '+selected.measurement.count+' student blocks. Checks and snapshots will use this outlined selection.');
      }
      function renderActivitySnapshot(stage,snapshot,preview){
        var title=stage==='before'?'Before':'After';
        return h('figure',{className:'gwe-journal-snapshot','data-snapshot-stage':stage},
          h('figcaption',null,h('strong',null,title),snapshot && h('span',null,snapshot.facts.blockCount+' blocks · '+snapshot.facts.occupiedVolume+' cubic units')),
          preview?h('img',{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(preview),alt:title+' saved activity build. '+snapshot.facts.width+' units wide, '+snapshot.facts.depth+' deep, '+snapshot.facts.height+' high.'}):h('p',{className:'gwe-journal-empty'},stage==='before'?'Save your first design.':'Revise it, then save the result.'),
          snapshot && h('p',{className:'gwe-activity-note'},'Saved '+new Date(snapshot.capturedAt).toLocaleString()),
          h('button',{type:'button',onClick:function(){captureActivityStage(stage);}},snapshot?'Replace '+title.toLowerCase()+' snapshot':'Save '+title.toLowerCase()+' snapshot'));
      }
      function renderActivityEvidence(){
        var goal=activeActivity.buildGoal,saved=activeEvidence.check;
        return h('section',{className:'gwe-activity-evidence','aria-labelledby':'gwe-activity-evidence-title'},
          h('h4',{id:'gwe-activity-evidence-title'},'Test, revise, and keep the evidence'),
          h('p',{className:'gwe-activity-note'},'Use your outlined selection for this activity. Ground, protected lesson models, and other creations are excluded. Re-select after building a separate version.'),
          h('div',{className:'gwe-journal-actions'},h('button',{type:'button',onClick:selectActivityBuild},'Select aimed build'),h('button',{type:'button',onClick:closeGuide},'Return to building')),
          goal ? h('div',{className:'gwe-activity-goal'},h('strong',null,'Numeric target'),h('p',null,activityGoalDescription(goal)),h('button',{type:'button',className:'gwe-activity-check-build',onClick:checkActivityBuild},'Check my build')) : h('p',{className:'gwe-activity-note'},activeActivity.buildGoalInvalid?'This activity’s numeric goal is unsupported. Review its written criteria; no automatic result will be recorded.':'An open-ended task: review the written design criteria and explain your choices.'),
          saved && h('div',{className:'gwe-journal-saved-check','data-build-check':saved.status},h('strong',null,'Saved numeric check'),h('p',null,saved.message),h('p',{className:'gwe-activity-note'},'Checked '+new Date(saved.checkedAt).toLocaleString()+'. Run Check my build after making changes. This does not change your question score.')),
          h('div',{className:'gwe-journal-snapshots'},renderActivitySnapshot('before',activeEvidence.before,beforePreview),renderActivitySnapshot('after',activeEvidence.after,afterPreview)),
          (activeEvidence.before || activeEvidence.after) && h('button',{type:'button',className:'gwe-journal-clear',onClick:function(){if(saveActivityEvidence({before:null,after:null}))setActivityNotice('This activity’s snapshots were cleared. Your reflection and saved numeric check are unchanged.');}},'Clear this activity’s snapshots'),
          activityNotice && h('p',{className:'gwe-journal-notice',role:'status','aria-live':'polite'},activityNotice),
          h('p',{className:'gwe-activity-note'},'Snapshots save the selected geometry locally. Up to 1,500 blocks per snapshot and 6,000 saved blocks across your journals. Download your portfolio to keep a separate copy.')
        );
      }

