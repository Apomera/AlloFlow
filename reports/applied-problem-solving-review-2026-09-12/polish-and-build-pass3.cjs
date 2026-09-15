const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
let source=read('applied_challenge_source.jsx');
const anchor='  const recoveryEntries = recovery.scope === recoveryScope ? recovery.entries : [];';
if(!source.includes(anchor))throw Error('Recovery anchor missing');
source=source.replace(anchor,anchor+`
  const recoveryEntry = recoveryEntries[recoveryEntries.length - 1];
  const recoveryLabel = !recoveryEntry ? '' : recoveryEntry.kind === 'question' ? tx('applied_challenge.undo.question_available', 'Your earlier question is available to restore.') : recoveryEntry.kind === 'evidence' ? _apsFill(tx('applied_challenge.undo.evidence_available', 'Evidence row {n} was removed.'), { n: recoveryEntry.index + 1 }) : _apsFill(tx('applied_challenge.undo.check_available', 'Check {n} was removed.'), { n: recoveryEntry.index + 1 });`);
source=source.replace("{recoveryMessage || tx('applied_challenge.undo.available', 'A removed item or earlier question is available to restore.')}","{recoveryMessage || recoveryLabel}");
source=source.replace("        {recoveryEntries.length > 0 && <><div",`        {recoveryMessage && recoveryEntry && <p className='mt-2 text-sm text-slate-700'>{recoveryLabel}</p>}
        {!recoveryEntry && <button type='button' className='aps-button mt-2' onClick={() => setRecoveryMessage('')}>{tx('applied_challenge.undo.dismiss_notice', 'Dismiss recovery message')}</button>}
        {recoveryEntries.length > 0 && <><div`);
fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),source);
// This builder exports a function and its CLI is guarded by require.main.
const {buildLiveAacModule}=require(path.join(root,'_build_live_aac_module.js'));
const live=buildLiveAacModule(read('live_aac_source.jsx'));
fs.writeFileSync(path.join(root,'live_aac_module.js'),live);fs.writeFileSync(path.join(root,'desktop/web-app/public/live_aac_module.js'),live);
console.log('Clarified recovery messages and rebuilt student-pack sanitization.');
