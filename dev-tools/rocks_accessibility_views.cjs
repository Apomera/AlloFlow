// Representative saved-state fixtures; interactions are tested separately.
const modes=['landscape','rocks','minerals','compare','fieldwork','mystery','workbench','densityLab','quiz','weathHunt','notebook'];
const wb={spId:'pyrite',order:['quartz','feldspar','mica','calcite','halite','pyrite','talc','gypsum','magnetite','hematite','galena','fluorite'],scratch:{},streakDone:false,fizz:null,magnet:null,density:false,lens:false,guessedWrong:[],solvedId:null,guided:false};
const wx={tempSwing:20,rainMm:1200,pH:5.6,rock:'granite',hypothesis:'Warm wet conditions will favor chemical weathering.',understood:true,explanation:'More water helps chemical reactions change the minerals; freezing in cracks breaks rock.',log:[{t:30,rm:100,p:5.6,rk:'granite',st:'minimal'},{t:14,rm:1300,p:5.6,rk:'granite',st:'mixed'},{t:35,rm:1500,p:5.6,rk:'granite',st:'physDom'},{t:8,rm:2800,p:5.6,rk:'granite',st:'chemDom'}]};
const field={observed:['grains','minerals'],cited:['grains','minerals'],claim:'granite',reasoning:'Visible crystals suggest slow cooling.',attempts:[],feedback:'supported',solved:true};
const fieldResume={activeId:'deep-cooling',records:{
 'deep-cooling':field,
 'rounded-river':{fragmentObservation:{estimate:'17',shape:'',compared:false}},
 'resistant-ridge':{observed:['acid','map'],cited:['acid','map'],claim:'quartzite',reasoning:'Acid did not react.',feedback:'revise-evidence'}
}};
const trial={mineralId:'quartz',volume:10,initialWater:30,finalWater:40,mass:26.5,density:2.65,estimate:'2.65',units:'g/cm3',prediction:'A larger sample will have more mass.',explanation:'Mass divided by volume gives density.'};
const density={mineralId:'quartz',volume:10,initialWater:30,measured:{mass:true,before:true,after:true},estimate:'2.65',units:'g/cm3',prediction:trial.prediction,explanation:trial.explanation,trials:[trial,{...trial,volume:15,finalWater:45,mass:39.8,density:39.8/15},{...trial,mineralId:'magnetite',mass:51.8,density:5.18,estimate:'5.18'}]};
const notebook={compare:{kind:'rocks',left:'granite',right:'basalt',notes:{'rocks:basalt:granite':'Granite has visible crystals; basalt has finer grains.'}},fieldCases:{activeId:'deep-cooling',records:{'deep-cooling':field}},densityLab:density,wb:{...wb,archive:[]}};
const specimenNotes={
 'rocks:granite':{note:'Saffronjournal: visible interlocking crystals suggest slow cooling.',question:'How would its texture differ after rapid cooling?',bookmarked:true},
 'minerals:quartz':{note:'The vitreous surface and scratch resistance are useful observations.',question:'Which reference would separate quartz from calcite?',bookmarked:false}
};
const practiceRound={mode:'quiz',quizDone:true,quizIdx:35,quizScore:7,quizLog:{0:0,1:0,2:0,3:1},vocabLookedUp:['Streak'],researchPoints:13};
const journalBrowseNotes={
 ...specimenNotes,
 'rocks:basalt':{note:'Eveningcolumn: dark fine grains at the river outcrop.',question:'',bookmarked:true},
 'minerals:talc':{note:'Soft streak material felt smooth on the reference plate.',question:'',bookmarked:false}
};
const detailNavigationNotes=Object.fromEntries(['rocks:granite','rocks:basalt','rocks:diorite','minerals:quartz','minerals:calcite','minerals:gypsum'].map(key=>[key,{note:'Fieldnav saved observation for '+key,question:'',bookmarked:true}]));
// Each writing sample is distinct so an export can be checked for both
// included evidence and accidental disclosure from an unselected record.
const selectiveNotebook = {
 mode:'notebook', ...notebook,
 specimenNotes:{
  'rocks:granite':{note:'A pale vein crosses three grains.',question:'Did this vein form after the grains?',bookmarked:true},
  'minerals:quartz':{note:'The clear edge reflected the lamp.',question:'Which surface should I test next?',bookmarked:false}
 },
 densityLab:{...density,prediction:'I want to compare grains of equal size.',trials:density.trials.map((row,i) => ({...row,
   prediction:['This small quartz sample should displace less water.','My second quartz sample has more volume.','The magnetite feels heavier for its size.'][i]}))},
 weathHunt:{...wx,hypothesis:'I predict more change where water reaches the cracks.',explanation:'Two climates gave different model outcomes.'},
 wb:{...wb,archive:[{id:'investigation-1',specimenId:'pyrite',specimenLabel:'Pyrite',pool:'standard',
  report:'The unknown left a dark powder on porcelain.',reflection:'Next time I will also inspect its shape.'}]}
};
const views=modes.map(mode=>({name:mode,state:{mode}})).concat([
 {name:'quiz-visual-question',state:{mode:'quiz'},narrowText:true,screenshotSelector:'[data-rk-quiz-active]'},
 {name:'quiz-visual-feedback',state:{mode:'quiz',quizIdx:2,quizLog:{2:0},quizFeedback:{correct:false,chosenIdx:1,msg:'Incorrect.',explanation:'Compare the reference mineral hardness.'}},narrowText:true,screenshotSelector:'[data-rk-quiz-active]'},
 {name:'quiz-visual-topics',state:practiceRound,narrowText:true,screenshotSelector:'.rk-quiz-topics'},
 {name:'quiz-visual-all-topics',state:{mode:'quiz',quizDone:true,quizIdx:35,quizLog:Object.fromEntries(Array.from({length:36},(_,i)=>[i,i%6?1:0]))},narrowText:true,screenshotSelector:'.rk-quiz-topics'},
 {name:'quiz-visual-practice',state:{...practiceRound,quizPractice:{queue:[0,1,2],index:0,answers:{},done:false,active:true}},narrowText:true,screenshotSelector:'[data-rk-practice]'},
 {name:'quiz-visual-practice-done',state:{...practiceRound,quizPractice:{queue:[0,1,2],index:2,answers:{0:1,1:1,2:3},done:true,active:true}},narrowText:true,screenshotSelector:'[data-rk-practice-done]'},
 {name:'density-visual-unread',state:{mode:'densityLab'},narrowText:true,screenshotSelector:'[data-rk-density-measurement-section]'},
 {name:'density-visual-readings',state:{mode:'densityLab',densityLab:density},narrowText:true,screenshotSelector:'[data-rk-density-measurement-section]'},
 {name:'density-visual-largest',state:{mode:'densityLab',densityLab:{...density,mineralId:'galena',volume:30,initialWater:50,estimate:''}},narrowText:true,screenshotSelector:'[data-rk-density-instruments]'},
 {name:'density-visual-calculation',state:{mode:'densityLab',densityLab:{...density,feedback:'correct'}},narrowText:true,screenshotSelector:'form[aria-labelledby="rk-density-calculate-heading"]'},
 {name:'density-visual-trials',state:{mode:'densityLab',densityLab:density},narrowText:true,screenshotSelector:'.rk-density-chart'},
 {name:'comparison-visual-pair',state:{mode:'compare'},narrowText:true,screenshotSelector:'.rk-compare-specimens'},
 {name:'comparison-visual-rock-evidence',state:{mode:'compare',compare:{left:'conglom',right:'breccia'}},narrowText:true,screenshotSelector:'[data-rk-compare-evidence]'},
 {name:'comparison-visual-mineral-evidence',state:{mode:'compare',compare:{kind:'minerals',left:'pyrite',right:'magnetite',reference:6.5}},narrowText:true,screenshotSelector:'[data-rk-compare-evidence]'},
 {name:'comparison-visual-picker',state:{mode:'compare'},expand:['[data-rk-compare-presets]'],narrowText:true,screenshotSelector:'[data-rk-compare-presets]'},
 {name:'comparison-visual-filtered',state:{mode:'compare',compare:{left:'granite',right:'basalt',differencesOnly:true}},narrowText:true,screenshotSelector:'[data-rk-compare-evidence]'},
 {name:'visual-rock-gallery',state:{mode:'rocks',selectedRock:'granite',collection:{granite:'drill'}},narrowText:true,screenshotSelector:'[data-rk-rock-grid]'},
 {name:'visual-mineral-gallery',state:{mode:'minerals',selectedMineral:'pyrite'},narrowText:true,screenshotSelector:'[data-mineral-grid]'},
 {name:'visual-rock-intro',state:{mode:'rocks',selectedRock:'granite'},narrowText:true,screenshotSelector:'[data-rk-rock-card]'},
 {name:'visual-mineral-intro',state:{mode:'minerals',selectedMineral:'pyrite'},narrowText:true,screenshotSelector:'[data-rk-detail-intro]'},
 {name:'visual-mineral-facts',state:{mode:'minerals',selectedMineral:'pyrite'},narrowText:true,screenshotSelector:'[data-rk-mineral-props]'},
 {name:'activity-navigation-closed',state:{mode:'fieldwork'},narrowText:true,screenshotSelector:'[data-rocks-mode-nav]'},
 {name:'activity-navigation-open',state:{mode:'workbench'},openModeChoices:true,narrowText:true,screenshotSelector:'[data-rocks-mode-nav]'},
 {name:'field-resume-actions',state:{mode:'fieldwork',fieldCases:fieldResume},expand:['[data-rk-field-picker]'],narrowText:true,screenshotSelector:'[data-rk-field-picker]'},
 {name:'field-workspace-start',state:{mode:'fieldwork'},narrowText:true,screenshotSelector:'[data-rk-fieldwork]'},
 {name:'field-workspace-draft',state:{mode:'fieldwork',fieldCases:{...fieldResume,activeId:'rounded-river'}},narrowText:true,screenshotSelector:'[data-rk-field-next-action]'},
 {name:'field-workspace-supported',state:{mode:'fieldwork',fieldCases:fieldResume},narrowText:true,screenshotSelector:'[data-rk-field-stages]'},
 {name:'field-workspace-picker',state:{mode:'fieldwork',fieldCases:fieldResume},expand:['[data-rk-field-picker]'],narrowText:true,screenshotSelector:'[data-rk-field-picker]'},
 {name:'field-resume-notebook',state:{mode:'notebook',fieldCases:fieldResume},narrowText:true,screenshotSelector:'section[aria-labelledby="rk-nb-field"]'},
 {name:'rock-detail',state:{mode:'rocks',selectedRock:'granite'}},
 {name:'rock-thin-section',state:{mode:'rocks',selectedRock:'sandstone',thinSection:{xpl:true,stage:20}}},
 {name:'mineral-pyrite',state:{mode:'minerals',selectedMineral:'pyrite',streakResult:'Powder Streak Result: Greenish-black'}},
 {name:'mineral-diamond',state:{mode:'minerals',selectedMineral:'diamond',streakResult:'Powder Streak Result: None (too hard)'}},
 {name:'mineral-scratch',state:{mode:'minerals',selectedMineral:'quartz',scratchTool:'fingernail',scratchAnimProgress:100}},
 {name:'mineral-fizz',state:{mode:'minerals',selectedMineral:'calcite',fizzResult:'Fizz!'}},
 {name:'compare-minerals',state:{mode:'compare',compare:{kind:'minerals',left:'pyrite',right:'magnetite',notes:{'minerals:magnetite:pyrite':'Both have metallic luster.'}}}},
 {name:'field-feedback',state:{mode:'fieldwork',fieldCases:{activeId:'deep-cooling',records:{'deep-cooling':field}}}},
 {name:'mystery-active',state:{mode:'mystery',mystery:{rockId:'granite',offline:true,clues:['I cooled beneath Earth.','I have visible interlocking crystals.','My minerals include quartz and feldspar.'],cluesShown:1,revealed:false,solved:false}}},
 {name:'mystery-solved',state:{mode:'mystery',mystery:{rockId:'granite',offline:true,clues:['I cooled beneath Earth.','I have visible interlocking crystals.','My minerals include quartz and feldspar.'],cluesShown:2,revealed:false,solved:true}}},
 {name:'workbench-active',state:{mode:'workbench',wb:{...wb,toolsExpanded:true,candidatesExpanded:true}}},
 {name:'workbench-pending',state:{mode:'workbench',wb:{...wb,pending:{tool:'lens'},toolsExpanded:true,candidatesExpanded:true}}},
 {name:'workbench-claim',state:{mode:'workbench',wb:{...wb,lens:'metallic',streakDone:true,streakObs:'powder-greenish-black',selectedId:'pyrite',claimEvidence:['luster','streak'],claimReasoning:'both',claimConfidence:'very',candidatesExpanded:true}}},
 {name:'workbench-solved',state:{mode:'workbench',wb:{...wb,lens:'metallic',streakDone:true,streakObs:'powder-greenish-black',selectedId:'pyrite',solvedId:'pyrite',claimEvidence:['luster','streak'],claimReasoning:'both',claimConfidence:'very',candidatesExpanded:true}}},
 {name:'quiz-feedback',state:{mode:'quiz',quizIdx:0,quizScore:0,quizLog:{0:0},quizFeedback:{correct:false,chosenIdx:1,msg:'Incorrect.',explanation:'Look at the grain size and the origin of the rock.'}}},
 {name:'quiz-complete',state:{mode:'quiz',quizIdx:35,quizDone:true,quizScore:30,quizLog:Object.fromEntries(Array.from({length:36},(_,i)=>[i,i%6?1:0]))}},
 {name:'weathering-log',state:{mode:'weathHunt',weathHunt:wx}},
 {name:'weathering-model',state:{mode:'weathHunt',weathHunt:{...wx,modelOn:true,stuckRevealed:true}}},
 {name:'density-trials',state:{mode:'densityLab',densityLab:density}},
 {name:'notebook-populated',state:{mode:'notebook',...notebook}},
 {name:'journal-rock-editor',state:{mode:'rocks',selectedRock:'granite',specimenNotes},expand:['[data-rk-study-editor="rocks:granite"]'],screenshotSelector:'[data-rk-specimen-study="rocks:granite"]'},
 {name:'journal-mineral-editor',state:{mode:'minerals',selectedMineral:'quartz',specimenNotes},expand:['[data-rk-study-editor="minerals:quartz"]'],screenshotSelector:'[data-rk-specimen-study="minerals:quartz"]'},
 {name:'journal-saved-catalogue',state:{mode:'rocks',specimenNotes,catalogue:{rocks:{query:'saffronjournal',sort:'name',savedOnly:true}}}},
 {name:'journal-notebook',state:{mode:'notebook',...notebook,specimenNotes},expand:['[data-rk-nb-specimen="rocks:granite"]','[data-rk-nb-specimen="minerals:quartz"]'],screenshotSelector:'[data-rk-notebook]'},
 {name:'practice-active',state:{...practiceRound,quizPractice:{queue:[0,1,2],index:0,answers:{},done:false,active:true}},screenshotSelector:'[data-rk-practice]'},
 {name:'practice-feedback',state:{...practiceRound,quizPractice:{queue:[2],index:0,answers:{2:3},done:false,active:true}},screenshotSelector:'[data-rk-practice]'},
 {name:'practice-complete',state:{...practiceRound,quizPractice:{queue:[0,1,2],index:2,answers:{0:1,1:1,2:3},done:true,active:true}},screenshotSelector:'[data-rk-practice-done]'},
 {name:'journal-browser-filtered',state:{mode:'notebook',...notebook,specimenNotes:journalBrowseNotes,notebookUi:{journalQuery:'',journalFilter:'questions'}},expand:['[data-rk-nb-specimen="rocks:granite"]','[data-rk-nb-specimen="minerals:quartz"]'],screenshotSelector:'section[aria-labelledby="rk-nb-journal"]'},
 {name:'journal-browser-empty',state:{mode:'notebook',...notebook,specimenNotes:journalBrowseNotes,notebookUi:{journalQuery:'quartz',journalFilter:'bookmarked'}},screenshotSelector:'section[aria-labelledby="rk-nb-journal"]'},
 {name:'detail-navigation-rocks',state:{mode:'rocks',selectedRock:'diorite',specimenNotes:detailNavigationNotes,catalogue:{rocks:{query:'fieldnav',sort:'name',savedOnly:true}}},screenshotSelector:'[data-rk-detail-nav="rocks"]'},
 {name:'detail-navigation-minerals',state:{mode:'minerals',selectedMineral:'calcite',specimenNotes:detailNavigationNotes,catalogue:{minerals:{query:'fieldnav',sort:'hardness',savedOnly:true}}},screenshotSelector:'[data-rk-detail-nav="minerals"]'},
 {name:'detail-navigation-outside',state:{mode:'rocks',selectedRock:'obsidian',specimenNotes:detailNavigationNotes,catalogue:{rocks:{query:'fieldnav',sort:'name',savedOnly:true}}},screenshotSelector:'[data-rk-detail-nav="rocks"]'},
 {name:'workbench-guide-open',state:{mode:'workbench',wb:{...wb,toolsExpanded:true,candidatesExpanded:true}},expand:['[data-wb-property-guide]'],screenshotSelector:'[data-wb-property-guide]'},
 {name:'collection-shelf',state:{mode:'rocks',selectedType:'igneous',collection:{conglom:'key',travertine:'mystery',limestone:'drill'}},expand:['[data-rk-cabinet]'],screenshotSelector:'[data-rk-cabinet]'},
 {name:'field-fragment-measure',state:{mode:'fieldwork',fieldCases:{activeId:'rounded-river'}},screenshotSelector:'[data-rk-field-fragment]'},
 {name:'field-fragment-result',state:{mode:'fieldwork',fieldCases:{activeId:'rounded-river',records:{'rounded-river':{observed:['size','shape'],fragmentObservation:{estimate:'20',shape:'rounded',compared:true}}}}},screenshotSelector:'[data-rk-field-fragment]'},
 {name:'weathering-notebook',state:{mode:'notebook',weathHunt:wx},screenshotSelector:'[data-rk-nb-weathering]'},
 {name:'selective-report-choices',state:{...selectiveNotebook,notebookUi:{shareKeys:['journal:rocks:granite','compare:rocks:basalt:granite']}},expand:['[data-rk-nb-share-chooser]'],screenshotSelector:'[data-rk-nb-share-chooser]'},
 {name:'selective-report-empty',state:{mode:'notebook'},expand:['[data-rk-nb-share-chooser]'],screenshotSelector:'[data-rk-nb-share-chooser]'},
 {name:'selective-report-sections',state:selectiveNotebook,screenshotSelector:'[data-rk-notebook] > header'},
]);
module.exports={modes,views,wb,wx,field,fieldResume,density,notebook,specimenNotes,practiceRound,journalBrowseNotes,detailNavigationNotes,selectiveNotebook};
