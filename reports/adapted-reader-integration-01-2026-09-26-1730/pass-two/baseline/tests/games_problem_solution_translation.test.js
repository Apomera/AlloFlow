import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const ReactDOMServer = require('../desktop/web-app/node_modules/react-dom/server');
const artifact = readFileSync('games_module.js', 'utf8');
const titleKey = 'games.problem_solution_sort.match_btn';

// An isolated module scope intentionally has no global t. The general games
// harness supplies one, which would hide a missing component context binding.
function renderProblemSolution(translate) {
  const LanguageContext = React.createContext({ t: translate });
  const sandbox = { window: {
    React, AlloLanguageContext: LanguageContext, AlloModules: {},
    fisherYatesShuffle: items => items.slice(),
  } };
  vm.runInNewContext(artifact, sandbox);
  expect(sandbox.t).toBeUndefined();
  expect(sandbox.window.t).toBeUndefined();
  return ReactDOMServer.renderToStaticMarkup(React.createElement(
    LanguageContext.Provider, { value: { t: translate } },
    React.createElement(sandbox.window.AlloModules.ProblemSolutionSortGame, {
      data: { branches: [{ title: 'Ask for help', items: ['Talk to a teacher'] }] },
      topicTitle: 'Troubleshooting', onClose: () => {}, playSound: () => {},
      onScoreUpdate: () => {}, onGameComplete: () => {},
    }),
  ));
}

describe('Problem Solution game translation context', () => {
  it('renders with the active context translation and no global translation shim', () => {
    const html = renderProblemSolution(key => key === titleKey ? 'Relacionar detalles y soluciones' : key);
    expect(html).toContain('Relacionar detalles y soluciones');
    expect(html).not.toContain('Match Details to Solutions');
    expect(html).toContain('Ask for help');
  });

  it.each([
    ['key', key => key],
    ['missing value', () => undefined],
  ])('renders the readable fallback when translation returns %s', (_, translate) => {
    const html = renderProblemSolution(translate);
    expect(html).toContain('Match Details to Solutions');
    expect(html).not.toContain(titleKey);
  });
});
