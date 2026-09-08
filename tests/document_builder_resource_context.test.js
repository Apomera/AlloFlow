import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import { JSDOM } from 'jsdom';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const declarations = parse(source, { sourceType: 'script', plugins: ['jsx'] }).program.body;
const names = ['_builderResourceOptions', '_builderResourceIncluded', '_builderBulkResourceUpdate', '_builderSelectedResourceItems', '_builderVisibleDocumentTitle', '_builderSaveStatusLabel'];
const context = vm.createContext({});
vm.runInContext(names.map(name => {
  const declaration = declarations.find(node => node.type === 'FunctionDeclaration' && node.id.name === name);
  if (!declaration) throw new Error('Missing actual Builder helper: ' + name);
  return source.slice(declaration.start, declaration.end);
}).join('\n'), context);

describe('Document Builder mixed education resource selection', () => {
  const history = [
    { id: 'reading', type: 'simplified', title: 'Pond ecosystems' },
    { id: 'quiz', type: 'quiz', title: 'Food-web check' },
    { id: 'memory', type: 'memory-aid', title: 'Vocabulary recall' },
    { id: 'challenge', type: 'applied-challenge', title: 'Design a habitat' },
  ];

  it('deselects default-included Memory Aid and Applied Challenge along with the visible resources', () => {
    const config = { includeSimplified: true, includeQuiz: true, includeGlossary: true };
    const update = context._builderBulkResourceUpdate(history, config);
    expect({ ...update }).toEqual({ includeSimplified: false, includeQuiz: false, includeMemoryAid: false, includeAppliedChallenge: false });
    expect(context._builderSelectedResourceItems(history, { ...config, ...update }).every(item => !item.included)).toBe(true);
    expect(update).not.toHaveProperty('includeGlossary');
  });

  it('selects every available type even after both newer resource types were explicitly excluded', () => {
    const update = context._builderBulkResourceUpdate(history, { includeSimplified: true, includeQuiz: true, includeMemoryAid: false, includeAppliedChallenge: false });
    expect(Object.values(update)).toEqual([true, true, true, true]);
  });

  it('handles empty and unsupported resources without selecting unrelated types', () => {
    expect({ ...context._builderBulkResourceUpdate([null, { type: 'unsupported' }], {}) }).toEqual({});
    expect(context._builderSelectedResourceItems(null, {})).toEqual([]);
  });

  it('preserves selected resource order and exposes useful plain-text names', () => {
    const items = context._builderSelectedResourceItems([
      history[3], { ...history[0], title: '<b>Pond</b> ecosystems' }, history[1],
    ], { includeSimplified: true, includeQuiz: false });
    expect(items.map(item => item.id)).toEqual(['challenge', 'reading', 'quiz']);
    expect(items.map(item => item.included)).toEqual([true, true, false]);
    expect(items[1].title).toBe('Pond ecosystems');
  });

  it('reflects live document headings instead of an older export configuration title', () => {
    const doc = new JSDOM('<title>Older generated title</title><h1>Revised\n science handout</h1>').window.document;
    expect(context._builderVisibleDocumentTitle(doc, 'Old configuration')).toBe('Revised science handout');
    doc.querySelector('h1').textContent = 'New teaching plan';
    expect(context._builderVisibleDocumentTitle(doc)).toBe('New teaching plan');
  });

  it('distinguishes durable local saving from session capture and a save failure', () => {
    expect(context._builderSaveStatusLabel('saved', 0)).toBe('Saved on this device');
    expect(context._builderSaveStatusLabel('captured', 0)).toBe('Saved for this session');
    expect(context._builderSaveStatusLabel('error', 0)).toBe('Changes not captured. Try Save again.');
    expect(context._builderSaveStatusLabel('capturing', Date.now())).toBe('Saving changes…');
  });
});
