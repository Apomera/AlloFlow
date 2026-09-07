import {createWatershedRuntime} from './watershed-source.mjs';
const round=x=>Math.round(x);
const delta=x=>(x>0?'+':'')+round(x);
export function createAdapters(tree) {
  if(!tree?.groveAdvance)throw new Error('The original Tree Life Lab engine did not load.');
  const water=createWatershedRuntime();
  const avg=(model,field)=>round(model.components.reduce((n,c)=>n+c[field],0)/model.components.length);
  const waterActions=model=>{
    if(model.phase==='debrief')return [];
    if(model.phase==='review')return [{id:'continue',label:model.year===model.maxYears?'See the campaign outcome':'Begin year '+(model.year+1),hint:'Continue after reviewing the evidence.'}];
    return water.techniques.filter(t=>t.id!=='rest').flatMap(tech=>{
      const targets=tech.appliesTo==='any'?[null]:tech.appliesTo;
      return targets.map(target=>({id:'tech:'+tech.id+':'+(target||'all'),label:tech.name,
        location:target||'all',responseTerms:tech.id==='bufferPlant'?['plant','plant trees','buffer','riparian']:[],cost:tech.hours,disabled:tech.hours>model.hoursLeft,
        hint:(target?water.components.find(c=>c.id===target).name:'Watershed-wide')+' · '+tech.hours+' hours',
        tradeoff:Object.entries(tech.effects).map(([key,value])=>key+' '+delta(value)).join(' · ')}));
    }).concat([{id:'end-year',label:'Observe the year',hint:'Finish fieldwork. See the annual event and downstream effects.'}]);
  };
  const watershed={
    id:'watershed',title:'A river worth returning to',label:'Watershed Steward',eyebrow:'CENTRAL MAINE · 10 YEARS',
    intro:'Follow the water from forest to mainstem. Choose where to put your effort, then return each year to see what changed.',
    disclosure:'An educational watershed model, not a forecast. Quality, connectivity, and support are 0–100 model indices. Regional context recognizes Indigenous-led restoration; the narrator does not speak for a Tribal Nation.',
    start(seed,config={}) {
      const difficulty=config.difficulty||'coordinator';
      if(!Object.hasOwn(water.difficulties,difficulty)||Object.keys(config).some(k=>k!=='difficulty'))throw new Error('Unsupported watershed settings.');
      return water.start({seed,difficulty});
    },
    config:model=>({difficulty:model.difficulty}),
    actions:waterActions,
    step(model,id) {
      if(!waterActions(model).some(a=>a.id===id&&!a.disabled))throw new Error('Unavailable watershed action.');
      if(id==='end-year')return water.endYear(model);
      if(id==='continue')return water.continue(model);
      const [,tech,target]=id.split(':');
      return water.apply(model,tech,target==='all'?null:target);
    },
    view(model){
      const ended=model.phase==='debrief',review=model.phase==='review';
      const latest=model.yearLog.at(-1);
      const weakest=[...model.components].sort((a,b)=>a.quality-b.quality)[0];
      const weakName=water.components.find(c=>c.id===weakest.id).name;
      const start=latest?.pre||model.components;
      const resultText=latest?latest.eventDesc+' '+(latest.cascades.map(c=>c.msg).filter(Boolean).join(' ')||'No downstream feedback rule activated this year.'):'';
      const title=ended?model.finalOutcome.label:review?'What the river carried forward':
        model.year===1?'Your first season on the river':model.year<4?'Look upstream':model.year<8?'Connections begin to matter':'The river you leave behind';
      const body=ended?model.finalOutcome.desc:
        review?'Year '+model.year+' closes with '+latest.event.toLowerCase()+'. '+resultText:
        'You coordinate this year’s watershed work. '+weakName+' has the lowest quality index ('+round(weakest.quality)+' of 100). You have '+model.hoursLeft+' stewardship hours left. Explore a reach, weigh the available work, and choose when to observe the year.';
      return {campaignId:this.id,title,body,phase:model.phase,ended,review,
        progress:ended?10:review?model.year:model.year-1,total:10,period:'Year '+model.year+' of 10',
        prompt:review?'Read the changes before beginning the next year.':ended?'What would you carry into another restoration effort?':'Where will your stewardship hours make a difference?',
        metrics:[{label:'Quality',value:avg(model,'quality'),unit:'/100'},{label:'Connectivity',value:avg(model,'connectivity'),unit:'/100'},{label:'Support',value:avg(model,'support'),unit:'/100'},{label:'Hours left',value:model.hoursLeft,unit:''}],
        locations:water.components.map(c=>({id:c.id,name:c.name,description:c.desc,value:round(model.components.find(m=>m.id===c.id).quality),unit:'quality index',icon:c.icon})),
        evidence:review||ended?model.components.map(c=>({label:water.components.find(x=>x.id===c.id).name,
          before:round(start.find(x=>x.id===c.id).quality),after:round(c.quality),detail:'quality; annual change '+delta(c.quality-start.find(x=>x.id===c.id).quality)})):[],
        receipts:model.yearLog.map(row=>({title:'Year '+row.year+' · '+row.event,
          text:(row.actions.length?row.actions.map(a=>a.tech+' ('+a.target+', '+a.hours+'h)').join('; '):'No fieldwork')+'. '+row.eventDesc,
          detail:row.cascades.map(c=>c.msg).filter(Boolean).join(' ')})),
        event:latest?.event||'Your first field season',actions:waterActions(model),
        support:'Quality tracks conditions within each part of the watershed. Connectivity tracks passage and links. Some improvements trigger downstream benefits only after a threshold is crossed. The annual evidence separates fieldwork from later events and feedback.',
        sound:{atmosphere:'Calm',element:'Water',intensity:0.2,motion:'Steady',space:'Open'}
      };
    }
  };
  const grove={
    id:'grove',title:'Leave a living next generation',label:'Grove Journey',eyebrow:'TREE LIFE LAB · 8 YEARS',
    intro:'Three trees. Nine habitat patches. Guide a grove through weather and renewal, and see which descendants take root.',
    disclosure:'An educational grove scenario using Tree Life Lab’s existing physiology and seeded events. Shared priorities are a game abstraction. A new arrival counts as established only after surviving a later annual update.',
    start(seed,config={}) {
      const mode=config.mode||'deck';
      if(!['deck','generated'].includes(mode)||Object.keys(config).some(k=>k!=='mode'))throw new Error('Unsupported grove settings.');
      return tree.groveStart({version:1,seed,mode,choices:[]});
    },
    config:model=>({mode:model.config.mode}),
    actions(model) {
      if(tree.groveSummary(model).ended)return [];
      return tree.GROVE_PRIORITIES.map(p=>({id:p.id,label:p.name,hint:p.copy,responseTerms:p.id==='roots'?['root','roots','water access']:p.id==='reserve'?['reserve','reserves','save food','store','save energy']:['seed','seeds','offspring','reproduce','reproduction'],
        tradeoff:p.id==='offspring'?'Oak disperses acorns; aspen uses root suckers.':'One annual update; no reproductive attempts with this priority.'}));
    },
    step(model,id) {
      if(!this.actions(model).some(a=>a.id===id))throw new Error('Unavailable grove action.');
      return tree.groveAdvance(model,{priority:id,route:'mixed'});
    },
    view(model){
      const summary=tree.groveSummary(model);
      const next=summary.ended?null:tree.groveEvent(model.config,model.year+1);
      const receipt=model.receipts.at(-1);
      const body=summary.ended?
        (summary.success?'Living descendants now occupy '+summary.descendantPatches+' patches. The grove has a next generation.':'This run ends with '+summary.living+' living trees and established descendants in '+summary.descendantPatches+' patches. The goal was two patches by year eight. The field journal records what happened.') :
        (model.year===0?'An oak and two aspens stand at the edge of a changing woodland. ':'The grove now holds '+summary.living+' living trees. ')+
        'The next year brings: '+next.title.toLowerCase()+'. '+next.copy+' Choose how the trees allocate the food they make, then watch one year unfold.';
      return {campaignId:this.id,title:summary.ended?'The next generation':model.year===0?'A small grove, a long view':next.title,
        body,phase:summary.ended?'complete':'year',ended:summary.ended,review:false,
        progress:model.year,total:8,period:summary.ended?'Journey complete after '+model.year+' years':'Preparing year '+(model.year+1)+' of 8',
        prompt:summary.ended?'Which choice would you revisit in the same world?':'What will you invest in this year?',
        metrics:[{label:'Living trees',value:summary.living,unit:''},{label:'Established',value:summary.established,unit:''},{label:'Descendant patches',value:summary.descendantPatches,unit:'/2 goal'},{label:'Years observed',value:model.year,unit:'/8'}],
        locations:tree.GROVE_PATCHES.map((patch,i)=>({id:String(i),name:patch.name,description:patch.habitat+' habitat',
          value:model.trees.filter(n=>n.patch===i&&n.tree.alive).length,unit:'living trees',
          trees:model.trees.filter(n=>n.patch===i&&n.tree.alive).map(n=>({species:n.tree.speciesId,descendant:!!n.parent,established:!!n.parent&&n.born<model.year})),
          habitat:patch.habitat,gap:model.gaps.includes(i)})),
        evidence:receipt?[{label:'Reproductive attempts',before:null,after:receipt.attempts,detail:'Attempts are not surviving descendants.'},
          {label:'Reproduction cost',before:null,after:Math.round(receipt.spent*100)/100,detail:'kg C debited by the original model.'},
          {label:'Trees lost',before:null,after:receipt.deaths,detail:'Across the annual update.'},
          {label:'New arrivals',before:null,after:summary.newArrivals,detail:'Must survive a later year to count as established.'}]:[],
        receipts:model.receipts.map((r,i)=>({title:'Year '+(i+1)+' · '+r.event.title,
          text:r.event.copy,detail:r.attempts+' reproductive attempts · '+r.deaths+' trees lost · '+r.living+' living trees'})),
        event:next?.title||receipt?.event.title||'A gentle growing year',actions:this.actions(model),
        support:'Roots improve water access. Reserves store food. Investing in offspring enables reproductive attempts by mature trees. A seed landing is not the same as a descendant becoming established. The weather sequence stays the same when you replay the same world.',
        sound:{atmosphere:'Calm',element:next?.id==='wet'?'Rain':'Nature',intensity:0.15,motion:'Still',space:'Open'}
      };
    }
  };
  return [watershed,grove];
}
