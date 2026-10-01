import base from '../vitest.config.js';

export default {
  ...base,
  test: { ...base.test, setupFiles: ['./tests/report_generation_recovery_interview.candidate.setup.js'] },
};
