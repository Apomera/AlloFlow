module.exports={
  "root": "C:\\Users\\cabba\\Documents\\Codex\\2026-09-29\\new-chat-14\\firstresponse-ear-lobe-work\\raw-ear-surfaces",
  "resolve": {
    "alias": {
      "vitest": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\node_modules\\vitest\\dist\\index.js"
    }
  },
  "test": {
    "include": [
      "tests/firstresponse_ear_rims.test.js",
      "tests/firstresponse_ear_folds.test.js"
    ],
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
    "outputFile": "C:\\Users\\cabba\\Documents\\Codex\\2026-09-29\\new-chat-14\\firstresponse-ear-lobe-work\\raw-ear-surfaces\\vitest-results.json"
  }
};
