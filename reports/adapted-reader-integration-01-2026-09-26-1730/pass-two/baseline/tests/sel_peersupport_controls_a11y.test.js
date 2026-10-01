import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_peersupport.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_peersupport.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Peer Support chat control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the OARS response field and arrow-only send action', () => {
    const text = source();
    expect(text).toContain("h('input', { type: 'text', 'aria-label': 'Your response using OARS skills'");
    expect(text).toContain("'aria-label': 'Send OARS response'");
  });

  it('does not suppress the input focus outline', () => {
    const text = source();
    expect(text).not.toContain("fontSize: '13px', outline: 'none'");
  });

  it('gives practice choices full labels and announces exercise progress', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Exercise ' + (idx + 1) + ' of ' + exercises.length");
    expect(text).toContain("'aria-label': 'Response ' + String.fromCharCode(65 + oi) + ': ' + opt.text");
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(text).toContain("announceToSR('Exercise ' + (idx + 2) + ' of ' + exercises.length + '. Choose your response.')");
  });

  it('exposes OARS and AI role-play status semantics', () => {
    const text = source();
    expect(text).toContain("'aria-label': s.label + ': ' + count + ' used'");
    expect(text).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Rapport with ' + aiScenario.peerName");
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-label': aiScenario.peerName + ' is typing'");
    expect(text).toContain("role: 'region', 'aria-live': 'polite', 'aria-label': 'OARS conversation feedback'");
  });

});
