const chapters=[
  {title:'Make room for your way of working',setting:'Monday · Planning table',
   body:'You, Morgan and Sam are making a class presentation. Ideas are coming quickly, and the group is about to choose roles. You want a way to contribute that works for you.',
   prompt:'How would you like to join the plan?',
   actions:[
    {id:'written-plan',label:'Ask for a written plan',hint:'“Could we write down the jobs before choosing?”',responseTerms:['write','written','list','on paper','text','type'],reply:'Sam starts a shared list. Morgan asks which part you would like to take.',reflection:'A written plan gives everyone something to return to. You can request it without explaining personal information.'},
    {id:'talk-it-through',label:'Ask to talk through the roles',hint:'“Could we go around and hear what each person wants to do?”',responseTerms:['talk','turns','discuss','listen','speak'],reply:'Morgan suggests taking turns. The group hears each person’s preferred role.',reflection:'A turn-taking plan can make room for different ideas. Listening can look different for different people.'},
    {id:'thinking-time',label:'Ask for a little thinking time',hint:'“I need a minute to decide. Can you come back to me?”',responseTerms:['minute','time','pause','think','break'],reply:'The group looks at examples while you consider the roles, then checks back with you.',reflection:'Taking time can be part of participating. You do not have to answer immediately to have a useful contribution.'}
   ]},
  {title:'Ask for the support you need',setting:'Tuesday · Working session',
   body:'The classroom is busy and several groups are talking. You are finding it hard to keep track of the next step. You can try a different way of working or ask someone to help.',
   prompt:'What support would you like to try?',
   actions:[
    {id:'quiet-space',label:'Request a quieter place to work',hint:'“Could I work at the nearby quiet table and check in afterward?”',responseTerms:['quiet','noise','loud','space','nearby'],reply:'The teacher points out a quieter table. You arrange a time to check in with the group.',reflection:'Changing the environment is one option. In another classroom, you might need to discuss which spaces are available.'},
    {id:'written-checkin',label:'Request the next step in writing',hint:'“Could you put the next step in our shared notes?”',responseTerms:['write','written','notes','text','list','instructions'],reply:'Sam adds the next step to the notes and asks whether you want to check it together.',reflection:'You can ask for information in a format you can use. A request can be spoken, written or shared through a communication tool.'},
    {id:'adult-support',label:'Ask a trusted adult to help clarify',hint:'“Could you help us work out what comes next?”',responseTerms:['teacher','adult','help','clarify','support'],reply:'The teacher helps the group divide the next task into smaller steps.',reflection:'Asking for support is a valid action. You can say what would help without sharing a diagnosis or other private information.'}
   ]},
  {title:'Respond to a change in the plan',setting:'Wednesday · A new request',
   body:'Morgan asks, “Could you present my slides too?” That would add work to the role you agreed on. You can discuss the request, set a limit or get support.',
   prompt:'How would you respond?',
   actions:[
    {id:'keep-boundary',label:'Keep your agreed role and offer to plan together',hint:'“I can do my section. Let’s work out another plan for yours.”',responseTerms:['no','cannot','can t','my part','my section','boundary','limit','own'],reply:'Morgan asks Sam about sharing the remaining slides. The group revisits the work that is still needed.',reflection:'You can set a limit without solving everything for someone else. This scene shows one possible response, not a guaranteed reaction.'},
    {id:'adjust-plan',label:'Negotiate a smaller change',hint:'“I could take one slide if we adjust the rest of the work.”',responseTerms:['one slide','share','split','adjust','negotiate','trade'],reply:'The group writes down a smaller change and checks that everyone understands the new roles.',reflection:'A revised agreement can work when you choose it freely and the workload is clear.'},
    {id:'ask-mediator',label:'Ask the teacher to help revisit the workload',hint:'“Could we check this plan with the teacher?”',responseTerms:['teacher','adult','help','support'],reply:'The teacher helps everyone compare the remaining work with the available time.',reflection:'You can involve support when a conversation is difficult. This practice does not require you to handle every disagreement alone.'}
   ]},
  {title:'Follow up on what worked',setting:'Friday · Looking ahead',
   body:'The presentation is finished. Before another group project, you have a chance to keep a useful support, revise it or ask someone to help you plan.',
   prompt:'What would you carry into the next project?',
   actions:[
    {id:'keep-support',label:'Keep a support that helped',hint:'Name what helped and ask to use it next time.',responseTerms:['keep','again','worked','same','next time'],reply:'You note a support you would like to request again and when you would bring it up.',reflection:'A useful next step names what helped and when you want to use it.'},
    {id:'revise-support',label:'Try a different support next time',hint:'Name one part you would change and a possible alternative.',responseTerms:['change','different','revise','instead','try'],reply:'You write one change to try and a way to check whether it helps.',reflection:'Revising a plan is part of learning what works for you. You can change your mind.'},
    {id:'plan-checkin',label:'Arrange a check-in with someone you trust',hint:'Prepare a question to discuss together.',responseTerms:['check in','checkin','teacher','adult','help','support','talk'],reply:'You prepare a question and choose someone you could ask for a planning conversation.',reflection:'Support can continue after a task ends. You choose what to share in that conversation.'}
   ]}
];
const clone=x=>JSON.parse(JSON.stringify(x));
export const selfAdvocacyJourney={
 id:'self-advocacy',kind:'sel',title:'A place for your voice',label:'Self-Advocacy Journey',eyebrow:'WORKING TOGETHER · 4 ENCOUNTERS',
 intro:'Join a fictional group project, ask for support, discuss a change and decide what to try next. Respond with choices, your own words or both.',
 disclosure:'A fictional practice story with several valid approaches. Characters’ replies are authored possibilities, not predictions or a score of your social skills. You may pause or leave at any time.',
 start(seed,config={}){if(Object.keys(config).length)throw Error('Unsupported practice settings.');return {chapter:0,history:[]};},
 config:()=>({}),
 actions(model){return model.chapter<chapters.length?chapters[model.chapter].actions.map(({id,label,hint,responseTerms})=>({id,label,hint,responseTerms})):[];},
 step(model,id){const chapter=chapters[model.chapter],action=chapter?.actions.find(a=>a.id===id);if(!action)throw Error('That response is unavailable here.');return {chapter:model.chapter+1,history:[...clone(model.history),{title:chapter.title,action:action.label,reply:action.reply,reflection:action.reflection}]};},
 view(model){
   const ended=model.chapter===chapters.length,chapter=chapters[Math.min(model.chapter,3)],last=model.history.at(-1);
   const connection=model.chapter>0&&!ended?' Earlier, you chose to '+model.history[0].action.toLowerCase()+'. You can keep that approach or try another.':'';
   return {campaignId:this.id,kind:'sel',title:ended?'Your next conversation':chapter.title,
    body:ended?'You practiced joining a plan, asking for support, responding to a change and following up. Look back at your choices and words. Which support would you want available in a real project?':chapter.body+connection,
    phase:ended?'complete':'encounter',ended,review:false,progress:model.chapter,total:4,
    period:ended?'Practice journey complete':'Encounter '+(model.chapter+1)+' of 4',progressLabel:'encounters explored',replayLabel:'Replay the latest encounter',
    prompt:ended?'What would you keep, change or ask for?':chapter.prompt,
    setting:ended?'Your practice notebook':chapter.setting,people:['You · choose how to participate','Morgan · project teammate','Sam · project teammate','Teacher · available for support'],
    metrics:[],locations:[],evidence:[],actions:this.actions(model),receipts:model.history.map((r,i)=>({title:'Encounter '+(i+1)+' · '+r.title,text:'You tried: '+r.action+'. Possible response: '+r.reply,detail:r.reflection})),
    feedback:last?{title:'A possible response',body:last.reply,reflection:last.reflection}:null,
    support:'There is more than one reasonable response. You can speak, write or use a communication tool. You do not need to disclose personal information, make eye contact or agree to extra work to participate.',
    sound:null};
 }
};
