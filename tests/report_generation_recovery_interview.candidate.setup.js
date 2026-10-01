import './report_generation_recovery.candidate.setup.js';
import { readFileSync } from 'node:fs';

// Test the owned source before root performs the canonical root/public build.
new Function(readFileSync('personas_source.jsx', 'utf8'))();
window.AlloModules.Personas = true;
