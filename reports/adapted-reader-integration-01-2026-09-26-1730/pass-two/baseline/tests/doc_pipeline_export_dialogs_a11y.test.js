import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('exported document dialog accessibility', () => {
  const source = read('doc_pipeline_source.jsx');

  it('provides standalone announced notifications without native alert fallbacks', () => {
    expect(source).toContain('window.__alloflowNotify = function (message, type)');
    expect(source).toContain("notice.setAttribute('role', isError ? 'alert' : 'status')");
    expect(source).toContain("notice.setAttribute('aria-live', isError ? 'assertive' : 'polite')");
    expect(source).not.toMatch(/else alert\s*\(/);
    expect(source).not.toContain("catch (e) { alert('Could not save your answers:");
  });

  it('uses a labelled modal prompt with validation, focus containment, and restoration', () => {
    expect(source).toContain('window.__alloflowPrompt = function (options)');
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("input.setAttribute('aria-invalid', 'true')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (!dialog.contains(document.activeElement))");
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain("blocked.forEach(function (entry) { entry.el.setAttribute('inert', '')");
  });

  it('reuses the resolved learner identity and keeps accessible save-prompt fallbacks', () => {
    expect(source).toContain("await window.__alloflowPrompt({ title: window.__alloflowText('saveWorkTitle'");
    expect(source).toContain("await window.__alloflowPrompt({ title: window.__alloflowText('saveAnswersTitle'");
    expect(source).not.toContain("prompt('Enter your name or nickname so your teacher knows this is yours:')");
    expect(source.match(/var learnerWorkspace = window\.__alloflowLearnerWorkspace;/g)).toHaveLength(2);
    expect(source).toContain("var nickname = learnerWorkspace && learnerWorkspace.persist ? learnerWorkspace.nickname : ''");
    expect(source).toContain("var nick = learnerWorkspace && learnerWorkspace.persist ? learnerWorkspace.nickname : ''");
    expect(source).not.toContain('var nicknameFromUrl =');
    expect(source).not.toContain("var nick = up.get('nickname')");
    expect(source).toContain("pbtn.addEventListener('click', async function() {");
  });

  it('keeps generated root and public modules in parity', () => {
    const built = read('doc_pipeline_module.js');
    const publicBuilt = read('desktop/web-app/public/doc_pipeline_module.js');
    expect(built).toBe(publicBuilt);
    expect(built).toContain('window.__alloflowPrompt = function (options)');
    expect(built).not.toContain("prompt('Enter your name or nickname so your teacher knows this is yours:')");
  });
});
