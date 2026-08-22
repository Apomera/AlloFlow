import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadSessionSummaryApi() {
  const moduleWindow = { AlloModules: {}, React: {} };
  const quietConsole = { log() {}, error() {} };
  const source = readFileSync(resolve(process.cwd(), 'view_session_modal_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'console', source)(moduleWindow, quietConsole);
  const api = moduleWindow.AlloModules.SessionModal;
  if (!api || typeof api.buildRosterSessionSummary !== 'function') {
    throw new Error('Session summary CDN API did not register');
  }
  return api;
}
