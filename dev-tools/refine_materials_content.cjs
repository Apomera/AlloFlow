module.exports=function refine(pack){
const get=id=>pack.history.find(r=>r.id===id);
get('mt-directions').data.body=get('mt-directions').data.body.replace('Nobody makes a window out of wool. Nobody makes a sweater out of glass.','Clear glass is useful for windows. Wool is useful for sweaters.').replace('find out for yourself which cloth soaks up most.','compare how three samples behave when they meet water.');
get('mt-reading').data=`## Why Windows Are Not Wool

Look through a clear window. Then feel a soft sweater. Why do people choose different **materials** for these jobs?

A material is what something is made of. Wood, glass, metal, and cloth are materials. An object can use more than one.

A **property** is something we can observe or test. Is a sample **hard** or **soft**? Is its surface **rough** or **smooth**? Can we see through it?

Clear glass lets us see outside. It resists dents, but it can still break. Smooth does not always mean see-through: a metal spoon can be smooth too.

A knitted sweater bends with your body. Air held among its fibers helps slow heat escaping from you. Some wool feels soft; some feels scratchy.

A **bendy** strip curves without breaking. A stretchy rubber band gets longer when pulled. Bending and stretching are different.

A raincoat made with **waterproof** material helps keep rain out. A towel needs to **absorb** water, which means take it in. The job helps us choose useful properties.

How do we choose? We **test** real samples. Compare equal-size dry pieces with the same water amount, waiting time, and method. Repeat with fresh dry pieces. Describe what you see.

A damp patch shows where water has spread. A bigger patch does not prove that more water was absorbed. If two samples take in all the water you added, this test cannot tell which could hold more.

Untreated paper towel is useful for spills but poor for a rain cover. A coating can change how paper behaves. Name the exact sample instead of assuming every kind is alike.

Pick an object. What is its job? Which properties help it do that job?`;
get('mt-reading').meta='2nd Grade • Leveled reading • observable properties and fair comparisons';
const defs={Material:'What an object is made of; one object may use several kinds.',Property:'A feature you can observe or test, such as texture or how easily something bends.',Hard:'Difficult to dent or scratch; it can still break or be made into a thin bendy shape.',Soft:'Easy to press into or squash gently.',Bendy:'Able to curve without breaking; bending is different from stretching.',Rough:'Having an uneven or bumpy surface.',Smooth:'Having an even surface with few bumps you can feel.',Waterproof:'Designed to keep water from passing through under the conditions it is made for.',Absorb:'To take a liquid into a material.',Test:'A planned try or investigation that helps answer a question.'};
for(const g of get('mt-glossary').data)g.def=defs[g.term];
const a=get('mt-anchor').data;
a.sections[0].bullets=['Clear, so we can see through','Resists dents, but can still break','Smooth is different from see-through'];
a.sections[1].bullets=['Comfortable against skin','Holds air that slows heat escaping','Bends with the wearer'];
a.sections[2].bullets=['Waterproof material helps keep rain out','A towel takes water into its fibers','Test the sample; coatings can change behavior'];
a.sections[3].bullets=['Compare equal-size dry samples','Keep water amount, time, and method alike','Repeat and describe actual results'];
const m=get('mt-memory').data;
m.sourceExcerpt='Choose properties that fit a job. Test specific samples fairly, because coatings, shape, and thickness can change how an object behaves.';
m.cards[0].essentialFacts=['An object may contain more than one material.','Properties help us decide which sample fits a job.','Shape, thickness, and coatings can change behavior.','No single material is best for every job.'];
m.cards[0].aiExample='FIT THE JOB. Point to a clear window: see outside. Point to a sweater: bend with me and help keep me warm.';
m.cards[0].mapping='Connect each object to a property that helps it do its job.';
m.cards[0].scaffoldSteps=['Choose a safe object to observe.','Name a material it uses.','Describe a property that helps its job.'];
m.cards[0].hookFact.text='Untreated paper towel can help clean a spill but makes a poor rain cover.';
m.cards[1].essentialFacts=['Waterproof material helps keep water from passing through.','An absorbent towel takes water into its fibers.','One surface bead does not prove lasting waterproof performance.'];
m.cards[1].mapping='Compare water remaining on the surface with water entering fibers. These are illustrations of behavior, not measured results.';
const sort=get('mt-sort').data;
sort.categories[2].label='The job is to SUPPORT OR STRIKE';
sort.items.find(i=>i.id==='mt8').content='The metal head of a hammer';
get('mt-sort').meta='3 groups • 9 cards • sort by the main job; objects may have several useful properties';
const q=get('mt-quiz').data.questions;
q[0].question='Why is clear glass useful for a window?';q[0].options[0]='It lets us see outside and resists dents';q[0].correctAnswer=q[0].options[0];
q[4].question='Which plan makes a water comparison fairer?';q[4].options=['Give more water to your favorite sample','Use different sizes and compare after different times','Use equal-size dry samples, equal water amounts, and the same waiting time','Use a wet sample for one material and a dry one for another'];q[4].correctAnswer=q[4].options[2];
q[6].question='Your friend wants a rain cover made of untreated paper towels. What would you explain?';q[6].expectedAnswer='Paper towels take water in and may soak through or tear. A rain cover needs to keep water from passing through. We should test a suitable coated or waterproof sample for that job.';
const faq=get('mt-faq').data;
faq[0].answer='Yes. A metal surface can resist dents while a thin strip of that metal bends. Hardness and flexibility are different properties. Shape and thickness matter too.';
faq[1].answer='Many plastics are made from chemicals obtained from oil or natural gas. Some use plant-based ingredients. People developed early plastics in the 1800s, and many more kinds came later.';
faq[2].answer='Wood can be useful because it can support loads and be cut into useful shapes. Its type, condition, and thickness matter. Trees take time to grow, so responsible forestry and reuse matter too.';
faq[3].answer='Clear glass lets us see details through it. Frosted glass lets light through but blurs the view. Glass can also be colored or made opaque. Smoothness alone does not make a material see-through.';
faq[4].answer='Ask what you need it to resist: pulling, squashing, scratching, or breaking. These are different tests. The shape and thickness of the object also affect its performance.';
faq[5].answer='Often. Reuse means using an object again, such as a jar for pencils. Recycling processes suitable materials into new products. Glass and metals may be melted; paper is pulped. What your local program accepts can vary.';
const ch=get('mt-challenge').data;
ch.instructions='Compare how three material samples behave with water. Predict first, keep the comparison fair, repeat, and describe your evidence. Do not decide a winner from wet-patch size.';
ch.brief.context='Your class has equal-size dry samples of paper towel, cotton rag, and plastic tablecloth. Use separate shallow trays, a measuring spoon, a cup of water, and a timer. A teacher prepares the samples.';
ch.brief.drivingQuestion='What happens when equal water amounts meet these samples for the same time? Which behavior is useful for cleaning a spill?';
ch.brief.seedDirection='Use equal-size dry samples, the same measured water amount, and the same waiting time. Observe water on top, damp fibers, and water in the tray below. Repeat with fresh dry samples. A larger wet patch does not prove more absorption.';
ch.brief.lockedLessonFacts=['Absorb means take liquid into a material.','A surface bead alone does not prove a material stays waterproof.','Keep sample size, water amount, waiting time, and method alike.','If two samples take in all the added water, this test does not show which could hold more.'];
ch.brief.openQuestions=['Where is the water after the agreed waiting time?','Which conditions will we keep alike, and what differences can we not control?','Do repeated trials show similar results?'];
ch.brief.criteria=['Equal-size dry samples and equal measured water amounts','The same waiting time and method for each sample','A prediction before testing and observations recorded afterward','Repeat with fresh dry samples; report ties and uncertainty'];
ch.brief.constraints=['Three sample materials in separate trays','Teacher-selected small equal water amounts and waiting time','No squeezing or rubbing; repeat with fresh dry samples'];
ch.brief.deliverable='Draw each sample after testing. Describe water on top, in the fibers, or in the tray. Explain a suitable use using evidence, and say what this test cannot tell you.';
ch.supports.parallelExample={context:'A class compared dry paper, cloth, and plastic samples.',move:'They kept sample size, water amount, and waiting time alike. They recorded surface water and damp areas, then repeated with fresh dry samples.',whyItHelps:'Keeping conditions alike makes the comparison more useful. Their drawings record observations, not a guaranteed ranking of all papers, cloths, or plastics.'};
ch.supports.frameStarter='I predicted ____. I observed ____. This evidence suggests ____, but it does not tell us ____.';
ch.supports.frameChoices=['Water stayed on top','Fibers became damp','Water reached the tray below','Two samples behaved similarly'];
ch.supports.coachPrompts=['Did samples start dry and receive equal water amounts?','Did you wait the same time and check the tray below?','What cannot be concluded from a wet patch alone?'];
ch.coachHint='Same size, dry start, same water and time. Repeat. Describe the evidence.';
ch.sourceExcerpt='Compare real samples under similar conditions. A wet patch shows spreading; its size alone does not measure the water absorbed.';
get('mt-challenge').meta='2nd Grade • Investigation • compare water behavior without unsupported capacity rankings';
return pack;
};
