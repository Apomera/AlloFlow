import base from '../../playwright.config';
export default { ...base, testDir: '.', testMatch: 'front-prototype.spec.ts', retries: 0, workers: 1, timeout: 240000, outputDir: 'test-results', reporter: [['json']], use: {...base.use, trace:'off', video:'off', screenshot:'only-on-failure'} };
