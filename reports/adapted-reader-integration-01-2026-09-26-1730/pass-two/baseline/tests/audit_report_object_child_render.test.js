// The Curriculum Audit report survives the payload that actually crashed it (2026-09-15).
//
// On 2026-09-13 Aaron opened the Curriculum Audit and got a blank surface:
//   Error: Objects are not valid as a React child (found: object with keys {profile, encounter})
//   at ComprehensiveSection / AccessibilitySection / ComprehensiveBlock / AlignmentReportView
// The accessibility reviewer had returned studentImpacts as OBJECTS, not the strings the prompt
// asked for, and one object child took down all nine dimensions at once.
//
// Two defences were added. Until now neither was ever EXECUTED by a test:
//   1. auditText(...)      — flattens a model object into a readable sentence.
//   2. DimensionBoundary   — contains a failure to ONE dimension card.
// The static gate proves both are written. This proves they behave, under real react-dom,
// with the exact shape from Aaron's error.
//
// The second defence matters on a path the first cannot cover: view_alignment_report_source.jsx
// reads `comprehensive` straight off a SAVED resource with no revalidation (see the "Audit
// details are unavailable" branch, ~L1151). An audit saved by a build older than the coercion
// carries raw model objects, so the boundary is the only thing standing between a stale save
// and a blank report.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync(resolve(process.cwd(), 'view_alignment_report_source.jsx'), 'utf8');

// Lift the real helper (and the key lists it closes over) out of the shipped source.
const keysStart = source.indexOf('var AUDIT_TEXT_LEAD_KEYS');
const helperStart = source.indexOf('function auditText(entry) {');
const helperEnd = source.indexOf('\n  }', helperStart);
if (keysStart < 0 || helperStart < 0 || helperEnd < 0) {
  throw new Error('auditText / AUDIT_TEXT_* not found in view_alignment_report_source.jsx');
}
const helperSource = source.slice(keysStart, helperEnd + 4);

// Lift the real boundary too, so a change to its recovery UI is caught here.
// Start at _ReactBase: the boundary inherits from it, and taking the real
// declaration means this exercises the shipped React.Component wiring.
const boundaryStart = source.indexOf('var _ReactBase =');
const boundaryEnd = source.indexOf('function ComprehensiveBlock', boundaryStart);
if (boundaryStart < 0 || boundaryEnd < 0) throw new Error('DimensionBoundary / _ReactBase not found');
const boundarySource = source.slice(boundaryStart, boundaryEnd);

let React;
let ReactDOMClient;
let act;
let host;
let root;
let auditText;
let DimensionBoundary;
const realConsoleError = console.error;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  auditText = new Function(helperSource + '\nreturn auditText;')();

  // The boundary's render() is JSX in the source; rebuild that one element with
  // createElement so the class can be exercised without a JSX transform here.
  // Everything else (getDerivedStateFromError, componentDidCatch, the state
  // shape, the 240-char message clamp) is the shipped code, lifted verbatim.
  const jsxStart = boundarySource.indexOf('DimensionBoundary.prototype.render');
  const lifted = boundarySource.slice(0, jsxStart);
  DimensionBoundary = new Function('React', 'window', lifted + `
    DimensionBoundary.prototype.render = function () {
      if (!this.state.failed) return this.props.children;
      var p = this.props;
      return React.createElement('section', {
        id: p.id || undefined,
        'data-audit-section-failed': 'true',
      },
        React.createElement('h3', null, p.label + ' could not be displayed'),
        React.createElement('p', null, 'The saved data for this section could not be rendered. The other dimensions are unaffected; regenerate the audit to rebuild this one.'),
        React.createElement('pre', null, this.state.message));
    };
    return DimensionBoundary;
  `)(React, { warnLog: () => {} });
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

// The student-impact list exactly as AccessibilitySection renders it (~L509).
const StudentImpacts = ({ impacts }) => React.createElement(
  'ul',
  null,
  impacts.map((s, i) => React.createElement('li', { key: i }, auditText(s))),
);

// The payload from Aaron's 2026-09-13 crash: the reviewer named a student profile
// and what they would encounter, but returned it STRUCTURED instead of as prose.
const AARON_PAYLOAD = [
  { profile: 'A student using a screen reader', encounter: 'would hear "image" with no description for 3 of the 4 figures.' },
  { profile: 'A student with color blindness', encounter: 'cannot follow the red/green callouts in the lab safety table.' },
];

describe('auditText flattens the shapes the audit reviewers actually return', () => {
  it('passes a well-formed string through unchanged', () => {
    expect(auditText('A student using a screen reader would hear nothing.'))
      .toBe('A student using a screen reader would hear nothing.');
  });

  it('joins {profile, encounter} into one readable sentence', () => {
    // The tail starts lowercase, so it reads as a continuation, not a label.
    expect(auditText(AARON_PAYLOAD[0]))
      .toBe('A student using a screen reader would hear "image" with no description for 3 of the 4 figures.');
  });

  it('uses a colon when the tail starts as its own sentence', () => {
    expect(auditText({ claim: 'Photosynthesis needs sunlight', correction: 'Chemosynthesis is the counterexample.' }))
      .toBe('Photosynthesis needs sunlight: Chemosynthesis is the counterexample.');
  });

  it('reads the body keys the other eight dimensions use', () => {
    expect(auditText({ fix: 'Add alt text to the diagram.' })).toBe('Add alt text to the diagram.');
    expect(auditText({ gap: 'No audio option.' })).toBe('No audio option.');
    expect(auditText({ suggestion: 'Offer a graphic organizer.' })).toBe('Offer a graphic organizer.');
  });

  it('falls back to an unknown string key rather than rendering nothing', () => {
    expect(auditText({ somethingNew: 'Still worth showing the teacher.' }))
      .toBe('Still worth showing the teacher.');
  });

  it('renders nothing for a shape it cannot read', () => {
    for (const value of [null, undefined, {}, { weight: 4 }, { profile: '   ' }]) {
      expect(auditText(value), JSON.stringify(value)).toBe('');
    }
  });
});

describe('the report renders Aaron\'s crash payload under real react-dom', () => {
  it('still routes student impacts through the guard in the shipped source', () => {
    expect(source).toContain('return <li key={i}>{auditText(s)}</li>;');
  });

  it('renders both impacts as readable text instead of crashing', () => {
    expect(() => mount(React.createElement(StudentImpacts, { impacts: AARON_PAYLOAD }))).not.toThrow();
    expect(host.textContent).toContain('A student using a screen reader would hear "image"');
    expect(host.textContent).toContain('cannot follow the red/green callouts');
    expect(host.textContent).not.toContain('[object Object]');
  });

  it('keeps the readable impacts when one entry is unreadable', () => {
    const mixed = [AARON_PAYLOAD[0], { weight: 3 }, 'Plain string impact.'];
    expect(() => mount(React.createElement(StudentImpacts, { impacts: mixed }))).not.toThrow();
    expect(host.textContent).toContain('A student using a screen reader');
    expect(host.textContent).toContain('Plain string impact.');
  });

  it('control: the same payload without the guard reproduces Aaron\'s exact error', () => {
    console.error = () => {};
    const Unguarded = ({ impacts }) => React.createElement(
      'ul',
      null,
      impacts.map((s, i) => React.createElement('li', { key: i }, s)),
    );
    expect(() => mount(React.createElement(Unguarded, { impacts: AARON_PAYLOAD })))
      .toThrow(/Objects are not valid as a React child.*profile.*encounter/s);
  });
});

describe('DimensionBoundary contains a failure to one dimension', () => {
  // A dimension card that throws the way an uncoerced object child does. This
  // stands in for a report restored from a save older than the coercion.
  const Exploding = () => { throw new Error('Objects are not valid as a React child (found: object with keys {profile, encounter})'); };
  const Fine = ({ label }) => React.createElement('div', null, label + ' rendered fine');

  const NineDimensions = ({ failing }) => React.createElement(
    'section',
    null,
    ['Standards alignment', 'Vocabulary fit', 'Content accessibility', 'UDL principles'].map((label) =>
      React.createElement(
        DimensionBoundary,
        { key: label, id: 'audit-' + label.split(' ')[0].toLowerCase(), label },
        label === failing ? React.createElement(Exploding) : React.createElement(Fine, { label }),
      )),
  );

  it('renders every dimension when nothing fails', () => {
    console.error = () => {};
    expect(() => mount(React.createElement(NineDimensions, { failing: null }))).not.toThrow();
    expect(host.textContent).toContain('Standards alignment rendered fine');
    expect(host.textContent).toContain('Content accessibility rendered fine');
    expect(host.querySelectorAll('[data-audit-section-failed]')).toHaveLength(0);
  });

  it('replaces only the failing card and leaves the other dimensions readable', () => {
    console.error = () => {};
    expect(() => mount(React.createElement(NineDimensions, { failing: 'Content accessibility' }))).not.toThrow();

    // The failure is contained to one card...
    const failed = host.querySelectorAll('[data-audit-section-failed]');
    expect(failed).toHaveLength(1);
    expect(failed[0].textContent).toContain('Content accessibility could not be displayed');

    // ...and the teacher still gets every other dimension, which is the whole
    // point: before this, one bad field blanked the entire report.
    expect(host.textContent).toContain('Standards alignment rendered fine');
    expect(host.textContent).toContain('Vocabulary fit rendered fine');
    expect(host.textContent).toContain('UDL principles rendered fine');
  });

  it('tells the teacher what to do next, and shows the error on request', () => {
    console.error = () => {};
    mount(React.createElement(NineDimensions, { failing: 'Vocabulary fit' }));
    expect(host.textContent).toContain('regenerate the audit to rebuild this one');
    expect(host.querySelector('pre').textContent).toContain('Objects are not valid as a React child');
  });

  it('clamps a runaway error message so it cannot flood the card', () => {
    console.error = () => {};
    const Long = () => { throw new Error('x'.repeat(5000)); };
    mount(React.createElement(DimensionBoundary, { id: 'audit-x', label: 'Long' }, React.createElement(Long)));
    expect(host.querySelector('pre').textContent).toHaveLength(240);
  });

  it('control: the same failing card WITHOUT a boundary takes down the whole report', () => {
    console.error = () => {};
    const Unbounded = () => React.createElement(
      'section',
      null,
      React.createElement(Fine, { label: 'Standards alignment' }),
      React.createElement(Exploding),
    );
    expect(() => mount(React.createElement(Unbounded)))
      .toThrow(/Objects are not valid as a React child/);
  });
});
