const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), mode = process.argv[2];
const sourceSha256 = require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'stem_lab/stem_tool_solarsystem.js'))).digest('hex');
const cases = { 'unit-journal': 'tests/solar_system_journal_drafts.test.js', 'unit-navigation': 'tests/solar_system_comparison_scale_navigation.test.js' };
const args = cases[mode] ? ['node_modules/vitest/vitest.mjs', 'run', '--config=reports/solar-journal-drafts-enhancement-2026-10-08/unit.vitest.config.mjs', cases[mode]]
  : mode === 'visual' ? [path.join(__dirname, 'visual-qa.cjs')] : null;
if (!args) throw Error('Choose unit-journal, unit-navigation or visual');
fs.writeFileSync(path.join(__dirname, mode + '-source.json'), JSON.stringify({ sourceSha256, startedAt: new Date().toISOString() }, null, 2));
const log = path.join(__dirname, mode + '-log.txt'), fd = fs.openSync(log, 'w');
const result = spawnSync(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', fd, fd],
  env: { ...process.env, SOLAR_UNIT_CASE: mode, NODE_OPTIONS: '--max-semi-space-size=1 --max-old-space-size=' + (mode === 'visual' ? '384' : '192') },
});
fs.closeSync(fd); console.log(fs.readFileSync(log, 'utf8').slice(-12000));
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
