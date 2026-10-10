/* Describes an explicitly reported result; never judges or commits a gesture. */
(function(root){
  'use strict';
  var labels={completed:'Action recorded',unfinished:'Try the movement again',stopped:'Movement stopped',kept:'Work kept'};
  var lessons={
    mince:'A knife pass includes both the downward cut and lifting back.',
    sample:'A fork texture check is an observation to use when deciding what to do next.',
    stir:'Mixing redistributes liquid through the food; it does not add water or undo scorching.',
    'sauce-check':'Read the closing track and spoon coating before deciding whether to adjust the sauce.',
    turn:'Turning reveals the other face while preserving each surface’s cooking history.',
    probe:'A water temperature observation does not replace a fork texture check.',
    wash:'The full handwashing sequence matters; active practice time is separate from cooking time.',
    rinse:'Turn the produce through every representative surface, then drain and return it.',
    lid:'Lid placement changes only after a complete lift, carry, lower and release.',
    'timer-wind':'A reminder means look again; it does not mean the food is ready.',
    burner:'Cookware keeps stored heat after its burner is switched off.',
    ladle:'Save cooking water before draining; water removed from the pot cannot be recovered.',
    serve:'A level spoon carries food; tipping and releasing transfers one spoonful.',
    handoff:'A level carry transfers nothing; tipping and releasing moves the ingredients.',
    'fresh-water':'A level jug carries water; tipping and releasing fills the empty pot.',
    'dry-pasta':'Record the measured portion before carrying it into the boiling pot.',
    pour:'Level the jug to stop the flow; water already poured remains in the pan.',
    drain:'Level the pot to stop draining; water already removed cannot be recovered.',
    weigh:'Compare the measured portion with the recipe target before recording it.',
    handful:'Returning a handful adjusts the portion on the scale.',
    dry:'Blot wet areas and wring a full cloth so it can absorb more moisture.',
    'pot-stir':'Sweep through the clumps; taps and holding still do not separate strands.',
    crush:'Softened tomato can release juice; pressing cannot replace cooking time.',
    cut:'Compare the resulting widths; even pieces cook more evenly.',
    'knife-rest':'Finishing a batch follows cutting, then returning the knife to its marked rest.',
    'pan-choice':'Choose cookware before adding ingredients; pan size changes how food fits.',
    pan:'The pan keeps stored heat after leaving the burner.',
    piece:'Turning reveals the other surface; cooked color stays with each face.',
    rack:'Carry the utensil to the station where you will use it.',
    inspect:'Compare the observed surface again after a cooking change.',
    'oil-bottle':'Measure toward the recipe target; an overfilled cup can be returned to remeasure.',
    'oil-cup':'Transfer the recipe measure, or return unused oil to the bottle to remeasure.'
  };
  function text(value){return typeof value==='string'?value.trim():'';}
  function phaseHint(tool,phase){
    var hints={
      mince:{down:'Pull straight down through the clove before lifting back.',up:'Press straight down through the clove, then lift back to the starting point before releasing.'},
      sample:{carry:'Carry the fork to the saucer before pressing.',down:'Press straight down through the sample before lifting back.',up:'Carry to the saucer, press straight down, then lift back to the starting point before releasing.'},
      stir:{sweep:'Gather a full circle around the dotted ring before releasing.',fold:'Keep holding after the circle and draw inward to the center before releasing.'},
      turn:{slide:'Slide right to tuck the spatula underneath.',lift:'Lift upward before sweeping left to turn.',turn:'Sweep left to turn the lifted slice before lowering.',lower:'Lower the turned slice before releasing.'},
      probe:{carry:'Carry the thermometer over the water before lowering.',down:'Lower the probe straight down before lifting back.',up:'Carry over the water, lower the probe straight down, then lift straight back up before releasing.'},
      lid:{lift:'Lift the lid straight up before carrying it.',carry:'Carry the level lid over the pot or its marked rest before lowering.',lower:'Lower the lid straight down onto its support before releasing.'},
      rinse:{carry:'Carry the level basket over the faucet before lowering.',lower:'Lower the basket straight down under running water.',rinse:'Circle steadily through all eight representative surfaces before lifting.',lift:'Lift straight up to drain before returning to the board.',return:'Carry the drained basket back to the board before tipping.',tip:'Tip straight down onto the board before releasing.'},
      wash:{wet:'Carry under running water, lower to wet, then lift back.',soap:'Press at the soap pump, then lift back before rubbing.',scrub:'Rub back and forth through all five poses; holding still pauses active practice.',rinse:'Return under running water, lower to rinse, then lift back.',dry:'Press at the clean towel, then lift back before releasing.'},
      ladle:{reach:'Carry the ladle over the pot before dipping.',dip:'Dip straight down before lifting the filled ladle.',lift:'Lift back before carrying the level ladle to the jug.',carry:'Carry the level ladle to the jug before tipping.',tip:'Tip straight down over the jug before releasing.'},
      serve:{scoop:'Scoop straight down before lifting the spoonful.',lift:'Lift back before carrying the level spoon.',carry:'Carry the level spoon to the destination before tipping.',tip:'Tip straight down over the destination before releasing.'},
      handoff:{carry:'Carry level over the highlighted pan before tipping.',level:'Tip straight down; a level carry transfers nothing.',tip:'Continue tipping straight down before releasing.'},
      'fresh-water':{carry:'Carry the level jug over the empty pot before tipping.',level:'Tip straight down over the pot; a level jug adds no water.',tip:'Continue tipping straight down before releasing.'},
      'dry-pasta':{carry:'Carry the level tray over the boiling pot before tipping.',level:'Tip straight down; a level tray transfers no pasta.',tip:'Continue tipping straight down before releasing.'},
      pour:{carry:'Carry the level jug over the sauce pan before tilting.',level:'Pull straight down to tilt, then lift back to stop the flow.',pour:'Lift back to level the jug when you have added the amount you want.'},
      drain:{carry:'Carry the pot over the colander before tilting.',tilt:'Pull straight down to tilt over the colander.',drain:'Lift back to level the pot when you want to stop draining.'},
      weigh:{carry:'Carry the packet over the scale before tilting.',tilt:'Pull down to tilt the packet; lift back to stop the flow.',pour:'Lift back to stop the flow at the portion you want.'},
      dry:{carry:'Move the cloth onto a wet area of the produce.',blot:'Hold contact on a wet area to absorb moisture.',full:'Carry the full cloth to the bowl and hold to wring it.',wring:'Hold over the bowl to wring the cloth before blotting again.'},
      pan:{lift:'Lift straight up by the handle before carrying the pan.',carry:'Carry the level pan over the highlighted burner or trivet before lowering.',lower:'Lower the pan straight down onto its support before releasing.'},
      'pan-choice':{carry:'Carry a different pan into the marked sauce-pan station before releasing.'},
      'knife-rest':{carry:'Carry the knife handle to its marked rest before releasing.'},
      handful:{carry:'Carry the handful over the pasta packet before releasing.'},
      'timer-wind':{wind:'Wind steadily clockwise near the rim before releasing on the dial.'},
      burner:{turn:'Turn steadily around the dial rim before releasing.'},
      'sauce-check':{draw:'Draw steadily right across the sauce before releasing.'},
      cut:{cut:'Draw a straight, complete stroke toward the front of the board before releasing.'},
      'pot-stir':{sweep:'Sweep through the visible clumps; holding still does not separate strands.'},
      piece:{outside:'Bring the piece inside the pan boundary before releasing.',turn:'Tap to turn a piece, or carry it inside the pan boundary.'}
    };
    return Object.prototype.hasOwnProperty.call(hints,tool)&&Object.prototype.hasOwnProperty.call(hints[tool],phase)?hints[tool][phase]:null;
  }
  function retryHint(tool){
    if(['mince','sample','probe','crush'].includes(tool))return 'Use a straight down-and-up path; avoid sideways motion or reversing before the downward step is complete.';
    if(tool==='cut')return 'Keep the knife stroke straight through the sample; sideways motion interrupts the cut.';
    if(tool==='stir')return 'Gather a steady circle inside the pan; when a fold is required, keep holding and draw inward.';
    if(tool==='turn')return 'Follow one direction at each step: slide, lift, turn, then lower.';
    if(tool==='sauce-check')return 'Draw one steady path from left to right inside the pan.';
    if(tool==='timer-wind'||tool==='burner')return 'Follow a steady arc near the dial rim; release on the dial.';
    if(tool==='lid')return 'Lift and lower straight vertically; carry the lid level between its supports.';
    if(['handoff','fresh-water','dry-pasta','serve','ladle'].includes(tool))return 'Carry level, then tip straight down over the destination; avoid sideways motion during the tip.';
    if(tool==='rinse')return 'Carry level and lower straight down; turn steadily through the surfaces before returning to the board.';
    if(tool==='wash')return 'Start again with wetting and soap; keep rubbing in the basin, then finish rinsing and drying.';
    if(tool==='pour')return 'Return to a straight tilt path over the pan, then level the jug to stop.';
    return 'Follow a steady movement inside the highlighted working area before releasing.';
  }
  function releaseHint(tool){
    if(tool==='timer-wind'||tool==='burner')return 'Complete the turn again and release on the dial; a preview alone applies nothing.';
    if(['handoff','fresh-water','dry-pasta','serve','ladle','lid','pan','pan-choice','knife-rest','handful','rack'].includes(tool))return 'Repeat the complete movement and release over the marked destination; the destination is checked when you release.';
    if(tool==='wash')return 'Repeat the complete wet, soap, scrub, rinse and dry practice, then release; previewed practice is not recorded.';
    return 'Repeat the complete movement and release in its working area; reaching the release preview alone records nothing.';
  }
  function finish(guide,options){
    guide=guide&&typeof guide==='object'?guide:{};options=options&&typeof options==='object'?options:{};
    var tool=text(guide.tool)||'unknown',phase=text(guide.phase)||'unknown',outcome=Object.prototype.hasOwnProperty.call(labels,options.outcome)?options.outcome:'unfinished';
    var instruction=text(options.evidence)||'No action result was provided.',detail;
    if(outcome==='completed'||outcome==='kept')detail=Object.prototype.hasOwnProperty.call(lessons,tool)?lessons[tool]:'Use the result of this movement to decide your next step.';
    else{
      var hint=guide.invalid||phase==='retry'?retryHint(tool):phase==='release'||phase==='done'?releaseHint(tool):phaseHint(tool,phase);
      if(!hint){var original=text(guide.instruction);hint=original&&!/^Release\b/i.test(original)?original:'Start again on the tool’s working object and complete the movement before releasing.';}
      detail='Next attempt: '+hint;
    }
    var reason=text(options.reason);if(reason)detail+=' '+reason;
    return {tool:tool,title:text(guide.title)||'Kitchen movement',label:labels[outcome],outcome:outcome,instruction:instruction,detail:detail,phase:phase};
  }
  var api={finish:finish};root.KitchenMotionFeedback=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
