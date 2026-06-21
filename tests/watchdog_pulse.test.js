// Fix A (2026-06-21): the dead-man watchdog resets only on 'alloflow:pipeline-warn', which _pipeLog
// fires on call start/done/step events. The [Retry]/[GeminiGate] throttle events are plain warnLog and
// never pulsed it — so under a sustained Canvas 401 throttle, every call stuck retrying for >8 min with
// no _pipeLog event read as "silence" and the watchdog cleared a slow-but-progressing run (the false
// "premature bail"). A retry is activity → it must pulse the watchdog.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('the retry path pulses the dead-man watchdog (fix A)', () => {
  it('defines _pulsePipelineWatchdog that dispatches alloflow:pipeline-warn', () => {
    expect(pipe).toMatch(/var _pulsePipelineWatchdog = function \(\) \{/);
    expect(pipe).toMatch(/_pulsePipelineWatchdog[\s\S]{0,300}new CustomEvent\('alloflow:pipeline-warn'/);
  });
  it('is called on BOTH the canvas-auth retry and the generic transient retry', () => {
    // canvas-auth retry branch (before the backoff sleep)
    expect(pipe).toMatch(/_pulsePipelineWatchdog\(\);[\s\S]{0,300}setTimeout\(r, _backoff\)/);
    // generic transient retry branch
    expect(pipe).toMatch(/_pulsePipelineWatchdog\(\); \/\/ a retry is activity \(fix A\)/);
  });
  it('the watchdog still re-arms on alloflow:pipeline-warn (the heartbeat it listens to)', () => {
    expect(host).toMatch(/addEventListener\('alloflow:pipeline-warn', onActivity\)/);
    expect(host).toMatch(/const arm = \(\) => \{ clearTimeout\(id\); id = setTimeout\(fire, IDLE_LIMIT\); \}/);
  });
});
