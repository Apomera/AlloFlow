/* Kitchen Studio: deterministic, untimed practice. No render or storage side effects. */
(function (root) {
  'use strict';
  var missions = [
    { id: 'prep', station: 'sink', title: 'Set up a safe workspace', skill: 'Hygiene & separation', brief: 'Prepare vegetables after handling raw chicken. Make your hands and workspace ready.', goal: 'Clean hands, a clean board, and separate equipment.', hint: 'Wash with soap for at least 20 seconds. Use a fresh board and utensils for vegetables.', actions: [['wash', 'Wash hands with soap · 20 seconds'], ['rinse', 'Rinse hands with water only'], ['board', 'Choose clean board & utensils'], ['reuse', 'Reuse the raw-chicken board'], ['prepare', 'Prepare the vegetables']], question: 'Why use separate equipment after raw chicken?', answers: ['Vegetables need a colder surface.', 'It prevents raw juices reaching ready-to-eat food.', 'The board will keep the knife sharper.'], correct: 1, why: 'Raw poultry can transfer harmful bacteria through hands, boards, and utensils.', transfer: 'What would you change if you had only one cutting board?', success: 'The vegetables are prepared on clean equipment with washed hands.' },
    { id: 'knife', station: 'board', title: 'Make an even vegetable cut', skill: 'Knife preparation', brief: 'Prepare evenly sized carrots for a quick sauté. Set up before making the cut.', goal: 'A stable board, protected fingers, and uniform small pieces.', hint: 'Secure the board, choose a claw grip, then make an even small dice.', actions: [['secure', 'Secure board with a nonslip mat'], ['claw', 'Use a claw grip'], ['flat', 'Leave fingers extended'], ['dice', 'Cut a uniform small dice'], ['rough', 'Cut mixed large and small pieces']], question: 'Why do similarly sized pieces matter?', answers: ['They always taste sweeter.', 'They remove the need to stir.', 'They cook at a more similar rate.'], correct: 2, why: 'Similar dimensions reduce differences in the time heat takes to reach each piece’s center.', transfer: 'How would your cut change for a long-cooked stew?', success: 'Your board is stable and the carrot pieces are evenly sized.' },
    { id: 'heat', station: 'hob', title: 'Brown without burning', skill: 'Heat & moisture', brief: 'Sauté mushrooms. Change the pan conditions and advance the simulated cook to observe the result.', goal: 'Dry mushrooms, room in the pan, and golden browning.', hint: 'Dry the mushrooms, spread them into one layer, select medium heat, and advance three times.', actions: [['dry', 'Pat mushrooms dry'], ['spread', 'Spread into a single layer'], ['crowd', 'Crowd the pan'], ['low', 'Set heat: low'], ['medium', 'Set heat: medium'], ['high', 'Set heat: high'], ['advance', 'Advance cook · 30 simulated seconds'], ['plate', 'Turn heat off & plate']], question: 'Why did the crowded pan produce less browning?', answers: ['Trapped moisture keeps the surface wet.', 'Crowding removes the mushrooms’ proteins.', 'More mushrooms make the pan too dry.'], correct: 0, why: 'Released water and trapped steam delay surface drying and browning. This model illustrates the trend, not a real cooking clock.', transfer: 'How could you brown twice as many mushrooms with the same pan?', success: 'The mushrooms are golden, and the burner is off.' },
    { id: 'probe', station: 'oven', title: 'Check before you serve', skill: 'Temperature evidence', brief: 'A browned chicken portion is at 150°F internally. Decide when there is enough evidence to serve it.', goal: 'A correctly placed thermometer reading of at least 165°F (74°C).', hint: 'Place the probe in the thickest part, away from bone. Cook further, read again, then serve.', actions: [['thick', 'Place probe in thickest part, away from bone'], ['surface', 'Place probe against the surface'], ['cook', 'Continue cooking · simulated step'], ['read', 'Read thermometer'], ['serve', 'Serve the chicken']], question: 'Which evidence supports serving this chicken?', answers: ['The outside is golden brown.', 'The correctly placed probe reads at least 165°F (74°C).', 'It has cooked for the same time as last week.'], correct: 1, why: 'Color and elapsed time do not establish safe internal temperature. This activity uses the USDA consumer minimum for poultry.', transfer: 'Where else would you check a whole bird before serving?', success: 'You verified the internal temperature before serving.' },
    { id: 'measure', station: 'measure', title: 'Scale a recipe', skill: 'Ratio & measurement', brief: 'A sauce uses 150 mL of stock for 2 servings. Measure stock for 6 servings.', goal: 'Scale every ingredient by the same factor and measure 450 mL.', hint: 'Six divided by two is three. Multiply 150 mL by three.', actions: [['add150', 'Add 150 mL of stock'], ['add50', 'Add 50 mL of stock'], ['remove50', 'Remove 50 mL of stock'], ['empty', 'Empty measuring jug'], ['check', 'Check measurement at eye level']], question: 'How should the other ingredient quantities change?', answers: ['Add 150 to every ingredient quantity.', 'Keep them unchanged because stock is a liquid.', 'Multiply each original quantity by three.'], correct: 2, why: 'The serving ratio is 6 ÷ 2 = 3. Using the same factor preserves the recipe proportions.', transfer: 'How much stock would you measure for 4 servings?', success: 'You measured 450 mL at eye level for six servings.' },
    { id: 'chill', station: 'fridge', title: 'Store leftovers safely', skill: 'Time & storage', brief: 'Dinner finished 45 minutes ago in a room at 72°F (22°C). Store the leftovers now.', goal: 'Shallow containers, a label, and prompt refrigeration at 40°F (4°C) or below.', hint: 'Divide into shallow containers, label, and refrigerate now. Do not wait for food to cool on the counter.', actions: [['shallow', 'Divide into shallow containers'], ['deep', 'Leave in a deep pot'], ['label', 'Label food and preparation date'], ['wait', 'Wait another 2 hours on the counter'], ['chill', 'Refrigerate now at 40°F (4°C) or below'], ['discard', 'Discard food left out too long']], question: 'What changes if the surrounding temperature is above 90°F (32°C)?', answers: ['The time limit drops to 1 hour.', 'The usual 2-hour limit becomes 4 hours.', 'Refrigeration is no longer needed.'], correct: 0, why: 'USDA consumer guidance is refrigeration within 2 hours, or within 1 hour when temperatures exceed 90°F (32°C).', transfer: 'How would you handle leftovers after an outdoor picnic?', success: 'The leftovers are labeled and refrigerated promptly in shallow containers.' }
  ];

  var variations = {
    prep: { id: 'shared-board', label: 'One board, two jobs', brief: 'You have one cutting board and one set of utensils. They were used for raw chicken; prepare vegetables next.', goal: 'Wash, then sanitize the equipment according to its product instructions. Wash hands before preparing vegetables.', hint: 'Wash the board and utensils with hot soapy water, rinse, then use a food-contact sanitizer according to its label. Wash your hands before preparing vegetables.', actions: [['board', 'Wash board & utensils with hot soapy water; rinse'], ['sanitize', 'Sanitize equipment following product instructions'], ['wash', 'Wash hands with soap · 20 seconds'], ['rinse', 'Rinse hands with water only'], ['reuse', 'Reuse without cleaning'], ['prepare', 'Prepare the vegetables']], transfer: 'How could you plan the preparation order to need fewer equipment changes?' },
    knife: { id: 'stew', label: 'Prepare a slow-cooked stew', brief: 'The stew recipe calls for uniform large dice, about 2 cm across. Choose a safe setup and the requested cut.', goal: 'A stable board, protected fingers, and uniform large pieces matching the recipe.', hint: 'Secure the board and use a claw grip. Choose a uniform large dice for this recipe.', requestedCut: 'large', actions: [['secure', 'Secure board with a nonslip mat'], ['claw', 'Use a claw grip'], ['flat', 'Leave fingers extended'], ['dice', 'Cut a uniform small dice'], ['largeDice', 'Cut a uniform large dice · about 2 cm'], ['rough', 'Cut mixed large and small pieces']], transfer: 'What would you change if you were making a quick stir-fry instead?' },
    heat: { id: 'hot-pan', label: 'Take over a hot pan', brief: 'The mushrooms are dry, spaced out, and beginning to brown. The burner is on high. Take over the pan and finish without burning.', goal: 'Control the remaining browning and turn off the heat before the mushrooms burn.', hint: 'The mushrooms are already partly browned. Reduce to medium, advance once, and assess whether to plate.', initialValues: {heat:'high',dry:true,spread:true,brown:2,seconds:30}, transfer: 'What would you look for when taking over a pan from another cook?' },
    probe: { id: 'ready', label: 'Is more cooking needed?', brief: 'A chicken portion looks browned. It may already be ready. Gather evidence before deciding whether to cook it longer.', goal: 'Use a fresh internal reading to decide whether to continue cooking or serve.', hint: 'Place the thermometer correctly and read it before deciding to cook further. A verified 165°F (74°C) meets the poultry minimum.', initialValues: {temp:165}, transfer: 'Why might cooking for a fixed extra five minutes be a poor rule?' },
    measure: { id: 'four', label: 'Sauce for four', brief: 'A sauce uses 150 mL of stock for 2 servings. This time, measure stock for 4 servings.', goal: 'Apply the serving ratio and check 300 mL at eye level.', hint: 'Four divided by two is two. Multiply 150 mL by two.', targetMl:300, servings:4, answers:['Add 150 to every ingredient quantity.','Keep them unchanged because stock is a liquid.','Multiply each original quantity by two.'], why:'The serving ratio is 4 ÷ 2 = 2. Use the same factor for all ingredient quantities.', transfer:'How much stock would the same recipe need for 8 servings?', success:'You measured 300 mL at eye level for four servings.' },
    chill: { id: 'picnic', label: 'After a hot picnic', brief: 'Cooked leftovers have been sitting outside for 75 minutes at 95°F (35°C), without temperature control. Decide what to do now.', goal: 'Apply the hot-weather time limit and choose a safe next action.', hint: 'Above 90°F (32°C), the limit is 1 hour. These leftovers have been out for 75 minutes, so discard them.', initialValues:{late:true}, discardGoal:true, elapsedMinutes:75, ambientF:95, success:'You discarded leftovers that exceeded the hot-weather time limit.', transfer:'How could you plan temperature control for the next picnic?' }
  };
  function scenarioList(id) { var v=variations[id]; return [{id:'standard',label:'Foundation challenge'}].concat(v?[{id:v.id,label:v.label}]:[]); }
  function mission(id, scenario) {
    var base=missions.find(function(m){return m.id===id;})||missions[0];
    var variant=variations[base.id], use=variant&&variant.id===scenario;
    var m=Object.assign({scenario:'standard',scenarioLabel:'Foundation challenge',targetMl:450,servings:6,requestedCut:'even',elapsedMinutes:45,ambientF:72},base);
    if(use){Object.assign(m,variant);m.id=base.id;m.scenario=variant.id;m.scenarioLabel=variant.label;}
    m.actions=m.actions.map(function(a){return a.slice();});m.answers=m.answers.slice();return m;
  }
  function start(id, mode, scenario) { var m=mission(id,scenario); return { version: 1, id:m.id, scenario:m.scenario, mode:mode==='demonstrate'?mode:'practice', values:Object.assign({},m.initialValues||{}),log:[],hints:0,hintLog:[],done:false,answer:null,plan:'',reflection:'',submitted:false,feedback:'Choose an action to begin.' }; }
  function criteria(s) {
    var v=s.values,m=mission(s.id,s.scenario), pairs;
    if(s.id==='prep')pairs=[['Hands washed',v.washed],['Equipment ready',v.clean],['Vegetables prepared',s.done]];
    if(s.id==='knife')pairs=[['Board secured',v.secure],['Fingers protected',v.claw],['Requested cut made',v.cut===m.requestedCut]];
    if(s.id==='heat')pairs=[['Dry surface',v.dry],['Space in the pan',v.spread],['Golden browning',v.brown>=3&&v.brown<=4],['Plated with heat off',s.done]];
    if(s.id==='probe')pairs=[['Probe positioned',v.probe==='thick'],['Fresh safe internal reading',v.probe==='thick'&&v.reading>=165],['Serving decision verified',s.done]];
    if(s.id==='measure')pairs=[['Stock measured',v.ml>0],['Scaled quantity checked',s.done]];
    if(s.id==='chill')pairs=m.discardGoal?[['Unsafe leftovers discarded',s.done]]:[['Shallow containers',v.shallow],['Food and date labeled',v.label],['Refrigerated in time',v.chilled&&!v.late]];
    return pairs.map(function(p){return {label:p[0],met:!!p[1]};});
  }
  function summarize(list) {
    return missions.map(function(m){var entries=list.filter(function(s){return s.id===m.id&&s.submitted;});var independent=entries.filter(function(s){return evidence(s).status==='Completed independently';});return {id:m.id,recorded:entries.length>0,independent:independent.length>0,scenarios:Array.from(new Set(independent.map(function(s){return s.scenario||'standard';}))),status:independent.length?'Demonstrated independently':entries.some(function(s){return evidence(s).reasoningCorrect;})?'Practice or support recorded':entries.length?'Revisit reasoning':'Ready to explore'};});
  }
  function act(state, action) {
    if (state.submitted || state.done || state.log.length >= 500) return state;
    var m = mission(state.id, state.scenario);
    if (!m.actions.some(function (a) { return a[0] === action; })) return state;
    var s = Object.assign({}, state, { values: Object.assign({}, state.values), log: state.log.slice() });
    var v = s.values, ok = true, msg = '';
    function reject(message) { ok = false; msg = message; }
    if (s.id === 'prep') {
      if (action === 'wash') { v.washed = true; msg = 'Soap-and-water handwashing modeled for at least 20 seconds.'; }
      if (action === 'rinse') { v.washed = false; reject('Water alone is not the full handwashing routine. Use soap and scrub for at least 20 seconds.'); }
      if (action === 'board') { if(m.scenario==='shared-board'){v.cleaned=true;v.clean=false;v.washed=false;msg='Equipment washed and rinsed. Sanitize according to the product label, then wash hands before food preparation.';}else{v.clean=true;msg='A clean board and clean utensils are ready for the vegetables.';} }
      if(action==='sanitize'){if(v.cleaned){v.clean=true;v.washed=false;msg='Food-contact sanitizing instructions completed, including any required rinse or drying. Wash hands before food preparation.';}else reject('Wash and rinse the equipment before sanitizing.');}
      if (action === 'reuse') { v.clean = false; v.cleaned=false; reject(m.scenario==='shared-board'?'Raw juices can transfer to the vegetables. Wash, rinse, and sanitize the equipment before preparing food.':'Raw juices can transfer to the vegetables. Switch to clean equipment.'); }
      if (action === 'prepare') { if (v.washed && v.clean) s.done = true; else reject('Prepare only after washing hands and choosing clean equipment.'); }
    }
    if (s.id === 'knife') {
      if (action === 'secure') { v.secure = true; msg = 'The board is stable on its nonslip mat.'; }
      if (action === 'claw') { v.claw = true; msg = 'Fingertips are tucked back from the cutting path.'; }
      if (action === 'flat') { v.claw = false; reject('Extended fingers are in the cutting path. Tuck them back in a claw grip.'); }
      if (action === 'rough') { v.cut = 'uneven'; reject('Mixed sizes cook at different rates. Try uniform '+(m.requestedCut==='large'?'large':'small')+' dice for this recipe.'); }
      if (action === 'dice' || action === 'largeDice') { if(v.secure&&v.claw){v.cut=action==='largeDice'?'large':'even';if(v.cut===m.requestedCut)s.done=true;else reject('This cut is uniform, but it does not match the size requested in this recipe. Choose the requested cut.');}else reject('Secure the board and protect your fingers before cutting.'); }
    }
    if (s.id === 'heat') {
      if (action === 'dry') { v.dry = true; msg = 'Surface moisture removed.'; }
      if (action === 'spread') { v.spread = true; msg = 'There is space between the mushrooms.'; }
      if (action === 'crowd') { v.spread = false; msg = 'The pan is crowded. Observe what happens when you advance.'; }
      if (['low', 'medium', 'high'].indexOf(action) !== -1) { v.heat = action; msg = 'Heat set to ' + action + '.'; }
      if (action === 'advance') {
        v.seconds = (v.seconds || 0) + 30;
        if(v.brown>4)reject('The mushrooms remain burned. Start a fresh attempt; changing the heat cannot reverse burning.');
        else if (!v.heat) reject('The burner is off. Choose a heat setting.');
        else if (!v.dry || !v.spread || v.heat === 'low') msg = 'Moisture or low heat is limiting browning. The mushrooms remain pale.';
        else { v.brown = (v.brown || 0) + (v.heat === 'high' ? 2 : 1); if(v.brown>4)reject('The mushrooms have burned. Retry the station to adjust the heat.');else msg=v.brown>=3?'Golden browning. Decide whether to keep cooking or plate.':'Browning is developing.'; }
      }
      if (action === 'plate') { v.heat = null; if (v.brown >= 3 && v.brown <= 4 && v.dry && v.spread) s.done = true; else reject(v.brown > 4 ? 'Burning cannot be reversed. Retry with lower heat or a shorter cook.' : 'The pan is off, but the mushrooms are not yet evenly golden. Adjust and continue.'); }
    }
    if (s.id === 'probe') {
      if (action === 'thick' || action === 'surface') { v.probe = action; v.reading = null; msg = action === 'thick' ? 'Probe positioned in the thickest part, away from bone.' : 'The surface is hotter than the center. This will not verify the internal temperature.'; }
      if (action === 'cook') { v.temp = Math.min(195, (v.temp || 150) + 5); v.reading = null; msg = 'The internal temperature changed. Take a fresh reading.'; }
      if (action === 'read') { if (!v.probe) reject('Position the thermometer before reading it.'); else { v.reading = v.probe === 'thick' ? (v.temp || 150) : 180; msg = 'Thermometer: ' + v.reading + '°F. ' + (v.probe === 'surface' ? 'Surface reading only; reposition to check the center.' : 'Internal reading recorded.'); } }
      if (action === 'serve') { if (v.probe === 'thick' && v.reading >= 165) s.done = true; else reject('Do not serve yet. Verify at least 165°F (74°C) with a fresh reading in the thickest part, away from bone.'); }
    }
    if (s.id === 'measure') {
      if (action === 'add150' || action === 'add50') { v.ml = Math.min(1000, (v.ml || 0) + (action === 'add150' ? 150 : 50)); msg = 'Jug contains ' + v.ml + ' mL.'; }
      if (action === 'remove50' || action === 'empty') { v.ml = action === 'empty' ? 0 : Math.max(0, (v.ml || 0) - 50); msg = 'Jug contains ' + v.ml + ' mL.'; }
      if (action === 'check') { if (v.ml === m.targetMl) s.done = true; else reject('You measured ' + (v.ml || 0) + ' mL. Recalculate the serving ratio and adjust the amount.'); }
    }
    if (s.id === 'chill') {
      if (action === 'shallow') { v.shallow = true; msg = 'Food divided into shallow containers for faster cooling.'; }
      if (action === 'deep') { v.shallow = false; reject('A deep pot cools slowly. Divide the leftovers into shallow containers.'); }
      if (action === 'label') { v.label = true; msg = 'Food and preparation date labeled.'; }
      if (action === 'wait') { v.extraMinutes=(v.extraMinutes||0)+120;v.late=true;reject('The total is now '+(m.elapsedMinutes+v.extraMinutes)+' minutes. The safe holding time has been exceeded; discard the food.'); }
      if (action === 'chill') { if (v.late) reject('Too much time has passed. Discard these leftovers and retry with prompt refrigeration.'); else if (v.shallow && v.label) { v.chilled = true; s.done = true; } else reject('Divide into shallow containers and label before storing.'); }
      if (action === 'discard') { if (v.late) { v.discarded=true;if(m.discardGoal)s.done=true;msg='Correct recovery: unsafe leftovers discarded. Retry to practice timely storage.'; } else reject('These leftovers can still be stored safely. Practice the storage steps.'); }
    }
    s.feedback = s.done ? m.success : msg;
    s.log.push({ action: action, accepted: ok, observation: s.feedback, values: Object.assign({}, v) });
    return s;
  }
  function submit(state) {
    if (!state.done || !Number.isInteger(state.answer) || state.answer < 0 || state.answer > 2 || state.submitted) return state;
    return Object.assign({}, state, { submitted: true, feedback: 'Evidence recorded. Review the action evidence and your explanation below.' });
  }
  function evidence(s) {
    var m = mission(s.id,s.scenario), errors = s.log.filter(function (e) { return !e.accepted; }).length;
    return { mission:m.id,scenario:m.scenario,scenarioLabel:m.scenarioLabel,title:m.title,plan:s.plan||'',criteria:criteria(s),mode:s.mode, completed: s.done, submitted: s.submitted, actionCount: s.log.length, corrections: errors, hints: s.hints, hintLog:(s.hintLog||[]).map(function(h){return Object.assign({},h);}), reasoningCorrect: s.answer === m.correct, answer: s.answer === null ? null : m.answers[s.answer], reflection: s.reflection, status: !s.submitted ? 'In progress' : !s.done || s.answer !== m.correct ? 'Revisit reasoning' : s.mode === 'practice' ? 'Practice completed with coaching' : errors || s.hints ? 'Completed with support' : 'Completed independently', actions: s.log };
  }
  // Reconstruct a visual review from the original scenario without mutating evidence.
  function replay(record, step) {
    var total=record.log.length, index=Number.isInteger(step)?Math.max(0,Math.min(step,total)):0;
    var snapshot=start(record.id,record.mode,record.scenario);
    for(var i=0;i<index;i++)snapshot=act(snapshot,record.log[i].action);
    return {state:snapshot,step:index,total:total,entry:index?snapshot.log[snapshot.log.length-1]:null};
  }
  // Guidance follows observable conditions, rather than a fixed action number.
  function coaching(s) {
    var m=mission(s.id,s.scenario),v=s.values;
    function guide(prompt,action,why){var choice=m.actions.find(function(a){return a[0]===action;});return {prompt:prompt,action:action,next:choice?choice[1]:action,why:why,restart:false};}
    function restart(prompt,why){return {prompt:prompt,action:null,next:'Start a fresh attempt.',why:why,restart:true};}
    if(s.submitted)return guide('What observation would you use in another kitchen?','Review your recorded explanation.',m.why);
    if(s.done)return guide('Which observation supports your decision?','Explain the decision, then record your evidence.','Use the action notebook to connect what you did with what changed.');
    if(s.id==='prep'){
      if(m.scenario==='shared-board'&&!v.cleaned)return guide('What must happen before equipment can be sanitized?','board','Wash and rinse the board and utensils before following the sanitizer instructions.');
      if(m.scenario==='shared-board'&&!v.clean)return guide('The equipment is washed. What is still needed before food preparation?','sanitize','Complete the food-contact product instructions, including any required rinse or drying.');
      if(!v.washed)return guide('Are your hands ready to handle the vegetables?','wash','Soap-and-water handwashing is needed before preparing food.');
      if(!v.clean)return guide('Could raw juices reach the vegetables through this equipment?','board','Use a clean board and clean utensils for the vegetables.');
      return guide('Are both hands and equipment ready?','prepare','Your hands are washed and the equipment is ready.');
    }
    if(s.id==='knife'){
      if(!v.secure)return guide('What could move while you cut?','secure','Stabilize the board before beginning the cut.');
      if(!v.claw)return guide('Where are your fingertips relative to the blade?','claw','Tuck fingertips back from the cutting path.');
      return guide('What size does this recipe request?',m.requestedCut==='large'?'largeDice':'dice','Use uniform '+(m.requestedCut==='large'?'large pieces for the stew':'small pieces for the quick cook')+'.');
    }
    if(s.id==='heat'){
      if(v.brown>4)return restart('Can changing the burner reverse burned food?','This pan is already burned. Its earlier actions stay in the evidence when you retry.');
      if(!v.dry)return guide('What is keeping the surface wet?','dry','A drier surface supports browning.');
      if(!v.spread)return guide('Is there room between the mushrooms?','spread','Space helps released moisture escape.');
      if(v.brown>=3)return guide('The mushrooms are golden. What happens if you keep heating?','plate','Stop the cook before the browning turns to burning.');
      if(v.heat!=='medium')return guide('How could you control the remaining browning?','medium','Use medium heat in this simplified model, then inspect after each step.');
      return guide('What change would tell you it is time to stop?','advance','Advance once, then look at the new browning before deciding again.');
    }
    if(s.id==='probe'){
      if(v.probe!=='thick')return guide('Does the thermometer measure the surface or the inside?','thick','Place it in the thickest part, away from bone.');
      if(v.reading==null)return guide('Do you have a fresh internal reading?','read','Take a reading before deciding whether more cooking is needed.');
      if(v.reading<165)return guide('Does the reading meet the poultry minimum?','cook','The reading is below 165°F (74°C). Cook further, then take a fresh internal reading.');
      return guide('What does the correctly placed, fresh reading tell you?','serve','The internal reading meets the poultry minimum used in this activity.');
    }
    if(s.id==='measure'){
      var ml=v.ml||0,difference=m.targetMl-ml;
      if(!difference)return guide('You have the scaled amount. How will you verify the measurement?','check','Read the measuring jug at eye level.');
      return guide('What is '+m.servings+' servings divided by the original 2 servings?',difference<0?'remove50':difference>=150?'add150':'add50','The factor is '+(m.servings/2)+', so the target is '+m.targetMl+' mL. You have '+ml+' mL; '+(difference<0?'remove '+(-difference):'add '+difference)+' mL in total, checking as you go.');
    }
    if(v.late){
      if(v.discarded)return restart('The unsafe leftovers are discarded. How could you avoid this next time?','Begin again to practice prompt storage. Your earlier decisions remain recorded.');
      return guide('Has the food exceeded the time limit in these conditions?','discard','Refrigeration does not undo excessive time without temperature control.');
    }
    if(!v.shallow)return guide('How could you help the leftovers cool more quickly?','shallow','Divide food into shallow containers before refrigerating.');
    if(!v.label)return guide('How will someone know what this food is and when it was prepared?','label','Label the food and preparation date.');
    return guide('Should the leftovers wait on the counter?','chill','Refrigerate promptly at the temperature specified in the task.');
  }
  function requestHint(s,level){
    if(s.submitted||s.hints>=500)return s;
    level=level===2?2:1;var log=s.hintLog||[];
    if(log.some(function(h){return h.afterAction===s.log.length&&h.level===level;}))return s;
    var c=coaching(s),entry={afterAction:s.log.length,level:level,text:level===1?c.prompt:c.next+' '+c.why};
    return Object.assign({},s,{hints:s.hints+1,hintLog:log.concat([entry])});
  }
  function restoreHints(s,raw){
    var hints=Number.isInteger(raw.hints)&&raw.hints>0?Math.min(raw.hints,500):0,log=[],seen={};
    (Array.isArray(raw.hintLog)?raw.hintLog.slice(0,500):[]).forEach(function(h){
      if(!h||!Number.isInteger(h.afterAction)||h.afterAction<0||h.afterAction>s.log.length||(h.level!==1&&h.level!==2))return;
      var key=h.afterAction+'|'+h.level;if(seen[key])return;seen[key]=true;
      var c=coaching(replay(s,h.afterAction).state);log.push({afterAction:h.afterAction,level:h.level,text:h.level===1?c.prompt:c.next+' '+c.why});
    });
    return Object.assign({},s,{hints:Math.max(hints,log.length),hintLog:log});
  }
  var api = { missions: missions, mission:mission,scenarios:scenarioList,start:start,act:act,submit:submit,evidence:evidence,criteria:criteria,summarize:summarize,replay:replay,coaching:coaching,requestHint:requestHint,restoreHints:restoreHints };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KitchenStudio = api;
})(typeof window !== 'undefined' ? window : globalThis);
