const { spawnSync } = require('child_process'), path = require('path');
for (const file of ['firebase_rules_security.test.cjs', 'firebase_connected_escape_rules.cjs', 'firebase_lesson_board_rules.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
