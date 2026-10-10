export default {
  test: {
    environment:'node', pool:'forks', maxWorkers:1, fileParallelism:false,
    include:['tests/watercycle_groundwater_flow.test.js','tests/watercycle_groundwater_lens.test.js','tests/watercycle_investigation.test.js'],
  },
};
