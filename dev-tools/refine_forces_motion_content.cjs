module.exports=function refine(pack){
const get=id=>pack.history.find(r=>r.id===id);
get('fm-directions').data.body=get('fm-directions').data.body.replace('Every time something starts moving, stops, or turns, a push or a pull did it. Today you learn to spot the push or pull every single time.','When something starts, stops, speeds up, slows down, or turns, look for an unbalanced push or pull. A moving object does not always need an ongoing unbalanced force.').replace('This week, catch one thing moving and say out loud what pushed or pulled it.','This week, observe a change in motion and explain what push or pull may have caused it.');
get('fm-directions').data.objectives.find(o=>o.id==='fm-goal-manual').label='I observed a change in motion and named a push or pull that could explain it';
get('fm-reading').data="## The Invisible Push\n\nRoll a ball across the floor. It travels, slows, and stops. Nobody touches it with a hand, but the floor is touching it all along. The air around it matters too.\n\nA **force** is a push or a pull. Forces can change motion: starting, stopping, speeding up, slowing down, or turning. A force can also act without making an object move. Press gently on a wall: you apply a push even if the wall stays still.\n\nWhen you kick a ball, your foot pushes it while they touch. After your foot leaves, the ball can keep moving. It does not carry a continuing push from your foot.\n\n**Friction** acts between touching surfaces and resists sliding between them. It can help your shoes grip the ground. Contact with the floor can also resist a ball's rolling, especially when the ball or surface bends a little. Air resistance can slow motion too. A ball often rolls farther on a firm smooth floor than on thick carpet, but compare the same ball and release to test your surfaces.\n\n**Gravity** pulls objects toward Earth. A dropped pencil falls because of that pull. Gravity also acts on a book resting on a table. The table pushes upward on the book.\n\nIf all the forces on one object cancel overall, they are **balanced**. A still book stays still. An object already moving keeps the same speed in a straight line while its forces remain balanced. Balanced does not mean no forces.\n\nIf the forces do not cancel overall, they are **unbalanced** and the object's motion changes. A toy cart can speed up, slow down, or turn. The direction it is moving is not always the direction of the overall force: a force against its motion can slow it down.\n\nA bicycle can move steadily while you pedal. On a straight, level path, the forward effect of pedaling can balance the forces resisting motion. A larger forward force makes it speed up. A turning bicycle changes direction even if its speed stays the same.\n\nCareful observations reveal **patterns**. Release the same ball from the same place on a ramp without an extra push. Repeat the test and mark where it stops. The marks may be close together rather than identical. Use that pattern to **predict** an approximate stopping place for another roll. Then test your prediction and report what you actually observe.";
get('fm-reading').meta='3rd Grade • Leveled reading • forces, motion, and evidence';
const defs={
Force:'A push or a pull that can change motion or shape; forces can also balance.',
Push:'A force directed away from the person or object applying it, even if nothing moves.',
Pull:'A force directed toward the person or object applying it, even if nothing moves.',
Friction:'A force between touching surfaces that resists sliding between them.',
Gravity:'An attraction between objects with mass; Earth pulls nearby objects toward its center.',
Motion:'A change in position compared with a reference, such as the floor.',
Balanced:'Forces on one object that cancel overall, so its speed and direction do not change.',
Unbalanced:'Forces on one object that do not cancel overall, so its speed or direction changes.',
Pattern:'A repeated relationship in observations; results can be similar without being identical.',
Predict:'To use evidence to say what you expect may happen, then check it.'
};
for(const g of get('fm-glossary').data)g.def=defs[g.term];
const a=get('fm-anchor').data;a.title='LOOK FOR WHAT CHANGES MOTION';
a.sections[0].bullets=['A push or a pull','A force can act even if an object stays still','Look at all the forces on one object'];
a.sections[1].bullets=['Friction resists sliding between touching surfaces','Grip from friction helps us walk','Gravity pulls nearby objects toward Earth'];
a.sections[2].bullets=['Balanced: speed and direction stay the same','Unbalanced: speed or direction changes','Steady straight-line motion can have balanced forces'];
a.sections[3].bullets=['Keep the setup and release consistent','Repeat measurements; results can vary','Use evidence to predict, then test'];
const m=get('fm-memory').data;
m.sourceExcerpt='Friction resists sliding between surfaces. Gravity pulls nearby objects toward Earth. Balanced forces keep speed and direction unchanged; unbalanced forces change motion.';
Object.assign(m.cards[0],{target:'Friction resists sliding; gravity attracts',essentialFacts:['Friction resists sliding between touching surfaces and helps shoes grip.','Contact with the floor can resist rolling; compare surfaces using the same ball and release.','Gravity pulls nearby objects toward Earth, including objects sitting still.'],aiExample:'FRICTION: feel the grip of a shoe. GRAVITY: think of a dropped pencil going toward the ground.',mapping:'The shoe reminds you that friction can provide grip as well as resist sliding. The pencil reminds you of gravity.',scaffoldStarter:'Friction helps ____. Gravity pulls ____.',scaffoldSteps:['Name a touching-surface example.','Name a gravity example.','Explain what each force does.']});
Object.assign(m.cards[1],{essentialFacts:['Balanced forces on one object cancel overall.','Balanced forces allow rest or constant speed in a straight line.','Unbalanced forces change speed or direction.'],aiExample:'A still book stays still when its forces balance. A moving cart keeps steady straight-line motion when its forces balance. Unequal horizontal forces change the cart motion.',mapping:'Track a single object. Balance means unchanged motion, not necessarily no motion.',scaffoldStarter:'A still object with balanced forces ____. A moving object with balanced forces ____.',scaffoldSteps:['Choose one object.','Describe its speed and direction.','Explain what happens when its forces stop balancing.'],coachPrompts:['Can your model show a moving object with balanced forces?']});
const sort=get('fm-sort').data.items;
sort.find(i=>i.id==='fm-i2').content='A soccer ball speeding up while a foot kicks it';
sort.find(i=>i.id==='fm-i5').content='A dropped pencil speeding up as it falls';
sort.find(i=>i.id==='fm-i10').content='An ideal puck moving in a straight line at constant speed';
const f=get('fm-frames').data.items;
f[1].text='The rolling ball slowed down. Contact with the ____ and resistance from the ____ can explain this.';
f[2].text='With the same ball and release, our ball rolled ____ on ____. I think this happened because ____.';
const q=get('fm-quiz').data.questions;
q[0].question='Which answer gives the general meaning of a force?';
q[2].question='A ball rolls across a floor and slowly stops without another hand touching it. Which explanation fits?';
q[2].options[2]='Contact with the floor and resistance from the air can slow it';q[2].correctAnswer=q[2].options[2];
q[3].question='Two equal opposite horizontal pulls act on a rope that remains still. How do these horizontal forces compare?';
q[5].question='A book stays still on a table. Gravity pulls it down. Explain why it does not fall, using the word balanced.';
q[5].expectedAnswer='The table pushes up on the book and gravity pulls down. These forces act on the same book and balance, so its motion does not change.';
q[6].question='In our test, the same ball released the same way rolled farther on a firm floor than on carpet. Explain a possible reason using friction or resistance.';
q[6].expectedAnswer='The carpet may resist rolling more in this setup as the ball and surface deform. Contact effects, including friction, and air resistance can slow motion. Repeated controlled rolls help check the comparison.';
get('fm-quiz').data.reflections[0].text='Name a change in motion you observed. What force might explain it?';
const faq=get('fm-faq').data;
faq[0]={question:'Can a bike keep moving while its forces are balanced?',answer:'Yes. At steady speed in a straight line, the forward effect of pedaling balances forces resisting motion. A larger forward force makes it speed up. Coasting usually lets resistance slow it down.'};
faq[1].answer='Shoes need friction to grip the ground. A slippery surface can provide less grip, so the shoe slides. Friction does not only slow things down: it also helps you walk.';
faq[2].answer='Yes. Gravity near the Moon surface is weaker than near Earth surface. Gravity depends on mass and distance, not simply on how big something looks.';
faq[4].answer='Yes. Your hand pushes on the wall, and the wall pushes back on your hand. Those two forces act on different objects. The wall stays still because your push is balanced by other forces on the wall, including support from the building.';
faq[5].answer='When air resistance is negligible, objects fall with the same acceleration near Earth regardless of their mass. In air, shape, size, and mass affect how much air resistance changes the fall. Compare carefully rather than assuming all balls land together.';
const ch=get('fm-challenge').data;
ch.brief.seedDirection='Change only the ramp height OR the floor surface. Use the same ball and ramp. Release from the same marked place without an extra push. Repeat three times for each setup and measure from the ramp bottom to the stopping place.';
ch.brief.lockedLessonFacts=['A force is a push or a pull; forces can balance even when an object is moving.','Contact with the floor can resist rolling. Surface effects vary, so compare them with a controlled test.','Gravity pulls the ball toward Earth; on the ramp this can make it roll downhill.','Repeated observations can support an approximate prediction, not a guaranteed result.'];
ch.brief.openQuestions[0]='Which surface produces the shortest rolling distance in our controlled setup?';
ch.brief.openQuestions[1]='How does raising the ramp affect the distances we measure?';
ch.supports.parallelExample={context:'A class compared a toy car on a firm floor and a rug.',move:'They used the same car and ramp, released from the same place without pushing, repeated each setup, and measured each stopping distance. They used the spread of results to predict another trial.',whyItHelps:'They changed only the surface and checked how consistent their results were. A prediction can be useful without being exact.'};
ch.supports.frameChoices=['Change the floor surface while keeping the ramp fixed','Change ramp height while keeping the same floor and ball','Predict the next roll in a setup already measured'];
ch.supports.coachPrompts[1]='Which surface gave the shortest distance? What other conditions might also affect the result?';
ch.coachHint='One change, repeated measurements, then a prediction. Record variation and unexpected results too.';
ch.sourceExcerpt='Release from the same place without an extra push. Repeat the test, compare the stopping places, and use the pattern to predict an approximate result.';
return pack;
};

