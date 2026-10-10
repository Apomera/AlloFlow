module.exports={
  "root": "C:\\Users\\cabba\\Documents\\Codex\\2026-09-29\\new-chat-14\\firstresponse-collar-work\\vitest-wrapper",
  "resolve": {
    "alias": {
      "vitest": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\node_modules\\vitest\\dist\\index.js"
    }
  },
  "test": {
    "include": [
      "tests/firstresponse_collar_surface.test.js"
    ],
    "environment": "jsdom",
    "maxWorkers": 1,
    "minWorkers": 1,
    "pool": "forks",
    "fileParallelism": false,
    "testTimeout": 60000,
    "hookTimeout": 60000,
    "reporters": [
      "default",
      "json"
    ],
    "outputFile": "C:\\Users\\cabba\\Documents\\Codex\\2026-09-29\\new-chat-14\\firstresponse-collar-work\\vitest-wrapper\\vitest-results.json"
  }
};
