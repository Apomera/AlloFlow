/* Starting-object cues observe the kitchen; finding a tool never performs its gesture. */
(function(root){
  'use strict';
  function dependency(name,file){return root[name]||(typeof require==='function'?require('./'+file):null);}
  var R=dependency('KitchenRecipes','recipe_lab_engine.js');
  var W=dependency('KitchenWorkspace','recipe_lab_workspace.js');
  var Fresh=dependency('KitchenFreshWater','recipe_lab_fresh_water.js');
  var Dry=dependency('KitchenDryPasta','recipe_lab_dry_pasta.js');
  var Handoff=dependency('KitchenIngredientHandoff','recipe_lab_handoff.js');
  var Objects=dependency('KitchenObjectTools','recipe_lab_object_tools.js');
  var Oil=dependency('KitchenOil','recipe_lab_oil.js');
  var Timer=dependency('KitchenTimerWinding','recipe_lab_timer_winding.js');
  var PanChoice=dependency('KitchenPanChoice','recipe_lab_pan_choice.js');
  var Wash=dependency('KitchenHandwashing','recipe_lab_handwashing.js');
  var Rinse=dependency('KitchenRinsing','recipe_lab_rinsing.js');
  var Lid=dependency('KitchenLid','recipe_lab_lid.js');
  var Probe=dependency('KitchenThermometer','recipe_lab_thermometer.js');
  var Cutting=dependency('KitchenCuttingBench','recipe_lab_cutting_bench.js');
  var Turning=dependency('KitchenTurning','recipe_lab_turning.js');
  var Tomato=dependency('KitchenTomatoPress','recipe_lab_tomato_press.js');
  /* Workspace.target delegates these existing prerequisite checks. */
  dependency('KitchenBurnerDials','recipe_lab_burners.js');
  dependency('KitchenFoodLens','recipe_lab_lens.js');
  dependency('KitchenSampling','recipe_lab_sampling.js');
  dependency('KitchenSauceCheck','recipe_lab_sauce_check.js');
  dependency('KitchenJugPour','recipe_lab_jug.js');
  dependency('KitchenLadleCarry','recipe_lab_ladle.js');
  function result(hit,name,instruction,status){return {hit:hit,name:name||status.name||'Kitchen object',instruction:instruction,ready:!!status.ready,detail:status.detail||instruction};}
  function target(s,tool,hit,name,instruction,locked){return result(hit,name,instruction,W.target(s,tool,hit,locked)||W.availability(s,tool,locked));}
  function find(s,tool,options){
    if(!s||!s.prep||!s.pot||!s.pan||!Array.isArray(s.log)||tool==='camera'||!W.catalog.some(function(t){return t[0]===tool;}))return null;
    options=options||{};
    var locked=!!options.locked||!!s.plated||!!s.submitted||s.time>=3600||s.log.length>=1200;
    var scale=options.scale||{amount:s.prep.pasta,recorded:s.prep.pasta},hit,status,index,panPieces,cloves;
    if(tool==='move'){
      /* Completed sources leave the list. Prefer a currently possible transfer,
         then explain the earliest remaining source without changing its readiness. */
      var candidates=[];
      if(!s.pot.water&&!s.pot.pasta&&!s.pot.drained)candidates.push(result({freshWater:true},'Fresh-water jug','Hold the fresh-water jug; carry it level over the empty pot, tip down, then release.',Fresh.pickup(s,{freshWater:true},tool,locked)));
      if(!s.pot.pasta&&!s.pot.drained)candidates.push(result({dryTray:true},'Recorded pasta tray','Hold the grip at the front of the scale tray; carry level over the boiling pot, tip, then release.',Dry.pickup(s,{dryTray:true},tool,scale,locked)));
      if(!s.pan.produce)candidates.push(result({handoff:'produce'},'Prepared produce board','Hold the board grip; carry level over the oiled pan, tip, then release.',Handoff.pickup(s,{handoff:'produce'},tool,locked)));
      if(!s.pan.garlic)candidates.push(result({item:'garlic'},'Garlic bowl','Hold the garlic bowl; carry level over the oiled pan, tip, then release.',Handoff.pickup(s,{item:'garlic'},tool,locked)));
      if(!s.pan.combined)candidates.push(result({item:'cooked'},'Drained pasta colander','Hold the colander; carry level over the prepared sauce pan, tip, then release.',Handoff.pickup(s,{item:'cooked'},tool,locked)));
      return candidates.find(function(c){return c.ready;})||candidates[0]||result({pan:true},'Combined dish','The ingredients are in the pan. Choose Stir & fold or Inspect food to continue.',{ready:false,detail:locked?'Recorded or finished kitchen. Ingredient transfers are locked.':'All ingredient transfers are complete. Gather and fold the combined dish, then inspect it.'});
    }
    if(tool==='weigh'){
      hit=scale.amount>=800?{scale:true}:{item:'pasta'};
      status=hit.scale?W.target(s,tool,hit,locked):Dry.pickup(s,hit,'move',scale,locked);
      if(hit.scale&&scale.locked)status={ready:false,detail:'This recorded portion has already entered the cook. Weigh again in a fresh cook.'};
      else if(hit.scale&&status.ready)status={ready:true,detail:'The packet is empty. Return a small handful from the scale to the packet to adjust your portion.'};
      return result(hit,hit.scale?'Pasta on the scale':'Dry pasta packet',hit.scale?'Hold a small handful on the scale; carry it back to the packet and release.':'Hold the pasta packet; carry it over the scale, pull down to pour, then lift back to stop.',status);
    }
    if(tool==='oil'){
      status=Oil.info(s,options.oil&&options.oil.amount,locked);hit=status.exact||status.amount>status.goal?{oilCup:true}:{item:'oil'};
      return result(hit,hit.oilCup?'Oil measuring cup':'Olive-oil bottle',hit.oilCup?(status.exact?'Hold the filled cup; carry the recipe measure into the sauce pan and release.':'Hold the overfilled cup; carry it back to the bottle and release to remeasure.'):'Hold the oil bottle; carry it over the marked cup, pull down to fill, then lift back to stop.',status);
    }
    if(tool==='timer'){
      var timers=options.checkTimers||{},station=timers.pot&&!timers.pan?'pan':'pot';hit={checkTimer:station};
      return result(hit,Timer.name(station),'Hold near the '+station+' timer rim; wind clockwise, then release to set a check reminder.',Timer.pickup(s,timers,hit,tool,locked));
    }
    if(tool==='cookware'){
      hit={panChoice:s.pan.size==='wide'?'standard':'wide'};
      return result(hit,PanChoice.name(hit.panChoice),'Hold the stored pan handle; carry it into the marked sauce-pan station, then release.',PanChoice.pickup(s,hit,tool,locked));
    }
    if(tool==='wash')return result({washGrip:true},'Hands beside the sink','Hold the paired hands beside the basin; carry under the water to begin.',Wash.pickup(s,locked,{washGrip:true}));
    if(tool==='rinse')return result({rinseBasket:true},'Produce basket handle','Hold the basket handle; carry level to the sink, then lower under the water.',Rinse.pickup(s,{rinseBasket:true},tool,locked));
    if(tool==='lid')return result({lid:true},'Pot lid handle',s.pot.lid==='covered'?'Hold the lid handle; pull straight up, carry level to its rest, then lower and release.':'Hold the lid handle on its rest; lift, carry level over the pot, then lower and release.',Lid.pickup(s,{lid:true},tool,locked));
    if(tool==='probe')return result({probe:true},'Water thermometer','Hold the thermometer on its rest; carry over the pot, dip the tip, lift it back, then release.',Probe.pickup(s,{probe:true},tool,locked));
    if(tool==='cut'){
      if(!s.prep.cut&&!s.pan.produce&&R.cutProfile(s).widths.length>=2)return result({knife:true},'Knife handle','Compare your chosen widths. Hold the knife handle, carry it to the marked rest, then release to finish the batch.',Cutting.pickup(s,{knife:true},tool,locked));
      return target(s,tool,{board:true,start:'cut'},'Produce cutting sample','Start at a ruler mark on the sample; draw straight toward the front of the board and release.',locked);
    }
    if(tool==='mince'){
      cloves=R.garlicPreparation(s).cloves;index=cloves.findIndex(function(c){return c.stage<3;});
      if(index<0)return result({item:'garlic'},'Prepared garlic bowl','The cloves are minced. Carry the bowl to the oiled pan when ready.',{ready:false,detail:locked?'Recorded or finished kitchen. Garlic preparation is locked.':'Every clove is minced. Hold the garlic bowl to carry it into the pan.'});
      return target(s,tool,{garlic:index},'Garlic clove '+(index+1),'Start on clove '+(index+1)+'; press straight down, lift back to your starting point, then release.',locked);
    }
    if(tool==='dry'||tool==='ladle'||tool==='pour'){
      var item=tool==='dry'?'cloth':tool==='ladle'?'ladle':'jug';hit={item:item};status=Objects.resolve(s,hit,tool,locked);
      return result(hit,status.name,tool==='dry'?'Hold the folded cloth; carry it onto a wet area of the produce.':tool==='ladle'?'Hold the ladle; carry it over the pot, dip and lift, then carry level to the jug.':'Hold the saved-water jug; carry level over the sauce pan, then pull down to tilt.',status);
    }
    if(tool==='pot-stir'||tool==='sample'||tool==='drain')return target(s,tool,{pot:true},'Pasta pot',tool==='pot-stir'?'Press inside the pot; sweep the spoon through the visible pasta clumps.':tool==='sample'?'Start inside the pot; carry a fork sample to the small saucer.':'Hold the pot; carry it level over the colander, then pull down to tilt.',locked);
    if(tool==='burner'){
      var burner=s.pot.water&&!s.pot.drained?'pot':'pan';
      if(burner==='pan'&&R.panPosition(s).site==='trivet')burner='pot';
      return target(s,tool,{burner:burner},(burner==='pot'?'Pot':'Pan')+' burner dial','Hold near the dial rim; turn clockwise to raise heat or counterclockwise to lower it, then release.',locked);
    }
    if(tool==='crush'){
      panPieces=R.tomatoHandling(s).pieces;index=panPieces.findIndex(function(p){return p.stage<2;});
      if(index<0||!s.pan.produce){
        status=Tomato.available(s,0,locked);
        if(!locked&&s.pan.produce&&panPieces.length)status={ready:false,detail:'Every tomato piece has released its juice. Use the spoon to fold it through the sauce.'};
        return result({pan:true},'Sauce pan','Add prepared tomatoes before using the masher, or fold the released juice through the sauce.',status);
      }
      return result({piece:index},'Tomato piece '+(index+1),'Start on piece '+(index+1)+'; press down, lift back up, then release to observe its resistance.',Tomato.available(s,index,locked));
    }
    if(tool==='turn'||tool==='arrange'||tool==='inspect'){
      panPieces=R.panSurface(s).pieces;if(!s.pan.produce||!panPieces.length)return result({pan:true},'Sauce pan','Add prepared produce before working with individual pieces.',W.availability(s,tool,locked));
      hit={piece:panPieces[0].index};
      return tool==='turn'?result(hit,'Slice '+(hit.piece+1),'Start on the slice; slide right, lift up, sweep left to turn, lower, then release.',Turning.available(s,hit.piece,locked)):target(s,tool,hit,'Piece '+(hit.piece+1),tool==='inspect'?'Start on this visible piece; slide across the pan to magnify its exposed face.':'Start on this piece; drag inside the pan to spread it, or tap to turn it.',locked);
    }
    if(tool==='serve'){
      var serving=R.serving(s),plate=serving.remaining? -1:serving.plates.findIndex(function(n){return n>0;});hit=plate<0?{pan:true}:{servingPlate:plate};
      return target(s,tool,hit,plate<0?'Finished dish in the pan':'Plate '+(plate+1),plate<0?'Start on food in the pan; scoop down, lift, carry level to a plate, then tip and release.':'Start on food on this plate; scoop, lift, carry level back to the pan, then tip and release.',locked);
    }
    var startHit={pan:true};if(tool==='stir'||tool==='sauce-check')startHit.start=tool;return target(s,tool,startHit,'Sauce pan',tool==='sauce-check'?'Start at the left side of the sauce; draw steadily right, then release to read its trail.':tool==='stir'?'Start on the dotted ring; gather with a full circle, draw inward to fold if pasta is added, then release.':'Hold the pan by its body or handle; carry it onto the trivet or back to its burner, then release.',locked);
  }
  var api={find:find};root.KitchenDiscovery=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
