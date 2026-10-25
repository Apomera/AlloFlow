/* Illustrative pasta-sauce chemistry, not calibrated rheology or food-safety advice.
   Oil and starch are conserved here; the engine owns the one water value (pan.moisture).
   Mixing disperses oil, cooked starch helps thicken/stabilize, and dilution weakens body.
   Qualitative background: https://extension.okstate.edu/fact-sheets/food-emulsifiers
   https://doi.org/10.1016/j.foodhyd.2018.03.002 (gelatinised starch emulsion study).
   Model 2 also illustrates continued water uptake by pasta and greater body as a
   cooked sauce cools. Water uptake/swelling background: https://arxiv.org/abs/2201.09621.
   The small post-drain capacity, rates and cooling response are teaching assumptions;
   this is not a calibrated diffusion, viscosity or starch-retrogradation model.
   Model 3 distinguishes dilution with water from adding a cooked starch concentrate.
   Starch concentration affects paste rheology, with results dependent on starch type:
   https://doi.org/10.3390/foods12122281. These coefficients are not fitted to that study.
   A larger amount of sauce need not be a thinner sauce. Concentration here is grams
   of starch per 100 mL free water, not percent of total food or cheese mass.
   Constants describe this teaching recipe, not universal starch or temperature limits.
   Observation model 1 describes flow/body separately from visible oil dispersion.
   Starch type and processing affect stability; body is not a guarantee against oil
   separation: https://pmc.ncbi.nlm.nih.gov/articles/PMC5899762/. The settling rate
   remains illustrative and does not distinguish creaming, flocculation or coalescence.
   Observation model 2 also separates current body/oil from irreversible scorch damage.
   Tomato paste rheology varies with concentration and temperature:
   https://doi.org/10.1081/JFP-200032940. Heat also causes chemical changes/darkening:
   https://doi.org/10.1046/j.1365-2621.2003.00637.x. These qualitative distinctions
   do not calibrate this model or imply that all structural changes are reversible. */
(function(root){
  'use strict';
  var constants=Object.freeze({dryWaterPerTwoServings:20,looseWaterPerTwoServings:180,
    mixingRate:3,settlingRate:.004,starchStability:5,heatStressStart:110,heatStressScale:5,
    thickStarchPercent:3.2,minBody:.65,maxBody:3.2});
  function quantity(value,name,fallback){
    if(value===undefined&&fallback!==undefined)return fallback;
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new RangeError(name+' must be a finite non-negative number.');
    return value;
  }
  function fraction(value,name,fallback){var n=quantity(value,name,fallback);if(n>1)throw new RangeError(name+' must be between zero and one.');return n;}
  function temperature(value){if(typeof value!=='number'||!Number.isFinite(value)||value< -273.15)throw new RangeError('temperature must be a finite Celsius temperature.');return value;}
  function create(value){var s=value||{};return {oilMl:quantity(s.oilMl,'oilMl',0),starchG:quantity(s.starchG,'starchG',0),dispersion:fraction(s.dispersion,'dispersion',0)};}
  function bounded(value,min,max){return Math.max(min,Math.min(max,value));}
  function concentration(starch,water){return bounded(starch/Math.max(.000001,water)*100,0,10000);}
  function add(value,addition,waterBeforeMl,waterAddedMl){
    var s=create(value),a=create(addition),before=quantity(waterBeforeMl,'waterBeforeMl',0),added=quantity(waterAddedMl,'waterAddedMl',0),oil=s.oilMl+a.oilMl,totalWater=before+added;
    quantity(totalWater,'totalWater');quantity(oil,'totalOil');
    // Adding a separately carried liquid does not also perform a folding action.
    var dispersion=oil?(s.dispersion*(s.oilMl/oil)+a.dispersion*(a.oilMl/oil)):s.dispersion;
    if(added&&totalWater)dispersion*=before/totalWater+.25*(added/totalWater);
    return create({oilMl:oil,starchG:s.starchG+a.starchG,dispersion:dispersion});
  }
  function mix(value,options){
    var s=create(value),o=options||{},water=quantity(o.waterMl,'waterMl'),temp=temperature(o.temperature),effort=quantity(o.effort,'effort',1);
    if(!effort)return s;
    // Very little water cannot sustain the oil-in-water coating used in this dish.
    // Temperature is the engine's pan-surface proxy, not measured sauce temperature.
    // Its ordinary simmer surface can exceed 100 C while the wet sauce stays cooler.
    // Excessive pan heat is a coarse proxy for a vigorously heated, unstable coating;
    // it is not a claim that every emulsion breaks at the same temperature.
    var waterSupport=s.oilMl?bounded(water/s.oilMl/1.5,0,1):1;
    var heatSupport=1/(1+Math.pow(Math.max(0,temp-constants.heatStressStart)/constants.heatStressScale,2));
    var target=.98*waterSupport*heatSupport;
    s.dispersion=bounded(target+(s.dispersion-target)*Math.exp(-constants.mixingRate*effort),0,1);
    return s;
  }
  function advance(value,options){
    var s=create(value),o=options||{},water=quantity(o.waterMl,'waterMl'),temp=temperature(o.temperature),seconds=quantity(o.seconds,'seconds');
    if(!seconds)return s;
    var starchPercent=concentration(s.starchG,water),hot=Math.max(0,temp-constants.heatStressStart)/constants.heatStressScale;
    var rate=constants.settlingRate/(1+constants.starchStability*starchPercent)+.02*hot*hot;
    // An exact exponential gives the same result for one interval or many equal
    // intervals while water and temperature are held fixed. No ingredient evaporates here.
    s.dispersion=bounded(s.dispersion*Math.exp(-rate*seconds),0,1);
    return s;
  }
  function mixDuring(value,options){
    var s=create(value),o=options||{},water=quantity(o.waterMl,'waterMl'),temp=temperature(o.temperature),seconds=quantity(o.seconds,'seconds'),effort=quantity(o.effortPerSecond,'effortPerSecond');
    if(!seconds)return s;
    if(!effort)return advance(s,{waterMl:water,temperature:temp,seconds:seconds});
    // Mixing and separation compete throughout a completed operation. Processing
    // time matters in emulsification: https://pmc.ncbi.nlm.nih.gov/articles/PMC5899762/.
    // A hand fold's duration/rate here is illustrative, not fitted to high-shear data.
    var waterSupport=s.oilMl?bounded(water/s.oilMl/1.5,0,1):1;
    var hot=Math.max(0,temp-constants.heatStressStart)/constants.heatStressScale;
    var target=.98*waterSupport/(1+hot*hot),mixRate=constants.mixingRate*effort;
    var settling=constants.settlingRate/(1+constants.starchStability*concentration(s.starchG,water))+.02*hot*hot;
    var rate=mixRate+settling,equilibrium=target*mixRate/rate;
    // Exact solution of dD/dt = mixRate*(target-D) - settling*D.
    // At fixed inputs one long operation equals any subdivision of its duration.
    s.dispersion=bounded(equilibrium+(s.dispersion-equilibrium)*Math.exp(-rate*seconds),0,1);
    return s;
  }
  function transfer(value,waterMl,amountMl){
    var s=create(value),water=quantity(waterMl,'waterMl'),amount=Math.min(water,quantity(amountMl,'amountMl')),part=water?amount/water:0;
    var moved=create({oilMl:s.oilMl*part,starchG:s.starchG*part,dispersion:s.dispersion});
    // A representative, mixed portion; selective skimming is deliberately not modelled.
    return {remaining:create({oilMl:s.oilMl-moved.oilMl,starchG:s.starchG-moved.starchG,dispersion:s.dispersion}),waterMl:water-amount,transferred:{composition:moved,waterMl:amount}};
  }
  function absorb(options){
    var o=options||{},water=quantity(o.waterMl,'waterMl'),absorbed=quantity(o.absorbedWaterMl,'absorbedWaterMl'),pasta=quantity(o.dryPastaG,'dryPastaG'),temp=temperature(o.temperature),seconds=quantity(o.seconds,'seconds');
    var capacity=pasta*.15,remaining=Math.max(0,capacity-absorbed),rate=.004*bounded((temp-40)/50,0,1);
    // Track absorbed water separately from free sauce water. Only evaporation can
    // remove water from these two reservoirs; oil and starch stay in the sauce.
    // At fixed temperature this finite-capacity exponential is independent of
    // how an interval is split, including when the free-water supply runs out.
    var moved=Math.min(water,remaining*-Math.expm1(-rate*seconds));
    return {waterMl:water-moved,absorbedWaterMl:absorbed+moved,transferredMl:moved};
  }
  function assess(value,options){
    var s=create(value),o=options||{},water=quantity(o.waterMl,'waterMl'),servings=quantity(o.servings,'servings',2),damage=quantity(o.damage,'damage',0);
    if(o.observationModel!==undefined&&o.observationModel!==1&&o.observationModel!==2)throw new RangeError('observationModel must be 1 or 2 when supplied.');
    if(!servings)throw new RangeError('servings must be greater than zero.');
    var scale=servings/2,starchPercent=concentration(s.starchG,water),freeOil=s.oilMl*(1-s.dispersion);
    // Relative body includes the recipe's fixed produce contribution (tomato pulp
    // contributes more than mushroom juices). This index is not a viscosity unit.
    var viscosity=bounded(starchPercent*.55+(o.recipe==='tomato'?100:15)*scale/Math.max(.000001,water),0,10000),warmViscosity=viscosity,coolingFactor=1,cooling=o.model===2||o.model===3;
    if(cooling){coolingFactor=1+.7*bounded((85-temperature(o.temperature))/50,0,1);viscosity=bounded(viscosity*coolingFactor,0,10000);}
    var separated=freeOil>Math.max(2*scale,s.oilMl*.3),heavy=starchPercent>constants.thickStarchPercent||viscosity>constants.maxBody,type=damage>=1?'scorched':water<constants.dryWaterPerTwoServings*scale?'dry':
      o.model===3?(heavy?'thick':viscosity<constants.minBody?'watery':separated?'separated':'coating'):
      water>constants.looseWaterPerTwoServings*scale||viscosity<constants.minBody?'watery':
      heavy?'thick':separated?'separated':'coating';
    var descriptions={
      dry:{label:'Dry, patchy coating',flowText:'The spoon trail stays open.',coatingText:'Thick patches cling unevenly.',observation:'Little free water remains. The pasta drags through a dry, patchy sauce.'},
      watery:{label:'Loose, watery sauce',flowText:'Thin liquid quickly fills the spoon trail.',coatingText:'A thin layer runs off the spoon.',observation:'Liquid pools below the pasta instead of staying as an even coating.'},
      thick:{label:'Heavy, thick coating',flowText:'The spoon trail closes very slowly.',coatingText:'A heavy layer clings in ridges.',observation:'The concentrated sauce clings heavily and the strands stick together.'},
      separated:{label:'Oil separated from sauce',flowText:'Watery sauce and oil move separately in the trail.',coatingText:'Oil beads interrupt the coating.',observation:'Distinct oil beads or a slick sit beside the watery sauce; the coating is uneven.'},
      coating:{label:'Even, flowing coating',flowText:'The spoon trail closes gradually.',coatingText:'An even layer stays on the spoon.',observation:'The sauce flows between the strands and leaves an even coating.'},
      scorched:{label:'Scorched sauce',flowText:'Dark residue remains in the spoon trail.',coatingText:'Dark patches cling to the spoon.',observation:'Scorched patches remain. Water or folding can change the consistency but cannot undo the damage.'}
    },description=descriptions[type];
    var oilFraction=s.oilMl?1/(1+water/s.oilMl):0;
    var reading=Object.assign({type:type,coating:type==='coating',waterMl:water,oilMl:s.oilMl,starchG:s.starchG,starchPercent:starchPercent,
      oilFraction:oilFraction,freeOilMl:freeOil,oilDroplets:separated,dispersion:s.dispersion,viscosity:viscosity,
      separationText:separated?'Distinct oil beads or a slick are visible.':s.oilMl?'No distinct oil layer is visible.':'No oil is present.'},description);
    if(cooling){reading.coolingFactor=coolingFactor;reading.warmViscosity=warmViscosity;if(type==='thick')reading.observation='The sauce clings heavily and the strands stick together.';}
    if(o.observationModel===1||o.observationModel===2){
      // The legacy overall type prioritizes one fault; a separated coating still
      // has measurable body. Oil beads do not by themselves imply thin flow.
      reading.bodyType=o.observationModel===2?(water<constants.dryWaterPerTwoServings*scale?'dry':o.model===3?(heavy?'thick':viscosity<constants.minBody?'watery':'coating'):water>constants.looseWaterPerTwoServings*scale||viscosity<constants.minBody?'watery':heavy?'thick':'coating'):type==='separated'?'coating':type;
      reading.flowText=descriptions[reading.bodyType].flowText;
      reading.coatingText=descriptions[reading.bodyType].coatingText;
      if(o.observationModel===2&&type==='scorched')reading.observation=cooling&&reading.bodyType==='thick'?'The sauce clings heavily and the strands stick together.':descriptions[reading.bodyType].observation;
      if(separated&&(type!=='scorched'||o.observationModel===2)){
        reading.coatingText={dry:'Thick patches cling unevenly, with separate oil beads.',watery:'A thin layer runs off the spoon, with separate oil beads.',thick:'A heavy layer clings in ridges, with separate oil beads.',coating:'A flowing layer stays on the spoon, interrupted by oil beads.'}[reading.bodyType];
        reading.observation=reading.bodyType==='coating'?'The sauce flows between the strands, but distinct oil beads interrupt the coating.':reading.observation+' Distinct oil beads or a slick are also visible.';
      }
      if(o.observationModel===2){reading.observationModel=2;reading.scorched=damage>=1;if(reading.scorched)reading.observation+=' '+descriptions.scorched.observation;}
    }
    return reading;
  }
  var api={version:5,constants:constants,create:create,add:add,mix:mix,mixDuring:mixDuring,advance:advance,transfer:transfer,absorb:absorb,assess:assess};
  root.KitchenSauceChemistry=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
