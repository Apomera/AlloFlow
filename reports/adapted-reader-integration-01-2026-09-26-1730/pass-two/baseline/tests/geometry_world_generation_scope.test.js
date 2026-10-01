import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
function slice(from, to) { const start=source.indexOf(from),end=source.indexOf(to,start+from.length); if(start<0||end<0)throw Error('Missing source boundary '+from);return source.slice(start,end); }
// Intentionally excludes render(), its local parser, and every other render local.
const api = new Function(slice('  // ── Rich lesson generation helpers','  // ── End rich lesson generation helpers')
  + slice('  var AI_WORLD_PROMPT_BASE =','  // Module scope, not inside the builder view')
  + slice('  var AI_FOLLOWUP_PROMPT =','  // ══════════════════════════════════════════════════════════════')
  + '\nreturn { runGeometryLessonGeneration };')();

describe('Generation helpers run in the real module scope', () => {
  it('parses the planning response without relying on the render-local JSON parser', async () => {
    const plan = { title:'Two workshops',activities:[0,1].map(i=>({id:'workshop-'+i,title:'Workshop '+i,challenge:'Build a different prism',hint:'Count layers',successCriteria:'Compare volumes',reflection:'Explain the arrangement',estimatedMinutes:6})) };
    let requestCount=0;
    const callGemini=vi.fn(async()=>{requestCount++;return JSON.stringify(requestCount===1?plan:{});});
    await expect(api.runGeometryLessonGeneration({depth:1,topic:'Volume',grade:'4',callGemini,isCurrent:()=>requestCount<2})).rejects.toMatchObject({code:'GW_GENERATION_CANCELLED'});
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(callGemini.mock.calls[1][0]).toContain('Approved learning plan');
    expect(callGemini.mock.calls[1][0]).not.toContain('REPAIR REQUIRED');
  });
});
