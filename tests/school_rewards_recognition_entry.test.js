import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const code = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Code.gs'), 'utf8');
const index = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Index.html'), 'utf8');

function entry(role = 'staff') {
  const templates = [], sequence = [];
  const output = content => ({ content, setTitle() { return this; } });
  const context = {
    HtmlService: {
      createTemplateFromFile(name) {
        sequence.push('template');
        const template = { name, evaluate() { sequence.push('evaluate'); return output(JSON.stringify({ initialView: this.initialView })); } };
        templates.push(template);
        return template;
      },
      createHtmlOutput: output,
    },
  };
  runInNewContext(code, context);
  context.currentActor_ = () => { sequence.push('authorize'); if (!role) throw new Error('Fictional account denied'); return { role }; };
  return { context, templates, sequence, get: event => context.doGet(event) };
}

describe('authenticated non-sensitive recognition navigation hint', () => {
  it.each(['admin', 'staff'])('allows only the literal hint after authenticating %s', role => {
    const h = entry(role);
    expect(h.get({ parameter: { view: 'recognition' } }).content).toBe('{"initialView":"recognition"}');
    expect(h.sequence).toEqual(['authorize', 'template', 'evaluate']);
    expect(h.templates[0].name).toBe('Index');
  });

  it.each(['cashier', 'student', 'unknown'])('never grants an award navigation hint to %s', role => {
    const h = entry(role);
    expect(h.get({ parameter: { view: 'recognition' } }).content).toBe('{"initialView":""}');
  });

  it.each([undefined, null, {}, { parameter: {} }, { parameter: { view: 'RECOGNITION' } }, { parameter: { view: 'recognition ' } }, { parameter: { view: '<script>recognition</script>' } }, { parameter: { view: { toString() { throw new Error('Must not coerce'); } } } }])('ignores absent, unknown, malformed or untrusted hint %j', event => {
    expect(entry().get(event).content).toBe('{"initialView":""}');
  });

  it('serializes no draft, recipient, reason, arbitrary query, or URL into the template', () => {
    const h = entry();
    const result = h.get({ parameter: { view: 'recognition', codename: 'Fictional Private Fox', studentId: 'PRIVATE-STUDENT', learnerId: 'PRIVATE-LEARNER', reason: 'Fictional private reason', amount: '5', draft: '{"private":true}', redirect: 'https://untrusted.example/' } });
    expect(result.content).toBe('{"initialView":"recognition"}');
    expect(Object.keys(h.templates[0]).sort()).toEqual(['evaluate', 'initialView', 'name']);
    expect(result.content).not.toMatch(/Fictional|PRIVATE|untrusted|amount|draft|reason/);
  });

  it('does not read the navigation hint or create a template before authorization succeeds', () => {
    const h = entry(null);
    const parameter = {};
    Object.defineProperty(parameter, 'view', { get() { throw new Error('Must not read denied navigation'); } });
    const result = h.get({ parameter });
    expect(result.content).toContain('Access unavailable');
    expect(h.templates).toHaveLength(0);
    expect(h.sequence).toEqual(['authorize']);
    expect(result.content).not.toContain('Fictional account denied');
  });

  it('keeps the separate deployment-check path and POST mutation rejection unchanged', () => {
    const h = entry();
    h.context.statusPageHtml_ = () => 'Fictional deployment check';
    expect(h.get({ parameter: { api: 'status', view: 'recognition' } }).content).toBe('Fictional deployment check');
    expect(h.templates).toHaveLength(0);
    h.context.jsonOutput_ = value => value;
    expect(h.context.doPost({ postData: { contents: '{"amount":5}' } })).toEqual({ ok: false, code: 'method_not_allowed', error: 'HTTP mutation is disabled. Use the authenticated portal.' });
  });

  it('uses context-escaped template output for the body attribute, not a script or URL draft', () => {
    expect(index).toContain('<body data-school-rewards-view="<?= initialView ?>">');
    expect(index).not.toContain('<?!= initialView');
    expect(index).not.toMatch(/postMessage|window\.opener|location\.hash|localStorage|sessionStorage/);
  });
});
