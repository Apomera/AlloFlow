/* Pure choreography: tool paths and two-bone arms. These calculations never
   advance the cooking clock or create a kitchen action. */
(function(root){
  'use strict';
  var PI=Math.PI,UPPER=108,LOWER=126;
  var neutral={left:{x:320,y:350},right:{x:585,y:350}};
  function finite(value,fallback){return typeof value==='number'&&Number.isFinite(value)?value:fallback;}
  function clamp(value,low,high){return Math.max(low,Math.min(high,value));}
  function ease(value){var t=clamp(finite(value,0),0,1);return t*t*t*(t*(t*6-15)+10);}
  function point(x,y,angle){return {x:x,y:y,angle:angle||0};}
  function optionIndex(value){return value===1?1:0;}
  function itemIndex(value,maximum){return clamp(Math.floor(finite(value,0)),0,maximum);}
  function mushroomAnchor(options){var o=options||{},i=itemIndex(o.piece,13),a=i*2.4,r=.18+(i%3)*.14;return {x:clamp(finite(o.pieceX,450+205*Math.cos(a)*r),330,585),y:clamp(finite(o.pieceY,350+45*Math.sin(a)*r),325,375)};}
  function moveMushroomGeometry(options){var o=options||{},a=o.pieceAnchor||{},b=o.targetAnchor||{},limit=function(x,y){var dx=finite(x,450)-450,dy=finite(y,350)-350,r=Math.hypot(dx/123,dy/27);return {x:450+dx/Math.max(1,r),y:350+dy/Math.max(1,r)};};return {piece:itemIndex(o.piece,13),origin:limit(finite(a.x,o.pieceX),finite(a.y,o.pieceY)),target:limit(finite(b.x,o.targetX),finite(b.y,o.targetY))};}
  function lidAnchor(placement){return placement==='covered'?point(450,322,0):point(310,299,65);}
  function lidPlacements(options){var o=options||{},to=o.placement==='covered'?'covered':'rest',from=o.fromPlacement||o.initialPlacement;return {from:from==='covered'||from==='rest'?from:to==='covered'?'rest':'covered',to:to};}
  function thermal(options){return !!options&&options.activity==='cool-and-fold-sauce';}
  function panAnchor(placement){return point(placement==='trivet'?300:520,350,0);}
  function panPlacements(options){var o=options||{},to=o.placement==='trivet'?'trivet':'burner',from=o.fromPlacement||o.initialPlacement;return {from:from==='burner'||from==='trivet'?from:to==='burner'?'trivet':'burner',to:to};}
  function panHands(tool){return {left:rotateOffset(tool,{x:-125,y:-8}),right:rotateOffset(tool,{x:185,y:-4})};}
  function panRestHands(){return {left:point(220,300),right:point(690,390)};}
  function bundleAnchor(options){var o=options||{},i=itemIndex(o.group,5),a=i*PI/3+PI/6,x=finite(o.groupX,450+48*Math.cos(a)),y=finite(o.groupY,350+12.16*Math.sin(a)),dx=clamp(x-450,-54,54),dy=clamp(y-350,-14,14),r=Math.sqrt(dx*dx/(54*54)+dy*dy/(14*14));return {x:450+dx/Math.max(1,r),y:350+dy/Math.max(1,r)};}
  function spoonAtBowl(x,y,angle){var a=angle*PI/180;return point(x+7*Math.sin(a),y-7*Math.cos(a),angle);}
  function cutGeometry(options){var o=options||{},width=clamp(Math.floor(finite(o.selectedWidth,40)),2,40),cut=clamp(Math.floor(finite(o.cutMm,5)),1,width-1),x=clamp(finite(o.cutX,330+240*cut/width),336,564),side=finite(o.supportX,x+(cut<width/2?45:-45))>x?1:-1;return {piece:itemIndex(o.piece,39),selectedWidth:width,cutMm:cut,line:{x:x,y:350},support:{x:x+side*45,y:345},side:side};}
  function bladeBounds(tool){var corners=[[-18,-28],[0,-28],[0,14],[-18,14]].map(function(v){return rotateOffset(tool,{x:v[0],y:v[1]});});return {minX:Math.min.apply(null,corners.map(function(p){return p.x;})),maxX:Math.max.apply(null,corners.map(function(p){return p.x;})),minY:Math.min.apply(null,corners.map(function(p){return p.y;})),maxY:Math.max.apply(null,corners.map(function(p){return p.y;}))};}
  function rotateOffset(tool,offset){var a=tool.angle*PI/180;return point(tool.x+offset.x*Math.cos(a)-offset.y*Math.sin(a),tool.y+offset.x*Math.sin(a)+offset.y*Math.cos(a),tool.angle);}
  function grip(tool,kind){return rotateOffset(tool,kind==='pour'?{x:43,y:5}:kind==='mince'?{x:116,y:0}:kind==='sliceProduce'?{x:20,y:-66}:kind==='wring'?{x:25,y:0}:kind==='addDry'?{x:10,y:-40}:kind==='addPasta'?{x:60,y:0}:kind==='drainPasta'?{x:100,y:-8}:kind==='movePan'?{x:185,y:-4}:kind==='finish'||kind==='finishCuts'||kind==='blot'||kind==='waitPan'||kind==='setPanHeat'||kind==='moveLid'||kind==='waitPot'||kind==='setPotHeat'?{x:0,y:0}:{x:0,y:-66});}
  function keyframe(kind,phase,options){
    var o=options||{},plate=optionIndex(o.plate===undefined?o.plateIndex:o.plate),clove=optionIndex(o.clove),x=plate?720:285,tip=clove?465:405,piece=itemIndex(o.piece,13),area=itemIndex(o.area,7),px=420+(piece%7)*28,py=341+Math.floor(piece/7)*16,bx=355+(area%4)*70,by=335+Math.floor(area/4)*23,poses;
    if(thermal(o)&&(kind==='inspect'||kind==='fold')){if(phase==='pickup'||phase==='ready')return point(140,375,90);var original=keyframe(kind,phase,{}),at=panAnchor(o.panPlacement);return point(at.x+(original.x-514)*110/132,at.y+original.y-349,original.angle);}
    if(kind==='pour')poses={pickup:[230,318,0],measure:[310,294,0],position:[445,282,0],tilt:[462,289,-58],level:[462,285,0],ready:[230,318,0]};
    else if(kind==='fold')poses={pickup:[690,350,-32],immerse:[450,356,-12],across:[574,358,12],turn:[505,340,-28],ready:[690,350,-32]};
    else if(kind==='mince')poses={pickup:[588,350,-5],position:[tip,350,-14],cut:[tip,350,0],clear:[tip,350,-19],ready:[588,350,-5]};
    else if(kind==='serve')poses={pickup:[514,350,-35],scoop:[500,352,-12],lift:[500,340,-12],carry:[x,340,0],tip:[x,345,plate?-22:22],level:[x,327,0],ready:[514,350,-35]};
    else if(kind==='return')poses={pickup:[514,350,-35],scoop:[x,362,0],lift:[x,340,0],carry:[514,340,0],tip:[514,345,plate?-22:22],level:[514,327,0],ready:[514,350,-35]};
    else if(kind==='finish')poses={pickup:[705,349,0],review:[610,310,-15],ready:[705,349,0]};
    else if(kind==='press')poses={pickup:[300,324,-14],position:[px,306,0],contact:[px,py-5,0],press:[px,py+2,0],lift:[px,306,0],ready:[300,324,-14]};
    else if(kind==='blot')poses={pickup:[620,336,0],position:[bx,by-27,0],contact:[bx,by,0],lift:[bx,by-27,0],ready:[620,336,0]};
    else if(kind==='wring')poses={pickup:[620,336,0],carry:[300,306,0],twist:[300,306,12],release:[300,306,0],ready:[620,336,0]};
    else if(kind==='addDry')poses={pickup:[690,340,0],carry:[425,300,0],tilt:[390,280,-125],level:[425,300,0],ready:[690,340,0]};
    else if(kind==='returnDry')poses={pickup:[350,350,0],scoop:[350,355,0],carry:[650,275,0],tip:[660,280,40],ready:[350,350,0]};
    else if(kind==='addPasta')poses={pickup:[350,350,0],lift:[350,295,0],carry:[480,280,0],tip:[500,285,38],level:[480,280,0],ready:[350,350,0]};
    else if(kind==='samplePasta')poses={pickup:[690,350,-32],dip:[450,350,-10],lift:[410,295,-10],check:[365,320,0],ready:[690,350,-32]};
    else if(kind==='reserveWater')poses={pickup:[300,350,-32],dip:[450,350,-10],lift:[450,295,-10],carry:[270,290,0],tip:[245,305,-28],level:[270,290,0],ready:[300,350,-32]};
    else if(kind==='drainPasta')poses={pickup:[450,350,0],lift:[450,295,0],carry:[570,285,0],tilt:[570,285,35],level:[570,285,0],ready:[450,350,0]};
    else if(kind==='turnMushroom'){var mushroom=mushroomAnchor(o);poses={pickup:[300,324,-14],position:[mushroom.x,mushroom.y-26,-8],grip:[mushroom.x,mushroom.y,0],lift:[mushroom.x,mushroom.y-24,0],turn:[mushroom.x,mushroom.y-24,0],lower:[mushroom.x,mushroom.y,0],ready:[300,324,-14]};}
    else if(kind==='moveMushroom'){var moving=moveMushroomGeometry(o),clear=Math.min(moving.origin.y,moving.target.y)-36;poses={pickup:[300,324,-14],position:[moving.origin.x,clear,0],grip:[moving.origin.x,moving.origin.y,0],lift:[moving.origin.x,clear,0],carry:[moving.target.x,clear,0],lower:[moving.target.x,moving.target.y,0],release:[moving.target.x,moving.target.y,0],ready:[300,324,-14]};}
    else if(kind==='waitPan')poses={pickup:[690,390,0],observe:[690,390,0],ready:[690,390,0]};
    else if(kind==='setPanHeat'){var before=-60+40*itemIndex(o.initialSetting,3),after=-60+40*itemIndex(o.setting,3);poses={pickup:[690,390,before],reach:[650,375,before],adjust:[650,375,after],ready:[690,390,after]};}
    else if(kind==='moveLid'){var placement=lidPlacements(o),origin=lidAnchor(placement.from),target=lidAnchor(placement.to);poses={pickup:[origin.x,origin.y,origin.angle],lift:[origin.x,250,0],carry:[target.x,250,0],lower:[target.x,target.y,target.angle],ready:[target.x,target.y,target.angle]};}
    else if(kind==='waitPot')poses={pickup:[585,390,0],observe:[585,390,0],ready:[585,390,0]};
    else if(kind==='setPotHeat'){var initial=-60+40*itemIndex(o.initialSetting,3),chosen=-60+40*itemIndex(o.setting,3);poses={pickup:[585,390,initial],reach:[650,375,initial],adjust:[650,375,chosen],ready:[585,390,chosen]};}
    else if(kind==='movePan'){var placements=panPlacements(o),from=panAnchor(placements.from),to=panAnchor(placements.to);poses={pickup:[from.x,from.y,0],grip:[from.x,from.y,0],lift:[from.x,285,0],carry:[to.x,285,0],lower:[to.x,to.y,0],ready:[to.x,to.y,0]};}
    else if(kind==='separatePasta'){var group=bundleAnchor(o);if(phase==='position')return spoonAtBowl(group.x-10,292,-10);if(phase==='dip')return spoonAtBowl(group.x-10,group.y,-10);if(phase==='sweep')return spoonAtBowl(group.x+10,group.y,10);if(phase==='lift')return spoonAtBowl(group.x+10,292,10);return point(690,350,-32);}
    else if(kind==='sliceProduce'){var selected=cutGeometry(o);return phase==='pickup'||phase==='ready'?point(690,350,-65):point(selected.line.x,phase==='cut'?350:306,0);}
    else if(kind==='finishCuts')return point(620,390);
    else poses={pickup:[690,350,-32],dip:[465,355,-10],lift:[566,306,-18],ready:[690,350,-32]};
    var p=poses[phase]||poses.pickup;return point(p[0],p[1],p[2]);
  }
  function activeHand(kind,o){return thermal(o)&&(kind==='inspect'||kind==='fold')||kind==='pour'||kind==='press'||kind==='reserveWater'||kind==='turnMushroom'||((kind==='serve'||kind==='return')&&optionIndex(o.plate===undefined?o.plateIndex:o.plate)===0)?'left':'right';}
  function support(kind,o){
    if(kind==='finishCuts')return point(255,365);
    if(thermal(o)&&(kind==='inspect'||kind==='fold'))return panHands(panAnchor(o.panPlacement)).right;
    if(thermal(o)&&(kind==='waitPan'||kind==='setPanHeat'))return point(220,300);
    if(kind==='mince')return point(optionIndex(o.clove)?527:467,322,-28);
    if(kind==='turnMushroom')return point(705,349,-8);
    if(kind==='waitPan'||kind==='setPanHeat')return point(255,365,0);
    if(kind==='moveLid'||kind==='waitPot'||kind==='setPotHeat')return point(210,365,0);
    if(kind==='pour'||kind==='press'||((kind==='serve'||kind==='return')&&activeHand(kind,o)==='left'))return point(705,349,-8);
    if(kind==='blot'||kind==='wring')return point(220,338,8);
    if(kind==='addDry'||kind==='returnDry')return point(300,337,8);
    if(kind==='samplePasta')return point(350,342,0);
    if(kind==='reserveWater')return point(550,342,0);
    if(kind==='serve'||kind==='return'||kind==='finish')return point(220,338,8);
    return point(neutral.left.x,neutral.left.y,8);
  }
  function carryLift(kind,phase,next){
    if(kind==='finishCuts')return 0;
    if(kind==='turnMushroom')return phase==='pickup'?18:0;
    if(kind==='waitPan'||kind==='waitPot')return 0;
    if(kind==='setPanHeat'||kind==='setPotHeat')return phase==='pickup'?8:0;
    if(kind==='drainPasta')return phase==='pickup'||phase==='lift'?10:next==='ready'?22:0;
    if(kind==='reserveWater')return phase==='pickup'?18:phase==='lift'?8:next==='ready'?20:0;
    if(kind==='addDry')return phase==='pickup'||next==='ready'?22:0;
    if(kind==='returnDry')return phase==='pickup'?15:phase==='scoop'?15:next==='ready'?20:0;
    if(kind==='addPasta')return phase==='pickup'?10:phase==='lift'?8:next==='ready'?22:0;
    if(kind==='press'||kind==='blot')return phase==='pickup'||next==='ready'?20:0;
    if(kind==='wring')return phase==='pickup'||next==='ready'?22:0;
    if(kind==='mince')return phase==='pickup'||next==='ready'?24:0;
    if(kind==='pour')return phase==='pickup'?14:phase==='measure'?17:next==='ready'?25:0;
    if(kind==='serve'||kind==='return')return next==='scoop'?18:phase==='lift'?7:next==='ready'?7:0;
    if(phase==='pickup'||next==='ready')return 30;
    return 0;
  }
  // Animation pacing is separate from the simulated kitchen clock. A deliberate
  // placement has time to settle; a knife lift is quicker than a loaded carry.
  function transitionDuration(kind,phase,next){
    if(kind==='moveMushroom'){var moveSteps={pickup:1050,position:1000,grip:750,lift:1050,carry:750,lower:500,release:1450};return !next?0:moveSteps[phase]||650;}
    if(kind==='sliceProduce'){var cutSteps={pickup:1050,position:900,brace:900,cut:750,lift:1400};return !next?0:cutSteps[phase]||650;}
    if(kind==='finishCuts')return !next?0:700;
    if(kind==='separatePasta'){var bundleSteps={pickup:1000,position:850,dip:1100,sweep:850,lift:1350};return !next?0:bundleSteps[phase]||650;}
    if(kind==='movePan'){var panSteps={pickup:850,grip:850,lift:1000,carry:850,lower:1000};return !next?0:panSteps[phase]||560;}
    if(kind==='moveLid'||kind==='waitPot'||kind==='setPotHeat'){var lidSteps={moveLid:{pickup:900,lift:850,carry:900,lower:1000},waitPot:{pickup:850,observe:700},setPotHeat:{pickup:660,reach:650,adjust:720}};return !next?0:lidSteps[kind][phase]||560;}
    if(kind==='turnMushroom'||kind==='waitPan'||kind==='setPanHeat'){var staged={turnMushroom:{pickup:780,position:640,grip:620,lift:760,turn:680,lower:900},waitPan:{pickup:850,observe:700},setPanHeat:{pickup:660,reach:650,adjust:720}};return !next?0:staged[kind][phase]||560;}
    var durations={inspect:{pickup:620,dip:650,lift:580},pour:{pickup:650,measure:720,position:680,tilt:560,level:680},fold:{pickup:620,immerse:760,across:640,turn:680},mince:{pickup:580,position:400,cut:330,clear:560},serve:{pickup:540,scoop:480,lift:760,carry:620,tip:460,level:650},return:{pickup:640,scoop:500,lift:760,carry:620,tip:460,level:650},finish:{pickup:800,review:700},press:{pickup:700,position:530,contact:640,press:450,lift:700},blot:{pickup:680,position:620,contact:520,lift:660},wring:{pickup:850,carry:920,twist:740,release:850},addDry:{pickup:760,carry:800,tilt:540,level:760},returnDry:{pickup:480,scoop:820,carry:620,tip:800},addPasta:{pickup:680,lift:820,carry:900,tip:650,level:850},samplePasta:{pickup:700,dip:650,lift:760,check:800},reserveWater:{pickup:700,dip:650,lift:800,carry:760,tip:550,level:760},drainPasta:{pickup:800,lift:900,carry:950,tilt:720,level:900}};
    return !next?0:durations[kind]&&durations[kind][phase]||560;
  }
  function transformPoint(value,body){var p=rotateOffset({x:body.pivot.x,y:body.pivot.y,angle:body.angle},{x:value.x-body.pivot.x,y:value.y-body.pivot.y});return point(p.x+body.x,p.y+body.y);}
  function attention(data,options,end){
    var reduced=options.reducedMotion===true,focus=point(data.tool.x,data.tool.y),lead=end?Math.pow(Math.sin(PI*data.eased),2)*.12:0;
    if(end){focus.x+=(end.x-focus.x)*lead;focus.y+=(end.y-focus.y)*lead;}
    var sideways=clamp((data.grip.x-450)/190,-1,1),forward=clamp((data.grip.y-250)/130,0,1);
    var body={x:reduced?0:sideways*3.5,y:reduced?0:forward*1.8,angle:reduced?0:sideways*2.4,pivot:{x:450,y:335}};
    if(data.kind==='turnMushroom'&&data.food&&!reduced){var load=data.food.attached?data.food.lift/24:0;body.x-=sideways*1.2*load;body.angle-=sideways*.8*load;}
    if(data.kind==='waitPan'||data.kind==='waitPot'||data.kind==='finishCuts'){body={x:0,y:0,angle:0,pivot:{x:450,y:335}};focus=point(450,350);}
    if(data.kind==='moveLid'&&data.lid&&!reduced){var lidLoad=data.lid.contact*clamp((322-data.tool.y)/72,0,1);body.x-=sideways*lidLoad;body.angle-=sideways*.6*lidLoad;}
    if(data.kind==='movePan'){var centered=clamp(((data.grip.x+data.supportHand.x)/2-450)/200,-1,1),load=data.panTransport.contact*clamp(data.panTransport.lift/65,0,1);body={x:reduced?0:centered*(3.5-load),y:reduced?0:forward*1.8,angle:reduced?0:centered*(2.4-.6*load),pivot:{x:450,y:335}};}
    // Head and eyes lead the working end while the hips stay over the stance.
    // All terms depend on continuous positions, preserving phase boundaries.
    var head={x:reduced?0:clamp((focus.x-450)/150,-1,1)*1.8,y:reduced?0:1.2+forward*.8,angle:reduced?0:clamp((focus.x-450)/170,-1,1)*5-body.angle*.35,pivot:{x:450,y:181}};
    data.body=body;data.shoulders={left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)};data.head=head;
    data.gaze={x:reduced?0:clamp((focus.x-450)/100,-2,2),y:reduced?0:clamp((focus.y-138)/150,0,1.4),target:focus};
    return data;
  }
  function pose(options){
    var o=options||{},kind=o.kind||'inspect',phase=o.phase||'pickup',next=o.nextPhase||null;
    if(kind==='moveLid')return lidPose(o);
    if(kind==='movePan')return panPose(o);
    if(kind==='separatePasta')return bundlePose(o);
    if(kind==='sliceProduce')return cutPose(o);
    if(kind==='moveMushroom')return moveMushroomPose(o);
    var start=keyframe(kind,phase,o),end=next?keyframe(kind,next,o):start;
    var t=clamp(finite(o.progress,0)/100,0,1),u=ease(t),tool=point(start.x+(end.x-start.x)*u,start.y+(end.y-start.y)*u,start.angle+(end.angle-start.angle)*u);
    // A raised carry arc has zero velocity at either end. Contact movements
    // retain the food/tool anchor, including the knife's rocking tip.
    tool.y-=(next?carryLift(kind,phase,next):0)*Math.pow(Math.sin(PI*u),2);
    if(kind==='fold'&&phase==='immerse'&&next==='across')tool.y+=9*Math.pow(Math.sin(PI*u),2);
    if(kind==='fold'&&phase==='across'&&next==='turn')tool.y-=8*Math.pow(Math.sin(PI*u),2);
    if((kind==='setPanHeat'||kind==='setPotHeat')&&phase==='pickup'&&next==='reach'){var arrive=parkEase(t/.8);tool=point(start.x+(end.x-start.x)*arrive,start.y+(end.y-start.y)*arrive-8*Math.pow(Math.sin(PI*arrive),2),start.angle);}
    // Release at the contact first; only empty jaws/fingers then travel away.
    if((kind==='turnMushroom'&&phase==='lower'||(kind==='setPanHeat'||kind==='setPotHeat')&&phase==='adjust')&&next==='ready'){var leaving=parkEase((t-.2)/.8);tool=point(start.x+(end.x-start.x)*leaving,start.y+(end.y-start.y)*leaving-22*Math.pow(Math.sin(PI*leaving),2),start.angle+(end.angle-start.angle)*leaving);}
    var hand=activeHand(kind,o),held=kind!=='finish'&&kind!=='finishCuts'&&kind!=='waitPan'&&kind!=='setPanHeat'&&kind!=='waitPot'&&kind!=='setPotHeat',s=support(kind,o);
    // The cloth is picked up one-handed. The other hand joins over the bowl,
    // follows the twist, then releases before the cloth travels back to its tray.
    if(kind==='wring'){
      var joined=phase==='pickup'?u:phase==='release'&&next==='ready'?1-u:phase==='ready'?0:1;
      var clothHand=rotateOffset(tool,{x:-25,y:0});s=point(s.x+(clothHand.x-s.x)*joined,s.y+(clothHand.y-s.y)*joined,tool.angle);
    }
    if(kind==='addPasta')s=rotateOffset(tool,{x:-60,y:0});
    if(kind==='drainPasta')s=rotateOffset(tool,{x:-100,y:-8});
    tool.visible=held;
    var data={kind:kind,phase:phase,nextPhase:next,tool:tool,activeHand:hand,grip:grip(tool,kind),supportHand:s,targetGrip:next?grip(end,kind):null,spout:kind==='pour'?rotateOffset(tool,{x:-42,y:-38}):kind==='addDry'?rotateOffset(tool,{x:0,y:-40}):kind==='returnDry'||kind==='reserveWater'?rotateOffset(tool,{x:0,y:7}):kind==='addPasta'?rotateOffset(tool,{x:70,y:10}):kind==='drainPasta'?rotateOffset(tool,{x:88,y:-6}):null,held:held,eased:u,progress:t*100};
    if(kind==='blot'||kind==='wring'){
      var compression=kind==='wring'?(phase==='carry'?u:phase==='twist'?1-u:0):(phase==='position'?u:phase==='contact'?1-u:0);
      data.cloth={compression:compression,twist:kind==='wring'?tool.angle/12:0,dripping:kind==='wring'&&(phase==='twist'||phase==='carry'&&u>.6)};
    }
    if(kind==='press'||kind==='blot')data.contact={x:kind==='press'?420+(itemIndex(o.piece,13)%7)*28:355+(itemIndex(o.area,7)%4)*70,y:kind==='press'?341+Math.floor(itemIndex(o.piece,13)/7)*16:335+Math.floor(itemIndex(o.area,7)/4)*23,amount:kind==='press'?(phase==='contact'?u:phase==='press'?1-u:0):(phase==='position'?u:phase==='contact'?1-u:0)};
    if(kind==='turnMushroom'){
      var origin=mushroomAnchor(o),opening=phase==='lower'&&next==='ready'?parkEase(t/.2):0,closed=phase==='position'&&next==='grip'?parkEase((u-.75)/.25):['grip','lift','turn','lower'].includes(phase)?1-opening:0;
      var attached=phase==='position'&&next==='grip'&&t===1||['grip','lift','turn'].includes(phase)||phase==='lower'&&opening<1;
      var roll=phase==='lift'&&next==='turn'?clamp(u,0,1):phase==='turn'?1:phase==='lower'?1-(next==='ready'?parkEase((t-.2)/.8):0):0;
      data.tongs={closure:closed,roll:roll};data.food={piece:itemIndex(o.piece,13),origin:origin,position:attached?{x:tool.x,y:tool.y}:copy(origin),attached:attached,preview:attached,lift:attached?clamp(origin.y-tool.y,0,24):0,roll:roll};
    }
    if(kind==='setPanHeat'||kind==='setPotHeat')data.knob={contact:phase==='pickup'&&next==='reach'?(t===1?1:parkEase((t-.8)/.2)):phase==='reach'?1:phase==='adjust'?1-(next==='ready'?parkEase(t/.2):0):0,turn:phase==='reach'&&next==='adjust'?clamp(u,0,1):phase==='adjust'||phase==='ready'?1:0};
    if(thermal(o)&&(kind==='inspect'||kind==='fold')){var surface=panAnchor(o.panPlacement);data.panSurface={x:surface.x,y:surface.y,rx:110,ry:34};}
    return attention(data,o,next?end:null);
  }
  // Moving a mushroom preserves its face. The preview remains at its chosen
  // destination after the jaws open, until an explicit release records it.
  function moveMushroomPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),d=moveMushroomGeometry(o),start=keyframe('moveMushroom',phase,o),end=next?keyframe('moveMushroom',next,o):start,tool=blendPoint(start,end,u),clear=Math.min(d.origin.y,d.target.y)-36,closure=0,tongGrip=1,preview=['grip','lift','carry','lower','release','ready'].includes(phase),attached=['grip','lift','carry','lower'].includes(phase);
    if(phase==='pickup'&&next==='position'){var rise=parkEase(t/.3),carry=parkEase((t-.3)/.7);tool=t<.3?point(start.x,start.y+(clear-start.y)*rise,start.angle):point(start.x+(end.x-start.x)*carry,clear-6*Math.pow(Math.sin(PI*carry),2),angleBlend(start.angle,0,carry));}
    if(phase==='position'&&next==='grip'){var descend=parkEase(t/.8);tool=point(d.origin.x,clear+(d.origin.y-clear)*descend,0);closure=parkEase((t-.8)/.2);preview=t===1;attached=preview;}
    if(['grip','lift','carry','lower'].includes(phase))closure=1;
    if(phase==='lift'&&next==='carry')tool.y-=4*Math.pow(Math.sin(PI*u),2);
    if(phase==='lower'&&next==='release'){closure=1-u;attached=closure>0;}
    if(phase==='release'&&next==='ready'){var raise=parkEase(t/.25),travel=parkEase((t-.25)/.5),lower=parkEase((t-.75)/.15);tool=t<.25?point(start.x,start.y+(clear-start.y)*raise,0):t<.75?point(start.x+(end.x-start.x)*travel,clear-6*Math.pow(Math.sin(PI*travel),2),angleBlend(0,end.angle,travel)):t<.9?point(end.x,clear+(end.y-clear)*lower,end.angle):copy(end);tongGrip=1-parkEase((t-.9)/.1);}
    if(phase==='ready')tongGrip=0;
    if(t===0)tool=copy(start);if(t===1&&next){tool=copy(end);if(next==='grip'){closure=1;preview=true;attached=true;}if(next==='release'){closure=0;attached=false;}if(next==='ready')tongGrip=0;}
    var position=attached?{x:tool.x,y:tool.y}:preview?copy(d.target):copy(d.origin),groundY=phase==='lift'&&next==='carry'?d.origin.y+(d.target.y-d.origin.y)*u:['position','grip','lift'].includes(phase)?d.origin.y:d.target.y,displaced=Math.hypot(position.x-d.origin.x,position.y-d.origin.y)>1e-8;tool.visible=tongGrip>0;
    var data={kind:'moveMushroom',phase:phase,nextPhase:next,tool:tool,activeHand:'left',grip:grip(tool,'moveMushroom'),supportHand:point(705,349,-8),targetGrip:next?grip(end,'moveMushroom'):null,spout:null,held:tongGrip>0,tongGrip:tongGrip,eased:u,progress:t*100,tongs:{closure:closure,roll:0},food:{piece:d.piece,origin:copy(d.origin),target:copy(d.target),position:position,attached:attached,preview:preview,lift:attached?Math.max(0,groundY-tool.y):0,roll:0},mushroomMove:{piece:d.piece,origin:copy(d.origin),target:copy(d.target),contact:closure,stage:phase,displaced:displaced}};
    return attention(data,o,next?end:null);
  }
  function lidPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),places=lidPlacements(o),origin=lidAnchor(places.from),target=lidAnchor(places.to),start=keyframe('moveLid',phase,o),end=next?keyframe('moveLid',next,o):start,tool=blendPoint(start,end,u),release=phase==='ready'?1:phase==='lower'&&next==='ready'?parkEase(t/.25):0,withdraw=phase==='ready'?1:phase==='lower'&&next==='ready'?parkEase((t-.25)/.75):0;
    // Raise the rim clear first. Leveling and lateral carrying never scrape a
    // lid across the pot edge or the rack, even when the resting lid is tilted.
    if(phase==='pickup'&&next==='lift'){var lifting=parkEase(t/.6),leveling=parkEase((t-.6)/.4);tool=point(origin.x,origin.y+(250-origin.y)*lifting,angleBlend(origin.angle,0,leveling));}
    if(phase==='lift'&&next==='carry')tool.y-=10*Math.pow(Math.sin(PI*u),2);
    tool.visible=true;var hand=blendPoint(tool,point(585,390),withdraw);hand.y-=16*Math.pow(Math.sin(PI*withdraw),2);var attached=release<1;
    var data={kind:'moveLid',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:hand,supportHand:point(210,365),targetGrip:next?next==='ready'?point(585,390):grip(end,'moveLid'):null,spout:null,held:attached,eased:u,progress:t*100,lid:{origin:origin,target:target,position:point(tool.x,tool.y,tool.angle),from:places.from,to:places.to,preview:true,attached:attached,held:attached,contact:1-release}};
    return attention(data,o,next?end:null);
  }
  function panPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),places=panPlacements(o),origin=panAnchor(places.from),target=panAnchor(places.to),start=keyframe('movePan',phase,o),end=next?keyframe('movePan',next,o):start,tool=blendPoint(start,end,u),rest=panRestHands(),release=phase==='ready'?1:phase==='lower'&&next==='ready'?parkEase(t/.3):0,withdraw=phase==='ready'?1:phase==='lower'&&next==='ready'?parkEase((t-.3)/.7):0,contact=phase==='pickup'?(next==='grip'?parkEase((t-.85)/.15):0):1-release;
    if(phase==='lift'&&next==='carry')tool.y-=10*Math.pow(Math.sin(PI*u),2);
    var joined=phase==='pickup'&&next==='grip'?parkEase(t/.85):phase==='pickup'?0:1,attached=phase==='pickup'?next==='grip'&&t===1:release<1,preview=phase!=='pickup'||next==='grip'&&t===1,h=panHands(tool),handPoints={};
    ['left','right'].forEach(function(side){var p=phase==='pickup'?blendPoint(rest[side],h[side],joined):blendPoint(h[side],rest[side],withdraw),motion=phase==='pickup'?joined:withdraw,distance=Math.hypot(rest[side].x-h[side].x,rest[side].y-h[side].y);p.y-=Math.min(16,distance*.06)*Math.pow(Math.sin(PI*motion),2);handPoints[side]=p;});
    tool.visible=preview;var nextHand=next?next==='ready'?rest.right:panHands(end).right:null;
    var data={kind:'movePan',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:handPoints.right,supportHand:handPoints.left,targetGrip:nextHand,spout:null,held:attached,eased:u,progress:t*100,panSurface:{x:tool.x,y:tool.y,rx:110,ry:34},panTransport:{origin:origin,target:target,position:point(tool.x,tool.y,0),from:places.from,to:places.to,preview:preview,attached:attached,contact:contact,lift:clamp(350-tool.y,0,75),withdraw:withdraw,joining:joined}};
    return attention(data,o,next?end:null);
  }
  function bundleInteraction(group,target,tool,contact,sweep){var bowl=rotateOffset(tool,{x:0,y:7});return {group:group,target:copy(target),bowl:{x:bowl.x,y:bowl.y},contact:contact,immersion:.72*contact,sweep:sweep,preview:true,surface:{x:450,y:350,rx:78,ry:21}};}
  function cutInteraction(geometry,tool,contact,braced,progress){return {piece:geometry.piece,selectedWidth:geometry.selectedWidth,cutMm:geometry.cutMm,line:copy(geometry.line),support:copy(geometry.support),blade:point(tool.x,tool.y,tool.angle),bounds:bladeBounds(tool),contact:contact,braced:braced,cutProgress:progress,preview:true};}
  function cutPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),geometry=cutGeometry(o),start=keyframe('sliceProduce',phase,o),end=next?keyframe('sliceProduce',next,o):start,tool=blendPoint(start,end,u),cold=point(255,365),supportPoint=copy(cold),joined=0,braced=0,withdraw=0,release=phase==='ready'?1:0,cutProgress=['cut','lift','ready'].includes(phase)?1:phase==='brace'&&next==='cut'?u:0;
    if(phase==='pickup'&&next==='position'){var rise=parkEase(t/.3),carry=parkEase((t-.3)/.7);tool=t<.3?point(start.x,start.y+(306-start.y)*rise,start.angle):point(start.x+(end.x-start.x)*carry,306-6*Math.pow(Math.sin(PI*carry),2),angleBlend(start.angle,0,carry));}
    if(phase==='position'&&next==='brace'){joined=parkEase(t/.8);supportPoint=blendPoint(cold,point(geometry.support.x,geometry.support.y),joined);braced=parkEase((t-.8)/.2);}
    if(['brace','cut','lift'].includes(phase)){joined=1;braced=1;supportPoint=point(geometry.support.x,geometry.support.y);}
    if(phase==='lift'&&next==='ready'){var carrying=parkEase(t/.62),lower=parkEase((t-.62)/.26);tool=t<.62?point(start.x+(end.x-start.x)*carrying,306-6*Math.pow(Math.sin(PI*carrying),2),angleBlend(0,end.angle,carrying)):t<.88?point(end.x,306+(end.y-306)*lower,end.angle):copy(end);release=parkEase((t-.88)/.12);braced=1-parkEase(t/.15);withdraw=parkEase((t-.15)/.6);supportPoint=blendPoint(point(geometry.support.x,geometry.support.y),cold,withdraw);supportPoint.y-=10*Math.pow(Math.sin(PI*withdraw),2);}
    if(phase==='ready'){joined=1;withdraw=1;}if(t===0)tool=copy(start);if(t===1&&next){tool=copy(end);if(next==='brace'){joined=1;braced=1;supportPoint=point(geometry.support.x,geometry.support.y);}if(next==='ready'){release=1;braced=0;withdraw=1;supportPoint=copy(cold);}}
    var contact=phase==='brace'&&next==='cut'||phase==='cut'?parkEase((tool.y-322)/28):0,held=release<1;tool.visible=held;
    var data={kind:'sliceProduce',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:grip(tool,'sliceProduce'),supportHand:supportPoint,targetGrip:next?grip(end,'sliceProduce'):null,spout:null,held:held,knifeGrip:1-release,eased:u,progress:t*100,cutInteraction:cutInteraction(geometry,tool,contact,braced,cutProgress),clawJoining:joined,clawWithdrawal:withdraw};
    return attention(data,o,next?end:null);
  }
  function bundlePose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),target=bundleAnchor(o),start=keyframe('separatePasta',phase,o),end=next?keyframe('separatePasta',next,o):start,tool=blendPoint(start,end,u),contact=phase==='dip'||phase==='sweep'?1:0,sweep=phase==='sweep'||phase==='lift'||phase==='ready'?1:0,release=phase==='ready'?1:0;
    if(phase==='pickup'&&next==='position'){var rise=parkEase(t/.3),carry=parkEase((t-.3)/.7),startBowl=rotateOffset(start,{x:0,y:7}),endBowl=rotateOffset(end,{x:0,y:7});tool=t<.3?spoonAtBowl(startBowl.x,startBowl.y+(292-startBowl.y)*rise,start.angle):spoonAtBowl(startBowl.x+(endBowl.x-startBowl.x)*carry,292-6*Math.pow(Math.sin(PI*carry),2),angleBlend(start.angle,end.angle,carry));}
    if(phase==='position'&&next==='dip'){var descending=rotateOffset(tool,{x:0,y:7});contact=parkEase((18-(target.y-descending.y))/18);}
    if(phase==='dip'&&next==='sweep'){tool=spoonAtBowl(target.x-10+20*u,target.y,-10+20*u);sweep=u;}
    if(phase==='sweep'&&next==='lift'){var rising=rotateOffset(tool,{x:0,y:7});contact=parkEase((18-(target.y-rising.y))/18);}
    if(phase==='lift'&&next==='ready'){var carrying=parkEase(t/.62),lower=parkEase((t-.62)/.28),liftBowl=rotateOffset(start,{x:0,y:7}),homeBowl=rotateOffset(end,{x:0,y:7});tool=t<.62?spoonAtBowl(liftBowl.x+(homeBowl.x-liftBowl.x)*carrying,292-6*Math.pow(Math.sin(PI*carrying),2),angleBlend(start.angle,end.angle,carrying)):t<.9?spoonAtBowl(homeBowl.x,292+(homeBowl.y-292)*lower,end.angle):copy(end);release=parkEase((t-.9)/.1);}
    if(t===0)tool=copy(start);if(t===1&&next){tool=copy(end);if(next==='ready')release=1;}var held=release<1;tool.visible=held;
    var data={kind:'separatePasta',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:grip(tool,'separatePasta'),supportHand:point(350,342),targetGrip:next?grip(end,'separatePasta'):null,spout:null,held:held,spoonGrip:1-release,eased:u,progress:t*100,pastaInteraction:bundleInteraction(itemIndex(o.group,5),target,tool,contact,sweep)};
    return attention(data,o,next?end:null);
  }
  function copy(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(copy);var result={};Object.keys(value).forEach(function(key){result[key]=copy(value[key]);});return result;}
  // These are reversible movement cues, not a sauce observation or a cooking
  // result. The UI keeps quantities and recorded spoon evidence separate.
  function sauceInteraction(data){
    var p=data||{},kind=p.kind,tool=p.tool||p.pose;
    if(!p.held||(kind!=='pour'&&kind!=='fold')||!tool||!['x','y','angle'].every(function(key){return typeof tool[key]==='number'&&Number.isFinite(tool[key]);}))return null;
    var phase=p.phase,next=p.nextPhase,u=clamp(finite(p.eased,0),0,1);
    if(kind==='pour'){
      // Only the downward tilt empties the measured dose. Leveling the vessel
      // cannot pour the same liquid again, even while its lip is still tilted.
      var tipping=phase==='position'&&next==='tilt',transferred=tipping?ease((-tool.angle-30)/28):['tilt','level','ready'].includes(phase)?1:0;
      var spout=p.spout&&Number.isFinite(p.spout.x)&&Number.isFinite(p.spout.y)?p.spout:rotateOffset(tool,{x:-42,y:-38});
      return {kind:kind,transferred:transferred,remaining:1-transferred,flowing:tipping&&transferred>0&&transferred<1,spout:{x:spout.x,y:spout.y}};
    }
    var surface=p.panSurface||{x:514,y:349,rx:132,ry:34},bowl=rotateOffset(tool,{x:0,y:7}),radius=Math.pow((bowl.x-surface.x)/surface.rx,2)+Math.pow((bowl.y-surface.y)/surface.ry,2),inside=ease((1-radius)/.25);
    var entry=phase==='pickup'&&next==='immerse'?ease(u):0,turn=phase==='across'&&next==='turn'?ease(u):0,exit=phase==='turn'&&next==='ready'?ease(u):0;
    var touch=phase==='pickup'?entry:phase==='immerse'?1:phase==='across'?1-.65*turn:phase==='turn'?.35*(1-exit):0;
    // The downward sweep carries more contact than the upward return. Both
    // envelopes meet exactly at their phase boundaries and vanish off the pan.
    var load=phase==='pickup'?.25*entry:phase==='immerse'?.25+.55*(next==='across'?Math.pow(Math.sin(PI*u),2):0):phase==='across'?.25*(1-turn):0;
    var contact=touch*inside,pressure=load*inside;
    return {kind:kind,contact:contact,immersion:contact*(.35+.4*load),pressure:pressure,bowl:{x:bowl.x,y:bowl.y},angle:tool.angle};
  }
  function hands(data){var p=data||{},active=p.activeHand==='left'?'left':'right';return {left:active==='left'?p.grip||neutral.left:p.supportHand||neutral.left,right:active==='right'?p.grip||neutral.right:p.supportHand||neutral.right};}
  function angleBlend(a,b,u){var start=finite(a,0),end=finite(b,start),delta=((end-start)%360+540)%360-180;return start+delta*u;}
  // Hand artwork is oriented around the existing contact point, never by moving
  // that point. A cylindrical tool's shaft runs along the artwork's local Y axis.
  // The UI asks after applying an idle override so its actual hands stay aligned.
  function handPresentation(data,side){
    var p=data||{},which=side==='left'?'left':'right',hand=hands(p)[which],anchor={x:finite(hand.x,neutral[which].x),y:finite(hand.y,neutral[which].y)};
    if(p.handPoses&&p.handPoses[which]){var saved=copy(p.handPoses[which]);saved.anchor=anchor;return saved;}
    var freeAngle=arm({side:which,shoulder:p.shoulders&&p.shoulders[which],hand:anchor}).wristAngle+90,active=p.activeHand===which,tool=p.tool||p.pose||{},angle=finite(tool.angle,0),kind=p.kind,pressure=clamp(finite(p.contact&&p.contact.amount,0),0,1);
    var out={anchor:anchor,rotation:freeAngle,gesture:'relaxed',closure:.18,pressure:0,contact:0,role:'free',gear:'bare'};
    if(kind==='moveMushroom'){var tongContact=clamp(finite(p.tongGrip,1),0,1),jaw=clamp(finite(p.tongs&&p.tongs.closure,0),0,1);out.gesture=active?'wrap':'handle';out.rotation=active?angle:82;out.closure=active?.18+(.46+.3*jaw)*tongContact:1;out.contact=active?tongContact:1;out.role=active?tongContact>0?'working':'free':'stabilizing';out.gear=active?'bare':'mitt';return out;}
    if(kind==='sliceProduce'){var cut=p.cutInteraction,knifeContact=clamp(finite(p.knifeGrip,1),0,1),clawContact=clamp(finite(cut&&cut.braced,0),0,1),clawAngle=cut&&cut.support.x>cut.line.x?90:-90,restAngle=arm({side:'left',hand:point(255,365)}).wristAngle+90,join=clamp(finite(p.clawJoining,0),0,1),withdrawal=clamp(finite(p.clawWithdrawal,0),0,1);out.gesture=active?'pinch':join>0&&withdrawal<1?'claw':'relaxed';out.rotation=active?angle:angleBlend(angleBlend(restAngle,clawAngle,join),restAngle,withdrawal);out.closure=active?.18+.74*knifeContact:.18+.72*clawContact;out.contact=active?knifeContact:clawContact;out.role=out.contact>0?active?'working':'stabilizing':'free';return out;}
    if(kind==='separatePasta'){var spoonContact=clamp(finite(p.spoonGrip,1),0,1);out.gesture=active?'wrap':'handle';out.rotation=active?angle:90;out.closure=active?.18+.7*spoonContact:1;out.contact=active?spoonContact:1;out.role=active?spoonContact>0?'working':'free':'stabilizing';out.gear=active?'bare':'mitt';return out;}
    if(kind==='movePan'&&p.panTransport){var panContact=clamp(finite(p.panTransport.contact,0),0,1),restAngle=arm({side:which,hand:panRestHands()[which]}).wristAngle+90,joined=clamp(finite(p.panTransport.joining,1),0,1),withdraw=clamp(finite(p.panTransport.withdraw,0),0,1);out.gesture='handle';out.rotation=finite(p.panTransport.wrists&&p.panTransport.wrists[which],angleBlend(angleBlend(restAngle,90,joined),restAngle,withdraw));out.closure=.18+.82*panContact;out.contact=panContact;out.role=panContact>0?active?'working':'stabilizing':'free';out.gear='mitt';return out;}
    if(kind==='moveLid'&&active){var lidContact=clamp(finite(p.lid&&p.lid.contact,0),0,1);out.gesture='handle';out.rotation=finite(p.lid&&p.lid.wristRotation,angleBlend(angle+90,185,1-lidContact));out.closure=.18+.82*lidContact;out.contact=lidContact;out.role=lidContact>0?'working':'free';out.gear='mitt';return out;}
    if((kind==='setPanHeat'||kind==='setPotHeat')&&active){var knob=clamp(finite(p.knob&&p.knob.contact,0),0,1);out.gesture='pinch';out.rotation=angleBlend(freeAngle,angle+90,knob);out.closure=.18+.58*knob;out.contact=knob;out.role=knob>0?'working':'free';return out;}
    if(!p.held||!kind)return out;
    function contact(gesture,rotation,closure,gear){out.gesture=gesture;out.rotation=rotation;out.closure=closure;out.contact=1;out.role=active?'working':'stabilizing';out.gear=gear||'bare';}
    if(active){
      if(kind==='mince'||kind==='addDry')contact('pinch',angle+90,kind==='mince'?.92:.86);
      else if(kind==='pour')contact('hook',angle,.88);
      else if(kind==='blot'){contact('palm',angle,.45-.33*pressure);out.pressure=pressure;}
      else if(kind==='wring'){var squeeze=clamp(finite(p.cloth&&p.cloth.compression,0),0,1);contact('pinch',angle+90,.65+.28*squeeze);out.pressure=squeeze;}
      else if(kind==='addPasta'||kind==='drainPasta')contact('handle',angle+90,kind==='drainPasta'?1:.92,kind==='drainPasta'?'mitt':'bare');
      else if(kind==='turnMushroom')contact('wrap',angle,.64+.3*clamp(finite(p.tongs&&p.tongs.closure,0),0,1));
      else{contact('wrap',angle,.88+(kind==='press'?.1*pressure:0));out.pressure=kind==='press'?pressure:0;}
    }else if(kind==='mince')contact('claw',-28,.9);
    else if(kind==='addPasta'||kind==='drainPasta')contact('handle',angle+90,kind==='drainPasta'?1:.92,kind==='drainPasta'?'mitt':'bare');
    else if(kind==='samplePasta'||kind==='reserveWater')contact('handle',90,1,'mitt');
    else if(kind==='turnMushroom')contact('handle',82,1,'mitt');
    else if(p.panSurface&&(kind==='inspect'||kind==='fold'))contact('handle',82,1,'mitt');
    else if(kind==='pour'||kind==='press'||((kind==='serve'||kind==='return')&&p.activeHand==='left'))contact('handle',82,.9);
    else if(kind==='wring'){
      var joined=p.phase==='pickup'?clamp(finite(p.eased,0),0,1):p.phase==='release'&&p.nextPhase==='ready'?1-clamp(finite(p.eased,0),0,1):p.phase==='ready'?0:1,squeeze=clamp(finite(p.cloth&&p.cloth.compression,0),0,1);
      // The approaching forearm can foreshorten almost to a point in this
      // projection. Its instantaneous screen angle is not a wrist-twist target.
      // Rotate from the stable parked orientation into the cloth's contact axis.
      var parked=pose({kind:'wring',phase:'ready',reducedMotion:!!(p.body&&p.body.x===0&&p.body.y===0&&p.body.angle===0)}),parkedAngle=arm({side:'left',shoulder:parked.shoulders.left,hand:parked.supportHand}).wristAngle+90;
      out.gesture='pinch';out.rotation=angleBlend(parkedAngle,angle+90,joined);out.closure=.18+(.65+.28*squeeze-.18)*joined;out.pressure=squeeze*joined;out.contact=joined>=1-1e-9?1:0;out.role=joined>0?'stabilizing':'free';
    }else if(kind==='blot'||kind==='addDry'||kind==='returnDry'){contact('palm',8,.12);out.pressure=.2;}
    return out;
  }
  function blendPoint(a,b,u){var left=a||{},right=b||{};return point(finite(left.x,0)+(finite(right.x,0)-finite(left.x,0))*u,finite(left.y,0)+(finite(right.y,0)-finite(left.y,0))*u,finite(left.angle,0)+(finite(right.angle,0)-finite(left.angle,0))*u);}
  function blendBody(a,b,u,pivot){var value=blendPoint(a,b,u);value.pivot=copy(b&&b.pivot||a&&a.pivot||pivot);return value;}
  // Only the presentation layer calls this empty-hand reach. The old tool is
  // parked while both physical hands travel to the next pickup; the new tool
  // appears exactly at its grip on arrival. No timer or kitchen state is used.
  function reach(fromPose,toPose,progress,options){
    var target=toPose||pose({kind:'inspect',phase:'pickup'}),source=fromPose||{},o=options||{},t=clamp(finite(progress,0)/100,0,1),u=ease(t);
    if(o.contactAware===true)return contactReach(source,target,t,o);
    if(t===1||o.reducedMotion===true)return copy(target);
    var from=hands(source),to=hands(target),nextHands={},body=blendBody(source.body,target.body,u,{x:450,y:335});
    ['left','right'].forEach(function(side){var a=from[side],b=to[side],p=blendPoint(a,b,u),distance=Math.hypot(finite(b.x,0)-finite(a.x,0),finite(b.y,0)-finite(a.y,0));p.y-=Math.min(18,distance*.06)*Math.pow(Math.sin(PI*u),2);nextHands[side]=p;});
    var active=target.activeHand==='left'?'left':'right',tool=copy(target.tool||target.pose||keyframe('inspect','pickup'));tool.visible=false;
    var gaze=blendPoint(source.gaze,target.gaze,u);gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,u);
    var result={kind:null,transitionKind:target.kind||null,phase:'reach',nextPhase:'pickup',tool:tool,pose:null,activeHand:active,grip:nextHands[active],supportHand:nextHands[active==='left'?'right':'left'],targetGrip:copy(to[active]),next:copy(to[active]),held:false,eased:u,progress:t*100,reaching:true,body:body,head:blendBody(source.head,target.head,u,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)}};
    result.handPoses={};
    ['left','right'].forEach(function(side){var start=handPresentation(source,side),finish=handPresentation(target,side),release=1-ease(clamp(u/.24,0,1)),close=ease(clamp((u-.76)/.24,0,1));result.handPoses[side]={anchor:{x:nextHands[side].x,y:nextHands[side].y},rotation:angleBlend(start.rotation,finish.rotation,u),gesture:u<.5?start.gesture:finish.gesture,closure:start.closure*release+finish.closure*close,pressure:0,contact:0,role:'free',gear:finish.gear==='mitt'||start.gear==='mitt'?'mitt':'bare'};});
    return result;
  }
  function handoffPlan(source,target){
    var from=hands(source),to=hands(target),start={},finish={},keep={},distance=0,changed=false,release=false,close=false,a=source.tool||source.pose,b=target.tool||target.pose,family=function(kind){return ['inspect','fold','samplePasta','separatePasta'].includes(kind)?'spoon':kind;},retainedTool=!!(source.held&&target.held&&source.activeHand===target.activeHand&&family(source.kind)===family(target.kind)&&a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<.01&&Math.abs(a.angle-b.angle)<.01);
    ['left','right'].forEach(function(side){start[side]=handPresentation(source,side);finish[side]=handPresentation(target,side);var gap=Math.hypot(from[side].x-to[side].x,from[side].y-to[side].y),s=start[side],e=finish[side];distance=Math.max(distance,gap);keep[side]=gap<.01&&s.contact>0&&e.contact>0&&s.gear===e.gear&&s.gesture===e.gesture&&Math.abs(((e.rotation-s.rotation)%360+540)%360-180)<.01&&(s.role==='stabilizing'&&e.role==='stabilizing'||retainedTool&&side===target.activeHand);if(!keep[side]){release=release||s.contact>0;close=close||e.contact>0;}changed=changed||Math.abs(s.closure-e.closure)>.001||Math.abs(s.contact-e.contact)>.001||s.gear!==e.gear||s.gesture!==e.gesture||Math.abs(((e.rotation-s.rotation)%360+540)%360-180)>.01;});
    return {from:from,to:to,start:start,finish:finish,keep:keep,distance:distance,changed:changed,release:release,close:close,retainedTool:retainedTool};
  }
  function contactReach(source,target,t,options){
    if(t===1||options.reducedMotion===true)return copy(target);
    var plan=handoffPlan(source,target),stationary=plan.distance<.01,releaseEnd=plan.release?(stationary?.45:.16):0,closeStart=stationary?releaseEnd:plan.close?.82:1,travel=stationary?0:parkEase((t-releaseEnd)/(closeStart-releaseEnd)),opening=releaseEnd?parkEase(t/releaseEnd):1,closing=closeStart<1?parkEase((t-closeStart)/(1-closeStart)):0,look=parkEase(t),nextHands={},body=blendBody(source.body,target.body,stationary?look:travel,{x:450,y:335});
    ['left','right'].forEach(function(side){var a=plan.from[side],b=plan.to[side],p=blendPoint(a,b,travel),distance=Math.hypot(a.x-b.x,a.y-b.y);p.y-=Math.min(18,distance*.06)*Math.pow(Math.sin(PI*travel),2);nextHands[side]=p;});
    var eyeLook=options.anticipatoryAttention===true?parkEase(t/.65):look,headLook=options.anticipatoryAttention===true?parkEase(t/.82):look,active=target.activeHand==='left'?'left':'right',tool=copy(target.tool||target.pose||keyframe('inspect','pickup')),gaze=blendPoint(source.gaze,target.gaze,eyeLook);tool.visible=plan.retainedTool;gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,eyeLook);
    var result=plan.retainedTool?copy(target):{};Object.assign(result,{kind:plan.retainedTool?target.kind:null,transitionKind:target.kind||null,phase:'reach',nextPhase:'pickup',tool:tool,pose:plan.retainedTool?tool:null,activeHand:active,grip:nextHands[active],supportHand:nextHands[active==='left'?'right':'left'],targetGrip:copy(plan.to[active]),next:copy(plan.to[active]),held:plan.retainedTool,eased:look,progress:t*100,reaching:true,body:body,head:blendBody(source.head,target.head,headLook,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},handPoses:{},handoff:{stage:t<releaseEnd?'release':t<closeStart?'travel':'grip',retainedTool:plan.retainedTool,retainedContacts:copy(plan.keep)}});
    ['left','right'].forEach(function(side){var s=plan.start[side],e=plan.finish[side],kept=plan.keep[side],rotation=angleBlend(s.rotation,e.rotation,stationary?look:travel),closure=kept?s.closure+(e.closure-s.closure)*look:t<releaseEnd?s.closure+(.18-s.closure)*opening:.18+(e.closure-.18)*closing,contact=kept?s.contact+(e.contact-s.contact)*look:t<releaseEnd?s.contact*(1-opening):e.contact*closing;result.handPoses[side]={anchor:{x:nextHands[side].x,y:nextHands[side].y},rotation:rotation,gesture:kept?s.gesture:travel<.5&&!stationary?s.gesture:e.gesture,closure:closure,pressure:kept?s.pressure+(e.pressure-s.pressure)*look:0,contact:contact,role:contact>0?kept?s.role:t<releaseEnd?s.role:e.role:'free',gear:s.gear==='mitt'||e.gear==='mitt'?'mitt':'bare'};if(t===0){result.handPoses[side]=copy(s);result.handPoses[side].anchor={x:nextHands[side].x,y:nextHands[side].y};}});
    return result;
  }
  function reachDuration(fromPose,toPose,options){if(options&&options.contactAware===true){var source=fromPose||{},target=toPose||pose({kind:'inspect',phase:'pickup'}),p=handoffPlan(source,target);return p.distance<.01?p.changed||!!source.held!==!!target.held?240:0:Math.round(clamp(280+p.distance*.8+(p.release?80:0)+(p.close?80:0),360,810));}var from=hands(fromPose),to=hands(toPose),distance=Math.max(Math.hypot(to.left.x-from.left.x,to.left.y-from.left.y),Math.hypot(to.right.x-from.right.x,to.right.y-from.right.y));return distance<.01?0:Math.round(clamp(280+distance*.8,320,650));}
  function parkedPose(target){
    var result=copy(target),kind=target.kind;
    result.kind=null;result.parkedKind=kind;result.phase='parked';result.nextPhase=null;result.targetGrip=null;result.next=null;result.held=false;result.tool.visible=false;result.pose=null;result.parking=false;result.parkStage='parked';result.reaching=false;result.progress=100;result.eased=1;result.handPoses={};
    ['left','right'].forEach(function(side){var h=handPresentation(target,side);h.closure=.18;h.pressure=0;h.contact=0;h.role='free';result.handPoses[side]=h;});
    delete result.contact;if(result.cloth)result.cloth={compression:0,twist:0,dripping:false};
    if(kind==='turnMushroom'){result.tongs={closure:0,roll:0};if(result.food){result.food.position=copy(result.food.origin);result.food.preview=false;result.food.attached=false;result.food.lift=0;result.food.roll=0;}}
    if(kind==='moveLid'&&result.lid){result.lid.preview=false;result.lid.attached=false;result.lid.held=false;result.lid.contact=0;}
    if(kind==='movePan'&&result.panTransport){result.panTransport.preview=false;result.panTransport.attached=false;result.panTransport.contact=0;}
    if(kind==='separatePasta'&&result.pastaInteraction){result.spoonGrip=0;result.pastaInteraction.preview=false;result.pastaInteraction.contact=0;result.pastaInteraction.immersion=0;}
    if(kind==='sliceProduce'&&result.cutInteraction){result.knifeGrip=0;result.cutInteraction.preview=false;result.cutInteraction.contact=0;result.cutInteraction.braced=0;}
    if(kind==='moveMushroom'&&result.food){result.tongGrip=0;result.tongs={closure:0,roll:0};result.food.position=copy(result.food.origin);result.food.preview=false;result.food.attached=false;result.food.lift=0;result.food.roll=0;result.mushroomMove.contact=0;result.mushroomMove.displaced=false;result.mushroomMove.stage='parked';}
    return result;
  }
  function parkEase(value){return clamp(ease(value),0,1);}
  function moveReturnPlan(source,target){
    var d=source.mushroomMove,food=source.food,initial=source.tool||source.pose,home=target.tool||target.pose,clear=Math.min(d.origin.y,d.target.y)-36,cursor={tool:copy(initial),jaw:finite(source.tongs&&source.tongs.closure,0),tong:finite(source.tongGrip,source.held?1:0),position:copy(food.position),groundY:food.attached?initial.y+finite(food.lift,0):food.position.y,attached:!!food.attached,preview:!!food.preview},stages=[],total=0;
    clear=Math.min(clear,initial.y);
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    if(cursor.tong<1)add('tool-grip',.1,{tong:1});
    if(cursor.preview){
      if(!cursor.attached){var at=copy(cursor.position);add('tool-lift',.12,{tool:point(cursor.tool.x,clear,cursor.tool.angle),jaw:0});add('tool-carry',.18,{tool:point(at.x,clear,0)});add('tool-lower',.12,{tool:point(at.x,at.y,0)});add('food-grip',.1,{jaw:1,attached:true});}
      else if(cursor.jaw<1)add('food-grip',.1,{jaw:1});
      add('food-lift',.12,{tool:point(cursor.tool.x,clear,0)});add('food-carry',.2,{tool:point(d.origin.x,clear,0),groundY:d.origin.y});add('food-lower',.12,{tool:point(d.origin.x,d.origin.y,0)});add('food-release',.1,{jaw:0,attached:false,preview:false,position:copy(d.origin)});
    }
    add('tool-lift',.1,{tool:point(cursor.tool.x,clear,cursor.tool.angle),jaw:0});add('tool-carry',.2,{tool:point(home.x,clear,home.angle)});add('tool-lower',.12,{tool:copy(home)});add('tool-release',.1,{tong:0});
    return {stages:stages,total:total};
  }
  // A piece already released in a preview must be picked up again before a
  // cancellation can restore it. Every return keeps the same face downward.
  function returnMovedMushroom(source,target,t,options){
    var d=source.mushroomMove;target=moveMushroomPose({piece:d.piece,pieceAnchor:d.origin,targetAnchor:d.target,phase:'ready',reducedMotion:!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0)});var destination=parkedPose(target);if(t===1||options.reducedMotion===true)return destination;
    var plan=moveReturnPlan(source,target),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,tool=blendPoint(a.tool,b.tool,u),jaw=a.jaw+(b.jaw-a.jaw)*u,tong=a.tong+(b.tong-a.tong)*u,attached=u===1?b.attached:a.attached,preview=u===1?b.preview:a.preview,travel=parkEase(t),position=attached?{x:tool.x,y:tool.y}:copy(a.position),body=blendBody(source.body,destination.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,destination.gaze,travel);
    if(stage.name==='food-carry'||stage.name==='tool-carry')tool.y-=4*Math.pow(Math.sin(PI*u),2);if(attached)position={x:tool.x,y:tool.y};if(stage.name==='food-grip'&&u===1){attached=true;position={x:tool.x,y:tool.y};}if(stage.name==='food-release'&&u===1){preview=false;position=copy(d.origin);}tool.visible=tong>0;gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze&&destination.gaze.target,travel);
    var result={kind:'moveMushroom',parkedKind:'moveMushroom',phase:'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'left',grip:grip(tool,'moveMushroom'),supportHand:blendPoint(source.supportHand,destination.supportHand,travel),targetGrip:null,next:null,spout:null,held:tong>0,tongGrip:tong,parking:true,parkStage:stage.name,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,destination.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},tongs:{closure:jaw,roll:0},food:{piece:d.piece,origin:copy(d.origin),target:copy(d.target),position:position,attached:attached,preview:preview,lift:attached?Math.max(0,a.groundY+(b.groundY-a.groundY)*u-tool.y):0,roll:0},mushroomMove:{piece:d.piece,origin:copy(d.origin),target:copy(d.target),contact:jaw,stage:stage.name,displaced:Math.hypot(position.x-d.origin.x,position.y-d.origin.y)>1e-8},handPoses:{}};
    ['left','right'].forEach(function(side){var start=handPresentation(source,side),finish=handPresentation(destination,side),hand=side==='left'?result.grip:result.supportHand;result.handPoses[side]=side==='left'?{anchor:{x:hand.x,y:hand.y},rotation:tool.angle,gesture:'wrap',closure:.18+(.46+.3*jaw)*tong,pressure:0,contact:tong,role:tong>0?'working':'free',gear:'bare'}:{anchor:{x:hand.x,y:hand.y},rotation:angleBlend(start.rotation,finish.rotation,travel),gesture:start.gesture,closure:start.closure+(finish.closure-start.closure)*travel,pressure:0,contact:start.contact+(finish.contact-start.contact)*travel,role:travel<1?start.role:'free',gear:start.gear};});
    if(t===0){result.tool=copy(source.tool||source.pose);result.pose=result.tool;result.grip=copy(source.grip);result.food=copy(source.food);result.mushroomMove=copy(d);result.tongs=copy(source.tongs);['left','right'].forEach(function(side){result.handPoses[side]=handPresentation(source,side);});}
    return result;
  }
  function lidApproachDuration(source){return source.lid&&source.lid.attached&&source.lid.contact>=1?0:1000;}
  function lidReturnDuration(source){return 3000+lidApproachDuration(source);}
  function panApproach(source){return source.panTransport&&source.panTransport.attached&&source.panTransport.contact>=1?0:.3;}
  function panReturnDuration(source){return panApproach(source)?4100:3200;}
  function returnPan(source,t,options){
    var d=source.panTransport,origin=copy(d.origin),reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),destination=parkedPose(panPose({placement:d.from,fromPlacement:d.from,phase:'ready',reducedMotion:reduced}));destination.panTransport.target=copy(d.target);destination.panTransport.to=d.to;
    if(t===1||options.reducedMotion===true)return destination;
    var initial=source.tool||source.pose,a=panApproach(source),scale=1+a,approachEnd=a/scale,liftEnd=(a+.12)/scale,carryEnd=(a+.4)/scale,lowerEnd=(a+.52)/scale,releaseEnd=(a+.6)/scale,joining=approachEnd?parkEase(t/approachEnd):1,lift=parkEase((t-approachEnd)/(liftEnd-approachEnd)),carry=parkEase((t-liftEnd)/(carryEnd-liftEnd)),lower=parkEase((t-carryEnd)/(lowerEnd-carryEnd)),release=parkEase((t-lowerEnd)/(releaseEnd-lowerEnd)),withdraw=parkEase((t-releaseEnd)/(1-releaseEnd)),clearance=Math.min(285,initial.y),tool,contact=1,attached=true,stage;
    if(t<approachEnd){tool=copy(initial);stage='pan-reach';contact=d.contact+(1-d.contact)*parkEase((t/approachEnd-.9)/.1);attached=d.attached;}
    else if(t<liftEnd){tool=point(initial.x,initial.y+(clearance-initial.y)*lift);stage='pan-lift';}
    else if(t<carryEnd){tool=point(initial.x+(origin.x-initial.x)*carry,clearance-10*Math.pow(Math.sin(PI*carry),2));stage='pan-carry';}
    else if(t<lowerEnd){tool=point(origin.x,clearance+(origin.y-clearance)*lower);stage='pan-lower';}
    else{tool=copy(origin);stage=t<releaseEnd?'pan-release':'empty-return';contact=1-release;attached=release<1;}
    tool.visible=true;var h=panHands(tool),sourceHands=hands(source),rest=panRestHands(),points={},wrists={};
    ['left','right'].forEach(function(side){var movement=t<approachEnd?parkEase(t/(approachEnd*.9)):withdraw,from=t<approachEnd?sourceHands[side]:h[side],to=t<approachEnd?h[side]:rest[side],p=t<approachEnd||t>=releaseEnd?blendPoint(from,to,movement):copy(h[side]),distance=Math.hypot(to.x-from.x,to.y-from.y);if(t<approachEnd||t>=releaseEnd)p.y-=Math.min(16,distance*.06)*Math.pow(Math.sin(PI*movement),2);points[side]=p;var restAngle=arm({side:side,hand:rest[side]}).wristAngle+90;wrists[side]=t<approachEnd?angleBlend(handPresentation(source,side).rotation,90,joining):angleBlend(90,restAngle,withdraw);});
    var travel=parkEase(t),body=blendBody(source.body,destination.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,destination.gaze,travel);delete gaze.angle;gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze&&destination.gaze.target,travel);
    var result={kind:'movePan',parkedKind:'movePan',phase:'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:points.right,supportHand:points.left,targetGrip:null,next:null,spout:null,held:attached,parking:true,parkStage:stage,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,destination.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},panSurface:{x:tool.x,y:tool.y,rx:110,ry:34},panTransport:{origin:origin,target:copy(d.target),position:point(tool.x,tool.y,0),from:d.from,to:d.to,preview:true,attached:attached,contact:contact,lift:clamp(350-tool.y,0,75),joining:1,withdraw:withdraw,wrists:wrists}};
    if(t===0){result.panTransport=copy(d);result.tool=copy(initial);result.pose=result.tool;}
    return result;
  }
  function returnLid(source,t,options){
    var descriptor=source.lid,origin=copy(descriptor.origin),destination=parkedPose(lidPose({placement:descriptor.from,fromPlacement:descriptor.from,phase:'ready',reducedMotion:!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0)}));
    destination.lid.target=copy(descriptor.target);destination.lid.to=descriptor.to;
    if(t===1||options.reducedMotion===true)return destination;
    var initial=source.tool||source.pose,approachWeight=lidApproachDuration(source)?.25:0,scale=approachWeight+.78,approachEnd=approachWeight/scale,liftEnd=(approachWeight+.08)/scale,levelEnd=(approachWeight+.18)/scale,carryEnd=(approachWeight+.31)/scale,lowerEnd=(approachWeight+.41)/scale,releaseEnd=(approachWeight+.41+(descriptor.from==='rest'?.06:.13))/scale,stage,tool;
    var approach=approachEnd?parkEase(t/approachEnd):1,lift=parkEase((t-approachEnd)/(liftEnd-approachEnd)),level=parkEase((t-liftEnd)/(levelEnd-liftEnd)),carry=parkEase((t-levelEnd)/(carryEnd-levelEnd)),lower=parkEase((t-carryEnd)/(lowerEnd-carryEnd)),release=parkEase((t-lowerEnd)/(releaseEnd-lowerEnd)),withdraw=parkEase((t-releaseEnd)/(1-releaseEnd)),clearance=Math.min(250,initial.y),contact=1,attached=true;
    if(t<approachEnd){stage='lid-reach';tool=copy(initial);contact=descriptor.contact+(1-descriptor.contact)*parkEase((t/approachEnd-.9)/.1);attached=descriptor.attached;}
    else if(t<liftEnd){stage='lid-lift';tool=point(initial.x,initial.y+(clearance-initial.y)*lift,initial.angle);var initialContact=approachEnd?1:finite(descriptor.contact,1);contact=initialContact+(1-initialContact)*lift;}
    else if(t<levelEnd){stage='lid-level';tool=point(initial.x,clearance,angleBlend(initial.angle,0,level));}
    else if(t<carryEnd){stage='lid-carry';tool=point(initial.x+(origin.x-initial.x)*carry,clearance-10*Math.pow(Math.sin(PI*carry),2),0);}
    else if(t<lowerEnd){stage='lid-lower';tool=point(origin.x,clearance+(origin.y-clearance)*lower,origin.angle*lower);}
    else{stage=t<releaseEnd?'lid-release':'empty-return';tool=copy(origin);contact=1-release;attached=release<1;}
    tool.visible=true;var hand=grip(tool,'moveLid');
    if(t<approachEnd){var arriving=parkEase(t/(approachEnd*.9)),distance=Math.hypot(source.grip.x-initial.x,source.grip.y-initial.y);hand=blendPoint(source.grip,grip(initial,'moveLid'),arriving);hand.y-=Math.min(16,distance*.06)*Math.pow(Math.sin(PI*arriving),2);}
    else if(t>=releaseEnd){hand=blendPoint(grip(tool,'moveLid'),destination.grip,withdraw);hand.y-=16*Math.pow(Math.sin(PI*withdraw),2);}
    var travel=parkEase(t),body=blendBody(source.body,destination.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,destination.gaze,travel);delete gaze.angle;gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze&&destination.gaze.target,travel);
    var startingWrist=handPresentation(source,'right').rotation,wrist=t<approachEnd?angleBlend(startingWrist,initial.angle+90,approach):t<liftEnd?angleBlend(approachEnd?initial.angle+90:startingWrist,tool.angle+90,lift):t<lowerEnd?tool.angle+90:angleBlend(tool.angle+90,185,release);
    var result={kind:'moveLid',parkedKind:'moveLid',phase:'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:hand,supportHand:blendPoint(source.supportHand,destination.supportHand,travel),targetGrip:null,next:null,spout:null,held:attached,parking:true,parkStage:stage,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,destination.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},lid:{origin:origin,target:copy(descriptor.target),position:point(tool.x,tool.y,tool.angle),from:descriptor.from,to:descriptor.to,preview:true,attached:attached,held:attached,contact:contact,wristRotation:wrist}};
    if(t===0&&!Object.prototype.hasOwnProperty.call(descriptor,'wristRotation'))delete result.lid.wristRotation;
    return result;
  }
  // A rehearsal cannot leave a food piece in the air or silently turn it. Keep
  // the jaws attached while clearing and unrolling, replace it, then return
  // empty tongs. The actual pan face/state remains owned by explicit commit.
  function returnMushroom(source,target,t){
    var initial=source.tool||source.pose,home=target.tool||target.pose,food=source.food,origin=food.origin,clearance=origin.y-24,lift=parkEase(t/.16),unroll=parkEase((t-.16)/.16),lower=parkEase((t-.32)/.16),open=parkEase((t-.48)/.12),carry=parkEase((t-.6)/.34),release=parkEase((t-.94)/.06),travel=parkEase(t/.94),tool;
    if(t<.16)tool=point(initial.x,initial.y+(clearance-initial.y)*lift,initial.angle);
    else if(t<.32)tool=point(initial.x,clearance,angleBlend(initial.angle,0,unroll));
    else if(t<.48)tool=point(initial.x+(origin.x-initial.x)*lower,clearance+(origin.y-clearance)*lower,0);
    else if(t<.6)tool=point(origin.x,origin.y,0);
    else if(t<.94)tool=point(origin.x+(home.x-origin.x)*carry,origin.y+(home.y-origin.y)*carry-35*Math.pow(Math.sin(PI*carry),2),angleBlend(0,home.angle,carry));
    else tool=copy(home);
    tool.visible=true;
    var result=copy(source),body=blendBody(source.body,target.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,target.gaze,travel),closure=(finite(source.tongs&&source.tongs.closure,1)+(1-finite(source.tongs&&source.tongs.closure,1))*lift)*(1-open),roll=finite(food.roll,0)*(1-unroll),preview=t<.6;
    gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,travel);
    result.kind='turnMushroom';result.parkedKind='turnMushroom';result.phase='parking';result.nextPhase=null;result.tool=tool;result.pose=tool;result.activeHand='left';result.grip=grip(tool,'turnMushroom');result.supportHand=blendPoint(source.supportHand,target.supportHand,travel);result.targetGrip=null;result.next=null;result.held=true;result.parking=true;result.parkStage=t<.16?'food-lift':t<.32?'food-unroll':t<.48?'food-lower':t<.6?'food-release':t<.94?'carry':'release';result.reaching=false;result.eased=parkEase(t);result.progress=t*100;result.body=body;result.head=blendBody(source.head,target.head,travel,{x:450,y:181});result.gaze=gaze;result.shoulders={left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)};
    result.tongs={closure:closure,roll:roll};result.food={piece:food.piece,origin:copy(origin),position:preview?{x:tool.x,y:tool.y}:copy(origin),preview:preview,attached:preview,lift:preview?clamp(origin.y-tool.y,0,24):0,roll:roll};delete result.contact;result.handPoses={};
    ['left','right'].forEach(function(side){var start=handPresentation(source,side),finish=handPresentation(target,side),h=copy(start),working=side==='left',anchor=working?result.grip:result.supportHand;h.anchor={x:anchor.x,y:anchor.y};h.rotation=working?tool.angle+(start.rotation-initial.angle):angleBlend(start.rotation,finish.rotation,travel);h.closure=(working?.64+.3*closure:start.closure)*(1-release)+.18*release;h.pressure=0;h.contact=1-release;h.role=release===1?'free':working?'working':'stabilizing';result.handPoses[side]=h;});
    return result;
  }
  // A canceled action is already absent from the cooking model. This optional
  // presentation carries its existing tool home before releasing the fingers.
  // The UI retains the returned parked pose so the hands do not snap to idle.
  function bundleAtRest(source,target){var a=source.tool||source.pose,b=target.tool||target.pose;return a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<1e-8&&Math.abs(a.angle-b.angle)<1e-8;}
  function returnBundle(source,target,t){
    var initial=source.tool||source.pose,home=target.tool||target.pose,destination=parkedPose(target),d=source.pastaInteraction,startBowl=rotateOffset(initial,{x:0,y:7}),homeBowl=rotateOffset(home,{x:0,y:7}),atRest=bundleAtRest(source,target),clearance=Math.min(startBowl.y,292),rise=parkEase(t/.28),carry=parkEase((t-.28)/.44),lower=parkEase((t-.72)/.2),release=atRest?parkEase(t):parkEase((t-.92)/.08),travel=parkEase(t),tool,stage;
    if(atRest){tool=copy(home);stage='release';}
    else if(t<.28){tool=spoonAtBowl(startBowl.x,startBowl.y+(clearance-startBowl.y)*rise,initial.angle);stage='lift';}
    else if(t<.72){tool=spoonAtBowl(startBowl.x+(homeBowl.x-startBowl.x)*carry,clearance-6*Math.pow(Math.sin(PI*carry),2),angleBlend(initial.angle,home.angle,carry));stage='carry';}
    else if(t<.92){tool=spoonAtBowl(homeBowl.x,clearance+(homeBowl.y-clearance)*lower,home.angle);stage='lower';}
    else{tool=copy(home);stage='release';}
    var spoonContact=finite(source.spoonGrip,1)*(1-release),body=blendBody(source.body,destination.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,destination.gaze,travel);gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze&&destination.gaze.target,travel);tool.visible=spoonContact>0;
    var result={kind:'separatePasta',parkedKind:'separatePasta',phase:'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:grip(tool,'separatePasta'),supportHand:blendPoint(source.supportHand,destination.supportHand,travel),targetGrip:null,next:null,spout:null,held:spoonContact>0,spoonGrip:spoonContact,parking:true,parkStage:stage,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,destination.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},pastaInteraction:bundleInteraction(d.group,d.target,tool,d.contact*(1-rise),d.sweep),handPoses:{}};
    ['left','right'].forEach(function(side){var h=handPresentation(source,side),hand=side==='right'?result.grip:result.supportHand;h.anchor={x:hand.x,y:hand.y};if(side==='right')h.rotation=tool.angle;h.closure=h.closure*(1-release)+.18*release;h.contact*=1-release;h.pressure=0;if(release===1)h.role='free';result.handPoses[side]=h;});
    if(t===0){result.tool=copy(initial);result.pose=result.tool;result.grip=copy(source.grip);result.pastaInteraction=copy(d);}
    return result;
  }
  function returnCut(source,target,t){
    var initial=source.tool||source.pose,home=target.tool||target.pose,d=source.cutInteraction,destination=parkedPose(target),atRest=bundleAtRest(source,target),rise=parkEase(t/.22),carry=parkEase((t-.22)/.44),lower=parkEase((t-.66)/.18),release=atRest?parkEase(t):parkEase((t-.84)/.16),open=atRest?release:parkEase((t-.22)/.12),withdraw=atRest?parkEase(t):parkEase((t-.34)/.5),travel=parkEase(t),clearance=Math.min(initial.y,306),tool,stage;
    if(atRest){tool=copy(home);stage='release';}else if(t<.22){tool=point(initial.x,initial.y+(clearance-initial.y)*rise,initial.angle);stage='lift';}else if(t<.66){tool=point(initial.x+(home.x-initial.x)*carry,clearance-6*Math.pow(Math.sin(PI*carry),2),angleBlend(initial.angle,home.angle,carry));stage='carry';}else if(t<.84){tool=point(home.x,clearance+(home.y-clearance)*lower,home.angle);stage='lower';}else{tool=copy(home);stage='release';}
    var knifeContact=finite(source.knifeGrip,1)*(1-release),supportPoint=blendPoint(source.supportHand,target.supportHand,withdraw),body=blendBody(source.body,destination.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,destination.gaze,travel);supportPoint.y-=10*Math.pow(Math.sin(PI*withdraw),2);gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze&&destination.gaze.target,travel);tool.visible=knifeContact>0;
    var result={kind:'sliceProduce',parkedKind:'sliceProduce',phase:'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:grip(tool,'sliceProduce'),supportHand:supportPoint,targetGrip:null,next:null,spout:null,held:knifeContact>0,knifeGrip:knifeContact,parking:true,parkStage:stage,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,destination.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},cutInteraction:cutInteraction(d,tool,d.contact*(1-rise),d.braced*(1-open),d.cutProgress),handPoses:{}};
    ['left','right'].forEach(function(side){var h=handPresentation(source,side),e=handPresentation(destination,side),hand=side==='right'?result.grip:result.supportHand,opening=side==='right'?release:open;h.anchor={x:hand.x,y:hand.y};h.rotation=side==='right'?tool.angle:angleBlend(h.rotation,e.rotation,withdraw);h.closure=h.closure*(1-opening)+.18*opening;h.contact*=1-opening;h.pressure=0;if(opening===1)h.role='free';if(side==='left'&&withdraw===1)h.gesture='relaxed';result.handPoses[side]=h;});
    if(t===0){result.tool=copy(initial);result.pose=result.tool;result.grip=copy(source.grip);result.cutInteraction=copy(d);}
    return result;
  }
  function park(fromPose,toParkPose,progress,options){
    var source=fromPose||{},kind=source.kind||source.transitionKind||'inspect',target=toParkPose||pose({kind:kind,phase:'ready'}),destination=parkedPose(target),o=options||{},t=clamp(finite(progress,0)/100,0,1);
    if(kind==='moveLid'&&source.lid&&source.lid.preview)return returnLid(source,t,o);
    if(kind==='movePan'&&source.panTransport&&source.panTransport.preview)return returnPan(source,t,o);
    if(kind==='moveMushroom'&&source.mushroomMove)return returnMovedMushroom(source,target,t,o);
    if(t===1||o.reducedMotion===true)return destination;
    if(!source.held||!source.kind){var empty=reach(source,destination,t*100);empty.parking=true;empty.parkedKind=target.kind;empty.parkStage='empty-return';empty.reaching=false;empty.next=null;empty.targetGrip=null;return empty;}
    if(kind==='separatePasta'&&source.pastaInteraction)return returnBundle(source,target,t);
    if(kind==='sliceProduce'&&source.cutInteraction)return returnCut(source,target,t);
    if(kind==='turnMushroom'&&source.food&&source.food.preview)return returnMushroom(source,target,t);
    var initial=source.tool||source.pose,home=target.tool||target.pose;
    if(!initial||!home)return destination;
    var levelAngle=['pour','serve','return','wring','addDry','returnDry','addPasta','reserveWater','drainPasta'].includes(kind)?0:initial.angle;
    var levelEnd=Math.abs(levelAngle-initial.angle)>.001?.34:.16,lift=parkEase(t/.14),level=parkEase((t-.14)/(levelEnd-.14)),carry=parkEase((t-levelEnd)/(.76-levelEnd)),lower=parkEase((t-.76)/.14),release=parkEase((t-.9)/.1),travel=parkEase(t/.9),clearance=Math.min(initial.y,home.y,310),tool;
    if(t<.14)tool=point(initial.x,initial.y+(clearance-initial.y)*lift,initial.angle);
    else if(t<levelEnd)tool=point(initial.x,clearance,angleBlend(initial.angle,levelAngle,level));
    else if(t<.76)tool=point(initial.x+(home.x-initial.x)*carry,clearance-12*Math.pow(Math.sin(PI*carry),2),levelAngle);
    else if(t<.9)tool=point(home.x,clearance+(home.y-clearance)*lower,angleBlend(levelAngle,home.angle,lower));
    else tool=copy(home);
    tool.visible=true;
    var active=source.activeHand==='left'?'left':'right',other=active==='left'?'right':'left',fromHands=hands(source),toHands=hands(target),fromArt={left:handPresentation(source,'left'),right:handPresentation(source,'right')},toArt={left:handPresentation(target,'left'),right:handPresentation(target,'right')},supportHand=blendPoint(fromHands[other],toHands[other],travel);
    var bilateral=kind==='addPasta'||kind==='drainPasta',clothJoined=kind==='wring'&&fromArt[other].contact===1&&Math.hypot(fromHands[other].x-rotateOffset(initial,{x:-25,y:0}).x,fromHands[other].y-rotateOffset(initial,{x:-25,y:0}).y)<.001;
    if(bilateral)supportHand=rotateOffset(tool,{x:kind==='addPasta'?-60:-100,y:kind==='addPasta'?0:-8});
    else if(clothJoined){var joined=t<=levelEnd?rotateOffset(tool,{x:-25,y:0}):point(initial.x-25,clearance);supportHand=blendPoint(joined,toHands[other],carry);supportHand.y-=6*Math.pow(Math.sin(PI*carry),2);}
    var body=blendBody(source.body,target.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,target.gaze,travel);gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,travel);
    var result={kind:kind,parkedKind:kind,phase:'parking',nextPhase:null,tool:tool,pose:tool,activeHand:active,grip:grip(tool,kind),supportHand:supportHand,targetGrip:null,next:null,held:true,parking:true,parkStage:t<.14?'lift':t<levelEnd?'level':t<.76?'carry':t<.9?'lower':'release',reaching:false,eased:parkEase(t),progress:t*100,body:body,head:blendBody(source.head,target.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},handPoses:{}};
    if(source.spout){var spoutOffset=kind==='pour'?{x:-42,y:-38}:kind==='addDry'?{x:0,y:-40}:kind==='returnDry'||kind==='reserveWater'?{x:0,y:7}:kind==='addPasta'?{x:70,y:10}:kind==='drainPasta'?{x:88,y:-6}:null;if(spoutOffset)result.spout=rotateOffset(tool,spoutOffset);}
    if(source.cloth)result.cloth={compression:finite(source.cloth.compression,0)*(1-parkEase(t/levelEnd)),twist:kind==='wring'?tool.angle/12:0,dripping:false};
    if(kind==='turnMushroom'){result.tongs={closure:finite(source.tongs&&source.tongs.closure,0)*(1-lift),roll:finite(source.tongs&&source.tongs.roll,0)*(1-lift)};if(source.food){result.food=copy(source.food);result.food.position=copy(result.food.origin);result.food.preview=false;result.food.attached=false;result.food.lift=0;result.food.roll=result.tongs.roll;}}
    ['left','right'].forEach(function(side){
      var working=side===active,start=fromArt[side],end=toArt[side],h=copy(start),hand=working?result.grip:supportHand;
      h.anchor={x:hand.x,y:hand.y};h.pressure=start.pressure*(1-lift);h.closure=(start.closure+(end.closure-start.closure)*lift)*(1-release)+.18*release;h.contact=(start.contact+(end.contact-start.contact)*lift)*(1-release);h.role=release===1?'free':working?'working':start.role;
      if(working||bilateral)h.rotation=tool.angle+(start.rotation-initial.angle);
      else if(clothJoined){h.rotation=angleBlend(tool.angle+90,end.rotation,carry);h.closure=(start.closure+(end.closure-start.closure)*carry)*(1-release)+.18*release;h.contact=t<=levelEnd?start.contact:0;h.role=carry>0?'free':'stabilizing';}
      else h.rotation=angleBlend(start.rotation,end.rotation,travel);
      result.handPoses[side]=h;
    });
    return result;
  }
  function parkDuration(fromPose,toParkPose){var source=fromPose||{},target=toParkPose||pose({kind:source.kind||source.transitionKind||'inspect',phase:'ready'});if(source.kind==='moveMushroom'&&source.mushroomMove)return Math.round(moveReturnPlan(source,target).total*2200);if(source.kind==='moveLid'&&source.lid&&source.lid.preview)return lidReturnDuration(source);if(source.kind==='movePan'&&source.panTransport&&source.panTransport.preview)return panReturnDuration(source);if(!source.held)return reachDuration(source,target);if(source.kind==='separatePasta'&&source.pastaInteraction)return bundleAtRest(source,target)?280:1800;if(source.kind==='sliceProduce'&&source.cutInteraction)return bundleAtRest(source,target)?280:2100;if(source.kind==='turnMushroom'&&source.food&&source.food.preview)return 2400;var a=source.tool||source.pose,b=target.tool||target.pose,distance=a&&b?Math.hypot(b.x-a.x,b.y-a.y):0;return Math.round(clamp(800+distance*.9,800,1300));}
  function rounded(value){return String(Number(value.toFixed(3)));}
  function path(a,b){return 'M'+rounded(a.x)+' '+rounded(a.y)+' L'+rounded(b.x)+' '+rounded(b.y);}
  function arm(options){
    var o=options||{},side=o.side==='left'?'left':'right',givenShoulder=o.shoulder||{},givenHand=o.hand||neutral[side];
    var shoulder=point(finite(givenShoulder.x,side==='left'?373:526),finite(givenShoulder.y,229)),hand=point(finite(givenHand.x,neutral[side].x),finite(givenHand.y,neutral[side].y));
    var dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.hypot(dx,dy),maximum=UPPER+LOWER-0.001;
    var requestedDistance=d;
    if(d>maximum){var scale=maximum/d;dx*=scale;dy*=scale;d=maximum;hand=point(shoulder.x+dx,shoulder.y+dy);}
    // Hands work forward of the chest. Solving the bones in that depth plane
    // naturally shortens their on-screen projection instead of folding a long
    // forearm beside the face. Depth tapers smoothly as an arm reaches outward.
    var depth=Math.min(100,Math.sqrt(Math.max(0,maximum*maximum-d*d))*.65),reach=Math.hypot(d,depth);
    var unit={x:dx/reach,y:dy/reach,z:depth/reach},pole={x:side==='left'?-.65:.65,y:1,z:0};
    var dot=pole.x*unit.x+pole.y*unit.y,bend={x:pole.x-dot*unit.x,y:pole.y-dot*unit.y,z:-dot*unit.z},norm=Math.hypot(bend.x,bend.y,bend.z);
    if(norm<1e-8){bend={x:0,y:0,z:1};norm=1;}
    var along=(UPPER*UPPER+reach*reach-LOWER*LOWER)/(2*reach),height=Math.sqrt(Math.max(0,UPPER*UPPER-along*along));
    var elbow={x:shoulder.x+along*unit.x+height*bend.x/norm,y:shoulder.y+along*unit.y+height*bend.y/norm,z:along*unit.z+height*bend.z/norm};
    hand.z=depth;
    var forearm=Math.atan2(hand.y-elbow.y,hand.x-elbow.x)*180/PI;
    return {upperPath:path(shoulder,elbow),lowerPath:path(elbow,hand),upper:path(shoulder,elbow),lower:path(elbow,hand),elbow:elbow,hand:hand,wristAngle:forearm,reachable:requestedDistance<=maximum+.002,lengths:{upper:UPPER,lower:LOWER},projection:'orthographic-depth'};
  }
  // The same rendered centerlines gain a tapered sleeve, forearm and joint
  // details. No bone, wrist, tool, collision envelope or cooking state moves.
  function armContours(value){
    var a=value||arm({}),numbers=function(s){return String(s||'').match(/-?\d+(?:\.\d+)?/g)||[];},upper=numbers(a.upperPath||a.upper),lower=numbers(a.lowerPath||a.lower),at=function(values,index,fallback){var n=Number(values[index]);return values[index]!==undefined&&Number.isFinite(n)?n:fallback;},shoulder={x:at(upper,0,526),y:at(upper,1,229)},elbow={x:at(upper,2,finite(a.elbow&&a.elbow.x,526)),y:at(upper,3,finite(a.elbow&&a.elbow.y,300))},wrist={x:at(lower,2,finite(a.hand&&a.hand.x,585)),y:at(lower,3,finite(a.hand&&a.hand.y,350))},vertices=[];
    function coord(p){vertices.push(p);return rounded(p.x)+' '+rounded(p.y);}
    function offset(p,u,v){return {x:p.x+u.x*v,y:p.y+u.y*v};}
    function axes(p,q){var dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);return length>1e-6?{u:{x:dx/length,y:dy/length},n:{x:-dy/length,y:dx/length},length:length}:{u:{x:0,y:1},n:{x:-1,y:0},length:0};}
    function shape(p,q,r0,r1){var ax=axes(p,q),n=ax.n,u=ax.u,m={x:p.x+(q.x-p.x)*.38,y:p.y+(q.y-p.y)*.38},bulge=(r0*.62+r1*.38)*1.04;return 'M'+coord(offset(p,n,r0))+' Q'+coord(offset(m,n,bulge))+' '+coord(offset(q,n,r1))+' Q'+coord(offset(q,u,Math.min(r1*.55,ax.length*.15)))+' '+coord(offset(q,n,-r1))+' Q'+coord(offset(m,n,-bulge))+' '+coord(offset(p,n,-r0))+' Q'+coord(offset(p,u,-Math.min(r0*.55,ax.length*.15)))+' '+coord(offset(p,n,r0))+'Z';}
    var sleevePath=shape(shoulder,elbow,18,13.5),forearmPath=shape(elbow,wrist,11.5,8.5),ua=axes(shoulder,elbow),fa=axes(elbow,wrist),cuffCenter=offset(elbow,ua.u,-4),creaseCenter=offset(elbow,fa.u,9),cuffPath='M'+coord(offset(cuffCenter,ua.n,-12))+' Q'+coord(offset(elbow,ua.u,1))+' '+coord(offset(cuffCenter,ua.n,12)),elbowPath='M'+coord(offset(creaseCenter,fa.n,-6))+' Q'+coord(offset(creaseCenter,fa.u,2))+' '+coord(offset(creaseCenter,fa.n,6));
    return {sleevePath:sleevePath,forearmPath:forearmPath,cuffPath:cuffPath,elbowPath:elbowPath,shoulder:shoulder,elbow:elbow,wrist:wrist,widths:{shoulder:36,cuff:27,elbow:23,wrist:17},bounds:{minX:Math.min.apply(null,vertices.map(function(p){return p.x;})),maxX:Math.max.apply(null,vertices.map(function(p){return p.x;})),minY:Math.min.apply(null,vertices.map(function(p){return p.y;})),maxY:Math.max.apply(null,vertices.map(function(p){return p.y;}))}};
  }
  var api={pose:pose,keyframe:keyframe,grip:grip,arm:arm,armContours:armContours,ease:ease,neutral:neutral,transitionDuration:transitionDuration,reach:reach,reachDuration:reachDuration,handPresentation:handPresentation,sauceInteraction:sauceInteraction,park:park,parkDuration:parkDuration};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.KitchenAvatarMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
