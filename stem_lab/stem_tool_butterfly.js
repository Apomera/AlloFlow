// Butterfly Habitat Lab: a local summer habitat investigation, not a migration model.
// Movement, distance, energy and plant sizes are learning abstractions, not measured physiology.
(function () {
  'use strict';
  if (!window.StemLab || window.StemLab.isRegistered('butterfly')) return;
  // Simpler words: one switch, read at render, that swaps the passages a learner
  // must read to act for plain-language versions. Both say the same science.
  var bfPlain=false;
  function plain(full,simple){return bfPlain&&simple?simple:full;}
  var bfHostT=null;
  function __alloT(key,fallback){var v=null;try{v=bfHostT?bfHostT(key,fallback):null;}catch(_){v=null;}return v==null?fallback:v;}
  var __alloFill=function(template,values){return String(template).replace(/\{([A-Za-z0-9_]+)\}/g,function(m,k){return Object.prototype.hasOwnProperty.call(values,k)?String(values[k]):m;});};
  // Adult visitors share this summer habitat; the learner's life-cycle model
  // remains monarch-specific. Motion profiles are illustrative, not measured rates.
  var MEADOW_SPECIES=Object.freeze([
    Object.freeze({id:'monarch',latin:'Danaus plexippus',scale:1,wingRate:1,routeRate:1,routeRadius:1,altitude:0,glide:1,bask:1,
      get name(){return __alloT('stem.butterfly.species_monarch','Monarch');},
      get marks(){return __alloT('stem.butterfly.species_monarch_marks','Orange wings with dark veins and white-spotted black borders.');},
      get hosts(){return __alloT('stem.butterfly.species_monarch_hosts','Milkweeds feed its caterpillars. This is the species in your life-cycle investigation.');},
      source:'https://mdc.mo.gov/discover-nature/field-guide/monarch'}),
    Object.freeze({id:'tiger-swallowtail',latin:'Papilio glaucus',scale:1.1,wingRate:.83,routeRate:.9,routeRadius:1.12,altitude:.45,glide:1.2,bask:.85,
      get name(){return __alloT('stem.butterfly.species_tiger','Eastern tiger swallowtail');},
      get marks(){return __alloT('stem.butterfly.species_tiger_marks','The yellow form has black tiger stripes and tails on its hindwings. Some females have a dark form.');},
      get hosts(){return __alloT('stem.butterfly.species_tiger_hosts','Its caterpillars use trees such as tulip poplar and wild cherry, rather than milkweed.');},
      source:'https://ask.ifas.ufl.edu/publication/IN218'}),
    Object.freeze({id:'painted-lady',latin:'Vanessa cardui',scale:.65,wingRate:1.17,routeRate:1.13,routeRadius:.88,altitude:-.25,glide:.6,bask:1.55,
      get name(){return __alloT('stem.butterfly.species_painted','Painted lady');},
      get marks(){return __alloT('stem.butterfly.species_painted_marks','Orange-and-black upper wings, white marks near the tips, and small eyespots on the mottled underside.');},
      get hosts(){return __alloT('stem.butterfly.species_painted_hosts','Thistles and mallows are among its caterpillar hosts. Nectar flowers alone do not supply every life stage.');},
      source:'https://hort.extension.wisc.edu/articles/painted-lady-butterfly-vanessa-cardui/'}),
    Object.freeze({id:'cabbage-white',latin:'Pieris rapae',scale:.48,wingRate:1.35,routeRate:1.2,routeRadius:.72,altitude:-.65,glide:.3,bask:.5,
      get name(){return __alloT('stem.butterfly.species_white','Cabbage white');},
      get marks(){return __alloT('stem.butterfly.species_white_marks','White wings with dark tips and spots; the hindwing underside is pale yellow-green. Introduced to North America.');},
      get hosts(){return __alloT('stem.butterfly.species_white_hosts','Its caterpillars eat mustard-family plants. This adult visits milkweed flowers here; it does not lay monarch eggs.');},
      source:'https://mdc.mo.gov/discover-nature/field-guide/cabbage-white'})
  ]);
  var VISITOR_SPECIES=Object.freeze(['cabbage-white','painted-lady','tiger-swallowtail','monarch']);
  function meadowSpecies(id){return MEADOW_SPECIES.find(function(item){return item.id===id;})||MEADOW_SPECIES[0];}
  function visitorPatch(patches,index){
    var available=patches.filter(function(p){return p.nectar&&(VISITOR_SPECIES[index]!=='cabbage-white'||p.id==='milkweed');});
    return available[index%available.length]||null;
  }
  function watchedVisitorIndex(patches,patchId,speciesId){
    var selected=VISITOR_SPECIES.indexOf(speciesId);
    if(selected!==-1)return selected;
    for(var i=VISITOR_SPECIES.length-1;i>=0;i--){var site=visitorPatch(patches,i);if(site&&site.id===patchId)return i;}
    return 3;
  }

  var PLANTS = Object.freeze([
    Object.freeze({id:'milkweed',get name(){return __alloT('stem.butterfly.data_plant_milkweed_name','Common milkweed');},latin:'Asclepias syriaca',x:-42,z:-28,color:'#e6a8c2',nectar:true,host:true,
      get note(){return plain(__alloT('stem.butterfly.data_plant_milkweed_note','Milkweed provides leaves for monarch caterpillars. When in bloom, its flowers also offer nectar to adults.'),__alloT('stem.butterfly.data_plant_milkweed_note_simple_monarch','Monarch caterpillars eat milkweed leaves. Butterflies drink nectar from its flowers.'));}}),
    Object.freeze({id:'bergamot',get name(){return __alloT('stem.butterfly.data_plant_bergamot_name','Wild bergamot');},latin:'Monarda fistulosa',x:38,z:-54,color:'#bca6f1',nectar:true,host:false,
      get note(){return plain(__alloT('stem.butterfly.data_plant_bergamot_note','Flowering wild bergamot offers nectar for adult monarchs. It does not replace milkweed as food for monarch caterpillars.'),__alloT('stem.butterfly.data_plant_bergamot_note_simple_monarch','Butterflies drink nectar from bergamot flowers. Monarch caterpillars cannot eat bergamot.'));}}),
    Object.freeze({id:'lawn',get name(){return __alloT('stem.butterfly.data_plant_lawn_name','Mown lawn');},get latin(){return __alloT('stem.butterfly.data_plant_lawn_latin','A patch with no flowers or milkweed');},x:38,z:38,color:'#9fb87c',nectar:false,host:false,
      get note(){return plain(__alloT('stem.butterfly.data_plant_lawn_note','This mown patch has neither flowers for nectar nor milkweed leaves for monarch caterpillars. That describes this patch, not every lawn.'),__alloT('stem.butterfly.data_plant_lawn_note_simple','This short grass has no flowers and no milkweed. (Some lawns do have flowers.)'));}})
  ]);
  var DESIGNS=Object.freeze([
    Object.freeze({id:'lawn',get name(){return __alloT('stem.butterfly.data_design_lawn_name','Keep it mown');},get short(){return __alloT('stem.butterfly.data_design_lawn_short','Mown plot');},get detail(){return __alloT('stem.butterfly.data_design_lawn_detail','Short mown grass, as the plot is today');},nectar:false,host:false,color:'#9fb87c',
      get note(){return plain(__alloT('stem.butterfly.data_design_lawn_note','The mown restoration plot has no nectar flowers or milkweed leaves. Neither resource is present in this design.'),__alloT('stem.butterfly.data_design_lawn_note_simple','Short grass only: no flowers and no milkweed.'));}}),
    Object.freeze({id:'flowers',get name(){return __alloT('stem.butterfly.data_design_flowers_name','Plant wild bergamot');},get short(){return __alloT('stem.butterfly.data_design_flowers_short','Bergamot only');},get detail(){return __alloT('stem.butterfly.data_design_flowers_detail','A flowering patch of Monarda fistulosa');},nectar:true,host:false,color:'#bca6f1',
      get note(){return plain(__alloT('stem.butterfly.data_design_flowers_note','Flowering bergamot provides adult nectar. Monarch caterpillars still need milkweed leaves, which are absent from this design.'),__alloT('stem.butterfly.data_design_flowers_note_simple_monarch','Bergamot gives butterflies nectar. But there is no milkweed for monarch caterpillars.'));}}),
    Object.freeze({id:'mixed',get name(){return __alloT('stem.butterfly.data_design_mixed_name','Plant milkweed + bergamot');},get short(){return __alloT('stem.butterfly.data_design_mixed_short','Milkweed + bergamot');},get detail(){return __alloT('stem.butterfly.data_design_mixed_detail','Both species, established and in bloom');},nectar:true,host:true,color:'#e6a8c2',
      get note(){return plain(__alloT('stem.butterfly.data_design_mixed_note','This planting offers adult nectar and milkweed leaves for monarch caterpillars. Having both resources does not guarantee survival.'),__alloT('stem.butterfly.data_design_mixed_note_simple_monarch','This has nectar for butterflies and milkweed for monarch caterpillars. Having both still does not promise that every monarch lives.'));}})
  ]);
  var PREDICTIONS=Object.freeze([{id:'neither',get label(){return __alloT('stem.butterfly.data_prediction_neither_label','Neither resource');}},{id:'nectar',get label(){return __alloT('stem.butterfly.data_prediction_nectar_label','Nectar only');}},{id:'both',get label(){return __alloT('stem.butterfly.data_prediction_both_label','Nectar and host leaves');}}]);

  // ── Life cycle investigation ──────────────────────────────────────────
  // The learner plays the adult, so the caterpillar stage is the part of the
  // story they cannot fly to. This activity lets them place eggs on a patch
  // they have already examined and then advance the generation stage by
  // stage. The outcome is READ OFF the patch's host resource — milkweed
  // leaves or no milkweed leaves — so host-plant dependence is something the
  // learner observes, not something the tool asserts in a caption.
  // Stages are labelled developmental steps, not timed or measured rates.
  var STAGES=Object.freeze([
    Object.freeze({id:'egg',ordinal:'01',get name(){return __alloT('stem.butterfly.data_stage_egg_name','Egg');},get inline(){return __alloT('stem.butterfly.data_stage_egg_inline','egg');},
      get caption(){return plain(__alloT('stem.butterfly.data_stage_egg_caption','A monarch egg is laid on a leaf. It does not feed yet; what matters is the plant it sits on.'),__alloT('stem.butterfly.data_stage_egg_caption_simple','A tiny egg is laid on a leaf. It does not eat. What matters is which plant it is on.'));},
      get thriving(){return plain(__alloT('stem.butterfly.data_stage_egg_thriving','The egg rests on a milkweed leaf. When it hatches, the caterpillar will emerge onto its food plant.'),__alloT('stem.butterfly.data_stage_egg_thriving_simple','The egg is on a milkweed leaf. When it hatches, the caterpillar will be right on its food.'));},
      get failing(){return plain(__alloT('stem.butterfly.data_stage_egg_failing','The egg is on a plant with no milkweed leaves. It can still hatch, but no monarch caterpillar food is growing here.'),__alloT('stem.butterfly.data_stage_egg_failing_simple','The egg is not on milkweed. It can still hatch, but there is no food here for the caterpillar.'));}}),
    Object.freeze({id:'caterpillar',ordinal:'02',get name(){return __alloT('stem.butterfly.data_stage_caterpillar_name','Caterpillar');},get inline(){return __alloT('stem.butterfly.data_stage_caterpillar_inline','caterpillar');},
      get caption(){return plain(__alloT('stem.butterfly.data_stage_caterpillar_caption','The caterpillar feeds and grows. This is the stage that depends on milkweed leaves.'),__alloT('stem.butterfly.data_stage_caterpillar_caption_simple','The caterpillar eats and grows. It needs milkweed leaves.'));},
      get thriving(){return plain(__alloT('stem.butterfly.data_stage_caterpillar_thriving','The caterpillar is feeding on milkweed leaves and growing through its larval stage.'),__alloT('stem.butterfly.data_stage_caterpillar_thriving_simple','The caterpillar is eating milkweed leaves and growing bigger.'));},
      get failing(){return plain(__alloT('stem.butterfly.data_stage_caterpillar_failing','The caterpillar hatched with no milkweed leaves within reach. Nectar flowers are adult food and do not feed this stage; the generation does not continue here.'),__alloT('stem.butterfly.data_stage_caterpillar_failing_simple','The caterpillar has no milkweed to eat. Flowers feed butterflies, not caterpillars. The life cycle stops here.'));}}),
    Object.freeze({id:'chrysalis',ordinal:'03',get name(){return __alloT('stem.butterfly.data_stage_chrysalis_name','Chrysalis');},get inline(){return __alloT('stem.butterfly.data_stage_chrysalis_inline','chrysalis');},
      get caption(){return plain(__alloT('stem.butterfly.data_stage_chrysalis_caption','The caterpillar forms a chrysalis and reorganizes into an adult.'),__alloT('stem.butterfly.data_stage_chrysalis_caption_simple','The caterpillar makes a chrysalis. Inside, it changes into a butterfly.'));},
      get thriving(){return plain(__alloT('stem.butterfly.data_stage_chrysalis_thriving','A caterpillar that fed well forms its chrysalis, where metamorphosis takes place.'),__alloT('stem.butterfly.data_stage_chrysalis_thriving_simple','The well-fed caterpillar makes its chrysalis and starts to change.'));},
      get failing(){return plain(__alloT('stem.butterfly.data_stage_chrysalis_failing','No caterpillar completed feeding at this patch, so no chrysalis forms.'),__alloT('stem.butterfly.data_stage_chrysalis_failing_simple','No caterpillar could finish eating here, so there is no chrysalis.'));}}),
    Object.freeze({id:'adult',ordinal:'04',get name(){return __alloT('stem.butterfly.data_stage_adult_name','Adult');},get inline(){return __alloT('stem.butterfly.data_stage_adult_inline','adult');},
      get caption(){return plain(__alloT('stem.butterfly.data_stage_adult_caption','The adult emerges and feeds on flower nectar — the stage you fly.'),__alloT('stem.butterfly.data_stage_adult_caption_simple','The butterfly comes out and drinks nectar from flowers. You fly this stage.'));},
      get thriving(){return plain(__alloT('stem.butterfly.data_stage_adult_thriving','An adult emerges. From here it can fly to nectar flowers — in this patch or any other — the way you do.'),__alloT('stem.butterfly.data_stage_adult_thriving_simple','A butterfly comes out! It can fly to any flowers for nectar, just like you.'));},
      get failing(){return plain(__alloT('stem.butterfly.data_stage_adult_failing','No adult emerges from this patch this generation.'),__alloT('stem.butterfly.data_stage_adult_failing_simple','No butterfly comes out of this patch this time.'));}})
  ]);
  var OUTCOMES=Object.freeze([
    Object.freeze({id:'complete',get label(){return __alloT('stem.butterfly.data_outcome_complete_label','Reaches the adult stage');},get inline(){return __alloT('stem.butterfly.data_outcome_complete_inline','reaches the adult stage');}}),
    Object.freeze({id:'stalls',get label(){return __alloT('stem.butterfly.data_outcome_stalls_label','Stops before becoming an adult');},get inline(){return __alloT('stem.butterfly.data_outcome_stalls_inline','stops before becoming an adult');}})
  ]);
  function stage(id){return STAGES.find(function(st){return st.id===id;})||null;}
  function outcome(id){return OUTCOMES.find(function(o){return o.id===id;})||null;}
  // A generation completes only where monarch caterpillars have milkweed to eat.
  function generationSucceeds(p){return !!(p&&p.host);}
  function expectedOutcome(p){return generationSucceeds(p)?'complete':'stalls';}
  // The stage a generation can actually reach on this patch. Without host
  // leaves the caterpillar stage is where it stops.
  function reachedStage(p){return generationSucceeds(p)?STAGES.length-1:1;}
  function stageStatus(p,index){
    if(index===0)return generationSucceeds(p)?'thriving':'failing';
    return index<=reachedStage(p)&&generationSucceeds(p)?'thriving':'failing';
  }
  function cleanLifecycle(value){
    var v=value&&typeof value==='object'?value:{};
    var records=Array.isArray(v.broods)?v.broods.slice(-12):[],broods=[];
    records.forEach(function(r){
      if(!r||typeof r!=='object')return;
      var id=r.patch,note=knownPatchId(id);
      if(!note||!outcome(r.prediction)||!outcome(r.result))return;
      // A generation followed on the restoration plot describes the planting it
      // ran under. Without that tag the row cannot be shown truthfully once the
      // plot is replanted, so drop it.
      var plan=id==='restoration'&&design(r.plan)?r.plan:null;
      if(id==='restoration'&&!plan)return;
      var recordedPatch=plan?design(plan):PLANTS.find(function(p){return p.id===id;});
      if(r.result!==expectedOutcome(recordedPatch))return;
      broods=broods.filter(function(b){return b.patch!==id||(b.plan||null)!==plan;});
      var row={patch:id,prediction:r.prediction,result:r.result};
      if(plan)row.plan=plan;
      broods.push(row);
    });
    return {patch:knownPatchId(v.patch)?v.patch:null,prediction:outcome(v.prediction)?v.prediction:null,
      stage:stage(v.stage)?v.stage:null,broods:broods};
  }
  // Patch ids are validated against the fixed habitat list so a tampered save
  // cannot introduce a prototype key or an unknown plot.
  function knownPatchId(id){return typeof id==='string'&&(id==='restoration'||PLANTS.some(function(p){return p.id===id;}));}
  function design(id){return DESIGNS.find(function(d){return d.id===id;})||null;}
  function prediction(id){return PREDICTIONS.find(function(p){return p.id===id;})||null;}
  function resources(d){return d.host?'both':d.nectar?'nectar':'neither';}
  function cleanRestoration(value){
    var v=value&&typeof value==='object'?value:{},records=Array.isArray(v.trials)?v.trials.slice(-12):[];
    var trials=[];records.forEach(function(r){if(!r||!design(r.design)||!prediction(r.prediction))return;
      trials=trials.filter(function(t){return t.design!==r.design;});trials.push({design:r.design,prediction:r.prediction});});
    return {design:design(v.design)?v.design:'lawn',prediction:prediction(v.prediction)?v.prediction:null,trials:trials};
  }
  function restorationPatch(state){
    var d=design(state&&state.restoration&&state.restoration.design)||DESIGNS[0];
    return {id:'restoration',name:__alloT('stem.butterfly.data_restoration_name','Restoration plot'),latin:d.short,x:-42,z:38,color:d.color,nectar:d.nectar,host:d.host,note:d.note};
  }
  function habitats(state){return PLANTS.concat([restorationPatch(state)]);}
  function patch(id,state){return habitats(state).find(function(p){return p.id===id;})||null;}
  function applyPlan(state,id,guess){
    if(!design(id)||!prediction(guess))return {ok:false,message:__alloT('stem.butterfly.msg_plan_choose_first','Choose a planting plan and a resource prediction first.')};
    state.restoration.design=id;state.restoration.prediction=guess;state.paused=true;state.target=null;stopFlight(state);
    if(state.landed==='restoration'){state.landed=null;state.y=6;}
    // Replanting the plot replaces the habitat a running generation was living
    // in, so that generation no longer describes anything on the ground. Drop
    // it rather than let it finish against resources that are no longer there.
    if(state.lifecycle&&state.lifecycle.patch==='restoration'&&state.lifecycle.stage){state.lifecycle.stage=null;state.lifecycle.prediction=null;state.lifecycle.patch=null;}
    return {ok:true,message:__alloFill(__alloT('stem.butterfly.msg_plan_ready','{value1} is ready to explore. Flight is paused. Visit the restoration plot, land, and examine it to test your prediction.'),{value1:design(id).short})};
  }
  // The joining space stays outside the keys so a translation cannot lose it.
  function matchWords(matched){return (matched?plain(__alloT('stem.butterfly.msg_prediction_matched','Prediction matched.'),__alloT('stem.butterfly.msg_prediction_matched_simple','Your guess matched.')):plain(__alloT('stem.butterfly.msg_prediction_differed','Different from your prediction.'),__alloT('stem.butterfly.msg_prediction_differed_simple','Your guess was different.')))+' ';}
  function trialFeedback(record){var d=design(record.design);return matchWords(resources(d)===record.prediction)+d.note;}

  // Eggs may only be placed where the learner has already gathered evidence:
  // the investigation builds on the field journal rather than replacing it.
  function layEggs(s,patchId,guess){
    var p=patch(patchId,s);
    if(!p)return {ok:false,message:__alloT('stem.butterfly.msg_lay_choose_patch','Choose a habitat patch for this generation.')};
    if(!outcome(guess))return {ok:false,message:__alloT('stem.butterfly.msg_lay_predict_first','Predict what happens to this generation before laying eggs.')};
    if(!evidenceRecorded(s,p))return {ok:false,message:__alloFill(__alloT('stem.butterfly.msg_lay_examine_first','Examine {value1} first. Lay eggs only where you have recorded evidence.'),{value1:p.name})};
    s.lifecycle.patch=patchId;s.lifecycle.prediction=guess;s.lifecycle.stage='egg';
    return {ok:true,message:__alloFill(__alloT('stem.butterfly.msg_lay_done','Eggs laid at {value1}. Follow the generation stage by stage.'),{value1:p.name})};
  }
  // Advancing never invents an outcome: it walks the fixed stage list and
  // stops where this patch's resources stop it.
  function advanceStage(s){
    var lc=s.lifecycle,p=patch(lc.patch,s);
    if(!p||!lc.stage)return {ok:false,message:__alloT('stem.butterfly.msg_brood_lay_first','Lay eggs at a patch you have examined to begin a generation.')};
    var index=STAGES.findIndex(function(st){return st.id===lc.stage;}),limit=reachedStage(p);
    if(index>=limit)return {ok:false,message:__alloT('stem.butterfly.msg_advance_limit','This generation has gone as far as this patch allows. Record the result.')};
    var next=STAGES[index+1];lc.stage=next.id;
    var status=stageStatus(p,index+1);
    return {ok:true,message:next.ordinal+' · '+next.name+'. '+(status==='thriving'?next.thriving:next.failing)};
  }
  function broodResult(s){
    var lc=s.lifecycle,p=patch(lc.patch,s);
    if(!p||!lc.stage)return {ok:false,message:__alloT('stem.butterfly.msg_brood_lay_first','Lay eggs at a patch you have examined to begin a generation.')};
    if(!outcome(lc.prediction))return {ok:false,message:__alloT('stem.butterfly.msg_brood_predict_first','Start over and make a prediction before recording this generation.')};
    var index=STAGES.findIndex(function(st){return st.id===lc.stage;});
    if(index<reachedStage(p))return {ok:false,message:__alloT('stem.butterfly.msg_brood_keep_following','Keep following this generation before recording what happened.')};
    var plan=lc.patch==='restoration'?s.restoration.design:null;
    var record={patch:lc.patch,prediction:lc.prediction,result:expectedOutcome(p)};
    if(plan)record.plan=plan;
    lc.broods=lc.broods.filter(function(b){return b.patch!==record.patch||(b.plan||null)!==plan;}).concat([record]);
    // The stage clears (the generation is over) but the patch stays, so the
    // track keeps showing HOW FAR it got instead of blanking at the moment the
    // learner most wants to read it. `stage` null is what gates re-laying eggs.
    lc.prediction=null;lc.stage=null;
    return {ok:true,message:broodFeedback(record,p)};
  }
  function broodFeedback(record,p){
    var matched=record.prediction===record.result;
    return matchWords(matched)+(record.result==='complete'
      ?plain(__alloFill(__alloT('stem.butterfly.msg_brood_complete','{value1} offered what every stage needs, so a generation could run its whole cycle here — monarch caterpillars had milkweed leaves to eat. That is what this patch makes possible, not a count of how many would survive.'),{value1:p.name}),
        __alloFill(__alloT('stem.butterfly.msg_brood_complete_simple','{value1} had what every stage needs. The caterpillars had milkweed to eat, so the life cycle could finish. (This does not tell how many would live.)'),{value1:p.name}))
      :plain(__alloFill(__alloT('stem.butterfly.msg_brood_stalls','{value1} did not carry a generation to an adult. The caterpillar stage had no milkweed leaves, and adult nectar cannot substitute for it.'),{value1:p.name}),
        __alloFill(__alloT('stem.butterfly.msg_brood_stalls_simple','{value1} could not grow a butterfly. The caterpillars had no milkweed to eat, and flower nectar cannot replace it.'),{value1:p.name})));
  }
  // A brood row describes the plot AS PLANTED when it ran, so the restoration
  // plot only shows the row matching what is growing there now. Rows from an
  // earlier planting are kept (broodRowsFor) but never counted as evidence
  // about the plot as it stands -- the same rule season runs follow.
  function broodIsCurrent(s,b){return b.patch!=='restoration'||b.plan===s.restoration.design;}
  function broodFor(s,patchId){
    var plan=patchId==='restoration'?s.restoration.design:null;
    return s.lifecycle.broods.find(function(b){return b.patch===patchId&&(b.plan||null)===plan;})||null;
  }
  function broodRowsFor(s,patchId){return s.lifecycle.broods.filter(function(b){return b.patch===patchId;});}
  // Both choosers lock while a generation runs, so without this a learner who
  // laid eggs on the wrong patch has no way back. Abandoning records nothing:
  // an unfinished generation is not evidence about the habitat.
  function abandonBrood(s){
    var lc=s.lifecycle;
    if(!lc.stage)return {ok:false,message:__alloT('stem.butterfly.msg_abandon_none','No generation is running.')};
    var p=patch(lc.patch,s);
    lc.stage=null;lc.prediction=null;lc.patch=broodFor(s,lc.patch)?lc.patch:null;
    return {ok:true,message:p?__alloFill(__alloT('stem.butterfly.msg_abandon_done','Stopped following the generation at {value1}. Nothing was recorded. You can lay eggs again.'),{value1:p.name})
      :__alloT('stem.butterfly.msg_abandon_done_unknown','Stopped following the generation at that patch. Nothing was recorded. You can lay eggs again.')};
  }

  // ── Mowing and timing ─────────────────────────────────────
  // Resources can be present and still be unusable if they are cut down before
  // the stage that needs them gets there. Sources describe habitat as needing
  // protection from "untimely mowing"; they publish no plant counts or survival
  // rates, so this models PRESENCE and TIMING only -- never density or numbers.
  // Each stage occupies typical SUMMER days from egg-laying (Monarch Joint
  // Venture: egg 3-5 days, caterpillar 9-14, chrysalis 8-15; about a month in
  // all). The adult's span is its first days of nectar feeding before it can
  // leave. Cool weather stretches all of it; the days are typical, not fixed.
  var STAGE_DAYS=Object.freeze({egg:Object.freeze([0,4]),caterpillar:Object.freeze([4,18]),chrysalis:Object.freeze([18,30]),adult:Object.freeze([30,34])});
  // Kept for older callers: the week in which each stage ends.
  var STAGE_WEEK=Object.freeze({egg:1,caterpillar:3,chrysalis:5,adult:5});
  var MOWINGS=Object.freeze([
    Object.freeze({id:'never',day:null,week:null,get label(){return __alloT('stem.butterfly.data_mowing_never_label','Leave it uncut this summer');},get short(){return __alloT('stem.butterfly.data_mowing_never_short','No cut');},get labelInline(){return __alloT('stem.butterfly.data_mowing_never_label_inline','leave it uncut this summer');},get shortInline(){return __alloT('stem.butterfly.data_mowing_never_short_inline','no cut');},
      get note(){return plain(__alloT('stem.butterfly.data_mowing_never_note','Nothing is cut, so whatever grows here stays standing for the whole generation.'),__alloT('stem.butterfly.data_mowing_never_note_simple','Nothing is mowed, so the plants stay all summer.'));}}),
    Object.freeze({id:'early',day:10,week:2,get label(){return __alloT('stem.butterfly.data_mowing_early_label','Cut in early summer');},get short(){return __alloT('stem.butterfly.data_mowing_early_short','Cut week 2');},get labelInline(){return __alloT('stem.butterfly.data_mowing_early_label_inline','cut in early summer');},get shortInline(){return __alloT('stem.butterfly.data_mowing_early_short_inline','cut week 2');},
      get note(){return plain(__alloT('stem.butterfly.data_mowing_early_note','An early cut removes the milkweed leaves a caterpillar would have fed on.'),__alloT('stem.butterfly.data_mowing_early_note_simple','An early cut takes away the milkweed leaves the caterpillars need.'));}}),
    Object.freeze({id:'mid',day:24,week:4,get label(){return __alloT('stem.butterfly.data_mowing_mid_label','Cut in midsummer');},get short(){return __alloT('stem.butterfly.data_mowing_mid_short','Cut week 4');},get labelInline(){return __alloT('stem.butterfly.data_mowing_mid_label_inline','cut in midsummer');},get shortInline(){return __alloT('stem.butterfly.data_mowing_mid_short_inline','cut week 4');},
      get note(){return plain(__alloT('stem.butterfly.data_mowing_mid_note','This model keeps the chrysalis inside the patch. A midsummer cut removes its support; real caterpillars often leave their milkweed plant to find a secure pupation site.'),__alloT('stem.butterfly.data_mowing_mid_note_simple','A midsummer cut takes away the plants the chrysalis hangs on. (Real caterpillars often crawl away to make their chrysalis.)'));}}),
    Object.freeze({id:'late',day:36,week:6,get label(){return __alloT('stem.butterfly.data_mowing_late_label','Cut after the generation');},get short(){return __alloT('stem.butterfly.data_mowing_late_short','Cut week 6');},get labelInline(){return __alloT('stem.butterfly.data_mowing_late_label_inline','cut after the generation');},get shortInline(){return __alloT('stem.butterfly.data_mowing_late_short_inline','cut week 6');},
      get note(){return plain(__alloT('stem.butterfly.data_mowing_late_note','By this point the adult has emerged and can leave, so this cut does not interrupt the generation.'),__alloT('stem.butterfly.data_mowing_late_note_simple','By then the butterfly has come out and can fly away, so this cut does no harm.'));}})
  ]);
  function mowing(id){return MOWINGS.find(function(m){return m.id===id;})||null;}
  // A stage clears only if the plot stands until that stage is finished: a cut
  // on any day before a stage ends removes what it was using.
  // The learner places model eggs on any patch, so eggs do not require food.
  // The caterpillar needs milkweed; the model keeps its chrysalis in the patch
  // and assumes cutting removes its support. Real larvae can leave the host
  // plant to pupate. An adult needs nectar to refuel before leaving.
  // Matches what the life cycle activity already tells the learner: an egg laid
  // on the wrong plant can still hatch, so the generation fails at the
  // CATERPILLAR stage -- the first one that actually eats -- not at the egg.
  function stageNeedMet(p,stage){
    return stage==='egg'?true:stage==='caterpillar'?!!p.host
      :stage==='chrysalis'?(!!p.host||!!p.nectar):!!p.nectar;
  }
  function seasonOutcome(p,mowId){
    var mow=mowing(mowId);if(!p||!mow)return null;
    var steps=STAGES.map(function(st){
      var span=STAGE_DAYS[st.id],standing=mow.day===null||mow.day>=span[1];
      return {id:st.id,name:st.name,start:span[0],end:span[1],week:STAGE_WEEK[st.id],standing:standing,
        resource:stageNeedMet(p,st.id),cleared:standing&&stageNeedMet(p,st.id)};
    });
    var blocked=steps.filter(function(x){return !x.cleared;})[0]||null;
    var cutShort=!!(blocked&&blocked.resource&&!blocked.standing);
    return {steps:steps,completes:!blocked,blocked:blocked?blocked.id:null,cutShort:cutShort,
      // Naming WHY it stopped is the point: same patch, same plants, different
      // timing. "Cut short" is the case the resource table alone cannot show.
      reason:!blocked?plain(__alloT('stem.butterfly.msg_season_complete','Every stage found what it needed, and the plot was still standing when it needed it.'),__alloT('stem.butterfly.msg_season_complete_simple','Every stage had what it needed, and the plants were still there in time.'))
        :cutShort?plain(__alloFill(__alloT('stem.butterfly.msg_season_cut_short','The {value1} stage had what it needed growing here, but the plot was cut in week {value2}, while that stage still needed it (about days {value3} to {value4}).'),{value1:stage(blocked.id).inline,value2:mow.week,value3:blocked.start,value4:blocked.end}),
          __alloFill(__alloT('stem.butterfly.msg_season_cut_short_simple','The {value1} needed these plants, but they were mowed in week {value2}. That was too soon.'),{value1:stage(blocked.id).inline,value2:mow.week}))
        :plain(__alloFill(__alloT('stem.butterfly.msg_season_no_resource','The {value1} stage had nothing here to use, whether or not the plot was cut.'),{value1:stage(blocked.id).inline}),__alloFill(__alloT('stem.butterfly.msg_season_no_resource_simple','The {value1} had nothing here to use. Mowing did not matter.'),{value1:stage(blocked.id).inline}))};
  }
  // A mowing plan's note explains a TIMING result. Where the stage had nothing
  // to use, the cut changed nothing, and a note about it (or about an adult
  // that never emerged) would contradict the result it is attached to.
  function seasonNote(o,mow){return o&&mow&&(o.cutShort||o.completes)?' '+mow.note:'';}
  function cleanSeason(value){
    var v=value&&typeof value==='object'?value:{},records=Array.isArray(v.runs)?v.runs.slice(-12):[];
    var runs=[];records.forEach(function(r){
      if(!r||!mowing(r.mowing)||!knownPatchId(r.patch))return;
      if(r.prediction!=='complete'&&r.prediction!=='stop')return;
      if(r.result!=='complete'&&r.result!=='stop')return;
      // A restoration run is only about the planting it was run under, so it
      // carries that design. Rows for the fixed patches never need one.
      var plan=r.patch==='restoration'&&design(r.plan)?r.plan:null;
      if(r.patch==='restoration'&&!plan)return;
      var recordedPatch=plan?design(plan):PLANTS.find(function(p){return p.id===r.patch;});
      if(r.result!==(seasonOutcome(recordedPatch,r.mowing).completes?'complete':'stop'))return;
      runs=runs.filter(function(x){return !(x.patch===r.patch&&x.mowing===r.mowing&&(x.plan||null)===plan);});
      var row={patch:r.patch,mowing:r.mowing,prediction:r.prediction,result:r.result};
      if(plan)row.plan=plan;
      runs.push(row);
    });
    return {mowing:mowing(v.mowing)?v.mowing:'never',prediction:v.prediction==='complete'||v.prediction==='stop'?v.prediction:null,runs:runs};
  }
  // Running a season is evidence only where the learner has already examined the
  // patch -- the same bar the life cycle sets for laying eggs.
  function runSeason(s,patchId,mowId,guess){
    var p=patch(patchId,s),mow=mowing(mowId);
    if(!p||!mow)return {ok:false,message:__alloT('stem.butterfly.msg_season_choose_first','Choose a patch and a mowing plan first.')};
    if(guess!=='complete'&&guess!=='stop')return {ok:false,message:__alloT('stem.butterfly.msg_season_predict_first','Predict what happens to the generation before running the season.')};
    if(!evidenceRecorded(s,p))return {ok:false,message:__alloFill(__alloT('stem.butterfly.msg_season_examine_first','Examine {value1} first, so you know what is growing there.'),{value1:p.name})};
    var outcome=seasonOutcome(p,mowId),result=outcome.completes?'complete':'stop';
    var sn=s.season,plan=patchId==='restoration'?s.restoration.design:null;
    var row={patch:patchId,mowing:mowId,prediction:guess,result:result};
    if(plan)row.plan=plan;
    sn.runs=sn.runs.filter(function(x){return !(x.patch===patchId&&x.mowing===mowId&&(x.plan||null)===plan);})
      .concat([row]);
    sn.prediction=null;
    return {ok:true,outcome:outcome,result:result,matched:guess===result,
      message:matchWords(guess===result)+outcome.reason+seasonNote(outcome,mow)};
  }
  // A run describes the plot AS IT WAS PLANTED then. Once the restoration plot
  // is replanted, its earlier rows no longer describe anything on the ground,
  // so they stop counting as current evidence -- the same rule the life cycle
  // applies when a replant ends a running generation.
  function seasonRunIsCurrent(s,r){return r.patch!=='restoration'||r.plan===s.restoration.design;}
  function currentSeasonRuns(s){return s.season.runs.filter(function(r){return seasonRunIsCurrent(s,r);});}
  function seasonRunFor(s,patchId,mowId){
    var plan=patchId==='restoration'?s.restoration.design:null;
    return s.season.runs.find(function(r){return r.patch===patchId&&r.mowing===mowId&&(r.plan||null)===plan;})||null;
  }
  // Two runs on the SAME patch, under the same planting, differing only in
  // mowing are what isolates timing as the cause. Until the learner has such a
  // pair, the timing claim is untested however many single runs they have done.
  function timingPairs(s){
    var runs=currentSeasonRuns(s),pairs=[];
    runs.forEach(function(win){
      if(win.result!=='complete')return;
      runs.filter(function(r){
        if(r.patch!==win.patch||r.result!=='stop')return false;
        var o=seasonOutcome(patch(r.patch,s),r.mowing);
        return !!(o&&o.cutShort);
      }).forEach(function(cut){pairs.push({patch:win.patch,kept:win.mowing,cut:cut.mowing});});
    });
    return pairs;
  }

  // ── Glossary ──────────────────────────────────────────────────────────
  // The lab is rated for grades 4-12 and its own copy leans on terms a
  // younger reader will not have: host plant, chrysalis, instar, restoration.
  // Definitions are written against the cited sources, and each one says how
  // the term is used HERE so the glossary and the activities cannot drift.
  var GLOSSARY = Object.freeze([
    Object.freeze({id:'Proboscis',get term(){return __alloT('stem.butterfly.gloss_proboscis_term','Proboscis');},get definition(){return __alloT('stem.butterfly.gloss_proboscis_definition','The adult butterfly’s long, flexible drinking tube. It coils when not in use and uncoils to reach liquid food such as nectar.');},get here(){return __alloT('stem.butterfly.gloss_proboscis_here','Choose Drinking tube close-up during a flower visit, then move Visit progress to inspect how the tube extends.');}}),
    Object.freeze({id:'Pollen',get term(){return __alloT('stem.butterfly.gloss_pollen_term','Pollen');},get definition(){return __alloT('stem.butterfly.gloss_pollen_definition','Material produced by a flower’s anthers that carries the male reproductive cells of the plant. It is different from nectar, the liquid food the adult butterfly drinks.');},get here(){return __alloT('stem.butterfly.gloss_pollen_here','The enlarged yellow grains or packets ride outside the butterfly. Compare what stays on the leg with what reaches the next flower.');}}),
    Object.freeze({id:'Pollination',get term(){return __alloT('stem.butterfly.gloss_pollination_term','Pollination');},get definition(){return __alloT('stem.butterfly.gloss_pollination_definition','The transfer of pollen to a receptive part of a flower of the same plant species. Fertilization and seed development are later processes, and are not guaranteed by a flower visit.');},get here(){return __alloT('stem.butterfly.gloss_pollination_here','Compare contact with missed contact in the final feeding step. A butterfly may sip nectar without delivering pollen.');}}),
    Object.freeze({id:'Stigma',get term(){return __alloT('stem.butterfly.gloss_stigma_term','Stigma');},get definition(){return __alloT('stem.butterfly.gloss_stigma_definition','The receptive part of a flower where compatible pollen can begin germinating. Flower structures differ; milkweed receives a pollen packet through a specialized slit.');},get here(){return __alloT('stem.butterfly.gloss_stigma_here','The pollen close-up shows the bergamot stigma or milkweed receiving slit. The contact comparison moves this surface outside the leg’s path.');}}),
    Object.freeze({id:'Pollinium',get term(){return __alloT('stem.butterfly.gloss_pollinium_term','Pollinium');},get definition(){return __alloT('stem.butterfly.gloss_pollinium_definition','A compact mass of pollen grains. Milkweed carries these masses in linked pairs called pollinaria; one mass can enter a receptive slit in another milkweed flower.');},get here(){return __alloT('stem.butterfly.gloss_pollinium_here','Watch a milkweed visit to follow one enlarged pollen mass from the leg into a receiving slit while its partner remains carried.');}}),
    Object.freeze({id:'Host plant',get term(){return __alloT('stem.butterfly.gloss_host_plant_term','Host plant');},
      get definition(){return __alloT('stem.butterfly.gloss_host_plant_definition','The plant a caterpillar can actually eat. Female monarchs lay eggs on milkweed because monarch caterpillars eat only milkweed. A plant can be full of flowers and still not be a host plant.');},
      get here(){return __alloT('stem.butterfly.gloss_host_plant_here','In this lab, "milkweed leaves present" is what makes a patch a host plant for monarchs.');}}),
    Object.freeze({id:'Nectar plant',get term(){return __alloT('stem.butterfly.gloss_nectar_plant_term','Nectar plant');},
      get definition(){return __alloT('stem.butterfly.gloss_nectar_plant_definition','A flowering plant whose nectar feeds adult butterflies. Nectar fuels flight and egg-laying, but it is not food for caterpillars.');},
      get here(){return __alloT('stem.butterfly.gloss_nectar_plant_here','Examining a flowering patch refills your flight energy meter. That is the adult stage feeding.');}}),
    Object.freeze({id:'Milkweed',get term(){return __alloT('stem.butterfly.gloss_milkweed_term','Milkweed');},
      get definition(){return __alloT('stem.butterfly.gloss_milkweed_definition','The group of plants (genus Asclepias) that monarch caterpillars depend on. Its flowers also offer nectar, so milkweed can serve both the adult and the caterpillar.');},
      get here(){return __alloT('stem.butterfly.gloss_milkweed_here','Common milkweed (Asclepias syriaca) is the one patch here that provides both resources.');}}),
    Object.freeze({id:'Larva / caterpillar',get term(){return __alloT('stem.butterfly.gloss_larva_term','Larva / caterpillar');},
      get definition(){return __alloT('stem.butterfly.gloss_larva_definition','The feeding and growing stage that hatches from the egg. A monarch caterpillar grows through five stages, shedding its skin between them.');},
      get here(){return __alloT('stem.butterfly.gloss_larva_here','This is the stage that stops a generation when no milkweed is within reach.');}}),
    Object.freeze({id:'Instar',get term(){return __alloT('stem.butterfly.gloss_instar_term','Instar');},
      get definition(){return __alloT('stem.butterfly.gloss_instar_definition','One growth step between two molts. A monarch caterpillar passes through five instars, getting larger at each.');},
      get here(){return __alloT('stem.butterfly.gloss_instar_here','The lab shows the caterpillar as one step. Instars are what that single step is made of.');}}),
    Object.freeze({id:'Chrysalis / pupa',get term(){return __alloT('stem.butterfly.gloss_chrysalis_term','Chrysalis / pupa');},
      get definition(){return __alloT('stem.butterfly.gloss_chrysalis_definition','The stage inside which a caterpillar reorganizes into an adult butterfly. It hangs from a stem or other support and does not feed.');},
      get here(){return __alloT('stem.butterfly.gloss_chrysalis_here','This model places the chrysalis inside the patch and assumes mowing removes its support. Real caterpillars often leave their milkweed plant to find a secure place to pupate.');}}),
    Object.freeze({id:'Metamorphosis',get term(){return __alloT('stem.butterfly.gloss_metamorphosis_term','Metamorphosis');},
      get definition(){return __alloT('stem.butterfly.gloss_metamorphosis_definition','The whole change from egg to caterpillar to chrysalis to adult, in which the animal is rebuilt rather than simply growing bigger.');},
      get here(){return __alloT('stem.butterfly.gloss_metamorphosis_here','Following a generation walks through these four stages in order.');}}),
    Object.freeze({id:'Generation / brood',get term(){return __alloT('stem.butterfly.gloss_generation_term','Generation / brood');},
      get definition(){return __alloT('stem.butterfly.gloss_generation_definition','One round of the life cycle, from eggs laid to the adults that emerge from them.');},
      get here(){return __alloT('stem.butterfly.gloss_generation_here','"Follow a generation" tracks one of these on a patch you have examined.');}}),
    Object.freeze({id:'Habitat restoration',get term(){return __alloT('stem.butterfly.gloss_habitat_restoration_term','Habitat restoration');},
      get definition(){return __alloT('stem.butterfly.gloss_habitat_restoration_definition','Planting or managing land so it provides what a species needs. For monarchs that means milkweed for caterpillars and nectar flowers for adults, protected from things like poorly timed mowing.');},
      get here(){return __alloT('stem.butterfly.gloss_habitat_restoration_here','The fourth patch is yours to restore. Each plan changes what the plot offers.');}}),
    Object.freeze({id:'Resource',get term(){return __alloT('stem.butterfly.gloss_resource_term','Resource');},
      get definition(){return __alloT('stem.butterfly.gloss_resource_definition','Something an organism needs and uses. Different stages of one species can need completely different resources.');},
      get here(){return __alloT('stem.butterfly.gloss_resource_here','This lab tracks two: nectar for adults, and milkweed leaves for caterpillars.');}}),
    Object.freeze({id:'Evidence',get term(){return __alloT('stem.butterfly.gloss_evidence_term','Evidence');},
      get definition(){return __alloT('stem.butterfly.gloss_evidence_definition','A record of something you observed, which can support or contradict a claim. What you did not observe is not evidence, however reasonable it sounds.');},
      get here(){return __alloT('stem.butterfly.gloss_evidence_here','The claim panel counts patches you examined, generations and seasons you recorded, and flower visits you explicitly recorded.');}}),
    Object.freeze({id:'Prediction',get term(){return __alloT('stem.butterfly.gloss_prediction_term','Prediction');},
      get definition(){return __alloT('stem.butterfly.gloss_prediction_definition','What you expect to happen, stated before you find out. A prediction that turns out wrong is still useful: it tells you your reasoning needs changing.');},
      get here(){return __alloT('stem.butterfly.gloss_prediction_here','The planting, generation and seasonal investigations ask for one first, and record whether it matched.');}})
  ]);
  function glossaryTerm(name){return GLOSSARY.find(function(g){return g.id===name||g.term===name;})||null;}

  // ── Field report ──────────────────────────────────────────
  // A learner can build real evidence here and then have no way to hand it to a
  // teacher. The report is assembled ONLY from records they made: nothing is
  // inferred, no section appears for work not done, and a replanted row is
  // reported as such rather than quietly dropped or quietly counted.
  function reportLines(s){
    var out=[__alloT('stem.butterfly.report_title','Butterfly Habitat Lab — field report'),__alloT('stem.butterfly.report_subtitle','Monarch (Danaus plexippus) · summer meadow investigation'),''];
    // A row whose planting has been replaced keeps its line and gains this note.
    function replacedNote(line){return __alloFill(__alloT('stem.butterfly.report_replaced_note','{value1} (this planting has since been replaced)'),{value1:line});}
    function predictedLine(matched,guess){return __alloFill(matched?__alloT('stem.butterfly.report_predicted_matched','    predicted: {value1} — matched'):__alloT('stem.butterfly.report_predicted_differed','    predicted: {value1} — differed'),{value1:guess});}
    var seen=PLANTS.filter(function(p){return s.observations.indexOf(p.id)>=0;});
    out.push(__alloFill(__alloT('stem.butterfly.report_patches_heading','PATCHES EXAMINED ({value1} of {value2})'),{value1:seen.length,value2:PLANTS.length}));
    if(!seen.length)out.push(__alloT('stem.butterfly.report_none_yet','  none yet'));
    seen.forEach(function(p){
      out.push('  ' + p.name + ' (' + p.latin + ')');
      out.push(p.nectar
        ?(p.host?__alloT('stem.butterfly.report_patch_both','    nectar for adults: present; milkweed leaves for caterpillars: present'):__alloT('stem.butterfly.report_patch_nectar_only','    nectar for adults: present; milkweed leaves for caterpillars: absent'))
        :(p.host?__alloT('stem.butterfly.report_patch_host_only','    nectar for adults: absent; milkweed leaves for caterpillars: present'):__alloT('stem.butterfly.report_patch_neither','    nectar for adults: absent; milkweed leaves for caterpillars: absent')));
    });
    out.push('');
    out.push(__alloFill(__alloT('stem.butterfly.report_plantings_heading','PLANTING COMPARISONS ({value1} of {value2})'),{value1:s.restoration.trials.length,value2:DESIGNS.length}));
    if(!s.restoration.trials.length)out.push(__alloT('stem.butterfly.report_none_yet','  none yet'));
    DESIGNS.forEach(function(d){
      var t=s.restoration.trials.find(function(x){return x.design===d.id;});
      if(!t)return;
      out.push(__alloFill(d.nectar
        ?(d.host?__alloT('stem.butterfly.report_planting_both','  {value1}: nectar present, milkweed leaves present'):__alloT('stem.butterfly.report_planting_nectar_only','  {value1}: nectar present, milkweed leaves absent'))
        :(d.host?__alloT('stem.butterfly.report_planting_host_only','  {value1}: nectar absent, milkweed leaves present'):__alloT('stem.butterfly.report_planting_neither','  {value1}: nectar absent, milkweed leaves absent')),{value1:d.short}));
      out.push(predictedLine(resources(d)===t.prediction,prediction(t.prediction).label));
    });
    out.push('');
    var broods=s.lifecycle.broods;
    out.push(__alloFill(__alloT('stem.butterfly.report_generations_heading','GENERATIONS FOLLOWED ({value1})'),{value1:broods.length}));
    if(!broods.length)out.push(__alloT('stem.butterfly.report_none_yet','  none yet'));
    broods.forEach(function(b){
      var p=patch(b.patch,s),name=p?p.name:b.patch;
      out.push('  ' + name + (b.plan?' [' + design(b.plan).short + ']':'') + ': ' + outcome(b.result).inline);
      var predicted=predictedLine(b.prediction===b.result,outcome(b.prediction).inline);
      out.push(broodIsCurrent(s,b)?predicted:replacedNote(predicted));
    });
    out.push('');
    var runs=s.season.runs;
    out.push(__alloFill(__alloT('stem.butterfly.report_seasons_heading','SEASONS RUN ({value1})'),{value1:runs.length}));
    if(!runs.length)out.push(__alloT('stem.butterfly.report_none_yet','  none yet'));
    runs.forEach(function(r){
      var p=patch(r.patch,s),name=p?p.name:r.patch;
      out.push(__alloFill(r.result==='complete'?__alloT('stem.butterfly.report_season_whole_cycle','  {value1}, {value2}: ran the whole cycle'):__alloT('stem.butterfly.report_season_stopped','  {value1}, {value2}: stopped before an adult'),
        {value1:name + (r.plan?' [' + design(r.plan).short + ']':''),value2:mowing(r.mowing).shortInline}));
      var predicted=predictedLine(r.prediction===r.result,r.prediction==='complete'?__alloT('stem.butterfly.report_season_guess_whole','whole cycle'):__alloT('stem.butterfly.report_season_guess_early','stops early'));
      out.push(seasonRunIsCurrent(s,r)?predicted:replacedNote(predicted));
    });
    var visits=cleanPollination(s.pollination).visits;
    if(visits.length){
      out.push('');
      out.push(__alloFill(__alloT('stem.butterfly.report_pollination_heading','POLLINATION VISITS RECORDED ({value1})'),{value1:visits.length}));
      visits.forEach(function(row){
        var p=patch(row.patch,s),name=p?p.name:row.patch;
        out.push('  ' + name + (row.plan?' [' + design(row.plan).short + ']':'') + ' — ' + (row.species==='milkweed'?__alloT('stem.butterfly.data_plant_milkweed_name','Common milkweed'):__alloT('stem.butterfly.data_plant_bergamot_name','Wild bergamot')));
        var visit=row.contact?__alloT('stem.butterfly.report_pollination_contact',"    Contact: nectar was sipped and pollen reached the next flower's receptive surface."):__alloT('stem.butterfly.report_pollination_miss','    Missed contact: nectar was sipped, but pollen stayed on the butterfly.');
        out.push(pollinationIsCurrent(s,row)?visit:replacedNote(visit));
      });
      out.push(__alloT('stem.butterfly.report_pollination_caveat','  These modeled visits show pollen transfer, not fertilization or guaranteed seed development.'));
    }
    var pairs=timingPairs(s);
    if(pairs.length){
      out.push('');
      out.push(__alloT('stem.butterfly.report_timing_heading','TIMING COMPARISONS'));
      pairs.forEach(function(pair){
        var p=patch(pair.patch,s);
        out.push(__alloFill(__alloT('stem.butterfly.report_timing_line','  {value1}: {value2} completed, {value3} did not — same plants, different timing.'),
          {value1:p?p.name:pair.patch,value2:mowing(pair.kept).shortInline,value3:mowing(pair.cut).shortInline}));
      });
    }
    var mission=missionStatus(s);
    out.push('');
    out.push(__alloT('stem.butterfly.report_mission_heading','MY MISSION: THE RESTORATION PLOT'));
    mission.checks.forEach(function(c){out.push('  '+(c.done?'[x] ':'[ ] ')+c.label);});
    out.push('  '+mission.summary);
    var practice=casesSummary(s),answered=cleanCases(s.cases).answers;
    if(practice.checked){
      out.push('');
      out.push(__alloFill(__alloT('stem.butterfly.report_cases_heading','PRACTICE: FIELD CASES ({value1} of {value2} checked, {value3} matched the model)'),{value1:practice.checked,value2:practice.total,value3:practice.matched}));
      CASES.forEach(function(c){var a=answered[c.id];if(!a)return;var fb=caseFeedback(c,a),key=caseAnswer(c);
        out.push(fb.matched
          ?__alloFill(__alloT('stem.butterfly.report_case_matched','  {value1}: I predicted {value2} ({value3}) — matched'),{value1:c.title,value2:caseStop(a.stop).inline,value3:caseReason(a.reason).inline})
          :__alloFill(__alloT('stem.butterfly.report_case_differed','  {value1}: I predicted {value2} ({value3}) — the model shows {value4} ({value5})'),{value1:c.title,value2:caseStop(a.stop).inline,value3:caseReason(a.reason).inline,value4:caseStop(key.stop).inline,value5:caseReason(key.reason).inline}));});
      out.push(__alloT('stem.butterfly.report_cases_caveat','  Practice cases apply the model to new places. They are not evidence about this meadow.'));
    }
    out.push('');
    var notebook=cleanNotebook(s.notebook),cited=notebookEvidence(s);
    if(notebook.claim||notebook.reasoning.trim()||notebook.question.trim()||notebook.evidence.length){
      out.push(__alloT('stem.butterfly.report_notes_heading','MY CONCLUSION — LEARNER NOTES'));
      out.push(__alloFill(__alloT('stem.butterfly.report_notes_claim','  Claim: {value1}'),{value1:claim(notebook.claim)?claim(notebook.claim).label:__alloT('stem.butterfly.report_not_chosen','not chosen yet')}));
      var interpretation=INTERPRETATIONS.find(function(item){return item.id===notebook.interpretation;});
      out.push(__alloFill(__alloT('stem.butterfly.report_notes_interpretation','  My interpretation: {value1}'),{value1:interpretation?interpretation.label:__alloT('stem.butterfly.report_not_chosen','not chosen yet')}));
      out.push(__alloFill(__alloT('stem.butterfly.report_notes_cited','  Cited records ({value1}):'),{value1:cited.selected.length}));
      cited.selected.forEach(function(line){out.push('    - '+line.text);});
      if(!cited.selected.length)out.push(__alloT('stem.butterfly.report_notes_none_selected','    none selected'));
      if(cited.missing.length)out.push(cited.missing.length===1?__alloT('stem.butterfly.report_notes_review_needed_one','  Review needed: 1 selected record no longer describes the current planting and is not included as current evidence.'):__alloFill(__alloT('stem.butterfly.report_notes_review_needed_other','  Review needed: {value1} selected records no longer describe the current planting and are not included as current evidence.'),{value1:cited.missing.length}));
      out.push(__alloFill(__alloT('stem.butterfly.report_notes_explanation','  My explanation: {value1}'),{value1:notebook.reasoning.trim()||__alloT('stem.butterfly.report_not_written','not written yet')}));
      if(notebook.question.trim())out.push(__alloFill(__alloT('stem.butterfly.report_notes_question','  My next question: {value1}'),{value1:notebook.question.trim()}));
      out.push(__alloT('stem.butterfly.report_notes_caveat',"  These notes are the learner's interpretation, not an automatically verified conclusion."));
      out.push('');
    }
    out.push(__alloT('stem.butterfly.report_not_heading','WHAT THIS REPORT IS NOT'));
    // One paragraph, one key: the line breaks are part of the text so a
    // translation can wrap its own lines.
    __alloT('stem.butterfly.report_not_body','  These are results from a teaching model. It shows whether a patch offers\n  what each stage needs and whether the plants were still standing when that\n  stage needed them. It does not count butterflies, estimate survival, or\n  model weather, predators, parasites or disease.').split('\n').forEach(function(line){out.push(line);});
    return out;
  }
  // Route through the shell's alloCopyText first: Gemini Canvas refuses
  // navigator.clipboard by permissions policy. Resolves false so the UI can
  // offer the text for manual copying instead of failing silently.
  function copyReportText(text,canContinue){
    function legacyCopyPreservingSelection(){
      if(canContinue&&!canContinue())return false;
      var active=document.activeElement,selection=window.getSelection(),ranges=[],control=null,anchor=selection&&selection.anchorNode?{node:selection.anchorNode,offset:selection.anchorOffset,focus:selection.focusNode,focusOffset:selection.focusOffset}:null;
      if(selection)for(var i=0;i<selection.rangeCount;i++)ranges.push(selection.getRangeAt(i).cloneRange());
      try{if(active&&typeof active.selectionStart==='number')control={start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection};}catch(_){}
      var area=document.createElement('textarea'),ok=false,scrollX=window.scrollX,scrollY=window.scrollY;
      area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(area);
      try{area.select();ok=!!document.execCommand('copy');}catch(_){ok=false;}
      finally{
        // The temporary selection must not take keyboard focus or replace the
        // learner's selection when the clipboard succeeds or is denied.
        var ownsFocus=document.activeElement===area||document.activeElement===active;area.remove();
        if(ownsFocus&&active&&active.isConnected){
          try{active.focus({preventScroll:true});}catch(_){}
          try{if(selection){selection.removeAllRanges();ranges.forEach(function(range){if(range.startContainer.isConnected&&range.endContainer.isConnected)selection.addRange(range);});if(ranges.length===1&&anchor&&anchor.node.isConnected&&anchor.focus&&anchor.focus.isConnected&&typeof selection.setBaseAndExtent==='function')selection.setBaseAndExtent(anchor.node,anchor.offset,anchor.focus,anchor.focusOffset);}}catch(_){}
          try{if(control)active.setSelectionRange(control.start,control.end,control.direction);}catch(_){}
          window.scrollTo(scrollX,scrollY);
        }
      }
      return ok;
    }
    return Promise.resolve().then(function(){
      if(canContinue&&!canContinue())return false;
      if(typeof window.alloCopyText==='function')return Promise.resolve(window.alloCopyText(text)).then(function(ok){return ok!==false;});
      if(navigator.clipboard&&navigator.clipboard.writeText)return Promise.resolve().then(function(){return navigator.clipboard.writeText(text);}).then(function(){return true;},legacyCopyPreservingSelection);
      return legacyCopyPreservingSelection();
    }).catch(function(){return false;});
  }
  function fieldReport(s){return reportLines(s).join("\n");}
  function reportIsEmpty(s){
    var n=cleanNotebook(s.notebook);
    return !s.observations.length&&!s.restoration.trials.length&&!s.lifecycle.broods.length&&!s.season.runs.length&&!cleanPollination(s.pollination).visits.length&&!Object.keys(cleanCases(s.cases).answers).length&&!n.claim&&!n.reasoning.trim()&&!n.question.trim()&&!n.evidence.length;
  }

  // ── Drawing a conclusion ──────────────────────────────────────────────
  // The old panel asked one fixed question and answered it from a count of
  // patch visits, so it stayed silent about the planting comparisons and the
  // generations the learner had followed. This replaces it with a claim the
  // learner picks and a response assembled from what they ACTUALLY recorded.
  // The tool never announces a claim is true on its own authority: it reports
  // which of the learner's own observations bear on it, and says plainly when
  // the evidence for it has not been gathered yet.
  var CLAIMS=Object.freeze([
    Object.freeze({id:'nectar-enough',sound:false,
      get label(){return __alloT('stem.butterfly.claim_nectar_enough_label','Flowers with nectar are enough to support monarchs here');},
      get verdict(){return __alloT('stem.butterfly.claim_verdict_unsupported','Your records do not support that claim.');},
      get why(){return __alloT('stem.butterfly.claim_nectar_enough_why','Nectar feeds the adult stage you fly. Every generation you followed on a nectar-only patch stopped at the caterpillar stage, which needs milkweed leaves.');}}),
    Object.freeze({id:'needs-both',sound:true,
      get label(){return __alloT('stem.butterfly.claim_needs_both_label','Monarchs need nectar for adults and milkweed for caterpillars');},
      get verdict(){return __alloT('stem.butterfly.claim_verdict_supported','Your records support that claim.');},
      get why(){return __alloT('stem.butterfly.claim_needs_both_why','Adults refuel at any flowering patch, but only patches with milkweed leaves carried a generation through the caterpillar stage to an adult.');}}),
    Object.freeze({id:'timing-irrelevant',sound:false,needs:'season',
      get label(){return __alloT('stem.butterfly.claim_timing_irrelevant_label','If the right plants are there, when the patch is mown does not matter');},
      get verdict(){return __alloT('stem.butterfly.claim_verdict_unsupported','Your records do not support that claim.');},
      get why(){return __alloT('stem.butterfly.claim_timing_irrelevant_why','You ran the same patch, with the same plants, under two mowing plans and got two different outcomes. A cut that lands before a stage needs the plant removes it just as surely as never planting it.');}}),
    Object.freeze({id:'feeding-always-pollinates',sound:false,needs:'pollination',
      get label(){return __alloT('stem.butterfly.claim_feeding_always_pollinates_label','Every nectar visit transfers pollen to the next flower');},
      get verdict(){return __alloT('stem.butterfly.claim_verdict_unsupported','Your records do not support that claim.');},
      get why(){return __alloT('stem.butterfly.claim_feeding_always_pollinates_why','Your recorded visits compare the same flowers with and without contact. Pollen reached the receptive surface when contact occurred; the butterfly still sipped nectar when contact was missed, but no pollen transferred. Feeding alone does not establish pollination.');}}),
    Object.freeze({id:'green-enough',sound:false,
      get label(){return __alloT('stem.butterfly.claim_green_enough_label','Any green, planted patch will do');},
      get verdict(){return __alloT('stem.butterfly.claim_verdict_unsupported','Your records do not support that claim.');},
      get why(){return __alloT('stem.butterfly.claim_green_enough_why','The mown lawn and the flowering bergamot are both green and planted, and neither fed a monarch caterpillar. What matters is which species are growing, not how green the patch looks.');}})
  ]);
  function claim(id){return CLAIMS.find(function(c){return c.id===id;})||null;}
  // Evidence is counted, never invented. Each line names a record the learner
  // made and what it shows; an empty list means the claim cannot be judged yet.
  function evidenceFor(s){
    var lines=[],stalled=[],completed=[],nectarOnlyStalled=[],hostComplete=[],nonHostStalled=[];
    habitats(s).forEach(function(p){
      var key=p.id+(p.id==='restoration'?':'+s.restoration.design:''),name=p.name+(p.id==='restoration'?' ('+design(s.restoration.design).short+')':'');
      if(evidenceRecorded(s,p))
        lines.push({id:'patch:'+key,kind:'patch',text:__alloFill(p.nectar
          ?(p.host?__alloT('stem.butterfly.ev_patch_both','{value1}: nectar present, milkweed leaves present.'):__alloT('stem.butterfly.ev_patch_nectar_only','{value1}: nectar present, no milkweed leaves.'))
          :(p.host?__alloT('stem.butterfly.ev_patch_host_only','{value1}: no nectar, milkweed leaves present.'):__alloT('stem.butterfly.ev_patch_neither','{value1}: no nectar, no milkweed leaves.')),{value1:name})});
      var b=broodFor(s,p.id);
      if(b){
        (b.result==='complete'?completed:stalled).push(name);
        if(p.host&&b.result==='complete')hostComplete.push(name);
        if(!p.host&&b.result==='stalls'){
          nonHostStalled.push(name);
          if(p.nectar)nectarOnlyStalled.push(name);
        }
        lines.push({id:'brood:'+key,kind:'brood',text:__alloFill(b.result==='complete'?__alloT('stem.butterfly.ev_brood_complete','{value1}: the generation you followed reached the adult stage.'):__alloT('stem.butterfly.ev_brood_stalled','{value1}: the generation you followed stopped before becoming an adult.'),{value1:name})});
      }
    });
    var pairs=timingPairs(s);
    currentSeasonRuns(s).forEach(function(r){
      var p=patch(r.patch,s);if(!p)return;
      var key=p.id+(r.plan?':'+r.plan:''),name=p.name+(r.plan?' ('+design(r.plan).short+')':'');
      lines.push({id:'season:'+key+':'+r.mowing,kind:'season',text:__alloFill(r.result==='complete'?__alloT('stem.butterfly.ev_season_complete','{value1}, {value2}: the generation ran its whole cycle.'):__alloT('stem.butterfly.ev_season_stopped','{value1}, {value2}: the generation stopped before an adult emerged.'),{value1:name,value2:mowing(r.mowing).shortInline})});
    });
    pairs.forEach(function(pair){
      var p=patch(pair.patch,s);if(!p)return;
      var key=p.id+(p.id==='restoration'?':'+s.restoration.design:''),name=p.name+(p.id==='restoration'?' ('+design(s.restoration.design).short+')':'');
      lines.push({id:'timing:'+key+':'+pair.kept+':'+pair.cut,kind:'timing',text:__alloFill(__alloT('stem.butterfly.ev_timing_line','{value1} ran both ways: {value2} completed, {value3} did not. Same plants, different timing.'),{value1:name,value2:mowing(pair.kept).shortInline,value3:mowing(pair.cut).shortInline})});
    });
    var visits=currentPollinationVisits(s);
    visits.forEach(function(row){
      var p=patch(row.patch,s),key=row.patch+(row.plan?':'+row.plan:''),name=p.name+(row.plan?' ('+design(row.plan).short+')':'');
      lines.push({id:'pollination:'+key+':'+(row.contact?'contact':'miss'),kind:'pollination',text:__alloFill(row.contact
        ?__alloT('stem.butterfly.ev_pollination_contact',"{value1} — {value2}, recorded model visit: the butterfly sipped nectar and pollen contacted the next flower's receptive surface and transferred.")
        :__alloT('stem.butterfly.ev_pollination_miss','{value1} — {value2}, recorded model visit: the butterfly sipped nectar, but pollen missed the receptive surface and stayed on the butterfly.'),
        {value1:name,value2:row.species==='milkweed'?__alloT('stem.butterfly.data_plant_milkweed_name','Common milkweed'):__alloT('stem.butterfly.data_plant_bergamot_name','Wild bergamot')})});
    });
    return {lines:lines,broodsComplete:completed,broodsStalled:stalled,
      nectarOnlyStalled:nectarOnlyStalled,hostComplete:hostComplete,nonHostStalled:nonHostStalled,
      // Counted the same way the lines are: a brood from an earlier planting of
      // the restoration plot is kept as a record but is not current evidence.
      patches:s.observations.length,trials:s.restoration.trials.length,
      broods:s.lifecycle.broods.filter(function(b){return broodIsCurrent(s,b);}).length,
      seasons:currentSeasonRuns(s).length,timingPairs:pairs,pollinationVisits:visits,pollinationPairs:pollinationPairs(s)};
  }
  // Patch names listed as "A and B" (or "A and B and C"): the joiner is a whole
  // template so a translation can change the word and the order.
  function bfJoinAnd(names){
    return names.length?names.reduce(function(acc,name){return __alloFill(__alloT('stem.butterfly.claim_list_and','{value1} and {value2}'),{value1:acc,value2:name});}):'';
  }
  // A claim about what caterpillars need can only be tested by following a
  // generation. Comparing resources alone cannot settle it, and the tool says so.
  function judgeClaim(s,id){
    var c=claim(id);if(!c)return null;
    var ev=evidenceFor(s);
    // A completed milkweed brood cannot test whether nectar alone is enough.
    // Judge each claim from the particular comparison or counterexample it
    // needs, and describe only the records that the learner actually made.
    var tested=false,nextStep='',why='';
    if(c.needs==='pollination'){
      tested=ev.pollinationPairs.length>0;
      nextStep=__alloT('stem.butterfly.claim_next_pollination','At the same flowering patch and planting, finish and record two model flower visits: one touching the receptive surface and one missing it. Use the final visit step at 100% progress, then Record this flower visit for each case.');
      why=c.why;
    }else if(c.needs==='season'){
      tested=ev.timingPairs.length>0;
      nextStep=__alloT('stem.butterfly.claim_next_season','To test timing, run the SAME patch twice under different mowing plans: leave a milkweed patch uncut, then cut it before the caterpillar or chrysalis stage.');
      why=c.why;
    }else if(id==='nectar-enough'){
      tested=ev.nectarOnlyStalled.length>0;
      nextStep=__alloT('stem.butterfly.claim_next_nectar_enough','To test nectar alone, follow a generation on Wild bergamot or a bergamot-only restoration plot and record the result.');
      why=__alloFill(__alloT('stem.butterfly.claim_why_nectar_enough','{value1}: your recorded generation stopped at the caterpillar stage despite nectar being present. Nectar feeds adults; monarch caterpillars need milkweed leaves.'),{value1:bfJoinAnd(ev.nectarOnlyStalled)});
    }else if(id==='needs-both'){
      tested=ev.hostComplete.length>0&&ev.nectarOnlyStalled.length>0;
      nextStep=!ev.hostComplete.length&&!ev.nectarOnlyStalled.length
        ?__alloT('stem.butterfly.claim_next_needs_both_neither',"To compare the stages' needs, follow a generation on Common milkweed and another on Wild bergamot, then record both results.")
        :!ev.hostComplete.length?__alloT('stem.butterfly.claim_next_needs_both_host','Next, follow a generation on Common milkweed or a milkweed + bergamot restoration plot and record the result. You already have a nectar-only comparison.')
        :__alloT('stem.butterfly.claim_next_needs_both_nectar','Next, follow a generation on Wild bergamot or a bergamot-only restoration plot and record the result. A milkweed success alone does not test whether nectar could substitute for host leaves.');
      why=__alloFill(__alloT('stem.butterfly.claim_why_needs_both','{value1} reached the adult stage, while {value2} stopped at the caterpillar stage. Both offered adult nectar; only the successful planting offered milkweed leaves. This comparison supports different food needs for adults and caterpillars in the model.'),{value1:bfJoinAnd(ev.hostComplete),value2:bfJoinAnd(ev.nectarOnlyStalled)});
    }else if(id==='green-enough'){
      tested=ev.nonHostStalled.length>0;
      nextStep=__alloT('stem.butterfly.claim_next_green_enough','To test whether any green patch will do, follow a generation on Mown lawn or Wild bergamot and record the result.');
      why=__alloFill(__alloT('stem.butterfly.claim_why_green_enough','{value1}: your recorded generation stopped before an adult emerged. A green patch without milkweed leaves did not feed the monarch caterpillar, so green appearance alone was not enough.'),{value1:bfJoinAnd(ev.nonHostStalled)});
    }
    return {claim:c,evidence:ev,tested:tested,
      verdict:tested?c.verdict:__alloT('stem.butterfly.claim_verdict_untested','You have not tested this claim yet.'),
      why:tested?why:nextStep,nextStep:tested?'':nextStep};
  }

  // Keep learner writing separate from model evidence. Citations refer to
  // records, never to editable copies of the model's findings.
  var INTERPRETATIONS=Object.freeze([
    {id:'supports',get label(){return __alloT('stem.butterfly.interp_supports_label','My evidence supports this claim');}},
    {id:'challenges',get label(){return __alloT('stem.butterfly.interp_challenges_label','My evidence challenges this claim');}},
    {id:'unsure',get label(){return __alloT('stem.butterfly.interp_unsure_label','I need more evidence to decide');}}
  ]);
  function cleanNotebook(value){
    var v=value&&typeof value==='object'?value:{},ids=[];
    (Array.isArray(v.evidence)?v.evidence.slice(0,64):[]).forEach(function(id){
      if(typeof id==='string'&&/^(patch|brood|season|timing|pollination):[a-z:-]{1,100}$/.test(id)&&ids.indexOf(id)<0&&ids.length<8)ids.push(id);
    });
    return {claim:claim(v.claim)?v.claim:'',interpretation:INTERPRETATIONS.some(function(i){return i.id===v.interpretation;})?v.interpretation:'',
      evidence:ids,reasoning:typeof v.reasoning==='string'?v.reasoning.slice(0,1600):'',question:typeof v.question==='string'?v.question.slice(0,600):''};
  }
  function notebookEvidence(s){
    var n=cleanNotebook(s.notebook),available=evidenceFor(s).lines;
    return {available:available,selected:available.filter(function(line){return n.evidence.indexOf(line.id)>=0;}),
      missing:n.evidence.filter(function(id){return !available.some(function(line){return line.id===id;});})};
  }
  function notebookReady(s){
    var n=cleanNotebook(s.notebook),records=notebookEvidence(s);
    return !!(n.claim&&n.interpretation&&n.reasoning.trim()&&records.selected.length>=2&&!records.missing.length);
  }
  function investigationSteps(s){
    var ev=evidenceFor(s),records=notebookEvidence(s);
    var generationReady=judgeClaim(s,'needs-both').tested;
    var steps=[
      {id:'explore',name:__alloT('stem.butterfly.step_explore_name','Explore'),done:s.observations.length===3,progress:__alloFill(__alloT('stem.butterfly.step_explore_progress','{value1} / 3 reference patches'),{value1:s.observations.length}),
        prompt:plain(__alloT('stem.butterfly.step_explore_prompt','Examine the flowers and leaves at all three reference patches. A visit alone does not record evidence.'),__alloT('stem.butterfly.step_explore_prompt_simple','Land at all three patches and press Examine patch at each one. Just flying there does not count.'))},
      {id:'design',name:__alloT('stem.butterfly.step_design_name','Redesign'),done:s.restoration.trials.length>=2,progress:__alloFill(__alloT('stem.butterfly.step_design_progress','{value1} / 3 plantings examined'),{value1:s.restoration.trials.length}),
        prompt:plain(__alloT('stem.butterfly.step_design_prompt','Predict, apply, and examine at least two restoration plans. Compare which resources changed.'),__alloT('stem.butterfly.step_design_prompt_simple','Try at least two plans for the restoration plot. Guess first, then plant it and examine it.'))},
      {id:'cycle',name:__alloT('stem.butterfly.step_cycle_name','Follow'),done:generationReady,progress:generationReady?__alloT('stem.butterfly.step_cycle_progress_done','Contrasting generations recorded')
          :__alloFill(ev.broods===1?__alloT('stem.butterfly.step_cycle_progress_one','{value1} generation recorded'):__alloT('stem.butterfly.step_cycle_progress_other','{value1} generations recorded'),{value1:ev.broods}),
        prompt:s.lifecycle.stage?plain(__alloT('stem.butterfly.step_cycle_prompt_running','Finish the generation in progress and record its result.'),__alloT('stem.butterfly.step_cycle_prompt_running_simple','Finish following your eggs, then press Record result.')):judgeClaim(s,'needs-both').why},
      {id:'season',name:__alloT('stem.butterfly.step_season_name','Compare timing'),done:ev.timingPairs.length>0,
        progress:__alloFill(ev.timingPairs.length===1?__alloT('stem.butterfly.step_season_progress_one','{value1} timing comparison'):__alloT('stem.butterfly.step_season_progress_other','{value1} timing comparisons'),{value1:ev.timingPairs.length}),
        prompt:plain(__alloT('stem.butterfly.step_season_prompt','Use one milkweed patch for two seasons: leave it uncut, then try an earlier cut. Keep the plants the same.'),__alloT('stem.butterfly.step_season_prompt_simple','Pick one milkweed patch. Run it once with no mowing and once with an early cut. Compare.'))},
      {id:'notebook',name:__alloT('stem.butterfly.step_notebook_name','Explain'),done:notebookReady(s),progress:notebookReady(s)?__alloT('stem.butterfly.step_notebook_progress_done','Conclusion assembled'):__alloFill(__alloT('stem.butterfly.step_notebook_progress','{value1} / 2 records cited'),{value1:records.selected.length}),
        prompt:records.missing.length?plain(__alloT('stem.butterfly.step_notebook_prompt_review','Some cited records describe an earlier planting. Review those citations before finishing.'),__alloT('stem.butterfly.step_notebook_prompt_review_simple','Some records you ticked are from an old planting. Check them before you finish.')):plain(__alloT('stem.butterfly.step_notebook_prompt','Choose a claim, cite at least two records, and explain how they support or challenge your idea.'),__alloT('stem.butterfly.step_notebook_prompt_simple','Pick a claim, tick at least two of your records, and explain what they show.'))}
    ];
    return {steps:steps,completed:steps.filter(function(item){return item.done;}).length,next:steps.find(function(item){return !item.done;})||null};
  }

  // ── Illustrations ─────────────────────────────────────────────────────
  // Small decorative drawings shared by the panels. Every one is aria-hidden:
  // the stage or resource it shows is always named in text beside it.
  // A decorative natural-history plate; all learning content is supplied as text.
  function bfBotanicalPlate(h){
    var k=0,parts=[],ink='#293a30',sage='#739074',vein='#d4ddbb';
    function el(tag,attrs,children){attrs.key='plate-'+k++;return h(tag,attrs,children);}
    function path(d,fill,stroke,width,extra){
      var a={d:d,fill:fill||'none',stroke:stroke||'none',strokeWidth:width||0,strokeLinecap:'round',strokeLinejoin:'round'};
      if(extra)Object.keys(extra).forEach(function(key){a[key]=extra[key];});
      return el('path',a);
    }
    function leaf(x,y,angle,scale,fill){
      return el('g',{transform:'translate('+x+' '+y+') rotate('+angle+') scale('+scale+')'},[
        path('M0 0C8-15 28-20 47-15C39 0 19 10 0 0Z',fill||sage,'#586e52',.7),
        path('M1 0Q24-8 44-14',null,vein,.9),
        path('M12-3L14-12M21-6L24-15M31-9L34-17M12-3L19 2M22-6L31-3M32-10L39-8',null,vein,.55)
      ]);
    }
    // A quiet engraved halo with the small alignment marks of a specimen plate.
    parts.push(el('circle',{cx:211,cy:112,r:102,fill:'#e8eacb',opacity:.48}));
    parts.push(el('circle',{cx:211,cy:112,r:93,fill:'none',stroke:'#89946e',strokeWidth:.6,opacity:.28}));
    parts.push(path('M106 112H118M304 112H316M211 7V17M211 207V217',null,'#8c9470',.8,{opacity:.48}));
    parts.push(path('M126 181Q156 209 194 212M251 16Q282 28 300 55',null,'#a1a47b',.7,{opacity:.55}));
    [[124,49],[286,186],[136,193],[310,74],[101,152]].forEach(function(p){
      parts.push(el('circle',{cx:p[0],cy:p[1],r:1.25,fill:'#aaa273',opacity:.7}));
    });
    // Milkweed: opposite leaves and an umbel of small dusty-rose blossoms.
    parts.push(path('M57 230C59 191 68 151 74 111C77 94 80 79 84 65',null,'#6a7c56',2));
    parts.push(path('M62 195C47 174 35 159 24 141M71 137Q46 118 43 105M72 133Q91 115 106 105',null,'#7a8960',1.15));
    parts.push(leaf(62,197,-164,1.16,'#849b73'));
    parts.push(leaf(62,197,-37,1.03,'#93a77b'));
    parts.push(leaf(69,160,-157,1.18,'#718d68'));
    parts.push(leaf(69,160,-31,1.05,'#8b9f77'));
    parts.push(leaf(75,123,-159,.9,'#93a880'));
    parts.push(leaf(75,123,-28,.78,'#728c68'));
    parts.push(leaf(28,147,-161,.66,'#a1ad85'));
    parts.push(leaf(42,169,-80,.63,'#7e976c'));
    [[60,68],[67,56],[79,49],[89,52],[101,60],[108,72],[96,78],[81,76],[70,78],[56,78]].forEach(function(p,i){
      parts.push(path('M80 88Q'+(p[0]+5)+' 77 '+p[0]+' '+p[1],null,'#8b9274',.65));
      var florets=[];
      [0,72,144,216,288].forEach(function(a){
        var r=a*Math.PI/180;
        florets.push(el('ellipse',{cx:p[0]+Math.cos(r)*2.65,cy:p[1]+Math.sin(r)*2.65,rx:2.35,ry:1.8,transform:'rotate('+a+' '+(p[0]+Math.cos(r)*2.65)+' '+(p[1]+Math.sin(r)*2.65)+')',fill:i%3===0?'#bf8e97':'#d8afb2',stroke:'#9d7b88',strokeWidth:.45}));
      });
      florets.push(el('circle',{cx:p[0],cy:p[1],r:1.55,fill:'#f3dfca',stroke:'#b99880',strokeWidth:.45}));
      parts.push(el('g',{},florets));
    });
    // Fine meadow grasses give the opposite edge an airy, asymmetrical frame.
    parts.push(path('M350 230Q349 158 365 74M343 230Q333 160 324 135M358 230Q369 178 396 143M339 230Q329 200 310 189',null,'#9a9e72',1));
    parts.push(path('M353 183Q370 159 380 127M354 156Q346 127 348 110M361 102Q376 84 383 61',null,'#a5a67b',.8));
    parts.push(leaf(350,189,-45,.82,'#a8b18a'));
    parts.push(leaf(350,168,-148,.71,'#9ba984'));
    parts.push(leaf(354,143,-39,.64,'#b4bc95'));
    parts.push(leaf(359,116,-153,.54,'#9fae85'));
    [[365,75,-7],[369,59,15],[372,43,24],[380,128,22],[384,113,24],[389,99,28],[396,144,39],[402,132,42],[349,112,-18],[347,97,-14],[325,134,-28],[320,121,-28],[315,108,-33]].forEach(function(p){
      parts.push(el('ellipse',{cx:p[0],cy:p[1],rx:2.6,ry:7.1,transform:'rotate('+p[2]+' '+p[0]+' '+p[1]+')',fill:'#c3bd8f',stroke:'#9f9c72',strokeWidth:.65}));
      parts.push(path('M'+p[0]+' '+(p[1]+4)+'L'+(p[0]+1)+' '+(p[1]-4),null,'#e9dfb7',.7));
    });
    // A few low bergamot flowers tie the illustrated habitat to the lab.
    [[302,210,288,184],[319,228,317,174],[337,229,340,193]].forEach(function(p,i){
      parts.push(path('M'+p[0]+' '+p[1]+'Q'+(p[2]+8)+' '+(p[3]+21)+' '+p[2]+' '+p[3],null,'#738769',1.25));
      parts.push(leaf(p[0]-2,p[1]-11,-153,.46,'#8c9d76'));
      var flower=[];
      [-14,-9,-4,1,6,11].forEach(function(dx,j){
        var tip=p[3]-8-(j%3)*3;
        flower.push(path('M'+p[2]+' '+(p[3]+2)+'Q'+(p[2]+dx)+' '+(p[3]-4)+' '+(p[2]+dx)+' '+tip,null,j%2?'#a693b6':'#b3a0bf',2.4));
        flower.push(path('M'+(p[2]+dx)+' '+tip+'l-2 -3m2 3l2 -3',null,'#967ea5',.7));
      });
      flower.push(path('M'+(p[2]-8)+' '+p[3]+'Q'+p[2]+' '+(p[3]+7)+' '+(p[2]+8)+' '+p[3],null,'#788968',2));
      parts.push(el('g',{},flower));
    });
    // Monarch wing cells and marginal spots, mirrored about the body.
    var wings=[];
    [-1,1].forEach(function(side){
      var wing=[];
      wing.push(path('M-4 5C-23-2-62-4-77 16C-87 33-77 58-61 67C-52 72-47 67-42 70C-33 72-30 63-24 63C-15 59-8 35-3 14Z',ink,ink,1.2));
      wing.push(path('M-8 12C-25 3-56 4-68 20C-77 34-66 53-54 58C-40 65-19 48-8 12Z','#e9a249',ink,1.1));
      wing.push(path('M-7 10Q-37 10-67 27M-7 10Q-33 22-62 47M-7 10Q-21 34-45 60M-7 10Q-14 36-26 54M-31 17Q-40 32-43 60M-40 13Q-54 25-62 46',null,ink,1.65));
      wing.push(path('M-4 10C-19-11-53-64-88-79C-99-84-111-84-114-72C-120-45-87-8-35 15C-20 21-9 21-4 10Z',ink,ink,1.3));
      wing.push(path('M-11 6C-27-17-56-59-88-71C-95-74-102-75-105-68C-108-49-78-16-34 6C-22 12-15 11-11 6Z','#df9136',ink,1));
      wing.push(path('M-13 5Q-45-15-100-57M-14 5Q-29-24-79-67M-31-23Q-47-28-66-29M-43-38Q-59-45-86-49M-53-50Q-68-58-91-61M-44-15Q-48-25-45-36M-63-25Q-64-40-60-48M-79-37Q-80-48-77-59',null,ink,1.8));
      wing.push(path('M-17 3Q-25-10-38-22M-23 0Q-43-10-57-18M-24-15L-51-47',null,'#f2b762',1.4,{opacity:.8}));
      [[-108,-68,2.1,3.3,-16],[-109,-57,1.65,3.1,-28],[-103,-46,1.7,3.1,-34],[-94,-34,1.6,3,-43],[-83,-24,1.6,2.7,-46],[-72,-16,1.5,2.6,-51],[-60,-8,1.4,2.5,-55],[-48,-1,1.35,2.4,-60],[-35,6,1.25,2,-63],[-98,-77,1.75,2.4,-60],[-87,-76,1.4,2.1,-63],[-77,-70,1.3,1.9,-60],[-69,-64,1.2,1.8,-56],[-77,23,1.9,2.5,10],[-77,34,1.8,2.4,-6],[-73,45,1.9,2.5,-23],[-66,56,1.8,2.4,-38],[-55,64,1.7,2.3,-65],[-44,65,1.6,2.1,-91],[-34,60,1.5,2,-112],[-26,52,1.4,2,-130]].forEach(function(s){
        wing.push(el('ellipse',{cx:s[0],cy:s[1],rx:s[2],ry:s[3],transform:'rotate('+s[4]+' '+s[0]+' '+s[1]+')',fill:'#fbf2d6'}));
      });
      [[-101,-67],[-96,-55],[-87,-44],[-75,-34],[-65,-25],[-56,-18],[-67,26],[-66,35],[-61,43],[-53,51],[-43,54]].forEach(function(s){
        wing.push(el('circle',{cx:s[0],cy:s[1],r:.9,fill:'#f3c26c',opacity:.85}));
      });
      wings.push(el('g',{transform:'scale('+side+' 1)'},wing));
    });
    wings.push(path('M-3-11C-6-4-5 5-3 14C-5 27-4 40 0 46C4 40 5 27 3 14C5 5 6-4 3-11Z',ink,ink,1));
    wings.push(el('ellipse',{cx:0,cy:-13,rx:4.3,ry:5.4,fill:ink}));
    wings.push(path('M-2-17C-5-28-10-35-14-38M2-17C5-28 10-35 14-38',null,ink,1.1));
    wings.push(el('ellipse',{cx:-14,cy:-38,rx:1.2,ry:2.1,fill:ink,transform:'rotate(-22 -14 -38)'}));
    wings.push(el('ellipse',{cx:14,cy:-38,rx:1.2,ry:2.1,fill:ink,transform:'rotate(22 14 -38)'}));
    wings.push(path('M-1 2V30M-2 11H2M-2 20H2M-2 29H2',null,'#a8ac89',.6));
    wings.push(el('circle',{cx:-2,cy:-12,r:.85,fill:'#efe6c9'}));
    wings.push(el('circle',{cx:2,cy:-12,r:.85,fill:'#efe6c9'}));
    parts.push(el('g',{transform:'translate(213 112) rotate(-9)'},wings));
    return h('svg',{className:'bf-botanical-plate',viewBox:'0 0 420 230',width:420,height:230,'aria-hidden':'true',focusable:'false'},parts);
  }

  function bfIcon(h,kind,size){
    var k=0,ink='#1f2a22';
    function el(tag,attrs){attrs.key=k++;return h(tag,attrs);}
    function leaf(y){return [el('path',{d:'M4 '+y+'C16 '+(y-15)+' 46 '+(y-17)+' 61 '+(y-4)+'C46 '+(y+8)+' 17 '+(y+11)+' 4 '+y+'Z',fill:'#5d8c48',stroke:'#3d6531',strokeWidth:1.2}),el('path',{d:'M7 '+y+'C25 '+(y-5)+' 44 '+(y-6)+' 58 '+(y-4),fill:'none',stroke:'#cfe2b4',strokeWidth:1.3,strokeLinecap:'round'})];}
    var parts=[];
    if(kind==='egg'){
      parts=leaf(50).concat([
        el('path',{d:'M32 12C38 13 41 25 41 33C41 40 37 44 32 44C27 44 23 40 23 33C23 25 26 13 32 12Z',fill:'#f6efd6',stroke:'#8d7f55',strokeWidth:1.3}),
        el('path',{d:'M28 18C26.5 26 26.5 35 28 42.5M32 13V43.5M36 18C37.5 26 37.5 35 36 42.5',fill:'none',stroke:'#cbbd92',strokeWidth:1.1}),
        el('path',{d:'M24 31H40M24.5 37H39.5',fill:'none',stroke:'#ddd2ad',strokeWidth:.8})]);
    }else if(kind==='caterpillar'){
      parts=leaf(54).concat([
        el('path',{d:'M14 33C11 27 9 25 7 24M17 32C16 27 15 25 13 23',fill:'none',stroke:ink,strokeWidth:1.6,strokeLinecap:'round'}),
        el('rect',{x:11,y:30,width:42,height:13,rx:6.5,fill:'#f8f5e8',stroke:ink,strokeWidth:1.2})]);
      [15,21,27,33,39,45].forEach(function(x){parts.push(el('rect',{x:x,y:30.6,width:2.6,height:11.8,fill:ink}));parts.push(el('rect',{x:x+2.6,y:30.6,width:1.9,height:11.8,fill:'#f2c230'}));});
      [16,23,30,37,44].forEach(function(x){parts.push(el('circle',{cx:x,cy:45,r:1.6,fill:ink}));});
      parts.push(el('circle',{cx:52,cy:36.5,r:6,fill:ink}));
      parts.push(el('path',{d:'M49 33.5H55M48.5 37H55.5',fill:'none',stroke:'#f8f5e8',strokeWidth:1.1}));
      parts.push(el('path',{d:'M48 31C49 24 52 19 56 16M45 31C45 24 46 19 49 15',fill:'none',stroke:ink,strokeWidth:1.6,strokeLinecap:'round'}));
    }else if(kind==='chrysalis'){
      parts=[
        el('path',{d:'M8 7H56',stroke:'#6b5a3e',strokeWidth:3,strokeLinecap:'round'}),
        el('path',{d:'M32 7V14',stroke:ink,strokeWidth:2.2}),
        el('path',{d:'M32 14C42 15 46 29 45 41C44 51 37 58 32 58C27 58 20 51 19 41C18 29 22 15 32 14Z',fill:'#86cc9f',stroke:'#3b7a54',strokeWidth:1.4}),
        el('path',{d:'M23 25Q32 30 41 25',fill:'none',stroke:ink,strokeWidth:1.8}),
        el('path',{d:'M26 31C25 40 27 49 31 55',fill:'none',stroke:'#b8e3c5',strokeWidth:1.3})];
      [[24,25.8],[28,27.6],[32,28.3],[36,27.6],[40,25.8],[27,45],[37,45],[32,51]].forEach(function(p){parts.push(el('circle',{cx:p[0],cy:p[1],r:1.5,fill:'#e2b13a',stroke:'#9b7420',strokeWidth:.5}));});
    }else if(kind==='adult'){
      var fore='M31 31C25 16 13 8 6 12C2 18 6 29 29 34Z',hind='M30 35C20 34 11 41 14 51C19 58 27 51 30.5 38Z';
      parts=[
        el('path',{d:fore,fill:'#e7862a',stroke:ink,strokeWidth:2.4,strokeLinejoin:'round'}),
        el('path',{d:fore,fill:'#e7862a',stroke:ink,strokeWidth:2.4,strokeLinejoin:'round',transform:'translate(64 0) scale(-1 1)'}),
        el('path',{d:hind,fill:'#ef9a3a',stroke:ink,strokeWidth:2.4,strokeLinejoin:'round'}),
        el('path',{d:hind,fill:'#ef9a3a',stroke:ink,strokeWidth:2.4,strokeLinejoin:'round',transform:'translate(64 0) scale(-1 1)'}),
        el('path',{d:'M29 32L12 15M29 33L9 23M29 37L17 48M29 37L23 52M35 32L52 15M35 33L55 23M35 37L47 48M35 37L41 52',fill:'none',stroke:ink,strokeWidth:1}),
        el('ellipse',{cx:32,cy:36,rx:2.2,ry:12,fill:ink}),el('circle',{cx:32,cy:23.5,r:2.6,fill:ink}),
        el('path',{d:'M31 22C29 16 27 13 25 11M33 22C35 16 37 13 39 11',fill:'none',stroke:ink,strokeWidth:1.1,strokeLinecap:'round'})];
      [[8,14],[5,20],[10,26],[16,52],[13,47],[56,14],[59,20],[54,26],[48,52],[51,47]].forEach(function(p){parts.push(el('circle',{cx:p[0],cy:p[1],r:1.1,fill:'#fff'}));});
    }else if(kind==='nectar'){
      [0,72,144,216,288].forEach(function(a){var r=a*Math.PI/180;parts.push(el('ellipse',{cx:30+Math.cos(r)*10,cy:36+Math.sin(r)*10,rx:8,ry:6,transform:'rotate('+a+' '+(30+Math.cos(r)*10)+' '+(36+Math.sin(r)*10)+')',fill:'#c79ad8',stroke:'#7f5a92',strokeWidth:1}));});
      parts.push(el('circle',{cx:30,cy:36,r:5.5,fill:'#f0c84c',stroke:'#9b7a20',strokeWidth:1}));
      parts.push(el('path',{d:'M50 8C54 15 57 19 57 23A7 7 0 0 1 43 23C43 19 46 15 50 8Z',fill:'#2a9aa3',stroke:'#16656b',strokeWidth:1.2}));
    }else if(kind==='host'){
      parts=[el('path',{d:'M6 50C14 22 40 8 58 8C56 28 38 54 6 50Z',fill:'#5d8c48',stroke:'#3d6531',strokeWidth:1.4}),
        el('path',{d:'M8 48C24 36 42 20 56 10',fill:'none',stroke:'#cfe2b4',strokeWidth:1.6,strokeLinecap:'round'}),
        el('path',{d:'M22 38L18 28M30 31L28 20M38 25L38 15M22 38L32 42M30 31L41 34M38 25L48 26',fill:'none',stroke:'#a9c88e',strokeWidth:1})];
    }else if(kind==='notebook'){
      parts=[el('rect',{x:13,y:8,width:34,height:46,rx:3,fill:'#fdf8e8',stroke:'#6b5a3e',strokeWidth:1.6}),el('path',{d:'M19 19H41M19 26H41M19 33H36M19 40H33',stroke:'#a99b77',strokeWidth:1.6,strokeLinecap:'round'}),
        el('path',{d:'M44 50L56 22L60 24L48 52L43 55Z',fill:'#e8892b',stroke:ink,strokeWidth:1.3,strokeLinejoin:'round'}),el('path',{d:'M56 22L58 17L62 19L60 24Z',fill:'#e9a7b8',stroke:ink,strokeWidth:1.1})];
    }else if(kind==='plot'){
      parts=[el('path',{d:'M6 46L32 36L58 46L32 56Z',fill:'#8a6a43',stroke:'#5c4529',strokeWidth:1.3}),
        el('path',{d:'M18 44C17 38 19 33 22 30M18 44C20 40 24 39 26 39M32 48C31 40 33 34 37 31M32 48C29 43 26 42 24 42M45 44C45 38 46 34 49 32',fill:'none',stroke:'#4f8a3c',strokeWidth:2,strokeLinecap:'round'}),
        el('circle',{cx:22,cy:29,r:3,fill:'#d58fb0'}),el('circle',{cx:37,cy:30,r:3,fill:'#a487c9'}),el('circle',{cx:49,cy:31,r:3,fill:'#d58fb0'}),
        el('path',{d:'M52 44V12',stroke:'#6b5a3e',strokeWidth:2}),el('path',{d:'M52 13L40 17L52 22Z',fill:'#e8892b',stroke:ink,strokeWidth:1})];
    }else if(kind==='cut'){
      parts=[el('circle',{cx:20,cy:44,r:7,fill:'none',stroke:ink,strokeWidth:2.4}),el('circle',{cx:44,cy:44,r:7,fill:'none',stroke:ink,strokeWidth:2.4}),
        el('path',{d:'M25 39L48 8M39 39L16 8',stroke:ink,strokeWidth:2.6,strokeLinecap:'round'})];
    }
    return h('svg',{className:'bf-icon','data-bf-icon':kind,viewBox:'-4 -4 72 72',width:size||40,height:size||40,'aria-hidden':'true',focusable:'false'},[h('circle',{key:'disc',className:'bf-icon-disc',cx:32,cy:32,r:35,fill:'#fbf6e3',stroke:'#d8cfae',strokeWidth:1.2})].concat(parts));
  }
  // The life cycle as a loop. Decorative: the stage list next to it names
  // every stage and what it uses, so the drawing never carries information
  // alone. `focus` highlights one stage (the one a learner is following).
  var STAGE_USES=Object.freeze({
    get egg(){return __alloT('stem.butterfly.life_uses_egg','Laid on a milkweed leaf. It does not feed.');},
    get caterpillar(){return __alloT('stem.butterfly.life_uses_caterpillar','Eats milkweed leaves as it grows. Monarch caterpillars eat only milkweed.');},
    get chrysalis(){return __alloT('stem.butterfly.life_uses_chrysalis','Hangs from a support. It does not feed while it changes.');},
    get adult(){return __alloT('stem.butterfly.life_uses_adult','Drinks flower nectar. This is the stage you fly.');}
  });
  function lifeWheel(h,focus,blocked){
    var pos={egg:'top',caterpillar:'right',chrysalis:'bottom',adult:'left'};
    var arrows=[[45],[135],[225],[315]].map(function(a,i){var r=(a[0]-90)*Math.PI/180,x=100+Math.cos(r)*72,y=100+Math.sin(r)*72,rot=a[0];
      return h('path',{key:i,d:'M-6 -6L4 0L-6 6',transform:'translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot+')',fill:'none',stroke:'currentColor',strokeWidth:3,strokeLinecap:'round',strokeLinejoin:'round'});});
    return h('div',{className:'bf-wheel','aria-hidden':'true'},
      h('svg',{className:'bf-wheel-ring',viewBox:'0 0 200 200','aria-hidden':'true',focusable:'false'},h('circle',{cx:100,cy:100,r:72,fill:'none',stroke:'currentColor',strokeWidth:2.5,strokeDasharray:'2 7',strokeLinecap:'round'}),arrows),
      STAGES.map(function(st){return h('div',{key:st.id,className:'bf-wheel-stage','data-pos':pos[st.id],'data-focus':String(focus===st.id),'data-blocked':String(blocked===st.id)},bfIcon(h,st.id,60),h('span',null,st.name));}),
      h('div',{className:'bf-wheel-center'},h('strong',null,__alloT('stem.butterfly.art_wheel_monarch','Monarch')),h('span',null,__alloT('stem.butterfly.art_wheel_one_life_four_forms','one life, four forms'))));
  }
  // A season drawn as a timeline of typical summer days: a bar for each stage
  // and a line where the cut lands. Decorative (aria-hidden); the list beside
  // it says the same in words. `reveal` false shows only the inputs -- the plan
  // and when each stage happens -- so it never answers a prediction for the
  // learner before they run it.
  var TIMELINE_DAYS=42;
  function seasonTimeline(h,p,mowId,reveal,compact){
    var mow=mowing(mowId)||MOWINGS[0],o=p?seasonOutcome(p,mow.id):null,pct=function(d){return (d/TIMELINE_DAYS*100)+'%';};
    var ticks=[];for(var w=1;w<=TIMELINE_DAYS/7;w++)ticks.push(h('span',{key:w,style:{left:pct(w*7-3.5)}},__alloFill(__alloT('stem.butterfly.art_timeline_week','Week {value1}'),{value1:w})));
    var markers=STAGES.map(function(st){
      var step=o?o.steps.find(function(x){return x.id===st.id;}):null,state=!reveal||!step?'pending':step.cleared?'cleared':!step.standing?'cut':'missing';
      var blocked=reveal&&o&&o.blocked===st.id,span=STAGE_DAYS[st.id];
      return [
        h('div',{key:st.id+'-bar',className:'bf-tl-bar','data-stage-bar':st.id,'data-state':state,style:{left:pct(span[0]),width:pct(span[1]-span[0])}}),
        h('div',{key:st.id,className:'bf-tl-stage','data-state':state,'data-blocked':String(!!blocked),style:{left:pct((span[0]+span[1])/2)}},
          bfIcon(h,st.id,compact?34:44),h('span',{className:'bf-tl-name'},st.name),
          h('span',{className:'bf-tl-mark'},state==='pending'?'?':state==='cleared'?'✓':'✕'))];
    });
    return h('div',{className:'bf-timeline'+(compact?' bf-timeline-compact':''),'aria-hidden':'true','data-bf-timeline':mow.id,'data-bf-reveal':String(!!reveal)},
      h('div',{className:'bf-tl-track'},
        mow.day!==null?h('div',{className:'bf-tl-gone',style:{left:pct(mow.day)}}):null,
        markers,
        mow.day!==null?h('div',{className:'bf-tl-cut',style:{left:pct(mow.day)}},bfIcon(h,'cut',compact?22:26),h('span',null,__alloFill(__alloT('stem.butterfly.art_timeline_cut_week','Cut · week {value1}'),{value1:mow.week}))):null),
      h('div',{className:'bf-tl-axis'},ticks),
      h('div',{className:'bf-tl-caption'},h('span',null,mow.day===null?__alloT('stem.butterfly.art_timeline_no_cut','No cut this summer'):mow.label),h('span',null,__alloT('stem.butterfly.art_timeline_typical_timing','Typical summer timing: about a month from egg to butterfly. Cool weather slows it down.'))));
  }
  // ── Field cases: apply it somewhere new ───────────────────────────────
  // Transfer practice, not evidence. Each case is a place the learner has not
  // visited, described only by WHICH SPECIES grow there and WHEN it is cut, so
  // working out the resources is part of the task. The answer is never stored
  // here: it is read off seasonOutcome, the same model the timing investigation
  // runs, so a case can never contradict the lab.
  var CASES=Object.freeze([
    Object.freeze({id:'garden',get title(){return __alloT('stem.butterfly.case_garden_title','School pollinator garden');},planting:'flowers',mowing:'never',
      get scene(){return __alloT('stem.butterfly.case_garden_scene','A sunny bed of wild bergamot blooms in summer. Nobody planted milkweed. It is never mown.');}}),
    Object.freeze({id:'roadside',get title(){return __alloT('stem.butterfly.case_roadside_title','Roadside milkweed strip');},planting:'milkweed',mowing:'early',
      get scene(){return __alloT('stem.butterfly.case_roadside_scene','Common milkweed grows thickly along a road. The road crew mows the whole strip in early summer.');}}),
    Object.freeze({id:'backyard',get title(){return __alloT('stem.butterfly.case_backyard_title','Backyard milkweed patch');},planting:'milkweed',mowing:'never',
      get scene(){return __alloT('stem.butterfly.case_backyard_scene','A family lets a patch of common milkweed flower in the back corner and leaves it uncut all summer.');}}),
    Object.freeze({id:'field-edge',get title(){return __alloT('stem.butterfly.case_field_edge_title','Farm field edge');},planting:'milkweed',mowing:'mid',
      get scene(){return __alloT('stem.butterfly.case_field_edge_scene','Milkweed lines the edge of a hay field. The edge is cut with the hay in midsummer.');}}),
    Object.freeze({id:'lawn',get title(){return __alloT('stem.butterfly.case_lawn_title','Neat front lawn');},planting:'lawn',mowing:'early',
      get scene(){return __alloT('stem.butterfly.case_lawn_scene','Short, green grass with no flowers and no milkweed. It is mown in early summer, as usual.');}}),
    Object.freeze({id:'park',get title(){return __alloT('stem.butterfly.case_park_title','Park meadow');},planting:'mixed',mowing:'late',
      get scene(){return __alloT('stem.butterfly.case_park_scene','Milkweed and bergamot grow together in a park meadow. The park mows it once, after the generation.');}})
  ]);
  var CASE_STOPS=Object.freeze([
    Object.freeze({id:'egg',get label(){return __alloT('stem.butterfly.case_stop_egg','At the egg stage');},get inline(){return __alloT('stem.butterfly.case_stop_egg_inline','at the egg stage');}}),
    Object.freeze({id:'caterpillar',get label(){return __alloT('stem.butterfly.case_stop_caterpillar','At the caterpillar stage');},get inline(){return __alloT('stem.butterfly.case_stop_caterpillar_inline','at the caterpillar stage');}}),
    Object.freeze({id:'chrysalis',get label(){return __alloT('stem.butterfly.case_stop_chrysalis','At the chrysalis stage');},get inline(){return __alloT('stem.butterfly.case_stop_chrysalis_inline','at the chrysalis stage');}}),
    Object.freeze({id:'adult',get label(){return __alloT('stem.butterfly.case_stop_adult','At the adult stage');},get inline(){return __alloT('stem.butterfly.case_stop_adult_inline','at the adult stage');}}),
    Object.freeze({id:'complete',get label(){return __alloT('stem.butterfly.case_stop_complete','It does not stop: the whole cycle runs');},get inline(){return __alloT('stem.butterfly.case_stop_complete_inline','it does not stop: the whole cycle runs');}})
  ]);
  var CASE_REASONS=Object.freeze([
    Object.freeze({id:'missing',get label(){return __alloT('stem.butterfly.case_reason_missing','That stage had nothing growing here to use');},get inline(){return __alloT('stem.butterfly.case_reason_missing_inline','that stage had nothing growing here to use');}}),
    Object.freeze({id:'cut',get label(){return __alloT('stem.butterfly.case_reason_cut','What it needed was here, but it was cut down first');},get inline(){return __alloT('stem.butterfly.case_reason_cut_inline','what it needed was here, but it was cut down first');}}),
    Object.freeze({id:'none',get label(){return __alloT('stem.butterfly.case_reason_none','Every stage found what it needed in time');},get inline(){return __alloT('stem.butterfly.case_reason_none_inline','every stage found what it needed in time');}})
  ]);
  function fieldCase(id){return CASES.find(function(c){return c.id===id;})||null;}
  // The planting a case describes, as the same resource object the meadow uses.
  function caseHabitat(c){return c?(c.planting==='milkweed'?PLANTS[0]:design(c.planting)):null;}
  function caseAnswer(c){
    var o=seasonOutcome(caseHabitat(c),c&&c.mowing);if(!o)return null;
    return {stop:o.completes?'complete':o.blocked,reason:o.completes?'none':o.cutShort?'cut':'missing',outcome:o};
  }
  function cleanCases(value){
    var v=value&&typeof value==='object'&&!Array.isArray(value)?value:{},raw=v.answers&&typeof v.answers==='object'&&!Array.isArray(v.answers)?v.answers:{},answers={};
    CASES.forEach(function(c){
      if(!Object.prototype.hasOwnProperty.call(raw,c.id))return;
      var a=raw[c.id];if(!a||typeof a!=='object')return;
      if(!CASE_STOPS.some(function(x){return x.id===a.stop;})||!CASE_REASONS.some(function(x){return x.id===a.reason;}))return;
      answers[c.id]={stop:a.stop,reason:a.reason};
    });
    return {answers:answers};
  }
  function checkCase(s,id,stop,reason){
    var c=fieldCase(id);if(!c)return {ok:false,message:__alloT('stem.butterfly.case_msg_choose_case','Choose a field case.')};
    if(!CASE_STOPS.some(function(x){return x.id===stop;}))return {ok:false,message:__alloT('stem.butterfly.case_msg_predict_stop','Predict where the generation stops first.')};
    if(!CASE_REASONS.some(function(x){return x.id===reason;}))return {ok:false,message:__alloT('stem.butterfly.case_msg_choose_reason','Choose the reason you think it stops there.')};
    s.cases=cleanCases(s.cases);s.cases.answers[id]={stop:stop,reason:reason};
    return Object.assign({ok:true},caseFeedback(c,s.cases.answers[id]));
  }
  function caseFeedback(c,a){
    var key=caseAnswer(c),stopRight=a.stop===key.stop,reasonRight=a.reason===key.reason;
    var explain=key.outcome.reason+seasonNote(key.outcome,mowing(c.mowing));
    // key.stop is 'complete' or a STAGES id (seasonOutcome's blocked stage).
    var template=stopRight&&reasonRight?__alloT('stem.butterfly.case_fb_matched','Your reasoning matches the model. {value1}'):
      stopRight?__alloT('stem.butterfly.case_fb_right_stage','Right stage, different reason. {value1}'):
      key.stop==='complete'?__alloT('stem.butterfly.case_fb_model_complete','The model shows that the whole cycle runs. {value1}'):
      key.stop==='egg'?__alloT('stem.butterfly.case_fb_model_stops_egg','The model shows that it stops at the egg stage. {value1}'):
      key.stop==='caterpillar'?__alloT('stem.butterfly.case_fb_model_stops_caterpillar','The model shows that it stops at the caterpillar stage. {value1}'):
      key.stop==='chrysalis'?__alloT('stem.butterfly.case_fb_model_stops_chrysalis','The model shows that it stops at the chrysalis stage. {value1}'):
      __alloT('stem.butterfly.case_fb_model_stops_adult','The model shows that it stops at the adult stage. {value1}');
    return {stopRight:stopRight,reasonRight:reasonRight,matched:stopRight&&reasonRight,explain:explain,
      message:__alloFill(template,{value1:explain})};
  }
  function casesSummary(s){
    var answers=cleanCases(s.cases).answers,done=CASES.filter(function(c){return answers[c.id];});
    return {checked:done.length,matched:done.filter(function(c){return caseFeedback(c,answers[c.id]).matched;}).length,total:CASES.length};
  }

  // The illustrated map: the whole exploration when 3D is unavailable, and the
  // Map view otherwise. Plants are drawn at the SAME stem poses the 3D meadow
  // uses, and the path follows the same curve, so the two views agree.
  function paintHabitatMap(g,width,height,s,lensOn){
    var scale=Math.min(width,height)/240,cx=width/2,cy=height/2;
    function X(x){return cx+x*scale;}function Y(z){return cy+z*scale;}
    function hash(n){var v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);}
    var ground=g.createLinearGradient(0,0,width,height);ground.addColorStop(0,'#d3e0b2');ground.addColorStop(1,'#aec486');g.fillStyle=ground;g.fillRect(0,0,width,height);
    // A woodland edge frames the meadow, as the tree line does in 3D.
    for(var t=0;t<70;t++){var a=t*2.39996,r=118+hash(t+91)*30,tx=X(Math.cos(a)*r),ty=Y(Math.sin(a)*r),tr=(7+hash(t+141)*5)*scale;
      g.fillStyle=['#5f7b4c','#6c8656','#557146'][t%3];g.beginPath();g.arc(tx,ty,tr,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(tx-tr*.3,ty-tr*.3,tr*.5,0,Math.PI*2);g.fill();}
    // Grass strokes give the meadow texture without implying resources.
    g.strokeStyle='rgba(74,104,52,.35)';g.lineWidth=1;g.beginPath();
    for(var n=0;n<520;n++){var gx=X((hash(n+11)-.5)*210),gy=Y((hash(n+29)-.5)*210),lean=(hash(n+47)-.5)*4;g.moveTo(gx,gy);g.lineTo(gx+lean,gy-5*Math.max(.6,scale));}
    g.stroke();
    // The footpath, along the shared centre line.
    function path(widthPx,color){g.strokeStyle=color;g.lineWidth=widthPx;g.lineCap='round';g.beginPath();for(var z=-118;z<=118;z+=4){var px=X(meadowPathX(z)),pz=Y(z);if(z===-118)g.moveTo(px,pz);else g.lineTo(px,pz);}g.stroke();}
    path(7.5*scale+3,'#b9a77c');path(7.5*scale,'#e2d5b0');
    function flower(x,y,kind){var r=Math.max(1.6,1.15*scale);
      if(kind==='milkweed'){g.fillStyle='#d58fb0';[[-.7,0],[.7,0],[0,-.7],[0,.7],[0,0]].forEach(function(o){g.beginPath();g.arc(x+o[0]*r,y+o[1]*r,r*.8,0,Math.PI*2);g.fill();});g.fillStyle='#f3d3e1';g.beginPath();g.arc(x,y,r*.45,0,Math.PI*2);g.fill();}
      else{g.fillStyle='#a487c9';for(var k=0;k<6;k++){var ka=k*Math.PI/3;g.beginPath();g.ellipse(x+Math.cos(ka)*r*.8,y+Math.sin(ka)*r*.8,r*.75,r*.35,ka,0,Math.PI*2);g.fill();}g.fillStyle='#e6d6f4';g.beginPath();g.arc(x,y,r*.4,0,Math.PI*2);g.fill();}}
    function leafPair(x,y){g.fillStyle='#4f7a3f';[-1,1].forEach(function(side){g.beginPath();g.ellipse(x+side*2.1*scale,y+.4*scale,1.8*scale,.75*scale,side*.5,0,Math.PI*2);g.fill();});}
    function stems(p,pi,count,offset,kind){for(var i=0;i<count;i++){var pose=stemPose(p,pi,i,count,offset);leafPair(X(pose.x),Y(pose.z));}for(var j=0;j<count;j++){var q=stemPose(p,pi,j,count,offset);flower(X(q.x),Y(q.z),kind);}}
    habitats(s).forEach(function(p){
      var x=X(p.x),y=Y(p.z),R=17*scale,restored=p.id==='restoration',plan=restored?s.restoration.design:null;
      var lawn=!p.nectar&&!p.host;
      g.save();g.beginPath();g.arc(x,y,R,0,Math.PI*2);g.fillStyle=lawn?'#c7d89f':'#7f9a55';g.fill();g.clip();
      if(lawn){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=Math.max(2,2.4*scale);for(var st=-4;st<=4;st+=2){g.beginPath();g.moveTo(x-R,y+st*R/5);g.lineTo(x+R,y+st*R/5);g.stroke();}}
      g.restore();
      if(p.id==='milkweed')stems(p,0,34,0,'milkweed');
      else if(p.id==='bergamot')stems(p,1,34,0,'bergamot');
      else if(plan==='flowers')stems(p,1,34,0,'bergamot');
      else if(plan==='mixed'){stems(p,0,17,-6,'milkweed');stems(p,1,17,6,'bergamot');}
      g.lineWidth=2;g.strokeStyle=restored?'#9a4c0b':'#3d5b44';if(restored)g.setLineDash([6,4]);g.beginPath();g.arc(x,y,R+1.5*scale,0,Math.PI*2);g.stroke();g.setLineDash([]);
      if(p.id===s.target){g.strokeStyle='#9a4c0b';g.lineWidth=2;g.setLineDash([4,4]);g.beginPath();g.moveTo(X(s.x),Y(s.z));g.lineTo(x,y);g.stroke();g.setLineDash([]);}
      if(p.id===s.landed&&lensOn){g.strokeStyle='#754413';g.lineWidth=3;g.beginPath();g.arc(x,y,R+5*scale,0,Math.PI*2);g.stroke();}
      // Numbered DOM markers and a reflowing key carry the patch names.
      // Canvas text cannot follow the learner's text-size or spacing settings.
    });
    // The learner's monarch, heading where it faces.
    g.save();g.translate(X(s.x),Y(s.z));g.rotate(-s.yaw);
    // An opaque light surround keeps the monarch distinct from flower clusters.
    g.fillStyle='#fffcf3';g.strokeStyle='#526356';g.lineWidth=1.5;g.beginPath();g.arc(0,1,18,0,Math.PI*2);g.fill();g.stroke();
    g.fillStyle='#ee9c41';g.strokeStyle='#2b2118';g.lineWidth=2;[-1,1].forEach(function(side){g.beginPath();g.ellipse(side*6.5,-2,6.5,8.5,side*.45,0,Math.PI*2);g.fill();g.stroke();g.beginPath();g.ellipse(side*5,7,4.5,5.5,-side*.4,0,Math.PI*2);g.fill();g.stroke();});
    g.fillStyle='#2b2118';g.fillRect(-1.5,-10,3,20);g.restore();
    // Compass rose.
    var rx=width-30,ry=44;g.fillStyle='rgba(255,252,243,.92)';g.strokeStyle='#64745d';g.lineWidth=1;g.beginPath();g.arc(rx,ry,17,0,Math.PI*2);g.fill();g.stroke();
    g.fillStyle='#9a4c0b';g.beginPath();g.moveTo(rx,ry-13);g.lineTo(rx+5,ry);g.lineTo(rx-5,ry);g.closePath();g.fill();g.fillStyle='#64745d';g.beginPath();g.moveTo(rx,ry+13);g.lineTo(rx+5,ry);g.lineTo(rx-5,ry);g.closePath();g.fill();
    g.fillStyle='#24382e';g.font='700 11px system-ui, sans-serif';g.textAlign='center';g.textBaseline='alphabetic';g.fillText(__alloT('stem.butterfly.map_compass_north','N'),rx,ry-21);
  }


  // ── The mission: what should the restoration plot become? ─────────────
  // Read entirely off records the learner made for the planting growing there
  // NOW (the same currency rules as the claim panel), so it can say "your
  // records support this plan" without ever asserting it on its own authority.
  function missionStatus(s){
    var d=design(s.restoration.design)||DESIGNS[0],examined=s.restoration.trials.some(function(t){return t.design===d.id;}),
      brood=broodFor(s,'restoration'),runs=currentSeasonRuns(s).filter(function(r){return r.patch==='restoration';});
    var checks=[
      {id:'planted',done:examined,label:examined?__alloFill(__alloT('stem.butterfly.mission_check_examined','Examined: {value1}'),{value1:d.short}):__alloT('stem.butterfly.mission_check_apply_plan','Apply a planting plan, then land on the plot and examine it')},
      {id:'generation',done:!!brood,label:brood?__alloFill(brood.result==='complete'?__alloT('stem.butterfly.mission_check_generation_adult','Generation followed on {value1}: reached the adult stage'):__alloT('stem.butterfly.mission_check_generation_stopped','Generation followed on {value1}: stopped before an adult'),{value1:d.short}):__alloT('stem.butterfly.mission_check_follow_generation','Follow a generation on this planting')},
      {id:'mowing',done:runs.length>0,label:runs.length?__alloFill(__alloT('stem.butterfly.mission_check_mowing_tested','Mowing tested: {value1}'),{value1:runs.map(function(r){return __alloFill(r.result==='complete'?__alloT('stem.butterfly.mission_mowing_whole_cycle','{value1} (whole cycle)'):__alloT('stem.butterfly.mission_mowing_stopped_early','{value1} (stopped early)'),{value1:mowing(r.mowing).shortInline});}).join(', ')}):__alloT('stem.butterfly.mission_check_run_mowing','Run at least one mowing plan on this planting')}];
    var ok=runs.filter(function(r){return r.result==='complete';}),state='open',summary=__alloT('stem.butterfly.mission_summary_open','Each check uses the planting growing there now. Replanting starts the checks again for the new plan.');
    if(examined&&brood&&runs.length){
      if(brood.result!=='complete'){state='rethink';summary=__alloT('stem.butterfly.mission_summary_rethink','Your records show this planting cannot carry a generation to an adult. Try a different planting.');}
      else if(ok.length){state='supported';summary=__alloFill(__alloT('stem.butterfly.mission_summary_supported','Your records support this plan: {value1}. Mowing that let the generation finish: {value2}. In this model that means every stage finds what it needs in time; it does not promise how many monarchs survive.'),{value1:d.name,value2:ok.map(function(r){return mowing(r.mowing).labelInline;}).join('; ')});}
      else{state='timing';summary=__alloT('stem.butterfly.mission_summary_timing','This planting can carry a generation, but every mowing plan you tested cut it short. Test a plan that leaves the plants standing until the adult emerges.');}
    }
    return {state:state,checks:checks,summary:summary,design:d.id};
  }
  var GUIDE_ICONS=Object.freeze({explore:'adult',design:'host',cycle:'caterpillar',season:'cut',notebook:'notebook'});
  // Short, sourced facts (Monarch Joint Venture life cycle and senses pages;
  // Monarch Watch). Durations are summer ranges; the timing investigation uses
  // the same typical days (STAGE_DAYS).
  var FIELD_FACTS=Object.freeze([
    Object.freeze({id:'growth',get label(){return __alloT('stem.butterfly.fact_growth_label','Growing fast');},get text(){return plain(__alloT('stem.butterfly.fact_growth_text','In about two weeks, a caterpillar grows to almost 2,000 times as heavy as when it hatched. It sheds its too-tight skin between five stages called instars.'),__alloT('stem.butterfly.fact_growth_text_simple','In about two weeks, a caterpillar gets almost 2,000 times heavier! It grows through five stages, and between them it sheds its too-tight skin.'));}}),
    Object.freeze({id:'time',get label(){return __alloT('stem.butterfly.fact_time_label','Real time');},get text(){return plain(__alloT('stem.butterfly.fact_time_text','In summer, egg to butterfly takes about a month: about 3–5 days as an egg, about 2 weeks as a caterpillar and 1–2 weeks as a chrysalis. Cool weather slows it down.'),__alloT('stem.butterfly.fact_time_text_simple','In summer, it takes about a month to go from egg to butterfly. Cool weather makes it slower.'));}}),
    Object.freeze({id:'feet',get label(){return __alloT('stem.butterfly.fact_feet_label','Tasting with feet');},get text(){return plain(__alloT('stem.butterfly.fact_feet_text','A female drums her feet on a leaf to taste it and check that it is milkweed. She usually lays one egg at a time, often on the underside of a leaf.'),__alloT('stem.butterfly.fact_feet_text_simple','A mother monarch tastes leaves with her feet! She checks that a leaf is milkweed before she lays an egg under it.'));}}),
    Object.freeze({id:'lifespan',get label(){return __alloT('stem.butterfly.fact_lifespan_label','How long adults live');},get text(){return plain(__alloT('stem.butterfly.fact_lifespan_text','Most summer monarchs live about 2 to 5 weeks as butterflies. The last generation of the year migrates south and can live up to 8 or 9 months.'),__alloT('stem.butterfly.fact_lifespan_text_simple','Most summer butterflies live about 2 to 5 weeks. The last ones of the year fly south and can live 8 or 9 months.'));}})
  ]);
  function caseSpecies(c){return c.planting==='milkweed'?[__alloT('stem.butterfly.case_species_milkweed','Common milkweed')]:c.planting==='flowers'?[__alloT('stem.butterfly.case_species_bergamot','Wild bergamot')]:c.planting==='mixed'?[__alloT('stem.butterfly.case_species_milkweed','Common milkweed'),__alloT('stem.butterfly.case_species_bergamot','Wild bergamot')]:[__alloT('stem.butterfly.case_species_grass_only','Short grass only')];}
  function caseStop(id){return CASE_STOPS.find(function(x){return x.id===id;})||null;}
  function caseReason(id){return CASE_REASONS.find(function(x){return x.id===id;})||null;}

  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function freshState(saved) {
    var seen=saved && Array.isArray(saved.observations)?saved.observations:[];
    var state={x:0,y:6,z:52,yaw:0,clock:0,energy:100,paused:true,landed:null,target:null,vx:0,vy:0,vz:0,bank:0,pitch:0,wingPhase:0,gliding:false,controlMode:'steer',turnVelocity:0,
      observations:PLANTS.filter(function(p){return seen.indexOf(p.id)!==-1;}).map(function(p){return p.id;}),restoration:cleanRestoration(saved&&saved.restoration),
      lifecycle:cleanLifecycle(saved&&saved.lifecycle),season:cleanSeason(saved&&saved.season),pollination:cleanPollination(saved&&saved.pollination),notebook:cleanNotebook(saved&&saved.notebook),cases:cleanCases(saved&&saved.cases)};
    clampStage(state);
    return state;
  }
  // cleanLifecycle checks the stage id is real, but cannot check it is
  // REACHABLE: which resources the restoration plot offers depends on the
  // planting, which is only known once both parts of the state exist. A save
  // naming a stage this patch cannot support (a chrysalis on mown lawn, from
  // tampering or from a plot replanted in an older build) would otherwise put
  // the track at a stage the same patch refuses to advance to.
  function clampStage(state){
    var lc=state.lifecycle,p=lc.stage?patch(lc.patch,state):null;
    if(!lc.stage)return state;
    if(!p||!outcome(lc.prediction)){lc.stage=null;lc.prediction=null;return state;}
    var index=STAGES.findIndex(function(st){return st.id===lc.stage;}),limit=reachedStage(p);
    if(index>limit)lc.stage=STAGES[limit].id;
    return state;
  }
  function nearest(s) {
    return habitats(s).map(function(p){return {plant:p,distance:Math.hypot(s.x-p.x,s.z-p.z)};})
      .sort(function(a,b){return a.distance-b.distance;})[0];
  }
  function stopFlight(s){s.vx=0;s.vy=0;s.vz=0;s.bank=0;s.pitch=0;s.gliding=false;s.turnVelocity=0;s.wingGlide=0;s.wingBrake=0;return s;}
  function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  // Integrate an exponential velocity response analytically. Movement remains
  // consistent across frame rates, while steering has a short, gentle response.
  function flightAxis(v,target,rate,dt){var blend=Math.exp(-rate*dt);return {velocity:target+(v-target)*blend,distance:target*dt+(v-target)*(1-blend)/rate};}
  // Analog butterfly flight: a radial dead zone, bounded axes and progressive thrust.
  function flightAnalog(keys){
    function axis(value,low,high){return Number.isFinite(value)?clamp(value,low,high):0;}
    return {turn:axis(keys.turn,-1,1),thrust:axis(keys.thrust,0,1),brake:axis(keys.brake,0,1),lift:axis(keys.lift,-1,1)};
  }
  function steeringPad(dx,dy,radius){
    var neutral={turn:0,thrust:0,brake:0};
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return neutral;
    // Scaling first avoids overflow for otherwise finite off-pad coordinates.
    var scale=Math.max(Math.abs(dx),Math.abs(dy));if(!scale)return neutral;
    var x=dx/scale,y=dy/scale,direction=Math.hypot(x,y),distance=Math.min(1,scale/radius*direction);
    if(distance<=.12)return neutral;
    var strength=(distance-.12)/.88,turn=x/direction*strength,forward=-y/direction*strength;
    return {turn:turn,thrust:Math.max(0,forward),brake:Math.max(0,-forward)};
  }
  function landingPose(s,p){
    if(!p.nectar)return {x:p.x,y:.62,z:p.z,yaw:s.yaw};
    var mixed=p.id==='restoration'&&s.restoration.design==='mixed',pi=p.host&&!mixed?0:1;
    var stem=stemPose(p,pi,0,mixed?17:34,mixed?6:0);
    return {x:stem.x,y:stem.height+1.05,z:stem.z+.25,yaw:-.35};
  }
  // A quicker power stroke and softer recovery keep the two wing pairs linked
  // without moving them like a rigid hinge. All variation uses simulation time.
  function flutterPose(phase,time,glide,bank){
    var beat=phase+.22*Math.sin(time*1.71)+.08*Math.sin(time*4.3),stroke=Math.sin(beat+.28*Math.sin(beat));
    var spread=.48+stroke*(.68+.07*Math.sin(time*.9+.7)),rest=.18+.035*Math.sin(phase);
    var angle=spread*(1-glide)+rest*glide,steer=bank*.075*(1-glide);
    return {leftWing:-(angle+steer),rightWing:angle-steer,
      hindLag:Math.sin(beat-.48)*.09*(1-glide)+Math.sin(phase-.45)*.02*glide,
      bob:(Math.sin(beat-.55)*.055+Math.sin(time*2.1)*.012)*(1-glide)+Math.sin(time*.9)*.025*glide,
      pitch:Math.cos(beat)*.018*(1-glide)};
  }
  // Responsive player wings: simulation-clock effort and eased glide transitions.
  function flightResponse(s){
    // These are visual responses to the existing motion, never flight forces.
    // Still/authored states may omit the transient blend fields entirely.
    function finite(value){return Number.isFinite(value)?value:0;}
    var speed=clamp(Math.hypot(finite(s.vx),finite(s.vz))/17,0,1),climb=clamp(finite(s.vy)/7,0,1),turn=clamp(Math.abs(finite(s.turnVelocity))/1.9,0,1);
    var glide=Number.isFinite(s.wingGlide)?clamp(s.wingGlide,0,1):(s.gliding&&!s.target?1:0),brake=clamp(finite(s.wingBrake),0,1);
    return {speed:speed,climb:climb,turn:turn,glide:glide,brake:brake,effort:clamp(.28+speed*.44+climb*.30+turn*.10+brake*.22,.28,1)};
  }
  // Integrate visual wing rate across the whole step, including eased transitions.
  function flightWingRate(s){
    var response=flightResponse(s),poweredRate=14.2+response.effort*5.4+response.climb*.7+response.brake*.7;
    return poweredRate*(1-response.glide)+3.2*response.glide;
  }
  function advanceFlightWings(s,dt,brake,previousRate){
    var desiredGlide=s.gliding&&!s.target?1:0,oldGlide=Number.isFinite(s.wingGlide)?clamp(s.wingGlide,0,1):desiredGlide,oldBrake=Number.isFinite(s.wingBrake)?clamp(s.wingBrake,0,1):0;
    s.wingGlide=desiredGlide+(oldGlide-desiredGlide)*Math.exp(-dt*6.5);
    brake=Number.isFinite(brake)?clamp(brake,0,1):0;s.wingBrake=brake+(oldBrake-brake)*Math.exp(-dt*9);
    var rate=flightWingRate(s);
    // End-point sampling biases slower frames toward the new velocity/glide
    // state. Averaging both endpoints also includes the continuous ramp.
    var average=Number.isFinite(previousRate)?(previousRate+rate)*.5:rate;
    s.wingPhase=((Number.isFinite(s.wingPhase)?s.wingPhase:0)+dt*average)%(Math.PI*2);
  }
  function flightPose(s,reduced){
    if(s.landed||reduced)return {bob:0,bank:0,pitch:0,leftWing:s.landed?-1.28:-.36,rightWing:s.landed?1.28:.36,hindLag:0};
    var response=flightResponse(s),bank=Number.isFinite(s.bank)?clamp(s.bank,-.6,.6):0,phase=Number.isFinite(s.wingPhase)?s.wingPhase:0,time=Number.isFinite(s.clock)?s.clock:0;
    var powered=flutterPose(phase,time,0,bank),rest=flutterPose(phase,time,1,bank),glide=response.glide,flap=1-glide;
    var amplitude=.82+.30*response.effort+.06*response.brake,brakeLift=response.brake*(.065*flap+.10*glide),turn=Number.isFinite(s.turnVelocity)?clamp(s.turnVelocity,-1.9,1.9):0;
    return {bob:powered.bob*(.86-.25*response.speed)*flap+rest.bob*glide,bank:bank,
      pitch:(Number.isFinite(s.pitch)?clamp(s.pitch,-.4,.4):0)+powered.pitch*(.9+.15*response.effort)*flap+response.brake*.025,
      leftWing:powered.leftWing*amplitude*flap+rest.leftWing*glide-brakeLift,rightWing:powered.rightWing*amplitude*flap+rest.rightWing*glide+brakeLift,
      hindLag:(powered.hindLag*(.8+.3*response.effort)+turn*.012*Math.sin(phase-.8)+response.brake*.025*Math.sin(phase-.65))*flap+rest.hindLag*glide};
  }
  // Player membrane flex follows the rendered wing pose, without a second clock.
  function playerWingFlex(s,reduced,meadowClock,currentPose){
    var still={left:0,right:0,leftTwist:0,rightTwist:0};
    if(!s||typeof s!=='object'||reduced||s.landed)return still;
    function finite(value){return Number.isFinite(value)?value:0;}
    var lag=.018,time=Math.max(0,finite(meadowClock)),idle=!!s.paused,prior,current;
    if(idle){
      // Flight-paused players hover on meadow time, matching draw() exactly.
      current=flutterPose(time*17,time,0,0);prior=flutterPose((time-lag)*17,time-lag,0,0);
    }else{
      current=flightPose(s,false);
      // Freeze the instantaneous effort/glide response for this visual sample.
      // There is no second integration step, history buffer or state mutation.
      var previous=Object.assign({},s,{clock:finite(s.clock)-lag,wingPhase:finite(s.wingPhase)-flightWingRate(s)*lag});
      prior=flightPose(previous,false);
    }
    if(currentPose&&typeof currentPose==='object')current=currentPose;
    var glide=idle?0:flightResponse(s).glide,quiet=1-glide*.65;
    var left=clamp((finite(current.leftWing)-finite(prior.leftWing))*2.4*quiet,-.62,.62);
    var right=clamp(-(finite(current.rightWing)-finite(prior.rightWing))*2.4*quiet,-.62,.62);
    var twist=finite(current.hindLag)*(1-glide*.85)*1.15;
    return {left:left,right:right,leftTwist:clamp(left*.30+twist,-.26,.26),rightTwist:clamp(right*.30+twist,-.26,.26)};
  }
  // Visitors meander above nectar patches with drifting, non-repeating loops.
  // Their heading and bank follow the curve's actual velocity and curvature,
  // including the slower turns between little bursts of flutter and gliding.
  function visitorFlightPose(patch,index,clock,reduced,speciesId){
    var profile=meadowSpecies(speciesId),t=reduced?0:Math.max(0,Number.isFinite(clock)?clock:0),seed=index*2.39996,direction=index%2?-1:1;
    var rate=(.18+index*.012)*profile.routeRate,a=direction*(t*rate+.16*Math.sin(t*.31+seed))+seed;
    var da=direction*(rate+.0496*Math.cos(t*.31+seed)),dda=-direction*.015376*Math.sin(t*.31+seed),rx=(6.3+index*1.35)*profile.routeRadius,rz=(5.1+index*.95)*profile.routeRadius;
    var b=t*.41+seed*1.2,c=t*.93+seed,d=t*.37+seed*1.7,e=t*.79+seed*2;
    var x=patch.x+rx*Math.sin(a)+.75*Math.sin(b)+.2*Math.sin(c),z=patch.z+rz*Math.cos(a)+.6*Math.sin(d)+.18*Math.cos(e);
    var vx=rx*Math.cos(a)*da+.3075*Math.cos(b)+.186*Math.cos(c),vz=-rz*Math.sin(a)*da+.222*Math.cos(d)-.1422*Math.sin(e);
    var ax=rx*(-Math.sin(a)*da*da+Math.cos(a)*dda)-.126075*Math.sin(b)-.17298*Math.sin(c);
    var az=-rz*(Math.cos(a)*da*da+Math.sin(a)*dda)-.08214*Math.sin(d)-.112338*Math.cos(e),speed=Math.hypot(vx,vz);
    var y=6.4+index*.45+profile.altitude+.62*Math.sin(t*.43+seed)+.21*Math.sin(t*1.07+seed*1.9),vy=.2666*Math.cos(t*.43+seed)+.2247*Math.cos(t*1.07+seed*1.9);
    var bank=reduced?0:clamp(Math.atan2(vz*ax-vx*az,Math.max(.3,speed*3.2)),-.4,.4);
    var glide=clamp((.6*Math.sin(t*.72+seed)+.4*Math.sin(t*.31+seed*1.2)-.48)/.38,0,1);glide=clamp(glide*glide*(3-2*glide)*profile.glide,0,1);
    var wing=reduced?{bob:0,pitch:0,leftWing:-.36,rightWing:.36,hindLag:0}:flutterPose(t*(17.5+index*.8)*profile.wingRate+.65*Math.sin(t*.8+seed)+seed,t+seed,glide,bank);
    return {x:x,y:y+wing.bob,z:z,yaw:Math.atan2(-vx,-vz),bank:bank,pitch:reduced?0:clamp(Math.atan2(vy,Math.max(.4,speed))*.42,-.18,.18)+wing.pitch,
      leftWing:wing.leftWing,rightWing:wing.rightWing,hindLag:wing.hindLag};
  }
  // Independent flower visits are scenery, never learner visits or evidence.
  // A smooth blend retains the wandering route between visits and settles onto
  // a real inner blossom. One anchor is held through the whole approach/dwell/
  // departure, then the next cycle selects a different flower while airborne.
  function visitorVisitPose(patch,index,clock,reduced,speciesId){
    var profile=meadowSpecies(speciesId),t=Math.max(0,Number.isFinite(clock)?clock:0),flight=visitorFlightPose(patch,index,t,reduced,speciesId);
    var result=Object.assign({},flight,{phase:'cruising',feeding:0,perch:0,flower:null});
    if(reduced||!patch.nectar)return result;
    function ease(v){v=clamp(v,0,1);return v*v*v*(v*(v*6-15)+10);}
    var cruise=9.2+index*.9,approach=3.8,dwell=5.2+index*.55,departure=3.2,period=cruise+approach+dwell+departure,offset=index*5.7+1.1;
    var cycle=Math.floor((t+offset)/period),local=t+offset-cycle*period,start=cycle*period-offset,landing=start+cruise+approach;
    var mixed=patch.id==='restoration'&&patch.host,pi=mixed?(index+cycle)%2:patch.host?0:1,count=mixed?17:34,stemIndex=2+(cycle*7+index*5)%(count-2);
    var stem=stemPose(patch,pi,stemIndex,count,mixed?(pi===0?-6:6):0),flower={x:stem.x,y:stem.height+.64,z:stem.z};
    result.flower=flower;result.flowerSpecies=pi;result.flowerStem=stemIndex;
    if(local<cruise)return result;
    var arrival=visitorFlightPose(patch,index,landing,false,speciesId),yaw=Math.atan2(flower.x-arrival.x,flower.z-arrival.z)+Math.PI;
    var perch={x:flower.x+Math.sin(yaw)*.1*profile.scale,y:flower.y+.11*profile.scale,z:flower.z+Math.cos(yaw)*.1*profile.scale},weight,wingPerch,u,fromYaw,toYaw;
    if(local<cruise+approach){
      result.phase='approaching';u=(local-cruise)/approach;weight=ease(u);wingPerch=ease((u-.32)/.68);
      fromYaw=visitorFlightPose(patch,index,start+cruise,false,speciesId).yaw;toYaw=yaw;
      result.yaw=fromYaw+angleDelta(fromYaw,toYaw)*weight;
    }else if(local<cruise+approach+dwell){
      result.phase='feeding';weight=1;wingPerch=1;u=(local-cruise-approach)/dwell;result.yaw=yaw;
      result.feeding=ease(u/.12)*(1-ease((u-.86)/.14));
    }else{
      result.phase='departing';u=(local-cruise-approach-dwell)/departure;weight=1-ease(u);wingPerch=1-ease(u/.42);
      toYaw=visitorFlightPose(patch,index,start+period,false,speciesId).yaw;
      result.yaw=yaw+angleDelta(yaw,toYaw)*(1-weight);
    }
    result.perch=weight;
    result.x=flight.x+(perch.x-flight.x)*weight;result.y=flight.y+(perch.y-flight.y)*weight;result.z=flight.z+(perch.z-flight.z)*weight;
    // A brief flower-relative inspection arc straightens before touchdown.
    if(result.phase==='approaching'&&u>.08&&u<.9){
      var inspect=clamp((u-.08)/.82,0,1),pulse=64*inspect*inspect*inspect*(1-inspect)*(1-inspect)*(1-inspect);
      var lateral=.34*profile.scale*((index+cycle)%2?-1:1)*pulse;
      result.x+=Math.cos(yaw)*lateral;result.y+=.20*profile.scale*pulse;result.z-=Math.sin(yaw)*lateral;
    }
    // Wings keep braking flutters until touchdown, then power up before lift-off.
    // Their fold follows its own smooth envelope; final approach, feeding and
    // departure keep the original blossom anchor blend.
    // Perched wings finish a gentle settling fold, then occasionally open partway.
    // The two sides follow with a short delay instead of moving like a mirror;
    // the hindwings trail that opening while the feet and drinking tube stay put.
    var age=t-landing,settling=1-ease(age/.65),pulseStart=1.05+.18*Math.sin(index*1.7+cycle*.9),pulseLength=2.6+.18*Math.cos(index+cycle*1.3);
    function opening(delay){var p=age-pulseStart-delay;return ease(p/.9)*(1-ease((p-pulseLength+.9)/.9));}
    var leftOpen=opening(0),rightOpen=opening(.18),resting=1.28-.23*settling+.014*Math.sin(t*1.4+index*1.9);
    var leftRest=resting-.32*leftOpen*profile.bask,rightRest=resting-.27*rightOpen*profile.bask;
    var restHindLag=.055*(opening(.16)-leftOpen)+.012*Math.sin(t*1.1+index*1.3),dip=-.04-.012*Math.sin(t*2.8+index);
    result.leftWing=flight.leftWing+(-leftRest-flight.leftWing)*wingPerch;result.rightWing=flight.rightWing+(rightRest-flight.rightWing)*wingPerch;
    result.hindLag=flight.hindLag*(1-wingPerch)+restHindLag*wingPerch;result.bank=flight.bank*(1-weight);result.pitch=flight.pitch+(dip-flight.pitch)*weight;
    return result;
  }
  // Airborne visitors draw their long legs in a little, then reach for the
  // blossom before touching down. The original contact pose stays exact.
  function visitorLegTuck(pose,reduced){
    if(reduced||!pose||!Number.isFinite(pose.perch)||pose.phase==='feeding')return 0;
    var release=clamp(pose.perch/.65,0,1);
    return 1-release*release*(3-2*release);
  }
  // Quiet antenna sweeps belong only to feeding meadow visitors.
  function visitorAntennaPose(index,clock,reduced,pose){
    var still={left:0,right:0};
    if(reduced||!pose||pose.phase!=='feeding'||!pose.flower||!Number.isFinite(pose.feeding))return still;
    var amount=clamp(pose.feeding,0,1);
    if(!amount)return still;
    // One shared meadow clock keeps repaint, pause and species switches still.
    // Independent low-frequency sweeps ease in with the drinking-tube envelope;
    // neither the body, feet nor the flower contact needs to move with them.
    var time=Math.max(0,Number.isFinite(clock)?clock:0),seed=(Number.isFinite(index)?index%1024:0)*2.39996;
    return {left:amount*(.083*Math.sin(time*.83+seed)+.032*Math.sin(time*.37+seed*1.7)),
      right:amount*(.081*Math.sin(time*.91+seed+1.6)+.033*Math.sin(time*.43+seed*1.3+2.4))};
  }
  function visitorWingFlex(patch,index,clock,reduced,speciesId,pose){
    if(reduced||!patch)return {left:0,right:0,leftTwist:0,rightTwist:0};
    // This delayed sample is a pose calculation, never a simulation step.
    // Repaints and camera/species switches cannot advance its time.
    var time=Math.max(0,Number.isFinite(clock)?clock:0),current=pose||visitorVisitPose(patch,index,time,false,speciesId),prior=visitorVisitPose(patch,index,Math.max(0,time-.018),false,speciesId);
    var stiffness=speciesId==='cabbage-white'?.70:speciesId==='painted-lady'?.86:speciesId==='tiger-swallowtail'?1.04:1;
    var left=clamp((current.leftWing-prior.leftWing)*2.6*stiffness,-.66,.66),right=clamp(-(current.rightWing-prior.rightWing)*2.6*stiffness,-.66,.66);
    var twist=current.hindLag*(1-current.perch*.8)*1.25;
    return {left:left,right:right,leftTwist:clamp(left*.32+twist,-.28,.28),rightTwist:clamp(right*.32+twist,-.28,.28)};
  }
  function cameraPose(s,view,detail,reduced){
    if(detail){var p=detail.point;return {position:[p.x+5.4,p.y+3.2,p.z+8.5],target:[p.x,p.y,p.z],fov:48};}
    if(view==='meadow')return {position:[105,125,145],target:[0,0,0],fov:52};
    if(view==='wing'&&!reduced){var sin=Math.sin(s.yaw),cos=Math.cos(s.yaw);return {position:[s.x+sin*12+cos*4,s.y+4.8,s.z+cos*12-sin*4],target:[s.x-sin*9,s.y+.5,s.z-cos*9],fov:62};}
    if(s.controlMode==='steer'&&!reduced&&!s.landed){var sin=Math.sin(s.yaw),cos=Math.cos(s.yaw);return {position:[s.x+sin*17+cos*3.5,s.y+7,s.z+cos*17-sin*3.5],target:[s.x-sin*7,s.y+.5,s.z-cos*7],fov:56};}
    return {position:[s.x+13,s.y+11,s.z+22],target:[s.x+(reduced?0:s.vx*.18),s.y+.7,s.z-3+(reduced?0:s.vz*.18)],fov:54};
  }
  function pollinatorCamera(point,aspect,scale){
    // A fixed viewing angle avoids circling or rolling with each wingbeat.
    // Close framing retains spread-wing margins on narrow portrait screens.
    var distance=(aspect<1?Math.max(1.25,.70/Math.max(.3,aspect)):.82)*clamp(scale||1,.64,1.15);
    return {position:[point.x+4.2*distance,point.y+2.6*distance,point.z+6.5*distance],target:[point.x,point.y-.12,point.z],fov:43};
  }
  // Pure, bounded step. No wall clock or random stream enters the biology or journal.
  function step(s,dt,keys) {
    if(s.paused||s.landed||!Number.isFinite(dt)||dt<=0)return s;
    dt=Math.min(dt,.05);keys=keys||{};var previousWingRate=flightWingRate(s);s.clock+=dt;
    var analog=s.controlMode==='steer'?flightAnalog(keys):{turn:0,thrust:0,brake:0,lift:0};
    var dx=(keys.right?1:0)-(keys.left?1:0),dz=(keys.back?1:0)-(keys.forward?1:0);
    if(keys.left||keys.right||keys.forward||keys.back||keys.rise||keys.lower||analog.turn||analog.thrust||analog.brake||analog.lift)s.target=null;
    var destination=patch(s.target,s);
    var distance=0;
    if(destination){
      dx=destination.x-s.x;dz=destination.z-s.z;
      distance=Math.hypot(dx,dz);
      if(distance<4){s.target=null;s.paused=true;stopFlight(s);return s;}
    }
    var glide=s.gliding&&!destination,length=Math.hypot(dx,dz),speed=17*(.6+.4*s.energy/100)*(glide?.78:1);
    var direct=s.controlMode==='steer'&&!destination,brake=direct?(keys.back?1:analog.brake):0,braking=brake>0;
    if(direct){
      // Steer the animal's heading; forward thrust follows that heading.
      // Integrating the turn at its midpoint keeps slow and fast frames close.
      // Keyboard commands take priority on their axis, including opposed keys.
      var turnInput=keys.left||keys.right?(keys.right?1:0)-(keys.left?1:0):analog.turn;
      var angular=flightAxis(s.turnVelocity||0,-turnInput*1.9,12,dt),midYaw=s.yaw+angular.distance*.5;
      s.turnVelocity=angular.velocity;s.yaw=angleDelta(0,s.yaw+angular.distance);
      var thrust=keys.forward?1:analog.thrust;length=(glide?1:thrust)*(1-brake);dx=-Math.sin(midYaw)*length;dz=-Math.cos(midYaw)*length;
    }else s.turnVelocity=0;
    if(glide&&!length&&!direct){dx=-Math.sin(s.yaw);dz=-Math.cos(s.yaw);length=1;}
    if(destination)speed=Math.min(speed,Math.max(3,distance*1.7));
    // Map diagonals retain normalized speed. Direct throttle remains analog;
    // a lighter forward hold spends proportionally less flight energy.
    if(length){if(!direct){dx/=length;dz/=length;}s.energy=clamp(s.energy-dt*(glide?.18:.45)*(direct?length:1),0,100);}
    var rate=direct?(braking?9+5*brake:length?(glide?5:8.5):9):length?(glide?2.6:4.2):7;
    var ax=flightAxis(s.vx||0,dx*speed,rate,dt),az=flightAxis(s.vz||0,dz*speed,rate,dt);
    var vertical=keys.rise||keys.lower?(keys.rise?1:0)-(keys.lower?1:0):analog.lift,targetY=destination?clamp((6-s.y)*2,-5,5):vertical*7-(glide&&!vertical?.65:0);
    var ay=flightAxis(s.vy||0,targetY,5,dt);
    s.x=clamp(s.x+ax.distance,-100,100);s.z=clamp(s.z+az.distance,-100,100);s.y=clamp(s.y+ay.distance,3,24);
    s.vx=Math.abs(ax.velocity)<.005?0:ax.velocity;s.vz=Math.abs(az.velocity)<.005?0:az.velocity;s.vy=Math.abs(ay.velocity)<.005?0:ay.velocity;
    if((s.x===100&&s.vx>0)||(s.x===-100&&s.vx<0))s.vx=0;
    if((s.z===100&&s.vz>0)||(s.z===-100&&s.vz<0))s.vz=0;
    if((s.y===24&&s.vy>0)||(s.y===3&&s.vy<0))s.vy=0;
    var moving=Math.hypot(s.vx,s.vz)>.15,heading=moving?Math.atan2(-s.vx,-s.vz):s.yaw,turn=angleDelta(s.yaw,heading);
    if(!direct)s.yaw=angleDelta(0,s.yaw+turn*(1-Math.exp(-5*dt)));
    s.bank+=(clamp(direct?s.turnVelocity*.24:turn*.45,-.46,.46)-s.bank)*(1-Math.exp(-(direct?9:5)*dt));
    s.pitch+=(clamp(s.vy*.035,-.2,.2)-s.pitch)*(1-Math.exp(-4*dt));
    advanceFlightWings(s,dt,direct?(keys.back?1:Number.isFinite(keys.brake)?clamp(keys.brake,0,1):0):0,previousWingRate);
    return s;
  }
  // Consume slow frames in bounded substeps instead of discarding their time.
  // Long interruptions remain capped; visibility changes explicitly pause flight.
  function advanceFrame(s,dt,keys){
    if(s.paused||s.landed||!Number.isFinite(dt)||dt<=0)return s;
    var remaining=Math.min(dt,.25);
    while(remaining>1e-9&&!s.paused&&!s.landed){var slice=Math.min(remaining,.05);step(s,slice,keys);remaining-=slice;}
    return s;
  }
  function land(s) {
    var n=nearest(s);if(n.distance>14)return {ok:false,message:__alloT('stem.butterfly.lens_land_move_closer','Move closer to a habitat patch before landing.')};
    var perch=landingPose(s,n.plant);stopFlight(s);s.landed=n.plant.id;s.target=null;s.paused=true;s.x=perch.x;s.z=perch.z;s.y=perch.y;s.yaw=perch.yaw;
    return {ok:true,message:__alloFill(__alloT('stem.butterfly.lens_land_landed','Landed at {value1}. Examine this patch to record your evidence.'),{value1:n.plant.name})};
  }
  function observe(s) {
    var p=patch(s.landed,s);if(!p)return {ok:false,message:__alloT('stem.butterfly.lens_observe_land_first','Land at a habitat patch to examine it.')};
    if(p.nectar)s.energy=100;
    if(p.id==='restoration'){
      if(!s.restoration.prediction)return {ok:true,message:__alloFill(__alloT('stem.butterfly.lens_observe_choose_plan','{value1} Choose a plan and make a prediction in the design activity to record a comparison.'),{value1:p.note})};
      var record={design:s.restoration.design,prediction:s.restoration.prediction};
      s.restoration.trials=s.restoration.trials.filter(function(t){return t.design!==record.design;}).concat([record]);
      s.restoration.prediction=null;
      return {ok:true,message:trialFeedback(record)};
    }
    if(s.observations.indexOf(p.id)<0)s.observations.push(p.id);
    return {ok:true,message:p.note};
  }
  function save(s) { return {version:6,observations:s.observations.slice(),restoration:cleanRestoration(s.restoration),lifecycle:cleanLifecycle(s.lifecycle),season:cleanSeason(s.season),pollination:cleanPollination(s.pollination),notebook:cleanNotebook(s.notebook),cases:cleanCases(s.cases)}; }

  // The lens targets the same stems used to build the scene, including mixed plots.
  function stemPose(p,pi,index,count,offset){
    // Preserve the inspected first stem exactly. The remaining stems follow
    // irregular clumps with open pockets, rather than concentric planting rows.
    var angle=index*2.39996+(index?.16*Math.sin(index*4.37+pi):0),radius=2+Math.sqrt(index)*(count<30?1.35:2.2);
    if(index)radius*=.94+.11*Math.sin(angle*2.7+pi*.8);
    var dx=Math.cos(angle)*radius,dz=Math.sin(angle)*radius,variation=index?Math.sin(index*13.17+pi*2.1):0;
    var warpX=index?.65*Math.sin(dz*.34+pi)+variation*.21:0,warpZ=index?.6*Math.sin(dx*.41-pi)+variation*.17:0;
    var stature=index?.5+.48*variation+.2*Math.cos(index*3.73+pi):0;
    return {x:p.x+offset+dx+warpX,z:p.z+dz+warpZ,height:(pi===0?4:2.3)+stature,yaw:index?Math.sin(index*4.37)*Math.PI:0};
  }
  // Opposite leaf pairs; neighboring pairs face different directions.
  function leafPose(stem,index){
    var pair=Math.floor(index/2),side=index%2?1:-1,yaw=-pair*Math.PI/2+(stem.yaw||0);
    return {x:stem.x+side*.7*Math.cos(yaw),y:stem.height*(.32+pair*.29),z:stem.z-side*.7*Math.sin(yaw),yaw:yaw,tilt:side*.12};
  }
  function fieldDetail(s,kind){
    var p=patch(s.landed,s);if(!p||(kind!=='flowers'&&kind!=='leaves'))return null;
    var flowers=kind==='flowers',mixed=p.id==='restoration'&&s.restoration.design==='mixed';
    var milkweed=p.host&&(!mixed||!flowers),pi=milkweed?0:1,count=mixed?17:34,offset=mixed?(milkweed?-6:6):0;
    var sample={x:p.x+2,z:p.z,height:0};
    if(p.nectar){
      for(var i=0;i<count;i++){var candidate=stemPose(p,pi,i,count,offset);if(i===0||candidate.x*.6+candidate.z>sample.x*.6+sample.z)sample=candidate;}
    }
    var present=flowers?p.nectar:p.host,species=p.nectar?(milkweed?__alloT('stem.butterfly.lens_species_milkweed','Common milkweed'):__alloT('stem.butterfly.lens_species_bergamot','Wild bergamot')):__alloT('stem.butterfly.lens_species_mown_grass','Mown grass');
    var title=flowers?(present?__alloT('stem.butterfly.lens_title_flowers','Flowers for adult feeding'):__alloT('stem.butterfly.lens_title_no_flowers','No nectar flowers here')):(present?__alloT('stem.butterfly.lens_title_leaves','Leaves for monarch caterpillars'):__alloT('stem.butterfly.lens_title_no_host_leaves','No monarch host leaves here'));
    var note=flowers?(present?__alloT('stem.butterfly.lens_note_flowers','The highlighted flowers offer nectar to adult monarchs. Flowers are a feeding resource; seeing blooms does not tell you whether a plant can feed a monarch caterpillar.'):__alloT('stem.butterfly.lens_note_no_flowers','This mown patch has grass but no flowers offering nectar. Its green appearance alone does not indicate an adult food source.')):
      (present?__alloT('stem.butterfly.lens_note_milkweed_leaf','The highlighted milkweed leaf is food for monarch caterpillars. Host plant means a plant that supports their feeding and development. Adults use flower nectar instead.'):p.nectar?__alloT('stem.butterfly.lens_note_bergamot_leaves','These are bergamot leaves. This plant offers adult nectar when flowering, but its leaves do not replace milkweed for monarch caterpillars.'):__alloT('stem.butterfly.lens_note_no_milkweed','There is grass here, but no milkweed. Monarch caterpillars need milkweed leaves; green ground cover alone does not provide their host plant.'));
    var leaf=leafPose(sample,3);
    return {kind:kind,present:present,species:species,title:title,note:note,part:p.nectar?(flowers?__alloT('stem.butterfly.lens_part_flower_cluster','Flower cluster'):milkweed?__alloT('stem.butterfly.lens_part_milkweed_leaf','Milkweed leaf'):__alloT('stem.butterfly.lens_part_bergamot_leaf','Bergamot leaf')):__alloT('stem.butterfly.lens_part_mown_ground','Mown ground'),
      point:p.nectar&&!flowers?{x:leaf.x,y:leaf.y,z:leaf.z}:{x:sample.x,y:p.nectar?sample.height+.15:.4,z:sample.z}};
  }
  function evidenceRecorded(s,p){
    if(!p)return false;
    return p.id==='restoration'?!s.restoration.prediction&&s.restoration.trials.some(function(t){return t.design===s.restoration.design;}):s.observations.indexOf(p.id)>=0;
  }

  // The followed specimen belongs to its generation, not the flying adult.
  // Rendering a saved result must never turn it back into an active experiment.
  function leafWorld(a,x,y,z){var c=Math.cos(a.tilt),s=Math.sin(a.tilt),u=x*c-y*s,v=x*s+y*c;return {x:a.x+u*Math.cos(a.yaw)+z*Math.sin(a.yaw),y:a.y+v,z:a.z-u*Math.sin(a.yaw)+z*Math.cos(a.yaw)};}
  function lifecycleVisual(s){
    var lc=s.lifecycle,p=patch(lc.patch,s);if(!p)return null;
    var record=!lc.stage?broodFor(s,p.id):null,id=lc.stage||(record?(record.result==='complete'?'adult':'caterpillar'):null);
    if(!stage(id))return null;
    var mixed=p.id==='restoration'&&s.restoration.design==='mixed';
    var stem=stemPose(p,p.host?0:1,0,mixed?17:34,mixed?-6:0);
    var anchor=p.nectar?leafPose(stem,3):{x:p.x,y:.08,z:p.z,yaw:0,tilt:0};
    var support=p.nectar?'leaf':'ground',blocked=id==='caterpillar'&&!p.host;
    var point=leafWorld(anchor,0,id==='egg'?(p.nectar?-.08:.16):id==='caterpillar'?.25:id==='chrysalis'?-.36:-.86,0);
    var title={egg:__alloT('stem.butterfly.life_title_egg','An egg beneath a leaf'),caterpillar:blocked?__alloT('stem.butterfly.life_title_caterpillar_blocked','A caterpillar without food'):__alloT('stem.butterfly.life_title_caterpillar','Hatch, feed, and grow'),chrysalis:__alloT('stem.butterfly.life_title_chrysalis','Metamorphosis inside a chrysalis'),adult:__alloT('stem.butterfly.life_title_adult','An adult emerges')}[id];
    if(id==='egg'&&!p.nectar)title=__alloT('stem.butterfly.life_title_egg_mown','An egg placed in the mown patch');
    var note={egg:__alloT('stem.butterfly.life_note_egg','Look for the pale shell and its fine ribs. The egg does not feed. One enlarged egg represents the generation you are following.'),
      caterpillar:blocked?__alloT('stem.butterfly.life_note_caterpillar_blocked','The egg hatched, but this caterpillar has no milkweed to eat. Flower nectar cannot feed it. This model stops here; no chrysalis or adult forms.'):__alloT('stem.butterfly.life_note_caterpillar','The striped caterpillar eats milkweed. Hatching and growth through five instars are compressed into this step; its size change is illustrative.'),
      chrysalis:__alloT('stem.butterfly.life_note_chrysalis','The pupa hangs by a silk attachment while the adult develops inside. It does not feed. Real caterpillars often leave their food plant to find a sheltered pupation site.'),
      adult:__alloT('stem.butterfly.life_note_adult','The new adult emerges beside its empty case, then expands its wings. Real wings need time to expand and dry before flight; the short animation compresses that process.')}[id];
    return {patch:p.id,plan:p.id==='restoration'?s.restoration.design:null,stage:id,host:p.host,blocked:blocked,recorded:!!record,name:p.name,anchor:anchor,point:point,support:support,title:title,note:note};
  }
  function lifecyclePose(v,progress,reduced){
    // Reduced motion stops playback in the controller; manually selected poses
    // still describe the same moment in both renderers.
    var t=clamp(Number.isFinite(progress)?progress:1,0,1),ease=t*t*(3-2*t);
    return {growth:v&&v.blocked?.32:.32+.68*ease,crawl:v&&v.host&&!v.blocked?Math.sin(t*Math.PI)*.12:0,
      adultY:-.55-.5*ease,adultScale:.075+.055*ease,wingAngle:1.38-1.12*ease};
  }
  // Leaf-local coordinates match the scaled milkweed blade in the meadow.
  // Bites remove a small part of one margin; they never cross the central vein.
  function larvalLeafHeight(x,z){var u=clamp(x/.95,-1,1);return .07*(1-u*u)-.055*Math.abs(z/.44)+.05*u*u;}
  function larvalLeafWidth(x){return .44*Math.pow(Math.max(0,1-Math.pow(x/.95,2)),.72);}
  function larvalLeafEdge(x,notches){
    var edge=larvalLeafWidth(x);(notches||[]).forEach(function(n){var dx=x-n.x;if(n.radius>0&&Math.abs(dx)<n.radius)edge=Math.min(edge,n.z-Math.sqrt(Math.max(0,n.radius*n.radius-dx*dx)));});return edge;
  }
  function larvalLeafOutline(moment){
    var points=[],notches=moment&&moment.active?moment.notches:[];
    for(var i=0;i<=192;i++){var x=-.95+i*1.9/192;points.push({x:x,z:-larvalLeafWidth(x)});}
    for(var i=192;i>=0;i--){var x=-.95+i*1.9/192;points.push({x:x,z:larvalLeafEdge(x,notches)});}
    return points;
  }
  function larvalJawTip(jaw){
    // Average the two original mouthpart tips after their feeding-only pivot.
    var tip=[0,0,0],pitch=-.88;
    [-1,1].forEach(function(side){var yaw=side*.28*jaw,x=.044,y=-.006,z=side*.021;
      var rx=x*Math.cos(pitch)-y*Math.sin(pitch),ry=x*Math.sin(pitch)+y*Math.cos(pitch);
      tip[0]+=(.727+rx*Math.cos(yaw)+z*Math.sin(yaw))*.5;tip[1]+=(.071+ry)*.5;tip[2]+=(-.023+side*.027-rx*Math.sin(yaw)+z*Math.cos(yaw))*.5;});return tip;
  }
  function larvalFeeding(v,progress){
    var t=clamp(Number.isFinite(progress)?progress:1,0,1),active=!!(v&&v.stage==='caterpillar'&&v.host&&v.support==='leaf'&&!v.blocked);
    if(!active)return {active:false,progress:t,phase:'unavailable',completedBites:0,jaw:0,contact:{x:0,y:0,z:0},mouth:{x:0,y:0,z:0},gap:0,position:[0,0,0],rotation:[0,0,0],scale:.48,notches:[]};
    var cycle=Math.min(3,Math.floor(t*4)),u=t===1?1:t*4-cycle,centers=[-.36,-.12,.12,.36],notches=[];
    function ease(n){n=clamp(n,0,1);return n*n*(3-2*n);}
    for(var i=0;i<4;i++){var amount=i<cycle?1:i===cycle?ease((u-.2)/.6):0;if(amount>0)notches.push({x:centers[i],z:larvalLeafWidth(centers[i]),radius:.105*amount});}
    var approach=ease(u/.2),x=cycle>0&&u<.2?centers[cycle-1]+(centers[cycle]-centers[cycle-1])*approach:centers[cycle],z=larvalLeafEdge(x,notches),y=larvalLeafHeight(x,z);
    var phase=t===1?'complete':u<.2?'approach':u<.8?'bite':'pause',jaw=phase==='bite'?ease((u-.2)/.6):phase==='complete'?1:phase==='pause'?(cycle===3?1:1-ease((u-.8)/.2)):0;
    var gap=phase==='approach'?.025*Math.sin(u/.2*Math.PI):0,scale=.48,pitch=-.22,tip=larvalJawTip(jaw),rx=(tip[0]*Math.cos(pitch)-tip[1]*Math.sin(pitch))*scale,ry=(tip[0]*Math.sin(pitch)+tip[1]*Math.cos(pitch))*scale,rz=tip[2]*scale;
    // yaw -pi/2 puts the head across the leaf, toward its positive-Z margin.
    return {active:true,progress:t,phase:phase,completedBites:Math.min(4,cycle+(u>=.8?1:0)),jaw:jaw,contact:{x:x,y:y,z:z},mouth:{x:x,y:y+gap,z:z},gap:gap,position:[x+rz,y+gap-ry,z-rx],rotation:[0,-Math.PI/2,pitch],scale:scale,notches:notches};
  }
  function chrysalisMaturation(v,progress){
    var t=clamp(Number.isFinite(progress)?progress:1,0,1),active=!!(v&&v.stage==='chrysalis'&&v.host&&v.support==='leaf'&&!v.blocked);
    function ease(n){n=clamp(n,0,1);return n*n*(3-2*n);}
    var phase=!active?'unavailable':t<.34?'green':t<.72?'markings':'pattern';
    return {active:active,progress:t,phase:phase,darkness:active?ease((t-.18)/.52):0,pattern:active?ease((t-.38)/.54):0,
      label:{unavailable:__alloT('stem.butterfly.life_mat_unavailable','Maturation unavailable'),green:__alloT('stem.butterfly.life_mat_green','Green chrysalis'),markings:__alloT('stem.butterfly.life_mat_markings','Wing markings appear'),pattern:__alloT('stem.butterfly.life_mat_pattern','Wing pattern visible')}[phase],
      note:!active?__alloT('stem.butterfly.life_mat_note_unavailable','This close-up is available for the chrysalis of a generation supported by milkweed.'):phase==='green'?__alloT('stem.butterfly.life_mat_note_green','The green case hides the developing adult. The pupa hangs from its attachment and does not feed.'):phase==='markings'?__alloT('stem.butterfly.life_mat_note_markings','As emergence approaches, the case becomes less opaque and the dark markings of the folded wings begin to show through.'): __alloT('stem.butterfly.life_mat_note_pattern','Orange and dark markings of the folded wings are visible through the case. The adult has not emerged or expanded its wings yet.')};
  }
  // A shared surface illustration, not an anatomical cutaway. The lower case
  // gradually reveals folded wing panels; the gold band and attachment remain.
  function chrysalisSurface(u,v,moment){
    u=clamp(Number.isFinite(u)?u:0,-1,1);v=clamp(Number.isFinite(v)?v:0,0,1);
    var green=v>.384?[129/255,189/255,135/255]:[123/255,187/255,128/255],active=!!(moment&&moment.active);
    var darkness=active?clamp(Number.isFinite(moment.darkness)?moment.darkness:0,0,1):0,pattern=active?clamp(Number.isFinite(moment.pattern)?moment.pattern:0,0,1):0;
    var mask=clamp((v-.32)/.08,0,1);mask=mask*mask*(3-2*mask);
    var a=Math.abs(u),q=clamp((v-.34)/.66,0,1),border=.86-.18*q+.018*Math.sin(q*Math.PI);
    function soften(low,high,value){var t=clamp((value-low)/(high-low),0,1);return t*t*(3-2*t);}
    function veinWeight(distance,width){return 1-soften(width-.013,width+.013,distance);}
    // Curved, softly blended veins avoid quantized steps on the fixed skin grid.
    // The panels suggest folded wings under the case, rather than an open wing.
    var vein=Math.max(1-soften(.039,.069,a),soften(border-.018,border+.018,a),
      veinWeight(Math.abs(a-(.19+.32*(1-q)+.035*Math.sin(q*Math.PI))),.025),
      veinWeight(Math.abs(a-(.47+.24*(1-q)+.025*Math.sin(q*Math.PI*1.5))),.023),
      veinWeight(Math.abs(q-(.22+.16*a+.029*Math.sin(a*Math.PI*1.4))),.018),
      veinWeight(Math.abs(q-(.47+.19*a-.026*Math.sin(a*Math.PI))),.019),
      veinWeight(Math.abs(q-(.72+.10*a+.021*Math.sin(a*Math.PI*1.6))),.018));
    var orange=[.91-.12*q,.49-.07*q,.17-.035*q],wing=orange.map(function(channel,i){return channel+([.105,.13,.115][i]-channel)*vein;});
    for(var spot=0;spot<5;spot++){
      var sv=.46+spot*.095,sq=(sv-.34)/.66,su=.86-.18*sq+.018*Math.sin(sq*Math.PI)-.012;
      var spotDistance=(Math.hypot((a-su)/.043,(v-sv)/.019)-1)*.019,spotWeight=1-soften(-.008,.008,spotDistance);
      wing=wing.map(function(channel,i){return channel+([.93,.90,.73][i]-channel)*spotWeight;});
    }
    return green.map(function(channel,i){var shade=channel+([.19,.30,.20][i]-channel)*darkness*mask*.82;return clamp(shade+(wing[i]-shade)*pattern*mask,0,1);});
  }
  function lifecycleInspection(v,focus,progress,reduced){
    if(!v)return null;
    var feeding=larvalFeeding(v,progress);
    if(focus==='feeding'&&feeding.active)return {focus:'feeding',label:__alloT('stem.butterfly.life_insp_feeding_label','Leaf feeding close-up'),detailLabel:__alloT('stem.butterfly.life_insp_detail_caterpillar','Caterpillar head close-up'),title:__alloT('stem.butterfly.life_insp_feeding_title','Biting the milkweed leaf'),note:__alloT('stem.butterfly.life_insp_feeding_note','The mouthparts close at the leaf edge, leaving small missing pieces. This enlarged sequence shows four illustrative bites, not a measured feeding rate or a complete meal. Rewind to compare the intact leaf with its bitten edge.'),point:leafWorld(v.anchor,feeding.mouth.x,feeding.mouth.y,feeding.mouth.z)};
    var maturation=chrysalisMaturation(v,progress);
    if(focus==='maturation'&&maturation.active)return {focus:'maturation',label:__alloT('stem.butterfly.life_insp_maturation_label','Chrysalis maturation close-up'),detailLabel:__alloT('stem.butterfly.life_insp_detail_chrysalis','Chrysalis attachment close-up'),title:maturation.label,note:__alloFill(__alloT('stem.butterfly.life_insp_maturation_note','{value1} This enlarged sequence illustrates visible changes before emergence; its progress does not measure elapsed time or show the hidden transformation inside.'),{value1:maturation.note}),point:leafWorld(v.anchor,0,-.38,0)};
    focus=focus==='specimen'||focus==='detail'?focus:'context';
    var pose=lifecyclePose(v,progress,reduced),leaf=v.support==='leaf',point=v.point;
    var detailLabel={egg:__alloT('stem.butterfly.life_insp_detail_egg','Egg shell close-up'),caterpillar:__alloT('stem.butterfly.life_insp_detail_caterpillar','Caterpillar head close-up'),chrysalis:__alloT('stem.butterfly.life_insp_detail_chrysalis','Chrysalis attachment close-up'),adult:__alloT('stem.butterfly.life_insp_detail_adult','Wing close-up')}[v.stage];
    var titles={egg:__alloT('stem.butterfly.life_insp_title_egg','Ribs on the egg shell'),caterpillar:__alloT('stem.butterfly.life_insp_title_caterpillar','Head and mouthparts'),chrysalis:__alloT('stem.butterfly.life_insp_title_chrysalis','The attachment above the chrysalis'),adult:__alloT('stem.butterfly.life_insp_title_adult','A monarch wing unfolding')};
    var notes={egg:__alloT('stem.butterfly.life_insp_note_egg','The enlarged shell has fine lengthwise ribs. The egg does not feed; the developing caterpillar is hidden inside.'),
      caterpillar:v.blocked?__alloT('stem.butterfly.life_insp_note_caterpillar_blocked','The dark head has pale markings, but there is no milkweed here to eat. Inspecting or replaying this caterpillar cannot make it grow or form a chrysalis.'):__alloT('stem.butterfly.life_insp_note_caterpillar','Look at the dark head capsule and its pale markings. Small mouthparts are near the front. This growth view shows the head, not individual bites or the five separate molts; choose Leaf feeding close-up to inspect the mouthparts at the leaf edge.'),
      chrysalis:__alloT('stem.butterfly.life_insp_note_chrysalis','A small silk pad and dark attachment support the hanging pupa. The green outer surface and gold markings are visible; the transformation into an adult happens out of sight inside.'),
      adult:__alloT('stem.butterfly.life_insp_note_adult','Follow the orange wing surface, dark veins, and pale spots as the wings expand. This illustrative motion compresses emergence and expansion; real wings also need time to dry before flight.')};
    if(focus!=='context'){
      if(v.stage==='egg')point=leafWorld(v.anchor,0,leaf?.065-.13:.13,focus==='detail'?.09:0);
      else if(v.stage==='caterpillar')point=leafWorld(v.anchor,pose.crawl+(focus==='detail'?.665:0)*pose.growth,(leaf?.1:0)+(focus==='detail'?.113:.125)*pose.growth,(focus==='detail'?-.023:.01)*pose.growth);
      else if(v.stage==='chrysalis')point=leafWorld(v.anchor,0,focus==='detail'?.025:-.365,0);
      else if(v.stage==='adult'){
        if(focus==='detail'){
          // The right forewing rotates at its hinge before the emerging adult
          // rotates upright. Track an actual vein on that moving wing surface.
          var x=3.7,z=-2.92,y=monarchWingHeight(x,z,true)+.03;
          point=leafWorld(v.anchor,(.12+x*Math.cos(pose.wingAngle)-y*Math.sin(pose.wingAngle))*pose.adultScale,pose.adultY-z*pose.adultScale,.28+(x*Math.sin(pose.wingAngle)+y*Math.cos(pose.wingAngle))*pose.adultScale);
        }else point=leafWorld(v.anchor,0,pose.adultY,.28);
      }
    }
    return {focus:focus,label:focus==='context'?__alloT('stem.butterfly.life_insp_context_label','Plant and stage'):focus==='specimen'?__alloT('stem.butterfly.life_insp_specimen_label','Whole specimen'):detailLabel,detailLabel:detailLabel,title:focus==='detail'?titles[v.stage]:v.title,note:focus==='detail'?notes[v.stage]:v.note,point:point};
  }
  function lifecycleCamera(v,aspect,focus,progress,reduced){
    var a=v.anchor,egg=v.stage==='egg'&&v.support==='leaf';
    var offset=egg?[1.3,-.7,1.65]:v.stage==='adult'?[2.2,-.45,3]:v.stage==='chrysalis'?[1.4,-.25,2.15]:[1.8,1.2,2.4];
    var inspection=lifecycleInspection(v,focus,progress,reduced),pose=lifecyclePose(v,progress,reduced),frameAspect=Number.isFinite(aspect)&&aspect>0?clamp(aspect,.25,4):1,portrait=1/Math.min(1,frameAspect);
    var origin=leafWorld(a,offset[0],offset[1],offset[2]),point=inspection.point,fov=egg?38:42;
    if(inspection.focus==='context'){
      if(portrait!==1)origin={x:point.x+(origin.x-point.x)*portrait,y:point.y+(origin.y-point.y)*portrait,z:point.z+(origin.z-point.z)*portrait};
    }else if(inspection.focus==='feeding'){
      var distance=2.15*portrait,delta=leafWorld(a,distance*.35,distance*.7,distance*.74);
      origin={x:point.x+delta.x-a.x,y:point.y+delta.y-a.y,z:point.z+delta.z-a.z};fov=42;
    }else if(inspection.focus==='maturation'){
      // Keep the complete case and silk attachment in view, including portrait.
      var distance=(1.45+.30*clamp((1.3-frameAspect)/.3,0,1))*portrait,delta=leafWorld(a,distance*.22,-distance*.08,distance*.972);
      origin={x:point.x+delta.x-a.x,y:point.y+delta.y-a.y,z:point.z+delta.z-a.z};fov=38;
    }else{
      var detail=inspection.focus==='detail',distance=v.stage==='egg'?(detail?.34:.75):v.stage==='caterpillar'?(detail?Math.max(.2,.46*pose.growth):Math.max(.72,2.35*pose.growth)):v.stage==='chrysalis'?(detail?.48:1.45):(detail?.95:2.7)*pose.adultScale/.13;
      var direction=egg?[.5,-.3,.85]:v.stage==='adult'?(detail?[Math.sin(pose.wingAngle),.2,-Math.cos(pose.wingAngle)]:[.7,.1,1]):v.stage==='chrysalis'?[.65,-.2,1]:[.7,.5,1];
      var length=Math.hypot(direction[0],direction[1],direction[2]),delta=leafWorld(a,direction[0]*distance*portrait/length,direction[1]*distance*portrait/length,direction[2]*distance*portrait/length);
      origin={x:point.x+delta.x-a.x,y:point.y+delta.y-a.y,z:point.z+delta.z-a.z};fov=detail?34:38;
    }
    // Aim at the specimen, from beneath the leaf for the underside egg.
    return {position:[origin.x,Math.max(.24,origin.y),origin.z],target:[point.x,point.y,point.z],fov:fov};
  }

  // The illustrated feeding view uses the same cut outline and mouth position
  // as the native leaf, so rewinding restores exactly the same sample bites.
  function paintLarvalFeedingDiagram(g,width,height,v,progress){
    var moment=larvalFeeding(v,progress),outline=larvalLeafOutline(moment),bg=g.createLinearGradient(0,0,0,height);
    bg.addColorStop(0,'#dce9d6');bg.addColorStop(1,'#f5f1df');g.fillStyle=bg;g.fillRect(0,0,width,height);
    var unit=Math.min((width-38)/2.12,(height-150)/1.35),cx=width*.5,cy=height*.43;
    function project(x,y,z){return [x,z-y*.35];}
    function local(x,y,z){var pitch=moment.rotation[2],rx=x*Math.cos(pitch)-y*Math.sin(pitch),ry=x*Math.sin(pitch)+y*Math.cos(pitch);return project(moment.position[0]-z*moment.scale,moment.position[1]+ry*moment.scale,moment.position[2]+rx*moment.scale);}
    function line(points,color,thickness){g.strokeStyle=color;g.lineWidth=thickness;g.beginPath();points.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.stroke();}
    function leafPath(){g.beginPath();outline.forEach(function(p,i){var q=project(p.x,larvalLeafHeight(p.x,p.z),p.z);if(i)g.lineTo(q[0],q[1]);else g.moveTo(q[0],q[1]);});g.closePath();}
    g.save();g.translate(cx,cy);g.scale(unit,unit);g.lineCap='round';g.lineJoin='round';
    line([[.88,0],[1.14,.04],[1.38,.36]],'#597046',.035);
    var blade=g.createLinearGradient(0,-.45,0,.45);blade.addColorStop(0,'#7fa254');blade.addColorStop(.5,'#739448');blade.addColorStop(1,'#4b743b');
    leafPath();g.fillStyle=blade;g.fill();g.strokeStyle='#486435';g.lineWidth=.008;g.stroke();
    g.save();leafPath();g.clip();
    line([[-.94,-.02],[.94,-.02]],'#bed393',.013);
    for(var i=-4;i<=4;i++){var x=i*.18;[-1,1].forEach(function(side){line([[x,-.02],[x-.1,side*.18],[x-.23,side*.4]],'#a1ba74',.006);});}
    g.restore();
    // Three true leg pairs and five proleg pairs support a fixed-size larva.
    [-.56,-.39,-.23,-.07,.09,.33,.44,.55].forEach(function(x){[-1,1].forEach(function(side){line([local(x,.07,side*.075),local(x+.02,.012,side*.14)],'#374232',.011);});});
    for(var segment=0;segment<11;segment++){
      var x=-.59+segment*.113,q=local(x,.135,0),r=(.083+.025*Math.sin(segment/10*Math.PI))*moment.scale;
      g.fillStyle='#e9df9f';g.strokeStyle='#30382d';g.lineWidth=.009;g.beginPath();g.ellipse(q[0],q[1],r,.044,0,0,Math.PI*2);g.fill();g.stroke();
      g.strokeStyle='#fff8da';g.lineWidth=.01;g.beginPath();g.ellipse(q[0],q[1]-.012,r*.95,.018,0,0,Math.PI);g.stroke();
      g.strokeStyle='#b59b34';g.lineWidth=.005;g.beginPath();g.ellipse(q[0],q[1]+.009,r*.92,.019,0,0,Math.PI);g.stroke();
    }
    [-.51,.47].forEach(function(x){[-1,1].forEach(function(side){line([local(x,.19,side*.064),local(x+.03,.4,side*.16),local(x+.1,.43,side*.18)],'#28362b',.008);});});
    [-1,1].forEach(function(side){
      var yaw=side*.28*moment.jaw,pitch=-.88;
      var points=[[0,0,0],[.035,-.017,side*.016],[.044,-.006,side*.021]].map(function(p){var rx=p[0]*Math.cos(pitch)-p[1]*Math.sin(pitch),ry=p[0]*Math.sin(pitch)+p[1]*Math.cos(pitch);return local(.727+rx*Math.cos(yaw)+p[2]*Math.sin(yaw),.071+ry,-.023+side*.027-rx*Math.sin(yaw)+p[2]*Math.cos(yaw));});
      line(points,'#25312a',.007);
    });
    var head=local(.665,.113,-.023);g.fillStyle='#28332d';g.beginPath();g.ellipse(head[0],head[1],.081*moment.scale,.087*moment.scale,0,0,Math.PI*2);g.fill();
    [-1,1].forEach(function(side){line([local(.62,.17,-.023+side*.025),local(.666,.18,-.023+side*.034),local(.712,.13,-.023+side*.027)],'#eee5b9',.005);});
    g.restore();
  }

  var chrysalisDiagramCache=new WeakMap();
  function paintChrysalisMaturationDiagram(g,width,height,v,progress){
    var moment=chrysalisMaturation(v,progress),bg=g.createLinearGradient(0,0,0,height);
    bg.addColorStop(0,'#dce9d6');bg.addColorStop(1,'#f5f1df');g.fillStyle=bg;g.fillRect(0,0,width,height);
    // Cache one small surface per visible canvas. Its colors come from the
    // native model's same external-appearance helper, never an internal cutaway.
    var cache=chrysalisDiagramCache.get(g.canvas),profile=[[.022,.083],[.045,.119],[.076,.16],[.109,.201],[.132,.235],[.15,.267],[.161,.294],[.169,.35],[.176,.43],[.168,.52],[.142,.61],[.105,.673],[.055,.714],[0,.726]];
    if(!cache){
      var document=g.canvas.ownerDocument,canvas=document.createElement('canvas');canvas.width=160;canvas.height=288;
      cache={canvas:canvas,context:canvas.getContext('2d'),progress:null,layers:[]};
      // The shared surface is bilinear in darkness and pattern. Bake its four
      // endpoints once, then blend these small rasters during playback.
      var endpoints=[{active:false},{active:true,darkness:1,pattern:0},{active:true,darkness:0,pattern:1},{active:true,darkness:1,pattern:1}],rasters=endpoints.map(function(){return cache.context.createImageData(160,288);});
      for(var row=0;row<288;row++){
        var t=(row+.5)/288,y=.083+t*.643,band=0;while(band<profile.length-2&&y>profile[band+1][1])band++;
        var a=profile[band],b=profile[band+1],radius=a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
        for(var col=0;col<160;col++){
          var x=((col+.5)/160-.5)*.352;if(Math.abs(x)>radius)continue;
          var u=x/Math.max(.001,radius),light=.78+.22*Math.sqrt(Math.max(0,1-u*u)),at=(row*160+col)*4;
          endpoints.forEach(function(endpoint,index){var color=chrysalisSurface(x/.176,t,endpoint),pixels=rasters[index].data;pixels[at]=Math.round(color[0]*light*255);pixels[at+1]=Math.round(color[1]*light*255);pixels[at+2]=Math.round(color[2]*light*255);pixels[at+3]=255;});
        }
      }
      rasters.forEach(function(raster){var layer=document.createElement('canvas');layer.width=160;layer.height=288;layer.getContext('2d').putImageData(raster,0,0);cache.layers.push(layer);});chrysalisDiagramCache.set(g.canvas,cache);
    }
    if(cache.progress!==moment.progress){
      var darkness=moment.darkness,pattern=moment.pattern,weights=[(1-darkness)*(1-pattern),darkness*(1-pattern),(1-darkness)*pattern,darkness*pattern],context=cache.context;
      context.clearRect(0,0,160,288);context.globalCompositeOperation='lighter';
      cache.layers.forEach(function(layer,index){if(weights[index]>0){context.globalAlpha=weights[index];context.drawImage(layer,0,0);}});
      context.globalAlpha=1;context.globalCompositeOperation='source-over';cache.progress=moment.progress;
    }
    var unit=Math.max(1,Math.min((width-40)/1.2,(height-145)/.9)),cx=width*.5,top=height*.18;
    g.save();g.translate(cx,top);g.scale(unit,unit);g.lineCap='round';
    g.strokeStyle='#566e45';g.lineWidth=.028;g.beginPath();g.moveTo(-.7,-.04);g.quadraticCurveTo(0,-.045,.7,-.13);g.stroke();
    g.fillStyle='#7d9b57';g.beginPath();g.moveTo(-.56,-.05);g.bezierCurveTo(-.35,-.22,.04,-.25,.42,-.11);g.bezierCurveTo(.13,.015,-.18,.035,-.56,-.05);g.fill();
    g.strokeStyle='#bdcf91';g.lineWidth=.006;g.beginPath();g.moveTo(-.53,-.052);g.lineTo(.37,-.11);g.stroke();
    g.fillStyle='#e3dec3';g.beginPath();g.ellipse(0,-.004,.052,.009,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#403e30';g.lineWidth=.014;g.beginPath();g.moveTo(0,.002);g.bezierCurveTo(-.025,.025,-.02,.058,0,.084);g.stroke();
    g.drawImage(cache.canvas,-.176,.083,.352,.643);
    g.strokeStyle='#526647';g.lineWidth=.0035;g.beginPath();profile.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});for(var i=profile.length-1;i>=0;i--)g.lineTo(-profile[i][0],profile[i][1]);g.closePath();g.stroke();
    g.strokeStyle='#333c2e';g.lineWidth=.006;g.beginPath();g.moveTo(-.15,.287);g.quadraticCurveTo(0,.31,.15,.287);g.stroke();
    g.strokeStyle='#efd789';g.lineWidth=.009;g.beginPath();g.moveTo(-.15,.279);g.quadraticCurveTo(0,.301,.15,.279);g.stroke();
    g.fillStyle='#f2d887';[[-.112,.445],[.112,.445],[-.101,.523],[.101,.523],[-.069,.619],[.069,.619]].forEach(function(p){g.beginPath();g.ellipse(p[0],p[1],.008,.011,0,0,Math.PI*2);g.fill();});
    g.restore();
  }

  // Accessible 2D counterpart to the same specimen when WebGL is unavailable.
  // This is an illustration, not a population count or a second simulation.
  function paintLifecycleDiagram(g,width,height,v,progress,reduced,focus){
    if(focus==='feeding'&&larvalFeeding(v,progress).active){paintLarvalFeedingDiagram(g,width,height,v,progress);return;}
    if(focus==='maturation'&&chrysalisMaturation(v,progress).active){paintChrysalisMaturationDiagram(g,width,height,v,progress);return;}
    var bg=g.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#dce9d6');bg.addColorStop(1,'#f5f1df');g.fillStyle=bg;g.fillRect(0,0,width,height);
    var unit=Math.min(width/5.3,height/4.3),cx=width*.5,cy=height*.43,pose=lifecyclePose(v,progress,reduced),inspection=lifecycleInspection(v,focus,progress,reduced),zoom=1,pan=[0,0];
    if(inspection.focus!=='context'){
      var detail=inspection.focus==='detail';
      if(v.stage==='egg'){zoom=detail?7:4;pan=[-.35,v.support==='leaf'?.34:.10];}
      else if(v.stage==='caterpillar'){zoom=(detail?4.5:1.85)/Math.max(.45,pose.growth);pan=[-.2+pose.crawl+(detail?.81:-.05)*pose.growth,-.09-.09*pose.growth];}
      else if(v.stage==='chrysalis'){zoom=detail?5:2.5;pan=[-.2,detail?.33:.77];}
      else{var spread=.22+Math.cos(pose.wingAngle)*.72;zoom=detail?3.3:1.8;pan=[-.05+(detail?spread*.7:0),.82-pose.adultY*.38-(detail?.2:0)];}
    }
    g.save();g.translate(cx,cy);g.scale(unit*zoom,unit*zoom);g.translate(-pan[0],-pan[1]);g.lineCap='round';
    if(v.support==='leaf'){
      g.strokeStyle='#597046';g.lineWidth=.075;g.beginPath();g.moveTo(1.38,2.5);g.quadraticCurveTo(1.2,.7,1.15,-1.8);g.stroke();
      g.fillStyle=v.host?'#668a4b':'#6c875b';g.beginPath();g.moveTo(1.18,.12);g.bezierCurveTo(.6,-.55,-1.2,-.58,-1.75,.03);g.bezierCurveTo(-.7,.62,.4,.65,1.18,.12);g.fill();
      g.strokeStyle='#abc088';g.lineWidth=.018;g.beginPath();g.moveTo(-1.6,.04);g.lineTo(1.15,.12);g.stroke();
      for(var vein=0;vein<7;vein++){var vx=-1.25+vein*.33;g.beginPath();g.moveTo(vx,.08);g.lineTo(vx+.28,-.27+Math.abs(vx)*.08);g.moveTo(vx,.08);g.lineTo(vx+.25,.37-Math.abs(vx)*.06);g.stroke();}
    }else{
      g.fillStyle='#c2cc98';g.fillRect(-4,.45,8,3);g.strokeStyle='#7d9357';g.lineWidth=.025;
      for(var blade=0;blade<19;blade++){var bx=-3+blade*.34;g.beginPath();g.moveTo(bx,.6);g.lineTo(bx-.08,.31);g.lineTo(bx+.05,.44);g.stroke();}
    }
    if(v.stage==='egg'){
      g.save();g.translate(-.35,v.support==='leaf'?.18:.26);if(v.support==='leaf')g.scale(1,-1);
      g.fillStyle='#fff9d8';g.strokeStyle='#8b805a';g.lineWidth=.018;g.beginPath();g.ellipse(0,-.16,.14,.21,0,0,Math.PI*2);g.fill();g.stroke();
      g.strokeStyle='#c9bd8d';g.lineWidth=.012;for(var rib=-2;rib<=2;rib++){g.beginPath();g.moveTo(rib*.034,.015);g.quadraticCurveTo(rib*.06,-.17,rib*.018,-.35);g.stroke();}g.restore();
    }else if(v.stage==='caterpillar'){
      g.save();g.translate(-.2+pose.crawl,-.09);g.scale(pose.growth,pose.growth);
      for(var segment=0;segment<11;segment++){var x=-.8+segment*.15,y=-.09-Math.sin(segment/10*Math.PI)*.08;g.fillStyle='#f4e8a4';g.beginPath();g.ellipse(x,y,.13,.15,0,0,Math.PI*2);g.fill();g.strokeStyle='#282f26';g.lineWidth=.046;g.beginPath();g.ellipse(x+.025,y,.055,.145,0,-Math.PI/2,Math.PI/2);g.stroke();g.strokeStyle='#fffbe5';g.lineWidth=.026;g.beginPath();g.ellipse(x-.025,y,.06,.14,0,-Math.PI/2,Math.PI/2);g.stroke();g.strokeStyle='#30382c';g.lineWidth=.025;g.beginPath();g.moveTo(x,.01);g.lineTo(x+.04,.08);g.stroke();}
      g.fillStyle='#282e2b';g.beginPath();g.ellipse(.81,-.09,.12,.14,0,0,Math.PI*2);g.fill();
      g.strokeStyle='#f2e8ca';g.lineWidth=.016;[-1,1].forEach(function(side){g.beginPath();g.moveTo(.79,-.19);g.quadraticCurveTo(.84+side*.035,-.09,.84,.015);g.stroke();});
      g.strokeStyle='#394134';g.lineWidth=.014;g.beginPath();g.moveTo(.91,-.04);g.lineTo(.96,-.015);g.lineTo(.97,-.05);g.stroke();
      g.strokeStyle='#273129';g.lineWidth=.028;[-.72,.66].forEach(function(x){g.beginPath();g.moveTo(x,-.19);g.quadraticCurveTo(x+.1,-.57,x+.23,-.46);g.stroke();});g.restore();
    }else{
      var emerged=v.stage==='adult';g.save();g.translate(-.2,.17);g.fillStyle='#ddd6b5';g.beginPath();g.ellipse(0,-.025,.065,.018,0,0,Math.PI*2);g.fill();g.strokeStyle='#454333';g.lineWidth=.022;g.beginPath();g.moveTo(0,-.015);g.bezierCurveTo(.045,.035,-.025,.11,0,.18);g.stroke();
      g.fillStyle=emerged?'#d4c99f':'#76b488';g.strokeStyle=emerged?'#8f835f':'#3d7158';g.lineWidth=.025;g.beginPath();g.moveTo(0,.14);g.bezierCurveTo(.11,.19,.2,.36,.19,.66);g.bezierCurveTo(.18,.98,-.18,.98,-.19,.66);g.bezierCurveTo(-.18,.4,-.12,.24,0,.14);g.fill();g.stroke();
      g.strokeStyle='#f4dc7d';g.lineWidth=.035;g.beginPath();g.moveTo(-.17,.39);g.quadraticCurveTo(0,.44,.17,.39);g.stroke();g.fillStyle='#ffe8a1';[-.1,0,.1].forEach(function(x){g.beginPath();g.arc(x,.73,.018,0,Math.PI*2);g.fill();});g.restore();
      if(emerged){g.save();g.translate(-.05,.82-pose.adultY*.38);var spread=.22+Math.cos(pose.wingAngle)*.72;[-1,1].forEach(function(side){g.save();g.scale(side,1);g.fillStyle='#e9a143';g.strokeStyle='#293026';g.lineWidth=.055;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(spread*.55,-.75,spread*1.6,-.74,spread*1.08,-.15);g.bezierCurveTo(spread*1.48,.55,spread*.25,.65,0,.08);g.fill();g.stroke();g.lineWidth=.018;for(var n=0;n<4;n++){g.beginPath();g.moveTo(0,.02);g.lineTo(spread*(.5+n*.18),-.52+n*.2);g.stroke();}g.fillStyle='#fff2ce';for(var n=0;n<5;n++){g.beginPath();g.arc(spread*(.75+Math.sin(n)*.2),-.43+n*.18,.025,0,Math.PI*2);g.fill();}g.restore();});g.strokeStyle='#222c26';g.lineWidth=.08;g.beginPath();g.moveTo(0,-.23);g.lineTo(0,.4);g.stroke();g.restore();}
    }
    g.restore();
  }

  // Only an explicit record action stores a completed model flower visit.
  // The outcome is derived from contact, never trusted from a saved caption.
  function cleanPollination(value){
    var v=value&&typeof value==='object'?value:{},visits=[];
    (Array.isArray(v.visits)?v.visits.slice(-64):[]).forEach(function(r){
      if(!r||typeof r!=='object'||!knownPatchId(r.patch)||typeof r.contact!=='boolean')return;
      var plan=r.patch==='restoration'&&design(r.plan)?r.plan:null;
      if(r.patch==='restoration'&&!plan||r.patch!=='restoration'&&r.plan!=null)return;
      var p=plan?design(plan):PLANTS.find(function(p){return p.id===r.patch;});
      if(!p||!p.nectar)return;
      var species=r.patch==='milkweed'?'milkweed':'bergamot';
      if(r.species!==species)return;
      var row={patch:r.patch,species:species,contact:r.contact};
      if(plan)row.plan=plan;
      visits=visits.filter(function(x){return x.patch!==row.patch||(x.plan||null)!==plan||x.contact!==row.contact;});
      visits.push(row);
    });
    // Four possible flowering patch/planting combinations, two contact cases.
    return {visits:visits.slice(-8)};
  }
  function pollinationIsCurrent(s,row){
    var valid=cleanPollination({visits:[row]}).visits[0];
    return !!valid&&(valid.patch!=='restoration'||!!(s.restoration&&valid.plan===s.restoration.design));
  }
  function currentPollinationVisits(s){
    return cleanPollination(s.pollination).visits.filter(function(row){return pollinationIsCurrent(s,row);});
  }
  function pollinationPairs(s){
    var visits=currentPollinationVisits(s),pairs=[];
    visits.forEach(function(row){
      if(!row.contact)return;
      var miss=visits.find(function(other){return !other.contact&&other.patch===row.patch&&(other.plan||null)===(row.plan||null);});
      if(!miss)return;
      var pair={patch:row.patch,species:row.species,contact:row,miss:miss};
      if(row.plan)pair.plan=row.plan;
      pairs.push(pair);
    });
    return pairs;
  }
  function recordPollination(s,phase,progress,contact){
    var p=patch(s.landed,s);
    if(!p||!p.nectar)return {ok:false,message:__alloT('stem.butterfly.poll_msg_land_flowering','Land at a flowering patch and watch a flower visit before recording it.')};
    if(phase!=='deposit'||!Number.isFinite(progress)||progress!==1||typeof contact!=='boolean')return {ok:false,message:__alloT('stem.butterfly.poll_msg_finish_step','Finish the final flower visit step at 100% progress, then record the contact case you observed.')};
    var records=cleanPollination(s.pollination),plan=p.id==='restoration'?s.restoration.design:null;
    if(records.visits.some(function(row){return row.patch===p.id&&(row.plan||null)===plan&&row.contact===contact;}))return {ok:false,message:contact?__alloT('stem.butterfly.poll_msg_already_contact','This contact case is already recorded for this patch and planting. Try the other contact case to compare.'):__alloT('stem.butterfly.poll_msg_already_missed','This missed-contact case is already recorded for this patch and planting. Try the other contact case to compare.')};
    var row={patch:p.id,species:feedingVisual(s).species,contact:contact};
    if(plan)row.plan=plan;
    records.visits.push(row);s.pollination=cleanPollination(records);
    return {ok:true,message:__alloFill(contact?__alloT('stem.butterfly.poll_msg_recorded_contact',"Recorded model visit at {value1}: the butterfly sipped nectar and pollen reached the next flower's receptive surface."):__alloT('stem.butterfly.poll_msg_recorded_missed','Recorded model visit at {value1}: the butterfly sipped nectar, but pollen missed the receptive surface and stayed on the butterfly.'),{value1:p.name})};
  }

  // A close-up follows two distinct flowers of one species in the landed patch.
  // No pollen travels between species, and watching never writes field evidence.
  function feedingVisual(s){
    var p=patch(s.landed,s);if(!p||!p.nectar)return null;
    var mixed=p.id==='restoration'&&s.restoration.design==='mixed',milkweed=p.host&&!mixed;
    var count=mixed?17:34,pi=milkweed?0:1,offset=mixed?6:0,stems=[];
    for(var i=0;i<count;i++){var stem=stemPose(p,pi,i,count,offset);stems.push({x:stem.x,y:stem.height,z:stem.z,index:i});}
    // Use the near edge of the bed, clear of intervening stems in the close-up.
    stems.sort(function(a,b){return b.x*.6-b.z-a.x*.6+a.z;});
    var source=stems[0],near=stems.slice(1,8).sort(function(a,b){return Math.hypot(a.x-source.x,a.z-source.z)-Math.hypot(b.x-source.x,b.z-source.z);});
    return {patch:p.id,plan:p.id==='restoration'?s.restoration.design:null,name:p.name,species:milkweed?'milkweed':'bergamot',source:source,destination:near[0]};
  }
  function feedingPhase(phase,contact){
    if(phase==='carry')return {id:'carry',title:__alloT('stem.butterfly.feed_phase_carry_title','Carry pollen to another flower'),note:__alloT('stem.butterfly.feed_phase_carry_note','Pollen rides on the outside of the butterfly as it visits another flower of the same plant species. Nectar stays inside the butterfly as food.')};
    if(phase==='deposit')return contact===false?{id:'deposit',title:__alloT('stem.butterfly.feed_phase_miss_title','A visit without pollen transfer'),note:__alloT('stem.butterfly.feed_phase_miss_note','The butterfly can reach nectar, but its pollen misses the receptive surface. In this comparison, the pollen stays on the butterfly. Feeding and pollination are different events.')}:{id:'deposit',title:__alloT('stem.butterfly.feed_phase_deposit_title','Pollen reaches the next flower'),note:__alloT('stem.butterfly.feed_phase_deposit_note','Contact leaves some pollen on a receptive flower surface. This transfer is pollination. Fertilization and seed development can follow later; a visit alone does not guarantee seeds.')};
    return {id:'sip',title:__alloT('stem.butterfly.feed_phase_sip_title','Uncoil, reach, and sip'),note:__alloT('stem.butterfly.feed_phase_sip_note','The proboscis is a long, flexible drinking tube. It uncoils to reach sugary nectar inside the flower. Pollen attaches outside the body during contact; it is not the nectar being swallowed.')};
  }
  // These moments describe one illustrated visit, not real pollen quantities.
  // Reduced motion suppresses playback; manual inspection still honors progress.
  function feedingMoment(phase,progress,reduced){
    var id=feedingPhase(phase).id,t=clamp(Number.isFinite(progress)?progress:1,0,1);
    function ease(value){value=clamp(value,0,1);return value*value*(3-2*value);}
    return {phase:id,progress:t,travel:id==='carry'?ease(t):id==='deposit'?1:0,pickup:id==='sip'?ease((t-.28)/.4):1,deposit:id==='deposit'?ease((t-.35)/.4):0};
  }
  function feedingOutcome(v,phase,progress,contact){
    var moment=feedingMoment(phase,progress),carrying=moment.pickup>0,received=contact!==false&&moment.deposit===1,transferring=contact!==false&&moment.deposit>0&&moment.deposit<1;
    var summary=moment.phase==='sip'?(carrying?__alloT('stem.butterfly.feed_out_sip_attached','Pollen has attached to the butterfly during its nectar visit.'):__alloT('stem.butterfly.feed_out_sip_reaching','The drinking tube is reaching into the flower; pollen has not attached yet.')):
      moment.phase==='carry'?__alloT('stem.butterfly.feed_out_carry','Pollen is traveling on the butterfly. The next flower has received none yet.'):
      received?(v&&v.species==='milkweed'?__alloT('stem.butterfly.feed_out_received_milkweed','One pollinium has entered the receptive slit. The other remains on the butterfly.'):__alloT('stem.butterfly.feed_out_received_bergamot','Some grains have reached the receptive stigma. Other grains remain on the butterfly.')):
      transferring?__alloT('stem.butterfly.feed_out_transferring','Watch the pollen move from the leg toward the receptive surface. It is still in transfer.'):
      contact===false?__alloT('stem.butterfly.feed_out_no_contact','No pollen reaches the receptive surface in this visit. The butterfly keeps its pollen while sipping nectar.'):__alloT('stem.butterfly.feed_out_arrived','The butterfly has arrived. Watch for contact with the receptive surface.');
    return {carrying:carrying,received:received,transferring:transferring,carriedLabel:carrying?(received||transferring?__alloT('stem.butterfly.feed_out_some_remains_carried','Some remains carried'):__alloT('stem.butterfly.feed_out_pollen_carried','Pollen carried')):__alloT('stem.butterfly.feed_out_not_picked_up','Not picked up yet'),receivedLabel:received?__alloT('stem.butterfly.feed_out_pollen_received','Pollen received'):transferring?__alloT('stem.butterfly.feed_out_in_transfer','In transfer'):__alloT('stem.butterfly.feed_out_none_received','None received'),summary:summary};
  }
  function feedingCamera(v,phase,aspect,focus,progress,reduced,contact){
    if(focus==='tube'||focus==='pollen'){
      var moment=feedingMoment(phase,progress,reduced),a=v.source,b=v.destination,f=moment.travel;
      var arc=moment.phase==='carry'?Math.sin(Math.PI*f)*Math.min(4,.8+Math.hypot(b.x-a.x,b.z-a.z)*.06):0;
      var x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,z=a.z+(b.z-a.z)*f;
      if(focus==='pollen'&&moment.phase==='deposit'){x=b.x+.1428+(contact===false?.24:0);y=b.y+(v.species==='milkweed'?.768:.868);z=b.z+.37;}
      else{x+=focus==='pollen'?.1428:0;y+=arc+(focus==='pollen'?.82:.70);z+=focus==='pollen'?.37:-.03;}
      var ratio=Number.isFinite(aspect)&&aspect>0?aspect:1,dist=Math.max(1.3,.95/Math.min(1,ratio));
      return {position:[x+dist*.8,y+dist*.25,z-dist*.75],target:[x,y,z],fov:38};
    }
    var a=v.source,b=v.destination,travel=phase==='carry',p=phase==='deposit'?b:a;
    var x=travel?(a.x+b.x)/2:p.x,y=travel?Math.max(a.y,b.y)+.7:p.y+.5,z=travel?(a.z+b.z)/2:p.z;
    var ratio=Number.isFinite(aspect)&&aspect>0?aspect:1,span=travel?Math.hypot(b.x-a.x,b.z-a.z)+2.5:2.7;
    var distance=Math.max(travel?7:4.1,span/Math.min(ratio,1.5)*1.35);
    return {position:[x+distance*.48,y+distance*.30,z-distance*.85],target:[x,y,z],fov:44};
  }
  // The same three steps remain visible without WebGL. Colors and particles
  // are teaching cues: real nectar is not turquoise and pollen is microscopic.
  function paintFeedingDiagram(g,width,height,v,phase,progress,reduced,contact,focus){
    var moment=feedingMoment(phase,progress,reduced),t=moment.progress,ease=t*t*(3-2*t),milk=v.species==='milkweed',transferred=contact!==false&&moment.deposit>0;
    var bg=g.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#dce9da');bg.addColorStop(1,'#f6efdb');g.fillStyle=bg;g.fillRect(0,0,width,height);
    var u=Math.min(width/6.8,height/5.3),cx=width/2,cy=height*.57;
    var flight=phase==='carry',x=phase==='deposit'?1.75:flight?-1.75+3.5*ease:-1.75,y=flight?-1.1-Math.sin(ease*Math.PI)*.9:-1.1;
    if(focus==='tube'||focus==='pollen'){u*=2.3;var fx=focus==='pollen'&&phase==='deposit'?1.91+(contact===false?.24:0):x+(focus==='pollen'?.25:.1),fy=focus==='pollen'&&phase==='deposit'?-.4:y+.55;cx=width*.5-fx*u;cy=height*.48-fy*u;}
    g.save();g.translate(cx,cy);g.scale(u,u);g.lineCap='round';
    function flower(x,label,recipient){
      g.strokeStyle='#58754a';g.lineWidth=.075;g.beginPath();g.moveTo(x,2.8);g.quadraticCurveTo(x-.2,1,x,0);g.stroke();
      g.fillStyle='#6b8c51';g.beginPath();g.ellipse(x-.25,1,.42,.13,-.3,0,Math.PI*2);g.fill();
      for(var i=0;i<11;i++){var a=i*2.39996,r=Math.sqrt(i/11)*.48,px=x+Math.cos(a)*r,py=Math.sin(a)*r*.43;g.fillStyle=milk?'#d493af':'#b18acb';g.strokeStyle=milk?'#985371':'#795b99';g.lineWidth=.02;g.beginPath();g.ellipse(px,py,.13,milk?.13:.29,milk?a:.18,0,Math.PI*2);g.fill();g.stroke();}
      g.fillStyle='#146d77';g.beginPath();g.ellipse(x,-.06,.12,.05,0,0,Math.PI*2);g.fill();
      var rx=x+.16+(recipient&&phase==='deposit'&&contact===false?.24:0);
      if(milk){g.fillStyle='#e3acc4';[-1,1].forEach(function(side){g.beginPath();g.ellipse(rx+side*.07,-.38,.055,.09,0,0,Math.PI*2);g.fill();});g.strokeStyle='#584032';g.lineWidth=.035;g.beginPath();g.moveTo(rx,-.46);g.lineTo(rx,-.3);g.stroke();}
      else{g.strokeStyle='#386f4e';g.lineWidth=.045;g.beginPath();g.moveTo(x+.16,-.08);g.lineTo(rx,-.45);g.stroke();g.fillStyle='#f2bb38';for(var n=0;n<5;n++){g.beginPath();g.arc(x-.28+n*.035,-.27,.04,0,Math.PI*2);g.fill();}}
      g.fillStyle='#304734';g.font='600 .21px system-ui';g.textAlign='center';g.fillText(label,x,.65);
    }
    flower(-1.75,__alloT('stem.butterfly.diag_flower_1','Flower 1'),false);flower(1.75,__alloT('stem.butterfly.diag_flower_2','Flower 2'),true);
    g.save();g.translate(x,y);g.strokeStyle='#28352a';g.fillStyle='#e8a24b';g.lineWidth=.045;
    [-1,1].forEach(function(side){g.beginPath();g.moveTo(0,.02);g.bezierCurveTo(side*.4,-.85,side*1.02,-.62,side*.7,.02);g.bezierCurveTo(side*.85,.43,side*.22,.55,0,.12);g.fill();g.stroke();g.lineWidth=.018;for(var n=0;n<3;n++){g.beginPath();g.moveTo(0,.03);g.lineTo(side*(.28+n*.17),-.44+n*.21);g.stroke();}g.lineWidth=.045;});
    g.lineWidth=.09;g.beginPath();g.moveTo(0,-.16);g.lineTo(0,.42);g.stroke();
    g.lineWidth=.025;[-1,1].forEach(function(side){g.beginPath();g.moveTo(0,-.16);g.lineTo(side*.16,-.4);g.moveTo(0,.1);g.lineTo(side*.27,.45);g.stroke();});
    var extension=flight?0:Math.min(1,t*2.2);g.strokeStyle='#705033';g.lineWidth=.035;g.beginPath();g.moveTo(.02,-.11);if(extension>0)g.quadraticCurveTo(.38,.22,.02,extension*1.04);else g.arc(.1,.05,.1,-Math.PI/2,Math.PI*1.5);g.stroke();
    if(!flight&&extension>.9){g.fillStyle='#137480';for(var n=0;n<3;n++){var ny=.8-((t*2+n/3)%1)*.8;g.beginPath();g.arc(.06,ny+.12,.035,0,Math.PI*2);g.fill();}}
    var loaded=moment.pickup>0;if(loaded){g.fillStyle='#e6aa24';g.strokeStyle='#735413';g.lineWidth=.016;for(var n=0;n<(milk?(transferred?1:2):transferred?6:9);n++){g.beginPath();if(milk)g.ellipse(.25+n*.08,.47,.045,.085,-.2,0,Math.PI*2);else g.arc(.22+(n%3)*.05,.43+Math.floor(n/3)*.06,.035,0,Math.PI*2);g.fill();g.stroke();}}
    g.restore();
    if(transferred){g.fillStyle='#e4a921';g.strokeStyle='#735413';g.lineWidth=.015;for(var n=0;n<(milk?1:3);n++){var f=moment.deposit,px=2.08*(1-f)+1.91*f,py=-.63*(1-f)-.43*f;g.beginPath();g.ellipse(px+(n%2)*.045,py+Math.floor(n/2)*.04,milk?.045:.03,milk?.09:.03,0,0,Math.PI*2);g.fill();g.stroke();}}
    g.restore();
  }

  // Each view owns every mesh and resource. Only geometry recipes are shared with Bee Lab.
/*
 * Butterfly Lab monarch, native THREE r128 geometry only.
 * Nose points down -Z; open wings spread across X, with Y as dorsal/up.
 * Call createMonarch(T, kit), add .root to a scene, and apply the desired scale.
 * Animate .wings[0/1].rotation.z with opposite signs. Each hindWing pivot is
 * nested inside its main wing, allowing a subtle additional trailing motion.
 *
 * Visual references: US Fish & Wildlife Service, Butterfly migration identification
 * https://www.fws.gov/story/2017-09/butterfly-migration-identification
 * Monarch Joint Venture, Life Cycle
 * https://monarchjointventure.org/monarch-biology/life-cycle
 * Illustrative female-pattern monarch: no male hindwing scent patch is invented.
 */
  // Illustrative, enlarged monarch stages. Units match a meadow leaf about 1.9 long.
  // Egg: base at y=0. Caterpillar: centered on X, head toward +X, feet at y=0.
  // Chrysalis: silk attachment at y=0; the pupa hangs down the negative Y axis.
  // References: monarchjointventure.org/monarch-biology/life-cycle and Canada's
  // COSEWIC Monarch 2016 assessment (green pupa, black/gold band, scattered gold spots).
  function createLifecycleModels(T){
    var sphere=new T.SphereGeometry(1,10,7),dot=new T.IcosahedronGeometry(1,0),colorCache={};
    function color(hex){return colorCache[hex]||(colorCache[hex]=new T.Color(hex).convertSRGBToLinear());}
    function material(roughness,metalness){return new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:roughness,metalness:metalness||0});}
    function builder(){
      var positions=[],normals=[],colors=[];
      function append(geometry,tone,position,scale,rotation){
        var matrix=new T.Matrix4().compose(new T.Vector3().fromArray(position||[0,0,0]),new T.Quaternion().setFromEuler(new T.Euler().fromArray(rotation||[0,0,0])),new T.Vector3().fromArray(scale||[1,1,1]));
        var normalMatrix=new T.Matrix3().getNormalMatrix(matrix),p=geometry.attributes.position,n=geometry.attributes.normal,c=geometry.attributes.color,index=geometry.index;
        var count=index?index.count:p.count,v=new T.Vector3(),normal=new T.Vector3(),shade=color(tone);
        for(var i=0;i<count;i++){
          var at=index?index.getX(i):i;v.fromBufferAttribute(p,at).applyMatrix4(matrix);normal.fromBufferAttribute(n,at).applyMatrix3(normalMatrix).normalize();
          positions.push(v.x,v.y,v.z);normals.push(normal.x,normal.y,normal.z);
          if(c)colors.push(c.getX(at),c.getY(at),c.getZ(at));else colors.push(shade.r,shade.g,shade.b);
        }
      }
      return {append:append,ball:function(tone,position,scale){append(sphere,tone,position,scale);},
        tube:function(points,radius,tone,segments,sides){var curve=new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3().fromArray(p);})),g=new T.TubeGeometry(curve,segments||7,radius,sides||5,false);append(g,tone);g.dispose();},
        finish:function(name,mat){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingBox();g.computeBoundingSphere();g.name=name;var mesh=new T.Mesh(g,mat);mesh.name=name;return mesh;}
      };
    }
    function group(stage,anatomy){var root=new T.Group();root.name='lifecycle-'+stage;root.userData.species='Danaus plexippus';root.userData.stage=stage;root.userData.scale='illustratively enlarged; not actual size';root.userData.anatomy=anatomy;return root;}
    function paint(geometry,fn){var values=[],p=geometry.attributes.position;for(var i=0;i<p.count;i++){var c=color(fn(p.getX(i),p.getY(i),p.getZ(i)));values.push(c.r,c.g,c.b);}geometry.setAttribute('color',new T.Float32BufferAttribute(values,3));return geometry;}

    var egg=group('egg',{longitudinalRidges:true,baseAttached:true}),eggBuilder=builder();
    var eggProfile=[[.073,0],[.087,.02],[.096,.055],[.098,.10],[.09,.15],[.074,.20],[.05,.239],[.021,.265],[0,.276]].map(function(p){return new T.Vector2(p[0],p[1]);});
    var shell=new T.LatheGeometry(eggProfile,64),ep=shell.attributes.position;
    for(var i=0;i<ep.count;i++){var x=ep.getX(i),z=ep.getZ(i),y=ep.getY(i),ridge=1+.055*Math.cos(Math.atan2(z,x)*32)*Math.sin(Math.PI*y/.29);ep.setXYZ(i,x*ridge,y,z*ridge);}
    shell.computeVertexNormals();paint(shell,function(x,y,z){return Math.cos(Math.atan2(z,x)*32)>.2?0xf5e9c8:0xdccfa8;});eggBuilder.append(shell,0xf2e6c6);shell.dispose();
    eggBuilder.ball(0xd4c9a8,[0,.272,0],[.009,.003,.009]);
    egg.add(eggBuilder.finish('monarch-egg-shell',material(.62)));

    var caterpillar=group('caterpillar',{trueLegPairs:3,prolegPairs:5,sensoryFilamentPairs:2,filamentsAreAntennae:false,illustratedInstar:'later striped larva'}),larva=builder(),larvalMaterial=material(.79);
    // A continuous softly segmented skin avoids a chain-of-beads silhouette.
    var bodyPositions=[],bodyNormals=[],bodyColors=[],segments=12,radial=12,bandEdges=[0,.23,.34,.58,.72,1],bandTones=[0x242b29,0xf1ebd3,0x242b29,0xe7c54f,0xf1ebd3];
    function bodyPoint(segment,fraction,angle){
      var t=(segment+fraction)/segments,x=-.65+t*1.27,taper=.66+.34*Math.pow(Math.sin(Math.PI*t),.35),radius=.095*taper*(.94+.06*Math.sin(fraction*Math.PI));
      return {p:[x,.125+.016*Math.sin(t*Math.PI)+Math.cos(angle)*radius,.025*Math.sin(t*Math.PI*1.5)+Math.sin(angle)*radius],n:[0,Math.cos(angle),Math.sin(angle)]};
    }
    function bodyTriangle(a,b,c,tone){var shade=color(tone);[a,b,c].forEach(function(v){bodyPositions.push.apply(bodyPositions,v.p);bodyNormals.push.apply(bodyNormals,v.n);bodyColors.push(shade.r,shade.g,shade.b);});}
    for(var segment=0;segment<segments;segment++)for(var band=0;band<bandEdges.length-1;band++)for(var side=0;side<radial;side++){
      var a=bodyPoint(segment,bandEdges[band],side*Math.PI*2/radial),b=bodyPoint(segment,bandEdges[band+1],side*Math.PI*2/radial),c=bodyPoint(segment,bandEdges[band],(side+1)*Math.PI*2/radial),d=bodyPoint(segment,bandEdges[band+1],(side+1)*Math.PI*2/radial);
      bodyTriangle(a,c,b,bandTones[band]);bodyTriangle(b,c,d,bandTones[band]);
    }
    var skin=new T.BufferGeometry();skin.setAttribute('position',new T.Float32BufferAttribute(bodyPositions,3));skin.setAttribute('normal',new T.Float32BufferAttribute(bodyNormals,3));skin.setAttribute('color',new T.Float32BufferAttribute(bodyColors,3));larva.append(skin,0xffffff);skin.dispose();
    larva.ball(0x282e2b,[-.64,.125,0],[.055,.065,.065]);
    larva.ball(0x242b29,[.665,.113,-.023],[.087,.092,.081]);
    // Paired pale markings follow the head capsule; no exaggerated cartoon eyes.
    [-1,1].forEach(function(side){
      larva.tube([[.653,.195,-.023+side*.018],[.707,.169,-.023+side*.049],[.738,.116,-.023+side*.043],[.722,.064,-.023+side*.021]],.007,0xf2e8ca,7,4);
      var jaw=new T.Group(),mouthpart=builder();jaw.name='caterpillar-jaw-'+(side<0?'left':'right');jaw.position.set(.727,.071,-.023+side*.027);jaw.userData.side=side;jaw.userData.tip=[.044,-.006,side*.021];
      mouthpart.tube([[0,0,0],[.035,-.017,side*.016],[.044,-.006,side*.021]],.0045,0x394134,3,4);jaw.add(mouthpart.finish('caterpillar-mouthpart-'+(side<0?'left':'right'),larvalMaterial));caterpillar.add(jaw);
      // Thoracic true legs: three jointed pairs near the head.
      [.50,.39,.28].forEach(function(x){larva.tube([[x,.104,side*.054],[x+.014,.046,side*.095],[x+.036,.009,side*.073]],.012,0x2b322b,3,5);});
      // Four abdominal pairs and the terminal anal pair of soft prolegs.
      [.12,-.035,-.19,-.34,-.58].forEach(function(x){larva.ball(0xe5dfc6,[x,.045,side*.067],[.035,.045,.031]);larva.ball(0x343b2f,[x+.005,.009,side*.075],[.023,.009,.022]);});
      larva.tube([[.48,.205,side*.044],[.50,.305,side*.065],[.56,.412,side*.089],[.61,.431,side*.105]],.011,0x252c27,9,5);
      larva.tube([[-.55,.182,side*.038],[-.59,.255,side*.056],[-.65,.310,side*.076],[-.69,.305,side*.091]],.008,0x252c27,7,5);
      for(var spot=0;spot<7;spot++){var x=-.49+spot*.14;larva.append(dot,0x333a30,[x,.13,side*.088+.015],[.006,.009,.003]);}
    });
    caterpillar.add(larva.finish('monarch-caterpillar-body',larvalMaterial));

    var chrysalis=group('chrysalis',{silkPad:true,cremaster:true,goldBand:true,goldSpots:true}),pupa=builder(),gold=builder();
    var pupaProfile=[[0,-.726],[.055,-.714],[.105,-.673],[.142,-.61],[.168,-.52],[.176,-.43],[.169,-.35],[.161,-.294],[.15,-.267],[.132,-.235],[.109,-.201],[.076,-.16],[.045,-.119],[.022,-.083]].map(function(p){return new T.Vector2(p[0],p[1]);});
    // Sample the same silhouette densely enough for folded wing markings.
    // The indexed skin has its own color buffer; silk, attachment, and gold do
    // not share that buffer and cannot darken during the close-up.
    var denseProfile=[];for(var i=0;i<pupaProfile.length-1;i++)for(var j=0;j<6;j++)denseProfile.push(pupaProfile[i].clone().lerp(pupaProfile[i+1],j/6));denseProfile.push(pupaProfile[pupaProfile.length-1].clone());
    var caseGeometry=new T.LatheGeometry(denseProfile,128),pp=caseGeometry.attributes.position;
    for(var i=0;i<pp.count;i++){var x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i),fold=1+.025*Math.cos(Math.atan2(z,x)*4)*Math.sin((y+.73)*Math.PI/.65);pp.setXYZ(i,x*fold,y,z*.82*fold);}
    caseGeometry.computeVertexNormals();paint(caseGeometry,function(x,y,z){return z>0?(y<-.33?0x81bd87:0x7bbb80):(y<-.33?0x70a976:0x74af7a);});
    var surface=new T.Mesh(caseGeometry,material(.4));surface.name='monarch-chrysalis-surface';caseGeometry.name='monarch-chrysalis-surface';surface.userData.maturation=null;chrysalis.add(surface);
    // Fine wing-case seams and abdominal rings remain quieter than the gold markings.
    [-1,1].forEach(function(side){pupa.tube([[side*.126,-.313,.086],[side*.146,-.425,.086],[side*.114,-.564,.095],[side*.04,-.693,.052]],.0032,0x659b6c,9,4);});
    for(var ring=0;ring<3;ring++){
      var ry=-.154-ring*.036,rr=[.072,.100,.125][ring],arc=[];
      for(var step=0;step<=20;step++){var angle=step*Math.PI*2/20;arc.push([Math.cos(angle)*rr,ry,Math.sin(angle)*rr*.82]);}
      pupa.tube(arc,.0023,0x679e6b,20,3);
    }
    var rim=new T.TorusGeometry(.161,.005,4,32);pupa.append(rim,0x343c2e,[0,-.289,0],[1,.82,1],[Math.PI/2,0,0]);rim.dispose();
    for(var bead=0;bead<24;bead++){var angle=bead*Math.PI*2/24;gold.append(dot,bead%3?0xe2bd5c:0xf4dc8d,[Math.cos(angle)*.162,-.281,Math.sin(angle)*.162*.82],[.009,.0065,.008]);}
    [[-.112,-.445,.111],[.112,-.445,.111],[-.101,-.523,.109],[.101,-.523,.109],[-.069,-.619,.094],[.069,-.619,.094],[-.128,-.433,-.101],[.128,-.433,-.101]].forEach(function(p){gold.append(dot,0xe9cd74,p,[.009,.012,.006]);});
    pupa.ball(0xd9dcc1,[0,-.004,0],[.052,.009,.041]);
    pupa.tube([[0,-.01,0],[.019,-.028,0],[.017,-.055,0],[0,-.088,0]],.011,0x3e3b2d,6,5);
    chrysalis.add(pupa.finish('monarch-chrysalis-shell',material(.4)));
    chrysalis.add(gold.finish('monarch-chrysalis-gold',material(.32,.35)));
    sphere.dispose();dot.dispose();
    [egg,caterpillar,chrysalis].forEach(function(root){var box=new T.Box3().setFromObject(root);root.userData.visualBounds={min:box.min.toArray(),max:box.max.toArray()};});
    return {egg:egg,caterpillar:caterpillar,chrysalis:chrysalis};
  }

  // Enlarged observation model. Flower positions come from the living meadow;
  // nectar and pollen are separate materials and follow separate routes.
  function createFeedingModel(T,kit){
    var root=new T.Group();root.name='feeding-observation';root.visible=false;
    var monarch=createMonarch(T,kit,true),insect=monarch.root;
    insect.name='feeding-monarch';insect.scale.setScalar(.14);root.add(insect);
    var gold=new T.MeshStandardMaterial({color:0xe6a522,roughness:.68});
    var stalkMaterial=new T.MeshStandardMaterial({color:0x8e6230,roughness:.85});
    var receptiveMaterial=new T.MeshStandardMaterial({color:0xb8e578,roughness:.85});
    var grooveMaterial=new T.MeshStandardMaterial({color:0x493c33,roughness:1});
    var hoodMaterial=new T.MeshStandardMaterial({color:0xe7a1c1,roughness:.88});
    var nectarMaterial=new T.MeshStandardMaterial({color:0x168c9d,roughness:.24,emissive:0x083b45,emissiveIntensity:.05});
    var tubeMaterial=new T.MeshStandardMaterial({color:0x60452c,roughness:.72});
    [gold,stalkMaterial,receptiveMaterial,grooveMaterial,hoodMaterial,nectarMaterial,tubeMaterial].forEach(function(material){material.color.convertSRGBToLinear();material.emissive.convertSRGBToLinear();});
    var sphere=new T.SphereGeometry(1,10,8),cylinder=new T.CylinderGeometry(1,1,1,7);
    function blob(parent,material,x,y,z,sx,sy,sz,name){
      var mesh=new T.Mesh(sphere,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);if(name)mesh.name=name;parent.add(mesh);return mesh;
    }
    function stalk(parent,material,a,b,r){
      var mesh=new T.Mesh(cylinder,material),from=new T.Vector3(a[0],a[1],a[2]),to=new T.Vector3(b[0],b[1],b[2]);
      mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.scale.set(r,from.distanceTo(to),r);
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());parent.add(mesh);return mesh;
    }
    // Each milkweed packet has two pollen masses, linked by stalks to a central
    // clasp. Bergamot instead carries individual grains on a contacting leg.
    function pollen(parent,name,single){
      var all=new T.Group(),packet=new T.Group(),grains=new T.Group(),branches=[],grainMeshes=[];all.name=name;packet.name=name+'-pollinia';grains.name=name+'-grains';all.add(packet);all.add(grains);parent.add(all);
      if(single){blob(packet,gold,0,0,0,.19,.29,.13);packet.userData.polliniaCount=1;}
      else{blob(packet,stalkMaterial,0,0,0,.07,.065,.055);packet.userData.polliniaCount=2;
        [-1,1].forEach(function(side){var branch=new T.Group();packet.add(branch);branches.push(branch);stalk(branch,stalkMaterial,[0,0,0],[side*.23,-.16,0],.025);blob(branch,gold,side*.26,-.34,0,.19,.29,.13);});}
      for(var i=single?6:0;i<9;i++){var a=i*2.399963,grain=blob(grains,gold,Math.cos(a)*(.14+i%3*.065),-.05-Math.floor(i/3)*.14,Math.sin(a)*.12,.095,.10,.095);grain.userData.grainIndex=i;grainMeshes.push(grain);}
      return {root:all,packet:packet,grains:grains,branches:branches,grainMeshes:grainMeshes};
    }
    var carried=pollen(insect,'feeding-pollen-carried');carried.root.position.set(1.02,-.88,.51);
    var deposited=pollen(root,'feeding-pollen-deposited',true);deposited.root.scale.setScalar(.14);
    // A modest, enlarged flower detail marks the contact structures. The dark
    // slit between milkweed hoods represents the receptive stigmatic chamber;
    // bergamot has separate exposed anthers and a green receptive stigma.
    function flowerCue(name){
      var group=new T.Group(),milkweed=new T.Group(),bergamot=new T.Group();group.name=name;milkweed.name=name+'-milkweed-groove';bergamot.name=name+'-bergamot-stigma';group.add(milkweed);group.add(bergamot);root.add(group);
      // The enlarged floral parts grow from the visible cluster on a curved
      // pedicel. This keeps the contact structures attached to a whole floret.
      var pedicelPath=new T.CatmullRomCurve3([new T.Vector3(-.1428,-.7,-.4764),new T.Vector3(-.12,-.46,-.31),new T.Vector3(-.035,-.21,-.12),new T.Vector3(0,-.045,-.06)]);
      var pedicel=new T.Mesh(new T.TubeGeometry(pedicelPath,12,.012,6,false),receptiveMaterial);pedicel.name=name+'-pedicel';group.add(pedicel);
      blob(group,receptiveMaterial,0,-.045,-.06,.042,.027,.043,name+'-calyx');
      for(var petal=0;petal<5;petal++){
        var angle=petal*Math.PI*2/5,corolla=blob(milkweed,hoodMaterial,Math.sin(angle)*.054,-.028,-.08+Math.cos(angle)*.054,.032,.018,.066);
        corolla.rotation.y=angle;corolla.rotation.x=Math.cos(angle)*.25;corolla.name=name+'-milkweed-petal-'+petal;
      }
      var corollaTube=blob(bergamot,hoodMaterial,0,-.035,-.032,.032,.072,.038,name+'-bergamot-corolla');corollaTube.rotation.x=-.48;
      blob(bergamot,hoodMaterial,-.026,.015,-.015,.041,.016,.052,name+'-bergamot-lower-lip');
      blob(bergamot,hoodMaterial,.025,.024,-.048,.033,.025,.043,name+'-bergamot-upper-lip');
      [-1,1].forEach(function(side){blob(milkweed,hoodMaterial,side*.058,.06,-.10,.046,.065,.052);blob(milkweed,gold,side*.04,.055,-.09,.015,.027,.016);});
      blob(milkweed,grooveMaterial,0,.068,-.105,.012,.039,.013);
      stalk(bergamot,receptiveMaterial,[0,.015,-.12],[0,.16,-.12],.009);blob(bergamot,receptiveMaterial,0,.168,-.12,.026,.016,.018);
      [-1,1].forEach(function(side){stalk(bergamot,hoodMaterial,[side*.065,0,.01],[side*.085,.12,.01],.007);blob(bergamot,gold,side*.085,.13,.01,.027,.018,.015);});
      return {root:group,milkweed:milkweed,bergamot:bergamot};
    }
    var sourceCue=flowerCue('feeding-source-flower'),destinationCue=flowerCue('feeding-destination-flower');
    // The tube is allocated once. Updating its vertices makes the proboscis
    // actually uncoil without creating and discarding geometry every frame.
    var rings=33,sides=7,positions=new Float32Array(rings*sides*3),normals=new Float32Array(rings*sides*3),indices=[];
    for(var ring=0;ring<rings-1;ring++)for(var side=0;side<sides;side++){var a=ring*sides+side,b=ring*sides+(side+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
    var tubeGeometry=new T.BufferGeometry();tubeGeometry.setAttribute('position',new T.BufferAttribute(positions,3));tubeGeometry.setAttribute('normal',new T.BufferAttribute(normals,3));tubeGeometry.setIndex(indices);
    var proboscis=new T.Mesh(tubeGeometry,tubeMaterial);proboscis.name='feeding-proboscis';proboscis.frustumCulled=false;insect.add(proboscis);
    var nectar=new T.Group();nectar.name='feeding-nectar';insect.add(nectar);var beads=[];
    for(var b=0;b<4;b++)beads.push(blob(nectar,nectarMaterial,0,0,0,.09,.09,.09));
    var samples=new Float32Array(rings*3),tangent=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3(),axis=new T.Vector3(1,0,0);
    function path(u,extension,out){
      var coilY,coilZ;if(u<.18){coilY=-.17-u/.18*.17;coilZ=-1.68-u/.18*.10;}else{var t=(u-.18)/.82,angle=t*Math.PI*3.35,r=.16-t*.09;coilY=-.49+Math.cos(angle)*r;coilZ=-1.7-Math.sin(angle)*r;}
      var q=1-u,extendedY=q*q*q*-.17+3*q*q*u*-.6+3*q*u*u*-2.70+u*u*u*-3.286;
      var extendedZ=q*q*q*-1.68+3*q*q*u*-2.7+3*q*u*u*-3.1+u*u*u*-3.0;
      out.set(0,coilY+(extendedY-coilY)*extension,coilZ+(extendedZ-coilZ)*extension);return out;
    }
    var temp=new T.Vector3();
    function updateTube(extension,progress,sipping){
      for(var j=0;j<rings;j++){path(j/(rings-1),extension,temp);samples[j*3]=temp.x;samples[j*3+1]=temp.y;samples[j*3+2]=temp.z;}
      for(var j=0;j<rings;j++){
        var before=Math.max(0,j-1)*3,after=Math.min(rings-1,j+1)*3;
        tangent.set(samples[after]-samples[before],samples[after+1]-samples[before+1],samples[after+2]-samples[before+2]).normalize();
        normal.copy(axis);binormal.crossVectors(tangent,normal).normalize();
        for(var k=0;k<sides;k++){var angle=k/sides*Math.PI*2,ca=Math.cos(angle),sa=Math.sin(angle),offset=(j*sides+k)*3;
          var nx=normal.x*ca+binormal.x*sa,ny=normal.y*ca+binormal.y*sa,nz=normal.z*ca+binormal.z*sa;
          positions[offset]=samples[j*3]+nx*.036;positions[offset+1]=samples[j*3+1]+ny*.036;positions[offset+2]=samples[j*3+2]+nz*.036;normals[offset]=nx;normals[offset+1]=ny;normals[offset+2]=nz;
        }
      }
      tubeGeometry.attributes.position.needsUpdate=true;tubeGeometry.attributes.normal.needsUpdate=true;
      nectar.visible=sipping&&extension>.65;
      for(var j=0;j<beads.length;j++){var u=1-((progress*2+j/beads.length)%.86+.07);path(u,extension,beads[j].position);beads[j].position.x=.017;}
    }
    function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
    function sync(v,phase,progress,reduced,contact){
      root.visible=!!v;if(!v)return;
      var t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:1)),e=ease(t),source=v.source,destination=v.destination||source,hasContact=contact!==false;
      root.position.set(source.x,source.y,source.z);root.userData.phase=phase;root.userData.species=v.species;root.userData.enlargedTeachingModel=true;root.userData.contact=hasContact;
      var dx=destination.x-source.x,dy=destination.y-source.y,dz=destination.z-source.z,travel=phase==='carry'?e:phase==='deposit'?1:0;
      var arc=phase==='carry'?Math.sin(Math.PI*e)*Math.min(4,.8+Math.hypot(dx,dz)*.06):0;
      insect.position.set(dx*travel,.94+dy*travel+arc,.30+dz*travel);insect.rotation.set(0,0,0);
      var flap=phase==='carry'&&t<1&&!reduced?.32+Math.abs(Math.sin(t*Math.PI*14))*.9:1.07;
      monarch.wings.forEach(function(wing,i){wing.rotation.z=(i===0?-1:1)*flap;});
      monarch.hindWings.forEach(function(wing,i){wing.rotation.y=(i===0?-1:1)*.035;});
      var extension=phase==='carry'?1-ease(t/.2):ease(t/.35);
      updateTube(extension,t,phase==='sip'||phase==='deposit');
      var pickup=phase==='sip'?ease((t-.28)/.4):1,deposit=phase==='deposit'&&hasContact?ease((t-.35)/.4):0;
      var milkweed=v.species==='milkweed';
      carried.root.visible=pickup>0;carried.root.scale.setScalar(pickup);
      // Transfer one existing mass: its carried counterpart disappears exactly
      // when the same-size mass starts moving into the receptive chamber.
      carried.branches.forEach(function(branch,i){branch.visible=!(milkweed&&deposit>0&&i===1);});
      carried.packet.userData.polliniaCount=milkweed&&deposit>0?1:2;
      carried.grainMeshes.forEach(function(grain){grain.visible=milkweed||deposit===0||grain.userData.grainIndex<6;});
      deposited.root.visible=deposit>0;deposited.root.scale.setScalar(.14);deposited.root.rotation.set(0,0,0);
      if(milkweed){deposited.root.position.set(dx+.1792-.0364*deposit,dy+.7692-.0012*deposit,dz+.3714);}
      else{
        deposited.root.position.set(dx+.1428,dy+.8168+.0512*deposit,dz+.3714-.015*deposit);
        deposited.grainMeshes.forEach(function(grain){var i=grain.userData.grainIndex,a=i*2.399963;grain.position.set(Math.cos(a)*((.14+i%3*.065)*(1-deposit)+.10*deposit),(-.05-Math.floor(i/3)*.14)*(1-deposit),Math.sin(a)*(.12-.04*deposit));});
      }
      carried.packet.visible=milkweed;deposited.packet.visible=milkweed;carried.grains.visible=!milkweed;deposited.grains.visible=!milkweed;
      var receiverOffset=phase==='deposit'&&!hasContact?.24:0;
      sourceCue.root.position.set(.1428,.7,.4764);destinationCue.root.position.set(dx+.1428+receiverOffset,dy+.7,dz+.4764);
      sourceCue.milkweed.visible=milkweed;destinationCue.milkweed.visible=milkweed;sourceCue.bergamot.visible=!milkweed;destinationCue.bergamot.visible=!milkweed;
      destinationCue.root.visible=Math.hypot(dx,dy,dz)>.01;
      root.userData.progress=t;root.userData.nectarDirection='flower-to-mouth';root.userData.pollenRoute=milkweed?'pollinia-on-leg-to-stigmatic-chamber':'grains-on-body-to-stigma';
      root.userData.sourceReceiver=[source.x+.1428,source.y+(milkweed?.768:.868),source.z+(milkweed?.3714:.3564)];
      root.userData.destinationReceiver=[destination.x+.1428+receiverOffset,destination.y+(milkweed?.768:.868),destination.z+(milkweed?.3714:.3564)];
      root.userData.receiverOffset=receiverOffset;
    }
    return {root:root,sync:sync};
  }

// Fine butterfly anatomy: corneal eyes, velvet thorax, articulated limb contours.
function refineButterflyAnatomySurface(material,pointName,wingName){
  var surface=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader){
    surface.call(this,shader);
    // Broad anatomical forms remain readable after the fine velvet grain fades.
    // Coordinates are the unanimated body coordinates, also used by wing LODs.
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',[
      'float bfAnatomyMask=1.-'+wingName+';',
      'vec3 bfAnatomyP='+pointName+';',
      'float bfTorsoWidth=1.-smoothstep(.32,.46,abs(bfAnatomyP.x));',
      'float bfTorsoHeight=1.-smoothstep(.29,.43,abs(bfAnatomyP.y+.025));',
      'float bfAbdomen=smoothstep(-.12,.16,bfAnatomyP.z)*(1.-smoothstep(2.58,2.84,bfAnatomyP.z))*bfTorsoWidth*bfTorsoHeight*bfAnatomyMask;',
      'float bfThorax=smoothstep(-1.28,-1.04,bfAnatomyP.z)*(1.-smoothstep(-.08,.16,bfAnatomyP.z))*bfTorsoWidth*bfTorsoHeight*bfAnatomyMask;',
      'float bfSegmentPhase=(bfAnatomyP.z-.10)/.33+.12*pow(bfAnatomyP.x/.4,2.);',
      'float bfSegmentAA=max(.018,fwidth(bfSegmentPhase));',
      'float bfSegmentSeam=1.-smoothstep(.025,.075+bfSegmentAA,abs(fract(bfSegmentPhase)-.5));',
      'float bfSegmentArch=.5+.5*cos(bfSegmentPhase*6.283185);',
      'float bfDorsalBody=smoothstep(-.30,.28,bfAnatomyP.y);',
      'diffuseColor.rgb*=mix(1.,mix(.88,1.045,bfDorsalBody),bfAnatomyMask);',
      'diffuseColor.rgb*=1.+bfAbdomen*((bfSegmentArch-.5)*.065-bfSegmentSeam*.18);',
      '#include <alphamap_fragment>'
    ].join('\n'));
    // Legs and antennae have a quiet cuticle sheen; the thorax remains velvet.
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',[
      'roughnessFactor=mix(roughnessFactor,mix(.69,.94,clamp(bfThorax+bfAbdomen*.80,0.,1.)),bfAnatomyMask);',
      '#include <metalnessmap_fragment>'
    ].join('\n'));
    shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_begin>',[
      'float bfJointRelief=bfAbdomen*(bfSegmentArch*.0018-bfSegmentSeam*.0023);',
      'vec3 bfJointDx=dFdx(-vViewPosition),bfJointDy=dFdy(-vViewPosition);',
      'vec3 bfJointBx=cross(bfJointDy,normal),bfJointBy=cross(normal,bfJointDx);',
      'float bfJointDet=dot(bfJointDx,bfJointBx);',
      'vec3 bfJointNormal=abs(bfJointDet)*normal-sign(bfJointDet)*(dFdx(bfJointRelief)*bfJointBx+dFdy(bfJointRelief)*bfJointBy);',
      'normal=normalize(mix(normal,normalize(bfJointNormal+normal*.000001),bfAbdomen*.32));',
      '#include <clearcoat_normal_fragment_begin>'
    ].join('\n'));
  };
  material.customProgramCacheKey=function(){return cacheKey+'-fine-anatomy-v1';};
}
function butterflyEyeMaterial(T,colour,low){
  var material=new T.MeshStandardMaterial({color:colour,roughness:.31,metalness:0});
  material.extensions={derivatives:true};
  material.onBeforeCompile=function(shader){
    shader.vertexShader='varying vec3 bfEyePoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfEyePoint=position;');
    shader.fragmentShader='varying vec3 bfEyePoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
      '#include <color_fragment>',
      'vec3 bfEyeDirection=normalize(bfEyePoint);',
      'float bfEyeRim=1.-smoothstep(.08,.62,abs(bfEyeDirection.x));',
      'vec2 bfFacetUV=vec2(atan(bfEyeDirection.y,bfEyeDirection.z)*13.,asin(clamp(bfEyeDirection.x,-1.,1.))*17.);',
      'float bfFacetFine=(1.-smoothstep(.30,1.1,max(fwidth(bfFacetUV.x),fwidth(bfFacetUV.y))))*'+(low?'.35':'1.')+';',
      'bfFacetUV.x+=mod(floor(bfFacetUV.y),2.)*.5;',
      'vec2 bfFacetCell=fract(bfFacetUV)-.5;',
      'float bfFacetRadius=max(abs(bfFacetCell.x)*.866025+abs(bfFacetCell.y)*.5,abs(bfFacetCell.y));',
      'float bfFacetBorder=smoothstep(.34,.48,bfFacetRadius);',
      'diffuseColor.rgb*=(1.-bfEyeRim*.26)*(1.-bfFacetBorder*.055*bfFacetFine);'
    ].join('\n'));
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=.29+bfEyeRim*.14+bfFacetBorder*.025*bfFacetFine;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',[
      '#include <normal_fragment_maps>',
      'float bfCorneaRelief=(.5-bfFacetRadius)*.0003*bfFacetFine;',
      'vec3 bfCorneaDx=dFdx(-vViewPosition),bfCorneaDy=dFdy(-vViewPosition);',
      'vec3 bfCorneaBx=cross(bfCorneaDy,normal),bfCorneaBy=cross(normal,bfCorneaDx);',
      'float bfCorneaDet=dot(bfCorneaDx,bfCorneaBx);',
      'vec3 bfCorneaNormal=abs(bfCorneaDet)*normal-sign(bfCorneaDet)*(dFdx(bfCorneaRelief)*bfCorneaBx+dFdy(bfCorneaRelief)*bfCorneaBy);',
      'normal=normalize(mix(normal,normalize(bfCorneaNormal+normal*.000001),bfFacetFine*.12));'
    ].join('\n'));
  };
  material.customProgramCacheKey=function(){return 'butterfly-corneal-eye-v1-'+(low?'low':'high');};
  return material;
}
function contourButterflyAbdomen(point,normal){
  // Existing abdomen components share one smooth taper and relaxed centreline.
  // The thoracic join is pinned; no head, leg or drinking-tube vertices move.
  if(point.z<=.20)return;
  var u=Math.max(0,Math.min(1,(point.z-.20)/2.65)),blend=u*u*(3-2*u),slope=6*u*(1-u)/2.65;
  var scale=1-.16*blend,scaleSlope=-.16*slope,x=point.x,y=point.y+.025;
  var nx=normal.x/scale,ny=normal.y/scale;
  normal.set(nx,ny,normal.z-scaleSlope*x*nx-(scaleSlope*y-.11*slope)*ny).normalize();
  point.set(x*scale,-.025+y*scale-.11*blend,point.z);
}
function butterflyClubGeometry(T,sphere){
  // Same sphere vertices and triangles, with a narrower base and rounded club.
  var geometry=sphere.clone(),p=geometry.attributes.position,n=geometry.attributes.normal;
  for(var i=0;i<p.count;i++){
    var x=p.getX(i),y=p.getY(i),z=p.getZ(i),factor=.97+.11*z;
    var nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i),normal=new T.Vector3(nx/factor,ny/factor,nz-.11*(x*nx+y*ny)/factor).normalize();
    p.setXYZ(i,x*factor,y*factor,z);n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  return geometry;
}
function taperButterflyLimb(geometry,path){
  // Keep both endpoint rings exact: feet and mouth-relative attachments stay put.
  // A broad upper joint eases into a finer shaft using existing tube vertices.
  var p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,length=path.getLength();
  for(var i=0;i<p.count;i++){
    var t=uv.getX(i);if(t<=0||t>=1)continue;
    var sine=Math.sin(Math.PI*t),radiusScale=1-.29*sine*sine*(.55+.45*t),center=path.getPointAt(t),tangent=path.getTangentAt(t);
    var x=p.getX(i)-center.x,y=p.getY(i)-center.y,z=p.getZ(i)-center.z,radius=Math.hypot(x,y,z);
    var slope=-.29*(2*Math.PI*sine*Math.cos(Math.PI*t)*(.55+.45*t)+.45*sine*sine)*radius/length;
    var nx=n.getX(i)-tangent.x*slope,ny=n.getY(i)-tangent.y*slope,nz=n.getZ(i)-tangent.z*slope,magnitude=Math.hypot(nx,ny,nz);
    p.setXYZ(i,center.x+x*radiusScale,center.y+y*radiusScale,center.z+z*radiusScale);n.setXYZ(i,nx/magnitude,ny/magnitude,nz/magnitude);
  }
  // The duplicated tube seam keeps identical normals; endpoints retain theirs.
}
// Butterfly wing depth: broad camber, quiet pigment gradients and raised veins.
function butterflyWingDepth(x,z,fore,strength){
  // Extra camber and both analytic derivatives vanish at the existing hinge.
  var span=Math.max(0,(x-.35)/6.65);
  if(span<=0)return [0,0,0];
  var envelope=span*span*(3-2*span),slope=6*span*(1-span)/6.65;
  var arch=Math.sin(Math.PI*span),archSlope=Math.cos(Math.PI*span)*Math.PI/6.65;
  var phase=fore?.35:1.45,chord=.10*Math.sin(z*.60+phase)+.035*Math.sin(z*1.23-phase);
  var chordSlope=.06*Math.cos(z*.60+phase)+.04305*Math.cos(z*1.23-phase);
  var lift=fore?.26:.20;
  var base=[strength*envelope*(lift*arch+chord),strength*(slope*(lift*arch+chord)+envelope*lift*archSlope),strength*envelope*chordSlope];
  // Pinned trailing-edge roll: protected roots and discal cells remain exact.
  var edgeStart=fore?-.1:2.5,edgeSpan=fore?1.2:1.7;
  if(x<=1.5||z<=edgeStart||strength===0)return base;
  var u=Math.max(0,Math.min(1,(x-1.5)/3.2)),v=Math.max(0,Math.min(1,(z-edgeStart)/edgeSpan));
  var spanRoll=u*u*(3-2*u),chordRoll=v*v*(3-2*v);
  var spanSlope=6*u*(1-u)/3.2,chordRollSlope=6*v*(1-v)/edgeSpan;
  var amount=-.18*strength;
  return [base[0]+amount*spanRoll*chordRoll,base[1]+amount*spanSlope*chordRoll,base[2]+amount*spanRoll*chordRollSlope];
}
function monarchWingHeight(x,z,fore){return (.34+.08*Math.sin((z+1)*.75))*Math.sin(x*Math.PI/7)+.045*Math.sin(z*.85)+(fore?.07:-.055)+butterflyWingDepth(x,z,fore,1)[0];}
function createMonarch(T, kit, feeding, lowDetail) {
  // Organic butterfly margins and pigment boundaries, without additional triangles.
  // Butterfly surface refinement: directional scales, velvet bodies, thin membranes.
  // lowDetail: the same parts, coarser tessellation, for monarchs seen only at a
  // distance. The flying player, close-ups and the emerged adult keep full detail.
  var low = !!lowDetail;
  var root = new T.Group(), wings = [], hindWings = [], colorCache = {};
  root.userData.species = 'Danaus plexippus';
  root.userData.model = 'illustrative monarch';
  // kit is accepted for the existing Butterfly Lab builder contract. No shared
  // StemMeadow or BeeLab geometry, material, or animation state is modified.
  function color(hex) {
    return colorCache[hex] || (colorCache[hex] = new T.Color(hex).convertSRGBToLinear());
  }
  var ink = 0x252922, ivory = 0xf0e7d4;
  var surface = new T.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: .86, metalness: 0});
  // Overlapping scales catch light as a fine satin grain. Derivative filtering
  // fades that grain at distance, so the small meadow monarchs never sparkle.
  // One attribute distinguishes membranes from the velvet body without another
  // material, texture download, draw call, or layer of wing geometry.
  surface.extensions={derivatives:true};
  surface.onBeforeCompile=function(shader) {
    shader.uniforms.bfMonarchDetail={value:low?.35:1};
    shader.vertexShader='attribute float bfMembrane;attribute vec2 bfVeinProfile;varying vec2 bfVeinDepth;varying float bfWing;varying vec3 bfMonarchPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfWing=bfMembrane;bfMonarchPoint=position;bfVeinDepth=bfVeinProfile;');
    shader.fragmentShader='uniform float bfMonarchDetail;varying vec2 bfVeinDepth;varying float bfWing;varying vec3 bfMonarchPoint;\nfloat bfScaleHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat bfScaleNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bfScaleHash(i),bfScaleHash(i+vec2(1.,0.)),f.x),mix(bfScaleHash(i+vec2(0.,1.)),bfScaleHash(i+1.),f.x),f.y);}\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
      '#include <color_fragment>',
      'vec2 bfScaleFlow=vec2(bfMonarchPoint.x-.25,(bfMonarchPoint.z+.45)*.58);',
      'vec2 bfScaleUV=vec2(atan(bfScaleFlow.y,bfScaleFlow.x)*42.,length(bfScaleFlow)*31.);',
      'float bfScaleFootprint=max(fwidth(bfScaleUV.x),fwidth(bfScaleUV.y));',
      'float bfScaleVisible=(1.-smoothstep(.35,1.2,bfScaleFootprint))*bfMonarchDetail;',
      'bfScaleUV.x+=mod(floor(bfScaleUV.y),2.)*.5;',
      'vec2 bfScaleCell=fract(bfScaleUV)-.5;',
      'float bfScaleGrain=bfScaleHash(floor(bfScaleUV));',
      'float bfScaleLip=smoothstep(.18,.43,bfScaleCell.y+bfScaleCell.x*bfScaleCell.x*.68);',
      'float bfScaleRib=.5+.5*cos(bfScaleCell.x*18.849556);',
      'float bfAmber=smoothstep(.015,.16,diffuseColor.r-diffuseColor.g);',
      'float bfPigment=.94+.07*smoothstep(.35,5.6,bfMonarchPoint.x)+.046*cos(bfMonarchPoint.z*.70+bfMonarchPoint.x*.35)+.016*sin(bfMonarchPoint.z*2.1);',
      'float bfSatin=1.+((bfScaleGrain-.5)*.09-bfScaleLip*.035+(bfScaleRib-.5)*.018)*bfScaleVisible;',
      'diffuseColor.rgb*=mix(1.,bfPigment,bfWing*bfAmber)*mix(1.,bfSatin,bfWing);',
      'vec2 bfClusterUV=bfMonarchPoint.xz*vec2(3.,2.6);',
      'float bfClusterResolve=1.-smoothstep(.35,1.2,max(fwidth(bfClusterUV.x),fwidth(bfClusterUV.y)));',
      'float bfClusterAmount=(bfScaleNoise(bfClusterUV)*2.-1.)*bfClusterResolve*bfWing*bfAmber*(1.-clamp(bfVeinDepth.x,0.,1.));',
      'diffuseColor.rgb*=1.+.05*bfClusterAmount;',
      'vec2 bfBodyUV=vec2(bfMonarchPoint.x*67.+bfMonarchPoint.y*39.,bfMonarchPoint.z*35.);',
      'float bfBodyFine=(1.-smoothstep(.4,1.4,max(fwidth(bfBodyUV.x),fwidth(bfBodyUV.y))))*bfMonarchDetail;',
      'float bfFuzz=(.5+.5*sin(bfBodyUV.x*6.283185+sin(bfBodyUV.y*.62)))*(.62+.38*bfScaleHash(floor(bfBodyUV)));',
      'diffuseColor.rgb*=1.+(bfFuzz-.4)*.08*(1.-bfWing)*bfBodyFine;'
    ].join('\n'));
    // Filtered scale clusters bridge broad pigment and individual scale grain.
    // A tiny surface relief breaks up highlights only while individual scales
    // can be resolved. It adds no triangles and disappears on distant visitors.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',[
      '#include <normal_fragment_maps>',
      'float bfVeinCrown=max(0.,1.-bfVeinDepth.y*bfVeinDepth.y)*bfVeinDepth.x;float bfScaleRelief=bfVeinCrown*.006+((bfScaleGrain-.5)*.0013-bfScaleLip*.00065+(bfScaleRib-.5)*.0003)*bfScaleVisible*bfWing+(bfFuzz-.4)*.00065*bfBodyFine*(1.-bfWing);',
      'vec3 bfScaleDx=dFdx(-vViewPosition),bfScaleDy=dFdy(-vViewPosition);',
      'vec3 bfScaleBx=cross(bfScaleDy,normal),bfScaleBy=cross(normal,bfScaleDx);',
      'float bfScaleDet=dot(bfScaleDx,bfScaleBx);',
      'vec3 bfScaleNormal=abs(bfScaleDet)*normal-sign(bfScaleDet)*(dFdx(bfScaleRelief)*bfScaleBx+dFdy(bfScaleRelief)*bfScaleBy);',
      'normal=normalize(mix(normal,normalize(bfScaleNormal+normal*.000001),.24*bfWing*bfScaleVisible+.42*bfVeinDepth.x+.16*(1.-bfWing)*bfBodyFine));'
    ].join('\n'));
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat bfWingRoughness=mix(.87,.79,bfAmber)+(bfScaleGrain-.5)*.055*bfScaleVisible;bfWingRoughness-=.015*bfClusterAmount;bfWingRoughness=mix(bfWingRoughness,.70,bfVeinDepth.x*.65);roughnessFactor=clamp(mix(.94+(bfFuzz-.4)*.025*bfBodyFine,bfWingRoughness,bfWing),.70,.98);');
    // Wrapped wing transmission stays directional, pigment-masked and vein-occluded.
    // Light arriving through a thin orange membrane gives a restrained warm
    // lift to its shaded side. Black veins and the opaque body transmit none.
    // The contribution follows the actual directional lights; it is not glow.
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',[
      '#include <lights_fragment_end>',
      'vec3 bfThroughLight=vec3(0.);float bfBackLight=0.;',
      '#if NUM_DIR_LIGHTS > 0',
      '#pragma unroll_loop_start',
      'for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {',
      'bfBackLight=pow(clamp((-dot(geometry.normal,directionalLights[i].direction)+.25)/1.25,0.,1.),1.5);',
      'bfThroughLight+=directionalLights[i].color*bfBackLight*.12;',
      '}',
      '#pragma unroll_loop_end',
      '#endif',
      'reflectedLight.directDiffuse+=clamp(diffuseColor.rgb,vec3(0.),vec3(1.))*bfThroughLight*(1.-.22*bfClusterAmount)*vec3(1.,.84,.64)*bfWing*bfAmber*(1.-clamp(bfVeinDepth.x,0.,1.));'
    ].join('\n'));
    // Wing attachment depth occludes only nearby indirect illumination.
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',[
      '#include <aomap_fragment>',
      'float bfRootPocket=(1.-smoothstep(.35,1.45,bfMonarchPoint.x))*(1.-smoothstep(.85,1.8,abs(bfMonarchPoint.z-.10)));',
      'float bfRootMask=bfRootPocket*bfWing*bfAmber*(1.-clamp(bfVeinDepth.x,0.,1.));',
      'reflectedLight.indirectDiffuse*=1.-.12*bfRootMask;'
    ].join('\n'));
  };
  surface.customProgramCacheKey=function(){return 'butterfly-monarch-wing-root-depth-v10';};
  refineButterflyAnatomySurface(surface,'bfMonarchPoint','bfWing');
  var eyeMaterial = butterflyEyeMaterial(T,color(0x302b22),low);

  // Wing pigment, veins, and the two marginal spot rows are baked into one
  // geometry per wing type. Both sides reuse these same two GPU geometries.
  function wingGeometry(kind) {
    var fore = kind === 'fore';
    var outline = fore
      ? [[.28,-.63],[1.05,-1.75],[2.7,-3.9],[4.9,-5.18],[6.3,-5.0],[6.95,-4.12],[6.55,-2.7],[5.55,-1.3],[4.25,.25],[2.3,1.10],[.32,.73]]
      : [[.28,.18],[2.0,-.1],[3.4,.3],[4.8,1.02],[5.6,2.18],[5.3,3.52],[4.1,4.25],[2.8,4.35],[1.65,3.65],[.7,2.45],[.25,1.1]];
    var curve = new T.CatmullRomCurve3(outline.map(function(p) { return new T.Vector3(p[0],0,p[1]); }), true, 'centripetal');
    var boundary = curve.getSpacedPoints(low ? 36 : 88).slice(0,-1), center = fore ? [2.65,-1.9] : [2.55,2.05];
    // Fine, shallow scallops break the mathematically smooth outer rim while
    // preserving the distinct forewing and hindwing silhouettes.
    boundary.forEach(function(p,index){
      var dx=p.x-center[0],dz=p.z-center[1],length=Math.hypot(dx,dz);
      var edgePhase=index/boundary.length*Math.PI*2;
      var trailing=fore?Math.max(0,Math.min(1,(p.z+p.x*.65+1.5)*1.2)):1;
      var scallop=(1-Math.cos(edgePhase*(fore?9:10)+.22*Math.sin(edgePhase*3)))*(fore?.030:.065)*(.82+.18*Math.sin(edgePhase*5+.7))*trailing;
      if(p.x>1.5&&length>.001){p.x-=dx/length*scallop;p.z-=dz/length*scallop;}
    });
    var positions = [], normals = [], colors = [], membranes = [], veinProfiles = [];
    // A shallow spanwise arch and chordwise twist retain a thin membrane,
    // while continuous analytic normals keep the lifted wings softly curved.
    function camber(x,z) { return monarchWingHeight(x,z,fore); }
    function point(p, radius) { return [center[0]+(p.x-center[0])*radius, center[1]+(p.z-center[1])*radius]; }
    function vertex(p, hex, face, lift, ridge) {
      var x=p[0], z=p[1], c=color(hex), depth=butterflyWingDepth(x,z,fore,1), dx=(.34+.08*Math.sin((z+1)*.75))*Math.PI/7*Math.cos(x*Math.PI/7)+depth[1], dz=.06*Math.cos((z+1)*.75)*Math.sin(x*Math.PI/7)+.03825*Math.cos(z*.85)+depth[2];
      if(!lift&&hex!==ink){
        // Continuous colour through the membrane avoids concentric painted
        // bands. Ventral forewings retain orange while hindwings stay paler.
        var warmth=Math.max(0,Math.min(1,.12+(x-.25)/6.7*.83+.08*Math.sin(z*.68+x*.37)+.045*Math.cos(z*.35)));
        c=color(face===1?0xa65124:(fore?0xb15c28:0xaf7a49)).clone().lerp(color(face===1?0xe99f4a:(fore?0xe9a65a:0xdcb67f)),warmth);
      }
      // The underside keeps the same cell pattern in a quieter, warm pigment.
      if(face<0&&hex===ink)c=color(0x3c3529);
      else if(face<0&&lift)c=c.clone().lerp(color(0xe9d3ae),.12);
      var normal = new T.Vector3(-dx,1,-dz).normalize().multiplyScalar(face);
      positions.push(x,camber(x,z)+face*(.012+(lift||0)),z);
      normals.push(normal.x,normal.y,normal.z); colors.push(c.r,c.g,c.b);membranes.push(1);veinProfiles.push(ridge===undefined?0:1,ridge||0);
    }
    function triangle(a,b,c,hex,face,lift,ridges) {
      // XZ winding reverses relative to ordinary XY shapes. Set it explicitly
      // so dorsal and ventral pigments use backface culling, never z-fighting.
      var up=(b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1]);
      if(up*face<0) { var swap=b; b=c; c=swap;if(ridges)ridges=[ridges[0],ridges[2],ridges[1]]; }
      vertex(a,hex,face,lift,ridges&&ridges[0]);vertex(b,hex,face,lift,ridges&&ridges[1]);vertex(c,hex,face,lift,ridges&&ridges[2]);
    }
    var rings=[0,.28,.64,.84,.902,1];
    [1,-1].forEach(function(face) {
      var palette = face===1 ? [0xf5a641,0xf39228,0xef7d1a,0xd96516,ink] : [0xf5c883,0xeeb265,0xe7a65b,0xc98b4c,ink];
      for(var i=0;i<boundary.length;i++) {
        var next=(i+1)%boundary.length;
        for(var band=0;band<rings.length-1;band++) {
          var a=point(boundary[i],rings[band]),b=point(boundary[next],rings[band]),c=point(boundary[i],rings[band+1]),d=point(boundary[next],rings[band+1]);
          if(band)triangle(a,b,c,palette[band],face,0);
          triangle(b,d,c,palette[band],face,0);
        }
      }
    });
    function ribbon(points,width) {
      // Each branch passes through its original junctions. Shared edge points
      // join the tapered ribbon without the gaps or square elbows of segments.
      var source=points.map(function(p){return new T.Vector3(p[0],0,p[1]);}),originalSegments=source.length-1;
      if(!low&&source.length===2){
        var middle=source[0].clone().lerp(source[1],.5),delta=source[1].clone().sub(source[0]),length=delta.length();
        if(length>.00001){var bow=Math.min(.085,length*.045)*Math.sin(points[0][0]*1.7+points[0][1]*.9);middle.x-=delta.z/length*bow;middle.z+=delta.x/length*bow;source.splice(1,0,middle);}
      }
      var curve=new T.CatmullRomCurve3(source,false,'centripetal'),sections=originalSegments*(low?1:2),edges=[];
      for(var i=0;i<=sections;i++){
        var t=i/sections,p=curve.getPoint(t),tangent=curve.getTangent(t),halfWidth=width*.5*(1-.55*t)*(.95+.055*Math.cos(t*Math.PI*2)+.025*Math.sin(t*Math.PI*5+points[0][0]));
        var nx=-tangent.z*halfWidth,nz=tangent.x*halfWidth;
        edges.push({left:[p.x-nx,p.z-nz],right:[p.x+nx,p.z+nz]});
      }
      for(var i=0;i<sections;i++){
        var a=edges[i],b=edges[i+1];
        [1,-1].forEach(function(face){triangle(a.left,b.left,b.right,ink,face,.018,[-1,-1,1]);triangle(a.left,b.right,a.right,ink,face,.018,[-1,1,1]);});
      }
    }
    // A long discal cell and branching radiating veins divide the orange into
    // recognizable monarch cells; these are not a generic radial spoke pattern.
    var veins=fore ? [
      [[.44,-.52],[1.45,-2.1],[3.0,-3.82],[4.7,-4.85]],
      [[.44,-.52],[1.8,-1.92],[3.7,-2.92],[5.75,-4.48]],
      [[1.8,-1.92],[1.42,-.28],[3.46,-1.03],[4.06,-1.95],[3.7,-2.92]],
      [[3.7,-2.92],[5.95,-3.7]],
      [[4.06,-1.95],[6.12,-2.72]],
      [[3.46,-1.03],[5.3,-1.25]],
      [[1.42,-.28],[4.08,.20]],
      [[.48,-.12],[2.28,.72]],
      [[3.0,-3.82],[3.62,-4.36]],
      [[5.3,-1.25],[5.72,-1.85]]
    ] : [
      [[.45,.47],[1.64,1.31],[2.45,2.28],[2.61,3.91]],
      [[1.64,1.31],[2.65,.92],[4.63,1.32]],
      [[2.65,.92],[3.38,1.91],[2.45,2.28],[1.64,1.31]],
      [[3.38,1.91],[5.04,2.15]],
      [[3.38,1.91],[4.78,3.05]],
      [[2.45,2.28],[3.76,3.85]],
      [[.45,.47],[1.1,2.15],[1.8,3.32]],
      [[1.1,2.15],[.92,2.64]],
      [[2.65,.92],[3.5,.62]]
    ];
    veins.forEach(function(path,i){ribbon(path,i<3?.084:.058);});
    function oval(x,z,along,across,angle,hex,lift) {
      // Small markings spend fewer triangles than the curved veins. Their edges
      // have a quiet organic variation, avoiding identical stamped polka dots.
      var ca=Math.cos(angle),sa=Math.sin(angle),count=low?6:8,seed=x*2.31+z*1.73;
      function outlineAt(a){var variation=1+.09*Math.sin(a*3+seed)+.045*Math.cos(a*5-seed*.7)+.035*Math.cos(a+seed*.4);return [x+variation*(Math.cos(a)*along*ca-Math.sin(a)*across*sa),z+variation*(Math.cos(a)*along*sa+Math.sin(a)*across*ca)];}
      [1,-1].forEach(function(face) {
        for(var s=0;s<count;s++) {
          var a=s/count*Math.PI*2,b=(s+1)/count*Math.PI*2;
          var p=outlineAt(a),q=outlineAt(b);
          triangle([x,z],p,q,hex,face,lift===undefined?.026:lift);
        }
      });
    }
    for(var spot=2;spot<boundary.length;spot+=low?2:4) {
      var edge=boundary[spot];
      if(edge.x<1.2)continue; // no false white necklace around the wing hinge
      var before=boundary[(spot+boundary.length-1)%boundary.length],after=boundary[(spot+1)%boundary.length];
      var angle=Math.atan2(after.z-before.z,after.x-before.x)+.08*Math.sin(spot*1.3),p=point(edge,.925+.003*Math.sin(spot*.91)),q=point(edge,.976+.003*Math.cos(spot*1.47));
      var large=(fore?.14:.125)*(.94+.13*Math.sin(spot*1.7)+.035*Math.cos(spot*.63));
      var cream=spot%3?ivory:0xe9dfca;
      oval(p[0],p[1],large,large*(.61+.04*Math.sin(spot)),angle,cream);
      oval(q[0],q[1],large*.48,large*.35,angle+.06*Math.cos(spot*.8),ivory);
    }
    // Enlarged pale subapical marks sit in dark cells along the forewing costa.
    if(fore) {
      [[4.15,-4.30,.14,.10],[4.9,-4.55,.19,.13],[5.55,-4.31,.23,.14],[6.0,-3.86,.17,.11]].forEach(function(p) {
        oval(p[0],p[1],p[2]*1.5,p[3]*1.65,-.6,ink,.024);
        oval(p[0],p[1],p[2],p[3],-.6,0xfff3d9,.032);
      });
    }
    var geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.setAttribute('bfMembrane',new T.Float32BufferAttribute(membranes,1));
    geometry.setAttribute('bfVeinProfile',new T.Float32BufferAttribute(veinProfiles,2));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    geometry.name='monarch-'+kind+'-membrane';
    return geometry;
  }
  var foreGeometry=wingGeometry('fore'),hindGeometry=wingGeometry('hind');
  [-1,1].forEach(function(side,index) {
    var label=side<0?'left':'right',pivot=new T.Group(),trailing=new T.Group();
    pivot.name='monarch-wing-'+label;trailing.name='monarch-hindwing-pivot-'+label;
    pivot.position.x=side*.12;root.add(pivot);wings.push(pivot);
    pivot.add(trailing);hindWings.push(trailing);
    var hind=new T.Mesh(hindGeometry,surface),fore=new T.Mesh(foreGeometry,surface);
    hind.name='monarch-hindwing-'+label;fore.name='monarch-forewing-'+label;
    hind.scale.x=side;fore.scale.x=side;
    trailing.add(hind);pivot.add(fore);
  });

  // All static anatomy becomes one draw call. Temporary primitive geometries
  // are disposed after baking, leaving four geometries and two materials/model.
  var bodyPositions=[],bodyNormals=[],bodyColors=[],sphere=low?new T.SphereGeometry(1,7,5):new T.SphereGeometry(1,14,10);
  var clubGeometry=butterflyClubGeometry(T,sphere);
  var transform=new T.Object3D(),normalMatrix=new T.Matrix3(),point=new T.Vector3(),normal=new T.Vector3();
  function bake(geometry,hex,x,y,z,sx,sy,sz,rx,ry,rz,abdomen) {
    transform.position.set(x||0,y||0,z||0);transform.scale.set(sx||1,sy||1,sz||1);transform.rotation.set(rx||0,ry||0,rz||0);transform.updateMatrix();
    normalMatrix.getNormalMatrix(transform.matrix);
    var p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index,c=color(hex),count=index?index.count:p.count;
    for(var i=0;i<count;i++) {
      var v=index?index.getX(i):i;
      point.fromBufferAttribute(p,v).applyMatrix4(transform.matrix);
      normal.fromBufferAttribute(n,v).applyMatrix3(normalMatrix).normalize();
      if(abdomen)contourButterflyAbdomen(point,normal);
      bodyPositions.push(point.x,point.y,point.z);bodyNormals.push(normal.x,normal.y,normal.z);bodyColors.push(c.r,c.g,c.b);
    }
  }
  function blob(hex,x,y,z,sx,sy,sz,ry,abdomen) {bake(sphere,hex,x,y,z,sx,sy,sz,0,ry||0,0,abdomen);}
  function tube(points,radius,hex,segments) {
    var path=new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3(p[0],p[1],p[2]);}));
    var geometry=new T.TubeGeometry(path,Math.max(3,Math.round((segments||12)*(low?.4:1))),radius,low?3:5,false);
    if(points.length===4)taperButterflyLimb(geometry,path);
    bake(geometry,hex);geometry.dispose();
  }
  blob(ink,0,-.02,-.43,.43,.39,.88);
  blob(0x252923,0,-.025,1.24,.32,.30,1.61,0,true);
  for(var segment=0;segment<8;segment++) {
    var z=.13+segment*.33,radius=.31*(1-segment*.065);
    blob(segment%2?0x272c24:0x34362b,0,-.025,z,radius,.27*(1-segment*.055),.25,0,true);
    [-1,1].forEach(function(side){blob(0xd7cda7,side*radius*.91,.015,z,.045,.055,.115,0,true);});
  }
  blob(ink,0,.01,-1.43,.35,.33,.36);
  [-1,1].forEach(function(side) {
    // White thoracic and facial flecks are small, irregular, and embedded.
    for(var mark=0;mark<4;mark++)blob(ivory,side*(.24+mark%2*.07),.28-mark%2*.045,-.96+mark*.25,.065,.045,.095);
    blob(ivory,side*.17,.25,-1.48,.065,.055,.07);
    tube([[side*.16,.19,-1.62],[side*.29,.44,-2.05],[side*.48,.61,-2.57],[side*.69,.65,-3.04]],.035,ink,15);
    bake(clubGeometry,ink,side*.69,.65,-3.04,.068,.072,.222,0,side*-.28,0);
    tube([[side*.24,-.17,-.94],[side*.36,-.33,-1.1],[side*.25,-.43,-.75]],.032,ink,8);
    tube([[side*.32,-.19,-.42],[side*.58,-.48,-.13],[side*.96,-.86,.27],[side*1.02,-.88,.51]],.028,ink,11);
    tube([[side*.28,-.19,.19],[side*.59,-.48,.78],[side*.84,-.81,1.4],[side*.84,-.84,1.67]],.027,ink,11);
  });
  var coil=[[0,-.17,-1.68],[0,-.34,-1.78]];
  for(var turn=0;turn<24;turn++) {
    var a=turn/23*Math.PI*3.35,r=.16-turn/23*.09;
    coil.push([0,-.49+Math.cos(a)*r,-1.7-Math.sin(a)*r]);
  }
  if(!feeding)tube(coil,.021,0x977344,36);
  clubGeometry.dispose();
  var bodyGeometry=new T.BufferGeometry();
  bodyGeometry.setAttribute('position',new T.Float32BufferAttribute(bodyPositions,3));
  bodyGeometry.setAttribute('normal',new T.Float32BufferAttribute(bodyNormals,3));
  bodyGeometry.setAttribute('color',new T.Float32BufferAttribute(bodyColors,3));
  bodyGeometry.setAttribute('bfMembrane',new T.Float32BufferAttribute(new Float32Array(bodyPositions.length/3),1));
  bodyGeometry.setAttribute('bfVeinProfile',new T.Float32BufferAttribute(new Float32Array(bodyPositions.length/3*2),2));
  bodyGeometry.computeBoundingBox();bodyGeometry.computeBoundingSphere();bodyGeometry.name='monarch-anatomy';
  var body=new T.Mesh(bodyGeometry,surface);body.name='monarch-body';root.add(body);
  [-1,1].forEach(function(side) {
    var eye=new T.Mesh(sphere,eyeMaterial);eye.name='monarch-eye-'+(side<0?'left':'right');
    eye.position.set(side*.29,.025,-1.46);eye.scale.set(.15,.20,.20);eye.rotation.y=side*.18;root.add(eye);
  });
  root.userData.anatomy={forewings:2,hindwings:2,antennae:2,legs:6,reducedForelegs:true,coiledProboscis:!feeding};
  return {root:root,wings:wings,hindWings:hindWings};
}

// The footpath's centre line, shared by the 3D meadow and both maps.
function meadowPathX(z){return -7+Math.sin(z*.029)*12+Math.sin(z*.009)*4;}
  // A few windborne seeds and airborne motes give still viewing a sense of air.
  // They are depth-tested, softly lit points, never additive sparks or a screen overlay.
  function createMeadowAtmosphere(T,scene){
    var moteCount=96,count=moteCount+2,positions=new Float32Array(count*3),normals=new Float32Array(count*3),particles=new Float32Array(count*4);
    function hash(n){var value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);}
    var centers=[[-42,-28],[38,-54],[0,6],[-42,38]];
    for(var i=0;i<moteCount;i++){
      var center=centers[i%4],angle=hash(i+7501)*Math.PI*2,radius=Math.sqrt(hash(i+7601))*25,seed=i%5===0;
      positions[i*3]=center[0]+Math.cos(angle)*radius;
      positions[i*3+1]=1.6+hash(i+7701)*8.2;
      positions[i*3+2]=center[1]+Math.sin(angle)*radius;
      normals[i*3+1]=1;
      particles[i*4]=hash(i+7801);
      particles[i*4+1]=seed?.22+hash(i+7901)*.22:.055+hash(i+7901)*.075;
      particles[i*4+2]=.12+hash(i+8001)*.16;
      particles[i*4+3]=seed?1:0;
    }
    // Two small distant birds share the existing point draw and clock. Their
    // short bodies, swept wings and bank are projected from a world-space frame;
    // none of the original floating seeds or motes changes its authored record.
    for(var bird=0;bird<2;bird++){
      var at=moteCount+bird;
      positions[at*3]=bird?204:183;positions[at*3+1]=bird?40:34;positions[at*3+2]=bird?176:156;
      normals[at*3+1]=1;
      particles[at*4]=bird?.63:.14;particles[at*4+1]=bird?2.55:2.8;particles[at*4+2]=bird?.024:.029;particles[at*4+3]=2;
    }
    var geometry=new T.BufferGeometry();geometry.name='meadow-airborne-seeds';
    geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.BufferAttribute(normals,3));
    geometry.setAttribute('bfParticle',new T.BufferAttribute(particles,4));
    var uniforms=T.UniformsUtils.merge([T.UniformsLib.fog,{
      bfAirClock:{value:0},bfAirGolden:{value:0},bfParticlePixelScale:{value:300},
      bfMoteColor:{value:new T.Color(0xc1b99b).convertSRGBToLinear()},
      bfSeedColor:{value:new T.Color(0xeee6cf).convertSRGBToLinear()},
      bfWarmColor:{value:new T.Color(0xe9c891).convertSRGBToLinear()}
    }]);
    var material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,fog:true,blending:T.NormalBlending,uniforms:uniforms,
      vertexShader:[
        'attribute vec4 bfParticle;',
        'uniform float bfAirClock;uniform float bfParticlePixelScale;',
        'varying float bfSeed;varying float bfAirFade;varying float bfTurn;',
        'varying vec4 bfBirdFrame;varying vec3 bfBirdUp;',
        '#include <fog_pars_vertex>',
        'void main(){',
        // Motion follows the same prevailing +x / +z breeze as the vegetation.
        // Wraps fade out before re-entering, so there is no sudden teleport.
        'float cycle=fract(bfParticle.x+bfAirClock*bfParticle.z/48.);',
        'float phase=bfParticle.x*6.2831853;',
        'vec3 p=position;float drift=(cycle-.5)*48.;',
        'p.x+=drift+.7*sin(bfAirClock*.19+phase);',
        'p.z+=drift*.46+.6*sin(bfAirClock*.16+phase*1.7);',
        'p.y+=.35*sin(bfAirClock*.27+phase)+.12*sin(bfAirClock*.61+phase*2.);',
        'bfBirdFrame=vec4(0.);bfBirdUp=vec3(0.);',
        'if(bfParticle.w>1.5){',
        // The ellipse is continuous: neither bird wraps, reverses or teleports.
        'float flight=phase+bfAirClock*bfParticle.z;',
        'p=vec3(cos(flight)*position.x,position.y+2.3*sin(bfAirClock*.105+phase),sin(flight)*position.z);',
        'vec3 forward=normalize(vec3(-sin(flight)*position.x*bfParticle.z,.2415*cos(bfAirClock*.105+phase),cos(flight)*position.z*bfParticle.z));',
        'vec3 right=normalize(cross(forward,vec3(0.,1.,0.)));vec3 up=cross(right,forward);',
        'float bank=.12+.10*sin(bfAirClock*.13+phase);float bankCos=cos(bank),bankSin=sin(bank);',
        'vec3 bankRight=right*bankCos+up*bankSin;vec3 bankUp=up*bankCos-right*bankSin;',
        'bfBirdFrame=vec4((mat3(modelViewMatrix)*bankRight).xy,(mat3(modelViewMatrix)*forward).xy);',
        'bfBirdUp.xy=(mat3(modelViewMatrix)*bankUp).xy;',
        '}',
        'vec4 mvPosition=modelViewMatrix*vec4(p,1.);',
        'gl_Position=projectionMatrix*mvPosition;',
        'gl_PointSize=clamp(bfParticle.y*bfParticlePixelScale*projectionMatrix[1][1]/max(1.,-mvPosition.z),1.,14.);',
        'bfSeed=bfParticle.w;bfTurn=phase+.18*sin(bfAirClock*.42+phase);',
        'bfAirFade=smoothstep(0.,.09,cycle)*(1.-smoothstep(.88,1.,cycle))*(1.-smoothstep(90.,155.,-mvPosition.z));',
        'if(bfParticle.w>1.5){',
        // Smooth, asynchronous flap bursts last about two seconds per seven.
        // Most of the flight is a quiet glide with softly flexed wing tips.
        'float burst=.5+.5*sin(bfAirClock*.89+phase);burst=smoothstep(.69,.93,burst);',
        'bfTurn=-.045+.035*sin(bfAirClock*1.2+phase)+burst*.84*sin(bfAirClock*18.8+phase*2.3);',
        'bfBirdUp.z=2./gl_PointSize;',
        'bfAirFade=smoothstep(80.,125.,length(mvPosition.xyz))*(1.-smoothstep(255.,350.,-mvPosition.z));',
        '}',
        '#include <fog_vertex>',
        '}'
      ].join('\n'),
      fragmentShader:[
        'uniform float bfAirGolden;uniform vec3 bfMoteColor;uniform vec3 bfSeedColor;uniform vec3 bfWarmColor;',
        'varying float bfSeed;varying float bfAirFade;varying float bfTurn;',
        'varying vec4 bfBirdFrame;varying vec3 bfBirdUp;',
        // A taper remains soft below a pixel and never divides by a vanishing
        // foreshortened span when a bird flies directly toward the camera.
        'float birdStroke(vec2 p,vec2 a,vec2 b,float ra,float rb,float aa){vec2 span=b-a;float t=clamp(dot(p-a,span)/max(.00001,dot(span,span)),0.,1.);float r=mix(ra,rb,t);return 1.-smoothstep(r-aa*.5,r+aa*.5,length(p-a-span*t));}',
        '#include <fog_pars_fragment>',
        'void main(){',
        'vec2 p=gl_PointCoord*2.-1.;float radius=length(p);',
        'if(radius>1.)discard;',
        'if(bfSeed>1.5){',
        'vec2 right=bfBirdFrame.xy,forward=bfBirdFrame.zw,up=bfBirdUp.xy;float aa=bfBirdUp.z;',
        'float shape=birdStroke(p,-forward*.16,forward*.19,.095,.085,aa);',
        'shape=max(shape,birdStroke(p,forward*.19,forward*.29,.085,.02,aa));',
        'shape=max(shape,birdStroke(p,-forward*.16,-forward*.38+right*.055,.052,.06,aa));',
        'shape=max(shape,birdStroke(p,-forward*.16,-forward*.38-right*.055,.052,.06,aa));',
        'vec2 shoulder=forward*.04;',
        'vec2 lift=up*sin(bfTurn),spread=right*cos(bfTurn);',
        'vec2 elbowLeft=-spread*.36+lift*.36,elbowRight=spread*.36+lift*.36;',
        'vec2 tipLeft=-spread*.78+lift*.78-forward*.20,tipRight=spread*.78+lift*.78-forward*.20;',
        'shape=max(shape,birdStroke(p,shoulder,elbowLeft,.105,.105,aa));shape=max(shape,birdStroke(p,elbowLeft,tipLeft,.105,.018,aa));',
        'shape=max(shape,birdStroke(p,shoulder,elbowRight,.105,.105,aa));shape=max(shape,birdStroke(p,elbowRight,tipRight,.105,.018,aa));',
        'float alpha=shape*.72*bfAirFade;if(alpha<.003)discard;',
        'vec3 color=mix(bfMoteColor*.30,bfWarmColor*.29,bfAirGolden*.3);gl_FragColor=vec4(color,alpha);',
        '#include <tonemapping_fragment>',
        '#include <encodings_fragment>',
        '#include <fog_fragment>',
        'return;',
        '}',
        'float soft=exp(-4.8*dot(p,p))*(1.-smoothstep(.65,1.,radius));',
        // A muted downy tuft with a small hanging seed, rather than a shiny dot.
        'float c=cos(bfTurn),s=sin(bfTurn);vec2 q=mat2(c,-s,s,c)*p;',
        'float tuft=exp(-4.4*(q.x*q.x+(q.y+.14)*(q.y+.14)*1.8));',
        'float stalk=(1.-smoothstep(.025,.07,abs(q.x)))*smoothstep(-.1,.04,q.y)*(1.-smoothstep(.32,.52,q.y));',
        'float grain=exp(-90.*(q.x*q.x+(q.y-.42)*(q.y-.42)*.45));',
        'float shape=mix(soft,(tuft*.7+stalk*.15+grain*.22)*(1.-smoothstep(.7,1.,radius)),bfSeed);',
        'float alpha=shape*mix(.21,.46,bfSeed)*bfAirFade;',
        'if(alpha<.003)discard;',
        'vec3 color=mix(bfMoteColor,bfSeedColor,bfSeed);color=mix(color,bfWarmColor,bfAirGolden*.3);',
        'gl_FragColor=vec4(color,alpha);',
        '#include <tonemapping_fragment>',
        '#include <encodings_fragment>',
        '#include <fog_fragment>',
        '}'
      ].join('\n')
    });
    var root=new T.Points(geometry,material);root.name='meadow-atmosphere';root.frustumCulled=false;
    root.userData.meadowAtmosphere=true;scene.add(root);
    // Keep the apparent size tied to the actual drawing buffer, including high-DPI screens.
    root.onBeforeRender=function(renderer){uniforms.bfParticlePixelScale.value=(renderer.domElement.height||600)*.5;};
    function animate(clock,reduced,hidden,golden){
      root.visible=!hidden;
      uniforms.bfAirClock.value=reduced?0:(typeof clock==='number'&&isFinite(clock)?clock:0);
      uniforms.bfAirGolden.value=golden?1:0;
    }
    return {root:root,animate:animate};
  }

// Additional adult scenery species; createMonarch and all teaching models stay separate.
// Visual references: UF/IFAS IN218 (Papilio glaucus), Iowa State BugGuide species
// 2649 and 3259 (Vanessa cardui and Pieris rapae), and Field Museum butterfly guides.
function createMeadowButterfly(T,kit,speciesId,lowDetail){
  var low=!!lowDetail,tiger=speciesId==='tiger-swallowtail',lady=speciesId==='painted-lady',white=speciesId==='cabbage-white';
  if(!tiger&&!lady&&!white)throw new Error('Unknown meadow butterfly species: '+speciesId);
  var root=new T.Group(),wings=[],hindWings=[],cache={};
  root.userData.speciesId=speciesId;root.userData.species=tiger?'Papilio glaucus':lady?'Vanessa cardui':'Pieris rapae';
  root.userData.model='illustrative '+speciesId;root.userData.sex=tiger?'male':white?'female':'unspecified';
  function color(hex){return cache[hex]||(cache[hex]=new T.Color(hex).convertSRGBToLinear());}
  function rgb(hex){var c=color(hex);return 'vec3('+[c.r,c.g,c.b].map(function(n){return n.toFixed(7);}).join(',')+')';}
  var material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.84,metalness:0});
  material.extensions={derivatives:true};
  material.onBeforeCompile=function(shader){
    shader.uniforms.bfMeadowDetail={value:low?.35:1};
    shader.vertexShader='attribute float bfWingKind;attribute float bfWingFace;attribute float bfWingEdge;varying vec3 bfWingPoint;varying float bfKind;varying float bfFace;varying float bfEdge;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfWingPoint=position;bfKind=bfWingKind;bfFace=bfWingFace;bfEdge=bfWingEdge;');
    var paint=[
      'uniform float bfMeadowDetail;varying vec3 bfWingPoint;varying float bfKind;varying float bfFace;varying float bfEdge;',
      'float bfHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float bfNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bfHash(i),bfHash(i+vec2(1.,0.)),f.x),mix(bfHash(i+vec2(0.,1.)),bfHash(i+1.),f.x),f.y);}',
      'float bfPigmentFringe(float signedDistance,vec2 p,float aa,float span){vec2 uv=p*vec2(23.,31.);float fine=1.-smoothstep(.4,1.15,max(fwidth(uv.x),fwidth(uv.y)));float edgeResolve=1.-smoothstep(.055,.18,aa);float width=max(aa,.012)+span*edgeResolve;float coverage=1.-smoothstep(-width,width,signedDistance);uv.x+=mod(floor(uv.y),2.)*.5;float scales=bfHash(floor(uv));return clamp(coverage+(scales-.5)*.34*coverage*(1.-coverage)*4.*fine,0.,1.);}',
      'float bfLine(vec2 p,vec2 a,vec2 b,float width,float aa){vec2 v=b-a;float span=length(v),h=clamp(dot(p-a,v)/dot(v,v),0.,1.);vec2 across=vec2(-v.y,v.x)/span;float bend=sin(h*3.141593)*span*.024*sin(a.x*1.7+a.y*.8);float radius=width*(1.-.18*h)*(1.+.055*sin(h*10.+a.x));float softness=max(aa,.007);return 1.-smoothstep(radius-softness,radius+softness,length(p-a-v*h-across*bend));}',
      'float bfPigmentLine(vec2 p,vec2 a,vec2 b,float width,float aa){vec2 v=b-a;float span=length(v),h=clamp(dot(p-a,v)/dot(v,v),0.,1.);vec2 across=vec2(-v.y,v.x)/span;float bend=sin(h*3.141593)*span*.024*sin(a.x*1.7+a.y*.8);float radius=width*(1.-.18*h)*(1.+.055*sin(h*10.+a.x));float softness=max(aa,.007);return bfPigmentFringe(length(p-a-v*h-across*bend)-radius,p,aa,.045);}',
      'float bfBand(vec2 p,vec2 a,vec2 b,float width,float aa){vec2 v=b-a;float span=length(v),h=clamp(dot(p-a,v)/dot(v,v),0.,1.);vec2 across=vec2(-v.y,v.x)/span;float bend=(sin(h*3.141593)*.065+sin(h*6.283185)*.014)*span;float radius=width*(1.25-.98*pow(h,.8))*(1.+.10*sin(h*9.+a.x)+.045*sin(h*19.7+a.y));float softness=max(aa,.012);return bfPigmentFringe(length(p-a-v*h-across*bend)-radius,p,aa,.04);}',
      'float bfOval(vec2 p,vec2 c,vec2 size,float angle,float aa){vec2 q=p-c;float ca=cos(angle),sa=sin(angle);q=vec2(ca*q.x+sa*q.y,-sa*q.x+ca*q.y)/size;float radius=length(q);vec2 d=q/max(radius,.0001);float seed=sin(c.x*2.73+c.y*4.11);float contour=1.+.065*d.x+.045*d.y*seed+.075*(d.x*d.x*d.x-3.*d.x*d.y*d.y)*seed+.035*(2.*d.x*d.y);float edge=max(aa,.008)/min(size.x,size.y);return 1.-smoothstep(contour-edge,contour+edge,radius);}',
      'float bfPigmentOval(vec2 p,vec2 c,vec2 size,float angle,float aa){vec2 q=p-c;float ca=cos(angle),sa=sin(angle);q=vec2(ca*q.x+sa*q.y,-sa*q.x+ca*q.y)/size;float radius=length(q);vec2 d=q/max(radius,.0001);float seed=sin(c.x*2.73+c.y*4.11);float contour=1.+.065*d.x+.045*d.y*seed+.075*(d.x*d.x*d.x-3.*d.x*d.y*d.y)*seed+.035*(2.*d.x*d.y);float edge=max(aa,.008)/min(size.x,size.y);return bfPigmentFringe((radius-contour)*min(size.x,size.y),p,aa,min(.045,min(size.x,size.y)*.19));}',
      'float bfVeins(vec2 p,bool fore,float aa){float v=0.;',
      'if(fore){v=max(v,bfLine(p,vec2(.35,-.55),vec2(2.05,-2.0),.022,aa));v=max(v,bfLine(p,vec2(2.05,-2.),vec2(3.65,-2.65),.021,aa));v=max(v,bfLine(p,vec2(3.65,-2.65),vec2(3.8,-1.25),.018,aa));v=max(v,bfLine(p,vec2(3.8,-1.25),vec2(1.4,.05),.018,aa));v=max(v,bfLine(p,vec2(1.4,.05),vec2(.35,-.55),.022,aa));v=max(v,bfLine(p,vec2(2.05,-2.),vec2(3.15,-4.2),.017,aa));v=max(v,bfLine(p,vec2(3.65,-2.65),vec2(5.7,-4.45),.018,aa));v=max(v,bfLine(p,vec2(3.65,-2.65),vec2(6.5,-3.0),.016,aa));v=max(v,bfLine(p,vec2(3.8,-1.25),vec2(5.6,-1.25),.016,aa));v=max(v,bfLine(p,vec2(1.4,.05),vec2(3.8,.55),.016,aa));}',
      'else{v=max(v,bfLine(p,vec2(.4,.5),vec2(2.0,1.5),.02,aa));v=max(v,bfLine(p,vec2(2.,1.5),vec2(3.1,2.4),.018,aa));v=max(v,bfLine(p,vec2(2.,1.5),vec2(4.7,1.3),.016,aa));v=max(v,bfLine(p,vec2(3.1,2.4),vec2(4.95,2.55),.016,aa));v=max(v,bfLine(p,vec2(3.1,2.4),vec2(4.1,3.7),.016,aa));v=max(v,bfLine(p,vec2(3.1,2.4),vec2(2.6,4.0),.016,aa));v=max(v,bfLine(p,vec2(.4,.5),vec2(1.35,3.2),.018,aa));}return v;}',
      'vec3 bfPaint(vec2 p,bool fore,bool dorsal,float edge,float aa,out float veinDepth){vec3 c;float mark=0.,vein=bfVeins(p,fore,aa);veinDepth=vein;'
    ];
    if(tiger){
      paint.push('c=mix('+rgb(0xd6b94f)+','+rgb(0xf1d878)+',clamp(p.x/7.,0.,1.));if(!dorsal)c=mix(c,'+rgb(0xe7d997)+',.32);');
      paint.push('float border=(1.-smoothstep((fore?.36:.57)-aa,(fore?.36:.57)+aa,edge))*smoothstep(.6,1.,p.x);');
      paint.push('if(fore){mark=max(mark,bfBand(p,vec2(.9,-1.6),vec2(.85,.42),.19,aa));mark=max(mark,bfBand(p,vec2(2.15,-3.1),vec2(1.95,-.23),.22,aa));mark=max(mark,bfBand(p,vec2(3.47,-4.15),vec2(2.92,-.78),.24,aa));mark=max(mark,bfBand(p,vec2(4.75,-4.7),vec2(4.25,-1.65),.26,aa));}else{mark=max(mark,bfBand(p,vec2(.58,.5),vec2(1.35,3.45),.22,aa));}');
      paint.push('c=mix(c,'+rgb(0x272921)+',max(border,max(mark,vein*.7)));');
      paint.push('if(fore){float spots=0.;spots=max(spots,bfOval(p,vec2(6.48,-4.06),vec2(.19,.24),.5,aa));spots=max(spots,bfOval(p,vec2(6.02,-3.19),vec2(.18,.23),.5,aa));spots=max(spots,bfOval(p,vec2(5.55,-2.33),vec2(.17,.22),.55,aa));spots=max(spots,bfOval(p,vec2(4.98,-1.48),vec2(.17,.2),.65,aa));spots=max(spots,bfOval(p,vec2(4.2,-.59),vec2(.18,.18),.8,aa));c=mix(c,'+rgb(0xf4dc87)+',spots);}');
      paint.push('else{float yellow=0.,blue=0.;yellow=max(yellow,bfOval(p,vec2(5.06,1.98),vec2(.20,.16),.8,aa));yellow=max(yellow,bfOval(p,vec2(4.75,2.95),vec2(.22,.14),.4,aa));yellow=max(yellow,bfOval(p,vec2(3.95,3.68),vec2(.23,.14),.0,aa));yellow=max(yellow,bfOval(p,vec2(2.5,3.99),vec2(.20,.14),-.3,aa));yellow=max(yellow,bfOval(p,vec2(1.67,3.68),vec2(.18,.13),-.5,aa));c=mix(c,'+rgb(0xf0d77f)+',yellow);blue=max(blue,bfOval(p,vec2(1.65,3.2),vec2(.17,.12),-.2,aa));blue=max(blue,bfOval(p,vec2(2.2,3.55),vec2(.22,.13),-.2,aa));blue=max(blue,bfOval(p,vec2(3.9,3.2),vec2(.18,.12),.2,aa));c=mix(c,dorsal?'+rgb(0x7899a0)+':'+rgb(0x8ea4a1)+',blue*.9);float orange=bfOval(p,vec2(1.24,3.02),vec2(.18,.22),-.35,aa);c=mix(c,'+rgb(0xd8954b)+',orange);}');
    }else if(lady){
      paint.push('c=mix(dorsal?'+rgb(0xb16e3c)+':'+rgb(0x9b684c)+',dorsal?'+rgb(0xe0a064)+':'+rgb(0xd89361)+',smoothstep(.45,4.7,p.x));float border=(1.-smoothstep(.19-aa,.19+aa,edge))*smoothstep(.65,1.1,p.x);');
      paint.push('if(fore){float apex=smoothstep(5.45-aa,5.65+aa,p.x-p.y*.48+.20*sin(p.y*2.6)+.08*sin(p.x*5.1));mark=max(apex,border);mark=max(mark,bfPigmentOval(p,vec2(1.64,-2.14),vec2(.47,.28),-.5,aa));mark=max(mark,bfPigmentOval(p,vec2(2.65,-2.45),vec2(.42,.27),.4,aa));mark=max(mark,bfPigmentLine(p,vec2(1.27,-.32),vec2(2.31,-1.5),.22,aa));mark=max(mark,bfPigmentLine(p,vec2(2.31,-1.5),vec2(3.53,-.87),.25,aa));c=mix(c,dorsal?'+rgb(0x38302b)+':'+rgb(0x6b6256)+',mark);float pale=0.;pale=max(pale,bfOval(p,vec2(4.38,-3.48),vec2(.56,.19),-.45,aa));pale=max(pale,bfOval(p,vec2(5.24,-3.53),vec2(.19,.17),0.,aa));pale=max(pale,bfOval(p,vec2(5.62,-2.84),vec2(.18,.19),0.,aa));pale=max(pale,bfOval(p,vec2(5.4,-2.03),vec2(.15,.20),.4,aa));pale=max(pale,bfOval(p,vec2(4.92,-1.42),vec2(.13,.16),.5,aa));c=mix(c,'+rgb(0xf0e4cc)+',pale);if(!dorsal)c=mix(c,'+rgb(0xc8bda2)+',bfOval(p,vec2(1.1,-.6),vec2(.65,.55),0.,aa)*.65);}');
      paint.push('else{if(!dorsal){float marble=bfNoise(p*3.4)+.22*sin(p.x*8.+sin(p.y*6.));c=mix('+rgb(0x746c5d)+','+rgb(0xc5b594)+',smoothstep(.18,.83,marble));float webPhase=p.y-1.15-.28*sin(p.x*2.1)-.07*sin(p.x*6.7);float band=(1.-smoothstep(max(0.,.025-aa),.065+aa,min(abs(webPhase),abs(webPhase-.8))))*smoothstep(.5,1.,p.x)*(1.-smoothstep(4.,4.7,p.x));c=mix(c,'+rgb(0xe0d3b6)+',max(band*.78,vein*.85));}else{c=mix(c,'+rgb(0x73503d)+',bfOval(p,vec2(1.15,1.0),vec2(.9,.65),.3,aa)*.7);c=mix(c,'+rgb(0x41332a)+',border);c=mix(c,'+rgb(0x5e4432)+',bfLine(p,vec2(1.45,2.4),vec2(3.9,1.0),.13,aa)*.5);}');
      // Painted lady: five dorsal spots and four separate ventral eyespots.
      // References: Wisconsin Horticulture and Missouri Conservation field guides.
      paint.push('if(dorsal){');
      [[4.48,1.35,.16],[4.67,2.22,.23],[4.15,3.15,.21],[3.26,3.73,.23],[2.24,3.64,.19]].forEach(function(s){
        paint.push('c=mix(c,'+rgb(0x3b332c)+',bfOval(p,vec2('+s[0]+','+s[1]+'),vec2('+s[2]+','+(s[2]*.91)+'),0.,aa));');
      });
      paint.push('}else{');
      [[4.55,1.45,.18],[4.68,2.42,.22],[3.95,3.4,.22],[2.65,3.8,.20]].forEach(function(s){
        var center='vec2('+s[0]+','+s[1]+')',r=s[2];
        paint.push('c=mix(c,'+rgb(0x574e43)+',bfOval(p,'+center+',vec2('+(r+.105)+','+(r+.09)+'),0.,aa));c=mix(c,'+rgb(0xd5c6a2)+',bfOval(p,'+center+',vec2('+(r+.065)+','+(r+.05)+'),0.,aa));c=mix(c,'+rgb(0x766849)+',bfOval(p,'+center+',vec2('+r+','+(r*.92)+'),0.,aa));c=mix(c,'+rgb(0x343934)+',bfOval(p,'+center+',vec2('+(r*.61)+','+(r*.56)+'),0.,aa));c=mix(c,'+rgb(0x849fa0)+',bfOval(p,'+center+',vec2('+(r*.27)+','+(r*.23)+'),0.,aa));');
      });
      paint.push('}');
      paint.push('}c=mix(c,'+rgb(0x6c5340)+',vein*(dorsal?.17:.05));');
    }else{
      paint.push('c=fore||dorsal?'+rgb(0xf1eee0)+':'+rgb(0xd1d2a0)+';c=mix('+rgb(0xd9d7c7)+',c,smoothstep(.1,2.1,p.x));if(!dorsal)c=mix(c,'+rgb(0xc3c995)+',bfNoise(p*6.)*.14);');
      paint.push('if(fore){if(dorsal){float cap=smoothstep(6.08-aa,6.32+aa,p.x-p.y*.39+.12*sin(p.y*2.1));c=mix(c,'+rgb(0x55564c)+',cap);}else{c=mix(c,'+rgb(0xd6d69f)+',smoothstep(5.1,6.6,p.x-p.y*.4));}float spots=max(bfPigmentOval(p,vec2(3.94,-1.92),vec2(.31,.30),-.15,aa),bfPigmentOval(p,vec2(3.08,-.56),vec2(.30,.28),.1,aa));c=mix(c,'+rgb(0x54554a)+',spots);}else if(dorsal){c=mix(c,'+rgb(0x66675a)+',bfOval(p,vec2(3.35,.54),vec2(.25,.18),.2,aa));}');
      paint.push('c=mix(c,'+rgb(0xabb193)+',vein*(dorsal?.14:.28));');
    }
    paint.push('return c;}');
    shader.fragmentShader=paint.join('\n')+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
      '#include <color_fragment>',
      'float bfWingMask=step(.5,bfKind);vec2 bfP=bfWingPoint.xz;float bfAA=max(.006,length(fwidth(bfP))*.65);',
      // Very small pigment irregularities soften ruler-straight ink boundaries
      // without relocating species identification marks or changing anatomy.
      'vec2 bfPaintP=bfP+vec2(sin(bfP.y*2.1+sin(bfP.x*.8))*.042,sin(bfP.x*2.3)*.028);',
      'float bfVeinDepth=0.;if(bfWingMask>.5)diffuseColor.rgb=bfPaint(bfPaintP,bfKind<1.5,bfFace>0.,bfEdge,bfAA,bfVeinDepth);',
      'vec2 bfFlow=vec2(bfP.x-.25,(bfP.y+.45)*.58);',
      'vec2 bfScaleUV=vec2(atan(bfFlow.y,bfFlow.x)*42.,length(bfFlow)*31.);',
      'float bfFine=(1.-smoothstep(.35,1.2,max(fwidth(bfScaleUV.x),fwidth(bfScaleUV.y))))*bfMeadowDetail;',
      'bfScaleUV.x+=mod(floor(bfScaleUV.y),2.)*.5;vec2 bfScaleCell=fract(bfScaleUV)-.5;',
      'float bfGrain=bfHash(floor(bfScaleUV));float bfLip=smoothstep(.18,.43,bfScaleCell.y+bfScaleCell.x*bfScaleCell.x*.68);',
      'float bfRib=.5+.5*cos(bfScaleCell.x*18.849556);',
      'float bfPigment=mix(.84,1.,smoothstep(.25,3.6,bfP.x))*(1.+(bfNoise(bfP*.85)-.5)*.09+(bfNoise(bfP*.32)-.5)*.055);',
      'float bfLightPigment=smoothstep(.07,.38,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));',
      'float bfSatin=1.+((bfGrain-.5)*.09-bfLip*.035+(bfRib-.5)*.018)*bfFine;',
      'diffuseColor.rgb*=mix(1.,bfSatin*mix(1.,bfPigment,bfLightPigment),bfWingMask);',
      'vec2 bfClusterUV=bfP*vec2(3.,2.6);',
      'float bfClusterResolve=1.-smoothstep(.35,1.2,max(fwidth(bfClusterUV.x),fwidth(bfClusterUV.y)));',
      'float bfClusterAmount=(bfNoise(bfClusterUV)*2.-1.)*bfClusterResolve*bfWingMask*bfLightPigment*(1.-clamp(bfVeinDepth,0.,1.));',
      'diffuseColor.rgb*=1.+.05*bfClusterAmount;',
      'vec2 bfBodyUV=vec2(bfWingPoint.x*67.+bfWingPoint.y*39.,bfWingPoint.z*35.);',
      'float bfBodyFine=(1.-smoothstep(.4,1.4,max(fwidth(bfBodyUV.x),fwidth(bfBodyUV.y))))*bfMeadowDetail;',
      'float bfFuzz=(.5+.5*sin(bfBodyUV.x*6.283185+sin(bfBodyUV.y*.62)))*(.62+.38*bfHash(floor(bfBodyUV)));',
      'diffuseColor.rgb*=1.+(bfFuzz-.4)*.08*(1.-bfWingMask)*bfBodyFine;'
    ].join('\n'));
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat bfMembraneRoughness=mix(.87,.80,bfLightPigment)+(bfGrain-.5)*.055*bfFine;bfMembraneRoughness-=.015*bfClusterAmount;bfMembraneRoughness=mix(bfMembraneRoughness,.70,bfVeinDepth*.65);roughnessFactor=clamp(mix(.94+(bfFuzz-.4)*.025*bfBodyFine,bfMembraneRoughness,bfWingMask),.70,.98);');
    // Relief exists only at resolvable scale: the wide meadow never sparkles.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',[
      '#include <normal_fragment_maps>',
      'float bfRelief=bfVeinDepth*.007*bfWingMask+((bfGrain-.5)*.0013-bfLip*.00065+(bfRib-.5)*.0003)*bfFine*bfWingMask+(bfFuzz-.4)*.00065*bfBodyFine*(1.-bfWingMask);',
      'vec3 bfDx=dFdx(-vViewPosition),bfDy=dFdy(-vViewPosition);',
      'vec3 bfBx=cross(bfDy,normal),bfBy=cross(normal,bfDx);float bfDet=dot(bfDx,bfBx);',
      'vec3 bfReliefNormal=abs(bfDet)*normal-sign(bfDet)*(dFdx(bfRelief)*bfBx+dFdy(bfRelief)*bfBy);',
      'normal=normalize(mix(normal,normalize(bfReliefNormal+normal*.000001),.24*bfWingMask*max(bfFine,.6)+.16*(1.-bfWingMask)*bfBodyFine));'
    ].join('\n'));
    // A small transmitted diffuse contribution follows real light direction.
    // Pale scales transmit gently; black markings and opaque bodies do not.
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',[
      '#include <lights_fragment_end>',
      'vec3 bfThroughLight=vec3(0.);float bfBackLight=0.;',
      '#if NUM_DIR_LIGHTS > 0',
      '#pragma unroll_loop_start',
      'for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {',
      'bfBackLight=pow(clamp((-dot(geometry.normal,directionalLights[i].direction)+.25)/1.25,0.,1.),1.5);',
      'bfThroughLight+=directionalLights[i].color*bfBackLight*.14;',
      '}',
      '#pragma unroll_loop_end',
      '#endif',
      'reflectedLight.directDiffuse+=clamp(diffuseColor.rgb,vec3(0.),vec3(1.))*bfThroughLight*(1.-.22*bfClusterAmount)*bfWingMask*bfLightPigment*(1.-clamp(bfVeinDepth,0.,1.));'
    ].join('\n'));
    // The same local attachment pocket leaves direct and transmitted light intact.
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',[
      '#include <aomap_fragment>',
      'float bfRootPocket=(1.-smoothstep(.35,1.45,bfP.x))*(1.-smoothstep(.85,1.8,abs(bfP.y-.10)));',
      'float bfRootMask=bfRootPocket*bfWingMask*bfLightPigment*(1.-clamp(bfVeinDepth,0.,1.));',
      'reflectedLight.indirectDiffuse*=1.-.12*bfRootMask;'
    ].join('\n'));
  };
  material.customProgramCacheKey=function(){return 'meadow-butterfly-'+speciesId+'-wing-root-depth-v8-pigment-fringes-v1'+(lady?'-ventral-cells-v1':'');};
  refineButterflyAnatomySurface(material,'bfWingPoint','step(.5,bfKind)');
  var outlines=tiger?[
    [[.25,-.55],[1.2,-2.45],[3.45,-4.15],[5.95,-5.15],[7.05,-4.75],[6.7,-3.6],[5.8,-2.0],[4.55,-.35],[2.65,.75],[.27,.7]],
    [[.28,.22],[2.05,-.02],[3.9,.65],[5.25,1.6],[5.1,2.6],[4.35,3.55],[3.7,3.92],[3.38,5.75],[3.13,6.02],[2.94,5.7],[3.04,3.98],[2.3,4.25],[1.42,3.7],[.65,2.52],[.25,1.15]]
  ]:lady?[
    [[.26,-.6],[1.18,-2.13],[3.05,-3.78],[5.7,-4.82],[6.65,-4.12],[6.48,-3.25],[5.94,-2.4],[5.45,-1.55],[4.5,-.65],[3.2,.32],[1.65,.82],[.25,.65]],
    [[.27,.18],[1.9,-.08],[3.55,.39],[4.85,1.2],[5.28,2.33],[4.91,3.2],[4.15,4.02],[3.15,4.38],[2.08,4.11],[1.17,3.35],[.53,2.28],[.25,1.05]]
  ]:[
    [[.25,-.58],[1.15,-2.22],[3.1,-3.87],[5.53,-4.55],[6.62,-3.96],[6.54,-2.89],[5.7,-1.55],[4.45,-.35],[2.9,.58],[1.32,.78],[.25,.58]],
    [[.25,.15],[1.76,-.15],[3.25,.15],[4.55,1.0],[5.04,2.25],[4.7,3.35],[3.7,4.08],[2.47,4.15],[1.36,3.5],[.57,2.28],[.24,1.03]]
  ];
  function wingGeometry(kind){
    var fore=kind===0,curve=new T.CatmullRomCurve3(outlines[kind].map(function(p){return new T.Vector3(p[0],0,p[1]);}),true,'centripetal');
    var boundary=curve.getSpacedPoints(low?40:88).slice(0,-1).map(function(p){return new T.Vector2(p.x,p.z);});
    boundary.forEach(function(p,i){
      // Protect the attachment and the swallowtail's existing tail outline.
      if(p.x<1.2||tiger&&!fore&&p.y>3.55&&p.x>2.75&&p.x<3.85)return;
      var cx=fore?2.65:2.45,cz=fore?-1.9:1.9,dx=p.x-cx,dz=p.y-cz,length=Math.hypot(dx,dz);
      var phase=i/boundary.length*Math.PI*2,trailing=fore?Math.max(0,Math.min(1,(p.y+p.x*.65+1.5)*1.2)):1;
      var scallops=fore?(white?7:9):(lady?10:8),depth=white?(fore?.012:.021):tiger?(fore?.029:.061):(fore?.038:.071);
      var wave=(1-Math.cos(phase*scallops+.2*Math.sin(phase*3)))*depth*(.84+.16*Math.sin(phase*5+.8))*trailing;
      if(length>.001){p.x-=dx/length*wave;p.y-=dz/length*wave;}
    });
    var indices=T.ShapeUtils.triangulateShape(boundary,[]),positions=[],normals=[],colors=[],kinds=[],faces=[],edges=[];
    function camber(x,z){return .32*Math.sin(x*Math.PI/7)+.04*Math.sin(z*.8)+(fore?.055:-.045)+butterflyWingDepth(x,z,fore,white?.62:lady?.85:1.06)[0];}
    function edgeDistance(p){var best=Infinity;for(var i=0;i<boundary.length;i++){var a=boundary[i],b=boundary[(i+1)%boundary.length],dx=b.x-a.x,dz=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(p.x-a.x-dx*t,p.y-a.y-dz*t));}return best;}
    function vertex(p,face){var depth=butterflyWingDepth(p.x,p.y,fore,white?.62:lady?.85:1.06),normal=new T.Vector3(-.32*Math.PI/7*Math.cos(p.x*Math.PI/7)-depth[1],1,-.032*Math.cos(p.y*.8)-depth[2]).normalize().multiplyScalar(face);positions.push(p.x,camber(p.x,p.y)+face*.012,p.y);normals.push(normal.x,normal.y,normal.z);colors.push(1,1,1);kinds.push(fore?1:2);faces.push(face);edges.push(edgeDistance(p));}
    function triangle(a,b,c,depth,face){if(depth){var ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);triangle(a,ab,ca,depth-1,face);triangle(ab,b,bc,depth-1,face);triangle(ca,bc,c,depth-1,face);triangle(ab,bc,ca,depth-1,face);return;}var cross=(b.y-a.y)*(c.x-a.x)-(b.x-a.x)*(c.y-a.y);if(cross*face<0){var swap=b;b=c;c=swap;}vertex(a,face);vertex(b,face);vertex(c,face);}
    [1,-1].forEach(function(face){indices.forEach(function(ids){triangle(boundary[ids[0]],boundary[ids[1]],boundary[ids[2]],low?1:2,face);});});
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('bfWingKind',new T.Float32BufferAttribute(kinds,1));g.setAttribute('bfWingFace',new T.Float32BufferAttribute(faces,1));g.setAttribute('bfWingEdge',new T.Float32BufferAttribute(edges,1));g.computeBoundingBox();g.computeBoundingSphere();g.name=speciesId+'-'+(fore?'forewing':'hindwing');return g;
  }
  var foreGeometry=wingGeometry(0),hindGeometry=wingGeometry(1);
  [-1,1].forEach(function(side){var label=side<0?'left':'right',pivot=new T.Group(),trailing=new T.Group();pivot.name='butterfly-wing-'+label;trailing.name='butterfly-hindwing-pivot-'+label;pivot.position.x=side*.12;root.add(pivot);pivot.add(trailing);wings.push(pivot);hindWings.push(trailing);var fore=new T.Mesh(foreGeometry,material),hind=new T.Mesh(hindGeometry,material);fore.name='butterfly-forewing-'+label;hind.name='butterfly-hindwing-'+label;fore.scale.x=side;hind.scale.x=side;pivot.add(fore);trailing.add(hind);});
  var bodyPositions=[],bodyNormals=[],bodyColors=[],sphere=new T.SphereGeometry(1,low?7:14,low?5:10),transform=new T.Object3D(),normalMatrix=new T.Matrix3(),point=new T.Vector3(),normal=new T.Vector3();
  function bake(geometry,hex,x,y,z,sx,sy,sz,ry,abdomen){transform.position.set(x||0,y||0,z||0);transform.scale.set(sx||1,sy||1,sz||1);transform.rotation.set(0,ry||0,0);transform.updateMatrix();normalMatrix.getNormalMatrix(transform.matrix);var p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index,c=color(hex),count=index?index.count:p.count;for(var i=0;i<count;i++){var v=index?index.getX(i):i;point.fromBufferAttribute(p,v).applyMatrix4(transform.matrix);normal.fromBufferAttribute(n,v).applyMatrix3(normalMatrix).normalize();if(abdomen)contourButterflyAbdomen(point,normal);bodyPositions.push(point.x,point.y,point.z);bodyNormals.push(normal.x,normal.y,normal.z);var tone=1;if(z>0&&sz>1)tone=.88+.12*Math.sin(point.z*16.);bodyColors.push(c.r*tone,c.g*tone,c.b*tone);}}
  var clubGeometry=butterflyClubGeometry(T,sphere);
  function blob(hex,x,y,z,sx,sy,sz,ry,abdomen){bake(sphere,hex,x,y,z,sx,sy,sz,ry,abdomen);}
  function tube(points,radius,hex,segments,abdomen){var path=new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3(p[0],p[1],p[2]);})),geometry=new T.TubeGeometry(path,low?Math.max(3,Math.round(segments*.4)):segments,radius,low?3:5,false);if(points.length===4)taperButterflyLimb(geometry,path);bake(geometry,hex,0,0,0,1,1,1,0,abdomen);geometry.dispose();}
  var bodyTone=tiger?0x383a2a:lady?0x655446:0x9d9e84,limbTone=tiger?0x3a3b2c:lady?0x55483a:0x8c9075;
  blob(bodyTone,0,-.02,-.43,white?.32:.40,white?.32:.37,.88);blob(bodyTone,0,-.025,1.22,white?.25:.30,.27,1.58,0,true);blob(bodyTone,0,.01,-1.43,.33,.31,.36);
  [-1,1].forEach(function(side){
    if(tiger){tube([[side*.24,.12,-1.06],[side*.32,.15,-.3],[side*.23,.08,1.4],[side*.14,.04,2.5]],.045,0xc8b55d,12,true);}
    tube([[side*.16,.19,-1.62],[side*.29,.44,-2.05],[side*.48,.61,-2.57],[side*.64,.64,-2.95]],white?.03:.034,limbTone,12);bake(clubGeometry,limbTone,side*.64,.64,-2.95,.062,.066,.19,side*-.25);
    if(lady)tube([[side*.24,-.17,-.94],[side*.36,-.33,-1.1],[side*.25,-.43,-.75]],.03,limbTone,8);
    else tube([[side*.24,-.17,-.94],[side*.51,-.46,-1.18],[side*.76,-.83,-1.14],[side*.82,-.88,-1.33]],.026,limbTone,10);
    tube([[side*.32,-.19,-.42],[side*.58,-.48,-.13],[side*.96,-.86,.27],[side*1.02,-.88,.51]],.027,limbTone,11);
    tube([[side*.28,-.19,.19],[side*.59,-.48,.78],[side*.84,-.81,1.4],[side*.84,-.84,1.67]],.026,limbTone,11);
  });
  clubGeometry.dispose();
  var bodyGeometry=new T.BufferGeometry();bodyGeometry.setAttribute('position',new T.Float32BufferAttribute(bodyPositions,3));bodyGeometry.setAttribute('normal',new T.Float32BufferAttribute(bodyNormals,3));bodyGeometry.setAttribute('color',new T.Float32BufferAttribute(bodyColors,3));['bfWingKind','bfWingFace','bfWingEdge'].forEach(function(name){bodyGeometry.setAttribute(name,new T.Float32BufferAttribute(new Float32Array(bodyPositions.length/3),1));});bodyGeometry.computeBoundingBox();bodyGeometry.computeBoundingSphere();bodyGeometry.name=speciesId+'-anatomy';var body=new T.Mesh(bodyGeometry,material);body.name='butterfly-body';root.add(body);
  var eyeMaterial=butterflyEyeMaterial(T,color(tiger?0x33362c:lady?0x554737:0x777c58),low);
  [-1,1].forEach(function(side){var eye=new T.Mesh(sphere,eyeMaterial);eye.name='butterfly-eye-'+(side<0?'left':'right');eye.position.set(side*.28,.025,-1.46);eye.scale.set(.14,.19,.19);eye.rotation.y=side*.18;root.add(eye);});
  root.userData.anatomy={forewings:2,hindwings:2,antennae:2,legs:6,reducedForelegs:lady,coiledProboscis:false};
  root.userData.proboscisOrigin=[0,-.17,-1.68];root.userData.middleFeet=[[-1.02,-.88,.51],[1.02,-.88,.51]];
  root.traverse(function(object){if(object.isMesh){object.userData.speciesId=speciesId;object.geometry.userData.speciesId=speciesId;}});
  return {root:root,wings:wings,hindWings:hindWings};
}


function buildWorld(T,kit) {
    // Haze is set per camera in draw(): close views keep a soft distance, the
    // overview pushes it back so the whole meadow reads as a map.
    var scene=new T.Scene();scene.background=new T.Color(0xdde3d1);scene.fog=new T.Fog(0xdde3d1,125,360);
    // A broad sky fill keeps shaded foliage readable; the softer sun still
    // models the flowers and wings without making vegetation look hard-edged.
    var skyFill=new T.HemisphereLight(0xe3edf3,0x62714d,.82);skyFill.name='meadow-sky-fill';scene.add(skyFill);
    var sun=new T.DirectionalLight(0xfff1dc,1);sun.name='meadow-sun';sun.position.set(-90,115,-55);scene.add(sun);
    var reflectedLight=new T.DirectionalLight(0xd8e7e9,.18);reflectedLight.position.set(65,45,75);scene.add(reflectedLight);
    var materialCache={},breeze={value:0},windStrength={value:1},plantWind={value:1};
    function mat(color,extra){var key=color+JSON.stringify(extra||{});return materialCache[key]||(materialCache[key]=new T.MeshStandardMaterial(Object.assign({color:new T.Color(color).convertSRGBToLinear(),roughness:.96},extra||{})));}
    function mesh(geo,m,x,y,z,sx,sy,sz,parent){var o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx||1,sy||1,sz||1);(parent||scene).add(o);return o;}
    function hash(n){var h=Math.sin(n*127.1+311.7)*43758.5453;return h-Math.floor(h);}
    function linear(color){return new T.Color(color).convertSRGBToLinear();}
    // One spatial wind field travels through grass, flower stems and woodland.
    // Simulation time is the only clock: pausing freezes every layer together.
    var windGLSL='uniform float bfBreeze;uniform float bfWindStrength;\nfloat bfMeadowGust(vec2 p){float phase=bfBreeze*.78-p.x*.035-p.y*.022;float swell=.72+.28*sin(bfBreeze*.23-p.x*.009+p.y*.013);return (sin(phase)*swell+.22*sin(bfBreeze*1.67-p.x*.061+p.y*.047))*bfWindStrength;}\n';
    function plantDisplacement(x,y,z){
      var t=breeze.value,phase=t*.78-x*.035-z*.022,swell=.72+.28*Math.sin(t*.23-x*.009+z*.013);
      var gust=(Math.sin(phase)*swell+.22*Math.sin(t*1.67-x*.061+z*.047))*windStrength.value*plantWind.value;
      var bend=.009*Math.max(0,y)*Math.max(0,y)*gust;
      return {x:bend,z:bend*.46};
    }
    function vegetationWind(material,kind){
      if(material.userData.meadowWind)return material;
      material.userData.meadowWind=kind;
      var surface=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
      material.onBeforeCompile=function(shader){
        surface.call(material,shader);
        shader.uniforms.bfBreeze=breeze;shader.uniforms.bfWindStrength=windStrength;shader.uniforms.bfPlantWind=plantWind;
        shader.vertexShader=windGLSL+[
          "uniform float bfPlantWind;",
          "vec2 bfMeadowGustGradient(vec2 p){",
          "float bfPhase=bfBreeze*.78-p.x*.035-p.y*.022;",
          "float bfSwellPhase=bfBreeze*.23-p.x*.009+p.y*.013;",
          "float bfSwell=.72+.28*sin(bfSwellPhase);",
          "float bfFirst=cos(bfPhase)*bfSwell;",
          "float bfSwellSlope=.28*sin(bfPhase)*cos(bfSwellPhase);",
          "float bfSecond=.22*cos(bfBreeze*1.67-p.x*.061+p.y*.047);",
          "return vec2((-.035*bfFirst-.009*bfSwellSlope-.061*bfSecond)*bfWindStrength,(-.022*bfFirst+.013*bfSwellSlope+.047*bfSecond)*bfWindStrength);",
          "}",
          "vec3 bfMeadowWindNormal(vec3 n,vec3 gradient,vec3 direction){",
          "float bfProjection=dot(direction,n)/(1.+dot(direction,gradient));",
          "return vec3(n.x-gradient.x*bfProjection,n.y-gradient.y*bfProjection,n.z-gradient.z*bfProjection);",
          "}",
          "vec3 bfMeadowFlutterGradient(vec3 p,float height){",
          "float bfFlutterPhase=bfBreeze*2.7+p.x*.4-p.z*.32;",
          "float bfFlutterEnvelope=smoothstep(0.,2.,height);",
          "float bfFlutterSlope=clamp(height*.5,0.,1.);",
          "float bfFlutterCos=cos(bfFlutterPhase)*bfWindStrength*bfFlutterEnvelope;",
          "return vec3(.4*bfFlutterCos,sin(bfFlutterPhase)*bfWindStrength*3.*bfFlutterSlope*(1.-bfFlutterSlope),-.32*bfFlutterCos);",
          "}"
        ].join('\n')+'\n'+shader.vertexShader;
        // Bending in world space keeps stems, attached leaves and flower heads
        // continuous, including instanced parts, without per-frame matrix uploads.
        var bend=kind==='plant'?'float bfBend=.009*bfHeight*bfHeight*bfGust*bfPlantWind;':
          'float bfBend=.0016*bfHeight*bfHeight*bfGust;';
        var flutter=kind==='canopy'?'bfWorld.xz+=vec2(.025,.018)*sin(bfBreeze*2.7+bfWorld.x*.4-bfWorld.z*.32)*bfWindStrength*smoothstep(0.,2.,bfHeight);':'';
        // Each wind step is a rank-one warp. Its inverse transpose transports
        // the already transformed normal, including the leaf's own local flex.
        var normalMask=kind==='plant'?'bfWindStrength>0.&&bfPlantWind>0.':'bfWindStrength>0.';
        var normalAnchor='\n#ifndef FLAT_SHADED\nvec3 bfWindBase=bfWorld.xyz;\n#endif\n';
        var normalLoad=kind==='plant'?'.009*bfPlantWind':'.0016';
        var normalFlutter=kind==='canopy'?'vec3 bfFlutterBase=bfWindBase+vec3(bfBend,0.,bfBend*.46);bfWindNormal=bfMeadowWindNormal(bfWindNormal,bfMeadowFlutterGradient(bfFlutterBase,bfHeight),vec3(.025,0.,.018));':'';
        var windNormal='\n#ifndef FLAT_SHADED\nif('+normalMask+'){vec3 bfWindNormal=(vec4(transformedNormal,0.)*viewMatrix).xyz;vec2 bfWindSlope=bfMeadowGustGradient(bfWindBase.xz);float bfWindLoad='+normalLoad+';vec3 bfBendGradient=vec3(bfWindLoad*bfHeight*bfHeight*bfWindSlope.x,bfWindLoad*2.*bfHeight*bfGust,bfWindLoad*bfHeight*bfHeight*bfWindSlope.y);bfWindNormal=bfMeadowWindNormal(bfWindNormal,bfBendGradient,vec3(1.,0.,.46));'+normalFlutter+'transformedNormal=mat3(viewMatrix)*bfWindNormal;vNormal=normalize(transformedNormal);}\n#endif\n';
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
          'vec4 mvPosition=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nmvPosition=instanceMatrix*mvPosition;\n#endif\nvec4 bfWorld=modelMatrix*mvPosition;float bfHeight=max(0.,bfWorld.y);float bfGust=bfMeadowGust(bfWorld.xz);'+normalAnchor+bend+'bfWorld.xz+=vec2(bfBend,bfBend*.46);'+flutter+windNormal+'mvPosition=viewMatrix*bfWorld;gl_Position=projectionMatrix*mvPosition;');
      };
      material.customProgramCacheKey=function(){return cacheKey+'-meadow-breeze-'+kind+'-normals-v2';};
      return material;
    }

    function dataGeometry(data){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
      var colors=data.colors;if(data.tones){colors=[];data.tones.forEach(function(t){var c=linear(t);colors.push(c.r,c.g,c.b);});}
      if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
    var sphere=new T.SphereGeometry(1,10,7),cylinder=new T.CylinderGeometry(.68,1,1,7),plane=new T.PlaneGeometry(1,1);
    // One soft shadow plane per plant or tree holds both its rooted contact
    // and its loose foliage silhouette. Sun projection follows the light preset;
    // breeze uses the same frozen/reduced-motion clock as the living foliage.
    var shadowCast={value:new T.Vector2(90/115,55/115)},shadowStrength={value:1},shadowColor={value:linear(0x3c4f36)};
    var shadeMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:true,
      uniforms:Object.assign(T.UniformsUtils.merge([T.UniformsLib.fog]),{bfBreeze:breeze,bfWindStrength:windStrength,bfPlantWind:plantWind,bfShadowCast:shadowCast,bfShadowStrength:shadowStrength,bfShadowColor:shadowColor}),
      vertexShader:[windGLSL,
        'uniform float bfPlantWind;uniform vec2 bfShadowCast;',
        'varying vec2 vShadePoint;varying vec2 vShadeCast;varying vec2 vShadeSeed;varying float vShadeCanopy;varying float vShadeRustle;varying vec2 vShadeRootPoint;varying vec2 vShadeTrunkCast;',
        '#include <fog_pars_vertex>',
        'void main(){mat4 shadowMatrix=modelMatrix;',
        '#ifdef USE_INSTANCING',
        'shadowMatrix=modelMatrix*instanceMatrix;',
        '#endif',
        'vec4 anchor=shadowMatrix*vec4(0.,0.,0.,1.);vec4 p=shadowMatrix*vec4(position,1.);',
        'vec2 size=max(vec2(.01),vec2(length(shadowMatrix[0].xyz),length(shadowMatrix[1].xyz)));',
        // A plane has no local Z extent: its unused depth scale carries the
        // occluder height through the existing instance matrix, without buffers.
        'float height=length(shadowMatrix[2].xyz);vShadeCanopy=smoothstep(7.,12.,size.x);',
        'float gust=bfMeadowGust(anchor.xz);float sway=mix(.009*bfPlantWind,.0016,vShadeCanopy)*height*height*gust;',
        'vec2 shadowOffset=bfShadowCast*height+vec2(sway,sway*.46);',
        // Enclose the root and projected crown. The mask, rather than this
        // rectangle, defines every soft edge visible on the meadow floor.
        'vec2 corner=vec2(sign(position.x),-sign(position.y));p.xz+=shadowOffset*.5+corner*abs(shadowOffset)*.5;',
        'vShadePoint=(p.xz-anchor.xz)/size*2.;vShadeCast=shadowOffset/size*2.;vShadeSeed=anchor.xz*.071;',
        // Root contact follows the actual trunk flare rather than crown width.
        'float rootRadius=max(.01,(.49+height/.78*.011)*1.18);vShadeRootPoint=(p.xz-anchor.xz)/rootRadius;vShadeTrunkCast=shadowOffset*.78/rootRadius;',
        'vShadeRustle=gust*.045*mix(bfPlantWind,1.,vShadeCanopy);',
        'vec4 mvPosition=viewMatrix*p;gl_Position=projectionMatrix*mvPosition;',
        '#include <fog_vertex>',
        '}'
      ].join('\n'),
      fragmentShader:[
        'uniform float bfShadowStrength;uniform vec3 bfShadowColor;',
        'varying vec2 vShadePoint;varying vec2 vShadeCast;varying vec2 vShadeSeed;varying float vShadeCanopy;varying float vShadeRustle;varying vec2 vShadeRootPoint;varying vec2 vShadeTrunkCast;',
        'float shadeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float shadeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(shadeHash(i),shadeHash(i+vec2(1.,0.)),f.x),mix(shadeHash(i+vec2(0.,1.)),shadeHash(i+vec2(1.,1.)),f.x),f.y);}',
        '#include <fog_pars_fragment>',
        'void main(){vec2 p=vShadePoint,q=p-vShadeCast*.78;',
        'vec2 irregular=vec2(shadeHash(vShadeSeed),shadeHash(vShadeSeed+7.))-.5;',
        'vec2 a=q-vec2(.25,.04)-irregular*.16,b=q+vec2(.22,.13)-irregular*.13;',
        'float lobes=exp(-4.5*dot(q,q))*.6+exp(-8.*dot(a,a))*.24+exp(-7.*dot(b,b))*.24;',
        'float dappleNoise=shadeNoise(q*5.2+vShadeSeed+vec2(vShadeRustle,-vShadeRustle*.5));',
        'float canopyResolve=1.-smoothstep(.025,.16,length(fwidth(q)));',
        'float canopyDapple=mix(.86,.43+.86*smoothstep(.25,.75,dappleNoise),canopyResolve);',
        'float dapple=mix(.72+.28*dappleNoise,canopyDapple,vShadeCanopy);',
        'float root=exp(-58.*dot(p,p))*.17;',
        'float treeContact=.3*(1.-smoothstep(.4,1.8,length(vShadeRootPoint)));',
        'root=mix(root,treeContact,vShadeCanopy);',
        'float crown=lobes*dapple*mix(.16,.25,vShadeCanopy)*(1.-smoothstep(.82,1.,length(q)));',
        // A tapered shaft bridges the rooted contact and projected crown.
        // Root-space distances keep its width tied to the trunk, while
        // the increasing penumbra makes the upper shade gentler.
        'float trunkT=clamp(dot(vShadeRootPoint,vShadeTrunkCast)/max(.001,dot(vShadeTrunkCast,vShadeTrunkCast)),0.,1.);',
        'float trunkDistance=length(vShadeRootPoint-vShadeTrunkCast*trunkT);',
        'float trunkPixel=length(fwidth(vShadeRootPoint));',
        'float trunkRadius=mix(.91,.46,trunkT),trunkSoftness=.12+.36*trunkT+min(.6,trunkPixel*.5);',
        'float trunk=.18*(1.-smoothstep(max(0.,trunkRadius-trunkSoftness),trunkRadius+trunkSoftness,trunkDistance))*(1.-smoothstep(.72,1.,trunkT))*min(1.,2.*trunkRadius/max(.001,trunkPixel))*vShadeCanopy;',
        'float alpha=(root+crown+trunk*(1.-clamp(root+crown,0.,1.)))*bfShadowStrength;',
        'if(alpha<.001)discard;gl_FragColor=vec4(bfShadowColor,alpha);',
        '#include <tonemapping_fragment>',
        '#include <encodings_fragment>',
        '#include <fog_fragment>',
        '}'
      ].join('\n')
    });
    // Filtered woodland dapple opens soft light gaps and settles to its mean in the distance.
    shadeMaterial.extensions={derivatives:true};
    shadeMaterial.name='meadow-soft-shadows';
    // Woodland shadows sit just above their ground; flower beds retain their raised level.
    function contactShade(x,z,width,depth,parent,height){var shadeY=width*1.28>=12?-.055:.031,shade=mesh(plane,shadeMaterial,x,shadeY,z,width*1.28,depth*1.28,height||.5,parent);shade.rotation.x=-Math.PI/2;return shade;}
    // A texture-free sky retains a soft horizon at every camera angle.
    var sky=new T.Mesh(new T.SphereGeometry(470,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
      uniforms:{zenith:{value:linear(0x75b6d9)},horizon:{value:linear(0xeee6d1)},cloud:{value:linear(0xfff8e7)},sunDirection:{value:new T.Vector3(-90,115,-55).normalize()},skyClock:breeze},
      vertexShader:'varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;uniform vec3 cloud;uniform vec3 sunDirection;uniform float skyClock;varying vec3 vSky;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec3 d=normalize(vSky);float y=max(d.y,0.);vec3 c=mix(horizon,zenith,pow(y,.44));vec2 p=d.xz/(.18+y)*2.5+vec2(skyClock*.008,skyClock*.003);float n=.56*noise(p)+.28*noise(p*2.12)+.16*noise(p*4.03);float banks=smoothstep(.49,.76,n)*smoothstep(.008,.1,y)*(1.-smoothstep(.38,.8,y));float wisps=smoothstep(.63,.84,noise(p*vec2(.7,3.8)))*smoothstep(.13,.3,y)*(1.-smoothstep(.6,.96,y));float cloudLight=.86+.14*noise(p+vec2(1.7,-.4));c=mix(c,cloud*cloudLight,banks*.8+wisps*.15);float sun=max(dot(d,sunDirection),0.);c+=vec3(1.,.74,.39)*pow(sun,18.)*.15+vec3(1.,.9,.69)*pow(sun,1000.)*.7;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
    }));sky.name='meadow-sky';sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
    // Sky is effectively distant: keep the dome around each rendered camera.
    // Otherwise views near the woodland clip its far wall into a pale polygon.
    // Local sky directions stay fixed, so turning never rotates the clouds.
    sky.onBeforeRender=function(renderer,renderedScene,renderedCamera){renderedCamera.getWorldPosition(sky.position);sky.updateMatrixWorld(true);};
    var currentLight='';
    function setLight(mode){
      var golden=mode==='golden',key=golden?'golden':'daylight';if(currentLight===key)return;currentLight=key;scene.userData.meadowLight=key;
      skyFill.color.setHex(golden?0xd9dfed:0xe3edf3);skyFill.groundColor.setHex(golden?0x706446:0x62714d);skyFill.intensity=golden?.68:.82;
      sun.color.setHex(golden?0xffc88b:0xfff1dc);sun.intensity=golden?1.1:1;sun.position.set(-90,golden?48:115,-55);
      shadowCast.value.set(-sun.position.x/sun.position.y,-sun.position.z/sun.position.y);shadowStrength.value=golden?.94:1;shadowColor.value.copy(linear(golden?0x414b3b:0x3c4f36));
      reflectedLight.color.setHex(golden?0xc8d5e7:0xd8e7e9);reflectedLight.intensity=golden?.22:.18;
      sky.material.uniforms.zenith.value.copy(linear(golden?0x7fa5c1:0x75b6d9));sky.material.uniforms.horizon.value.copy(linear(golden?0xf5d9b2:0xeee6d1));sky.material.uniforms.cloud.value.copy(linear(golden?0xffe3bb:0xfff8e7));sky.material.uniforms.sunDirection.value.copy(sun.position).normalize();
      scene.fog.color.setHex(golden?0xe6d4b7:0xdde3d1);scene.background.copy(scene.fog.color);
    }
    setLight('daylight');
    function groundColor(x,z){var t=.5+.23*Math.sin(x*.045+z*.024)+.16*Math.cos(z*.083-x*.019)+.1*Math.sin(x*.3)*Math.cos(z*.29);return linear(0x354d2b).lerp(linear(0x61713b),Math.max(0,Math.min(1,t)));}
    var ground=new T.PlaneGeometry(620,620,40,40),groundColors=[],gp=ground.attributes.position;
    // Stretch only the outer ground rows beneath the distant hills. The central
    // meadow retains its exact grid, while buried hill bases remain occluded.
    function groundEdge(value){var distance=Math.abs(value);return distance<=248?value:Math.sign(value)*(248+(distance-248)*6);}
    for(var gi=0;gi<gp.count;gi++){var gx=groundEdge(gp.getX(gi)),gy=groundEdge(gp.getY(gi));gp.setXY(gi,gx,gy);var gc=groundColor(gx,-gy);groundColors.push(gc.r,gc.g,gc.b);}
    ground.name='meadow-ground-surface';
    ground.setAttribute('color',new T.Float32BufferAttribute(groundColors,3));
    // Ground detail stays in one material: soft clumps and tiny grass strokes
    // make the space between the 3D blades read as turf without more geometry.
    var groundMaterial=mat(0xffffff,{vertexColors:true,roughness:1});groundMaterial.extensions={derivatives:true};
    groundMaterial.onBeforeCompile=function(shader){
      shader.vertexShader='varying vec3 bfGroundPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfGroundPosition=(modelMatrix*vec4(position,1.)).xyz;');
      shader.fragmentShader='varying vec3 bfGroundPosition;\nfloat bfSoilHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat bfSoilNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bfSoilHash(i),bfSoilHash(i+vec2(1.,0.)),f.x),mix(bfSoilHash(i+vec2(0.,1.)),bfSoilHash(i+vec2(1.,1.)),f.x),f.y);}\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 bfSoil=bfGroundPosition.xz;float bfClump=bfSoilNoise(bfSoil*.38);float bfFine=bfSoilNoise(bfSoil*vec2(5.5,2.1));float bfSoilResolve=1.-smoothstep(.025,.19,length(fwidth(bfSoil)));diffuseColor.rgb*=.80+.23*bfClump+.10*mix(.5,bfFine,bfSoilResolve);vec2 bfThatchPoint=bfSoil*vec2(15.,3.)+vec2(sin(bfSoil.y*1.2)*1.1,sin(bfSoil.x*.8)*.7);float bfThatch=bfSoilNoise(bfThatchPoint);diffuseColor.rgb*=.96+.08*mix(.5,bfThatch,bfSoilResolve);float bfDry=smoothstep(.68,.91,bfSoilNoise(bfSoil*.19+7.));diffuseColor.rgb+=vec3(.015,.009,.003)*bfDry;');
    };
    // Very low turf relief catches grazing light; it stays below the blades
    // and fades with distance so the overview does not acquire noisy speckles.
    var groundSurface=groundMaterial.onBeforeCompile;
    groundMaterial.onBeforeCompile=function(shader){
      groundSurface(shader);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat bfTurfRelief=(bfClump*.026+bfFine*.005)*bfSoilResolve;vec3 bfSoilDx=dFdx(-vViewPosition),bfSoilDy=dFdy(-vViewPosition),bfSoilBx=cross(bfSoilDy,normal),bfSoilBy=cross(normal,bfSoilDx);float bfSoilDet=dot(bfSoilDx,bfSoilBx);vec3 bfSoilSlope=sign(bfSoilDet)*(dFdx(bfTurfRelief)*bfSoilBx+dFdy(bfTurfRelief)*bfSoilBy)/max(abs(bfSoilDet),.000001);normal=normalize(normal-bfSoilSlope*min(1.,.12/max(.0001,length(bfSoilSlope))));');
    };
    groundMaterial.customProgramCacheKey=function(){return 'butterfly-meadow-ground-turf-v3';};
    mesh(ground,groundMaterial,0,-.06,0).rotation.x=-Math.PI/2;
    // Distant rolling ground stays below the meadow's flat, inspectable habitat.
    // Concentrate the mesh on the visible upper slopes. The open base remains
    // buried, while a finer horizon prevents broad hills looking like polygons.
    function rollingRidge(variant){
      // Preserve the horizon's angular resolution while using fewer rows on
      // the distant slopes; the saved detail rounds the foreground leaves.
      var ridge=new T.SphereGeometry(1,48,11,0,Math.PI*2,0,Math.PI/2),positions=ridge.attributes.position,tones=[];
      ridge.name='rolling-meadow-hill';ridge.userData.ridgeVariant=variant;
      for(var vertex=0;vertex<positions.count;vertex++){
        var x=positions.getX(vertex),y=positions.getY(vertex),z=positions.getZ(vertex),upper=Math.pow(Math.max(0,y),1.4);
        // Broad folds and a shallow saddle break the repeated dome outline.
        // The buried base and the playable meadow stay fixed.
        var phase=variant*1.71,fold=.075*Math.sin(x*4.6+z*1.8+phase)+.04*Math.cos(z*5.3-x*2.1+phase);
        var saddle=.12*Math.exp(-Math.pow((x-.12+variant*.11)*2.7,2)-Math.pow((z+.14)*1.4,2));
        positions.setXYZ(vertex,x+.065*Math.sin(z*3.2+phase)*upper,y+(fold-saddle)*upper,z+.045*Math.sin(x*4.1-phase)*upper);
        var tone=.88+.07*y+.035*Math.sin(x*4.1-z*3.3+phase);tones.push(tone*.98,tone,tone*.94);
      }
      ridge.setAttribute('color',new T.Float32BufferAttribute(tones,3));ridge.computeVertexNormals();
      // Average coincident pole/seam normals after shaping the slope so the
      // closed azimuth has one light response without a visible radial crease.
      var normals=ridge.attributes.normal,joined=new Map(),keys=[];
      for(var vertex=0;vertex<positions.count;vertex++){
        var key=[positions.getX(vertex),positions.getY(vertex),positions.getZ(vertex)].map(function(value){return Math.round(value*1e6);}).join(':');keys.push(key);
        if(!joined.has(key))joined.set(key,new T.Vector3());joined.get(key).add(new T.Vector3().fromBufferAttribute(normals,vertex));
      }
      joined.forEach(function(normal){normal.normalize();});
      for(var vertex=0;vertex<positions.count;vertex++){var normal=joined.get(keys[vertex]);normals.setXYZ(vertex,normal.x,normal.y,normal.z);}
      // Only the hill faces buried beneath the meadow are omitted. Keep every
      // upper slope, its authored normals and the existing horizon unchanged.
      // At the maximum height scale of 42, local Y below .44 is below -.52
      // in the world; these faces remain covered by the wide ground surface.
      var ridgeIndices=ridge.index.array,visibleSlopeIndices=[];
      for(var face=0;face<ridgeIndices.length;face+=3){
        var a=ridgeIndices[face],b=ridgeIndices[face+1],c=ridgeIndices[face+2];
        if(positions.getY(a)<.44&&positions.getY(b)<.44&&positions.getY(c)<.44)continue;
        visibleSlopeIndices.push(a,b,c);
      }
      ridge.setIndex(visibleSlopeIndices);
      return ridge;
    }
    var rollingHills=[rollingRidge(0),rollingRidge(1),rollingRidge(2)];
    function hillMaterial(hex){
      var m=new T.MeshStandardMaterial({color:linear(hex),vertexColors:true,roughness:1});m.extensions={derivatives:true};
      m.onBeforeCompile=function(shader){
        shader.vertexShader='varying vec3 bfHillPoint;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 bfHillLocal=vec4(position,1.);\n#ifdef USE_INSTANCING\nbfHillLocal=instanceMatrix*bfHillLocal;\n#endif\nbfHillPoint=(modelMatrix*bfHillLocal).xyz;');
        shader.fragmentShader='varying vec3 bfHillPoint;float bfHillHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float bfHillNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bfHillHash(i),bfHillHash(i+vec2(1.,0.)),f.x),mix(bfHillHash(i+vec2(0.,1.)),bfHillHash(i+vec2(1.,1.)),f.x),f.y);}\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 bfSlope=bfHillPoint.xz;float bfBroad=.66*bfHillNoise(bfSlope*.025)+.34*bfHillNoise(bfSlope*.061+9.);float bfWoodland=smoothstep(.48,.72,bfBroad)*(1.-smoothstep(9.,25.,bfHillPoint.y)*.48);float bfDry=smoothstep(.62,.84,bfHillNoise(bfSlope*.037+23.));float bfGrainResolve=1.-smoothstep(.18,.9,length(fwidth(bfSlope)));float bfGrain=mix(.5,bfHillNoise(bfSlope*.95),bfGrainResolve);diffuseColor.rgb*=.88+.2*bfBroad+.055*bfGrain;diffuseColor.rgb*=mix(vec3(1.),vec3(.73,.84,.72),bfWoodland*.7);diffuseColor.rgb+=vec3(.019,.012,.003)*bfDry;');
      };
      m.customProgramCacheKey=function(){return 'butterfly-textured-rolling-hills-v1';};return m;
    }
    var hillMaterials=[hillMaterial(0x708453),hillMaterial(0x7e8e5f)];
    // Keep rising slopes beyond the rooted woodland and its soft ground shade.
    // Shared meshes retain their height and horizontal proportions farther away.
    var hillDistanceScale=1.5;
    for(var hill=0;hill<11;hill++){
      var ha=hill*2.39996,range=(268+(hash(hill+531)-.5)*18)*hillDistanceScale;
      var ridge=mesh(rollingHills[hill%3],hillMaterials[hill%2],Math.cos(ha)*range,-19,Math.sin(ha)*range,(91+hash(hill+532)*27)*hillDistanceScale,25+hash(hill+8)*17,(69+hash(hill+533)*15)*hillDistanceScale);
      ridge.rotation.y=ha*.7+hash(hill+534)*.8;
    }
    function pathX(z){return meadowPathX(z);}
    var pathPos=[],pathColor=[],pathIndices=[],pathAcross=[];
    for(var segment=0;segment<=100;segment++){
      var pz=-220+segment*4.4,px=pathX(pz),width=2.8+.5*Math.sin(pz*.055),slope=.348*Math.cos(pz*.029)+.036*Math.cos(pz*.009),norm=Math.sqrt(1+slope*slope);
      [-1.2,-.85,.85,1.2].forEach(function(side){var x=px+side*width/norm,z=pz-side*width*slope/norm,c=Math.abs(side)>1?groundColor(x,z):linear(0x968665).lerp(linear(0xaa9977),hash(segment+300)*.35);pathPos.push(x,.015,z);pathColor.push(c.r,c.g,c.b);pathAcross.push(side);});
      if(segment<100)for(var strip=0;strip<3;strip++){var a=segment*4+strip;pathIndices.push(a,a+4,a+1,a+1,a+4,a+5);}
    }
    var pathGeometry=new T.BufferGeometry();pathGeometry.setAttribute('position',new T.Float32BufferAttribute(pathPos,3));pathGeometry.setAttribute('color',new T.Float32BufferAttribute(pathColor,3));pathGeometry.setAttribute('bfTrailAcross',new T.Float32BufferAttribute(pathAcross,1));pathGeometry.setIndex(pathIndices);pathGeometry.computeVertexNormals();
    // Soft coverage keeps the existing path footprint while letting irregular
    // turf show through its margins. The center remains a readable walking route.
    var trailMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:T.DoubleSide,alphaTest:.025,alphaToCoverage:true});trailMaterial.extensions={derivatives:true};trailMaterial.alphaToCoverage=true;
    trailMaterial.onBeforeCompile=function(shader){
      shader.vertexShader='attribute float bfTrailAcross;varying vec2 bfTrailPoint;varying float bfTrailSide;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfTrailPoint=position.xz;bfTrailSide=bfTrailAcross;');
      shader.fragmentShader='varying vec2 bfTrailPoint;varying float bfTrailSide;float bfTrailHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float bfTrailNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bfTrailHash(i),bfTrailHash(i+vec2(1.,0.)),f.x),mix(bfTrailHash(i+vec2(0.,1.)),bfTrailHash(i+vec2(1.,1.)),f.x),f.y);}\n'+shader.fragmentShader;
      // Wear gives way to turf before the terminal mesh edges, with the same
      // stable ground noise that breaks up the sides of the walking route.
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat bfAcross=abs(bfTrailSide);float bfBorder=bfTrailNoise(bfTrailPoint*vec2(.73,.41));float bfEarth=bfTrailNoise(bfTrailPoint*1.3);float bfGrainResolve=1.-smoothstep(.02,.14,length(fwidth(bfTrailPoint)));float bfGrain=mix(.5,bfTrailNoise(bfTrailPoint*24.),bfGrainResolve);float bfEdge=.96+(bfBorder-.5)*.14;float bfFeather=.095+max(.015,fwidth(bfTrailSide)*.7);float bfTrailEnd=1.-smoothstep(184.,216.,abs(bfTrailPoint.y)+(bfBorder-.5)*6.);diffuseColor.a*=(1.-smoothstep(bfEdge-bfFeather,bfEdge+bfFeather,bfAcross))*bfTrailEnd;float bfWear=1.-smoothstep(.18,.82,bfAcross);diffuseColor.rgb*=.79+.23*bfEarth+.095*bfGrain+.045*bfWear;');
    };
    trailMaterial.customProgramCacheKey=function(){return 'butterfly-soft-earth-trail-v3';};
    var pathMesh=mesh(pathGeometry,trailMaterial,0,0,0);pathMesh.name='meadow-footpath';

    // Leaf sprays contain actual gaps, with a procedural leaf mask on curved
    // cards; there is no opaque sphere underneath the branching framework.
    // Woodland surface refinement v1: folded foliage, soft transmission, irregular bark.
    // Canopy depth refinement v1: independent leaf normals and crown exposure.
    // Foliage silhouette refinement v1: forked shoots and three coherent leaf forms.
    // Inner limb cards carry nine finer shoots; outer and leader cards retain four.
    // Only the selected shoot is evaluated at a fragment: the eleven-leaf
    // loop, geometry, canopy wind and branch positions remain unchanged.
    // Thin leaf surfaces retain independent tilts without rounded pad shading.
    // Broadleaf blades taper into short petioles along the existing branch sprays.
    // Stable leaf pigment variation and pale-sage undersides use existing leaf seeds.
    // Oval and pointed canopy blades keep full shoulders beneath acuminate tips.
    // Crown sunlight depth: soft directional shade inside the existing leaf lobes.
    function canopyMaterial(hex){
      var m=mat(hex,{vertexColors:true,side:T.DoubleSide,alphaTest:.06,alphaToCoverage:true});
      m.extensions={derivatives:true};m.alphaToCoverage=true;
      if(m.userData.meadowWind)return m;
      m.onBeforeCompile=function(shader){
        shader.uniforms.bfCrownSunDirection=sky.material.uniforms.sunDirection;
        shader.vertexShader='attribute vec4 bfCrownRadial;uniform vec3 bfCrownSunDirection;varying float bfCrownSunAccess;attribute float bfFoliageSeed;attribute float bfFoliageDensity;attribute float bfCanopyExposure;varying vec2 bfLeafUV;varying float bfLeafSeed;varying float bfLeafDensity;varying float bfLeafExposure;varying vec3 bfCanopyUp;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfLeafUV=uv;bfLeafSeed=floor(bfFoliageSeed*64.+.5);bfLeafDensity=bfFoliageDensity;bfLeafExposure=bfCanopyExposure;bfCanopyUp=mat3(viewMatrix)*vec3(0.,1.,0.);\nvec3 bfCrownLocalRadial=bfCrownRadial.xyz;\n#ifdef USE_INSTANCING\nmat3 bfCrownInstance=mat3(instanceMatrix);bfCrownLocalRadial/=vec3(dot(bfCrownInstance[0],bfCrownInstance[0]),dot(bfCrownInstance[1],bfCrownInstance[1]),dot(bfCrownInstance[2],bfCrownInstance[2]));bfCrownLocalRadial=bfCrownInstance*bfCrownLocalRadial;\n#endif\nvec3 bfCrownViewRadial=normalMatrix*bfCrownLocalRadial;bfCrownViewRadial/=max(.00001,length(bfCrownViewRadial));float bfCrownFacing=dot(bfCrownViewRadial,mat3(viewMatrix)*bfCrownSunDirection);float bfCrownShelter=(1.-smoothstep(-.35,.65,bfCrownFacing))*(.68+.32*(1.-bfLeafExposure));bfCrownSunAccess=1.-.28*bfCrownRadial.w*bfCrownShelter;');
        shader.fragmentShader=[
          'varying float bfCrownSunAccess;varying vec2 bfLeafUV;varying float bfLeafSeed;varying float bfLeafDensity;varying float bfLeafExposure;varying vec3 bfCanopyUp;',
          // The existing eleven masks also supply independent cupping and
          // tilt. Their virtual slopes vary across each individual leaf,
          // while the supporting spray keeps the same four vertices.
          "float bfTwigCover(vec2 p,vec2 base,vec2 tip,float pixel){",
          "vec2 span=tip-base;float t=clamp(dot(p-base,span)/max(.001,dot(span,span)),0.,1.);",
          "float edge=length(p-base-span*t),width=mix(.012,.0055,t),aa=max(.003,pixel*1.1);",
          "return 1.-smoothstep(max(0.,width-aa),width+aa,edge);",
          "}",
          "vec4 bfLeafSpray(vec2 p,float seed,float pixel,float detail,out vec3 leafSurface){",
          "float habit=floor(seed/2048.);seed=mod(seed,2048.);",
          "float angle=seed*.013;vec2 axis=vec2(cos(angle),sin(angle));",
          "p=vec2(dot(p,vec2(axis.y,-axis.x)),dot(p,axis));",
          "float aa=max(.018,pixel*3.6),shootBend=(fract(seed*.173)-.5)*.075;",
          "vec2 root=vec2(shootBend*.4,-.69),fork=vec2(shootBend*.65,-.31);",
          "vec2 leftTip=vec2(-.38+(fract(seed*.093)-.5)*.055,.20+(fract(seed*.131)-.5)*.075);",
          "vec2 rightBase=vec2(shootBend*.73,-.19),rightTip=vec2(.34+(fract(seed*.111)-.5)*.06,.36+(fract(seed*.077)-.5)*.075);",
          "vec2 leaderBase=vec2(shootBend*.8,-.085),leaderTip=vec2(-.025+shootBend,.52+(fract(seed*.151)-.5)*.045);",
          "float twig=max(bfTwigCover(p,root,leaderBase,pixel),bfTwigCover(p,fork,leftTip,pixel));",
          "twig=max(twig,bfTwigCover(p,rightBase,rightTip,pixel));twig=max(twig,bfTwigCover(p,leaderBase,leaderTip,pixel))*detail;",
          "vec4 spray=vec4(twig,.81,0.,0.);leafSurface=vec3(0.);",
          "for(int leaf=0;leaf<11;leaf++){",
          "float k=float(leaf),variation=fract(seed*.037+k*.618034),uneven=fract(seed*.073+k*.414214);",
          "float branch=floor(k/4.),rank=k-branch*4.,leader=step(1.5,branch);",
          "vec2 base=mix(fork,rightBase,step(.5,branch)),tip=mix(leftTip,rightTip,step(.5,branch));",
          "base=mix(base,leaderBase,leader);tip=mix(tip,leaderTip,leader);",
          "vec2 branchDirection=normalize(tip-base),branchAcross=vec2(-branchDirection.y,branchDirection.x);",
          "float terminal=step(mix(2.5,1.5,leader),rank),side=mod(rank+step(.5,branch),2.)*2.-1.;",
          "float t=.12+rank*mix(.255,.33,leader)+(uneven-.5)*.105;",
          "vec2 direction=normalize(branchDirection*(.40+.34*variation)+branchAcross*side*(.74+.22*uneven));",
          "direction=normalize(mix(direction,branchDirection+branchAcross*(variation-.5)*.18,terminal*.86));",
          // Separate each blade base from the branch, then bridge the small
          // gap with its petiole so neighboring leaves no longer merge at the stem.
          "vec2 bfLeafAttachment=mix(base,tip,t);",
          "vec2 center=bfLeafAttachment+direction*(.185+.035*variation);",
          "float centerRadius=length(center);center*=min(1.,.655/max(.001,centerRadius));",
          "vec2 bfPetioleDirection=center-bfLeafAttachment;float bfLeafAttachmentLength=length(bfPetioleDirection);",
          "direction=bfPetioleDirection/max(.0001,bfLeafAttachmentLength);",
          "vec2 offset=p-center,q=vec2(dot(offset,direction),dot(offset,vec2(-direction.y,direction.x)));",
          "float pointed=step(1.5,habit),oval=step(.5,habit)*(1.-pointed);",
          "float leafLength=(.267+.064*variation)*(1.+pointed*.025)*(1.-terminal*.07);",
          "float leafWidth=(.196+.062*uneven)*(1.07-oval*.13-pointed*.20)*(1.-terminal*.055)*.94;",
          "float bfLeafBaseLength=max(.04,min(leafLength*.72,bfLeafAttachmentLength-.022));",
          "vec2 bfBladeBase=center-direction*bfLeafBaseLength;",
          "float bfPetiole=bfTwigCover(p,bfLeafAttachment,bfBladeBase+direction*.035,pixel)*detail;",
          "spray.x=max(spray.x,bfPetiole);",
          "float along=q.x/(q.x<0.?bfLeafBaseLength:leafLength);",
          "q.y-=.035*max(0.,1.-along*along)*(variation-.35);",
          "float margin=1.+(.015+pointed*.015)*sin(along*7.3+variation*6.2)*detail;",
          "float bfLeafAxial=clamp(along,-1.,1.),bfLeafTipBias=.22-.05*oval-.12*pointed;",
          "float bfLeafSide=clamp(q.y/max(.001,leafWidth),-1.,1.);",
          "float bfLeafAsymmetry=1.+.06*(uneven-.5)*bfLeafSide*max(0.,1.-bfLeafAxial*bfLeafAxial);",
          "float curvedWidth=leafWidth*max(.22,1.-(.11+oval*.12+pointed*.26)*abs(along)-(.025+pointed*.16)*along)*margin*(1.-bfLeafTipBias*bfLeafAxial)*bfLeafAsymmetry;",
          "float bfLeafTipT=clamp(along,0.,1.);",
          "float bfLeafTipLens=sqrt(max(.0004,1.-bfLeafTipT*bfLeafTipT))*(1.+2.1*bfLeafTipT*bfLeafTipT*(1.-bfLeafTipT));",
          "curvedWidth*=mix(1.,bfLeafTipLens,oval+pointed);",
          "float radius=length(vec2(along,q.y/curvedWidth));",
          "float cover=1.-smoothstep(1.-aa,1.+aa,radius);",
          "float acrossLeaf=clamp(q.y/curvedWidth,-1.,1.),fold=max(0.,1.-abs(acrossLeaf));",
          "float midrib=(1.-smoothstep(.006+pixel*.25,.016+pixel*.5,abs(q.y)))*(1.-smoothstep(.21,.34,abs(q.x)));",
          "float veinPhase=q.x*18.+abs(q.y)*35.;",
          "float veins=(1.-smoothstep(.018,.045+pixel*20.,abs(fract(veinPhase)-.5)))*(1.-smoothstep(.02,.065,pixel));",
          "float shoulder=max(0.,1.-along*along);",
          "float shade=.87+.10*variation+.03*fold+.015*shoulder+.018*acrossLeaf;",
          "shade+=(midrib*.04+veins*.018)*detail;",
          "float relief=(.0075*fold*max(0.,1.-radius*radius)+.0025*midrib-.0045*along*along*shoulder)*detail;",
          "vec2 localSlope=vec2((variation-.5)*.52-.14*along,(uneven-.5)*.62-.20*acrossLeaf);",
          "vec2 shootSlope=direction*localSlope.x+vec2(-direction.y,direction.x)*localSlope.y;",
          "vec2 cardSlope=vec2(axis.y*shootSlope.x+axis.x*shootSlope.y,-axis.x*shootSlope.x+axis.y*shootSlope.y);",
          "leafSurface=mix(leafSurface,vec3(cardSlope,uneven),cover);",
          "spray.x=max(spray.x,cover);spray.y=mix(spray.y,shade,cover);spray.z=mix(spray.z,relief,cover);spray.w+=cover;",
          "}",
          "return spray;",
          "}",
          shader.fragmentShader
        ].join('\n');
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat bfStableLeafSeed=floor(bfLeafSeed+.5)/64.;vec2 bfLeafUnwrapped=(bfLeafUV*bfLeafDensity-.5)*2.;vec2 bfShootTile=floor(min(bfLeafUV*bfLeafDensity,vec2(bfLeafDensity-.00001)));float bfTreeShoots=step(1.5,bfLeafDensity);float bfShootSeed=floor(bfStableLeafSeed/2048.)*2048.+mod(mod(bfStableLeafSeed,2048.)+dot(bfShootTile,vec2(211.,557.)),2048.);vec2 bfShootJitter=vec2(fract(sin(bfShootSeed*.073)*437.58),fract(sin(bfShootSeed*.131)*159.7))-.5;vec2 bfLeafPoint=(bfLeafUnwrapped-bfShootTile*2.)*(1.+.02*bfTreeShoots)+bfShootJitter*(.016*bfTreeShoots);float bfLeafPixel=length(fwidth(bfLeafUnwrapped))*(1.+.02*bfTreeShoots);float bfLeafDetail=1.-smoothstep(.035,.13,bfLeafPixel);float bfLeafShapeResolve=1.-smoothstep(.12,.35,bfLeafPixel);vec3 bfLeafSurface;vec4 bfSpray=bfLeafSpray(bfLeafPoint,bfShootSeed,bfLeafPixel,bfLeafDetail,bfLeafSurface);diffuseColor.a*=bfSpray.x;float bfLeafOverlap=clamp((bfSpray.w-1.)*.16,0.,.35);float bfLeafPresence=smoothstep(.08,.58,bfSpray.w);float bfCrownShade=.77+.23*bfLeafExposure;diffuseColor.rgb*=mix(vec3(1.12,.72,.64),vec3(bfSpray.y*(1.-bfLeafOverlap*.18)*bfCrownShade),bfLeafPresence);float bfLeafPigment=clamp(bfLeafSurface.z,0.,1.)-.5;vec3 bfLeafPigmentTint=vec3(1.+bfLeafPigment*.12,1.+bfLeafPigment*.014,1.-bfLeafPigment*.096);diffuseColor.rgb*=mix(vec3(1.),bfLeafPigmentTint,bfLeafPresence);if(!gl_FrontFacing)diffuseColor.rgb*=mix(vec3(1.),vec3(1.09,1.08,1.14),bfLeafPresence);float bfLeafRelief=bfSpray.z;');
        // Broad leaf cupping remains readable after the finer veins fade.
        // It too fades once an individual leaf becomes smaller than a pixel.
        shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>","#include <normal_fragment_maps>\nvec3 bfCanopySurfaceBase=normalize(normal*.90+bfCanopyUp*.16);\nvec3 bfCanopySurfaceDx=dFdx(-vViewPosition),bfCanopySurfaceDy=dFdy(-vViewPosition);\nvec2 bfCanopyUvDx=dFdx(bfLeafUnwrapped),bfCanopyUvDy=dFdy(bfLeafUnwrapped);\nfloat bfCanopyUvDet=bfCanopyUvDx.x*bfCanopyUvDy.y-bfCanopyUvDx.y*bfCanopyUvDy.x;\nfloat bfCanopyUvSign=bfCanopyUvDet<0.?-1.:1.;\nvec3 bfCanopyTangentRaw=(bfCanopySurfaceDx*bfCanopyUvDy.y-bfCanopySurfaceDy*bfCanopyUvDx.y)*bfCanopyUvSign;\nvec3 bfCanopyBitangentRaw=(bfCanopySurfaceDy*bfCanopyUvDx.x-bfCanopySurfaceDx*bfCanopyUvDy.x)*bfCanopyUvSign;\nvec3 bfCanopyTangent=bfCanopyTangentRaw/max(.000001,length(bfCanopyTangentRaw));\nvec3 bfCanopyBitangent=bfCanopyBitangentRaw/max(.000001,length(bfCanopyBitangentRaw));\nfloat bfCanopyFacing=gl_FrontFacing?1.:-1.;\nvec3 bfCanopyLeafNormal=normalize(bfCanopySurfaceBase-bfCanopyFacing*(bfCanopyTangent*bfLeafSurface.x+bfCanopyBitangent*bfLeafSurface.y)*bfLeafPresence*bfLeafShapeResolve);\nvec3 bfCanopySurfaceBx=cross(bfCanopySurfaceDy,bfCanopyLeafNormal),bfCanopySurfaceBy=cross(bfCanopyLeafNormal,bfCanopySurfaceDx);\nfloat bfCanopySurfaceDet=dot(bfCanopySurfaceDx,bfCanopySurfaceBx);\nvec3 bfCanopySurfaceBump=abs(bfCanopySurfaceDet)*bfCanopyLeafNormal-sign(bfCanopySurfaceDet)*(dFdx(bfLeafRelief)*bfCanopySurfaceBx+dFdy(bfLeafRelief)*bfCanopySurfaceBy);\nnormal=normalize(mix(bfCanopyLeafNormal,normalize(bfCanopySurfaceBump+bfCanopyLeafNormal*.000001),.22));");
        shader.fragmentShader=shader.fragmentShader.replace("#include <roughnessmap_fragment>","#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor-(.035+.07*bfLeafSurface.z)*bfLeafDetail,.80,.98);");
        shader.fragmentShader=shader.fragmentShader.replace("#include <lights_fragment_end>","#include <lights_fragment_end>\nvec3 bfCanopyLightThrough=vec3(0.);float bfCanopyLightBack=0.;\n#if NUM_DIR_LIGHTS > 0\n#pragma unroll_loop_start\nfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\nbfCanopyLightBack=max(0.,-dot(geometry.normal,directionalLights[i].direction));\nbfCanopyLightThrough+=directionalLights[i].color*bfCanopyLightBack*bfCanopyLightBack;\n}\n#pragma unroll_loop_end\n#endif\nreflectedLight.directDiffuse*=bfCrownSunAccess;\nreflectedLight.indirectDiffuse*=.82+.18*smoothstep(.36,.88,bfLeafExposure);\nreflectedLight.directDiffuse+=diffuseColor.rgb*bfCanopyLightThrough*(.035+.025/max(1.,bfSpray.w))*(.72+.28*bfLeafExposure)*vec3(.92,1.,.76);");
      };
      m.customProgramCacheKey=function(){return 'butterfly-canopy-crown-sunlight-v19';};return vegetationWind(m,'canopy');
    }
    // Three growth habits each receive two individual branching outlines.
    // Uneven shoulders and a wandering leader give each habit a different
    // outline. Branch endpoints and leaf volumes use these same six nodes.
    // Organic woodland refinement v1: uneven leafy shoots and connected crown growth.
    function treeCrownNodes(variant){
      var nodes=[],habit=variant%3,individual=Math.floor(variant/3),biasAngle=.7+variant*.91,bias=.10+individual*.045+(habit===2?.025:0),biasX=Math.cos(biasAngle)*bias,biasZ=Math.sin(biasAngle)*bias;
      var shoulders=[[.86,1.04,.94,1.12,1.01],[.93,1.13,1.02,1.19,1.09],[.84,1.03,.95,1.10,1.16]][habit];
      for(var branch=0;branch<5;branch++){
        var seed=variant*137+branch*19+6801,angle=branch*2.39996+habit*.83+individual*.61+(hash(seed)-.5)*.69;
        var dominant=.5+.5*Math.cos(angle-biasAngle),reach=(.54+hash(seed+1)*.22)*[1.02,.96,1.01][habit]*(.90+dominant*.17);
        var node={x:Math.cos(angle)*reach+biasX*(.35+dominant*.65),y:shoulders[branch]+(hash(seed+2)-.5)*.065+dominant*.025,z:Math.sin(angle)*reach+biasZ*(.35+dominant*.65),spanX:.90+hash(seed+3)*.23,spanY:.86+hash(seed+4)*.22,spanZ:.90+hash(seed+5)*.23,leafSize:1.04+dominant*.045};
        node.attach=.33+.22*hash(seed+6)+.10*Math.max(0,Math.min(1,(node.y-.78)/.4));
        var twigAngle=angle+(hash(seed+7)-.5)*2.1,twigReach=.13+hash(seed+8)*.1;
        // Small terminal forks end inside this node's leaf volume. The same
        // data drives both wood and foliage, including their shared breeze.
        node.twigX=node.x+Math.cos(twigAngle)*twigReach*node.spanX;
        node.twigY=node.y+(.025+hash(seed+9)*.065)*node.spanY;
        node.twigZ=node.z+Math.sin(twigAngle)*twigReach*node.spanZ;
        node.forkAt=.53+hash(seed+10)*.23;nodes.push(node);
      }
      var leaderSeed=variant*173+7229;
      nodes.push({x:biasX*.9+.14*Math.sin(variant*1.7+1),y:[1.23,1.30,1.22][habit]+(hash(leaderSeed)-.5)*.055,z:biasZ*.9+.14*Math.cos(variant*1.3+2),spanX:.95+hash(leaderSeed+1)*.12,spanY:.92+hash(leaderSeed+2)*.1,spanZ:.96+hash(leaderSeed+3)*.1,leafSize:1.07,attach:.54+hash(leaderSeed+4)*.095});
      return nodes;
    }
    var crownNodes=[treeCrownNodes(0),treeCrownNodes(1),treeCrownNodes(2),treeCrownNodes(3),treeCrownNodes(4),treeCrownNodes(5)];
    // Fine canopy refinement v1: paired small sprays on staggered leafy twigs.
    // Finer tree sprays retain a full crown through balanced node coverage.
    // More small sprays replace oversized leaves without moving the branch
    // nodes or changing the hedgerow's established geometry and shading.
    function foliageGeometry(variant,shrub){
      var positions=[],colors=[],uv=[],seeds=[],exposures=[],densities=[],crownRadials=[],indices=[],count=shrub?60:256,nodes=crownNodes[variant%crownNodes.length];
      var normal=new T.Vector3(),across=new T.Vector3(),along=new T.Vector3();
      for(var card=0;card<count;card++){
        // Each former four-triangle card becomes two smaller two-triangle
        // sprays. Their shared center retains the established branch layout.
        var cluster=Math.floor(card/2),sibling=card%2,key=variant*997+cluster*13+7013,sprayKey=key+131+sibling*911;
        var a=hash(key)*Math.PI*2,vertical=hash(key+1)*2-1,r=Math.pow(hash(key+2),1/3),radial=Math.sqrt(Math.max(0,1-vertical*vertical))*r;
        // Cycle the tree's six nodes so 128 paired clusters cover each one
        // evenly. A fixed block of sixteen would overfill the first two nodes.
        var node=nodes[shrub?Math.floor(cluster/16)%nodes.length:cluster%nodes.length],cx,cy,cz,width,height;
        if(shrub){
          var lobe=cluster%3,angle=lobe*2.39996+variant;
          cx=Math.cos(angle)*.3+Math.cos(a)*radial*.53;cz=Math.sin(angle)*.3+Math.sin(a)*radial*.49;cy=.51+vertical*r*.3+.12*Math.sin(lobe+variant);
          width=.672+hash(key+3)*.324;height=.6+hash(key+4)*.288;
        }else{
          cx=node.x+Math.cos(a)*radial*.35*node.spanX;cz=node.z+Math.sin(a)*radial*.32*node.spanZ;cy=node.y+vertical*r*.18*node.spanY;
          width=(.408+hash(key+3)*.18)*node.leafSize;height=(.288+hash(key+4)*.156)*node.leafSize;
        }
        var split=hash(key+11)*Math.PI*2,splitSide=(sibling?1:-1)*(.72+.56*hash(sprayKey+11));
        cx+=Math.cos(split)*width*.15*splitSide;cz+=Math.sin(split)*width*.15*splitSide;cy+=height*.065*splitSide;
        width*=.68+hash(sprayKey+3)*.14;height*=.71+hash(sprayKey+4)*.16;
        // About one fifth finer leaves, with only a small decrease in total
        // covered area after adding sprays. Centers and sibling spacing retain
        // the crown outline and open the gaps between individual shoots.
        if(!shrub){width*=.82;height*=.84;}
        var facing=hash(sprayKey+5)*Math.PI*2,up=.18+hash(sprayKey+6)*.71,flat=Math.sqrt(1-up*up);
        normal.set(Math.cos(facing)*flat,up,Math.sin(facing)*flat);across.set(-Math.sin(facing),0,Math.cos(facing));along.crossVectors(across,normal).normalize();
        var start=positions.length/3,seed=(variant%3)*2048+hash(sprayKey+7)*1000,tone=.78+hash(key+8)*.12+Math.min(1,cy)*.07+(hash(sprayKey+8)-.5)*.04;
        // Exposed outer shoots receive more skylight than their crown interior.
        // Coordinates are local to the same node that anchors their branches.
        var exposure=Math.max(.22,Math.min(1,.51+r*.28+(shrub?(cy-.51)*.36:(cy-node.y)/(.18*node.spanY)*.13)+(hash(sprayKey+14)-.5)*.07));
        // Outer shoots settle below their branch centers; the leader remains upright.
        // Translate each whole card so its coverage, color and exposure stay exact.
        if(!shrub){
          var nodeReach=Math.max(.001,Math.hypot(node.x,node.z)),outward=(Math.cos(a)*node.x+Math.sin(a)*node.z)/nodeReach;
          cy-=outward*radial*(cluster%nodes.length===5?.035:.10)*node.spanY;
        }
        // Inner shoots continue down the outer limbs, softening the gap
        // beneath each crown lobe. The leader and outer sprays stay exact.
        // Translate complete cards after computing their color and exposure.
        if(!shrub&&r<.66&&cluster%nodes.length!==5){
          var foliageReach=.75+.10*hash(key+17);
          cx-=node.x*(1-foliageReach);cy-=(node.y-node.attach)*(1-foliageReach);cz-=node.z*(1-foliageReach);
        }
        // Ellipsoid gradients distinguish the sun-facing shell from sheltered leaves.
        // Store one constant direction per spray; its actual geometry stays unchanged.
        var crownRx=.35*node.spanX,crownRy=.18*node.spanY,crownRz=.32*node.spanZ;
        var crownDx=shrub?0:(cx-node.x)/(crownRx*crownRx),crownDy=shrub?1:(cy-node.y)/(crownRy*crownRy),crownDz=shrub?0:(cz-node.z)/(crownRz*crownRz);
        for(var row=0;row<2;row++){
          var y=row;
          for(var side=0;side<2;side++){
            var lx=(side-.5)*width*(.94+y*.06)+(y-.5)*width*(hash(sprayKey+12)-.5)*.14,ly=(y-.5)*height;
            // A slight saddle gives the two triangles different normals while
            // retaining a smooth shared edge and avoiding a sharp paper fold.
            var fold=width*(.022*(side===row?1:-1)+.012*(y-.5)*(hash(sprayKey+13)-.5));
            positions.push(cx+across.x*lx+along.x*ly+normal.x*fold,cy+across.y*lx+along.y*ly+normal.y*fold,cz+across.z*lx+along.z*ly+normal.z*fold);
            var shade=tone*(.96+y*.04);colors.push(shade*.97,shade,shade*.89);uv.push(side,y);seeds.push(seed);densities.push(shrub?1:(r<.66&&cluster%nodes.length!==5?3:2));exposures.push(Math.max(.2,Math.min(1,exposure+(y-.5)*.055)));crownRadials.push(crownDx,crownDy,crownDz,shrub?0:1);
          }
        }
        indices.push(start,start+2,start+1,start+1,start+2,start+3);
      }
      var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('bfFoliageSeed',new T.Float32BufferAttribute(seeds,1));g.setAttribute('bfFoliageDensity',new T.Float32BufferAttribute(densities,1));g.setAttribute('bfCanopyExposure',new T.Float32BufferAttribute(exposures,1));g.setAttribute('bfCrownRadial',new T.Float32BufferAttribute(crownRadials,4));g.setIndex(indices);g.computeVertexNormals();g.name=shrub?'hedgerow-leaf-sprays':'woodland-branch-leaf-sprays';return g;
    }
    var crowns=[foliageGeometry(0,false),foliageGeometry(1,false),foliageGeometry(2,false),foliageGeometry(3,false),foliageGeometry(4,false),foliageGeometry(5,false)],shrubGeometries=[foliageGeometry(3,true),foliageGeometry(4,true),foliageGeometry(5,true)];
    // Open branch ends leave more of the wood budget for smooth bends.
    // End points remain exact so branches and leaf sprays share the same wind.
    function woodShaftGeometry(sides,rows,radii,bend,caps,name){
      var positions=[],uv=[],colors=[],indices=[],centers=[],rootFlare=caps||name==='woodland-curved-trunk';
      for(var row=0;row<rows.length;row++){
        var t=rows[row],inside=row>0&&row<rows.length-1;
        var cx=inside?bend*Math.sin(Math.PI*t)*(1+.18*Math.sin(Math.PI*2*t)):0,cz=inside?bend*.27*Math.sin(Math.PI*2*t):0;
        centers.push([cx,t-.5,cz]);
        for(var side=0;side<=sides;side++){
          var angle=side*Math.PI*2/sides,radius=radii[row]*(row===0&&rootFlare?1+.09*Math.cos(angle*3):1),tone=.85+t*.15+.025*Math.cos(angle*3+.7);
          // butterfly-buried-trunk-feet-v1: tuck open wood below the ground.
          // Only the trunk foot moves; its centerline and branch anchors stay exact.
          var footDrop=name==='woodland-curved-trunk'&&row===0?.015:0;
          positions.push(cx+Math.cos(angle)*radius,t-.5-footDrop,cz+Math.sin(angle)*radius);uv.push(side/sides,t);colors.push(tone,tone*.99,tone*.94);
          if(row<rows.length-1&&side<sides){var a=row*(sides+1)+side,b=a+1,c=a+sides+1,d=c+1;indices.push(a,c,b,b,c,d);}
        }
      }
      if(caps)for(var end=0;end<2;end++){
        var row=end?rows.length-1:0,center=centers[row],first=positions.length/3;
        positions.push(center[0],center[1],center[2]);uv.push(.5,end);colors.push(.87,.86,.82);
        for(var side=0;side<=sides;side++){
          var angle=side*Math.PI*2/sides,radius=radii[row]*(end?1:1+.09*Math.cos(angle*3));
          positions.push(center[0]+Math.cos(angle)*radius,center[1],center[2]+Math.sin(angle)*radius);uv.push(side/sides,end);colors.push(.87,.86,.82);
          if(side<sides){var a=first+1+side,b=a+1;if(end)indices.push(first,b,a);else indices.push(first,a,b);}
        }
      }
      var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
      // Smooth shaft lighting follows the existing taper and bent centerline.
      // Circular tangents remove the diagonal bias of the coarse side faces;
      // duplicate UV seam vertices receive exactly the same normal.
      var n=g.attributes.normal,p=g.attributes.position,sideFaces={};
      for(var face=0;face<(rows.length-1)*sides*6;face+=3){
        var a=new T.Vector3().fromBufferAttribute(p,indices[face]),b=new T.Vector3().fromBufferAttribute(p,indices[face+1]),c=new T.Vector3().fromBufferAttribute(p,indices[face+2]);
        var faceNormal=b.sub(a).cross(c.sub(a)).normalize();
        for(var corner=0;corner<3;corner++){var vertex=indices[face+corner],key=vertex%(sides+1)===sides?vertex-sides:vertex;(sideFaces[key]||(sideFaces[key]=[])).push(faceNormal);}
      }
      for(var row=0;row<rows.length;row++)for(var side=0;side<=sides;side++){
        var wrap=side===sides?0:side,angle=wrap*Math.PI*2/sides,index=row*(sides+1)+side;
        var radius=radii[row]*(row===0&&rootFlare?1+.09*Math.cos(angle*3):1),radiusSlope=row===0&&rootFlare?-radii[row]*.27*Math.sin(angle*3):0;
        var aroundX=Math.cos(angle)*radiusSlope-Math.sin(angle)*radius,aroundZ=Math.sin(angle)*radiusSlope+Math.cos(angle)*radius;
        var center=row*(sides+1)+wrap,alongX=0,alongZ=0,samples=0;
        if(row>0){var previous=(row-1)*(sides+1)+wrap,dy=p.getY(center)-p.getY(previous);alongX+=(p.getX(center)-p.getX(previous))/dy;alongZ+=(p.getZ(center)-p.getZ(previous))/dy;samples++;}
        if(row<rows.length-1){var next=(row+1)*(sides+1)+wrap,dy=p.getY(next)-p.getY(center);alongX+=(p.getX(next)-p.getX(center))/dy;alongZ+=(p.getZ(next)-p.getZ(center))/dy;samples++;}
        alongX/=samples;alongZ/=samples;
        var radialLength=Math.sqrt(aroundX*aroundX+aroundZ*aroundZ),nx=aroundZ/radialLength,ny=(alongZ*aroundX-alongX*aroundZ)/radialLength,nz=-aroundX/radialLength;
        // At a sharp sampled bend, constrain only the axial tilt to face every
        // incident side outward. The smooth circumferential direction stays exact.
        var faces=sideFaces[center],low=-Infinity,high=Infinity;
        for(var neighbor=0;neighbor<faces.length;neighbor++){
          var facing=faces[neighbor],horizontal=nx*facing.x+nz*facing.z;
          if(facing.y>.0000001)low=Math.max(low,(.0001-horizontal)/facing.y);
          else if(facing.y<-.0000001)high=Math.min(high,(.0001-horizontal)/facing.y);
        }
        ny=Math.max(low,Math.min(high,ny));
        var length=Math.sqrt(nx*nx+ny*ny+nz*nz);
        n.setXYZ(index,nx/length,ny/length,nz/length);
      }
      g.name=name;g.userData.woodCenters=centers;g.userData.woodRows=rows;return g;
    }
    // One continuous trunk replaces the former two disconnected cylinders.
    // Main branches and twigs taper almost to a point inside their leaf sprays;
    // open ends keep the bend samples within the meadow's shared budget.
    // Reassign hidden trunk caps to a fifth bend sample.
    // Root spread, upper rings and branch tips retain their exact positions.
    var trunkGeometry=woodShaftGeometry(8,[0,.30,.47,.64,1],[1.18,.8,.615,.43,.105],1.15,false,'woodland-curved-trunk');
    // Supple main limbs sample three-dimensional bends with four shared rings.
    var woodGeometry=woodShaftGeometry(5,[0,1/3,2/3,1],[1,.7,.39666666666666667,.09],2.05,false,'woodland-curved-branch');
    var twigGeometry=woodShaftGeometry(4,[0,.5,1],[1,.38,.045],2.1,false,'woodland-fine-twig');
    var branchDirection=new T.Vector3(),branchUp=new T.Vector3(0,1,0);
    // Soft gray-brown weathering stays periodic around every bark shaft.
    // Existing fine furrows and relief retain their original shading response.
    var woodMaterial=mat(0x635c48,{vertexColors:true});woodMaterial.extensions={derivatives:true};
    woodMaterial.onBeforeCompile=function(shader){
      shader.vertexShader='varying vec2 bfBarkUV;varying float bfBarkSeed;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbfBarkUV=uv;bfBarkSeed=dot(modelMatrix[3].xyz,vec3(.19,.07,.23));\n#ifdef USE_INSTANCING\nbfBarkSeed+=dot(instanceMatrix[3].xyz,vec3(.19,.07,.23));\n#endif');
      shader.fragmentShader='varying vec2 bfBarkUV;varying float bfBarkSeed;\n'+shader.fragmentShader;
      // Integer circumferential frequencies meet continuously at the shaft
      // seam. Long, irregular furrows vary between individual wood instances.
      // Short staggered cross fissures join the lengthwise furrows into bark
      // plates. Each join fades to zero at its furrow boundary, so changing
      // the neighboring plate seed cannot open a shading seam. The structure
      // resolves only nearby and fades back to the original broad grooves.
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat bfBarkPhase=bfBarkUV.x*113.097336+sin(bfBarkUV.y*8.7+bfBarkSeed)*.65+.24*sin(bfBarkUV.y*19.3+bfBarkSeed*.7);float bfBarkDetail=1.-smoothstep(.65,2.8,fwidth(bfBarkPhase));float bfBarkFiber=sin(bfBarkPhase*.5+bfBarkSeed);float bfBarkGrooveBase=.5+.5*sin(bfBarkPhase);float bfBarkPlateColumn=mod(floor((bfBarkPhase-1.570796326795)/6.28318530718),18.);float bfBarkPlateSeed=.5+.5*sin(bfBarkPlateColumn*2.17+bfBarkSeed*.73);float bfBarkFissurePhase=bfBarkUV.y*(150.+55.*bfBarkPlateSeed)+bfBarkPlateSeed*6.28318530718;float bfBarkFissureDetail=1.-smoothstep(.45,2.2,fwidth(bfBarkFissurePhase));float bfBarkPlateWave=.5+.5*cos(bfBarkFissurePhase);float bfBarkFissureWidth=5.1+2.2*bfBarkPlateWave;float bfBarkPlateJoin=pow(bfBarkPlateWave,18.)*(1.-bfBarkGrooveBase);float bfBarkGroove=mix(pow(bfBarkGrooveBase,6.),pow(bfBarkGrooveBase,bfBarkFissureWidth)+.68*bfBarkPlateJoin,bfBarkFissureDetail);float bfBarkBroad=sin(bfBarkUV.x*37.699112+sin(bfBarkUV.y*5.1+bfBarkSeed)*.7);float bfBarkBroadDetail=1.-smoothstep(.8,3.,fwidth(bfBarkUV.x)*37.699112);diffuseColor.rgb*=.93+(.045*bfBarkFiber-.11*bfBarkGroove)*bfBarkDetail+.025*bfBarkBroad*bfBarkBroadDetail;float bfBarkWeatherPhaseA=bfBarkUV.x*12.566370614359+sin(bfBarkUV.y*6.3+bfBarkSeed*.61)*.85+bfBarkSeed*.37;float bfBarkWeatherPhaseB=bfBarkUV.x*6.283185307179-sin(bfBarkUV.y*11.7+bfBarkSeed*.43)*.6+bfBarkSeed*.91;float bfBarkWeather=.5+.32*sin(bfBarkWeatherPhaseA)+.18*sin(bfBarkWeatherPhaseB);float bfBarkWeatherDetail=1.-smoothstep(.55,2.2,max(fwidth(bfBarkWeatherPhaseA),fwidth(bfBarkWeatherPhaseB)));vec3 bfBarkWeatherTint=mix(vec3(.965,.95,.91),vec3(1.035,1.05,1.09),smoothstep(.15,.85,bfBarkWeather));diffuseColor.rgb*=mix(vec3(1.),bfBarkWeatherTint,bfBarkWeatherDetail);diffuseColor.rgb*=.95+.05*smoothstep(0.,.25,clamp(bfBarkUV.y,0.,1.));float bfBarkRelief=(-.004*bfBarkGroove+.0012*bfBarkFiber)*bfBarkDetail;');
      shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>","#include <normal_fragment_maps>\nvec3 bfBarkSurfaceBase=normalize(normal);\nvec3 bfBarkSurfaceDx=dFdx(-vViewPosition),bfBarkSurfaceDy=dFdy(-vViewPosition);\nvec3 bfBarkSurfaceBx=cross(bfBarkSurfaceDy,bfBarkSurfaceBase),bfBarkSurfaceBy=cross(bfBarkSurfaceBase,bfBarkSurfaceDx);\nfloat bfBarkSurfaceDet=dot(bfBarkSurfaceDx,bfBarkSurfaceBx);\nvec3 bfBarkSurfaceBump=abs(bfBarkSurfaceDet)*bfBarkSurfaceBase-sign(bfBarkSurfaceDet)*(dFdx(bfBarkRelief)*bfBarkSurfaceBx+dFdy(bfBarkRelief)*bfBarkSurfaceBy);\nnormal=normalize(mix(bfBarkSurfaceBase,normalize(bfBarkSurfaceBump+bfBarkSurfaceBase*.000001),.22));");
    };
    woodMaterial.customProgramCacheKey=function(){return 'butterfly-bark-plates-v5';};vegetationWind(woodMaterial,'wood');
    function treeBranch(ax,ay,az,bx,by,bz,radius,kind,twist){
      branchDirection.set(bx-ax,by-ay,bz-az);var length=branchDirection.length(),geometry=kind==='trunk'?trunkGeometry:kind==='twig'?twigGeometry:woodGeometry;
      var wood=mesh(geometry,woodMaterial,(ax+bx)*.5,(ay+by)*.5,(az+bz)*.5,radius,length,radius);wood.quaternion.setFromUnitVectors(branchUp,branchDirection.normalize());wood.rotateY(twist||0);wood.updateMatrix();
      var tone=.94+.1*hash(ax*.19+az*.23+ay*.71);wood.userData.meadowTint=new T.Color(tone,tone*.99,tone*.95);return wood;
    }
    function treeShaftPoint(wood,t){
      var rows=wood.geometry.userData.woodRows,centers=wood.geometry.userData.woodCenters,row=0;
      while(row<rows.length-2&&t>rows[row+1])row++;
      var mix=Math.max(0,Math.min(1,(t-rows[row])/(rows[row+1]-rows[row]))),a=centers[row],b=centers[row+1];
      return new T.Vector3(a[0]+(b[0]-a[0])*mix,a[1]+(b[1]-a[1])*mix,a[2]+(b[2]-a[2])*mix).applyMatrix4(wood.matrix);
    }
    // Angle, distance, and population. Unequal depths and larger north/south
    // clearings keep the footpath open and break the former continuous tree ring.
    var woodlandRoots=[],woodlandGroves=[
      [8,187,4],[29,164,3],[53,195,5],[74,177,4],[111,199,3],
      [133,167,4],[153,191,5],[178,162,3],[199,185,4],[221,169,3],
      [242,198,5],[258,174,4],[294,196,3],[317,163,4],[341,195,3]
    ];
    for(var tree=0;tree<57;tree++){
      var groveIndex=0,groveMember=tree;
      while(groveMember>=woodlandGroves[groveIndex][2])groveMember-=woodlandGroves[groveIndex++][2];
      var grove=woodlandGroves[groveIndex],groveAngle=grove[0]*Math.PI/180;
      // Each grove has a central trunk and an uneven, slightly elongated cluster.
      // Rotating and jittering the spiral avoids repeating rows or little rosettes.
      var groveTurn=groveMember*2.39996+groveIndex*1.17+(hash(tree+9101)-.5)*.3;
      var groveSpread=groveMember?13.3+groveMember*1.1:0;
      var groveDX=Math.cos(groveTurn)*groveSpread+(hash(tree+9102)-.5)*1.4;
      var groveDZ=Math.sin(groveTurn)*groveSpread*.82+(hash(tree+9103)-.5)*1.4;
      var tx=Math.cos(groveAngle)*(grove[1]+groveDX)-Math.sin(groveAngle)*groveDZ;
      var tz=Math.sin(groveAngle)*(grove[1]+groveDX)+Math.cos(groveAngle)*groveDZ;
      woodlandRoots.push({x:tx,z:tz});
      var height=10+hash(tree+141)*13,variant=tree%6;
      var width=height*[.66,.43,.55][variant%3],leanX=(hash(tree+201)-.5)*2.9,leanZ=(hash(tree+202)-.5)*2.9,turn=tree*.71,cos=Math.cos(turn),sin=Math.sin(turn);
      contactShade(tx,tz,width*2.5,width*1.8,null,height*.78);
      var trunk=treeBranch(tx,0,tz,tx+leanX,height*1.19,tz+leanZ,.49+height*.011,'trunk',tree*1.37);
      for(var branch=0;branch<6;branch++){
        var node=crownNodes[variant][branch],dx=(node.x*cos+node.z*sin)*width,dz=(-node.x*sin+node.z*cos)*width,start=node.attach+(hash(tree*17+branch+8801)-.5)*.045;
        var origin=treeShaftPoint(trunk,start/1.19),radius=(.16+height*.004+(5-branch)*.008)*(.9+hash(tree*19+branch+8901)*.2);
        var limb=treeBranch(origin.x,origin.y,origin.z,tx+leanX+dx,node.y*height,tz+leanZ+dz,radius,'branch',tree*.73+branch*1.81);
        if(branch<3){
          var forkT=node.forkAt,fork=treeShaftPoint(limb,forkT),twigRadius=Math.min(.09+height*.002,radius*(.55-(forkT-.5)*.92)*.76);
          var twigDX=(node.twigX*cos+node.twigZ*sin)*width,twigDZ=(-node.twigX*sin+node.twigZ*cos)*width;
          treeBranch(fork.x,fork.y,fork.z,tx+leanX+twigDX,node.twigY*height,tz+leanZ+twigDZ,twigRadius,'twig',tree*.91-branch*1.3);
        }
      }
      var crown=mesh(crowns[variant],canopyMaterial([0x4d6b42,0x667b4b,0x4e704b,0x738451][tree%4]),tx+leanX,0,tz+leanZ,width,height,width);
      crown.rotation.y=turn;
    }
    // Leaf mold warms the floor only beneath the actual outer woodland groves.
    // Broad overlapping color washes keep the open meadow and footpath green.
    function woodlandBlend(near,far,value){var blend=Math.max(0,Math.min(1,(value-near)/(far-near)));return blend*blend*(3-2*blend);}
    var woodlandLitterColor=linear(0x60563f),woodlandGroundColor=new T.Color(),woodlandGroundColors=ground.attributes.color;
    for(var woodlandVertex=0;woodlandVertex<gp.count;woodlandVertex++){
      var woodlandX=gp.getX(woodlandVertex),woodlandZ=-gp.getY(woodlandVertex),woodlandCoverage=0;
      for(var woodlandRoot=0;woodlandRoot<woodlandRoots.length;woodlandRoot++){
        var floorRoot=woodlandRoots[woodlandRoot];woodlandCoverage=Math.max(woodlandCoverage,1-woodlandBlend(6,28,Math.hypot(woodlandX-floorRoot.x,woodlandZ-floorRoot.z)));
      }
      woodlandCoverage*=.68*woodlandBlend(120,145,Math.hypot(woodlandX,woodlandZ))*woodlandBlend(7,15,Math.abs(woodlandX-pathX(woodlandZ)));
      if(woodlandCoverage<=0)continue;
      woodlandGroundColor.fromBufferAttribute(woodlandGroundColors,woodlandVertex).lerp(woodlandLitterColor,woodlandCoverage);
      woodlandGroundColors.setXYZ(woodlandVertex,woodlandGroundColor.r,woodlandGroundColor.g,woodlandGroundColor.b);
    }
    woodlandGroundColors.needsUpdate=true;
    // The hedge uses the same open leaf structure at a smaller scale. Broken
    // clusters bridge the grass and trees without introducing nectar flowers.
    var shrubs=new T.Group();shrubs.name='meadow-hedgerow';scene.add(shrubs);
    for(var shrub=0;shrub<76;shrub++){
      var shrubAngle=shrub*2.39996,shrubRadius=130+hash(shrub+5101)*55,shrubX=Math.cos(shrubAngle)*shrubRadius,shrubZ=Math.sin(shrubAngle)*shrubRadius;
      if(Math.abs(shrubX-pathX(shrubZ))<9)continue;
      var shrubSize=1.6+hash(shrub+5201)*2.5;
      var shrubMesh=mesh(shrubGeometries[shrub%3],canopyMaterial(shrub%2?0x61784a:0x4c6d43),shrubX,0,shrubZ,shrubSize*(1.2+hash(shrub+5202)*.5),shrubSize*(.78+hash(shrub+5203)*.22),shrubSize,shrubs);shrubMesh.rotation.y=shrub;
    }
    // Three softly covered cards hold twenty-one slender curved blades per tuft.
    // MSAA coverage smooths their silhouettes without transparent sorting, while
    // screen-space filtering fades subpixel detail instead of making dark specks.
    // Mixed grass habits: fine upright shoots, arching blades and sparse old straw.
    var grassData={positions:[],colors:[]},grassUV=[],grassCards=[];
    for(var card=0;card<3;card++){
      var ga=card*Math.PI/3,gc=Math.cos(ga),gs=Math.sin(ga);
      var corners=[[-.75,0,0,0],[.75,0,1,0],[-.59,1.25,0,1],[.91,1.25,1,1]];
      [0,1,2,1,3,2].forEach(function(index){var p=corners[index],bend=p[1]*p[1]*.16;grassData.positions.push(p[0]*gc-gs*bend,p[1],p[0]*gs+gc*bend);var tone=.67+p[3]*.33;grassData.colors.push(tone,tone,tone);grassUV.push(p[2],p[3]);grassCards.push(card);});
    }
    var grass=dataGeometry(grassData);grass.setAttribute('uv',new T.Float32BufferAttribute(grassUV,2));grass.setAttribute('bfGrassCard',new T.Float32BufferAttribute(grassCards,1));grass.name='meadow-grass-blades';
    var grassMaterial=mat(0xffffff,{side:T.DoubleSide,vertexColors:true,alphaTest:.025,alphaToCoverage:true,emissive:linear(0x344922),emissiveIntensity:.065});grassMaterial.extensions={derivatives:true};
    grassMaterial.onBeforeCompile=function(shader){
      shader.uniforms.bfBreeze=breeze;shader.uniforms.bfWindStrength=windStrength;
      // Each tuft samples wind at its root. Only height varies over the blade,
      // so this shear's inverse transpose changes the surface normal's Y term.
      // The upward skylight bias remains unchanged under the same transform.
      shader.vertexShader=windGLSL+[
        'attribute float bfGrassCard;varying vec2 bfGrassUV;varying float bfGrassShapeSeed;varying float bfGrassSeed;varying float bfGrassWidth;varying vec3 bfGrassUp;',
        'vec3 bfGrassWindNormal(vec3 n,vec2 bend,float height){return vec3(n.x,n.y-2.*height*(bend.x*n.x+bend.y*n.z),n.z);}'
      ].join('\n')+'\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 bfRoot=vec3(0.);bfGrassWidth=1.;\n#ifdef USE_INSTANCING\nbfRoot=instanceMatrix[3].xyz;bfGrassWidth=clamp(sqrt(length(instanceMatrix[1].xyz)),.45,1.);\n#endif\nbfGrassUV=uv;bfGrassSeed=dot(bfRoot.xz,vec2(.37,.61))+bfGrassCard*4.13;bfGrassShapeSeed=floor(bfGrassSeed*64.+.5);bfGrassUp=mat3(viewMatrix)*vec3(0.,1.,0.);');
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',[
        'vec4 mvPosition=vec4(transformed,1.);',
        '#ifdef USE_INSTANCING',
        'mvPosition=instanceMatrix*mvPosition;',
        '#endif',
        'vec4 bfWorld=modelMatrix*mvPosition;vec3 bfWindRoot=(modelMatrix*vec4(bfRoot,1.)).xyz;float bfBladeHeight=max(0.,bfWorld.y-bfWindRoot.y);float bfWave=bfMeadowGust(bfWindRoot.xz);float bfRustle=sin(bfBreeze*2.9+bfGrassSeed)*.025*bfWindStrength;bfWorld.xz+=vec2(bfWave*.14+bfRustle,bfWave*.064-bfRustle*.3)*bfBladeHeight*bfBladeHeight;',
        '#ifndef FLAT_SHADED',
        'if(bfWindStrength>0.){vec3 bfGrassNormal=(vec4(transformedNormal,0.)*viewMatrix).xyz;bfGrassNormal=bfGrassWindNormal(bfGrassNormal,vec2(bfWave*.14+bfRustle,bfWave*.064-bfRustle*.3),bfBladeHeight);transformedNormal=mat3(viewMatrix)*bfGrassNormal;vNormal=normalize(transformedNormal);}',
        '#endif',
        'mvPosition=viewMatrix*bfWorld;gl_Position=projectionMatrix*mvPosition;'
      ].join('\n'));
      shader.fragmentShader='uniform float bfBreeze;uniform float bfWindStrength;varying vec2 bfGrassUV;varying float bfGrassShapeSeed;varying float bfGrassSeed;varying float bfGrassWidth;varying vec3 bfGrassUp;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
        '#include <color_fragment>',
        // Restore a constant card key before the shape hashes. Raw wind phase
        // stays separate, so interpolation cannot roughen the blade silhouette.
        'float bfStableGrassSeed=floor(bfGrassShapeSeed+.5)/64.;float bfBlade=floor(bfGrassUV.x*7.);',
        'float bfRandom=fract(sin(bfBlade*17.17+bfStableGrassSeed)*437.58),bfGrowth=fract(sin(bfBlade*5.87+bfStableGrassSeed*.47)*159.7);',
        'float bfHabit=fract(sin(bfBlade*1.73+bfStableGrassSeed*.417)*813.7);',
        'float bfArch=smoothstep(.61,.76,bfHabit),bfStraw=smoothstep(.965,.997,bfHabit)*smoothstep(.65,.9,bfGrassWidth);',
        'float bfTall=(.34+.61*bfRandom+.05*bfGrowth)*(1.-bfArch*.10-bfStraw*.12),bfT=bfGrassUV.y/bfTall;',
        'float bfNaturalLean=fract(sin(bfBlade*8.31+bfStableGrassSeed*1.7)*713.1)-.5;',
        'float bfLeanSide=bfNaturalLean<0.?-1.:1.;',
        // The centerline stays in its own cell all the way to the tapered tip.
        // An arched blade therefore bends smoothly instead of being cut off at
        // a repeated card boundary. The same habit also changes width and color.
        'float bfLean=mix(bfNaturalLean*.44,bfLeanSide*(.27+.105*bfGrowth),bfArch);',
        'float bfRustle=(.018*sin(bfBreeze*1.4+bfBlade*1.2+bfGrassSeed)+.009*sin(bfBreeze*2.7-bfGrassSeed*.6+bfBlade))*bfWindStrength*(1.+bfArch*.28-bfStraw*.22);',
        'float bfCurve=bfLean*(.24*bfT+(.52+.16*bfGrowth)*bfT*bfT)+bfRustle*bfT*bfT;',
        'float bfBase=(fract(sin(bfBlade*13.9+bfStableGrassSeed*.8)*173.3)-.5)*.13;',
        'float bfAcross=fract(bfGrassUV.x*7.)-.5-bfBase-bfCurve;',
        // A slender shaft keeps its width before a soft, pointed final taper.
        // Sparse dry straw retains its original finer silhouette.
        'float bfBladeT=clamp(bfT,0.,1.);float bfBladeTaper=.85*(1.-.25*bfBladeT)*(1.-smoothstep(mix(.50,.60,bfGrowth),1.,bfBladeT));',
        'float bfTipProfile=mix(bfBladeTaper,pow(max(0.,1.-bfT),.67+.17*bfGrowth),bfStraw);',
        'float bfWidth=(.106+.065*bfGrowth)*bfGrassWidth*(1.+bfArch*.34-bfStraw*.18)*bfTipProfile+.0015;',
        'float bfAA=max(.006,(fwidth(bfGrassUV.x*7.)+abs(bfLean*(.24+(1.04+.32*bfGrowth)*bfT)+2.*bfRustle*bfT)*fwidth(bfGrassUV.y)/bfTall)*.65);',
        'float bfCoverage=(1.-smoothstep(max(0.,bfWidth-bfAA),bfWidth+bfAA,abs(bfAcross)))*min(1.,bfWidth/max(.001,bfAA));',
        'float bfBladeMask=bfCoverage*(1.-smoothstep(.94,1.,bfT));diffuseColor.a*=bfBladeMask;',
        'float bfRib=pow(max(0.,1.-abs(bfAcross)/max(.001,bfWidth)),3.),bfBladeRise=smoothstep(0.,.72,bfT);',
        'float bfBladeRoll=clamp(bfAcross/max(.001,bfWidth),-1.,1.);',
        'diffuseColor.rgb*=mix(.76,1.10,bfBladeRise)+.045*bfRib+.035*bfBladeRoll*(bfGrowth-.5);',
        'diffuseColor.rgb*=vec3(1.+(bfGrowth-.5)*.065,1.+(bfRandom-.5)*.035,1.-(bfGrowth-.5)*.085);',
        'float bfDryTip=smoothstep(mix(.68,.39,bfStraw),1.,bfT)*smoothstep(.72,.96,bfRandom);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.14,1.02,.79),bfDryTip*.42);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.39,1.11,.68),bfStraw*.72);',
        'float bfGrassRelief=.009*bfRib*(.45+.55*clamp(bfT,0.,1.))*(1.-smoothstep(.025,.16,bfAA));'
      ].join('\n'));
      // A blade's thin, curved surface scatters skylight. Lifting the shading
      // normal avoids the alternating bright/dark strips of crossed flat cards.
      // A resolved blade cups around its own rib, with a small individual twist.
      // Derivative tangents follow the wind-bent card; subpixel blades retain
      // the broad skylight response instead of sparkling at their margins.
      shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>","#include <normal_fragment_maps>\nvec3 bfGrassSurfaceBase=normalize(normal*.48+bfGrassUp*.76);\nvec3 bfGrassSurfaceDx=dFdx(-vViewPosition),bfGrassSurfaceDy=dFdy(-vViewPosition);\nvec2 bfGrassUvDx=dFdx(bfGrassUV),bfGrassUvDy=dFdy(bfGrassUV);\nfloat bfGrassUvHand=sign(bfGrassUvDx.x*bfGrassUvDy.y-bfGrassUvDx.y*bfGrassUvDy.x);\nvec3 bfGrassAcross=(bfGrassSurfaceDx*bfGrassUvDy.y-bfGrassSurfaceDy*bfGrassUvDx.y)*bfGrassUvHand;\nbfGrassAcross-=bfGrassSurfaceBase*dot(bfGrassSurfaceBase,bfGrassAcross);\nbfGrassAcross*=inversesqrt(max(dot(bfGrassAcross,bfGrassAcross),.00000001));\nfloat bfGrassShapeResolve=1.-smoothstep(.035,.22,bfAA);\nfloat bfGrassCup=(-.48*bfBladeRoll+(.5-bfGrowth)*.26)*(.65+.35*bfBladeRise);\nbfGrassSurfaceBase=normalize(bfGrassSurfaceBase+bfGrassAcross*bfGrassCup*bfGrassShapeResolve*(gl_FrontFacing?1.:-1.));\nvec3 bfGrassSurfaceBx=cross(bfGrassSurfaceDy,bfGrassSurfaceBase),bfGrassSurfaceBy=cross(bfGrassSurfaceBase,bfGrassSurfaceDx);\nfloat bfGrassSurfaceDet=dot(bfGrassSurfaceDx,bfGrassSurfaceBx);\nvec3 bfGrassSurfaceBump=abs(bfGrassSurfaceDet)*bfGrassSurfaceBase-sign(bfGrassSurfaceDet)*(dFdx(bfGrassRelief)*bfGrassSurfaceBx+dFdy(bfGrassRelief)*bfGrassSurfaceBy);\nnormal=normalize(mix(bfGrassSurfaceBase,normalize(bfGrassSurfaceBump+bfGrassSurfaceBase*.000001),.26));");
      shader.fragmentShader=shader.fragmentShader.replace("#include <lights_fragment_end>","#include <lights_fragment_end>\nvec3 bfGrassLightThrough=vec3(0.);float bfGrassLightBack=0.;\n#if NUM_DIR_LIGHTS > 0\n#pragma unroll_loop_start\nfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\nbfGrassLightBack=max(0.,-dot(geometry.normal,directionalLights[i].direction));\nbfGrassLightThrough+=directionalLights[i].color*bfGrassLightBack*bfGrassLightBack;\n}\n#pragma unroll_loop_end\n#endif\nreflectedLight.directDiffuse+=diffuseColor.rgb*bfGrassLightThrough*(.035*(.4+.6*clamp(bfT,0.,1.)))*vec3(.92,1.,.74);");
    };
    grassMaterial.customProgramCacheKey=function(){return 'butterfly-meadow-cupped-grass-v13';};
    var transform=new T.Object3D(),grassTransforms=[],grassColors=[],grassBeds=[[-42,-28],[38,-54],[-42,38]];
    function grassMargin(distance,radius){var t=Math.max(0,Math.min(1,(radius+2.8-distance)/5.6));return t*t*(3-2*t);}
    // Broader arching blades keep the field full with fewer crossed cards,
    // leaving room for the finer woodland within the shared mobile budget.
    // Existing outer-meadow tufts also form a loose woodland understory.
    for(var i=0;i<18000;i++){
      // Small, overlapping tussocks leave natural openings. Some growth is
      // concentrated around the flower beds without increasing the tuft count.
      var understoryShade=0;
      var cluster=Math.floor(i/4),ga=hash(i+6101)*Math.PI*2,gr=.4+Math.sqrt(hash(i+6201))*3.4;
      var gx=(hash(cluster*2+401)-.5)*232+Math.cos(ga)*gr,gz=(hash(cluster*2+402)-.5)*232+Math.sin(ga)*gr;
      if(i%8===0){var bed=grassBeds[Math.floor(i/8)%3],br=Math.sqrt(hash(i+6301))*23;gx=bed[0]+Math.cos(ga)*br;gz=bed[1]+Math.sin(ga)*br;}
      if(Math.abs(gx-pathX(gz))<3.15+hash(i+450)*.6)continue;
      // Preserve original acceptance, near views and every dedicated bed tuft.
      // Failed relocation candidates retain their original meadow positions.
      if(Math.hypot(gx,gz)>90&&i%8!==0&&i%5===3){
        var understoryRoot=woodlandRoots[Math.floor(i/5)%woodlandRoots.length],understoryAngle=hash(i+8421)*Math.PI*2,understoryRadius=2.6+Math.sqrt(hash(i+8422))*7.4;
        var understoryX=understoryRoot.x+Math.cos(understoryAngle)*understoryRadius,understoryZ=understoryRoot.z+Math.sin(understoryAngle)*understoryRadius;
        if(Math.abs(understoryX-pathX(understoryZ))>=5.2){gx=understoryX;gz=understoryZ;understoryShade=1-woodlandBlend(2.6,10,understoryRadius);}
      }
      var marginNoise=.85*Math.sin(gx*.34+Math.sin(gz*.29))+.45*Math.cos(gz*.57-gx*.13);
      var lawn=grassMargin(Math.min(Math.hypot(gx-38,gz-38),Math.hypot(gx+42,gz-38))+marginNoise,19);
      var bedBlend=grassMargin(Math.min(Math.hypot(gx+42,gz+28),Math.hypot(gx-38,gz+54))+marginNoise,20);
      var clump=.75+.18*Math.sin(gx*.13+Math.sin(gz*.16)*2.7)+.07*Math.cos(gz*.27-gx*.19);
      var edge=Math.abs(gx-pathX(gz)),fieldHeight=(.58+hash(i+712)*1.3)*clump*(.63+.37*Math.min(1,Math.max(0,(edge-3.2)/4)));
      var grassHeight=fieldHeight*(1-bedBlend)+(.38+hash(i+711)*.59)*bedBlend;
      grassHeight=grassHeight*(1-lawn)+(.06+hash(i+710)*.08)*lawn;
      // Woodland tufts form a lower, cooler understory beneath their own trees.
      // Full-sun meadow, dedicated beds, rejected relocations and the path stay exact.
      grassHeight*=1-understoryShade*.12;
      transform.position.set(gx,0,gz);transform.rotation.set((hash(i+714)-.5)*.16,i*2.3999,(hash(i+715)-.5)*.16);transform.scale.set(1.2+hash(i+713)*.7,grassHeight,1.2+hash(i+713)*.7);transform.updateMatrix();grassTransforms.push(transform.matrix.clone());
      var tone=.48+.22*Math.sin(gx*.075+Math.sin(gz*.058))+.17*Math.cos(gz*.093-gx*.027)+(hash(i+977)-.5)*.16;
      var grassTint=linear(0x4d6c3c).lerp(linear(0x7b8951),Math.max(0,Math.min(1,tone)));
      grassTint.r*=1-understoryShade*.22;grassTint.g*=1-understoryShade*.17;grassTint.b*=1-understoryShade*.10;grassColors.push(grassTint);
    }
    var grassBatch=new T.InstancedMesh(grass,grassMaterial,grassTransforms.length);
    grassTransforms.forEach(function(matrix,i){grassBatch.setMatrixAt(i,matrix);grassBatch.setColorAt(i,grassColors[i]);});
    grassBatch.name='shared-meadow-grass';grassBatch.instanceMatrix.needsUpdate=true;scene.add(grassBatch);

    // A few dry seed heads give depth without implying additional nectar resources.
    function drySeedHead(){
      var positions=[],colors=[];
      function tri(a,b,c){
        var ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
        if(Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)<1e-9)return;
        [a,b,c].forEach(function(p){positions.push(p[0],p[1],p[2]);colors.push(p[3],p[3],p[3]);});
      }
      // The stalk axis passes through the original stem junction, with its bend
      // confined above that point. Its two upper segments carry every grain base.
      function axis(y){var bend=y<=0?0:y<=.5?y*.04:.02+(y-.5)*.28;return [bend,y,-bend*.3];}
      var ys=[-1,0,.5,1],radii=[0,.035,.026,0];
      function stalkPoint(row,lon){var p=axis(ys[row]),a=lon*Math.PI*2/5;return [p[0]+Math.cos(a)*radii[row],p[1],p[2]+Math.sin(a)*radii[row],.71+row*.045];}
      for(var row=0;row<3;row++)for(var lon=0;lon<5;lon++){
        var a=stalkPoint(row,lon),b=stalkPoint(row+1,lon),c=stalkPoint(row,lon+1),d=stalkPoint(row+1,lon+1);tri(a,b,c);tri(b,d,c);
      }
      // Slender pointed grains replace the spherical beads. Shorter upper grains
      // make a tapered spike, while the spiral keeps its profile open on all sides.
      for(var grain=0;grain<9;grain++){
        var base=axis(-.7+grain*.17),angle=grain*2.399963,ca=Math.cos(angle),sa=Math.sin(angle);
        var reach=.34*(1-grain*.065),rise=.15+grain*.0075,length=Math.hypot(reach,rise),dx=ca*reach/length,dy=rise/length,dz=sa*reach/length;
        var u=[-sa,0,ca],v=[dy*ca,-reach/length,dy*sa],along=[0,.23,.68,1],width=[0,1,.58,0],radius=.078-grain*.0025,tone=.79+(grain%3)*.055;
        function grainPoint(row,lon){var t=along[row],a=lon*Math.PI*2/5,r=width[row]*radius;return [base[0]+ca*reach*t+(u[0]*Math.cos(a)+v[0]*Math.sin(a))*r,base[1]+rise*t+v[1]*Math.sin(a)*r,base[2]+sa*reach*t+(u[2]*Math.cos(a)+v[2]*Math.sin(a))*r,tone*(.88+row*.045)];}
        for(var row=0;row<3;row++)for(var lon=0;lon<5;lon++){
          var a=grainPoint(row,lon),b=grainPoint(row+1,lon),c=grainPoint(row,lon+1),d=grainPoint(row+1,lon+1);tri(a,c,b);tri(b,c,d);
        }
      }
      return {positions:positions,colors:colors};
    }
    function smoothDrySeedNormals(geometry){
      var p=geometry.attributes.position,n=geometry.attributes.normal;
      // Each twenty-face component owns its seam and pointed ends. Joining only
      // its coincident corners rounds the light response without blending grains
      // into the stalk or moving the existing silhouette and stem junction.
      for(var start=0;start<p.count;start+=60){
        var joined=new Map(),keys=[];
        for(var vertex=start;vertex<start+60;vertex++){
          var x=p.getX(vertex),y=p.getY(vertex),z=p.getZ(vertex),key=[x,y,z].map(function(value){return Math.round(value*1e6);}).join(':');keys.push(key);
          var face=vertex-vertex%3,corner=vertex%3,b=face+(corner+1)%3,c=face+(corner+2)%3;
          var ux=p.getX(b)-x,uy=p.getY(b)-y,uz=p.getZ(b)-z,vx=p.getX(c)-x,vy=p.getY(c)-y,vz=p.getZ(c)-z;
          var angle=Math.atan2(Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx),ux*vx+uy*vy+uz*vz);
          if(!joined.has(key))joined.set(key,[0,0,0]);var sum=joined.get(key);
          sum[0]+=n.getX(vertex)*angle;sum[1]+=n.getY(vertex)*angle;sum[2]+=n.getZ(vertex)*angle;
        }
        joined.forEach(function(sum){var length=Math.hypot(sum[0],sum[1],sum[2]);sum[0]/=length;sum[1]/=length;sum[2]/=length;});
        for(var vertex=start;vertex<start+60;vertex++){var normal=joined.get(keys[vertex-start]);n.setXYZ(vertex,normal[0],normal[1],normal[2]);}
      }
      n.needsUpdate=true;
    }
    var seed=dataGeometry(drySeedHead());smoothDrySeedNormals(seed);seed.name='meadow-grass-seed-spike';
    for(var si=0;si<150;si++){
      var sx=(hash(si+1901)-.5)*210,sz=(hash(si+2901)-.5)*210;
      if(Math.abs(sx-pathX(sz))<5||Math.hypot(sx-38,sz-38)<21||Math.hypot(sx+42,sz-38)<21||Math.hypot(sx+42,sz+28)<20||Math.hypot(sx-38,sz+54)<20)continue;
      var sh=1.6+hash(si+3901)*1.4;mesh(cylinder,vegetationWind(mat(0x7c8050),'plant'),sx,sh*.5,sz,.018,sh,.018);var seedMesh=mesh(seed,vegetationWind(mat(0xb0a175,{vertexColors:true}),'plant'),sx,sh,sz,.32,.32,.32);seedMesh.rotation.y=si*2.399963;
    }
    var pebble=new T.IcosahedronGeometry(1,0);
    for(var stone=0;stone<125;stone++){var stoneZ=(hash(stone+4001)-.5)*300,stoneX=pathX(stoneZ)+(hash(stone+4101)-.5)*4.8;mesh(pebble,mat(stone%2?0x9d957b:0xc2b79a),stoneX,.03,stoneZ,.09+hash(stone+4201)*.15,.035,.08+hash(stone+4301)*.1);}
    function plantingBed(p,parent,nectar){
      var positions=[p.x,.024,p.z],colors=[],indices=[],center=linear(nectar?0x4d6534:0x738952);colors.push(center.r,center.g,center.b);
      for(var ring=0;ring<3;ring++)for(var n=0;n<64;n++){
        var angle=n*Math.PI/32,rad=[10,17.2,20.4][ring]*(1+.025*Math.sin(angle*7)+.018*Math.sin(angle*11)),x=p.x+Math.cos(angle)*rad,z=p.z+Math.sin(angle)*rad,c=ring===2?groundColor(x,z):center.clone().lerp(groundColor(x,z),ring===1?.35:.08);
        positions.push(x,.024,z);colors.push(c.r,c.g,c.b);
        if(ring===0)indices.push(0,1+(n+1)%64,1+n);
        if(ring>0){var inner=1+(ring-1)*64+n,next=1+(ring-1)*64+(n+1)%64,outer=1+ring*64+n,outerNext=1+ring*64+(n+1)%64;indices.push(inner,next,outer,outer,next,outerNext);}
      }
      var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,groundMaterial,0,0,0,1,1,1,parent);
    }
    // A curved, thin blade replaces the former ellipsoid; its origin is the lens target.
    // Adaptive milkweed rows keep broad-blade camber while rounding the same-budget tip.
    // Natural bergamot gains rounded cross-blade camber within a smaller triangle budget.
    function leafGeometry(serrated,natural,profile){
      profile=profile||0;
      // Shape meadow blades across their width; teaching blades stay exact.
      var rounded=natural&&!serrated;
      var pos=[],col=[],uvs=[],idx=[];
      // Put extra longitudinal samples around the blade's rounded shoulder and
      // tapered tip. The first two intervals form a short, narrow petiole.
      var stations=natural?(rounded?[0,.075,.16,.28,.46,.64,.81,.94,1]:[0,.075,.16,.29,.45,.61,.77,.93,1]):null;
      var sides=rounded?[-1,-.5,0,.5,1]:[-1,0,1],columns=sides.length,lastRow=natural?stations.length-1:12;
      var adaptiveRows=natural?[]:null;
      var leafLength=serrated?.83:.95,base=natural?-.7/(leafLength*Math.cos(.12)):0;
      for(var row=0;row<=lastRow;row++){
        var x=-1+row/6,w=Math.pow(Math.max(0,1-x*x),serrated?.84:.72);
        if(serrated&&row>0&&row<lastRow)w*=row%2?.85:1;
        // Five columns retain the broad crown; the narrow shoulder uses
        // three, and one original center point closes the pointed tip.
        var rowSides=natural&&row===lastRow?[0]:natural&&row===lastRow-1?[-1,0,1]:natural&&serrated&&row>2&&row<lastRow-1?[-1,-.5,0,.5,1]:sides;
        if(natural)adaptiveRows.push({start:pos.length/3,sides:rowSides});
        rowSides.forEach(function(side){
          var ridge=.07*(1-x*x),y=ridge-.055*Math.abs(side)*w+.05*x*x+(serrated?.035*Math.sin(x*2.8)*Math.abs(side)*w:0),edge=side*w,along=x;
          if(natural){
            var t=stations[row],bladeT=Math.max(0,(t-.16)/.84),envelope=Math.sin(Math.PI*bladeT);
            var breadth=t<.16?.016+.012*t/.16:row===2?.028:Math.pow(Math.max(0,envelope),serrated?.87:.64);
            if(serrated&&row>2&&row<lastRow)breadth*=row%2?.95:1.02;
            // One side is fuller than the other, and the central rib gently bows.
            // Milkweed keeps its broad oval blade; bergamot keeps pointed teeth.
            var asymmetry=1+side*(serrated?.07:.105)*Math.sin(bladeT*2.8+.65);
            var spine=.055*Math.sin(Math.PI*t)-.075*t*t*t+.025*Math.sin(t*Math.PI*2);
            var roll=breadth*(-.105+.037*Math.sin(bladeT*4.2)+side*.05*Math.sin(bladeT*2.9+.3));
            if(row>2&&row<lastRow){
              // Broad milkweed leaves arch around a strong central rib; the
              // narrower bergamot blade has a softer twist and pointed teeth.
              // Three shared profiles vary the shoulders and curled margins,
              // with identical petiole vertices and terminal tips in each.
              var leafPhase=[.35,1.8,3.3][profile],fold=Math.sin(Math.PI*bladeT);
              breadth*=1+.055*fold*Math.sin(bladeT*5.4+leafPhase);
              asymmetry+=side*(serrated?.065:.085)*fold*Math.sin(bladeT*3.2+leafPhase);
              spine+=(serrated?.055:.105)*fold*Math.sin(Math.PI*t)*(.78+.22*Math.sin(bladeT*3.+leafPhase));
              roll=breadth*(-.155-.035*Math.sin(bladeT*3.7+leafPhase)+side*(serrated?.07:.095)*fold*Math.sin(bladeT*3.2+leafPhase));
            }
            along=base+(1-base)*t;
            edge=side*breadth*asymmetry+.045*breadth*Math.sin(bladeT*Math.PI);
            y=spine+Math.pow(Math.abs(side),1.5)*roll;
            // The petiole reaches the stem axis; variation rotates around that
            // axis, so rolling the blade cannot detach its narrow base.
            if(row===0)y=0;
          }
          pos.push(along,y,edge);
          uvs.push(natural?stations[row]:(x+1)*.5,(side+1)*.5);
          var shade=natural?1+Math.abs(side)*(side<0?-.12:-.06):side===0?1:side<0?.88:.94;
          col.push(shade,shade,shade);
        });
        if(!natural&&row<lastRow)for(var strip=0;strip<columns-1;strip++){var a=row*columns+strip;idx.push(a,a+1,a+columns,a+1,a+columns+1,a+columns);}
      }
      if(natural)for(var band=0;band<adaptiveRows.length-1;band++){
        var low=adaptiveRows[band],high=adaptiveRows[band+1];
        if(high.sides.length===1){
          // A real fan replaces the old near-collapsed five-point tip row.
          for(var strip=0;strip<low.sides.length-1;strip++)idx.push(low.start+strip,low.start+strip+1,high.start);
        }else{
          // Zip ordered side coordinates. Equal next coordinates retain the
          // original quad diagonal and winding; unequal ones consume one
          // side interval without a T-junction or an overlapping face.
          var lo=0,hi=0;
          while(lo<low.sides.length-1||hi<high.sides.length-1){
            var nextLow=lo<low.sides.length-1?low.sides[lo+1]:Infinity,nextHigh=hi<high.sides.length-1?high.sides[hi+1]:Infinity;
            if(nextLow<nextHigh){idx.push(low.start+lo,low.start+lo+1,high.start+hi);lo++;}
            else if(nextHigh<nextLow){idx.push(low.start+lo,high.start+hi+1,high.start+hi);hi++;}
            else{idx.push(low.start+lo,low.start+lo+1,high.start+hi,low.start+lo+1,high.start+hi+1,high.start+hi);lo++;hi++;}
          }
        }
      }
      var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('bfLeafFlex',new T.Float32BufferAttribute(new Float32Array(pos.length/3).fill(natural?1/(1-base):0),1));g.setIndex(idx);g.computeVertexNormals();g.name='habitat-leaf-blade';
      // Only the natural blade can flutter; these bounds also enclose its small shader bend.
      if(natural){g.computeBoundingBox();g.boundingBox.min.y-=.055;g.boundingBox.max.y+=.055;g.computeBoundingSphere();g.boundingSphere.radius+=.055;}
      return g;
    }
    var leaves=leafGeometry(false),bergamotLeaves=leafGeometry(true),meadowMilkweedLeaves=[0,1,2].map(function(profile){return leafGeometry(false,true,profile);}),meadowBergamotLeaves=[0,1,2].map(function(profile){return leafGeometry(true,true,profile);});
    // Fine, branching venation lives on the blade itself, preserving the exact
    // larval feeding surface while freeing the former cylinder-vein geometry.
    // Layered leaf skylight follows the undeformed root, independently of breeze.
    var leafMaterials=[0x688a4f,0x537346].map(function(color){
      var material=mat(color,{side:T.DoubleSide,vertexColors:true,roughness:.88});material.extensions={derivatives:true};
      material.onBeforeCompile=function(shader){
        // A small blade flex starts beyond the fixed petiole. The inverse
        // blade length is zero on teaching leaves, preserving every contact.
        shader.vertexShader=[
          'attribute float bfLeafFlex;varying vec2 bfLeafUv;varying float bfBladeSkyExposure;',
          'vec3 bfLeafFlutterWarp(vec3 p){',
          'float bfLeafSpan=clamp((uv.x-.16)/.84,0.,1.);',
          'float bfLeafEnvelope=bfLeafSpan*bfLeafSpan*(3.-2.*bfLeafSpan);',
          'float bfLeafSlope=6.*bfLeafSpan*(1.-bfLeafSpan)*bfLeafFlex/.84;',
          'vec4 bfLeafRoot=vec4(0.,0.,0.,1.);',
          '#ifdef USE_INSTANCING',
          'bfLeafRoot=instanceMatrix*bfLeafRoot;',
          '#endif',
          'bfLeafRoot=modelMatrix*bfLeafRoot;',
          'float bfLeafPhase=bfBreeze*3.1+dot(bfLeafRoot.xyz,vec3(1.17,2.03,.83));',
          'float bfLeafLoad=.045*bfMeadowGust(bfLeafRoot.xz)*bfPlantWind*bfLeafFlex*sin(bfLeafPhase);',
          'float bfLeafTwist=1.+p.z*.45;',
          'return vec3(bfLeafEnvelope*bfLeafLoad*bfLeafTwist,bfLeafSlope*bfLeafLoad*bfLeafTwist,bfLeafEnvelope*bfLeafLoad*.45);',
          '}'
        ].join('\n')+'\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',[
          '#include <beginnormal_vertex>',
          'vec3 bfBladeFlex=vec3(0.);',
          'if(bfLeafFlex>0.&&bfPlantWind>0.&&bfWindStrength>0.){',
          'bfBladeFlex=bfLeafFlutterWarp(position);',
          'objectNormal=normalize(vec3(objectNormal.x-bfBladeFlex.y*objectNormal.y,objectNormal.y,objectNormal.z-bfBladeFlex.z*objectNormal.y));',
          '}'
        ].join('\n'));
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',[
          '#include <begin_vertex>',
          'if(bfLeafFlex>0.&&bfPlantWind>0.&&bfWindStrength>0.)transformed.y+=bfBladeFlex.x;',
          'bfLeafUv=uv;vec4 bfBladeRoot=vec4(0.,0.,0.,1.);',
          '#ifdef USE_INSTANCING',
          'bfBladeRoot=instanceMatrix*bfBladeRoot;',
          '#endif',
          'bfBladeRoot=modelMatrix*bfBladeRoot;',
          'bfBladeSkyExposure=smoothstep(.65,2.7,bfBladeRoot.y);'
        ].join('\n'));
        shader.fragmentShader='varying vec2 bfLeafUv;varying float bfBladeSkyExposure;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
          '#include <color_fragment>',
          'float bfAcross=abs(bfLeafUv.y-.5),bfLeafPixel=length(fwidth(bfLeafUv));',
          'float bfBladeMask=smoothstep(.13,.23,bfLeafUv.x)*(1.-smoothstep(.93,1.,bfLeafUv.x));',
          'float bfMidrib=(1.-smoothstep(.006,.017+bfLeafPixel,bfAcross))*min(1.,.02/max(.002,bfLeafPixel));',
          'float bfVeinPhase=bfLeafUv.x*10.5-bfAcross*(2.2+1.5*bfAcross)+.12*sin(bfLeafUv.x*13.)+.06*bfAcross*sin(bfLeafUv.x*31.);',
          'float bfVeinAA=max(.025,fwidth(bfVeinPhase));',
          'float bfVeins=(1.-smoothstep(.018,.045+bfVeinAA,abs(fract(bfVeinPhase)-.5)))*(1.-smoothstep(.12,.5,bfVeinAA))*min(1.,.045/bfVeinAA)*bfBladeMask;',
          'float bfBranchPhase=bfLeafUv.x*25.+bfAcross*(5.7+1.6*bfAcross)+.2*sin(bfLeafUv.x*23.);',
          'float bfBranchAA=max(.025,fwidth(bfBranchPhase));',
          'float bfBranch=(1.-smoothstep(.012,.032+bfBranchAA,abs(fract(bfBranchPhase)-.5)))*bfAcross*(1.-smoothstep(.12,.45,bfBranchAA))*min(1.,.025/bfBranchAA)*bfBladeMask;',
          'float bfLeafEdge=smoothstep(.35,.5,bfAcross),bfLeafUpper=gl_FrontFacing?1.:0.;',
          'float bfLeafMottle=sin(bfLeafUv.x*13.+sin(bfLeafUv.y*9.))*sin(bfLeafUv.y*7.-bfLeafUv.x*5.);',
          'diffuseColor.rgb*=.92+.08*sin(bfLeafUv.x*3.14159)+.018*bfLeafMottle;',
          'diffuseColor.rgb+=vec3(.068,.095,.03)*(bfMidrib*.47+bfVeins*.22+bfBranch*.08)*(1.-smoothstep(.4,.5,bfAcross));',
          'diffuseColor.rgb=mix(diffuseColor.rgb*vec3(1.07,1.10,1.04)+vec3(.012,.018,.009),diffuseColor.rgb,bfLeafUpper);',
          'float bfBladeRelief=(bfMidrib*.0011+bfVeins*.00032+bfBranch*.00012)*(1.-smoothstep(.38,.5,bfAcross));',
          'float bfLeafThin=clamp(1.-bfMidrib*.58-bfVeins*.12,.25,1.);'
        ].join('\n'));
        // A raised midrib changes the local light response without changing
        // the geometric surface that the learner's caterpillar sits on.
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',[
          '#include <normal_fragment_maps>',
          'vec3 bfBladeDx=dFdx(-vViewPosition),bfBladeDy=dFdy(-vViewPosition);',
          'vec3 bfBladeBx=cross(bfBladeDy,normal),bfBladeBy=cross(normal,bfBladeDx);float bfBladeDet=dot(bfBladeDx,bfBladeBx);',
          'vec3 bfBladeBump=abs(bfBladeDet)*normal-sign(bfBladeDet)*(dFdx(bfBladeRelief)*bfBladeBx+dFdy(bfBladeRelief)*bfBladeBy);',
          'normal=normalize(mix(normal,normalize(bfBladeBump+normal*1.e-12),.38));'
        ].join('\n'));
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.94,clamp(.85+.025*bfLeafMottle-.035*bfMidrib,.79,.91),bfLeafUpper);');
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',[
          '#include <lights_fragment_end>',
          // Lower leaf layers receive less broad sky fill; directional sun
          // and the thin-leaf transmission below retain their full response.
          'reflectedLight.indirectDiffuse*=.72+.28*bfBladeSkyExposure;',
          '#if NUM_DIR_LIGHTS > 0',
          'float bfBladeBacklight=pow(max(0.,dot(-normal,directionalLights[0].direction)),2.);',
          'reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[0].color*bfBladeBacklight*bfLeafThin*(.075+.035*bfLeafEdge);',
          '#endif'
        ].join('\n'));
      };
      material.customProgramCacheKey=function(){return 'butterfly-layered-leaf-skylight-flutter-v8';};return vegetationWind(material,'plant');
    });
    // A tapered, gently bowed stem uses one shared geometry. Its root and
    // flower tip stay fixed, as do the established opposite leaf pairs.
    var stemPositions=[],stemIndices=[],stemRows=[0,.16,.32,.47,.61,.8,1];
    stemRows.forEach(function(t,row){
      var bend=.15*Math.sin(Math.PI*t)*Math.sin((t-.32)*Math.PI)*Math.sin((t-.61)*Math.PI),radius=.055*(1-t*.38);
      for(var side=0;side<5;side++){var a=side*Math.PI*.4;stemPositions.push(bend+Math.cos(a)*radius,t,bend*.6+Math.sin(a)*radius);if(row<stemRows.length-1){var i=row*5+side,n=row*5+(side+1)%5;stemIndices.push(i,i+5,n,n,i+5,n+5);}}
    });
    var botanicalStem=new T.BufferGeometry();botanicalStem.setAttribute('position',new T.Float32BufferAttribute(stemPositions,3));botanicalStem.setIndex(stemIndices);botanicalStem.computeVertexNormals();botanicalStem.name='meadow-botanical-stem';
    function petalBuilder(){
      var positions=[],tones=[],groups=[],frames={},partNormals={},group=0,bloomAnchors=[],bloomAxes=[],bloomAnchor=[0,0,0,0],bloomAxis=[0,1,0,0];
      return {bloom:function(anchor,axis,index,kind){
        // Index zero pins the feeding flower, the top milkweed contact cap,
        // and neutral bracts against the instance's botanical variation.
        bloomAnchor=anchor?[anchor[0],anchor[1],anchor[2],index]:[0,0,0,0];
        bloomAxis=axis?[axis[0],axis[1],axis[2],kind]:[0,1,0,0];
      },part:function(map,pigmented,surfaceNormals){
        group++;if(surfaceNormals)partNormals[group]=surfaceNormals;
        if(map){
          // Each petal carries its own surface frame. Veins follow the actual
          // lobe, rather than slicing all flowers along the same object axis.
          var origin=new T.Vector3().fromArray(map(0,0,0)),along=new T.Vector3().fromArray(map(1,0,0)).sub(origin),across=new T.Vector3().fromArray(map(0,1,0)).sub(origin);
          frames[group]={origin:origin,along:along.divideScalar(along.lengthSq()),across:across.divideScalar(across.lengthSq()),pigmented:pigmented!==false,throat:pigmented==='throat',minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
        }
      },tri:function(a,b,c,color){[a,b,c].forEach(function(p,vertex){positions.push(p[0],p[1],p[2]);tones.push(Array.isArray(color)?color[vertex]:color);groups.push(group);bloomAnchors.push.apply(bloomAnchors,bloomAnchor);bloomAxes.push.apply(bloomAxes,bloomAxis);});},geometry:function(){
        var g=dataGeometry({positions:positions,tones:tones}),p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,joined={},partColors={},keys=[],coords=new Float32Array(p.count*3),point=new T.Vector3(),normalEdgeA=new T.Vector3(),normalEdgeB=new T.Vector3();
        // Smooth only vertices belonging to the same botanical part. This
        // rounds the tube/petal lighting without welding neighboring florets
        // or softening the separate corona, pollen and bract surfaces.
        for(var i=0;i<p.count;i++){
          var partColor=partColors[groups[i]]||(partColors[groups[i]]={r:0,g:0,b:0,count:0});partColor.r+=c.getX(i);partColor.g+=c.getY(i);partColor.b+=c.getZ(i);partColor.count++;
          var key=groups[i]+':'+Math.round(p.getX(i)*100000)+':'+Math.round(p.getY(i)*100000)+':'+Math.round(p.getZ(i)*100000);keys.push(key);
          if(!joined[key])joined[key]={normal:new T.Vector3(),equalNormal:new T.Vector3(),faces:[],color:new T.Vector3(),count:0};
          // Corner-angle weighting softens joins on the surrounding florets.
          // Reserved feeding caps and neutral parts retain their exact normals.
          var normalWeight=1;
          if(bloomAnchors[i*4+3]>.5){
            var face=i-i%3,corner=i%3;point.fromBufferAttribute(p,i);
            normalEdgeA.fromBufferAttribute(p,face+(corner+1)%3).sub(point).normalize();
            normalEdgeB.fromBufferAttribute(p,face+(corner+2)%3).sub(point).normalize();
            normalWeight=Math.acos(Math.max(-1,Math.min(1,normalEdgeA.dot(normalEdgeB))));
          }
          var item=joined[key],faceNormal=new T.Vector3(n.getX(i),n.getY(i),n.getZ(i));item.normal.addScaledVector(faceNormal,normalWeight);item.equalNormal.add(faceNormal);item.faces.push(faceNormal);item.color.add(new T.Vector3(c.getX(i),c.getY(i),c.getZ(i)));item.count++;
          var frame=frames[groups[i]];
          if(frame){point.fromBufferAttribute(p,i).sub(frame.origin);var x=point.dot(frame.along),y=point.dot(frame.across);coords[i*3]=x;coords[i*3+1]=y;coords[i*3+2]=frame.throat?-2:frame.pigmented?1:-1;frame.minX=Math.min(frame.minX,x);frame.maxX=Math.max(frame.maxX,x);frame.minY=Math.min(frame.minY,y);frame.maxY=Math.max(frame.maxY,y);}
        }
        for(var i=0;i<p.count;i++){
          var item=joined[keys[i]],normal=item.surfaceNormal;
          if(!normal){
            normal=item.normal.clone().normalize();
            // Tight clipped folds keep their original shared normal if the
            // weighted candidate would turn behind any incident triangle.
            for(var face=0;face<item.faces.length;face++)if(normal.dot(item.faces[face])<=.000001){normal.copy(item.equalNormal).normalize();break;}
            item.surfaceNormal=normal;
          }
          // A tube's circular cross sections provide smooth normals without
          // letting the unequal ring counts bias the light along triangle diagonals.
          var curvedNormals=partNormals[groups[i]],curvedNormal=curvedNormals&&curvedNormals[p.getX(i)+':'+p.getY(i)+':'+p.getZ(i)];
          if(curvedNormal)normal=curvedNormal;
          n.setXYZ(i,normal.x,normal.y,normal.z);var partColor=partColors[groups[i]];c.setXYZ(i,.82*item.color.x/item.count+.18*partColor.r/partColor.count,.82*item.color.y/item.count+.18*partColor.g/partColor.count,.82*item.color.z/item.count+.18*partColor.b/partColor.count);
          var frame=frames[groups[i]];
          if(frame){
            if(frame.throat){
              // Raw frame zero is the lip axis. A centered scale keeps the
              // cavity centered even when its five-sided rim is asymmetric.
              coords[i*3]=.5+coords[i*3]/(2*Math.max(.00001,Math.abs(frame.minX),Math.abs(frame.maxX)));
              coords[i*3+1]=.5+coords[i*3+1]/(2*Math.max(.00001,Math.abs(frame.minY),Math.abs(frame.maxY)));
            }else{coords[i*3]=(coords[i*3]-frame.minX)/Math.max(.00001,frame.maxX-frame.minX);coords[i*3+1]=(coords[i*3+1]-frame.minY)/Math.max(.00001,frame.maxY-frame.minY);}
          }
        }
        g.setAttribute('bfPetalCoords',new T.BufferAttribute(coords,3));g.setAttribute('bfBloomAnchor',new T.Float32BufferAttribute(bloomAnchors,4));g.setAttribute('bfBloomAxis',new T.Float32BufferAttribute(bloomAxes,4));return g;
      }};
    }
    // butterfly-soft-corolla-silhouettes-v7: rounded trumpet mouths and softly rolled petal margins.
    // Slender bergamot necks retain the existing rings, mouth planes and contact flower.
    // Milkweed corona floors deepen beneath fixed rims; the top contact cap stays authored.
    // Reflexed milkweed blades open and twist individually beneath untouched corona rims.
    // Outer bergamot lower lips sweep gently away from fixed roots and mouth frames.
    // Outer bergamot tube color follows continuous authored axial rings.
    // Outer hoods grow from the actual polygonal corolla rim. Only the short
    // rooted margin moves; its offset fades toward the unchanged tip.
    function bergamotHoodRootAlong(along,side,radius,softness,reach,sides){
      var end=.045*reach,across=side*softness;
      // Surface-frame probes outside the petal must retain a finite affine basis.
      if(along<-.0230001||along>end||Math.abs(across)>=radius)return along;
      var back=Infinity;
      for(var edge=0;edge<sides;edge++){
        var a=.17+edge*Math.PI*2/sides,b=.17+(edge+1)*Math.PI*2/sides;
        var ax=Math.cos(a)*radius,ay=Math.sin(a)*radius,bx=Math.cos(b)*radius,by=Math.sin(b)*radius;
        if(Math.abs(by-ay)>.000001&&across>=Math.min(ay,by)&&across<=Math.max(ay,by))back=Math.min(back,ax+(bx-ax)*(across-ay)/(by-ay));
      }
      if(!Number.isFinite(back))return along;
      var t=Math.max(0,Math.min(1,(along+.023)/(end+.023)));
      return along+(back+.023)*(1-t*t*(3-2*t));
    }
    // Organic bergamot bracts keep the rooted fan but vary reach, spread and gentle cup.
    // Both levels use the same eighteen triangles; flower contacts stay untouched.
    function bergamotBractFan(builder,emit){
      var triangle=emit||function(a,b,c,tone){builder.tri(a,b,c,tone);};
      for(var bract=0;bract<9;bract++){
        var ba=bract*Math.PI*2/9+.065*Math.sin(bract*1.71),bx=Math.cos(ba),bz=Math.sin(ba);
        var reach=.86+.12*(.5+.5*Math.sin(bract*2.17+.4)),breadth=.82+.12*(.5+.5*Math.cos(bract*1.91)),roll=.008*Math.sin(bract*1.37+.7);
        // Compact leaf-like bracts cup beneath the corollas. A shallow raised
        // midrib and drooping tips replace the broad, nearly horizontal collar.
        var tipDrop=-.16+.024*(.5+.5*Math.sin(bract*1.31)),shoulderDrop=-.07+(tipDrop+.07)*.55-.012;
        var root=[0,-.07,0],left=[bx*.29*reach-bz*.09*breadth,shoulderDrop+roll,bz*.29*reach+bx*.09*breadth],tip=[bx*.53*reach,tipDrop,bz*.53*reach],right=[bx*.29*reach+bz*.09*breadth,shoulderDrop-roll,bz*.29*reach-bx*.09*breadth];
        var bractTipTone=bract%3===1?0x9b8793:0x8c9274;
        builder.part();triangle(root,left,tip,[0x697b50,0x7c885c,bractTipTone]);triangle(root,tip,right,[0x697b50,bractTipTone,0x728053]);
      }
    }
    // Outer rose petals fold twenty-eight degrees toward their pedicels around the
    // existing basal hinge. Their cup and twist rotate intact below fixed coronas.
    function reflexMilkweedCorolla(point,center,u,v,axis,ca,sa){
      var fx=u.x*ca+v.x*sa,fy=u.y*ca+v.y*sa,fz=u.z*ca+v.z*sa;
      var dx=point[0]-center.x,dy=point[1]-center.y,dz=point[2]-center.z;
      var along=dx*fx+dy*fy+dz*fz-.026,lift=dx*axis.x+dy*axis.y+dz*axis.z-.024;
      var cosine=.882947592858927,sine=.4694715627858908;
      var foldAlong=(cosine-1)*along+sine*lift,foldLift=-sine*along+(cosine-1)*lift;
      return [point[0]+fx*foldAlong+axis.x*foldLift,point[1]+fy*foldAlong+axis.y*foldLift,point[2]+fz*foldAlong+axis.z*foldLift];
    }
    // Shorter outer pedicels bring whole florets into a denser rounded umbel.
    // The upper transition leaves the three teaching flowers exactly authored.
    function milkweedUmbelRadius(f){
      var radius=.46+.035*Math.sin(f*1.8),t=Math.max(0,Math.min(1,(f-2)/3));
      return radius*(1-.10*t*t*(3-2*t));
    }
    function flowerHead(milkweed,detail){
      if(detail){
        // Only the flower under inspection uses this mesh. Shared meadow heads
        // keep their original geometry and all existing contact coordinates.
        var reference=flowerHead(milkweed,false);reference.computeBoundingBox();
        var bounds=reference.boundingBox,close=petalBuilder();
        function clipped(p){return [Math.max(bounds.min.x,Math.min(bounds.max.x,p[0])),Math.max(bounds.min.y,Math.min(bounds.max.y,p[1])),Math.max(bounds.min.z,Math.min(bounds.max.z,p[2]))];}
        function tri(a,b,c,tone){close.tri(clipped(a),clipped(b),clipped(c),tone);}
        function spline(points){return new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3(p[0],p[1],p[2]);}),false,'catmullrom',.34);}
        // A ribbon follows both curved margins, with a separate central fold.
        // Collapsed ends have a fan, so no zero-area triangles reach the GPU.
        function ribbon(left,right,map,fold,tones,pointed){
          var l=spline(left),r=spline(right),rows=[],steps=pointed?6:f===0?9:11;
          close.part(map);
          for(var row=0;row<=steps;row++){
            var t=row/steps,a=l.getPoint(t),b=r.getPoint(t),mid=a.clone().add(b).multiplyScalar(.5);mid.z+=fold*Math.sin(Math.PI*t)*(1+.16*Math.sin(t*Math.PI*2+.4));
            rows.push([map(a.x,a.y,a.z),map(mid.x,mid.y,mid.z),map(b.x,b.y,b.z)]);
          }
          for(var row=0;row<steps;row++)for(var strip=0;strip<2;strip++){
            var a=rows[row][strip],b=rows[row][strip+1],c=rows[row+1][strip],d=rows[row+1][strip+1],tone=tones[Math.min(tones.length-1,Math.floor(row*tones.length/steps))];
            if(!(pointed&&row===0))tri(a,c,b,tone);
            if(!(pointed&&row===steps-1))tri(b,c,d,tone);
          }
          if(!pointed){
            var endLeft=left[left.length-1],endRight=right[right.length-1],endAlong=(endLeft[0]+endRight[0])*.5,endLift=(endLeft[2]+endRight[2])*.5,tip=map(endAlong+.006,0,endLift-.003),tone=tones[tones.length-1];
            if(f>0&&fold<0){
              // Four short arcs round the lower lip's end instead of the old
              // two-triangle point. The central feeding floret is unchanged.
              var tipLeft=map(endAlong+.004,endLeft[1]*.65,endLift-.002),tipRight=map(endAlong+.004,endRight[1]*.65,endLift-.002);
              tri(rows[steps][0],tipLeft,rows[steps][1],tone);tri(tipLeft,tip,rows[steps][1],tone);tri(tip,tipRight,rows[steps][1],tone);tri(tipRight,rows[steps][2],rows[steps][1],tone);
            }else{tri(rows[steps][0],tip,rows[steps][1],tone);tri(rows[steps][1],tip,rows[steps][2],tone);}
          }
        }
        if(milkweed){
          for(var f=0;f<19;f++){
            var ny=1-2*(f+.5)/19,fa=f*2.39996,rr=Math.sqrt(1-ny*ny),normal=new T.Vector3(Math.cos(fa)*rr,ny,Math.sin(fa)*rr),u=new T.Vector3(-Math.sin(fa),0,Math.cos(fa)),v=new T.Vector3().crossVectors(normal,u),center=normal.clone().multiplyScalar(milkweedUmbelRadius(f));center.y+=.15;
            close.bloom([0,.015,0],normal.toArray(),f>2?f:0,1);
            function hdFlower(along,side,lift){return center.clone().addScaledVector(u,along).addScaledVector(v,side).addScaledVector(normal,lift).toArray();}
            close.part();tri([0,.015,0],hdFlower(-.009,0,-.01),hdFlower(.009,0,-.01),0x78865a);tri([0,.015,0],hdFlower(0,-.009,-.01),hdFlower(0,.009,-.01),0x8c9569);
            for(var petal=0;petal<5;petal++){
              var pa=petal*Math.PI*.4+f*.13,ca=Math.cos(pa),sa=Math.sin(pa);
              // Only the rose ribbon passes through this wrapper. Pale hood
              // interpolation can dip below .03 and must use hdPetal directly.
              function hdReflexedPetal(along,side,lift){
                if(f>2){var originalSide=side,t=Math.max(0,Math.min(1,(along-.026)/.151)),shape=Math.sin(Math.PI*t)*Math.sin(f*1.37+petal*2.11);side*=1+.12*shape;lift+=.18*originalSide*shape;}
                var point=hdPetal(along,side,lift);
                return f>2?reflexMilkweedCorolla(point,center,u,v,normal,ca,sa):point;
              }
              function hdPetal(along,side,lift){if(f>2&&lift<.03)lift+=.012*Math.sin(Math.PI*Math.max(0,Math.min(1,along/.19)))*Math.pow(Math.abs(side)/.06,2);return hdFlower(ca*along-sa*side,sa*along+ca*side,lift);}
              // The curved margins retain their cup and central fold as each
              // outer rose petal turns beneath its unchanged pale corona.
              ribbon([[.026,0,.024],[.095,.057,.008],[.149,.043,-.036],[.177,0,-.074]],[[.026,0,.024],[.092,-.054,.006],[.149,-.041,-.039],[.177,0,-.074]],hdReflexedPetal,.009,[f%3===0?0xc28ba3:0xbc809b,0xd49db2,0xca90a8],true);
              // The eight-sided rim curls around a recessed corona cup. Both
              // original upper contact points remain explicit rim vertices.
              var rim=[[.038,.028,.033],[.057,.027,.067],[.079,.019,.091],[.089,.003,.089],[.091,-.015,.085],[.064,-.027,.063],[.038,-.028,.033],[.033,0,.030]],cup=hdPetal(.061,0,f>2?.043:.052);
              var rimCurve=new T.CatmullRomCurve3(rim.map(function(p){return new T.Vector3(p[0],p[1],p[2]);}),true,'centripetal'),roundedRim=[],rimEdges=[];
              for(var edge=0;edge<8;edge++){
                roundedRim.push(rim[edge]);rimEdges.push(edge);
                roundedRim.push(rimCurve.getPoint((edge+.5)/8).toArray());rimEdges.push(edge);
              }
              close.part(hdPetal,false);
              for(var edge=0;edge<roundedRim.length;edge++){
                var originalEdge=rimEdges[edge];tri(cup,hdPetal.apply(null,roundedRim[edge]),hdPetal.apply(null,roundedRim[(edge+1)%roundedRim.length]),originalEdge<3?(f%4===0?0xead6d4:0xe6c5ce):originalEdge<5?0xc49aaa:0xddb8c4);
              }
            }
            // A tiny, rounded center replaces the flat pollen diamond.
            close.part();
            for(var edge=0;edge<6;edge++){
              var aa=edge*Math.PI/3,bb=(edge+1)*Math.PI/3,a=hdFlower(Math.cos(aa)*.028,Math.sin(aa)*.028,.065),b=hdFlower(Math.cos(bb)*.028,Math.sin(bb)*.028,.065);
              tri(hdFlower(0,0,.074),a,b,0xf0d4a5);tri(hdFlower(0,0,.058),b,a,0xe2bc85);
            }
          }
        }else{
          for(var f=0;f<18;f++){
            var fa=f*2.39996+.16*Math.sin(f*1.9),originalRadius=Math.sqrt((f+.5)/18)*.49;
            var opening=f===0?1:(f===5||f===12?.38:f%5===3?.73:.92+.08*Math.sin(f*1.41));
            var spread=f===0?1:.87+.06*Math.sin(f*1.67),fr=originalRadius*spread;
            var direction=fa+(f===0?0:.25*Math.sin(f*1.37)),ux=Math.cos(direction),uz=Math.sin(direction),x=Math.cos(fa)*fr,z=Math.sin(fa)*fr;
            close.bloom([x,.025,z],[0,1,0],f,0);
            var originalHeight=.315+(.5-originalRadius)*.48+.021*Math.sin(f*2.3)+.48*.49*(Math.sqrt(.5/18)-Math.sqrt(.5/24));
            var height=f===0?originalHeight:originalHeight*(.87+.09*Math.sin(f*.93))+(opening<.5?-.028:.014);
            var lean=f===0?.13:(.14+.045*Math.sin(f*1.7))*(.78+.22*opening),mx=x+ux*lean,mz=z+uz*lean;
            var radius=(.056+.006*Math.sin(f*1.3))*(f===0?1:1.04+.13*opening)*(opening<.5?.7:1),softness=(.93+.1*Math.sin(f*1.8))*(.72+.28*opening),lilac=f%3===0,rose=f%4===0;
            var middle={x:x+ux*lean*.19-uz*.012*Math.sin(f*1.2),y:.025+(height-.025)*.58,z:z+uz*lean*.19+ux*.012*Math.sin(f*1.2),r:radius*(f===0?.78:.48)};
            if(f===0)middle={x:x+ux*lean*.28,y:.025+(height-.025)*.49,z:z+uz*lean*.28,r:radius*.73};
            var axis=f===0?new T.Vector3(0,1,0):new T.Vector3(mx-middle.x,height-middle.y,mz-middle.z).normalize();
            var forward=new T.Vector3(ux,0,uz).addScaledVector(axis,-(ux*axis.x+uz*axis.z)).normalize(),across=new T.Vector3().crossVectors(forward,axis).normalize();
            function hdLip(along,side,lift){return [mx+forward.x*along+across.x*side*softness+axis.x*lift,height+forward.y*along+across.y*side*softness+axis.y*lift,mz+forward.z*along+across.z*side*softness+axis.z*lift];}
            // Rounded sections follow a curved neck; the final ring lies
            // in the unchanged opening plane shared by the lip and dark throat.
            var path=new T.QuadraticBezierCurve3(new T.Vector3(x,.025,z),new T.Vector3(middle.x*2-(x+mx)*.5,middle.y*2-(.025+height)*.5,middle.z*2-(z+mz)*.5),new T.Vector3(mx,height,mz)),rings=[],tubeSides=f===0?16:12;
            for(var row=1;row<=3;row++){
              var t=f===0?row/3:row===1?.15:row===2?.82:1,c=path.getPoint(t),ringAxis=new T.Vector3(axis.x*t,1-(1-axis.y)*t,axis.z*t).normalize(),rf=new T.Vector3(ux,0,uz).addScaledVector(ringAxis,-(ux*ringAxis.x+uz*ringAxis.z)).normalize(),rs=new T.Vector3().crossVectors(rf,ringAxis).normalize(),r=radius*(f===0?(.27+.73*Math.pow(t,.7)):(row===1?.26:row===2?.50:1)),ring=[];
              for(var side=0;side<tubeSides;side++){var a=.17+side*Math.PI/(tubeSides*.5);ring.push(c.clone().addScaledVector(rf,Math.cos(a)*r).addScaledVector(rs,Math.sin(a)*r).toArray());}rings.push(ring);
            }
            // Keep the short basal fan at its root tone; subsequent rings
            // carry one authored color each, without triangle-diagonal bias.
            var tubeRingTones=[rose?0xa581a9:lilac?0x9c7aa8:0xa385b1,0xb193be,opening<.5?0xad8ab5:rose?0xc2a0bf:lilac?0xc0a1cd:0xc4a7d0];
            close.part();
            for(var side=0;side<tubeSides;side++){
              var next=(side+1)%tubeSides;tri([x,.025,z],rings[0][side],rings[0][next],rose?0xa581a9:lilac?0x9c7aa8:0xa385b1);
              for(var row=0;row<2;row++){tri(rings[row][side],rings[row+1][side],rings[row][next],f===0?0xb193be:[tubeRingTones[row],tubeRingTones[row+1],tubeRingTones[row]]);tri(rings[row][next],rings[row+1][side],rings[row+1][next],f===0?(opening<.5?0xad8ab5:rose?0xc2a0bf:lilac?0xc0a1cd:0xc4a7d0):[tubeRingTones[row],tubeRingTones[row+1],tubeRingTones[row+1]]);}
            }
            close.part(f>0?hdLip:null,'throat');
            for(var side=0;side<tubeSides;side++){var aa=.17+side*Math.PI/(tubeSides*.5),bb=.17+(side+1)*Math.PI/(tubeSides*.5);tri(hdLip(0,0,-.042),hdLip(Math.cos(bb)*radius*.88,Math.sin(bb)*radius*.88/softness,-.028),hdLip(Math.cos(aa)*radius*.88,Math.sin(aa)*radius*.88/softness,-.028),rose?0x825c7e:0x78577f);}
            var reach=.55+.45*opening,wide=.48+.52*opening,hoodLift=.062+.025*opening;
            // The lower ribbon alone sweeps sideways and twists. Its root
            // has zero displacement and slope; upper hood and mouth use their
            // original maps, and the protected central floret bypasses this.
            function softHdLowerLip(along,side,lift){
              if(f>0){var originalSide=side,t=Math.max(0,Math.min(1,(along-.008)/(.15*reach-.008))),turn=Math.sin(f*1.31+.6)*opening*t*t*(3-2*t);side+=.018*turn;lift+=.16*originalSide*turn;}
              return softHdLip(along,side,lift);
            }
            // The upper hood tapers separately from the broader lower lip.
            // The reserved feeding floret retains its original hood and opening.
            function softHdHoodLip(along,side,lift){
              if(f>0){var t=Math.max(0,Math.min(1,(along+.023)/(.088*reach+.023)));side*=1-.45*t*t*(3-2*t);}
              var point=softHdLip(along,side,lift);
              if(f>0){var shift=bergamotHoodRootAlong(along,side,radius,softness,reach,12)-along;point[0]+=forward.x*shift;point[1]+=forward.y*shift;point[2]+=forward.z*shift;}
              return point;
            }
            function softHdLip(along,side,lift){
              // Rolled margins and a lightly hollow center soften the sheet
              // across its width while preserving the tube and pollen frame.
              if(f>0){var bowl=Math.sin(Math.PI*Math.max(0,Math.min(1,(along+.023)/.2)));lift+=bowl*(.017*Math.pow(Math.abs(side)/.08,2)-.004)*opening;}
              return hdLip(along,side,lift);
            }
            ribbon([[-.023,-.044*wide,0],[.024*reach,-.053*wide,hoodLift*.75],[.078*reach,-.023*wide,hoodLift],[.088*reach,-.006*wide,hoodLift*.94]],[[-.023,.041*wide,0],[.029*reach,.048*wide,hoodLift*.77],[(f>0&&opening>.5?.080:.088)*reach,.016*wide,hoodLift*.92],[.088*reach,.006*wide,hoodLift*.94]],softHdHoodLip,f>0&&opening>.5?.024:.012,[0xbe9ec9,0xd0b6d7,0xcbb0d2],false);
            var lowerLeft=f===0?[[.008,-.04*wide,-.005],[.077*reach,-.076*wide,-.014*opening],[.143*reach,-.034*wide,-.058*opening],[.15*reach,-.005*wide,-.069*opening]]:[[.008,-.04*wide,-.005],[.082*reach,-.078*wide,-.017*opening],[.14*reach,-.042*wide,-.055*opening],[.158*reach,-.014*wide,-.067*opening]];
            var lowerRight=f===0?[[.008,.037*wide,-.005],[.091*reach,.069*wide,-.018*opening],[.148*reach,.024*wide,-.061*opening],[.15*reach,.005*wide,-.069*opening]]:[[.008,.037*wide,-.005],[.094*reach,.073*wide,-.021*opening],[.147*reach,.036*wide,-.058*opening],[.158*reach,.014*wide,-.067*opening]];
            ribbon(lowerLeft,lowerRight,softHdLowerLip,-.019*opening,[rose?0xc3a0c1:0xc5a6d0,0xc9acd2,0xc5a6d0],false);
            // The raised pollen tip ends at the original contact vertex.
            var stamenLift=f===0?.128:.096+.025*opening,tip=[.103*reach,.006,stamenLift],base=[.006,0,.015],neck=[tip[0]-.002,tip[1],tip[2]-.014],stalkBase=[],stalkTop=[],anther=[];
            for(var side=0;side<4;side++){var a=side*Math.PI/2;stalkBase.push(hdLip(base[0]+Math.cos(a)*.0019,base[1]+Math.sin(a)*.0019,base[2]));stalkTop.push(hdLip(neck[0]+Math.cos(a)*.0014,neck[1]+Math.sin(a)*.0014,neck[2]));anther.push(hdLip(tip[0]-.001+Math.cos(a)*.0036,tip[1]+Math.sin(a)*.0036,tip[2]-.006));}
            close.part();for(var side=0;side<4;side++){var next=(side+1)%4;tri(stalkBase[side],stalkTop[side],stalkBase[next],0xd2afc8);tri(stalkBase[next],stalkTop[side],stalkTop[next],0xdcc1d1);}
            close.part();for(var side=0;side<4;side++){var next=(side+1)%4;tri(hdLip.apply(null,tip),anther[side],anther[next],0xe2c9d8);tri(hdLip.apply(null,neck),anther[next],anther[side],0xcaa7c0);}
          }
          close.bloom();
          bergamotBractFan(close,tri);
        }
        var detailed=close.geometry();detailed.name=reference.name+'-close-detail';reference.dispose();return detailed;
      }

      var out=petalBuilder();
      if(milkweed){
        // Fewer, fuller flowers leave room for round, reflexed petals while
        // retaining the five pale hoods that distinguish a milkweed umbel.
        for(var f=0;f<19;f++){
          var ny=1-2*(f+.5)/19,fa=f*2.39996,rr=Math.sqrt(1-ny*ny),normal=new T.Vector3(Math.cos(fa)*rr,ny,Math.sin(fa)*rr),u=new T.Vector3(-Math.sin(fa),0,Math.cos(fa)),v=new T.Vector3().crossVectors(normal,u),center=normal.clone().multiplyScalar(milkweedUmbelRadius(f));center.y+=.15;
          out.bloom([0,.015,0],normal.toArray(),f>2?f:0,1);
          function fp(along,across,height){return center.clone().addScaledVector(u,along).addScaledVector(v,across).addScaledVector(normal,height).toArray();}
          out.part();
          out.tri([0,.015,0],fp(-.009,0,-.01),fp(.009,0,-.01),0x78865a);out.tri([0,.015,0],fp(0,-.009,-.01),fp(0,.009,-.01),0x8c9569);
          for(var petal=0;petal<5;petal++){
            var pa=petal*Math.PI*.4+f*.13,ca=Math.cos(pa),sa=Math.sin(pa);
            // Match the close rose blade without changing its fixed base,
            // pointed tip, pale corona, pollen or protected contact florets.
            function reflexedPetal(along,across,height){
              if(f>2){var originalSide=across,t=Math.max(0,Math.min(1,(along-.026)/.151)),shape=Math.sin(Math.PI*t)*Math.sin(f*1.37+petal*2.11);across*=1+.12*shape;height+=.18*originalSide*shape;}
              var point=pp(along,across,height);
              return f>2?reflexMilkweedCorolla(point,center,u,v,normal,ca,sa):point;
            }
            function pp(along,across,height){if(f>2&&height<.03)height+=.012*Math.sin(Math.PI*Math.max(0,Math.min(1,along/.19)))*Math.pow(Math.abs(across)/.06,2);return fp(ca*along-sa*across,sa*along+ca*across,height);}
            var base=reflexedPetal(.026,0,.024),left=reflexedPetal(.095,.057,.008),shoulderLeft=reflexedPetal(.149,.043,-.036),tip=reflexedPetal(.177,0,-.074),shoulderRight=reflexedPetal(.149,-.041,-.039),right=reflexedPetal(.092,-.054,.006);
            out.part(reflexedPetal);
            out.tri(base,left,shoulderLeft,f%3===0?0xc28ba3:0xbc809b);
            out.tri(base,shoulderLeft,tip,0xd49db2);
            out.tri(base,tip,shoulderRight,0xd19bb1);
            out.tri(base,shoulderRight,right,0xca90a8);
            // Each pale hood folds around a shaded inner cup. Its existing
            // upper rim stays in place for the visiting butterfly's contact.
            var hoodBaseLeft=pp(.038,.028,.033),hoodBaseRight=pp(.038,-.028,.033),hoodLeft=pp(.079,.019,.091),hoodRight=pp(.091,-.015,.085),hoodCup=pp(.061,0,f>2?.043:.052);
            out.part(pp,false);out.tri(hoodBaseLeft,hoodLeft,hoodCup,f%4===0?0xead6d4:0xe6c5ce);out.tri(hoodCup,hoodLeft,hoodRight,0xc49aaa);out.tri(hoodCup,hoodRight,hoodBaseRight,0xddb8c4);
          }
          out.part();
          out.tri(fp(-.028,0,.065),fp(0,.028,.065),fp(.028,0,.065),0xe8c68f);out.tri(fp(-.028,0,.065),fp(.028,0,.065),fp(0,-.028,.065),0xf1d8ac);
        }
      }else{
        // Eighteen florets share a fuller, uneven crown. The central flower
        // retains its original contact point; its neighbors bend and open at
        // slightly different angles instead of forming upright radial spokes.
        for(var f=0;f<18;f++){
          var fa=f*2.39996+.16*Math.sin(f*1.9),originalRadius=Math.sqrt((f+.5)/18)*.49;
          var opening=f===0?1:(f===5||f===12?.38:f%5===3?.73:.92+.08*Math.sin(f*1.41));
          var spread=f===0?1:.87+.06*Math.sin(f*1.67),fr=originalRadius*spread;
          var direction=fa+(f===0?0:.25*Math.sin(f*1.37)),ux=Math.cos(direction),uz=Math.sin(direction),x=Math.cos(fa)*fr,z=Math.sin(fa)*fr;
          out.bloom([x,.025,z],[0,1,0],f,0);
          var originalHeight=.315+(.5-originalRadius)*.48+.021*Math.sin(f*2.3)+.48*.49*(Math.sqrt(.5/18)-Math.sqrt(.5/24));
          var height=f===0?originalHeight:originalHeight*(.87+.09*Math.sin(f*.93))+(opening<.5?-.028:.014);
          var lean=f===0?.13:(.14+.045*Math.sin(f*1.7))*(.78+.22*opening),mx=x+ux*lean,mz=z+uz*lean;
          var radius=(.056+.006*Math.sin(f*1.3))*(f===0?1:1.04+.13*opening)*(opening<.5?.7:1),softness=(.93+.1*Math.sin(f*1.8))*(.72+.28*opening),lilac=f%3===0,rose=f%4===0;
          var middle={x:x+ux*lean*.19-uz*.012*Math.sin(f*1.2),y:.025+(height-.025)*.58,z:z+uz*lean*.19+ux*.012*Math.sin(f*1.2),r:radius*(f===0?.78:.36)};
          if(f===0)middle={x:x+ux*lean*.28,y:.025+(height-.025)*.49,z:z+uz*lean*.28,r:radius*.73};
          var axis=f===0?new T.Vector3(0,1,0):new T.Vector3(mx-middle.x,height-middle.y,mz-middle.z).normalize();
          var forward=new T.Vector3(ux,0,uz).addScaledVector(axis,-(ux*axis.x+uz*axis.z)).normalize(),across=new T.Vector3().crossVectors(forward,axis).normalize();
          function tp(along,side,lift){return [mx+forward.x*along+across.x*side*softness+axis.x*lift,height+forward.y*along+across.y*side*softness+axis.y*lift,mz+forward.z*along+across.z*side*softness+axis.z*lift];}
          // Ring planes follow the tube's bend, so the opening and petals face
          // along the corolla. The slim basal neck keeps the same triangle cost.
          // Outer corollas keep a longer slender neck before their late trumpet flare.
          // Tube-only rings move; lip, throat and pollen frames stay authored.
          var tubeMiddle=f===0?middle:{x:middle.x+(mx-middle.x)*.35,y:middle.y+(height-middle.y)*.35,z:middle.z+(mz-middle.z)*.35,r:radius*.43};
          var rings=[{x:x,y:.025,z:z,r:f===0?.023:.020},tubeMiddle,{x:mx,y:height,z:mz,r:radius}];
          function rp(ring,angle,top){
            if(f===0)return [ring.x+Math.cos(angle)*ring.r,ring.y,ring.z+Math.sin(angle)*ring.r];
            var tilt=top?1:.5,ringAxis=new T.Vector3(axis.x*tilt,1-(1-axis.y)*tilt,axis.z*tilt).normalize();
            var ringForward=new T.Vector3(ux,0,uz).addScaledVector(ringAxis,-(ux*ringAxis.x+uz*ringAxis.z)).normalize(),ringSide=new T.Vector3().crossVectors(ringForward,ringAxis).normalize();
            return [ring.x+ring.r*(ringForward.x*Math.cos(angle-fa)+ringSide.x*Math.sin(angle-fa)),ring.y+ring.r*(ringForward.y*Math.cos(angle-fa)+ringSide.y*Math.sin(angle-fa)),ring.z+ring.r*(ringForward.z*Math.cos(angle-fa)+ringSide.z*Math.sin(angle-fa))];
          }
          out.part();
          var rootTone=rose?0xa581a9:lilac?0x9c7aa8:0xa385b1,tipTone=opening<.5?0xad8ab5:rose?0xc2a0bf:lilac?0xc0a1cd:0xc4a7d0;
          if(f===0){
            // The teaching flower keeps its exact authored contact geometry.
            for(var band=0;band<2;band++)for(var side=0;side<5;side++){
              var aa=fa+.17+side*Math.PI*.4,bb=fa+.17+(side+1)*Math.PI*.4,low=rings[band],high=rings[band+1];
              var a=rp(low,aa,false),b=rp(low,bb,false),c=rp(high,aa,band===1),d=rp(high,bb,band===1);
              if(band){out.tri(a,c,b,0xb193be);out.tri(b,c,d,tipTone);}
              else out.tri([low.x,low.y,low.z],c,d,rootTone);
            }
          }else{
            // A narrow basal ring replaces the old pointed cone. Four-sided
            // neck rings meet the unchanged six-sided mouth in eighteen faces.
            // butterfly-rounded-tube-normals-v1: the existing neck and mouth
            // keep their exact vertices. Tangents follow continuous circular
            // rings and the bowed tube, independently of the triangle zipper.
            var rootRing=[],neckRing=[],mouthRing=[],tubeNormals={};
            function ringNormal(ringIndex,angle){
              var point=new T.Vector3().fromArray(rp(rings[ringIndex],angle,ringIndex===2));
              var around=new T.Vector3().fromArray(rp(rings[ringIndex],angle+Math.PI*.5,ringIndex===2)).sub(new T.Vector3(rings[ringIndex].x,rings[ringIndex].y,rings[ringIndex].z)).normalize();
              var along;
              if(ringIndex===0)along=new T.Vector3().fromArray(rp(rings[1],angle,false)).sub(point).normalize();
              else if(ringIndex===2)along=point.clone().sub(new T.Vector3().fromArray(rp(rings[1],angle,false))).normalize();
              else along=new T.Vector3().fromArray(rp(rings[2],angle,true)).sub(point).normalize().add(point.clone().sub(new T.Vector3().fromArray(rp(rings[0],angle,false))).normalize()).normalize();
              var key=point.toArray().map(Math.fround).join(':');tubeNormals[key]=along.cross(around).normalize();
            }
            for(var ringSide=0;ringSide<4;ringSide++){var ringAngle=fa+.17+ringSide*Math.PI*.5;ringNormal(0,ringAngle);ringNormal(1,ringAngle);}
            for(var ringSide=0;ringSide<6;ringSide++)ringNormal(2,fa+.17+ringSide*Math.PI/3);
            out.part(null,false,tubeNormals);
            for(var side=0;side<4;side++){
              var angle=fa+.17+side*Math.PI*.5;
              rootRing.push(rp(rings[0],angle,false));neckRing.push(rp(rings[1],angle,false));
            }
            for(var side=0;side<6;side++)mouthRing.push(rp(rings[2],fa+.17+side*Math.PI/3,true));
            for(var side=0;side<4;side++){
              var next=(side+1)%4;
              out.tri(rootRing[side],neckRing[side],rootRing[next],[rootTone,0xb193be,rootTone]);
              out.tri(rootRing[next],neckRing[side],neckRing[next],[rootTone,0xb193be,0xb193be]);
            }
            var neckSide=0,mouthSide=0;
            while(neckSide<4||mouthSide<6){
              if(neckSide<4&&(mouthSide===6||(neckSide+1)/4<=(mouthSide+1)/6)){
                out.tri(neckRing[neckSide%4],mouthRing[mouthSide%6],neckRing[(neckSide+1)%4],[0xb193be,tipTone,0xb193be]);neckSide++;
              }else{
                out.tri(neckRing[neckSide%4],mouthRing[mouthSide%6],mouthRing[(mouthSide+1)%6],[0xb193be,tipTone,tipTone]);mouthSide++;
              }
            }
          }
          // The recessed throat shares the opening's local frame.
          var throat=[];
          for(var side=0;side<5;side++){var angle=.17+side*Math.PI*.4;throat.push(tp(Math.cos(angle)*radius*.88,Math.sin(angle)*radius*.88/softness,-.028));}
          out.part(f>0?tp:null,'throat');for(var side=1;side<4;side++)out.tri(throat[0],throat[side+1],throat[side],rose?0x825c7e:0x78577f);
          // Broad shoulders round into a small asymmetric hood; unfolding lips
          // stay closer together, giving the crown a few quieter budding forms.
          var reach=.55+.45*opening,wide=.48+.52*opening,hoodLift=.062+.025*opening;
          // Match the close lower ribbon without moving the tube opening,
          // recessed throat, upper hood, pollen or protected feeding floret.
          function softLowerLip(along,side,lift){
            if(f>0){var originalSide=side,t=Math.max(0,Math.min(1,(along-.008)/(.15*reach-.008))),turn=Math.sin(f*1.31+.6)*opening*t*t*(3-2*t);side+=.018*turn;lift+=.16*originalSide*turn;}
            return softLip(along,side,lift);
          }
          // Match the close hood taper and attach its base to the mouth rim.
          function softHoodLip(along,side,lift){
            if(f>0){var t=Math.max(0,Math.min(1,(along+.023)/(.088*reach+.023)));side*=1-.45*t*t*(3-2*t);}
            var point=softLip(along,side,lift);
            if(f>0){var shift=bergamotHoodRootAlong(along,side,radius,softness,reach,6)-along;point[0]+=forward.x*shift;point[1]+=forward.y*shift;point[2]+=forward.z*shift;}
            return point;
          }
          function softLip(along,side,lift){if(f>0){var bowl=Math.sin(Math.PI*Math.max(0,Math.min(1,(along+.023)/.2)));lift+=bowl*(.017*Math.pow(Math.abs(side)/.08,2)-.004)*opening;}return tp(along,side,lift);}
          var upperLeft=softHoodLip(-.023,-.044*wide,0),upperShoulderLeft=softHoodLip(.024*reach,-.053*wide,hoodLift*.75),upperTipLeft=softHoodLip(.078*reach,-.023*wide,hoodLift),upperTipRight=softHoodLip((f>0&&opening>.5?.080:.088)*reach,.016*wide,hoodLift*.92),upperShoulderRight=softHoodLip(.029*reach,.048*wide,hoodLift*.77),upperRight=softHoodLip(-.023,.041*wide,0);
          out.part(softHoodLip);
          if(f>0&&opening>.5){
            // Six existing lip faces form a curved hood over the opening. The
            // raised crown softens the cross-section without widening its rim.
            var hoodCrown=softHoodLip(.030*reach,0,hoodLift*.98),hoodRim=[upperLeft,upperShoulderLeft,upperTipLeft,upperTipRight,upperShoulderRight,upperRight],hoodTones=[0xbe9ec9,0xc9add2,0xd0b6d7,0xcbb0d2,0xc9add2,0xbe9ec9];
            for(var edge=0;edge<hoodRim.length;edge++)out.tri(hoodCrown,hoodRim[edge],hoodRim[(edge+1)%hoodRim.length],[0xd0b6d7,hoodTones[edge],hoodTones[(edge+1)%hoodRim.length]]);
          }else{out.tri(upperLeft,upperShoulderLeft,upperRight,0xbe9ec9);out.tri(upperRight,upperShoulderLeft,upperShoulderRight,0xc9add2);out.tri(upperShoulderLeft,upperTipLeft,upperShoulderRight,0xd0b6d7);out.tri(upperShoulderRight,upperTipLeft,upperTipRight,0xcbb0d2);}
          // A lifted rim and a darker center form a shallow cup. The offset
          // rounded tip rolls down and sideways rather than ending in a shelf.
          var lip=f===0?[tp(.008,-.04*wide,-.005),tp(.077*reach,-.076*wide,-.014*opening),tp(.143*reach,-.034*wide,-.058*opening),tp(.15*reach,.019*wide,-.069*opening),tp(.091*reach,.069*wide,-.018*opening),tp(.008,.037*wide,-.005)]:[softLowerLip(.008,-.04*wide,-.005),softLowerLip(.082*reach,-.078*wide,-.017*opening),softLowerLip(.14*reach,-.042*wide,-.055*opening),softLowerLip(.158*reach,.026*wide,-.067*opening),softLowerLip(.094*reach,.073*wide,-.021*opening),softLowerLip(.008,.037*wide,-.005)],cup=f===0?tp(.071*reach,-.006*wide,-.043*opening):softLowerLip(.079*reach,-.005*wide,-.036*opening);
          // butterfly-rounded-open-bergamot-lips-v1: the open outer flowers borrow the
          // same curved margins as the close-detail ribbon. The feeding flower
          // and two tightly furled buds keep their original six-sided lips.
          if(f>0&&opening>.5){
            var roundedLeft=[[.008,-.04*wide,-.005],[.082*reach,-.078*wide,-.017*opening],[.14*reach,-.042*wide,-.055*opening],[.158*reach,-.014*wide,-.067*opening]];
            var roundedRight=[[.008,.037*wide,-.005],[.094*reach,.073*wide,-.021*opening],[.147*reach,.036*wide,-.058*opening],[.158*reach,.014*wide,-.067*opening]];
            function lipMargin(points){return new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3(p[0],p[1],p[2]);}),false,'catmullrom',.34);}
            var leftMargin=lipMargin(roundedLeft),rightMargin=lipMargin(roundedRight),leftEnd=roundedLeft[3],rightEnd=roundedRight[3],endAlong=(leftEnd[0]+rightEnd[0])*.5,endLift=(leftEnd[2]+rightEnd[2])*.5;
            function roundedLipPoint(curve,t){var point=curve.getPoint(t);return softLowerLip(point.x,point.y,point.z);}
            // The rounded lower lip keeps two separate tip corners. Two former
            // tip-arc faces now give the upper hood its curved crown.
            lip=[roundedLipPoint(leftMargin,0),roundedLipPoint(leftMargin,.5),roundedLipPoint(leftMargin,1),roundedLipPoint(rightMargin,1),roundedLipPoint(rightMargin,.5),roundedLipPoint(rightMargin,0)];
          }
          // One continuous cup-to-rim pigment avoids a brighter triangular sector.
          // The reserved feeding lip keeps its original vertex colors exactly.
          var lipTone=rose?0xc3a0c1:0xc5a6d0,lipCupTone=f>0?linear(lipTone).multiplyScalar(.92).convertLinearToSRGB():null;
          out.part(softLowerLip);for(var edge=0;edge<lip.length;edge++)out.tri(cup,lip[edge],lip[(edge+1)%lip.length],f===0?(edge===2?0xc9acd2:lipTone):[lipCupTone,lipTone,lipTone]);
          // The central stamen retains the exact old top/contact position.
          var stamenLift=f===0?.128:.096+.025*opening;
          out.part();out.tri(tp(.006,-.003,.015),tp(.006,.003,.015),tp(.103*reach,.006,stamenLift),0xdcc1d1);
        }
        out.bloom();
        bergamotBractFan(out);
      }
      var g=out.geometry();g.name=milkweed?'milkweed-flower-umbel':'bergamot-tubular-flower-head';return g;
    }
    // Stable head pigment: shared roots keep close-detail flowers the same shade.
    // Internal flower skylight follows authored floret depth, independently of breeze.
    // Recessed bergamot throats shade inward from an unchanged, softly lit rim.
    function refineFlowerSurface(material){
      material.extensions=Object.assign({},material.extensions,{derivatives:true});
      material.onBeforeCompile=function(shader){
        shader.vertexShader=[
          'attribute vec3 bfPetalCoords;attribute vec4 bfBloomAnchor;attribute vec4 bfBloomAxis;',
          'varying vec3 bfPetalSurface;varying vec3 bfPetalPosition;varying vec4 bfCorollaTissue;',
          // A stable world-root key gives three forms: compact, fully open,
          // and unevenly opening. The copied donor matrix and parent produce
          // the same key on a promoted head, with no new batches or draw calls.
          'void bfPrepareBloom(out mat3 shape,out mat3 normalShape,out float headPigment){',
          'shape=mat3(1.);normalShape=mat3(1.);headPigment=0.;if(bfBloomAnchor.w<.5)return;',
          'vec4 root=vec4(0.,0.,0.,1.);',
          '#ifdef USE_INSTANCING',
          'root=instanceMatrix*root;',
          '#endif',
          'root=modelMatrix*root;',
          // The same model/instance root is used by the donor and the promoted
          // head. Pigment is spatial, never animated; reserved contact florets
          // return above and keep their authored color exactly.
          'headPigment=sin(dot(floor(root.xz*vec2(2.3,1.7)),vec2(1.73,2.17))+.53);',
          'float variant=mod(abs(floor(root.x*2.3)+floor(root.z*1.7)),3.);',
          'float phase=bfBloomAnchor.w*1.73+variant*2.17;',
          'float wave=sin(phase),second=sin(phase*1.37+.8);',
          'float folded=1.-smoothstep(-.8,-.35,wave);',
          'float crossScale=variant<.5?.88+.08*second:variant<1.5?1.03+.08*second:.93+.13*second;',
          'crossScale*=1.-folded*.14;',
          'float longScale=variant<.5?.9+.08*wave:variant<1.5?1.02+.1*wave:1.+.17*wave;',
          'vec3 radial=normalize(bfBloomAxis.xyz);mat3 radialOuter=mat3(radial.x*radial,radial.y*radial,radial.z*radial);',
          'mat3 stretch=mat3(crossScale)+(longScale-crossScale)*radialOuter;',
          'mat3 inverseStretch=mat3(1./crossScale)+(1./longScale-1./crossScale)*radialOuter;',
          'float lean=sin(phase*.83+.3)*mix(.145,.095,bfBloomAxis.w);',
          'vec3 turnAxis=normalize(vec3(cos(phase*.71),.24,sin(phase*.71)));',
          'mat3 turnOuter=mat3(turnAxis.x*turnAxis,turnAxis.y*turnAxis,turnAxis.z*turnAxis);',
          'mat3 crossTurn=mat3(0.,turnAxis.z,-turnAxis.y,-turnAxis.z,0.,turnAxis.x,turnAxis.y,-turnAxis.x,0.);',
          'mat3 rotation=cos(lean)*mat3(1.)+(1.-cos(lean))*turnOuter+sin(lean)*crossTurn;',
          'shape=rotation*stretch;normalShape=rotation*inverseStretch;',
          '}',
          shader.vertexShader
        ].join('\n');
        // Inverse-transpose shading follows the same affine petal deformation.
        // The reserved floret bypasses both operations, retaining exact contact.
        shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nmat3 bfBloomShape;mat3 bfBloomNormalShape;float bfHeadPigment;bfPrepareBloom(bfBloomShape,bfBloomNormalShape,bfHeadPigment);if(bfBloomAnchor.w>.5)objectNormal=bfBloomNormalShape*objectNormal;');
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(bfBloomAnchor.w>.5)transformed=bfBloomAnchor.xyz+bfBloomShape*(transformed-bfBloomAnchor.xyz);bfPetalPosition=position;bfPetalSurface=bfPetalCoords;float bfBloomSkyExposure=bfBloomAnchor.w<.5?1.:mix(.82+.18*smoothstep(.12,.42,position.y),.76+.24*smoothstep(-.65,.8,bfBloomAxis.y),bfBloomAxis.w);bfCorollaTissue=vec4(step(.001,length(bfBloomAnchor.xz))*(1.-bfBloomAxis.w)-step(.5,bfBloomAnchor.w)*bfBloomAxis.w*(1.-step(.5,abs(bfPetalCoords.z+1.))),sin(dot(bfBloomAxis.xyz,vec3(2.7,4.3,1.9))+bfBloomAnchor.w*.89),bfHeadPigment,bfBloomSkyExposure);');
        shader.fragmentShader='varying vec3 bfPetalSurface;varying vec3 bfPetalPosition;varying vec4 bfCorollaTissue;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
          '#include <color_fragment>',
          'float bfPetalFootprint=length(fwidth(bfPetalPosition));',
          'float bfPetalFine=1.-smoothstep(.003,.016,bfPetalFootprint);',
          'float bfPetalResolve=1.-smoothstep(.015,.07,bfPetalFootprint);',
          'float bfPetalGrain=sin(bfPetalPosition.x*397.+bfPetalPosition.z*173.)*sin(bfPetalPosition.y*311.-bfPetalPosition.z*229.);',
          'float bfThroatMask=1.-step(.5,abs(bfPetalSurface.z+2.));',
          'float bfPetalAlong=mix(bfPetalSurface.x,0.,bfThroatMask),bfPetalAcross=mix(bfPetalSurface.y-.5,-.5,bfThroatMask),bfPetalMask=abs(bfPetalSurface.z)*(1.-bfThroatMask);',
          // Fine ribs fan from the narrow throat toward the outer margin.
          // Their screen footprint removes distant stripes and shimmer.
          'float bfRibPhase=bfPetalAcross*(27.-11.*bfPetalAlong)+.28*sin(bfPetalAlong*5.);',
          'float bfRibAA=fwidth(bfRibPhase);float bfRibVisibility=(1.-smoothstep(.5,2.,bfRibAA))*bfPetalResolve*bfPetalMask;',
          'float bfPetalRibs=cos(bfRibPhase)*bfRibVisibility;',
          'float bfPetalFold=sin(clamp(bfPetalAlong,0.,1.)*3.14159);float bfPetalEdge=smoothstep(.25,.49,abs(bfPetalAcross));',
          'diffuseColor.rgb*=.985+.012*bfPetalGrain*bfPetalFine+.024*bfPetalRibs;',
          'diffuseColor.rgb*=1.+bfPetalMask*(.025*bfPetalEdge-.022*(1.-bfPetalAlong));',
          'float bfPetalBack=gl_FrontFacing?0.:1.;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.025,1.035,1.045),bfPetalBack*bfPetalMask);',
          'float bfPetalRelief=.000075*bfPetalRibs*bfPetalFold;',
          // The existing tissue channel is negative only on outer milkweed hoods.
          // Their waxy cups keep a softer sheen than the thin rose corolla.
          'float bfCoronaWax=max(0.,-bfCorollaTissue.x);float bfCoronaCenter=1.-smoothstep(.12,.78,length(vec2((bfPetalAlong-.46)*2.,bfPetalAcross*2.)));',
          'float bfThinPetal=max(bfPetalMask,bfCorollaTissue.x)*(1.-.72*bfCoronaWax);float bfFloretTint=bfCorollaTissue.y*bfThinPetal;diffuseColor.rgb*=vec3(1.+bfFloretTint*.025,1.+bfFloretTint*.012,1.-bfFloretTint*.02);',
          // Rose/lilac pigment varies coherently across a head, while pale
          // hoods, pollen, bracts and the reserved contact flower stay authored.
          'float bfHeadTint=bfCorollaTissue.z*step(.5,bfPetalSurface.z);diffuseColor.rgb*=vec3(1.+bfHeadTint*.09,1.-abs(bfHeadTint)*.018,1.-bfHeadTint*.07);',
          // The centered cavity darkens smoothly; its polygonal rim and the
          // protected feeding throat retain their authored response exactly.
          'float bfThroatRadius=length((bfPetalSurface.xy-.5)*2.);float bfThroatShade=bfThroatMask*(1.-smoothstep(.15,.78,bfThroatRadius));diffuseColor.rgb*=1.-.25*bfThroatShade;diffuseColor.rgb*=1.-bfCoronaWax*bfCoronaCenter*vec3(.06,.10,.12);'
        ].join('\n'));
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',[
          '#include <normal_fragment_maps>',
          'vec3 bfPetalDx=dFdx(-vViewPosition),bfPetalDy=dFdy(-vViewPosition);',
          'vec3 bfPetalBx=cross(bfPetalDy,normal),bfPetalBy=cross(normal,bfPetalDx);float bfPetalDet=dot(bfPetalDx,bfPetalBx);',
          'vec3 bfPetalBump=abs(bfPetalDet)*normal-sign(bfPetalDet)*(dFdx(bfPetalRelief)*bfPetalBx+dFdy(bfPetalRelief)*bfPetalBy);',
          'normal=normalize(mix(normal,normalize(bfPetalBump+normal*1.e-12),.42));'
        ].join('\n'));
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+bfPetalRibs*.025-bfPetalMask*.045*(1.-bfPetalEdge),.75,.91);roughnessFactor=mix(roughnessFactor,.66+.10*bfCoronaCenter,bfCoronaWax);');
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',[
          '#include <lights_fragment_end>',
          // Neighboring florets soften broad sky fill inside the head. The
          // reserved feeding cap stays at exactly one; sunlight and thin-
          // petal transmission below retain their original full response.
          'reflectedLight.indirectDiffuse*=bfCorollaTissue.w;',
          '#if NUM_DIR_LIGHTS > 0',
          'float bfPetalBacklight=pow(max(0.,dot(-normal,directionalLights[0].direction)),2.);',
          'reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[0].color*bfPetalBacklight*(.045+.055*bfPetalEdge)*bfThinPetal*(1.-bfThroatShade);',
          '#endif'
        ].join('\n'));
      };
      material.customProgramCacheKey=function(){return 'butterfly-flower-corona-wax-v10';};
      return material;
    }
    var flowerHeads=[flowerHead(true),flowerHead(false)],flowerMaterial=mat(0xffffff,{vertexColors:true,side:T.DoubleSide,roughness:.82}),larvalSupports=[],flowerSlots=new Map();
    refineFlowerSurface(flowerMaterial);vegetationWind(flowerMaterial,'plant');
    function plantStems(p,pi,parent,count,offset,start){
      for(var stem=start||0;stem<count;stem++){
        var pose=stemPose(p,pi,stem,count,offset),x=pose.x,z=pose.z,height=pose.height;
        contactShade(x,z,pi===0?2.5:1.8,pi===0?1.6:1.2,parent,height*.55);
        mesh(botanicalStem,vegetationWind(mat(pi===0?0x687a4c:0x626e42),'plant'),x,0,z,1,height,1,parent).rotation.y=stem*2.39996;
        for(var leaf=0;leaf<4;leaf++){
          var lp=leafPose(pose,leaf),teachingLeaf=stem===0&&leaf===3,leafProfile=(stem*7+leaf*11+pi*3)%3,leafShape=teachingLeaf?(pi===0?leaves:bergamotLeaves):(pi===0?meadowMilkweedLeaves[leafProfile]:meadowBergamotLeaves[leafProfile]);
          var blade=mesh(leafShape,leafMaterials[pi],lp.x,lp.y,lp.z,pi===0?.95:.83,1,pi===0?.44:.31,parent);if(teachingLeaf){
            blade.rotation.set(0,lp.yaw,lp.tilt);
          }else{
            // Rotate opposite leaves rather than using a negative instance scale.
            // All local +X tips now point outwards, with the narrow petiole inwards.
            var leafSide=leaf%2?1:-1,leafPitch=.12;
            // Lower pairs reach and droop individually. Rotate about the
            // existing petiole contact; upper lens and life-cycle leaves stay exact.
            if(leaf<2){
              leafPitch=-.015+(hash(stem*97+leaf*23+pi*277)-.5)*.28;
              var petioleReach=.7/Math.cos(.12),leafReach=petioleReach*Math.cos(leafPitch)-.7;
              blade.position.x+=leafSide*Math.cos(lp.yaw)*leafReach;
              blade.position.y+=petioleReach*(Math.sin(leafPitch)-Math.sin(.12));
              blade.position.z-=leafSide*Math.sin(lp.yaw)*leafReach;
            }
            blade.rotation.set(0,lp.yaw+(leafSide<0?Math.PI:0),leafPitch);
            blade.rotateX((hash(stem*43+leaf*71+pi*907)-.5)*.62);
            blade.scale.z*=.9+.2*hash(stem*29+leaf*61+pi*389);
          }
          if(!teachingLeaf){
            // Some older lower blades soften toward olive. The upper pair
            // and every teaching leaf retain their established healthy green.
            var leafTint=hash(stem*47+leaf*19+pi*701),leafAge=leaf<2?Math.max(0,(leafTint-.38)/.62):0;
            blade.userData.meadowTint=new T.Color(.94+leafTint*.06+leafAge*.12,.97+leafTint*.03-leafAge*.035,.89+leafTint*.08-leafAge*.17);
          }
          if(pi===0&&stem===0&&leaf===3){blade.userData.larvalFeedingSupport=true;blade.userData.patch=parent===scene?'milkweed':'restoration';blade.name='larval-feeding-support-'+blade.userData.patch;larvalSupports.push(blade);}
        }
        var breadth=stem===0?1:.87+.23*hash(stem*31+pi*701);var head=mesh(flowerHeads[pi],flowerMaterial,x,height,z,breadth,1,breadth,parent);head.rotation.y=stem*2.39996+pose.yaw*.18;
        var tint=hash(stem*37+pi*811);head.userData.meadowTint=new T.Color(pi===0?1:.94+tint*.06,.92+tint*.08,pi===0?.95+tint*.05:1);
        var slot={patch:p.id,species:pi,stem:stem},key=p.id+':'+pi+':'+stem;
        head.userData.flowerSlot=slot;if(!flowerSlots.has(key))flowerSlots.set(key,[]);flowerSlots.get(key).push(slot);
      }
    }
    // Real milkweed spreads in dense clonal stands and bergamot in clumps. The
    // outer stems continue the same spiral beyond the stems that the feeding and
    // life-cycle close-ups frame (indices 0-33, or 0-16 per half of the mixed
    // plot), and they hide during those close-ups, so every pinned pose and
    // camera frames exactly what it did before.
    var outerBlooms=[];
    function outerBloom(parent,name){var g=new T.Group();g.name=name;g.userData.outerBloom=true;parent.add(g);outerBlooms.push(g);return g;}
    PLANTS.forEach(function(p,pi){plantingBed(p,scene,p.nectar);if(p.nectar){plantStems(p,pi,scene,34,0);plantStems(p,pi,outerBloom(scene,'outer-bloom-'+p.id),54,0,34);}});
    var restoration=new T.Group();restoration.name='restoration-plots';scene.add(restoration);
    DESIGNS.forEach(function(d){
      var group=new T.Group();group.name='restoration-'+d.id;restoration.add(group);group.visible=d.id==='lawn';var p={id:'restoration',x:-42,z:38};plantingBed(p,group,d.nectar);
      if(d.id==='flowers'){plantStems(p,1,group,34,0);plantStems(p,1,outerBloom(group,'outer-bloom-restoration-flowers'),54,0,34);}
      if(d.id==='mixed'){plantStems(p,0,group,17,-6);plantStems(p,1,group,17,6);var outer=outerBloom(group,'outer-bloom-restoration-mixed');plantStems(p,0,outer,27,-6,17);plantStems(p,1,outer,27,6,17);}
    });
    var plotBorder=mesh(new T.RingGeometry(18.4,18.57,64),new T.MeshBasicMaterial({color:0xb79053,side:T.DoubleSide,transparent:true,opacity:.65}),-42,.038,38);plotBorder.rotation.x=-Math.PI/2;
    // Trail signs name each patch from the path, the way a nature trail would.
    // Painted once; a context-less canvas (tests) leaves a plain board.
    var boardGeometry=new T.BoxGeometry(4.6,1.9,.14),faceGeometry=new T.PlaneGeometry(4.36,1.68);
    function trailSign(p,title,subtitle,tint){
      var canvas=document.createElement('canvas');canvas.width=512;canvas.height=208;var g=canvas.getContext&&canvas.getContext('2d');
      if(g){g.fillStyle='#f3ead0';g.fillRect(0,0,512,208);g.strokeStyle='#6b5434';g.lineWidth=10;g.strokeRect(5,5,502,198);
        g.fillStyle=tint;g.beginPath();g.arc(86,104,46,0,Math.PI*2);g.fill();g.lineWidth=5;g.strokeStyle='#40522f';g.stroke();
        g.fillStyle='#24382e';g.textBaseline='middle';g.font='700 46px Georgia, serif';g.fillText(title,150,84,345);g.font='italic 30px Georgia, serif';g.fillStyle='#4d5d45';g.fillText(subtitle,150,140,345);}
      var texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;texture.anisotropy=4;
      var side=Math.sign(pathX(p.z)-p.x)||1,x=p.x+side*17.5,z=p.z+7,sign=new T.Group();sign.name='trail-sign-'+p.id;sign.position.set(x,0,z);sign.rotation.y=Math.atan2(side,.9);
      mesh(cylinder,mat(0x7a6342),-1.7,1.25,0,.11,2.5,.11,sign);mesh(cylinder,mat(0x7a6342),1.7,1.25,0,.11,2.5,.11,sign);
      mesh(boardGeometry,mat(0x8a6f48),0,2.55,0,1,1,1,sign);
      var face=new T.Mesh(faceGeometry,new T.MeshStandardMaterial({map:texture,roughness:.92}));face.position.set(0,2.55,.075);sign.add(face);
      scene.add(sign);return sign;
    }
    trailSign(PLANTS[0],__alloT('stem.butterfly.sign_milkweed_title','Common milkweed'),'Asclepias syriaca','#e3a5c0');trailSign(PLANTS[1],__alloT('stem.butterfly.sign_bergamot_title','Wild bergamot'),'Monarda fistulosa','#bca6f1');
    trailSign(PLANTS[2],__alloT('stem.butterfly.sign_lawn_title','Mown lawn'),__alloT('stem.butterfly.sign_lawn_subtitle','Short grass'),'#a9c27e');trailSign({id:'restoration',x:-42,z:38},__alloT('stem.butterfly.sign_restoration_title','Restoration plot'),__alloT('stem.butterfly.sign_restoration_subtitle','Your design'),'#d9a35c');
    function batchStatic(parent){
      var batches=new Map();parent.children.slice().forEach(function(o){if(!o.isMesh||o.isInstancedMesh||o.userData.larvalFeedingSupport)return;var key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
      batches.forEach(function(items){if(items.length<2)return;var first=items[0],batch=new T.InstancedMesh(first.geometry,first.material,items.length),tinted=items.some(function(o){return !!o.userData.meadowTint;});items.forEach(function(o,i){o.updateMatrix();batch.setMatrixAt(i,o.matrix);if(tinted)batch.setColorAt(i,o.userData.meadowTint||new T.Color(1,1,1));var slot=o.userData.flowerSlot;if(slot){slot.batch=batch;slot.index=i;slot.matrix=new T.Matrix4();batch.getMatrixAt(i,slot.matrix);}parent.remove(o);});batch.instanceMatrix.needsUpdate=true;parent.add(batch);});
    }
    batchStatic(scene);batchStatic(shrubs);restoration.children.forEach(batchStatic);outerBlooms.forEach(batchStatic);
    // Membrane flex: isolated player/visitor uniforms and shared analytic normals.
    function installButterflyWingFlex(root,uniform,owner){
      var playerFlex=owner==='player',uniformName=playerFlex?'bfPlayerWingFlex':'bfVisitorWingFlex',warpName=playerFlex?'bfPlayerWingWarp':'bfVisitorWingWarp';
      var materials=new Map();
      root.traverse(function(part){
        if(!part.isMesh||!/^(monarch|butterfly)-(forewing|hindwing)-(left|right)$/.test(part.name))return;
        var original=part.material,material=materials.get(original);
        if(!material){
          material=original.clone();materials.set(original,material);
          var surface=original.onBeforeCompile,cacheKey=original.customProgramCacheKey();
          material.userData[playerFlex?'playerWingFlex':'visitorWingFlex']=uniform;
          material.onBeforeCompile=function(shader){
            surface.call(material,shader);shader.uniforms[uniformName]=uniform;
            // One shared material can distinguish mirrored left/right meshes
            // from their model-matrix handedness, without another attribute.
            // Return displacement and its exact two surface derivatives.
            shader.vertexShader=[
              'uniform vec4 '+uniformName+';',
              'vec3 '+warpName+'(vec3 p){',
              'float bfMirror=dot(cross(modelMatrix[0].xyz,modelMatrix[1].xyz),modelMatrix[2].xyz);',
              'float bfBend=bfMirror<0.?'+uniformName+'.x:'+uniformName+'.y;',
              'float bfTwist=bfMirror<0.?'+uniformName+'.z:'+uniformName+'.w;',
              'float bfSpan=clamp((p.x-.35)/6.8,0.,1.);',
              'float bfEnvelope=bfSpan*bfSpan*(3.-2.*bfSpan);',
              'float bfSlope=6.*bfSpan*(1.-bfSpan)/6.8;',
              'float bfChord=(p.z+.7)/6.;float bfLoad=bfBend+bfTwist*bfChord;',
              'return vec3(bfEnvelope*bfLoad,bfSlope*bfLoad,bfEnvelope*bfTwist/6.);',
              '}'
            ].join('\n')+'\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec3 bfFlexNormal='+warpName+'(position);objectNormal=normalize(vec3(objectNormal.x-bfFlexNormal.y*objectNormal.y,objectNormal.y,objectNormal.z-bfFlexNormal.z*objectNormal.y));');
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+='+warpName+'(position).x;');
          };
          material.customProgramCacheKey=function(){return cacheKey+(playerFlex?'-player-membrane-flex-v1':'-visitor-membrane-flex-v1');};
        }
        part.material=material;
        // Static geometry bounds cannot account for the small shader bend.
        // Only the four wing meshes per butterfly bypass bounds culling.
        part.frustumCulled=false;
      });
    }
    // Bend antenna tips while feeding and draw distal legs inward during flight.
    // Roots, eyes, head and the drinking tube stay fixed; feet return to their
    // exact contact pose before landing. Both bends reuse the existing anatomy mesh.
    function installVisitorAntennaFlex(root,uniform,legUniform){
      var materials=new Map();
      root.traverse(function(part){
        if(!part.isMesh||!/^(monarch|butterfly)-body$/.test(part.name))return;
        var original=part.material,material=materials.get(original);
        if(!material){
          material=original.clone();materials.set(original,material);
          var surface=original.onBeforeCompile,cacheKey=original.customProgramCacheKey();
          material.userData.visitorAntennaFlex=uniform;material.userData.visitorLegTuck=legUniform;
          material.onBeforeCompile=function(shader){
            surface.call(material,shader);shader.uniforms.bfVisitorAntennaFlex=uniform;shader.uniforms.bfVisitorLegTuck=legUniform;
            // Return the x displacement and its exact y/z surface derivatives.
            // Clamped cubic masks have zero slopes beyond either endpoint.
            shader.vertexShader=[
              'uniform float bfVisitorLegTuck;',
              // The body never extends below this mask; only distal legs move.
              // Return the envelope and its exact x/y derivatives.
              'vec3 bfVisitorLegEnvelope(vec3 p){',
              'float bfSide=p.x<0.?-1.:1.;',
              'float bfOut=clamp((abs(p.x)-.42)/.36,0.,1.);',
              'float bfDown=clamp((-p.y-.42)/.44,0.,1.);',
              'float bfOutEase=bfOut*bfOut*(3.-2.*bfOut);',
              'float bfDownEase=bfDown*bfDown*(3.-2.*bfDown);',
              'return bfVisitorLegTuck*vec3(bfOutEase*bfDownEase,bfSide*6.*bfOut*(1.-bfOut)/.36*bfDownEase,-6.*bfDown*(1.-bfDown)/.44*bfOutEase);',
              '}',
              'uniform vec2 bfVisitorAntennaFlex;',
              'vec3 bfVisitorAntennaWarp(vec3 p){',
              'float bfSweep=p.x<0.?bfVisitorAntennaFlex.x:bfVisitorAntennaFlex.y;',
              'float bfReach=clamp((-p.z-1.73)/1.4,0.,1.);',
              'float bfHeight=clamp((p.y-.23)/.19,0.,1.);',
              'float bfEnvelope=bfReach*bfReach*(3.-2.*bfReach);',
              'float bfMask=bfHeight*bfHeight*(3.-2.*bfHeight);',
              'float bfSlopeZ=-6.*bfReach*(1.-bfReach)/1.4;',
              'float bfSlopeY=6.*bfHeight*(1.-bfHeight)/.19;',
              'return vec3(bfSweep*bfEnvelope*bfMask,bfSweep*bfEnvelope*bfSlopeY,bfSweep*bfSlopeZ*bfMask);',
              '}'
            ].join('\n')+'\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec3 bfAntennaNormal=bfVisitorAntennaWarp(position);objectNormal=normalize(vec3(objectNormal.x,objectNormal.y-bfAntennaNormal.y*objectNormal.x,objectNormal.z-bfAntennaNormal.z*objectNormal.x));\nvec3 bfLegEnvelope=bfVisitorLegEnvelope(position);vec3 bfLegDirection=vec3(position.x<0.?.14:-.14,.18,0.);vec3 bfLegGradient=vec3(bfLegEnvelope.y,bfLegEnvelope.z,0.);objectNormal=normalize(objectNormal-bfLegGradient*(dot(bfLegDirection,objectNormal)/(1.+dot(bfLegDirection,bfLegGradient))));');
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=bfVisitorAntennaWarp(position).x;transformed+=vec3(position.x<0.?.14:-.14,.18,0.)*bfVisitorLegEnvelope(position).x;');
          };
          material.customProgramCacheKey=function(){return cacheKey+'-visitor-feeding-antennae-v1-flight-legs-v1';};
        }
        part.material=material;
        // Only these private visitor bodies bypass their static shader bounds.
        part.frustumCulled=false;
      });
    }
    function updateVisitorWingFlex(visitor,index,site,pose,clock,reduced,hidden){
      var flex=visitorWingFlex(site,index,clock,reduced||hidden,visitor.speciesId,pose);
      visitor.wingFlex.value.set(flex.left,flex.right,flex.leftTwist,flex.rightTwist);
    }
    function butterfly(scale,low,feeding){var result=createMonarch(T,kit,!!feeding,low);result.root.scale.setScalar(scale);scene.add(result.root);return result;}
    var player=butterfly(.38),visitors=[];player.root.name='player-monarch';
    player.wingFlex={value:new T.Vector4()};installButterflyWingFlex(player.root,player.wingFlex,'player');
    function updatePlayerWingFlex(state,reduced,clock,pose,hidden){
      var flex=playerWingFlex(state,reduced||hidden,clock,pose);
      player.wingFlex.value.set(flex.left,flex.right,flex.leftTwist,flex.rightTwist);
    }
    // Shared morph geometry lets each visitor uncoil its drinking tube without
    // allocating meshes or replacing buffers during animation.
    var curled=[new T.Vector3(0,-.17,-1.68),new T.Vector3(0,-.34,-1.78)];
    for(var coil=0;coil<24;coil++){var a=coil/23*Math.PI*3.35,r=.16-coil/23*.09;curled.push(new T.Vector3(0,-.49+Math.cos(a)*r,-1.7-Math.sin(a)*r));}
    var visitorTube=new T.TubeGeometry(new T.CatmullRomCurve3(curled),18,.022,3,false),extendedTube=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,-.17,-1.68),new T.Vector3(0,-.36,-1.82),new T.Vector3(0,-.66,-1.76),new T.Vector3(0,-.96,-1.66)]),18,.022,3,false);
    visitorTube.morphAttributes.position=[extendedTube.attributes.position];visitorTube.morphAttributes.normal=[extendedTube.attributes.normal];visitorTube.name='visitor-drinking-tube';
    visitorTube.computeBoundingSphere();extendedTube.dispose();
    var visitorTubeMaterial=new T.MeshStandardMaterial({color:0x967244,roughness:.85,morphTargets:true,morphNormals:true});
    for(var b=0;b<VISITOR_SPECIES.length;b++){
      var species=meadowSpecies(VISITOR_SPECIES[b]),visitor=species.id==='monarch'?butterfly(.12,true,true):createMeadowButterfly(T,kit,species.id,true);
      if(species.id!=='monarch'){visitor.root.scale.setScalar(.12*species.scale);scene.add(visitor.root);}
      visitor.speciesId=species.id;visitor.root.userData.speciesId=species.id;visitor.root.userData.commonName=species.name;visitor.root.userData.scientificName=species.latin;
      visitor.root.name='visitor-monarch-'+b;visitor.proboscis=new T.Mesh(visitorTube,visitorTubeMaterial);visitor.proboscis.name='visitor-proboscis';visitor.proboscis.frustumCulled=false;visitor.root.add(visitor.proboscis);visitor.wingFlex={value:new T.Vector4()};installButterflyWingFlex(visitor.root,visitor.wingFlex);visitor.antennaFlex={value:new T.Vector2()};visitor.legTuck={value:0};installVisitorAntennaFlex(visitor.root,visitor.antennaFlex,visitor.legTuck);visitors.push(visitor);}
    function animateVisitors(clock,reduced,patches,hidden){
      visitors.forEach(function(visitor,i){
        var site=visitorPatch(patches,i);visitor.root.visible=!hidden&&!!site;visitor.root.userData.flowerKey=null;visitor.root.userData.flowerAnchor=null;if(!site){visitor.wingFlex.value.set(0,0,0,0);visitor.antennaFlex.value.set(0,0);visitor.legTuck.value=0;return;}
        var pose=visitorVisitPose(site,i,clock,reduced,visitor.speciesId),wind=pose.flower?plantDisplacement(pose.flower.x,pose.flower.y,pose.flower.z):{x:0,z:0};
        visitor.root.position.set(pose.x+wind.x*pose.perch,pose.y,pose.z+wind.z*pose.perch);visitor.root.rotation.set(pose.pitch,pose.yaw,pose.bank,'YXZ');
        updateVisitorWingFlex(visitor,i,site,pose,clock,reduced,hidden);
        var antenna=visitorAntennaPose(i,clock,reduced||hidden,pose);visitor.antennaFlex.value.set(antenna.left,antenna.right);visitor.legTuck.value=visitorLegTuck(pose,reduced||hidden);
        visitor.wings[0].rotation.z=pose.leftWing;visitor.wings[1].rotation.z=pose.rightWing;
        visitor.hindWings.forEach(function(wing,j){wing.rotation.z=(j?1:-1)*pose.hindLag;});
        visitor.proboscis.morphTargetInfluences[0]=pose.feeding;
        visitor.root.userData.behavior=pose.phase;visitor.root.userData.patch=site.id;visitor.root.userData.flower=pose.flower?{x:pose.flower.x+wind.x,y:pose.flower.y,z:pose.flower.z+wind.z}:null;
        visitor.root.userData.flowerAnchor=pose.flower;visitor.root.userData.flowerKey=pose.flower?site.id+':'+pose.flowerSpecies+':'+pose.flowerStem:null;
      });
    }
    // Bumble bees work the flowering patches, as they do on real bergamot and
    // milkweed. Scenery only: nothing in the investigation counts them.
    // Reuse the abdomen's saved ring for rounded, slightly cambered wings.
    // The five meshes and complete triangle budget stay unchanged per bee.
    var beeBody=new T.SphereGeometry(1,12,8),beeTones=[],bp=beeBody.attributes.position,bn=beeBody.attributes.normal;
    for(var bi=0;bi<bp.count;bi++){
      var bx=bp.getX(bi),by=bp.getY(bi),bz=bp.getZ(bi),girth=.97-.11*bz-.08*bz*bz,girthSlope=-.11-.16*bz;
      bp.setXYZ(bi,bx*girth,by*.9+.055*(1-bz*bz),bz);
      var nx=bx/girth,ny=by/.9,nz=bz-bx*girthSlope*nx+.11*bz*ny,nl=Math.hypot(nx,ny,nz);
      bn.setXYZ(bi,nx/nl,ny/nl,nz/nl);
      var tone=linear(bz>.58?0x27251e:bz>.12?0xcaa74d:bz>-.3?0x27251e:0xcaa74d);
      tone.multiplyScalar(.80+.18*Math.max(0,by)+.02*Math.cos(bz*9+bx*6));beeTones.push(tone.r,tone.g,tone.b);
    }
    beeBody.setAttribute('color',new T.Float32BufferAttribute(beeTones,3));beeBody.name='bumblebee-abdomen';
    var beeWingOutline=[[-.5,-.04],[-.41,-.28],[-.18,-.46],[.10,-.5],[.32,-.42],[.47,-.21],[.5,.03],[.45,.25],[.28,.44],[.04,.5],[-.20,.44],[-.38,.28],[-.46,.13],[-.5,.035]];
    var beeWingShapes=[-1,1].map(function(side){
      var positions=[0,0,.012],colors=[],indices=[],center=linear(0xe0e4d7),edge=linear(0xb9c5ba);colors.push(center.r,center.g,center.b);
      beeWingOutline.forEach(function(p){positions.push(p[0]*side,p[1],0);colors.push(edge.r,edge.g,edge.b);});
      for(var n=0;n<beeWingOutline.length;n++){var a=n+1,b=(n+1)%beeWingOutline.length+1;indices.push(0,side>0?a:b,side>0?b:a);}
      var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.name='bumblebee-rounded-wing';return geometry;
    });
    var beeWing=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.48,roughness:.72,side:T.DoubleSide,depthWrite:false});
    function bumblebee(i){
      var root=new T.Group();root.name='meadow-bumblebee';root.userData.index=i;
      mesh(beeBody,mat(0xffffff,{vertexColors:true}),0,0,.3,.3,.27,.38,root);
      mesh(sphere,mat(0xc1a24a),0,.035,-.08,.27,.245,.245,root);mesh(sphere,mat(0x27251e),0,-.012,-.34,.145,.155,.125,root);
      var wings=[-1,1].map(function(side){var pivot=new T.Group();pivot.position.set(side*.1,.22,-.06);root.add(pivot);var w=mesh(beeWingShapes[side<0?0:1],beeWing,side*.22,0,.06,.42,.18,1,pivot);w.rotation.x=-Math.PI/2;return pivot;});
      root.scale.setScalar(.42);scene.add(root);return {root:root,wings:wings};
    }
    // Flower heads each bee can visit, from the same stem poses the plants use.
    function heads(p,pi,count,offset){var out=[];for(var n=1;n<count;n+=3){var pose=stemPose(p,pi,n,count,offset);out.push({x:pose.x,y:pose.height+.86,z:pose.z});}return out;}
    var beeSites={milkweed:heads(PLANTS[0],0,34,0),bergamot:heads(PLANTS[1],1,34,0),flowers:heads({x:-42,z:38},1,34,0),mixed:heads({x:-42,z:38},1,17,6).concat(heads({x:-42,z:38},0,17,-6))};
    var bees=[0,1,2,3,4,5,6].map(bumblebee),beeHome=['bergamot','bergamot','bergamot','milkweed','milkweed','restoration','restoration'];
    function animateBees(clock,reduced,design,hidden){
      bees.forEach(function(bee,i){
        var home=beeHome[i],site=home==='restoration'?beeSites[design]:beeSites[home];
        bee.root.visible=!hidden&&!!site;if(!bee.root.visible)return;
        var t=reduced?0:Math.max(0,Number(clock)||0)+i*1.37,lap=Math.floor(t/2.3),f=t/2.3-lap,a=site[(lap*3+i*5)%site.length],b=site[((lap+1)*3+i*5)%site.length];
        var x=a.x,y=a.y,z=a.z,heading=Math.atan2(b.x-a.x,b.z-a.z);
        if(reduced||f<.7){x+=reduced?0:Math.sin(t*3.1+i)*.14;z+=reduced?0:Math.cos(t*2.7+i)*.14;y+=reduced?0:.05+Math.sin(t*5.3)*.05;heading=reduced?i:heading+Math.sin(t*1.9)*.5;}
        else{var u=(f-.7)/.3;u=u*u*(3-2*u);x=a.x+(b.x-a.x)*u;z=a.z+(b.z-a.z)*u;y=a.y+(b.y-a.y)*u+Math.sin(Math.PI*u)*.9;}
        var wind=plantDisplacement(x,y-.86,z);bee.root.position.set(x+wind.x,y,z+wind.z);bee.root.rotation.set(0,heading+Math.PI,0);
        bee.wings.forEach(function(w,j){w.rotation.z=(j?1:-1)*(reduced?.15:.25+.55*Math.abs(Math.sin(t*71+i)));});
      });
    }
    var shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:.18}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(.13,.17,.10,exp(-3.5*r*r)*(1.-smoothstep(.7,1.,r))*opacity);\n#include <encodings_fragment>\n}'});
    var playerShadow=mesh(plane,shadowMaterial,0,.044,0,7,5,1);playerShadow.rotation.x=-Math.PI/2;playerShadow.name='monarch-ground-shadow';
    var ring=mesh(new T.RingGeometry(2.8,2.94,48),new T.MeshBasicMaterial({color:0xffe7a6,side:T.DoubleSide,transparent:true,opacity:.7}),0,.07,0);ring.rotation.x=-Math.PI/2;
    var targetRing=mesh(new T.RingGeometry(14,14.18,64),new T.MeshBasicMaterial({color:0xfff2c9,side:T.DoubleSide,transparent:true,opacity:.85}),0,.08,0);targetRing.rotation.x=-Math.PI/2;
    var focusHalo=mesh(new T.RingGeometry(.83,.89,64),new T.MeshBasicMaterial({color:0xffe6a1,side:T.DoubleSide,depthTest:false,depthWrite:false,transparent:true,opacity:.95}),0,0,0);focusHalo.name='field-lens-marker';focusHalo.visible=false;focusHalo.renderOrder=5;
    var lifecycle=new T.Group();lifecycle.name='followed-generation';lifecycle.visible=false;scene.add(lifecycle);
    var specimens=createLifecycleModels(T),emerged=createMonarch(T,kit);emerged.root.name='lifecycle-adult';
    Object.keys(specimens).forEach(function(id){specimens[id].name='lifecycle-'+id;lifecycle.add(specimens[id]);});lifecycle.add(emerged.root);
    // Retain a separate, pale empty case after emergence, without rebuilding resources.
    var emptyCase=specimens.chrysalis.clone(true);emptyCase.name='lifecycle-empty-case';
    // The emerged case remains independent of the live skin's mutable colors.
    var emptySurface=emptyCase.getObjectByName('monarch-chrysalis-surface');emptySurface.geometry=emptySurface.geometry.clone();
    var shellMaterials=new Map();emptyCase.traverse(function(o){if(o.material){if(!shellMaterials.has(o.material)){var m=o.material.clone();m.color.set(0xc9c49c).convertSRGBToLinear();m.transparent=true;m.opacity=.5;shellMaterials.set(o.material,m);}o.material=shellMaterials.get(o.material);}});lifecycle.add(emptyCase);
    // One fixed dense blade is reshaped in place. Its upper boundary is the
    // original blade minus the growing circles, so missing pieces are real gaps.
    var feedingLeafGeometry=new T.BufferGeometry(),feedingLeafPositions=new Float32Array(193*5*3),feedingLeafColors=[],feedingLeafIndices=[];
    for(var row=0;row<=192;row++){
      for(var strip=0;strip<5;strip++){var shade=strip===2?1:strip<2?.81:.9;feedingLeafColors.push(shade,shade,shade);}
      if(row<192)for(var strip=0;strip<4;strip++){var at=row*5+strip;feedingLeafIndices.push(at,at+1,at+5,at+1,at+6,at+5);}
    }
    feedingLeafGeometry.setAttribute('position',new T.BufferAttribute(feedingLeafPositions,3));feedingLeafGeometry.setAttribute('color',new T.Float32BufferAttribute(feedingLeafColors,3));feedingLeafGeometry.setIndex(feedingLeafIndices);feedingLeafGeometry.name='larval-feeding-leaf-blade';
    var feedingLeaf=new T.Mesh(feedingLeafGeometry,mat(0x668c51,{side:T.DoubleSide,vertexColors:true}));feedingLeaf.name='larval-feeding-leaf';feedingLeaf.visible=false;lifecycle.add(feedingLeaf);
    var lastFeedingProgress=null;
    function reshapeFeedingLeaf(moment){
      var vertices=feedingLeafGeometry.attributes.position;
      for(var row=0;row<=192;row++){var x=-.95+row*1.9/192,negative=-larvalLeafWidth(x),positive=larvalLeafEdge(x,moment.notches);
        for(var strip=0;strip<5;strip++){var z=strip===2?0:strip<2?negative*(1-strip/2):positive*(strip-2)/2;vertices.setXYZ(row*5+strip,x,larvalLeafHeight(x,z),z);}}
      vertices.needsUpdate=true;feedingLeafGeometry.computeVertexNormals();feedingLeafGeometry.computeBoundingBox();feedingLeafGeometry.computeBoundingSphere();lastFeedingProgress=moment.progress;
    }
    reshapeFeedingLeaf(larvalFeeding(null,0));
    var jaws=[specimens.caterpillar.getObjectByName('caterpillar-jaw-left'),specimens.caterpillar.getObjectByName('caterpillar-jaw-right')];
    var chrysalisSurfaceMesh=specimens.chrysalis.getObjectByName('monarch-chrysalis-surface'),chrysalisColors=chrysalisSurfaceMesh.geometry.attributes.color,chrysalisPositions=chrysalisSurfaceMesh.geometry.attributes.position,greenChrysalisColors=chrysalisColors.array.slice(),maturationColor=new T.Color(),lastMaturationProgress=null;
    function syncMaturation(moment){
      chrysalisSurfaceMesh.userData.maturation=moment;lifecycle.userData.chrysalisMaturation=moment;
      if(!moment){if(lastMaturationProgress!==null){chrysalisColors.array.set(greenChrysalisColors);chrysalisColors.needsUpdate=true;lastMaturationProgress=null;}return;}
      if(lastMaturationProgress===moment.progress)return;
      for(var i=0;i<chrysalisPositions.count;i++){
        var u=chrysalisPositions.getX(i)/.176,v=(-chrysalisPositions.getY(i)-.083)/.643,rgb=chrysalisSurface(u,v,moment);
        maturationColor.setRGB(rgb[0],rgb[1],rgb[2]).convertSRGBToLinear();chrysalisColors.setXYZ(i,maturationColor.r,maturationColor.g,maturationColor.b);
      }
      chrysalisColors.needsUpdate=true;lastMaturationProgress=moment.progress;
    }
    var lifecycleAnchor=null;
    function syncLifecycle(v,progress,reduced,focus){
      var maturationMoment=focus==='maturation'?chrysalisMaturation(v,progress):null;syncMaturation(maturationMoment&&maturationMoment.active?maturationMoment:null);
      // Restore first, including a missing generation, a different patch, and
      // every non-feeding view. The meadow never retains an old bite overlay.
      larvalSupports.forEach(function(blade){blade.visible=true;});feedingLeaf.visible=false;feedingLeaf.userData.feeding=null;feedingLeaf.userData.contactWorld=null;feedingLeaf.userData.mouthWorld=null;lifecycle.userData.larvalFeeding=null;
      specimens.caterpillar.position.set(0,.1,0);specimens.caterpillar.scale.setScalar(1);specimens.caterpillar.rotation.set(0,0,0);jaws.forEach(function(jaw){jaw.rotation.set(0,0,0);});
      lifecycle.visible=!!v;lifecycleAnchor=v?{x:v.anchor.x,y:v.anchor.y,z:v.anchor.z}:null;if(!v)return;
      lifecycle.position.set(v.anchor.x,v.anchor.y,v.anchor.z);lifecycle.rotation.set(0,v.anchor.yaw,v.anchor.tilt);lifecycle.userData.stage=v.stage;lifecycle.userData.patch=v.patch;
      Object.keys(specimens).forEach(function(id){specimens[id].visible=id===v.stage;});emerged.root.visible=v.stage==='adult';emptyCase.visible=v.stage==='adult';
      var pose=lifecyclePose(v,progress,reduced),egg=specimens.egg,larva=specimens.caterpillar,pupa=specimens.chrysalis;
      egg.position.set(0,v.support==='leaf'?.065:0,0);egg.rotation.z=v.support==='leaf'?Math.PI:0;
      larva.position.set(pose.crawl,v.support==='leaf'?.1:0,0);larva.scale.setScalar(pose.growth);
      var feedingMoment=focus==='feeding'?larvalFeeding(v,progress):null;
      if(feedingMoment&&feedingMoment.active){
        larvalSupports.forEach(function(blade){if(blade.userData.patch===v.patch)blade.visible=false;});
        feedingLeaf.visible=true;if(lastFeedingProgress!==feedingMoment.progress)reshapeFeedingLeaf(feedingMoment);
        larva.position.fromArray(feedingMoment.position);larva.rotation.fromArray(feedingMoment.rotation);larva.scale.setScalar(feedingMoment.scale);
        jaws.forEach(function(jaw){jaw.rotation.set(0,jaw.userData.side*.28*feedingMoment.jaw,-.88);});
        feedingLeaf.userData.feeding=feedingMoment;lifecycle.userData.larvalFeeding=feedingMoment;
        var contact=leafWorld(v.anchor,feedingMoment.contact.x,feedingMoment.contact.y,feedingMoment.contact.z),mouth=leafWorld(v.anchor,feedingMoment.mouth.x,feedingMoment.mouth.y,feedingMoment.mouth.z);
        feedingLeaf.userData.contactWorld=[contact.x,contact.y,contact.z];feedingLeaf.userData.mouthWorld=[mouth.x,mouth.y,mouth.z];
      }
      pupa.position.set(0,.065,0);emptyCase.position.copy(pupa.position);
      emerged.root.position.set(0,pose.adultY,.28);emerged.root.rotation.set(Math.PI/2,0,0);emerged.root.scale.setScalar(pose.adultScale);
      emerged.wings[0].rotation.z=-pose.wingAngle;emerged.wings[1].rotation.z=pose.wingAngle;
    }
    var feeding=createFeedingModel(T,kit);scene.add(feeding.root);
    var atmosphere=createMeadowAtmosphere(T,scene),detailedVisitor=null,visitorSurfaces=[];
    // The watched blossom and two nearby flowers carry the close-up detail.
    // Sharing one small instance pool preserves their tint and breeze without
    // multiplying the cost across the entire meadow.
    var flowerDetail={root:new T.Group(),source:null,sources:[]},hiddenFlowerMatrix=new T.Matrix4().makeScale(0,0,0),flowerDetailTint=new T.Color();
    flowerDetail.root.name='watched-flower-detail';flowerDetail.root.visible=false;scene.add(flowerDetail.root);
    var detailedFlowers=[true,false].map(function(milkweed){
      var bloom=new T.InstancedMesh(flowerHead(milkweed,true),flowerMaterial,3);
      // Three allocates instance colors using count on the first write. Reserve
      // the full pool before reducing the visible count, even when it is empty.
      bloom.setColorAt(0,flowerDetailTint);
      bloom.name=milkweed?'watched-milkweed-flower':'watched-bergamot-flower';bloom.frustumCulled=false;bloom.visible=false;bloom.count=0;flowerDetail.root.add(bloom);return bloom;
    });
    var flowerEye=new T.Vector3(),flowerLook=new T.Vector3(),flowerRight=new T.Vector3(),flowerUp=new T.Vector3(),flowerPoint=new T.Vector3(),flowerDelta=new T.Vector3();
    function visibleFlower(slot){for(var parent=slot.batch;parent;parent=parent.parent)if(!parent.visible)return false;return true;}
    function nearbyFlowers(primary,view,aspect){
      var selected=primary?[primary]:[];
      if(!primary||!view)return selected;
      flowerEye.fromArray(view.position);flowerLook.fromArray(view.target).sub(flowerEye).normalize();
      flowerRight.set(-flowerLook.z,0,flowerLook.x).normalize();flowerUp.crossVectors(flowerRight,flowerLook).normalize();
      var vertical=Math.tan(view.fov*Math.PI/360),horizontal=vertical*(aspect||1),first=null,second=null,firstScore=Infinity,secondScore=Infinity;
      primary.batch.updateWorldMatrix(true,false);
      flowerSlots.forEach(function(choices){choices.forEach(function(slot){
        // All selected heads share the parent's space and the same plant kind.
        // This also keeps hidden restoration designs out of the selection.
        if(slot===primary||slot.batch!==primary.batch)return;
        flowerPoint.set(0,.25,0).applyMatrix4(slot.matrix).applyMatrix4(slot.batch.matrixWorld);
        var wind=plantDisplacement(flowerPoint.x,flowerPoint.y,flowerPoint.z);flowerPoint.x+=wind.x;flowerPoint.z+=wind.z;
        flowerDelta.copy(flowerPoint).sub(flowerEye);var depth=flowerDelta.dot(flowerLook),distance=flowerDelta.lengthSq();
        if(depth<.4||distance>196||Math.abs(flowerDelta.dot(flowerRight))>depth*horizontal+.7||Math.abs(flowerDelta.dot(flowerUp))>depth*vertical+.7)return;
        // A small preference for the current pair prevents flicker when two
        // flowers trade places in the breeze or during a slow camera drift.
        var score=distance*(flowerDetail.sources.indexOf(slot)>0?.88:1);
        if(score<firstScore){second=first;secondScore=firstScore;first=slot;firstScore=score;}
        else if(score<secondScore){second=slot;secondScore=score;}
      });});
      if(first)selected.push(first);if(second)selected.push(second);return selected;
    }
    function watchFlower(visitor,view,aspect){
      var choices=visitor&&visitor.root.visible&&flowerSlots.get(visitor.root.userData.flowerKey),next=choices&&choices.find(visibleFlower)||null;
      var selected=nearbyFlowers(next,view,aspect);
      if(selected.length===flowerDetail.sources.length&&selected.every(function(slot,i){return slot===flowerDetail.sources[i];}))return;
      flowerDetail.sources.forEach(function(slot){slot.batch.setMatrixAt(slot.index,slot.matrix);slot.batch.instanceMatrix.needsUpdate=true;});
      flowerDetail.source=next;flowerDetail.sources=selected;flowerDetail.root.visible=!!next;
      detailedFlowers.forEach(function(bloom){bloom.visible=false;bloom.count=0;});
      if(!next){scene.add(flowerDetail.root);return;}
      var bloom=detailedFlowers[next.species];
      selected.forEach(function(slot,i){bloom.setMatrixAt(i,slot.matrix);slot.batch.getColorAt(slot.index,flowerDetailTint);bloom.setColorAt(i,flowerDetailTint);slot.batch.setMatrixAt(slot.index,hiddenFlowerMatrix);});
      bloom.count=selected.length;bloom.instanceMatrix.needsUpdate=true;bloom.instanceColor.needsUpdate=true;bloom.visible=true;
      next.batch.parent.add(flowerDetail.root);next.batch.instanceMatrix.needsUpdate=true;
    }
    var speciesTemplates={monarch:feeding.root.getObjectByName('feeding-monarch').clone(true)},visitorTemplates=new T.Group();visitorTemplates.name='meadow-species-detail-templates';visitorTemplates.visible=false;speciesTemplates.monarch.name='detail-monarch';visitorTemplates.add(speciesTemplates.monarch);scene.add(visitorTemplates);
    MEADOW_SPECIES.forEach(function(species){if(species.id==='monarch')return;var template=createMeadowButterfly(T,kit,species.id,false);template.root.name='detail-'+species.id;visitorTemplates.add(template.root);speciesTemplates[species.id]=template.root;});
    visitors.forEach(function(visitor){var detailModel=speciesTemplates[visitor.speciesId],parts=[];installButterflyWingFlex(detailModel,visitor.wingFlex);installVisitorAntennaFlex(detailModel,visitor.antennaFlex,visitor.legTuck);visitor.root.traverse(function(part){if(!part.isMesh)return;var detail=detailModel.getObjectByName(part.name);if(detail&&detail.isMesh)parts.push({mesh:part,geometry:part.geometry,material:part.material,detail:detail});});visitorSurfaces.push(parts);});
    function watchVisitor(visitor,view,aspect){
      watchFlower(visitor,view,aspect);
      if(detailedVisitor===visitor)return;
      if(detailedVisitor){visitorSurfaces[visitors.indexOf(detailedVisitor)].forEach(function(part){part.mesh.geometry=part.geometry;part.mesh.material=part.material;});}
      detailedVisitor=visitor;
      if(visitor)visitorSurfaces[visitors.indexOf(visitor)].forEach(function(part){part.mesh.geometry=part.detail.geometry;part.mesh.material=part.detail.material;});
    }
    function animate(clock,reduced,inspecting){
      breeze.value=reduced?0:Number.isFinite(clock)?Math.max(0,clock):0;windStrength.value=reduced?0:1;plantWind.value=inspecting?0:1;
      // A followed egg or caterpillar is still visible after takeoff. Keep its
      // attachment with the moving leaf, always deriving from the saved anchor.
      if(lifecycleAnchor){var a=lifecycleAnchor,wind=plantDisplacement(a.x,a.y,a.z);lifecycle.position.set(a.x+wind.x,a.y,a.z+wind.z);}
      atmosphere.animate(breeze.value,reduced,inspecting,currentLight==='golden');
    }
    function showOuterBlooms(on){outerBlooms.forEach(function(g){g.visible=!!on;});}
    return {scene:scene,player:player,updatePlayerWingFlex:updatePlayerWingFlex,visitors:visitors,speciesTemplates:speciesTemplates,animateVisitors:animateVisitors,watchVisitor:watchVisitor,flowerDetail:flowerDetail,atmosphere:atmosphere,setLight:setLight,bees:bees,animateBees:animateBees,showOuterBlooms:showOuterBlooms,outerBlooms:outerBlooms,ring:ring,targetRing:targetRing,restoration:restoration,focusHalo:focusHalo,playerShadow:playerShadow,animate:animate,lifecycle:lifecycle,syncLifecycle:syncLifecycle,feeding:feeding};
  }

  var CSS = `
    .bf-maturation-observation{margin-top:14px;padding:14px;border:1px solid var(--bf-line);border-left:4px solid #aa8137;border-radius:11px;background:var(--bf-bg)}.bf-maturation-cue{display:block;margin-top:6px;font-size:16px}.bf-maturation-observation>p{font-size:13px}.bf-maturation-observation .bf-life-watch-actions{margin-top:12px}@media(max-width:580px){.bf-maturation-observation{padding:11px}}@media(forced-colors:active){.bf-maturation-observation{border-color:CanvasText}}
    .bf-larval-observation{margin-top:14px;padding:14px;border:1px solid var(--bf-line);border-left:4px solid #6b8745;border-radius:11px;background:var(--bf-bg)}.bf-larval-readout{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bf-larval-readout span{display:block;font-size:12px;color:var(--bf-muted)}.bf-larval-readout strong{font-size:14px}.bf-larval-observation>p{font-size:13px}.bf-larval-observation .bf-life-watch-actions{margin-top:12px}@media(max-width:580px){.bf-larval-observation{padding:11px}.bf-larval-readout{grid-template-columns:1fr;gap:8px}}@media(forced-colors:active){.bf-larval-observation{border-color:CanvasText}.bf-larval-readout span{color:CanvasText}}
    .bfl{--bf-bg:#f4f3e9;--bf-panel:#fffcf3;--bf-ink:#24382e;--bf-muted:#526356;--bf-line:#c6cdb9;--bf-accent:#245c43;color:var(--bf-ink);background:var(--bf-bg);font:15px/1.5 system-ui,sans-serif;padding:22px;border-radius:20px;max-width:1450px;margin:auto;width:100%;box-sizing:border-box}
    .bfl[data-dark="true"]{--bf-bg:#172d26;--bf-panel:#203a30;--bf-ink:#f2f4df;--bf-muted:#c4d3bf;--bf-line:#60816b;--bf-accent:#b1dec2}
    .bfl *{box-sizing:border-box}.bfl h2,.bfl h3,.bfl p{margin:0}.bfl h2{font:600 clamp(27px,4vw,42px)/1.15 Georgia,serif;letter-spacing:-.025em}.bfl h3{font:600 22px/1.2 Georgia,serif}.bfl p{margin-top:8px}.bfl button,.bfl summary{font:inherit}.bfl button{min-height:44px;border:1px solid var(--bf-line);border-radius:10px;padding:9px 14px;background:var(--bf-panel);color:var(--bf-ink);cursor:pointer;font-weight:650}.bfl button:hover{border-color:var(--bf-accent)}.bfl button:disabled,.bfl .bf-playback-command[aria-disabled="true"]{opacity:.55;cursor:default}.bfl .bf-playback-command[aria-disabled="true"]:focus-visible{opacity:1}.bfl button[aria-pressed="true"],.bfl .bf-primary{background:#245c43;color:#fff;border-color:#245c43}.bfl button:focus-visible,.bfl summary:focus-visible,.bfl a:focus-visible,.bfl [tabindex]:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bfl a{color:var(--bf-accent);text-decoration:underline}.bf-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--bf-muted)}.bf-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:18px}.bf-header p{max-width:720px;color:var(--bf-muted)}.bf-mark{font-size:44px;flex-shrink:0}.bf-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:18px;align-items:start}.bf-stage{position:relative;height:520px;overflow:hidden;border-radius:16px;background:#c8e0d6;border:1px solid var(--bf-line);isolation:isolate}.bf-stage canvas{display:block;width:100%;height:100%;position:absolute;inset:0}.bf-stage .bf-map{z-index:0}.bf-stage .bf-gl{z-index:1}.bf-overlay{position:absolute;z-index:2;pointer-events:none;inset:0;padding:16px;display:flex;flex-direction:column;justify-content:space-between}.bf-scene-badge{align-self:flex-start;background:#203b30ed;color:#fff8e6;border:1px solid #70967c;padding:7px 12px;border-radius:50px;font-size:12px;letter-spacing:.04em}.bf-scene-bottom{background:#fffcf3ed;color:#24382e;align-self:flex-start;max-width:100%;border-radius:10px;padding:10px 14px;border:1px solid #c6cdb9}.bf-scene-bottom strong{display:block}.bf-scene-bottom small{display:block;color:#526356}.bf-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.bf-toolbar .bf-spacer{flex:1}.bf-status{padding:12px 14px;background:var(--bf-panel);border:1px solid var(--bf-line);border-radius:12px;min-height:70px}.bf-status p{margin:0}.bf-help{font-size:12px;color:var(--bf-muted);margin:8px 0!important}.bf-panel{background:var(--bf-panel);border:1px solid var(--bf-line);border-radius:15px;padding:17px}.bf-panel+.bf-panel{margin-top:14px}.bf-destination{display:block;text-align:left;width:100%;margin-top:10px;padding:12px!important}.bf-destination span,.bf-destination small{display:block}.bf-destination small{font-weight:400;margin-top:4px}.bf-progress{display:flex;gap:5px;margin:12px 0 5px}.bf-progress i{height:5px;background:var(--bf-line);flex:1;border-radius:5px}.bf-progress i[data-done="true"]{background:var(--bf-accent)}.bf-journal{list-style:none;padding:0;margin:12px 0 0}.bf-journal li{border-top:1px solid var(--bf-line);padding:10px 0}.bf-journal strong{display:block}.bf-journal p{font-size:13px;color:var(--bf-muted);margin:4px 0}.bf-bottom{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.bf-bottom>.bf-panel{margin-top:0}.bf-life{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.bf-life span{flex:1;min-width:85px;border:1px solid var(--bf-line);border-radius:9px;padding:9px;font-size:13px}.bf-life b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-touch{display:flex;flex-wrap:wrap;gap:6px}.bf-touch button{touch-action:none;min-width:46px}.bf-sources{margin-top:18px;font-size:13px;color:var(--bf-muted)}.bf-sources summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:650}.bf-sources ul{padding-left:20px}.bf-question button{display:block;width:100%;text-align:left;margin-top:9px}.bf-question [role="status"]{font-size:13px;margin-top:10px}.bf-meter{font-size:12px;color:var(--bf-muted);margin-top:12px}.bf-meter meter{width:100%;height:10px;display:block;margin-top:4px;accent-color:#245c43}
    .bf-design{margin-top:18px!important;border-top:4px solid #b87532}.bf-design-head{display:flex;gap:16px;justify-content:space-between;align-items:start}.bf-design-head p{max-width:780px}.bf-design-steps{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:16px 0}.bf-design fieldset{border:0;margin:0;padding:0;min-width:0}.bf-design legend,.bf-design label{display:block;font-weight:750;margin-bottom:8px}.bf-design-choices{display:grid;gap:8px}.bf-design-choices button{text-align:left}.bf-design-choices small{display:block;font-weight:400;margin-top:3px}.bf-design select{display:block;width:100%;min-height:46px;margin:8px 0 12px;padding:10px;border:1px solid var(--bf-line);border-radius:9px;background:var(--bf-panel);color:var(--bf-ink);font:inherit}.bf-design select:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bf-design-actions{display:flex;flex-wrap:wrap;gap:8px}.bf-comparison{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:15px;font-size:13px}.bf-comparison th,.bf-comparison td{border-bottom:1px solid var(--bf-line);text-align:left;padding:10px 8px;overflow-wrap:anywhere;vertical-align:top}.bf-comparison caption{text-align:left;font-weight:750;font-size:15px;padding-bottom:7px}.bf-comparison th:first-child{width:35%}.bf-comparison td span{display:block;color:var(--bf-muted);font-size:12px}.bf-design-feedback{min-height:50px;margin-top:12px;font-size:14px}.bf-design-current{font-size:12px;font-weight:700;color:var(--bf-muted);border:1px solid var(--bf-line);border-radius:30px;padding:7px 12px;flex-shrink:0}.bfl[data-contrast="true"]{--bf-bg:#000;--bf-panel:#111;--bf-ink:#fff;--bf-muted:#fff;--bf-line:#fff;--bf-accent:#a7f3d0}
    @media(max-width:580px){.bf-design-steps{grid-template-columns:1fr}.bf-design-head{display:block}.bf-design-current{display:inline-block;margin-top:10px}.bf-comparison th,.bf-comparison td{padding:9px 4px}}
    .bf-lens-tools{position:absolute;z-index:3;top:62px;left:16px;right:16px;display:flex;gap:6px;flex-wrap:wrap}.bf-lens-tools button{font-size:13px;padding:8px 12px;background:#fffcf3;color:#24382e;border-color:#64745d;box-shadow:0 2px 6px #203b3020}.bf-lens-tools button[aria-pressed="true"]{background:#245c43;color:white;border-color:#245c43}.bf-field-card{margin-top:12px;border:1px solid var(--bf-line);border-left:4px solid #b87532;border-radius:12px;background:var(--bf-panel);padding:15px}.bf-field-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.bf-resource-tag{font-size:12px;font-weight:750;border:1px solid var(--bf-line);padding:3px 8px;border-radius:20px}.bf-field-card h3{font-size:21px}.bf-field-card p{font-size:14px}.bf-field-card .bf-help{margin-bottom:0!important}.bf-lens-caption{border-left:4px solid #b87532}.bf-lens-caption .bf-eyebrow{color:#526356;font-size:10px;margin-bottom:3px}
    @media(max-width:580px){.bf-lens-tools{left:10px;right:10px;top:57px}.bf-lens-tools button{padding:8px 10px}.bf-field-card{padding:12px}.bf-scene-bottom{font-size:13px}}
    @media(forced-colors:active){.bf-lens-tools button{background:Canvas;color:CanvasText;border-color:ButtonText;box-shadow:none}.bf-lens-tools button[aria-pressed="true"]{background:Highlight;color:HighlightText;border-color:Highlight}.bf-field-card,.bf-lens-caption{border-left-color:CanvasText}.bf-lens-caption .bf-eyebrow{color:CanvasText}}
    @media(max-width:1000px){.bf-layout{grid-template-columns:1fr}.bf-aside{display:grid;grid-template-columns:1fr 1fr;gap:14px}.bf-panel+.bf-panel{margin-top:0}.bf-stage{height:480px}}
    @media(max-width:580px){.bfl{padding:12px;border-radius:12px}.bf-header{gap:8px}.bf-mark{display:none}.bf-aside,.bf-bottom{grid-template-columns:1fr}.bf-stage{height:390px}.bf-overlay{padding:10px}.bf-toolbar{gap:6px}.bf-toolbar button{flex:1;padding:9px}.bf-toolbar .bf-spacer{display:none}.bf-scene-badge{font-size:11px}.bf-bottom{gap:14px}.bf-life span{min-width:100px}}
    .bf-cycle{margin-top:18px!important;border-top:4px solid #5a6f8c}.bf-cycle-head{display:flex;gap:16px;justify-content:space-between;align-items:start}.bf-cycle-head p{max-width:780px}.bf-cycle-steps{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:16px 0}.bf-cycle fieldset{border:0;margin:0;padding:0;min-width:0}.bf-cycle legend,.bf-cycle label{display:block;font-weight:750;margin-bottom:8px}.bf-cycle-choices{display:grid;gap:8px}.bf-cycle-choices button{text-align:left}.bf-cycle-choices small{display:block;font-weight:400;margin-top:3px}.bf-cycle select{display:block;width:100%;min-height:46px;margin:8px 0 12px;padding:10px;border:1px solid var(--bf-line);border-radius:9px;background:var(--bf-panel);color:var(--bf-ink);font:inherit}.bf-cycle select:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bf-cycle-actions{display:flex;flex-wrap:wrap;gap:8px}
    .bf-glossary{margin-top:18px!important;border-top:4px solid #6b5a7c}.bf-glossary summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:750}.bf-glossary dl{margin:14px 0 0;display:grid;gap:12px}.bf-glossary div{border:1px solid var(--bf-line);border-left:4px solid #6b5a7c;border-radius:12px;padding:12px 14px;background:var(--bf-panel)}.bf-glossary dt{font-weight:750;font-size:15px}.bf-glossary dd{margin:5px 0 0;font-size:14px}.bf-glossary dd.bf-gloss-here{margin-top:7px;font-size:13px;color:var(--bf-muted);border-top:1px solid var(--bf-line);padding-top:7px}@media(min-width:860px){.bf-glossary dl{grid-template-columns:1fr 1fr}}
    .bf-report{margin-top:18px!important;border-top:4px solid #4a6b7c}.bf-report-head{display:flex;gap:16px;justify-content:space-between;align-items:start;flex-wrap:wrap}.bf-report-head p{max-width:780px}.bf-report-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.bf-report pre{margin:12px 0 0;padding:14px;border:1px solid var(--bf-line);border-radius:12px;background:var(--bf-panel);font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:340px;overflow:auto}.bf-report textarea{width:100%;margin-top:12px;padding:12px;border:1px solid var(--bf-line);border-radius:12px;background:var(--bf-panel);color:var(--bf-ink);font:12px/1.5 ui-monospace,Menlo,monospace}.bf-report textarea:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}
    .bf-season{margin-top:18px!important;border-top:4px solid #7a5c2e}.bf-season-head{display:flex;gap:16px;justify-content:space-between;align-items:start}.bf-season-head p{max-width:780px}.bf-season-steps{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:16px 0}.bf-season label{display:block;font-weight:750;margin-bottom:8px}.bf-season select{display:block;width:100%;min-height:46px;margin:8px 0 12px;padding:10px;border:1px solid var(--bf-line);border-radius:9px;background:var(--bf-panel);color:var(--bf-ink);font:inherit}.bf-season select:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bf-season-actions{display:flex;flex-wrap:wrap;gap:8px}.bf-season-current{font-size:12px;font-weight:700;color:var(--bf-muted);border:1px solid var(--bf-line);border-radius:30px;padding:7px 12px;flex-shrink:0}
    .bf-weeks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0;list-style:none;padding:0}.bf-weeks li{border:1px solid var(--bf-line);border-radius:11px;padding:11px;background:var(--bf-panel)}.bf-weeks b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-weeks strong{display:block;margin-top:2px}.bf-weeks small{display:block;color:var(--bf-muted);font-size:12px;margin-top:5px}.bf-weeks li[data-state="cleared"]{border-left:4px solid var(--bf-accent);padding-left:8px}.bf-weeks li[data-state="cut"]{border-left:4px solid #b45b0c;padding-left:8px}.bf-weeks li[data-state="missing"]{border-left:4px solid #8a8f7a;padding-left:8px}.bf-season-feedback{min-height:50px;margin-top:12px;font-size:14px}.bf-seasons{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:15px;font-size:13px}.bf-seasons th,.bf-seasons td{border-bottom:1px solid var(--bf-line);text-align:left;padding:10px 8px;overflow-wrap:anywhere;vertical-align:top}.bf-seasons caption{text-align:left;font-weight:750;font-size:15px;padding-bottom:7px}.bf-seasons td span{display:block;color:var(--bf-muted);font-size:12px}
    .bf-track{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0;list-style:none;padding:0}.bf-track li{border:1px solid var(--bf-line);border-radius:11px;padding:11px;background:var(--bf-panel)}.bf-track b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-track strong{display:block;margin-top:2px}.bf-track small{display:block;color:var(--bf-muted);font-size:12px;margin-top:5px}.bf-track li[data-state="current"]{border-color:var(--bf-accent);border-width:2px;padding:10px}.bf-track li[data-state="reached"]{border-left:4px solid var(--bf-accent);padding-left:8px}.bf-track li[data-state="blocked"]{border-left:4px solid #b45b0c;padding-left:8px}.bf-track-tag{font-size:11px;font-weight:750;display:inline-block;margin-top:6px;border:1px solid var(--bf-line);border-radius:20px;padding:2px 8px}
    .bf-cycle-feedback{min-height:50px;margin-top:12px;font-size:14px}.bf-broods{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:15px;font-size:13px}.bf-broods th,.bf-broods td{border-bottom:1px solid var(--bf-line);text-align:left;padding:10px 8px;overflow-wrap:anywhere;vertical-align:top}.bf-broods caption{text-align:left;font-weight:750;font-size:15px;padding-bottom:7px}.bf-broods th:first-child{width:34%}.bf-broods td span{display:block;color:var(--bf-muted);font-size:12px}.bf-cycle-current{font-size:12px;font-weight:700;color:var(--bf-muted);border:1px solid var(--bf-line);border-radius:30px;padding:7px 12px;flex-shrink:0}
    .bf-verdict{margin-top:14px;border:1px solid var(--bf-line);border-left:4px solid var(--bf-accent);border-radius:12px;padding:14px;background:var(--bf-panel)}.bf-verdict[data-bf-tested="false"]{border-left-color:#b45b0c}.bf-verdict strong{display:block;font-size:15px}.bf-verdict p{font-size:13px;color:var(--bf-muted)}.bf-verdict .bf-eyebrow{margin-top:12px;display:block}.bf-evidence{margin:8px 0 0;padding-left:20px;font-size:13px}.bf-evidence li{margin-top:5px}.bf-evidence li[data-evidence="brood"]{font-weight:650}
    @media(forced-colors:active){.bf-verdict{border-left-color:CanvasText}.bf-verdict[data-bf-tested="false"]{border-left-color:CanvasText}.bf-verdict p{color:CanvasText}}
    @media(max-width:860px){.bf-track{grid-template-columns:1fr 1fr}.bf-weeks{grid-template-columns:1fr 1fr}}
    @media(max-width:580px){.bf-cycle-steps{grid-template-columns:1fr}.bf-cycle-head{display:block}.bf-cycle-current{display:inline-block;margin-top:10px}.bf-track{grid-template-columns:1fr}.bf-broods th,.bf-broods td{padding:9px 4px}.bf-season-steps{grid-template-columns:1fr}.bf-season-head{display:block}.bf-season-current{display:inline-block;margin-top:10px}.bf-weeks{grid-template-columns:1fr}.bf-seasons th,.bf-seasons td{padding:9px 4px}}
    @media(forced-colors:active){.bf-track li[data-state="current"]{border-color:Highlight}.bf-track li[data-state="reached"],.bf-track li[data-state="blocked"]{border-left-color:CanvasText}.bf-track small,.bf-track b{color:CanvasText}}
    .bf-guide{margin-bottom:18px;padding:16px;border:1px solid var(--bf-line);border-radius:15px;background:var(--bf-panel)}.bf-guide-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.bf-guide h3{font-size:19px}.bf-guide-count{font-size:12px;color:var(--bf-muted);white-space:nowrap}.bf-guide-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:12px 0}.bf-guide-steps button{text-align:left;padding:10px;font-size:13px;min-width:0}.bf-guide-steps small{display:block;font-size:11px;font-weight:400;color:var(--bf-muted);margin-top:4px}.bf-guide-steps button[aria-current="step"]{border:2px solid var(--bf-accent);padding:9px}.bf-guide-steps button[data-complete="true"]::before{content:'✓ ';color:var(--bf-accent)}.bf-guide-next{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid var(--bf-line);padding-top:10px}.bf-guide-next p{font-size:13px;margin:0;max-width:850px;color:var(--bf-muted)}.bf-guide-next button{flex-shrink:0;font-size:13px}.bf-guide-note{font-size:11px!important;color:var(--bf-muted)}
    .bf-notebook{margin-top:18px!important;border-top:4px solid #245c43}.bf-notebook-head{display:flex;justify-content:space-between;gap:16px;align-items:start}.bf-notebook-status{font-size:12px;font-weight:700;border:1px solid var(--bf-line);border-radius:20px;padding:6px 10px;flex-shrink:0}.bf-notebook-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:16px}.bf-notebook label,.bf-notebook legend{font-size:14px;font-weight:700;display:block}.bf-notebook fieldset{border:0;padding:0;margin:18px 0 0;min-width:0}.bf-notebook select,.bf-notebook textarea{display:block;width:100%;margin:7px 0 14px;background:var(--bf-panel);color:var(--bf-ink);font:14px/1.5 system-ui,sans-serif;border:1px solid var(--bf-line);border-radius:10px;padding:10px;min-height:46px}.bf-notebook textarea{resize:vertical;min-height:112px}.bf-notebook select:focus-visible,.bf-notebook textarea:focus-visible,.bf-notebook input:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bf-citation-list{display:grid;gap:8px;margin-top:10px;max-height:340px;overflow-y:auto;padding:4px}.bf-notebook .bf-citation{display:flex;gap:10px;align-items:start;border:1px solid var(--bf-line);border-radius:10px;padding:12px;min-height:44px;font-size:13px;font-weight:400;cursor:pointer;overflow-wrap:anywhere}.bf-citation:has(input:checked){border-color:var(--bf-accent);box-shadow:inset 3px 0 var(--bf-accent)}.bf-citation input{width:18px;height:18px;flex:0 0 18px;margin:2px 0 0;accent-color:#245c43}.bf-citation small{display:block;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.08em;color:var(--bf-muted);margin-bottom:3px}.bf-notebook-check{padding:12px;border:1px solid var(--bf-line);border-radius:10px;font-size:13px}.bf-notebook-check strong{display:block}.bf-notebook-check p{color:var(--bf-muted);margin-top:5px}.bf-notebook-review{border-left:3px solid #b45b0c;padding:10px;margin-top:12px;font-size:13px}.bf-notebook-review button{margin-top:8px}.bf-writing-count{font-size:11px;color:var(--bf-muted);text-align:right;margin-top:-8px!important;margin-bottom:14px!important}
    @media(max-width:860px){.bf-guide-steps{grid-template-columns:repeat(3,minmax(0,1fr))}.bf-notebook-grid{grid-template-columns:1fr}.bf-notebook-head{flex-wrap:wrap}}
    @media(max-width:580px){.bf-guide{padding:12px}.bf-guide-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.bf-guide-next{display:block}.bf-guide-next button{width:100%;margin-top:10px}.bf-guide-head{align-items:start}.bf-guide-count{white-space:normal;text-align:right}.bf-notebook-status{font-size:11px}.bf-citation-list{max-height:300px}}
    @media(forced-colors:active){.bf-citation:has(input:checked){outline:2px solid Highlight;box-shadow:none}.bf-notebook{border-top-color:CanvasText}.bf-notebook-review{border-left-color:CanvasText}}
    .bf-life-watch{margin:12px 0;padding:18px;background:var(--bf-panel);border:1px solid var(--bf-line);border-top:4px solid #527660;border-radius:14px}.bf-life-watch-head{display:flex;align-items:start;justify-content:space-between;gap:12px}.bf-life-stage-label{white-space:nowrap;font-size:13px;font-weight:750;color:var(--bf-muted)}.bf-life-watch-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.bf-life-caution{border-left:3px solid #a36a28;padding-left:12px;font-size:13px}.bf-life-invite{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--bf-line);background:var(--bf-bg);padding:13px 15px;border-radius:12px;margin-top:15px}.bf-life-invite p{margin:0;font-size:14px}.bf-life-invite button{flex-shrink:0}.bf-life-back{margin-top:8px;font-size:13px!important}.bfl[data-contrast="true"] .bf-life-watch,.bfl[data-contrast="true"] .bf-life-caution{border-color:currentColor}@media(max-width:580px){.bf-life-invite{display:block}.bf-life-invite button{margin-top:10px}.bf-life-watch{padding:13px}.bf-life-watch-actions button{flex:1 1 135px}}
    .bf-feed-watch{border-top-color:#a57624}.bf-feed-steps{display:flex;gap:8px;list-style-position:inside;padding:0;margin:14px 0;flex-wrap:wrap}.bf-feed-steps li{padding:6px 10px;border:1px solid var(--bf-line);border-radius:8px;font-size:13px}.bf-feed-steps li[aria-current=step]{background:var(--bf-accent);color:var(--bf-panel);font-weight:750}.bf-feed-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12px;margin:12px 0}.bf-feed-key span{display:flex;align-items:center;gap:6px}.bf-feed-key i{display:inline-block;width:12px;height:12px;border:1px solid var(--bf-ink);border-radius:50%;background:#1c8992}.bf-feed-key [data-cue=pollen]{background:#e5b540}.bf-feed-key [data-cue=surface]{background:#82b67a;border-radius:2px}.bf-feed-invite{margin-bottom:12px}
    .bf-feed-label{position:absolute;z-index:3;pointer-events:none;visibility:hidden;font-size:11px;font-weight:750;color:#23382c}.bf-feed-label span{position:relative;display:block;padding:5px 8px;border-radius:6px;border:1px solid #657858;background:#fff9e9;box-shadow:0 1px 5px #23382c22;white-space:nowrap}.bf-feed-label i{position:absolute;left:0;top:0;height:1px;background:#fff9e9;box-shadow:0 0 2px #23382c;transform-origin:0 0}.bf-feed-label i:after{content:'';position:absolute;right:-3px;top:-3px;width:6px;height:6px;background:#fff9e9;border:1px solid #53664a;border-radius:50%}
    .bf-feed-inspect{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:14px 0}.bf-feed-inspect .bf-eyebrow{margin-right:6px}.bf-feed-inspect button{font-size:12px;padding:8px 10px}.bf-feed-playback{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:18px;align-items:end;padding:13px;background:var(--bf-bg);border:1px solid var(--bf-line);border-radius:10px}.bf-feed-scrub{min-width:0}.bf-feed-scrub>span{display:flex;justify-content:space-between;gap:8px;font-weight:700;font-size:13px}.bf-feed-scrub output{font-variant-numeric:tabular-nums;color:var(--bf-muted)}.bf-feed-scrub input{width:100%;display:block;height:44px;margin:0;accent-color:var(--bf-accent);cursor:ew-resize}.bf-feed-speed{font-size:12px;font-weight:700}.bf-feed-speed select{display:block;min-height:44px;width:100%;padding:6px;border:1px solid var(--bf-line);border-radius:8px;font:inherit;background:var(--bf-panel);color:var(--bf-ink)}.bf-feed-contact{min-width:0;border:1px solid var(--bf-line);border-radius:10px;padding:10px 12px;margin:15px 0}.bf-feed-contact legend{font-weight:750;font-size:14px}.bf-feed-contact>div{display:flex;flex-wrap:wrap;gap:8px}.bf-feed-contact button{font-size:13px;flex:1}.bf-feed-result{margin:14px 0}.bf-feed-ledger{display:grid;grid-template-columns:1fr 1fr;gap:9px}.bf-feed-ledger p{margin:0;padding:10px 12px;border:1px solid var(--bf-line);border-radius:10px;background:var(--bf-bg)}.bf-feed-ledger span{display:block;color:var(--bf-muted);font-size:12px}.bf-feed-ledger strong{font-size:14px}.bf-feed-playback input:focus-visible,.bf-feed-playback select:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}@media(max-width:580px){.bf-feed-playback{grid-template-columns:1fr;gap:5px}.bf-feed-inspect .bf-eyebrow{flex-basis:100%}.bf-feed-inspect button{flex:1 1 100px}.bf-feed-speed{display:flex;align-items:center;gap:12px}.bf-feed-speed select{width:auto;flex:1}.bf-feed-contact>div{flex-direction:column}.bf-feed-ledger p{padding:9px}.bf-feed-ledger strong{font-size:13px}}
    @media(prefers-reduced-motion:reduce){.bfl,.bfl *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    .bf-pollination-comparison{border-top:1px solid var(--bf-line);margin-top:18px;padding-top:18px}.bf-pollination-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.bf-pollination-head h4{font:600 20px/1.25 Georgia,serif;margin:6px 0 0}.bf-pollination-head button{flex-shrink:0}.bf-pollination-cases{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:14px 0}.bf-pollination-cases>div{padding:13px;border:1px dashed var(--bf-line);border-radius:10px;background:var(--bf-bg);min-width:0}.bf-pollination-cases>div[data-recorded="true"]{border-style:solid;border-left:4px solid var(--bf-accent)}.bf-pollination-cases strong{display:block}.bf-pollination-saved{display:block;font-size:11px;font-weight:750;color:var(--bf-muted);margin-top:4px}.bf-pollination-cases p{font-size:13px}.bf-pollination-conclusion{padding:13px;border:1px solid var(--bf-line);border-radius:10px;background:var(--bf-bg);font-size:14px}.bf-pollination-conclusion p{margin-top:0}.bf-pollination-conclusion button{margin-top:10px}.bf-pollination-species{display:block;font-size:12px;color:var(--bf-muted);margin-top:3px}.bf-pollination-notes{border-top:4px solid var(--bf-accent)}.bf-pollination-notes li[data-current="false"]{border-left:2px solid var(--bf-line);padding-left:10px}.bf-pollination-notes button{width:100%}@media(max-width:1000px) and (min-width:581px){.bf-pollination-notes{grid-column:1/-1}.bf-pollination-notes .bf-journal{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.bf-pollination-notes button{width:auto}}@media(max-width:580px){.bf-pollination-head{display:block}.bf-pollination-head button{width:100%;margin-top:12px}.bf-pollination-cases{grid-template-columns:1fr}.bf-pollination-conclusion button{width:100%}}
    .bf-life-detail{margin:14px 0;padding:12px 14px;border:1px solid var(--bf-line);border-left:4px solid var(--bf-accent);border-radius:10px;background:var(--bf-bg)}.bf-life-detail strong{font-size:14px}.bf-life-detail p{font-size:13px;color:var(--bf-muted);margin-top:5px}.bf-life-playback .bf-feed-speed{overflow-wrap:anywhere}
    @media(forced-colors:active){.bfl,.bfl[data-dark="true"],.bfl[data-contrast="true"]{--bf-bg:Canvas;--bf-panel:Canvas;--bf-ink:CanvasText;--bf-muted:CanvasText;--bf-line:CanvasText;--bf-accent:LinkText}.bf-scene-badge,.bf-scene-bottom{background:Canvas;color:CanvasText;border-color:CanvasText}.bfl button[aria-pressed="true"],.bfl .bf-primary{background:Highlight;color:HighlightText;border-color:Highlight}.bf-scene-bottom small{color:CanvasText}}
    .bf-destination-row{margin-top:10px}.bf-destination-row .bf-destination{margin-top:0;border-bottom-left-radius:0;border-bottom-right-radius:0}.bfl .bf-visit-direct{display:block;width:100%;text-align:left;min-height:44px;border-top:0;border-top-left-radius:0;border-top-right-radius:0;font-size:12px;color:var(--bf-accent);background:var(--bf-panel)}
    .bf-return{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--bf-line)}.bf-return button{font-size:13px}
    .bf-camera-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 12px}.bf-camera-tools>span{font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.1em;color:var(--bf-muted);margin-right:3px}.bf-camera-tools button{font-size:12px;min-height:44px;padding:8px 12px}.bf-flight-readout{font-size:12px;color:var(--bf-muted);margin-left:auto}.bfl .bf-toolbar button{white-space:normal}@media(max-width:580px){.bf-camera-tools{gap:6px}.bf-camera-tools>span{flex-basis:100%}.bf-camera-tools button{flex:1;padding:8px}.bf-flight-readout{flex-basis:100%;margin:0}}

    /* Full habitat names remain normal text, including in the illustrated view. */
    .bf-place-index{display:none}.bf-place-label[data-map="true"]{transform:translate(-50%,-50%);padding:0;width:2em;height:2em;display:grid;place-items:center;border-radius:50%;font:750 1rem/1 system-ui,sans-serif;background:#fffcf3;color:#24382e;border:2px solid #3d5b44;box-shadow:0 0 0 3px #fffcf3,0 3px 8px #203b3040}
    .bf-place-label[data-map="true"] .bf-place-index{display:block}.bf-place-label[data-map="true"] .bf-place-name,.bf-place-label[data-map="true"] small{display:none}
    .bf-map-key{margin-top:12px;padding:14px;border:1px solid var(--bf-line);border-radius:14px;background:var(--bf-panel);color:var(--bf-ink)}.bfl .bf-map-key h3{font:650 1rem/1.4 system-ui,sans-serif}.bf-map-key ol{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0 0;padding:0}.bf-map-key li{display:flex;align-items:flex-start;gap:10px;min-width:0}.bf-map-key li>div{min-width:0;overflow-wrap:anywhere}.bf-map-key strong{font-size:.9375rem;line-height:1.4}.bf-map-key small{display:block;color:var(--bf-muted);font-size:.8125rem;line-height:1.5;margin-top:2px}.bf-map-number{flex-shrink:0;display:grid;place-items:center;width:2em;height:2em;border-radius:50%;border:2px solid var(--bf-accent);color:var(--bf-ink);font:750 1rem/1 system-ui,sans-serif}
    @media(max-width:580px){.bf-map-key ol{grid-template-columns:1fr}.bf-map-key{padding:12px}}
    @media(forced-colors:active){.bf-place-label[data-map="true"]{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}.bf-map-number{border-color:CanvasText}}
    .bf-stage .bf-minimap{position:absolute;z-index:2;inset:auto;top:14px;right:14px;width:118px;height:118px;pointer-events:none;visibility:hidden;filter:drop-shadow(0 2px 5px #203b3040)}.bf-place-label{position:absolute;z-index:2;visibility:hidden;transform:translate(-50%,-100%);pointer-events:none;background:#fffcf3f2;color:#24382e;border:1px solid #64745d;border-radius:9px;padding:4px 9px;font-size:12px;font-weight:750;text-align:center;white-space:nowrap;box-shadow:0 2px 6px #203b3030}.bf-place-label small{display:block;font-size:10px;font-weight:600;color:#526356}@media(max-width:580px){.bf-stage .bf-minimap{display:none}.bf-place-label{font-size:11px;padding:3px 7px}}@media(forced-colors:active){.bf-place-label{background:Canvas;color:CanvasText;border-color:CanvasText}.bf-place-label small{color:CanvasText}}
    .bf-icon{display:block;flex-shrink:0}.bf-life-panel{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:18px;align-items:center;margin-top:12px}.bf-wheel{position:relative;width:100%;max-width:300px;aspect-ratio:1;margin:auto;color:var(--bf-muted)}.bf-wheel-ring{position:absolute;inset:0;width:100%;height:100%}.bf-wheel-stage{position:absolute;display:flex;flex-direction:column;align-items:center;gap:2px;width:31%;transform:translate(-50%,-50%);font-size:12px;font-weight:750;color:var(--bf-ink);text-align:center}.bf-wheel-stage[data-pos="top"]{left:50%;top:15%}.bf-wheel-stage[data-pos="right"]{left:85%;top:50%}.bf-wheel-stage[data-pos="bottom"]{left:50%;top:85%}.bf-wheel-stage[data-pos="left"]{left:15%;top:50%}.bf-wheel-stage .bf-icon{width:min(60px,100%);height:auto;border-radius:50%}.bf-wheel-stage[data-focus="true"] .bf-icon{box-shadow:0 0 0 4px var(--bf-accent)}.bf-wheel-stage[data-blocked="true"] .bf-icon{box-shadow:0 0 0 4px #b45b0c;opacity:.6}.bf-wheel-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;font-size:11px;color:var(--bf-muted);width:34%}.bf-wheel-center strong{display:block;font:600 16px/1.1 Georgia,serif;color:var(--bf-ink)}
    .bf-uses{list-style:none;margin:0;padding:0;display:grid;gap:8px}.bf-uses li{display:flex;gap:10px;align-items:center;border:1px solid var(--bf-line);border-radius:10px;padding:8px 10px;background:var(--bf-bg)}.bf-uses b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-uses span{font-size:13px}.bf-uses li[data-you="true"]{border-left:4px solid #c9731d}
    .bf-why{margin-top:14px;padding:13px 14px;border:1px solid var(--bf-line);border-left:4px solid #c9731d;border-radius:11px;background:var(--bf-bg)}.bf-why strong{display:block;font-size:15px}.bf-why p{font-size:13px}.bf-why small{display:block;margin-top:6px;font-size:11px;color:var(--bf-muted)}
    .bf-track li .bf-icon,.bf-weeks li .bf-icon{margin-bottom:6px}.bf-track li[data-state="blocked"] .bf-icon,.bf-track li[data-state="idle"] .bf-icon{opacity:.72}
    .bf-timeline{margin:16px 0 4px;padding:14px 14px 10px;border:1px solid var(--bf-line);border-radius:12px;background:var(--bf-bg)}.bf-tl-track{position:relative;height:134px;border-bottom:3px solid #8a9a6c;background:linear-gradient(180deg,transparent 0 60%,#9fbf7a33 60%)}.bf-tl-gone{position:absolute;top:0;bottom:0;right:0;background:repeating-linear-gradient(135deg,#b45b0c22 0 6px,transparent 6px 12px);border-left:2px dashed #b45b0c}.bf-tl-bar{position:absolute;bottom:0;height:10px;border-radius:5px;background:#c7b98d;border:1px solid #8a7b52}.bf-tl-bar[data-state="cleared"]{background:#3f7d5c;border-color:#245c43}.bf-tl-bar[data-state="cut"],.bf-tl-bar[data-state="missing"]{background:#d98a4a;border-color:#a14b08}.bf-tl-stage{position:absolute;bottom:14px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1px;font-size:11px;font-weight:750;color:var(--bf-ink);z-index:1}.bf-tl-mark{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;font-size:12px;border:1px solid var(--bf-line);background:var(--bf-panel);color:var(--bf-muted)}.bf-tl-stage[data-state="cleared"] .bf-tl-mark{background:#245c43;color:#fff;border-color:#245c43}.bf-tl-stage[data-state="cut"] .bf-tl-mark,.bf-tl-stage[data-state="missing"] .bf-tl-mark{background:#a14b08;color:#fff;border-color:#a14b08}.bf-tl-stage[data-state="cut"] .bf-icon,.bf-tl-stage[data-state="missing"] .bf-icon{opacity:.55}.bf-tl-stage[data-blocked="true"] .bf-icon{box-shadow:0 0 0 3px #b45b0c;border-radius:50%;opacity:1}.bf-tl-cut{position:absolute;top:-2px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:#8a3f07;background:var(--bf-panel);border:1px solid #b45b0c;border-radius:20px;padding:1px 8px 1px 2px;z-index:2;white-space:nowrap}.bf-tl-axis{position:relative;height:18px;font-size:10px;color:var(--bf-muted)}.bf-tl-axis span{position:absolute;transform:translateX(-50%);top:3px;font-variant-numeric:tabular-nums;white-space:nowrap}.bf-tl-caption{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--bf-muted)}.bf-tl-caption span:first-child{font-weight:750;color:var(--bf-ink)}.bf-timeline-compact .bf-tl-track{height:116px}.bf-timeline-compact .bf-tl-axis span{font-size:9px}.bf-timeline-compact .bf-tl-stage{font-size:10px}
    .bfl[data-dark="true"] .bf-tl-cut{color:#ffcf9e}.bfl[data-contrast="true"] .bf-tl-cut{color:#fff;border-color:#fff}
    .bf-mission{display:flex;gap:14px;align-items:center;margin:12px 0;padding:12px 14px;border-radius:12px;border:1px solid var(--bf-line);background:var(--bf-bg)}.bf-mission .bf-icon{width:52px;height:52px}.bf-mission p{margin:0;font-size:14px}.bf-mission strong{display:block;font-size:15px}
    .bf-badges{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none}.bf-badges li{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:750;border:1px solid var(--bf-line);border-radius:30px;padding:3px 10px 3px 3px;color:var(--bf-muted);background:var(--bf-panel)}.bf-badges li .bf-icon{width:26px;height:26px}.bf-badges li[data-earned="false"] .bf-icon{filter:grayscale(1);opacity:.45}.bf-badges li[data-earned="true"]{color:var(--bf-ink);border-color:var(--bf-accent);animation:bf-earn .5s ease-out}@keyframes bf-earn{from{transform:scale(.85)}to{transform:scale(1)}}
    .bf-cases{margin-top:18px!important;border-top:4px solid #c9731d}.bf-cases-head{display:flex;gap:16px;justify-content:space-between;align-items:start}.bf-cases-head p{max-width:780px}.bf-cases-score{font-size:12px;font-weight:700;color:var(--bf-muted);border:1px solid var(--bf-line);border-radius:30px;padding:7px 12px;flex-shrink:0}.bf-case-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:14px}.bf-case{border:1px solid var(--bf-line);border-radius:12px;padding:14px;background:var(--bf-bg);min-width:0}.bf-case h4{font:600 17px/1.25 Georgia,serif;margin:0}.bf-case>p{font-size:13px}.bf-case-species{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.bf-case-species span{font-size:11px;font-weight:750;border:1px solid var(--bf-line);border-radius:20px;padding:2px 8px;background:var(--bf-panel)}.bf-case label{display:block;font-size:13px;font-weight:700;margin-top:10px}.bf-case select{display:block;width:100%;min-height:44px;margin-top:5px;padding:8px;border:1px solid var(--bf-line);border-radius:9px;background:var(--bf-panel);color:var(--bf-ink);font:inherit;font-size:13px}.bf-case select:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bf-case-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.bf-case-result{margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid var(--bf-line);border-left:4px solid var(--bf-accent);background:var(--bf-panel);font-size:13px}.bf-case-result[data-matched="false"]{border-left-color:#b45b0c}.bf-case-result strong{display:block;font-size:14px}.bf-case[data-checked="true"]{border-color:var(--bf-accent)}
    @media(max-width:860px){.bf-life-panel{grid-template-columns:1fr}}
    @media(max-width:580px){.bf-tl-name{display:none}.bf-tl-track{height:84px}.bf-cases-head{display:block}.bf-cases-score{display:inline-block;margin-top:10px}.bf-case-grid{grid-template-columns:1fr}.bf-mission{align-items:start}.bf-mission .bf-icon{width:40px;height:40px}}
    @media(forced-colors:active){.bf-tl-bar{background:Canvas;border-color:CanvasText}.bf-tl-gone{border-left-color:CanvasText;background:none}.bf-tl-cut{color:CanvasText;border-color:CanvasText}.bf-tl-stage[data-state] .bf-tl-mark{background:Canvas;color:CanvasText;border-color:CanvasText}.bf-wheel-stage[data-focus="true"] .bf-icon,.bf-wheel-stage[data-blocked="true"] .bf-icon,.bf-tl-stage[data-blocked="true"] .bf-icon{box-shadow:none;outline:3px solid Highlight}.bf-case-result,.bf-why{border-left-color:CanvasText}}
    .bf-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.bf-guide-steps button{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;align-items:center}.bf-guide-steps button .bf-icon{grid-row:1/3;width:34px;height:34px}.bf-guide-steps button small{grid-column:2}.bf-guide-steps button{position:relative}.bf-guide-steps button[data-complete="true"]::before{content:'✓';position:absolute;left:32px;top:6px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;font-size:10px;background:var(--bf-accent);color:var(--bf-panel)}
    .bf-mission-checks{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:3px;font-size:13px}.bf-mission-checks li[data-done="true"]{color:var(--bf-accent);font-weight:650}.bf-mission-checks li[data-done="false"]{color:var(--bf-muted)}.bf-mission .bf-mission-verdict{font-size:13px;margin-top:8px}.bf-mission-stamp{display:inline-block;margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:var(--bf-accent);border-radius:20px;padding:3px 10px;animation:bf-earn .5s ease-out}.bfl[data-dark="true"] .bf-mission-stamp{color:#172d26}.bfl[data-contrast="true"] .bf-mission-stamp{color:#000}@media(forced-colors:active){.bf-mission-stamp{background:Highlight;color:HighlightText}}.bf-mission[data-bf-mission="supported"]{border-left:4px solid var(--bf-accent)}.bf-mission[data-bf-mission="rethink"],.bf-mission[data-bf-mission="timing"]{border-left:4px solid #b45b0c}
    .bf-facts{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}.bf-facts li{border:1px solid var(--bf-line);border-radius:10px;padding:9px 11px;background:var(--bf-bg);font-size:13px}.bf-facts b{display:block;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--bf-muted);margin-bottom:2px}.bf-weeks li[data-state="pending"]{border-style:dashed}.bf-seasons th span,.bf-broods th span{display:block;font-weight:400;font-size:12px;color:var(--bf-muted)}.bf-bottom{align-items:start}.bf-pollen-fact{border-left:3px solid #e5b540;padding-left:10px}
    @media(max-width:1100px){.bf-life-panel{grid-template-columns:1fr}}@media(max-width:580px){.bf-facts{grid-template-columns:1fr}.bf-guide-steps button .bf-icon{width:28px;height:28px}}
    .bf-listen-control{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}.bf-listen-feedback{margin:0;font-size:12px;line-height:1.45;color:var(--bf-ink);overflow-wrap:anywhere}.bf-status-row .bf-listen-control{max-width:20rem}.bf-status-row{display:flex;gap:8px;align-items:stretch}.bf-status-row .bf-status{flex:1;min-width:0}.bfl .bf-listen{font-size:12px;padding:6px 11px;min-height:44px;align-self:flex-start;white-space:nowrap}.bf-case .bf-listen,.bf-mission .bf-listen{margin-top:8px}@media(max-width:580px){.bf-status-row{flex-direction:column}.bf-status-row .bf-listen-control{align-self:flex-end}.bf-status-row .bf-listen{align-self:flex-end}}
    .bf-header-tools{display:flex;align-items:center;gap:12px;flex-shrink:0}.bfl .bf-simpler{font-size:13px;white-space:nowrap}@media(max-width:580px){.bf-header{flex-wrap:wrap}.bf-header-tools{width:100%}}
    /* A botanical field journal: clear controls around an immersive meadow. */
    .bfl{--bf-bg:#f3efe3;--bf-panel:#fffdf6;--bf-ink:#263d32;--bf-muted:#586657;--bf-line:#c8c9b5;--bf-accent:#245c43;--bf-wash:#e9eddf;--bf-gold:#855526;padding:clamp(16px,2.5vw,34px);border:1px solid var(--bf-line);border-radius:24px;background-image:radial-gradient(ellipse at 95% 0%,#dfca9340,transparent 38%);box-shadow:0 16px 60px #24382e0c}
    .bfl[data-dark="true"]{--bf-bg:#152a24;--bf-panel:#213a30;--bf-ink:#f2f2de;--bf-muted:#c2cfbc;--bf-line:#627c67;--bf-accent:#b1dec2;--bf-wash:#2b4535;--bf-gold:#e7bf79;background-image:radial-gradient(ellipse at 95% 0%,#cfa45c12,transparent 38%)}
    .bfl .bf-header{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,33%);gap:28px;align-items:center;margin-bottom:24px;padding:10px 0 24px;border-bottom:1px solid var(--bf-line)}
    .bfl .bf-header-copy{min-width:0;max-width:780px}
    .bfl .bf-header h2{font:400 clamp(34px,4.3vw,58px)/1.04 Georgia,'Times New Roman',serif;letter-spacing:-.045em;max-width:720px;margin:14px 0 13px;text-wrap:balance}
    .bfl .bf-header p{font-size:15px;line-height:1.7;max-width:650px;margin:0;color:var(--bf-muted)}
    .bfl .bf-header .bf-eyebrow{color:var(--bf-gold);font-size:10px;letter-spacing:.18em}
    .bfl .bf-header-tools{margin-top:19px;gap:10px;flex-wrap:wrap}
    .bfl .bf-header-tools button{font-size:12px;min-height:44px;padding:9px 14px}
    .bfl .bf-header-tools .bf-guide-link{background:transparent;border-color:transparent;text-decoration:underline;text-underline-offset:4px;color:var(--bf-accent)}
    .bf-botanical-plate{display:block;width:100%;height:auto;max-height:245px;overflow:visible}
    .bfl h3{font-weight:400;font-size:25px;letter-spacing:-.025em;text-wrap:balance}
    .bfl button{transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease;box-shadow:0 1px 2px #24382e06}
    .bfl button:not(:disabled):hover{box-shadow:0 3px 10px #24382e14;background:var(--bf-wash)}
    .bfl button[aria-pressed="true"],.bfl .bf-primary{background:#245c43;color:#fffdf6;border-color:#245c43;box-shadow:0 3px 8px #173e3020}
    .bfl button[aria-pressed="true"]:not(:disabled):hover,.bfl .bf-primary:not(:disabled):hover{background:#194b35;color:#fffdf6}
    .bfl button:focus-visible,.bfl summary:focus-visible,.bfl a:focus-visible,.bfl [tabindex]:focus-visible{outline-color:var(--bf-gold)}
    .bfl .bf-layout{gap:22px;grid-template-columns:minmax(0,1fr) 306px}
    .bfl .bf-layout>div,.bfl .bf-aside{min-width:0}
    .bfl .bf-stage{height:560px;border-radius:18px;border-color:#8b9d79;box-shadow:0 12px 30px #253e2920,0 2px 3px #253e2910}
    .bfl .bf-scene-badge{font-size:10px;font-weight:700;letter-spacing:.1em;padding:9px 13px;box-shadow:0 2px 8px #162d3022}
    .bfl .bf-scene-bottom{max-width:calc(100% - 8px);padding:12px 16px;border-radius:12px;box-shadow:0 4px 16px #203b3015}
    .bfl .bf-scene-bottom strong{font:400 22px/1.25 Georgia,serif;margin-bottom:3px}
    .bfl .bf-toolbar{gap:7px;margin:16px 0 12px}
    .bfl .bf-toolbar button{font-size:13px;min-height:46px}
    .bfl .bf-toolbar .bf-primary{padding-left:22px;padding-right:22px}
    .bfl .bf-camera-tools{padding:10px 12px;border:1px solid var(--bf-line);border-radius:12px;background:var(--bf-panel)}
    .bfl .bf-touch{padding-top:3px}
    .bfl .bf-touch button{font-size:12px;background:transparent}
    .bfl .bf-status{background:var(--bf-wash);border-color:var(--bf-line);min-height:60px;font-size:14px}
    .bfl .bf-panel,.bfl .bf-guide{border-radius:17px;box-shadow:0 3px 15px #24382e05;padding:22px}
    .bfl .bf-aside .bf-panel{padding:18px}
    .bfl .bf-aside .bf-panel+.bf-panel{margin-top:16px}
    .bfl .bf-aside h3{font-size:23px;margin-top:5px}
    .bfl .bf-help{font-size:12px;line-height:1.65}
    .bfl .bf-destination-row{border-radius:12px;margin-top:11px;overflow:hidden;border:1px solid var(--bf-line);background:var(--bf-panel)}
    .bfl .bf-destination-row:has(.bf-destination[aria-pressed="true"]){border-color:var(--bf-accent)}
    .bfl .bf-destination{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:11px;align-items:center;border:0;border-radius:0;padding:12px!important;box-shadow:none}
    .bfl .bf-destination .bf-icon{grid-row:1/3;width:44px;height:44px}
    .bfl .bf-destination>span{font-size:13px;font-weight:750}
    .bfl .bf-destination>small{grid-column:2;font:italic 12px/1.4 Georgia,serif;margin-top:3px}
    .bfl .bf-visit-direct{border:0;border-top:1px solid var(--bf-line);background:var(--bf-wash);border-radius:0;font-size:11px;min-height:44px;padding:8px 12px;color:var(--bf-accent);text-align:right;box-shadow:none}
    .bfl .bf-visit-direct::after{content:' ↗';margin-left:5px}
    .bfl .bf-destination-row:focus-within{outline:3px solid var(--bf-gold);outline-offset:3px}
    .bfl .bf-destination:focus-visible,.bfl .bf-visit-direct:focus-visible{outline-offset:-4px}
    .bfl .bf-meter{border-top:1px solid var(--bf-line);padding-top:12px;margin-top:16px;font-size:11px}
    .bfl .bf-progress i{height:6px}
    .bfl .bf-guide{margin:24px 0 0;border-top:3px solid var(--bf-gold)}
    .bfl .bf-guide-count{background:var(--bf-wash);border:1px solid var(--bf-line);padding:6px 11px;border-radius:30px}
    .bfl .bf-guide-steps{gap:10px;margin:18px 0}
    .bfl .bf-guide-steps button{min-height:82px;padding:12px}
    .bfl .bf-guide-steps button[aria-current="step"]{background:var(--bf-wash);padding:11px;box-shadow:0 2px 8px #24382e0c}
    .bfl .bf-mission{padding:17px;gap:17px;background:var(--bf-wash)}
    .bfl .bf-mission>div{min-width:0}
    .bfl .bf-mission>div>strong{font:400 21px/1.3 Georgia,serif;margin-bottom:6px}
    .bfl .bf-mission-checks{gap:5px;margin:12px 0}
    .bfl .bf-guide-next{padding-top:14px}
    .bfl .bf-design,.bfl .bf-cycle,.bfl .bf-season,.bfl .bf-notebook,.bfl .bf-cases,.bfl .bf-report,.bfl .bf-glossary{margin-top:24px!important}
    .bfl .bf-design-head,.bfl .bf-cycle-head,.bfl .bf-season-head,.bfl .bf-notebook-head,.bfl .bf-cases-head{padding-bottom:14px;border-bottom:1px solid var(--bf-line)}
    .bfl .bf-design-head h3,.bfl .bf-cycle-head h3,.bfl .bf-season-head h3,.bfl .bf-notebook-head h3,.bfl .bf-cases-head h3{margin-top:6px;font-size:29px}
    .bfl .bf-design-choices button,.bfl .bf-cycle-choices button{padding:14px}
    .bfl .bf-track li,.bfl .bf-weeks li{padding:16px;background:var(--bf-wash)}
    .bfl .bf-track li[data-state="current"]{padding:15px}
    .bfl .bf-track .bf-icon,.bfl .bf-weeks .bf-icon{width:50px;height:50px;margin-bottom:12px}
    .bfl .bf-comparison thead,.bfl .bf-seasons thead,.bfl .bf-broods thead{background:var(--bf-wash)}
    .bfl .bf-sources{padding:12px 0;border-top:1px solid var(--bf-line)}
    .bf-species-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}.bf-species-buttons button{text-align:left;font-size:12px;min-width:0}.bf-species-buttons small{display:block;font-weight:400;font-style:italic;margin-top:3px}.bf-species-notes{border-top:1px solid var(--bf-line);padding:12px 0;margin-bottom:8px}.bf-species-notes p+p{margin-top:6px}.bf-species-notes a{display:inline-block;font-size:12px;min-height:44px;padding:12px 0}
    .bf-watch-panel{padding:16px 18px;margin:0 0 12px;border:1px solid var(--bf-line);border-left:3px solid var(--bf-accent);border-radius:12px;background:var(--bf-wash)}.bf-watch-heading strong{display:block;font:500 21px/1.35 Georgia,serif;margin-top:5px}.bf-watch-patches{display:flex;flex-wrap:wrap;gap:8px;margin:13px 0 9px}.bf-watch-panel p{font-size:13px;line-height:1.65;color:var(--bf-muted);margin:0}.bfl .bf-watch-patches button{font-size:12px;min-height:44px}
    .bf-light-controls{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:0 0 12px}.bf-light-controls>span{font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.1em;color:var(--bf-muted);margin-right:6px}.bfl .bf-light-controls button{min-height:44px;font-size:12px;padding:8px 14px}.bf-light-controls button:last-child:before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.65;margin-right:7px}
    @media(max-width:580px){.bf-watch-panel{padding:14px}.bf-watch-heading strong{font-size:20px}.bf-watch-patches button{flex:1}.bf-light-controls>span{flex-basis:100%}.bf-light-controls button{flex:1}.bfl .bf-camera-tools button{flex:1 1 40%}}
    .bf-sound-controls{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:13px 15px;margin:0 0 12px;border:1px solid var(--bf-line);border-radius:13px;background:var(--bf-wash)}
    .bf-sound-copy{flex:1 1 210px;min-width:0}.bf-sound-copy strong{display:block;font-family:Georgia,serif;font-size:17px;font-weight:500}.bf-sound-copy span{display:block;font-size:12px;color:var(--bf-muted);line-height:1.5;margin-top:3px}
    .bfl .bf-sound-controls button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;font-size:12px;padding:9px 12px}.bf-sound-controls button svg{flex:none}
    .bf-sound-volume{display:flex;align-items:center;gap:9px;flex:1 1 210px;max-width:280px;font-size:12px;color:var(--bf-muted)}.bf-sound-volume input[type="range"]{flex:1;min-width:60px;width:110px;min-height:44px;accent-color:var(--bf-accent);cursor:pointer}.bf-sound-volume span:last-child{min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
    @media(max-width:580px){.bf-sound-controls{gap:9px;padding:12px}.bf-sound-copy{flex-basis:100%}.bfl .bf-sound-controls button{width:100%}.bf-sound-volume{max-width:none;flex-basis:100%}}
    .bfl[data-contrast="true"]{--bf-bg:#000;--bf-panel:#111;--bf-ink:#fff;--bf-muted:#fff;--bf-line:#fff;--bf-accent:#a7f3d0;--bf-wash:#111;--bf-gold:#ffdb9e;background:#000;box-shadow:none}
    .bfl[data-contrast="true"] .bf-botanical-plate{display:none}
    .bfl[data-contrast="true"] .bf-header{grid-template-columns:1fr}
    @media(max-width:1100px){.bfl .bf-header{grid-template-columns:minmax(0,1fr) 28%;gap:14px}.bfl .bf-header h2{font-size:44px}.bfl .bf-layout{grid-template-columns:minmax(0,1fr) 280px;gap:16px}.bfl .bf-aside .bf-panel{padding:15px}}
    @media(max-width:1000px){.bfl .bf-layout{grid-template-columns:1fr}.bfl .bf-stage{height:500px}.bfl .bf-aside{display:grid;grid-template-columns:1fr 1fr;gap:16px}.bfl .bf-aside .bf-panel+.bf-panel{margin-top:0}.bfl .bf-aside .bf-panel:first-child{grid-row:span 2}.bfl .bf-guide-steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:580px){.bfl{padding:14px;border-radius:16px}.bfl .bf-header{grid-template-columns:1fr;gap:0;padding:3px 0 18px;margin-bottom:18px}.bfl .bf-header-copy{position:relative;z-index:1}.bfl .bf-header h2{font-size:39px;max-width:390px}.bfl .bf-header p{font-size:14px}.bfl .bf-header .bf-eyebrow{font-size:9px;line-height:1.7;max-width:290px}.bfl .bf-botanical-plate{max-width:240px;max-height:132px;justify-self:center;margin-top:8px}.bfl .bf-header-tools{margin-top:14px;gap:4px}.bfl .bf-stage{height:410px;border-radius:14px}.bfl .bf-scene-bottom{padding:10px 12px}.bfl .bf-scene-bottom strong{font-size:19px}.bfl .bf-scene-badge{font-size:9px;letter-spacing:.05em;padding:8px 10px}.bfl .bf-panel,.bfl .bf-guide{padding:16px}.bfl .bf-aside{grid-template-columns:1fr;gap:14px}.bfl .bf-aside .bf-panel:first-child{grid-row:auto}.bfl .bf-guide-steps{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bfl .bf-guide-steps button{padding:9px;min-height:78px;font-size:12px}.bfl .bf-guide-steps button[aria-current="step"]{padding:8px}.bfl .bf-guide-count{font-size:10px;padding:5px 8px}.bfl .bf-mission{padding:13px;gap:10px;align-items:flex-start}.bfl .bf-mission .bf-icon{width:34px;height:34px}.bfl .bf-mission>div>strong{font-size:20px}.bfl .bf-design-head h3,.bfl .bf-cycle-head h3,.bfl .bf-season-head h3,.bfl .bf-notebook-head h3,.bfl .bf-cases-head h3{font-size:26px}.bfl .bf-camera-tools{padding:9px}.bfl .bf-toolbar button{font-size:12px}.bfl .bf-toolbar .bf-primary{padding-left:12px;padding-right:12px}}
    .bf-pilot{position:absolute;right:14px;bottom:14px;z-index:4;width:120px;display:grid;justify-items:center;gap:5px;color:#203b30;user-select:none}
    .bf-pilot-label,.bf-pilot-hint{font:700 10px/1.35 system-ui,sans-serif;padding:3px 7px;border-radius:8px;background:#fffcf3f5;box-shadow:0 1px 5px #203b3020;text-align:center}
    .bf-pilot-hint{font-size:9px;font-weight:600}
    .bfl .bf-flight-pad{position:relative;width:108px;height:108px;min-height:108px;padding:0;border-radius:50%;border:1px solid #70836b;color:#294a36;background:radial-gradient(circle at 45% 35%,#fffff8f5,#e3e9d8f5);box-shadow:inset 0 0 0 8px #f9fbef85,inset 0 0 0 9px #a9b79a70,0 3px 12px #18362635;touch-action:none;user-select:none;cursor:grab}
    .bfl .bf-flight-pad[data-active="true"]{cursor:grabbing;border-color:#245c43;box-shadow:inset 0 0 0 9px #dce8c080,0 0 0 3px #fffcf380,0 3px 12px #18362635}
    .bf-stick-axis{position:absolute;inset:17px;border-radius:50%;background:linear-gradient(90deg,transparent calc(50% - .5px),#9dad8a65 50%,transparent calc(50% + .5px)),linear-gradient(transparent calc(50% - .5px),#9dad8a65 50%,transparent calc(50% + .5px));pointer-events:none}
    .bf-stick-arrow{position:absolute;font:600 12px/1 system-ui,sans-serif;pointer-events:none}.bf-stick-arrow[data-direction="up"]{left:calc(50% - 4px);top:9px}.bf-stick-arrow[data-direction="down"]{left:calc(50% - 4px);bottom:9px}.bf-stick-arrow[data-direction="left"]{left:9px;top:calc(50% - 6px)}.bf-stick-arrow[data-direction="right"]{right:9px;top:calc(50% - 6px)}
    .bf-stick-thumb{position:absolute;left:50%;top:50%;width:35px;height:35px;border-radius:50%;border:1px solid #284d36;background:radial-gradient(circle at 35% 27%,#64825b,#2c503b 75%);box-shadow:0 2px 5px #1e3f3540,inset 0 1px 1px #eff9d66b;transform:translate(-50%,-50%) translate(var(--bf-stick-x,0px),var(--bf-stick-y,0px));pointer-events:none;transition:transform .12s ease-out}
    .bf-flight-pad[data-active="true"] .bf-stick-thumb{transition:none}.bf-pilot-altitude{display:flex;gap:6px}.bfl .bf-pilot-altitude button{min-width:51px;min-height:44px;padding:5px 8px;background:#fffcf3f5;border-color:#70836b;color:#294a36;font-size:17px}
    .bf-pilot[data-disabled="true"] .bf-flight-pad{opacity:.7}.bf-stage[data-bf-pad-visible="true"] .bf-scene-bottom{max-width:calc(100% - 144px)}.bf-flight-controls button:last-child:before{display:none}
    @media(max-width:580px){.bf-pilot{right:9px;bottom:10px;width:108px;gap:4px}.bfl .bf-flight-pad{width:96px;height:96px;min-height:96px}.bf-stage[data-bf-pad-visible="true"] .bf-scene-bottom{max-width:calc(100% - 124px)}.bf-stage[data-bf-pad-visible="true"] .bf-scene-bottom strong{font-size:16px}.bf-pilot-label{font-size:9px}.bf-pilot-hint{font-size:9px}.bfl .bf-pilot-altitude button{min-width:45px}}
    @media(prefers-reduced-motion:reduce){.bf-stick-thumb{transition:none}}
    @media(forced-colors:active){.bf-pilot{color:CanvasText}.bf-pilot-label,.bf-pilot-hint,.bfl .bf-flight-pad,.bfl .bf-pilot-altitude button{background:Canvas;color:CanvasText;border:1px solid ButtonText;box-shadow:none}.bf-stick-thumb{background:ButtonText;border-color:Canvas}.bf-stick-axis{border:1px dotted ButtonText}}
    @media(prefers-reduced-motion:reduce){.bfl button{transition:none}.bfl .bf-badges li,.bfl .bf-mission-stamp{animation:none}}
    @media(forced-colors:active){.bfl{--bf-wash:Canvas;--bf-gold:CanvasText;background:Canvas;box-shadow:none}.bfl .bf-botanical-plate{display:none}.bfl .bf-header{grid-template-columns:1fr}.bfl button,.bfl .bf-stage,.bfl .bf-panel,.bfl .bf-guide{box-shadow:none}.bfl button[aria-pressed="true"],.bfl .bf-primary{background:Highlight;color:HighlightText;border-color:Highlight}.bfl .bf-visit-direct,.bfl .bf-header .bf-eyebrow{color:CanvasText}.bfl .bf-header-tools .bf-guide-link{color:LinkText;background:Canvas}.bfl .bf-guide-steps button[aria-current="step"]{border-color:Highlight}.bfl .bf-destination-row:focus-within{outline-color:Highlight}}

    /* Accessible form boundaries and focus indicators follow every theme. */
    .bfl{--bf-control-border:var(--bf-muted);--bf-focus:var(--bf-gold)}
    .bfl :is(select,textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"])){border-color:var(--bf-control-border)}
    .bfl :is(button,summary,a,input,select,textarea,[tabindex]):focus-visible{outline:3px solid var(--bf-focus);outline-offset:3px}
    .bfl .bf-destination:focus-visible,.bfl .bf-visit-direct:focus-visible{outline-offset:-4px}
    .bfl .bf-destination[aria-pressed="true"]:focus-visible{outline-color:#fffdf6}
    @media(forced-colors:active){.bfl{--bf-control-border:ButtonText;--bf-focus:Highlight}.bfl .bf-destination[aria-pressed="true"]:focus-visible{outline-color:HighlightText}.bfl .bf-mission-checks li{color:CanvasText}}
    /* System-color buttons need no automatic text backplate: in Chromium it
       can otherwise cover HighlightText with a same-colored rectangle. */
    @media(forced-colors:active){
      .bfl :is(button[aria-pressed="true"],button.bf-primary),.bfl :is(button[aria-pressed="true"],button.bf-primary):not(:disabled):hover{forced-color-adjust:none;background:Highlight;color:HighlightText;border-color:Highlight;box-shadow:none}
      .bfl :is(button[aria-pressed="true"],button.bf-primary) :is(span,small,strong,em,b){color:inherit}
    }

    /* Keep the guide progress inside the page when learners enlarge text. */
    .bfl .bf-guide-head{flex-wrap:wrap}
    .bfl .bf-guide-steps button{overflow-wrap:anywhere}
    @media(max-width:580px){.bfl .bf-guide-steps{grid-template-columns:repeat(auto-fit,minmax(min(100%,8em),1fr))}}



    /* Keep text and controls in normal flow so enlargement never clips them. */
    .bfl .bf-stage{height:auto;overflow:visible;background:var(--bf-panel)}
    .bf-viewport{position:relative;height:560px;overflow:hidden;border-radius:17px 17px 0 0;background:#c8e0d6;isolation:isolate}
    .bf-scene-dock{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;padding:16px;border-top:1px solid var(--bf-line);border-radius:0 0 17px 17px;background:var(--bf-panel)}
    .bfl .bf-scene-dock .bf-scene-bottom{grid-column:1;min-width:0;max-width:100%;padding:0;border:0;border-radius:0;box-shadow:none;background:transparent;color:var(--bf-ink);overflow-wrap:anywhere}
    .bfl .bf-scene-dock .bf-scene-bottom strong{font-size:21px}.bf-scene-dock .bf-scene-bottom small,.bf-scene-dock .bf-lens-caption .bf-eyebrow{color:var(--bf-muted)}
    .bfl .bf-scene-dock .bf-lens-caption{padding-left:12px;border-left:3px solid var(--bf-accent)}
    .bf-scene-dock .bf-lens-tools{position:static;grid-column:1/-1;min-width:0;margin:0;gap:8px}.bf-scene-dock .bf-lens-tools button{max-width:100%;overflow-wrap:anywhere}
    .bf-scene-dock .bf-pilot{position:static;grid-column:2;width:230px;max-width:100%;grid-template-columns:112px minmax(0,1fr);grid-template-areas:'pad label' 'pad altitude' 'pad hint';gap:6px 10px;align-items:center}
    .bf-scene-dock .bf-flight-pad{grid-area:pad}.bf-scene-dock .bf-pilot-label{grid-area:label}.bf-scene-dock .bf-pilot-hint{grid-area:hint}.bf-scene-dock .bf-pilot-label,.bf-scene-dock .bf-pilot-hint{max-width:100%;overflow-wrap:anywhere}
    .bf-scene-dock .bf-pilot-altitude{grid-area:altitude;flex-wrap:wrap;justify-content:center;max-width:100%}
    @media(max-width:1000px){.bf-viewport{height:500px}}
    @media(max-width:580px){.bf-viewport{height:410px;border-radius:13px 13px 0 0}.bf-scene-dock{grid-template-columns:minmax(0,1fr);padding:12px;gap:14px;border-radius:0 0 13px 13px}.bf-scene-dock .bf-pilot{grid-column:1;justify-self:center;width:230px;grid-template-columns:100px minmax(0,1fr)}.bfl .bf-scene-dock .bf-scene-bottom strong{font-size:19px}}

    .bf-scene-dock .bf-scene-bottom small{font-size:13px;line-height:1.5}.bf-scene-dock .bf-lens-caption .bf-eyebrow{font-size:12px;line-height:1.5}
    .bf-scene-dock .bf-pilot-label,.bf-scene-dock .bf-pilot-hint{font-size:12px;line-height:1.4}
    .bf-scene-dock .bf-pilot-altitude{width:100%}.bfl .bf-scene-dock .bf-pilot-altitude button{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-width:0;max-width:100%;min-height:44px;padding:7px 8px;font-size:13px;line-height:1.4}.bf-altitude-label{min-width:0;overflow-wrap:anywhere}.bf-pilot-altitude button>span[aria-hidden]{flex-shrink:0}
    .bf-scene-motion{display:inline-block;max-width:100%;margin-bottom:8px;padding:4px 8px;border:1px solid var(--bf-control-border);border-radius:6px;background:var(--bf-wash);color:var(--bf-ink);font-size:12px;line-height:1.5;font-weight:750}
    @media(forced-colors:active){.bf-scene-motion{background:Canvas;color:CanvasText;border-color:CanvasText}}
    @media(forced-colors:active){.bf-scene-dock{--bf-panel:Canvas;--bf-ink:CanvasText;--bf-muted:CanvasText;--bf-line:CanvasText;--bf-accent:LinkText}.bfl .bf-scene-dock .bf-lens-caption{border-left-color:CanvasText}}
`;

  // An optional, locally synthesized soundscape. Its clock belongs to Web Audio,
  // so it remains smooth when the scene is still or rendering at a lower rate.
  // Nothing is created until a learner explicitly enables sound.
  function createMeadowSound(onFailure,onState) {
    var Audio=window.AudioContext||window.webkitAudioContext,audio=new Audio();
    var nodes=[],sources=[],voices=new Set(),timer=0,suspendTimer=0,disposed=false,active=false,level=-1,nextBird=.65,resumePending=false,suspendPending=false,lastState='',stateChanged=null;
    function keep(node){nodes.push(node);return node;}
    function start(node,when){sources.push(node);node.start(when||0);return node;}
    function gain(value){var node=keep(audio.createGain());node.gain.value=value;return node;}
    function filter(type,frequency,q){var node=keep(audio.createBiquadFilter());node.type=type;node.frequency.value=frequency;node.Q.value=q;return node;}
    function modulation(param,rate,depth){var wave=keep(audio.createOscillator()),amount=gain(depth);wave.frequency.value=rate;wave.connect(amount);amount.connect(param);start(wave);}
    function smooth(param,value,seconds){var now=audio.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{var previous=param.value;param.cancelScheduledValues(now);param.setValueAtTime(previous,now);}param.linearRampToValueAtTime(value,now+seconds);}
    var master=null;
    try{
      master=gain(0);master.connect(audio.destination);
      // Independent stereo pink noise avoids a flat hiss. Broad, slow gusts and
      // a quieter high rustle layer give the grass a soft, irregular texture.
      var buffer=audio.createBuffer(2,Math.ceil(audio.sampleRate*13),audio.sampleRate);
      for(var channel=0;channel<2;channel++){
        var samples=buffer.getChannelData(channel),b0=0,b1=0,b2=0,seam=Math.ceil(audio.sampleRate*.22);
        for(var i=0;i<samples.length+seam;i++){
          var white=Math.random()*2-1;b0=.99765*b0+white*.099046;b1=.963*b1+white*.2965164;b2=.57*b2+white*1.0526913;var value=(b0+b1+b2+white*.1848)*.12;
          if(i<samples.length)samples[i]=value;
          // Continue the tail into the start, then crossfade back to the opening
          // texture. The loop boundary has neither a jump nor a silent dip.
          else{var offset=i-samples.length,blend=offset/seam*Math.PI/2;samples[offset]=value*Math.cos(blend)+samples[offset]*Math.sin(blend);}
        }
      }
      var noise=keep(audio.createBufferSource()),lowCut=filter('highpass',230,.6),grassTone=filter('lowpass',2100,.55),grass=gain(.17),rustleTone=filter('bandpass',3600,.55),rustle=gain(.027);
      noise.buffer=buffer;noise.loop=true;noise.connect(lowCut);lowCut.connect(grassTone);grassTone.connect(grass);grass.connect(master);
      lowCut.connect(rustleTone);rustleTone.connect(rustle);rustle.connect(master);
      modulation(grass.gain,.071,.066);modulation(grass.gain,.193,.026);modulation(grassTone.frequency,.047,670);
      modulation(rustle.gain,.127,.014);modulation(rustle.gain,.337,.006);start(noise);
      var birdTone=filter('lowpass',4200,.5),birdBus=gain(.85);birdTone.connect(birdBus);birdBus.connect(master);
      // A very quiet diffuse tail places the calls beyond the foreground grass.
      var tail=keep(audio.createConvolver()),tailGain=gain(.12),impulse=audio.createBuffer(2,Math.ceil(audio.sampleRate*.48),audio.sampleRate);
      for(var c=0;c<2;c++){var data=impulse.getChannelData(c);for(var n=0;n<data.length;n++){var t=n/audio.sampleRate;data[n]=t<.025?0:(Math.random()*2-1)*Math.pow(1-n/data.length,3)*.2;}}
      tail.buffer=impulse;birdTone.connect(tail);tail.connect(tailGain);tailGain.connect(master);
      function birds(at){
        var pan=keepVoice(audio.createStereoPanner?audio.createStereoPanner():audio.createGain()),count=2+Math.floor(Math.random()*3),base=2100+Math.random()*850,motif=Math.random(),offset=0,remaining=count;
        if(pan.pan)pan.pan.value=(Math.random()*2-1)*.75;pan.connect(birdTone);
        function keepVoice(node){voices.add(node);return node;}
        for(var j=0;j<count;j++){
          var tone=keepVoice(audio.createOscillator()),envelope=keepVoice(audio.createGain()),duration=.13+Math.random()*.16,when=at+offset,curve=new Float32Array(24),pitch=base*(1+j*.035),loudness=(.045+Math.random()*.025)*(1-j*.09);
          for(var k=0;k<curve.length;k++){var u=k/(curve.length-1);curve[k]=pitch*(1+(motif>.5?.18:-.12)*Math.sin(u*Math.PI)-u*.11+.012*Math.sin(u*Math.PI*8));}
          tone.type='sine';tone.frequency.setValueCurveAtTime(curve,when,duration);
          envelope.gain.setValueAtTime(0,when);envelope.gain.linearRampToValueAtTime(loudness,when+.025);envelope.gain.exponentialRampToValueAtTime(.0001,when+duration);envelope.gain.linearRampToValueAtTime(0,when+duration+.025);
          tone.connect(envelope);envelope.connect(pan);tone.start(when);tone.stop(when+duration+.04);
          (function(osc,amp){osc.onended=function(){osc.disconnect();amp.disconnect();voices.delete(osc);voices.delete(amp);if(--remaining===0){pan.disconnect();voices.delete(pan);}};})(tone,envelope);
          offset+=duration+.08+Math.random()*.12;
        }
      }
      function tick(){if(!active||disposed||audio.state!=='running')return;if(audio.currentTime+.15>=nextBird){birds(audio.currentTime+.08);nextBird=audio.currentTime+4.5+Math.random()*6;}}
      function fail(){if(disposed)return;dispose();if(onFailure)onFailure();}
      function report(){
        if(disposed)return;var state=!active?'silent':audio.state==='running'?'running':(resumePending||suspendPending)?'starting':'waiting';
        if(state===lastState)return;lastState=state;if(onState)onState(state);
      }
      // Share a pending resume across volume changes and quick mute/unmute actions.
      function resumeAudio(){
        if(disposed||!active)return;if(audio.state==='closed'){fail();return;}
        if(audio.state==='running'||resumePending){report();return;}
        resumePending=true;report();
        try{audio.resume().then(function(){
          resumePending=false;if(disposed)return;
          if(!active){clearTimeout(suspendTimer);suspendTimer=setTimeout(suspend,160);}report();
        },function(){resumePending=false;fail();});}catch(_){resumePending=false;fail();}
      }
      function set(wanted,volume){
        if(disposed)return;if(audio.state==='closed'){fail();return;}
        var nextLevel=clamp(Number(volume)||0,0,1)*.75,wants=!!wanted&&nextLevel>0,changed=wants!==active;active=wants;
        if(level!==nextLevel||changed){level=nextLevel;smooth(master.gain,active?level:0,active?.55:.12);}
        clearTimeout(suspendTimer);suspendTimer=0;
        if(active){
          if(!timer)timer=setInterval(tick,350);resumeAudio();tick();
        }else{
          clearInterval(timer);timer=0;
          if(audio.state==='running'&&!suspendPending)suspendTimer=setTimeout(suspend,160);
        }
        report();
      }
      function suspend(){
        suspendTimer=0;if(disposed||active||audio.state!=='running'||suspendPending)return;
        suspendPending=true;
        try{audio.suspend().then(function(){
          suspendPending=false;if(disposed)return;if(active)resumeAudio();else report();
        },function(){suspendPending=false;fail();});}catch(_){suspendPending=false;fail();}
      }
      function dispose(){
        if(disposed)return;disposed=true;active=false;clearInterval(timer);clearTimeout(suspendTimer);if(stateChanged)audio.removeEventListener('statechange',stateChanged);master.gain.cancelScheduledValues(audio.currentTime);master.gain.setValueAtTime(0,audio.currentTime);
        voices.forEach(function(node){node.onended=null;try{if(node.stop)node.stop();}catch(_){}node.disconnect();});voices.clear();
        sources.forEach(function(node){try{node.stop();}catch(_){}});nodes.forEach(function(node){node.disconnect();});
        if(audio.state!=='closed')audio.close().catch(function(){});
      }
      stateChanged=function(){if(disposed)return;if(audio.state==='closed'){fail();return;}report();};
      audio.addEventListener('statechange',stateChanged);
      return {set:set,dispose:dispose};
    }catch(error){
      disposed=true;if(stateChanged)audio.removeEventListener('statechange',stateChanged);
      sources.forEach(function(node){try{node.stop();}catch(_){}});nodes.forEach(function(node){node.disconnect();});if(audio.state!=='closed')audio.close().catch(function(){});throw error;
    }
  }

  function ButterflyLab(props) {
    var ctx=props.ctx,R=ctx.React,h=R.createElement;
    // This tool had NO translator: every accessible name shipped English in
    // all 63 packs, and for the flight canvas the aria-label is the only
    // description a screen-reader user gets. ctx.t is the host contract every
    // other STEM tool uses; honour its 2-arg fallback form.
    bfHostT=typeof ctx.t==='function'?function(k,fb){return ctx.t(k,fb);}:null;
    var stateRef=R.useRef(null);if(!stateRef.current)stateRef.current=freshState((ctx.toolData||{}).butterfly);
    var s=stateRef.current,api=R.useRef(null),stage=R.useRef(null),map=R.useRef(null),keys=R.useRef({});
    var flightPad=R.useRef({node:null,pointer:null,cx:0,cy:0,radius:1});
    var holdBlockedClicks=R.useRef(new WeakSet());
    // Ambient motion is presentation only: it never spends flight energy or
    // advances the learner's saved flight clock, visits, or observations.
    var sceneMotion=R.useRef({clock:0,paused:false,reset:false});
    var meadowSound=R.useRef({engine:null,enabled:false,muted:true,volume:35,error:false,playback:'silent'});
    R.useEffect(function(){return function(){var sound=meadowSound.current;if(sound.engine){sound.engine.dispose();sound.engine=null;}};},[]);
    var pair=R.useState(0),refresh=pair[1];
    var statusPair=R.useState(__alloT('stem.butterfly.ui_status_intro','Take flight, or choose a habitat for guided travel. Land and examine each patch to build your field journal.')),message=statusPair[0],setMessage=statusPair[1];
    var statusRevision=R.useRef(0),speechRequest=R.useRef(0);
    var speechFeedbackPair=R.useState(null),speechFeedback=speechFeedbackPair[0],setSpeechFeedback=speechFeedbackPair[1];
    var rendererPair=R.useState('loading'),renderer=rendererPair[0],setRenderer=rendererPair[1];
    var mapPair=R.useState(false),mapMode=mapPair[0],setMapMode=mapPair[1],mapModeRef=R.useRef(false);mapModeRef.current=mapMode;
    var viewPair=R.useState('follow'),view=viewPair[0],setView=viewPair[1],viewRef=R.useRef(view);viewRef.current=view;
    var watchPair=R.useState('bergamot'),watchPatch=watchPair[0],setWatchPatch=watchPair[1],watchPatchRef=R.useRef(watchPatch);watchPatchRef.current=watchPatch;
    var speciesPair=R.useState('auto'),watchSpecies=speciesPair[0],setWatchSpecies=speciesPair[1],watchSpeciesRef=R.useRef(watchSpecies);watchSpeciesRef.current=watchSpecies;
    var lightPair=R.useState('daylight'),light=lightPair[0],setLight=lightPair[1],lightRef=R.useRef(light);lightRef.current=light;
    var visitorReadout=R.useRef(null),watchCaption=R.useRef(null);
    // A paused or reduced-motion scene needs one draw after the watch captions mount.
    R.useEffect(function(){if(view==='pollinators'&&api.current)api.current.draw();},[view,watchPatch,watchSpecies]);
    var lensPair=R.useState(null),lens=lensPair[0],setLens=lensPair[1],lensRef=R.useRef(lens);lensRef.current=lens;
    var lifePair=R.useState(false),lifeWatch=lifePair[0],setLifeWatch=lifePair[1],lifeRef=R.useRef(false);lifeRef.current=lifeWatch;
    var lifeMotion=R.useRef({progress:1,playing:false,signature:'',focus:'context',speed:1});
    var feedPair=R.useState(false),feedWatch=feedPair[0],setFeedWatch=feedPair[1],feedRef=R.useRef(false);feedRef.current=feedWatch;
    var feedMotion=R.useRef({phase:'sip',progress:1,playing:false,signature:'',contact:true,focus:'whole',speed:1}),feedLabels=R.useRef({});
    var feedLabelRefs=R.useMemo(function(){var callbacks={};['tube','pollen','surface'].forEach(function(id){callbacks[id]=function(node){feedLabels.current[id]=node;if(node&&api.current)api.current.draw();};});return callbacks;},[]);
    var miniRef=R.useRef(null),placeLabels=R.useRef({});
    var citationTarget=R.useRef(null),citationFocus=R.useRef(false);
    // The cleanup button disappears; continue at the named evidence group after commit.
    R.useEffect(function(){if(!citationFocus.current)return;citationFocus.current=false;var node=citationTarget.current;if(node){node.focus({preventScroll:true});node.scrollIntoView({block:'nearest',behavior:'instant'});}});
    var lifeActionFocus=R.useRef(null);
    // A keyboard or assistive-technology activation can disable its own button.
    // Move only that explicit action, and only after its replacement is committed.
    R.useEffect(function(){var pending=lifeActionFocus.current;if(!pending)return;lifeActionFocus.current=null;var scope=pending.scope;if(!scope||!scope.isConnected||pending.action==='next'&&!pending.trigger.disabled)return;var target=pending.action==='next'?scope.querySelector('[data-bf-record-generation]'):pending.action==='restart'?scope.querySelector('#bf-egg-site'):scope;if(target&&!target.disabled){target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',behavior:'instant'});}});
    function lifecycleActionTarget(event){return event&&event.detail===0&&event.currentTarget===document.activeElement?event.currentTarget.closest('.bf-life-watch,.bf-cycle'):null;}
    var sceneActionFocus=R.useRef(null);
    // Focus carries the destination's committed accessible name and description.
    R.useEffect(function(){
      var pending=sceneActionFocus.current;if(!pending)return;sceneActionFocus.current=null;
      var node=stage.current,active=document.activeElement;
      if(!node||!node.isConnected||document.hidden||!document.hasFocus())return;
      if(active!==pending.origin&&active!==document.body&&active!==document.documentElement&&active!==node)return;
      node.focus({preventScroll:true});if(pending.block)node.scrollIntoView({block:pending.block,behavior:'instant'});
    });
    R.useEffect(function(){
      function cancel(event){var pending=sceneActionFocus.current;if(pending&&(event.type!=='focusin'||event.target!==pending.origin&&event.target!==document.body&&event.target!==document.documentElement))sceneActionFocus.current=null;}
      function hidden(){if(document.hidden)sceneActionFocus.current=null;}
      document.addEventListener('focusin',cancel);document.addEventListener('pointerdown',cancel,true);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);
      return function(){sceneActionFocus.current=null;document.removeEventListener('focusin',cancel);document.removeEventListener('pointerdown',cancel,true);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);};
    },[]);
    function queueSceneFocus(block){sceneActionFocus.current={origin:document.activeElement,block:block===undefined?'nearest':block};}
    var workflowFocus=R.useRef(null);
    R.useEffect(function(){var pending=workflowFocus.current;if(!pending)return;workflowFocus.current=null;var target=pending.target,active=document.activeElement;if(target&&target.isConnected&&(active===pending.trigger||active===document.body)){target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',behavior:'instant'});}});
    function queueWorkflowFocus(event,scopeSelector,targetSelector){var trigger=event&&event.detail===0&&event.currentTarget===document.activeElement&&event.currentTarget.tagName==='BUTTON'?event.currentTarget:null,scope=trigger&&trigger.closest(scopeSelector),target=scope&&scope.querySelector(targetSelector);if(target)workflowFocus.current={trigger:trigger,target:target};}
    var caseNodes=R.useRef({}),caseFocus=R.useRef(null);
    // Follow the result or renewed question when a case replaces its controls.
    R.useEffect(function(){
      var pending=caseFocus.current;if(!pending)return;
      var card=caseNodes.current[pending.id],target=card&&card.querySelector(pending.result?'.bf-case-result':'select');
      caseFocus.current=null;if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',behavior:'instant'});}
    });
    // Simpler words starts on for grade 4 and below, and remembers a learner's
    // own choice on this device. Not 5: the host passes "5th Grade" when no grade
    // was set, so 5 cannot tell a real fifth grader from an unset class.
    var plainPair=R.useState(function(){
      try{var saved=window.localStorage&&window.localStorage.getItem('alloflow.butterfly.simpler');if(saved==='1'||saved==='0')return saved==='1';}catch(_){}
      var grade=String(ctx.gradeLevel||''),n=parseInt(grade.replace(/[^0-9]/g,''),10);
      return /kinder|\bK\b|pre-?k/i.test(grade)||(Number.isFinite(n)&&n<=4);
    }),simpler=plainPair[0],setSimpler=plainPair[1];
    bfPlain=simpler;
    function toggleSimpler(){var next=!simpler;try{window.localStorage.setItem('alloflow.butterfly.simpler',next?'1':'0');}catch(_){}bfPlain=next;setSimpler(next);announce(next?__alloT('stem.butterfly.ui_simpler_words_on','Simpler words on.'):__alloT('stem.butterfly.ui_simpler_words_off','Simpler words off.'));}
    var caseDraftPair=R.useState({}),caseDraft=caseDraftPair[0],setCaseDraft=caseDraftPair[1];
    var answerPair=R.useState(''),answer=answerPair[0],setAnswer=answerPair[1];
    var claimPair=R.useState(s.notebook.claim),pickedClaim=claimPair[0],setPickedClaim=claimPair[1];
    var sections=R.useRef({});
    var retryPair=R.useState(0),retry=retryPair[0],setRetry=retryPair[1];
    var planPair=R.useState(s.restoration.design),plan=planPair[0],setPlan=planPair[1];
    var guessPair=R.useState(s.restoration.prediction||''),guess=guessPair[0],setGuess=guessPair[1];
    var feedbackPair=R.useState(''),designFeedback=feedbackPair[0],setDesignFeedback=feedbackPair[1];
    var sitePair=R.useState(s.lifecycle.patch||''),eggSite=sitePair[0],setEggSite=sitePair[1];
    var broodPair=R.useState(s.lifecycle.prediction||''),broodGuess=broodPair[0],setBroodGuess=broodPair[1];
    var cyclePair=R.useState(''),cycleFeedback=cyclePair[0],setCycleFeedback=cyclePair[1];
    var seasonSitePair=R.useState(''),seasonSite=seasonSitePair[0],setSeasonSite=seasonSitePair[1];
    var mowPair=R.useState(s.season.mowing),mowPlan=mowPair[0],setMowPlan=mowPair[1];
    var seasonGuessPair=R.useState(s.season.prediction||''),seasonGuess=seasonGuessPair[0],setSeasonGuess=seasonGuessPair[1];
    var seasonFeedbackPair=R.useState(''),seasonFeedback=seasonFeedbackPair[0],setSeasonFeedback=seasonFeedbackPair[1];
    var copyPair=R.useState(''),copyState=copyPair[0],setCopyState=copyPair[1];
    var copyPendingPair=R.useState(false),copyPending=copyPendingPair[0],setCopyPending=copyPendingPair[1],copyJob=R.useRef({pending:false});
    // Once offered, keep the manual-copy field mounted while its feedback changes.
    var manualCopyPair=R.useState(false),manualCopy=manualCopyPair[0],setManualCopy=manualCopyPair[1];
    function choosePlan(id){
      if(id===plan)return;var hadPrediction=!!guess;setPlan(id);setGuess('');
      var message=__alloFill(hadPrediction?__alloT('stem.butterfly.ui_plan_prediction_cleared','Planting plan selected: {value1}. Previous prediction cleared. Choose a prediction for this plan before applying it.'):__alloT('stem.butterfly.ui_plan_selected','Planting plan selected: {value1}. Choose a prediction for this plan before applying it.'),{value1:design(id).name});setDesignFeedback(message);announce(message);
    }
    function applyDesign(){var result=applyPlan(s,plan,guess);if(result.ok){closeFeed();closeLens();lifeMotion.current.playing=false;if(!lifecycleVisual(s))closeLife();clearFlightInput();persist();setCycleFeedback('');}setDesignFeedback(result.message);announce(result.message);}
    function startBrood(){var result=layEggs(s,eggSite,broodGuess);if(result.ok){persist();showLife(true,true);}setCycleFeedback(result.message);announce(result.message);}
    function nextStage(event){var origin=lifecycleActionTarget(event),result=advanceStage(s);if(result.ok){if(origin)lifeActionFocus.current={scope:origin,trigger:event.currentTarget,action:'next'};persist();showLife(true,false);}setCycleFeedback(result.message);announce(result.message);}
    function recordBrood(event){var origin=lifecycleActionTarget(event),result=broodResult(s);if(result.ok){if(origin)lifeActionFocus.current={scope:origin,action:'record'};lifeMotion.current.playing=false;lifeMotion.current.progress=1;persist();setBroodGuess('');}setCycleFeedback(result.message);announce(result.message);}
    function dropBrood(event){var origin=lifecycleActionTarget(event),result=abandonBrood(s);if(result.ok){if(origin)lifeActionFocus.current={scope:origin,action:'restart'};lifeMotion.current.playing=false;lifeMotion.current.progress=1;if(!lifecycleVisual(s))closeLife();persist();setBroodGuess('');setEggSite('');}setCycleFeedback(result.message);announce(result.message);}
    function reportCopyFeedback(state){
      if(state==='pending')return __alloT('stem.butterfly.ui_report_copy_pending','Copying your field report. You can keep working.');
      if(state==='changed')return __alloT('stem.butterfly.ui_report_copy_changed','An earlier version of your report was copied. Your latest changes are not included.');
      if(state==='partial')return __alloT('stem.butterfly.ui_report_copy_partial','Selected report text copied. Select all of the report to copy it completely.');
      if(state==='select')return __alloT('stem.butterfly.ui_report_copy_select','Select the report text you want to copy.');
      if(state==='ok')return __alloT('stem.butterfly.ui_report_copied','Field report copied. Paste it wherever you keep your notes.');
      if(state==='fail')return __alloT('stem.butterfly.ui_report_copy_blocked','Copying was blocked here. The report is shown below so you can select and copy it.');
      return '';
    }
    // Browser textareas normalize line endings in restored notes.
    function isCurrentReport(text){return text.replace(/\r\n?/g,'\n')===fieldReport(s).replace(/\r\n?/g,'\n');}
    function copyIsActive(){return !!(stage.current&&stage.current.isConnected);}
    function copyReport(){
      var job=copyJob.current;if(job.pending||!copyIsActive()||reportIsEmpty(s))return;
      var text=fieldReport(s);job.pending=true;setCopyPending(true);setCopyState('');announce(reportCopyFeedback('pending'));
      copyReportText(text,copyIsActive).then(function(ok){
        job.pending=false;if(!copyIsActive())return;
        var result=ok?(isCurrentReport(text)?'ok':'changed'):'fail';
        setCopyPending(false);setCopyState(result);if(!ok)setManualCopy(true);announce(reportCopyFeedback(result));
      });
    }
    function manualReportCopied(event){
      var node=event.currentTarget,length=node.selectionEnd-node.selectionStart;
      if(!length){event.preventDefault();setCopyState('select');announce(reportCopyFeedback('select'));return;}
      var result=length===node.value.length?(isCurrentReport(node.value)?'ok':'changed'):'partial';
      setCopyState(result);announce(reportCopyFeedback(result));
    }
    function draftCase(id,key,value){var next=Object.assign({},caseDraft),row=Object.assign({},next[id]);row[key]=value;next[id]=row;setCaseDraft(next);}
    function submitCase(id){var d=caseDraft[id]||{},result=checkCase(s,id,d.stop,d.reason);if(result.ok){caseFocus.current={id:id,result:true};persist();}announce(result.message);}
    function retryCase(id){caseFocus.current={id:id,result:false};s.cases=cleanCases(s.cases);delete s.cases.answers[id];var next=Object.assign({},caseDraft);delete next[id];setCaseDraft(next);persist();announce(__alloT('stem.butterfly.ui_case_cleared','Case cleared. Make a new prediction.'));}
    var canSpeak=typeof ctx.callTTS==='function'||!!(typeof window!=='undefined'&&window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==='function');
    function speak(text,what){
      if(!text)return;
      var retryingMessage=speechFeedback&&speechFeedback.what===what&&text===speechFeedback.message;
      if(retryingMessage)text=speechFeedback.text;
      var request=++speechRequest.current,reported=false;
      if(speechFeedback&&message===speechFeedback.message)setMessage(retryingMessage?text:'');setSpeechFeedback(null);
      // A replaced or detached request must not interrupt the learner with old feedback.
      function failed(error){
        if(reported||request!==speechRequest.current||!stage.current||!stage.current.isConnected||error&&(error.error==='canceled'||error.error==='interrupted'))return;
        reported=true;var note=__alloFill(__alloT('stem.butterfly.ui_listen_failed','Could not read {value1} aloud. Try Listen again, or read the text on the page.'),{value1:what});
        setSpeechFeedback({what:what,message:note,text:text});announce(note);
      }
      try{
        if(typeof ctx.callTTS==='function'){
          Promise.resolve(ctx.callTTS(text,null,null,{force:true})).then(function(result){if(result===null||result===false)failed();},failed);return;
        }
        if(window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==='function'){
          window.speechSynthesis.cancel();var u=new window.SpeechSynthesisUtterance(text);u.rate=.95;u.onerror=failed;window.speechSynthesis.speak(u);
        }else failed();
      }catch(error){failed(error);}
    }
    function listen(text,what){
      if(!canSpeak)return null;var feedback=speechFeedback&&speechFeedback.what===what?speechFeedback.message:'';
      return h('div',{className:'bf-listen-control'},button(h(R.Fragment,null,h('span',{'aria-hidden':true},'🔊 '),__alloT('stem.butterfly.ui_listen','Listen'),h('span',{className:'bf-sr'},__alloFill(__alloT('stem.butterfly.ui_listen_sr_suffix',' · {value1}'),{value1:what}))),function(){speak(typeof text==='function'?text():text,what);},{className:'bf-listen','aria-description':feedback||undefined}),feedback?h('p',{className:'bf-listen-feedback'},feedback):null);
    }
    function missionIntro(){return plain(__alloT('stem.butterfly.ui_mission_intro','The plot beside the path is mown grass today. Find out what monarchs need at every stage of life, then decide what to plant there and when to mow it. Back your plan with your own records.'),__alloT('stem.butterfly.ui_mission_intro_simple','The plot by the path is short, mown grass. Find out what monarchs need. Then choose what to plant there and when to mow it. Use your own records to show your plan works.'));}
    function startSeason(event){
      s.season.mowing=mowPlan;s.season.prediction=seasonGuess||null;
      var result=runSeason(s,seasonSite,mowPlan,seasonGuess);
      if(result.ok){queueWorkflowFocus(event,'.bf-season','.bf-weeks');persist();setSeasonGuess('');}
      setSeasonFeedback(result.message);announce(result.message);
    }

    // Captured flight pad: analog input shares the keyboard simulation.
    function resetPointerSteering(){
      var pad=flightPad.current,node=pad.node,pointer=pad.pointer;pad.pointer=null;
      delete keys.current.turn;delete keys.current.thrust;delete keys.current.brake;delete keys.current.lift;
      if(node){
        node.style.setProperty('--bf-stick-x','0px');node.style.setProperty('--bf-stick-y','0px');node.dataset.active='false';
        try{if(pointer!==null&&node.hasPointerCapture(pointer))node.releasePointerCapture(pointer);}catch(_){}
      }
    }
    function clearFlightInput(){resetPointerSteering();keys.current={};}
    function padCanFly(){return s.controlMode==='steer'&&!s.paused&&!s.landed&&!sceneMotion.current.paused&&!document.hidden&&!lifeRef.current&&!feedRef.current&&!lensRef.current&&viewRef.current!=='pollinators';}
    function moveFlightPad(event){
      var pad=flightPad.current;if(pad.pointer!==event.pointerId)return;
      if(!padCanFly()){resetPointerSteering();return;}
      event.preventDefault();var dx=event.clientX-pad.cx,dy=event.clientY-pad.cy,control=steeringPad(dx,dy,pad.radius),distance=Math.hypot(dx,dy),scale=Math.min(1,pad.radius/Math.max(.001,distance));
      keys.current.turn=control.turn;keys.current.thrust=control.thrust;keys.current.brake=control.brake;
      if(pad.node){pad.node.style.setProperty('--bf-stick-x',(dx*scale).toFixed(1)+'px');pad.node.style.setProperty('--bf-stick-y',(dy*scale).toFixed(1)+'px');}
    }
    function startFlightPad(event){
      var pad=flightPad.current;if(!padCanFly()||event.button!==0||pad.pointer!==null)return;
      event.preventDefault();if(stage.current)stage.current.focus({preventScroll:true});
      var node=event.currentTarget,box=node.getBoundingClientRect();
      try{node.setPointerCapture(event.pointerId);}catch(_){return;}
      pad.pointer=event.pointerId;pad.cx=box.left+box.width*.5;pad.cy=box.top+box.height*.5;pad.radius=Math.min(box.width,box.height)*.32;
      node.dataset.active='true';moveFlightPad(event);
    }
    function endFlightPad(event){if(flightPad.current.pointer===event.pointerId)resetPointerSteering();}
    function cancelFlightPad(event){if(flightPad.current.pointer!==event.pointerId)return;clearFlightInput();if(!sceneMotion.current.paused)stopFlight(s);}
    // Leave browser, assistive-technology and composition shortcuts to their owner.
    function flightShortcut(event){var native=event.nativeEvent||event;return !event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!native.isComposing&&native.keyCode!==229;}
    function focusMeadow(){if(!stage.current)return;stage.current.focus({preventScroll:true});stage.current.scrollIntoView({block:'nearest',behavior:'instant'});}
    function isFlightControl(element){var owner=stage.current&&stage.current.closest('.bfl');return !!(element&&owner&&owner.contains(element)&&element.matches('.bf-flight-pad,.bf-pilot-altitude button,.bf-touch button,button[data-bf-glide]'));}
    function keyFlightPad(event){
      var directions={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyE:'rise',KeyQ:'lower'},key=directions[event.code];
      if(event.type==='keyup'){if(key)delete keys.current[key];return;}
      if(!flightShortcut(event))return;
      if(key){event.preventDefault();event.stopPropagation();if(padCanFly())keys.current[key]=true;}
      else if(event.code==='Space'&&!event.repeat){event.preventDefault();event.stopPropagation();if(event.type==='keydown'){toggleSceneMotion();queueSceneFocus(null);}}
      else if(event.code==='KeyG'&&event.type==='keydown'&&!event.repeat){event.preventDefault();event.stopPropagation();toggleGlide();}
    }
    function update(){refresh(function(n){return n+1;});if(api.current)api.current.draw();}
    function announce(text){statusRevision.current++;setMessage(text);update();}
    function syncMeadowSound(){var sound=meadowSound.current;if(sound.engine)sound.engine.set(sound.enabled&&!sound.muted&&!sceneMotion.current.paused&&!document.hidden,sound.volume/100);}
    function toggleMeadowSound(){
      var sound=meadowSound.current;
      if(!sound.engine){
        var engine;
        try{engine=createMeadowSound(function(){
          if(sound.engine!==engine||!stage.current||!stage.current.isConnected)return;
          sound.engine=null;sound.error=true;sound.muted=true;sound.playback='silent';update();
        },function(playback){
          if(sound.engine!==engine||!stage.current||!stage.current.isConnected||sound.playback===playback)return;
          sound.playback=playback;update();
        });sound.engine=engine;sound.enabled=true;sound.muted=false;sound.error=false;}
        catch(_){sound.error=true;sound.muted=true;sound.playback='silent';update();return;}
      }else sound.muted=!sound.muted;
      syncMeadowSound();update();
    }
    function changeMeadowVolume(event){meadowSound.current.volume=clamp(Number(event.target.value)||0,0,100);syncMeadowSound();update();}
    function chooseView(id){
      resetPointerSteering();closeFeed();closeLife();closeLens();viewRef.current=id;setView(id);
      if(id==='pollinators'){s.paused=true;s.target=null;stopFlight(s);clearFlightInput();announce(__alloT('stem.butterfly.watch_opened','Watching a meadow visitor. Your butterfly stays where you left it. Pause all motion freezes the view and the meadow together.'));}else update();
    }
    // Resolve the same visitor as the scene: choosing a species can also change its flower patch.
    function announceWatchedVisitor(){
      var patches=habitats(s).filter(function(p){return p.nectar;}),index=watchedVisitorIndex(patches,watchPatchRef.current,watchSpeciesRef.current),species=meadowSpecies(VISITOR_SPECIES[index]),site=visitorPatch(patches,index);
      if(site)announce(__alloFill(__alloT('stem.butterfly.ui_watch_selected','Watching {value1} at {value2}.'),{value1:species.name,value2:site.name}));else update();
    }
    function chooseWatchPatch(id){watchSpeciesRef.current='auto';setWatchSpecies('auto');watchPatchRef.current=id;setWatchPatch(id);announceWatchedVisitor();}
    function chooseWatchSpecies(id){watchSpeciesRef.current=id;setWatchSpecies(id);announceWatchedVisitor();}
    function chooseLight(id){lightRef.current=id;setLight(id);update();}
    function chooseFlightControls(id){s.controlMode=id;clearFlightInput();s.target=null;stopFlight(s);announce(id==='steer'?__alloT('stem.butterfly.controls_direct_on','Butterfly steering: turn with A / D or left / right. Hold W or up to fly forward; S or down brakes. E / Q change height.'):__alloT('stem.butterfly.controls_map_on','Map directions: W A S D or arrows move north, west, south, and east. E / Q change height.'));}
    function leavePollinatorView(){if(viewRef.current==='pollinators'){viewRef.current='follow';setView('follow');}}
    function resumeMotion(){sceneMotion.current.paused=false;sceneMotion.current.reset=true;syncMeadowSound();}
    function toggleSceneMotion(){
      sceneMotion.current.paused=!sceneMotion.current.paused;sceneMotion.current.reset=true;clearFlightInput();
      syncMeadowSound();
      announce(sceneMotion.current.paused?__alloT('stem.butterfly.ui_all_motion_paused','All motion paused. Explore the controls and your journal, then resume when you are ready.'):__alloT('stem.butterfly.ui_all_motion_resumed','Motion resumed. The meadow moves on its own; flight stays under your control.'));
    }
    function persist(){setCopyState('');if(ctx.updateMulti)ctx.updateMulti('butterfly',save(s));else if(ctx.setToolData)ctx.setToolData(function(prev){return Object.assign({},prev,{butterfly:save(s)});});}
    function writeNotebook(changes){s.notebook=cleanNotebook(Object.assign({},s.notebook,changes));if(Object.prototype.hasOwnProperty.call(changes,'claim'))setPickedClaim(s.notebook.claim);persist();update();}
    function jumpTo(id){var node=id==='explore'?stage.current:sections.current[id];if(!node)return;feedMotion.current.playing=false;s.paused=true;s.target=null;stopFlight(s);lifeMotion.current.playing=false;clearFlightInput();update();if(id==='explore')queueSceneFocus('start');else{node.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:'auto'});}}
    function closeLens(){lensRef.current=null;setLens(null);}
    function closeFeed(){feedRef.current=false;setFeedWatch(false);feedMotion.current.playing=false;}
    function showFeed(phase,focusScene,restart){leavePollinatorView();
      var visual=feedingVisual(s);if(!visual)return;var previous=feedMotion.current,reset=focusScene||!feedRef.current||restart;
      if(restart)resumeMotion();
      closeLife();closeLens();s.paused=true;s.target=null;stopFlight(s);clearFlightInput();feedRef.current=true;setFeedWatch(true);
      var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      feedMotion.current={phase:feedingPhase(phase).id,progress:reduced?1:0,playing:!reduced,signature:visual.patch+':'+(visual.plan||''),contact:reset?true:previous.contact,focus:reset?'whole':previous.focus,speed:reset?1:previous.speed};
      announce(__alloFill(__alloT('stem.butterfly.ui_feed_opened','{value1}. Read the observation and controls below the scene.'),{value1:feedingPhase(phase,feedMotion.current.contact).title}));
      if(focusScene)queueSceneFocus('center');
    }
    function stillFeed(){var motion=feedMotion.current;motion.progress=1;motion.playing=false;announce(feedingOutcome(feedingVisual(s),motion.phase,1,motion.contact).summary);}
    function pauseFeed(){feedMotion.current.playing=false;update();}
    function seekFeed(event){feedMotion.current.progress=clamp(Number(event.target.value)/100,0,1);feedMotion.current.playing=false;update();}
    function continueFeed(){if(!feedRef.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches||feedMotion.current.progress>=1)return;resumeMotion();feedMotion.current.playing=true;update();}
    function focusFeed(focus){feedMotion.current.focus=focus;update();}
    function contactFeed(contact){feedMotion.current.contact=contact;feedMotion.current.playing=false;announce(contact?__alloT('stem.butterfly.ui_feed_contact_on','The receptive surface is in the pollen path. Inspect the transfer.'):__alloT('stem.butterfly.ui_feed_contact_off','The receptive surface is outside the pollen path. The butterfly can still feed.'));}
    function speedFeed(event){var speed=Number(event.target.value);if([.5,1,2].indexOf(speed)<0)return;feedMotion.current.speed=speed;update();}
    function recordFeed(event){
      var visual=feedingVisual(s),motion=feedMotion.current;
      if(!feedRef.current||!visual||motion.signature!==visual.patch+':'+(visual.plan||'')){announce(__alloT('stem.butterfly.ui_feed_open_visit_first','Open a flower visit at this patch before recording it.'));return;}
      var result=recordPollination(s,motion.phase,motion.progress,motion.contact);
      if(result.ok){queueWorkflowFocus(event,'.bf-feed-watch','.bf-feed-contact');persist();}announce(result.message);
    }
    function explainPollination(){writeNotebook({claim:'feeding-always-pollinates'});jumpTo('notebook');}
    function closeLife(){lifeRef.current=false;setLifeWatch(false);lifeMotion.current.playing=false;lifeMotion.current.progress=1;}
    function showLife(animate,focusScene){leavePollinatorView();
      var visual=lifecycleVisual(s);if(!visual)return;var previous=lifeMotion.current,key=visual.patch+':'+(visual.plan||'')+':'+visual.stage+':'+visual.recorded,reset=focusScene||!lifeRef.current||previous.signature!==key;closeFeed();
      s.paused=true;s.target=null;stopFlight(s);clearFlightInput();closeLens();lifeRef.current=true;setLifeWatch(true);
      var focus=reset?'context':previous.focus,moving=animate&&!visual.blocked&&(visual.stage==='caterpillar'||visual.stage==='adult'||visual.stage==='chrysalis'&&focus==='maturation')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lifeMotion.current={progress:moving?0:1,playing:moving,signature:key,focus:focus,speed:reset?1:previous.speed};update();
      if(focusScene)queueSceneFocus('center');
    }
    function replayLife(){if(lifecycleVisual(s)){resumeMotion();showLife(true,false);}}
    function pauseLife(){lifeMotion.current.playing=false;update();}
    function seekLife(event){var progress=Number(event.target.value);lifeMotion.current.progress=clamp(Number.isFinite(progress)?progress/100:1,0,1);lifeMotion.current.playing=false;update();}
    // Explicit comparison choices describe their result once; playback and scrubbing stay quiet.
    function larvalTissueLabel(meal){return meal.completedBites>0||meal.notches.some(function(n){return n.radius>0;})?__alloT('stem.butterfly.lw_meal_marks','Feeding marks at the edge'):__alloT('stem.butterfly.lw_meal_unbitten','Unbitten leaf edge');}
    function larvalObservationNote(meal){return meal.phase==='complete'?__alloT('stem.butterfly.lw_meal_complete','The sample feeding sequence is complete. Compare the scalloped edge with the unbitten leaf.'):meal.phase==='bite'?__alloT('stem.butterfly.lw_meal_bite','The mouthparts meet the leaf edge. Watch the missing tissue grow as the bite closes.'):__alloT('stem.butterfly.lw_meal_follow','Follow the mouthparts along the margin. The feeding marks stay where leaf tissue was removed.');}
    function showLifeMoment(progress){
      var motion=lifeMotion.current,visual=lifecycleVisual(s);motion.progress=progress;motion.playing=false;
      var meal=larvalFeeding(visual,progress),maturity=chrysalisMaturation(visual,progress);
      if(motion.focus==='feeding'&&meal.active)announce(larvalTissueLabel(meal)+'. '+larvalObservationNote(meal));
      else if(motion.focus==='maturation'&&maturity.active)announce(maturity.label+'. '+maturity.note);
      else update();
    }
    function stillLife(){showLifeMoment(1);}
    function continueLife(){var visual=lifecycleVisual(s);if(!lifeRef.current||!visual||visual.blocked||(['caterpillar','adult'].indexOf(visual.stage)<0&&!(visual.stage==='chrysalis'&&lifeMotion.current.focus==='maturation'))||window.matchMedia('(prefers-reduced-motion: reduce)').matches||lifeMotion.current.progress>=1)return;resumeMotion();lifeMotion.current.playing=true;update();}
    function focusLife(focus){if(['context','specimen','detail','feeding','maturation'].indexOf(focus)<0)return;var visual=lifecycleVisual(s);if(focus==='feeding'&&!larvalFeeding(visual,lifeMotion.current.progress).active||focus==='maturation'&&!chrysalisMaturation(visual,lifeMotion.current.progress).active)return;if(visual&&visual.stage==='chrysalis'&&focus!=='maturation')lifeMotion.current.playing=false;lifeMotion.current.focus=focus;update();}
    function speedLife(event){var speed=Number(event.target.value);if([.5,1,2].indexOf(speed)<0)return;lifeMotion.current.speed=speed;update();}
    function chooseLens(kind){leavePollinatorView();
      closeFeed();closeLife();
      var detail=fieldDetail(s,kind);lensRef.current=detail?kind:null;setLens(lensRef.current);
      announce(detail?__alloFill(__alloT('stem.butterfly.ui_lens_opened','{value1}. Read the field notes below the flight controls.'),{value1:detail.title}):__alloT('stem.butterfly.ui_lens_closed','Returned to the wide habitat view. Your butterfly remains landed.'));
    }
    function toggle(){leavePollinatorView();closeFeed();closeLife();closeLens();s.paused=sceneMotion.current.paused?false:!s.paused;if(!s.paused)resumeMotion();stopFlight(s);clearFlightInput();if(!s.paused&&s.landed){s.landed=null;s.y=Math.max(6,s.y);}announce(s.paused?__alloT('stem.butterfly.ui_flight_paused_ambient','Flight paused. The meadow keeps moving. Use Pause all motion to freeze the whole scene.'):s.controlMode==='steer'?__alloT('stem.butterfly.ui_direct_flight_active','You have the controls. W / up flies forward; A / D or left / right turns; S / down brakes. E / Q change height, G glides, and Space pauses.'):__alloT('stem.butterfly.ui_flight_active','Flight active. Steer with the direction controls, or choose a habitat. G switches between wingbeats and gliding.'));if(!s.paused)queueSceneFocus(null);}
    function toggleGlide(){if(s.paused||s.landed||sceneMotion.current.paused)return;s.gliding=!s.gliding;s.target=null;announce(s.gliding?__alloT('stem.butterfly.ui_gliding_on','Gliding. Your wings stay open as you move forward and gently lose height. Steer as usual; press G again for wingbeats.'):__alloT('stem.butterfly.ui_gliding_off','Wingbeats resumed. Release the direction controls to slow to a hover.'));}
    function travel(id){leavePollinatorView();closeFeed();closeLife();closeLens();resumeMotion();stopFlight(s);s.landed=null;s.y=Math.max(6,s.y);s.target=id;s.paused=false;clearFlightInput();announce(__alloFill(__alloT('stem.butterfly.ui_guided_flight_to','Guided flight to {value1}. You will slow down near the patch. Steer to take control.'),{value1:patch(id,s).name}));}
    function visitDirect(id){leavePollinatorView();var p=patch(id,s);if(!p)return;closeFeed();closeLife();closeLens();clearFlightInput();stopFlight(s);s.target=null;s.landed=null;s.paused=true;s.x=p.x;s.z=p.z;s.y=6;announce(__alloFill(__alloT('stem.butterfly.ui_arrived_without_flying','Arrived at {value1} without flying. Choose Land here, then Examine patch to record your evidence.'),{value1:p.name}));queueSceneFocus('center');}
    function landing(){leavePollinatorView();closeFeed();closeLife();closeLens();clearFlightInput();if(s.landed){resumeMotion();stopFlight(s);s.landed=null;s.y=Math.max(6,s.y);s.paused=false;announce(__alloT('stem.butterfly.ui_airborne','Airborne. Choose your next habitat.'));}else announce(land(s).message);}
    function examine(){var result=observe(s);if(result.ok)persist();if(s.landed==='restoration')setDesignFeedback(result.message);announce(result.message);}
    R.useEffect(function(){
      var alive=true,world=null,gl=null,camera=null,raf=0,last=0,lastUI=0,lastAmbientDraw=0,observer=null;
      var node=stage.current,viewport=node.querySelector('.bf-viewport'),cv=map.current,reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
      var width=1,height=1,lastMapMode=mapModeRef.current,lastView=viewRef.current,lastLens=lensRef.current,lastLifeWatch=lifeRef.current,lastFeedWatch=feedRef.current;
      var lastMotionReduced=reduced.matches,pendingSceneFocus=null,returnNeedsDisabled=true,returnWaitsForMap=false,committedRenderer='loading',returnReady=false,returnTimer=0;
      var tracking={id:'',clock:0,x:0,y:0,z:0};
      function paintMap(){
        var g=cv.getContext('2d');if(!g)return;
        var dpr=Math.min(window.devicePixelRatio||1,2);g.setTransform(dpr,0,0,dpr,0,0);
        var feeding=feedRef.current?feedingVisual(s):null;if(feeding){paintFeedingDiagram(g,width,height,feeding,feedMotion.current.phase,feedMotion.current.progress,reduced.matches,feedMotion.current.contact,feedMotion.current.focus);return;}
        var specimen=lifeRef.current?lifecycleVisual(s):null;if(specimen){paintLifecycleDiagram(g,width,height,specimen,lifeMotion.current.progress,reduced.matches,lifeMotion.current.focus);return;}
        paintHabitatMap(g,width,height,s,!!lensRef.current);
        var scale=Math.min(width,height)/240;
        habitats(s).forEach(function(p){var label=placeLabels.current[p.id];if(!label)return;label.dataset.map='true';label.style.visibility='visible';label.style.left=(width/2+(p.x-15)*scale)+'px';label.style.top=(height/2+(p.z-15)*scale)+'px';});
      }
      // Wayfinding over the 3D view: names float over each patch in the
      // overview, and a small north-up map rides in the corner while flying.
      // Both are aria-hidden; the destination list carries the same choices.
      function wayfinding(T,overview,observing){
        var mini=miniRef.current,showMini=!!T&&!overview&&!observing;
        habitats(s).forEach(function(p){var label=placeLabels.current[p.id];if(!label)return;delete label.dataset.map;
          if(!T||!overview){label.style.visibility='hidden';return;}
          var v=new T.Vector3(p.x,5,p.z).project(camera),onView=v.z>-1&&v.z<1&&Math.abs(v.x)<.95&&Math.abs(v.y)<.95;
          label.style.visibility=onView?'visible':'hidden';label.style.left=((v.x*.5+.5)*width)+'px';label.style.top=((-v.y*.5+.5)*height)+'px';});
        if(!mini)return;mini.style.visibility=showMini?'visible':'hidden';if(!showMini)return;
        var g=mini.getContext('2d');if(!g)return;var size=150,scale=size/230,c=size/2;
        g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,size,size);
        g.fillStyle='rgba(250,247,232,.9)';g.beginPath();g.arc(c,c,c-1,0,Math.PI*2);g.fill();g.save();g.clip();
        g.fillStyle='#bfd29b';g.fillRect(c-100*scale,c-100*scale,200*scale,200*scale);
        g.strokeStyle='#d9c99b';g.lineWidth=3;g.beginPath();for(var z=-110;z<=110;z+=5){var px=c+meadowPathX(z)*scale,pz=c+z*scale;if(z===-110)g.moveTo(px,pz);else g.lineTo(px,pz);}g.stroke();
        habitats(s).forEach(function(p){g.fillStyle=p.color;g.strokeStyle=p.id==='restoration'?'#9a4c0b':'#3d5b44';g.lineWidth=p.id===s.target?3:1.5;g.beginPath();g.arc(c+p.x*scale,c+p.z*scale,17*scale,0,Math.PI*2);g.fill();g.stroke();});
        var dest=patch(s.target,s);if(dest){g.strokeStyle='#9a4c0b';g.lineWidth=1.5;g.setLineDash([3,3]);g.beginPath();g.moveTo(c+s.x*scale,c+s.z*scale);g.lineTo(c+dest.x*scale,c+dest.z*scale);g.stroke();g.setLineDash([]);}
        g.save();g.translate(c+s.x*scale,c+s.z*scale);g.rotate(-s.yaw);g.fillStyle='#e8892b';g.strokeStyle='#2b2118';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-8);g.lineTo(6,6);g.lineTo(0,3);g.lineTo(-6,6);g.closePath();g.fill();g.stroke();g.restore();
        g.restore();g.strokeStyle='#5f6f50';g.lineWidth=1.5;g.beginPath();g.arc(c,c,c-1,0,Math.PI*2);g.stroke();
        g.fillStyle='#24382e';g.font='700 11px system-ui';g.textAlign='center';g.fillText(__alloT('stem.butterfly.ui_minimap_north','N'),c,13);
      }
      function draw(){
        if(!alive)return;
        lastMapMode=mapModeRef.current;lastView=viewRef.current;lastLens=lensRef.current;lastLifeWatch=lifeRef.current;lastFeedWatch=feedRef.current;
        var generation=lifecycleVisual(s),watched=lifeRef.current&&generation,feeding=feedRef.current?feedingVisual(s):null;
        if(feeding&&feedMotion.current.signature!==feeding.patch+':'+(feeding.plan||'')){feeding=null;feedMotion.current.playing=false;}
        if(reduced.matches)feedMotion.current.playing=false;
        node.dataset.bfFeeding=feeding?feedMotion.current.phase:'';node.dataset.bfFeedingProgress=feedMotion.current.progress.toFixed(3);node.dataset.bfFeedingContact=String(feedMotion.current.contact);node.dataset.bfFeedingFocus=feedMotion.current.focus;
        var observing=!!(watched||feeding);
        var lifeKey=generation?generation.patch+':'+(generation.plan||'')+':'+generation.stage+':'+generation.recorded:'';
        if(lifeMotion.current.signature!==lifeKey){lifeMotion.current.signature=lifeKey;lifeMotion.current.progress=1;lifeMotion.current.playing=false;}
        if(reduced.matches)lifeMotion.current.playing=false;
        node.dataset.bfLifeStage=generation?generation.stage:'';node.dataset.bfLifeWatch=String(!!watched);node.dataset.bfLifeProgress=lifeMotion.current.progress.toFixed(3);node.dataset.bfLifeFocus=lifeMotion.current.focus;
        node.dataset.clock=s.clock.toFixed(3);node.dataset.position=[s.x,s.y,s.z].map(function(v){return v.toFixed(2);}).join(',');
        node.dataset.bfMeadowClock=sceneMotion.current.clock.toFixed(3);node.dataset.bfMotionPaused=String(sceneMotion.current.paused);node.dataset.bfPaused=String(s.paused||sceneMotion.current.paused);
        node.dataset.bfSpeed=Math.hypot(s.vx,s.vz).toFixed(2);node.dataset.bfBank=s.bank.toFixed(3);node.dataset.bfFlightMode=sceneMotion.current.paused?'paused':s.landed?'landed':s.paused?'paused':s.target?'guided':s.gliding?'gliding':'manual';node.dataset.bfView=viewRef.current;
        node.dataset.bfControls=s.controlMode;node.dataset.bfHeading=s.yaw.toFixed(4);
        var detail=fieldDetail(s,lensRef.current);node.dataset.bfLens=detail?detail.kind:'';
        var watchingVisitor=viewRef.current==='pollinators'&&!observing&&!detail;
        node.dataset.bfWatchPatch=watchingVisitor?watchPatchRef.current:'';node.dataset.bfLight=lightRef.current;
        var useMap=mapModeRef.current||!gl;
        cv.style.visibility=useMap?'visible':'hidden';if(gl)gl.domElement.style.visibility=useMap?'hidden':'visible';
        Object.keys(feedLabels.current).forEach(function(id){var pair=feedLabels.current[id];if(pair)pair.style.visibility=useMap?'hidden':'visible';});
        if(useMap){wayfinding(null,false);paintMap();return;}
        var T=window.THREE,p=world.player.root,time=reduced.matches?0:sceneMotion.current.clock,pose=flightPose(s,reduced.matches);
        world.setLight(lightRef.current);
        if(s.paused&&!s.landed&&!reduced.matches){pose=flutterPose(time*17,time,0,0);pose.bank=0;}
        p.visible=!observing&&!watchingVisitor;world.syncLifecycle(generation,lifeMotion.current.progress,reduced.matches,watched?lifeMotion.current.focus:'context');world.feeding.sync(feeding,feedMotion.current.phase,feedMotion.current.progress,reduced.matches,feedMotion.current.contact);
        p.position.set(s.x,s.y+pose.bob,s.z);p.rotation.set(pose.pitch,s.yaw,pose.bank,'YXZ');
        world.player.wings[0].rotation.z=pose.leftWing;world.player.wings[1].rotation.z=pose.rightWing;
        if(world.player.hindWings)world.player.hindWings.forEach(function(wing,i){wing.rotation.z=(i?1:-1)*pose.hindLag;});
        if(world.updatePlayerWingFlex)world.updatePlayerWingFlex(s,reduced.matches,time,pose,!p.visible);
        var nectarPatches=habitats(s).filter(function(patch){return patch.nectar;});
        if(world.showOuterBlooms)world.showOuterBlooms(!observing);
        if(world.animate)world.animate(time,reduced.matches,observing||!!detail||!!s.landed&&!watchingVisitor);
        if(world.animateVisitors)world.animateVisitors(time,reduced.matches,nectarPatches,observing);
        if(world.animateBees)world.animateBees(time,reduced.matches,s.restoration.design,observing);
        if(world.playerShadow){world.playerShadow.visible=!observing&&!watchingVisitor;world.playerShadow.position.set(s.x+s.y*.18,.045,s.z+s.y*.11);world.playerShadow.scale.set(6+s.y*.18,4.2+s.y*.13,1);world.playerShadow.material.uniforms.opacity.value=Math.max(.035,.2-s.y*.006);}
        world.restoration.children.forEach(function(group){group.visible=group.name==='restoration-'+s.restoration.design;});
        world.ring.position.set(s.x,.09,s.z);world.ring.visible=!observing&&viewRef.current==='meadow';var dest=patch(s.target,s);world.targetRing.visible=!observing&&!!dest;if(dest)world.targetRing.position.set(dest.x,.08,dest.z);
        world.focusHalo.visible=!!detail;
        var cameraView=feeding?feedingCamera(feeding,feedMotion.current.phase,width/height,feedMotion.current.focus,feedMotion.current.progress,reduced.matches,feedMotion.current.contact):watched?lifecycleCamera(generation,width/height,lifeMotion.current.focus,lifeMotion.current.progress,reduced.matches):cameraPose(s,viewRef.current,detail,reduced.matches);
        if(watchingVisitor){
          var subject=world.visitors[watchedVisitorIndex(nectarPatches,watchPatchRef.current,watchSpeciesRef.current)];
          if(subject){
            node.dataset.bfWatchPatch=subject.root.userData.patch;node.dataset.bfWatchingSpecies=subject.speciesId;node.dataset.bfWatchingVisitor=subject.root.name;
            var position=subject.root.position,identity=subject.root.name+':'+subject.root.userData.patch,elapsed=Math.max(0,time-tracking.clock),blend=tracking.id!==identity||reduced.matches?1:1-Math.exp(-elapsed*5);
            tracking.x+=(position.x-tracking.x)*blend;tracking.y+=(position.y-tracking.y)*blend;tracking.z+=(position.z-tracking.z)*blend;tracking.id=identity;tracking.clock=time;
            cameraView=pollinatorCamera(tracking,width/height,meadowSpecies(subject.speciesId).scale);node.dataset.bfWatchingPhase=subject.root.userData.behavior;
            world.watchVisitor(subject,cameraView,width/height);
            var phase=subject.root.userData.behavior,caption=phase==='feeding'?__alloT('stem.butterfly.watch_feeding','Sipping nectar · wings at rest'):phase==='approaching'?__alloT('stem.butterfly.watch_arriving','Settling onto a flower'):phase==='departing'?__alloT('stem.butterfly.watch_leaving','Taking flight again'):__alloT('stem.butterfly.watch_cruising','Fluttering between blossoms');
            if(visitorReadout.current)visitorReadout.current.textContent=caption;if(watchCaption.current)watchCaption.current.textContent=caption;
          }
        }else{world.watchVisitor(null);tracking.id='';node.dataset.bfWatchingPhase='';node.dataset.bfWatchingSpecies='';node.dataset.bfWatchingVisitor='';}
        camera.position.fromArray(cameraView.position);camera.lookAt.apply(camera,cameraView.target);
        if(camera.fov!==cameraView.fov){camera.fov=cameraView.fov;camera.updateProjectionMatrix();}
        var overview=!feeding&&!watched&&!detail&&viewRef.current==='meadow';world.scene.fog.near=overview?270:125;world.scene.fog.far=overview?560:360;
        if(detail){var point=detail.point;world.focusHalo.position.set(point.x,point.y,point.z);world.focusHalo.quaternion.copy(camera.quaternion);}
        try{gl.render(world.scene,camera);}catch(e){fallback();return;}
        wayfinding(T,overview,observing||watchingVisitor);
        if(feeding){
          var insect=world.feeding.root.getObjectByName('feeding-monarch');
          ['tube','pollen','surface'].forEach(function(id){
            var label=feedLabels.current[id];if(!label)return;
            var point=new T.Vector3(),phase=feedMotion.current.phase,visible=true;
            if(id==='tube'){point.set(0,-1.6,-2.5);insect.localToWorld(point);visible=phase!=='carry';}
            else if(id==='pollen'){world.feeding.root.getObjectByName('feeding-pollen-carried').getWorldPosition(point);visible=phase!=='sip'||feedMotion.current.progress>.4;}
            else{world.feeding.root.getObjectByName('feeding-pollen-deposited').getWorldPosition(point);visible=phase==='deposit'&&feedMotion.current.contact&&feedMotion.current.progress>.35;}
            point.project(camera);visible=visible&&point.z>-1&&point.z<1&&Math.abs(point.x)<1&&Math.abs(point.y)<1;
            if(feedMotion.current.focus==='tube'&&id!=='tube')visible=false;if(feedMotion.current.focus==='pollen'&&id==='tube')visible=false;
            var px=(point.x*.5+.5)*width,py=(-point.y*.5+.5)*height;
            var dx=id==='tube'?-110:24,dy=id==='tube'?30:id==='pollen'?-32:60;
            var x=clamp(px+dx,12,Math.max(12,width-140)),y=clamp(py+dy,62,height-120);
            label.style.visibility=visible?'visible':'hidden';label.style.left=x+'px';label.style.top=y+'px';
            var line=label.firstChild,len=Math.hypot(px-x,py-y);line.style.width=len+'px';line.style.transform='rotate('+Math.atan2(py-y,px-x)+'rad)';
          });
        }
        node.dataset.clock=s.clock.toFixed(3);node.dataset.position=[s.x,s.y,s.z].map(function(v){return v.toFixed(2);}).join(',');
      }
      function resize(){width=Math.max(1,viewport.clientWidth);height=Math.max(1,viewport.clientHeight);var dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(width*dpr);cv.height=Math.round(height*dpr);if(gl){gl.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}draw();}
      function disposeWorld(){
        if(world){if(world.watchVisitor)world.watchVisitor(null);var geometries=new Set(),materials=new Set();world.scene.traverse(function(o){if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){materials.add(m);});});geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});world=null;}
        if(gl){var old=gl;gl=null;old.domElement.removeEventListener('webglcontextlost',lost);old.dispose();if(window.StemLab.releaseGl)window.StemLab.releaseGl(old);old.domElement.remove();}
      }
      function fallback(){
        // These controls disappear or become unavailable in the illustrated view.
        // Recover only after the map context commits, without disturbing notes.
        var active=document.activeElement,owner=node.closest('.bfl');
        if(active&&owner&&owner.contains(active)&&(active.closest('.bf-camera-tools,.bf-light-controls:not(.bf-flight-controls),.bf-watch-panel')||(s.paused||sceneMotion.current.paused)&&isFlightControl(active))){
          cancelReturnFocus();
          pendingSceneFocus=active;returnNeedsDisabled=false;returnReady=!document.hidden&&document.hasFocus();
        }
        // A preceding blur may already have disabled the origin and moved focus to BODY.
        if(pendingSceneFocus){returnWaitsForMap=true;scheduleReturnFocus();}
        disposeWorld();wayfinding(null,false);if(alive){Object.keys(feedLabels.current).forEach(function(id){var label=feedLabels.current[id];if(label)label.style.visibility='hidden';});setRenderer('map');paintMap();cv.style.visibility='visible';}}
      function lost(e){e.preventDefault();sceneMotion.current.paused=true;sceneMotion.current.reset=true;syncMeadowSound();feedMotion.current.playing=false;s.paused=true;stopFlight(s);lifeMotion.current.playing=false;clearFlightInput();fallback();setMessage(__alloT('stem.butterfly.ui_3d_interrupted','The 3D view was interrupted. Motion is paused and your journal is intact. Continue with the illustrated view.'));refresh(function(n){return n+1;});}
      function cancelReturnFocus(){clearTimeout(returnTimer);returnTimer=0;pendingSceneFocus=null;returnNeedsDisabled=true;returnWaitsForMap=false;returnReady=false;}
      function neutralFocus(element){return element===document.body||element===document.documentElement;}
      function scheduleReturnFocus(){
        if(!alive||!returnReady||!pendingSceneFocus||returnTimer)return;
        // Let the returning click or focus settle before recovering a disabled control.
        returnTimer=setTimeout(function(){
          returnTimer=0;
          if(!alive||!returnReady||!pendingSceneFocus||document.hidden||!document.hasFocus())return;
          var target=pendingSceneFocus,active=document.activeElement;
          if((returnNeedsDisabled&&!target.isConnected)||(active!==target&&!neutralFocus(active))){cancelReturnFocus();return;}
          // React may still be applying the automatic pause; the render effect retries.
          // Renderer fallback can remove its control entirely while the page is away.
          if(returnWaitsForMap&&committedRenderer!=='map')return;
          if(returnNeedsDisabled&&!target.disabled)return;
          cancelReturnFocus();focusMeadow();
        },0);
      }
      function checkReturnFocus(committed){committedRenderer=committed;scheduleReturnFocus();}
      function returned(){returnReady=true;scheduleReturnFocus();}
      function focusChanged(event){if(pendingSceneFocus&&event.target!==pendingSceneFocus&&!neutralFocus(event.target))cancelReturnFocus();}
      function pauseForFocus(){
        clearTimeout(returnTimer);returnTimer=0;returnReady=false;
        var active=document.activeElement;
        if(isFlightControl(active)&&!active.disabled){pendingSceneFocus=active;returnNeedsDisabled=true;}
        else if(active!==pendingSceneFocus&&!neutralFocus(active))pendingSceneFocus=null;
        sceneMotion.current.paused=true;sceneMotion.current.reset=true;syncMeadowSound();lifeMotion.current.playing=false;feedMotion.current.playing=false;s.paused=true;s.target=null;stopFlight(s);setMessage(__alloT('stem.butterfly.ui_all_paused_while_away','All motion paused while you were away. Resume motion when you are ready.'));refresh(function(n){return n+1;});clearFlightInput();last=0;draw();}
      function hidden(){if(document.hidden)pauseForFocus();else returned();}
      function motionPreferenceChanged(){if(lastMotionReduced===reduced.matches)return;lastMotionReduced=reduced.matches;sceneMotion.current.reset=true;if(reduced.matches){lifeMotion.current.playing=false;feedMotion.current.playing=false;feedMotion.current.progress=1;}draw();refresh(function(n){return n+1;});}
      var keyMap={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyE:'rise',KeyQ:'lower'};
      function keydown(e){if(!flightShortcut(e)||!node.contains(document.activeElement)||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))return;if(keyMap[e.code]){e.preventDefault();if(!sceneMotion.current.paused&&!lifeRef.current&&!feedRef.current)keys.current[keyMap[e.code]]=true;}if(e.code==='Space'&&!e.repeat){e.preventDefault();toggleSceneMotion();}if(e.code==='KeyG'&&!e.repeat){e.preventDefault();toggleGlide();}}
      function keyup(e){if(keyMap[e.code])delete keys.current[keyMap[e.code]];}
      // Keep idle controls current even when a browser delays the preference notification.
      function frame(now){if(!alive)return;if(lastMotionReduced!==reduced.matches)motionPreferenceChanged();var wasPaused=s.paused,scenery=sceneMotion.current,halted=scenery.paused||document.hidden,dt=last&&!scenery.reset?Math.max(0,(now-last)/1000):0,motion=lifeMotion.current,wasMoving=motion.playing,feedingMotion=feedMotion.current,wasFeeding=feedingMotion.playing;
        if(!halted&&motion.playing){if(!lifeRef.current||reduced.matches){motion.playing=false;}else{motion.progress=Math.min(1,motion.progress+dt*motion.speed/3.6);if(motion.progress>=1)motion.playing=false;}}
        if(!halted&&feedingMotion.playing){if(!feedRef.current||reduced.matches){feedingMotion.playing=false;feedingMotion.progress=1;}else{feedingMotion.progress=Math.min(1,feedingMotion.progress+dt*feedingMotion.speed/5);if(feedingMotion.progress>=1)feedingMotion.playing=false;}}
        if(!halted)advanceFrame(s,dt,keys.current);
        var ambient=!halted&&!reduced.matches&&!!gl&&!mapModeRef.current&&!lifeRef.current&&!feedRef.current&&!lensRef.current;
        if(ambient)scenery.clock+=Math.min(dt,.1);
        last=now;scenery.reset=false;
        if(s.paused&&!wasPaused){
          // Guided arrival disables flight controls. Recover after the updated
          // landing guidance renders, unless the learner moves focus elsewhere.
          var active=document.activeElement;
          if(isFlightControl(active)){cancelReturnFocus();pendingSceneFocus=active;returnReady=!document.hidden&&document.hasFocus();scheduleReturnFocus();}
          setMessage(__alloFill(__alloT('stem.butterfly.ui_reached_patch','You have reached {value1}. Land to examine this habitat.'),{value1:nearest(s).plant.name}));
        }
        // Idle scenery needs no React updates and renders at most 30fps.
        if(!halted&&(!s.paused||!wasPaused||wasMoving||wasFeeding||ambient&&now-lastAmbientDraw>=1000/30)||lastFeedWatch!==feedRef.current||lastLifeWatch!==lifeRef.current||lastMapMode!==mapModeRef.current||lastView!==viewRef.current||lastLens!==lensRef.current){draw();lastAmbientDraw=now;}
        if(s.paused!==wasPaused||wasMoving!==motion.playing||wasFeeding!==feedingMotion.playing||(!halted&&(!s.paused||motion.playing||feedingMotion.playing)&&now-lastUI>250)){refresh(function(n){return n+1;});lastUI=now;}
        raf=requestAnimationFrame(frame);
      }
      api.current={draw:draw,checkReturnFocus:checkReturnFocus};resize();observer=new ResizeObserver(resize);observer.observe(viewport);
      window.addEventListener('blur',pauseForFocus);window.addEventListener('focus',returned);document.addEventListener('visibilitychange',hidden);document.addEventListener('focusin',focusChanged);document.addEventListener('pointerdown',cancelReturnFocus,true);node.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);reduced.addEventListener('change',motionPreferenceChanged);
      setRenderer('loading');
      Promise.all([window.StemLab.ensureThree(),window.StemMeadow?Promise.resolve(window.StemMeadow):window.StemLab.ensureMeadow()]).then(function(deps){
        if(!alive)return;var T=deps[0];
        try{gl=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));gl.outputEncoding=T.sRGBEncoding;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=.95;
          gl.domElement.className='bf-gl';gl.domElement.setAttribute('aria-hidden','true');gl.domElement.addEventListener('webglcontextlost',lost);viewport.insertBefore(gl.domElement,cv);world=buildWorld(T,deps[1]);camera=new T.PerspectiveCamera(52,1,.1,600);setRenderer('three');resize();
        }catch(error){fallback();}
      }).catch(function(){if(alive)fallback();});
      raf=requestAnimationFrame(frame);
      return function(){alive=false;cancelReturnFocus();cancelAnimationFrame(raf);lifeMotion.current.playing=false;feedMotion.current.playing=false;observer.disconnect();window.removeEventListener('blur',pauseForFocus);window.removeEventListener('focus',returned);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('focusin',focusChanged);document.removeEventListener('pointerdown',cancelReturnFocus,true);node.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);reduced.removeEventListener('change',motionPreferenceChanged);disposeWorld();api.current=null;clearFlightInput();s.paused=true;};
    },[retry]);
    R.useEffect(function(){if(api.current&&api.current.checkReturnFocus)api.current.checkReturnFocus(renderer);});
    var near=nearest(s),landed=patch(s.landed,s),remaining=s.observations.length,detail=fieldDetail(s,lens),recorded=evidenceRecorded(s,landed);
    var specimen=lifecycleVisual(s),watching=lifeWatch&&specimen,specimenStage=specimen?STAGES.find(function(st){return st.id===specimen.stage;}):null;
    var feeding=feedWatch?feedingVisual(s):null,feedingStep=feedingPhase(feedMotion.current.phase,feedMotion.current.contact),feedResult=feedingOutcome(feeding,feedMotion.current.phase,feedMotion.current.progress,feedMotion.current.contact),observing=!!(watching||feeding);
    var flowerVisits=cleanPollination(s.pollination).visits,feedVisits=feeding?currentPollinationVisits(s).filter(function(row){return row.patch===feeding.patch&&(row.plan||null)===(feeding.plan||null)&&row.species===feeding.species;}):[];
    var feedSaved=feedVisits.some(function(row){return row.contact===feedMotion.current.contact;}),feedPairReady=feedVisits.length===2;
    var allMotionPaused=sceneMotion.current.paused,motionReduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var watchingPollinators=view==='pollinators'&&!observing&&!detail&&!mapMode&&renderer==='three';
    var habitatMapVisible=(mapMode||renderer!=='three')&&!observing;
    var sound=meadowSound.current,soundSupported=!!(window.AudioContext||window.webkitAudioContext),soundQuiet=sound.muted||!sound.enabled;
    var soundStatus=!soundSupported?__alloT('stem.butterfly.sound_unavailable','Meadow sounds are unavailable in this browser.'):sound.error?__alloT('stem.butterfly.sound_failed','Sound could not start. Try enabling it again.'):!sound.enabled?__alloT('stem.butterfly.sound_off','Off until you choose to listen.'):sound.muted?__alloT('stem.butterfly.sound_muted','Muted · your volume is saved.'):allMotionPaused?__alloT('stem.butterfly.sound_paused','Paused with the meadow.'):sound.volume===0?__alloT('stem.butterfly.sound_zero','Volume is at zero.'):sound.playback==='running'?__alloT('stem.butterfly.sound_playing','Listening · soft rustles and distant birds.'):sound.playback==='starting'?__alloT('stem.butterfly.sound_starting','Sound is starting. You can mute while you wait.'):__alloT('stem.butterfly.sound_interrupted','Sound is paused by the browser. Mute and unmute to try again.');
    var lifeDetail=specimen?lifecycleInspection(specimen,lifeMotion.current.focus,lifeMotion.current.progress,motionReduced):null,lifeCanAnimate=!!(specimen&&!specimen.blocked&&(specimen.stage==='caterpillar'||specimen.stage==='adult'||specimen.stage==='chrysalis'&&lifeMotion.current.focus==='maturation'));
    var larvalMeal=larvalFeeding(specimen,lifeMotion.current.progress),watchingMeal=!!(watching&&larvalMeal.active&&lifeMotion.current.focus==='feeding');
    var maturity=chrysalisMaturation(specimen,lifeMotion.current.progress),watchingMaturation=!!(watching&&maturity.active&&lifeMotion.current.focus==='maturation');
    var reportEmpty=reportIsEmpty(s),reportText=reportEmpty?'':fieldReport(s),reportCopyNote=reportCopyFeedback(copyPending?'pending':copyState);
    var seasonPatch=seasonSite?patch(seasonSite,s):null;
    var seasonView=seasonPatch?seasonOutcome(seasonPatch,mowPlan):null;
    var cycleSite=patch(s.lifecycle.patch,s),cycleIndex=STAGES.findIndex(function(st){return st.id===s.lifecycle.stage;});
    var canAdvance=!!(cycleSite&&s.lifecycle.stage&&cycleIndex<reachedStage(cycleSite));
    var verdict=pickedClaim?judgeClaim(s,pickedClaim):null;
    var journey=investigationSteps(s),citations=notebookEvidence(s),notebook=s.notebook,mission=missionStatus(s);
    var seasonRevealed=!!(seasonPatch&&seasonRunFor(s,seasonSite,mowPlan)),practice=casesSummary(s),caseAnswers=cleanCases(s.cases).answers;
    var watchHabitats=habitats(s).filter(function(p){return p.nectar;}),watchIndex=watchedVisitorIndex(watchHabitats,watchPatch,watchSpecies),watchedSpecies=meadowSpecies(VISITOR_SPECIES[watchIndex]),watchSite=visitorPatch(watchHabitats,watchIndex);
    function button(label,onClick,extra){return h('button',Object.assign({type:'button',onClick:onClick},extra||{}),label);}
    // Playback availability changes while a learner may still be on the button.
    // Keep that focus, omit unavailable commands from Tab order, and guard all activation.
    function playbackButton(label,onClick,extra){var attrs=Object.assign({},extra),unavailable=!!attrs.disabled;delete attrs.disabled;attrs.className=(attrs.className?attrs.className+' ':'')+'bf-playback-command';attrs['aria-disabled']=unavailable;attrs.tabIndex=unavailable?-1:0;return button(label,function(event){if(unavailable){event.preventDefault();event.stopPropagation();return;}onClick(event);},attrs);}
    var padVisible=s.controlMode==='steer'&&!observing&&!watchingPollinators&&!detail&&!landed;
    function flightPadControls(){
      if(!padVisible)return null;
      var disabled=allMotionPaused||s.paused;
      return h('div',{className:'bf-pilot',role:'group','aria-label':__alloT('stem.butterfly.pad_group','On-scene flight controls'),'data-disabled':String(disabled)},
        h('span',{className:'bf-pilot-label'},__alloT('stem.butterfly.pad_title','Drag to fly')),
        h('span',{id:'bf-pad-instructions',hidden:true},s.gliding?__alloT('stem.butterfly.pad_glide_instructions','Drag sideways to turn or down to brake. Releasing the pad keeps you gliding and gently descending. Press G or turn Glide off to return to wingbeats. Arrow keys or W A S D also work here; Space pauses.'):__alloT('stem.butterfly.pad_instructions','Drag up to fly, sideways to turn, down to brake. Release to hover. Arrow keys or W A S D also work here; Space pauses.')),
        button(h(R.Fragment,null,h('span',{className:'bf-stick-axis','aria-hidden':true}),['up','right','down','left'].map(function(direction,i){return h('span',{key:direction,className:'bf-stick-arrow','data-direction':direction,'aria-hidden':true},['↑','›','↓','‹'][i]);}),h('span',{className:'bf-stick-thumb','aria-hidden':true})),function(){if(stage.current)stage.current.focus({preventScroll:true});},{
          className:'bf-flight-pad',ref:function(node){flightPad.current.node=node;},disabled:disabled,'aria-label':__alloT('stem.butterfly.pad_name','Flight pad'),'aria-describedby':'bf-pad-instructions bf-scene-caption',
          onPointerDown:startFlightPad,onPointerMove:moveFlightPad,onPointerUp:endFlightPad,onPointerCancel:cancelFlightPad,onLostPointerCapture:endFlightPad,onKeyDown:keyFlightPad,onKeyUp:keyFlightPad,
          onBlur:function(){clearFlightInput();if(!sceneMotion.current.paused)stopFlight(s);}
        }),
        h('div',{className:'bf-pilot-altitude'},hold(h(R.Fragment,null,h('span',{'aria-hidden':true},'↑'),h('span',{className:'bf-altitude-label'},__alloT('stem.butterfly.bar_hold_rise','Rise'))),'rise',__alloT('stem.butterfly.pad_rise','Rise while flying')),hold(h(R.Fragment,null,h('span',{'aria-hidden':true},'↓'),h('span',{className:'bf-altitude-label'},__alloT('stem.butterfly.bar_hold_lower','Lower'))),'lower',__alloT('stem.butterfly.pad_lower','Lower while flying'))),
        h('span',{className:'bf-pilot-hint'},allMotionPaused?__alloT('stem.butterfly.pad_paused','Motion paused'):disabled?__alloT('stem.butterfly.pad_ready','Take flight to steer'):s.gliding?__alloT('stem.butterfly.pad_glide_release','Gliding continues on release'):__alloT('stem.butterfly.pad_release','Release to hover')));
    }
    function returnToGuide(){return h('div',{className:'bf-return'},button(__alloT('stem.butterfly.ui_back_to_guide','Back to investigation guide'),function(){jumpTo('guide');}));}
    // Assistive activation does not include the pointer/key hold sequence.
    // Give it one bounded step; native holds keep their existing input path.
    function activateFlightStep(event,key,spoken){
      if(holdBlockedClicks.current.has(event.currentTarget))return;
      if(event.detail!==0||!flightShortcut(event)||s.paused||s.landed||sceneMotion.current.paused||document.hidden||lifeRef.current||feedRef.current||lensRef.current||viewRef.current==='pollinators')return;
      clearFlightInput();stopFlight(s);var input={};input[key]=true;
      advanceFrame(s,.25,input);stopFlight(s);announce(__alloFill(__alloT('stem.butterfly.hold_step_done','{value1}: one short step. Hovering.'),{value1:spoken}));
    }
    function hold(label,key,spoken){return button(label,function(event){activateFlightStep(event,key,spoken||label);},{'aria-label':spoken||label,'data-direction':key,disabled:allMotionPaused||s.paused||!!s.landed,
      onPointerDown:function(e){if(sceneMotion.current.paused||s.paused||s.landed||e.button!==0)return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){return;}keys.current[key]=true;},
      onPointerUp:function(){delete keys.current[key];},onPointerCancel:function(){clearFlightInput();stopFlight(s);update();},onLostPointerCapture:function(){delete keys.current[key];},
      onKeyDown:function(e){if(e.key!==' '&&e.key!=='Enter')return;if(e.repeat&&holdBlockedClicks.current.has(e.currentTarget))return;if(!flightShortcut(e)){holdBlockedClicks.current.add(e.currentTarget);return;}holdBlockedClicks.current.delete(e.currentTarget);if(!sceneMotion.current.paused&&!s.paused&&!s.landed){e.preventDefault();keys.current[key]=true;}},
      onKeyUp:function(e){if(e.key!==' '&&e.key!=='Enter')return;delete keys.current[key];var node=e.currentTarget;if(holdBlockedClicks.current.has(node))setTimeout(function(){holdBlockedClicks.current.delete(node);},0);},onBlur:function(event){holdBlockedClicks.current.delete(event.currentTarget);delete keys.current[key];if(!sceneMotion.current.paused)stopFlight(s);}});}
    return h('section',{className:'bfl','data-butterfly-root':true,'data-dark':!!ctx.isDark,'data-contrast':!!ctx.isContrast,'aria-label':__alloT('stem.butterfly.a11y_butterfly_habitat_lab',"Butterfly Habitat Lab")},
      h('style',null,CSS),
      h('header',{className:'bf-header'},h('div',{className:'bf-header-copy'},h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.top_eyebrow','Field study 01 · Mid-Atlantic, North America · Summer')),h('h2',null,__alloT('stem.butterfly.top_title','A meadow through butterfly eyes')),h('p',null,plain(__alloT('stem.butterfly.top_intro_diverse','Fly as a monarch, meet three other meadow butterflies, and discover how flowers and leaves support different stages of life.'),__alloT('stem.butterfly.top_intro_diverse_simple','Fly as a monarch and meet other butterflies. Visit flowers and look at leaves to find out what a monarch needs as it grows.'))),h('div',{className:'bf-header-tools'},button(h(R.Fragment,null,h('span',{'aria-hidden':true},__alloT('stem.butterfly.top_simpler_icon','Aa')+' '),__alloT('stem.butterfly.top_simpler_words','Simpler words')),toggleSimpler,{'aria-pressed':simpler,className:'bf-simpler'}),button(__alloT('stem.butterfly.top_guide_eyebrow','Your field investigation'),function(){jumpTo('guide');},{className:'bf-guide-link'}))),bfBotanicalPlate(h)),
      h('div',{className:'bf-layout',ref:function(node){sections.current.explore=node;},tabIndex:-1},h('div',null,
        h('div',{className:'bf-stage',ref:stage,role:'region',tabIndex:0,'aria-describedby':'bf-scene-caption','aria-label':watchingPollinators?__alloT('stem.butterfly.watch_scene','Watching a meadow butterfly. Space pauses or resumes the whole scene.'):feeding?__alloFill(__alloT('stem.butterfly.hud_stage_aria_feeding','Feeding and pollination close-up. {value1}. Space pauses motion. Read the observation and controls below.'),{value1:feedingStep.title}):watching?__alloFill(__alloT('stem.butterfly.hud_stage_aria_life','Life cycle close-up. {value1} at {value2}. Space pauses stage motion. Read the stage notes and controls below.'),{value1:specimenStage.name,value2:specimen.name}):s.controlMode==='steer'?__alloT('stem.butterfly.a11y_direct_flight_area','Butterfly flight area. W or up to fly forward. A D or left right to turn. S or down to brake. E to rise, Q to lower, G to glide, Space to pause.'):__alloT('stem.butterfly.a11y_butterfly_flight_area_arrow_keys_or_w_a_s_d_to_move_',"Butterfly flight area. Arrow keys or W A S D to move, E to rise, Q to lower, G to glide, Space to pause."),'data-bf-paused':String(s.paused||allMotionPaused),'data-bf-motion-paused':String(allMotionPaused),'data-bf-meadow-clock':sceneMotion.current.clock.toFixed(3),'data-bf-renderer':mapMode?'map':renderer,'data-bf-landed':s.landed||'','data-bf-design':s.restoration.design,'data-bf-pad-visible':String(padVisible)},
          h('div',{className:'bf-viewport'},
          h('canvas',{className:'bf-map',ref:map,'aria-hidden':true}),
          h('canvas',{className:'bf-minimap',ref:miniRef,width:150,height:150,'aria-hidden':true}),
          habitats(s).map(function(p,index){return h('div',{key:p.id,className:'bf-place-label','aria-hidden':true,'data-place':p.id,ref:function(node){placeLabels.current[p.id]=node;}},h('span',{className:'bf-place-index'},index+1),h('span',{className:'bf-place-name'},p.name),h('small',null,evidenceRecorded(s,p)?__alloT('stem.butterfly.hud_place_examined','✓ examined'):__alloT('stem.butterfly.hud_place_not_examined','not examined yet')));}),
          feeding?['tube','pollen','surface'].map(function(id){return h('div',{key:id,className:'bf-feed-label','aria-hidden':true,ref:feedLabelRefs[id]},h('i',null),h('span',null,id==='tube'?__alloT('stem.butterfly.hud_feed_tube','Drinking tube'):id==='pollen'?__alloT('stem.butterfly.hud_feed_pollen_leg','Pollen on leg'):feedResult.received?__alloT('stem.butterfly.hud_feed_pollen_received','Pollen received'):__alloT('stem.butterfly.hud_feed_pollen_transfer','Pollen in transfer')));}):null,
          h('div',{className:'bf-overlay'},h('div',{className:'bf-scene-badge','aria-hidden':true},watchingPollinators?__alloT('stem.butterfly.watch_badge','MEADOW VISITOR · UP CLOSE'):feeding?(mapMode||renderer==='map'?__alloT('stem.butterfly.hud_badge_feed_map','ILLUSTRATED POLLINATION'):__alloT('stem.butterfly.hud_badge_feed','NECTAR & POLLEN · CLOSE UP')):watching?(mapMode||renderer==='map'?__alloT('stem.butterfly.hud_badge_life_map','ILLUSTRATED LIFE CYCLE'):__alloT('stem.butterfly.hud_badge_life','LIFE CYCLE · ON THE PLANT')):mapMode||renderer==='map'?__alloT('stem.butterfly.hud_badge_map','HABITAT MAP · SAME EXPLORATION'):__alloT('stem.butterfly.hud_badge_meadow','MONARCH HABITAT · SUMMER MEADOW')))),
          h('div',{className:'bf-scene-dock'},
            landed&&!observing&&!watchingPollinators?h('div',{className:'bf-lens-tools',role:'group','aria-label':__alloT('stem.butterfly.a11y_field_lens_controls',"Field lens controls")},button(__alloT('stem.butterfly.hud_lens_flowers','Flowers'),function(){chooseLens('flowers');},{'aria-pressed':lens==='flowers'}),button(__alloT('stem.butterfly.hud_lens_leaves','Leaves'),function(){chooseLens('leaves');},{'aria-pressed':lens==='leaves'}),button(__alloT('stem.butterfly.hud_lens_wide','Wide view'),function(){chooseLens(null);},{'aria-pressed':!lens})):null,
            h('div',{className:'bf-scene-bottom'+(detail?' bf-lens-caption':''),id:'bf-scene-caption','aria-live':'off'},allMotionPaused?h('span',{className:'bf-scene-motion'},__alloT('stem.butterfly.bar_readout_all_paused','All motion paused')):null,feeding?h('div',{className:'bf-eyebrow'},feeding.species==='milkweed'?__alloT('stem.butterfly.hud_species_milkweed','Common milkweed'):__alloT('stem.butterfly.hud_species_bergamot','Wild bergamot')):watching?h('div',{className:'bf-eyebrow'},specimen.name):detail?h('div',{className:'bf-eyebrow'},__alloFill(__alloT('stem.butterfly.hud_field_lens_species','Field lens · {value1}'),{value1:detail.species})):null,h('strong',null,watchingPollinators?watchedSpecies.name:feeding?feedingStep.title:watching?specimenStage.ordinal+' · '+specimenStage.name:detail?detail.part:landed?__alloFill(__alloT('stem.butterfly.hud_landed_at','Landed · {value1}'),{value1:landed.name}):s.target?__alloFill(__alloT('stem.butterfly.hud_guided_flight','Guided flight · {value1}'),{value1:patch(s.target,s).name}):s.paused?(near.distance<=14?__alloFill(__alloT('stem.butterfly.hud_ready_to_land','Ready to land · {value1}'),{value1:near.plant.name}):__alloT('stem.butterfly.hud_ready','Ready when you are')):__alloT('stem.butterfly.hud_exploring','Exploring the meadow')),h('small',{ref:watchingPollinators?watchCaption:null},watchingPollinators?__alloT('stem.butterfly.watch_caption','A quiet moment with a meadow visitor'):feeding?__alloT('stem.butterfly.hud_feed_caption','Enlarged nectar and pollen cues · same-species flowers'):watching?(specimen.recorded?__alloT('stem.butterfly.hud_life_recorded','Recorded generation · review'):specimen.blocked?__alloT('stem.butterfly.hud_life_blocked','No milkweed food here'):__alloT('stem.butterfly.hud_life_caption','One enlarged specimen · time compressed')):detail?(detail.present?__alloT('stem.butterfly.hud_resource_present','Resource present'):__alloT('stem.butterfly.hud_resource_absent','Resource absent'))+' · '+(detail.kind==='flowers'?__alloT('stem.butterfly.hud_resource_adult_nectar','Adult nectar'):__alloT('stem.butterfly.hud_resource_host_leaves','Monarch host leaves')):landed?(recorded?__alloT('stem.butterfly.hud_landed_recorded','Evidence recorded. Look closer, or choose your next habitat.'):__alloT('stem.butterfly.hud_landed_compare','Compare flowers and leaves above, then examine this patch.')):near.distance<=14?__alloT('stem.butterfly.hud_within_range','Within landing range · Land here to investigate'):__alloFill(__alloT('stem.butterfly.hud_distance_away','{value1} · {value2} scene units away'),{value1:near.plant.name,value2:Math.round(near.distance)}))),flightPadControls())),
        habitatMapVisible?h('section',{className:'bf-map-key','aria-labelledby':'bf-map-key-title'},h('h3',{id:'bf-map-key-title'},__alloT('stem.butterfly.map_key_title','Habitat map key')),h('p',{className:'bf-help'},__alloT('stem.butterfly.map_key_help','Numbers identify the habitats. Use the habitat controls to fly or visit without flying.')),h('ol',{role:'list'},habitats(s).map(function(p,index){return h('li',{key:p.id,'data-map-place':p.id},h('span',{className:'bf-map-number'},index+1),h('div',null,h('strong',null,p.name),h('small',null,evidenceRecorded(s,p)?__alloT('stem.butterfly.hud_place_examined','✓ examined'):__alloT('stem.butterfly.hud_place_not_examined','not examined yet'))));}))):null,
        feeding?h('section',{className:'bf-feed-watch bf-life-watch','aria-label':__alloT('stem.butterfly.a11y_feeding_and_pollination_observation', 'Feeding and pollination observation')},
          h('div',{className:'bf-life-watch-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.fw_eyebrow','A flower visit, up close')),h('h3',null,feedingStep.title)),h('span',{className:'bf-life-stage-label'},({sip:'01',carry:'02',deposit:'03'})[feedingStep.id]+' / 03')),
          h('ol',{className:'bf-feed-steps','aria-label':__alloT('stem.butterfly.a11y_pollination_sequence', 'Pollination sequence')},[__alloT('stem.butterfly.fw_step_sip','Sip nectar'),__alloT('stem.butterfly.fw_step_carry','Carry pollen'),__alloT('stem.butterfly.fw_step_transfer','Transfer pollen')].map(function(label,i){return h('li',{key:label,'aria-current':['sip','carry','deposit'][i]===feedingStep.id?'step':undefined},label);})),
          h('p',null,feedingStep.note),
          h('p',{className:'bf-help'},feeding.species==='milkweed'?__alloT('stem.butterfly.fw_help_milkweed','Milkweed packages its pollen in paired pollinia. A packet can catch on a leg and enter a receptive slit in another milkweed flower. Compare contact and missed contact in the final step.'):__alloT('stem.butterfly.fw_help_bergamot','Bergamot has tubular flowers. Loose pollen grains can brush onto the butterfly and reach a receptive stigma on another bergamot flower. Compare contact and missed contact in the final step.')),
          h('div',{className:'bf-feed-inspect',role:'group','aria-label':__alloT('stem.butterfly.a11y_flower_visit_views', 'Flower visit views')},h('span',{className:'bf-eyebrow'},__alloT('stem.butterfly.fw_look_closer','Look closer')),['whole','tube','pollen'].map(function(focus){return button(focus==='whole'?__alloT('stem.butterfly.fw_focus_whole','Whole visit'):focus==='tube'?__alloT('stem.butterfly.fw_focus_tube','Drinking tube close-up'):__alloT('stem.butterfly.fw_focus_pollen','Pollen close-up'),function(){focusFeed(focus);},{key:focus,'aria-pressed':feedMotion.current.focus===focus});})),
          h('div',{className:'bf-feed-playback'},h('label',{className:'bf-feed-scrub'},h('span',null,__alloT('stem.butterfly.fw_visit_progress','Visit progress'),h('output',{'aria-live':'off'},Math.floor(feedMotion.current.progress*100+1e-6)+'%')),h('input',{type:'range',min:0,max:100,step:1,value:Math.floor(feedMotion.current.progress*100+1e-6),'aria-label':__alloT('stem.butterfly.a11y_visit_progress', 'Visit progress'),'aria-describedby':'bf-feed-progress-help','aria-valuetext':__alloFill(__alloT('stem.butterfly.fw_progress_valuetext','{value1}% of {value2}'),{value1:Math.floor(feedMotion.current.progress*100+1e-6),value2:feedingStep.title}),onChange:seekFeed,onPointerDown:pauseFeed})),
            h('label',{className:'bf-feed-speed'},__alloT('stem.butterfly.fw_playback_speed','Playback speed'),h('select',{'aria-label':__alloT('stem.butterfly.a11y_playback_speed', 'Playback speed'),value:feedMotion.current.speed,onChange:speedFeed},h('option',{value:.5},__alloT('stem.butterfly.fw_speed_half','Half speed')),h('option',{value:1},__alloT('stem.butterfly.fw_speed_normal','Normal speed')),h('option',{value:2},__alloT('stem.butterfly.fw_speed_double','Double speed'))))),
          feedingStep.id==='deposit'?h('fieldset',{className:'bf-feed-contact',tabIndex:-1,'aria-describedby':'bf-pollination-saved-summary'},h('legend',null,__alloT('stem.butterfly.fw_contact_legend','Does the pollen make contact?')),h('p',{className:'bf-help'},__alloT('stem.butterfly.fw_contact_help','Compare the receptive surface in or outside the pollen path. Both flowers are the same plant species.')),h('div',null,button(__alloT('stem.butterfly.fw_contact_touches','Touches receptive surface'),function(){contactFeed(true);},{'aria-pressed':feedMotion.current.contact}),button(__alloT('stem.butterfly.fw_contact_misses','Misses receptive surface'),function(){contactFeed(false);},{'aria-pressed':!feedMotion.current.contact}))):null,
          h('section',{className:'bf-feed-result','aria-label':__alloT('stem.butterfly.a11y_pollen_transfer_result', 'Pollen transfer result')},h('div',{className:'bf-feed-ledger'},h('p',null,h('span',null,__alloT('stem.butterfly.fw_ledger_butterfly','On the butterfly')),h('strong',null,feedResult.carriedLabel)),h('p',null,h('span',null,__alloT('stem.butterfly.fw_ledger_next_flower','On the next flower')),h('strong',null,feedResult.receivedLabel))),h('p',{className:'bf-help'},feedResult.summary)),
          h('div',{className:'bf-feed-key'},h('span',null,h('i',{'data-cue':'nectar','aria-hidden':true}),__alloT('stem.butterfly.fw_key_nectar','Nectar: liquid food')),h('span',null,h('i',{'data-cue':'pollen','aria-hidden':true}),__alloT('stem.butterfly.fw_key_pollen','Pollen: carried outside')),h('span',null,h('i',{'data-cue':'surface','aria-hidden':true}),__alloT('stem.butterfly.fw_key_surface','Receptive flower surface'))),
          h('div',{className:'bf-life-watch-actions'},feedingStep.id!=='deposit'?button(feedingStep.id==='sip'?__alloT('stem.butterfly.fw_fly_next','Fly to next flower'):__alloT('stem.butterfly.fw_step_transfer','Transfer pollen'),function(event){var keyboard=event.detail===0&&event.currentTarget===document.activeElement,next=feedingStep.id==='sip'?'carry':'deposit';showFeed(next,false);if(next==='deposit'||keyboard)queueSceneFocus();},{className:'bf-primary',disabled:feedMotion.current.progress<1}):null,
            playbackButton(__alloT('stem.butterfly.fw_continue_motion','Continue feeding motion'),continueFeed,{disabled:motionReduced||(!allMotionPaused&&feedMotion.current.playing)||feedMotion.current.progress>=1}),playbackButton(__alloT('stem.butterfly.fw_replay_motion','Replay feeding motion'),function(){resumeMotion();showFeed(feedingStep.id,false);},{disabled:motionReduced||(!allMotionPaused&&feedMotion.current.playing)}),playbackButton(__alloT('stem.butterfly.fw_pause_motion','Pause feeding motion'),pauseFeed,{disabled:motionReduced||allMotionPaused||!feedMotion.current.playing}),playbackButton(__alloT('stem.butterfly.fw_show_still','Show step still'),stillFeed,{disabled:feedMotion.current.progress>=1}),
            button(__alloT('stem.butterfly.fw_restart','Restart flower visit'),function(){showFeed('sip',false,true);}),button(__alloT('stem.butterfly.fw_return_habitat','Return to habitat view'),function(){closeFeed();update();queueSceneFocus();})),
          h('p',{className:'bf-help',id:'bf-feed-progress-help'},motionReduced?__alloT('stem.butterfly.fw_motion_help_reduced','Reduced motion: each step opens still. Drag Visit progress or use its arrow keys to inspect any moment without playback.'):__alloT('stem.butterfly.fw_motion_help','Drag Visit progress to pause at any moment. Continue resumes there; Replay starts the current step again. Each step stops at its endpoint.')),
          feedingStep.id==='deposit'?h('section',{className:'bf-pollination-comparison','aria-label':__alloT('stem.butterfly.a11y_pollination_comparison', 'Pollination comparison')},
            h('div',{className:'bf-pollination-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.fw_note_eyebrow','Keep a field note')),h('h4',null,__alloT('stem.butterfly.fw_note_title','Same flowers. Different contact.'))),button(feedSaved?__alloT('stem.butterfly.fw_visit_recorded','Visit recorded'):__alloT('stem.butterfly.fw_record_visit','Record this flower visit'),recordFeed,{className:'bf-primary',disabled:feedSaved||feedMotion.current.progress!==1})),
            h('p',{className:'bf-help',id:'bf-pollination-saved-summary'},feedPairReady?__alloT('stem.butterfly.fw_record_help_pair','Both contact cases are saved. Replay them or explain your comparison.'):feedSaved?__alloT('stem.butterfly.fw_record_help_saved','This case is saved. Switch contact to inspect and record the other case.'):feedMotion.current.progress!==1?__alloT('stem.butterfly.fw_record_help_finish','Finish this step before recording: move Visit progress to 100% or choose Show step still.'):__alloT('stem.butterfly.fw_record_help_record','Record the completed visit you inspected. Watching and switching contact do not save observations automatically.')),
            h('div',{className:'bf-pollination-cases'},[true,false].map(function(contact){var saved=feedVisits.some(function(row){return row.contact===contact;});return h('div',{key:String(contact),'data-bf-pollination-case':contact?'contact':'miss','data-recorded':String(saved)},h('strong',null,contact?__alloT('stem.butterfly.fw_case_contact','Contact'):__alloT('stem.butterfly.fw_case_miss','Missed contact')),h('span',{className:'bf-pollination-saved'},saved?__alloT('stem.butterfly.fw_case_recorded','Recorded'):__alloT('stem.butterfly.fw_case_not_recorded','Not recorded yet')),h('p',null,saved?(contact?__alloT('stem.butterfly.fw_case_contact_result','Nectar feeding + pollen transfer'):__alloT('stem.butterfly.fw_case_miss_result','Nectar feeding; no pollen transfer')):__alloT('stem.butterfly.fw_case_inspect','Inspect this case, then record what happened.')));})),
            feedPairReady?h('div',{className:'bf-pollination-conclusion'},h('p',null,__alloT('stem.butterfly.fw_conclusion','Both visits included nectar feeding. Only contact transferred pollen to the receptive surface. Feeding and pollination are different events.')),button(__alloT('stem.butterfly.fw_explain','Explain this comparison'),explainPollination)):h('p',{className:'bf-help'},__alloFill(__alloT('stem.butterfly.fw_cases_count','{value1} of 2 cases recorded at this patch. Keep the flowers the same and change only contact.'),{value1:feedVisits.length})),
            h('p',{className:'bf-help'},__alloT('stem.butterfly.fw_model_note','These are observations of a teaching model. Pollen transfer does not establish whether fertilization or seed development followed.')),
            h('p',{className:'bf-help bf-pollen-fact'},__alloT('stem.butterfly.fw_pollen_fact','Did you know? Butterflies stand high on long, thin legs, so less pollen sticks to them than to bees, which gather pollen on purpose. Contact is never guaranteed. (USDA Forest Service)'))):null,
          h('p',{className:'bf-help'},__alloT('stem.butterfly.fw_scale_note','Flower structures, pollen, and time are enlarged or simplified so you can follow them. The contact comparison illustrates one cause of transfer; it does not predict seed production. Nectar is shown turquoise; yellow pollen stays outside the drinking tube. Use Record this flower visit to save a pollination observation, or Examine patch to record habitat evidence.'))):null,
        watching?h('section',{className:'bf-life-watch',tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_life_cycle_observation', 'Life cycle observation'),'data-life-stage':specimen.stage},
          h('div',{className:'bf-life-watch-head'},h('div',null,h('div',{className:'bf-eyebrow'},specimen.recorded?__alloT('stem.butterfly.lw_eyebrow_review','Reviewing a recorded generation'):__alloT('stem.butterfly.lw_eyebrow_watch','Watch metamorphosis')),h('h3',null,specimen.title)),h('span',{className:'bf-life-stage-label'},specimenStage.ordinal+' / 04')),
          !specimen.host?h('p',{className:'bf-life-caution'},__alloT('stem.butterfly.lw_caution','This is a model experiment on a non-host patch. Wild monarchs normally lay their eggs on milkweed. The model lets you compare what happens when that food is absent.')):null,
          h('div',{className:'bf-feed-inspect bf-life-inspect',role:'group','aria-label':__alloT('stem.butterfly.a11y_life_cycle_views', 'Life cycle views')},h('span',{className:'bf-eyebrow'},__alloT('stem.butterfly.fw_look_closer','Look closer')),
            button(__alloT('stem.butterfly.lw_focus_context','Plant context'),function(){focusLife('context');},{'aria-pressed':lifeMotion.current.focus==='context'}),button(__alloT('stem.butterfly.lw_focus_specimen','Specimen close-up'),function(){focusLife('specimen');},{'aria-pressed':lifeMotion.current.focus==='specimen'}),button(lifeDetail.detailLabel,function(){focusLife('detail');},{'aria-pressed':lifeMotion.current.focus==='detail'}),larvalMeal.active?button(__alloT('stem.butterfly.lw_focus_feeding','Leaf feeding close-up'),function(){focusLife('feeding');},{'aria-pressed':lifeMotion.current.focus==='feeding'}):null,maturity.active?button(__alloT('stem.butterfly.lw_focus_maturation','Chrysalis maturation close-up'),function(){focusLife('maturation');},{'aria-pressed':lifeMotion.current.focus==='maturation'}):null),
          lifeCanAnimate?h('div',{className:'bf-feed-playback bf-life-playback'},h('label',{className:'bf-feed-scrub'},h('span',null,__alloT('stem.butterfly.lw_progress_label','Stage illustration progress'),h('output',{'aria-live':'off'},Math.floor(lifeMotion.current.progress*100+1e-6)+'%')),h('input',{type:'range',min:0,max:100,step:1,value:Math.floor(lifeMotion.current.progress*100+1e-6),'aria-label':__alloT('stem.butterfly.a11y_stage_illustration_progress', 'Stage illustration progress'),'aria-describedby':'bf-life-progress-help','aria-valuetext':__alloFill(watchingMeal?__alloT('stem.butterfly.lw_valuetext_feeding','{value1}% of the leaf feeding illustration'):watchingMaturation?__alloT('stem.butterfly.lw_valuetext_maturation','{value1}% of the chrysalis appearance illustration'):specimen.stage==='adult'?__alloT('stem.butterfly.lw_valuetext_wings','{value1}% of the wing expansion illustration'):__alloT('stem.butterfly.lw_valuetext_growth','{value1}% of the caterpillar growth illustration'),{value1:Math.floor(lifeMotion.current.progress*100+1e-6)}),onChange:seekLife,onPointerDown:pauseLife})),
            h('label',{className:'bf-feed-speed'},__alloT('stem.butterfly.lw_playback_speed','Stage playback speed'),h('select',{'aria-label':__alloT('stem.butterfly.a11y_stage_playback_speed', 'Stage playback speed'),value:lifeMotion.current.speed,onChange:speedLife},h('option',{value:.5},__alloT('stem.butterfly.fw_speed_half','Half speed')),h('option',{value:1},__alloT('stem.butterfly.fw_speed_normal','Normal speed')),h('option',{value:2},__alloT('stem.butterfly.fw_speed_double','Double speed'))))):null,
          h('section',{className:'bf-life-detail','aria-label':__alloT('stem.butterfly.a11y_stage_inspection_notes', 'Stage inspection notes')},h('strong',null,watchingMaturation?__alloT('stem.butterfly.lw_detail_maturation_title','Watch the chrysalis change'):lifeMotion.current.focus==='detail'||watchingMeal?lifeDetail.title:__alloT('stem.butterfly.lw_detail_notice','What to notice')),h('p',null,watchingMaturation?__alloT('stem.butterfly.lw_detail_maturation_note','Follow changes visible from outside the chrysalis. The folded wing pattern gradually shows through the casing; the rebuilding inside is not shown.'):lifeDetail.note)),
          watchingMeal?h('section',{className:'bf-larval-observation','aria-label':__alloT('stem.butterfly.a11y_caterpillar_feeding_observation', 'Caterpillar feeding observation')},
            h('div',{className:'bf-larval-readout'},h('div',null,h('span',null,__alloT('stem.butterfly.lw_meal_food_source','Food source')),h('strong',null,__alloT('stem.butterfly.lw_meal_milkweed_leaf','Milkweed leaf'))),h('div',null,h('span',null,__alloT('stem.butterfly.lw_meal_leaf_tissue','Leaf tissue')),h('strong',null,larvalTissueLabel(larvalMeal)))),
            h('p',null,larvalObservationNote(larvalMeal)),
            h('div',{className:'bf-life-watch-actions'},button(__alloT('stem.butterfly.lw_meal_before','Before feeding'),function(){showLifeMoment(0);}),button(__alloT('stem.butterfly.lw_meal_after','After feeding'),stillLife)),
            h('p',{className:'bf-help'},__alloT('stem.butterfly.lw_meal_help','Use Continue or Replay to watch feeding, or scrub to compare moments. These enlarged sample bites are separate from the growth view: they do not measure food intake, feeding rate, or development time. Rewinding restores the illustration, not a real leaf.'))):null,
          watchingMaturation?h('section',{className:'bf-maturation-observation','aria-label':__alloT('stem.butterfly.a11y_chrysalis_maturation_observation', 'Chrysalis maturation observation')},
            h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.lw_maturation_eyebrow','An outward change')),h('strong',{className:'bf-maturation-cue'},maturity.label),h('p',null,maturity.note),
            h('div',{className:'bf-life-watch-actions',role:'group','aria-label':__alloT('stem.butterfly.a11y_chrysalis_appearance_comparisons', 'Chrysalis appearance comparisons')},[{label:__alloT('stem.butterfly.lw_moment_green','Green chrysalis'),progress:0},{label:__alloT('stem.butterfly.lw_moment_markings','Wing markings appear'),progress:.6},{label:__alloT('stem.butterfly.lw_moment_before_emergence','Before emergence'),progress:1}].map(function(moment){return button(moment.label,function(){showLifeMoment(moment.progress);},{key:moment.label,'aria-pressed':Math.abs(lifeMotion.current.progress-moment.progress)<.001});})),
            h('p',{className:'bf-help'},__alloT('stem.butterfly.lw_maturation_help','These sample appearances compress time. The percentage locates a moment in this illustration; it is not a measurement of development. Reaching the last view does not hatch or record the butterfly. Choose Watch next stage to continue the model.'))):null,
          h('div',{className:'bf-life-watch-actions'},button(__alloT('stem.butterfly.lw_next_stage','Watch next stage'),nextStage,{className:'bf-primary',disabled:!canAdvance}),button(__alloT('stem.butterfly.lw_record_generation','Record this generation'),recordBrood,{'data-bf-record-generation':'true',disabled:!s.lifecycle.stage||canAdvance}),
            lifeCanAnimate?h(R.Fragment,null,playbackButton(__alloT('stem.butterfly.lw_continue_motion','Continue stage motion'),continueLife,{disabled:motionReduced||(!allMotionPaused&&lifeMotion.current.playing)||lifeMotion.current.progress>=1}),playbackButton(__alloT('stem.butterfly.lw_replay_motion','Replay stage motion'),replayLife,{disabled:motionReduced||(!allMotionPaused&&lifeMotion.current.playing)}),playbackButton(__alloT('stem.butterfly.lw_pause_motion','Pause stage motion'),pauseLife,{disabled:motionReduced||allMotionPaused||!lifeMotion.current.playing}),playbackButton(__alloT('stem.butterfly.lw_show_still','Show stage still'),stillLife,{disabled:lifeMotion.current.progress>=1})):null,
            button(__alloT('stem.butterfly.lw_return_flight','Return to flight view'),function(){closeLife();update();queueSceneFocus();})),
          h('p',{className:'bf-help',id:'bf-life-progress-help'},lifeCanAnimate?(motionReduced?(watchingMeal?__alloT('stem.butterfly.lw_help_reduced_feeding','Reduced motion: this illustration stays still. Drag Stage illustration progress or use its arrow keys to inspect leaf feeding without automatic playback.'):watchingMaturation?__alloT('stem.butterfly.lw_help_reduced_maturation','Reduced motion: this illustration stays still. Drag Stage illustration progress or use its arrow keys to inspect chrysalis appearance without automatic playback.'):__alloT('stem.butterfly.lw_help_reduced_growth','Reduced motion: this illustration stays still. Drag Stage illustration progress or use its arrow keys to inspect growth and wing expansion without automatic playback.')):(watchingMeal?__alloT('stem.butterfly.lw_help_motion_feeding','Drag Stage illustration progress to pause at any moment. Continue resumes there; Replay starts this feeding sequence again. The slider illustrates changes, not elapsed time.'):watchingMaturation?__alloT('stem.butterfly.lw_help_motion_maturation','Drag Stage illustration progress to pause at any moment. Continue resumes there; Replay starts this appearance sequence again. The slider illustrates changes, not elapsed time.'):__alloT('stem.butterfly.lw_help_motion_stage','Drag Stage illustration progress to pause at any moment. Continue resumes there; Replay starts this stage again. The slider illustrates changes, not elapsed time.'))):specimen.blocked?__alloT('stem.butterfly.lw_help_blocked','This caterpillar stays small because it has no milkweed food. Close-ups remain available; there is no growth playback.'):__alloT('stem.butterfly.lw_help_still','This stage is shown still. Use the close-ups to inspect its visible structure; development inside the egg or chrysalis is not shown.')),
          h('p',{className:'bf-help'},__alloT('stem.butterfly.lw_model_note','One specimen represents the generation; sizes are enlarged. Development takes days to weeks, not seconds. Inspection controls do not advance the generation. Next stage changes the model; only Record saves the result.')),
          button(__alloT('stem.butterfly.lw_back','Back to life cycle investigation'),function(){lifeMotion.current.playing=false;jumpTo('cycle');},{className:'bf-life-back'})):null,
        h('div',{className:'bf-toolbar'},button(s.paused||allMotionPaused?__alloT('stem.butterfly.bar_take_flight','Take flight'):__alloT('stem.butterfly.bar_pause_flight','Pause flight'),toggle,{className:'bf-primary','data-bf-play':true}),button(allMotionPaused?__alloT('stem.butterfly.bar_resume_motion','Resume motion'):__alloT('stem.butterfly.bar_pause_all_motion','Pause all motion'),toggleSceneMotion,{'data-bf-motion-toggle':true}),button(__alloT('stem.butterfly.bar_glide','Glide'),toggleGlide,{'data-bf-glide':true,'aria-pressed':s.gliding,disabled:allMotionPaused||s.paused||!!landed}),button(landed?__alloT('stem.butterfly.bar_lift_off','Lift off'):__alloT('stem.butterfly.bar_land_here','Land here'),landing,{disabled:observing||(!landed&&near.distance>14),'aria-describedby':'bf-scene-caption'}),button(__alloT('stem.butterfly.bar_examine_patch','Examine patch'),examine,{disabled:observing||!landed}),h('span',{className:'bf-spacer'}),playbackButton(__alloT('stem.butterfly.bar_map','Map'),function(){setMapMode(!mapMode);},{'aria-pressed':mapMode||renderer!=='three',disabled:renderer!=='three','aria-describedby':renderer!=='three'?'bf-renderer-help':undefined})),
        h('div',{className:'bf-light-controls bf-flight-controls',role:'group','aria-label':__alloT('stem.butterfly.controls_group','Flight controls')},h('span',null,__alloT('stem.butterfly.controls_label','Fly your butterfly')),button(__alloT('stem.butterfly.controls_direct','Butterfly steering'),function(){chooseFlightControls('steer');},{'aria-pressed':s.controlMode==='steer',disabled:observing||watchingPollinators}),button(__alloT('stem.butterfly.controls_map','Map directions'),function(){chooseFlightControls('map');},{'aria-pressed':s.controlMode==='map',disabled:observing||watchingPollinators})),
        h('div',{className:'bf-camera-tools',role:'group','aria-label':__alloT('stem.butterfly.a11y_camera_views','Camera views')},h('span',null,__alloT('stem.butterfly.bar_camera','Camera')),['follow','wing','meadow','pollinators'].map(function(id){return button(id==='follow'?__alloT('stem.butterfly.bar_view_follow','Follow view'):id==='wing'?__alloT('stem.butterfly.bar_view_wing','Wing view'):id==='meadow'?__alloT('stem.butterfly.bar_view_meadow','Meadow view'):__alloT('stem.butterfly.watch_button','Watch pollinators'),function(){chooseView(id);},{key:id,'aria-pressed':!observing&&!detail&&view===id,disabled:mapMode||renderer!=='three'});}),h('small',{className:'bf-flight-readout'},allMotionPaused?__alloT('stem.butterfly.bar_readout_all_paused','All motion paused'):feeding?__alloT('stem.butterfly.bar_readout_feeding','Observing a flower visit'):watching?__alloT('stem.butterfly.bar_readout_life','Observing a generation'):landed?__alloT('stem.butterfly.bar_readout_perched','Perched'):s.paused?__alloT('stem.butterfly.bar_readout_paused','Flight paused'):s.target?__alloT('stem.butterfly.bar_readout_guided','Guided approach'):s.gliding?__alloT('stem.butterfly.bar_readout_gliding','Gliding · gently descending'):Math.hypot(s.vx,s.vz)>.4?__alloT('stem.butterfly.bar_readout_steering','Wingbeats · steering'):__alloT('stem.butterfly.bar_readout_hovering','Hovering'))),
        watchingPollinators?h('div',{className:'bf-watch-panel',role:'group','aria-label':__alloT('stem.butterfly.watch_group','Pollinator watching')},
          h('div',{className:'bf-watch-heading'},h('span',{className:'bf-eyebrow'},__alloT('stem.butterfly.watch_eyebrow','Life among the flowers')),h('strong',{ref:visitorReadout,'aria-live':'off'},__alloT('stem.butterfly.watch_caption','A quiet moment with a meadow visitor'))),
          h('div',{className:'bf-watch-patches'},['milkweed','bergamot'].map(function(id){return button(id==='milkweed'?__alloT('stem.butterfly.watch_milkweed','Milkweed visitors'):__alloT('stem.butterfly.watch_bergamot','Bergamot visitors'),function(){chooseWatchPatch(id);},{key:id,'aria-pressed':!!watchSite&&watchSite.id===id});})),
          h('div',{className:'bf-species-buttons',role:'group','aria-label':__alloT('stem.butterfly.species_picker','Butterfly species')},MEADOW_SPECIES.map(function(species){return button(h(R.Fragment,null,species.name,h('small',null,species.latin)),function(){chooseWatchSpecies(species.id);},{key:species.id,'aria-pressed':watchedSpecies.id===species.id});})),
          h('section',{className:'bf-species-notes','data-bf-species-card':watchedSpecies.id,'aria-labelledby':'bf-species-card-title'},h('p',{id:'bf-species-card-title'},h('strong',null,watchedSpecies.name+' · '),h('em',null,watchedSpecies.latin)),h('p',null,watchedSpecies.marks),h('p',null,h('strong',null,__alloT('stem.butterfly.species_host_label','Caterpillar food: ')),watchedSpecies.hosts),h('a',{href:watchedSpecies.source,target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.species_source','Species field guide'))),
          h('p',null,motionReduced?__alloT('stem.butterfly.watch_reduced','A still close view of a wild visitor. Your butterfly stays where you left it.'):__alloT('stem.butterfly.watch_help','Follow a wild visitor as it flutters, lands, and sips nectar. Your butterfly stays where you left it.'))):null,
        h('div',{className:'bf-light-controls',role:'group','aria-label':__alloT('stem.butterfly.light_group','Meadow lighting')},h('span',null,__alloT('stem.butterfly.light_label','Light')),button(__alloT('stem.butterfly.light_day','Soft daylight'),function(){chooseLight('daylight');},{'aria-pressed':light==='daylight',disabled:mapMode||renderer!=='three'}),button(__alloT('stem.butterfly.light_golden','Golden hour'),function(){chooseLight('golden');},{'aria-pressed':light==='golden',disabled:mapMode||renderer!=='three'})),
        h('div',{className:'bf-sound-controls',role:'group','aria-label':__alloT('stem.butterfly.sound_group','Meadow sounds')},
          h('div',{className:'bf-sound-copy'},h('strong',null,__alloT('stem.butterfly.sound_title','Listen to the meadow')),h('span',{id:'bf-sound-status',role:'status'},soundStatus)),
          button(h(R.Fragment,null,h('svg',{viewBox:'0 0 24 24',width:19,height:19,fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'M11 5 6 9H3v6h3l5 4Z'}),h('path',{d:soundQuiet?'m16 9 6 6m0-6-6 6':'M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14'})),sound.error||!sound.enabled?__alloT('stem.butterfly.sound_enable','Enable meadow sounds'):sound.muted?__alloT('stem.butterfly.sound_unmute','Unmute meadow sounds'):__alloT('stem.butterfly.sound_mute','Mute meadow sounds')),toggleMeadowSound,{disabled:!soundSupported,'aria-describedby':'bf-sound-status','data-bf-sound-toggle':true}),
          h('label',{className:'bf-sound-volume'},h('span',null,__alloT('stem.butterfly.sound_volume_label','Volume')),h('input',{type:'range',min:0,max:100,step:1,value:sound.volume,onChange:changeMeadowVolume,disabled:!soundSupported,'aria-describedby':'bf-sound-status','aria-label':__alloT('stem.butterfly.sound_volume','Meadow volume'),'aria-valuetext':sound.volume+'%'}),h('span',{'aria-hidden':true},sound.volume+'%'))),
        h('p',{className:'bf-help'},motionReduced?__alloT('stem.butterfly.bar_meadow_reduced','Reduced motion keeps the meadow still. Flight and inspection remain available.'):__alloT('stem.butterfly.bar_meadow_motion','The meadow moves even while you rest. Pause all motion or press Space in the scene to freeze everything; press again to resume.')),
        !observing?h('div',{className:'bf-feed-invite bf-life-invite'},h('p',null,landed?(landed.nectar?__alloT('stem.butterfly.fw_invite_nectar','Follow a monarch from a nectar sip to pollen transfer between flowers.'):__alloT('stem.butterfly.fw_invite_mown','This mown patch has no flowers to feed from. Visit milkweed or bergamot to watch pollination.')):__alloT('stem.butterfly.fw_invite_land','Land on milkweed or bergamot to watch feeding and pollination.')),button(__alloT('stem.butterfly.fw_invite_button','Watch feeding & pollination'),function(){showFeed('sip',true);},{disabled:!landed||!landed.nectar})):null,
        h('div',{className:'bf-status-row'},h('div',{className:'bf-status',role:'status','aria-live':'polite'},h('p',{key:statusRevision.current},message)),listen(function(){return message;},__alloT('stem.butterfly.bar_listen_latest_message','latest message'))),
        detail?h('section',{className:'bf-field-card','aria-label':__alloT('stem.butterfly.a11y_field_lens_reading',"Field lens reading")},h('div',{className:'bf-field-head'},h('div',{className:'bf-eyebrow'},detail.kind==='flowers'?__alloT('stem.butterfly.bar_card_flower_lens','Flower lens · Adult stage'):__alloT('stem.butterfly.bar_card_leaf_lens','Leaf lens · Caterpillar stage')),h('span',{className:'bf-resource-tag'},detail.present?__alloT('stem.butterfly.hud_resource_present','Resource present'):__alloT('stem.butterfly.hud_resource_absent','Resource absent'))),h('h3',null,detail.title),h('p',null,detail.note),h('p',{className:'bf-help'},(mapMode||renderer==='map'?__alloT('stem.butterfly.bar_card_map_note','The outlined map patch is the habitat being studied.'):__alloT('stem.butterfly.bar_card_model_note','The ring points to a part of the illustrative plant model.'))+' '+(recorded?__alloT('stem.butterfly.bar_card_recorded','Evidence is already in your journal or planting comparisons.'):__alloT('stem.butterfly.bar_card_examine','Use Examine patch to record this visit.')))):null,
        h('p',{className:'bf-help'},s.gliding?(s.controlMode==='steer'?__alloT('stem.butterfly.bar_direct_glide_help','Gliding continues forward and gently downward after you release the flight pad or keys. Drag sideways or hold A / D or ← / → to turn; drag down or hold S / ↓ to brake. E / Q change height. Press G or turn Glide off for wingbeats, then release the controls to hover. Space pauses everything. Reduced motion keeps the camera steady.'):__alloT('stem.butterfly.bar_map_glide_help','Focus the scene: W A S D or arrows steer, and E / Q change height. Gliding continues forward and gently downward when you release the controls. Press G or turn Glide off to return to wingbeats; Space pauses. Directions follow the map in every camera view.')):s.controlMode==='steer'?__alloT('stem.butterfly.bar_direct_keys_help','Drag the flight pad up to fly, sideways to turn, or down to brake. Release to hover. Or hold W / ↑ to flap forward, A / D or ← / → to turn, and S / ↓ to brake. Release forward to hover. E / Q change height, G glides, and Space pauses everything. The follow camera stays behind you; reduced motion keeps the camera steady.'):__alloT('stem.butterfly.bar_keys_help','Focus the scene: W A S D or arrows steer, E / Q change height, G glides, and Space pauses. Hold a direction to accelerate; release to slow. Directions follow the map in every camera view. Reduced motion keeps a steady camera and still vegetation.')),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.hold_activation_help','Hold a direction button to keep moving. Activating it with voice or switch controls takes one short step, then returns to a hover.')),
        h('div',{className:'bf-touch',role:'group','aria-label':__alloT('stem.butterfly.a11y_flight_direction_controls',"Flight direction controls")},hold(s.controlMode==='steer'?__alloT('stem.butterfly.hold_turn_left','← Turn left'):__alloT('stem.butterfly.bar_hold_left','← Left'),'left',s.controlMode==='steer'?__alloT('stem.butterfly.turn_left_spoken','Turn left'):__alloT('stem.butterfly.bar_hold_left_spoken','Fly left')),hold(s.controlMode==='steer'?__alloT('stem.butterfly.hold_flap_forward','↑ Flap forward'):__alloT('stem.butterfly.bar_hold_forward','↑ Forward'),'forward',s.controlMode==='steer'?__alloT('stem.butterfly.flap_forward_spoken','Flap forward'):__alloT('stem.butterfly.bar_hold_forward_spoken','Fly forward')),hold(s.controlMode==='steer'?__alloT('stem.butterfly.hold_brake','↓ Brake'):__alloT('stem.butterfly.bar_hold_back','↓ Back'),'back',s.controlMode==='steer'?__alloT('stem.butterfly.brake_spoken','Brake'):__alloT('stem.butterfly.bar_hold_back_spoken','Fly back')),hold(s.controlMode==='steer'?__alloT('stem.butterfly.hold_turn_right','→ Turn right'):__alloT('stem.butterfly.bar_hold_right','→ Right'),'right',s.controlMode==='steer'?__alloT('stem.butterfly.turn_right_spoken','Turn right'):__alloT('stem.butterfly.bar_hold_right_spoken','Fly right')),hold(__alloT('stem.butterfly.bar_hold_rise','Rise'),'rise'),hold(__alloT('stem.butterfly.bar_hold_lower','Lower'),'lower')),
        renderer!=='three'?h('p',{className:'bf-help',id:'bf-renderer-help'},renderer==='map'?__alloT('stem.butterfly.bar_3d_unavailable','3D is unavailable. All habitat visits and journal activities work on this map.')+' ':__alloT('stem.butterfly.map_loading','Preparing the 3D meadow. You can use the habitat map while you wait.'),renderer==='map'?button(__alloT('stem.butterfly.bar_retry_3d','Retry 3D'),function(event){s.paused=true;clearFlightInput();if(event.detail===0&&event.currentTarget===document.activeElement)queueSceneFocus();setRetry(retry+1);}):null):null
      ),h('aside',{className:'bf-aside'},
        h('section',{className:'bf-panel','aria-label':__alloT('stem.butterfly.a11y_habitat_destinations',"Habitat destinations")},h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.side_dest_eyebrow','Choose a place to explore')),h('h3',null,__alloT('stem.butterfly.side_dest_title','Explore, then redesign.')),h('p',{className:'bf-help'},__alloT('stem.butterfly.side_dest_help','Choose a patch for guided flight, or visit without flying. Both routes use the same Land here and Examine patch actions.')),habitats(s).map(function(p,i){return h('div',{key:p.id,className:'bf-destination-row','data-habitat':p.id},h('button',{type:'button',className:'bf-destination','aria-pressed':s.target===p.id,onClick:function(){travel(p.id);}},bfIcon(h,p.id==='milkweed'?'host':p.id==='bergamot'?'nectar':p.id==='lawn'?'cut':'plot',44),h('span',null,(evidenceRecorded(s,p)?'✓ ':('0'+(i+1)+' · '))+p.name),h('small',null,p.latin)),button(__alloT('stem.butterfly.side_visit_direct','Visit without flying'),function(){visitDirect(p.id);},{className:'bf-visit-direct','aria-label':__alloT('stem.butterfly.side_visit_direct','Visit without flying')+' · '+p.name}));}),h('div',{className:'bf-meter'},h('label',{htmlFor:'bf-flight-energy',id:'bf-flight-energy-label'},__alloFill(__alloT('stem.butterfly.side_energy_label','Flight energy · {value1}%'),{value1:Math.round(s.energy)})),h('meter',{id:'bf-flight-energy','aria-labelledby':'bf-flight-energy-label',min:0,max:100,value:s.energy,'aria-valuetext':Math.round(s.energy)+'%','aria-describedby':'bf-flight-energy-help'}),h('p',{id:'bf-flight-energy-help'},__alloT('stem.butterfly.side_energy_note','A simplified activity meter. Examine a flowering patch to replenish it.')))),
        h('section',{className:'bf-panel','aria-label':__alloT('stem.butterfly.a11y_field_journal',"Field journal")},h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.side_journal_eyebrow','Reference field journal')),h('h3',null,__alloFill(__alloT('stem.butterfly.side_journal_count','{value1} of 3 patches investigated'),{value1:remaining})),h('div',{className:'bf-progress','aria-hidden':true},PLANTS.map(function(p){return h('i',{key:p.id,'data-done':s.observations.indexOf(p.id)>=0});})),
          remaining?h('ul',{className:'bf-journal'},s.observations.map(function(id){var p=patch(id);return h('li',{key:id},h('strong',null,p.name),h('p',null,p.note));})):h('p',{className:'bf-help'},__alloT('stem.butterfly.side_journal_empty','Record the three reference patches here. Your restoration comparisons appear in the design activity below.'))),
        h('section',{className:'bf-panel bf-pollination-notes','aria-label':__alloT('stem.butterfly.a11y_pollination_field_notes', 'Pollination field notes')},h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.side_poll_eyebrow','Nectar visits · saved observations')),h('h3',null,__alloFill(flowerVisits.length===1?__alloT('stem.butterfly.side_poll_count_one','{value1} flower visit recorded'):__alloT('stem.butterfly.side_poll_count_other','{value1} flower visits recorded'),{value1:flowerVisits.length})),
          flowerVisits.length?h(R.Fragment,null,h('ul',{className:'bf-journal'},flowerVisits.map(function(row){var current=pollinationIsCurrent(s,row),p=patch(row.patch,s);return h('li',{key:row.patch+':'+(row.plan||'')+':'+row.contact,'data-bf-pollination-record':row.patch+':'+(row.plan?row.plan+':':'')+(row.contact?'contact':'miss'),'data-current':String(current)},h('strong',null,p.name),h('span',{className:'bf-pollination-species'},row.species==='milkweed'?__alloT('stem.butterfly.hud_species_milkweed','Common milkweed'):__alloT('stem.butterfly.hud_species_bergamot','Wild bergamot')),row.plan?h('span',{className:'bf-pollination-species'},(current?design(row.plan).short:__alloFill(__alloT('stem.butterfly.side_poll_replanted','{value1} · replanted since'),{value1:design(row.plan).short}))):null,h('p',null,row.contact?__alloT('stem.butterfly.side_poll_contact','Contact: nectar feeding and pollen transfer.'):__alloT('stem.butterfly.side_poll_miss','Missed contact: nectar feeding without pollen transfer.')));})),h('p',{className:'bf-help'},__alloT('stem.butterfly.side_poll_help','Saved model visits can be cited in your notebook. Earlier planting records stay here and in the report.')),button(__alloT('stem.butterfly.side_poll_use','Use pollination evidence'),explainPollination)):
            h('p',{className:'bf-help'},__alloT('stem.butterfly.side_poll_empty','Watch a flower visit, inspect contact and missed contact, then record each completed case. Your saved comparison will appear here.'))))),
      h('nav',{className:'bf-guide',ref:function(node){sections.current.guide=node;},tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_investigation_guide','Investigation guide')},
        h('div',{className:'bf-guide-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.top_guide_eyebrow','Your field investigation')),h('h3',null,__alloT('stem.butterfly.top_guide_title','What helps a monarch habitat work?'))),h('span',{className:'bf-guide-count'},__alloFill(__alloT('stem.butterfly.top_guide_count','{value1} of 5 steps complete'),{value1:journey.completed}))),
        h('div',{className:'bf-mission','data-bf-mission':mission.state},bfIcon(h,'plot',56),h('div',null,h('strong',null,__alloT('stem.butterfly.top_mission_title','Your mission: plan the restoration plot')),mission.state==='supported'?h('span',{className:'bf-mission-stamp'},__alloT('stem.butterfly.top_mission_stamp','✓ Plan backed by your records')):null,
          h('p',null,missionIntro()),
          h('ul',{className:'bf-mission-checks'},mission.checks.map(function(c){return h('li',{key:c.id,'data-done':String(c.done)},h('span',{'aria-hidden':true},c.done?'✓ ':'○ '),c.label);})),
          h('p',{className:'bf-mission-verdict'},mission.summary),
          listen(function(){return __alloFill(__alloT('stem.butterfly.top_mission_listen','Your mission: plan the restoration plot. {value1} {value2} {value3}'),{value1:missionIntro(),value2:mission.checks.map(function(c){return __alloFill(c.done?__alloT('stem.butterfly.top_mission_check_done','Done: {value1}.'):__alloT('stem.butterfly.top_mission_check_todo','Still to do: {value1}.'),{value1:c.label});}).join(' '),value3:mission.summary});},__alloT('stem.butterfly.top_listen_mission','your mission')))),
        h('div',{className:'bf-guide-steps'},journey.steps.map(function(item,i){return button(h(R.Fragment,null,bfIcon(h,GUIDE_ICONS[item.id],34),h('span',null,(i+1)+'. '+item.name),h('small',null,item.progress)),function(){jumpTo(item.id);},{key:item.id,'data-bf-step':item.id,'data-complete':String(item.done),'aria-current':journey.next&&journey.next.id===item.id?'step':undefined});})),
        h('div',{className:'bf-guide-next'},h('p',null,journey.next?journey.next.prompt:__alloT('stem.butterfly.top_guide_done','Your investigation includes observations, comparisons, and your explanation. Review the field report to take it with you.')),button(journey.next?__alloFill(__alloT('stem.butterfly.top_guide_continue','Continue: {value1}'),{value1:journey.next.name}):__alloT('stem.butterfly.top_review_report','Review field report'),function(){jumpTo(journey.next?journey.next.id:'report');},{className:'bf-primary'})),
        h('p',{className:'bf-guide-note'},__alloT('stem.butterfly.top_guide_note','Follow the suggested path or open any investigation. Progress reflects records you made, not a score.'))),
      h('section',{className:'bf-panel bf-design',ref:function(node){sections.current.design=node;},tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_habitat_design_activity',"Habitat design activity")},
        h('div',{className:'bf-design-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.dsg_eyebrow','Your next investigation · Predict → Plant → Observe')),h('h3',null,__alloT('stem.butterfly.dsg_heading','What could this patch become?')),h('p',{className:'bf-help'},plain(__alloT('stem.butterfly.dsg_intro','Redesign the fourth patch and test what it offers a monarch. Each plan shows an established summer planting in bloom; real plants need time to grow.'),__alloT('stem.butterfly.dsg_intro_simple','Choose what to grow in the fourth patch, then go and check what it gives a monarch. (Real plants take time to grow.)')))),h('span',{className:'bf-design-current'},__alloFill(__alloT('stem.butterfly.dsg_in_the_meadow','In the meadow: {value1}'),{value1:design(s.restoration.design).short}))),
        h('div',{className:'bf-design-steps'},h('fieldset',null,h('legend',null,__alloT('stem.butterfly.dsg_step1_choose_plan','1. Choose a planting plan')),h('div',{className:'bf-design-choices'},DESIGNS.map(function(d){return button(h(R.Fragment,null,d.name,h('small',null,d.detail)),function(){choosePlan(d.id);},{key:d.id,id:'bf-design-plan-'+d.id,'aria-pressed':plan===d.id});}))),
          h('div',null,h('label',null,__alloT('stem.butterfly.dsg_step2_predict_resources','2. Predict the resources available'),h('select',{id:'bf-design-guess','aria-describedby':'bf-design-plan-'+plan,value:guess,onChange:function(e){setGuess(e.target.value);}},h('option',{value:''},__alloT('stem.butterfly.dsg_choose_your_prediction','Choose your prediction')),PREDICTIONS.map(function(p){return h('option',{key:p.id,value:p.id},p.label);}))),
            h('div',{className:'bf-design-actions'},button(__alloT('stem.butterfly.dsg_apply_plan','Apply habitat plan'),applyDesign,{className:'bf-primary',disabled:!guess}),button(__alloT('stem.butterfly.dsg_visit_restoration_plot','Visit restoration plot'),function(){travel('restoration');queueSceneFocus('center');})),
            h('p',{className:'bf-help'},s.restoration.prediction?__alloT('stem.butterfly.dsg_help_prediction_saved','Prediction saved. Land at the restoration plot and examine it to record a result.'):__alloT('stem.butterfly.dsg_help_apply_then_visit','Apply a plan, then visit and examine it. Changing plants alone does not count as evidence.')))),
        h('p',{className:'bf-design-feedback'},designFeedback),
        h('table',{className:'bf-comparison'},h('caption',null,__alloFill(__alloT('stem.butterfly.dsg_comparison_caption','Your planting comparisons · {value1} of {value2} examined'),{value1:s.restoration.trials.length,value2:DESIGNS.length})),h('thead',null,h('tr',null,h('th',{scope:'col'},__alloT('stem.butterfly.dsg_col_established_plan','Established plan')),h('th',{scope:'col'},__alloT('stem.butterfly.dsg_col_adult_nectar','Adult nectar')),h('th',{scope:'col'},__alloT('stem.butterfly.dsg_col_host_leaves','Caterpillar host leaves')))),h('tbody',null,DESIGNS.map(function(d){var trial=s.restoration.trials.find(function(t){return t.design===d.id;});return h('tr',{key:d.id,'data-design-record':d.id},h('th',{scope:'row'},d.short),h('td',null,trial?(d.nectar?__alloT('stem.butterfly.dsg_present','Present'):__alloT('stem.butterfly.dsg_absent','Absent')):__alloT('stem.butterfly.dsg_not_examined','Not examined'),trial?h('span',null,__alloFill(__alloT('stem.butterfly.dsg_predicted','Predicted: {value1}'),{value1:prediction(trial.prediction).label})):null),h('td',null,trial?(d.host?__alloT('stem.butterfly.dsg_present','Present'):__alloT('stem.butterfly.dsg_absent','Absent')):__alloT('stem.butterfly.dsg_not_examined','Not examined')));}))),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.dsg_help_comparison_limits','Each row keeps your latest examined plan. Resource availability is one part of habitat quality; this comparison does not estimate butterfly numbers or survival.')),returnToGuide()),
      h('section',{className:'bf-panel bf-cycle',ref:function(node){sections.current.cycle=node;},tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_life_cycle_investigation',"Life cycle investigation"),'data-bf-cycle-patch':s.lifecycle.patch||'','data-bf-cycle-stage':s.lifecycle.stage||''},
        h('div',{className:'bf-cycle-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.cyc_eyebrow','Follow a generation · Predict → Lay → Observe')),h('h3',null,__alloT('stem.butterfly.cyc_heading','What happens to the next generation here?')),h('p',{className:'bf-help'},plain(__alloT('stem.butterfly.cyc_intro','You fly the adult. Place eggs on a patch you have already examined, then follow the generation one stage at a time and see how far it gets.'),__alloT('stem.butterfly.cyc_intro_simple','You are the adult butterfly. Lay eggs on a patch you have examined. Then watch what happens, one stage at a time.')))),
          h('span',{className:'bf-cycle-current'},!cycleSite?__alloT('stem.butterfly.cyc_no_generation_started','No generation started'):s.lifecycle.stage?__alloFill(__alloT('stem.butterfly.cyc_generation_at','Generation at: {value1}'),{value1:cycleSite.name}):__alloFill(__alloT('stem.butterfly.cyc_last_followed','Last followed: {value1}'),{value1:cycleSite.name}))),
        h('div',{className:'bf-life-invite'},h('p',null,specimen?__alloFill(__alloT('stem.butterfly.cyc_invite_look_closely','Look closely at the {value1} on {value2}. The camera follows this generation, wherever your flying adult is.'),{value1:specimenStage.inline,value2:specimen.name}):__alloT('stem.butterfly.cyc_invite_after_laying','After you lay eggs, a close-up will show the followed specimen on its plant. Watch it hatch, grow, pupate, and emerge one step at a time.')),button(__alloT('stem.butterfly.cyc_watch_on_plant','Watch on plant'),function(){showLife(false,true);},{disabled:!specimen})),
        h('div',{className:'bf-cycle-steps'},
          h('div',null,h('label',{htmlFor:'bf-egg-site'},__alloT('stem.butterfly.cyc_step1_where_to_lay','1. Choose where to lay eggs')),
            h('select',{id:'bf-egg-site','aria-describedby':'bf-egg-site-help',value:eggSite,onChange:function(e){setEggSite(e.target.value);},disabled:!!s.lifecycle.stage},
              h('option',{value:''},__alloT('stem.butterfly.cyc_choose_a_patch','Choose a patch')),
              habitats(s).map(function(p){return h('option',{key:p.id,value:p.id,disabled:!evidenceRecorded(s,p)},evidenceRecorded(s,p)?p.name:__alloFill(__alloT('stem.butterfly.cyc_patch_examine_first','{value1} · examine first'),{value1:p.name}));})),
            h('p',{className:'bf-help',id:'bf-egg-site-help'},__alloT('stem.butterfly.cyc_help_only_recorded','Only patches with recorded evidence are available. Examine a patch to unlock it.'))),
          h('div',null,h('label',{htmlFor:'bf-brood-guess'},__alloT('stem.butterfly.cyc_step2_predict_how_far','2. Predict how far it gets')),
            h('select',{id:'bf-brood-guess',value:broodGuess,onChange:function(e){setBroodGuess(e.target.value);},disabled:!!s.lifecycle.stage},
              h('option',{value:''},__alloT('stem.butterfly.dsg_choose_your_prediction','Choose your prediction')),
              OUTCOMES.map(function(o){return h('option',{key:o.id,value:o.id},o.label);})),
            h('div',{className:'bf-cycle-actions'},
              button(__alloT('stem.butterfly.cyc_lay_eggs_here','Lay eggs here'),startBrood,{className:'bf-primary',disabled:!eggSite||!broodGuess||!!s.lifecycle.stage}),
              button(__alloT('stem.butterfly.cyc_next_stage','Next stage'),nextStage,{disabled:!s.lifecycle.stage||!canAdvance}),
              button(__alloT('stem.butterfly.cyc_record_result','Record result'),recordBrood,{'data-bf-record-generation':'true',disabled:!s.lifecycle.stage||canAdvance}),
              button(__alloT('stem.butterfly.cyc_start_over','Start over'),dropBrood,{disabled:!s.lifecycle.stage})),
            h('p',{className:'bf-help'},s.lifecycle.stage?__alloT('stem.butterfly.cyc_help_follow_to_end','Follow the generation to the end, then record what happened.'):__alloT('stem.butterfly.cyc_help_laying_no_change','Laying eggs does not change the plants. What the generation can do depends on what is already growing there.')))),
        h('ol',{className:'bf-track'},STAGES.map(function(st,i){
          // While a generation runs the track follows its current stage. Once the
          // result is recorded the stage clears, so the track shows the finished
          // outcome instead of blanking just as the learner reads it.
          var done=!s.lifecycle.stage&&cycleSite&&broodFor(s,cycleSite.id);
          var edge=done?reachedStage(cycleSite):STAGES.findIndex(function(x){return x.id===s.lifecycle.stage;});
          var reached=!!cycleSite&&i<=edge;
          var state=!cycleSite||(!s.lifecycle.stage&&!done)?'idle':st.id===s.lifecycle.stage?'current':reached?stageStatus(cycleSite,i)==='thriving'?'reached':'blocked':'idle';
          return h('li',{key:st.id,'data-state':state,'data-stage':st.id},bfIcon(h,st.id,44),h('b',null,st.ordinal+' · '+st.name),
            h('small',null,cycleSite&&reached?(stageStatus(cycleSite,i)==='thriving'?st.thriving:st.failing):st.caption),
            state==='current'?h('span',{className:'bf-track-tag'},__alloT('stem.butterfly.cyc_track_now','Now')):null);
        })),
        h('p',{className:'bf-cycle-feedback'},cycleFeedback),
        h('table',{className:'bf-broods'},h('caption',null,__alloFill(__alloT('stem.butterfly.cyc_broods_caption','Generations you have followed · {value1} recorded'),{value1:s.lifecycle.broods.length})),
          h('thead',null,h('tr',null,h('th',{scope:'col'},__alloT('stem.butterfly.cyc_col_patch','Patch')),h('th',{scope:'col'},__alloT('stem.butterfly.cyc_col_you_predicted','You predicted')),h('th',{scope:'col'},__alloT('stem.butterfly.cyc_col_what_happened','What happened')))),
          h('tbody',null,habitats(s).map(function(p){var b=broodFor(s,p.id);
            // A row from an earlier planting is named rather than dropped, so a
            // learner who replanted can see their earlier work was not lost.
            var stale=!b&&p.id==='restoration'?broodRowsFor(s,p.id)[0]:null;
            return h('tr',{key:p.id,'data-brood-record':p.id,'data-brood-current':String(!stale)},
              h('th',{scope:'row'},p.name,stale?h('span',null,__alloFill(__alloT('stem.butterfly.cyc_replanted_since','{value1} · replanted since'),{value1:design(stale.plan).short})):null),
              h('td',null,b?outcome(b.prediction).label:__alloT('stem.butterfly.cyc_not_followed','Not followed')),
              h('td',null,b?outcome(b.result).label:__alloT('stem.butterfly.cyc_not_followed','Not followed'),b?h('span',null,b.prediction===b.result?__alloT('stem.butterfly.cyc_matched_your_prediction','Matched your prediction'):__alloT('stem.butterfly.cyc_differed_from_your_prediction','Differed from your prediction')):null));}))),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.cyc_help_stages_not_timed','Stages are developmental steps, not a timed simulation. This activity shows whether a patch offers what each stage needs; it does not model how many eggs survive, weather, predators, or disease.')),returnToGuide()),
      h('section',{className:'bf-panel bf-season',ref:function(node){sections.current.season=node;},tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_mowing_and_timing_investigation',"Mowing and timing investigation"),'data-bf-season-patch':seasonSite||'','data-bf-season-mowing':mowPlan},
        h('div',{className:'bf-season-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.ssn_eyebrow','Time the mowing · Predict → Run → Compare')),h('h3',null,__alloT('stem.butterfly.ssn_heading','Does it matter WHEN the patch is cut?')),
          h('p',{className:'bf-help'},plain(__alloT('stem.butterfly.ssn_intro','A patch can hold the right plants and still lose the generation, if it is cut before a stage gets to use them. Run one patch under different mowing plans and compare.'),__alloT('stem.butterfly.ssn_intro_simple','A patch can have the right plants and still fail if it is mowed too soon. Try one patch with different mowing plans.')))),
          h('span',{className:'bf-season-current'},__alloFill(__alloT('stem.butterfly.ssn_current_plan','Plan: {value1}'),{value1:mowing(mowPlan).short}))),
        h('div',{className:'bf-season-steps'},
          h('div',null,h('label',{htmlFor:'bf-season-site'},__alloT('stem.butterfly.ssn_step1_choose_examined_patch','1. Choose a patch you have examined')),
            h('select',{id:'bf-season-site','aria-describedby':'bf-season-site-help',value:seasonSite,onChange:function(e){setSeasonSite(e.target.value);setSeasonFeedback('');}},
              h('option',{value:''},__alloT('stem.butterfly.cyc_choose_a_patch','Choose a patch')),
              habitats(s).filter(function(p){return evidenceRecorded(s,p);}).map(function(p){return h('option',{key:p.id,value:p.id},p.name);})),
            h('label',{htmlFor:'bf-season-mow'},__alloT('stem.butterfly.ssn_step2_when_mown','2. Choose when it gets mown')),
            h('select',{id:'bf-season-mow',value:mowPlan,onChange:function(e){setMowPlan(e.target.value);setSeasonFeedback('');}},
              MOWINGS.map(function(m){return h('option',{key:m.id,value:m.id},m.label);}))),
          h('div',null,h('label',{htmlFor:'bf-season-guess'},__alloT('stem.butterfly.ssn_step3_predict','3. Predict what happens to the generation')),
            h('select',{id:'bf-season-guess',value:seasonGuess,onChange:function(e){setSeasonGuess(e.target.value);}},
              h('option',{value:''},__alloT('stem.butterfly.dsg_choose_your_prediction','Choose your prediction')),
              h('option',{value:'complete'},__alloT('stem.butterfly.ssn_opt_runs_whole_cycle','It runs the whole cycle')),
              h('option',{value:'stop'},__alloT('stem.butterfly.ssn_opt_stops_before_adult','It stops before an adult'))),
            h('div',{className:'bf-season-actions'},
              button(__alloT('stem.butterfly.ssn_run_the_season','Run the season'),startSeason,{className:'bf-primary',disabled:!seasonSite||!seasonGuess})),
            h('p',{className:'bf-help',id:'bf-season-site-help'},seasonSite?__alloT('stem.butterfly.ssn_help_run_no_change','Running a season does not change the plants. It only asks whether the plot is still standing when each stage needs it.'):__alloT('stem.butterfly.ssn_help_examine_first','Examine a patch in the meadow first. You can only run a season where you know what is growing.')))),
        seasonTimeline(h,seasonPatch,mowPlan,seasonRevealed),
        // Before a run the track shows only the plan (is the plot still standing
        // that week?). Whether each stage found what it needed is the RESULT, so
        // it appears once the learner has predicted and run this exact season.
        seasonView?h('ol',{className:'bf-weeks',tabIndex:-1,'aria-describedby':'bf-season-result-feedback','aria-label':__alloT('stem.butterfly.a11y_stage_by_stage_through_the_season',"Stage by stage through the season")},seasonView.steps.map(function(x){
          var state=!seasonRevealed?'pending':x.cleared?'cleared':!x.standing?'cut':'missing';
          return h('li',{key:x.id,'data-state':state,'data-stage':x.id},
            bfIcon(h,x.id,40),h('b',null,__alloFill(__alloT('stem.butterfly.ssn_days_range','Days {value1}–{value2}'),{value1:x.start,value2:x.end})),h('strong',null,x.name),
            h('small',null,!seasonRevealed?(x.standing?__alloT('stem.butterfly.ssn_week_still_standing','Still standing through this stage. Run the season to see whether this stage finds what it needs.'):__alloT('stem.butterfly.ssn_week_cut_before_finished','The plot is cut before this stage is finished.')):x.cleared?__alloT('stem.butterfly.ssn_week_cleared','What this stage needs is here and still standing.'):!x.standing?__alloT('stem.butterfly.ssn_week_already_cut','The plot was already cut before this stage finished.'):__alloT('stem.butterfly.ssn_week_nothing_to_use','Nothing here for this stage to use.')));
        })):null,
        h('p',{className:'bf-season-feedback',id:'bf-season-result-feedback'},seasonFeedback),
        h('table',{className:'bf-seasons'},h('caption',null,__alloFill(__alloT('stem.butterfly.ssn_seasons_caption','Seasons you have run · {value1} recorded'),{value1:s.season.runs.length})),
          h('thead',null,h('tr',null,h('th',{scope:'col'},__alloT('stem.butterfly.cyc_col_patch','Patch')),h('th',{scope:'col'},__alloT('stem.butterfly.ssn_col_mowing','Mowing')),h('th',{scope:'col'},__alloT('stem.butterfly.cyc_col_you_predicted','You predicted')),h('th',{scope:'col'},__alloT('stem.butterfly.cyc_col_what_happened','What happened')))),
          h('tbody',null,s.season.runs.length?s.season.runs.map(function(r){var rp=patch(r.patch,s);
            var current=seasonRunIsCurrent(s,r);
            return h('tr',{key:r.patch+'-'+r.mowing+'-'+(r.plan||''),'data-season-record':r.patch+'-'+r.mowing,'data-season-current':String(current)},
              h('th',{scope:'row'},rp?rp.name:r.patch,r.plan?h('span',null,current?design(r.plan).short:__alloFill(__alloT('stem.butterfly.cyc_replanted_since','{value1} · replanted since'),{value1:design(r.plan).short})):null),
              h('td',null,mowing(r.mowing).short),
              h('td',null,r.prediction==='complete'?__alloT('stem.butterfly.ssn_predicted_whole_cycle','Whole cycle'):__alloT('stem.butterfly.ssn_predicted_stops_early','Stops early')),
              h('td',null,r.result==='complete'?__alloT('stem.butterfly.ssn_result_ran_whole_cycle','Ran the whole cycle'):__alloT('stem.butterfly.ssn_result_stopped_early','Stopped early'),
                h('span',null,r.prediction===r.result?__alloT('stem.butterfly.cyc_matched_your_prediction','Matched your prediction'):__alloT('stem.butterfly.cyc_differed_from_your_prediction','Differed from your prediction'))));})
            :h('tr',null,h('td',{colSpan:4},__alloT('stem.butterfly.ssn_no_runs_yet','No seasons run yet.'))))),
        s.season.runs.some(function(r){return !seasonRunIsCurrent(s,r);})?h('p',{className:'bf-help','data-bf-season-stale':'1'},__alloT('stem.butterfly.ssn_stale_rows_note','Rows marked “replanted since” were run on an earlier planting of the restoration plot. They stay here as a record, but they no longer describe what is growing there, so they are not counted as evidence about the plot as it stands now.')):null,
        timingPairs(s).length?h('p',{className:'bf-help','data-bf-timing-pair':'1'},__alloT('stem.butterfly.ssn_timing_pair_note','You have run the same patch under two mowing plans and got two different results. That comparison is what shows timing mattered, not the plants alone.')):null,
        h('p',{className:'bf-help'},__alloT('stem.butterfly.ssn_help_stage_days','Stage days are typical summer timing from Monarch Joint Venture; cool weather slows development, and real mowing dates vary by region. This activity models whether plants are present and still standing — not how many monarchs survive.')),
        h('div',{className:'bf-why bf-real'},h('strong',null,__alloT('stem.butterfly.ssn_real_world_heading','Out in the real world')),h('p',null,plain(__alloT('stem.butterfly.ssn_real_world','Mowers can kill monarch eggs, caterpillars and chrysalises. Monarch Joint Venture advises land managers to avoid mowing habitat while monarchs are present, to mow less often, and not to mow a whole habitat at once.'),__alloT('stem.butterfly.ssn_real_world_simple','Mowers can kill monarch eggs, caterpillars and chrysalises. Experts say: do not mow while monarchs are there, mow less often, and leave some areas unmowed.'))),h('small',null,__alloT('stem.butterfly.ssn_real_world_source','Source: Monarch Joint Venture, mowing and management best practices'))),returnToGuide()),
      h('div',{className:'bf-bottom'},h('section',{className:'bf-panel bf-life-card'},h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.lc_eyebrow','One species · changing needs')),h('h3',null,__alloT('stem.butterfly.lc_heading','A life beyond the wings')),
        h('div',{className:'bf-life-panel'},lifeWheel(h,s.lifecycle.stage,null),
          h('ol',{className:'bf-uses'},STAGES.map(function(st){return h('li',{key:st.id,'data-you':String(st.id==='adult')},bfIcon(h,st.id,42),h('div',null,h('b',null,st.ordinal+' · '+st.name),h('span',null,STAGE_USES[st.id])));}))),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.lc_help_you_play_adult','You play the adult stage. Follow a generation in the investigation above to see which patches can support the other three.')),
        h('div',{className:'bf-why'},h('strong',null,__alloT('stem.butterfly.lc_why_milkweed_heading','Why only milkweed?')),h('p',null,plain(__alloT('stem.butterfly.lc_why_milkweed','Milkweed holds bitter poisons called cardenolides. Monarch caterpillars store them in their bodies, and the adult butterflies keep them, so monarchs taste bad to many birds. Their bright colors are a warning: a bird that tastes one learns to avoid monarchs after that.'),__alloT('stem.butterfly.lc_why_milkweed_simple','Milkweed has a bitter poison. Caterpillars keep the poison in their bodies, even after they become butterflies, so many birds learn that monarchs taste bad. Their bright colors help birds remember.'))),h('small',null,__alloT('stem.butterfly.lc_why_milkweed_source','Source: Monarch Joint Venture, “Why milkweed?”'))),
        h('ul',{className:'bf-facts'},FIELD_FACTS.map(function(f){return h('li',{key:f.id,'data-fact':f.id},h('b',null,f.label),h('span',null,f.text));})),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.lc_facts_source_note','Facts from Monarch Joint Venture and Monarch Watch, listed under Science notes & sources.')),
        listen(function(){return STAGES.map(function(st){return st.name+': '+STAGE_USES[st.id];}).join(' ')+' '+__alloT('stem.butterfly.lc_why_milkweed_heading','Why only milkweed?')+' '+plain(__alloT('stem.butterfly.lc_listen_why_milkweed','Milkweed holds bitter poisons called cardenolides. Monarch caterpillars store them in their bodies, and the adult butterflies keep them, so monarchs taste bad to many birds.'),__alloT('stem.butterfly.lc_listen_why_milkweed_simple','Milkweed has a bitter poison. Caterpillars keep the poison in their bodies, even after they become butterflies, so many birds learn that monarchs taste bad.'))+' '+FIELD_FACTS.map(function(f){return f.label+'. '+f.text;}).join(' ');},__alloT('stem.butterfly.lc_listen_what','the life cycle and facts'))),
        h('section',{className:'bf-panel bf-question','aria-label':__alloT('stem.butterfly.a11y_habitat_evidence_question',"Habitat evidence question"),'data-bf-claim':pickedClaim||''},h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.q_eyebrow','Make sense of your evidence')),h('h3',null,__alloT('stem.butterfly.q_heading','Which claim does your evidence support?')),
          h('p',{className:'bf-help'},plain(__alloT('stem.butterfly.q_intro','Choose a claim. The lab does not tell you which is right on its own authority — it shows you which of your own records bear on it.'),__alloT('stem.butterfly.q_intro_simple','Pick a claim. The lab will not just tell you the answer. It shows which of your records can help you decide.'))),
          CLAIMS.map(function(c){return button(c.label,function(){writeNotebook({claim:c.id});setAnswer('');},{key:c.id,'aria-pressed':pickedClaim===c.id});}),
          verdict?h('div',{className:'bf-verdict','data-bf-tested':String(verdict.tested)},
            h('strong',null,verdict.verdict),h('p',null,verdict.why),
            verdict.evidence.lines.length?h(R.Fragment,null,h('p',{className:'bf-eyebrow'},__alloT('stem.butterfly.q_from_your_records','From your records')),
              h('ul',{className:'bf-evidence'},verdict.evidence.lines.map(function(line,i){return h('li',{key:i,'data-evidence':line.kind},line.text);}))
            ):h('p',{className:'bf-help'},__alloT('stem.butterfly.q_nothing_recorded_yet','You have not recorded anything yet. Examine a patch to begin.'))):null,
          h('div',{role:'status','aria-live':'polite'},answer||(verdict?verdict.verdict+' '+verdict.why:'')))),
      h('section',{className:'bf-panel bf-notebook',ref:function(node){sections.current.notebook=node;},tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_investigation_notebook','Investigation notebook')},
        h('div',{className:'bf-notebook-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.nb_eyebrow','Claim · Evidence · Reasoning')),h('h3',null,__alloT('stem.butterfly.nb_heading','Make the evidence your own')),h('p',{className:'bf-help'},plain(__alloT('stem.butterfly.nb_intro','Your notes save with this lab and appear in the field report. Explain what you think; the lab does not grade your writing.'),__alloT('stem.butterfly.nb_intro_simple','Your notes are saved and go in your field report. Write what you think. The lab does not grade your writing.')))),
          h('span',{className:'bf-notebook-status',role:'status','aria-live':'polite','aria-atomic':true,'data-bf-notebook-ready':String(notebookReady(s))},h('span',{className:'bf-sr'},__alloT('stem.butterfly.nb_status_context','Notebook: ')),notebookReady(s)?__alloT('stem.butterfly.nb_status_conclusion_assembled','Conclusion assembled'):__alloT('stem.butterfly.nb_status_work_in_progress','Work in progress'))),
        h('div',{className:'bf-notebook-grid'},h('div',null,
          h('label',{htmlFor:'bf-notebook-claim'},__alloT('stem.butterfly.nb_step1_choose_claim','1. Choose a claim to investigate')),
          h('select',{id:'bf-notebook-claim',value:notebook.claim,onChange:function(e){writeNotebook({claim:e.target.value});}},h('option',{value:''},__alloT('stem.butterfly.nb_choose_a_claim','Choose a claim')),CLAIMS.map(function(c){return h('option',{key:c.id,value:c.id},c.label);})),
          h('label',{htmlFor:'bf-notebook-interpretation'},__alloT('stem.butterfly.nb_step2_records_suggest','2. What do your records suggest?')),
          h('select',{id:'bf-notebook-interpretation',value:notebook.interpretation,onChange:function(e){writeNotebook({interpretation:e.target.value});}},h('option',{value:''},__alloT('stem.butterfly.nb_choose_interpretation','Choose your interpretation')),INTERPRETATIONS.map(function(item){return h('option',{key:item.id,value:item.id},item.label);})),
          verdict?h('div',{className:'bf-notebook-check'},h('strong',null,verdict.tested?__alloT('stem.butterfly.nb_check_model_evidence_available','Model evidence is available for this claim'):__alloT('stem.butterfly.nb_check_keep_investigating','Keep investigating this claim')),h('p',null,verdict.why)):null,
          h('fieldset',{ref:citationTarget,tabIndex:-1,'aria-describedby':'bf-citation-help bf-citation-count'},h('legend',null,__alloT('stem.butterfly.nb_step3_cite_records','3. Cite records from your investigation')),h('p',{className:'bf-help',id:'bf-citation-help'},__alloT('stem.butterfly.nb_help_cite_records','Select at least two records to compare (up to eight). Only evidence you actually recorded is offered.')),
            h('p',{className:'bf-help',id:'bf-citation-count'},__alloFill(__alloT('stem.butterfly.nb_citation_count','{value1} of 8 citations selected.'),{value1:notebook.evidence.length})+(notebook.evidence.length>=8?' '+(citations.missing.length?__alloT('stem.butterfly.nb_citation_limit_review','Remove unavailable citations or uncheck a citation to choose another.'):__alloT('stem.butterfly.nb_citation_limit_clear','Uncheck a citation to choose another.')):'')),
            citations.available.length?h('div',{className:'bf-citation-list'},citations.available.map(function(line){var checked=notebook.evidence.indexOf(line.id)>=0;return h('label',{className:'bf-citation',key:line.id},h('input',{type:'checkbox',checked:checked,disabled:!checked&&notebook.evidence.length>=8,'data-bf-citation':line.id,onChange:function(e){writeNotebook({evidence:e.target.checked?notebook.evidence.concat([line.id]):notebook.evidence.filter(function(id){return id!==line.id;})});}}),h('span',null,h('small',null,line.kind==='patch'?__alloT('stem.butterfly.nb_kind_patch_observation','Patch observation'):line.kind==='brood'?__alloT('stem.butterfly.nb_kind_generation_result','Generation result'):line.kind==='season'?__alloT('stem.butterfly.nb_kind_season_result','Season result'):line.kind==='pollination'?__alloT('stem.butterfly.nb_kind_model_flower_visit','Model flower visit'):__alloT('stem.butterfly.nb_kind_timing_comparison','Timing comparison')),line.text));})):h('p',{className:'bf-help'},__alloT('stem.butterfly.nb_no_records_yet','No records yet. Examine a patch or record a completed flower visit to begin.')),
            citations.missing.length?h('div',{className:'bf-notebook-review',role:'status'},citations.missing.length===1?__alloT('stem.butterfly.nb_missing_citations_one','1 cited record no longer describes the current planting. Earlier results remain in your field report; choose current records for this explanation.'):__alloFill(__alloT('stem.butterfly.nb_missing_citations_other','{value1} cited records no longer describe the current planting. Earlier results remain in your field report; choose current records for this explanation.'),{value1:citations.missing.length}),button(__alloT('stem.butterfly.nb_remove_unavailable_citations','Remove unavailable citations'),function(){citationFocus.current=true;writeNotebook({evidence:citations.selected.map(function(line){return line.id;})});})):null)),
          h('div',null,h('label',{htmlFor:'bf-notebook-reasoning'},__alloT('stem.butterfly.nb_step4_connect_evidence','4. How does the evidence connect to your claim?')),
            h('p',{className:'bf-help',id:'bf-notebook-writing-help'},__alloT('stem.butterfly.nb_writing_frame','Try: “When I compared … with …, I noticed … . This supports / challenges my claim because … .”')),
            h('textarea',{id:'bf-notebook-reasoning',rows:7,maxLength:1600,value:notebook.reasoning,'aria-describedby':'bf-notebook-writing-help bf-notebook-reasoning-count',onChange:function(e){writeNotebook({reasoning:e.target.value});}}),
            h('p',{className:'bf-writing-count',id:'bf-notebook-reasoning-count'},__alloFill(__alloT('stem.butterfly.nb_count_reasoning','{value1} / 1600 characters'),{value1:notebook.reasoning.length})),
            h('label',{htmlFor:'bf-notebook-question'},__alloT('stem.butterfly.nb_step5_next_question','5. What would you investigate next? (optional)')),
            h('textarea',{id:'bf-notebook-question','aria-describedby':'bf-notebook-question-count',rows:3,maxLength:600,value:notebook.question,onChange:function(e){writeNotebook({question:e.target.value});}}),
            h('p',{className:'bf-writing-count',id:'bf-notebook-question-count'},__alloFill(__alloT('stem.butterfly.nb_count_question','{value1} / 600 characters'),{value1:notebook.question.length})),
            h('p',{className:'bf-help'},__alloT('stem.butterfly.nb_help_completed_notebook','A completed notebook means you have assembled an explanation, not that the model has proved your idea. Include what your comparison can and cannot show.')),
            button(__alloT('stem.butterfly.nb_review_field_report','Review my field report'),function(){jumpTo('report');},{className:'bf-primary'}))),returnToGuide()),
      h('section',{className:'bf-panel bf-cases',ref:function(node){sections.current.cases=node;},tabIndex:-1,'aria-labelledby':'bf-cases-title','data-bf-cases-checked':String(practice.checked)},
        h('div',{className:'bf-cases-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.cs_eyebrow','Apply it · Six new places')),h('h3',{id:'bf-cases-title'},__alloT('stem.butterfly.cs_heading','Where would the generation stop?')),
          h('p',{className:'bf-help'},plain(__alloT('stem.butterfly.cs_intro','Each card names what grows in a place you have not visited and when it is mown. Work out what each stage would find there, predict where a monarch generation stops and why, then check with the lab’s model. These are practice cases, not evidence about this meadow.'),__alloT('stem.butterfly.cs_intro_simple','Each card is a new place. Read what grows there and when it is mowed. Guess where the monarch life cycle stops and why, then check. These are for practice, not evidence about this meadow.')))),
          h('span',{className:'bf-cases-score'},__alloFill(__alloT('stem.butterfly.cs_score','{value1} of {value2} checked · {value3} matched'),{value1:practice.checked,value2:practice.total,value3:practice.matched}))),
        h('div',{className:'bf-case-grid'},CASES.map(function(c){
          var a=caseAnswers[c.id],d=caseDraft[c.id]||{},fb=a?caseFeedback(c,a):null;
          return h('article',{key:c.id,className:'bf-case','aria-labelledby':'bf-case-title-'+c.id,ref:function(node){caseNodes.current[c.id]=node;},'data-case':c.id,'data-checked':String(!!a),'data-matched':fb?String(fb.matched):''},
            h('h4',{id:'bf-case-title-'+c.id},c.title),h('p',null,c.scene),listen(__alloFill(__alloT('stem.butterfly.cs_listen_case','{value1}. {value2} Mowing plan: {value3}.'),{value1:c.title,value2:c.scene,value3:mowing(c.mowing).label}),c.title),
            h('div',{className:'bf-case-species'},caseSpecies(c).map(function(name){return h('span',{key:name},name);}),h('span',{key:'mow'},mowing(c.mowing).label)),
            a?h(R.Fragment,null,
              h('div',{className:'bf-case-result',tabIndex:-1,role:'region','aria-label':__alloFill(__alloT('stem.butterfly.cs_result_name','Model feedback · {value1}'),{value1:c.title}),'data-matched':String(fb.matched)},h('strong',null,fb.matched?__alloT('stem.butterfly.cs_result_matches_model','✓ Your reasoning matches the model'):fb.stopRight?__alloT('stem.butterfly.cs_result_right_stage_different_reason','Right stage, different reason'):__alloT('stem.butterfly.cs_result_model_differs','The model shows something different')),
                h('p',null,__alloFill(__alloT('stem.butterfly.cs_you_said','You said: {value1} — {value2}.'),{value1:caseStop(a.stop).inline,value2:caseReason(a.reason).inline})),h('p',null,fb.stopRight?fb.explain:(function(stop){
                  // One whole sentence per model outcome, so translators never see a bare stage id.
                  var whole={complete:__alloT('stem.butterfly.cs_model_whole_cycle_runs','In the model the whole cycle runs. {value1}'),egg:__alloT('stem.butterfly.cs_model_stops_at_egg','In the model it stops at the egg stage. {value1}'),caterpillar:__alloT('stem.butterfly.cs_model_stops_at_caterpillar','In the model it stops at the caterpillar stage. {value1}'),chrysalis:__alloT('stem.butterfly.cs_model_stops_at_chrysalis','In the model it stops at the chrysalis stage. {value1}'),adult:__alloT('stem.butterfly.cs_model_stops_at_adult','In the model it stops at the adult stage. {value1}')};
                  return Object.prototype.hasOwnProperty.call(whole,stop)?__alloFill(whole[stop],{value1:fb.explain}):__alloFill(__alloT('stem.butterfly.cs_model_stops_at_stage','In the model it stops at the {value1} stage. {value2}'),{value1:stop,value2:fb.explain});
                })(caseAnswer(c).stop))),
              seasonTimeline(h,caseHabitat(c),c.mowing,true,true),
              h('div',{className:'bf-case-actions'},button(h(R.Fragment,null,__alloT('stem.butterfly.cs_try_case_again','Try this case again'),h('span',{className:'bf-sr'},' · '+c.title)),function(){retryCase(c.id);})))
            :h(R.Fragment,null,
              h('label',null,h('span',{id:'bf-case-stop-label-'+c.id},__alloT('stem.butterfly.cs_where_does_it_stop','Where does the generation stop?')),h('select',{'aria-labelledby':'bf-case-stop-label-'+c.id+' bf-case-title-'+c.id,value:d.stop||'',onChange:function(e){draftCase(c.id,'stop',e.target.value);}},h('option',{value:''},__alloT('stem.butterfly.cs_choose_a_stage','Choose a stage')),CASE_STOPS.map(function(x){return h('option',{key:x.id,value:x.id},x.label);}))),
              h('label',null,h('span',{id:'bf-case-reason-label-'+c.id},__alloT('stem.butterfly.cs_why','Why?')),h('select',{'aria-labelledby':'bf-case-reason-label-'+c.id+' bf-case-title-'+c.id,value:d.reason||'',onChange:function(e){draftCase(c.id,'reason',e.target.value);}},h('option',{value:''},__alloT('stem.butterfly.cs_choose_a_reason','Choose a reason')),CASE_REASONS.map(function(x){return h('option',{key:x.id,value:x.id},x.label);}))),
              h('div',{className:'bf-case-actions'},button(h(R.Fragment,null,__alloT('stem.butterfly.cs_check_with_model','Check with the model'),h('span',{className:'bf-sr'},' · '+c.title)),function(){submitCase(c.id);},{className:'bf-primary',disabled:!d.stop||!d.reason}))));
        })),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.cs_help_same_model','The check uses the same stage-by-stage model as the timing investigation: it shows whether each stage finds what it needs in time, not how many monarchs would survive.')),returnToGuide()),
      h('details',{className:'bf-panel bf-glossary','aria-label':__alloT('stem.butterfly.a11y_glossary',"Glossary")},
        h('summary',null,__alloFill(__alloT('stem.butterfly.gl_summary','Glossary · {value1} words used in this lab'),{value1:GLOSSARY.length})),
        h('p',{className:'bf-help'},__alloT('stem.butterfly.gl_help','Each entry says what the word means in general, then how this lab uses it.')),
        h('dl',null,GLOSSARY.map(function(g){
          return h('div',{key:g.id,'data-gloss-term':g.id},
            h('dt',null,g.term),
            h('dd',null,g.definition),
            h('dd',{className:'bf-gloss-here'},g.here));
        }))),
      h('section',{className:'bf-panel bf-report',ref:function(node){sections.current.report=node;},tabIndex:-1,'aria-label':__alloT('stem.butterfly.a11y_field_report',"Field report"),'data-bf-report-copied':copyPending?'pending':copyState||''},
        h('div',{className:'bf-report-head'},h('div',null,h('div',{className:'bf-eyebrow'},__alloT('stem.butterfly.rpt_eyebrow','Take your evidence with you')),h('h3',null,__alloT('stem.butterfly.rpt_heading','Field report')),
          h('p',{className:'bf-help'},reportEmpty?__alloT('stem.butterfly.rpt_help_empty','Your observations, experiments, and notebook writing collect here as text you can copy.'):__alloT('stem.butterfly.rpt_help_filled','Your recorded results and learner notes, together as plain text. Your interpretation is labeled separately from the model evidence.'))),
          h('div',{className:'bf-report-actions'},
            button(copyPending?__alloT('stem.butterfly.rpt_copying','Copying field report…'):copyState==='ok'?__alloT('stem.butterfly.rpt_copied','✓ Report copied'):__alloT('stem.butterfly.rpt_copy_button','Copy my field report'),copyReport,{className:'bf-primary',disabled:reportEmpty&&!copyPending,'aria-disabled':copyPending||reportEmpty,'aria-busy':copyPending}))),
        reportCopyNote?h('p',{className:'bf-help',id:'bf-report-copy-feedback'},reportCopyNote):null,
        reportEmpty?null:h('pre',{'data-bf-report':'1',tabIndex:0,'aria-label':__alloT('stem.butterfly.a11y_field_report_text',"Field report text")},reportText),
        manualCopy?h('textarea',{readOnly:true,value:reportText,rows:10,'aria-label':__alloT('stem.butterfly.a11y_field_report_text_to_copy_manually',"Field report text to copy manually"),
          onFocus:function(e){e.target.select();},onCopy:manualReportCopied}):null,returnToGuide()),
      h('details',{className:'bf-sources'},h('summary',null,__alloT('stem.butterfly.src_summary','Science notes & sources')),h('p',null,__alloT('stem.butterfly.src_note_diverse_model_scope','The learner and life-cycle investigation follow the monarch (Danaus plexippus). Adult meadow visitors also include eastern tiger swallowtail, painted lady, and introduced cabbage white. Nectar use does not imply a shared caterpillar host plant; cabbage whites visit milkweed here, while the other visitors can use both flower patches. This summer scene represents a Mid-Atlantic habitat investigation. Plants and wing patterns are illustrative and enlarged. Guided routes, flight speed, distances, and energy are teaching choices, not field measurements. The generation you follow is a teaching model of one outcome, not a population simulation: it turns on whether milkweed is present, and it deliberately leaves out weather, predators, parasites, disease, how many eggs are laid, and how many survive — all of which matter in a real meadow, where most eggs do not reach adulthood even on good milkweed. Real development also takes weeks and depends on temperature; the stages here advance when you choose, in a fixed order. Other butterfly species can have different host plants.')),
        h('p',null,__alloT('stem.butterfly.src_note_experiments','In these experiments you place model eggs on any examined patch to test what happens; real female monarchs choose milkweed. An egg does not feed, so a patch without host leaves first blocks the feeding caterpillar stage. The mowing experiment keeps the chrysalis inside the patch and assumes cutting removes its support. Real caterpillars often leave their milkweed plant to find a secure place to pupate.')),h('ul',null,
        h('li',null,h('a',{href:'https://www.monarchwatch.org/milkweed/',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_monarch_watch_pollen','Monarch Watch · Milkweed pollen packets and transfer'))),
        h('li',null,h('a',{href:'https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_nrcs_pollination','USDA NRCS · How animal pollination works'))),
        h('li',null,h('a',{href:'https://www.xerces.org/publications/plant-lists/monarch-nectar-plants-mid-atlantic',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_xerces_nectar_plants','Xerces Society · Regional nectar plants and milkweed hosts'))),
        h('li',null,h('a',{href:'https://monarchjointventure.org/monarch-biology/life-cycle',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_mjv_life_cycle','Monarch Joint Venture · Life cycle'))),
        h('li',null,h('a',{href:'https://monarchjointventure.org/monarch-biology/why-milkweed',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_mjv_why_milkweed','Monarch Joint Venture · Why milkweed? (cardenolides and warning colors)'))),
        h('li',null,h('a',{href:'https://monarchjointventure.org/monarch-biology/butterfly-senses',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_mjv_butterfly_senses','Monarch Joint Venture · Butterfly senses (tasting with feet)'))),
        h('li',null,h('a',{href:'https://monarchjointventure.org/blog/mowing-best-practices-for-monarchs-new-mjv-handout',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_mjv_mowing','Monarch Joint Venture · Mowing and management best practices'))),
        h('li',null,h('a',{href:'https://monarchwatch.org/biology/cycle1.htm',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_monarch_watch_life_cycle','Monarch Watch · Life cycle timing and milkweed toxins'))),
        h('li',null,h('a',{href:'https://www.fs.usda.gov/wildflowers/pollinators/animals/butterflies.shtml',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_usfs_butterflies','USDA Forest Service · Butterflies as pollinators'))),
        h('li',null,h('a',{href:'https://litzsinger.org/research/clinebell.pdf',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_bergamot_visitors','Clinebell · Field observations of butterfly visitors to wild bergamot'))),
        h('li',null,h('a',{href:'https://scholar.valpo.edu/tgle/vol2/iss1/10/',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_milkweed_visitors','Wilson · Insect visitors to common milkweed'))),
        h('li',null,h('a',{href:'https://ucanr.edu/blog/bug-squad/article/independence-day-monarch',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_ucanr_wing_patterns','UC Agriculture and Natural Resources · Wing patterns visible before emergence'))),
        h('li',null,h('a',{href:'https://seasonwatch.umn.edu/monarch',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_umn_chrysalis','University of Minnesota · A monarch develops inside its chrysalis'))),
        h('li',null,h('a',{href:'https://www.nrcs.usda.gov/programs-initiatives/monarch-butterflies',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_nrcs_monarch_habitat','USDA NRCS · Monarch habitat and feeding needs'))),
        h('li',null,h('a',{href:'https://plants.ces.ncsu.edu/plants/asclepias-syriaca/',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_ncsu_milkweed','NC State Extension · Common milkweed plant structure'))),
        h('li',null,h('a',{href:'https://plants.ces.ncsu.edu/plants/monarda-fistulosa/',target:'_blank',rel:'noopener noreferrer'},__alloT('stem.butterfly.src_link_ncsu_bergamot','NC State Extension · Wild bergamot plant structure'))))),
      h('p',{className:'bf-help'},__alloT('stem.butterfly.src_footer','Butterfly Habitat Lab · Local habitat exploration. Find the long-distance monarch journey in Animal Migration Lab.'))
    );
  }
  window.StemLab.registerTool('butterfly',{label:'Butterfly Habitat Lab',icon:'🦋',desc:'Explore a summer meadow as a monarch, compare nectar and host plants, and build a field journal.',category:'science',color:'orange',gradeRange:'4-12',aliases:['monarch','butterflies','milkweed','pollinator','habitat'],render:function(ctx){return ctx.React.createElement(ButterflyLab,{ctx:ctx});}});
  if(window.__RR_TEST_EXPORTS__)window.__RR_TEST_EXPORTS__.butterfly={meadowSpeciesList:MEADOW_SPECIES,visitorSpecies:VISITOR_SPECIES,meadowSpecies:meadowSpecies,visitorPatch:visitorPatch,watchedVisitorIndex:watchedVisitorIndex,createMeadowButterfly:createMeadowButterfly,plants:PLANTS,freshState:freshState,nearest:nearest,steeringPad:steeringPad,step:step,advanceFrame:advanceFrame,land:land,observe:observe,save:save,buildWorld:buildWorld,designs:DESIGNS,habitats:habitats,applyPlan:applyPlan,cleanRestoration:cleanRestoration,fieldDetail:fieldDetail,evidenceRecorded:evidenceRecorded,broodIsCurrent:broodIsCurrent,broodRowsFor:broodRowsFor,fieldReport:fieldReport,reportLines:reportLines,reportIsEmpty:reportIsEmpty,glossary:GLOSSARY,glossaryTerm:glossaryTerm,mowings:MOWINGS,stageWeek:STAGE_WEEK,stageDays:STAGE_DAYS,seasonOutcome:seasonOutcome,cleanSeason:cleanSeason,runSeason:runSeason,seasonRunFor:seasonRunFor,timingPairs:timingPairs,currentSeasonRuns:currentSeasonRuns,seasonRunIsCurrent:seasonRunIsCurrent,mowing:mowing,
    stages:STAGES,outcomes:OUTCOMES,layEggs:layEggs,advanceStage:advanceStage,broodResult:broodResult,broodFor:broodFor,larvalFeeding:larvalFeeding,larvalLeafOutline:larvalLeafOutline,larvalLeafHeight:larvalLeafHeight,chrysalisMaturation:chrysalisMaturation,chrysalisSurface:chrysalisSurface,
    cleanLifecycle:cleanLifecycle,clampStage:clampStage,abandonBrood:abandonBrood,reachedStage:reachedStage,stageStatus:stageStatus,expectedOutcome:expectedOutcome,
    claims:CLAIMS,judgeClaim:judgeClaim,evidenceFor:evidenceFor,cleanNotebook:cleanNotebook,notebookEvidence:notebookEvidence,notebookReady:notebookReady,investigationSteps:investigationSteps,
    cases:CASES,caseStops:CASE_STOPS,caseReasons:CASE_REASONS,caseHabitat:caseHabitat,caseAnswer:caseAnswer,caseFeedback:caseFeedback,checkCase:checkCase,cleanCases:cleanCases,casesSummary:casesSummary,
    missionStatus:missionStatus,seasonNote:seasonNote,setPlain:function(on){bfPlain=!!on;},fieldFacts:FIELD_FACTS,stageUses:STAGE_USES,paintHabitatMap:paintHabitatMap,meadowPathX:meadowPathX,stemPose:stemPose,paintFeedingDiagram:paintFeedingDiagram,paintLifecycleDiagram:paintLifecycleDiagram,
    cleanPollination:cleanPollination,recordPollination:recordPollination,pollinationIsCurrent:pollinationIsCurrent,currentPollinationVisits:currentPollinationVisits,pollinationPairs:pollinationPairs,
    feedingVisual:feedingVisual,feedingPhase:feedingPhase,feedingMoment:feedingMoment,feedingOutcome:feedingOutcome,feedingCamera:feedingCamera,stopFlight:stopFlight,flightPose:flightPose,flightResponse:flightResponse,playerWingFlex:playerWingFlex,visitorFlightPose:visitorFlightPose,visitorVisitPose:visitorVisitPose,visitorWingFlex:visitorWingFlex,visitorAntennaPose:visitorAntennaPose,visitorLegTuck:visitorLegTuck,cameraPose:cameraPose,pollinatorCamera:pollinatorCamera,landingPose:landingPose,lifecycleVisual:lifecycleVisual,lifecyclePose:lifecyclePose,lifecycleInspection:lifecycleInspection,monarchWingHeight:monarchWingHeight,lifecycleCamera:lifecycleCamera,createLifecycleModels:createLifecycleModels};
})();
