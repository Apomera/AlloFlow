import base from '../../vitest.config.js';
export default { ...base, test: { ...base.test, include: ['tests/*wcag*.test.js', 'tests/*a11y*.test.js', 'tests/*accessibility*.test.js'] } };
