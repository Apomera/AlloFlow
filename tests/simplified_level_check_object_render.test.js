// The teacher's reading-level panel survives a wrongly-shaped rubric reason (2026-09-15).
//
// The level check asks the model to rate the text on several dimensions and explain each rating.
// view_simplified_source.jsx maps generatedContent.levelCheck.rubric and printed `data.reason`
// straight as a React child. A model returning {reason: {...}} or a nested explanation object
// would throw "Objects are not valid as a React child" and the boundary would replace the panel.
//
// The static gate proves the guard exists; this proves it behaves, under real react-dom, using
// the helper lifted out of the shipped source.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync(resolve(process.cwd(), 'view_simplified_source.jsx'), 'utf8');

const helperStart = source.indexOf('function simplifiedAiText(value) {');
const helperEnd = source.indexOf('\n  }', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('simplifiedAiText not found in view_simplified_source.jsx');
const helperSource = source.slice(helperStart, helperEnd + 4);

let React;
let ReactDOMClient;
let act;
let host;
let root;
let simplifiedAiText;
const realConsoleError = console.error;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  simplifiedAiText = new Function(helperSource + '\nreturn simplifiedAiText;')();
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

// The rubric row as the source renders it: a numeric score drives the bar, the reason is text.
const RubricRow = ({ entries }) => React.createElement(
  'div',
  null,
  Object.entries(entries).map(([key, data]) => React.createElement(
    'div',
    { key },
    React.createElement('span', null, key),
    React.createElement('p', null, simplifiedAiText(data.reason)),
  )),
);

describe('simplifiedAiText', () => {
  it('passes a normal reason through unchanged', () => {
    expect(simplifiedAiText('Sentences are short and concrete.')).toBe('Sentences are short and concrete.');
  });

  it('flattens the object shapes a model plausibly returns', () => {
    expect(simplifiedAiText({ reason: 'Vocabulary is above grade level.' })).toBe('Vocabulary is above grade level.');
    expect(simplifiedAiText({ explanation: 'Long clauses.' })).toBe('Long clauses.');
    expect(simplifiedAiText({ text: 'Dense noun phrases.' })).toBe('Dense noun phrases.');
  });

  it('renders nothing for a shape it cannot read', () => {
    for (const value of [null, undefined, {}, { weight: 2 }, ['a'], { reason: '   ' }]) {
      expect(simplifiedAiText(value), JSON.stringify(value)).toBe('');
    }
  });
});

describe('the level-check panel survives a bad rubric under real react-dom', () => {
  it('routes the reason through the guard in the shipped source', () => {
    expect(source).toContain('{simplifiedAiText(data.reason)}');
    expect(source).not.toContain('italic">{data.reason}</p>');
  });

  it('renders the normal case', () => {
    const rubric = { sentenceLength: { score: 1, reason: 'Sentences are short.' } };
    expect(() => mount(React.createElement(RubricRow, { entries: rubric }))).not.toThrow();
    expect(host.textContent).toContain('Sentences are short.');
  });

  it('renders an object-shaped reason as text instead of crashing the panel', () => {
    const rubric = {
      sentenceLength: { score: 1, reason: { reason: 'Sentences run long.', severity: 'high' } },
      vocabulary: { score: -2, reason: 'Words are familiar.' },
    };
    expect(() => mount(React.createElement(RubricRow, { entries: rubric }))).not.toThrow();
    expect(host.textContent).toContain('Sentences run long.');
    expect(host.textContent).toContain('Words are familiar.');
    expect(host.textContent).not.toContain('[object Object]');
  });

  it('keeps the other dimensions when one reason is unreadable', () => {
    const rubric = {
      sentenceLength: { score: 0, reason: { weight: 3 } },
      vocabulary: { score: -1, reason: 'Words are familiar.' },
    };
    expect(() => mount(React.createElement(RubricRow, { entries: rubric }))).not.toThrow();
    expect(host.textContent).toContain('Words are familiar.');
    expect(host.textContent).toContain('sentenceLength');
  });

  it('control: the same rubric without the guard does crash React', () => {
    console.error = () => {};
    const Unguarded = ({ entries }) => React.createElement(
      'div',
      null,
      Object.entries(entries).map(([key, data]) => React.createElement('p', { key }, data.reason)),
    );
    expect(() => mount(React.createElement(Unguarded, { entries: { a: { reason: { reason: 'x' } } } })))
      .toThrow(/Objects are not valid as a React child/);
  });
});
