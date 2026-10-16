import { makeWaterworksBoard, WATERWORKS_EVIDENCE as evidence, WATERWORKS_SOURCE } from './lesson_board_demo.js';

// These are authored deals, not procedural lesson generation. A deal materializes
// ordinary board fields so the existing save identity and replay rules suffice.
export const WATERWORKS_EXPEDITION_PLANS = Object.freeze([
  Object.freeze({ id: 'balanced', name: 'Balanced shores', description: 'Two connected loops offer several ways to collect supplies and finish surveys.', focus: 'Flexible routes and balanced construction costs.' }),
  Object.freeze({ id: 'research', name: 'Research branches', description: 'Begin at Sample camp. Invest in a research shelter before committing to the long survey branches.', focus: 'A cheaper research shelter supports later, research-heavy projects.' }),
  Object.freeze({ id: 'shortcut', name: 'Canal crossing', description: 'Begin at Equipment workshop. The two canal banks meet along a long outer trail; a bridge opens the far bank early.', focus: 'Build supplies are valuable, and an early crossing changes your available route.' }),
]);

export function normalizeExpeditionSeed(value) {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d{1,6}$/.test(value.trim()) ? Number(value.trim()) : 1;
  return Number.isSafeInteger(number) ? Math.max(1, Math.min(999, number)) : 1;
}

const copy = value => JSON.parse(JSON.stringify(value));
const contract = (id, title, description, locations, reward) => ({ id, title, description, locations, reward });
const alternate = (sourceQuote, instruction, fields) => ({ sourceQuote, explanation: sourceQuote, instruction, ...fields });

// Alternatives change the reasoning task and evidence, rather than just moving
// an existing answer to a different option position. Every family stays present.
const alternatives = {
  camp: [
    alternate(evidence.changes, 'Work backward from each observed change. Sort the sample by the state it must have been in immediately before that change began.', { items: ['The sample melted into liquid water', 'The sample evaporated into water vapor', 'The sample condensed into liquid droplets', 'The sample froze into ice'], categories: ['Solid', 'Liquid', 'Gas'], placements: [0, 1, 2, 1], hints: ['Identify the process, then find the state it changes from.', 'The starting state can differ even when two processes produce liquid water.'] }),
    alternate(evidence.changes, 'Sort each process by the change of state it describes. More than one card can describe the same change.', { items: ['Evaporation', 'Condensation', 'Melting', 'Ice becoming liquid'], categories: ['Liquid → gas', 'Gas → liquid', 'Solid → liquid'], placements: [0, 1, 2, 2] }),
    alternate(evidence.changes, 'Predict the state after each change, then sort the resulting samples.', { items: ['Ice after it melts', 'Liquid water after freezing', 'Vapor after condensing', 'Liquid water after evaporating'], categories: ['Solid', 'Liquid', 'Gas'], placements: [1, 0, 1, 2] }),
    alternate(evidence.changes, 'Follow both changes in each sample journey. Sort by the final state, not by the starting sample or the first change.', { items: ['Ice melts, then the liquid evaporates', 'Vapor condenses, then the liquid freezes', 'Liquid freezes, then the ice melts', 'Liquid evaporates, then the vapor condenses', 'Ice melts, then the liquid freezes'], categories: ['Solid', 'Liquid', 'Gas'], placements: [2, 0, 1, 1, 0], hints: ['Work out the state after the first change before following the second.', 'A sample can return to the state it started in. Classify only its final state.'] }),
  ],
  sun: [
    alternate(evidence.changes, 'A student says, “Cooling vapor makes ice immediately because cooling always produces a solid.” Which correction follows the changes described in the lesson?', { options: ['Evaporation makes liquid droplets; freezing then turns those droplets into ice.', 'Condensation makes liquid droplets; freezing then turns those droplets into ice.', 'Condensation makes liquid droplets; melting then turns those droplets into ice.', 'Freezing makes liquid droplets; condensation then turns those droplets into ice.'], answer: 1, explanation: 'In the lesson, cooling vapor causes condensation into liquid droplets. A second change, freezing, is needed to turn that liquid into ice.', hints: ['Check the state produced by condensation.', 'Keep the two changes separate: vapor to liquid, then liquid to solid.'] }),
    alternate(evidence.changes, 'Water vapor cools into droplets on the model. Which process explains the new liquid droplets?', { options: ['Condensation', 'Evaporation', 'Melting'], answer: 0 }),
    alternate(evidence.changes, 'A tray of liquid water cools enough to become ice. Which change explains the new solid?', { options: ['Evaporation', 'Freezing', 'Condensation'], answer: 1 }),
    alternate(evidence.changes, 'Two trays begin with liquid water. Tray A ends with solid ice; tray B ends with water vapor. Which pair of processes explains both observations?', { options: ['A condenses; B evaporates', 'A freezes; B evaporates', 'A freezes; B condenses', 'A melts; B freezes'], answer: 1, explanation: 'Tray A changes from liquid to solid, so it freezes. Tray B changes from liquid to gas, so it evaporates. A correct explanation must account for both trays.' }),
  ],
  cloud: [
    alternate(evidence.cycle, 'Investigate the cycle backward. Connect each observation to the process immediately before it in the repeating model. Use each earlier process once.', { items: ['Water is now collecting in the lake', 'Water is now falling as precipitation', 'Vapor is now condensing into cloud droplets', 'Lake water is now evaporating again'], matches: ['Evaporation', 'Collection', 'Precipitation', 'Condensation'], connections: [2, 3, 0, 1], hints: ['Locate the observed stage, then move one stage backward.', 'In the repeating model, collection comes before the next evaporation.'] }),
    alternate(evidence.cycle, 'Match each observed change to its process in the model. Use every process once.', { items: ['Lake water becomes vapor', 'Cloud droplets form as vapor cools', 'Water falls from cloud to ground', 'Water gathers in the lake'], matches: ['Condensation', 'Precipitation', 'Collection', 'Evaporation'], connections: [3, 0, 1, 2] }),
    alternate(evidence.cycle, 'Connect each event to what happens next in the water-cycle model. Use every consequence once.', { items: ['Sunlight warms lake water', 'Water vapor cools', 'Precipitation returns to the lake'], matches: ['Water collects', 'Liquid water evaporates', 'Vapor condenses into droplets'], connections: [1, 2, 0] }),
    alternate(evidence.cycle, 'Repair the missing middle process in each two-step cycle path. Continue around the cycle after collection and use every missing process once.', { items: ['Evaporation → ? → precipitation', 'Condensation → ? → collection', 'Precipitation → ? → evaporation', 'Collection → ? → condensation'], matches: ['Collection', 'Evaporation', 'Precipitation', 'Condensation'], connections: [3, 2, 0, 1], hints: ['Start at the named process on the left and move forward through the cycle.', 'Check that your missing process leads to the process on the right.'] }),
  ],
  rain: [
    alternate(evidence.cycle, 'The expedition found water collecting in the lake and is reconstructing its history. Arrange the four recorded processes backward, from the latest event (collection) to the earliest event (evaporation). This is a reverse reading of the log, not reversed water movement.', { items: ['Condensation', 'Collection', 'Evaporation', 'Precipitation'], order: [1, 3, 0, 2], explanation: 'Reading the completed journey backward gives collection, precipitation, condensation, then evaporation. The physical model still proceeds forward from evaporation to collection.', hints: ['Begin with the latest observation: water collected in the lake.', 'Ask what happened immediately before each event.'] }),
    alternate(evidence.cycle, 'Reconstruct the observed model journey. Begin when sunlight warms the lake; end when water returns to the lake.', { items: ['Water falls to the ground', 'Vapor cools into cloud droplets', 'Water collects in the lake', 'Sunlight warms lake water and water evaporates'], order: [3, 1, 0, 2] }),
    alternate(evidence.cycle, 'The model has just reached condensation. Continue one full cycle from condensation until the next evaporation.', { items: ['Evaporation', 'Collection', 'Condensation', 'Precipitation'], order: [2, 3, 1, 0] }),
    alternate(evidence.cycle, 'The field log records heating and evaporation separately. Rebuild all five events, beginning with sunlight warming the lake and ending when water collects there again.', { items: ['Water collects in the lake', 'Vapor cools into cloud droplets', 'Sunlight warms lake water', 'Water falls to the ground', 'Some liquid lake water evaporates'], order: [2, 4, 1, 3, 0], explanation: 'Sunlight first warms the lake. Some liquid water then evaporates, the vapor cools into cloud droplets, water falls as precipitation, and it collects in the lake.' }),
  ],
  lake: [
    alternate(evidence.routes, 'Assemble equipment plans for these journeys. A two-leg journey needs one mechanism for each leg in its stated order. Place each journey at the matching equipment plan; use every plan once.', { items: ['Journey from 2 to 6 metres, then back to 2 metres', 'Journey from 6 to 2 metres, then back to 6 metres', 'Journey from 1 to 4 metres', 'Journey from 5 to 3 metres'], slots: ['Gravity, then pump', 'Pump only', 'Pump, then gravity', 'Gravity only'], placements: [2, 0, 1, 3], explanation: 'Each uphill leg needs a pump; each open downhill leg can use gravity. A return journey changes direction, so its two legs need different mechanisms.', hints: ['Compare the start and finish of each leg separately.', 'A journey that returns to its starting height still has an uphill and a downhill leg.'] }),
    alternate(evidence.equipment, 'The equipment is already installed. Place each inspection card at the station where you can check that job. Use every station once.', { items: ['Check that water is lifted upward', 'Check how much water is stored', 'Check where incoming water collects', 'Check where water is held above the inlet'], slots: ['Reservoir at the low inlet', 'Pump at the lifting station', 'Storage tank on the raised platform', 'Level gauge at the viewing post'], placements: [1, 3, 0, 2] }),
    alternate(evidence.routes, 'Fit each route card into its design space. Work out how far the water rises or drops, then select the mechanism supported by the simplified model. Use every space once.', { items: ['Route from 2 metres to 6 metres', 'Route from 5 metres to 3 metres', 'Route from 6 metres to 2 metres', 'Route from 1 metre to 4 metres'], slots: ['Pump: rise of 3 metres', 'Gravity: drop of 4 metres', 'Pump: rise of 4 metres', 'Gravity: drop of 2 metres'], placements: [2, 3, 1, 0] }),
    alternate(evidence.equipment, 'Four missing components have caused different problems. Place each fault report at the component and position that would restore its missing job. Use every repair space once.', { items: ['Incoming water has no place to collect', 'Water cannot be lifted to the higher level', 'There is no container to hold water on the raised platform', 'Observers cannot read how much water is in the tank'], slots: ['Level gauge at the viewing post', 'Storage tank on the raised platform', 'Pump at the lifting station', 'Reservoir at the low inlet'], placements: [3, 2, 1, 0], hints: ['Identify the missing job before looking for its component.', 'Use the evidence to check both the component and its named position.'] }),
  ],
  stream: [
    alternate(evidence.balancedSupplies, 'Rebalance the delivered six-token plan into the eight-token paired-station plan. One token has already been retrieved from Waterworks assembly and combined with two new tokens. Allocate only these three available tokens to finish the new plan.', { budget: 3, constraints: ['The original delivery was 1 token at Sunlit shore, 2 at Cycle model garden, and 3 at Waterworks assembly.', 'After retrieving one assembly token, the remaining shares are 1 at the shore, 2 at the garden, and 2 at assembly.', 'The final eight-token plan needs equal shares at shore and assembly; the garden needs twice the shore share.', 'Distribute all three available tokens. Record additions to the remaining shares, not final totals.'], allocation: [1, 2, 0], explanation: 'The paired-station plan needs final shares of 2, 4, and 2. The remaining shares are 1, 2, and 2, so add 1, 2, and 0. The retrieved assembly token is reused along with two new tokens.', hints: ['Find the unique final eight-token plan first.', 'Subtract each remaining share from its final share. A station may need no new tokens.'] }),
    alternate(evidence.reserveSupplies, 'Distribute all nine flow tokens using the reserve plan. Follow every rule before sending the supplies.', { budget: 9, constraints: ['Sunlit shore receives exactly two tokens.', 'Cycle model garden receives one more token than Sunlit shore.', 'Waterworks assembly receives all remaining tokens.'], allocation: [2, 3, 4] }),
    alternate(evidence.balancedSupplies, 'Distribute all eight flow tokens using the paired-station plan. Work out the equal shares and the doubled share.', { budget: 8, constraints: ['Sunlit shore and Waterworks assembly receive equal shares.', 'Cycle model garden receives twice as many tokens as Sunlit shore.', 'Allocate all eight tokens.'], allocation: [2, 4, 2] }),
    alternate(`${evidence.supplies}\n\n${evidence.reserveSupplies}`, 'The six-token classroom plan has already been delivered. Upgrade it to the nine-token reserve plan by allocating only the three extra tokens. Keep every previously delivered token in place.', { budget: 3, constraints: ['The delivered plan has one token at Sunlit shore, twice that at Cycle model garden, and the remainder at Waterworks assembly.', 'The final reserve plan needs two tokens at Sunlit shore, one more than that at Cycle model garden, and the remainder of nine at Waterworks assembly.', 'Allocate all three extra tokens; your choices record additions, not the final totals.'], allocation: [1, 1, 1], explanation: 'The delivered plan has 1, 2, and 3 tokens. The reserve plan needs 2, 3, and 4. Each station therefore needs one additional token.', hints: ['First calculate each station’s total under both plans.', 'Subtract the delivered amount from the reserve amount at each station.'] }),
  ],
  workshop: [
    alternate(evidence.routes, 'A survey team must travel each channel in reverse. Connect each original route to the reversed route and its required mechanism in the simplified model. Use every return plan once.', { items: ['Reverse the route from 2 to 6 metres', 'Reverse the route from 6 to 2 metres', 'Reverse the route from 1 to 4 metres', 'Reverse the route from 5 to 3 metres'], matches: ['2 to 6 metres: pump', '3 to 5 metres: pump', '6 to 2 metres: gravity', '4 to 1 metres: gravity'], connections: [2, 0, 3, 1], explanation: 'Reversing a route swaps its starting and ending heights. A downward return can use gravity; an upward return needs a pump, even if the original route used gravity.', hints: ['Swap the route endpoints before choosing a mechanism.', 'The return mechanism depends on the return direction, not the outward journey.'] }),
    alternate(evidence.routes, 'Match each route to its height change and the mechanism allowed by the model. Use every description once.', { items: ['Route from 2 metres to 6 metres', 'Route from 6 metres to 2 metres', 'Route from 1 metre to 4 metres'], matches: ['Drops four metres: gravity can move the water', 'Rises three metres: needs a pump', 'Rises four metres: needs a pump'], connections: [2, 0, 1] }),
    alternate(evidence.equipment, 'A model designer describes three jobs. Connect each job to the component that performs it.', { items: ['Measure how much water is stored', 'Lift water to a higher level', 'Hold water on the raised platform'], matches: ['Storage tank', 'Level gauge', 'Pump'], connections: [1, 2, 0] }),
    alternate(evidence.routes, 'Compare both routes in each engineering report. Match the report to the conclusion that gets both the height differences and the model mechanisms right. Use each conclusion once.', { items: ['Compare 2 → 6 metres with 1 → 4 metres', 'Compare 6 → 2 metres with 5 → 3 metres', 'Compare 2 → 6 metres with 6 → 2 metres', 'Compare 5 → 3 metres with 1 → 4 metres'], matches: ['Both can use gravity; the first drops two metres farther', 'The first drops two metres with gravity; the second rises three metres with a pump', 'Both need a pump; the first rises one metre farther', 'Both change height by four metres; the first needs a pump and the second can use gravity'], connections: [2, 0, 3, 1], hints: ['Calculate the rise or drop of each route separately.', 'Compare direction as well as distance: equal height differences can need different mechanisms.'] }),
  ],
  ice: [
    alternate(evidence.changes, 'The laboratory recorded each final sample and its last process, but lost the starting-state labels. Reconstruct the state immediately before each recorded process.', { controls: [{ label: 'Tray A became liquid water by melting. What was its starting state?', options: ['Water vapor', 'Solid ice', 'Liquid water'], answer: 1 }, { label: 'Tray B became liquid droplets by condensation. What was its starting state?', options: ['Water vapor', 'Liquid water', 'Solid ice'], answer: 0 }, { label: 'Tray C became solid ice by freezing. What was its starting state?', options: ['Solid ice', 'Water vapor', 'Liquid water'], answer: 2 }], explanation: 'Melting starts with solid ice; condensation starts with water vapor; freezing starts with liquid water. Identical final states can have different starting states and processes.', hints: ['Use both the final sample and the named process.', 'Melting and condensation both produce liquid, but they start from different states.'] }),
    alternate(evidence.changes, 'Choose the process needed for each laboratory result.', { controls: [{ label: 'Liquid water → water vapor', options: ['Condensation', 'Evaporation', 'Freezing'], answer: 1 }, { label: 'Water vapor → liquid droplets', options: ['Melting', 'Freezing', 'Condensation'], answer: 2 }] }),
    alternate(evidence.changes, 'Read the process labels and predict the sample produced in each tray.', { controls: [{ label: 'Tray A: the ice melts', options: ['Solid ice', 'Liquid water', 'Water vapor'], answer: 1 }, { label: 'Tray B: the liquid freezes', options: ['Liquid water', 'Water vapor', 'Solid ice'], answer: 2 }, { label: 'Tray C: the vapor condenses', options: ['Liquid droplets', 'Solid ice', 'Water vapor'], answer: 0 }] }),
    alternate(evidence.changes, 'Complete these two-stage laboratory plans using only the changes named in the lesson. Read whether each control asks for the first change, the second change, or the final state.', { controls: [{ label: 'A: ice must become liquid, then vapor. Choose the first change.', options: ['Freezing', 'Condensation', 'Melting'], answer: 2 }, { label: 'B: vapor condenses, then must become ice. Choose the second change.', options: ['Freezing', 'Melting', 'Evaporation'], answer: 0 }, { label: 'C: liquid freezes, then the ice melts. Choose the final state.', options: ['Solid ice', 'Liquid water', 'Water vapor'], answer: 1 }], explanation: 'Plan A begins by melting the ice. Plan B freezes the liquid produced by condensation. Plan C returns to liquid water after freezing and melting.' }),
  ],
  garden: [
    alternate(evidence.cycle, 'Place each paired observation at the model space where both clues fit. Check the state or movement of the water as well as its location; use every space once.', { items: ['Water has cooled and formed tiny liquid droplets', 'Water has left the cloud and is falling toward the ground', 'Sunlight is warming water and some liquid is becoming vapor', 'Water has returned from the ground and is gathering again'], slots: ['Lake collection space', 'Cooling cloud space', 'Sunlit lake surface', 'Cloud-to-ground space'], placements: [1, 3, 2, 0], explanation: 'Cooling plus liquid droplets identifies the cloud. Falling after leaving the cloud identifies precipitation. Warming plus vapor formation identifies the lake surface, while returning and gathering identifies collection.', hints: ['Find a space that satisfies both clues on each card.', 'Distinguish the lake surface where evaporation begins from the collection space where the journey ends.'] }),
    alternate(evidence.symbols, 'Place the observation cards where those changes happen on the classroom model. Match the evidence to a space rather than to a process name. Use every space once.', { items: ['Vapor becomes liquid droplets', 'Water falls toward the ground', 'Liquid water changes into vapor'], slots: ['Over the sunlit lake', 'Inside the cooling cloud', 'Between cloud and ground'], placements: [1, 2, 0] }),
    alternate(evidence.cycle, 'Each field report describes a stage that has just finished. Place the report at the model station the water visits next. Continue the cycle after collection and use each next station once.', { items: ['Water has just collected in the lake', 'Vapor has just condensed into cloud droplets', 'Lake water has just evaporated', 'Water has just fallen to the ground'], slots: ['Condensation station', 'Collection station', 'Evaporation station', 'Precipitation station'], placements: [2, 3, 0, 1] }),
    alternate(evidence.cycle, 'Follow both stages on each journey card, then place it at its ending space in the model. Use each ending space once.', { items: ['Collection, then evaporation', 'Evaporation, then condensation', 'Condensation, then precipitation', 'Precipitation, then collection'], slots: ['Liquid droplets inside the cloud', 'Collected water in the lake', 'Water vapor above the lake', 'Falling water between cloud and ground'], placements: [2, 0, 3, 1], hints: ['Trace the first process and then the second before choosing a space.', 'Distinguish droplets held in the cloud from water falling out of it.'] }),
  ],
  lookout: [
    alternate(evidence.changes, 'Audit the team’s claims about a sample’s earlier state. Work backward through the named process before deciding which reconstruction is sound and which needs repair.', { items: ['A sample that became liquid by melting must have started as ice.', 'A sample that became liquid by condensation must have started as ice.', 'A sample that became ice by freezing must have started as liquid water.', 'A sample that became vapor by evaporation must have started as solid ice.'], repairs: [0, 1, 0, 1], corrections: ['', 'A sample that became liquid by condensation started as water vapor.', '', 'A sample that became vapor by evaporation started as liquid water.'], hints: ['Check the starting state required by each named process.', 'A final liquid sample does not tell you its starting state unless you also know the process.'] }),
    alternate(evidence.changes, 'Audit every line in the change-of-state log. Keep accurate process descriptions and mark faulty descriptions for repair; the number of faults can vary between logs.', { items: ['Evaporation turns liquid water into vapor.', 'Condensation turns liquid water into vapor.', 'Melting turns ice into liquid water.', 'Freezing turns liquid water into ice.'], repairs: [0, 1, 0, 0], corrections: ['', 'Condensation turns water vapor into liquid droplets.', '', ''] }),
    alternate(evidence.cycle, 'Inspect every line in the cycle survey log. Decide which observations agree with the model and which need repair; do not assume a fixed number of faults.', { items: ['Cloud droplets form when vapor warms.', 'Precipitation is water falling to the ground.', 'Sunlight cools lake water before evaporation.', 'Collection is water falling from clouds.'], repairs: [1, 0, 1, 1], corrections: ['Cloud droplets form when vapor cools.', '', 'Sunlight warms lake water before evaporation.', 'Collection is water gathering in the lake.'] }),
    alternate(evidence.changes, 'Audit these predictions after two changes. Trace each complete journey before deciding whether its predicted final state is accurate or needs repair.', { items: ['Ice melts, then the liquid evaporates: the final state is liquid.', 'Liquid freezes, then the ice melts: the final state is liquid.', 'Vapor condenses, then the liquid freezes: the final state is solid.', 'Liquid evaporates, then the vapor condenses: the final state is solid.', 'Ice melts, then the liquid freezes: the final state is gas.'], repairs: [1, 0, 0, 1, 1], corrections: ['After melting and evaporation, the final state is gas: water vapor.', '', '', 'After evaporation and condensation, the final state is liquid: water droplets.', 'After melting and freezing, the final state is solid: ice.'], hints: ['Write down the intermediate state, then apply the second change.', 'Judge the predicted final state. A correct first process does not make the entire prediction correct.'] }),
  ],
};

function applyPlan(board, plan) {
  if (plan === 'research') {
    board.starts = ['camp', 'ice'];
    board.edges = [['camp', 'sun'], ['sun', 'ice'], ['ice', 'stream'], ['stream', 'lake'], ['camp', 'cloud'], ['cloud', 'rain'], ['rain', 'garden'], ['garden', 'workshop'], ['workshop', 'lookout'], ['lake', 'lookout']];
    board.projects.find(project => project.id === 'field-lab').cost = [4, 2];
    board.projects.find(project => project.id === 'bridge').cost = [6, 5];
    board.projects.find(project => project.id === 'tools').cost = [5, 4];
  } else if (plan === 'shortcut') {
    board.starts = ['workshop', 'camp'];
    board.edges = [['workshop', 'camp'], ['camp', 'sun'], ['sun', 'ice'], ['ice', 'stream'], ['stream', 'lake'], ['lake', 'lookout'], ['lookout', 'garden'], ['garden', 'rain'], ['rain', 'cloud']];
    board.projects.find(project => project.id === 'bridge').effect.targetId = 'cloud';
    board.projects.find(project => project.id === 'bridge').cost = [3, 4];
    board.projects.find(project => project.id === 'field-lab').cost = [5, 5];
    board.projects.find(project => project.id === 'tools').cost = [4, 3];
  }
  const home = board.locations.find(node => node.id === board.starts[0]);
  board.mission = `Investigate every location and build two projects at their marked sites. Use a construction by crossing its bridge or earning its bonus on a later investigation, then return to ${home.name} to finish.`;
  board.projects.find(project => project.id === 'field-lab').description = 'Build a research shelter at its marked site. Each later successful investigation earns one extra research token.';
  const bridge = board.projects.find(project => project.id === 'bridge');
  bridge.name = plan === 'shortcut' ? 'Canal bridge' : 'Garden bridge';
  bridge.description = `Build a direct connection from the marked construction site to ${board.locations.find(node => node.id === bridge.effect.targetId).name}. Cross the bridge to use it.`;
}

function dealRewards(board, plan, seed) {
  // Every deal retains exactly 20 of each base resource. Opposing supply caches
  // change the best early route without making any project choice unrecoverable.
  const pairs = plan === 'research' ? [['camp', 'cloud'], ['sun', 'rain'], ['ice', 'garden'], ['stream', 'lookout']]
    : plan === 'shortcut' ? [['workshop', 'cloud'], ['camp', 'rain'], ['sun', 'garden'], ['ice', 'lookout']]
      : [['camp', 'sun'], ['cloud', 'ice'], ['workshop', 'stream'], ['rain', 'lake']];
  for (let index = 0; index < pairs.length; index++) {
    const reverse = index > 1 && (seed + index) % 2 === 0;
    const rich = plan === 'shortcut' ? [1, 3] : [3, 1], other = [rich[1], rich[0]];
    const [first, second] = pairs[index];
    board.locations.find(node => node.id === first).reward = [...(reverse ? other : rich)];
    board.locations.find(node => node.id === second).reward = [...(reverse ? rich : other)];
  }
}

function dealContracts(plan, seed) {
  const even = seed % 2 === 0;
  if (plan === 'research') return [
    contract('lab-preparation', 'Prepare the field lab', 'Gather observations at camp and the ice laboratory before investing in the next survey.', ['camp', 'ice'], [0, 2]),
    contract('research-branch', even ? 'Follow the vapor branch' : 'Inspect the supply branch', even ? 'Investigate Cloud connections and Rainfall trail.' : 'Investigate Supply channel and Waterworks assembly.', even ? ['cloud', 'rain'] : ['stream', 'lake'], [2, 0]),
    contract('far-survey', 'Compare the distant stations', 'Bring the model and observation evidence together at the end of the branches.', ['lake', 'lookout', 'garden'], [2, 1]),
  ];
  if (plan === 'shortcut') return [
    contract('crossing-supplies', 'Prepare the crossing', 'Collect equipment and sample observations on the near bank.', ['workshop', 'camp'], [0, 2]),
    contract('far-bank', 'Survey the far bank', 'Investigate the cloud and rainfall stations on the far bank.', ['cloud', 'rain'], [2, 0]),
    contract('canal-audit', even ? 'Audit the outer channel' : 'Connect the two banks', even ? 'Compare the supply channel, waterworks assembly, and lookout.' : 'Connect the ice laboratory, cycle garden, and lookout observations.', even ? ['stream', 'lake', 'lookout'] : ['ice', 'garden', 'lookout'], [1, 2]),
  ];
  return even ? [
    contract('shore-survey', 'Shore survey', 'Investigate the shore and the nearby laboratory.', ['sun', 'ice'], [0, 2]),
    contract('rain-observers', 'Rain observers', 'Compare cloud, rainfall, and lookout observations.', ['cloud', 'rain', 'lookout'], [2, 0]),
    contract('supply-model', 'Supply the model', 'Investigate the supply channel and assemble the model.', ['stream', 'lake'], [1, 1]),
  ] : copy(makeWaterworksBoard().contracts);
}

export function makeWaterworksExpedition({ plan = 'balanced', seed = 1 } = {}) {
  const selected = WATERWORKS_EXPEDITION_PLANS.find(item => item.id === plan) || WATERWORKS_EXPEDITION_PLANS[0];
  const deal = normalizeExpeditionSeed(seed), board = makeWaterworksBoard();
  board.title = `Waterworks Expedition · ${selected.name} · Deal ${deal}`;
  // A multiplier coprime to five permutes ten-digit base-five codes without collisions.
  // This spread reveals all five authored tasks per station in the first 25
  // deals, and changes at least seven stations between adjacent deal numbers.
  const taskCode = ((deal - 1) * 325781) % (5 ** board.locations.length);
  let index = 0;
  for (const node of board.locations) if (alternatives[node.id]) {
    const choice = (Math.floor(taskCode / (5 ** index)) + index++) % 5;
    if (choice) Object.assign(node, copy(alternatives[node.id][choice - 1]));
  }
  applyPlan(board, selected.id);
  dealRewards(board, selected.id, deal);
  board.contracts = dealContracts(selected.id, deal);
  return board;
}

export function waterworksExpeditionOf(board) {
  if (!board || board.playStyle !== 'tabletop' || board.version !== 1) return null;
  const selected = WATERWORKS_EXPEDITION_PLANS.find(item => typeof board.title === 'string' && board.title.startsWith(`Waterworks Expedition · ${item.name} · Deal `));
  if (!selected) return null;
  const suffix = board.title.slice(`Waterworks Expedition · ${selected.name} · Deal `.length);
  if (!/^[1-9]\d{0,2}$/.test(suffix)) return null;
  const original = makeWaterworksBoard();
  if (!Array.isArray(board.locations) || board.locations.length !== original.locations.length || original.locations.some(node => !board.locations.some(item => item?.id === node.id && item?.kind === node.kind && item?.conceptId === node.conceptId))) return null;
  if (board.locations.some(node => typeof node?.sourceQuote !== 'string' || !node.sourceQuote.trim() || !WATERWORKS_SOURCE.includes(node.sourceQuote))) return null;
  if (!Array.isArray(board.projects) || board.projects.length !== original.projects.length || original.projects.some(project => !board.projects.some(item => item?.id === project.id && item?.effect?.kind === project.effect.kind))) return null;
  return { plan: selected.id, seed: Number(suffix) };
}
