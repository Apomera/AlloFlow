import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Advocacy inline validation accessibility', () => {
  const source = read('sel_hub/sel_tool_advocacy.js');

  it('renders persistent validation errors as assertive messages', () => {
    expect(source).toContain('function advInlineError(id, message)');
    expect(source).toContain("role: 'alert'");
    expect(source).toContain('function advFocusInvalidField(id)');
    expect(source).toContain("document.getElementById(id)");
    expect(source).toContain("typeof field.focus === 'function'");
  });

  it('ties every required field to its error and exposes invalid state', () => {
    for (const id of [
      'adv-request-what',
      'adv-script-text',
      'adv-champion-name',
      'adv-journal-moment',
    ]) {
      expect(source).toContain(`id: '${id}', required: true`);
      expect(source).toContain(`'aria-describedby': error ? '${id}-error' : undefined`);
      expect(source).toContain(`advInlineError('${id}-error', error)`);
      expect(source).toContain(`advFocusInvalidField('${id}')`);
    }
    expect(source.match(/'aria-invalid': !!error/g)).toHaveLength(4);
  });

  it('clears stale errors as the student corrects each field', () => {
    expect(source.match(/if \(error\) setError\(''\)/g)).toHaveLength(4);
  });

  it('contains no executable native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?:window\.)?(?:alert|confirm|prompt)\(/);
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/sel_hub/sel_tool_advocacy.js'));
  });
});
