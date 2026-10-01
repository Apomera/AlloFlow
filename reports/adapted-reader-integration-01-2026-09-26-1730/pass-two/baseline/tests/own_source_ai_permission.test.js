// The Content Engine's own-source grounding must respect a source's
// allowAI:false. Its passages go straight into a model prompt, and only Lumen
// Study's UI enforced the flag, so a document whose provider forbids AI use
// was sent anyway (2026-09-23). The retrieval helper is extracted from the
// SHIPPED content_engine_module.js and run against the real Lumen core.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

const ROOT = path.resolve(__dirname, '..');
let retrieveOwnSourceEvidence;
beforeAll(() => {
  loadAlloModule('stem_lab/stem_lumen_evidence.js');
  const src = fs.readFileSync(path.join(ROOT, 'content_engine_module.js'), 'utf8');
  const start = src.indexOf('var OWN_SOURCE_PASSAGE_LIMIT =');
  const end = src.indexOf('var buildOwnSourceBrief =');
  expect(start, 'own-source retrieval must exist in content_engine_module.js').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  retrieveOwnSourceEvidence = new Function('warnLog', src.slice(start, end) + '\nreturn retrieveOwnSourceEvidence;')(() => {});
});
afterEach(() => { delete window.AlloOwnSources; });

describe('Content Engine own-source grounding', () => {
  it('never retrieves a source whose provider does not allow AI use', async () => {
    const E = window.LumenEvidence;
    let project = E.makeProject({ id: 'own' });
    project = E.upsertSource(project, { id: 'open', title: 'District reading guide', content: 'Photosynthesis converts light energy into chemical energy in plants.' });
    project = E.upsertSource(project, { id: 'licensed', title: 'Licensed textbook', content: 'Photosynthesis in plants: the licensed chapter text.', allowAI: false });
    window.AlloOwnSources = { loadProject: async () => project };
    const evidence = await retrieveOwnSourceEvidence('photosynthesis plants');
    expect(evidence.map(e => e.sourceId)).toEqual(['open']);
  });
});
