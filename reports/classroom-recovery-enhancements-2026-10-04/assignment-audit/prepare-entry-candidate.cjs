'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..'), file = path.join(root, 'AlloFlowANTI.txt');
const raw = fs.readFileSync(file), eol = raw.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
const source = raw.toString().replace(/\r\n/g, '\n'); let candidate = source;
const operations = [];
function replaceUnique(scope, before, after) {
  const count = candidate.split(before).length - 1; assert.equal(count, 1, scope + ' unique match');
  candidate = candidate.replace(before, after); operations.push({ scope, before, after });
}
if (!candidate.includes('  const workspaceReplacementGenerationRef = useRef(0);')) {
  replaceUnique('root-reference', '  const localDataHydrationGenerationRef = useRef(0);', '  const localDataHydrationGenerationRef = useRef(0);\n  const workspaceReplacementGenerationRef = useRef(0);');
  replaceUnique('root-reference', '  const invalidateLocalDataHydration = () => {\n      localDataHydrationGenerationRef.current += 1;', '  const invalidateLocalDataHydration = () => {\n      workspaceReplacementGenerationRef.current += 1;\n      localDataHydrationGenerationRef.current += 1;');
}
function guardedEffect(kind, start, end, rewrite) {
  const a = candidate.indexOf(start), b = candidate.indexOf(end, a + start.length); assert(a >= 0 && b > a, kind + ' effect boundary');
  const before = candidate.slice(a, b); let after = before;
  const edit = (old, next) => { assert.equal(after.split(old).length - 1, 1, kind + ': ' + old); after = after.replace(old, next); };
  edit('      let cancelled = false;', '      let cancelled = false;\n      const workspaceGeneration = workspaceReplacementGenerationRef.current;\n      const isCurrentEntry = () => !cancelled && workspaceReplacementGenerationRef.current === workspaceGeneration;');
  rewrite(edit);
  replaceUnique('qr-' + kind, before, after);
}
guardedEffect('firebase', '  useEffect(() => {\n      let cancelled = false;\n      try {\n          const params = new URLSearchParams(window.location.search);\n          const assignmentId', '  // Self-contained homework entry', edit => {
  edit('                  const assignmentUser = await _alloEnsureAuthenticatedUser();\n                  setUser(assignmentUser);', '                  const assignmentUser = await _alloEnsureAuthenticatedUser();\n                  if (!isCurrentEntry()) return;\n                  setUser(assignmentUser);');
  edit('                  const snap = await getDoc(assignmentRef);\n                  if (!snap.exists())', '                  const snap = await getDoc(assignmentRef);\n                  if (!isCurrentEntry()) return;\n                  if (!snap.exists())');
  edit('                  const restoredResources = await hydrateSessionAssets(hostId, rawResources);\n                  if (!Array.isArray(restoredResources)', '                  const restoredResources = await hydrateSessionAssets(hostId, rawResources);\n                  if (!isCurrentEntry()) return;\n                  if (!Array.isArray(restoredResources)');
  edit('                  if (cancelled) return;', '                  if (!isCurrentEntry()) return;');
  edit("              } catch (e) {\n                  warnLog('Homework QR load failed:', e);\n                  if (!cancelled) {", "              } catch (e) {\n                  if (!isCurrentEntry()) return;\n                  warnLog('Homework QR load failed:', e);\n                  if (isCurrentEntry()) {");
});
guardedEffect('pack', '  // Self-contained homework entry', '  // Mailbox live-session student entry', edit => {
  edit("              const text = await _alloDecodeAlloPack(encodedPack);\n              const packet = JSON.parse(text || 'null');", "              const text = await _alloDecodeAlloPack(encodedPack);\n              if (!isCurrentEntry()) return;\n              const packet = JSON.parse(text || 'null');");
  edit('              if (cancelled) return;', '              if (!isCurrentEntry()) return;');
  edit("          } catch (e) {\n              warnLog('Self-contained homework load failed:', e);\n              if (!cancelled) {", "          } catch (e) {\n              if (!isCurrentEntry()) return;\n              warnLog('Self-contained homework load failed:', e);\n              if (isCurrentEntry()) {");
});
guardedEffect('hosted', '  // Mailbox-hosted homework entry', '  useEffect(() => {\n      if (activeView ===', edit => {
  edit("                      assertOk: () => { if (cancelled) throw new Error('cancelled'); },", "                      assertOk: () => { if (!isCurrentEntry()) throw new Error('cancelled'); },");
  edit("              if (cancelled) return;\n              const packet = JSON.parse(await _alloDecodeAlloPack(assembled) || 'null');\n              if (cancelled) return;", "              if (!isCurrentEntry()) return;\n              const packet = JSON.parse(await _alloDecodeAlloPack(assembled) || 'null');\n              if (!isCurrentEntry()) return;");
  edit("          } catch (e) {\n              warnLog('Hosted homework load failed:', e);\n              if (!cancelled) setSharedHostedActivity(null);\n              if (!cancelled) addToast", "          } catch (e) {\n              if (!isCurrentEntry()) return;\n              warnLog('Hosted homework load failed:', e);\n              if (isCurrentEntry()) setSharedHostedActivity(null);\n              if (isCurrentEntry()) addToast");
});
const out = path.join(__dirname, 'candidate'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(__dirname, 'source-before.txt'), raw);
fs.writeFileSync(path.join(out, 'AlloFlowANTI.txt'), candidate.replace(/\n/g, eol));
fs.writeFileSync(path.join(__dirname, 'entry-operations.json'), JSON.stringify(operations, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'prepare-receipt.json'), JSON.stringify({ sourceFile: file, sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), candidateSha256: crypto.createHash('sha256').update(candidate.replace(/\n/g, eol)).digest('hex'), operations: operations.map(v => v.scope) }, null, 2) + '\n');
console.log(JSON.stringify({ prepared: true, operations: operations.length, out }));
