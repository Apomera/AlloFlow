        var breathingStructureIds = ['lungs','alveoli','diaphragm','diaphragm_m','pleura','resp_muscles'];
        function renderBreathingStudy(structure) {
          if(!structure || breathingStructureIds.indexOf(structure.id) === -1)return null;
          var saved = d._breathingStudy && typeof d._breathingStudy === 'object' && !Array.isArray(d._breathingStudy) ? d._breathingStudy : {};
          var phase = ['in','out','rest'].indexOf(saved.phase) !== -1 ? saved.phase : 'in';
          var phases = [
            {id:'in',label:t('stem.anatomy.breath_ref_in','Breathing in'),text:t('stem.anatomy.breath_ref_in_text','The diaphragm contracts and moves down. The chest and lungs expand, and air flows in.'),pressure:t('stem.anatomy.breath_ref_in_pressure','While air flows inward, alveolar pressure is slightly below outside air pressure.')},
            {id:'out',label:t('stem.anatomy.breath_ref_out','Quiet breathing out'),text:t('stem.anatomy.breath_ref_out_text','The diaphragm relaxes and returns toward its dome shape. The lungs recoil, and air flows out.'),pressure:t('stem.anatomy.breath_ref_out_pressure','While air flows outward, alveolar pressure is slightly above outside air pressure.')},
            {id:'rest',label:t('stem.anatomy.breath_ref_rest','End of a quiet breath'),text:t('stem.anatomy.breath_ref_rest_text','The lungs still contain air after a normal breath out. At this moment there is no net airflow through the open airway.'),pressure:t('stem.anatomy.breath_ref_rest_pressure','Alveolar and outside air pressures are equal. This does not mean that pleural pressure equals outside air pressure.')}
          ];
          var current = phases.filter(function(item){return item.id === phase;})[0];
          var options = youngLearner ? [
            {id:'sacs',label:t('stem.anatomy.breath_ref_sacs','At the tiny air sacs beside blood vessels')},
            {id:'muscle',label:t('stem.anatomy.breath_ref_muscle','Inside the diaphragm muscle')},
            {id:'pipe',label:t('stem.anatomy.breath_ref_pipe','Inside the windpipe')}
          ] : [
            {id:'continue',label:t('stem.anatomy.breath_ref_continue','Gas exchange can continue without net airflow')},
            {id:'stop',label:t('stem.anatomy.breath_ref_stop','Oxygen and carbon dioxide must stop crossing')},
            {id:'empty',label:t('stem.anatomy.breath_ref_empty','The lungs must be completely empty')}
          ];
          var correctId = youngLearner ? 'sacs' : 'continue';
          var answer = saved.band === gradeBand && options.some(function(option){return option.id === saved.answer;}) ? saved.answer : null;
          var explanation = youngLearner ? t('stem.anatomy.breath_ref_explanation_young','Air travels through the windpipe to the lungs. At the tiny air sacs, oxygen moves into blood and carbon dioxide moves out. The diaphragm helps move air.') : t('stem.anatomy.breath_ref_explanation','Bulk airflow follows an air-pressure difference. Gas exchange follows oxygen and carbon dioxide partial-pressure differences across the air–blood barrier. Blood keeps flowing and the lungs retain air, so exchange can continue between breaths.');
          function updateBreathing(patch){setLabToolData(function(previous){var state=previous.anatomy||{};if(state.selectedStructure!==structure.id || (state._activeTab && state._activeTab!=='explore'))return previous;var old=state._breathingStudy;return Object.assign({},previous,{anatomy:Object.assign({},state,{_breathingStudy:Object.assign({},old&&typeof old==='object'&&!Array.isArray(old)?old:{},patch)})});});}
          var base = phase === 'in' ? 153 : 135;
          return h('details',{className:'anatomy-refinement anatomy-breathing-study','data-anatomy-breathing-study':structure.id},
            h('summary',null,t('stem.anatomy.breath_ref_title','How breathing works')),
            h('p',null,t('stem.anatomy.breath_ref_intro','Choose a moment in a quiet breath. Follow the diaphragm, the change in lung size, and the airflow arrow.')),
            h('div',{className:'anatomy-refinement-actions',role:'group','aria-label':t('stem.anatomy.breath_ref_choose','Choose a moment in quiet breathing')},phases.map(function(item){return h('button',{key:item.id,type:'button','aria-pressed':phase===item.id,'data-anatomy-breath-phase':item.id,onClick:function(){updateBreathing({phase:item.id});}},item.label);})),
            h('figure',null,
              h('svg',{viewBox:'0 0 240 195',role:'img','aria-label':current.label+'. '+current.text,'data-anatomy-breath-diagram':phase},
                h('path',{d:'M55 54 Q120 25 185 54 L198 171 Q120 191 42 171 Z',fill:'#eef2ff',stroke:'#64748b',strokeWidth:2}),
                h('path',{d:'M110 68 C91 51 60 80 60 123 L60 '+base+' Q88 '+(base-6)+' 110 '+(base-17)+' Z',fill:'#bae6fd',stroke:'#0369a1',strokeWidth:2}),
                h('path',{d:'M130 68 C149 51 180 80 180 123 L180 '+base+' Q152 '+(base-6)+' 130 '+(base-17)+' Z',fill:'#bae6fd',stroke:'#0369a1',strokeWidth:2}),
                h('path',{d:'M120 18 V74 M120 67 L103 93 M120 67 L137 93',fill:'none',stroke:'#0369a1',strokeWidth:7,strokeLinecap:'round'}),
                h('path',{d:'M48 170 Q120 '+(phase==='in'?151:105)+' 192 170',fill:'none',stroke:'#0f766e',strokeWidth:6,'data-anatomy-breath-diaphragm':phase==='in'?'lower':'dome'}),
                phase!=='rest'?h('g',{stroke:'#0f172a',strokeWidth:3,fill:'none','data-anatomy-breath-airflow':phase},h('path',{d:'M120 8 V48'}),h('path',{d:phase==='in'?'M114 40 L120 48 L126 40':'M114 16 L120 8 L126 16'})):null),
              h('figcaption',null,t('stem.anatomy.breath_ref_legend','Blue shapes: lungs. Curved green line: diaphragm. Arrow: airflow.'))),
            h('div',{role:'status','aria-live':'polite','aria-atomic':'true','data-anatomy-breath-description':phase},h('h5',null,current.label),h('p',null,current.text),!youngLearner?h('p',null,current.pressure):null),
            ttsBtn(current.label+'. '+current.text+(youngLearner?'':' '+current.pressure),t('stem.anatomy.breath_ref_read','Read this breathing step aloud')),
            h('p',null,t('stem.anatomy.breath_ref_limit','Schematic of quiet, unassisted breathing. Shapes and positions are simplified; the buttons do not set a breathing pace. Forced breathing can recruit additional muscles.')),
            h('fieldset',{'data-anatomy-breath-check':youngLearner?'exchange-site':'exchange-without-flow'},
              h('legend',null,youngLearner?t('stem.anatomy.breath_ref_question_young','Where does oxygen move from the air into the blood?'):t('stem.anatomy.breath_ref_question','At the end of a quiet breath, air stops flowing briefly. What can still happen?')),
              h('p',null,t('stem.anatomy.breath_ref_unscored','Try an explanation. You can change your answer; this check does not change your practice score or confidence.')),
              options.map(function(option){return h('button',{key:option.id,type:'button','data-anatomy-breath-answer':option.id,'aria-pressed':answer===option.id,onClick:function(){updateBreathing({answer:option.id,band:gradeBand});}},option.label);}),
              answer?h('div',{role:'status','data-anatomy-breath-feedback':answer===correctId?'correct':'review'},h('strong',null,answer===correctId?t('stem.anatomy.breath_ref_match','That fits the explanation.'):t('stem.anatomy.breath_ref_revisit','Revisit the two different processes.')),h('p',null,explanation),ttsBtn(explanation,t('stem.anatomy.breath_ref_read_feedback','Read the breathing explanation aloud'))):null),
            h('p',null,t('stem.anatomy.breath_ref_reflect','Explain how moving air differs from moving gases into or out of blood. Use the structure notes above to save your explanation.')),
            h('a',{href:'https://www.nhlbi.nih.gov/health/lungs/breathing-benefits',target:'_blank',rel:'noopener noreferrer'},t('stem.anatomy.breath_ref_source','NHLBI: Breathing and gas exchange')),
            !youngLearner?h('a',{href:'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing',target:'_blank',rel:'noopener noreferrer'},t('stem.anatomy.breath_ref_pressure_source','OpenStax: Pressure and breathing')):null
          );
        }
