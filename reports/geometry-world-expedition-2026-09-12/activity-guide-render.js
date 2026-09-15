      var guide=activityGuideModel(engine && engine._currentLesson);
      var guideOpen=!!(guide && data.objectivesOpen && !homeOpen && !data.showGameSettings && !data.showcaseActive);
      var guideRef=React.useRef(null);
      var guideWasOpenRef=React.useRef(false);
      var journal=((data.lessonActivityProgress || {})[guide && guide.key]) || {};
      var activeActivity=guide && (guide.activities.find(function(a){return a.id===journal.selectedId;}) || guide.activities[0]);
      React.useEffect(function(){
        if(guideOpen){
          if(engine && engine.releaseInput)engine.releaseInput();
          try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
          if(guideRef.current)guideRef.current.focus();
        }else if(guideWasOpenRef.current && !homeOpen)focusWorldSurface(30);
        guideWasOpenRef.current=guideOpen;
      },[guideOpen,guide && guide.key]);
      function updateJournal(patch){
        var all=Object.assign({},data.lessonActivityProgress || {});
        all[guide.key]=Object.assign({},journal,patch);
        var keys=Object.keys(all);while(keys.length>30){var key=keys.shift();if(key!==guide.key)delete all[key];}
        patchGeometryState(ctx,{lessonActivityProgress:all});
      }
      function closeGuide(){patchGeometryState(ctx,{objectivesOpen:false});}
      function renderActivityGuide(){
        var activity=activeActivity,notes=journal.notes || {},reviewed=journal.reviewed || {};
        var count=guide.activities.filter(function(a){return reviewed[a.id];}).length;
        return h('div',{key:'gwe-activity-guide',className:'gwe-activity-backdrop'},h('section',{className:'gwe-activity-guide',ref:guideRef,role:'dialog','aria-modal':'true','aria-labelledby':'gwe-activity-title',tabIndex:-1,onKeyDown:function(event){trapDialogKeys(event,closeGuide);event.stopPropagation();}},
          h('header',null,h('div',null,h('p',{className:'gwe-activity-eyebrow'},'YOUR EXPLORATION JOURNAL'),h('h2',{id:'gwe-activity-title'},guide.title)),h('button',{type:'button','aria-label':'Close activity guide',onClick:closeGuide},'Close')),
          h('p',{className:'gwe-activity-intro'},'Explore, build, test your idea, and explain what you discovered. Your notes and review marks stay with this lesson in AlloFlow.'),
          h('label',{htmlFor:'gwe-activity-select'},'Choose an activity'),
          h('select',{id:'gwe-activity-select',value:activity.id,onChange:function(event){updateJournal({selectedId:event.target.value});}},guide.activities.map(function(a,i){return h('option',{key:a.id,value:a.id},(i+1)+'. '+a.title+(reviewed[a.id]?' · reviewed':''));})),
          h('div',{className:'gwe-activity-progress',role:'status'},count+' of '+guide.activities.length+' activities reviewed'),
          h('article',{key:activity.id,className:'gwe-activity-card'},h('h3',null,activity.title),h('p',null,activity.challenge),
            activity.npcName && h('p',{className:'gwe-activity-guide-name'},'Your guide: '+activity.npcName),
            h('button',{type:'button',className:'gwe-activity-travel',disabled:!activity.position&&!activity.npcName,onClick:function(){if(travelToActivity(engine,activity)){closeGuide();announce(ctx,'Moved to '+activity.title+'. Your structures and history are unchanged.','success');}else announce(ctx,'A clear arrival point is not available. Use the scene map to find your guide.','info');}},'Go to this activity'),
            activity.hint && h('details',null,h('summary',null,'Show a hint'),h('p',null,activity.hint)),
            activity.successCriteria && h('div',{className:'gwe-activity-check'},h('h4',null,'Check your work'),h('p',null,activity.successCriteria)),
            h('label',{htmlFor:'gwe-activity-note'},activity.reflection || 'What did you discover? Explain your reasoning.'),
            h('textarea',{id:'gwe-activity-note',rows:3,maxLength:2000,value:notes[activity.id] || '',placeholder:'Record a measurement, explain a revision, or describe your result.',onChange:function(event){var next=Object.assign({},notes);next[activity.id]=event.target.value;updateJournal({notes:next});}}),
            h('label',{className:'gwe-activity-review'},h('input',{type:'checkbox',checked:!!reviewed[activity.id],onChange:function(event){var next=Object.assign({},reviewed);next[activity.id]=event.target.checked;updateJournal({reviewed:next});}}),'I have reviewed my work'),
            h('p',{className:'gwe-activity-note'},'This is your self-check. It does not change your question score.')
          ),
          h('footer',null,h('button',{type:'button',onClick:function(){downloadBlob(new Blob([JSON.stringify({schema:'alloflow-geometry-journal/1',lesson:guide.title,activities:guide.activities.map(function(a){return {title:a.title,challenge:a.challenge,reflection:notes[a.id] || '',reviewed:!!reviewed[a.id]};})},null,2)],{type:'application/json'}),'geometry-world-learning-journal.json');}},'Download journal'),h('button',{type:'button',onClick:closeGuide},'Back to exploring'))
        ));
      }
