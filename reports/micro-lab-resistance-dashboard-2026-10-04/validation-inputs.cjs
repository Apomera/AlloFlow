const unitNames = ['growth_model', 'growth_workflow', 'microscope', 'resistance_sim', 'mystery_workflow', 'snow_map',
  'quiz_workflow', 'print_reference', 'gram_workflow', 'workspace', 'workspace_resume', 'workspace_navigation',
  'portfolio', 'portfolio_workflow', 'growth_citations', 'growth_citations_workflow', 'portfolio_selection',
  'portfolio_selection_workflow', 'annotation_integrity', 'annotation_integrity_workflow', 'resistance_outcomes',
  'measurement_conversion', 'measurement_conversion_workflow', 'mystery_integrity', 'home_integrity', 'resistance_rounds', 'resistance_visuals'];
const browserCounts = {
  'annotation-integrity': 7, 'evidence-recovery': 6, 'evidence-review': 6, 'experiment-design': 6,
  'growth-citations': 7, 'guided-resume': 5, 'home-integrity': 7, 'measurement-conversion': 7,
  'mystery-integrity': 7, 'portfolio-selection': 6, 'portfolio': 6, 'resistance-rounds': 8, 'resistance-visuals': 6,
  'resistance-live-visuals': 5
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
  parent: 'a83872bea4f05224645b5571c4b8fa9b2606b518',
  priorBranch: 'refs/heads/codex/micro-resistance-visuals-2026-10-04',
  branch: 'refs/heads/codex/micro-resistance-dashboard-2026-10-04',
  unit: unitNames.map(name => 'tests/microbiology_' + name + '.test.js').concat(['tests/stem_microbiology_quiz.test.js']),
  browser: Object.keys(browserCounts).map(name => 'tests/e2e/microbiology-' + name + '.spec.ts'),
  browserCounts: Object.fromEntries(Object.entries(browserCounts).map(([name, count]) => ['microbiology-' + name + '.spec.ts', count])),
  expectedUnit: 1059, expectedBrowser: 89, support, runtime, registries, localDependencies,
  ownedTests: ['tests/e2e/microbiology-resistance-live-visuals.spec.ts']
};
