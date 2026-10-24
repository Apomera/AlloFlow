import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// Math Studio's Style buttons set mathMode. The rest of the app compares mathMode against fixed
// English ids: the sidebar Math select's <option value>s and the math prompt's
// `If "Step-by-Step"` branches. The buttons used the TRANSLATED label as the value, so in French
// the mode became "Étape par étape" (no option matched, the prompt branch never fired) and before
// ui_strings loaded it was undefined (no button could be selected, duplicate React keys).
const MODULE = readFileSync(resolve(process.cwd(), process.env.MATH_STUDIO_MODULE || 'math_create_module.js'), 'utf8');

function styleButtons(t) {
  const literal = sliceBetween(MODULE, '}, "Style:"), [{', '}].map(s =>', { file: 'math_create_module.js' })
    .replace(/^\}, "Style:"\), /, '') + '}]';
  // eslint-disable-next-line no-new-func
  return new Function('t', 'return ' + literal + ';')(t);
}

const french = { 'stem.solver.stepbystep': 'Étape par étape', 'stem.solver.conceptual': 'Conceptuel', 'stem.solver.realworld': 'Monde réel' };

describe('Math Studio style buttons', () => {
  it('set the same mode ids in every language', () => {
    const english = styleButtons((key) => ({ 'stem.solver.stepbystep': 'Step-by-Step', 'stem.solver.conceptual': 'Conceptual', 'stem.solver.realworld': 'Real-World' })[key]);
    const translated = styleButtons((key) => french[key]);
    const loading = styleButtons(() => undefined);
    expect(translated.map((b) => b.val), 'a translated label became the mode value').toEqual(english.map((b) => b.val));
    expect(loading.map((b) => b.val), 'before strings load the values were undefined').toEqual(english.map((b) => b.val));
    expect(new Set(loading.map((b) => b.val)).size, 'duplicate React keys').toBe(3);
  });

  it('keep translated labels, with English while strings load', () => {
    expect(styleButtons((key) => french[key]).map((b) => b.label)).toEqual(['Étape par étape', 'Conceptuel', 'Monde réel']);
    for (const button of styleButtons(() => undefined)) expect(typeof button.label === 'string' && button.label.length > 0).toBe(true);
  });

  it('use exactly the ids the sidebar select and the math prompt understand', () => {
    const vals = styleButtons(() => undefined).map((b) => b.val);
    const sidebar = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_module.js'), 'utf8');
    const prompt = readFileSync(resolve(process.cwd(), 'generation_helpers_module.js'), 'utf8');
    for (const val of vals) {
      expect(sidebar.includes('{ value: "' + val + '" }'), 'the sidebar Math select has no option "' + val + '"').toBe(true);
      expect(prompt.includes('- If "' + val + '":'), 'the math prompt has no branch for "' + val + '"').toBe(true);
    }
  });
});
