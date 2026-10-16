// Butterfly Habitat Lab: a local summer habitat investigation, not a migration model.
// Movement, distance, energy and plant sizes are learning abstractions, not measured physiology.
(function () {
  'use strict';
  if (!window.StemLab || window.StemLab.isRegistered('butterfly')) return;
  var PLANTS = Object.freeze([
    Object.freeze({id:'milkweed',name:'Common milkweed',latin:'Asclepias syriaca',x:-42,z:-28,color:'#e6a8c2',nectar:true,host:true,
      note:'Milkweed provides leaves for monarch caterpillars. When in bloom, its flowers also offer nectar to adults.'}),
    Object.freeze({id:'bergamot',name:'Wild bergamot',latin:'Monarda fistulosa',x:38,z:-54,color:'#bca6f1',nectar:true,host:false,
      note:'Flowering wild bergamot offers nectar for adult monarchs. It does not replace milkweed as food for monarch caterpillars.'}),
    Object.freeze({id:'lawn',name:'Mown lawn',latin:'A patch with no flowers or milkweed',x:38,z:38,color:'#9fb87c',nectar:false,host:false,
      note:'This mown patch has neither flowers for nectar nor milkweed leaves for monarch caterpillars. That describes this patch, not every lawn.'})
  ]);
  var DESIGNS=Object.freeze([
    Object.freeze({id:'lawn',name:'Keep it mown',short:'Mown plot',detail:'Short grass; no flowers or milkweed',nectar:false,host:false,color:'#9fb87c',
      note:'The mown restoration plot has no nectar flowers or milkweed leaves. Neither resource is present in this design.'}),
    Object.freeze({id:'flowers',name:'Plant wild bergamot',short:'Bergamot only',detail:'A flowering patch of Monarda fistulosa',nectar:true,host:false,color:'#bca6f1',
      note:'Flowering bergamot provides adult nectar. Monarch caterpillars still need milkweed leaves, which are absent from this design.'}),
    Object.freeze({id:'mixed',name:'Plant milkweed + bergamot',short:'Milkweed + bergamot',detail:'Both species, established and in bloom',nectar:true,host:true,color:'#e6a8c2',
      note:'This planting offers adult nectar and milkweed leaves for monarch caterpillars. Having both resources does not guarantee survival.'})
  ]);
  var PREDICTIONS=Object.freeze([{id:'neither',label:'Neither resource'},{id:'nectar',label:'Nectar only'},{id:'both',label:'Nectar and host leaves'}]);

  // ── Life cycle investigation ──────────────────────────────────────────
  // The learner plays the adult, so the caterpillar stage is the part of the
  // story they cannot fly to. This activity lets them place eggs on a patch
  // they have already examined and then advance the generation stage by
  // stage. The outcome is READ OFF the patch's host resource — milkweed
  // leaves or no milkweed leaves — so host-plant dependence is something the
  // learner observes, not something the tool asserts in a caption.
  // Stages are labelled developmental steps, not timed or measured rates.
  var STAGES=Object.freeze([
    Object.freeze({id:'egg',ordinal:'01',name:'Egg',
      caption:'A monarch egg is laid on a leaf. It does not feed yet; what matters is the plant it sits on.',
      thriving:'The egg rests on a milkweed leaf. When it hatches, the caterpillar will emerge onto its food plant.',
      failing:'The egg is on a plant with no milkweed leaves. It can still hatch, but no monarch caterpillar food is growing here.'}),
    Object.freeze({id:'caterpillar',ordinal:'02',name:'Caterpillar',
      caption:'The caterpillar feeds and grows. This is the stage that depends on milkweed leaves.',
      thriving:'The caterpillar is feeding on milkweed leaves and growing through its larval stage.',
      failing:'The caterpillar hatched with no milkweed leaves within reach. Nectar flowers are adult food and do not feed this stage; the generation does not continue here.'}),
    Object.freeze({id:'chrysalis',ordinal:'03',name:'Chrysalis',
      caption:'The caterpillar forms a chrysalis and reorganises into an adult.',
      thriving:'A caterpillar that fed well forms its chrysalis, where metamorphosis takes place.',
      failing:'No caterpillar completed feeding at this patch, so no chrysalis forms.'}),
    Object.freeze({id:'adult',ordinal:'04',name:'Adult',
      caption:'The adult emerges and feeds on flower nectar — the stage you fly.',
      thriving:'An adult emerges. From here it can fly to nectar flowers — in this patch or any other — the way you do.',
      failing:'No adult emerges from this patch this generation.'})
  ]);
  var OUTCOMES=Object.freeze([
    Object.freeze({id:'complete',label:'Reaches the adult stage'}),
    Object.freeze({id:'stalls',label:'Stops before becoming an adult'})
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
    return {id:'restoration',name:'Restoration plot',latin:d.short,x:-42,z:38,color:d.color,nectar:d.nectar,host:d.host,note:d.note};
  }
  function habitats(state){return PLANTS.concat([restorationPatch(state)]);}
  function patch(id,state){return habitats(state).find(function(p){return p.id===id;})||null;}
  function applyPlan(state,id,guess){
    if(!design(id)||!prediction(guess))return {ok:false,message:'Choose a planting plan and a resource prediction first.'};
    state.restoration.design=id;state.restoration.prediction=guess;state.paused=true;state.target=null;stopFlight(state);
    if(state.landed==='restoration'){state.landed=null;state.y=6;}
    // Replanting the plot replaces the habitat a running generation was living
    // in, so that generation no longer describes anything on the ground. Drop
    // it rather than let it finish against resources that are no longer there.
    if(state.lifecycle&&state.lifecycle.patch==='restoration'&&state.lifecycle.stage){state.lifecycle.stage=null;state.lifecycle.prediction=null;state.lifecycle.patch=null;}
    return {ok:true,message:design(id).short+' is ready to explore. Flight is paused. Visit the restoration plot, land, and examine it to test your prediction.'};
  }
  function trialFeedback(record){var d=design(record.design);return (resources(d)===record.prediction?'Prediction matched. ':'Different from your prediction. ')+d.note;}

  // Eggs may only be placed where the learner has already gathered evidence:
  // the investigation builds on the field journal rather than replacing it.
  function layEggs(s,patchId,guess){
    var p=patch(patchId,s);
    if(!p)return {ok:false,message:'Choose a habitat patch for this generation.'};
    if(!outcome(guess))return {ok:false,message:'Predict what happens to this generation before laying eggs.'};
    if(!evidenceRecorded(s,p))return {ok:false,message:'Examine '+p.name+' first. Lay eggs only where you have recorded evidence.'};
    s.lifecycle.patch=patchId;s.lifecycle.prediction=guess;s.lifecycle.stage='egg';
    return {ok:true,message:'Eggs laid at '+p.name+'. Follow the generation stage by stage.'};
  }
  // Advancing never invents an outcome: it walks the fixed stage list and
  // stops where this patch's resources stop it.
  function advanceStage(s){
    var lc=s.lifecycle,p=patch(lc.patch,s);
    if(!p||!lc.stage)return {ok:false,message:'Lay eggs at a patch you have examined to begin a generation.'};
    var index=STAGES.findIndex(function(st){return st.id===lc.stage;}),limit=reachedStage(p);
    if(index>=limit)return {ok:false,message:'This generation has gone as far as this patch allows. Record the result.'};
    var next=STAGES[index+1];lc.stage=next.id;
    var status=stageStatus(p,index+1);
    return {ok:true,message:next.ordinal+' · '+next.name+'. '+(status==='thriving'?next.thriving:next.failing)};
  }
  function broodResult(s){
    var lc=s.lifecycle,p=patch(lc.patch,s);
    if(!p||!lc.stage)return {ok:false,message:'Lay eggs at a patch you have examined to begin a generation.'};
    if(!outcome(lc.prediction))return {ok:false,message:'Start over and make a prediction before recording this generation.'};
    var index=STAGES.findIndex(function(st){return st.id===lc.stage;});
    if(index<reachedStage(p))return {ok:false,message:'Keep following this generation before recording what happened.'};
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
    return (matched?'Prediction matched. ':'Different from your prediction. ')+(record.result==='complete'
      ?p.name+' offered what every stage needs, so a generation could run its whole cycle here — monarch caterpillars had milkweed leaves to eat. That is what this patch makes possible, not a count of how many would survive.'
      :p.name+' did not carry a generation to an adult. The caterpillar stage had no milkweed leaves, and adult nectar cannot substitute for it.');
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
    if(!lc.stage)return {ok:false,message:'No generation is running.'};
    var p=patch(lc.patch,s);
    lc.stage=null;lc.prediction=null;lc.patch=broodFor(s,lc.patch)?lc.patch:null;
    return {ok:true,message:'Stopped following the generation at '+(p?p.name:'that patch')+'. Nothing was recorded. You can lay eggs again.'};
  }

  // ── Mowing and timing ─────────────────────────────────────
  // Resources can be present and still be unusable if they are cut down before
  // the stage that needs them gets there. Sources describe habitat as needing
  // protection from "untimely mowing"; they publish no plant counts or survival
  // rates, so this models PRESENCE and TIMING only -- never density or numbers.
  // Weeks are an ordering device for one generation, not a measured calendar.
  var STAGE_WEEK=Object.freeze({egg:1,caterpillar:3,chrysalis:6,adult:8});
  var MOWINGS=Object.freeze([
    Object.freeze({id:'never',week:null,label:'Leave it uncut this summer',short:'No cut',
      note:'Nothing is cut, so whatever grows here stays standing for the whole generation.'}),
    Object.freeze({id:'early',week:2,label:'Cut in early summer',short:'Cut week 2',
      note:'An early cut removes the milkweed leaves a caterpillar would have fed on.'}),
    Object.freeze({id:'mid',week:5,label:'Cut in midsummer',short:'Cut week 5',
      note:'This model keeps the chrysalis inside the patch. A midsummer cut removes its support; real caterpillars often leave their milkweed plant to find a secure pupation site.'}),
    Object.freeze({id:'late',week:9,label:'Cut after the generation',short:'Cut week 9',
      note:'By this point the adult has emerged and can leave, so this cut does not interrupt the generation.'})
  ]);
  function mowing(id){return MOWINGS.find(function(m){return m.id===id;})||null;}
  // A stage clears only if the plot is still standing in the week it needs it.
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
      var standing=mow.week===null||STAGE_WEEK[st.id]<mow.week;
      return {id:st.id,name:st.name,week:STAGE_WEEK[st.id],standing:standing,
        resource:stageNeedMet(p,st.id),cleared:standing&&stageNeedMet(p,st.id)};
    });
    var blocked=steps.filter(function(x){return !x.cleared;})[0]||null;
    var cutShort=!!(blocked&&blocked.resource&&!blocked.standing);
    return {steps:steps,completes:!blocked,blocked:blocked?blocked.id:null,cutShort:cutShort,
      // Naming WHY it stopped is the point: same patch, same plants, different
      // timing. "Cut short" is the case the resource table alone cannot show.
      reason:!blocked?'Every stage found what it needed, and the plot was still standing when it needed it.'
        :cutShort?'The '+blocked.name.toLowerCase()+' stage had what it needed growing here, but the plot was cut in week '+mow.week+', before week '+blocked.week+'.'
        :'The '+blocked.name.toLowerCase()+' stage had nothing here to use, whether or not the plot was cut.'};
  }
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
    if(!p||!mow)return {ok:false,message:'Choose a patch and a mowing plan first.'};
    if(guess!=='complete'&&guess!=='stop')return {ok:false,message:'Predict what happens to the generation before running the season.'};
    if(!evidenceRecorded(s,p))return {ok:false,message:'Examine '+p.name+' first, so you know what is growing there.'};
    var outcome=seasonOutcome(p,mowId),result=outcome.completes?'complete':'stop';
    var sn=s.season,plan=patchId==='restoration'?s.restoration.design:null;
    var row={patch:patchId,mowing:mowId,prediction:guess,result:result};
    if(plan)row.plan=plan;
    sn.runs=sn.runs.filter(function(x){return !(x.patch===patchId&&x.mowing===mowId&&(x.plan||null)===plan);})
      .concat([row]);
    sn.prediction=null;
    return {ok:true,outcome:outcome,result:result,matched:guess===result,
      message:(guess===result?'Prediction matched. ':'Different from your prediction. ')+outcome.reason+' '+mow.note};
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
    Object.freeze({term:'Proboscis',definition:'The adult butterfly’s long, flexible drinking tube. It coils when not in use and uncoils to reach liquid food such as nectar.',here:'Choose Drinking tube close-up during a flower visit, then move Visit progress to inspect how the tube extends.'}),
    Object.freeze({term:'Pollen',definition:'Material produced by a flower’s anthers that carries the male reproductive cells of the plant. It is different from nectar, the liquid food the adult butterfly drinks.',here:'The enlarged yellow grains or packets ride outside the butterfly. Compare what stays on the leg with what reaches the next flower.'}),
    Object.freeze({term:'Pollination',definition:'The transfer of pollen to a receptive part of a flower of the same plant species. Fertilization and seed development are later processes, and are not guaranteed by a flower visit.',here:'Compare contact with missed contact in the final feeding step. A butterfly may sip nectar without delivering pollen.'}),
    Object.freeze({term:'Stigma',definition:'The receptive part of a flower where compatible pollen can begin germinating. Flower structures differ; milkweed receives a pollen packet through a specialized slit.',here:'The pollen close-up shows the bergamot stigma or milkweed receiving slit. The contact comparison moves this surface outside the leg’s path.'}),
    Object.freeze({term:'Pollinium',definition:'A compact mass of pollen grains. Milkweed carries these masses in linked pairs called pollinaria; one mass can enter a receptive slit in another milkweed flower.',here:'Watch a milkweed visit to follow one enlarged pollen mass from the leg into a receiving slit while its partner remains carried.'}),
    Object.freeze({term:'Host plant',
      definition:'The plant a caterpillar can actually eat. Female monarchs lay eggs on milkweed because monarch caterpillars eat only milkweed. A plant can be full of flowers and still not be a host plant.',
      here:'In this lab, "milkweed leaves present" is what makes a patch a host plant for monarchs.'}),
    Object.freeze({term:'Nectar plant',
      definition:'A flowering plant whose nectar feeds adult butterflies. Nectar fuels flight and egg-laying, but it is not food for caterpillars.',
      here:'Examining a flowering patch refills your flight energy meter. That is the adult stage feeding.'}),
    Object.freeze({term:'Milkweed',
      definition:'The group of plants (genus Asclepias) that monarch caterpillars depend on. Its flowers also offer nectar, so milkweed can serve both the adult and the caterpillar.',
      here:'Common milkweed (Asclepias syriaca) is the one patch here that provides both resources.'}),
    Object.freeze({term:'Larva / caterpillar',
      definition:'The feeding and growing stage that hatches from the egg. A monarch caterpillar grows through five stages, shedding its skin between them.',
      here:'This is the stage that stops a generation when no milkweed is within reach.'}),
    Object.freeze({term:'Instar',
      definition:'One growth step between two moults. A monarch caterpillar passes through five instars, getting larger at each.',
      here:'The lab shows the caterpillar as one step. Instars are what that single step is made of.'}),
    Object.freeze({term:'Chrysalis / pupa',
      definition:'The stage inside which a caterpillar reorganises into an adult butterfly. It hangs from a stem or other support and does not feed.',
      here:'This model places the chrysalis inside the patch and assumes mowing removes its support. Real caterpillars often leave their milkweed plant to find a secure place to pupate.'}),
    Object.freeze({term:'Metamorphosis',
      definition:'The whole change from egg to caterpillar to chrysalis to adult, in which the animal is rebuilt rather than simply growing bigger.',
      here:'Following a generation walks through these four stages in order.'}),
    Object.freeze({term:'Generation / brood',
      definition:'One round of the life cycle, from eggs laid to the adults that emerge from them.',
      here:'"Follow a generation" tracks one of these on a patch you have examined.'}),
    Object.freeze({term:'Habitat restoration',
      definition:'Planting or managing land so it provides what a species needs. For monarchs that means milkweed for caterpillars and nectar flowers for adults, protected from things like poorly timed mowing.',
      here:'The fourth patch is yours to restore. Each plan changes what the plot offers.'}),
    Object.freeze({term:'Resource',
      definition:'Something an organism needs and uses. Different stages of one species can need completely different resources.',
      here:'This lab tracks two: nectar for adults, and milkweed leaves for caterpillars.'}),
    Object.freeze({term:'Evidence',
      definition:'A record of something you observed, which can support or contradict a claim. What you did not observe is not evidence, however reasonable it sounds.',
      here:'The claim panel counts patches you examined, generations and seasons you recorded, and flower visits you explicitly recorded.'}),
    Object.freeze({term:'Prediction',
      definition:'What you expect to happen, stated before you find out. A prediction that turns out wrong is still useful: it tells you your reasoning needs changing.',
      here:'The planting, generation and seasonal investigations ask for one first, and record whether it matched.'})
  ]);
  function glossaryTerm(name){return GLOSSARY.find(function(g){return g.term===name;})||null;}

  // ── Field report ──────────────────────────────────────────
  // A learner can build real evidence here and then have no way to hand it to a
  // teacher. The report is assembled ONLY from records they made: nothing is
  // inferred, no section appears for work not done, and a replanted row is
  // reported as such rather than quietly dropped or quietly counted.
  function reportLines(s){
    var out=['Butterfly Habitat Lab — field report','Monarch (Danaus plexippus) · summer meadow investigation',''];
    var seen=PLANTS.filter(function(p){return s.observations.indexOf(p.id)>=0;});
    out.push('PATCHES EXAMINED (' + seen.length + ' of ' + PLANTS.length + ')');
    if(!seen.length)out.push('  none yet');
    seen.forEach(function(p){
      out.push('  ' + p.name + ' (' + p.latin + ')');
      out.push('    nectar for adults: ' + (p.nectar?'present':'absent') + '; milkweed leaves for caterpillars: ' + (p.host?'present':'absent'));
    });
    out.push('');
    out.push('PLANTING COMPARISONS (' + s.restoration.trials.length + ' of ' + DESIGNS.length + ')');
    if(!s.restoration.trials.length)out.push('  none yet');
    DESIGNS.forEach(function(d){
      var t=s.restoration.trials.find(function(x){return x.design===d.id;});
      if(!t)return;
      out.push('  ' + d.short + ': nectar ' + (d.nectar?'present':'absent') + ', milkweed leaves ' + (d.host?'present':'absent'));
      out.push('    predicted: ' + prediction(t.prediction).label + ' — ' + (resources(d)===t.prediction?'matched':'differed'));
    });
    out.push('');
    var broods=s.lifecycle.broods;
    out.push('GENERATIONS FOLLOWED (' + broods.length + ')');
    if(!broods.length)out.push('  none yet');
    broods.forEach(function(b){
      var p=patch(b.patch,s),name=p?p.name:b.patch;
      out.push('  ' + name + (b.plan?' [' + design(b.plan).short + ']':'') + ': ' + outcome(b.result).label.toLowerCase());
      out.push('    predicted: ' + outcome(b.prediction).label.toLowerCase() + ' — ' + (b.prediction===b.result?'matched':'differed') +
        (broodIsCurrent(s,b)?'':' (this planting has since been replaced)'));
    });
    out.push('');
    var runs=s.season.runs;
    out.push('SEASONS RUN (' + runs.length + ')');
    if(!runs.length)out.push('  none yet');
    runs.forEach(function(r){
      var p=patch(r.patch,s),name=p?p.name:r.patch;
      out.push('  ' + name + (r.plan?' [' + design(r.plan).short + ']':'') + ', ' + mowing(r.mowing).short.toLowerCase() + ': ' +
        (r.result==='complete'?'ran the whole cycle':'stopped before an adult'));
      out.push('    predicted: ' + (r.prediction==='complete'?'whole cycle':'stops early') + ' — ' + (r.prediction===r.result?'matched':'differed') +
        (seasonRunIsCurrent(s,r)?'':' (this planting has since been replaced)'));
    });
    var visits=cleanPollination(s.pollination).visits;
    if(visits.length){
      out.push('');
      out.push('POLLINATION VISITS RECORDED (' + visits.length + ')');
      visits.forEach(function(row){
        var p=patch(row.patch,s),name=p?p.name:row.patch;
        out.push('  ' + name + (row.plan?' [' + design(row.plan).short + ']':'') + ' — ' + (row.species==='milkweed'?'Common milkweed':'Wild bergamot'));
        out.push('    ' + (row.contact?'Contact: nectar was sipped and pollen reached the next flower\'s receptive surface.':'Missed contact: nectar was sipped, but pollen stayed on the butterfly.') +
          (pollinationIsCurrent(s,row)?'':' (this planting has since been replaced)'));
      });
      out.push('  These modeled visits show pollen transfer, not fertilization or guaranteed seed development.');
    }
    var pairs=timingPairs(s);
    if(pairs.length){
      out.push('');
      out.push('TIMING COMPARISONS');
      pairs.forEach(function(pair){
        var p=patch(pair.patch,s);
        out.push('  ' + (p?p.name:pair.patch) + ': ' + mowing(pair.kept).short.toLowerCase() + ' completed, ' +
          mowing(pair.cut).short.toLowerCase() + ' did not — same plants, different timing.');
      });
    }
    out.push('');
    var notebook=cleanNotebook(s.notebook),cited=notebookEvidence(s);
    if(notebook.claim||notebook.reasoning.trim()||notebook.question.trim()||notebook.evidence.length){
      out.push('MY CONCLUSION — LEARNER NOTES');
      out.push('  Claim: '+(claim(notebook.claim)?claim(notebook.claim).label:'not chosen yet'));
      var interpretation=INTERPRETATIONS.find(function(item){return item.id===notebook.interpretation;});
      out.push('  My interpretation: '+(interpretation?interpretation.label:'not chosen yet'));
      out.push('  Cited records ('+cited.selected.length+'):');
      cited.selected.forEach(function(line){out.push('    - '+line.text);});
      if(!cited.selected.length)out.push('    none selected');
      if(cited.missing.length)out.push('  Review needed: '+cited.missing.length+' selected record(s) no longer describe the current planting and are not included as current evidence.');
      out.push('  My explanation: '+(notebook.reasoning.trim()||'not written yet'));
      if(notebook.question.trim())out.push('  My next question: '+notebook.question.trim());
      out.push('  These notes are the learner\'s interpretation, not an automatically verified conclusion.');
      out.push('');
    }
    out.push('WHAT THIS REPORT IS NOT');
    out.push('  These are results from a teaching model. It shows whether a patch offers');
    out.push('  what each stage needs and whether the plants were still standing when that');
    out.push('  stage needed them. It does not count butterflies, estimate survival, or');
    out.push('  model weather, predators, parasites or disease.');
    return out;
  }
  // Route through the shell's alloCopyText first: Gemini Canvas refuses
  // navigator.clipboard by permissions policy. Resolves false so the UI can
  // offer the text for manual copying instead of failing silently.
  function copyReportText(text){
    return Promise.resolve().then(function(){
      if(typeof window.alloCopyText==='function')return Promise.resolve(window.alloCopyText(text)).then(function(ok){return ok!==false;});
      if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text).then(function(){return true;},function(){return false;});
      var area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');
      area.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(area);area.select();
      var ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}
      area.remove();return ok;
    }).catch(function(){return false;});
  }
  function fieldReport(s){return reportLines(s).join("\n");}
  function reportIsEmpty(s){
    var n=cleanNotebook(s.notebook);
    return !s.observations.length&&!s.restoration.trials.length&&!s.lifecycle.broods.length&&!s.season.runs.length&&!cleanPollination(s.pollination).visits.length&&!n.claim&&!n.reasoning.trim()&&!n.question.trim()&&!n.evidence.length;
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
      label:'Flowers with nectar are enough to support monarchs here',
      verdict:'Your records do not support that claim.',
      why:'Nectar feeds the adult stage you fly. Every generation you followed on a nectar-only patch stopped at the caterpillar stage, which needs milkweed leaves.'}),
    Object.freeze({id:'needs-both',sound:true,
      label:'Monarchs need nectar for adults and milkweed for caterpillars',
      verdict:'Your records support that claim.',
      why:'Adults refuel at any flowering patch, but only patches with milkweed leaves carried a generation through the caterpillar stage to an adult.'}),
    Object.freeze({id:'timing-irrelevant',sound:false,needs:'season',
      label:'If the right plants are there, when the patch is mown does not matter',
      verdict:'Your records do not support that claim.',
      why:'You ran the same patch, with the same plants, under two mowing plans and got two different outcomes. A cut that lands before a stage needs the plant removes it just as surely as never planting it.'}),
    Object.freeze({id:'feeding-always-pollinates',sound:false,needs:'pollination',
      label:'Every nectar visit transfers pollen to the next flower',
      verdict:'Your records do not support that claim.',
      why:'Your recorded visits compare the same flowers with and without contact. Pollen reached the receptive surface when contact occurred; the butterfly still sipped nectar when contact was missed, but no pollen transferred. Feeding alone does not establish pollination.'}),
    Object.freeze({id:'green-enough',sound:false,
      label:'Any green, planted patch will do',
      verdict:'Your records do not support that claim.',
      why:'The mown lawn and the flowering bergamot are both green and planted, and neither fed a monarch caterpillar. What matters is which species are growing, not how green the patch looks.'})
  ]);
  function claim(id){return CLAIMS.find(function(c){return c.id===id;})||null;}
  // Evidence is counted, never invented. Each line names a record the learner
  // made and what it shows; an empty list means the claim cannot be judged yet.
  function evidenceFor(s){
    var lines=[],stalled=[],completed=[],nectarOnlyStalled=[],hostComplete=[],nonHostStalled=[];
    habitats(s).forEach(function(p){
      var key=p.id+(p.id==='restoration'?':'+s.restoration.design:''),name=p.name+(p.id==='restoration'?' ('+design(s.restoration.design).short+')':'');
      if(evidenceRecorded(s,p))
        lines.push({id:'patch:'+key,kind:'patch',text:name+': '+(p.nectar?'nectar present':'no nectar')+', '+(p.host?'milkweed leaves present':'no milkweed leaves')+'.'});
      var b=broodFor(s,p.id);
      if(b){
        (b.result==='complete'?completed:stalled).push(name);
        if(p.host&&b.result==='complete')hostComplete.push(name);
        if(!p.host&&b.result==='stalls'){
          nonHostStalled.push(name);
          if(p.nectar)nectarOnlyStalled.push(name);
        }
        lines.push({id:'brood:'+key,kind:'brood',text:name+': the generation you followed '+(b.result==='complete'?'reached the adult stage.':'stopped before becoming an adult.')});
      }
    });
    var pairs=timingPairs(s);
    currentSeasonRuns(s).forEach(function(r){
      var p=patch(r.patch,s);if(!p)return;
      var key=p.id+(r.plan?':'+r.plan:''),name=p.name+(r.plan?' ('+design(r.plan).short+')':'');
      lines.push({id:'season:'+key+':'+r.mowing,kind:'season',text:name+', '+mowing(r.mowing).short.toLowerCase()+': the generation '+(r.result==='complete'?'ran its whole cycle.':'stopped before an adult emerged.')});
    });
    pairs.forEach(function(pair){
      var p=patch(pair.patch,s);if(!p)return;
      var key=p.id+(p.id==='restoration'?':'+s.restoration.design:''),name=p.name+(p.id==='restoration'?' ('+design(s.restoration.design).short+')':'');
      lines.push({id:'timing:'+key+':'+pair.kept+':'+pair.cut,kind:'timing',text:name+' ran both ways: '+mowing(pair.kept).short.toLowerCase()+' completed, '+mowing(pair.cut).short.toLowerCase()+' did not. Same plants, different timing.'});
    });
    var visits=currentPollinationVisits(s);
    visits.forEach(function(row){
      var p=patch(row.patch,s),key=row.patch+(row.plan?':'+row.plan:''),name=p.name+(row.plan?' ('+design(row.plan).short+')':'');
      lines.push({id:'pollination:'+key+':'+(row.contact?'contact':'miss'),kind:'pollination',text:name+' — '+(row.species==='milkweed'?'Common milkweed':'Wild bergamot')+', recorded model visit: '+
        (row.contact?'the butterfly sipped nectar and pollen contacted the next flower\'s receptive surface and transferred.':'the butterfly sipped nectar, but pollen missed the receptive surface and stayed on the butterfly.')});
    });
    return {lines:lines,broodsComplete:completed,broodsStalled:stalled,
      nectarOnlyStalled:nectarOnlyStalled,hostComplete:hostComplete,nonHostStalled:nonHostStalled,
      // Counted the same way the lines are: a brood from an earlier planting of
      // the restoration plot is kept as a record but is not current evidence.
      patches:s.observations.length,trials:s.restoration.trials.length,
      broods:s.lifecycle.broods.filter(function(b){return broodIsCurrent(s,b);}).length,
      seasons:currentSeasonRuns(s).length,timingPairs:pairs,pollinationVisits:visits,pollinationPairs:pollinationPairs(s)};
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
      nextStep='At the same flowering patch and planting, finish and record two model flower visits: one touching the receptive surface and one missing it. Use the final visit step at 100% progress, then Record this flower visit for each case.';
      why=c.why;
    }else if(c.needs==='season'){
      tested=ev.timingPairs.length>0;
      nextStep='To test timing, run the SAME patch twice under different mowing plans: leave a milkweed patch uncut, then cut it before the caterpillar or chrysalis stage.';
      why=c.why;
    }else if(id==='nectar-enough'){
      tested=ev.nectarOnlyStalled.length>0;
      nextStep='To test nectar alone, follow a generation on Wild bergamot or a bergamot-only restoration plot and record the result.';
      why=ev.nectarOnlyStalled.join(' and ')+': your recorded generation stopped at the caterpillar stage despite nectar being present. Nectar feeds adults; monarch caterpillars need milkweed leaves.';
    }else if(id==='needs-both'){
      tested=ev.hostComplete.length>0&&ev.nectarOnlyStalled.length>0;
      nextStep=!ev.hostComplete.length&&!ev.nectarOnlyStalled.length
        ?'To compare the stages\' needs, follow a generation on Common milkweed and another on Wild bergamot, then record both results.'
        :!ev.hostComplete.length?'Next, follow a generation on Common milkweed or a milkweed + bergamot restoration plot and record the result. You already have a nectar-only comparison.'
        :'Next, follow a generation on Wild bergamot or a bergamot-only restoration plot and record the result. A milkweed success alone does not test whether nectar could substitute for host leaves.';
      why=ev.hostComplete.join(' and ')+' reached the adult stage, while '+ev.nectarOnlyStalled.join(' and ')+' stopped at the caterpillar stage. Both offered adult nectar; only the successful planting offered milkweed leaves. This comparison supports different food needs for adults and caterpillars in the model.';
    }else if(id==='green-enough'){
      tested=ev.nonHostStalled.length>0;
      nextStep='To test whether any green patch will do, follow a generation on Mown lawn or Wild bergamot and record the result.';
      why=ev.nonHostStalled.join(' and ')+': your recorded generation stopped before an adult emerged. A green patch without milkweed leaves did not feed the monarch caterpillar, so green appearance alone was not enough.';
    }
    return {claim:c,evidence:ev,tested:tested,
      verdict:tested?c.verdict:'You have not tested this claim yet.',
      why:tested?why:nextStep,nextStep:tested?'':nextStep};
  }

  // Keep learner writing separate from model evidence. Citations refer to
  // records, never to editable copies of the model's findings.
  var INTERPRETATIONS=Object.freeze([
    {id:'supports',label:'My evidence supports this claim'},
    {id:'challenges',label:'My evidence challenges this claim'},
    {id:'unsure',label:'I need more evidence to decide'}
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
      {id:'explore',name:'Explore',done:s.observations.length===3,progress:s.observations.length+' / 3 reference patches',
        prompt:'Examine the flowers and leaves at all three reference patches. A visit alone does not record evidence.'},
      {id:'design',name:'Redesign',done:s.restoration.trials.length>=2,progress:s.restoration.trials.length+' / 3 plantings examined',
        prompt:'Predict, apply, and examine at least two restoration plans. Compare which resources changed.'},
      {id:'cycle',name:'Follow',done:generationReady,progress:generationReady?'Contrasting generations recorded':ev.broods+' generation'+(ev.broods===1?'':'s')+' recorded',
        prompt:s.lifecycle.stage?'Finish the generation in progress and record its result.':judgeClaim(s,'needs-both').why},
      {id:'season',name:'Compare timing',done:ev.timingPairs.length>0,progress:ev.timingPairs.length+' timing comparison'+(ev.timingPairs.length===1?'':'s'),
        prompt:'Use one milkweed patch for two seasons: leave it uncut, then try an earlier cut. Keep the plants the same.'},
      {id:'notebook',name:'Explain',done:notebookReady(s),progress:notebookReady(s)?'Conclusion assembled':records.selected.length+' / 2 records cited',
        prompt:records.missing.length?'Some cited records describe an earlier planting. Review those citations before finishing.':'Choose a claim, cite at least two records, and explain how they support or challenge your idea.'}
    ];
    return {steps:steps,completed:steps.filter(function(item){return item.done;}).length,next:steps.find(function(item){return !item.done;})||null};
  }

  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function freshState(saved) {
    var seen=saved && Array.isArray(saved.observations)?saved.observations:[];
    var state={x:0,y:6,z:52,yaw:0,clock:0,energy:100,paused:true,landed:null,target:null,vx:0,vy:0,vz:0,bank:0,pitch:0,wingPhase:0,gliding:false,
      observations:PLANTS.filter(function(p){return seen.indexOf(p.id)!==-1;}).map(function(p){return p.id;}),restoration:cleanRestoration(saved&&saved.restoration),
      lifecycle:cleanLifecycle(saved&&saved.lifecycle),season:cleanSeason(saved&&saved.season),pollination:cleanPollination(saved&&saved.pollination),notebook:cleanNotebook(saved&&saved.notebook)};
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
  function stopFlight(s){s.vx=0;s.vy=0;s.vz=0;s.bank=0;s.pitch=0;s.gliding=false;return s;}
  function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  // Integrate an exponential velocity response analytically. Movement remains
  // consistent across frame rates, while steering has a short, gentle response.
  function flightAxis(v,target,rate,dt){var blend=Math.exp(-rate*dt);return {velocity:target+(v-target)*blend,distance:target*dt+(v-target)*(1-blend)/rate};}
  function landingPose(s,p){
    if(!p.nectar)return {x:p.x,y:.62,z:p.z,yaw:s.yaw};
    var mixed=p.id==='restoration'&&s.restoration.design==='mixed',pi=p.host&&!mixed?0:1;
    var stem=stemPose(p,pi,0,mixed?17:34,mixed?6:0);
    return {x:stem.x,y:stem.height+1.05,z:stem.z+.25,yaw:-.35};
  }
  function flightPose(s,reduced){
    var phase=s.wingPhase||0,glide=s.gliding&&!s.target;
    var angle=s.landed?1.28:reduced?.36:glide?.22+Math.sin(phase)*.06:.16+1.02*(.5+.5*Math.sin(phase));
    return {bob:s.landed||reduced?0:Math.sin(phase*2)*.06,bank:s.landed||reduced?0:s.bank||0,pitch:s.landed||reduced?0:s.pitch||0,
      leftWing:-angle,rightWing:angle,hindLag:s.landed||reduced?0:Math.sin(phase-.45)*.07};
  }
  function cameraPose(s,view,detail,reduced){
    if(detail){var p=detail.point;return {position:[p.x+5.4,p.y+3.2,p.z+8.5],target:[p.x,p.y,p.z],fov:48};}
    if(view==='meadow')return {position:[105,125,145],target:[0,0,0],fov:52};
    if(view==='wing'&&!reduced){var sin=Math.sin(s.yaw),cos=Math.cos(s.yaw);return {position:[s.x+sin*12+cos*4,s.y+4.8,s.z+cos*12-sin*4],target:[s.x-sin*9,s.y+.5,s.z-cos*9],fov:62};}
    return {position:[s.x+13,s.y+11,s.z+22],target:[s.x+(reduced?0:s.vx*.18),s.y+.7,s.z-3+(reduced?0:s.vz*.18)],fov:54};
  }
  // Pure, bounded step. No wall clock or random stream enters the biology or journal.
  function step(s,dt,keys) {
    if(s.paused||s.landed||!Number.isFinite(dt)||dt<=0)return s;
    dt=Math.min(dt,.05);keys=keys||{};s.clock+=dt;
    var dx=(keys.right?1:0)-(keys.left?1:0),dz=(keys.back?1:0)-(keys.forward?1:0);
    if(dx||dz||keys.rise||keys.lower)s.target=null;
    var destination=patch(s.target,s);
    var distance=0;
    if(destination){
      dx=destination.x-s.x;dz=destination.z-s.z;
      distance=Math.hypot(dx,dz);
      if(distance<4){s.target=null;s.paused=true;stopFlight(s);return s;}
    }
    var glide=s.gliding&&!destination,length=Math.hypot(dx,dz),speed=17*(.6+.4*s.energy/100)*(glide?.78:1);
    if(glide&&!length){dx=-Math.sin(s.yaw);dz=-Math.cos(s.yaw);length=1;}
    if(destination)speed=Math.min(speed,Math.max(3,distance*1.7));
    if(length){dx/=length;dz/=length;s.energy=clamp(s.energy-dt*(glide?.18:.45),0,100);}
    var rate=length?(glide?2.6:4.2):7;
    var ax=flightAxis(s.vx||0,dx*speed,rate,dt),az=flightAxis(s.vz||0,dz*speed,rate,dt);
    var vertical=(keys.rise?1:0)-(keys.lower?1:0),targetY=destination?clamp((6-s.y)*2,-5,5):vertical*7-(glide&&!vertical?.65:0);
    var ay=flightAxis(s.vy||0,targetY,5,dt);
    s.x=clamp(s.x+ax.distance,-100,100);s.z=clamp(s.z+az.distance,-100,100);s.y=clamp(s.y+ay.distance,3,24);
    s.vx=Math.abs(ax.velocity)<.005?0:ax.velocity;s.vz=Math.abs(az.velocity)<.005?0:az.velocity;s.vy=Math.abs(ay.velocity)<.005?0:ay.velocity;
    if((s.x===100&&s.vx>0)||(s.x===-100&&s.vx<0))s.vx=0;
    if((s.z===100&&s.vz>0)||(s.z===-100&&s.vz<0))s.vz=0;
    if((s.y===24&&s.vy>0)||(s.y===3&&s.vy<0))s.vy=0;
    var moving=Math.hypot(s.vx,s.vz)>.15,heading=moving?Math.atan2(-s.vx,-s.vz):s.yaw,turn=angleDelta(s.yaw,heading);
    s.yaw=angleDelta(0,s.yaw+turn*(1-Math.exp(-5*dt)));
    s.bank+=(clamp(turn*.45,-.46,.46)-s.bank)*(1-Math.exp(-5*dt));
    s.pitch+=(clamp(s.vy*.035,-.2,.2)-s.pitch)*(1-Math.exp(-4*dt));
    s.wingPhase=(s.wingPhase+dt*(glide?3:15+Math.hypot(s.vx,s.vz)*.13))%(Math.PI*2);
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
    var n=nearest(s);if(n.distance>14)return {ok:false,message:'Move closer to a habitat patch before landing.'};
    var perch=landingPose(s,n.plant);stopFlight(s);s.landed=n.plant.id;s.target=null;s.paused=true;s.x=perch.x;s.z=perch.z;s.y=perch.y;s.yaw=perch.yaw;
    return {ok:true,message:'Landed at '+n.plant.name+'. Examine this patch to record your evidence.'};
  }
  function observe(s) {
    var p=patch(s.landed,s);if(!p)return {ok:false,message:'Land at a habitat patch to examine it.'};
    if(p.nectar)s.energy=100;
    if(p.id==='restoration'){
      if(!s.restoration.prediction)return {ok:true,message:p.note+' Choose a plan and make a prediction in the design activity to record a comparison.'};
      var record={design:s.restoration.design,prediction:s.restoration.prediction};
      s.restoration.trials=s.restoration.trials.filter(function(t){return t.design!==record.design;}).concat([record]);
      s.restoration.prediction=null;
      return {ok:true,message:trialFeedback(record)};
    }
    if(s.observations.indexOf(p.id)<0)s.observations.push(p.id);
    return {ok:true,message:p.note};
  }
  function save(s) { return {version:5,observations:s.observations.slice(),restoration:cleanRestoration(s.restoration),lifecycle:cleanLifecycle(s.lifecycle),season:cleanSeason(s.season),pollination:cleanPollination(s.pollination),notebook:cleanNotebook(s.notebook)}; }

  // The lens targets the same stems used to build the scene, including mixed plots.
  function stemPose(p,pi,index,count,offset){
    var angle=index*2.39996,radius=2+Math.sqrt(index)*(count<30?1.35:2.2);
    return {x:p.x+offset+Math.cos(angle)*radius,z:p.z+Math.sin(angle)*radius,height:(pi===0?4:2.3)+(index%4)*.35};
  }
  // Opposite leaf pairs; neighboring pairs face different directions.
  function leafPose(stem,index){
    var pair=Math.floor(index/2),side=index%2?1:-1,yaw=-pair*Math.PI/2;
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
    var present=flowers?p.nectar:p.host,species=p.nectar?(milkweed?'Common milkweed':'Wild bergamot'):'Mown grass';
    var title=flowers?(present?'Flowers for adult feeding':'No nectar flowers here'):(present?'Leaves for monarch caterpillars':'No monarch host leaves here');
    var note=flowers?(present?'The highlighted flowers offer nectar to adult monarchs. Flowers are a feeding resource; seeing blooms does not tell you whether a plant can feed a monarch caterpillar.':'This mown patch has grass but no flowers offering nectar. Its green appearance alone does not indicate an adult food source.'):
      (present?'The highlighted milkweed leaf is food for monarch caterpillars. Host plant means a plant that supports their feeding and development. Adults use flower nectar instead.':p.nectar?'These are bergamot leaves. This plant offers adult nectar when flowering, but its leaves do not replace milkweed for monarch caterpillars.':'There is grass here, but no milkweed. Monarch caterpillars need milkweed leaves; green ground cover alone does not provide their host plant.');
    var leaf=leafPose(sample,3);
    return {kind:kind,present:present,species:species,title:title,note:note,part:p.nectar?(flowers?'Flower cluster':milkweed?'Milkweed leaf':'Bergamot leaf'):'Mown ground',
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
    var title={egg:'An egg beneath a leaf',caterpillar:blocked?'A caterpillar without food':'Hatch, feed, and grow',chrysalis:'Metamorphosis inside a chrysalis',adult:'An adult emerges'}[id];
    if(id==='egg'&&!p.nectar)title='An egg placed in the mown patch';
    var note={egg:'Look for the pale shell and its fine ribs. The egg does not feed. One enlarged egg represents the generation you are following.',
      caterpillar:blocked?'The egg hatched, but this caterpillar has no milkweed to eat. Flower nectar cannot feed it. This model stops here; no chrysalis or adult forms.':'The striped caterpillar eats milkweed. Hatching and growth through five instars are compressed into this step; its size change is illustrative.',
      chrysalis:'The pupa hangs by a silk attachment while the adult develops inside. It does not feed. Real caterpillars often leave their food plant to find a sheltered pupation site.',
      adult:'The new adult emerges beside its empty case, then expands its wings. Real wings need time to expand and dry before flight; the short animation compresses that process.'}[id];
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
      label:{unavailable:'Maturation unavailable',green:'Green chrysalis',markings:'Wing markings appear',pattern:'Wing pattern visible'}[phase],
      note:!active?'This close-up is available for the chrysalis of a generation supported by milkweed.':phase==='green'?'The green case hides the developing adult. The pupa hangs from its attachment and does not feed.':phase==='markings'?'As emergence approaches, the case becomes less opaque and the dark markings of the folded wings begin to show through.': 'Orange and dark markings of the folded wings are visible through the case. The adult has not emerged or expanded its wings yet.'};
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
    if(focus==='feeding'&&feeding.active)return {focus:'feeding',label:'Leaf feeding close-up',detailLabel:'Caterpillar head close-up',title:'Biting the milkweed leaf',note:'The mouthparts close at the leaf edge, leaving small missing pieces. This enlarged sequence shows four illustrative bites, not a measured feeding rate or a complete meal. Rewind to compare the intact leaf with its bitten edge.',point:leafWorld(v.anchor,feeding.mouth.x,feeding.mouth.y,feeding.mouth.z)};
    var maturation=chrysalisMaturation(v,progress);
    if(focus==='maturation'&&maturation.active)return {focus:'maturation',label:'Chrysalis maturation close-up',detailLabel:'Chrysalis attachment close-up',title:maturation.label,note:maturation.note+' This enlarged sequence illustrates visible changes before emergence; its progress does not measure elapsed time or show the hidden transformation inside.',point:leafWorld(v.anchor,0,-.38,0)};
    focus=focus==='specimen'||focus==='detail'?focus:'context';
    var pose=lifecyclePose(v,progress,reduced),leaf=v.support==='leaf',point=v.point;
    var detailLabel={egg:'Egg shell close-up',caterpillar:'Caterpillar head close-up',chrysalis:'Chrysalis attachment close-up',adult:'Wing close-up'}[v.stage];
    var titles={egg:'Ribs on the egg shell',caterpillar:'Head and mouthparts',chrysalis:'The attachment above the chrysalis',adult:'A monarch wing unfolding'};
    var notes={egg:'The enlarged shell has fine lengthwise ribs. The egg does not feed; the developing caterpillar is hidden inside.',
      caterpillar:v.blocked?'The dark head has pale markings, but there is no milkweed here to eat. Inspecting or replaying this caterpillar cannot make it grow or form a chrysalis.':'Look at the dark head capsule and its pale markings. Small mouthparts are near the front. This growth view shows the head, not individual bites or the five separate molts; choose Leaf feeding close-up to inspect the mouthparts at the leaf edge.',
      chrysalis:'A small silk pad and dark attachment support the hanging pupa. The green outer surface and gold markings are visible; the transformation into an adult happens out of sight inside.',
      adult:'Follow the orange wing surface, dark veins, and pale spots as the wings expand. This illustrative motion compresses emergence and expansion; real wings also need time to dry before flight.'};
    if(focus!=='context'){
      if(v.stage==='egg')point=leafWorld(v.anchor,0,leaf?.065-.13:.13,focus==='detail'?.09:0);
      else if(v.stage==='caterpillar')point=leafWorld(v.anchor,pose.crawl+(focus==='detail'?.665:0)*pose.growth,(leaf?.1:0)+(focus==='detail'?.113:.125)*pose.growth,(focus==='detail'?-.023:.01)*pose.growth);
      else if(v.stage==='chrysalis')point=leafWorld(v.anchor,0,focus==='detail'?.025:-.365,0);
      else if(v.stage==='adult'){
        if(focus==='detail'){
          // The right forewing rotates at its hinge before the emerging adult
          // rotates upright. Track an actual vein on that moving wing surface.
          var x=3.7,z=-2.92,y=.19*Math.sin(x*Math.PI/7)+.035*Math.sin((z+1)*.8)+.07+.03;
          point=leafWorld(v.anchor,(.12+x*Math.cos(pose.wingAngle)-y*Math.sin(pose.wingAngle))*pose.adultScale,pose.adultY-z*pose.adultScale,.28+(x*Math.sin(pose.wingAngle)+y*Math.cos(pose.wingAngle))*pose.adultScale);
        }else point=leafWorld(v.anchor,0,pose.adultY,.28);
      }
    }
    return {focus:focus,label:focus==='context'?'Plant and stage':focus==='specimen'?'Whole specimen':detailLabel,detailLabel:detailLabel,title:focus==='detail'?titles[v.stage]:v.title,note:focus==='detail'?notes[v.stage]:v.note,point:point};
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
    if(!p||!p.nectar)return {ok:false,message:'Land at a flowering patch and watch a flower visit before recording it.'};
    if(phase!=='deposit'||!Number.isFinite(progress)||progress!==1||typeof contact!=='boolean')return {ok:false,message:'Finish the final flower visit step at 100% progress, then record the contact case you observed.'};
    var records=cleanPollination(s.pollination),plan=p.id==='restoration'?s.restoration.design:null;
    if(records.visits.some(function(row){return row.patch===p.id&&(row.plan||null)===plan&&row.contact===contact;}))return {ok:false,message:'This '+(contact?'contact':'missed-contact')+' case is already recorded for this patch and planting. Try the other contact case to compare.'};
    var row={patch:p.id,species:feedingVisual(s).species,contact:contact};
    if(plan)row.plan=plan;
    records.visits.push(row);s.pollination=cleanPollination(records);
    return {ok:true,message:'Recorded model visit at '+p.name+': '+(contact?'the butterfly sipped nectar and pollen reached the next flower\'s receptive surface.':'the butterfly sipped nectar, but pollen missed the receptive surface and stayed on the butterfly.')};
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
    if(phase==='carry')return {id:'carry',title:'Carry pollen to another flower',note:'Pollen rides on the outside of the butterfly as it visits another flower of the same plant species. Nectar stays inside the butterfly as food.'};
    if(phase==='deposit')return contact===false?{id:'deposit',title:'A visit without pollen transfer',note:'The butterfly can reach nectar, but its pollen misses the receptive surface. In this comparison, the pollen stays on the butterfly. Feeding and pollination are different events.'}:{id:'deposit',title:'Pollen reaches the next flower',note:'Contact leaves some pollen on a receptive flower surface. This transfer is pollination. Fertilization and seed development can follow later; a visit alone does not guarantee seeds.'};
    return {id:'sip',title:'Uncoil, reach, and sip',note:'The proboscis is a long, flexible drinking tube. It uncoils to reach sugary nectar inside the flower. Pollen attaches outside the body during contact; it is not the nectar being swallowed.'};
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
    var summary=moment.phase==='sip'?(carrying?'Pollen has attached to the butterfly during its nectar visit.':'The drinking tube is reaching into the flower; pollen has not attached yet.'):
      moment.phase==='carry'?'Pollen is traveling on the butterfly. The next flower has received none yet.':
      received?(v&&v.species==='milkweed'?'One pollinium has entered the receptive slit. The other remains on the butterfly.':'Some grains have reached the receptive stigma. Other grains remain on the butterfly.'):
      transferring?'Watch the pollen move from the leg toward the receptive surface. It is still in transfer.':
      contact===false?'No pollen reaches the receptive surface in this visit. The butterfly keeps its pollen while sipping nectar.':'The butterfly has arrived. Watch for contact with the receptive surface.';
    return {carrying:carrying,received:received,transferring:transferring,carriedLabel:carrying?(received||transferring?'Some remains carried':'Pollen carried'):'Not picked up yet',receivedLabel:received?'Pollen received':transferring?'In transfer':'None received',summary:summary};
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
    flower(-1.75,'Flower 1',false);flower(1.75,'Flower 2',true);
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

function createMonarch(T, kit, feeding) {
  var root = new T.Group(), wings = [], hindWings = [], colorCache = {};
  root.userData.species = 'Danaus plexippus';
  root.userData.model = 'illustrative monarch';
  // kit is accepted for the existing Butterfly Lab builder contract. No shared
  // StemMeadow or BeeLab geometry, material, or animation state is modified.
  function color(hex) {
    return colorCache[hex] || (colorCache[hex] = new T.Color(hex).convertSRGBToLinear());
  }
  var ink = 0x1c211e, ivory = 0xfff3d4;
  var surface = new T.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: .86, metalness: 0});
  var eyeMaterial = new T.MeshStandardMaterial({color: color(0x302b22), roughness: .38, metalness: 0});

  // Wing pigment, veins, and the two marginal spot rows are baked into one
  // geometry per wing type. Both sides reuse these same two GPU geometries.
  function wingGeometry(kind) {
    var fore = kind === 'fore';
    var outline = fore
      ? [[.28,-.63],[1.05,-1.75],[2.7,-3.9],[4.9,-5.18],[6.3,-5.0],[6.95,-4.12],[6.55,-2.7],[5.55,-1.3],[4.25,.25],[2.3,1.10],[.32,.73]]
      : [[.28,.18],[2.0,-.1],[3.4,.3],[4.8,1.02],[5.6,2.18],[5.3,3.52],[4.1,4.25],[2.8,4.35],[1.65,3.65],[.7,2.45],[.25,1.1]];
    var curve = new T.CatmullRomCurve3(outline.map(function(p) { return new T.Vector3(p[0],0,p[1]); }), true, 'centripetal');
    var boundary = curve.getSpacedPoints(88).slice(0,-1), center = fore ? [2.65,-1.9] : [2.55,2.05];
    var positions = [], normals = [], colors = [];
    function camber(x,z) { return .19*Math.sin(x*Math.PI/7) + .035*Math.sin((z+1)*.8) + (fore ? .07 : -.055); }
    function point(p, radius) { return [center[0]+(p.x-center[0])*radius, center[1]+(p.z-center[1])*radius]; }
    function vertex(p, hex, face, lift) {
      var x=p[0], z=p[1], c=color(hex), dx=.19*Math.PI/7*Math.cos(x*Math.PI/7), dz=.028*Math.cos((z+1)*.8);
      var normal = new T.Vector3(-dx,1,-dz).normalize().multiplyScalar(face);
      positions.push(x,camber(x,z)+face*(.012+(lift||0)),z);
      normals.push(normal.x,normal.y,normal.z); colors.push(c.r,c.g,c.b);
    }
    function triangle(a,b,c,hex,face,lift) {
      // XZ winding reverses relative to ordinary XY shapes. Set it explicitly
      // so dorsal and ventral pigments use backface culling, never z-fighting.
      var up=(b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1]);
      if(up*face<0) { var swap=b; b=c; c=swap; }
      vertex(a,hex,face,lift);vertex(b,hex,face,lift);vertex(c,hex,face,lift);
    }
    var rings=[0,.28,.64,.84,.88,1];
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
      for(var i=0;i<points.length-1;i++) {
        var a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
        if(length<.00001)continue;
        var nx=-dz/length*width/2,nz=dx/length*width/2;
        var p=[a[0]-nx,a[1]-nz],q=[b[0]-nx,b[1]-nz],r=[b[0]+nx,b[1]+nz],s=[a[0]+nx,a[1]+nz];
        [1,-1].forEach(function(face){triangle(p,q,r,ink,face,.018);triangle(p,r,s,ink,face,.018);});
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
    veins.forEach(function(path,i){ribbon(path,i<3?.105:.078);});
    function oval(x,z,along,across,angle,hex,lift) {
      var ca=Math.cos(angle),sa=Math.sin(angle),count=10;
      [1,-1].forEach(function(face) {
        for(var s=0;s<count;s++) {
          var a=s/count*Math.PI*2,b=(s+1)/count*Math.PI*2;
          var p=[x+Math.cos(a)*along*ca-Math.sin(a)*across*sa,z+Math.cos(a)*along*sa+Math.sin(a)*across*ca];
          var q=[x+Math.cos(b)*along*ca-Math.sin(b)*across*sa,z+Math.cos(b)*along*sa+Math.sin(b)*across*ca];
          triangle([x,z],p,q,hex,face,lift===undefined?.026:lift);
        }
      });
    }
    for(var spot=2;spot<boundary.length;spot+=4) {
      var edge=boundary[spot];
      if(edge.x<1.2)continue; // no false white necklace around the wing hinge
      var before=boundary[(spot+boundary.length-1)%boundary.length],after=boundary[(spot+1)%boundary.length];
      var angle=Math.atan2(after.z-before.z,after.x-before.x),p=point(edge,.926),q=point(edge,.978);
      var large=fore?.14:.125;
      oval(p[0],p[1],large,large*.65,angle,ivory);
      oval(q[0],q[1],large*.48,large*.38,angle,ivory);
    }
    // Enlarged pale subapical marks sit in dark cells along the forewing costa.
    if(fore) {
      [[4.15,-4.30,.14,.10],[4.9,-4.55,.19,.13],[5.55,-4.31,.23,.14],[6.0,-3.86,.17,.11]].forEach(function(p) {
        oval(p[0],p[1],p[2]*1.5,p[3]*1.65,-.6,ink,.024);
        oval(p[0],p[1],p[2],p[3],-.6,0xffdf9f,.032);
      });
    }
    var geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
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
  var bodyPositions=[],bodyNormals=[],bodyColors=[],sphere=new T.SphereGeometry(1,14,10);
  var transform=new T.Object3D(),normalMatrix=new T.Matrix3(),point=new T.Vector3(),normal=new T.Vector3();
  function bake(geometry,hex,x,y,z,sx,sy,sz,rx,ry,rz) {
    transform.position.set(x||0,y||0,z||0);transform.scale.set(sx||1,sy||1,sz||1);transform.rotation.set(rx||0,ry||0,rz||0);transform.updateMatrix();
    normalMatrix.getNormalMatrix(transform.matrix);
    var p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index,c=color(hex),count=index?index.count:p.count;
    for(var i=0;i<count;i++) {
      var v=index?index.getX(i):i;
      point.fromBufferAttribute(p,v).applyMatrix4(transform.matrix);
      normal.fromBufferAttribute(n,v).applyMatrix3(normalMatrix).normalize();
      bodyPositions.push(point.x,point.y,point.z);bodyNormals.push(normal.x,normal.y,normal.z);bodyColors.push(c.r,c.g,c.b);
    }
  }
  function blob(hex,x,y,z,sx,sy,sz,ry) {bake(sphere,hex,x,y,z,sx,sy,sz,0,ry||0,0);}
  function tube(points,radius,hex,segments) {
    var path=new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3(p[0],p[1],p[2]);}));
    var geometry=new T.TubeGeometry(path,segments||12,radius,5,false);
    bake(geometry,hex);geometry.dispose();
  }
  blob(ink,0,-.02,-.43,.43,.39,.88);
  blob(0x252923,0,-.025,1.24,.32,.30,1.61);
  for(var segment=0;segment<8;segment++) {
    var z=.13+segment*.33,radius=.31*(1-segment*.065);
    blob(segment%2?0x272c24:0x34362b,0,-.025,z,radius,.27*(1-segment*.055),.25);
    [-1,1].forEach(function(side){blob(0xd7cda7,side*radius*.91,.015,z,.045,.055,.115);});
  }
  blob(ink,0,.01,-1.43,.35,.33,.36);
  [-1,1].forEach(function(side) {
    // White thoracic and facial flecks are small, irregular, and embedded.
    for(var mark=0;mark<4;mark++)blob(ivory,side*(.24+mark%2*.07),.28-mark%2*.045,-.96+mark*.25,.065,.045,.095);
    blob(ivory,side*.17,.25,-1.48,.065,.055,.07);
    tube([[side*.16,.19,-1.62],[side*.29,.44,-2.05],[side*.48,.61,-2.57],[side*.69,.65,-3.04]],.035,ink,15);
    blob(ink,side*.69,.65,-3.04,.085,.085,.215,side*-.28);
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
  var bodyGeometry=new T.BufferGeometry();
  bodyGeometry.setAttribute('position',new T.Float32BufferAttribute(bodyPositions,3));
  bodyGeometry.setAttribute('normal',new T.Float32BufferAttribute(bodyNormals,3));
  bodyGeometry.setAttribute('color',new T.Float32BufferAttribute(bodyColors,3));
  bodyGeometry.computeBoundingBox();bodyGeometry.computeBoundingSphere();bodyGeometry.name='monarch-anatomy';
  var body=new T.Mesh(bodyGeometry,surface);body.name='monarch-body';root.add(body);
  [-1,1].forEach(function(side) {
    var eye=new T.Mesh(sphere,eyeMaterial);eye.name='monarch-eye-'+(side<0?'left':'right');
    eye.position.set(side*.29,.025,-1.46);eye.scale.set(.15,.20,.20);eye.rotation.y=side*.18;root.add(eye);
  });
  root.userData.anatomy={forewings:2,hindwings:2,antennae:2,legs:6,reducedForelegs:true,coiledProboscis:!feeding};
  return {root:root,wings:wings,hindWings:hindWings};
}

function buildWorld(T,kit) {
    var scene=new T.Scene();scene.background=new T.Color(0xcbdacb);scene.fog=new T.Fog(0xcbdacb,105,310);
    scene.add(new T.HemisphereLight(0xe8f3ff,0x66764c,.82));
    var sun=new T.DirectionalLight(0xffe4b7,1.25);sun.position.set(-65,100,45);scene.add(sun);
    var materialCache={},breeze={value:0};
    function mat(color,extra){var key=color+JSON.stringify(extra||{});return materialCache[key]||(materialCache[key]=new T.MeshStandardMaterial(Object.assign({color:new T.Color(color).convertSRGBToLinear(),roughness:.96},extra||{})));}
    function mesh(geo,m,x,y,z,sx,sy,sz,parent){var o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx||1,sy||1,sz||1);(parent||scene).add(o);return o;}
    function hash(n){var h=Math.sin(n*127.1+311.7)*43758.5453;return h-Math.floor(h);}
    function linear(color){return new T.Color(color).convertSRGBToLinear();}
    function dataGeometry(data){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
      var colors=data.colors;if(data.tones){colors=[];data.tones.forEach(function(t){var c=linear(t);colors.push(c.r,c.g,c.b);});}
      if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
    var sphere=new T.SphereGeometry(1,10,7),cylinder=new T.CylinderGeometry(.68,1,1,7),plane=new T.PlaneGeometry(1,1);
    // A texture-free sky retains a soft horizon at every camera angle.
    var sky=new T.Mesh(new T.SphereGeometry(470,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
      uniforms:{zenith:{value:linear(0x77b9dc)},horizon:{value:linear(0xdfe8d5)},cloud:{value:linear(0xf5f2df)}},
      vertexShader:'varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;uniform vec3 cloud;varying vec3 vSky;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec3 d=normalize(vSky);float y=max(d.y,0.);vec3 c=mix(horizon,zenith,pow(y,.55));vec2 p=d.xz/(.24+y)*2.3;float n=.57*noise(p)+.28*noise(p*2.12)+.15*noise(p*4.03);float clouds=smoothstep(.59,.82,n)*smoothstep(.025,.23,y)*(1.-smoothstep(.7,.98,y));c=mix(c,cloud,clouds*.65);float sun=max(dot(d,normalize(vec3(-.55,.82,.38))),0.);c+=vec3(1.,.81,.48)*pow(sun,44.)*.15+vec3(1.,.94,.76)*pow(sun,1200.)*.6;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
    }));sky.name='meadow-sky';sky.renderOrder=-10;scene.add(sky);
    function groundColor(x,z){var t=.5+.22*Math.sin(x*.045+z*.024)+.13*Math.cos(z*.083-x*.019)+.08*Math.sin(x*.3)*Math.cos(z*.29);return linear(0x72834c).lerp(linear(0x89965b),Math.max(0,Math.min(1,t)));}
    var ground=new T.PlaneGeometry(620,620,40,40),groundColors=[],gp=ground.attributes.position;
    for(var gi=0;gi<gp.count;gi++){var gc=groundColor(gp.getX(gi),-gp.getY(gi));groundColors.push(gc.r,gc.g,gc.b);}
    ground.setAttribute('color',new T.Float32BufferAttribute(groundColors,3));mesh(ground,mat(0xffffff,{vertexColors:true}),0,-.06,0).rotation.x=-Math.PI/2;
    // Distant rolling ground stays below the meadow's flat, inspectable habitat.
    for(var hill=0;hill<11;hill++){var ha=hill*2.39996;mesh(sphere,mat(hill%2?0x7d916a:0x8b9c77),Math.cos(ha)*268,-19,Math.sin(ha)*268,96,25+hash(hill+8)*17,72);}
    function pathX(z){return -7+Math.sin(z*.029)*12+Math.sin(z*.009)*4;}
    var pathPos=[],pathColor=[],pathIndices=[];
    for(var segment=0;segment<=100;segment++){
      var pz=-220+segment*4.4,px=pathX(pz),width=2.8+.5*Math.sin(pz*.055),slope=.348*Math.cos(pz*.029)+.036*Math.cos(pz*.009),norm=Math.sqrt(1+slope*slope);
      [-1.2,-.85,.85,1.2].forEach(function(side){var x=px+side*width/norm,z=pz-side*width*slope/norm,c=Math.abs(side)>1?groundColor(x,z):linear(0xb9aa82).lerp(linear(0xc2b48f),hash(segment+300)*.35);pathPos.push(x,.015,z);pathColor.push(c.r,c.g,c.b);});
      if(segment<100)for(var strip=0;strip<3;strip++){var a=segment*4+strip;pathIndices.push(a,a+4,a+1,a+1,a+4,a+5);}
    }
    var pathGeometry=new T.BufferGeometry();pathGeometry.setAttribute('position',new T.Float32BufferAttribute(pathPos,3));pathGeometry.setAttribute('color',new T.Float32BufferAttribute(pathColor,3));pathGeometry.setIndex(pathIndices);pathGeometry.computeVertexNormals();
    var pathMesh=mesh(pathGeometry,mat(0xffffff,{vertexColors:true,side:T.DoubleSide}),0,0,0);pathMesh.name='meadow-footpath';
    // Low irregular crowns and visible branches break up the tree-line silhouette.
    var crowns=[];
    for(var variant=0;variant<3;variant++){
      var crown=new T.SphereGeometry(1,13,10),cp=crown.attributes.position;
      for(var ci=0;ci<cp.count;ci++){var cx=cp.getX(ci),cy=cp.getY(ci),cz=cp.getZ(ci),cr=1+.12*Math.sin(cx*7+variant)*Math.sin(cz*8-variant)+.09*Math.cos(cy*10+cx*4);cp.setXYZ(ci,cx*cr,cy*(cr+.04*Math.sin(cz*11)),cz*cr);}
      crown.computeVertexNormals();crowns.push(crown);
    }
    for(var tree=0;tree<57;tree++){
      var a=tree*2.39996,r=143+hash(tree+91)*70,tx=Math.cos(a)*r,tz=Math.sin(a)*r,height=9+hash(tree+141)*9;
      mesh(cylinder,mat(0x655a43),tx,height*.5,tz,.48,height,.48);
      for(var branch=0;branch<3;branch++){
        var ba=branch*2.1+tree*.7,bx=Math.cos(ba),bz=Math.sin(ba),trunk=mesh(cylinder,mat(0x655a43),tx+bx*1.9,height*.8,tz+bz*1.9,.24,height*.57,.24);trunk.rotation.set(bz*.55,0,-bx*.55);
        var crownMesh=mesh(crowns[(tree+branch)%3],mat([0x425b3c,0x506842,0x5e714b,0x677b51][tree%4]),tx+bx*(3.3+hash(tree)*2),height+branch*1.6,tz+bz*3.5,5.3+hash(tree+branch+72)*3,5.5+hash(tree+branch)*3.2,5+hash(tree+branch+33)*3);
        crownMesh.rotation.y=tree+branch*.7;
      }
    }
    // Grass bends on the GPU; only the shared simulation clock is updated.
    // Three curved ribbons keep the full meadow density at twelve triangles per tuft.
    // This lower-detail ground cover is local to Butterfly Lab; shared recipes stay intact.
    var grassData={positions:[],colors:[]};
    function grassTriangle(a,b,c){[a,b,c].forEach(function(p){grassData.positions.push(p[0],p[1],p[2]);grassData.colors.push(p[3],p[3],p[3]);});}
    for(var blade=0;blade<3;blade++){
      var bladeAngle=blade*2.399963,bladeX=Math.cos(bladeAngle),bladeZ=Math.sin(bladeAngle),bladeHeight=.76+blade*.12,bladeReach=.46+blade*.065;
      function grassPoint(t,side){var bend=bladeReach*t*t,width=.115*Math.sin(Math.PI*t);return [bladeX*bend-bladeZ*width*side,bladeHeight*(t-.3*t*t*t),bladeZ*bend+bladeX*width*side,(side<0?.75:.93)+t*.04];}
      for(var section=0;section<3;section++){
        var t=section/3,next=(section+1)/3,a=grassPoint(t,-1),b=grassPoint(next,-1),c=grassPoint(t,1),d=grassPoint(next,1);
        if(section>0)grassTriangle(a,b,c);if(section<2)grassTriangle(b,d,c);
      }
    }
    var grass=dataGeometry(grassData);grass.name='meadow-grass-blades';
    var grassMaterial=mat(0x63834a,{side:T.DoubleSide,vertexColors:true});
    grassMaterial.onBeforeCompile=function(shader){shader.uniforms.bfBreeze=breeze;shader.vertexShader='uniform float bfBreeze;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 bfRoot=vec3(0.);\n#ifdef USE_INSTANCING\nbfRoot=instanceMatrix[3].xyz;\n#endif\nfloat bfWave=sin(bfBreeze*1.45+bfRoot.x*.095+bfRoot.z*.073)+.35*sin(bfBreeze*2.1-bfRoot.z*.17);transformed.x+=bfWave*.11*position.y*position.y;transformed.z+=bfWave*.045*position.y*position.y;');};
    grassMaterial.customProgramCacheKey=function(){return 'butterfly-meadow-breeze-v1';};
    var transform=new T.Object3D(),grassTransforms=[];
    for(var i=0;i<6200;i++){
      var gx=(hash(i*2+401)-.5)*260,gz=(hash(i*2+402)-.5)*260;
      if(Math.abs(gx-pathX(gz))<3.2)continue;
      var onLawn=Math.hypot(gx-38,gz-38)<19||Math.hypot(gx+42,gz-38)<19,inBed=Math.hypot(gx+42,gz+28)<20||Math.hypot(gx-38,gz+54)<20;
      var grassHeight=onLawn?.15+hash(i+710)*.12:inBed?.35+hash(i+711)*.48:.7+hash(i+712)*1.75;
      transform.position.set(gx,0,gz);transform.rotation.set(0,i*2.3999,0);transform.scale.set(.65+hash(i+713)*.7,grassHeight,.65+hash(i+713)*.7);transform.updateMatrix();grassTransforms.push(transform.matrix.clone());
    }
    var grassBatch=new T.InstancedMesh(grass,grassMaterial,grassTransforms.length);
    grassTransforms.forEach(function(matrix,i){grassBatch.setMatrixAt(i,matrix);grassBatch.setColorAt(i,linear([0xc2c6a4,0xa6b17d,0xe1d8ad,0xb8c68e,0xe2e2bc][i%5]));});
    grassBatch.name='shared-meadow-grass';grassBatch.instanceMatrix.needsUpdate=true;scene.add(grassBatch);
    // A few dry seed heads give depth without implying additional nectar resources.
    var seed=dataGeometry(kit.vegetation('seed'));
    for(var si=0;si<150;si++){
      var sx=(hash(si+1901)-.5)*210,sz=(hash(si+2901)-.5)*210;
      if(Math.abs(sx-pathX(sz))<5||Math.hypot(sx-38,sz-38)<21||Math.hypot(sx+42,sz-38)<21||Math.hypot(sx+42,sz+28)<20||Math.hypot(sx-38,sz+54)<20)continue;
      var sh=1.6+hash(si+3901)*1.4;mesh(cylinder,mat(0x7c8050),sx,sh*.5,sz,.018,sh,.018);mesh(seed,mat(0xb0a175,{vertexColors:true}),sx,sh,sz,.32,.32,.32);
    }
    var pebble=new T.IcosahedronGeometry(1,0);
    for(var stone=0;stone<125;stone++){var stoneZ=(hash(stone+4001)-.5)*300,stoneX=pathX(stoneZ)+(hash(stone+4101)-.5)*4.8;mesh(pebble,mat(stone%2?0x9d957b:0xc2b79a),stoneX,.03,stoneZ,.09+hash(stone+4201)*.15,.035,.08+hash(stone+4301)*.1);}
    function plantingBed(p,parent,nectar){
      var positions=[p.x,.024,p.z],colors=[],indices=[],center=linear(nectar?0x60783f:0x91a56b);colors.push(center.r,center.g,center.b);
      for(var ring=0;ring<3;ring++)for(var n=0;n<64;n++){
        var angle=n*Math.PI/32,rad=[10,17.2,20.4][ring]*(1+.025*Math.sin(angle*7)+.018*Math.sin(angle*11)),x=p.x+Math.cos(angle)*rad,z=p.z+Math.sin(angle)*rad,c=ring===2?groundColor(x,z):center.clone().lerp(groundColor(x,z),ring===1?.35:.08);
        positions.push(x,.024,z);colors.push(c.r,c.g,c.b);
        if(ring===0)indices.push(0,1+(n+1)%64,1+n);
        if(ring>0){var inner=1+(ring-1)*64+n,next=1+(ring-1)*64+(n+1)%64,outer=1+ring*64+n,outerNext=1+ring*64+(n+1)%64;indices.push(inner,next,outer,outer,next,outerNext);}
      }
      var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,mat(0xffffff,{vertexColors:true,side:T.DoubleSide}),0,0,0,1,1,1,parent);
    }
    // A curved, thin blade replaces the former ellipsoid; its origin is the lens target.
    function leafGeometry(){
      var pos=[],col=[],idx=[];
      for(var row=0;row<=12;row++){
        var x=-1+row/6,w=Math.pow(Math.max(0,1-x*x),.72);
        [-1,0,1].forEach(function(side){var ridge=.07*(1-x*x),y=ridge-.055*Math.abs(side)*w+.05*x*x;pos.push(x,y,side*w);var shade=side===0?1:side<0?.81:.9;col.push(shade,shade,shade);});
        if(row<12)for(var strip=0;strip<2;strip++){var a=row*3+strip;idx.push(a,a+1,a+3,a+1,a+4,a+3);}
      }
      var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();g.name='habitat-leaf-blade';return g;
    }
    var leaves=leafGeometry();
    function petalBuilder(){var positions=[],tones=[];return {tri:function(a,b,c,color){[a,b,c].forEach(function(p){positions.push(p[0],p[1],p[2]);tones.push(color);});},geometry:function(){return dataGeometry({positions:positions,tones:tones});}};}
    function flowerHead(milkweed){
      var out=petalBuilder();
      if(milkweed){
        for(var f=0;f<28;f++){
          var ny=1-2*(f+.5)/28,fa=f*2.39996,rr=Math.sqrt(1-ny*ny),normal=new T.Vector3(Math.cos(fa)*rr,ny,Math.sin(fa)*rr),u=new T.Vector3(-Math.sin(fa),0,Math.cos(fa)),v=new T.Vector3().crossVectors(normal,u),center=normal.clone().multiplyScalar(.49);center.y+=.15;
          function fp(along,across,height){return center.clone().addScaledVector(u,along).addScaledVector(v,across).addScaledVector(normal,height).toArray();}
          for(var petal=0;petal<5;petal++){
            var pa=petal*Math.PI*.4,ca=Math.cos(pa),sa=Math.sin(pa),base=fp(ca*.035,sa*.035,.015),left=fp(ca*.1-sa*.05,sa*.1+ca*.05,0),right=fp(ca*.1+sa*.05,sa*.1-ca*.05,0),tip=fp(ca*.16,sa*.16,-.09),hood=fp(ca*.074,sa*.074,.095);
            out.tri(base,left,tip,0xba7898);out.tri(base,tip,right,0xca8da9);out.tri(base,left,hood,0xebc4d3);out.tri(base,hood,right,0xd6a4bc);
          }
        }
      }else{
        for(var f=0;f<40;f++){
          var fa=f*2.39996,fr=Math.sqrt((f+.5)/40)*.49,x=Math.cos(fa)*fr,z=Math.sin(fa)*fr,height=.32+(.5-fr)*.5+(f%3)*.025,dx=Math.cos(fa)*.16,dz=Math.sin(fa)*.16;
          for(var side=0;side<5;side++){
            var aa=side*Math.PI*.4,bb=(side+1)*Math.PI*.4,a=[x+Math.cos(aa)*.035,.04,z+Math.sin(aa)*.035],b=[x+Math.cos(bb)*.035,.04,z+Math.sin(bb)*.035],c=[x+dx+Math.cos(aa)*.06,height,z+dz+Math.sin(aa)*.06],d=[x+dx+Math.cos(bb)*.06,height,z+dz+Math.sin(bb)*.06];out.tri(a,b,c,side%2?0xac85c0:0xbe9bd0);out.tri(b,d,c,0xc1a0d3);
          }
          var tip=[x+dx*1.7,height+.12,z+dz*1.7],left=[x+dx-dz*.3,height,z+dz+dx*.3],right=[x+dx+dz*.3,height,z+dz-dx*.3];out.tri(left,tip,right,0xdac0e4);
        }
        for(var bract=0;bract<9;bract++){var ba=bract*Math.PI*2/9,bx=Math.cos(ba),bz=Math.sin(ba);out.tri([0,-.07,0],[bx*.42-bz*.13,-.04,bz*.42+bx*.13],[bx*.72,-.14,bz*.72],0x738354);out.tri([0,-.07,0],[bx*.72,-.14,bz*.72],[bx*.42+bz*.13,-.04,bz*.42-bx*.13],0x64784a);}
      }
      var g=out.geometry();g.name=milkweed?'milkweed-flower-umbel':'bergamot-tubular-flower-head';return g;
    }
    var flowerHeads=[flowerHead(true),flowerHead(false)],flowerMaterial=mat(0xffffff,{vertexColors:true,side:T.DoubleSide}),larvalSupports=[];
    function plantStems(p,pi,parent,count,offset){
      for(var stem=0;stem<count;stem++){
        var pose=stemPose(p,pi,stem,count,offset),x=pose.x,z=pose.z,height=pose.height;
        mesh(cylinder,mat(pi===0?0x597346:0x586b3e),x,height/2,z,.055,height,.055,parent);
        for(var leaf=0;leaf<4;leaf++){
          var lp=leafPose(pose,leaf),blade=mesh(leaves,mat(pi===0?0x668c51:0x517443,{side:T.DoubleSide,vertexColors:true}),lp.x,lp.y,lp.z,pi===0?.95:.83,1,pi===0?.44:.31,parent);blade.rotation.set(0,lp.yaw,lp.tilt);
          if(pi===0&&stem===0&&leaf===3){blade.userData.larvalFeedingSupport=true;blade.userData.patch=parent===scene?'milkweed':'restoration';blade.name='larval-feeding-support-'+blade.userData.patch;larvalSupports.push(blade);}
          var vein=mesh(cylinder,mat(pi===0?0x9ca67b:0x90a078),lp.x,lp.y+.075,lp.z,.009,pi===0?1.65:1.42,.009,parent);vein.rotation.set(0,lp.yaw,lp.tilt-Math.PI/2);
        }
        var head=mesh(flowerHeads[pi],flowerMaterial,x,height,z,1,1,1,parent);head.rotation.y=stem*2.39996;
      }
    }
    PLANTS.forEach(function(p,pi){plantingBed(p,scene,p.nectar);if(p.nectar)plantStems(p,pi,scene,34,0);});
    var restoration=new T.Group();restoration.name='restoration-plots';scene.add(restoration);
    DESIGNS.forEach(function(d){
      var group=new T.Group();group.name='restoration-'+d.id;restoration.add(group);group.visible=d.id==='lawn';var p={x:-42,z:38};plantingBed(p,group,d.nectar);
      if(d.id==='flowers')plantStems(p,1,group,34,0);
      if(d.id==='mixed'){plantStems(p,0,group,17,-6);plantStems(p,1,group,17,6);}
    });
    var plotBorder=mesh(new T.RingGeometry(18.4,18.57,64),new T.MeshBasicMaterial({color:0xb79053,side:T.DoubleSide,transparent:true,opacity:.65}),-42,.038,38);plotBorder.rotation.x=-Math.PI/2;
    function batchStatic(parent){
      var batches=new Map();parent.children.slice().forEach(function(o){if(!o.isMesh||o.isInstancedMesh||o.userData.larvalFeedingSupport)return;var key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
      batches.forEach(function(items){if(items.length<2)return;var first=items[0],batch=new T.InstancedMesh(first.geometry,first.material,items.length);items.forEach(function(o,i){o.updateMatrix();batch.setMatrixAt(i,o.matrix);parent.remove(o);});batch.instanceMatrix.needsUpdate=true;parent.add(batch);});
    }
    batchStatic(scene);restoration.children.forEach(batchStatic);
    function butterfly(scale){var result=createMonarch(T,kit);result.root.scale.setScalar(scale);scene.add(result.root);return result;}
    var player=butterfly(.38),visitors=[];player.root.name='player-monarch';for(var b=0;b<4;b++)visitors.push(butterfly(.12));
    var shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:.24}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(.13,.17,.075,(1.-smoothstep(.1,1.,r))*opacity);\n#include <encodings_fragment>\n}'});
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
    function syncLifecycle(v,progress,reduced,focus){
      var maturationMoment=focus==='maturation'?chrysalisMaturation(v,progress):null;syncMaturation(maturationMoment&&maturationMoment.active?maturationMoment:null);
      // Restore first, including a missing generation, a different patch, and
      // every non-feeding view. The meadow never retains an old bite overlay.
      larvalSupports.forEach(function(blade){blade.visible=true;});feedingLeaf.visible=false;feedingLeaf.userData.feeding=null;feedingLeaf.userData.contactWorld=null;feedingLeaf.userData.mouthWorld=null;lifecycle.userData.larvalFeeding=null;
      specimens.caterpillar.position.set(0,.1,0);specimens.caterpillar.scale.setScalar(1);specimens.caterpillar.rotation.set(0,0,0);jaws.forEach(function(jaw){jaw.rotation.set(0,0,0);});
      lifecycle.visible=!!v;if(!v)return;
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
    function animate(clock,reduced){breeze.value=reduced?0:Number.isFinite(clock)?Math.max(0,clock):0;}
    return {scene:scene,player:player,visitors:visitors,ring:ring,targetRing:targetRing,restoration:restoration,focusHalo:focusHalo,playerShadow:playerShadow,animate:animate,lifecycle:lifecycle,syncLifecycle:syncLifecycle,feeding:feeding};
  }

  var CSS = `
    .bf-maturation-observation{margin-top:14px;padding:14px;border:1px solid var(--bf-line);border-left:4px solid #aa8137;border-radius:11px;background:var(--bf-bg)}.bf-maturation-cue{display:block;margin-top:6px;font-size:16px}.bf-maturation-observation>p{font-size:13px}.bf-maturation-observation .bf-life-watch-actions{margin-top:12px}@media(max-width:580px){.bf-maturation-observation{padding:11px}}@media(forced-colors:active){.bf-maturation-observation{border-color:CanvasText}}
    .bf-larval-observation{margin-top:14px;padding:14px;border:1px solid var(--bf-line);border-left:4px solid #6b8745;border-radius:11px;background:var(--bf-bg)}.bf-larval-readout{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bf-larval-readout span{display:block;font-size:12px;color:var(--bf-muted)}.bf-larval-readout strong{font-size:14px}.bf-larval-observation>p{font-size:13px}.bf-larval-observation .bf-life-watch-actions{margin-top:12px}@media(max-width:580px){.bf-larval-observation{padding:11px}.bf-larval-readout{grid-template-columns:1fr;gap:8px}}@media(forced-colors:active){.bf-larval-observation{border-color:CanvasText}.bf-larval-readout span{color:CanvasText}}
    .bfl{--bf-bg:#f4f3e9;--bf-panel:#fffcf3;--bf-ink:#24382e;--bf-muted:#526356;--bf-line:#c6cdb9;--bf-accent:#245c43;color:var(--bf-ink);background:var(--bf-bg);font:15px/1.5 system-ui,sans-serif;padding:22px;border-radius:20px;max-width:1450px;margin:auto;width:100%;box-sizing:border-box}
    .bfl[data-dark="true"]{--bf-bg:#172d26;--bf-panel:#203a30;--bf-ink:#f2f4df;--bf-muted:#c4d3bf;--bf-line:#60816b;--bf-accent:#b1dec2}
    .bfl *{box-sizing:border-box}.bfl h2,.bfl h3,.bfl p{margin:0}.bfl h2{font:600 clamp(27px,4vw,42px)/1.15 Georgia,serif;letter-spacing:-.025em}.bfl h3{font:600 22px/1.2 Georgia,serif}.bfl p{margin-top:8px}.bfl button,.bfl summary{font:inherit}.bfl button{min-height:44px;border:1px solid var(--bf-line);border-radius:10px;padding:9px 14px;background:var(--bf-panel);color:var(--bf-ink);cursor:pointer;font-weight:650}.bfl button:hover{border-color:var(--bf-accent)}.bfl button:disabled{opacity:.55;cursor:default}.bfl button[aria-pressed="true"],.bfl .bf-primary{background:#245c43;color:#fff;border-color:#245c43}.bfl button:focus-visible,.bfl summary:focus-visible,.bfl a:focus-visible,.bfl [tabindex]:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bfl a{color:var(--bf-accent);text-decoration:underline}.bf-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--bf-muted)}.bf-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:18px}.bf-header p{max-width:720px;color:var(--bf-muted)}.bf-mark{font-size:44px;flex-shrink:0}.bf-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:18px;align-items:start}.bf-stage{position:relative;height:520px;overflow:hidden;border-radius:16px;background:#c8e0d6;border:1px solid var(--bf-line);isolation:isolate}.bf-stage canvas{display:block;width:100%;height:100%;position:absolute;inset:0}.bf-stage .bf-map{z-index:0}.bf-stage .bf-gl{z-index:1}.bf-overlay{position:absolute;z-index:2;pointer-events:none;inset:0;padding:16px;display:flex;flex-direction:column;justify-content:space-between}.bf-scene-badge{align-self:flex-start;background:#203b30ed;color:#fff8e6;border:1px solid #70967c;padding:7px 12px;border-radius:50px;font-size:12px;letter-spacing:.04em}.bf-scene-bottom{background:#fffcf3ed;color:#24382e;align-self:flex-start;max-width:100%;border-radius:10px;padding:10px 14px;border:1px solid #c6cdb9}.bf-scene-bottom strong{display:block}.bf-scene-bottom small{display:block;color:#526356}.bf-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.bf-toolbar .bf-spacer{flex:1}.bf-status{padding:12px 14px;background:var(--bf-panel);border:1px solid var(--bf-line);border-radius:12px;min-height:70px}.bf-status p{margin:0}.bf-help{font-size:12px;color:var(--bf-muted);margin:8px 0!important}.bf-panel{background:var(--bf-panel);border:1px solid var(--bf-line);border-radius:15px;padding:17px}.bf-panel+.bf-panel{margin-top:14px}.bf-destination{display:block;text-align:left;width:100%;margin-top:10px;padding:12px!important}.bf-destination span,.bf-destination small{display:block}.bf-destination small{font-weight:400;margin-top:4px}.bf-progress{display:flex;gap:5px;margin:12px 0 5px}.bf-progress i{height:5px;background:var(--bf-line);flex:1;border-radius:5px}.bf-progress i[data-done="true"]{background:var(--bf-accent)}.bf-journal{list-style:none;padding:0;margin:12px 0 0}.bf-journal li{border-top:1px solid var(--bf-line);padding:10px 0}.bf-journal strong{display:block}.bf-journal p{font-size:13px;color:var(--bf-muted);margin:4px 0}.bf-bottom{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.bf-bottom>.bf-panel{margin-top:0}.bf-life{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.bf-life span{flex:1;min-width:85px;border:1px solid var(--bf-line);border-radius:9px;padding:9px;font-size:13px}.bf-life b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-touch{display:flex;flex-wrap:wrap;gap:6px}.bf-touch button{touch-action:none;min-width:46px}.bf-sources{margin-top:18px;font-size:13px;color:var(--bf-muted)}.bf-sources summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:650}.bf-sources ul{padding-left:20px}.bf-question button{display:block;width:100%;text-align:left;margin-top:9px}.bf-question [role="status"]{font-size:13px;margin-top:10px}.bf-meter{font-size:12px;color:var(--bf-muted);margin-top:12px}.bf-meter meter{width:100%;height:10px;display:block;margin-top:4px;accent-color:#245c43}
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
  `;

  function ButterflyLab(props) {
    var ctx=props.ctx,R=ctx.React,h=R.createElement;
    // This tool had NO translator: every accessible name shipped English in
    // all 63 packs, and for the flight canvas the aria-label is the only
    // description a screen-reader user gets. ctx.t is the host contract every
    // other STEM tool uses; honour its 2-arg fallback form.
    var bfT=function(k,fb){var v;try{v=(typeof ctx.t==='function')?ctx.t('stem.butterfly.'+k,fb):null;}catch(e){v=null;}return (v==null)?fb:v;};
    var stateRef=R.useRef(null);if(!stateRef.current)stateRef.current=freshState((ctx.toolData||{}).butterfly);
    var s=stateRef.current,api=R.useRef(null),stage=R.useRef(null),map=R.useRef(null),keys=R.useRef({});
    var pair=R.useState(0),refresh=pair[1];
    var statusPair=R.useState('Take flight, or choose a habitat for guided travel. Land and examine each patch to build your field journal.'),message=statusPair[0],setMessage=statusPair[1];
    var rendererPair=R.useState('loading'),renderer=rendererPair[0],setRenderer=rendererPair[1];
    var mapPair=R.useState(false),mapMode=mapPair[0],setMapMode=mapPair[1],mapModeRef=R.useRef(false);mapModeRef.current=mapMode;
    var viewPair=R.useState('follow'),view=viewPair[0],setView=viewPair[1],viewRef=R.useRef(view);viewRef.current=view;
    var lensPair=R.useState(null),lens=lensPair[0],setLens=lensPair[1],lensRef=R.useRef(lens);lensRef.current=lens;
    var lifePair=R.useState(false),lifeWatch=lifePair[0],setLifeWatch=lifePair[1],lifeRef=R.useRef(false);lifeRef.current=lifeWatch;
    var lifeMotion=R.useRef({progress:1,playing:false,signature:'',focus:'context',speed:1});
    var feedPair=R.useState(false),feedWatch=feedPair[0],setFeedWatch=feedPair[1],feedRef=R.useRef(false);feedRef.current=feedWatch;
    var feedMotion=R.useRef({phase:'sip',progress:1,playing:false,signature:'',contact:true,focus:'whole',speed:1}),feedLabels=R.useRef({});
    var feedLabelRefs=R.useMemo(function(){var callbacks={};['tube','pollen','surface'].forEach(function(id){callbacks[id]=function(node){feedLabels.current[id]=node;if(node&&api.current)api.current.draw();};});return callbacks;},[]);
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
    function applyDesign(){var result=applyPlan(s,plan,guess);if(result.ok){closeFeed();closeLens();lifeMotion.current.playing=false;if(!lifecycleVisual(s))closeLife();keys.current={};persist();setCycleFeedback('');}setDesignFeedback(result.message);announce(result.message);}
    function startBrood(){var result=layEggs(s,eggSite,broodGuess);if(result.ok){persist();showLife(true,true);}setCycleFeedback(result.message);announce(result.message);}
    function nextStage(){var result=advanceStage(s);if(result.ok){persist();showLife(true,false);}setCycleFeedback(result.message);announce(result.message);}
    function recordBrood(){var result=broodResult(s);if(result.ok){lifeMotion.current.playing=false;lifeMotion.current.progress=1;persist();setBroodGuess('');}setCycleFeedback(result.message);announce(result.message);}
    function dropBrood(){var result=abandonBrood(s);if(result.ok){lifeMotion.current.playing=false;lifeMotion.current.progress=1;if(!lifecycleVisual(s))closeLife();persist();setBroodGuess('');setEggSite('');}setCycleFeedback(result.message);announce(result.message);}
    function copyReport(){
      var text=fieldReport(s);
      copyReportText(text).then(function(ok){
        setCopyState(ok?'ok':'fail');
        announce(ok?'Field report copied. Paste it wherever you keep your notes.':'Copying was blocked here. The report is shown below so you can select and copy it.');
      });
    }
    function startSeason(){
      s.season.mowing=mowPlan;s.season.prediction=seasonGuess||null;
      var result=runSeason(s,seasonSite,mowPlan,seasonGuess);
      if(result.ok){persist();setSeasonGuess('');}
      setSeasonFeedback(result.message);announce(result.message);
    }

    function update(){refresh(function(n){return n+1;});if(api.current)api.current.draw();}
    function announce(text){setMessage(text);update();}
    function persist(){setCopyState('');if(ctx.updateMulti)ctx.updateMulti('butterfly',save(s));else if(ctx.setToolData)ctx.setToolData(function(prev){return Object.assign({},prev,{butterfly:save(s)});});}
    function writeNotebook(changes){s.notebook=cleanNotebook(Object.assign({},s.notebook,changes));if(Object.prototype.hasOwnProperty.call(changes,'claim'))setPickedClaim(s.notebook.claim);persist();update();}
    function jumpTo(id){var node=sections.current[id];if(!node)return;feedMotion.current.playing=false;s.paused=true;s.target=null;stopFlight(s);lifeMotion.current.playing=false;keys.current={};update();node.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:'auto'});}
    function closeLens(){lensRef.current=null;setLens(null);}
    function closeFeed(){feedRef.current=false;setFeedWatch(false);feedMotion.current.playing=false;}
    function showFeed(phase,focusScene,restart){
      var visual=feedingVisual(s);if(!visual)return;var previous=feedMotion.current,reset=focusScene||!feedRef.current||restart;
      closeLife();closeLens();s.paused=true;s.target=null;stopFlight(s);keys.current={};feedRef.current=true;setFeedWatch(true);
      var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      feedMotion.current={phase:feedingPhase(phase).id,progress:reduced?1:0,playing:!reduced,signature:visual.patch+':'+(visual.plan||''),contact:reset?true:previous.contact,focus:reset?'whole':previous.focus,speed:reset?1:previous.speed};
      announce(feedingPhase(phase,feedMotion.current.contact).title+'. Read the observation and controls below the scene.');
      if(focusScene&&stage.current){stage.current.focus({preventScroll:true});stage.current.scrollIntoView({block:'center',behavior:'auto'});}
    }
    function stillFeed(){feedMotion.current.progress=1;feedMotion.current.playing=false;update();}
    function pauseFeed(){feedMotion.current.playing=false;update();}
    function seekFeed(event){feedMotion.current.progress=clamp(Number(event.target.value)/100,0,1);feedMotion.current.playing=false;update();}
    function continueFeed(){if(!feedRef.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches||feedMotion.current.progress>=1)return;feedMotion.current.playing=true;update();}
    function focusFeed(focus){feedMotion.current.focus=focus;update();}
    function contactFeed(contact){feedMotion.current.contact=contact;feedMotion.current.playing=false;announce(contact?'The receptive surface is in the pollen path. Inspect the transfer.':'The receptive surface is outside the pollen path. The butterfly can still feed.');}
    function speedFeed(event){var speed=Number(event.target.value);if([.5,1,2].indexOf(speed)<0)return;feedMotion.current.speed=speed;update();}
    function recordFeed(){
      var visual=feedingVisual(s),motion=feedMotion.current;
      if(!feedRef.current||!visual||motion.signature!==visual.patch+':'+(visual.plan||'')){announce('Open a flower visit at this patch before recording it.');return;}
      var result=recordPollination(s,motion.phase,motion.progress,motion.contact);
      if(result.ok)persist();announce(result.message);
    }
    function explainPollination(){writeNotebook({claim:'feeding-always-pollinates'});jumpTo('notebook');}
    function closeLife(){lifeRef.current=false;setLifeWatch(false);lifeMotion.current.playing=false;lifeMotion.current.progress=1;}
    function showLife(animate,focusScene){
      var visual=lifecycleVisual(s);if(!visual)return;var previous=lifeMotion.current,key=visual.patch+':'+(visual.plan||'')+':'+visual.stage+':'+visual.recorded,reset=focusScene||!lifeRef.current||previous.signature!==key;closeFeed();
      s.paused=true;s.target=null;stopFlight(s);keys.current={};closeLens();lifeRef.current=true;setLifeWatch(true);
      var focus=reset?'context':previous.focus,moving=animate&&!visual.blocked&&(visual.stage==='caterpillar'||visual.stage==='adult'||visual.stage==='chrysalis'&&focus==='maturation')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lifeMotion.current={progress:moving?0:1,playing:moving,signature:key,focus:focus,speed:reset?1:previous.speed};update();
      if(focusScene&&stage.current){stage.current.focus({preventScroll:true});stage.current.scrollIntoView({block:'center',behavior:'auto'});}
    }
    function replayLife(){if(lifecycleVisual(s))showLife(true,false);}
    function pauseLife(){lifeMotion.current.playing=false;update();}
    function seekLife(event){var progress=Number(event.target.value);lifeMotion.current.progress=clamp(Number.isFinite(progress)?progress/100:1,0,1);lifeMotion.current.playing=false;update();}
    function stillLife(){lifeMotion.current.progress=1;lifeMotion.current.playing=false;update();}
    function continueLife(){var visual=lifecycleVisual(s);if(!lifeRef.current||!visual||visual.blocked||(['caterpillar','adult'].indexOf(visual.stage)<0&&!(visual.stage==='chrysalis'&&lifeMotion.current.focus==='maturation'))||window.matchMedia('(prefers-reduced-motion: reduce)').matches||lifeMotion.current.progress>=1)return;lifeMotion.current.playing=true;update();}
    function focusLife(focus){if(['context','specimen','detail','feeding','maturation'].indexOf(focus)<0)return;var visual=lifecycleVisual(s);if(focus==='feeding'&&!larvalFeeding(visual,lifeMotion.current.progress).active||focus==='maturation'&&!chrysalisMaturation(visual,lifeMotion.current.progress).active)return;if(visual&&visual.stage==='chrysalis'&&focus!=='maturation')lifeMotion.current.playing=false;lifeMotion.current.focus=focus;update();}
    function speedLife(event){var speed=Number(event.target.value);if([.5,1,2].indexOf(speed)<0)return;lifeMotion.current.speed=speed;update();}
    function chooseLens(kind){
      closeFeed();closeLife();
      var detail=fieldDetail(s,kind);lensRef.current=detail?kind:null;setLens(lensRef.current);
      announce(detail?detail.title+'. Read the field notes below the flight controls.':'Returned to the wide habitat view. Your butterfly remains landed.');
    }
    function toggle(){closeFeed();closeLife();closeLens();s.paused=!s.paused;stopFlight(s);keys.current={};if(!s.paused&&s.landed){s.landed=null;s.y=Math.max(6,s.y);}announce(s.paused?'Flight paused. You can still inspect the map and your journal.':'Flight active. Steer with the direction controls, or choose a habitat. G switches between wingbeats and gliding.');}
    function toggleGlide(){if(s.paused||s.landed)return;s.gliding=!s.gliding;s.target=null;announce(s.gliding?'Gliding. Your wings stay open as you move forward and gently lose height. Steer as usual; press G again for wingbeats.':'Wingbeats resumed. Release the direction controls to slow to a hover.');}
    function travel(id){closeFeed();closeLife();closeLens();stopFlight(s);s.landed=null;s.y=Math.max(6,s.y);s.target=id;s.paused=false;keys.current={};announce('Guided flight to '+patch(id,s).name+'. You will slow down near the patch. Steer to take control.');}
    function visitDirect(id){var p=patch(id,s);if(!p)return;closeFeed();closeLife();closeLens();keys.current={};stopFlight(s);s.target=null;s.landed=null;s.paused=true;s.x=p.x;s.z=p.z;s.y=6;announce('Arrived at '+p.name+' without flying. Choose Land here, then Examine patch to record your evidence.');if(stage.current){stage.current.focus({preventScroll:true});stage.current.scrollIntoView({block:'center',behavior:'instant'});}}
    function landing(){closeFeed();closeLife();closeLens();keys.current={};if(s.landed){stopFlight(s);s.landed=null;s.y=Math.max(6,s.y);s.paused=false;announce('Airborne. Choose your next habitat.');}else announce(land(s).message);}
    function examine(){var result=observe(s);if(result.ok)persist();if(s.landed==='restoration')setDesignFeedback(result.message);announce(result.message);}
    R.useEffect(function(){
      var alive=true,world=null,gl=null,camera=null,raf=0,last=0,lastUI=0,observer=null;
      var node=stage.current,cv=map.current,reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
      var width=1,height=1,lastMapMode=mapModeRef.current,lastView=viewRef.current,lastLens=lensRef.current,lastLifeWatch=lifeRef.current,lastFeedWatch=feedRef.current;
      function paintMap(){
        var g=cv.getContext('2d');if(!g)return;
        var dpr=Math.min(window.devicePixelRatio||1,2);g.setTransform(dpr,0,0,dpr,0,0);
        var feeding=feedRef.current?feedingVisual(s):null;if(feeding){paintFeedingDiagram(g,width,height,feeding,feedMotion.current.phase,feedMotion.current.progress,reduced.matches,feedMotion.current.contact,feedMotion.current.focus);return;}
        var specimen=lifeRef.current?lifecycleVisual(s):null;if(specimen){paintLifecycleDiagram(g,width,height,specimen,lifeMotion.current.progress,reduced.matches,lifeMotion.current.focus);return;}
        var sky=g.createLinearGradient(0,0,width,height);sky.addColorStop(0,'#e1e9cf');sky.addColorStop(1,'#b7cba2');g.fillStyle=sky;g.fillRect(0,0,width,height);
        var scale=Math.min(width,height)/240,cx=width/2,cy=height/2;
        g.strokeStyle='#9dad8c';g.lineWidth=1;
        for(var line=-100;line<=100;line+=20){g.beginPath();g.moveTo(cx+line*scale,cy-100*scale);g.lineTo(cx+line*scale,cy+100*scale);g.stroke();g.beginPath();g.moveTo(cx-100*scale,cy+line*scale);g.lineTo(cx+100*scale,cy+line*scale);g.stroke();}
        g.lineWidth=12;g.strokeStyle='#cabf9d';g.beginPath();g.moveTo(cx,cy+110*scale);g.bezierCurveTo(cx-35*scale,cy+20*scale,cx+25*scale,cy-40*scale,cx-10*scale,cy-110*scale);g.stroke();
        habitats(s).forEach(function(p){var x=cx+p.x*scale,y=cy+p.z*scale;g.fillStyle=p.color;g.strokeStyle=p.id==='restoration'?'#9a4c0b':'#3d5b44';g.lineWidth=2;g.beginPath();g.arc(x,y,17*scale,0,Math.PI*2);g.fill();g.stroke();
          if(p.id===s.target){g.strokeStyle='#9a4c0b';g.setLineDash([4,4]);g.beginPath();g.moveTo(cx+s.x*scale,cy+s.z*scale);g.lineTo(x,y);g.stroke();g.setLineDash([]);}
          if(p.id===s.landed&&lensRef.current){g.strokeStyle='#754413';g.lineWidth=3;g.beginPath();g.arc(x,y,21*scale,0,Math.PI*2);g.stroke();}
          g.font='600 12px system-ui';var tw=g.measureText(p.name).width;g.fillStyle='#fffcf3';g.fillRect(x-tw/2-5,y+19*scale,tw+10,22);g.fillStyle='#24382e';g.textAlign='center';g.fillText(p.name,x,y+19*scale+15);
        });
        g.save();g.translate(cx+s.x*scale,cy+s.z*scale);g.rotate(-s.yaw);g.fillStyle='#ee9c41';g.strokeStyle='#352c27';g.lineWidth=2;
        [-1,1].forEach(function(side){g.beginPath();g.ellipse(side*6,0,6,10,side*.35,0,Math.PI*2);g.fill();g.stroke();});g.fillStyle='#352c27';g.fillRect(-1.5,-9,3,19);g.restore();
        g.fillStyle='#314934';g.font='600 12px system-ui';g.textAlign='center';g.fillText('N',width-24,28);
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
        node.dataset.bfSpeed=Math.hypot(s.vx,s.vz).toFixed(2);node.dataset.bfBank=s.bank.toFixed(3);node.dataset.bfFlightMode=s.landed?'landed':s.paused?'paused':s.target?'guided':s.gliding?'gliding':'manual';node.dataset.bfView=viewRef.current;
        var detail=fieldDetail(s,lensRef.current);node.dataset.bfLens=detail?detail.kind:'';
        var useMap=mapModeRef.current||!gl;
        cv.style.visibility=useMap?'visible':'hidden';if(gl)gl.domElement.style.visibility=useMap?'hidden':'visible';
        Object.keys(feedLabels.current).forEach(function(id){var pair=feedLabels.current[id];if(pair)pair.style.visibility=useMap?'hidden':'visible';});
        if(useMap){paintMap();return;}
        var T=window.THREE,p=world.player.root,time=reduced.matches?0:s.clock,pose=flightPose(s,reduced.matches);
        p.visible=!observing;world.syncLifecycle(generation,lifeMotion.current.progress,reduced.matches,watched?lifeMotion.current.focus:'context');world.feeding.sync(feeding,feedMotion.current.phase,feedMotion.current.progress,reduced.matches,feedMotion.current.contact);
        p.position.set(s.x,s.y+pose.bob,s.z);p.rotation.set(pose.pitch,s.yaw,pose.bank,'YXZ');
        world.player.wings[0].rotation.z=pose.leftWing;world.player.wings[1].rotation.z=pose.rightWing;
        if(world.player.hindWings)world.player.hindWings.forEach(function(wing,i){wing.rotation.z=(i?1:-1)*pose.hindLag;});
        var nectarPatches=habitats(s).filter(function(patch){return patch.nectar;});
        world.visitors.forEach(function(v,i){v.root.visible=!observing;var patch=nectarPatches[i%nectarPatches.length],a=time*.24+i*2.39996,rx=7+i*1.7,rz=6+i;
          v.root.position.set(patch.x+Math.sin(a)*rx,6+i*.55+Math.sin(a*1.7)*.8,patch.z+Math.cos(a)*rz);v.root.rotation.set(0,Math.atan2(-Math.cos(a)*rx,Math.sin(a)*rz),reduced.matches?0:Math.sin(a)*.12);
          v.wings.forEach(function(w,j){w.rotation.z=(j?1:-1)*(reduced.matches?.4:.2+.95*(.5+.5*Math.sin(time*17+i)));});});
        if(world.animate)world.animate(s.clock,reduced.matches);
        if(world.playerShadow){world.playerShadow.visible=!observing;world.playerShadow.position.set(s.x,.045,s.z);world.playerShadow.scale.set(5+s.y*.13,3.3+s.y*.09,1);world.playerShadow.material.uniforms.opacity.value=Math.max(.08,.25-s.y*.006);}
        world.restoration.children.forEach(function(group){group.visible=group.name==='restoration-'+s.restoration.design;});
        world.ring.position.set(s.x,.09,s.z);world.ring.visible=!observing&&viewRef.current==='meadow';var dest=patch(s.target,s);world.targetRing.visible=!observing&&!!dest;if(dest)world.targetRing.position.set(dest.x,.08,dest.z);
        world.focusHalo.visible=!!detail;
        var cameraView=feeding?feedingCamera(feeding,feedMotion.current.phase,width/height,feedMotion.current.focus,feedMotion.current.progress,reduced.matches,feedMotion.current.contact):watched?lifecycleCamera(generation,width/height,lifeMotion.current.focus,lifeMotion.current.progress,reduced.matches):cameraPose(s,viewRef.current,detail,reduced.matches);camera.position.fromArray(cameraView.position);camera.lookAt.apply(camera,cameraView.target);
        if(camera.fov!==cameraView.fov){camera.fov=cameraView.fov;camera.updateProjectionMatrix();}
        if(detail){var point=detail.point;world.focusHalo.position.set(point.x,point.y,point.z);world.focusHalo.quaternion.copy(camera.quaternion);}
        try{gl.render(world.scene,camera);}catch(e){fallback();return;}
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
      function resize(){width=Math.max(1,node.clientWidth);height=Math.max(1,node.clientHeight);var dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(width*dpr);cv.height=Math.round(height*dpr);if(gl){gl.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}draw();}
      function disposeWorld(){
        if(world){var geometries=new Set(),materials=new Set();world.scene.traverse(function(o){if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){materials.add(m);});});geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});world=null;}
        if(gl){var old=gl;gl=null;old.domElement.removeEventListener('webglcontextlost',lost);old.dispose();if(window.StemLab.releaseGl)window.StemLab.releaseGl(old);old.domElement.remove();}
      }
      function fallback(){disposeWorld();if(alive){Object.keys(feedLabels.current).forEach(function(id){var label=feedLabels.current[id];if(label)label.style.visibility='hidden';});setRenderer('map');paintMap();cv.style.visibility='visible';}}
      function lost(e){e.preventDefault();feedMotion.current.playing=false;s.paused=true;stopFlight(s);lifeMotion.current.playing=false;keys.current={};fallback();setMessage('The 3D view was interrupted. Motion is paused and your journal is intact. Continue with the illustrated view.');refresh(function(n){return n+1;});}
      function pauseForFocus(){var moving=lifeMotion.current.playing||feedMotion.current.playing;lifeMotion.current.playing=false;feedMotion.current.playing=false;if(!s.paused){s.paused=true;s.target=null;stopFlight(s);setMessage('Flight paused while you were away. Resume when you are ready.');refresh(function(n){return n+1;});}else if(moving)refresh(function(n){return n+1;});keys.current={};last=0;draw();}
      function hidden(){if(document.hidden)pauseForFocus();}
      function motionPreferenceChanged(){if(reduced.matches){lifeMotion.current.playing=false;feedMotion.current.playing=false;feedMotion.current.progress=1;}draw();refresh(function(n){return n+1;});}
      var keyMap={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyE:'rise',KeyQ:'lower'};
      function keydown(e){if(!node.contains(document.activeElement)||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))return;if(keyMap[e.code]){e.preventDefault();if(!lifeRef.current&&!feedRef.current)keys.current[keyMap[e.code]]=true;}if(e.code==='Space'&&!e.repeat){e.preventDefault();if(feedRef.current){pauseFeed();}else if(lifeRef.current){lifeMotion.current.playing=false;update();}else toggle();}if(e.code==='KeyG'&&!e.repeat){e.preventDefault();toggleGlide();}}
      function keyup(e){if(keyMap[e.code])delete keys.current[keyMap[e.code]];}
      function frame(now){if(!alive)return;var wasPaused=s.paused,dt=last?Math.max(0,(now-last)/1000):0,motion=lifeMotion.current,wasMoving=motion.playing,feedingMotion=feedMotion.current,wasFeeding=feedingMotion.playing;
        if(motion.playing){if(!lifeRef.current||reduced.matches){motion.playing=false;}else{motion.progress=Math.min(1,motion.progress+dt*motion.speed/3.6);if(motion.progress>=1)motion.playing=false;}}
        if(feedingMotion.playing){if(!feedRef.current||reduced.matches){feedingMotion.playing=false;feedingMotion.progress=1;}else{feedingMotion.progress=Math.min(1,feedingMotion.progress+dt*feedingMotion.speed/5);if(feedingMotion.progress>=1)feedingMotion.playing=false;}}
        advanceFrame(s,last?(now-last)/1000:0,keys.current);last=now;
        if(s.paused&&!wasPaused)setMessage('You have reached '+nearest(s).plant.name+'. Land to examine this habitat.');
        if(!s.paused||!wasPaused||wasMoving||wasFeeding||lastFeedWatch!==feedRef.current||lastLifeWatch!==lifeRef.current||lastMapMode!==mapModeRef.current||lastView!==viewRef.current||lastLens!==lensRef.current)draw();
        if(s.paused!==wasPaused||wasMoving!==motion.playing||wasFeeding!==feedingMotion.playing||((!s.paused||motion.playing||feedingMotion.playing)&&now-lastUI>250)){refresh(function(n){return n+1;});lastUI=now;}
        raf=requestAnimationFrame(frame);
      }
      api.current={draw:draw};resize();observer=new ResizeObserver(resize);observer.observe(node);
      window.addEventListener('blur',pauseForFocus);document.addEventListener('visibilitychange',hidden);node.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);reduced.addEventListener('change',motionPreferenceChanged);
      setRenderer('loading');
      Promise.all([window.StemLab.ensureThree(),window.StemMeadow?Promise.resolve(window.StemMeadow):window.StemLab.ensureMeadow()]).then(function(deps){
        if(!alive)return;var T=deps[0];
        try{gl=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));gl.outputEncoding=T.sRGBEncoding;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=.95;
          gl.domElement.className='bf-gl';gl.domElement.setAttribute('aria-hidden','true');gl.domElement.addEventListener('webglcontextlost',lost);node.insertBefore(gl.domElement,cv);world=buildWorld(T,deps[1]);camera=new T.PerspectiveCamera(52,1,.1,600);setRenderer('three');resize();
        }catch(error){fallback();}
      }).catch(function(){if(alive)fallback();});
      raf=requestAnimationFrame(frame);
      return function(){alive=false;cancelAnimationFrame(raf);lifeMotion.current.playing=false;feedMotion.current.playing=false;observer.disconnect();window.removeEventListener('blur',pauseForFocus);document.removeEventListener('visibilitychange',hidden);node.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);reduced.removeEventListener('change',motionPreferenceChanged);disposeWorld();api.current=null;keys.current={};s.paused=true;};
    },[retry]);
    var near=nearest(s),landed=patch(s.landed,s),remaining=s.observations.length,detail=fieldDetail(s,lens),recorded=evidenceRecorded(s,landed);
    var specimen=lifecycleVisual(s),watching=lifeWatch&&specimen,specimenStage=specimen?STAGES.find(function(st){return st.id===specimen.stage;}):null;
    var feeding=feedWatch?feedingVisual(s):null,feedingStep=feedingPhase(feedMotion.current.phase,feedMotion.current.contact),feedResult=feedingOutcome(feeding,feedMotion.current.phase,feedMotion.current.progress,feedMotion.current.contact),observing=!!(watching||feeding);
    var flowerVisits=cleanPollination(s.pollination).visits,feedVisits=feeding?currentPollinationVisits(s).filter(function(row){return row.patch===feeding.patch&&(row.plan||null)===(feeding.plan||null)&&row.species===feeding.species;}):[];
    var feedSaved=feedVisits.some(function(row){return row.contact===feedMotion.current.contact;}),feedPairReady=feedVisits.length===2;
    var motionReduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var lifeDetail=specimen?lifecycleInspection(specimen,lifeMotion.current.focus,lifeMotion.current.progress,motionReduced):null,lifeCanAnimate=!!(specimen&&!specimen.blocked&&(specimen.stage==='caterpillar'||specimen.stage==='adult'||specimen.stage==='chrysalis'&&lifeMotion.current.focus==='maturation'));
    var larvalMeal=larvalFeeding(specimen,lifeMotion.current.progress),watchingMeal=!!(watching&&larvalMeal.active&&lifeMotion.current.focus==='feeding');
    var maturity=chrysalisMaturation(specimen,lifeMotion.current.progress),watchingMaturation=!!(watching&&maturity.active&&lifeMotion.current.focus==='maturation');
    var reportEmpty=reportIsEmpty(s),reportText=reportEmpty?'':fieldReport(s);
    var seasonPatch=seasonSite?patch(seasonSite,s):null;
    var seasonView=seasonPatch?seasonOutcome(seasonPatch,mowPlan):null;
    var cycleSite=patch(s.lifecycle.patch,s),cycleIndex=STAGES.findIndex(function(st){return st.id===s.lifecycle.stage;});
    var canAdvance=!!(cycleSite&&s.lifecycle.stage&&cycleIndex<reachedStage(cycleSite));
    var verdict=pickedClaim?judgeClaim(s,pickedClaim):null;
    var journey=investigationSteps(s),citations=notebookEvidence(s),notebook=s.notebook;
    function button(label,onClick,extra){return h('button',Object.assign({type:'button',onClick:onClick},extra||{}),label);}
    function returnToGuide(){return h('div',{className:'bf-return'},button('Back to investigation guide',function(){jumpTo('guide');}));}
    function hold(label,key){return button(label,function(){},{'aria-label':label,'data-direction':key,disabled:s.paused||!!s.landed,
      onPointerDown:function(e){if(s.paused||s.landed||e.button!==0)return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){return;}keys.current[key]=true;},
      onPointerUp:function(){delete keys.current[key];},onPointerCancel:function(){keys.current={};stopFlight(s);update();},onLostPointerCapture:function(){delete keys.current[key];},
      onKeyDown:function(e){if((e.key===' '||e.key==='Enter')&&!s.paused&&!s.landed){e.preventDefault();keys.current[key]=true;}},onKeyUp:function(){delete keys.current[key];},onBlur:function(){delete keys.current[key];stopFlight(s);}});}
    return h('section',{className:'bfl','data-butterfly-root':true,'data-dark':!!ctx.isDark,'data-contrast':!!ctx.isContrast,'aria-label':bfT('a11y_butterfly_habitat_lab',"Butterfly Habitat Lab")},
      h('style',null,CSS),
      h('header',{className:'bf-header'},h('div',null,h('div',{className:'bf-eyebrow'},'Field study 01 · Mid-Atlantic, North America · Summer'),h('h2',null,'A meadow through butterfly eyes'),h('p',null,'Fly as a monarch. Follow the flowers, investigate the leaves, and discover what makes a habitat support more than one stage of life.')),h('span',{className:'bf-mark','aria-hidden':true},'🦋')),
      h('nav',{className:'bf-guide',ref:function(node){sections.current.guide=node;},tabIndex:-1,'aria-label':bfT('a11y_investigation_guide','Investigation guide')},
        h('div',{className:'bf-guide-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Your field investigation'),h('h3',null,'What helps a monarch habitat work?')),h('span',{className:'bf-guide-count'},journey.completed+' of 5 steps complete')),
        h('div',{className:'bf-guide-steps'},journey.steps.map(function(item,i){return button(h(R.Fragment,null,(i+1)+'. '+item.name,h('small',null,item.progress)),function(){jumpTo(item.id);},{key:item.id,'data-bf-step':item.id,'data-complete':String(item.done),'aria-current':journey.next&&journey.next.id===item.id?'step':undefined});})),
        h('div',{className:'bf-guide-next'},h('p',null,journey.next?journey.next.prompt:'Your investigation includes observations, comparisons, and your explanation. Review the field report to take it with you.'),button(journey.next?'Continue: '+journey.next.name:'Review field report',function(){jumpTo(journey.next?journey.next.id:'report');},{className:'bf-primary'})),
        h('p',{className:'bf-guide-note'},'Follow the suggested path or open any investigation. Progress reflects records you made, not a score.')),
      h('div',{className:'bf-layout',ref:function(node){sections.current.explore=node;},tabIndex:-1},h('div',null,
        h('div',{className:'bf-stage',ref:stage,role:'region',tabIndex:0,'aria-label':feeding?'Feeding and pollination close-up. '+feedingStep.title+'. Space pauses motion. Read the observation and controls below.':watching?'Life cycle close-up. '+specimenStage.name+' at '+specimen.name+'. Space pauses stage motion. Read the stage notes and controls below.':bfT('a11y_butterfly_flight_area_arrow_keys_or_w_a_s_d_to_move_',"Butterfly flight area. Arrow keys or W A S D to move, E to rise, Q to lower, G to glide, Space to pause."),'data-bf-paused':String(s.paused),'data-bf-renderer':mapMode?'map':renderer,'data-bf-landed':s.landed||'','data-bf-design':s.restoration.design},
          h('canvas',{className:'bf-map',ref:map,'aria-hidden':true}),
          feeding?['tube','pollen','surface'].map(function(id){return h('div',{key:id,className:'bf-feed-label','aria-hidden':true,ref:feedLabelRefs[id]},h('i',null),h('span',null,id==='tube'?'Drinking tube':id==='pollen'?'Pollen on leg':feedResult.received?'Pollen received':'Pollen in transfer'));}):null,
          landed&&!observing?h('div',{className:'bf-lens-tools',role:'group','aria-label':bfT('a11y_field_lens_controls',"Field lens controls")},button('Flowers',function(){chooseLens('flowers');},{'aria-pressed':lens==='flowers'}),button('Leaves',function(){chooseLens('leaves');},{'aria-pressed':lens==='leaves'}),button('Wide view',function(){chooseLens(null);},{'aria-pressed':!lens})):null,
          h('div',{className:'bf-overlay','aria-hidden':true},h('div',{className:'bf-scene-badge'},feeding?(mapMode||renderer==='map'?'ILLUSTRATED POLLINATION':'NECTAR & POLLEN · CLOSE UP'):watching?(mapMode||renderer==='map'?'ILLUSTRATED LIFE CYCLE':'LIFE CYCLE · ON THE PLANT'):mapMode||renderer==='map'?'HABITAT MAP · SAME EXPLORATION':'MONARCH HABITAT · SUMMER MEADOW'),h('div',{className:'bf-scene-bottom'+(detail?' bf-lens-caption':'')},feeding?h('div',{className:'bf-eyebrow'},feeding.species==='milkweed'?'Common milkweed':'Wild bergamot'):watching?h('div',{className:'bf-eyebrow'},specimen.name):detail?h('div',{className:'bf-eyebrow'},'Field lens · '+detail.species):null,h('strong',null,feeding?feedingStep.title:watching?specimenStage.ordinal+' · '+specimenStage.name:detail?detail.part:landed?'Landed · '+landed.name:s.target?'Guided flight · '+patch(s.target,s).name:s.paused?'Ready when you are':'Exploring the meadow'),h('small',null,feeding?'Enlarged nectar and pollen cues · same-species flowers':watching?(specimen.recorded?'Recorded generation · review':specimen.blocked?'No milkweed food here':'One enlarged specimen · time compressed'):detail?(detail.present?'Resource present':'Resource absent')+' · '+(detail.kind==='flowers'?'Adult nectar':'Monarch host leaves'):landed?(recorded?'Evidence recorded. Look closer, or choose your next habitat.':'Compare flowers and leaves above, then examine this patch.'):near.distance<=14?'Within landing range · Land here to investigate':near.plant.name+' · '+Math.round(near.distance)+' scene units away')))),
        feeding?h('section',{className:'bf-feed-watch bf-life-watch','aria-label':'Feeding and pollination observation'},
          h('div',{className:'bf-life-watch-head'},h('div',null,h('div',{className:'bf-eyebrow'},'A flower visit, up close'),h('h3',null,feedingStep.title)),h('span',{className:'bf-life-stage-label'},({sip:'01',carry:'02',deposit:'03'})[feedingStep.id]+' / 03')),
          h('ol',{className:'bf-feed-steps','aria-label':'Pollination sequence'},['Sip nectar','Carry pollen','Transfer pollen'].map(function(label,i){return h('li',{key:label,'aria-current':['sip','carry','deposit'][i]===feedingStep.id?'step':undefined},label);})),
          h('p',null,feedingStep.note),
          h('p',{className:'bf-help'},feeding.species==='milkweed'?'Milkweed packages its pollen in paired pollinia. A packet can catch on a leg and enter a receptive slit in another milkweed flower. Compare contact and missed contact in the final step.':'Bergamot has tubular flowers. Loose pollen grains can brush onto the butterfly and reach a receptive stigma on another bergamot flower. Compare contact and missed contact in the final step.'),
          h('div',{className:'bf-feed-inspect',role:'group','aria-label':'Flower visit views'},h('span',{className:'bf-eyebrow'},'Look closer'),['whole','tube','pollen'].map(function(focus){return button(focus==='whole'?'Whole visit':focus==='tube'?'Drinking tube close-up':'Pollen close-up',function(){focusFeed(focus);},{key:focus,'aria-pressed':feedMotion.current.focus===focus});})),
          h('div',{className:'bf-feed-playback'},h('label',{className:'bf-feed-scrub'},h('span',null,'Visit progress',h('output',{'aria-live':'off'},Math.round(feedMotion.current.progress*100)+'%')),h('input',{type:'range',min:0,max:100,step:1,value:Math.round(feedMotion.current.progress*100),'aria-label':'Visit progress','aria-valuetext':Math.round(feedMotion.current.progress*100)+'% of '+feedingStep.title,onChange:seekFeed,onPointerDown:pauseFeed})),
            h('label',{className:'bf-feed-speed'},'Playback speed',h('select',{'aria-label':'Playback speed',value:feedMotion.current.speed,onChange:speedFeed,disabled:motionReduced},h('option',{value:.5},'Half speed'),h('option',{value:1},'Normal speed'),h('option',{value:2},'Double speed')))),
          feedingStep.id==='deposit'?h('fieldset',{className:'bf-feed-contact'},h('legend',null,'Does the pollen make contact?'),h('p',{className:'bf-help'},'Compare the receptive surface in or outside the pollen path. Both flowers are the same plant species.'),h('div',null,button('Touches receptive surface',function(){contactFeed(true);},{'aria-pressed':feedMotion.current.contact}),button('Misses receptive surface',function(){contactFeed(false);},{'aria-pressed':!feedMotion.current.contact}))):null,
          h('section',{className:'bf-feed-result','aria-label':'Pollen transfer result'},h('div',{className:'bf-feed-ledger'},h('p',null,h('span',null,'On the butterfly'),h('strong',null,feedResult.carriedLabel)),h('p',null,h('span',null,'On the next flower'),h('strong',null,feedResult.receivedLabel))),h('p',{className:'bf-help'},feedResult.summary)),
          h('div',{className:'bf-feed-key'},h('span',null,h('i',{'data-cue':'nectar','aria-hidden':true}),'Nectar: liquid food'),h('span',null,h('i',{'data-cue':'pollen','aria-hidden':true}),'Pollen: carried outside'),h('span',null,h('i',{'data-cue':'surface','aria-hidden':true}),'Receptive flower surface')),
          h('div',{className:'bf-life-watch-actions'},feedingStep.id!=='deposit'?button(feedingStep.id==='sip'?'Fly to next flower':'Transfer pollen',function(){showFeed(feedingStep.id==='sip'?'carry':'deposit',false);},{className:'bf-primary',disabled:feedMotion.current.progress<1}):null,
            button('Continue feeding motion',continueFeed,{disabled:motionReduced||feedMotion.current.playing||feedMotion.current.progress>=1}),button('Replay feeding motion',function(){showFeed(feedingStep.id,false);},{disabled:motionReduced||feedMotion.current.playing}),button('Pause feeding motion',pauseFeed,{disabled:motionReduced||!feedMotion.current.playing}),button('Show step still',stillFeed,{disabled:feedMotion.current.progress>=1}),
            button('Restart flower visit',function(){showFeed('sip',false,true);}),button('Return to habitat view',function(){closeFeed();update();})),
          h('p',{className:'bf-help'},motionReduced?'Reduced motion: each step opens still. Drag Visit progress or use its arrow keys to inspect any moment without playback.':'Drag Visit progress to pause at any moment. Continue resumes there; Replay starts the current step again. Each step stops at its endpoint.'),
          feedingStep.id==='deposit'?h('section',{className:'bf-pollination-comparison','aria-label':'Pollination comparison'},
            h('div',{className:'bf-pollination-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Keep a field note'),h('h4',null,'Same flowers. Different contact.')),button(feedSaved?'Visit recorded':'Record this flower visit',recordFeed,{className:'bf-primary',disabled:feedSaved||feedMotion.current.progress!==1})),
            h('p',{className:'bf-help'},feedPairReady?'Both contact cases are saved. Replay them or explain your comparison.':feedSaved?'This case is saved. Switch contact to inspect and record the other case.':feedMotion.current.progress!==1?'Finish this step before recording: move Visit progress to 100% or choose Show step still.':'Record the completed visit you inspected. Watching and switching contact do not save observations automatically.'),
            h('div',{className:'bf-pollination-cases'},[true,false].map(function(contact){var saved=feedVisits.some(function(row){return row.contact===contact;});return h('div',{key:String(contact),'data-bf-pollination-case':contact?'contact':'miss','data-recorded':String(saved)},h('strong',null,contact?'Contact':'Missed contact'),h('span',{className:'bf-pollination-saved'},saved?'Recorded':'Not recorded yet'),h('p',null,saved?(contact?'Nectar feeding + pollen transfer':'Nectar feeding; no pollen transfer'):'Inspect this case, then record what happened.'));})),
            feedPairReady?h('div',{className:'bf-pollination-conclusion'},h('p',null,'Both visits included nectar feeding. Only contact transferred pollen to the receptive surface. Feeding and pollination are different events.'),button('Explain this comparison',explainPollination)):h('p',{className:'bf-help'},feedVisits.length+' of 2 cases recorded at this patch. Keep the flowers the same and change only contact.'),
            h('p',{className:'bf-help'},'These are observations of a teaching model. Pollen transfer does not establish whether fertilization or seed development followed.')):null,
          h('p',{className:'bf-help'},'Flower structures, pollen, and time are enlarged or simplified so you can follow them. The contact comparison illustrates one cause of transfer; it does not predict seed production. Nectar is shown turquoise; yellow pollen stays outside the drinking tube. Use Record this flower visit to save a pollination observation, or Examine patch to record habitat evidence.')):null,
        watching?h('section',{className:'bf-life-watch','aria-label':'Life cycle observation','data-life-stage':specimen.stage},
          h('div',{className:'bf-life-watch-head'},h('div',null,h('div',{className:'bf-eyebrow'},specimen.recorded?'Reviewing a recorded generation':'Watch metamorphosis'),h('h3',null,specimen.title)),h('span',{className:'bf-life-stage-label'},specimenStage.ordinal+' / 04')),
          !specimen.host?h('p',{className:'bf-life-caution'},'This is a model experiment on a non-host patch. Wild monarchs normally lay their eggs on milkweed. The model lets you compare what happens when that food is absent.'):null,
          h('div',{className:'bf-feed-inspect bf-life-inspect',role:'group','aria-label':'Life cycle views'},h('span',{className:'bf-eyebrow'},'Look closer'),
            button('Plant context',function(){focusLife('context');},{'aria-pressed':lifeMotion.current.focus==='context'}),button('Specimen close-up',function(){focusLife('specimen');},{'aria-pressed':lifeMotion.current.focus==='specimen'}),button(lifeDetail.detailLabel,function(){focusLife('detail');},{'aria-pressed':lifeMotion.current.focus==='detail'}),larvalMeal.active?button('Leaf feeding close-up',function(){focusLife('feeding');},{'aria-pressed':lifeMotion.current.focus==='feeding'}):null,maturity.active?button('Chrysalis maturation close-up',function(){focusLife('maturation');},{'aria-pressed':lifeMotion.current.focus==='maturation'}):null),
          lifeCanAnimate?h('div',{className:'bf-feed-playback bf-life-playback'},h('label',{className:'bf-feed-scrub'},h('span',null,'Stage illustration progress',h('output',{'aria-live':'off'},Math.round(lifeMotion.current.progress*100)+'%')),h('input',{type:'range',min:0,max:100,step:1,value:Math.round(lifeMotion.current.progress*100),'aria-label':'Stage illustration progress','aria-valuetext':Math.round(lifeMotion.current.progress*100)+'% of the '+(watchingMeal?'leaf feeding':watchingMaturation?'chrysalis appearance':specimen.stage==='adult'?'wing expansion':'caterpillar growth')+' illustration',onChange:seekLife,onPointerDown:pauseLife})),
            h('label',{className:'bf-feed-speed'},'Stage playback speed',h('select',{'aria-label':'Stage playback speed',value:lifeMotion.current.speed,onChange:speedLife,disabled:motionReduced},h('option',{value:.5},'Half speed'),h('option',{value:1},'Normal speed'),h('option',{value:2},'Double speed')))):null,
          h('section',{className:'bf-life-detail','aria-label':'Stage inspection notes'},h('strong',null,watchingMaturation?'Watch the chrysalis change':lifeMotion.current.focus==='detail'||watchingMeal?lifeDetail.title:'What to notice'),h('p',null,watchingMaturation?'Follow changes visible from outside the chrysalis. The folded wing pattern gradually shows through the casing; the rebuilding inside is not shown.':lifeDetail.note)),
          watchingMeal?h('section',{className:'bf-larval-observation','aria-label':'Caterpillar feeding observation'},
            h('div',{className:'bf-larval-readout'},h('div',null,h('span',null,'Food source'),h('strong',null,'Milkweed leaf')),h('div',null,h('span',null,'Leaf tissue'),h('strong',null,larvalMeal.completedBites>0||larvalMeal.notches.some(function(n){return n.radius>0;})?'Feeding marks at the edge':'Unbitten leaf edge'))),
            h('p',null,larvalMeal.phase==='complete'?'The sample feeding sequence is complete. Compare the scalloped edge with the unbitten leaf.':larvalMeal.phase==='bite'?'The mouthparts meet the leaf edge. Watch the missing tissue grow as the bite closes.':'Follow the mouthparts along the margin. The feeding marks stay where leaf tissue was removed.'),
            h('div',{className:'bf-life-watch-actions'},button('Before feeding',function(){lifeMotion.current.progress=0;lifeMotion.current.playing=false;update();}),button('After feeding',stillLife)),
            h('p',{className:'bf-help'},'Use Continue or Replay to watch feeding, or scrub to compare moments. These enlarged sample bites are separate from the growth view: they do not measure food intake, feeding rate, or development time. Rewinding restores the illustration, not a real leaf.')):null,
          watchingMaturation?h('section',{className:'bf-maturation-observation','aria-label':'Chrysalis maturation observation'},
            h('div',{className:'bf-eyebrow'},'An outward change'),h('strong',{className:'bf-maturation-cue'},maturity.label),h('p',null,maturity.note),
            h('div',{className:'bf-life-watch-actions',role:'group','aria-label':'Chrysalis appearance comparisons'},[{label:'Green chrysalis',progress:0},{label:'Wing markings appear',progress:.6},{label:'Before emergence',progress:1}].map(function(moment){return button(moment.label,function(){lifeMotion.current.progress=moment.progress;lifeMotion.current.playing=false;update();},{key:moment.label,'aria-pressed':Math.abs(lifeMotion.current.progress-moment.progress)<.001});})),
            h('p',{className:'bf-help'},'These sample appearances compress time. The percentage locates a moment in this illustration; it is not a measurement of development. Reaching the last view does not hatch or record the butterfly. Choose Watch next stage to continue the model.')):null,
          h('div',{className:'bf-life-watch-actions'},button('Watch next stage',nextStage,{className:'bf-primary',disabled:!canAdvance}),button('Record this generation',recordBrood,{disabled:!s.lifecycle.stage||canAdvance}),
            lifeCanAnimate?h(R.Fragment,null,button('Continue stage motion',continueLife,{disabled:motionReduced||lifeMotion.current.playing||lifeMotion.current.progress>=1}),button('Replay stage motion',replayLife,{disabled:motionReduced||lifeMotion.current.playing}),button('Pause stage motion',pauseLife,{disabled:motionReduced||!lifeMotion.current.playing}),button('Show stage still',stillLife,{disabled:lifeMotion.current.progress>=1})):null,
            button('Return to flight view',function(){closeLife();update();})),
          h('p',{className:'bf-help'},lifeCanAnimate?(motionReduced?'Reduced motion: this illustration stays still. Drag Stage illustration progress or use its arrow keys to inspect '+(watchingMeal?'leaf feeding':watchingMaturation?'chrysalis appearance':'growth and wing expansion')+' without automatic playback.':'Drag Stage illustration progress to pause at any moment. Continue resumes there; Replay starts this '+(watchingMeal?'feeding sequence':watchingMaturation?'appearance sequence':'stage')+' again. The slider illustrates changes, not elapsed time.'):specimen.blocked?'This caterpillar stays small because it has no milkweed food. Close-ups remain available; there is no growth playback.':'This stage is shown still. Use the close-ups to inspect its visible structure; development inside the egg or chrysalis is not shown.'),
          h('p',{className:'bf-help'},'One specimen represents the generation; sizes are enlarged. Development takes days to weeks, not seconds. Inspection controls do not advance the generation. Next stage changes the model; only Record saves the result.'),
          button('Back to life cycle investigation',function(){lifeMotion.current.playing=false;jumpTo('cycle');},{className:'bf-life-back'})):null,
        h('div',{className:'bf-toolbar'},button(s.paused?'Take flight':'Pause flight',toggle,{className:'bf-primary','data-bf-play':true}),button('Glide',toggleGlide,{'aria-pressed':s.gliding,disabled:s.paused||!!landed}),button(landed?'Lift off':'Land here',landing,{disabled:observing||(!landed&&near.distance>14)}),button('Examine patch',examine,{disabled:observing||!landed}),h('span',{className:'bf-spacer'}),button('Map',function(){setMapMode(!mapMode);},{'aria-pressed':mapMode})),
        !observing?h('div',{className:'bf-feed-invite bf-life-invite'},h('p',null,landed?(landed.nectar?'Follow a monarch from a nectar sip to pollen transfer between flowers.':'This mown patch has no flowers to feed from. Visit milkweed or bergamot to watch pollination.'):'Land on milkweed or bergamot to watch feeding and pollination.'),button('Watch feeding & pollination',function(){showFeed('sip',true);},{disabled:!landed||!landed.nectar})):null,
        h('div',{className:'bf-camera-tools',role:'group','aria-label':bfT('a11y_camera_views','Camera views')},h('span',null,'Camera'),['follow','wing','meadow'].map(function(id){return button(id==='follow'?'Follow view':id==='wing'?'Wing view':'Meadow view',function(){closeFeed();closeLife();closeLens();setView(id);},{key:id,'aria-pressed':!observing&&view===id,disabled:mapMode||renderer!=='three'});}),h('small',{className:'bf-flight-readout'},feeding?'Observing a flower visit':watching?'Observing a generation':landed?'Perched':s.paused?'Flight paused':s.target?'Guided approach':s.gliding?'Gliding · gently descending':Math.hypot(s.vx,s.vz)>.4?'Wingbeats · steering':'Hovering')),
        h('div',{className:'bf-status',role:'status','aria-live':'polite'},h('p',null,message)),
        detail?h('section',{className:'bf-field-card','aria-label':bfT('a11y_field_lens_reading',"Field lens reading")},h('div',{className:'bf-field-head'},h('div',{className:'bf-eyebrow'},detail.kind==='flowers'?'Flower lens · Adult stage':'Leaf lens · Caterpillar stage'),h('span',{className:'bf-resource-tag'},detail.present?'Resource present':'Resource absent')),h('h3',null,detail.title),h('p',null,detail.note),h('p',{className:'bf-help'},(mapMode||renderer==='map'?'The outlined map patch is the habitat being studied. ':'The ring points to a part of the illustrative plant model. ')+(recorded?'Evidence is already in your journal or planting comparisons.':'Use Examine patch to record this visit.'))):null,
        h('p',{className:'bf-help'},'Focus the scene: W A S D or arrows steer, E / Q change height, G glides, and Space pauses. Hold a direction to accelerate; release to slow. Directions follow the map in every camera view. Reduced motion keeps a steady camera and still vegetation.'),
        h('div',{className:'bf-touch',role:'group','aria-label':bfT('a11y_flight_direction_controls',"Flight direction controls")},hold('← Left','left'),hold('↑ Forward','forward'),hold('↓ Back','back'),hold('→ Right','right'),hold('Rise','rise'),hold('Lower','lower')),
        renderer==='map'?h('p',{className:'bf-help'},'3D is unavailable. All habitat visits and journal activities work on this map. ',button('Retry 3D',function(){setRetry(retry+1);})):null
      ),h('aside',{className:'bf-aside'},
        h('section',{className:'bf-panel','aria-label':bfT('a11y_habitat_destinations',"Habitat destinations")},h('div',{className:'bf-eyebrow'},'Choose a place to explore'),h('h3',null,'Explore, then redesign.'),h('p',{className:'bf-help'},'Choose a patch for guided flight, or visit without flying. Both routes use the same Land here and Examine patch actions.'),habitats(s).map(function(p,i){return h('div',{key:p.id,className:'bf-destination-row'},h('button',{type:'button',className:'bf-destination','aria-pressed':s.target===p.id,onClick:function(){travel(p.id);}},h('span',null,(evidenceRecorded(s,p)?'✓ ':('0'+(i+1)+' · '))+p.name),h('small',null,p.latin)),button('Visit without flying',function(){visitDirect(p.id);},{className:'bf-visit-direct','aria-label':'Visit '+p.name+' without flying'}));}),h('div',{className:'bf-meter'},h('label',null,'Flight energy · '+Math.round(s.energy)+'%',h('meter',{min:0,max:100,value:s.energy})),h('p',null,'A simplified activity meter. Examine a flowering patch to replenish it.'))),
        h('section',{className:'bf-panel','aria-label':bfT('a11y_field_journal',"Field journal")},h('div',{className:'bf-eyebrow'},'Reference field journal'),h('h3',null,remaining+' of 3 patches investigated'),h('div',{className:'bf-progress','aria-hidden':true},PLANTS.map(function(p){return h('i',{key:p.id,'data-done':s.observations.indexOf(p.id)>=0});})),
          remaining?h('ul',{className:'bf-journal'},s.observations.map(function(id){var p=patch(id);return h('li',{key:id},h('strong',null,p.name),h('p',null,p.note));})):h('p',{className:'bf-help'},'Record the three reference patches here. Your restoration comparisons appear in the design activity below.')),
        h('section',{className:'bf-panel bf-pollination-notes','aria-label':'Pollination field notes'},h('div',{className:'bf-eyebrow'},'Nectar visits · saved observations'),h('h3',null,flowerVisits.length+' flower visit'+(flowerVisits.length===1?'':'s')+' recorded'),
          flowerVisits.length?h(R.Fragment,null,h('ul',{className:'bf-journal'},flowerVisits.map(function(row){var current=pollinationIsCurrent(s,row),p=patch(row.patch,s);return h('li',{key:row.patch+':'+(row.plan||'')+':'+row.contact,'data-bf-pollination-record':row.patch+':'+(row.plan?row.plan+':':'')+(row.contact?'contact':'miss'),'data-current':String(current)},h('strong',null,p.name),h('span',{className:'bf-pollination-species'},row.species==='milkweed'?'Common milkweed':'Wild bergamot'),row.plan?h('span',{className:'bf-pollination-species'},design(row.plan).short+(current?'':' · replanted since')):null,h('p',null,row.contact?'Contact: nectar feeding and pollen transfer.':'Missed contact: nectar feeding without pollen transfer.'));})),h('p',{className:'bf-help'},'Saved model visits can be cited in your notebook. Earlier planting records stay here and in the report.'),button('Use pollination evidence',explainPollination)):
            h('p',{className:'bf-help'},'Watch a flower visit, inspect contact and missed contact, then record each completed case. Your saved comparison will appear here.')))),
      h('section',{className:'bf-panel bf-design',ref:function(node){sections.current.design=node;},tabIndex:-1,'aria-label':bfT('a11y_habitat_design_activity',"Habitat design activity")},
        h('div',{className:'bf-design-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Your next investigation · Predict → Plant → Observe'),h('h3',null,'What could this patch become?'),h('p',{className:'bf-help'},'Redesign the fourth patch and test what it offers a monarch. Each plan shows an established summer planting in bloom; real plants need time to grow.')),h('span',{className:'bf-design-current'},'In the meadow: '+design(s.restoration.design).short)),
        h('div',{className:'bf-design-steps'},h('fieldset',null,h('legend',null,'1. Choose a planting plan'),h('div',{className:'bf-design-choices'},DESIGNS.map(function(d){return button(h(R.Fragment,null,d.name,h('small',null,d.detail)),function(){setPlan(d.id);setGuess('');},{key:d.id,'aria-pressed':plan===d.id});}))),
          h('div',null,h('label',null,'2. Predict the resources available',h('select',{value:guess,onChange:function(e){setGuess(e.target.value);}},h('option',{value:''},'Choose your prediction'),PREDICTIONS.map(function(p){return h('option',{key:p.id,value:p.id},p.label);}))),
            h('div',{className:'bf-design-actions'},button('Apply habitat plan',applyDesign,{className:'bf-primary',disabled:!guess}),button('Visit restoration plot',function(){travel('restoration');stage.current.focus({preventScroll:true});stage.current.scrollIntoView({block:'center',behavior:'auto'});})),
            h('p',{className:'bf-help'},s.restoration.prediction?'Prediction saved. Land at the restoration plot and examine it to record a result.':'Apply a plan, then visit and examine it. Changing plants alone does not count as evidence.'))),
        h('p',{className:'bf-design-feedback'},designFeedback),
        h('table',{className:'bf-comparison'},h('caption',null,'Your planting comparisons · '+s.restoration.trials.length+' of 3 examined'),h('thead',null,h('tr',null,h('th',{scope:'col'},'Established plan'),h('th',{scope:'col'},'Adult nectar'),h('th',{scope:'col'},'Caterpillar host leaves'))),h('tbody',null,DESIGNS.map(function(d){var trial=s.restoration.trials.find(function(t){return t.design===d.id;});return h('tr',{key:d.id,'data-design-record':d.id},h('th',{scope:'row'},d.short),h('td',null,trial?(d.nectar?'Present':'Absent'):'Not examined',trial?h('span',null,'Predicted: '+prediction(trial.prediction).label):null),h('td',null,trial?(d.host?'Present':'Absent'):'Not examined'));}))),
        h('p',{className:'bf-help'},'Each row keeps your latest examined plan. Resource availability is one part of habitat quality; this comparison does not estimate butterfly numbers or survival.'),returnToGuide()),
      h('section',{className:'bf-panel bf-cycle',ref:function(node){sections.current.cycle=node;},tabIndex:-1,'aria-label':bfT('a11y_life_cycle_investigation',"Life cycle investigation"),'data-bf-cycle-patch':s.lifecycle.patch||'','data-bf-cycle-stage':s.lifecycle.stage||''},
        h('div',{className:'bf-cycle-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Follow a generation · Predict → Lay → Observe'),h('h3',null,'What happens to the next generation here?'),h('p',{className:'bf-help'},'You fly the adult. Place eggs on a patch you have already examined, then follow the generation one stage at a time and see how far it gets.')),
          h('span',{className:'bf-cycle-current'},!cycleSite?'No generation started':s.lifecycle.stage?'Generation at: '+cycleSite.name:'Last followed: '+cycleSite.name)),
        h('div',{className:'bf-life-invite'},h('p',null,specimen?'Look closely at '+specimenStage.name.toLowerCase()+' on '+specimen.name+'. The camera follows this generation, wherever your flying adult is.':'After you lay eggs, a close-up will show the followed specimen on its plant. Watch it hatch, grow, pupate, and emerge one step at a time.'),button('Watch on plant',function(){showLife(false,true);},{disabled:!specimen})),
        h('div',{className:'bf-cycle-steps'},
          h('div',null,h('label',{htmlFor:'bf-egg-site'},'1. Choose where to lay eggs'),
            h('select',{id:'bf-egg-site',value:eggSite,onChange:function(e){setEggSite(e.target.value);},disabled:!!s.lifecycle.stage},
              h('option',{value:''},'Choose a patch'),
              habitats(s).map(function(p){return h('option',{key:p.id,value:p.id,disabled:!evidenceRecorded(s,p)},p.name+(evidenceRecorded(s,p)?'':' · examine first'));})),
            h('p',{className:'bf-help'},'Only patches with recorded evidence are available. Examine a patch to unlock it.')),
          h('div',null,h('label',{htmlFor:'bf-brood-guess'},'2. Predict how far it gets'),
            h('select',{id:'bf-brood-guess',value:broodGuess,onChange:function(e){setBroodGuess(e.target.value);},disabled:!!s.lifecycle.stage},
              h('option',{value:''},'Choose your prediction'),
              OUTCOMES.map(function(o){return h('option',{key:o.id,value:o.id},o.label);})),
            h('div',{className:'bf-cycle-actions'},
              button('Lay eggs here',startBrood,{className:'bf-primary',disabled:!eggSite||!broodGuess||!!s.lifecycle.stage}),
              button('Next stage',nextStage,{disabled:!s.lifecycle.stage||!canAdvance}),
              button('Record result',recordBrood,{disabled:!s.lifecycle.stage||canAdvance}),
              button('Start over',dropBrood,{disabled:!s.lifecycle.stage})),
            h('p',{className:'bf-help'},s.lifecycle.stage?'Follow the generation to the end, then record what happened.':'Laying eggs does not change the plants. What the generation can do depends on what is already growing there.'))),
        h('ol',{className:'bf-track'},STAGES.map(function(st,i){
          // While a generation runs the track follows its current stage. Once the
          // result is recorded the stage clears, so the track shows the finished
          // outcome instead of blanking just as the learner reads it.
          var done=!s.lifecycle.stage&&cycleSite&&broodFor(s,cycleSite.id);
          var edge=done?reachedStage(cycleSite):STAGES.findIndex(function(x){return x.id===s.lifecycle.stage;});
          var reached=!!cycleSite&&i<=edge;
          var state=!cycleSite||(!s.lifecycle.stage&&!done)?'idle':st.id===s.lifecycle.stage?'current':reached?stageStatus(cycleSite,i)==='thriving'?'reached':'blocked':'idle';
          return h('li',{key:st.id,'data-state':state,'data-stage':st.id},h('b',null,st.ordinal+' · '+st.name),
            h('small',null,cycleSite&&reached?(stageStatus(cycleSite,i)==='thriving'?st.thriving:st.failing):st.caption),
            state==='current'?h('span',{className:'bf-track-tag'},'Now'):null);
        })),
        h('p',{className:'bf-cycle-feedback',role:'status','aria-live':'polite'},cycleFeedback),
        h('table',{className:'bf-broods'},h('caption',null,'Generations you have followed · '+s.lifecycle.broods.length+' recorded'),
          h('thead',null,h('tr',null,h('th',{scope:'col'},'Patch'),h('th',{scope:'col'},'You predicted'),h('th',{scope:'col'},'What happened'))),
          h('tbody',null,habitats(s).map(function(p){var b=broodFor(s,p.id);
            // A row from an earlier planting is named rather than dropped, so a
            // learner who replanted can see their earlier work was not lost.
            var stale=!b&&p.id==='restoration'?broodRowsFor(s,p.id)[0]:null;
            return h('tr',{key:p.id,'data-brood-record':p.id,'data-brood-current':String(!stale)},
              h('th',{scope:'row'},p.name,stale?h('span',null,design(stale.plan).short+' · replanted since'):null),
              h('td',null,b?outcome(b.prediction).label:'Not followed'),
              h('td',null,b?outcome(b.result).label:'Not followed',b?h('span',null,b.prediction===b.result?'Matched your prediction':'Differed from your prediction'):null));}))),
        h('p',{className:'bf-help'},'Stages are developmental steps, not a timed simulation. This activity shows whether a patch offers what each stage needs; it does not model how many eggs survive, weather, predators, or disease.'),returnToGuide()),
      h('section',{className:'bf-panel bf-season',ref:function(node){sections.current.season=node;},tabIndex:-1,'aria-label':bfT('a11y_mowing_and_timing_investigation',"Mowing and timing investigation"),'data-bf-season-patch':seasonSite||'','data-bf-season-mowing':mowPlan},
        h('div',{className:'bf-season-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Time the mowing · Predict → Run → Compare'),h('h3',null,'Does it matter WHEN the patch is cut?'),
          h('p',{className:'bf-help'},'A patch can hold the right plants and still lose the generation, if it is cut before a stage gets to use them. Run one patch under different mowing plans and compare.')),
          h('span',{className:'bf-season-current'},'Plan: '+mowing(mowPlan).short)),
        h('div',{className:'bf-season-steps'},
          h('div',null,h('label',{htmlFor:'bf-season-site'},'1. Choose a patch you have examined'),
            h('select',{id:'bf-season-site',value:seasonSite,onChange:function(e){setSeasonSite(e.target.value);setSeasonFeedback('');}},
              h('option',{value:''},'Choose a patch'),
              habitats(s).filter(function(p){return evidenceRecorded(s,p);}).map(function(p){return h('option',{key:p.id,value:p.id},p.name);})),
            h('label',{htmlFor:'bf-season-mow'},'2. Choose when it gets mown'),
            h('select',{id:'bf-season-mow',value:mowPlan,onChange:function(e){setMowPlan(e.target.value);setSeasonFeedback('');}},
              MOWINGS.map(function(m){return h('option',{key:m.id,value:m.id},m.label);}))),
          h('div',null,h('label',{htmlFor:'bf-season-guess'},'3. Predict what happens to the generation'),
            h('select',{id:'bf-season-guess',value:seasonGuess,onChange:function(e){setSeasonGuess(e.target.value);}},
              h('option',{value:''},'Choose your prediction'),
              h('option',{value:'complete'},'It runs the whole cycle'),
              h('option',{value:'stop'},'It stops before an adult')),
            h('div',{className:'bf-season-actions'},
              button('Run the season',startSeason,{className:'bf-primary',disabled:!seasonSite||!seasonGuess})),
            h('p',{className:'bf-help'},seasonSite?'Running a season does not change the plants. It only asks whether the plot is still standing when each stage needs it.':'Examine a patch in the meadow first. You can only run a season where you know what is growing.'))),
        seasonView?h('ol',{className:'bf-weeks','aria-label':bfT('a11y_stage_by_stage_through_the_season',"Stage by stage through the season")},seasonView.steps.map(function(x){
          var state=x.cleared?'cleared':!x.standing?'cut':'missing';
          return h('li',{key:x.id,'data-state':state,'data-stage':x.id},
            h('b',null,'Week '+x.week),h('strong',null,x.name),
            h('small',null,x.cleared?'What this stage needs is here and still standing.':!x.standing?'The plot was already cut by this week.':'Nothing here for this stage to use.'));
        })):null,
        h('p',{className:'bf-season-feedback',role:'status','aria-live':'polite'},seasonFeedback),
        h('table',{className:'bf-seasons'},h('caption',null,'Seasons you have run · '+s.season.runs.length+' recorded'),
          h('thead',null,h('tr',null,h('th',{scope:'col'},'Patch'),h('th',{scope:'col'},'Mowing'),h('th',{scope:'col'},'You predicted'),h('th',{scope:'col'},'What happened'))),
          h('tbody',null,s.season.runs.length?s.season.runs.map(function(r){var rp=patch(r.patch,s);
            var current=seasonRunIsCurrent(s,r);
            return h('tr',{key:r.patch+'-'+r.mowing+'-'+(r.plan||''),'data-season-record':r.patch+'-'+r.mowing,'data-season-current':String(current)},
              h('th',{scope:'row'},rp?rp.name:r.patch,r.plan?h('span',null,design(r.plan).short+(current?'':' · replanted since')):null),
              h('td',null,mowing(r.mowing).short),
              h('td',null,r.prediction==='complete'?'Whole cycle':'Stops early'),
              h('td',null,r.result==='complete'?'Ran the whole cycle':'Stopped early',
                h('span',null,r.prediction===r.result?'Matched your prediction':'Differed from your prediction')));})
            :h('tr',null,h('td',{colSpan:4},'No seasons run yet.')))),
        s.season.runs.some(function(r){return !seasonRunIsCurrent(s,r);})?h('p',{className:'bf-help','data-bf-season-stale':'1'},'Rows marked “replanted since” were run on an earlier planting of the restoration plot. They stay here as a record, but they no longer describe what is growing there, so they are not counted as evidence about the plot as it stands now.'):null,
        timingPairs(s).length?h('p',{className:'bf-help','data-bf-timing-pair':'1'},'You have run the same patch under two mowing plans and got two different results. That comparison is what shows timing mattered, not the plants alone.'):null,
        h('p',{className:'bf-help'},'Weeks order the stages for one generation; they are not a measured calendar, and real mowing dates vary by region and species. This activity models whether plants are present and still standing — not how many monarchs survive.'),returnToGuide()),
      h('div',{className:'bf-bottom'},h('section',{className:'bf-panel'},h('div',{className:'bf-eyebrow'},'One species · changing needs'),h('h3',null,'A life beyond the wings'),h('div',{className:'bf-life'},STAGES.map(function(st){return h('span',{key:st.id},h('b',null,st.ordinal+' · '+st.name),st.id==='egg'?'On milkweed':st.id==='caterpillar'?'Milkweed leaves':st.id==='chrysalis'?'Metamorphosis':'Flower nectar');})),h('p',{className:'bf-help'},'You play the adult stage. Follow a generation in the investigation above to see which patches can support the other three.')),
        h('section',{className:'bf-panel bf-question','aria-label':bfT('a11y_habitat_evidence_question',"Habitat evidence question"),'data-bf-claim':pickedClaim||''},h('div',{className:'bf-eyebrow'},'Make sense of your evidence'),h('h3',null,'Which claim does your evidence support?'),
          h('p',{className:'bf-help'},'Choose a claim. The lab does not tell you which is right on its own authority — it shows you which of your own records bear on it.'),
          CLAIMS.map(function(c){return button(c.label,function(){writeNotebook({claim:c.id});setAnswer('');},{key:c.id,'aria-pressed':pickedClaim===c.id});}),
          verdict?h('div',{className:'bf-verdict','data-bf-tested':String(verdict.tested)},
            h('strong',null,verdict.verdict),h('p',null,verdict.why),
            verdict.evidence.lines.length?h(R.Fragment,null,h('p',{className:'bf-eyebrow'},'From your records'),
              h('ul',{className:'bf-evidence'},verdict.evidence.lines.map(function(line,i){return h('li',{key:i,'data-evidence':line.kind},line.text);}))
            ):h('p',{className:'bf-help'},'You have not recorded anything yet. Examine a patch to begin.')):null,
          h('div',{role:'status','aria-live':'polite'},answer||(verdict?verdict.verdict+' '+verdict.why:'')))),
      h('section',{className:'bf-panel bf-notebook',ref:function(node){sections.current.notebook=node;},tabIndex:-1,'aria-label':bfT('a11y_investigation_notebook','Investigation notebook')},
        h('div',{className:'bf-notebook-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Claim · Evidence · Reasoning'),h('h3',null,'Make the evidence your own'),h('p',{className:'bf-help'},'Your notes save with this lab and appear in the field report. Explain what you think; the lab does not grade your writing.')),
          h('span',{className:'bf-notebook-status','data-bf-notebook-ready':String(notebookReady(s))},notebookReady(s)?'Conclusion assembled':'Work in progress')),
        h('div',{className:'bf-notebook-grid'},h('div',null,
          h('label',{htmlFor:'bf-notebook-claim'},'1. Choose a claim to investigate'),
          h('select',{id:'bf-notebook-claim',value:notebook.claim,onChange:function(e){writeNotebook({claim:e.target.value});}},h('option',{value:''},'Choose a claim'),CLAIMS.map(function(c){return h('option',{key:c.id,value:c.id},c.label);})),
          h('label',{htmlFor:'bf-notebook-interpretation'},'2. What do your records suggest?'),
          h('select',{id:'bf-notebook-interpretation',value:notebook.interpretation,onChange:function(e){writeNotebook({interpretation:e.target.value});}},h('option',{value:''},'Choose your interpretation'),INTERPRETATIONS.map(function(item){return h('option',{key:item.id,value:item.id},item.label);})),
          verdict?h('div',{className:'bf-notebook-check'},h('strong',null,verdict.tested?'Model evidence is available for this claim':'Keep investigating this claim'),h('p',null,verdict.why)):null,
          h('fieldset',null,h('legend',null,'3. Cite records from your investigation'),h('p',{className:'bf-help'},'Select at least two records to compare (up to eight). Only evidence you actually recorded is offered.'),
            citations.available.length?h('div',{className:'bf-citation-list'},citations.available.map(function(line){var checked=notebook.evidence.indexOf(line.id)>=0;return h('label',{className:'bf-citation',key:line.id},h('input',{type:'checkbox',checked:checked,disabled:!checked&&notebook.evidence.length>=8,'data-bf-citation':line.id,onChange:function(e){writeNotebook({evidence:e.target.checked?notebook.evidence.concat([line.id]):notebook.evidence.filter(function(id){return id!==line.id;})});}}),h('span',null,h('small',null,line.kind==='patch'?'Patch observation':line.kind==='brood'?'Generation result':line.kind==='season'?'Season result':line.kind==='pollination'?'Model flower visit':'Timing comparison'),line.text));})):h('p',{className:'bf-help'},'No records yet. Examine a patch or record a completed flower visit to begin.'),
            citations.missing.length?h('div',{className:'bf-notebook-review',role:'status'},citations.missing.length+' cited record(s) no longer describe the current planting. Earlier results remain in your field report; choose current records for this explanation.',button('Remove unavailable citations',function(){writeNotebook({evidence:citations.selected.map(function(line){return line.id;})});})):null)),
          h('div',null,h('label',{htmlFor:'bf-notebook-reasoning'},'4. How does the evidence connect to your claim?'),
            h('p',{className:'bf-help',id:'bf-notebook-writing-help'},'Try: “When I compared … with …, I noticed … . This supports / challenges my claim because … .”'),
            h('textarea',{id:'bf-notebook-reasoning',rows:7,maxLength:1600,value:notebook.reasoning,'aria-describedby':'bf-notebook-writing-help',onChange:function(e){writeNotebook({reasoning:e.target.value});}}),
            h('p',{className:'bf-writing-count'},notebook.reasoning.length+' / 1600 characters'),
            h('label',{htmlFor:'bf-notebook-question'},'5. What would you investigate next? (optional)'),
            h('textarea',{id:'bf-notebook-question',rows:3,maxLength:600,value:notebook.question,onChange:function(e){writeNotebook({question:e.target.value});}}),
            h('p',{className:'bf-writing-count'},notebook.question.length+' / 600 characters'),
            h('p',{className:'bf-help'},'A completed notebook means you have assembled an explanation, not that the model has proved your idea. Include what your comparison can and cannot show.'),
            button('Review my field report',function(){jumpTo('report');},{className:'bf-primary'}))),returnToGuide()),
      h('details',{className:'bf-panel bf-glossary','aria-label':bfT('a11y_glossary',"Glossary")},
        h('summary',null,'Glossary \u00b7 ' + GLOSSARY.length + ' words used in this lab'),
        h('p',{className:'bf-help'},'Each entry says what the word means in general, then how this lab uses it.'),
        h('dl',null,GLOSSARY.map(function(g){
          return h('div',{key:g.term,'data-gloss-term':g.term},
            h('dt',null,g.term),
            h('dd',null,g.definition),
            h('dd',{className:'bf-gloss-here'},g.here));
        }))),
      h('section',{className:'bf-panel bf-report',ref:function(node){sections.current.report=node;},tabIndex:-1,'aria-label':bfT('a11y_field_report',"Field report"),'data-bf-report-copied':copyState||''},
        h('div',{className:'bf-report-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Take your evidence with you'),h('h3',null,'Field report'),
          h('p',{className:'bf-help'},reportEmpty?'Your observations, experiments, and notebook writing collect here as text you can copy.':'Your recorded results and learner notes, together as plain text. Your interpretation is labeled separately from the model evidence.')),
          h('div',{className:'bf-report-actions'},
            button(copyState==='ok'?'✓ Report copied':'Copy my field report',copyReport,{className:'bf-primary',disabled:reportEmpty}))),
        reportEmpty?null:h('pre',{'data-bf-report':'1',tabIndex:0,'aria-label':bfT('a11y_field_report_text',"Field report text")},reportText),
        copyState==='fail'?h('textarea',{readOnly:true,value:reportText,rows:10,'aria-label':bfT('a11y_field_report_text_to_copy_manually',"Field report text to copy manually"),
          onFocus:function(e){e.target.select();},onCopy:function(){setCopyState('ok');}}):null,returnToGuide()),
      h('details',{className:'bf-sources'},h('summary',null,'Science notes & sources'),h('p',null,'Species: monarch (Danaus plexippus). This summer scene represents a Mid-Atlantic habitat investigation. Plants and wing patterns are illustrative and enlarged. Guided routes, flight speed, distances, and energy are teaching choices, not field measurements. The generation you follow is a teaching model of one outcome, not a population simulation: it turns on whether milkweed is present, and it deliberately leaves out weather, predators, parasites, disease, how many eggs are laid, and how many survive — all of which matter in a real meadow, where most eggs do not reach adulthood even on good milkweed. Real development also takes weeks and depends on temperature; the stages here advance when you choose, in a fixed order. Other butterfly species can have different host plants.'),
        h('p',null,'In these experiments you place model eggs on any examined patch to test what happens; real female monarchs choose milkweed. An egg does not feed, so a patch without host leaves first blocks the feeding caterpillar stage. The mowing experiment keeps the chrysalis inside the patch and assumes cutting removes its support. Real caterpillars often leave their milkweed plant to find a secure place to pupate.'),h('ul',null,
        h('li',null,h('a',{href:'https://www.monarchwatch.org/milkweed/',target:'_blank',rel:'noopener noreferrer'},'Monarch Watch · Milkweed pollen packets and transfer')),
        h('li',null,h('a',{href:'https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators',target:'_blank',rel:'noopener noreferrer'},'USDA NRCS · How animal pollination works')),
        h('li',null,h('a',{href:'https://www.xerces.org/publications/plant-lists/monarch-nectar-plants-mid-atlantic',target:'_blank',rel:'noopener noreferrer'},'Xerces Society · Regional nectar plants and milkweed hosts')),
        h('li',null,h('a',{href:'https://monarchjointventure.org/monarch-biology/life-cycle',target:'_blank',rel:'noopener noreferrer'},'Monarch Joint Venture · Life cycle')),
        h('li',null,h('a',{href:'https://ucanr.edu/blog/bug-squad/article/independence-day-monarch',target:'_blank',rel:'noopener noreferrer'},'UC Agriculture and Natural Resources · Wing patterns visible before emergence')),
        h('li',null,h('a',{href:'https://seasonwatch.umn.edu/monarch',target:'_blank',rel:'noopener noreferrer'},'University of Minnesota · A monarch develops inside its chrysalis')),
        h('li',null,h('a',{href:'https://www.nrcs.usda.gov/programs-initiatives/monarch-butterflies',target:'_blank',rel:'noopener noreferrer'},'USDA NRCS · Monarch habitat and feeding needs')),
        h('li',null,h('a',{href:'https://plants.ces.ncsu.edu/plants/asclepias-syriaca/',target:'_blank',rel:'noopener noreferrer'},'NC State Extension · Common milkweed plant structure')),
        h('li',null,h('a',{href:'https://plants.ces.ncsu.edu/plants/monarda-fistulosa/',target:'_blank',rel:'noopener noreferrer'},'NC State Extension · Wild bergamot plant structure')))),
      h('p',{className:'bf-help'},'Butterfly Habitat Lab · Local habitat exploration. Find the long-distance monarch journey in Animal Migration Lab.')
    );
  }
  window.StemLab.registerTool('butterfly',{label:'Butterfly Habitat Lab',icon:'🦋',desc:'Explore a summer meadow as a monarch, compare nectar and host plants, and build a field journal.',category:'science',color:'orange',gradeRange:'4-12',aliases:['monarch','butterflies','milkweed','pollinator','habitat'],render:function(ctx){return ctx.React.createElement(ButterflyLab,{ctx:ctx});}});
  if(window.__RR_TEST_EXPORTS__)window.__RR_TEST_EXPORTS__.butterfly={plants:PLANTS,freshState:freshState,nearest:nearest,step:step,advanceFrame:advanceFrame,land:land,observe:observe,save:save,buildWorld:buildWorld,designs:DESIGNS,habitats:habitats,applyPlan:applyPlan,cleanRestoration:cleanRestoration,fieldDetail:fieldDetail,evidenceRecorded:evidenceRecorded,broodIsCurrent:broodIsCurrent,broodRowsFor:broodRowsFor,fieldReport:fieldReport,reportLines:reportLines,reportIsEmpty:reportIsEmpty,glossary:GLOSSARY,glossaryTerm:glossaryTerm,mowings:MOWINGS,stageWeek:STAGE_WEEK,seasonOutcome:seasonOutcome,cleanSeason:cleanSeason,runSeason:runSeason,seasonRunFor:seasonRunFor,timingPairs:timingPairs,currentSeasonRuns:currentSeasonRuns,seasonRunIsCurrent:seasonRunIsCurrent,mowing:mowing,
    stages:STAGES,outcomes:OUTCOMES,layEggs:layEggs,advanceStage:advanceStage,broodResult:broodResult,broodFor:broodFor,larvalFeeding:larvalFeeding,larvalLeafOutline:larvalLeafOutline,larvalLeafHeight:larvalLeafHeight,chrysalisMaturation:chrysalisMaturation,chrysalisSurface:chrysalisSurface,
    cleanLifecycle:cleanLifecycle,clampStage:clampStage,abandonBrood:abandonBrood,reachedStage:reachedStage,stageStatus:stageStatus,expectedOutcome:expectedOutcome,
    claims:CLAIMS,judgeClaim:judgeClaim,evidenceFor:evidenceFor,cleanNotebook:cleanNotebook,notebookEvidence:notebookEvidence,notebookReady:notebookReady,investigationSteps:investigationSteps,
    cleanPollination:cleanPollination,recordPollination:recordPollination,pollinationIsCurrent:pollinationIsCurrent,currentPollinationVisits:currentPollinationVisits,pollinationPairs:pollinationPairs,
    feedingVisual:feedingVisual,feedingPhase:feedingPhase,feedingMoment:feedingMoment,feedingOutcome:feedingOutcome,feedingCamera:feedingCamera,stopFlight:stopFlight,flightPose:flightPose,cameraPose:cameraPose,landingPose:landingPose,lifecycleVisual:lifecycleVisual,lifecyclePose:lifecyclePose,lifecycleInspection:lifecycleInspection,lifecycleCamera:lifecycleCamera,createLifecycleModels:createLifecycleModels};
})();
