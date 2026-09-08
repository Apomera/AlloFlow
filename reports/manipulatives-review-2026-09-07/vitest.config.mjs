import base from '../../vitest.config.js';
export default { ...base, test: { ...base.test, include: ['reports/manipulatives-review-2026-09-07/reproduce.test.js'], maxWorkers: 1, testTimeout: 30000 } };
