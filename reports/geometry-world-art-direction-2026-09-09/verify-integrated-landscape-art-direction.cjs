const filesystem = require('node:fs');
const paths = require('node:path');
let verification = filesystem.readFileSync(paths.join(__dirname, 'verify-landscape-art-direction.cjs'), 'utf8');
const originalSnippetRead = "const snippet = fs.readFileSync(path.join(__dirname, 'landscape-art-direction.js'), 'utf8');";
const integratedSource = `
const sourcePath = path.join(process.cwd(), 'stem_lab/stem_tool_geometryworld.js');
const sourceBuffer = fs.readFileSync(sourcePath), source = sourceBuffer.toString('utf8');
const mirrorCandidates = ['desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'].map(p => path.join(process.cwd(), p));
const mirrorPath = mirrorCandidates.find(p => fs.existsSync(p));
assert.ok(mirrorPath, 'desktop mirror exists');
assert.ok(sourceBuffer.equals(fs.readFileSync(mirrorPath)), 'canonical and desktop source are byte-identical');
const landscapeStart = source.indexOf('(function initLandscape()');
const landscapeEnd = source.indexOf('// Soft rim light', landscapeStart);
assert.ok(landscapeStart >= 0 && landscapeEnd > landscapeStart, 'actual integrated landscape closure found');
const snippet = source.slice(landscapeStart, landscapeEnd).trim();
const qualityStart = source.indexOf('engine.applyRenderQuality = function(preference)');
const qualityEnd = source.indexOf('engine.applyRenderQuality(d.renderQuality', qualityStart);
assert.ok(qualityStart >= 0 && qualityEnd > qualityStart, 'actual quality handler found');
const qualityAssignment = source.slice(qualityStart, qualityEnd).trim();
const sourceSHA256 = crypto.createHash('sha256').update(sourceBuffer).digest('hex');
`;
if (!verification.includes(originalSnippetRead)) throw new Error('Original verifier snippet marker changed');
verification = verification.replace(originalSnippetRead, integratedSource);
const qualityCheck = `
// Execute the actual applyRenderQuality assignment with only renderer/device
// dependencies stubbed. The actual integrated landscape and its geometry run.
const qualityEngine = { scene: new THREE.Scene(), blocks: {}, _matCache: {}, _renderProfile: { tier: 'detail' }, _currentLesson: { ground: standard }, _horizon: { material: { color: horizonColor } }, renderer: { shadowMap: {}, setPixelRatio(v) { this.pixelRatio = v; } } };
new Function('THREE', 'engine', 'geometryWorldSrgbColor', snippet)(THREE, qualityEngine, (T, hex) => new T.Color(hex).convertSRGBToLinear());
const resolveQuality = preference => ({ tier: preference, postFx: preference !== 'saver', ambientMotion: preference !== 'saver', maxPixelRatio: preference === 'saver' ? 1 : 2, shadows: preference !== 'saver' });
new Function('engine', 'resolveGeometryRenderProfile', 'isMobile', 'window', 'navigator', 'container', qualityAssignment)(qualityEngine, resolveQuality, false, { devicePixelRatio: 2, matchMedia() { return { matches: false }; } }, { hardwareConcurrency: 8 }, { clientWidth: 640, clientHeight: 480 });
let qualityDisposedGeometry = 0, qualityDisposedMaterial = 0;
function trackQuality(group) { for (const mesh of group.children) { mesh.geometry.addEventListener('dispose', () => qualityDisposedGeometry++); mesh.material.addEventListener('dispose', () => qualityDisposedMaterial++); } }
function triangleCount(group) { return group.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0); }
qualityEngine.refreshLandscape(standard);
const firstDetailed = qualityEngine._landscape, firstDetailedHash = digest(firstDetailed); trackQuality(firstDetailed);
assert.equal(triangleCount(firstDetailed), 5468);
qualityEngine.applyRenderQuality('saver');
const saverGroup = qualityEngine._landscape; trackQuality(saverGroup);
assert.notEqual(saverGroup, firstDetailed, 'actual quality hook rebuilds detail to saver');
assert.equal(triangleCount(saverGroup), 3292);
assert.equal(qualityDisposedGeometry, 6); assert.equal(qualityDisposedMaterial, 6);
assert.equal(qualityEngine.scene.children.length, 1);
qualityEngine.applyRenderQuality('saver');
assert.equal(qualityEngine._landscape, saverGroup, 'same quality retains live meshes');
assert.equal(qualityDisposedGeometry, 6);
qualityEngine.applyRenderQuality('detail');
const secondDetailed = qualityEngine._landscape; trackQuality(secondDetailed);
assert.notEqual(secondDetailed, saverGroup, 'actual quality hook rebuilds saver to detail');
assert.equal(triangleCount(secondDetailed), 5468);
assert.equal(digest(secondDetailed), firstDetailedHash, 'returning to detail restores deterministic geometry and colors');
assert.equal(qualityDisposedGeometry, 12); assert.equal(qualityDisposedMaterial, 12);
assert.equal(qualityEngine.scene.children.length, 1);
qualityEngine.disposeLandscape(); qualityEngine.disposeLandscape();
assert.equal(qualityDisposedGeometry, 18); assert.equal(qualityDisposedMaterial, 18);
assert.equal(qualityEngine.scene.children.length, 0);
qualityEngine._destroyed = true; qualityEngine.applyRenderQuality('saver');
assert.equal(qualityEngine._landscape, null, 'quality changes cannot recreate a destroyed engine landscape');
const integratedQualityCheck = { pass: true, sequence: ['detail', 'saver', 'saver', 'detail'], triangles: [5468, 3292, 3292, 5468], unchangedTierReused: true, deterministicReturn: true, disposedGeometry: qualityDisposedGeometry, disposedMaterial: qualityDisposedMaterial };
`;
const marker = 'const report = { pass: true,';
if (!verification.includes(marker)) throw new Error('Original verifier report marker changed');
verification = verification.replace(marker, qualityCheck + '\n' + marker);
verification = verification.replace("scope: 'Actual vendored THREE r128 geometry/lifecycle test; no browser launch'", "scope: 'Actual integrated application IIFE and quality hook with vendored THREE r128; no browser launch', sourcePath, mirrorPath, sourceSHA256, mirrorByteIdentical: true, integratedQualityCheck");
verification = verification.replaceAll("'landscape-art-direction-verification.json'", "'integrated-landscape-art-direction-verification.json'");
verification = verification.replace('detailTriangles: results[0].triangles,', 'sourceSHA256, mirrorByteIdentical: true, integratedQualityCheck, detailTriangles: results[0].triangles,');
new Function('__dirname', 'require', verification)(__dirname, require);
