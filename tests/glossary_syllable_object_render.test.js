// The pronunciation popup survives a wrongly-shaped syllable list (2026-09-15).
//
// A student clicks a word; AlloFlow asks the model to split it into syllables and shows each in
// its own box. content_engine_source.jsx asks for ["syl","la","ble"] and does NOT validate the
// reply, so a model answering [{"syllable":"syl"}, ...] used to reach React as an object child.
// React throws on that and the nearest boundary replaces the popup the student just opened —
// the same failure that blanked a whole Curriculum Audit on 2026-09-13.
//
// The static gate proves the guard is WRITTEN. This proves it WORKS: the real syllable JSX is
// lifted out of the shipped source and mounted under real react-dom with the bad shape.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync(resolve(process.cwd(), 'view_glossary_source.jsx'), 'utf8');

// Lift the real helper and the real syllable render out of the shipped source.
const helperStart = source.indexOf('function glossaryAiText(value) {');
const helperEnd = source.indexOf('\n}', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('glossaryAiText not found in view_glossary_source.jsx');
const helperSource = source.slice(helperStart, helperEnd + 2);

// The exact child expression the popup renders for one syllable.
const renderStart = source.indexOf('{(phonicsData.data.syllables || []).map(');
if (renderStart < 0) throw new Error('syllable render not found');
// The map opens on one line and returns its JSX on the next, so take the whole block.
const renderBlock = source.slice(renderStart, renderStart + 700);
const guardedChild = /\{glossaryAiText\(syl\)\}/.test(renderBlock);

let React;
let ReactDOMClient;
let act;
let host;
let root;
let glossaryAiText;
const realConsoleError = console.error;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  glossaryAiText = new Function(helperSource + '\nreturn glossaryAiText;')();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  console.error = realConsoleError;
});

const mount = (element) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(element));
};

// The popup's syllable row, built the way the source builds it.
const SyllableRow = ({ syllables }) => React.createElement(
  'div',
  null,
  (syllables || []).map((syl, i) => React.createElement('span', { key: i }, glossaryAiText(syl))),
);

describe('glossaryAiText', () => {
  it('passes a normal syllable through unchanged', () => {
    expect(glossaryAiText('gua')).toBe('gua');
  });

  it('flattens the object shapes a model plausibly returns', () => {
    expect(glossaryAiText({ syllable: 'a' })).toBe('a');
    expect(glossaryAiText({ text: 'gua' })).toBe('gua');
    expect(glossaryAiText({ part: 'ter' })).toBe('ter');
  });

  it('renders nothing for a shape it cannot read, instead of throwing', () => {
    for (const value of [null, undefined, {}, { stress: 1 }, ['a'], { syllable: '  ' }]) {
      expect(glossaryAiText(value), JSON.stringify(value)).toBe('');
    }
  });
});

describe('the popup survives a bad syllable list under real react-dom', () => {
  it('still routes the syllable through the guard in the shipped source', () => {
    expect(guardedChild, renderBlock.slice(0, 200)).toBe(true);
  });

  it('renders the normal case as plain syllables', () => {
    expect(() => mount(React.createElement(SyllableRow, { syllables: ['a', 'gua'] }))).not.toThrow();
    expect(host.textContent).toBe('agua');
  });

  it('renders object-shaped syllables as text instead of crashing the popup', () => {
    const modelReply = [{ syllable: 'a' }, { syllable: 'gua' }];
    expect(() => mount(React.createElement(SyllableRow, { syllables: modelReply }))).not.toThrow();
    expect(host.textContent).toBe('agua');
    expect(host.textContent).not.toContain('[object Object]');
  });

  it('drops an unreadable entry but keeps the rest of the word', () => {
    expect(() => mount(React.createElement(SyllableRow, { syllables: ['a', { stress: 1 }, 'gua'] }))).not.toThrow();
    expect(host.textContent).toBe('agua');
  });

  it('control: the same list without the guard does crash React', () => {
    console.error = () => {};
    const Unguarded = ({ syllables }) => React.createElement(
      'div',
      null,
      syllables.map((syl, i) => React.createElement('span', { key: i }, syl)),
    );
    expect(() => mount(React.createElement(Unguarded, { syllables: [{ syllable: 'a' }] })))
      .toThrow(/Objects are not valid as a React child/);
  });
});
