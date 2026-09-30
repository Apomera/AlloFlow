/* Observes a gesture; never advances time or commits cooking actions. */
(function(root){
  'use strict';
  function fraction(n){return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;}
  function near(a,b,r){return !!a&&!!b&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.hypot(a.x-b.x,a.z-b.z)<r;}
  function describe(s,g,c){
    if(!g)return null;c=c||{};var R=root.KitchenRecipes,p=g.current,pan=R.panPosition(s),pot={x:-1.1,z:-.45},jug={x:-1.2,z:1.06},a={title:'Working in the kitchen',phase:'move',instruction:'Move deliberately, then release.',detail:'Cooking time is paused while you handle a tool.',progress:null,progressLabel:'Gesture progress',target:null,over:false,invalid:false};
    function set(title,phase,instruction,detail){a.title=title;a.phase=phase;a.instruction=instruction;a.detail=detail;}
    function destination(hit,over){a.target=hit;a.over=!!over;}
    if(g.kind==='sample'){var t=g.trace,done=root.KitchenSampling.complete(t);a.invalid=t.invalid;set('Check a fork sample',t.invalid?'retry':done?'release':t.phase,t.invalid?'Release to cancel; keep the fork moving straight.':done?'Release to reveal the sample texture.':t.phase==='carry'?'Carry the fork to the small saucer.':t.phase==='up'?'Lift back to your starting point.':'Pull straight down through the sample.','The core and resistance are revealed after the completed check. An unfinished movement records no sample.');a.progress=t.invalid?0:done?1:t.phase==='carry'?0:t.phase==='up'?.65+.35*(1-t.depth):.25+.4*t.depth;a.progressLabel='Carry, press and lift';destination({sample:true},t.phase!=='carry'&&!t.invalid);
    }else if(g.kind==='burner'){var t=g.trace,levels=root.KitchenBurnerDials.levels,label=(g.station==='pot'?'Pot':'Pan')+' burner';a.invalid=t.invalid;set(label,t.invalid?'retry':root.KitchenBurnerDials.value(t)!==null?'release':'turn',t.invalid?'Release to cancel; turn steadily near the rim.':'Preview: '+levels[t.preview]+'. Release to apply.', 'Clockwise raises heat · counterclockwise lowers heat. Cookware temperature does not change until time advances.');destination({burner:g.station},!t.invalid);
    }else if(g.kind==='weigh'){
      var amount=c.amount||0,goal=R.ingredients(s).pasta,flow=g.over&&g.tilt>18;
      set('Weigh pasta',!g.over?'carry':flow?'pour':'tilt',!g.over?'Carry the packet over the scale.':flow?'Raise the pointer to stop the flow.':'Pull down to tilt; lift back up to stop.',amount+' g on the tray · recipe target '+goal+' g');
      a.progress=fraction(amount/goal);a.progressLabel='Portion compared with recipe target';destination({scale:true},g.over);
    }else if(g.kind==='handful'){
      var over=g.moved&&root.KitchenWeighing.scene.overPacket(c.releasePoint||p);set('Return a handful',over?'release':'carry',over?'Release to return 10 g.':'Carry the handful back to the pasta packet.',(c.amount||0)+' g on the tray · the portion changes when you release');destination({item:'pasta'},over);
    }else if(g.kind==='mince'){
      var t=g.trace,done=root.KitchenGarlic.complete(t);a.invalid=t.invalid;a.progress=t.invalid?0:done?1:t.phase==='up'?.5+.5*(1-t.depth):t.depth*.5;
      set('Mince clove '+(g.index+1),t.invalid?'retry':done?'release':t.phase,t.invalid?'Release and try a straight knife pass.':done?'Release to record this pass.':t.phase==='up'?'Lift back to your starting point.':'Pull straight down through the clove.',t.invalid?'Sideways motion or an early reversal interrupted this pass.':R.garlicPreparation(s).summary);a.progressLabel='Down and up knife pass';
    }else if(g.kind==='crush'){
      var t=g.press,piece=R.tomatoHandling(s).pieces[g.index],done=root.KitchenCrushing.complete(t);a.invalid=t.invalid;a.progress=t.invalid?0:t.progress;
      set('Press piece '+(g.index+1),t.invalid?'retry':done?'release':'press',t.invalid?'Release and try a straight downward press.':done?'Release to observe the result.':'Pull straight down with the masher.',piece&&piece.ready?'This softened piece can yield and release juice.':'This firm piece resists. Pressing cannot replace cooking time.');a.progressLabel='Downward press';
    }else if(g.kind==='cut'){
      var t=g.stroke;a.invalid=!t.valid;a.progress=t.valid?fraction((t.y-20)/88):0;set('Cut the produce',!t.valid?'retry':t.complete?'release':'cut',!t.valid?'Release and try a straight stroke.':t.complete?'Release to make this cut.':'Draw toward the front edge of the board.',!t.valid?'The stroke moved sideways; no cut will be recorded.':'Cut position: '+t.position+' mm on piece '+(t.index+1));a.progressLabel='Knife stroke';
    }else if(g.kind==='stir'){
      a.progress=fraction(Math.abs(g.trace.travel)/(2*Math.PI-.035));set('Stir and fold','sweep','Trace a full circle through the pan.',Math.round(a.progress*100)+'% of a sweep · stay between the center and rim');a.progressLabel='Circular sweep';destination({pan:true},true);
    }else if(g.kind==='ladle'){
      var over=g.dipped&&near(p,jug,.3);set('Save cooking water',over?'release':g.dipped?'carry':'dip',over?'Release over the jug to save the water.':g.dipped?'Carry the filled ladle to the jug.':'Dip the ladle into the pasta pot.',Math.round(R.waterHandling(s).scoop)+' mL can be carried · '+Math.round(s.pot.reserve)+' mL already saved');a.progress=over?1:g.dipped?.5:0;a.progressLabel='Dip and carry';destination(g.dipped?{item:'jug'}:{pot:true},over);
    }else if(g.kind==='drain'){
      var flowing=g.over&&g.tilt>=20;set('Drain the pasta',!g.over?'carry':flowing?'drain':'tilt',!g.over?'Carry the pot over the colander.':flowing?'Lift the pointer to level the pot.':'Pull straight down to tilt the pot.',Math.round(g.drained||0)+' mL drained · '+Math.round(s.pot.water)+' mL left'+(s.pot.heat?' · pot burner still on':''));a.progress=fraction((g.drained||0)/Math.max(1,(g.drained||0)+s.pot.water));a.progressLabel='Water drained during this lift';destination({item:'cooked'},g.over);
    }else if(g.kind==='pour'){
      var flowing=g.tilt>=20;set('Pour saved water',flowing?'pour':'carry',flowing?'Move away or release to stop pouring.':'Carry the jug over the sauce pan.',(g.poured||0)+' mL added · '+s.pot.reserve+' mL left in the jug');a.progress=fraction((g.poured||0)/Math.max(1,(g.poured||0)+s.pot.reserve));a.progressLabel='Saved water poured during this carry';destination({pan:true},flowing);
    }else if(g.kind==='dry'){
      var dry=R.drying(s),wring=g.target==='wring',full=dry.cloth>=dry.capacity,wet=Number.isInteger(g.target)&&dry.areas[g.target]>0,contact=wring?dry.cloth>0:wet&&!full;
      set('Blot and wring',wring&&contact?'wring':full?'full':wet?'blot':'carry',wring&&contact?'Hold over the bowl to wring the cloth.':full?'Carry the full cloth to the bowl.':wet?'Hold on this wet area to absorb water.':'Move onto a wet area of the produce.',dry.remaining+' of 16 moisture units on the produce · cloth '+dry.cloth+'/'+dry.capacity);a.progress=contact&&g.step?fraction(g.step.elapsed/(wring?900:450)):0;a.progressLabel=wring?'Wringing contact time':'Blotting contact time';destination(full||wring?{bowl:true}:{board:true},contact);
    }else if(g.kind==='pot-stir'){
      var strands=R.pastaSurface(s);set('Separate pasta','sweep','Sweep through the clumps inside the pot.',strands.separated+' of '+strands.groups.length+' groups separated');a.progress=fraction(strands.separated/Math.max(1,strands.groups.length));a.progressLabel='Pasta groups separated';destination({pot:true},true);
    }else if(g.kind==='move'){
      var vessel=g.item==='pasta'?'pot':'pan',over=c.destination===vessel;set('Carry '+({oil:'olive oil',pasta:'pasta',produce:'produce',garlic:'garlic',cooked:'drained pasta'}[g.item]||'ingredient'),over?'release':'carry',over?'Release over the '+(vessel==='pot'?'pasta pot.':'sauce pan.'):'Carry to the highlighted '+vessel+'.','The kitchen checks preparation and cooking conditions when you release.');destination(vessel==='pot'?{pot:true}:{pan:true},over);
    }else if(g.kind==='pan'){
      var site=near(g.panPoint,R.panPosition(s,'burner'),.55)?'burner':near(g.panPoint,R.panPosition(s,'trivet'),.55)?'trivet':null,aim=site|| (g.origin.site==='trivet'?'burner':'trivet'),over=g.moved&&!!site;set('Move the pan',over?'release':'carry',over?'Release to place on the '+aim+'.':'Carry the pan onto the trivet or burner.','The pan keeps its stored heat after leaving the burner.');destination({site:aim},over);
    }else if(g.kind==='serve'){
      var portions=R.serving(s),positions=c.plates||[],index=-1;if(g.from==='pan'&&positions.length){index=0;for(var i=0;i<positions.length;i++)if(near(p,positions[i],.36)){index=i;break;}else if(portions.plates[i]<portions.plates[index])index=i;}
      var over=g.moved&&(g.from==='pan'?index>=0&&near(p,positions[index],.36):near(p,pan,.67));set('Share the dish',over?'release':'carry',over?'Release to transfer one spoonful.':g.from==='pan'?'Carry a spoonful onto a plate.':'Carry the spoonful back to the pan.',portions.plates.map(function(n,i){return 'Plate '+(i+1)+': '+n+'/4';}).join(' · '));destination(g.from==='pan'&&index>=0?{servingPlate:index}:{pan:true},over);
    }else if(g.kind==='piece'){
      var size=s.pan.size==='wide'?1.08:1,inside=p&&Math.hypot(Math.round((p.x-pan.x)/size*100),Math.round((p.z-pan.z)/size*100))<=60;set('Arrange piece '+(g.index+1),!g.moved?'turn':inside?'release':'outside',!g.moved?'Tap to turn, or drag to make room.':inside?'Release to place this piece.':'Bring the piece back inside the pan.','Turning reveals the other side; cooked color stays with each surface.');destination({pan:true},!g.moved||inside);
    }else return null;
    if(a.progress!==null)a.progress=fraction(a.progress);return a;
  }
  var api={describe:describe};root.KitchenGestureGuide=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
