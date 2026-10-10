export default {
  test: {
    include: ['tests/watercycle_air_profile.test.js'],
    pool: 'forks',
    maxWorkers: 1,
    reporters: ['default'],
  },
};
