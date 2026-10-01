import './setup.js';
import { readFileSync } from 'node:fs';

// Source-only integration while the coordinating owner builds shared mirrors.
for (const [file, flag] of [
  ['generate_dispatcher_source.jsx', 'GenDispatcherModule'],
  ['generation_helpers_source.jsx', 'GenerationHelpersModule'],
]) {
  new Function(readFileSync(file, 'utf8'))();
  window.AlloModules[flag] = true;
}
