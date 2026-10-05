const unitNames = ['growth_model', 'growth_workflow', 'microscope', 'resistance_sim', 'mystery_workflow', 'snow_map',
  'quiz_workflow', 'print_reference', 'gram_workflow', 'workspace', 'workspace_resume', 'workspace_navigation',
  'portfolio', 'portfolio_workflow', 'growth_citations', 'growth_citations_workflow', 'portfolio_selection',
  'portfolio_selection_workflow', 'annotation_integrity', 'annotation_integrity_workflow', 'resistance_outcomes',
  'measurement_conversion', 'measurement_conversion_workflow', 'mystery_integrity', 'home_integrity', 'resistance_rounds', 'resistance_visuals'];
const browserCounts = {
  'annotation-integrity': 7, 'experiment-design': 6, 'growth-citations': 7, 'guided-resume': 5,
  'growth-inspection-export': 2, 'resistance-live-visuals': 5, 'growth-visual-inspection': 5, 'sweep-visual-inspection': 6, 'resistance-visuals': 8
};
const support = ['playwright.config.ts', 'tests/e2e/helpers/stem_gl_harness.ts', 'tests/helpers/stem_widgets_smoke_harness.js', 'tests/e2e/helpers/png_pixels.ts',
  'desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  'vendor/three-r128/three.min.js', 'node_modules/@playwright/test/package.json', 'node_modules/playwright/package.json',
  'node_modules/playwright-core/package.json'];
const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
const registries = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const localDependencies = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  'node_modules/@playwright/test/package.json', 'node_modules/playwright/package.json', 'node_modules/playwright-core/package.json'];
module.exports = {
  parent: 'c79fce442cdece823cdc1df22165b9265fd0b909',
  priorBranch: 'refs/heads/codex/micro-sweep-visuals-2026-10-04',
  branch: 'refs/heads/codex/micro-resistance-history-2026-10-04',
  unit: unitNames.map(name => 'tests/microbiology_' + name + '.test.js').concat(['tests/stem_microbiology_quiz.test.js']),
  browser: Object.keys(browserCounts).map(name => 'tests/e2e/microbiology-' + name + '.spec.ts'),
  browserCounts: Object.fromEntries(Object.entries(browserCounts).map(([name, count]) => ['microbiology-' + name + '.spec.ts', count])),
  baselineUnit: 1060, newUnitCases: 0, expectedUnit: 1060, expectedBrowser: Object.values(browserCounts).reduce((sum, count) => sum + count, 0),
  expectedInputCount: unitNames.length + 1 + Object.keys(browserCounts).length + support.length,
  expectedInterfaceKeys: 1936, expectedNamespaceKeys: 2055, expectedOwnLabels: 0, newBrowserCases: 2, focusedBrowserCases: browserCounts['resistance-visuals'] + browserCounts['resistance-live-visuals'],
  expectedVisualNames: ['resistance-visual-divergence-desktop.png', 'resistance-visual-extinction.png',
    'resistance-visuals-phone-320.png', 'resistance-visuals-400-percent.png',
    'resistance-history-long-desktop.png', 'resistance-history-long-phone-320.png',
    'resistance-history-forced-dark.png', 'resistance-history-forced-light.png'],
  browserScope: 'Resistance saved histories and live visuals, plus preceding Growth sweep/chart/state/citations/navigation checks, annotation integrity, and experiment design.',
  support, runtime, registries, localDependencies,
  ownedTests: ['tests/microbiology_resistance_visuals.test.js', 'tests/e2e/microbiology-resistance-visuals.spec.ts', 'tests/e2e/microbiology-resistance-live-visuals.spec.ts']
};
