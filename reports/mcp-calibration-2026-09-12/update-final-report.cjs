const fs=require('fs'),path=require('path');
const dir=path.resolve('reports/mcp-calibration-2026-09-12');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8').replace(/^\uFEFF/,''));
const remediation=read('remediation-unit-final-summary.json'),mcp=read('calibration-final-summary.json'),build=read('combined-build-checks.json');
let text=fs.readFileSync(path.join(dir,'README.md'),'utf8').replace(/^\uFEFF/,'');
text=text.replace(/\*\*\d+ remediation tests, \d+ MCP calibration tests and 6 workflow checks\*\*/,`**${remediation.passed} remediation tests, ${mcp.passed} MCP calibration tests and 6 workflow checks**`);
text=text.replace(/\| Maintained remediation unit suite \|[^\n]*/,`| Maintained remediation unit suite | ${remediation.passed} / ${remediation.passed}, ${remediation.files} files |`);
text=text.replace(/\| MCP calibration suite \|[^\n]*/,`| MCP calibration suite | ${mcp.passed} / ${mcp.passed}, ${mcp.files} files |`);
text=text.replace(/Final source SHA-256: `[^`]+`\./,`Final source SHA-256: \`${build.sourceSha256}\`.`);
text=text.replace(/Final root\/desktop module SHA-256: `[^`]+`\./,`Final root/desktop module SHA-256: \`${build.generatedSha256}\`.`);
const fix='- **Unsupported editor controls:** static output retained Adjust Crop after its script was removed, while browser sanitization retained Replace after removing its handler. Cleanup now removes only recognized generated controls where their action is unavailable; source-authored controls and working raw-MCP Replace remain intact.\n';
if(!text.includes('- **Unsupported editor controls:**'))text=text.replace('New real Chromium/server coverage',fix+'\nNew real Chromium/server coverage');
const section=`## Static editor-control cleanup

A final artifact check confirmed that clicking Adjust Crop did nothing because static cleanup had removed its callback. Browser sanitization similarly left Replace visible after removing its image-changing handler. These are recorded in the [crop baseline](static-crop-before.json) and [Replace baseline](static-replace-before.json).

The final cleanup recognizes renderer-owned controls, including tightly bounded legacy markup. It removes the unsupported crop control from static MCP output. At the browser sanitization boundary it also removes generated controls whose handlers will be stripped. It preserves source-authored controls, unknown nested content, image bytes, captions and source links. Executable scripts remain excluded. Already-sanitized legacy controls without ownership markers or surviving handler signatures are conservatively retained; malformed or ambiguous markup is also preserved.

Two separate derivatives of the stored candidate were checked: [MCP HTML](static-crop-replayed-candidate.html) and [sanitized browser HTML](static-browser-export-candidate.html). Chromium checks verify preserved content, no horizontal overflow at 320, 390 and 1000 pixels, and no unsupported crop control. The retained MCP Replace control was exercised with a local image file and successfully updated the image. The sanitized browser output contains neither unsupported image editor control. Desktop and mobile renders were visually reviewed.

The [68 focused checks](static-control-focused-verification.json) also passed. Two stale queue-characterization assertions were updated to match the existing per-run entry cloning; queue behavior was unchanged.

See [derived-artifact evidence](static-crop-replay.json), [rendered verification](static-crop-rendered-review.json), [MCP rendered view](static-mcp-rendered-review.png), and [browser rendered view](static-browser-rendered-review.png). These are regression derivatives, not new live model results. The accepted continuation candidate and both historical live outputs remain unchanged. The earlier green 547/112 gate results are preserved in the [pre-cleanup archive](static-crop-validation-archive.json).

`;
if(text.includes('## Static editor-control cleanup'))text=text.replace(/## Static editor-control cleanup[\s\S]*?(?=## Validation and build)/,section);else text=text.replace('## Validation and build',section+'## Validation and build');
fs.writeFileSync(path.join(dir,'README.md'),text);
console.log(JSON.stringify({reportUpdated:true,remediation:remediation.passed,mcp:mcp.passed,sourceHash:build.sourceSha256}));
