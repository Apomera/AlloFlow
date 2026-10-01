import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
const paths=source=>JSON.parse(execFileSync(process.execPath,['-e','process.stdout.write(JSON.stringify(require("./dev-tools/build_performance_release.cjs").modulePaths(process.argv[1])))',source],{encoding:'utf8'}));
describe('compact lazy plugin coverage',()=>{
  it('includes manifests and companions but excludes remote, non-JS and traversal paths',()=>{
    expect(paths("const tools=['stem_lab/heat.js','sel_hub/example.js','arcade/game.js']; const deps={'stem_lab/heat.js':['stem_lab/support.js']}; const bad=['stem_lab/../../secret.js','https://other.test/stem_lab/remote.js','stem_lab/image.png'];"))
      .toEqual(['arcade/game.js','sel_hub/example.js','stem_lab/heat.js','stem_lab/support.js']);
  });
});
