const assert=require('assert/strict');
function refine(pack){
 const changes=[];
 const edit=(id,path,to)=>{const resource=pack.history.find(r=>r.id===id);assert(resource,id);let obj=resource;for(const k of path.slice(0,-1))obj=obj[k];const key=path.at(-1),from=obj[key];assert.equal(typeof from,'string');obj[key]=to;changes.push({resourceId:id,path,from,to});};
 const get=id=>pack.history.find(r=>r.id===id);
 edit('en-glossary',['data',8,'def'],'The flow of electric charge through a circuit. A current can transfer energy.');
 let reading=get('en-reading').data;
 reading=reading.replace('It always goes that way, warm to cool, never the other way.','On its own, net heat transfer goes from warmer to cooler. A device such as a refrigerator needs an energy supply to move heat the other way.');
 reading=reading.replace('A wire carries energy from a battery to a bulb. Nothing you can see is moving along the wire, but the energy arrives, and the bulb glows.','In a complete circuit, electric charge flows through the wires and bulb. This flow is called current. Energy transfers from the battery to the bulb, which glows.');
 reading=reading.replace('A rolling marble hits a still marble, stops, and the still one shoots away.','In a nearly elastic, straight-on collision between equal-mass marbles, the rolling marble can nearly stop while the still marble moves away. Real results depend on the objects and the collision.');
 edit('en-reading',['data'],reading);
 edit('en-anchor',['data','sections',2,'bullets',0],'Net heat flows from warmer to cooler on its own');
 edit('en-anchor',['data','sections',2,'bullets',1],'Moving heat the other way needs an energy supply');
 edit('en-anchor',['data','sections',3,'bullets',0],'Electric charge flows around a complete circuit');
 edit('en-anchor',['data','sections',4,'bullets',0],'For the same mass, faster means more motion energy');
 edit('en-quiz',['data','questions',2,'question'],'Which way does net heat flow on its own?');
 edit('en-quiz',['data','questions',6,'expectedAnswer'],'It started as energy of the moving hands. During the clap, some energy transferred to the air as sound and some became thermal energy in the hands and surroundings. The proportions are not measured here. Energy was transferred and transformed, not destroyed.');
 edit('en-quiz',['data','questions',7,'expectedAnswer'],'Energy is not destroyed. As a battery powers a device, stored chemical energy transfers and changes into other forms, such as light and thermal energy. A flat battery can no longer supply enough electrical energy for that device under those conditions.');
 edit('en-faq',['data',0,'answer'],'As a battery powers a device, stored chemical energy is transferred and changed into forms such as light, sound and thermal energy. A flat battery can no longer supply enough electrical energy for the device. The transferred energy still exists, often dispersed as thermal energy that is less useful for doing the original job.');
 edit('en-challenge',['data','brief','lockedLessonFacts',0],'For the same mass, faster motion means more kinetic energy.');
 return changes;
}
module.exports={refine};
