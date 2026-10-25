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
  function grip(tool,kind){return rotateOffset(tool,kind==='combinePasta'?{x:70,y:-8}:kind==='loadMushrooms'?{x:65,y:-8}:kind==='rinseProduce'?{x:76,y:-8}:kind==='pour'?{x:43,y:5}:kind==='mince'?{x:116,y:0}:kind==='sliceProduce'?{x:20,y:-66}:kind==='wring'?{x:25,y:0}:kind==='addDry'?{x:10,y:-40}:kind==='addPasta'?{x:60,y:0}:kind==='drainPasta'?{x:100,y:-8}:kind==='movePan'?{x:185,y:-4}:kind==='finish'||kind==='finishCuts'||kind==='blot'||kind==='waitPan'||kind==='setPanHeat'||kind==='moveLid'||kind==='waitPot'||kind==='setPotHeat'?{x:0,y:0}:{x:0,y:-66});}
  function keyframe(kind,phase,options){
    var o=options||{},plate=optionIndex(o.plate===undefined?o.plateIndex:o.plate),clove=optionIndex(o.clove),x=plate?720:285,tip=clove?465:405,piece=itemIndex(o.piece,13),area=itemIndex(o.area,7),px=420+(piece%7)*28,py=341+Math.floor(piece/7)*16,bx=o.activity==='rinse-and-dry-produce'?415+(area%4)*40:355+(area%4)*70,by=335+Math.floor(area/4)*23,poses;
    if(o.portionAware===true&&(kind==='serve'||kind==='return'))return servingKeyframe(kind,phase,o);
    if(o.sampleAware===true&&kind==='samplePasta')return samplingKeyframe(phase,o);
    if(o.clothAware===true&&kind==='wring')return point(phase==='pickup'||phase==='ready'?620:300,phase==='pickup'||phase==='ready'?336:306);
    if(o.pressAware===true&&kind==='press')return phase==='pickup'||phase==='ready'?point(300,324,-14):point(px,phase==='contact'?py-5:phase==='press'?py+2:phase==='lift'?286:306);
    if(o.foldAware===true&&kind==='fold')return foldingKeyframe(phase,foldingGeometry(o));
    if(o.ladleAware===true&&kind==='reserveWater')return ladleKeyframe(phase,ladleGeometry(o));
    if(o.activity==='finish-pasta-in-sauce'&&kind==='pour'&&(phase==='pickup'||phase==='ready'))return point(110,290,0);
    if(thermal(o)&&(kind==='inspect'||kind==='fold')){if(phase==='pickup'||phase==='ready')return point(140,375,90);var original=keyframe(kind,phase,{}),at=panAnchor(o.panPlacement);return point(at.x+(original.x-514)*110/132,at.y+original.y-349,original.angle);}
    if(kind==='combinePasta')poses={pickup:[270,340,0],grip:[270,340,0],lift:[270,260,0],carry:[480,260,0],lower:[480,280,0],tilt:[480,280,28],ready:[480,280,28]};
    else if(kind==='loadMushrooms')poses={pickup:[270,340,0],grip:[270,340,0],lift:[270,275,0],carry:[450,275,0],lower:[450,292,0],tilt:[450,292,25],ready:[450,292,25]};
    else if(kind==='rinseProduce')poses={pickup:[450,340,0],carry:[300,278,0],lower:[300,330,0],rinse:[300,330,0],lift:[300,278,0],drain:[300,278,0],return:[450,278,0],tip:[450,314,32],ready:[450,314,32]};
    else if(kind==='pour')poses={pickup:[230,318,0],measure:[310,294,0],position:[445,282,0],tilt:[462,289,-58],level:[462,285,0],ready:[230,318,0]};
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
    else if(kind==='setPotHeat'){var initial=-60+40*itemIndex(o.initialSetting,3),chosen=-60+40*itemIndex(o.setting,3),knobY=o.activity==='cook-save-and-drain-pasta'?285:375;poses={pickup:[585,390,initial],reach:[650,knobY,initial],adjust:[650,knobY,chosen],ready:[585,390,chosen]};}
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
  function transitionDuration(kind,phase,next,options){
    if(kind==='wring'&&options&&options.clothAware===true)return !next?0:({pickup:1900,carry:1550,twist:900,release:2200}[phase]||700);
    if(kind==='press'&&options&&options.pressAware===true)return !next?0:({pickup:1600,position:850,contact:1150,press:1050,lift:1600}[phase]||700);
    if(kind==='fold'&&options&&options.foldAware===true)return !next?0:({pickup:1900,immerse:1650,across:1500,turn:2050}[phase]||700);
    if(kind==='reserveWater'&&options&&options.ladleAware===true)return !next?0:({pickup:2450,dip:1450,lift:2050,carry:1050,tip:850,level:850}[phase]||700);
    if(kind==='combinePasta'){var combineSteps={pickup:1050,grip:1100,lift:1600,carry:900,lower:1150,tilt:450};return !next?0:combineSteps[phase]||750;}
    if(kind==='loadMushrooms'){var loadSteps={pickup:1000,grip:1000,lift:1500,carry:850,lower:1100,tilt:450};return !next?0:loadSteps[phase]||750;}
    if(kind==='rinseProduce'){var rinseSteps={pickup:1500,carry:850,lower:1650,rinse:1000,lift:1400,drain:1350,return:1200,tip:450};return !next?0:rinseSteps[phase]||700;}
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
    if(o.portionAware===true&&(kind==='serve'||kind==='return'))return servingPose(o);
    if(o.sampleAware===true&&kind==='samplePasta')return samplingPose(o);
    if(o.clothAware===true&&kind==='wring')return wringPose(o);
    if(o.pressAware===true&&kind==='press')return pressPose(o);
    if(o.foldAware===true&&kind==='fold')return foldingPose(o);
    if(o.ladleAware===true&&kind==='reserveWater')return ladlePose(o);
    if(kind==='moveLid')return lidPose(o);
    if(kind==='movePan')return panPose(o);
    if(kind==='separatePasta')return bundlePose(o);
    if(kind==='sliceProduce')return cutPose(o);
    if(kind==='moveMushroom')return moveMushroomPose(o);
    if(kind==='rinseProduce')return rinsePose(o);
    if(kind==='loadMushrooms')return loadPose(o);
    if(kind==='combinePasta')return combinePose(o);
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
    if(kind==='press'||kind==='blot')data.contact={x:kind==='press'?420+(itemIndex(o.piece,13)%7)*28:o.activity==='rinse-and-dry-produce'?415+(itemIndex(o.area,7)%4)*40:355+(itemIndex(o.area,7)%4)*70,y:kind==='press'?341+Math.floor(itemIndex(o.piece,13)/7)*16:335+Math.floor(itemIndex(o.area,7)/4)*23,amount:kind==='press'?(phase==='contact'?u:phase==='press'?1-u:0):(phase==='position'?u:phase==='contact'?1-u:0)};
    if(kind==='turnMushroom'){
      var origin=mushroomAnchor(o),opening=phase==='lower'&&next==='ready'?parkEase(t/.2):0,closed=phase==='position'&&next==='grip'?parkEase((u-.75)/.25):['grip','lift','turn','lower'].includes(phase)?1-opening:0;
      var attached=phase==='position'&&next==='grip'&&t===1||['grip','lift','turn'].includes(phase)||phase==='lower'&&opening<1;
      var roll=phase==='lift'&&next==='turn'?clamp(u,0,1):phase==='turn'?1:phase==='lower'?1-(next==='ready'?parkEase((t-.2)/.8):0):0;
      data.tongs={closure:closed,roll:roll};data.food={piece:itemIndex(o.piece,13),origin:origin,position:attached?{x:tool.x,y:tool.y}:copy(origin),attached:attached,preview:attached,lift:attached?clamp(origin.y-tool.y,0,24):0,roll:roll};
    }
    if(kind==='setPanHeat'||kind==='setPotHeat')data.knob={contact:phase==='pickup'&&next==='reach'?(t===1?1:parkEase((t-.8)/.2)):phase==='reach'?1:phase==='adjust'?1-(next==='ready'?parkEase(t/.2):0):0,turn:phase==='reach'&&next==='adjust'?clamp(u,0,1):phase==='adjust'||phase==='ready'?1:0};
    if(thermal(o)&&(kind==='inspect'||kind==='fold')){var surface=panAnchor(o.panPlacement);data.panSurface={x:surface.x,y:surface.y,rx:110,ry:34};}
    if(o.clearanceAware===true&&!thermal(o)&&(kind==='fold'||kind==='inspect')&&next&&(phase==='pickup'||next==='ready'||kind==='inspect'&&phase==='dip'&&next==='lift')){
      tool=clearSpoonTool(start,end,t,.25,.75);tool.visible=held;data.tool=tool;data.grip=grip(tool,kind);
    }
    return attention(data,o,next?end:null);
  }
  // The spoon travels by its bowl, so rolling the wrist never disconnects the
  // handle or makes a contact cue follow a different point. Only this optional
  // path uses the standard pan's left helper handle. Sauce remains committed
  // model state: contact and load below are movement cues, not mixing results.
  function foldingGeometry(options){
    var o=options||{},moved=thermal(o),surface=moved?{x:panAnchor(o.panPlacement).x,y:350,rx:110,ry:34}:{x:514,y:349,rx:132,ry:34};
    return {surface:surface,home:moved?point(140,375,90):point(690,350,-32),transitAngle:moved?60:0,acrossAngle:moved?8:18,activeHand:moved?'left':'right',supportAnchor:moved?point(surface.x+185,346):point(358,349),supportAngle:moved?82:-82,restHands:{left:moved?point(210,320):point(320,310),right:moved?point(690,305):point(670,300)}};
  }
  function foldingKeyframe(phase,geometry){
    var s=geometry.surface;
    if(phase==='immerse')return spoonAtBowl(s.x-.58*s.rx,s.y-3,-16);
    if(phase==='across')return spoonAtBowl(s.x+.58*s.rx,s.y+4,geometry.acrossAngle);
    if(phase==='turn')return spoonAtBowl(s.x-.06*s.rx,s.y-16,-38);
    return copy(geometry.home);
  }
  function foldingClearAngle(x,geometry){var home=rotateOffset(geometry.home,{x:0,y:7});return geometry.transitAngle*clamp((geometry.surface.x-x)/(geometry.surface.x-home.x),0,1);}
  function foldingHands(data,spoonContact,supportContact,pressure,workingAngle,supportAngle){
    var active=data.activeHand,other=active==='left'?'right':'left',working=data.grip,supporting=data.supportHand;
    data.handPoses={};
    data.handPoses[active]={anchor:{x:working.x,y:working.y},rotation:finite(workingAngle,data.tool.angle),gesture:spoonContact>0?'wrap':'relaxed',closure:.18+(.68+.1*pressure)*spoonContact,pressure:pressure*spoonContact,contact:spoonContact,role:spoonContact>0?'working':'free',gear:'bare'};
    data.handPoses[other]={anchor:{x:supporting.x,y:supporting.y},rotation:finite(supportAngle,data.folding.geometry.supportAngle),gesture:supportContact>0?'handle':'relaxed',closure:.18+.78*supportContact,pressure:pressure*supportContact*.3,contact:supportContact,role:supportContact>0?'stabilizing':'free',gear:'mitt'};
    return data;
  }
  function foldingData(tool,geometry,phase,next,t,contact,pressure,stage,options){
    var surface=geometry.surface,bowl=rotateOffset(tool,{x:0,y:7}),radius=Math.pow((bowl.x-surface.x)/surface.rx,2)+Math.pow((bowl.y-surface.y)/surface.ry,2),inside=ease((1-radius)/.2);
    contact=clamp(contact,0,1)*inside;pressure=clamp(pressure,0,1)*contact;tool.visible=true;
    var data=attention({kind:'fold',phase:phase,nextPhase:next,tool:tool,activeHand:geometry.activeHand,grip:grip(tool,'fold'),supportHand:copy(geometry.supportAnchor),targetGrip:next?grip(foldingKeyframe(next,geometry),'fold'):null,spout:null,held:true,eased:parkEase(t),progress:t*100,panSurface:copy(surface),folding:{stage:stage,bowl:{x:bowl.x,y:bowl.y},contact:contact,immersion:contact*(.35+.4*pressure),pressure:pressure,spoonContact:1,supportContact:1,supportAnchor:{x:geometry.supportAnchor.x,y:geometry.supportAnchor.y},geometry:copy(geometry),preview:true}},options,null);
    if(!options.reducedMotion){var direction=clamp((bowl.x-surface.x)/surface.rx,-1,1);data.body.x+=direction*pressure*1.5;data.body.y+=pressure*1.2;data.body.angle+=direction*pressure*.8;data.head.y+=pressure*.35;data.shoulders={left:transformPoint({x:373,y:229},data.body),right:transformPoint({x:526,y:229},data.body)};}
    return foldingHands(data,1,1,pressure);
  }
  function foldingPose(options){
    var o=options||{},geometry=foldingGeometry(o),s=geometry.surface,phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),tool=foldingKeyframe(phase,geometry),contact=phase==='immerse'||phase==='across'?1:phase==='turn'?.18:0,pressure=phase==='immerse'||phase==='across'?.18:0,stage=phase,clear=s.y-82;
    var start=rotateOffset(foldingKeyframe(phase,geometry),{x:0,y:7}),end=next?rotateOffset(foldingKeyframe(next,geometry),{x:0,y:7}):start;
    if(phase==='pickup'&&next==='immerse'){
      var enter;
      if(t<.22){var lift=parkEase(t/.22);tool=spoonAtBowl(start.x,start.y+(clear-start.y)*lift,angleBlend(geometry.home.angle,geometry.transitAngle,lift));stage='spoon-lift';}
      else if(t<.72){var carry=parkEase((t-.22)/.5);tool=spoonAtBowl(start.x+(end.x-start.x)*carry,clear-4*Math.pow(Math.sin(PI*carry),2),angleBlend(geometry.transitAngle,-16,carry));stage='spoon-carry';}
      else{enter=parkEase((t-.72)/.28);var y=clear+(end.y-clear)*enter;tool=spoonAtBowl(end.x,y,-16);contact=parkEase((y-(s.y-14))/11);pressure=.18;stage='spoon-enter';}
    }else if(phase==='immerse'&&next==='across'){
      tool=spoonAtBowl(start.x+(end.x-start.x)*u,start.y+(end.y-start.y)*u+10*Math.pow(Math.sin(PI*u),2),angleBlend(-16,geometry.acrossAngle,u));contact=1;pressure=.18+.42*Math.pow(Math.sin(PI*u),2);stage='spoon-sweep';
    }else if(phase==='across'&&next==='turn'){
      tool=spoonAtBowl(start.x+(end.x-start.x)*u,start.y+(end.y-start.y)*u-12*Math.pow(Math.sin(PI*u),2),angleBlend(geometry.acrossAngle,-38,u));contact=1-.82*parkEase(t/.68);pressure=.18*(1-parkEase(t/.65));stage=t<.68?'spoon-fold':'spoon-unload';
    }else if(phase==='turn'&&next==='ready'){
      var clearAngle=foldingClearAngle(start.x,geometry);
      if(t<.25){var rise=parkEase(t/.25);tool=spoonAtBowl(start.x,start.y+(clear-start.y)*rise,angleBlend(-38,clearAngle,rise));contact=.18*(1-parkEase(t/.15));stage='spoon-clear';}
      else if(t<.76){var returning=parkEase((t-.25)/.51);tool=spoonAtBowl(start.x+(end.x-start.x)*returning,clear-4*Math.pow(Math.sin(PI*returning),2),angleBlend(clearAngle,geometry.transitAngle,returning));contact=0;stage='spoon-return';}
      else{var lower=parkEase((t-.76)/.24);tool=spoonAtBowl(end.x,clear+(end.y-clear)*lower,angleBlend(geometry.transitAngle,geometry.home.angle,lower));contact=0;stage='spoon-rest';}
    }
    if(t===1&&next){tool=foldingKeyframe(next,geometry);contact=next==='immerse'||next==='across'?1:next==='turn'?.18:0;pressure=next==='immerse'||next==='across'?.18:0;}
    return foldingData(tool,geometry,phase,next,t,contact,pressure,stage,o);
  }
  // The pan is braced with an insulated grip before the masher moves. Its
  // plate crosses the rim only at a raised transit height; load and unloading
  // stay vertical above the selected piece. Ingredient changes remain model
  // actions, never an effect of this optional movement preview.
  function pressTarget(options){var piece=itemIndex(options&&options.piece,13);return {piece:piece,x:420+piece%7*28,y:341+Math.floor(piece/7)*16};}
  function pressHands(data,toolContact,supportContact,pressure,leftAngle,rightAngle){
    var left=data.grip,right=data.supportHand;
    data.handPoses={left:{anchor:{x:left.x,y:left.y},rotation:finite(leftAngle,data.tool.angle),gesture:toolContact>0?'wrap':'relaxed',closure:.18+(.7+.1*pressure)*toolContact,pressure:pressure*toolContact,contact:toolContact,role:toolContact>0?'working':'free',gear:'bare'},right:{anchor:{x:right.x,y:right.y},rotation:finite(rightAngle,82),gesture:supportContact>0?'handle':'relaxed',closure:.18+.82*supportContact,pressure:pressure*supportContact*.35,contact:supportContact,role:supportContact>0?'stabilizing':'free',gear:'mitt'}};
    return data;
  }
  function pressData(tool,target,phase,next,t,pressure,stage,options){
    tool.visible=true;var data=attention({kind:'press',phase:phase,nextPhase:next,tool:tool,activeHand:'left',grip:grip(tool,'press'),supportHand:point(705,349,-8),targetGrip:next?grip(keyframe('press',next,{pressAware:true,piece:target.piece}),'press'):null,spout:null,held:true,eased:parkEase(t),progress:t*100,contact:{x:target.x,y:target.y,amount:pressure},pressInteraction:{piece:target.piece,target:{x:target.x,y:target.y},foot:{x:tool.x,y:tool.y,rx:25,ry:7},supportAnchor:{x:705,y:349},supportContact:1,toolContact:1,pressure:pressure,stage:stage,preview:true}},options,null);
    if(!options.reducedMotion){data.body.y+=1.6*pressure;data.head.y+=.5*pressure;data.shoulders={left:transformPoint({x:373,y:229},data.body),right:transformPoint({x:526,y:229},data.body)};}
    return pressHands(data,1,1,pressure);
  }
  function pressPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),target=pressTarget(o),tool=keyframe('press',phase,{pressAware:true,piece:target.piece}),pressure=phase==='press'?1:0,stage=phase;
    if(phase==='pickup'&&next==='position'){
      if(t<.26){var lifted=parkEase(t/.26);tool=point(300,324-38*lifted,-14*(1-lifted));stage='masher-lift';}
      else if(t<.76){var carry=parkEase((t-.26)/.5);tool=point(300+(target.x-300)*carry,286-5*Math.pow(Math.sin(PI*carry),2));stage='masher-carry';}
      else{tool=point(target.x,286+20*parkEase((t-.76)/.24));stage='masher-position';}
    }else if(phase==='position'&&next==='contact'){tool=point(target.x,306+(target.y-5-306)*u);stage='masher-contact';}
    else if(phase==='contact'&&next==='press'){pressure=parkEase(t/.78);tool=point(target.x,target.y-5+7*pressure);stage=t<.78?'masher-load':'masher-hold';}
    else if(phase==='press'&&next==='lift'){
      if(t<.25){pressure=1-parkEase(t/.25);tool=point(target.x,target.y-5+7*pressure);stage='masher-unload';}
      else{pressure=0;tool=point(target.x,target.y-5+(286-(target.y-5))*parkEase((t-.25)/.75));stage='masher-clear';}
    }else if(phase==='lift'&&next==='ready'){
      if(t<.66){var returning=parkEase(t/.66);tool=point(target.x+(300-target.x)*returning,286-5*Math.pow(Math.sin(PI*returning),2));stage='masher-return';}
      else{var lowered=parkEase((t-.66)/.34);tool=point(300,286+38*lowered,-14*lowered);stage='masher-rest';}
    }
    if(t===1&&next){tool=keyframe('press',next,{pressAware:true,piece:target.piece});pressure=next==='press'?1:0;}
    return pressData(tool,target,phase,next,t,pressure,stage,o);
  }
  // A wring keeps its two cloth ends in the grips. Only the fabric's middle
  // narrows; the wrists oppose each other instead of rotating a rigid towel.
  // This optional choreography never transfers water or advances kitchen time.
  function wringCloth(tool,twist,water,dripping){
    var amount=clamp(twist,0,1),waist=12-8*amount,n=rounded;
    return {aware:true,compression:amount,twist:amount,dripping:!!dripping&&water>0,waist:waist,
      shapePath:'M-32-10C-22-14-10 '+n(-waist)+' 0 '+n(-waist)+'C10 '+n(-waist)+' 22-14 32-10L32 10C22 14 10 '+n(waist)+' 0 '+n(waist)+'C-10 '+n(waist)+'-22 14-32 10Z',
      weavePath:'M-28-6C-12 '+n(-waist*.55+amount*3)+' 12 '+n(-waist*.55-amount*3)+' 28-6M-29 0C-12 '+n(amount*4)+' 12 '+n(-amount*4)+' 29 0M-28 6C-12 '+n(waist*.55+amount*3)+' 12 '+n(waist*.55-amount*3)+' 28 6M-23-11L-23 11M23-11L23 11M-12 '+n(-waist-1)+'Q'+n(-8+amount*4)+' 0-12 '+n(waist+1)+'M12 '+n(-waist-1)+'Q'+n(8-amount*4)+' 0 12 '+n(waist+1),
      wetPath:'M-17 0Q0 '+n(-waist*1.5)+' 17 0Q0 '+n(waist*1.5)+'-17 0Z'};
  }
  function wringPresentation(data,joining,leftContact,rightContact,twist,leftAngle,rightAngle){
    var left=data.supportHand,right=data.grip,rest=point(220,338),restAngle=arm({side:'left',hand:rest}).wristAngle+90;
    data.handPoses={left:{anchor:{x:left.x,y:left.y},rotation:finite(leftAngle,angleBlend(restAngle,270,joining)-32*twist),gesture:joining>0?'pinch':'relaxed',closure:.18+(.47+.28*twist)*leftContact,pressure:twist*leftContact,contact:leftContact,role:leftContact>0?'stabilizing':'free',gear:'bare'},right:{anchor:{x:right.x,y:right.y},rotation:finite(rightAngle,90+32*twist),gesture:rightContact>0?'pinch':'relaxed',closure:.18+(.47+.28*twist)*rightContact,pressure:twist*rightContact,contact:rightContact,role:rightContact>0?'working':'free',gear:'bare'}};
    return data;
  }
  function wringData(tool,supportHand,phase,next,t,joining,leftContact,rightContact,twist,water,stage,options,dripping){
    tool.visible=rightContact>0;var data=attention({kind:'wring',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:grip(tool,'wring'),supportHand:supportHand,targetGrip:next?grip(keyframe('wring',next,{clothAware:true}),'wring'):null,spout:null,held:rightContact>0,eased:parkEase(t),progress:t*100,cloth:wringCloth(tool,twist,water,dripping),clothHandling:{stage:stage,leftGrip:rotateOffset(tool,{x:-25,y:0}),rightGrip:rotateOffset(tool,{x:25,y:0}),supportContact:leftContact,workingContact:rightContact,joining:joining,waterMl:water,preview:true}},options,null);
    return wringPresentation(data,joining,leftContact,rightContact,twist);
  }
  function wringPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),home=point(620,336),bowl=point(300,306),rest=point(220,338),tool=phase==='pickup'||phase==='ready'?copy(home):copy(bowl),joining=['twist','release'].includes(phase)?1:0,leftContact=joining,twist=phase==='twist'?1:0,stage=phase,s=copy(rest);
    if(phase==='pickup'&&next==='carry'){
      if(t<.23){tool.y=336-56*parkEase(t/.23);stage='cloth-lift';}
      else if(t<.78){var carry=parkEase((t-.23)/.55);tool=point(620-320*carry,280-5*Math.pow(Math.sin(PI*carry),2));stage='cloth-carry';}
      else{tool=point(300,280+26*parkEase((t-.78)/.22));stage='cloth-lower';}
    }else if(phase==='carry'&&next==='twist'){
      joining=parkEase(t/.42);leftContact=parkEase((t-.42)/.16);twist=parkEase((t-.58)/.42);stage=t<.42?'support-approach':t<.58?'support-grip':'cloth-twist';
    }else if(phase==='twist'&&next==='release'){twist=1-u;stage='cloth-untwist';}
    else if(phase==='release'&&next==='ready'){
      leftContact=1-parkEase(t/.16);joining=1-parkEase((t-.16)/.16);
      if(t<.16)stage='support-release';
      else if(t<.32)stage='support-withdraw';
      else if(t<.46){tool.y=306-26*parkEase((t-.32)/.14);stage='cloth-lift';}
      else if(t<.82){var returning=parkEase((t-.46)/.36);tool=point(300+320*returning,280-5*Math.pow(Math.sin(PI*returning),2));stage='cloth-carry';}
      else{tool=point(620,280+56*parkEase((t-.82)/.18));stage='cloth-lower';}
    }
    if(t===1&&next){tool=keyframe('wring',next,{clothAware:true});joining=next==='twist'||next==='release'?1:0;leftContact=joining;twist=next==='twist'?1:0;}
    s=blendPoint(rest,rotateOffset(tool,{x:-25,y:0}),joining);s.y-=6*Math.pow(Math.sin(PI*joining),2);
    return wringData(tool,s,phase,next,t,joining,leftContact,1,twist,Math.max(0,finite(o.clothWaterMl,0)),stage,o,phase==='carry'&&twist>.05);
  }
  // Portion handling is optional choreography. A spoonful stays in its bowl
  // until the learner's explicit Release records the one model transfer.
  function servingGeometry(kind,options){
    var o=options||{},plate=optionIndex(o.plate===undefined?o.plateIndex:o.plate),dish={kind:'plate',plate:plate,x:plate?720:285,y:365},pan={kind:'pan',plate:null,x:kind==='serve'?500:514,y:352};
    return {plate:plate,source:kind==='serve'?pan:dish,destination:kind==='serve'?dish:pan,rest:point(514,350,-35)};
  }
  function servingKeyframe(kind,phase,options){
    var d=servingGeometry(kind,options),source=d.source,target=d.destination,angle=(d.plate?-1:1)*16;
    if(phase==='scoop')return spoonAtBowl(source.x,source.y,0);
    if(phase==='lift')return point(source.x,260,0);
    if(phase==='carry')return point(target.x,260,0);
    if(phase==='tip')return spoonAtBowl(target.x,target.y-18,angle);
    if(phase==='level'||phase==='ready')return spoonAtBowl(target.x,target.y-18,0);
    return copy(d.rest);
  }
  function servingDescriptor(d,tool,stage,loaded,contact,preview,committed){return {source:copy(d.source),destination:copy(d.destination),position:point(tool.x,tool.y,tool.angle),stage:stage,loaded:loaded?1:0,foodRetained:!!loaded,contact:contact,preview:preview,committed:!!committed};}
  function servingPose(options){
    var o=options||{},kind=o.kind,phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),d=servingGeometry(kind,o),start=servingKeyframe(kind,phase,o),end=next?servingKeyframe(kind,next,o):start,tool=blendPoint(start,end,u);
    if(phase==='pickup'&&next==='scoop')tool=clearSpoonTool(start,end,t,.28,.72,260);
    if(phase==='lift'&&next==='carry')tool.y-=4*Math.pow(Math.sin(PI*u),2);
    if(phase==='carry'&&next==='tip')tool=spoonAtBowl(d.destination.x,267+(d.destination.y-18-267)*u,end.angle*u);
    if(phase==='tip'&&next==='level')tool=spoonAtBowl(d.destination.x,d.destination.y-18,angleBlend(start.angle,end.angle,u));
    if(t===0)tool=copy(start);if(t===1&&next)tool=copy(end);tool.visible=true;
    var loaded=phase!=='pickup'||next==='scoop'&&t===1,hand=activeHand(kind,o),data={kind:kind,phase:phase,nextPhase:next,tool:tool,activeHand:hand,grip:grip(tool,kind),supportHand:support(kind,o),targetGrip:next?grip(end,kind):null,spout:null,held:true,eased:u,progress:t*100};
    data.servingTransfer=servingDescriptor(d,tool,phase,loaded,1,true,false);return attention(data,o,next?end:null);
  }
  // Sampling is an observation, not a portion transfer. Keep a solid sample in
  // the spoon through the inspection, then return it to the same pot on either
  // commit or cancel. The opt-in paths leave legacy choreography unchanged.
  function samplingKeyframe(phase,options){
    if(phase==='dip')return spoonAtBowl(450,350,0);
    if(phase==='lift')return point(450,260,0);
    if(phase==='check'||phase==='ready')return point(365,265,-8);
    return options&&options.activity==='cook-save-and-drain-pasta'?point(770,351,-40):point(690,350,-32);
  }
  function samplingDescriptor(tool,stage,loaded,contact,preview,committed,home){
    var bowl=rotateOffset(tool,{x:0,y:7}),data={source:{kind:'pot',x:450,y:350},position:point(tool.x,tool.y,tool.angle),bowl:{x:bowl.x,y:bowl.y},stage:stage,loaded:loaded?1:0,foodRetained:!!loaded,contact:contact,preview:preview,committed:!!committed};if(home)data.home=copy(home);return data;
  }
  function samplingPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),start=samplingKeyframe(phase,o),end=next?samplingKeyframe(next,o):start,tool=blendPoint(start,end,u);
    if(phase==='pickup'&&next==='dip')tool=clearSpoonTool(start,end,t,.28,.72,260);
    if(phase==='lift'&&next==='check')tool.y-=4*Math.pow(Math.sin(PI*u),2);
    if(t===0)tool=copy(start);if(t===1&&next)tool=copy(end);tool.visible=true;
    var loaded=['dip','lift','check','ready'].includes(phase)||phase==='pickup'&&next==='dip'&&t===1,data={kind:'samplePasta',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:grip(tool,'samplePasta'),supportHand:support('samplePasta',o),targetGrip:next?grip(end,'samplePasta'):null,spout:null,held:true,eased:u,progress:t*100};
    data.samplingTransfer=samplingDescriptor(tool,phase,loaded,1,true,false,o.activity==='cook-save-and-drain-pasta'?samplingKeyframe('pickup',o):null);return attention(data,o,next?end:null);
  }
  // Water stays in the ladle until an explicit release records its transfer.
  // These fractions allocate that one visual dose, never the kitchen state.
  // The bowl clears the rim before lateral travel; a pour rotates about its
  // actual lip so the stream cannot drift outside the receiving vessel.
  function ladleGeometry(options){
    var o=options||{},amount=clamp(finite(o.actualMl,finite(o.amountMl,50)),0,50),surface=clamp(finite(o.potSurfaceY,350),350,388);
    return {amountMl:amount,source:{kind:'pot',x:450,y:surface},destination:{kind:'jug',x:230,y:324},home:point(300,350,-32),clearY:270,pourLip:{x:242,y:286},supportAnchor:point(550,342),restHands:{left:point(310,285),right:o.activity==='cook-save-and-drain-pasta'?point(590,282):point(620,290)}};
  }
  function ladleAtLip(lip,angle){var a=angle*PI/180;return spoonAtBowl(lip.x+16*Math.cos(a),lip.y+16*Math.sin(a),angle);}
  function ladleKeyframe(phase,g){
    if(phase==='dip')return spoonAtBowl(g.source.x,g.source.y-8,0);
    if(phase==='lift')return spoonAtBowl(g.source.x,g.clearY,0);
    if(phase==='carry')return spoonAtBowl(g.pourLip.x+16,g.clearY,0);
    if(phase==='tip')return ladleAtLip(g.pourLip,0);
    if(phase==='level'||phase==='ready')return ladleAtLip(g.pourLip,-8);
    return copy(g.home);
  }
  function ladleHands(data,workingContact,supportContact,workingAngle,supportAngle){
    var left=data.grip,right=data.supportHand;
    data.handPoses={left:{anchor:{x:left.x,y:left.y},rotation:finite(workingAngle,data.tool.angle),gesture:workingContact>0?'wrap':'relaxed',closure:.18+.7*workingContact,pressure:0,contact:workingContact,role:workingContact>0?'working':'free',gear:'bare'},right:{anchor:{x:right.x,y:right.y},rotation:finite(supportAngle,90),gesture:supportContact>0?'handle':'relaxed',closure:.18+.78*supportContact,pressure:0,contact:supportContact,role:supportContact>0?'stabilizing':'free',gear:supportContact>0?'mitt':'bare'}};
    return data;
  }
  function ladleData(tool,g,phase,next,t,stage,loaded,delivered,immersion,supporting,supportContact,options){
    loaded=clamp(loaded,0,1);delivered=clamp(delivered,0,1-loaded);var bowl=rotateOffset(tool,{x:0,y:7}),lip=rotateOffset(tool,{x:-16,y:7});tool.visible=true;
    var data=attention({kind:'reserveWater',phase:phase,nextPhase:next,tool:tool,activeHand:'left',grip:grip(tool,'reserveWater'),supportHand:copy(supporting),targetGrip:next?grip(ladleKeyframe(next,g),'reserveWater'):null,spout:lip,held:true,eased:parkEase(t),progress:t*100,ladleTransfer:{stage:stage,source:copy(g.source),destination:copy(g.destination),bowl:{x:bowl.x,y:bowl.y},lip:{x:lip.x,y:lip.y},streamTarget:null,amountMl:g.amountMl,capacityMl:50,loadedMl:g.amountMl*loaded,fillFraction:g.amountMl*loaded/50,sourceFraction:1-loaded-delivered,loadedFraction:loaded,destinationFraction:delivered,flow:0,immersion:clamp(immersion,0,1),ladleContact:1,supportContact:supportContact,geometry:copy(g),preview:true,committed:false}},options,null);
    var free=arm({side:'right',hand:supporting,shoulder:data.shoulders.right}).wristAngle+90;
    return ladleHands(data,1,supportContact,tool.angle,supportContact>0?90:free);
  }
  function ladlePose(options){
    var o=options||{},g=ladleGeometry(o),phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),start=ladleKeyframe(phase,g),end=next?ladleKeyframe(next,g):start,tool=copy(start),loaded=phase==='pickup'?0:g.amountMl>0?1:0,immersion=phase==='dip'?1:0,supportContact=['pickup','dip','lift'].includes(phase)?1:0,supporting=supportContact?copy(g.supportAnchor):copy(g.restHands.right),stage=phase,withdraw=0;
    if(phase==='pickup'&&next==='dip'){
      var home=rotateOffset(start,{x:0,y:7});
      if(t<.22){var rise=parkEase(t/.22);tool=spoonAtBowl(home.x,home.y+(g.clearY-home.y)*rise,angleBlend(start.angle,0,rise));stage='ladle-lift';}
      else if(t<.62){var carry=parkEase((t-.22)/.4);tool=spoonAtBowl(home.x+(g.source.x-home.x)*carry,g.clearY-3*Math.pow(Math.sin(PI*carry),2),0);stage='ladle-carry';}
      else if(t<.84){var lower=parkEase((t-.62)/.22),y=g.clearY+(g.source.y-8-g.clearY)*lower;tool=spoonAtBowl(g.source.x,y,0);immersion=clamp((y+23-g.source.y)/15,0,1);stage='ladle-enter';}
      else{tool=copy(end);immersion=1;loaded=g.amountMl>0?parkEase((t-.84)/.16):0;stage='ladle-fill';}
    }else if(phase==='dip'&&next==='lift'){
      var lift=parkEase(t/.76),bowlY=g.source.y-8+(g.clearY-g.source.y+8)*lift;tool=spoonAtBowl(g.source.x,bowlY,0);immersion=clamp((bowlY+23-g.source.y)/15,0,1);stage=t<.76?'ladle-clear':'ladle-settle';
    }else if(phase==='lift'&&next==='carry'){
      if(t<.18){supportContact=1-parkEase(t/.18);stage='pot-release';}
      else if(t<.36){supportContact=0;withdraw=parkEase((t-.18)/.18);supporting=blendPoint(g.supportAnchor,g.restHands.right,withdraw);supporting.y-=5*Math.pow(Math.sin(PI*withdraw),2);stage='support-withdraw';}
      else{supportContact=0;withdraw=1;supporting=copy(g.restHands.right);var travel=parkEase((t-.36)/.64);tool=spoonAtBowl(g.source.x+(g.pourLip.x+16-g.source.x)*travel,g.clearY-3*Math.pow(Math.sin(PI*travel),2),0);stage='ladle-carry';}
    }else if(phase==='carry'&&next==='tip'){tool=spoonAtBowl(g.pourLip.x+16,g.clearY+(g.pourLip.y-g.clearY)*u,0);stage='ladle-align';}
    else if(phase==='tip'&&next==='level'){tool=ladleAtLip(g.pourLip,-8*u);stage='ladle-aim';}
    else if(phase==='level'&&next==='ready'){tool=copy(end);stage='ladle-steady';}
    if(t===1&&next){tool=copy(end);loaded=g.amountMl>0?1:0;immersion=next==='dip'?1:0;supportContact=['dip','lift'].includes(next)?1:0;supporting=supportContact?copy(g.supportAnchor):copy(g.restHands.right);}
    var data=ladleData(tool,g,phase,next,t,stage,loaded,0,immersion,supporting,supportContact,o);
    if(phase==='lift'&&next==='carry'&&t<.36){var free=arm({side:'right',hand:supporting,shoulder:data.shoulders.right}).wristAngle+90;data.handPoses.right.rotation=angleBlend(90,free,withdraw);}
    return data;
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
  // Basket contents stay contained until the explicit application Release.
  // These eight cap positions and water cues describe movement, never rinsing
  // efficacy, elapsed kitchen time, or a quantity of faucet water.
  function rinseDescriptor(tool,contact,flow,drain,retained,preview,stage){
    var food=[];if(retained)for(var i=0;i<8;i++){var cap=rotateOffset(tool,{x:-39+26*(i%4)+8*clamp(tool.angle/32,0,1),y:-8+14*Math.floor(i/4)});food.push({index:i,x:cap.x,y:cap.y,angle:tool.angle});}
    return {origin:point(450,340),sink:point(300,330),position:point(tool.x,tool.y,tool.angle),contact:contact,preview:preview,foodRetained:retained,waterFlow:flow,drain:drain,waterSurface:{x:tool.x,y:tool.y+10,angle:0},stage:stage,food:food};
  }
  function rinsePose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),start=keyframe('rinseProduce',phase),end=next?keyframe('rinseProduce',next):start,tool=blendPoint(start,end,u),flow=0,drain=phase==='lift'?1:0;
    if(phase==='pickup'&&next==='carry'){var rise=parkEase(t/.35),travel=parkEase((t-.35)/.65);tool=t<.35?point(450,340-62*rise):point(450-150*travel,278-5*Math.pow(Math.sin(PI*travel),2));}
    if(phase==='lower'&&next==='rinse'){var circle=Math.pow(Math.sin(PI*u),2);tool=point(300+6*Math.sin(2*PI*u)*circle,330+2*Math.sin(4*PI*u)*circle);flow=circle;}
    if(phase==='rinse'&&next==='lift')drain=u;
    if(phase==='lift'&&next==='drain')drain=1-u;
    if(phase==='drain'&&next==='return')tool.y-=5*Math.pow(Math.sin(PI*u),2);
    if(phase==='return'&&next==='tip'){var lower=parkEase(t/.45),tilt=parkEase((t-.45)/.55);tool=t<.45?point(450,278+36*lower):point(450,314,32*tilt);}
    if(t===0)tool=copy(start);if(t===1&&next){tool=copy(end);flow=0;drain=next==='lift'?1:0;}tool.visible=true;
    return attention({kind:'rinseProduce',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:grip(tool,'rinseProduce'),supportHand:rotateOffset(tool,{x:-76,y:-8}),targetGrip:next?grip(end,'rinseProduce'):null,spout:null,held:true,eased:u,progress:t*100,rinseProduce:rinseDescriptor(tool,1,flow,drain,true,true,phase)},o,next?end:null);
  }
  function loadDescriptor(tool,contact,retained,preview,stage){
    var food=[];if(retained)for(var i=0;i<14;i++){var cap=rotateOffset(tool,{x:-51+17*(i%7)+4*clamp(tool.angle/25,0,1),y:-7+14*Math.floor(i/7)});food.push({index:i,x:cap.x,y:cap.y,angle:tool.angle});}
    return {origin:point(270,340),position:point(tool.x,tool.y,tool.angle),contact:contact,preview:preview,foodRetained:retained,food:food,stage:stage};
  }
  function loadRestHands(){return {left:point(177,280),right:point(363,280)};}
  function loadPose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),start=keyframe('loadMushrooms',phase),end=next?keyframe('loadMushrooms',next):start,tool=blendPoint(start,end,u),join=phase==='pickup'?(next==='grip'?parkEase(t/.8):0):1,contact=phase==='pickup'?(next==='grip'?parkEase((t-.8)/.2):0):1,rest=loadRestHands(),left=rotateOffset(tool,{x:-65,y:-8}),right=grip(tool,'loadMushrooms');
    if(phase==='lift'&&next==='carry')tool.y-=5*Math.pow(Math.sin(PI*u),2);
    if(t===0)tool=copy(start);if(t===1&&next){tool=copy(end);if(next==='grip'){join=1;contact=1;}}tool.visible=true;
    left=rotateOffset(tool,{x:-65,y:-8});right=grip(tool,'loadMushrooms');
    if(phase==='pickup'){left=blendPoint(rest.left,left,join);right=blendPoint(rest.right,right,join);left.y-=6*Math.pow(Math.sin(PI*join),2);right.y-=6*Math.pow(Math.sin(PI*join),2);}
    var data=attention({kind:'loadMushrooms',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:right,supportHand:left,targetGrip:next?grip(end,'loadMushrooms'):null,spout:null,held:contact>0,eased:u,progress:t*100,loadMushrooms:loadDescriptor(tool,contact,true,true,phase),trayJoining:join},o,next?end:null);
    return data;
  }
  function combineDescriptor(tool,contact,retained,preview,stage){
    var food=[];if(retained)for(var i=0;i<12;i++){var cap=rotateOffset(tool,{x:-42+28*(i%4)+4*clamp(tool.angle/28,0,1),y:-9+10*Math.floor(i/4)});food.push({index:i,x:cap.x,y:cap.y,angle:tool.angle});}
    return {origin:point(270,340),position:point(tool.x,tool.y,tool.angle),contact:contact,preview:preview,foodRetained:retained,food:food,stage:stage};
  }
  function combineRestHands(){return {left:point(172,280),right:point(368,280)};}
  function combinePose(options){
    var o=options||{},phase=o.phase||'pickup',next=o.nextPhase||null,t=clamp(finite(o.progress,0)/100,0,1),u=parkEase(t),start=keyframe('combinePasta',phase),end=next?keyframe('combinePasta',next):start,tool=blendPoint(start,end,u),join=phase==='pickup'?(next==='grip'?parkEase(t/.8):0):1,contact=phase==='pickup'?(next==='grip'?parkEase((t-.8)/.2):0):1,rest=combineRestHands(),left=rotateOffset(tool,{x:-70,y:-8}),right=grip(tool,'combinePasta');
    if(phase==='lift'&&next==='carry')tool.y-=5*Math.pow(Math.sin(PI*u),2);
    if(t===0)tool=copy(start);if(t===1&&next){tool=copy(end);if(next==='grip'){join=1;contact=1;}}tool.visible=true;
    left=rotateOffset(tool,{x:-70,y:-8});right=grip(tool,'combinePasta');
    if(phase==='pickup'){left=blendPoint(rest.left,left,join);right=blendPoint(rest.right,right,join);left.y-=6*Math.pow(Math.sin(PI*join),2);right.y-=6*Math.pow(Math.sin(PI*join),2);}
    var data=attention({kind:'combinePasta',phase:phase,nextPhase:next,tool:tool,activeHand:'right',grip:right,supportHand:left,targetGrip:next?grip(end,'combinePasta'):null,spout:null,held:contact>0,eased:u,progress:t*100,combinePasta:combineDescriptor(tool,contact,true,true,phase),trayJoining:join},o,next?end:null);
    return data;
  }
  function clearSpoonTool(start,end,t,liftEnd,carryEnd,maximumHeight){
    var height=Math.min(finite(maximumHeight,276),start.y,end.y),rise=parkEase(t/liftEnd),carry=parkEase((t-liftEnd)/(carryEnd-liftEnd)),lower=parkEase((t-carryEnd)/(1-carryEnd)),tool=t<liftEnd?point(start.x,start.y+(height-start.y)*rise,start.angle):t<carryEnd?point(start.x+(end.x-start.x)*carry,height-5*Math.pow(Math.sin(PI*carry),2),angleBlend(start.angle,end.angle,carry)):point(end.x,height+(end.y-height)*lower,end.angle);
    if(t===0)return copy(start);if(t===1)return copy(end);return tool;
  }
  function copy(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(copy);var result={};Object.keys(value).forEach(function(key){result[key]=copy(value[key]);});return result;}
  // These are reversible movement cues, not a sauce observation or a cooking
  // result. The UI keeps quantities and recorded spoon evidence separate.
  function sauceInteraction(data){
    var p=data||{},kind=p.kind,tool=p.tool||p.pose;
    if(!p.held||(kind!=='pour'&&kind!=='fold')||!tool||!['x','y','angle'].every(function(key){return typeof tool[key]==='number'&&Number.isFinite(tool[key]);}))return null;
    if(kind==='fold'&&p.folding)return {kind:'fold',contact:p.folding.contact,immersion:p.folding.immersion,pressure:p.folding.pressure,bowl:copy(p.folding.bowl),angle:tool.angle};
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
    if((kind==='serve'||kind==='return')&&p.servingTransfer){var servingContact=clamp(finite(p.servingTransfer.contact,1),0,1);if(active){out.gesture=servingContact>0?'wrap':'relaxed';out.rotation=angle;out.closure=.18+.7*servingContact;out.contact=servingContact;out.role=servingContact>0?'working':'free';}else if(p.activeHand==='left'){out.gesture='handle';out.rotation=82;out.closure=.9;out.contact=1;out.role='stabilizing';out.gear='mitt';}return out;}
    if(kind==='loadMushrooms'&&p.loadMushrooms){var trayContact=clamp(finite(p.loadMushrooms.contact,0),0,1),trayJoin=clamp(finite(p.trayJoining,1),0,1),trayRest=loadRestHands()[which],trayAngle=arm({side:which,hand:trayRest}).wristAngle+90;out.gesture=trayJoin>0?'handle':'relaxed';out.rotation=angleBlend(trayAngle,angle+90,trayJoin);out.closure=.18+.76*trayContact;out.contact=trayContact;out.role=trayContact>0?active?'working':'stabilizing':'free';return out;}
    if(kind==='combinePasta'&&p.combinePasta){var trayContact=clamp(finite(p.combinePasta.contact,0),0,1),trayJoin=clamp(finite(p.trayJoining,1),0,1),trayRest=combineRestHands()[which],trayAngle=arm({side:which,hand:trayRest}).wristAngle+90;out.gesture=trayJoin>0?'handle':'relaxed';out.rotation=angleBlend(trayAngle,angle+90,trayJoin);out.closure=.18+.76*trayContact;out.contact=trayContact;out.gear='mitt';out.role=trayContact>0?active?'working':'stabilizing':'free';return out;}
    if(kind==='rinseProduce'&&p.rinseProduce){var basketContact=clamp(finite(p.rinseProduce.contact,0),0,1);out.gesture='handle';out.rotation=angle+90;out.closure=.18+.76*basketContact;out.contact=basketContact;out.role=basketContact>0?active?'working':'stabilizing':'free';return out;}
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
    var articulated=options.articulatedApproach===true&&!stationary,approach={};
    ['left','right'].forEach(function(side){var a=plan.from[side],b=plan.to[side],distance=Math.hypot(a.x-b.x,a.y-b.y),duration=.74+.26*distance/Math.max(.01,plan.distance),raw=(t-releaseEnd)/(closeStart-releaseEnd),local=articulated&&!plan.keep[side]?parkEase(raw/duration):travel,p=blendPoint(a,b,local);p.y-=Math.min(18,distance*.06)*Math.pow(Math.sin(PI*local),2);nextHands[side]=p;approach[side]={travel:local,wrist:articulated&&!plan.keep[side]?parkEase(raw/(duration*.8)):stationary?look:travel};});
    var eyeLook=options.anticipatoryAttention===true?parkEase(t/.65):look,headLook=options.anticipatoryAttention===true?parkEase(t/.82):look,active=target.activeHand==='left'?'left':'right',tool=copy(target.tool||target.pose||keyframe('inspect','pickup')),gaze=blendPoint(source.gaze,target.gaze,eyeLook);tool.visible=plan.retainedTool;gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,eyeLook);
    var result=plan.retainedTool?copy(target):{};Object.assign(result,{kind:plan.retainedTool?target.kind:null,transitionKind:target.kind||null,phase:'reach',nextPhase:'pickup',tool:tool,pose:plan.retainedTool?tool:null,activeHand:active,grip:nextHands[active],supportHand:nextHands[active==='left'?'right':'left'],targetGrip:copy(plan.to[active]),next:copy(plan.to[active]),held:plan.retainedTool,eased:look,progress:t*100,reaching:true,body:body,head:blendBody(source.head,target.head,headLook,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},handPoses:{},handoff:{stage:t<releaseEnd?'release':t<closeStart?'travel':'grip',retainedTool:plan.retainedTool,retainedContacts:copy(plan.keep)}});
    ['left','right'].forEach(function(side){var s=plan.start[side],e=plan.finish[side],kept=plan.keep[side],rotation=angleBlend(s.rotation,e.rotation,articulated?approach[side].wrist:stationary?look:travel),closure=kept?s.closure+(e.closure-s.closure)*look:t<releaseEnd?s.closure+(.18-s.closure)*opening:.18+(e.closure-.18)*closing,contact=kept?s.contact+(e.contact-s.contact)*look:t<releaseEnd?s.contact*(1-opening):e.contact*closing;result.handPoses[side]={anchor:{x:nextHands[side].x,y:nextHands[side].y},rotation:rotation,gesture:kept?s.gesture:(articulated?approach[side].travel:travel)<.5&&!stationary?s.gesture:e.gesture,closure:closure,pressure:kept?s.pressure+(e.pressure-s.pressure)*look:0,contact:contact,role:contact>0?kept?s.role:t<releaseEnd?s.role:e.role:'free',gear:s.gear==='mitt'||e.gear==='mitt'?'mitt':'bare'};if(t===0){result.handPoses[side]=copy(s);result.handPoses[side].anchor={x:nextHands[side].x,y:nextHands[side].y};}});
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
  function rinseReturnPlan(source){
    var d=source.rinseProduce,initial=source.tool||source.pose,home=point(d.foodRetained===false?650:450,340),clear=Math.min(278,initial.y),cursor={tool:copy(initial),contact:finite(d.contact,source.held?1:0)},stages=[],total=0;
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    if(cursor.contact<1)add('basket-grip',.12,{contact:1});
    if(Math.abs(initial.angle)>.001)add('basket-level',.24,{tool:point(initial.x,initial.y)});
    if(Math.abs(initial.y-clear)>.001)add('basket-lift',.2,{tool:point(initial.x,clear)});
    if(Math.abs(initial.x-home.x)>.001)add('basket-carry',.42,{tool:point(home.x,clear)});
    if(Math.abs(cursor.tool.y-home.y)>.001)add('basket-lower',.24,{tool:copy(home)});
    add('basket-release',.16,{contact:0});return {stages:stages,total:total,home:home};
  }
  // Cancellation levels the still-contained produce, raises the basket clear,
  // then carries it back. A committed rinse supplies foodRetained:false so the
  // same physical return places the empty basket on its separate rest.
  function returnRinse(source,t,options){
    if(options.reducedMotion===true)t=1;
    var plan=rinseReturnPlan(source),retained=source.rinseProduce.foodRetained!==false,time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),tool=blendPoint(stage.start.tool,stage.end.tool,u),contact=stage.start.contact+(stage.end.contact-stage.start.contact)*u,reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0);
    if(stage.name==='basket-carry')tool.y-=5*Math.pow(Math.sin(PI*u),2);
    if(t===1||options.reducedMotion===true){tool=copy(plan.home);contact=0;}
    tool.visible=contact>0;var done=t===1||options.reducedMotion===true,flow=finite(source.rinseProduce.waterFlow,0)*(1-parkEase(t/.1)),drain=finite(source.rinseProduce.drain,0)*(1-parkEase(t/.25)),result=attention({kind:'rinseProduce',parkedKind:'rinseProduce',phase:done?'parked':'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:grip(tool,'rinseProduce'),supportHand:rotateOffset(tool,{x:-76,y:-8}),targetGrip:null,next:null,spout:null,held:contact>0,parking:!done,parkStage:done?'parked':stage.name,reaching:false,eased:parkEase(t),progress:t*100,rinseProduce:rinseDescriptor(tool,contact,done?0:flow,done?0:drain,retained,!done,done?'parked':stage.name)},{reducedMotion:reduced},null);
    // Preserve the source camera attention before smoothly settling it onto
    // the basket's recovery path; restarting a return stays continuous.
    var settle=parkEase(t/.2);result.body=blendBody(source.body,result.body,settle,{x:450,y:335});result.head=blendBody(source.head,result.head,settle,{x:450,y:181});result.gaze=blendPoint(source.gaze,result.gaze,settle);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,point(tool.x,tool.y),settle);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    if(done){result.kind=null;result.pose=null;result.handPoses={};['left','right'].forEach(function(side){var h=handPresentation(Object.assign({},result,{kind:'rinseProduce'}),side);result.handPoses[side]=h;});}
    if(t===0&&!options.reducedMotion){result.tool=copy(source.tool||source.pose);result.pose=result.tool;result.grip=copy(source.grip);result.supportHand=copy(source.supportHand);result.body=copy(source.body);result.head=copy(source.head);result.gaze=copy(source.gaze);result.shoulders=copy(source.shoulders);result.rinseProduce=copy(source.rinseProduce);result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}
    return result;
  }
  function loadReturnPlan(source){
    var initial=source.tool||source.pose,home=point(270,340),clear=Math.min(275,initial.y),cursor={tool:copy(initial),contact:finite(source.loadMushrooms.contact,0)},stages=[],total=0;
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    var atHome=Math.hypot(initial.x-home.x,initial.y-home.y)<.001&&Math.abs(initial.angle)<.001;
    if(!atHome){if(cursor.contact<1)add('tray-grip',.2,{contact:1});if(Math.abs(initial.angle)>.001)add('tray-level',.24,{tool:point(initial.x,initial.y)});if(Math.abs(initial.y-clear)>.001)add('tray-lift',.2,{tool:point(initial.x,clear)});if(Math.abs(initial.x-home.x)>.001)add('tray-carry',.42,{tool:point(home.x,clear)});add('tray-lower',.24,{tool:copy(home)});}
    add('tray-release',.16,{contact:0});return {stages:stages,total:total,home:home};
  }
  function returnLoad(source,t,options){
    if(options.reducedMotion===true)t=1;
    var plan=loadReturnPlan(source),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),tool=blendPoint(stage.start.tool,stage.end.tool,u),contact=stage.start.contact+(stage.end.contact-stage.start.contact)*u,retained=source.loadMushrooms.foodRetained!==false,reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),initialHands=hands(source),left,right;
    if(stage.name==='tray-carry')tool.y-=5*Math.pow(Math.sin(PI*u),2);if(t===1){tool=copy(plan.home);contact=0;}tool.visible=t<1;
    left=rotateOffset(tool,{x:-65,y:-8});right=grip(tool,'loadMushrooms');
    if(stage.name==='tray-grip'){var joined=parkEase(u/.75);left=blendPoint(initialHands.left,left,joined);right=blendPoint(initialHands.right,right,joined);contact=stage.start.contact+(1-stage.start.contact)*parkEase((u-.75)/.25);}
    // Canceling an approach never drags an ungripped tray away from its rest.
    if(plan.stages.length===1&&source.loadMushrooms.contact===0){left=copy(initialHands.left);right=copy(initialHands.right);}
    var result=attention({kind:'loadMushrooms',parkedKind:'loadMushrooms',phase:t===1?'parked':'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:right,supportHand:left,targetGrip:null,next:null,spout:null,held:contact>0,parking:t<1,parkStage:t===1?'parked':stage.name,reaching:false,eased:parkEase(t),progress:t*100,loadMushrooms:loadDescriptor(tool,contact,retained,t<1,stage.name),trayJoining:plan.stages.length===1&&source.loadMushrooms.contact===0?finite(source.trayJoining,0):1},{reducedMotion:reduced},null),settle=parkEase(t/.2);
    result.body=blendBody(source.body,result.body,settle,{x:450,y:335});result.head=blendBody(source.head,result.head,settle,{x:450,y:181});result.gaze=blendPoint(source.gaze,result.gaze,settle);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,point(tool.x,tool.y),settle);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    if(t===1){result.handPoses={left:handPresentation(result,'left'),right:handPresentation(result,'right')};result.kind=null;result.pose=null;}
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders','loadMushrooms','trayJoining'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}
    return result;
  }
  function combineReturnPlan(source){
    var initial=source.tool||source.pose,home=point(270,340),clear=Math.min(260,initial.y),cursor={tool:copy(initial),contact:finite(source.combinePasta.contact,0)},stages=[],total=0;
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    var atHome=Math.hypot(initial.x-home.x,initial.y-home.y)<.001&&Math.abs(initial.angle)<.001;
    if(!atHome){if(cursor.contact<1)add('colander-grip',.2,{contact:1});if(Math.abs(initial.angle)>.001)add('colander-level',.24,{tool:point(initial.x,initial.y)});if(Math.abs(initial.y-clear)>.001)add('colander-lift',.2,{tool:point(initial.x,clear)});if(Math.abs(initial.x-home.x)>.001)add('colander-carry',.42,{tool:point(home.x,clear)});add('colander-lower',.24,{tool:copy(home)});}
    add('colander-release',.16,{contact:0});return {stages:stages,total:total,home:home};
  }
  function returnCombine(source,t,options){
    if(options.reducedMotion===true)t=1;
    var plan=combineReturnPlan(source),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),tool=blendPoint(stage.start.tool,stage.end.tool,u),contact=stage.start.contact+(stage.end.contact-stage.start.contact)*u,retained=source.combinePasta.foodRetained!==false,reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),initialHands=hands(source),left,right;
    if(stage.name==='colander-carry')tool.y-=5*Math.pow(Math.sin(PI*u),2);if(t===1){tool=copy(plan.home);contact=0;}tool.visible=t<1;
    left=rotateOffset(tool,{x:-70,y:-8});right=grip(tool,'combinePasta');
    if(stage.name==='colander-grip'){var joined=parkEase(u/.75);left=blendPoint(initialHands.left,left,joined);right=blendPoint(initialHands.right,right,joined);contact=stage.start.contact+(1-stage.start.contact)*parkEase((u-.75)/.25);}
    // Canceling an approach never drags an ungripped tray away from its rest.
    if(plan.stages.length===1&&source.combinePasta.contact===0){left=copy(initialHands.left);right=copy(initialHands.right);}
    var result=attention({kind:'combinePasta',parkedKind:'combinePasta',phase:t===1?'parked':'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:right,supportHand:left,targetGrip:null,next:null,spout:null,held:contact>0,parking:t<1,parkStage:t===1?'parked':stage.name,reaching:false,eased:parkEase(t),progress:t*100,combinePasta:combineDescriptor(tool,contact,retained,t<1,stage.name),trayJoining:plan.stages.length===1&&source.combinePasta.contact===0?finite(source.trayJoining,0):1},{reducedMotion:reduced},null),settle=parkEase(t/.2);
    result.body=blendBody(source.body,result.body,settle,{x:450,y:335});result.head=blendBody(source.head,result.head,settle,{x:450,y:181});result.gaze=blendPoint(source.gaze,result.gaze,settle);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,point(tool.x,tool.y),settle);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    if(t===1){result.handPoses={left:handPresentation(result,'left'),right:handPresentation(result,'right')};result.kind=null;result.pose=null;}
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders','combinePasta','trayJoining'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}
    return result;
  }
  function relaxedReturn(source,t,options,kind,baseReturn){
    if(options.reducedMotion===true)t=1;
    // Support and opening finish first; empty hands then move clear of the rim.
    var continuing=source.parkStage==='hands-withdraw',cut=continuing?0:.78;if(t<cut)return baseReturn(source,t/cut,{reducedMotion:false});
    var result=continuing?copy(source):baseReturn(source,1,{reducedMotion:false}),start=copy(result),u=parkEase((t-cut)/(1-cut)),home=result.tool,half=kind==='rinseProduce'?76:kind==='combinePasta'?70:65,ends={left:point(home.x-half-28,home.y-60),right:point(home.x+half+28,home.y-60)},from=hands(result),reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),target=copy(result);
    target.kind=kind;target.grip=ends.right;target.supportHand=ends.left;attention(target,{reducedMotion:reduced},null);
    result.body=blendBody(start.body,target.body,u,{x:450,y:335});result.head=blendBody(start.head,target.head,u,{x:450,y:181});result.gaze=blendPoint(start.gaze,target.gaze,u);result.gaze.target=blendPoint(start.gaze&&start.gaze.target,target.gaze&&target.gaze.target,u);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    result.grip=blendPoint(from.right,ends.right,u);result.supportHand=blendPoint(from.left,ends.left,u);result.grip.y-=6*Math.pow(Math.sin(PI*u),2);result.supportHand.y-=6*Math.pow(Math.sin(PI*u),2);
    result.handPoses={};['left','right'].forEach(function(side){var p=side==='right'?result.grip:result.supportHand,a=handPresentation(start,side),rotation=arm({side:side,hand:ends[side],shoulder:target.shoulders[side]}).wristAngle+90;result.handPoses[side]={anchor:{x:p.x,y:p.y},rotation:angleBlend(a.rotation,rotation,u),gesture:u===0?a.gesture:'relaxed',closure:.18,pressure:0,contact:0,role:'free',gear:a.gear||'bare'};});
    result.kind=t===1?null:kind;result.phase=t===1?'parked':'parking';result.parking=t<1;result.parkStage=t===1?'parked':'hands-withdraw';result.progress=t*100;result.eased=parkEase(t);result[kind].stage=result.parkStage;return result;
  }
  function servingReturnPlan(source,options){
    var o=options||{},d=source.servingTransfer,kind=source.kind||source.parkedKind||'serve',home=point(514,350,-35),initial=source.tool||source.pose||home,committed=o.servingCommitted===true||d.committed===true,loaded=d.loaded===1&&d.foodRetained!==false&&!committed,cursor={tool:copy(initial),loaded:loaded,contact:clamp(finite(d.contact,source.held?1:0),0,1)},stages=[],total=0;
    function add(name,weight,changes){var start=copy(cursor);Object.keys(changes).forEach(function(key){cursor[key]=copy(changes[key]);});stages.push({name:name,at:total,weight:weight,start:start,end:copy(cursor)});total+=weight;}
    var continuing=source.parkStage==='hands-withdraw'||source.parkStage==='parked';
    if(!continuing){
      if(loaded){add('food-lift',.14,{tool:point(initial.x,Math.min(initial.y,260),initial.angle)});add('food-level',.1,{tool:point(initial.x,Math.min(initial.y,260),0)});add('food-carry',.24,{tool:point(d.source.x,260,0)});add('food-lower',.16,{tool:spoonAtBowl(d.source.x,d.source.y,0)});add('food-release',.12,{loaded:false});}
      if(Math.hypot(cursor.tool.x-home.x,cursor.tool.y-home.y)>.001||Math.abs(cursor.tool.angle-home.angle)>.001){add('empty-lift',.14,{tool:point(cursor.tool.x,Math.min(cursor.tool.y,260),cursor.tool.angle)});add('empty-carry',.26,{tool:point(home.x,260,home.angle)});add('empty-lower',.16,{tool:copy(home)});}
      add('tool-release',.12,{contact:0});
    }
    add('hands-withdraw',.16,{contact:0,loaded:false});
    return {kind:kind,home:home,committed:committed,stages:stages,total:total,continuing:continuing};
  }
  function returnServing(source,t,options){
    var o=options||{};if(o.reducedMotion===true)t=1;
    var plan=servingReturnPlan(source,o),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,tool=blendPoint(a.tool,b.tool,u),loaded=u===1?b.loaded:a.loaded,contact=a.contact+(b.contact-a.contact)*u,kind=plan.kind,active=source.activeHand==='left'?'left':'right',other=active==='left'?'right':'left',from=hands(source),restGrip=grip(plan.home,kind),ends={};
    ends[active]=point(restGrip.x+(active==='left'?-24:24),restGrip.y-24);ends[other]=copy(from[other]);
    var withdrawing=stage.name==='hands-withdraw',withdraw=withdrawing?u:0,travel=parkEase(t),target={kind:kind,tool:copy(plan.home),grip:ends[active],supportHand:ends[other]},reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0);attention(target,{reducedMotion:reduced},null);
    if(stage.name==='food-carry'||stage.name==='empty-carry')tool.y-=4*Math.pow(Math.sin(PI*u),2);
    var hand=withdrawing?blendPoint(plan.continuing?from[active]:restGrip,ends[active],withdraw):grip(tool,kind);if(withdrawing)hand.y-=4*Math.pow(Math.sin(PI*u),2);
    var body=blendBody(source.body,target.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,target.gaze,travel);gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,travel);tool.visible=contact>0;
    var descriptor=servingDescriptor(source.servingTransfer,tool,t===1?'parked':stage.name,loaded,contact,t<1,plan.committed),result={kind:t===1?null:kind,parkedKind:kind,phase:t===1?'parked':'parking',nextPhase:null,tool:tool,pose:tool,activeHand:active,grip:hand,supportHand:copy(from[other]),targetGrip:null,next:null,spout:null,held:contact>0,parking:t<1,parkStage:t===1?'parked':stage.name,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,target.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},servingTransfer:descriptor,handPoses:{}};
    ['left','right'].forEach(function(side){var start=handPresentation(source,side),working=side===active,p=working?hand:from[other],release=working?1-contact:stage.name==='tool-release'?u:withdrawing?1:0,free=arm({side:side,hand:p,shoulder:result.shoulders[side]}).wristAngle+90,workingAngle=tool.angle+(start.rotation-(source.tool||source.pose).angle);result.handPoses[side]={anchor:{x:p.x,y:p.y},rotation:working&&!withdrawing?angleBlend(workingAngle,free,release):angleBlend(start.rotation,free,release),gesture:release===1?'relaxed':start.gesture,closure:release===1?.18:start.closure+(.18-start.closure)*release,pressure:0,contact:working?contact:start.contact*(1-release),role:release===1?'free':start.role,gear:start.gear};});
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};if(!plan.committed||source.servingTransfer.committed===true)result.servingTransfer=copy(source.servingTransfer);}
    return result;
  }
  function samplingReturnPlan(source){
    var d=source.samplingTransfer,home=d.home?copy(d.home):samplingKeyframe('pickup'),initial=source.tool||source.pose||home,cursor={tool:copy(initial),loaded:d.loaded===1&&d.foodRetained!==false,contact:clamp(finite(d.contact,source.held?1:0),0,1)},stages=[],total=0;
    function add(name,weight,changes){var start=copy(cursor);Object.keys(changes).forEach(function(key){cursor[key]=copy(changes[key]);});stages.push({name:name,at:total,weight:weight,start:start,end:copy(cursor)});total+=weight;}
    var continuing=source.parkStage==='hands-withdraw'||source.parkStage==='parked';
    if(!continuing){
      if(cursor.loaded){add('sample-lift',.14,{tool:point(initial.x,Math.min(initial.y,260),initial.angle)});add('sample-level',.1,{tool:point(initial.x,Math.min(initial.y,260),0)});add('sample-carry',.24,{tool:point(450,260,0)});add('sample-lower',.16,{tool:samplingKeyframe('dip')});add('sample-return',.12,{loaded:false});}
      if(Math.hypot(cursor.tool.x-home.x,cursor.tool.y-home.y)>.001||Math.abs(cursor.tool.angle-home.angle)>.001){add('empty-lift',.14,{tool:point(cursor.tool.x,Math.min(cursor.tool.y,260),cursor.tool.angle)});add('empty-carry',.26,{tool:point(home.x,260,home.angle)});add('empty-lower',.16,{tool:copy(home)});}
      add('tool-release',.12,{contact:0});
    }
    add('hands-withdraw',.16,{contact:0,loaded:false});return {home:home,stages:stages,total:total,continuing:continuing};
  }
  function returnSampling(source,t,options){
    var o=options||{};if(o.reducedMotion===true)t=1;
    var plan=samplingReturnPlan(source),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,tool=blendPoint(a.tool,b.tool,u),loaded=u===1?b.loaded:a.loaded,contact=a.contact+(b.contact-a.contact)*u,from=hands(source),restGrip=grip(plan.home,'samplePasta'),ends={right:point(restGrip.x+24,restGrip.y-24),left:point(320,315)},withdrawing=stage.name==='hands-withdraw',travel=parkEase(t);
    if(stage.name==='sample-carry'||stage.name==='empty-carry')tool.y-=4*Math.pow(Math.sin(PI*u),2);
    var hand=withdrawing?blendPoint(plan.continuing?from.right:restGrip,ends.right,u):grip(tool,'samplePasta'),supportHand=withdrawing?blendPoint(from.left,ends.left,u):copy(from.left);if(withdrawing){hand.y-=4*Math.pow(Math.sin(PI*u),2);supportHand.y-=4*Math.pow(Math.sin(PI*u),2);}
    var target={kind:'samplePasta',tool:copy(plan.home),grip:ends.right,supportHand:ends.left},reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0);attention(target,{reducedMotion:reduced},null);
    var body=blendBody(source.body,target.body,travel,{x:450,y:335}),gaze=blendPoint(source.gaze,target.gaze,travel);gaze.target=blendPoint(source.gaze&&source.gaze.target,target.gaze&&target.gaze.target,travel);tool.visible=contact>0;
    var result={kind:t===1?null:'samplePasta',parkedKind:'samplePasta',phase:t===1?'parked':'parking',nextPhase:null,tool:tool,pose:tool,activeHand:'right',grip:hand,supportHand:supportHand,targetGrip:null,next:null,spout:null,held:contact>0,parking:t<1,parkStage:t===1?'parked':stage.name,reaching:false,eased:travel,progress:t*100,body:body,head:blendBody(source.head,target.head,travel,{x:450,y:181}),gaze:gaze,shoulders:{left:transformPoint({x:373,y:229},body),right:transformPoint({x:526,y:229},body)},samplingTransfer:samplingDescriptor(tool,t===1?'parked':stage.name,loaded,contact,t<1,o.sampleCommitted===true||source.samplingTransfer.committed===true,source.samplingTransfer.home),handPoses:{}};
    ['left','right'].forEach(function(side){var start=handPresentation(source,side),working=side==='right',p=working?hand:supportHand,initialContact=source.samplingTransfer.contact,release=working?initialContact>0?1-contact/initialContact:1:stage.name==='tool-release'?u:withdrawing?1:0,free=arm({side:side,hand:p,shoulder:result.shoulders[side]}).wristAngle+90,workingAngle=tool.angle+(start.rotation-(source.tool||source.pose).angle);result.handPoses[side]={anchor:{x:p.x,y:p.y},rotation:working&&!withdrawing?angleBlend(workingAngle,free,release):angleBlend(start.rotation,free,release),gesture:release===1?'relaxed':start.gesture,closure:release===1?.18:start.closure+(.18-start.closure)*release,pressure:0,contact:working?contact:start.contact*(1-release),role:release===1?'free':start.role,gear:start.gear};});
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};result.samplingTransfer=copy(source.samplingTransfer);result.samplingTransfer.committed=o.sampleCommitted===true||source.samplingTransfer.committed===true;}
    return result;
  }
  function ladleRest(g,reduced,committed,delivered){
    var data=ladleData(copy(g.home),g,'parked',null,1,'parked',0,committed?delivered:0,0,g.restHands.right,0,{reducedMotion:reduced});
    data.grip=copy(g.restHands.left);attention(data,{reducedMotion:reduced},null);data=parkedPose(data);data.ladleTransfer.ladleContact=0;data.ladleTransfer.preview=false;data.ladleTransfer.committed=committed;
    return ladleHands(data,0,0,arm({side:'left',hand:data.grip,shoulder:data.shoulders.left}).wristAngle+90,arm({side:'right',hand:data.supportHand,shoulder:data.shoulders.right}).wristAngle+90);
  }
  function ladleReturnPlan(source,options){
    var d=source.ladleTransfer,g=d.geometry,o=options||{},committed=o.ladleCommitted===true||d.committed===true,a=handPresentation(source,'left'),b=handPresentation(source,'right'),cursor={bowl:copy(d.bowl),angle:source.tool.angle,working:copy(source.grip),support:copy(source.supportHand),loaded:d.loadedFraction,delivered:d.destinationFraction,immersion:d.immersion,ladleContact:a.contact,supportContact:b.contact,workingAngle:a.rotation,supportAngle:b.rotation},stages=[],total=0,home=rotateOffset(g.home,{x:0,y:7}),finalDelivered=committed?cursor.loaded+cursor.delivered:0;
    function add(name,weight,changes,pivot){var end=Object.assign({},copy(cursor),changes);if(pivot){var at=ladleAtLip(pivot,end.angle);end.bowl=rotateOffset(at,{x:0,y:7});}if(changes.bowl||changes.angle!==undefined||pivot){var tool=spoonAtBowl(end.bowl.x,end.bowl.y,end.angle);end.working=grip(tool,'reserveWater');end.workingAngle=end.angle;}stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total,pivot:pivot&&copy(pivot)});total+=weight;cursor=end;}
    function clear(){if(cursor.immersion>0||cursor.bowl.y>g.clearY+.001)add('ladle-clear',.36,{bowl:{x:cursor.bowl.x,y:Math.min(cursor.bowl.y,g.clearY)},immersion:0});if(Math.abs(cursor.angle)>.001)add('ladle-level',.26,{angle:0});}
    if(cursor.loaded>0){
      var receiving=committed?g.destination:g.source,lip=committed?g.pourLip:{x:g.source.x,y:g.source.y-36},currentLip=rotateOffset(spoonAtBowl(cursor.bowl.x,cursor.bowl.y,cursor.angle),{x:-16,y:7}),aligned=Math.hypot(currentLip.x-lip.x,currentLip.y-lip.y)<.001;
      if(!committed){
        if(Math.hypot(cursor.support.x-g.supportAnchor.x,cursor.support.y-g.supportAnchor.y)>.001){if(cursor.supportContact>0)add('pot-release',.15,{supportContact:0});add('support-approach',.32,{support:copy(g.supportAnchor),supportAngle:90,supportContact:0});}
        if(cursor.supportContact<1)add('pot-grip',.18,{supportContact:1,supportAngle:90});
      }else if(cursor.supportContact>0)add('pot-release',.18,{supportContact:0});
      if(!aligned){clear();add('ladle-carry',.6,{bowl:{x:lip.x+16,y:g.clearY},angle:0});add('ladle-lower',.32,{bowl:{x:lip.x+16,y:lip.y},angle:0});}
      if(cursor.angle>-32)add('ladle-tip',.28,{angle:-32,immersion:0},lip);
      add(committed?'ladle-pour':'ladle-recover',.64,{angle:-68,loaded:0,delivered:committed?finalDelivered:0,immersion:0},lip);stages[stages.length-1].streamTarget=copy(receiving);
      add('ladle-drip',.16,{});
      add('ladle-right',.3,{angle:0},lip);
    }
    if(Math.hypot(cursor.bowl.x-home.x,cursor.bowl.y-home.y)>.001||Math.abs(cursor.angle-g.home.angle)>.001){
      clear();if(Math.abs(cursor.bowl.x-home.x)>.001)add('ladle-return',.6,{bowl:{x:home.x,y:g.clearY},angle:0});add('ladle-rest',.36,{bowl:copy(home),angle:g.home.angle,immersion:0});
    }
    if(cursor.supportContact>0)add('pot-release',.18,{supportContact:0});
    if(cursor.ladleContact>0)add('ladle-release',.18,{ladleContact:0});
    var rest=ladleRest(g,false,committed,finalDelivered);add('hands-withdraw',.32,{working:copy(rest.grip),support:copy(rest.supportHand),workingAngle:handPresentation(rest,'left').rotation,supportAngle:handPresentation(rest,'right').rotation});
    return {stages:stages,total:total,committed:committed,finalDelivered:finalDelivered};
  }
  function returnLadle(source,target,t,options){
    var o=options||{},d=source.ladleTransfer,g=d?d.geometry:target.ladleTransfer?target.ladleTransfer.geometry:ladleGeometry(o),committed=o.ladleCommitted===true||!!(d&&d.committed),reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),delivered=committed&&d?d.loadedFraction+d.destinationFraction:0,destination=ladleRest(g,reduced,committed,delivered);
    if(t===1||o.reducedMotion===true)return destination;
    if(!d||!source.held){
      var empty=reach(source,destination,t*100,{contactAware:true});empty.parking=true;empty.parkedKind='reserveWater';empty.parkStage='empty-return';empty.reaching=false;empty.next=null;empty.targetGrip=null;empty.held=false;empty.tool.visible=false;
      if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders'].forEach(function(key){empty[key]=copy(source[key]);});empty.tool.visible=false;empty.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}return empty;
    }
    var plan=ladleReturnPlan(source,o),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,bowl=blendPoint(a.bowl,b.bowl,u),angle=angleBlend(a.angle,b.angle,u),tool=stage.pivot?ladleAtLip(stage.pivot,angle):spoonAtBowl(bowl.x,bowl.y,angle),working=blendPoint(a.working,b.working,u),supporting=blendPoint(a.support,b.support,u),loaded=a.loaded+(b.loaded-a.loaded)*u,received=a.delivered+(b.delivered-a.delivered)*u,immersion=a.immersion+(b.immersion-a.immersion)*u,ladleContact=a.ladleContact+(b.ladleContact-a.ladleContact)*u,supportContact=a.supportContact+(b.supportContact-a.supportContact)*u;
    if(stage.name==='ladle-carry'||stage.name==='ladle-return'){bowl.y-=3*Math.pow(Math.sin(PI*u),2);tool=spoonAtBowl(bowl.x,bowl.y,angle);}
    if(stage.name==='ladle-clear'){bowl=rotateOffset(tool,{x:0,y:7});immersion=Math.min(a.immersion,clamp((bowl.y+23-g.source.y)/15,0,1));}
    if(stage.name==='hands-withdraw'){working.y-=4*Math.pow(Math.sin(PI*u),2);supporting.y-=4*Math.pow(Math.sin(PI*u),2);}else working=grip(tool,'reserveWater');
    if(stage.name==='support-approach')supporting.y-=5*Math.pow(Math.sin(PI*u),2);
    var result=ladleData(tool,g,'parking',null,t,stage.name,loaded,received,immersion,supporting,supportContact,{reducedMotion:reduced});result.grip=working;result.tool.visible=ladleContact>0;result.held=ladleContact>0;result.parking=true;result.parkedKind='reserveWater';result.parkStage=stage.name;result.reaching=false;result.pose=tool;result.next=null;result.targetGrip=null;result.ladleTransfer.ladleContact=ladleContact;result.ladleTransfer.committed=committed;
    if(stage.streamTarget&&a.loaded>b.loaded&&g.amountMl>0){result.ladleTransfer.flow=16*u*u*(1-u)*(1-u);result.ladleTransfer.streamTarget=copy(stage.streamTarget);}
    var travel=parkEase(t);result.body=blendBody(source.body,destination.body,travel,{x:450,y:335});result.head=blendBody(source.head,destination.head,travel,{x:450,y:181});result.gaze=blendPoint(source.gaze,destination.gaze,travel);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze.target,travel);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    ladleHands(result,ladleContact,supportContact,angleBlend(a.workingAngle,b.workingAngle,u),angleBlend(a.supportAngle,b.supportAngle,u));
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders','ladleTransfer'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.ladleTransfer.committed=committed;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}return result;
  }
  function foldingRest(reduced,geometry){
    var result=foldingData(copy(geometry.home),geometry,'ready',null,1,0,0,'parked',{reducedMotion:reduced}),active=geometry.activeHand,other=active==='left'?'right':'left';
    result.grip=copy(geometry.restHands[active]);result.supportHand=copy(geometry.restHands[other]);attention(result,{reducedMotion:reduced},null);result=parkedPose(result);result.folding.preview=false;result.folding.spoonContact=0;result.folding.supportContact=0;
    foldingHands(result,0,0,0,arm({side:active,hand:result.grip,shoulder:result.shoulders[active]}).wristAngle+90,arm({side:other,hand:result.supportHand,shoulder:result.shoulders[other]}).wristAngle+90);
    return result;
  }
  function foldingReturnPlan(source){
    var d=source.folding,g=d.geometry,home=rotateOffset(g.home,{x:0,y:7}),clear=Math.min(g.surface.y-82,d.bowl.y),active=g.activeHand,other=active==='left'?'right':'left',a=handPresentation(source,active),b=handPresentation(source,other),reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),cursor={bowl:copy(d.bowl),angle:source.tool.angle,working:copy(source.grip),support:copy(source.supportHand),spoonContact:a.contact,supportContact:b.contact,contact:d.contact,pressure:d.pressure,workingAngle:a.rotation,supportAngle:b.rotation},stages=[],total=0;
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);if(changes.bowl||changes.angle!==undefined){end.working=grip(spoonAtBowl(end.bowl.x,end.bowl.y,end.angle),'fold');end.workingAngle=end.angle;}stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    if(cursor.pressure>0)add('spoon-unload',.16,{pressure:0});
    if(Math.hypot(cursor.bowl.x-home.x,cursor.bowl.y-home.y)>.001||Math.abs(cursor.angle-g.home.angle)>.001){
      if(cursor.spoonContact<1)add('spoon-grip',.14,{spoonContact:1});
      var clearAngle=foldingClearAngle(cursor.bowl.x,g);
      if(Math.abs(cursor.bowl.y-clear)>.001||Math.abs(cursor.angle-clearAngle)>.001)add('spoon-clear',.4,{bowl:{x:cursor.bowl.x,y:clear},angle:clearAngle,contact:0,pressure:0});
      if(Math.abs(cursor.bowl.x-home.x)>.001)add('spoon-return',.6,{bowl:{x:home.x,y:clear},angle:g.transitAngle});
      add('spoon-rest',.36,{bowl:{x:home.x,y:home.y},angle:g.home.angle,contact:0});
    }
    if(cursor.supportContact>0)add('pan-release',.18,{supportContact:0});
    if(cursor.spoonContact>0)add('spoon-release',.18,{spoonContact:0});
    var end=foldingRest(reduced,g);add('hands-withdraw',.32,{working:copy(end.grip),support:copy(end.supportHand),workingAngle:handPresentation(end,active).rotation,supportAngle:handPresentation(end,other).rotation});
    return {stages:stages,total:total};
  }
  function returnFolding(source,target,t,options){
    var o=options||{},g=source.folding?source.folding.geometry:target.folding?target.folding.geometry:foldingGeometry(o),reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),destination=foldingRest(reduced,g);
    if(t===1||o.reducedMotion===true)return destination;
    if(!source.folding||!source.held){
      var empty=reach(source,destination,t*100,{contactAware:true});empty.parking=true;empty.parkedKind='fold';empty.parkStage='empty-return';empty.reaching=false;empty.next=null;empty.targetGrip=null;empty.held=false;empty.tool.visible=false;
      if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders'].forEach(function(key){empty[key]=copy(source[key]);});empty.tool.visible=false;empty.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}return empty;
    }
    var plan=foldingReturnPlan(source),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,bowl=blendPoint(a.bowl,b.bowl,u),angle=angleBlend(a.angle,b.angle,u),tool=spoonAtBowl(bowl.x,bowl.y,angle),working=blendPoint(a.working,b.working,u),supporting=blendPoint(a.support,b.support,u),contact=a.contact+(b.contact-a.contact)*u,pressure=a.pressure+(b.pressure-a.pressure)*u,spoonContact=a.spoonContact+(b.spoonContact-a.spoonContact)*u,supportContact=a.supportContact+(b.supportContact-a.supportContact)*u;
    if(stage.name==='spoon-clear'){var depth=a.bowl.y-(g.surface.y-24);contact=a.contact*(depth>0?clamp((bowl.y-(g.surface.y-24))/depth,0,1):0);}
    if(stage.name==='spoon-return'){bowl.y-=4*Math.pow(Math.sin(PI*u),2);tool=spoonAtBowl(bowl.x,bowl.y,angle);}
    if(stage.name==='hands-withdraw'){working.y-=4*Math.pow(Math.sin(PI*u),2);supporting.y-=4*Math.pow(Math.sin(PI*u),2);}else working=grip(tool,'fold');
    var result=foldingData(tool,g,'parking',null,t,contact,pressure,stage.name,{reducedMotion:reduced});result.grip=working;result.supportHand=supporting;result.tool.visible=spoonContact>0;result.held=spoonContact>0;result.folding.contact=contact;result.folding.pressure=pressure;result.folding.immersion=contact*(.35+.4*pressure);result.folding.spoonContact=spoonContact;result.folding.supportContact=supportContact;result.parking=true;result.parkedKind='fold';result.parkStage=stage.name;result.reaching=false;result.pose=tool;result.next=null;
    var travel=parkEase(t);result.body=blendBody(source.body,destination.body,travel,{x:450,y:335});result.head=blendBody(source.head,destination.head,travel,{x:450,y:181});result.gaze=blendPoint(source.gaze,destination.gaze,travel);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze.target,travel);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    foldingHands(result,spoonContact,supportContact,pressure,angleBlend(a.workingAngle,b.workingAngle,u),angleBlend(a.supportAngle,b.supportAngle,u));
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders','folding'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}
    return result;
  }
  function pressRest(reduced,piece){
    var result=pressPose({kind:'press',phase:'ready',piece:piece,pressAware:true,reducedMotion:reduced}),left=point(260,250),right=point(690,305);
    result.grip=left;result.supportHand=right;attention(result,{reducedMotion:reduced},null);result=parkedPose(result);
    result.pressInteraction.stage='parked';result.pressInteraction.preview=false;result.pressInteraction.supportContact=0;result.pressInteraction.toolContact=0;result.pressInteraction.pressure=0;
    ['left','right'].forEach(function(side){var hand=side==='left'?left:right;result.handPoses[side]={anchor:{x:hand.x,y:hand.y},rotation:arm({side:side,hand:hand,shoulder:result.shoulders[side]}).wristAngle+90,gesture:'relaxed',closure:.18,pressure:0,contact:0,role:'free',gear:side==='right'?'mitt':'bare'};});
    return result;
  }
  function pressReturnPlan(source){
    var d=source.pressInteraction,home=point(300,324,-14),clear=Math.min(286,source.tool.y),lh=handPresentation(source,'left'),rh=handPresentation(source,'right'),cursor={tool:copy(source.tool),left:copy(source.grip),right:copy(source.supportHand),toolContact:lh.contact,supportContact:rh.contact,pressure:d.pressure,leftAngle:lh.rotation,rightAngle:rh.rotation},stages=[],total=0;
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);if(changes.tool){end.left=grip(end.tool,'press');end.leftAngle=end.tool.angle;}stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    if(cursor.pressure>0)add('masher-unload',.24,{tool:point(cursor.tool.x,d.target.y-5),pressure:0});
    if(Math.hypot(cursor.tool.x-home.x,cursor.tool.y-home.y)>.001||Math.abs(cursor.tool.angle-home.angle)>.001){
      if(cursor.toolContact<1)add('masher-grip',.16,{toolContact:1});
      if(Math.abs(cursor.tool.y-clear)>.001||Math.abs(cursor.tool.angle)>.001)add('masher-clear',.28,{tool:point(cursor.tool.x,clear)});
      if(Math.abs(cursor.tool.x-home.x)>.001)add('masher-return',.62,{tool:point(home.x,clear)});
      add('masher-rest',.32,{tool:copy(home)});
    }
    if(cursor.supportContact>0)add('pan-release',.18,{supportContact:0});
    if(cursor.toolContact>0)add('masher-release',.18,{toolContact:0});
    var end=pressRest(false,d.piece);add('hands-withdraw',.32,{left:copy(end.grip),right:copy(end.supportHand),leftAngle:handPresentation(end,'left').rotation,rightAngle:handPresentation(end,'right').rotation});
    return {stages:stages,total:total};
  }
  function returnPress(source,t,options){
    var o=options||{},reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),piece=source.pressInteraction?source.pressInteraction.piece:0,destination=pressRest(reduced,piece);
    if(t===1||o.reducedMotion===true)return destination;
    if(!source.pressInteraction||!source.held){
      var empty=reach(source,destination,t*100,{contactAware:true});empty.parking=true;empty.parkedKind='press';empty.parkStage='empty-return';empty.reaching=false;empty.next=null;empty.targetGrip=null;empty.held=false;empty.tool.visible=false;
      if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders'].forEach(function(key){empty[key]=copy(source[key]);});empty.tool.visible=false;empty.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}return empty;
    }
    var plan=pressReturnPlan(source),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,tool=blendPoint(a.tool,b.tool,u),left=blendPoint(a.left,b.left,u),right=blendPoint(a.right,b.right,u),pressure=a.pressure+(b.pressure-a.pressure)*u,toolContact=a.toolContact+(b.toolContact-a.toolContact)*u,supportContact=a.supportContact+(b.supportContact-a.supportContact)*u;
    if(stage.name==='masher-return')tool.y-=5*Math.pow(Math.sin(PI*u),2);
    if(stage.name==='hands-withdraw'){left.y-=4*Math.pow(Math.sin(PI*u),2);right.y-=4*Math.pow(Math.sin(PI*u),2);}else left=grip(tool,'press');
    var result=pressData(tool,pressTarget({piece:piece}),'parking',null,t,pressure,stage.name,{reducedMotion:reduced});result.grip=left;result.supportHand=right;result.tool.visible=toolContact>0;result.held=toolContact>0;result.pressInteraction.toolContact=toolContact;result.pressInteraction.supportContact=supportContact;result.parking=true;result.parkedKind='press';result.parkStage=stage.name;result.reaching=false;result.pose=tool;result.next=null;
    var travel=parkEase(t);result.body=blendBody(source.body,destination.body,travel,{x:450,y:335});result.head=blendBody(source.head,destination.head,travel,{x:450,y:181});result.gaze=blendPoint(source.gaze,destination.gaze,travel);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze.target,travel);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    pressHands(result,toolContact,supportContact,pressure,angleBlend(a.leftAngle,b.leftAngle,u),angleBlend(a.rightAngle,b.rightAngle,u));
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders','contact','pressInteraction'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}
    return result;
  }
  function wringRest(reduced){
    var result=wringPose({kind:'wring',phase:'ready',clothAware:true,reducedMotion:reduced}),right=point(670,310),left=point(220,338);
    result.grip=right;result.supportHand=left;attention(result,{reducedMotion:reduced},null);result=parkedPose(result);
    result.cloth=wringCloth(result.tool,0,0,false);result.clothHandling={stage:'parked',leftGrip:point(595,336),rightGrip:point(645,336),supportContact:0,workingContact:0,joining:0,waterMl:0,preview:false};
    ['left','right'].forEach(function(side){var hand=side==='right'?right:left;result.handPoses[side]={anchor:{x:hand.x,y:hand.y},rotation:arm({side:side,hand:hand,shoulder:result.shoulders[side]}).wristAngle+90,gesture:'relaxed',closure:.18,pressure:0,contact:0,role:'free',gear:'bare'};});
    return result;
  }
  function wringReturnPlan(source){
    var d=source.clothHandling,home=point(620,336),rest=point(220,338),clear=Math.min(280,source.tool.y),lh=handPresentation(source,'left'),rh=handPresentation(source,'right'),cursor={tool:copy(source.tool),left:copy(source.supportHand),right:copy(source.grip),leftContact:lh.contact,rightContact:rh.contact,joining:d.joining,twist:source.cloth.twist,leftAngle:lh.rotation,rightAngle:rh.rotation},stages=[],total=0;
    function add(name,weight,changes){var end=Object.assign({},copy(cursor),changes);if(changes.tool){end.right=grip(end.tool,'wring');if(end.leftContact>0)end.left=rotateOffset(end.tool,{x:-25,y:0});}stages.push({name:name,weight:weight,start:copy(cursor),end:copy(end),at:total});total+=weight;cursor=end;}
    if(cursor.twist>0)add('cloth-untwist',.3,{twist:0,leftAngle:270,rightAngle:90});
    if(cursor.leftContact>0)add('support-release',.18,{leftContact:0});
    if(Math.hypot(cursor.left.x-rest.x,cursor.left.y-rest.y)>.001||cursor.joining>0)add('support-withdraw',.28,{left:copy(rest),joining:0,leftAngle:arm({side:'left',hand:rest}).wristAngle+90});
    if(Math.hypot(cursor.tool.x-home.x,cursor.tool.y-home.y)>.001){
      if(cursor.rightContact<1)add('cloth-grip',.16,{rightContact:1});
      if(Math.abs(cursor.tool.y-clear)>.001)add('cloth-lift',.24,{tool:point(cursor.tool.x,clear)});
      if(Math.abs(cursor.tool.x-home.x)>.001)add('cloth-carry',.65,{tool:point(home.x,clear)});
      add('cloth-lower',.28,{tool:copy(home)});
    }
    if(cursor.rightContact>0)add('cloth-release',.18,{rightContact:0});
    var end=wringRest(false);add('hands-withdraw',.28,{right:copy(end.grip),left:copy(end.supportHand),rightAngle:handPresentation(end,'right').rotation,leftAngle:handPresentation(end,'left').rotation,joining:0});
    return {stages:stages,total:total};
  }
  function returnWring(source,t,options){
    var reduced=!!(source.body&&source.body.x===0&&source.body.y===0&&source.body.angle===0),destination=wringRest(reduced),o=options||{};
    if(t===1||o.reducedMotion===true)return destination;
    if(!source.clothHandling||!source.held){
      var empty=reach(source,destination,t*100,{contactAware:true});empty.parking=true;empty.parkedKind='wring';empty.parkStage='empty-return';empty.reaching=false;empty.next=null;empty.targetGrip=null;empty.held=false;empty.tool.visible=false;if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders'].forEach(function(key){empty[key]=copy(source[key]);});empty.tool.visible=false;empty.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}return empty;
    }
    var plan=wringReturnPlan(source),time=t*plan.total,stage=plan.stages.find(function(s){return time<s.at+s.weight;})||plan.stages[plan.stages.length-1],u=parkEase((time-stage.at)/stage.weight),a=stage.start,b=stage.end,tool=blendPoint(a.tool,b.tool,u),left=blendPoint(a.left,b.left,u),right=blendPoint(a.right,b.right,u),twist=a.twist+(b.twist-a.twist)*u,joining=a.joining+(b.joining-a.joining)*u,leftContact=a.leftContact+(b.leftContact-a.leftContact)*u,rightContact=a.rightContact+(b.rightContact-a.rightContact)*u;
    if(stage.name==='cloth-carry'){tool.y-=5*Math.pow(Math.sin(PI*u),2);right=grip(tool,'wring');}
    if(stage.name==='support-withdraw')left.y-=6*Math.pow(Math.sin(PI*u),2);
    if(stage.name==='hands-withdraw'){left.y-=4*Math.pow(Math.sin(PI*u),2);right.y-=4*Math.pow(Math.sin(PI*u),2);}
    var result=wringData(tool,left,'parking',null,t,joining,leftContact,rightContact,twist,source.clothHandling.waterMl,stage.name,{reducedMotion:reduced},false);result.grip=right;
    result.parking=true;result.parkedKind='wring';result.parkStage=stage.name;result.reaching=false;result.pose=tool;result.next=null;
    // Gaze and torso settle continuously even while a supporting grip opens.
    var travel=parkEase(t);result.body=blendBody(source.body,destination.body,travel,{x:450,y:335});result.head=blendBody(source.head,destination.head,travel,{x:450,y:181});result.gaze=blendPoint(source.gaze,destination.gaze,travel);result.gaze.target=blendPoint(source.gaze&&source.gaze.target,destination.gaze.target,travel);result.shoulders={left:transformPoint({x:373,y:229},result.body),right:transformPoint({x:526,y:229},result.body)};
    wringPresentation(result,joining,leftContact,rightContact,twist,angleBlend(a.leftAngle,b.leftAngle,u),angleBlend(a.rightAngle,b.rightAngle,u));
    if(t===0){['tool','grip','supportHand','body','head','gaze','shoulders','cloth','clothHandling'].forEach(function(key){result[key]=copy(source[key]);});result.pose=result.tool;result.handPoses={left:handPresentation(source,'left'),right:handPresentation(source,'right')};}
    return result;
  }
  function park(fromPose,toParkPose,progress,options){
    var source=fromPose||{},kind=source.kind||source.transitionKind||'inspect',target=toParkPose||pose({kind:kind,phase:'ready'}),destination=parkedPose(target),o=options||{},t=clamp(finite(progress,0)/100,0,1);
    if(o.clothAware===true&&(kind==='wring'||source.parkedKind==='wring'))return returnWring(source,t,o);
    if(o.pressAware===true&&(kind==='press'||source.parkedKind==='press'))return returnPress(source,t,o);
    if(o.foldAware===true&&(kind==='fold'||source.parkedKind==='fold'))return returnFolding(source,target,t,o);
    if(o.ladleAware===true&&(kind==='reserveWater'||source.parkedKind==='reserveWater'))return returnLadle(source,target,t,o);
    if(o.portionAware===true&&source.servingTransfer)return returnServing(source,t,o);
    if(o.sampleAware===true&&source.samplingTransfer)return returnSampling(source,t,o);
    if(kind==='moveLid'&&source.lid&&source.lid.preview)return returnLid(source,t,o);
    if(kind==='movePan'&&source.panTransport&&source.panTransport.preview)return returnPan(source,t,o);
    if(kind==='moveMushroom'&&source.mushroomMove)return returnMovedMushroom(source,target,t,o);
    if(kind==='rinseProduce'&&source.rinseProduce)return o.relaxedRest===true?relaxedReturn(source,t,o,kind,returnRinse):returnRinse(source,t,o);
    if(kind==='loadMushrooms'&&source.loadMushrooms)return relaxedReturn(source,t,o,kind,returnLoad);
    if(kind==='combinePasta'&&source.combinePasta)return relaxedReturn(source,t,o,kind,returnCombine);
    if(t===1||o.reducedMotion===true)return destination;
    if(!source.held||!source.kind){var empty=reach(source,destination,t*100);empty.parking=true;empty.parkedKind=target.kind;empty.parkStage='empty-return';empty.reaching=false;empty.next=null;empty.targetGrip=null;return empty;}
    if(kind==='separatePasta'&&source.pastaInteraction)return returnBundle(source,target,t);
    if(kind==='sliceProduce'&&source.cutInteraction)return returnCut(source,target,t);
    if(kind==='turnMushroom'&&source.food&&source.food.preview)return returnMushroom(source,target,t);
    var initial=source.tool||source.pose,home=target.tool||target.pose;
    if(!initial||!home)return destination;
    var levelAngle=['pour','serve','return','wring','addDry','returnDry','addPasta','reserveWater','drainPasta'].includes(kind)?0:initial.angle;
    var clearSpoon=o.clearanceAware===true&&(kind==='fold'||kind==='inspect')&&!source.panSurface,atSpoonRest=clearSpoon&&Math.hypot(initial.x-home.x,initial.y-home.y)<.001&&Math.abs(initial.angle-home.angle)<.001;
    var levelEnd=Math.abs(levelAngle-initial.angle)>.001?.34:.16,lift=parkEase(t/.14),level=parkEase((t-.14)/(levelEnd-.14)),carry=parkEase((t-levelEnd)/(.76-levelEnd)),lower=parkEase((t-.76)/.14),release=parkEase((t-.9)/.1),travel=parkEase(t/.9),clearance=atSpoonRest?initial.y:Math.min(initial.y,home.y,clearSpoon?276:310),tool;
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
  function parkDuration(fromPose,toParkPose,options){if(options&&options.ladleAware===true&&fromPose&&(fromPose.kind==='reserveWater'||fromPose.transitionKind==='reserveWater'||fromPose.parkedKind==='reserveWater')){var ladleTarget=toParkPose||pose({kind:'reserveWater',phase:'ready',ladleAware:true}),ladleG=fromPose.ladleTransfer?fromPose.ladleTransfer.geometry:ladleTarget.ladleTransfer?ladleTarget.ladleTransfer.geometry:ladleGeometry(options);return fromPose.ladleTransfer&&fromPose.held?Math.round(ladleReturnPlan(fromPose,options).total*1600):reachDuration(fromPose,ladleRest(ladleG,false,false,0),{contactAware:true});}if(options&&options.foldAware===true&&fromPose&&(fromPose.kind==='fold'||fromPose.transitionKind==='fold'||fromPose.parkedKind==='fold')){var foldTarget=toParkPose||pose({kind:'fold',phase:'ready',foldAware:true}),foldGeometry=fromPose.folding?fromPose.folding.geometry:foldTarget.folding?foldTarget.folding.geometry:foldingGeometry(options);return fromPose.folding&&fromPose.held?Math.round(foldingReturnPlan(fromPose).total*1600):reachDuration(fromPose,foldingRest(false,foldGeometry),{contactAware:true});}if(options&&options.pressAware===true&&fromPose&&(fromPose.kind==='press'||fromPose.transitionKind==='press'||fromPose.parkedKind==='press'))return fromPose.pressInteraction&&fromPose.held?Math.round(pressReturnPlan(fromPose).total*1600):reachDuration(fromPose,pressRest(false,0),{contactAware:true});if(options&&options.clothAware===true&&fromPose&&(fromPose.kind==='wring'||fromPose.transitionKind==='wring'||fromPose.parkedKind==='wring'))return fromPose.clothHandling&&fromPose.held?Math.round(wringReturnPlan(fromPose).total*1600):reachDuration(fromPose,wringRest(false),{contactAware:true});if(options&&options.sampleAware===true&&fromPose&&fromPose.samplingTransfer)return Math.round(samplingReturnPlan(fromPose).total*1600);if(options&&options.portionAware===true&&fromPose&&fromPose.servingTransfer)return Math.round(servingReturnPlan(fromPose,options).total*1600);var source=fromPose||{},target=toParkPose||pose({kind:source.kind||source.transitionKind||'inspect',phase:'ready'});if(source.kind==='combinePasta'&&source.combinePasta)return Math.round(combineReturnPlan(source).total*2100/.78);if(source.kind==='loadMushrooms'&&source.loadMushrooms)return Math.round(loadReturnPlan(source).total*2100/.78);if(source.kind==='rinseProduce'&&source.rinseProduce)return Math.round(rinseReturnPlan(source).total*2100/(options&&options.relaxedRest===true?.78:1));if(source.kind==='moveMushroom'&&source.mushroomMove)return Math.round(moveReturnPlan(source,target).total*2200);if(source.kind==='moveLid'&&source.lid&&source.lid.preview)return lidReturnDuration(source);if(source.kind==='movePan'&&source.panTransport&&source.panTransport.preview)return panReturnDuration(source);if(!source.held)return reachDuration(source,target);if(options&&options.clearanceAware===true&&(source.kind==='fold'||source.kind==='inspect')&&!source.panSurface)return bundleAtRest(source,target)?280:1700;if(source.kind==='separatePasta'&&source.pastaInteraction)return bundleAtRest(source,target)?280:1800;if(source.kind==='sliceProduce'&&source.cutInteraction)return bundleAtRest(source,target)?280:2100;if(source.kind==='turnMushroom'&&source.food&&source.food.preview)return 2400;var a=source.tool||source.pose,b=target.tool||target.pose,distance=a&&b?Math.hypot(b.x-a.x,b.y-a.y):0;return Math.round(clamp(800+distance*.9,800,1300));}
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
    var rawDepth=Math.sqrt(Math.max(0,maximum*maximum-d*d))*.65,depth=Math.min(100,rawDepth);
    // A smooth saturation avoids an elbow-velocity kink at the old depth cap.
    // Both derivatives join continuously; contact points and bone lengths stay exact.
    if(o.smoothDepth===true&&rawDepth>80&&rawDepth<120){var q=(rawDepth-80)/40;depth=80+40*(q-2.5*Math.pow(q,4)+3*Math.pow(q,5)-Math.pow(q,6));}
    var reach=Math.hypot(d,depth);
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
