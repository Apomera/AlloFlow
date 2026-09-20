        // The question belongs to the unordered pair and learning band, never to its screen position.
        var comparisonStructures = sel && compareSel && sel.id !== compareSel.id ? [sel, compareSel].sort(function(a,b){return a.id < b.id ? -1 : 1;}) : [];
        var comparisonSameConcept = comparisonStructures.length === 2 && comparisonStructures[0].conceptId === comparisonStructures[1].conceptId;
        var comparisonCheckPair = comparisonStructures.map(function(structure){return structure.id;}).join('|');
        var comparisonAsk = comparisonStructures.length === 2 ? comparisonStructures[quizSeed(comparisonCheckPair) % 2] : null;
        var comparisonQuestionKey = comparisonAsk && !comparisonSameConcept ? ['v2',gradeBand,comparisonCheckPair,comparisonAsk.id].join(':') : null;
        window.__alloAnatomyComparisonContext = activeTab === 'explore' ? comparisonQuestionKey : null;
        function validComparisonAnswer(value) {
          return !!value && typeof value === 'object' && !Array.isArray(value) && value.questionKey === comparisonQuestionKey &&
            value.pair === comparisonCheckPair && comparisonStructures.some(function(structure){return structure.id === value.chosen;});
        }
        function answerComparison(optionId) {
          if(!comparisonQuestionKey || window.__alloAnatomyComparisonContext !== comparisonQuestionKey || !comparisonStructures.some(function(structure){return structure.id === optionId;}))return;
          var correct = optionId === comparisonAsk.id, accepted = false, announced = false;
          setLabToolData(function(previous){
            var state = previous.anatomy || {};
            var currentTab = anatomyTabOrder.indexOf(state._activeTab) !== -1 ? state._activeTab : (state.quizMode === true ? 'quiz' : 'explore');
            if(currentTab !== 'explore' || window.__alloAnatomyComparisonContext !== comparisonQuestionKey ||
              [state.selectedStructure,state._compareStructure].sort().join('|') !== comparisonCheckPair || validComparisonAnswer(state._compareCheck))return previous;
            accepted = true;
            return Object.assign({},previous,{anatomy:Object.assign({},state,confidenceEvidencePatch(comparisonAsk.id,correct,state),{
              _compareCheck:{pair:comparisonCheckPair,questionKey:comparisonQuestionKey,chosen:optionId}
            })});
          });
          function notifyComparison(){if(!accepted || announced)return;announced=true;playSound(correct?'quizCorrect':'quizWrong');if(typeof announceToSR === 'function')announceToSR((correct?t('stem.anatomy.recap_correct','Correct: '):t('stem.anatomy.recap_incorrect','Not quite. It was '))+comparisonAsk.name+'.');}
          notifyComparison();setTimeout(notifyComparison,0);
        }
        function focusComparisonPanel() {
          setTimeout(function(){var heading=document.getElementById('anatomy-comparison-title');if(heading){heading.scrollIntoView({block:'nearest'});heading.focus();}},0);
        }
        function clearComparison() {
          upd('_compareStructure',null);
          setTimeout(function(){var button=document.querySelector('[data-anatomy-compare-pin]');if(button)button.focus();else focusAnatomyStructureDetail();},0);
        }
        function renderComparisonPanel() {
          if(comparisonStructures.length !== 2)return null;
          var chosen = validComparisonAnswer(d._compareCheck) ? d._compareCheck.chosen : null;
          var other = comparisonAsk.id === sel.id ? compareSel : sel;
          var question = maskStructureName(maskStructureName(learnerText(comparisonAsk),comparisonAsk),other);
          function diagramView(structure){return structure.v === 'b' ? t('stem.anatomy.compare_ref_both','Front and back views') : structure.v === 'a' ? t('stem.anatomy.compare_ref_front','Front view (anterior)') : t('stem.anatomy.compare_ref_back','Back view (posterior)');}
          function row(key,label,first,second){return h('tr',{key:key,role:'row','data-anatomy-compare-row':key},
            h('th',{scope:'row',role:'rowheader'},label),[first,second].map(function(value,index){var name=index===0?sel.name:compareSel.name;return h('td',{key:index,role:'cell'},h('span',{className:'anatomy-compare-mobile-name','aria-hidden':'true'},name),value);}));}
          return h('section',{className:'anatomy-refinement anatomy-comparison-panel','data-anatomy-comparison-panel':comparisonCheckPair,'aria-labelledby':'anatomy-comparison-title'},
            h('h5',{id:'anatomy-comparison-title',tabIndex:-1},t('stem.anatomy.compare_ref_title','Compare structures')),
            h('p',null,youngLearner?t('stem.anatomy.compare_ref_guide_young','Read what each part does. What is alike? What is different? Try the question, then explain your thinking.'):t('stem.anatomy.compare_ref_guide','Compare each function and system membership. Use those details to explain one similarity and one difference, then try the practice question.')),
            h('div',{className:'anatomy-refinement-actions'},
              activeComparisonRecorded?h('span',{role:'status'},t('stem.anatomy.compare_ref_recorded','Pair recorded')):h('button',{type:'button',onClick:function(){updMulti(comparisonTrackingPatch(sel.id,{},sysKey));setTimeout(checkAnatomyChallenges,50);}},t('stem.anatomy.compare_ref_record','Record pair')),
              h('button',{type:'button','data-anatomy-compare-clear':true,onClick:clearComparison},t('stem.anatomy.compare_ref_clear','Clear comparison'))),
            h('p',{className:'anatomy-comparison-note'},t('stem.anatomy.compare_ref_progress','A recorded pair tracks exploration. It does not mean you have mastered either structure.')),
            comparisonSameConcept?h('p',{'data-anatomy-compare-same-concept':true},t('stem.anatomy.compare_ref_same','These entries describe the same anatomical structure in different browsing collections. Compare their roles; an either-or identification question would be misleading.')):null,
            h('table',{role:'table'},
              h('caption',null,sel.name+' · '+compareSel.name),
              h('thead',{role:'rowgroup'},h('tr',{role:'row'},h('th',{scope:'col',role:'columnheader'},t('stem.anatomy.compare_ref_feature','Feature')),h('th',{scope:'col',role:'columnheader'},sel.name),h('th',{scope:'col',role:'columnheader'},compareSel.name))),
              h('tbody',{role:'rowgroup'},
                row('function',t('stem.anatomy.does','Does'),learnerText(sel),learnerText(compareSel)),
                row('system',t('stem.anatomy.compare_ref_memberships','Body systems'),scientificSystemNames(sel),scientificSystemNames(compareSel)),
                row('view',t('stem.anatomy.compare_ref_diagram','Shown in this diagram'),diagramView(sel),diagramView(compareSel)),
                !youngLearner && sel.origin && compareSel.origin?row('origin',t('stem.anatomy.origin','Origin'),sel.origin,compareSel.origin):null,
                !youngLearner && sel.insertion && compareSel.insertion?row('insertion',t('stem.anatomy.insertion','Insertion'),sel.insertion,compareSel.insertion):null)),
            h('p',{className:'anatomy-comparison-note'},t('stem.anatomy.compare_ref_system_note','A structure can contribute to more than one body system. Browsing collections are navigation groups.')),
            h('p',{className:'anatomy-comparison-note'},t('stem.anatomy.compare_ref_view_note','Front and back describe where this diagram places a marker. They do not describe the full extent of a structure inside the body.')),
            h('details',{'data-anatomy-compare-references':true},h('summary',null,t('stem.anatomy.compare_ref_sources','Sources and further context')), [sel,compareSel].map(function(structure){return h('div',{key:structure.id,className:'anatomy-refinement-item'},h('h6',null,structure.name),renderScienceSources(structure),renderClinicalNote(structure,false));})),
            !comparisonSameConcept?h('div',{className:'anatomy-refinement-item','data-anatomy-compare-check':comparisonCheckPair,'data-anatomy-compare-check-state':chosen===null?'open':chosen===comparisonAsk.id?'hit':'miss'},
              h('h6',null,t('stem.anatomy.compare_check_title','Which one does this?')),
              h('p',null,t('stem.anatomy.compare_ref_practice','Practice with the comparison above. Your answer adds one practice attempt; reading or recording a pair adds none.')),
              h('p',{className:'italic','data-anatomy-compare-clue':true},question),
              ttsBtn(question,t('stem.anatomy.compare_ref_read_question','Read the comparison question aloud')),
              h('div',{className:'anatomy-refinement-actions'},stableQuizShuffle(comparisonStructures,'compare|'+comparisonCheckPair).map(function(option){var hit=option.id===comparisonAsk.id;return h('button',{key:option.id,type:'button','data-anatomy-compare-option':option.id,disabled:chosen!==null,'aria-pressed':chosen===option.id,onClick:function(){answerComparison(option.id);}},(chosen!==null&&hit?'✓ ':chosen===option.id?'✕ ':'')+option.name);})),
              chosen!==null?h('div',{role:'status','aria-live':'polite','aria-atomic':'true'},h('p',null,(chosen===comparisonAsk.id?t('stem.anatomy.compare_check_hit','Right: that is the '):t('stem.anatomy.compare_check_miss','That was the '))+comparisonAsk.name+'.'),h('p',null,h('strong',null,comparisonAsk.name+': '),learnerText(comparisonAsk)),h('p',null,h('strong',null,other.name+': '),learnerText(other)),h('p',null,t('stem.anatomy.compare_ref_explain','Explain your choice using a detail from each structure. You can say it aloud or use the “In your own words” notes above.'))):null):null
          );
        }
