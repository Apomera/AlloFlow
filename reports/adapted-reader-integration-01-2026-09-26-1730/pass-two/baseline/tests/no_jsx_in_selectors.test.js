// Guard against a real shipped bug class: JSX attribute syntax leaking into a CSS-selector string.
//
// annotation_suite_module.js (deployed @c441a209) had:
//   e.currentTarget.querySelector('button[aria-label={t("a11y.delete_highlight")}]')
// The {t(...)} is never evaluated inside a plain string, so the browser receives a literal
// `{...}` selector and throws "is not a valid selector" — but only when the hover handler runs,
// so it sails past load/smoke checks and only surfaces in the console during testing.
//
// A CSS selector never legitimately contains a bare `{`/`}` (those delimit rule blocks, not
// selectors). The only valid brace in a selector *string* is a `${…}` template interpolation.
// So: scan every shipped *_module.js, pull the string argument of each querySelector-family call,
// strip `${…}` interpolations, and fail if any brace remains.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const MODULES = readdirSync(ROOT).filter(f => f.endsWith('_module.js'));

// .querySelector( / .querySelectorAll( / .closest( / .matches( followed by a quoted string literal.
const CALL = /\.(?:querySelector|querySelectorAll|closest|matches)\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;

function selectorOffenders(src) {
  const out = [];
  let m;
  while ((m = CALL.exec(src))) {
    const raw = m[2];
    const stripped = raw.replace(/\$\{[^}]*\}/g, ''); // remove valid template interpolations
    if (stripped.includes('{') || stripped.includes('}')) out.push(raw);
  }
  return out;
}

describe('No JSX/braces leaked into CSS selector strings', () => {
  it('covers a representative set of shipped modules', () => {
    expect(MODULES.length).toBeGreaterThan(20);
  });

  for (const f of MODULES) {
    it(`${f}: every querySelector/closest/matches selector is a clean CSS selector`, () => {
      const offenders = selectorOffenders(readFileSync(resolve(ROOT, f), 'utf8'));
      expect(offenders).toEqual([]);
    });
  }
});

// Self-check: the guard actually catches the original bug shape.
describe('the guard catches the bug shape it was written for', () => {
  it('flags a JSX-in-selector but allows a real ${…} interpolation', () => {
    expect(selectorOffenders(`el.querySelector('button[aria-label={t("x")}]')`)).toHaveLength(1);
    expect(selectorOffenders('el.querySelector(`button[aria-label="${label}"]`)')).toHaveLength(0);
    expect(selectorOffenders(`el.querySelector('button.delete')`)).toHaveLength(0);
  });
});
