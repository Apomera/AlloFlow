import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_sociallab.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_sociallab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Social Skills Lab chat control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the response field and arrow-only send action', () => {
    const text = source();
    expect(text).toContain("h('input', { type: 'text', 'aria-label': 'Your response'");
    expect(text).toContain("'aria-label': 'Send social skills response'");
  });

  it('does not suppress the input focus outline', () => {
    expect(source()).not.toContain("fontSize: '14px', outline: 'none'");
  });

  it('announces scenario transitions and labels the read-aloud action', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Read peer message aloud'");
    expect(text).toContain("'aria-label': 'Scenario ' + (scenarioIdx + 1) + ' of ' + scenarios.length");
    expect(text).toContain("announceToSR('Scenario ' + (scenarioIdx + 2) + ' of ' + scenarios.length + '. Choose your response.')");
  });

  it('exposes feedback and typing states as live status content', () => {
    const text = source();
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-label': aiScenario.peerName + ' is typing'");
    expect(text).toContain("role: 'region', 'aria-live': 'polite', 'aria-label': 'Conversation feedback'");
  });

});
