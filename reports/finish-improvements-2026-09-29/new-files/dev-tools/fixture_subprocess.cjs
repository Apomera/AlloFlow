'use strict';
const { spawn } = require('node:child_process');

function stopTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return Promise.resolve('already-exited');
  if (process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL'); return Promise.resolve('terminated'); }
    catch (error) { return Promise.resolve(error.code === 'ESRCH' ? 'already-exited' : 'unconfirmed: ' + error.message); }
  }
  return new Promise(resolve => {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    let done = false;
    const finish = status => { if (done) return; done = true; clearTimeout(timer); resolve(status); };
    const timer = setTimeout(() => { killer.kill(); child.kill('SIGKILL'); finish('unconfirmed: taskkill timed out'); }, 5000);
    killer.once('error', error => { child.kill('SIGKILL'); finish('unconfirmed: ' + error.message); });
    killer.once('close', code => { if (code !== 0) child.kill('SIGKILL'); finish(code === 0 ? 'terminated' : 'unconfirmed: taskkill exit ' + code); });
  });
}

function runFixtureProcess(command, args, { label, timeout, maxBuffer = 4 * 1024 * 1024, ...options }) {
  if (!Number.isFinite(timeout) || timeout <= 0) return Promise.reject(new Error('A positive subprocess timeout is required.'));
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { ...options, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', outputBytes = 0, failure, cleanup, cleanupTimer, finished = false;
    const finish = async (exitCode, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer); clearTimeout(cleanupTimer);
      const cleanupStatus = cleanup ? await cleanup : 'not-needed';
      if (!failure && exitCode === 0 && !signal) { resolve({ stdout, stderr }); return; }
      const elapsedMs = Date.now() - startedAt;
      const detail = [stdout.trim(), stderr.trim(), failure?.message].filter(Boolean).join('\n').slice(0, 8000);
      const error = new Error((label || 'Fixture subprocess') + ' failed after ' + elapsedMs + ' ms (exit=' + (exitCode ?? 'unknown')
        + ', signal=' + (signal || 'none') + ', timeout=' + timeout + ' ms, cleanup=' + cleanupStatus + '). ' + detail, { cause: failure });
      Object.assign(error, { code: failure?.code ?? exitCode, exitCode, signal, pid: child.pid, elapsedMs, timeoutMs: timeout, stdout, stderr, cleanupStatus });
      reject(error);
    };
    const stop = error => {
      if (finished || failure) return;
      failure = error;
      cleanup = stopTree(child);
      cleanupTimer = setTimeout(() => finish(child.exitCode, child.signalCode), 6000);
    };
    const timer = setTimeout(() => stop(Object.assign(new Error('Subprocess exceeded its time limit.'), { code: 'ETIMEDOUT' })), timeout);
    const collect = (kind, chunk) => {
      const bytes = Buffer.from(chunk, 'utf8');
      const remaining = maxBuffer - outputBytes;
      outputBytes += bytes.length;
      if (remaining > 0) {
        const text = bytes.subarray(0, remaining).toString('utf8');
        if (kind === 'stdout') stdout += text; else stderr += text;
      }
      if (outputBytes > maxBuffer) stop(Object.assign(new Error('Subprocess exceeded its output limit.'), { code: 'MAXBUFFERLIMIT' }));
    };
    child.stdout.setEncoding('utf8').on('data', chunk => collect('stdout', chunk));
    child.stderr.setEncoding('utf8').on('data', chunk => collect('stderr', chunk));
    child.once('error', error => { failure = error; finish(null, null); });
    child.once('close', finish);
  });
}

module.exports = { runFixtureProcess };
