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
    state.restoration.design=id;state.restoration.prediction=guess;state.paused=true;state.target=null;
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
      note:'A midsummer cut takes away the standing stems a chrysalis hangs from.'}),
    Object.freeze({id:'late',week:9,label:'Cut after the generation',short:'Cut week 9',
      note:'By this point the adult has emerged and can leave, so this cut does not interrupt the generation.'})
  ]);
  function mowing(id){return MOWINGS.find(function(m){return m.id===id;})||null;}
  // A stage clears only if the plot is still standing in the week it needs it.
  // Egg and caterpillar need milkweed; a chrysalis needs something left to hang
  // on; an adult needs nectar somewhere in this patch to refuel before leaving.
  // Matches what the life cycle activity already tells the learner: an egg laid
  // on the wrong plant can still hatch, so the generation fails at the
  // CATERPILLAR stage -- the first one that actually eats -- not at the egg.
  function stageNeedMet(p,stage){
    return stage==='egg'?(!!p.host||!!p.nectar):stage==='caterpillar'?!!p.host
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
      var cut=runs.filter(function(r){
        if(r.patch!==win.patch||r.result!=='stop')return false;
        var o=seasonOutcome(patch(r.patch,s),r.mowing);
        return !!(o&&o.cutShort);
      })[0];
      if(cut)pairs.push({patch:win.patch,kept:win.mowing,cut:cut.mowing});
    });
    return pairs;
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
    Object.freeze({id:'green-enough',sound:false,
      label:'Any green, planted patch will do',
      verdict:'Your records do not support that claim.',
      why:'The mown lawn and the flowering bergamot are both green and planted, and neither fed a monarch caterpillar. What matters is which species are growing, not how green the patch looks.'})
  ]);
  function claim(id){return CLAIMS.find(function(c){return c.id===id;})||null;}
  // Evidence is counted, never invented. Each line names a record the learner
  // made and what it shows; an empty list means the claim cannot be judged yet.
  function evidenceFor(s){
    var lines=[],nectarOnly=[],withHost=[];
    habitats(s).forEach(function(p){
      if(s.observations.indexOf(p.id)>=0||(p.id==='restoration'&&s.restoration.trials.length))
        lines.push({kind:'patch',text:p.name+': '+(p.nectar?'nectar present':'no nectar')+', '+(p.host?'milkweed leaves present':'no milkweed leaves')+'.'});
      var b=broodFor(s,p.id);
      if(b){
        (b.result==='complete'?withHost:nectarOnly).push(p.name);
        lines.push({kind:'brood',text:p.name+': the generation you followed '+(b.result==='complete'?'reached the adult stage.':'stopped before becoming an adult.')});
      }
    });
    var pairs=timingPairs(s);
    currentSeasonRuns(s).forEach(function(r){
      var p=patch(r.patch,s);if(!p)return;
      lines.push({kind:'season',text:p.name+', '+mowing(r.mowing).short.toLowerCase()+': the generation '+(r.result==='complete'?'ran its whole cycle.':'stopped before an adult emerged.')});
    });
    pairs.forEach(function(pair){
      var p=patch(pair.patch,s);if(!p)return;
      lines.push({kind:'timing',text:p.name+' ran both ways: '+mowing(pair.kept).short.toLowerCase()+' completed, '+mowing(pair.cut).short.toLowerCase()+' did not. Same plants, different timing.'});
    });
    return {lines:lines,broodsComplete:withHost,broodsStalled:nectarOnly,
      // Counted the same way the lines are: a brood from an earlier planting of
      // the restoration plot is kept as a record but is not current evidence.
      patches:s.observations.length,trials:s.restoration.trials.length,
      broods:s.lifecycle.broods.filter(function(b){return broodIsCurrent(s,b);}).length,
      seasons:currentSeasonRuns(s).length,timingPairs:pairs};
  }
  // A claim about what caterpillars need can only be tested by following a
  // generation. Comparing resources alone cannot settle it, and the tool says so.
  function judgeClaim(s,id){
    var c=claim(id);if(!c)return null;
    var ev=evidenceFor(s);
    // A claim about TIMING needs a matched pair on one patch; a claim about
    // resources needs a followed generation. Neither stands in for the other.
    var tested=c.needs==='season'?ev.timingPairs.length>0:ev.broods>0;
    var untestedWhy=c.needs==='season'
      ?'Running one season shows what happened that time. To tell whether the timing of a cut is what changed the outcome, run the SAME patch twice under different mowing plans and compare.'
      :'Comparing what grows on each patch shows which resources are there. To find out what a monarch caterpillar can actually do with them, follow a generation in the investigation above.';
    return {claim:c,evidence:ev,tested:tested,
      verdict:tested?c.verdict:'You have not tested this claim yet.',
      why:tested?c.why:untestedWhy};
  }

  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function freshState(saved) {
    var seen=saved && Array.isArray(saved.observations)?saved.observations:[];
    var state={x:0,y:6,z:52,yaw:0,clock:0,energy:100,paused:true,landed:null,target:null,
      observations:PLANTS.filter(function(p){return seen.indexOf(p.id)!==-1;}).map(function(p){return p.id;}),restoration:cleanRestoration(saved&&saved.restoration),
      lifecycle:cleanLifecycle(saved&&saved.lifecycle),season:cleanSeason(saved&&saved.season)};
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
    if(!p){lc.stage=null;lc.prediction=null;return state;}
    var index=STAGES.findIndex(function(st){return st.id===lc.stage;}),limit=reachedStage(p);
    if(index>limit)lc.stage=STAGES[limit].id;
    return state;
  }
  function nearest(s) {
    return habitats(s).map(function(p){return {plant:p,distance:Math.hypot(s.x-p.x,s.z-p.z)};})
      .sort(function(a,b){return a.distance-b.distance;})[0];
  }
  // Pure, bounded step. No wall clock or random stream enters the biology or journal.
  function step(s,dt,keys) {
    if(s.paused||s.landed||!Number.isFinite(dt)||dt<=0)return s;
    dt=Math.min(dt,.05);keys=keys||{};s.clock+=dt;
    var dx=(keys.right?1:0)-(keys.left?1:0),dz=(keys.back?1:0)-(keys.forward?1:0);
    if(dx||dz)s.target=null;
    var destination=patch(s.target,s);
    if(destination){
      dx=destination.x-s.x;dz=destination.z-s.z;
      if(Math.hypot(dx,dz)<4){s.target=null;s.paused=true;return s;}
    }
    var length=Math.hypot(dx,dz),speed=15*(.6+.4*s.energy/100);
    if(length){dx/=length;dz/=length;s.x=clamp(s.x+dx*speed*dt,-100,100);s.z=clamp(s.z+dz*speed*dt,-100,100);s.yaw=Math.atan2(-dx,-dz);s.energy=clamp(s.energy-dt*.45,0,100);}
    s.y=clamp(s.y+((keys.rise?1:0)-(keys.lower?1:0))*dt*7,3,24);
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
    s.landed=n.plant.id;s.target=null;s.paused=true;s.x=n.plant.x;s.z=n.plant.z;s.y=n.plant.nectar?3.5:.6;
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
  function save(s) { return {version:4,observations:s.observations.slice(),restoration:cleanRestoration(s.restoration),lifecycle:cleanLifecycle(s.lifecycle),season:cleanSeason(s.season)}; }

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

  // Each view owns every mesh and resource. Only geometry recipes are shared with Bee Lab.
  function buildWorld(T,kit) {
    var scene=new T.Scene();scene.background=new T.Color(0xc8e0d6);scene.fog=new T.Fog(0xc8e0d6,95,285);
    scene.add(new T.HemisphereLight(0xfff5d8,0x42573d,.8));
    var sun=new T.DirectionalLight(0xffe6bd,1.05);sun.position.set(-45,90,35);scene.add(sun);
    var materialCache={};
    function mat(color,extra){var key=color+JSON.stringify(extra||{});return materialCache[key]||(materialCache[key]=new T.MeshStandardMaterial(Object.assign({color:new T.Color(color).convertSRGBToLinear(),roughness:.9},extra||{})));}
    function mesh(geo,m,x,y,z,sx,sy,sz,parent){var o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx||1,sy||1,sz||1);(parent||scene).add(o);return o;}
    var sphere=new T.SphereGeometry(1,12,8),cylinder=new T.CylinderGeometry(1,1,1,7),plane=new T.PlaneGeometry(1,1);
    mesh(plane,mat(0x7e995d),0,-.08,0,620,620,1).rotation.x=-Math.PI/2;
    // Broad glades, a distant tree line, and a winding dry footpath orient the learner.
    for(var h=0;h<14;h++)mesh(sphere,mat(h%2?0x8ca871:0x6f8e61),Math.sin(h*2.4)*240,-12,Math.cos(h*2.4)*240,85,28+h%3*10,66);
    for(var pathIndex=0;pathIndex<34;pathIndex++){
      var pz=125-pathIndex*8,px=-7+Math.sin(pz*.029)*12;
      mesh(sphere,mat(0xc6b994),px,-.45,pz,5,.55,6);
    }
    for(var tree=0;tree<48;tree++){
      var a=tree*2.39996,r=133+(tree%5)*10,tx=Math.cos(a)*r,tz=Math.sin(a)*r;
      mesh(cylinder,mat(0x715b43),tx,6,tz,.8,12,.8);
      for(var lobe=0;lobe<3;lobe++)mesh(sphere,mat([0x40634c,0x52764e,0x6e8550][tree%3]),tx+Math.cos(lobe*2.1)*4,15+lobe*2,tz+Math.sin(lobe*2.1)*4,9,11,8);
    }
    function dataGeometry(data){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
      var colors=data.colors;if(data.tones){colors=[];data.tones.forEach(function(t){var c=new T.Color(t).convertSRGBToLinear();colors.push(c.r,c.g,c.b);});}
      if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
    var grass=dataGeometry(kit.vegetation('grass'));
    var grassBatch=new T.InstancedMesh(grass,mat(0x527e39,{side:T.DoubleSide,vertexColors:true}),3500),transform=new T.Object3D();
    for(var i=0;i<3500;i++){
      var gx=Math.sin(i*78.23)*112,gz=Math.cos(i*36.71)*112;
      var onLawn=Math.hypot(gx-38,gz-38)<19||Math.hypot(gx+42,gz-38)<19;
      transform.position.set(gx,0,gz);transform.rotation.set(0,i*2.3999,0);transform.scale.set(1.2,onLawn?.35:1.2+(i%7)*.35,1.2);transform.updateMatrix();grassBatch.setMatrixAt(i,transform.matrix);
    }
    grassBatch.name='shared-meadow-grass';grassBatch.instanceMatrix.needsUpdate=true;scene.add(grassBatch);
    var leaves=new T.SphereGeometry(1,12,6);leaves.name='habitat-leaf-blade';
    function plantStems(p,pi,parent,count,offset){
      for(var stem=0;stem<count;stem++){
        var pose=stemPose(p,pi,stem,count,offset),x=pose.x,z=pose.z,height=pose.height;
        mesh(cylinder,mat(0x486b35),x,height/2,z,.09,height,.09,parent);
        for(var leaf=0;leaf<4;leaf++){
          var lp=leafPose(pose,leaf),blade=mesh(leaves,mat(pi===0?0x668c4e:0x496e39),lp.x,lp.y,lp.z,pi===0?.95:.83,.1,pi===0?.44:.31,parent);blade.rotation.set(0,lp.yaw,lp.tilt);
          var vein=mesh(cylinder,mat(pi===0?0x957458:0x91a375),lp.x,lp.y+.1,lp.z,.018,pi===0?1.7:1.45,.018,parent);vein.rotation.set(0,lp.yaw,lp.tilt-Math.PI/2);
        }
        for(var flower=0;flower<9;flower++){
          var fa=flower*2.4,fr=Math.sqrt(flower)*.18;
          mesh(sphere,mat(pi===0?0xdca1b9:0xb395dc),x+Math.cos(fa)*fr,height+.15+Math.sin(flower)*.12,z+Math.sin(fa)*fr,pi===0?.26:.16,pi===0?.22:.48,pi===0?.26:.16,parent);
        }
      }
    }
    PLANTS.forEach(function(p,pi){
      mesh(sphere,mat(p.nectar?0x708d4f:0x97ad6d),p.x,-.12,p.z,18,.4,18);
      if(p.nectar)plantStems(p,pi,scene,34,0);
    });
    // Reuse the same plant builder and GPU geometry for every alternative.
    // Switching designs changes visibility; the flight world is not reconstructed.
    var restoration=new T.Group();restoration.name='restoration-plots';scene.add(restoration);
    DESIGNS.forEach(function(d){
      var group=new T.Group();group.name='restoration-'+d.id;restoration.add(group);group.visible=d.id==='lawn';
      var p={x:-42,z:38};mesh(sphere,mat(d.nectar?0x708d4f:0x97ad6d),p.x,-.12,p.z,18,.4,18,group);
      if(d.id==='flowers')plantStems(p,1,group,34,0);
      if(d.id==='mixed'){plantStems(p,0,group,17,-6);plantStems(p,1,group,17,6);}
    });
    var plotBorder=mesh(new T.RingGeometry(18.4,18.8,64),new T.MeshBasicMaterial({color:0xc78236,side:T.DoubleSide}),-42,.09,38);plotBorder.rotation.x=-Math.PI/2;
    function batchStatic(parent){
      var batches=new Map();
      parent.children.slice().forEach(function(o){
        if(!o.isMesh||o.isInstancedMesh)return;var key=o.geometry.uuid+':'+o.material.uuid;
        if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
      });
      batches.forEach(function(items){
        if(items.length<2)return;var first=items[0],batch=new T.InstancedMesh(first.geometry,first.material,items.length);
        items.forEach(function(o,i){o.updateMatrix();batch.setMatrixAt(i,o.matrix);parent.remove(o);});batch.instanceMatrix.needsUpdate=true;parent.add(batch);
      });
    }
    batchStatic(scene);restoration.children.forEach(batchStatic);
    var fore=dataGeometry(kit.butterflyWing('fore')),hind=dataGeometry(kit.butterflyWing('hind'));
    function butterfly(scale){
      var root=new T.Group(),wings=[];scene.add(root);root.scale.setScalar(scale);
      mesh(sphere,mat(0x332b27),0,0,1,.45,.44,2,root);mesh(sphere,mat(0x282525),0,0,-1.25,.65,.6,.85,root);mesh(sphere,mat(0x332b27),0,0,-2.25,.5,.48,.48,root);
      [-1,1].forEach(function(side){
        var pivot=new T.Group();root.add(pivot);wings.push(pivot);
        [fore,hind].forEach(function(g){var wing=new T.Mesh(g,mat(0xffffff,{side:T.DoubleSide,vertexColors:true}));wing.scale.x=side;pivot.add(wing);});
        var curve=new T.CatmullRomCurve3([new T.Vector3(side*.25,.1,-2.5),new T.Vector3(side*.6,.8,-3.6),new T.Vector3(side*1.3,1,-4.3)]);
        mesh(new T.TubeGeometry(curve,8,.06,4,false),mat(0x332b27),0,0,0,1,1,1,root);mesh(sphere,mat(0x332b27),side*1.3,1,-4.3,.16,.16,.25,root);
        // Monarchs are brush-footed butterflies: the front pair is drawn small and held near the thorax.
        for(var leg=0;leg<3;leg++){
          var front=leg===0,points=[new T.Vector3(side*.35,-.25,-1.4+leg*.8),new T.Vector3(side*(front?.6:1.1),front?-.5:-1,-1.4+leg*.8),new T.Vector3(side*(front?.7:1.7),front?-.6:-1.45,-1+leg*.8)];
          mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),4,.04,3,false),mat(0x332b27),0,0,0,1,1,1,root);
        }
      });
      return {root:root,wings:wings};
    }
    var player=butterfly(.38),visitors=[];player.root.name='player-monarch';
    for(var b=0;b<4;b++)visitors.push(butterfly(.12));
    var ring=mesh(new T.RingGeometry(2.8,3.05,48),new T.MeshBasicMaterial({color:0xffe7a6,side:T.DoubleSide}),0,.07,0);ring.rotation.x=-Math.PI/2;
    var targetRing=mesh(new T.RingGeometry(14,14.25,64),new T.MeshBasicMaterial({color:0xfff2c9,side:T.DoubleSide}),0,.08,0);targetRing.rotation.x=-Math.PI/2;
    var focusHalo=mesh(new T.RingGeometry(.83,.89,64),new T.MeshBasicMaterial({color:0xffe6a1,side:T.DoubleSide,depthTest:false,depthWrite:false,transparent:true,opacity:.95}),0,0,0);
    focusHalo.name='field-lens-marker';focusHalo.visible=false;focusHalo.renderOrder=5;
    return {scene:scene,player:player,visitors:visitors,ring:ring,targetRing:targetRing,restoration:restoration,focusHalo:focusHalo};
  }

  var CSS = `
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
    .bf-season{margin-top:18px!important;border-top:4px solid #7a5c2e}.bf-season-head{display:flex;gap:16px;justify-content:space-between;align-items:start}.bf-season-head p{max-width:780px}.bf-season-steps{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:16px 0}.bf-season label{display:block;font-weight:750;margin-bottom:8px}.bf-season select{display:block;width:100%;min-height:46px;margin:8px 0 12px;padding:10px;border:1px solid var(--bf-line);border-radius:9px;background:var(--bf-panel);color:var(--bf-ink);font:inherit}.bf-season select:focus-visible{outline:3px solid #b45b0c;outline-offset:3px}.bf-season-actions{display:flex;flex-wrap:wrap;gap:8px}.bf-season-current{font-size:12px;font-weight:700;color:var(--bf-muted);border:1px solid var(--bf-line);border-radius:30px;padding:7px 12px;flex-shrink:0}
    .bf-weeks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0;list-style:none;padding:0}.bf-weeks li{border:1px solid var(--bf-line);border-radius:11px;padding:11px;background:var(--bf-panel)}.bf-weeks b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-weeks strong{display:block;margin-top:2px}.bf-weeks small{display:block;color:var(--bf-muted);font-size:12px;margin-top:5px}.bf-weeks li[data-state="cleared"]{border-left:4px solid var(--bf-accent);padding-left:8px}.bf-weeks li[data-state="cut"]{border-left:4px solid #b45b0c;padding-left:8px}.bf-weeks li[data-state="missing"]{border-left:4px solid #8a8f7a;padding-left:8px}.bf-season-feedback{min-height:50px;margin-top:12px;font-size:14px}.bf-seasons{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:15px;font-size:13px}.bf-seasons th,.bf-seasons td{border-bottom:1px solid var(--bf-line);text-align:left;padding:10px 8px;overflow-wrap:anywhere;vertical-align:top}.bf-seasons caption{text-align:left;font-weight:750;font-size:15px;padding-bottom:7px}.bf-seasons td span{display:block;color:var(--bf-muted);font-size:12px}
    .bf-track{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0;list-style:none;padding:0}.bf-track li{border:1px solid var(--bf-line);border-radius:11px;padding:11px;background:var(--bf-panel)}.bf-track b{display:block;color:var(--bf-muted);font-size:10px;letter-spacing:.07em;text-transform:uppercase}.bf-track strong{display:block;margin-top:2px}.bf-track small{display:block;color:var(--bf-muted);font-size:12px;margin-top:5px}.bf-track li[data-state="current"]{border-color:var(--bf-accent);border-width:2px;padding:10px}.bf-track li[data-state="reached"]{border-left:4px solid var(--bf-accent);padding-left:8px}.bf-track li[data-state="blocked"]{border-left:4px solid #b45b0c;padding-left:8px}.bf-track-tag{font-size:11px;font-weight:750;display:inline-block;margin-top:6px;border:1px solid var(--bf-line);border-radius:20px;padding:2px 8px}
    .bf-cycle-feedback{min-height:50px;margin-top:12px;font-size:14px}.bf-broods{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:15px;font-size:13px}.bf-broods th,.bf-broods td{border-bottom:1px solid var(--bf-line);text-align:left;padding:10px 8px;overflow-wrap:anywhere;vertical-align:top}.bf-broods caption{text-align:left;font-weight:750;font-size:15px;padding-bottom:7px}.bf-broods th:first-child{width:34%}.bf-broods td span{display:block;color:var(--bf-muted);font-size:12px}.bf-cycle-current{font-size:12px;font-weight:700;color:var(--bf-muted);border:1px solid var(--bf-line);border-radius:30px;padding:7px 12px;flex-shrink:0}
    .bf-verdict{margin-top:14px;border:1px solid var(--bf-line);border-left:4px solid var(--bf-accent);border-radius:12px;padding:14px;background:var(--bf-panel)}.bf-verdict[data-bf-tested="false"]{border-left-color:#b45b0c}.bf-verdict strong{display:block;font-size:15px}.bf-verdict p{font-size:13px;color:var(--bf-muted)}.bf-verdict .bf-eyebrow{margin-top:12px;display:block}.bf-evidence{margin:8px 0 0;padding-left:20px;font-size:13px}.bf-evidence li{margin-top:5px}.bf-evidence li[data-evidence="brood"]{font-weight:650}
    @media(forced-colors:active){.bf-verdict{border-left-color:CanvasText}.bf-verdict[data-bf-tested="false"]{border-left-color:CanvasText}.bf-verdict p{color:CanvasText}}
    @media(max-width:860px){.bf-track{grid-template-columns:1fr 1fr}.bf-weeks{grid-template-columns:1fr 1fr}}
    @media(max-width:580px){.bf-cycle-steps{grid-template-columns:1fr}.bf-cycle-head{display:block}.bf-cycle-current{display:inline-block;margin-top:10px}.bf-track{grid-template-columns:1fr}.bf-broods th,.bf-broods td{padding:9px 4px}.bf-season-steps{grid-template-columns:1fr}.bf-season-head{display:block}.bf-season-current{display:inline-block;margin-top:10px}.bf-weeks{grid-template-columns:1fr}.bf-seasons th,.bf-seasons td{padding:9px 4px}}
    @media(forced-colors:active){.bf-track li[data-state="current"]{border-color:Highlight}.bf-track li[data-state="reached"],.bf-track li[data-state="blocked"]{border-left-color:CanvasText}.bf-track small,.bf-track b{color:CanvasText}}
    @media(prefers-reduced-motion:reduce){.bfl *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    @media(forced-colors:active){.bfl{--bf-bg:Canvas;--bf-panel:Canvas;--bf-ink:CanvasText;--bf-muted:CanvasText;--bf-line:CanvasText;--bf-accent:LinkText}.bf-scene-badge,.bf-scene-bottom{background:Canvas;color:CanvasText;border-color:CanvasText}.bfl button[aria-pressed="true"],.bfl .bf-primary{background:Highlight;color:HighlightText;border-color:Highlight}.bf-scene-bottom small{color:CanvasText}}
  `;

  function ButterflyLab(props) {
    var ctx=props.ctx,R=ctx.React,h=R.createElement;
    var stateRef=R.useRef(null);if(!stateRef.current)stateRef.current=freshState((ctx.toolData||{}).butterfly);
    var s=stateRef.current,api=R.useRef(null),stage=R.useRef(null),map=R.useRef(null),keys=R.useRef({});
    var pair=R.useState(0),refresh=pair[1];
    var statusPair=R.useState('Take flight, or choose a habitat for guided travel. Land and examine each patch to build your field journal.'),message=statusPair[0],setMessage=statusPair[1];
    var rendererPair=R.useState('loading'),renderer=rendererPair[0],setRenderer=rendererPair[1];
    var mapPair=R.useState(false),mapMode=mapPair[0],setMapMode=mapPair[1],mapModeRef=R.useRef(false);mapModeRef.current=mapMode;
    var viewPair=R.useState('follow'),view=viewPair[0],setView=viewPair[1],viewRef=R.useRef(view);viewRef.current=view;
    var lensPair=R.useState(null),lens=lensPair[0],setLens=lensPair[1],lensRef=R.useRef(lens);lensRef.current=lens;
    var answerPair=R.useState(''),answer=answerPair[0],setAnswer=answerPair[1];
    var claimPair=R.useState(''),pickedClaim=claimPair[0],setPickedClaim=claimPair[1];
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
    function applyDesign(){var result=applyPlan(s,plan,guess);if(result.ok){closeLens();keys.current={};persist();setCycleFeedback('');}setDesignFeedback(result.message);announce(result.message);}
    function startBrood(){var result=layEggs(s,eggSite,broodGuess);if(result.ok)persist();setCycleFeedback(result.message);announce(result.message);}
    function nextStage(){var result=advanceStage(s);if(result.ok)persist();setCycleFeedback(result.message);announce(result.message);}
    function recordBrood(){var result=broodResult(s);if(result.ok){persist();setBroodGuess('');}setCycleFeedback(result.message);announce(result.message);}
    function dropBrood(){var result=abandonBrood(s);if(result.ok){persist();setBroodGuess('');setEggSite('');}setCycleFeedback(result.message);announce(result.message);}
    function startSeason(){
      s.season.mowing=mowPlan;s.season.prediction=seasonGuess||null;
      var result=runSeason(s,seasonSite,mowPlan,seasonGuess);
      if(result.ok){persist();setSeasonGuess('');}
      setSeasonFeedback(result.message);announce(result.message);
    }

    function update(){refresh(function(n){return n+1;});if(api.current)api.current.draw();}
    function announce(text){setMessage(text);update();}
    function persist(){if(ctx.updateMulti)ctx.updateMulti('butterfly',save(s));else if(ctx.setToolData)ctx.setToolData(function(prev){return Object.assign({},prev,{butterfly:save(s)});});}
    function closeLens(){lensRef.current=null;setLens(null);}
    function chooseLens(kind){
      var detail=fieldDetail(s,kind);lensRef.current=detail?kind:null;setLens(lensRef.current);
      announce(detail?detail.title+'. Read the field notes below the flight controls.':'Returned to the wide habitat view. Your butterfly remains landed.');
    }
    function toggle(){closeLens();s.paused=!s.paused;keys.current={};if(!s.paused&&s.landed){s.landed=null;s.y=6;}announce(s.paused?'Flight paused. You can still inspect the map and your journal.':'Flight active. Use the direction controls or choose a habitat.');}
    function travel(id){closeLens();s.landed=null;s.y=6;s.target=id;s.paused=false;keys.current={};announce('Guided flight to '+patch(id,s).name+'. You can steer to take control.');}
    function landing(){closeLens();if(s.landed){s.landed=null;s.y=6;s.paused=false;announce('Airborne. Choose your next habitat.');}else announce(land(s).message);}
    function examine(){var result=observe(s);if(result.ok)persist();if(s.landed==='restoration')setDesignFeedback(result.message);announce(result.message);}
    R.useEffect(function(){
      var alive=true,world=null,gl=null,camera=null,raf=0,last=0,lastUI=0,observer=null;
      var node=stage.current,cv=map.current,reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
      var width=1,height=1,lastMapMode=mapModeRef.current,lastView=viewRef.current,lastLens=lensRef.current;
      function paintMap(){
        var g=cv.getContext('2d');if(!g)return;
        var dpr=Math.min(window.devicePixelRatio||1,2);g.setTransform(dpr,0,0,dpr,0,0);
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
        lastMapMode=mapModeRef.current;lastView=viewRef.current;lastLens=lensRef.current;
        node.dataset.clock=s.clock.toFixed(3);node.dataset.position=[s.x,s.y,s.z].map(function(v){return v.toFixed(2);}).join(',');
        var detail=fieldDetail(s,lensRef.current);node.dataset.bfLens=detail?detail.kind:'';
        var useMap=mapModeRef.current||!gl;
        cv.style.visibility=useMap?'visible':'hidden';if(gl)gl.domElement.style.visibility=useMap?'hidden':'visible';
        if(useMap){paintMap();return;}
        var T=window.THREE,p=world.player.root,time=reduced.matches?0:s.clock;
        p.position.set(s.x,s.y+(s.landed?0:Math.sin(time*2)*.24),s.z);p.rotation.set(0,s.yaw,0);
        world.player.wings.forEach(function(wing,i){wing.rotation.z=(i?1:-1)*(s.landed?1.2:reduced.matches?.4:.35+.7*(.5+.5*Math.sin(time*11)));});
        world.visitors.forEach(function(v,i){var pose=window.StemMeadow.ambientPose(i,{simulationClock:time},reduced.matches);v.root.position.set(pose.point.x*.32,pose.point.y*.18,pose.point.z*.07);v.root.rotation.y=pose.yaw;v.wings.forEach(function(w,j){w.rotation.z=(j?1:-1)*pose.wingAngle;});});
        world.restoration.children.forEach(function(group){group.visible=group.name==='restoration-'+s.restoration.design;});
        world.ring.position.set(s.x,.09,s.z);var dest=patch(s.target,s);world.targetRing.visible=!!dest;if(dest)world.targetRing.position.set(dest.x,.08,dest.z);
        world.focusHalo.visible=!!detail;
        if(detail){var point=detail.point;camera.position.set(point.x+5.4,point.y+3.2,point.z+8.5);camera.lookAt(point.x,point.y,point.z);world.focusHalo.position.set(point.x,point.y,point.z);world.focusHalo.quaternion.copy(camera.quaternion);}
        else if(viewRef.current==='meadow'){camera.position.set(105,140,150);camera.lookAt(0,0,0);}else{camera.position.set(s.x+18,s.y+21,s.z+34);camera.lookAt(s.x,s.y,s.z-8);}
        try{gl.render(world.scene,camera);}catch(e){fallback();}
        node.dataset.clock=s.clock.toFixed(3);node.dataset.position=[s.x,s.y,s.z].map(function(v){return v.toFixed(2);}).join(',');
      }
      function resize(){width=Math.max(1,node.clientWidth);height=Math.max(1,node.clientHeight);var dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(width*dpr);cv.height=Math.round(height*dpr);if(gl){gl.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}draw();}
      function disposeWorld(){
        if(world){var geometries=new Set(),materials=new Set();world.scene.traverse(function(o){if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){materials.add(m);});});geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});world=null;}
        if(gl){var old=gl;gl=null;old.domElement.removeEventListener('webglcontextlost',lost);old.dispose();if(window.StemLab.releaseGl)window.StemLab.releaseGl(old);old.domElement.remove();}
      }
      function fallback(){disposeWorld();if(alive){setRenderer('map');paintMap();cv.style.visibility='visible';}}
      function lost(e){e.preventDefault();s.paused=true;keys.current={};fallback();setMessage('The 3D view was interrupted. Your flight is paused and your journal is intact. Continue using the habitat map.');refresh(function(n){return n+1;});}
      function pauseForFocus(){if(!s.paused){s.paused=true;s.target=null;setMessage('Flight paused while you were away. Resume when you are ready.');refresh(function(n){return n+1;});}keys.current={};last=0;draw();}
      function hidden(){if(document.hidden)pauseForFocus();}
      var keyMap={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyE:'rise',KeyQ:'lower'};
      function keydown(e){if(!node.contains(document.activeElement)||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))return;if(keyMap[e.code]){e.preventDefault();keys.current[keyMap[e.code]]=true;}if(e.code==='Space'&&!e.repeat){e.preventDefault();toggle();}}
      function keyup(e){if(keyMap[e.code])delete keys.current[keyMap[e.code]];}
      function frame(now){if(!alive)return;var wasPaused=s.paused;advanceFrame(s,last?(now-last)/1000:0,keys.current);last=now;
        if(s.paused&&!wasPaused)setMessage('You have reached '+nearest(s).plant.name+'. Land to examine this habitat.');
        if(!s.paused||!wasPaused||lastMapMode!==mapModeRef.current||lastView!==viewRef.current||lastLens!==lensRef.current)draw();
        if(s.paused!==wasPaused||(!s.paused&&now-lastUI>250)){refresh(function(n){return n+1;});lastUI=now;}
        raf=requestAnimationFrame(frame);
      }
      api.current={draw:draw};resize();observer=new ResizeObserver(resize);observer.observe(node);
      window.addEventListener('blur',pauseForFocus);document.addEventListener('visibilitychange',hidden);node.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);reduced.addEventListener('change',draw);
      setRenderer('loading');
      Promise.all([window.StemLab.ensureThree(),window.StemMeadow?Promise.resolve(window.StemMeadow):window.StemLab.ensureMeadow()]).then(function(deps){
        if(!alive)return;var T=deps[0];
        try{gl=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));gl.outputEncoding=T.sRGBEncoding;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=.95;
          gl.domElement.className='bf-gl';gl.domElement.setAttribute('aria-hidden','true');gl.domElement.addEventListener('webglcontextlost',lost);node.insertBefore(gl.domElement,cv);world=buildWorld(T,deps[1]);camera=new T.PerspectiveCamera(52,1,.1,600);setRenderer('three');resize();
        }catch(error){fallback();}
      }).catch(function(){if(alive)fallback();});
      raf=requestAnimationFrame(frame);
      return function(){alive=false;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('blur',pauseForFocus);document.removeEventListener('visibilitychange',hidden);node.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);reduced.removeEventListener('change',draw);disposeWorld();api.current=null;keys.current={};s.paused=true;};
    },[retry]);
    var near=nearest(s),landed=patch(s.landed,s),remaining=s.observations.length,detail=fieldDetail(s,lens),recorded=evidenceRecorded(s,landed);
    var seasonPatch=seasonSite?patch(seasonSite,s):null;
    var seasonView=seasonPatch?seasonOutcome(seasonPatch,mowPlan):null;
    var cycleSite=patch(s.lifecycle.patch,s),cycleIndex=STAGES.findIndex(function(st){return st.id===s.lifecycle.stage;});
    var canAdvance=!!(cycleSite&&s.lifecycle.stage&&cycleIndex<reachedStage(cycleSite));
    var verdict=pickedClaim?judgeClaim(s,pickedClaim):null;
    function button(label,onClick,extra){return h('button',Object.assign({type:'button',onClick:onClick},extra||{}),label);}
    function hold(label,key){return button(label,function(){},{'aria-label':label,'data-direction':key,
      onPointerDown:function(e){if(s.paused)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current[key]=true;},
      onPointerUp:function(){delete keys.current[key];},onPointerCancel:function(){delete keys.current[key];},onLostPointerCapture:function(){delete keys.current[key];},
      onKeyDown:function(e){if((e.key===' '||e.key==='Enter')&&!s.paused){e.preventDefault();keys.current[key]=true;}},onKeyUp:function(){delete keys.current[key];},onBlur:function(){delete keys.current[key];}});}
    return h('section',{className:'bfl','data-butterfly-root':true,'data-dark':!!ctx.isDark,'data-contrast':!!ctx.isContrast,'aria-label':'Butterfly Habitat Lab'},
      h('style',null,CSS),
      h('header',{className:'bf-header'},h('div',null,h('div',{className:'bf-eyebrow'},'Field study 01 · Mid-Atlantic, North America · Summer'),h('h2',null,'A meadow through butterfly eyes'),h('p',null,'Fly as a monarch. Follow the flowers, investigate the leaves, and discover what makes a habitat support more than one stage of life.')),h('span',{className:'bf-mark','aria-hidden':true},'🦋')),
      h('div',{className:'bf-layout'},h('div',null,
        h('div',{className:'bf-stage',ref:stage,role:'region',tabIndex:0,'aria-label':'Butterfly flight area. Arrow keys or W A S D to move, E to rise, Q to lower, Space to pause.','data-bf-paused':String(s.paused),'data-bf-renderer':mapMode?'map':renderer,'data-bf-landed':s.landed||'','data-bf-design':s.restoration.design},
          h('canvas',{className:'bf-map',ref:map,'aria-hidden':true}),
          landed?h('div',{className:'bf-lens-tools',role:'group','aria-label':'Field lens controls'},button('Flowers',function(){chooseLens('flowers');},{'aria-pressed':lens==='flowers'}),button('Leaves',function(){chooseLens('leaves');},{'aria-pressed':lens==='leaves'}),button('Wide view',function(){chooseLens(null);},{'aria-pressed':!lens})):null,
          h('div',{className:'bf-overlay','aria-hidden':true},h('div',{className:'bf-scene-badge'},mapMode||renderer==='map'?'HABITAT MAP · SAME EXPLORATION':'MONARCH HABITAT · SUMMER MEADOW'),h('div',{className:'bf-scene-bottom'+(detail?' bf-lens-caption':'')},detail?h('div',{className:'bf-eyebrow'},'Field lens · '+detail.species):null,h('strong',null,detail?detail.part:landed?'Landed · '+landed.name:s.target?'Guided flight · '+patch(s.target,s).name:s.paused?'Ready when you are':'Exploring the meadow'),h('small',null,detail?(detail.present?'Resource present':'Resource absent')+' · '+(detail.kind==='flowers'?'Adult nectar':'Monarch host leaves'):landed?(recorded?'Evidence recorded. Look closer, or choose your next habitat.':'Compare flowers and leaves above, then examine this patch.'):near.distance<=14?'Within landing range · Land here to investigate':near.plant.name+' · '+Math.round(near.distance)+' scene units away')))),
        h('div',{className:'bf-toolbar'},button(s.paused?'Take flight':'Pause flight',toggle,{className:'bf-primary','data-bf-play':true}),button(landed?'Lift off':'Land here',landing,{disabled:!landed&&near.distance>14}),button('Examine patch',examine,{disabled:!landed}),h('span',{className:'bf-spacer'}),button('Map',function(){setMapMode(!mapMode);},{'aria-pressed':mapMode}),button(view==='follow'?'Meadow view':'Follow view',function(){closeLens();setView(view==='follow'?'meadow':'follow');},{disabled:mapMode||renderer!=='three'})),
        h('div',{className:'bf-status',role:'status','aria-live':'polite'},h('p',null,message)),
        detail?h('section',{className:'bf-field-card','aria-label':'Field lens reading'},h('div',{className:'bf-field-head'},h('div',{className:'bf-eyebrow'},detail.kind==='flowers'?'Flower lens · Adult stage':'Leaf lens · Caterpillar stage'),h('span',{className:'bf-resource-tag'},detail.present?'Resource present':'Resource absent')),h('h3',null,detail.title),h('p',null,detail.note),h('p',{className:'bf-help'},(mapMode||renderer==='map'?'The outlined map patch is the habitat being studied. ':'The ring points to a part of the illustrative plant model. ')+(recorded?'Evidence is already in your journal or planting comparisons.':'Use Examine patch to record this visit.'))):null,
        h('p',{className:'bf-help'},'Focus the scene to fly with W A S D or arrows. E / Q change height. Space pauses. Guided travel and the buttons below also work with keyboard or touch.'),
        h('div',{className:'bf-touch',role:'group','aria-label':'Flight direction controls'},hold('← Left','left'),hold('↑ Forward','forward'),hold('↓ Back','back'),hold('→ Right','right'),hold('Rise','rise'),hold('Lower','lower')),
        renderer==='map'?h('p',{className:'bf-help'},'3D is unavailable. All habitat visits and journal activities work on this map. ',button('Retry 3D',function(){setRetry(retry+1);})):null
      ),h('aside',{className:'bf-aside'},
        h('section',{className:'bf-panel','aria-label':'Habitat destinations'},h('div',{className:'bf-eyebrow'},'Choose a place to explore'),h('h3',null,'Explore, then redesign.'),h('p',{className:'bf-help'},'Visit the three reference patches and your restoration plot.'),habitats(s).map(function(p,i){return h('button',{type:'button',key:p.id,className:'bf-destination','aria-pressed':s.target===p.id,onClick:function(){travel(p.id);}},h('span',null,(evidenceRecorded(s,p)?'✓ ':('0'+(i+1)+' · '))+p.name),h('small',null,p.latin));}),h('div',{className:'bf-meter'},h('label',null,'Flight energy · '+Math.round(s.energy)+'%',h('meter',{min:0,max:100,value:s.energy})),h('p',null,'A simplified activity meter. Examine a flowering patch to replenish it.'))),
        h('section',{className:'bf-panel','aria-label':'Field journal'},h('div',{className:'bf-eyebrow'},'Reference field journal'),h('h3',null,remaining+' of 3 patches investigated'),h('div',{className:'bf-progress','aria-hidden':true},PLANTS.map(function(p){return h('i',{key:p.id,'data-done':s.observations.indexOf(p.id)>=0});})),
          remaining?h('ul',{className:'bf-journal'},s.observations.map(function(id){var p=patch(id);return h('li',{key:id},h('strong',null,p.name),h('p',null,p.note));})):h('p',{className:'bf-help'},'Record the three reference patches here. Your restoration comparisons appear in the design activity below.')))),
      h('section',{className:'bf-panel bf-design','aria-label':'Habitat design activity'},
        h('div',{className:'bf-design-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Your next investigation · Predict → Plant → Observe'),h('h3',null,'What could this patch become?'),h('p',{className:'bf-help'},'Redesign the fourth patch and test what it offers a monarch. Each plan shows an established summer planting in bloom; real plants need time to grow.')),h('span',{className:'bf-design-current'},'In the meadow: '+design(s.restoration.design).short)),
        h('div',{className:'bf-design-steps'},h('fieldset',null,h('legend',null,'1. Choose a planting plan'),h('div',{className:'bf-design-choices'},DESIGNS.map(function(d){return button(h(R.Fragment,null,d.name,h('small',null,d.detail)),function(){setPlan(d.id);setGuess('');},{key:d.id,'aria-pressed':plan===d.id});}))),
          h('div',null,h('label',null,'2. Predict the resources available',h('select',{value:guess,onChange:function(e){setGuess(e.target.value);}},h('option',{value:''},'Choose your prediction'),PREDICTIONS.map(function(p){return h('option',{key:p.id,value:p.id},p.label);}))),
            h('div',{className:'bf-design-actions'},button('Apply habitat plan',applyDesign,{className:'bf-primary',disabled:!guess}),button('Visit restoration plot',function(){travel('restoration');stage.current.focus({preventScroll:true});stage.current.scrollIntoView({block:'center',behavior:'auto'});})),
            h('p',{className:'bf-help'},s.restoration.prediction?'Prediction saved. Land at the restoration plot and examine it to record a result.':'Apply a plan, then visit and examine it. Changing plants alone does not count as evidence.'))),
        h('p',{className:'bf-design-feedback'},designFeedback),
        h('table',{className:'bf-comparison'},h('caption',null,'Your planting comparisons · '+s.restoration.trials.length+' of 3 examined'),h('thead',null,h('tr',null,h('th',{scope:'col'},'Established plan'),h('th',{scope:'col'},'Adult nectar'),h('th',{scope:'col'},'Caterpillar host leaves'))),h('tbody',null,DESIGNS.map(function(d){var trial=s.restoration.trials.find(function(t){return t.design===d.id;});return h('tr',{key:d.id,'data-design-record':d.id},h('th',{scope:'row'},d.short),h('td',null,trial?(d.nectar?'Present':'Absent'):'Not examined',trial?h('span',null,'Predicted: '+prediction(trial.prediction).label):null),h('td',null,trial?(d.host?'Present':'Absent'):'Not examined'));}))),
        h('p',{className:'bf-help'},'Each row keeps your latest examined plan. Resource availability is one part of habitat quality; this comparison does not estimate butterfly numbers or survival.')),
      h('section',{className:'bf-panel bf-cycle','aria-label':'Life cycle investigation','data-bf-cycle-patch':s.lifecycle.patch||'','data-bf-cycle-stage':s.lifecycle.stage||''},
        h('div',{className:'bf-cycle-head'},h('div',null,h('div',{className:'bf-eyebrow'},'Follow a generation · Predict → Lay → Observe'),h('h3',null,'What happens to the next generation here?'),h('p',{className:'bf-help'},'You fly the adult. Place eggs on a patch you have already examined, then follow the generation one stage at a time and see how far it gets.')),
          h('span',{className:'bf-cycle-current'},!cycleSite?'No generation started':s.lifecycle.stage?'Generation at: '+cycleSite.name:'Last followed: '+cycleSite.name)),
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
        h('p',{className:'bf-help'},'Stages are developmental steps, not a timed simulation. This activity shows whether a patch offers what each stage needs; it does not model how many eggs survive, weather, predators, or disease.')),
      h('section',{className:'bf-panel bf-season','aria-label':'Mowing and timing investigation','data-bf-season-patch':seasonSite||'','data-bf-season-mowing':mowPlan},
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
        seasonView?h('ol',{className:'bf-weeks','aria-label':'Stage by stage through the season'},seasonView.steps.map(function(x){
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
        h('p',{className:'bf-help'},'Weeks order the stages for one generation; they are not a measured calendar, and real mowing dates vary by region and species. This activity models whether plants are present and still standing — not how many monarchs survive.')),
      h('div',{className:'bf-bottom'},h('section',{className:'bf-panel'},h('div',{className:'bf-eyebrow'},'One species · changing needs'),h('h3',null,'A life beyond the wings'),h('div',{className:'bf-life'},STAGES.map(function(st){return h('span',{key:st.id},h('b',null,st.ordinal+' · '+st.name),st.id==='egg'?'On milkweed':st.id==='caterpillar'?'Milkweed leaves':st.id==='chrysalis'?'Metamorphosis':'Flower nectar');})),h('p',{className:'bf-help'},'You play the adult stage. Follow a generation in the investigation above to see which patches can support the other three.')),
        h('section',{className:'bf-panel bf-question','aria-label':'Habitat evidence question','data-bf-claim':pickedClaim||''},h('div',{className:'bf-eyebrow'},'Make sense of your evidence'),h('h3',null,'Which claim does your evidence support?'),
          h('p',{className:'bf-help'},'Choose a claim. The lab does not tell you which is right on its own authority — it shows you which of your own records bear on it.'),
          CLAIMS.map(function(c){return button(c.label,function(){setPickedClaim(c.id);setAnswer('');},{key:c.id,'aria-pressed':pickedClaim===c.id});}),
          verdict?h('div',{className:'bf-verdict','data-bf-tested':String(verdict.tested)},
            h('strong',null,verdict.verdict),h('p',null,verdict.why),
            verdict.evidence.lines.length?h(R.Fragment,null,h('p',{className:'bf-eyebrow'},'From your records'),
              h('ul',{className:'bf-evidence'},verdict.evidence.lines.map(function(line,i){return h('li',{key:i,'data-evidence':line.kind},line.text);}))
            ):h('p',{className:'bf-help'},'You have not recorded anything yet. Examine a patch to begin.')):null,
          h('div',{role:'status','aria-live':'polite'},answer||(verdict?verdict.verdict+' '+verdict.why:'')))),
      h('details',{className:'bf-sources'},h('summary',null,'Science notes & sources'),h('p',null,'Species: monarch (Danaus plexippus). This summer scene represents a Mid-Atlantic habitat investigation. Plants and wing patterns are illustrative and enlarged. Guided routes, flight speed, distances, and energy are teaching choices, not field measurements. The generation you follow is a teaching model of one outcome, not a population simulation: it turns on whether milkweed is present, and it deliberately leaves out weather, predators, parasites, disease, how many eggs are laid, and how many survive — all of which matter in a real meadow, where most eggs do not reach adulthood even on good milkweed. Real development also takes weeks and depends on temperature; the stages here advance when you choose, in a fixed order. Other butterfly species can have different host plants.'),h('ul',null,
        h('li',null,h('a',{href:'https://www.xerces.org/publications/plant-lists/monarch-nectar-plants-mid-atlantic',target:'_blank',rel:'noopener noreferrer'},'Xerces Society · Regional nectar plants and milkweed hosts')),
        h('li',null,h('a',{href:'https://monarchjointventure.org/monarch-biology/life-cycle',target:'_blank',rel:'noopener noreferrer'},'Monarch Joint Venture · Life cycle')),
        h('li',null,h('a',{href:'https://www.nrcs.usda.gov/programs-initiatives/monarch-butterflies',target:'_blank',rel:'noopener noreferrer'},'USDA NRCS · Monarch habitat and feeding needs')),
        h('li',null,h('a',{href:'https://plants.ces.ncsu.edu/plants/asclepias-syriaca/',target:'_blank',rel:'noopener noreferrer'},'NC State Extension · Common milkweed plant structure')),
        h('li',null,h('a',{href:'https://plants.ces.ncsu.edu/plants/monarda-fistulosa/',target:'_blank',rel:'noopener noreferrer'},'NC State Extension · Wild bergamot plant structure')))),
      h('p',{className:'bf-help'},'Butterfly Habitat Lab · Local habitat exploration. Find the long-distance monarch journey in Animal Migration Lab.')
    );
  }
  window.StemLab.registerTool('butterfly',{label:'Butterfly Habitat Lab',icon:'🦋',desc:'Explore a summer meadow as a monarch, compare nectar and host plants, and build a field journal.',category:'science',color:'orange',gradeRange:'4-12',aliases:['monarch','butterflies','milkweed','pollinator','habitat'],render:function(ctx){return ctx.React.createElement(ButterflyLab,{ctx:ctx});}});
  if(window.__RR_TEST_EXPORTS__)window.__RR_TEST_EXPORTS__.butterfly={plants:PLANTS,freshState:freshState,nearest:nearest,step:step,advanceFrame:advanceFrame,land:land,observe:observe,save:save,buildWorld:buildWorld,designs:DESIGNS,habitats:habitats,applyPlan:applyPlan,cleanRestoration:cleanRestoration,fieldDetail:fieldDetail,evidenceRecorded:evidenceRecorded,broodIsCurrent:broodIsCurrent,broodRowsFor:broodRowsFor,mowings:MOWINGS,stageWeek:STAGE_WEEK,seasonOutcome:seasonOutcome,cleanSeason:cleanSeason,runSeason:runSeason,seasonRunFor:seasonRunFor,timingPairs:timingPairs,currentSeasonRuns:currentSeasonRuns,seasonRunIsCurrent:seasonRunIsCurrent,mowing:mowing,
    stages:STAGES,outcomes:OUTCOMES,layEggs:layEggs,advanceStage:advanceStage,broodResult:broodResult,broodFor:broodFor,
    cleanLifecycle:cleanLifecycle,clampStage:clampStage,abandonBrood:abandonBrood,reachedStage:reachedStage,stageStatus:stageStatus,expectedOutcome:expectedOutcome,
    claims:CLAIMS,judgeClaim:judgeClaim,evidenceFor:evidenceFor};
})();
