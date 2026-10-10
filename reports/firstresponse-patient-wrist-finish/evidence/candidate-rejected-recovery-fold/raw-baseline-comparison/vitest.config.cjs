module.exports={
  "root": "C:\\Users\\cabba\\Documents\\Codex\\2026-09-29\\new-chat-14\\firstresponse-patient-wrist-finish-work\\raw-baseline-comparison",
  "resolve": {
    "alias": {
      "vitest": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\node_modules\\vitest\\dist\\index.js"
    }
  },
  "test": {
    "include": [
      "tests/firstresponse_hand_surface.test.js"
    ],
    "testNamePattern": "mirrors patient fingers, thumbs and nails between the two hands",
    "environment": "jsdom",
    "maxWorkers": 1,
    "minWorkers": 1,
    "pool": "threads",
    "fileParallelism": false,
    "testTimeout": 60000,
    "hookTimeout": 60000,
    "reporters": [
      "default",
      "json"
    ],
    "outputFile": "C:\\Users\\cabba\\Documents\\Codex\\2026-09-29\\new-chat-14\\firstresponse-patient-wrist-finish-work\\raw-baseline-comparison\\baseline-results.json"
  }
};
