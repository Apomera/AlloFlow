// The 2026-08-23 hub split ("Test Prep Hub: 49.2 MiB -> 5.91 MiB") moved every
// released pack bank out of test_prep_hub_module.js into test_prep/<slug>_pack.json,
// loaded at runtime through the signed pack manifest. Tests that used to find
// their pack in listPacks() right after module load now register the local JSON
// fixtures the same way the manifest loader would, via the hub's own
// registerPack (so validation and normalization still run).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const packDir = path.join(root, 'test_prep');

export function registerLocalTestPrepPacks(Hub) {
  for (const name of fs.readdirSync(packDir).sort()) {
    if (!name.endsWith('_pack.json')) continue;
    const pack = JSON.parse(fs.readFileSync(path.join(packDir, name), 'utf8'));
    try {
      Hub.registerPack(pack);
    } catch (error) {
      throw new Error(`registerLocalTestPrepPacks: ${name}: ${error && error.message}`);
    }
  }
}
