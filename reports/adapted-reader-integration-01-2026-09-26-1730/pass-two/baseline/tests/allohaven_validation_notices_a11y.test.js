import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('AlloHaven validation notification accessibility', () => {
  const source = read('allohaven_module.js');

  it('provides a visible and announced standalone fallback', () => {
    expect(source).toContain('function notifyAlloHaven(message, type)');
    expect(source).toContain("live.setAttribute('aria-live', type === 'error' || type === 'warning' ? 'assertive' : 'polite')");
    expect(source).toContain("notice.setAttribute('role', urgent ? 'alert' : 'status')");
    expect(source).toContain("notice.setAttribute('aria-atomic', 'true')");
    expect(source).toContain("document.getElementById('allohaven-inline-notice')");
  });

  it('routes every memory-aid validation failure through the accessible helper', () => {
    expect(source.match(/notifyAlloHaven\([^\n]+, 'warning'\);/g)).toHaveLength(5);
    expect(source).not.toMatch(/else alert\s*\(/);
    expect(source).toContain("notifyAlloHaven('Add at least one card with both a front and back.', 'warning')");
    expect(source).toContain("notifyAlloHaven('Write a short association — what does this remind you of?', 'warning')");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/allohaven_module.js'));
  });
});

