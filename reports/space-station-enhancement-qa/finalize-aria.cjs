const fs = require('node:fs');
const path = 'stem_lab/stem_tool_spacestation.js';
let source = fs.readFileSync(path, 'utf8');
const replacements = [
  ["'aria-label': 'Flight computer controls'", "'aria-label': __alloT('stem.spacestation.flight_computer_controls', 'Flight computer controls')"],
  ["'aria-label': 'Docking simulation clock speed'", "'aria-label': __alloT('stem.spacestation.docking_clock_speed', 'Docking simulation clock speed')"],
  ["'aria-label': 'Transfer flight presets'", "'aria-label': __alloT('stem.spacestation.transfer_flight_presets', 'Transfer flight presets')"],
  ["'aria-label': 'Transfer flight controls'", "'aria-label': __alloT('stem.spacestation.transfer_flight_controls', 'Transfer flight controls')"],
  ["'aria-label': 'EVA torque wrench setting in newton meters'", "'aria-label': __alloT('stem.spacestation.eva_torque_wrench_setting', 'EVA torque wrench setting in newton meters')"],
  ["'aria-label': braced ? 'Foot restraint transfers tool reaction into the station. Astronaut angular velocity remains zero.' : 'Unrestrained astronaut rotates opposite to the wrench at ' + (angularRate * 180 / Math.PI).toFixed(1) + ' degrees per second after a half-second pulse.'", "'aria-label': braced ? __alloT('stem.spacestation.eva_restrained_reaction', 'Foot restraint transfers tool reaction into the station. Astronaut angular velocity remains zero.') : __alloFill(__alloT('stem.spacestation.eva_free_reaction', 'Unrestrained astronaut rotates opposite to the wrench at {value1} degrees per second after a half-second pulse.'), { value1: (angularRate * 180 / Math.PI).toFixed(1) })"],
  ["'aria-label': 'To-scale orbital transfer from ' + orbitAlt + ' to ' + target + ' kilometers. ' + status + '. Elapsed ' + (flight.elapsedSeconds / 60).toFixed(1) + ' minutes. Current altitude ' + flight.altitude.toFixed(1) + ' kilometers. Amber path is the transfer ellipse; Earth lies at its focus.'", "'aria-label': __alloFill(__alloT('stem.spacestation.transfer_orbit_diagram', 'To-scale orbital transfer from {value1} to {value2} kilometers. {value3}. Elapsed {value4} minutes. Current altitude {value5} kilometers. Amber path is the transfer ellipse; Earth lies at its focus.'), { value1: orbitAlt, value2: target, value3: status, value4: (flight.elapsedSeconds / 60).toFixed(1), value5: flight.altitude.toFixed(1) })"]
];
for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error('Expected unique original text: ' + from);
  source = source.replace(from, to);
}
fs.writeFileSync(path, source);
console.log('Localized seven new simulator descriptions.');
