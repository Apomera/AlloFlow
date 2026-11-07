import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

// Gemini Canvas would not run AlloFlowANTI.txt while esbuild reported even one warning (11-07 white screen).
// esbuild refuses to load inside jsdom, so the check runs in its own Node process.
function diagnostics(source) {
  const script = "const {canvasCompileWarnings}=require('./dev-tools/check_anti_canvas_compile.cjs');"
    + "const fs=require('fs');const src=process.argv[1]==='@host'?fs.readFileSync('AlloFlowANTI.txt','utf8'):process.argv[1];"
    + "process.stdout.write(JSON.stringify(canvasCompileWarnings(src)));";
  return JSON.parse(execFileSync(process.execPath, ['-e', script, source], { encoding: 'utf8', maxBuffer: 1 << 24 }));
}

describe('AlloFlowANTI.txt compiles cleanly for Gemini Canvas', () => {
  it('has no esbuild warnings or errors', () => {
    const problems = diagnostics('@host');
    expect(problems.map((p) => p.kind + ' line ' + p.line + ': ' + p.text)).toEqual([]);
  }, 60000);

  it('flags the duplicate-key warning that blanked Canvas, so this check can fail', () => {
    const problems = diagnostics('const props = { t, a: 1, t };');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ kind: 'warning', id: 'duplicate-object-key', line: 1 });
  }, 60000);

  it('reports a syntax error as an error, not as a pass', () => {
    const problems = diagnostics('const broken = <div>;');
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].kind).toBe('error');
  }, 60000);
});
