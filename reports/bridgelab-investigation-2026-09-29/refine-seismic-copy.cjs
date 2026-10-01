const fs = require('node:fs');
const file = 'stem_lab/stem_tool_bridgelab.js';
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('        function seismicEngineeringSection() {');
const end = source.indexOf('        function windTunnelTestingSection()', start);
if (start < 0 || end < 0) throw new Error('Seismic lesson boundaries missing');
let section = source.slice(start, end);
const topics = {
  why: [
    'Moving foundations load the deck, piers, and connections. Different supports can experience different motion.',
    'The experiment assumes identical support motion and one elastic mode. It omits foundation and connection failure.'
  ],
  ground: [
    'Shaking contains many frequencies. Duration, amplitude, soil conditions, and structural periods affect response.',
    'Peak acceleration alone does not describe an earthquake. The experiment uses a controlled synthetic motion.'
  ],
  caltrans: [
    'The 1989 Loma Prieta earthquake damaged the Bay Bridge and Cypress Street Viaduct. California expanded its bridge retrofit program afterward.',
    'Retrofit improves resilience without removing all risk. Performance depends on the bridge, site, and shaking.'
  ],
  isolation: [
    'Flexible or sliding bearings can reduce transmitted forces while allowing greater deck movement.',
    'Bearing travel, clearances, and displacement capacity must be checked.'
  ],
  damping: [
    'Viscous dampers resist relative velocity and dissipate mechanical energy. Friction and yielding devices dissipate energy by other mechanisms.',
    'The experiment models linear viscous damping only. Real devices have limits.'
  ],
  capacity: [
    'Selected ductile regions yield while other components resist the forces those regions can transmit.',
    'Yielding can leave permanent damage. This elastic experiment does not simulate it.'
  ],
  restrainers: [
    'Restrainers limit relative movement; wider support seats provide more travel before unseating.',
    'These details need appropriate strength, anchorage, and displacement capacity.'
  ],
  liquefaction: [
    'In susceptible saturated soil, shaking can raise pore-water pressure and reduce soil strength. Settlement and lateral spreading can damage foundations.',
    'Site investigation is needed. The experiment assumes a stable foundation and does not model soil failure.'
  ],
  codes: [
    'Seismic requirements depend on the owner, jurisdiction, site hazard, and required performance.',
    'Use current project standards. These classroom controls do not establish code compliance.'
  ]
};
for (const [id, [what, limit]] of Object.entries(topics)) {
  const topicStart = section.indexOf("{ id: '" + id + "'");
  const next = section.indexOf("\n            }", topicStart);
  if (topicStart < 0 || next < 0) throw new Error('Missing topic: ' + id);
  let block = section.slice(topicStart, next);
  for (const [field, value] of Object.entries({ what, limit })) {
    const pattern = new RegExp(field + ": '(?:\\\\.|[^'\\\\])*'");
    if (!pattern.test(block)) throw new Error('Missing text: ' + id + '.' + field);
    block = block.replace(pattern, field + ": __alloT('stem.bridgelab.seismic_lesson_" + id + '_' + field + "', " + JSON.stringify(value) + ')');
  }
  section = section.slice(0, topicStart) + block + section.slice(next);
}
function fallback(key, value) {
  const pattern = new RegExp("(__alloT\\('stem\\.bridgelab\\." + key + "', )'(?:\\\\.|[^'\\\\])*'");
  if (!pattern.test(section)) throw new Error('Missing fallback: ' + key);
  section = section.replace(pattern, (_, prefix) => prefix + JSON.stringify(value));
}
fallback('why_bridges_are_seismic_hard', 'Why earthquake response is complex');
fallback('bridges_in_seismic_zones_are_designed_', 'Explore how ground motion reaches a bridge and how engineers manage forces, movement, and damage. Different strategies suit different structures and sites.');
fallback('a_maine_note', 'Investigate a local bridge: ');
fallback('maine_is_in_a_low_seismic_hazard_zone_', 'Identify the bridge owner, support arrangement, and local ground conditions. Use the owner’s published information to investigate its design. Appearance alone does not tell you its seismic performance.');
section = section.replace('key: t.id,\n                  onClick:', "key: t.id, type: 'button', 'aria-pressed': on,\n                  onClick:");
// Preserve the file's existing line endings during the small button change.
section = section.replace("key: t.id,\r\n                  onClick:", "key: t.id, type: 'button', 'aria-pressed': on,\r\n                  onClick:");
const citationAnchor = "            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)'";
if (!section.includes(citationAnchor)) throw new Error('Citation anchor missing');
const citations = [
  "            h('p', { style: { fontSize: 12, lineHeight: 1.7 } },",
  "              h('a', { href: 'https://www.fhwa.dot.gov/bridge/seismic/nhi130093.pdf', target: '_blank', rel: 'noopener noreferrer', style: { color: '#93c5fd' } }, 'FHWA: seismic bridge design'), ' · ',",
  "              h('a', { href: 'https://www.usgs.gov/programs/earthquake-hazards/what-are-effects-earthquakes', target: '_blank', rel: 'noopener noreferrer', style: { color: '#93c5fd' } }, 'USGS: earthquake effects'), ' · ',",
  "              h('a', { href: 'https://dot.ca.gov/programs/public-affairs/mile-marker/winter-2019-2020/copy-of-loma-prieta', target: '_blank', rel: 'noopener noreferrer', style: { color: '#93c5fd' } }, 'Caltrans: lessons from Loma Prieta')),",
  ''
].join(source.includes('\r\n') ? '\r\n' : '\n');
section = section.replace(citationAnchor, citations + citationAnchor);
source = source.slice(0, start) + section + source.slice(end);
fs.writeFileSync(file, source);
console.log('Updated nine seismic topics and their source links.');
