const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
// A repeatable example cook used by the engine and real-control browser checks.
module.exports=function cook(id='mushroom',servings=2){
  let s=R.start(id,servings,'demonstrate');const steps=[];
  const act=(a,v)=>{steps.push([a,v]);s=R.act(s,a,v);};
  for(const a of ['wash','rinse','cut','dry','garlicPrep'])act(a);
  act('measure',R.ingredients(s).pasta);if(servings===4)act('panSize','wide');
  act('fill');act('potHeat',3);act('oil');act('panHeat',2);
  for(let i=0;i<160&&!s.plated;i++){
    let p=s.pot,n=s.pan,ready=id==='mushroom'?n.brown>=.7:n.soft>=.85;
    if(!n.produce&&n.temp>=135)act('produce');
    if(p.temp>=96&&!p.pasta){act('pasta');act('stirPot');}
    if(ready&&!n.garlic){act('garlic');act('panHeat',1);}
    if(p.pasta&&!p.drained&&p.progress>=.94){act('sample');act('reserve');act('drain');act('potHeat',0);}
    if(p.drained&&ready&&n.garlic&&n.moisture<=130*servings/2){
      if(!n.waterAdded||n.moisture<40)act('water');
      act('combine');act('potHeat',0);act('panHeat',0);act('taste');act('plate');break;
    }
    if(n.produce&&s.time-n.lastStir>60)act('stirPan');
    act('advance',30);
  }
  if(!s.plated)throw Error('Example cook did not finish: '+JSON.stringify(R.inspect(s)));
  return {state:s,steps};
};
if(require.main===module){for(const id of ['mushroom','tomato'])for(const n of [2,4]){const s=module.exports(id,n).state;console.log(id,n,s.time,JSON.stringify(R.criteria(s)),s.pan.brown,s.pan.soft,s.pot.progress,R.evidence(s).corrections);}}
