export default {
  test: {
    include: ['tests/watercycle_storm_moments.test.js'],
    pool: 'threads', maxWorkers: 1,
    testNamePattern: /^Storm moments: (actual fixed scientific evidence|immutable learner choices and full feedback identity|qualified current-stage language|actual renderer and isolated learner callbacks|aligned comparison signals)/,
    reporters: ['default'],
  },
};
