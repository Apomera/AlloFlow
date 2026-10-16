import {tr} from './lesson_board_strings.js';

// Story variants share the same saved reward family. They introduce fictional
// expedition situations, never facts or answers for the learning activities.
const STORIES = {
  river: {
    survey: [
      ['Riverbank survey', 'A clear view opens across the riverbank. Record a quick observation or organize a fuller survey.'],
      ['Notes in a bottle', 'A sealed field notebook washes up beside your landing place. Decide how your expedition will use its notes.'],
      ['Reed-bed lookout', 'A quiet lookout offers room to set out instruments and compare your expedition notes.'],
    ],
    supplies: [
      ['Waterside supply cache', 'A marked crate waits above the waterline. Unpack what you need or organize supplies for later.'],
      ['Boathouse stores', 'The boathouse keeper offers space at the workbench and a small share of spare materials.'],
      ['Cargo at the landing', 'A delivery reaches the landing while your party is nearby. Choose where those supplies will help most.'],
    ],
    passage: [
      ['Channel markers', 'A row of faded markers points along the bank. Use the information now or prepare the next stage.'],
      ['Ferry crossing', 'A ferryperson shares a sketch of the surrounding shore. Your party can put the sketch to different uses.'],
      ['Old towpath', 'An old towpath reveals signs left by earlier explorers. Gather notes or prepare equipment for what comes next.'],
    ],
    rendezvous: [
      ['Riverside rendezvous', 'Another field team meets your party at the landing. Decide how to use their offer of help.'],
      ['Campfire exchange', 'At the evening campfire, neighboring explorers offer to share supplies and help organize your next effort.'],
      ['Harbor workshop', 'A small repair crew has time to help. Choose whether your next priority is exploration or construction.'],
    ],
  },
  garden: {
    survey: [
      ['Garden survey', 'A raised viewpoint reveals a new corner of the garden. Make a quick record or prepare a fuller investigation.'],
      ['Gardener’s notebook', 'A weathered notebook turns up beside the planting beds. Decide how to use it in your expedition.'],
      ['Greenhouse observation', 'An empty greenhouse bench gives your party room to lay out instruments and compare notes.'],
    ],
    supplies: [
      ['Potting shed supplies', 'A labeled box waits in the potting shed. Take a small share now or organize it for later work.'],
      ['Tool cart delivery', 'A tool cart arrives at your work area. Choose which part of the expedition should receive its help.'],
      ['Spare pots and trays', 'The garden team offers spare trays and a clear workbench. Decide how to put them to use.'],
    ],
    passage: [
      ['Garden trail markers', 'Handwritten markers point between the beds. Use the notes now or prepare for the next stage.'],
      ['Orchard sketch', 'A gardener shares a sketch of the orchard paths. Your team can turn it into several kinds of preparation.'],
      ['Gatekeeper’s map', 'At the garden gate, a keeper offers an annotated map and advice for organizing your equipment.'],
    ],
    rendezvous: [
      ['Greenhouse rendezvous', 'A neighboring garden team is ready to share its work area. Decide how their help fits your plans.'],
      ['Community workday', 'Volunteers gather beside your plot. Give their help an immediate purpose or reserve it for later work.'],
      ['Conservatory meeting', 'The conservatory team offers time, notes, and spare materials. Choose what your expedition needs next.'],
    ],
  },
  workshop: {
    survey: [
      ['Workbench survey', 'A clear workbench gives your team room to document its progress and organize the next investigation.'],
      ['Blueprint drawer', 'A forgotten drawer contains annotated sketches. Decide how to turn them into useful expedition preparation.'],
      ['Inspection bench', 'The inspection bench becomes available. Take a quick set of notes or prepare a more thorough session.'],
    ],
    supplies: [
      ['Workshop supply crate', 'A supply crate arrives beside the workbench. Unpack a little now or reserve help for later.'],
      ['Spare-parts trolley', 'A trolley of spare parts stops at your station. Choose which part of the expedition to support.'],
      ['Materials cupboard', 'The workshop keeper opens a cupboard of spare materials. Decide how your party will use its share.'],
    ],
    passage: [
      ['Workshop route markers', 'Fresh floor markings and a station sketch help your party organize its next stage.'],
      ['Service corridor plan', 'A maintenance plan shows how the workshop stations fit together. Choose how to use those notes.'],
      ['Assembly-line sketch', 'An annotated assembly sketch reaches your team. It can support immediate work or later preparation.'],
    ],
    rendezvous: [
      ['Workshop rendezvous', 'Another workshop team pauses beside your station. Decide how to use its offer of assistance.'],
      ['Apprentice exchange', 'A group of apprentices offers to help with notes, supplies, or your next construction effort.'],
      ['Repair crew visit', 'A visiting repair crew has time to spare. Choose how their help fits the expedition’s next priority.'],
    ],
  },
  archive: {
    survey: [
      ['Archive survey', 'A reading desk opens beside a promising collection. Make a quick record or prepare a fuller investigation.'],
      ['Annotated catalogue', 'An annotated catalogue appears in a return tray. Decide how to organize its useful expedition notes.'],
      ['Map-room appointment', 'Your team gains time at the map-room table. Use it now or organize materials for a later task.'],
    ],
    supplies: [
      ['Archive supply chest', 'A supply chest waits beside the reading room. Take a small share now or prepare for later work.'],
      ['Conservation trolley', 'A conservation trolley arrives with spare materials. Choose which expedition task to support.'],
      ['Reading-room delivery', 'A delivery of notebooks and storage materials reaches your desk. Decide where it will help most.'],
    ],
    passage: [
      ['Archive route markers', 'Shelf markers and a collection guide offer useful notes for organizing the next stage of your visit.'],
      ['Index-room guide', 'An archivist shares an annotated guide to the collections. Choose how your party will use it.'],
      ['Gallery floor plan', 'A floor plan left at the gallery entrance gives your team a useful planning resource.'],
    ],
    rendezvous: [
      ['Reading room rendezvous', 'Another research team joins your table. Decide how to use its offer of notes and practical help.'],
      ['Archivist’s consultation', 'An archivist sets aside time for your party. Choose whether to support investigation or construction.'],
      ['Restoration team visit', 'A restoration team offers spare materials and assistance. Decide how their help fits your next effort.'],
    ],
  },
  space: {
    survey: [
      ['Orbital survey', 'A station observation window becomes available. Take a quick reading or organize a fuller survey.'],
      ['Telemetry packet', 'A stored telemetry packet reaches your console. Decide how to use it to prepare your expedition.'],
      ['Observation deck', 'The observation deck has an empty instrument station. Choose how your crew will use its time there.'],
    ],
    supplies: [
      ['Station supply pod', 'A supply pod docks beside your station. Unpack what you need now or prepare for later work.'],
      ['Cargo-drone delivery', 'A cargo drone reaches your work area with spare supplies. Choose where its delivery will help most.'],
      ['Maintenance locker', 'A maintenance locker contains a small reserve of materials. Decide how your expedition will use them.'],
    ],
    passage: [
      ['Navigation beacons', 'A beacon log offers useful notes for the next stage of your expedition. Choose how to use them.'],
      ['Docking approach chart', 'A station pilot shares an annotated approach chart. Your team can put it to several practical uses.'],
      ['Service-ring map', 'A service-ring map reaches your console. Use it immediately or organize supplies for the next effort.'],
    ],
    rendezvous: [
      ['Station rendezvous', 'A neighboring crew meets your party at the station. Decide how their offer of help fits your plans.'],
      ['Relay-station exchange', 'The relay crew offers notes, supplies, and time at a workbench. Choose your expedition’s next priority.'],
      ['Engineering crew visit', 'An engineering crew has time to assist. Decide whether to support exploration or your next construction.'],
    ],
  },
};

export function encounterStory(board,id,dice,t){
  const theme=STORIES[board?.theme]?board.theme:'river',family=STORIES[theme][id]?id:'survey';
  const die=Array.isArray(dice)&&Number.isInteger(dice[0])&&dice[0]>=1&&dice[0]<=20?dice[0]:1;
  const variant=((die-1)%5)%3,[title,text]=STORIES[theme][family][variant];
  const prefix='field_story_'+theme+'_'+family+'_'+variant;
  return {title:tr(t,prefix+'_title',title),text:tr(t,prefix+'_text',text),variant};
}
