module.exports=function quality(pack,slug){
const get=t=>pack.history.find(r=>r.type===t);
if(slug==='materials_grade2'){
const defs=['What an object is made of. It may use more than one kind.','A feature we can see, feel, or test.','Hard to dent or scratch. A thin piece may still bend.','Easy to press into or squash gently.','Able to curve without breaking. This is not the same as stretching.','Having a bumpy or uneven surface.','Having an even surface with few bumps we can feel.','Made to keep water from passing through in its intended use.','Take a liquid into the material.','A planned try to find out something.'];get('glossary').data.forEach((g,i)=>g.def=defs[i]);
get('simplified').data=get('simplified').data.replace('An object can use more than one.','').replace('It is a marker, not a command to ignore units.','');
const answers=['Yes. A thin metal strip can bend and still be hard to dent. Hardness and flexibility are different properties. Shape and thickness matter too.','Many plastics start with chemicals from oil or gas. Some use plants. Early plastics were made in the 1800s. More kinds came later.','Wood can hold things up and be cut to shape. Its kind and thickness matter. Trees take time to grow. We can use wood again and care for forests.','Clear glass lets us see details. Frosted glass lets light through but blurs the view. Smooth does not always mean clear.','Ask what the job needs. Pulling, pressing, scratching, and breaking are different tests. Shape and thickness matter too.','Reuse means use an object again. A jar can hold pencils. Recycling turns suitable old material into new products. Glass and metal may be melted. Paper is made into pulp. Check what your local program takes.'];get('faq').data.forEach((f,i)=>f.answer=answers[i]);
const b=get('applied-challenge').data.brief;b.context='We have paper towel, cotton cloth, and a plastic sheet. A teacher cuts equal-size dry squares. We have trays, a spoon, water, and a timer.';b.drivingQuestion='What happens when we put the same amount of water on each sample and wait the same time?';b.seedDirection='Use equal-size dry samples and the same water amount. Wait the same time. Look on top and in the tray below. Repeat with fresh dry samples. A large wet patch does not prove more water went in.';b.openQuestions=['Where did the water go?','What will we keep the same?','Do fresh samples act the same way?'];b.criteria=['Use equal-size dry samples','Use the same water amount and wait time','Predict first, then record what happened','Repeat with fresh dry samples'];b.deliverable='Draw what happened to each sample. Show water on top, in the cloth, or in the tray. Tell which job it might suit and what you still do not know.';
}
if(slug==='forces_motion_grade3'){
const defs=['A push or pull. It can change motion or shape, or balance other forces.','A force directed away from what applies it, even if nothing moves.','A force directed toward what applies it, even if nothing moves.','A force that resists sliding between surfaces that touch.','A pull between objects with mass. Earth pulls nearby things toward its center.','A change in position compared with something else, such as the floor.','Forces on one object that cancel overall. Its speed and direction stay the same.','Forces on one object that do not cancel. Its speed or direction changes.','A repeated link in what we observe. Results may be close, not exact.','Use evidence to say what may happen, then check.'];get('glossary').data.forEach((g,i)=>g.def=defs[i]);
const q=get('quiz').data.questions[2];q.options=['The ball uses up a push stored inside it','Gravity pulls the ball back along the floor','The floor and air can resist its motion','A ball must stop after a fixed time'];q.correctAnswer=q.options[2];
get('memory-aid').data.cards[1].mapping='Watch one object. Balanced forces keep its motion the same. It may be still or moving steadily in a straight line.';
}
if(slug==='plant_needs_grade3'){
const q=get('quiz').data.questions[3];q.options=['It uses light to make sugar from water and carbon dioxide','It takes ready-made sugar from tiny stones in the soil','It gets all its food by taking in water through roots','It gets all its food from heat that warms its leaves'];q.correctAnswer=q.options[0];get('memory-aid').data.cards[0].mapping='The words name needs. Roots need room and nutrients. The plant also needs a suitable temperature. Each kind has its own needs.';
}
if(slug==='states_of_matter_grade4'){
const g=get('glossary').data.find(g=>g.term==='Energy');if(g)g.def='A quantity that can be transferred to cause changes, such as warming or motion.';
get('memory-aid').data.cards[0].mapping='This crowd shows how parts are spaced and move. It does not show how hot they are or what real water particles look like.';get('memory-aid').data.cards[1].mapping='The arrows show changes of state and which way energy moves. Heat can change the state without raising the temperature.';
}

if(slug==='forces_motion_grade3'){
const answers=[
'Yes. A bike can move at a steady speed in a straight line. The force that drives it forward can balance the forces that resist its motion. If you stop pedaling, those forces tend to slow it down.',
'Shoes need friction to grip the ground. Ice can give less grip, so the shoe slides. Friction also helps you walk. It does not just slow things down.',
'Yes. The Moon pulls things toward it. Its pull at the surface is weaker than Earth’s. The pull depends on mass and distance. Size alone is not enough to tell.',
'Yes! Gravity pulls a pencil down. A magnet can pull a paperclip across a gap. These forces can act without touch.',
'Yes. Your hand pushes the wall. The wall pushes your hand back. These forces act on two different objects. Other forces on the wall, such as support from the building, balance your push on it.',
'With no air in the way, things dropped together speed up at the same rate near Earth. In air, the air can slow their fall. Shape, size, and mass all play a part. Do not assume that all balls will land at once.'
];get('faq').data.forEach((q,i)=>q.answer=answers[i]);
}
if(slug==='plant_needs_grade3'){
const answers=[
'Yes. Roots need air as well as water. Soil that stays soaked can leave too little air for roots. The plant may die. Each kind of plant needs the right amount of water.',
'Plants still work at night. Some leaves and flowers move. In the dark, green plants cannot use light to make food. They still use stored food and oxygen to get energy.',
'Many leaves have a green substance called chlorophyll. It takes in light that helps the plant make food. Some leaves have other colors that hide the green.',
'Yes. Roots can grow in water with nutrients mixed in. They also need oxygen and support. This way of growing is called hydroponics. Plain water alone cannot meet all these needs for long.',
'An oak can start from an acorn. The seed holds a young plant and stored food. As it grows, it needs light, water, air, nutrients, room, the right warmth, and time.',
'Yes. Plants and algae give off oxygen when they use light to make food. Many living things need that oxygen. Plants also use oxygen themselves, both day and night.'
];get('faq').data.forEach((q,i)=>q.answer=answers[i]);
const b=get('applied-challenge').data.brief;
b.context='Your class has two young bean plants, or seedlings, of the same kind and size. They grow in matching pots with holes for water to drain. Use the same soil. Find two places with similar warmth but different light.';
b.drivingQuestion='What happens to these young plants when one gets less light?';
b.openQuestions=['How can we change the light but keep other things the same?','What will we record besides height?','Could something else cause the changes we see?'];
b.stakeholders=['Your team','The class next door','Your teacher'];
b.constraints=['Use young bean plants with your teacher','Watch for one week; some changes may take longer','Check how wet the soil is in the same way; give each plant the water it needs','After the test, put both plants where they can grow well'];
}

const directions=get('directions'),visuals=pack.history.filter(r=>r.type==='image');if(directions&&visuals.length&&!directions.data.body.includes('Picture panels:'))directions.data.body+='\n\nPicture panels: '+visuals.map(r=>r.title).join('; ')+'. Use these alongside the activities.';
return pack;
};
