'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'ui_strings.js');
const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
const previous = Object.fromEntries(Object.entries(registry.stem.flightsim).slice(0, 44));
if (Object.keys(previous)[43] !== 'minus_key') throw new Error('Review the scoped key list: registry order changed');
const additions = {
  nav_next_discovery_status: 'Next discovery: {place}. Bearing {bearing} degrees, {distance} nautical miles away.',
  challenge_controls_touch: 'Touch controls: drag up/down from the middle to pitch, sideways to bank, and along the far right edge to change power. Use Pause to stop.',
  challenge_climb_coaching_keys: 'Use W/S for small pitch changes and +/− for power. Climb toward {alt} ft MSL, then ease the nose down to level off.',
  challenge_climb_coaching_touch: 'Drag gently up/down from the middle to pitch; use the far right edge for power. Climb toward {alt} ft MSL, then ease the nose down to level off.',
  challenge_hold_coaching: 'Level the wings and use small pitch and power changes to keep vertical speed near zero. Hold the target altitude until the timer finishes.',
  challenge_landing_coaching_keys: 'Return toward a runway. Reduce power with − and use W/S for small pitch changes. Aim for about {speed} kts IAS; just above the runway, gently raise the nose to slow the descent.',
  challenge_landing_coaching_touch: 'Return toward a runway. Drag down along the far right edge to reduce power; drag gently up/down from the middle to pitch. Aim for about {speed} kts IAS, then gently raise the nose just above the runway.',
  challenge_brakes_keys: 'Press X to release the wheel brakes before adding power.',
  challenge_brakes_touch: 'Open Deck and release Wheel Brakes before adding power.',
  coaching_challenge: 'Some challenge objectives remain unobserved. Review the checklist below and retry with one control change in mind.'
};
const canonical = Object.fromEntries(Object.entries({...previous, ...additions}).map(([key,value]) => ['stem.flightsim.'+key,value]));
fs.writeFileSync(path.join(__dirname, 'skyschool_finish_20261017_keys_en.json'), JSON.stringify(canonical,null,2)+'\n');
for (const relative of ['ui_strings.js','desktop/web-app/public/ui_strings.js']) {
  const target = path.join(root,relative);
  const before = fs.readFileSync(target,'utf8');
  const data = JSON.parse(before);
  for (const [key,value] of Object.entries(additions)) {
    if (data.stem.flightsim[key] !== undefined && data.stem.flightsim[key] !== value) throw new Error('Conflicting English: '+relative+': '+key);
    data.stem.flightsim[key] = value;
  }
  if (fs.readFileSync(target,'utf8') !== before) throw new Error('Concurrent edit: '+relative);
  fs.writeFileSync(target, JSON.stringify(data,null,2)+'\n');
}
console.log('Registered 9 new keys and updated coaching_challenge; staged '+Object.keys(canonical).length+' active keys.');
