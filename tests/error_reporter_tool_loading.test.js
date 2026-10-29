// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve('.');
const source = fs.readFileSync(process.env.REPORTER_SOURCE || path.join(root, 'error_reporter_module.js'), 'utf8');
const windows=[];
afterEach(async()=>{await Promise.resolve();for(const w of windows.splice(0))w.close();});
function boot(snapshot, trace = []) {
  const dom = new JSDOM('<html><body></body></html>', {url:'https://example.test/app/',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
  const w = dom.window;
  windows.push(w);
  w.__alloBuildStamp = {hash:'4173754e12',surface:'canvas',hostLoaderRevision:'2026-10-21-stall-v1'};
  w.__alloModuleSnapshot = () => snapshot;
  w.__alloModuleLoadTrace = trace;
  w.console.log = () => {};
  w.fetch = () => { throw new Error('No network permitted in diagnostic tests'); };
  Object.defineProperty(w.navigator, 'clipboard', {value:{writeText(text){w.__copied = text;return Promise.resolve();}}});
  w.eval(source);
  return w;
}
function report(w) {
  w.AlloModules.ErrorReporter.openPanel('errors');
  w.document.getElementById('aer-copy').click();
  return w.__copied;
}
function event(overrides = {}) {
  return {schemaVersion:1,at:Date.now(),hostLoaderRevision:'2026-10-21-stall-v1',loadId:'ml-test',attemptId:'ml-test-1',correlationId:'ml-test-1',stage:'blueprint-preflight',outcome:'slow',elapsedMs:15000,modules:[{name:'Core',status:'queued'}],counts:{queued:1,pending:0,failed:0},build:{cdn:'4173754e12',surface:'canvas',hostLoaderRevision:'2026-10-21-stall-v1'},...overrides};
}
describe('tool loading diagnostics', () => {
  it('does not claim completion while tools remain queued', () => {
    const w=boot({failed:[],pending:[],queued:['Core']});
    const text=report(w);
    expect(text).toContain('1 module(s) queued');
    expect(text).not.toContain('all modules loaded');
    expect(text).toContain('loader 2026-10-21-stall-v1');
  });
  it('reports failed, loading, and queued counts together', () => {
    const w=boot({failed:['Broken'],pending:['Quiz'],queued:['Core','Blueprint']});
    const text=report(w);
    expect(text).toContain('1 module(s) FAILED');
    expect(text).toContain('1 module(s) still loading');
    expect(text).toContain('2 module(s) queued');
  });
  it('reports completion only for an empty known snapshot', () => {
    const w=boot({failed:[],pending:[],queued:[]});
    expect(report(w)).toContain('all modules loaded');
  });
  it('does not label an unavailable snapshot as complete', () => {
    const w=boot(null);
    expect(report(w)).toContain('module status unavailable');
  });
  it('copies a slow-wait trace even when no exception was thrown and warnings are off', () => {
    const w=boot({failed:[],pending:[],queued:['Core']},[event()]);
    const text=report(w);
    expect(text).toContain('Tool-loading trace');
    expect(text).toContain('blueprint-preflight/slow');
    expect(text).toContain('15000ms');
    expect(text).toContain('Core:queued');
    expect(text).toContain('ml-test-1');
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(0);
  });
  it('keeps the diagnostic trace before oversized captured errors', () => {
    const w=boot({failed:[],pending:[],queued:['Core']},[event()]);
    for(let i=0;i<15;i++)w.console.error('large-error-'+i+'x'.repeat(2000));
    expect(report(w)).toContain('blueprint-preflight/slow');
  });
  it('excludes arbitrary trace data and rejects malformed enums and identifiers', () => {
    const w=boot({failed:[],pending:[],queued:[]},[
      event({sourceText:'PRIVATE_SOURCE_CANARY',studentName:'PRIVATE_NAME_CANARY',url:'https://private.test?key=PRIVATE_KEY_CANARY',build:{cdn:'4173754e12',surface:'canvas',privateValue:'PRIVATE_BUILD_CANARY'}}),
      event({stage:'PRIVATE_STAGE_CANARY',outcome:'PRIVATE_OUTCOME_CANARY'}),
      event({attemptId:'https://private.test/PRIVATE_ID_CANARY',modules:[{name:'https://private.test/PRIVATE_MODULE_CANARY',status:'queued'}]})
    ]);
    const text=report(w);
    for(const canary of ['PRIVATE_SOURCE_CANARY','PRIVATE_NAME_CANARY','PRIVATE_KEY_CANARY','PRIVATE_BUILD_CANARY','PRIVATE_STAGE_CANARY','PRIVATE_OUTCOME_CANARY','PRIVATE_ID_CANARY','PRIVATE_MODULE_CANARY'])expect(text).not.toContain(canary);
    expect(text).toContain('blueprint-preflight/slow');
  });
  it('caps the exported trace tail and preserves the latest recovery', () => {
    const trace=Array.from({length:90},(_,i)=>event({attemptId:'ml-test-'+i,outcome:i===89?'recovered':'started'}));
    const w=boot({failed:[],pending:[],queued:[]},trace);
    const text=report(w);
    expect(text).toContain('blueprint-preflight/recovered');
    expect(text).toContain('ml-test-89');
    expect(text).not.toContain('attempt=ml-test-0 ');
    expect((text.match(/blueprint-preflight\//g)||[]).length).toBeLessThanOrEqual(8);
  });
});

it('does not claim completion when an older host cannot report its queue',()=>{const w=boot({failed:[],pending:[]});expect(report(w)).toContain('queue status unavailable');expect(report(w)).not.toContain('all modules loaded');});
it('keeps valid diagnostic events when another timestamp is invalid',()=>{const w=boot({failed:[],pending:[],queued:[]},[event(),event({at:1e30})]);expect(report(w)).toContain('blueprint-preflight/slow');});
it('redacts the complete assignment-bearing URL fragment from diagnostic metadata', () => {
  const w = boot({ failed: [], pending: [], queued: [] });
  w.history.replaceState({}, '', '/app/#allo_pack=PRIVATE_ASSIGNMENT_CANARY');
  w.AlloModules.ErrorReporter.record('warn', 'Tool wait exceeded15s', '', 'module-loader', 0, 0);
  const text = report(w);
  expect(text).not.toContain('PRIVATE_ASSIGNMENT_CANARY');
  // The default report names the page without its query or fragment at all.
  expect(text).toContain('Page: https://example.test/app/\n');
  expect(JSON.stringify(w.AlloModules.ErrorReporter.getBuffer())).not.toContain('PRIVATE_ASSIGNMENT_CANARY');
});

it('redacts the fragment in the teacher-view full log too', () => {
  const w = boot({ failed: [], pending: [], queued: [] });
  w.__alloPendingCoachPosture = 'educator';
  w.history.replaceState({}, '', '/app/#allo_pack=PRIVATE_ASSIGNMENT_CANARY');
  w.AlloModules.ErrorReporter.record('warn', 'Tool wait exceeded15s', '', 'module-loader', 0, 0);
  w.AlloModules.ErrorReporter.openPanel('errors');
  w.document.getElementById('aer-include-log').click();
  const text = report(w);
  expect(text).not.toContain('PRIVATE_ASSIGNMENT_CANARY');
  expect(text).toContain('URL: https://example.test/app/#[redacted]');
  expect(text).toContain('URL fragment omitted.');
});
